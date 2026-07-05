from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import CredentialTemplate
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Credential(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """A single credential attached to a resource.

    Sensitive field values are stored as a single Fernet-encrypted JSON blob
    (`encrypted_data`). Non-sensitive display metadata is kept in plaintext
    columns so resource cards can render without decrypting secrets.
    """

    __tablename__ = "credentials"

    name: Mapped[str] = mapped_column(String(128), nullable=False)
    template: Mapped[CredentialTemplate] = mapped_column(
        Enum(CredentialTemplate, native_enum=False, length=32), nullable=False
    )
    # Non-sensitive short description shown on cards, e.g. "ed25519 · SHA256:ab12..."
    summary: Mapped[str] = mapped_column(String(255), nullable=True)
    # Fernet-encrypted JSON string of the template's field values.
    encrypted_data: Mapped[str] = mapped_column(Text, nullable=False)

    resource_id: Mapped[str] = mapped_column(
        ForeignKey("resources.id", ondelete="CASCADE"), nullable=False, index=True
    )
    resource: Mapped["Resource"] = relationship(back_populates="credentials")
