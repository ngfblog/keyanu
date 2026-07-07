from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Workspace(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "workspaces"

    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    type: Mapped[str] = mapped_column(String(64), nullable=True, default="website")
    icon: Mapped[str] = mapped_column(String(255), nullable=True, default="folder")
    color: Mapped[str] = mapped_column(String(16), nullable=True, default="#d4a72c")

    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    owner: Mapped["User"] = relationship(back_populates="workspaces")

    resources: Mapped[list["Resource"]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan", order_by="Resource.name"
    )
