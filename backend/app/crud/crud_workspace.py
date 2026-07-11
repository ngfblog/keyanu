from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.resource import Resource
from app.models.workspace import Workspace
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate


def list_workspaces(db: Session, owner_id: str) -> list[Workspace]:
    stmt = (
        select(Workspace)
        .where(Workspace.owner_id == owner_id)
        .order_by(Workspace.created_at, Workspace.id)
    )
    return list(db.execute(stmt).scalars().all())


def get_workspace(db: Session, workspace_id: str, owner_id: str) -> Workspace | None:
    stmt = select(Workspace).where(Workspace.id == workspace_id, Workspace.owner_id == owner_id)
    return db.execute(stmt).scalar_one_or_none()


def create_workspace(db: Session, data: WorkspaceCreate, owner_id: str) -> Workspace:
    workspace = Workspace(**data.model_dump(), owner_id=owner_id)
    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    return workspace


def update_workspace(db: Session, workspace: Workspace, data: WorkspaceUpdate) -> Workspace:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(workspace, key, value)
    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    return workspace


def delete_workspace(db: Session, workspace: Workspace) -> None:
    db.delete(workspace)
    db.commit()


def resource_count(db: Session, workspace_id: str) -> int:
    return db.query(Resource).filter(Resource.workspace_id == workspace_id).count()
