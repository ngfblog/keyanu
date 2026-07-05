from sqlalchemy import Boolean, String
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
    accent_color: Mapped[str] = mapped_column(String(16), nullable=False, default="#D4A72C")
    compact_mode: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    animations_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    workspaces: Mapped[list["Workspace"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )
