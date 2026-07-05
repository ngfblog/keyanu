from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin, utcnow


class Session(Base, UUIDPrimaryKeyMixin):
    """A server-side login session.

    The JWT issued to the client only carries this row's id ("sid"). Every
    authenticated request looks the session up here to check it hasn't been
    revoked or timed out, and slides `expires_at` forward on activity.
    """

    __tablename__ = "sessions"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    user_agent: Mapped[str] = mapped_column(String(512), nullable=True)
    ip_address: Mapped[str] = mapped_column(String(64), nullable=True)

    user: Mapped["User"] = relationship()
