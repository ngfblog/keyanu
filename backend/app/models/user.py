from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "users"

    username: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(128), nullable=True)

    # --- Preferences (Settings > General / Appearance) ---
    time_format: Mapped[str] = mapped_column(String(8), nullable=False, default="24h")
    theme: Mapped[str] = mapped_column(String(8), nullable=False, default="system")
    accent_color: Mapped[str] = mapped_column(String(16), nullable=False, default="#D4A72C")
    compact_mode: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    animations_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # --- Security ---
    must_change_password: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    totp_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # Fernet-encrypted base32 TOTP secrets (reuses the same encryption used for credentials).
    totp_secret_encrypted: Mapped[str | None] = mapped_column(String(255), nullable=True)
    totp_pending_secret_encrypted: Mapped[str | None] = mapped_column(String(255), nullable=True)
    recovery_codes_generated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    session_timeout_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=720)

    workspaces: Mapped[list["Workspace"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )
