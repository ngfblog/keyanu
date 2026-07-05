"""Import all models here so SQLAlchemy's declarative registry sees them,
which is required for relationship() string resolution and Alembic
autogeneration to work correctly.
"""
from app.models.user import User  # noqa: F401
from app.models.workspace import Workspace  # noqa: F401
from app.models.resource import Resource  # noqa: F401
from app.models.credential import Credential  # noqa: F401
from app.models.file import ResourceFile  # noqa: F401
from app.models.note import Note  # noqa: F401
from app.models.audit_log import AuditLog  # noqa: F401
from app.models.session import Session  # noqa: F401
from app.models.recovery_code import RecoveryCode  # noqa: F401

__all__ = [
    "User",
    "Workspace",
    "Resource",
    "Credential",
    "ResourceFile",
    "Note",
    "AuditLog",
    "Session",
    "RecoveryCode",
]
