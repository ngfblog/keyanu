from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_session, get_current_user
from app.core.security import (
    create_login_ticket,
    create_session_token,
    decode_login_ticket,
    decrypt_secret,
    verify_totp_code,
)
from app.crud import crud_audit, crud_recovery_code, crud_session, crud_user
from app.db.session import get_db
from app.models.enums import AuditAction
from app.models.session import Session as SessionModel
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, TokenResponse, TotpLoginRequest
from app.schemas.user import UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


def _client_meta(request: Request) -> tuple[str | None, str | None]:
    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host if request.client else None
    return user_agent, ip_address


def _issue_session(db: Session, user: User, request: Request) -> TokenResponse:
    user_agent, ip_address = _client_meta(request)
    session = crud_session.create_session(
        db, user_id=user.id, timeout_minutes=user.session_timeout_minutes,
        user_agent=user_agent, ip_address=ip_address,
    )
    token = create_session_token(session.id)
    return TokenResponse(access_token=token, must_change_password=user.must_change_password)


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> LoginResponse:
    user = crud_user.authenticate(db, payload.username, payload.password)
    if not user:
        crud_audit.log(
            db,
            action=AuditAction.LOGIN_FAILED,
            entity_type="user",
            entity_name=payload.username,
            detail="Invalid username or password",
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")

    if user.totp_enabled:
        ticket = create_login_ticket(user.username)
        return LoginResponse(requires_totp=True, login_ticket=ticket)

    crud_audit.log(
        db, action=AuditAction.LOGIN, entity_type="user", user_id=user.id, entity_name=user.username
    )
    token_response = _issue_session(db, user, request)
    return LoginResponse(
        access_token=token_response.access_token,
        must_change_password=token_response.must_change_password,
    )


@router.post("/login/totp", response_model=LoginResponse)
def login_totp(payload: TotpLoginRequest, request: Request, db: Session = Depends(get_db)) -> LoginResponse:
    username = decode_login_ticket(payload.login_ticket)
    if not username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Login session expired, please sign in again")

    user = crud_user.get_by_username(db, username)
    if not user or not user.totp_enabled:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid login session")

    code_ok = False
    if user.totp_secret_encrypted:
        secret = decrypt_secret(user.totp_secret_encrypted)
        code_ok = verify_totp_code(secret, payload.code)

    if not code_ok:
        code_ok = crud_recovery_code.verify_and_consume(db, user.id, payload.code)

    if not code_ok:
        crud_audit.log(
            db,
            action=AuditAction.LOGIN_FAILED,
            entity_type="user",
            entity_name=user.username,
            user_id=user.id,
            detail="Invalid TOTP or recovery code",
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid code")

    crud_audit.log(
        db, action=AuditAction.LOGIN, entity_type="user", user_id=user.id, entity_name=user.username,
        detail="via TOTP",
    )
    return _issue_session(db, user, request)


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    session: SessionModel = Depends(get_current_session),
    db: Session = Depends(get_db),
) -> None:
    crud_audit.log(
        db, action=AuditAction.LOGOUT, entity_type="user", user_id=session.user_id,
    )
    crud_session.revoke_session(db, session)
