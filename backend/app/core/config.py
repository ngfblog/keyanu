"""Application configuration loaded from environment variables and persistent appdata."""
import json
import os
import secrets
from functools import lru_cache
from pathlib import Path
from typing import Any, List

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PERSISTED_CONFIG_FILENAME = "config.json"
_PERSISTED_SECRET_KEYS = ("SECRET_KEY", "ENCRYPTION_KEY")


def _has_env_value(name: str) -> bool:
    return bool(os.environ.get(name))


def _load_persisted_config(data_dir: Path) -> dict[str, Any]:
    path = data_dir / PERSISTED_CONFIG_FILENAME
    if not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Unable to read persisted Keyanu config at {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise RuntimeError(f"Persisted Keyanu config at {path} must contain a JSON object.")
    return data


def _save_persisted_config(data_dir: Path, config: dict[str, Any]) -> None:
    data_dir.mkdir(parents=True, exist_ok=True)
    path = data_dir / PERSISTED_CONFIG_FILENAME
    tmp_path = path.with_suffix(".json.tmp")
    tmp_path.write_text(json.dumps(config, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    tmp_path.replace(path)
    try:
        path.chmod(0o600)
    except OSError:
        pass


class Settings(BaseSettings):
    """Central application settings.

    Environment variables win when provided. SECRET_KEY and ENCRYPTION_KEY are
    also written to DATA_DIR/config.json on first use, then reloaded from that
    persistent file when container-managed environment variables disappear.
    """

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- General ---
    APP_NAME: str = "Keyanu"
    APP_VERSION: str = "0.3.0"
    ENVIRONMENT: str = "production"
    API_V1_PREFIX: str = "/api"

    # --- Security ---
    SECRET_KEY: str = "change-me-please-this-is-not-secure-for-production-use"
    ENCRYPTION_KEY: str = "change-me-please-this-is-not-secure-for-production-use"
    ALGORITHM: str = "HS256"
    DEFAULT_SESSION_TIMEOUT_MINUTES: int = 720

    # --- Bootstrap single-user admin account ---
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "keyanu-admin"

    # --- Storage paths ---
    DATA_DIR: str = "/data"
    DB_FILENAME: str = "keyanu.db"
    FILES_DIR_NAME: str = "files"
    ICONS_DIR_NAME: str = "appdata/icons"

    # --- CORS ---
    CORS_ORIGINS: List[str] = ["*"]

    @model_validator(mode="after")
    def load_or_persist_secret_keys(self) -> "Settings":
        data_dir = Path(self.DATA_DIR)
        data_dir.mkdir(parents=True, exist_ok=True)
        persisted = _load_persisted_config(data_dir)
        changed = False

        for key in _PERSISTED_SECRET_KEYS:
            env_has_value = _has_env_value(key)
            current = getattr(self, key)
            stored = persisted.get(key)
            if env_has_value:
                if (
                    key == "ENCRYPTION_KEY"
                    and stored
                    and str(stored) != current
                    and (data_dir / self.DB_FILENAME).is_file()
                ):
                    raise RuntimeError(
                        "Refusing to start with an ENCRYPTION_KEY that differs from the persisted appdata key. "
                        "Use the original ENCRYPTION_KEY stored in DATA_DIR/config.json to keep encrypted data readable."
                    )
                if not stored:
                    persisted[key] = current
                    changed = True
                continue
            if stored:
                setattr(self, key, str(stored))
                continue
            generated = secrets.token_urlsafe(48)
            setattr(self, key, generated)
            persisted[key] = generated
            changed = True

        if changed:
            _save_persisted_config(data_dir, persisted)
        return self

    @property
    def data_dir_path(self) -> Path:
        path = Path(self.DATA_DIR)
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def files_dir_path(self) -> Path:
        path = self.data_dir_path / self.FILES_DIR_NAME
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def icons_dir_path(self) -> Path:
        path = self.data_dir_path / self.ICONS_DIR_NAME
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def database_url(self) -> str:
        db_path = self.data_dir_path / self.DB_FILENAME
        return f"sqlite:///{db_path}"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
