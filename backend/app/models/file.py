from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class ResourceFile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "resource_files"

    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(128), nullable=True)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    storage_path: Mapped[str] = mapped_column(String(512), nullable=False)
    # Reserved for future automatic metadata extraction (e.g. cert expiry, key type).
    detected_metadata: Mapped[str] = mapped_column(String(1024), nullable=True)

    resource_id: Mapped[str] = mapped_column(
        ForeignKey("resources.id", ondelete="CASCADE"), nullable=False, index=True
    )
    resource: Mapped["Resource"] = relationship(back_populates="files")
