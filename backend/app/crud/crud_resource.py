from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.credential import Credential
from app.models.file import ResourceFile
from app.models.note import Note
from app.models.resource import Resource
from app.schemas.resource import ResourceCreate, ResourceUpdate


def list_resources(db: Session, workspace_id: str) -> list[Resource]:
    stmt = (
        select(Resource)
        .where(Resource.workspace_id == workspace_id)
        .order_by(Resource.name, Resource.id)
    )
    return list(db.execute(stmt).scalars().all())


def get_resource(db: Session, resource_id: str) -> Resource | None:
    return db.get(Resource, resource_id)


def create_resource(db: Session, data: ResourceCreate, workspace_id: str) -> Resource:
    resource = Resource(**data.model_dump(), workspace_id=workspace_id)
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource


def update_resource(db: Session, resource: Resource, data: ResourceUpdate) -> Resource:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(resource, key, value)
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource


def move_resource(db: Session, resource: Resource, destination_workspace_id: str) -> Resource:
    resource.workspace_id = destination_workspace_id
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource


def delete_resource(db: Session, resource: Resource) -> None:
    db.delete(resource)
    db.commit()


def counts_for_resource(db: Session, resource_id: str) -> dict[str, int]:
    return {
        "credential_count": db.query(Credential).filter(Credential.resource_id == resource_id).count(),
        "file_count": db.query(ResourceFile).filter(ResourceFile.resource_id == resource_id).count(),
        "note_count": db.query(Note).filter(Note.resource_id == resource_id).count(),
    }
