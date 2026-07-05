"""Guards against config values that look wired in but silently do nothing --
this caught a real bug where DEFAULT_SESSION_TIMEOUT_MINUTES existed in
Settings but was never read anywhere."""
from app.core.config import settings
from app.crud import crud_user
from app.db.session import SessionLocal


def test_default_session_timeout_applies_to_new_users(client, monkeypatch):
    monkeypatch.setattr(settings, "DEFAULT_SESSION_TIMEOUT_MINUTES", 42)

    db = SessionLocal()
    try:
        user = crud_user.create_user(db, username="timeout-check-user", password="Sup3rSecret!123")
        assert user.session_timeout_minutes == 42
    finally:
        db.delete(user)
        db.commit()
        db.close()
