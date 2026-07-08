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


def test_secret_keys_persist_to_appdata_when_env_present(tmp_path, monkeypatch):
    from app.core.config import Settings

    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    monkeypatch.setenv("SECRET_KEY", "env-secret")
    monkeypatch.setenv("ENCRYPTION_KEY", "env-encryption")

    settings = Settings()

    assert settings.SECRET_KEY == "env-secret"
    assert settings.ENCRYPTION_KEY == "env-encryption"
    assert (tmp_path / "config.json").is_file()
    assert '"SECRET_KEY": "env-secret"' in (tmp_path / "config.json").read_text()


def test_secret_keys_load_from_appdata_when_env_missing(tmp_path, monkeypatch):
    import json
    from app.core.config import Settings

    (tmp_path / "config.json").write_text(json.dumps({"SECRET_KEY": "stored-secret", "ENCRYPTION_KEY": "stored-encryption"}))
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    monkeypatch.delenv("SECRET_KEY", raising=False)
    monkeypatch.delenv("ENCRYPTION_KEY", raising=False)

    settings = Settings()

    assert settings.SECRET_KEY == "stored-secret"
    assert settings.ENCRYPTION_KEY == "stored-encryption"


def test_icon_directory_is_under_persistent_appdata(tmp_path, monkeypatch):
    from app.core.config import Settings

    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    settings = Settings()

    assert settings.icons_dir_path == tmp_path / "appdata" / "icons"


def test_encryption_key_is_not_silently_replaced_when_data_exists(tmp_path, monkeypatch):
    import json
    import pytest
    from app.core.config import Settings

    (tmp_path / "config.json").write_text(json.dumps({"SECRET_KEY": "stored-secret", "ENCRYPTION_KEY": "stored-encryption"}))
    (tmp_path / "keyanu.db").write_bytes(b"existing data")
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    monkeypatch.setenv("SECRET_KEY", "env-secret")
    monkeypatch.setenv("ENCRYPTION_KEY", "different-encryption")

    with pytest.raises(RuntimeError, match="differs from the persisted appdata key"):
        Settings()
