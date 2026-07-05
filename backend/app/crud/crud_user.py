from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.models.user import User


def get_by_username(db: Session, username: str) -> User | None:
    stmt = select(User).where(User.username == username)
    return db.execute(stmt).scalar_one_or_none()


def get_by_id(db: Session, user_id: str) -> User | None:
    return db.get(User, user_id)


def create_user(
    db: Session,
    username: str,
    password: str,
    display_name: str | None = None,
    must_change_password: bool = False,
) -> User:
    user = User(
        username=username,
        hashed_password=hash_password(password),
        display_name=display_name,
        must_change_password=must_change_password,
        session_timeout_minutes=settings.DEFAULT_SESSION_TIMEOUT_MINUTES,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate(db: Session, username: str, password: str) -> User | None:
    user = get_by_username(db, username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def set_password(db: Session, user: User, new_password: str, clear_must_change: bool = True) -> User:
    user.hashed_password = hash_password(new_password)
    if clear_must_change:
        user.must_change_password = False
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def set_username(db: Session, user: User, new_username: str) -> User:
    user.username = new_username
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def count_users(db: Session) -> int:
    return db.query(User).count()


def update_preferences(db: Session, user: User, data: dict) -> User:
    for key, value in data.items():
        if value is not None:
            setattr(user, key, value)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def save(db: Session, user: User) -> User:
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
