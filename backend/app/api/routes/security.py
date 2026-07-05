from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_session, get_current_user
from app.core.security import (
    decrypt_secret,
    encrypt_secret,
    generate_totp_secret,
    totp_provisioning_uri,
    verify_password,
    verify_totp_code,
)
from app.crud import crud_audit, crud_recovery_code, crud_session, crud_user
from app.db.session import get_db
from app.models.enums import AuditAction
from app.models.session import Session as SessionModel
from app.models.user import User
from app.schemas.security import (
    ChangePasswordRequest,
    ChangeUsernameRequest,
    RecoveryCodesGenerateRequest,
    RecoveryCodesResponse,
    RecoveryCodesStatus,
    SessionRead,
    SessionTimeoutRead,
    SessionTimeoutUpdate,
    TotpDisableRequest,
    TotpEnableRequest,
    TotpSetupResponse,
    TotpStatus,
)

router = APIRouter(prefix="/security", tags=["security"])


def _require_current_password(user: User, current_password: str) -> None:
    if not verify_password(current_password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")


# --- Password & username -------------------------------------------------

@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    _require_current_password(current_user, payload.current_password)
    crud_user.set_password(db, current_user, payload.new_password)
    crud_audit.log(
        db, action=AuditAction.UPDATE, entity_type="security", entity_name="password",
        user_id=current_user.id, detail="Password changed",
    )


@router.post("/change-username", status_code=status.HTTP_204_NO_CONTENT)
def change_username(
    payload: ChangeUsernameRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    _require_current_password(current_user, payload.current_password)

    new_username = payload.new_username.strip()
    if new_username != current_user.username:
        existing = crud_user.get_by_username(db, new_username)
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That username is already taken")
        crud_user.set_username(db, current_user, new_username)
        crud_audit.log(
            db, action=AuditAction.UPDATE, entity_type="security", entity_name="username",
            user_id=current_user.id, detail=f"Username changed to '{new_username}'",
        )


# --- TOTP ------------------------------------------------------------------

@router.get("/totp/status", response_model=TotpStatus)
def totp_status(current_user: User = Depends(get_current_user)) -> TotpStatus:
    return TotpStatus(enabled=current_user.totp_enabled)


@router.post("/totp/setup", response_model=TotpSetupResponse)
def totp_setup(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TotpSetupResponse:
    secret = generate_totp_secret()
    current_user.totp_pending_secret_encrypted = encrypt_secret(secret)
    crud_user.save(db, current_user)
    return TotpSetupResponse(
        secret=secret,
        otpauth_url=totp_provisioning_uri(secret, current_user.username),
    )


@router.post("/totp/enable", status_code=status.HTTP_204_NO_CONTENT)
def totp_enable(
    payload: TotpEnableRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    if not current_user.totp_pending_secret_encrypted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Start TOTP setup first")

    pending_secret = decrypt_secret(current_user.totp_pending_secret_encrypted)
    if not verify_totp_code(pending_secret, payload.code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect code, please try again")

    current_user.totp_secret_encrypted = current_user.totp_pending_secret_encrypted
    current_user.totp_pending_secret_encrypted = None
    current_user.totp_enabled = True
    crud_user.save(db, current_user)
    crud_audit.log(
        db, action=AuditAction.UPDATE, entity_type="security", entity_name="totp",
        user_id=current_user.id, detail="Two-factor authentication enabled",
    )


@router.post("/totp/disable", status_code=status.HTTP_204_NO_CONTENT)
def totp_disable(
    payload: TotpDisableRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    _require_current_password(current_user, payload.current_password)

    current_user.totp_enabled = False
    current_user.totp_secret_encrypted = None
    current_user.totp_pending_secret_encrypted = None
    crud_user.save(db, current_user)
    crud_recovery_code.clear_codes(db, current_user.id)
    crud_audit.log(
        db, action=AuditAction.UPDATE, entity_type="security", entity_name="totp",
        user_id=current_user.id, detail="Two-factor authentication disabled",
    )


# --- Recovery codes ----------------------------------------------------

@router.get("/recovery-codes/status", response_model=RecoveryCodesStatus)
def recovery_codes_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecoveryCodesStatus:
    return RecoveryCodesStatus(
        available=current_user.totp_enabled,
        remaining=crud_recovery_code.count_remaining(db, current_user.id),
        generated_at=current_user.recovery_codes_generated_at,
    )


@router.post("/recovery-codes/generate", response_model=RecoveryCodesResponse)
def recovery_codes_generate(
    payload: RecoveryCodesGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecoveryCodesResponse:
    _require_current_password(current_user, payload.current_password)

    if not current_user.totp_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Enable two-factor authentication before generating recovery codes",
        )

    codes = crud_recovery_code.replace_codes(db, current_user.id)
    current_user.recovery_codes_generated_at = datetime.now(timezone.utc)
    crud_user.save(db, current_user)
    crud_audit.log(
        db, action=AuditAction.UPDATE, entity_type="security", entity_name="recovery_codes",
        user_id=current_user.id, detail="Recovery codes regenerated",
    )
    return RecoveryCodesResponse(codes=codes, generated_at=current_user.recovery_codes_generated_at)


# --- Sessions ------------------------------------------------------------

@router.get("/sessions", response_model=list[SessionRead])
def list_sessions(
    current_session: SessionModel = Depends(get_current_session),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SessionRead]:
    sessions = crud_session.list_active_sessions(db, current_user.id)
    result = []
    for s in sessions:
        item = SessionRead.model_validate(s)
        item.is_current = s.id == current_session.id
        result.append(item)
    return result


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    session = crud_session.get_session(db, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    crud_session.revoke_session(db, session)
    crud_audit.log(
        db, action=AuditAction.UPDATE, entity_type="security", entity_name="session",
        user_id=current_user.id, detail="Session revoked",
    )


@router.post("/sessions/logout-everywhere", status_code=status.HTTP_204_NO_CONTENT)
def logout_everywhere(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    count = crud_session.revoke_all_sessions(db, current_user.id)
    crud_audit.log(
        db, action=AuditAction.LOGOUT, entity_type="security", entity_name="all_sessions",
        user_id=current_user.id, detail=f"Logged out of {count} session(s)",
    )


# --- Session timeout -----------------------------------------------------

@router.get("/session-timeout", response_model=SessionTimeoutRead)
def get_session_timeout(current_user: User = Depends(get_current_user)) -> SessionTimeoutRead:
    return SessionTimeoutRead(session_timeout_minutes=current_user.session_timeout_minutes)


@router.put("/session-timeout", response_model=SessionTimeoutRead)
def update_session_timeout(
    payload: SessionTimeoutUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionTimeoutRead:
    current_user.session_timeout_minutes = payload.session_timeout_minutes
    crud_user.save(db, current_user)
    return SessionTimeoutRead(session_timeout_minutes=current_user.session_timeout_minutes)
