from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.crud import crud_audit, crud_workspace
from app.db.session import get_db
from app.models.enums import AuditAction
from app.models.user import User
from app.core.icon_files import delete_icon_reference, save_uploaded_icon
from app.schemas.workspace import WorkspaceCreate, WorkspaceRead, WorkspaceUpdate

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


def _to_read(db: Session, workspace) -> WorkspaceRead:
    data = WorkspaceRead.model_validate(workspace)
    data.resource_count = crud_workspace.resource_count(db, workspace.id)
    return data


@router.get("", response_model=list[WorkspaceRead])
def list_workspaces(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[WorkspaceRead]:
    workspaces = crud_workspace.list_workspaces(db, current_user.id)
    return [_to_read(db, w) for w in workspaces]


@router.post("", response_model=WorkspaceRead, status_code=status.HTTP_201_CREATED)
def create_workspace(
    payload: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WorkspaceRead:
    workspace = crud_workspace.create_workspace(db, payload, current_user.id)
    crud_audit.log(
        db,
        action=AuditAction.CREATE,
        entity_type="workspace",
        entity_id=workspace.id,
        entity_name=workspace.name,
        user_id=current_user.id,
        workspace_id=workspace.id,
    )
    return _to_read(db, workspace)


def _get_or_404(db: Session, workspace_id: str, owner_id: str):
    workspace = crud_workspace.get_workspace(db, workspace_id, owner_id)
    if not workspace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    return workspace


@router.get("/{workspace_id}", response_model=WorkspaceRead)
def get_workspace(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WorkspaceRead:
    workspace = _get_or_404(db, workspace_id, current_user.id)
    return _to_read(db, workspace)


@router.post("/{workspace_id}/icon", response_model=WorkspaceRead)
async def upload_workspace_icon(
    workspace_id: str,
    upload: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WorkspaceRead:
    workspace = _get_or_404(db, workspace_id, current_user.id)
    old_icon = workspace.icon
    workspace.icon = await save_uploaded_icon(upload)
    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    delete_icon_reference(old_icon)
    crud_audit.log(
        db,
        action=AuditAction.UPDATE,
        entity_type="workspace",
        entity_id=workspace.id,
        entity_name=workspace.name,
        user_id=current_user.id,
        workspace_id=workspace.id,
    )
    return _to_read(db, workspace)


@router.put("/{workspace_id}", response_model=WorkspaceRead)
def update_workspace(
    workspace_id: str,
    payload: WorkspaceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WorkspaceRead:
    workspace = _get_or_404(db, workspace_id, current_user.id)
    old_icon = workspace.icon
    workspace = crud_workspace.update_workspace(db, workspace, payload)
    if workspace.icon != old_icon:
        delete_icon_reference(old_icon)
    crud_audit.log(
        db,
        action=AuditAction.UPDATE,
        entity_type="workspace",
        entity_id=workspace.id,
        entity_name=workspace.name,
        user_id=current_user.id,
        workspace_id=workspace.id,
    )
    return _to_read(db, workspace)


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    workspace = _get_or_404(db, workspace_id, current_user.id)
    crud_audit.log(
        db,
        action=AuditAction.DELETE,
        entity_type="workspace",
        entity_id=workspace.id,
        entity_name=workspace.name,
        user_id=current_user.id,
    )
    delete_icon_reference(workspace.icon)
    crud_workspace.delete_workspace(db, workspace)
