from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.routes.resources import get_owned_resource_or_404
from app.crud import crud_audit
from app.db.session import get_db
from app.models.user import User
from app.schemas.audit import AuditLogRead

router = APIRouter(tags=["audit"])


@router.get("/resources/{resource_id}/audit", response_model=list[AuditLogRead])
def list_audit_log(
    resource_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AuditLogRead]:
    get_owned_resource_or_404(db, resource_id, current_user.id)
    return crud_audit.list_for_resource(db, resource_id)
