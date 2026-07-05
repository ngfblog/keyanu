from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import ResourceType
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Resource(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "resources"

    name: Mapped[str] = mapped_column(String(128), nullable=False)
    type: Mapped[ResourceType] = mapped_column(
        Enum(ResourceType, native_enum=False, length=32), nullable=False, default=ResourceType.CUSTOM
    )
    description: Mapped[str] = mapped_column(Text, nullable=True)
    hostname: Mapped[str] = mapped_column(String(255), nullable=True)
    tags: Mapped[str] = mapped_column(String(512), nullable=True)  # comma-separated

    workspace_id: Mapped[str] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    workspace: Mapped["Workspace"] = relationship(back_populates="resources")

    credentials: Mapped[list["Credential"]] = relationship(
        back_populates="resource", cascade="all, delete-orphan", order_by="Credential.name"
    )
    files: Mapped[list["ResourceFile"]] = relationship(
        back_populates="resource", cascade="all, delete-orphan"
    )
    notes: Mapped[list["Note"]] = relationship(
        back_populates="resource", cascade="all, delete-orphan", order_by="Note.updated_at.desc()"
    )
