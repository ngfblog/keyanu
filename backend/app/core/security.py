"""Password hashing, JWT/session token handling, TOTP, and at-rest encryption."""
import base64
import hashlib
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import pyotp
from cryptography.fernet import Fernet, InvalidToken
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Hard ceiling on how long a session JWT can be used at all, regardless of
# how often the sliding idle timeout (Session Timeout, user-configurable)
# gets extended. Defense in depth against a token living forever.
SESSION_JWT_MAX_DAYS = 30

# How long a "pending TOTP" login ticket is valid for, between submitting a
# correct password and submitting the TOTP/recovery code.
LOGIN_TICKET_EXPIRE_MINUTES = 5


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# --- Session tokens -----------------------------------------------------
# The JWT payload only ever carries the session id ("sid"). Everything that
# actually governs whether a request is authorized -- idle timeout, logout,
# "logout everywhere" -- lives in the `sessions` table and is checked on
# every request in app.api.deps.get_current_user.

def create_session_token(session_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=SESSION_JWT_MAX_DAYS)
    to_encode: dict[str, Any] = {"sid": session_id, "exp": expire}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_session_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload.get("sid")
    except JWTError:
        return None


# --- Pending-TOTP login tickets ------------------------------------------
# Issued after a correct username/password when TOTP is enabled, before a
# real session exists. Stateless (no DB row) since it's short-lived and
# carries no privileges beyond "please now provide a TOTP or recovery code".

def create_login_ticket(username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=LOGIN_TICKET_EXPIRE_MINUTES)
    to_encode: dict[str, Any] = {"purpose": "totp_pending", "username": username, "exp": expire}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_login_ticket(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("purpose") != "totp_pending":
            return None
        return payload.get("username")
    except JWTError:
        return None


# --- At-rest encryption (credentials, TOTP secrets) ----------------------

def _derive_fernet_key(raw_key: str) -> bytes:
    """Derive a valid 32-byte urlsafe-base64 Fernet key from an arbitrary secret string."""
    digest = hashlib.sha256(raw_key.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


_fernet = Fernet(_derive_fernet_key(settings.ENCRYPTION_KEY))


def encrypt_secret(plaintext: str) -> str:
    """Encrypt a string for storage at rest. Returns a urlsafe base64 token."""
    if plaintext is None:
        return ""
    return _fernet.encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_secret(ciphertext: str) -> str:
    """Decrypt a value previously produced by encrypt_secret."""
    if not ciphertext:
        return ""
    try:
        return _fernet.decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Encrypted data could not be decrypted. Confirm Keyanu is using the original ENCRYPTION_KEY from appdata or your container configuration.") from exc


def encryption_key_fingerprint() -> str:
    """A short, non-reversible fingerprint of the active ENCRYPTION_KEY.

    Safe to store in plaintext (e.g. a backup manifest) to detect whether a
    backup was made with a different key, without revealing the key itself.
    """
    return hashlib.sha256(settings.ENCRYPTION_KEY.encode("utf-8")).hexdigest()[:16]


# --- TOTP ------------------------------------------------------------------

def generate_totp_secret() -> str:
    return pyotp.random_base32()


def totp_provisioning_uri(secret: str, username: str) -> str:
    return pyotp.TOTP(secret).provisioning_uri(name=username, issuer_name=settings.APP_NAME)


def verify_totp_code(secret: str, code: str) -> bool:
    if not secret or not code:
        return False
    return pyotp.TOTP(secret).verify(code.strip(), valid_window=1)


# --- Recovery codes ----------------------------------------------------

_RECOVERY_CODE_ALPHABET = "".join(c for c in string.ascii_uppercase + string.digits if c not in "0O1IL")


def generate_recovery_code() -> str:
    """Generates one human-typeable recovery code, e.g. 'ABCD-EFGH-JKLM'."""
    groups = ["".join(secrets.choice(_RECOVERY_CODE_ALPHABET) for _ in range(4)) for _ in range(3)]
    return "-".join(groups)
