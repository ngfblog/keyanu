from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.enums import AuditAction


def log(
    db: Session,
    action: AuditAction,
    entity_type: str,
    user_id: str | None = None,
    entity_id: str | None = None,
    entity_name: str | None = None,
    detail: str | None = None,
    resource_id: str | None = None,
    workspace_id: str | None = None,
) -> AuditLog:
    entry = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        detail=detail,
        user_id=user_id,
        resource_id=resource_id,
        workspace_id=workspace_id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def list_for_resource(db: Session, resource_id: str, limit: int = 100) -> list[AuditLog]:
    stmt = (
        select(AuditLog)
        .where(AuditLog.resource_id == resource_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )
    return list(db.execute(stmt).scalars().all())


def list_all(db: Session) -> list[AuditLog]:
    """Keyanu v1 is single-user, so every audit row belongs to the one
    account -- used for full-account backup export."""
    stmt = select(AuditLog).order_by(AuditLog.created_at.asc())
    return list(db.execute(stmt).scalars().all())


def delete_all(db: Session) -> None:
    db.query(AuditLog).delete()
    db.commit()
