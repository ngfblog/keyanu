"""Application configuration loaded from environment variables."""
from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application settings.

    All values can be overridden via environment variables or a `.env` file.
    """

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- General ---
    APP_NAME: str = "Keyanu"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "production"
    API_V1_PREFIX: str = "/api"

    # --- Security ---
    # Used to sign JWT session tokens. MUST be overridden in production.
    SECRET_KEY: str = "change-me-please-this-is-not-secure-for-production-use"
    # Used to derive the Fernet key that encrypts credential secrets at rest.
    # MUST be overridden in production and never changed after data exists.
    ENCRYPTION_KEY: str = "change-me-please-this-is-not-secure-for-production-use"
    ALGORITHM: str = "HS256"
    # Default idle session timeout for newly created users (minutes). Each
    # user can change their own value under Settings > Security.
    DEFAULT_SESSION_TIMEOUT_MINUTES: int = 720  # 12 hours

    # --- Bootstrap single-user admin account ---
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "keyanu-admin"

    # --- Storage paths ---
    DATA_DIR: str = "/data"
    DB_FILENAME: str = "keyanu.db"
    FILES_DIR_NAME: str = "files"

    # --- CORS ---
    CORS_ORIGINS: List[str] = ["*"]

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
    def database_url(self) -> str:
        db_path = self.data_dir_path / self.DB_FILENAME
        return f"sqlite:///{db_path}"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
