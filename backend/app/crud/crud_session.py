from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from app.models.session import Session


def create_session(
    db: OrmSession,
    user_id: str,
    timeout_minutes: int,
    user_agent: str | None,
    ip_address: str | None,
) -> Session:
    now = datetime.now(timezone.utc)
    session = Session(
        user_id=user_id,
        created_at=now,
        last_seen_at=now,
        expires_at=now + timedelta(minutes=timeout_minutes),
        user_agent=user_agent,
        ip_address=ip_address,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_session(db: OrmSession, session_id: str) -> Session | None:
    return db.get(Session, session_id)


def touch_session(db: OrmSession, session: Session, timeout_minutes: int) -> Session:
    now = datetime.now(timezone.utc)
    session.last_seen_at = now
    session.expires_at = now + timedelta(minutes=timeout_minutes)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def is_session_valid(session: Session | None) -> bool:
    if session is None or session.revoked_at is not None:
        return False
    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) <= expires_at


def list_active_sessions(db: OrmSession, user_id: str) -> list[Session]:
    now = datetime.now(timezone.utc)
    stmt = (
        select(Session)
        .where(Session.user_id == user_id, Session.revoked_at.is_(None), Session.expires_at >= now)
        .order_by(Session.last_seen_at.desc())
    )
    return list(db.execute(stmt).scalars().all())


def revoke_session(db: OrmSession, session: Session) -> Session:
    session.revoked_at = datetime.now(timezone.utc)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def revoke_all_sessions(db: OrmSession, user_id: str) -> int:
    sessions = list_active_sessions(db, user_id)
    now = datetime.now(timezone.utc)
    for session in sessions:
        session.revoked_at = now
        db.add(session)
    db.commit()
    return len(sessions)
