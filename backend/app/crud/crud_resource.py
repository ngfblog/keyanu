import shutil
import uuid
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.credential import Credential
from app.models.file import ResourceFile
from app.models.note import Note
from app.core.config import settings
from app.core.icon_files import icon_dir_path, icon_filename, icon_reference, is_custom_icon
from app.models.resource import Resource
from app.schemas.resource import ResourceCreate, ResourceDuplicate, ResourceUpdate


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



def _duplicate_icon(icon: str | None) -> str | None:
    if not is_custom_icon(icon):
        return icon
    source = icon_dir_path() / icon_filename(icon or "")
    if not source.is_file():
        return icon
    target_name = f"{uuid.uuid4().hex}{source.suffix}"
    shutil.copy2(source, icon_dir_path() / target_name)
    return icon_reference(target_name)


def _duplicate_file(file_obj: ResourceFile, new_resource_id: str) -> ResourceFile:
    source = Path(file_obj.storage_path)
    resource_dir = settings.files_dir_path / new_resource_id
    resource_dir.mkdir(parents=True, exist_ok=True)
    target = resource_dir / f"{uuid.uuid4().hex}_{source.name.split('_', 1)[-1]}"
    if source.is_file():
        shutil.copy2(source, target)
    return ResourceFile(
        filename=file_obj.filename,
        content_type=file_obj.content_type,
        size_bytes=file_obj.size_bytes,
        storage_path=str(target),
        detected_metadata=file_obj.detected_metadata,
        resource_id=new_resource_id,
    )


def duplicate_resource(db: Session, source: Resource, data: ResourceDuplicate) -> Resource:
    resource = Resource(
        name=data.name.strip(),
        type=source.type,
        icon=_duplicate_icon(source.icon) if data.copy_icon else None,
        description=source.description,
        hostname=source.hostname,
        tags=source.tags if data.copy_tags else None,
        workspace_id=data.destination_workspace_id,
    )
    db.add(resource)
    db.flush()

    if data.copy_credentials:
        for credential in source.credentials:
            db.add(Credential(
                name=credential.name,
                template=credential.template,
                summary=credential.summary,
                encrypted_data=credential.encrypted_data,
                resource_id=resource.id,
            ))

    if data.copy_notes:
        for note in source.notes:
            db.add(Note(title=note.title, content=note.content, resource_id=resource.id))

    if data.copy_files:
        for file_obj in source.files:
            db.add(_duplicate_file(file_obj, resource.id))

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
