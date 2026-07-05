from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_session_token
from app.crud import crud_session, crud_user
from app.db.session import get_db
from app.models.session import Session as SessionModel
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# Paths a user with must_change_password=True is still allowed to hit.
# Everything else 403s with a detail the frontend recognizes and redirects on.
PASSWORD_CHANGE_ALLOWLIST = {
    "/api/auth/me",
    "/api/auth/logout",
    "/api/security/change-password",
}

PASSWORD_CHANGE_REQUIRED_DETAIL = "PASSWORD_CHANGE_REQUIRED"


def get_current_session(
    request: Request,
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> SessionModel:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    session_id = decode_session_token(token)
    if session_id is None:
        raise credentials_exception

    session = crud_session.get_session(db, session_id)
    if not crud_session.is_session_valid(session):
        raise credentials_exception

    # Sliding idle timeout: every validated request extends the session by
    # the user's configured Session Timeout.
    user = crud_user.get_by_id(db, session.user_id)
    if not user:
        raise credentials_exception
    crud_session.touch_session(db, session, user.session_timeout_minutes)

    request.state.session_id = session.id
    request.state.current_user = user
    return session


def get_current_user(
    request: Request,
    session: SessionModel = Depends(get_current_session),
    db: Session = Depends(get_db),
) -> User:
    user = crud_user.get_by_id(db, session.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

    if user.must_change_password and request.url.path not in PASSWORD_CHANGE_ALLOWLIST:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=PASSWORD_CHANGE_REQUIRED_DETAIL,
        )

    return user
