from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.crud import crud_audit, crud_resource, crud_workspace
from app.db.session import get_db
from app.models.enums import AuditAction
from app.models.user import User
from app.schemas.resource import ResourceCreate, ResourceDetail, ResourceRead, ResourceUpdate

router = APIRouter(tags=["resources"])


def _to_read(db: Session, resource) -> ResourceRead:
    data = ResourceRead.model_validate(resource)
    counts = crud_resource.counts_for_resource(db, resource.id)
    data.credential_count = counts["credential_count"]
    data.file_count = counts["file_count"]
    data.note_count = counts["note_count"]
    return data


def _get_owned_workspace_or_404(db: Session, workspace_id: str, owner_id: str):
    workspace = crud_workspace.get_workspace(db, workspace_id, owner_id)
    if not workspace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    return workspace


def get_owned_resource_or_404(db: Session, resource_id: str, owner_id: str):
    resource = crud_resource.get_resource(db, resource_id)
    if not resource or resource.workspace.owner_id != owner_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    return resource


@router.get("/workspaces/{workspace_id}/resources", response_model=list[ResourceRead])
def list_resources(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ResourceRead]:
    _get_owned_workspace_or_404(db, workspace_id, current_user.id)
    resources = crud_resource.list_resources(db, workspace_id)
    return [_to_read(db, r) for r in resources]


@router.post(
    "/workspaces/{workspace_id}/resources",
    response_model=ResourceRead,
    status_code=status.HTTP_201_CREATED,
)
def create_resource(
    workspace_id: str,
    payload: ResourceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResourceRead:
    _get_owned_workspace_or_404(db, workspace_id, current_user.id)
    resource = crud_resource.create_resource(db, payload, workspace_id)
    crud_audit.log(
        db,
        action=AuditAction.CREATE,
        entity_type="resource",
        entity_id=resource.id,
        entity_name=resource.name,
        user_id=current_user.id,
        resource_id=resource.id,
        workspace_id=workspace_id,
    )
    return _to_read(db, resource)


@router.get("/resources/{resource_id}", response_model=ResourceDetail)
def get_resource(
    resource_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResourceDetail:
    resource = get_owned_resource_or_404(db, resource_id, current_user.id)
    base = _to_read(db, resource)
    return ResourceDetail(**base.model_dump(), workspace_name=resource.workspace.name)


@router.put("/resources/{resource_id}", response_model=ResourceRead)
def update_resource(
    resource_id: str,
    payload: ResourceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResourceRead:
    resource = get_owned_resource_or_404(db, resource_id, current_user.id)
    resource = crud_resource.update_resource(db, resource, payload)
    crud_audit.log(
        db,
        action=AuditAction.UPDATE,
        entity_type="resource",
        entity_id=resource.id,
        entity_name=resource.name,
        user_id=current_user.id,
        resource_id=resource.id,
        workspace_id=resource.workspace_id,
    )
    return _to_read(db, resource)


@router.delete("/resources/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(
    resource_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    resource = get_owned_resource_or_404(db, resource_id, current_user.id)
    crud_audit.log(
        db,
        action=AuditAction.DELETE,
        entity_type="resource",
        entity_id=resource.id,
        entity_name=resource.name,
        user_id=current_user.id,
        workspace_id=resource.workspace_id,
    )
    crud_resource.delete_resource(db, resource)
