import shutil
import uuid
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.icon_files import icon_dir_path, icon_filename, icon_reference, is_custom_icon
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


def _copy_resource_file(source_file: ResourceFile, destination_resource_id: str) -> ResourceFile:
    source_path = Path(source_file.storage_path)
    destination_dir = settings.files_dir_path / destination_resource_id
    destination_dir.mkdir(parents=True, exist_ok=True)
    destination_name = f"{uuid.uuid4().hex}_{source_file.filename}"
    destination_path = destination_dir / destination_name
    if source_path.exists():
        shutil.copy2(source_path, destination_path)
    else:
        destination_path.write_bytes(b"")

    return ResourceFile(
        filename=source_file.filename,
        content_type=source_file.content_type,
        size_bytes=source_file.size_bytes,
        storage_path=str(destination_path),
        detected_metadata=source_file.detected_metadata,
        resource_id=destination_resource_id,
    )


def _copy_icon_reference(value: str | None) -> str | None:
    if not is_custom_icon(value):
        return value
    source = icon_dir_path() / icon_filename(value or "")
    suffix = source.suffix
    destination_name = f"{uuid.uuid4().hex}{suffix}"
    destination = icon_dir_path() / destination_name
    if source.exists():
        shutil.copy2(source, destination)
    return icon_reference(destination_name)


def duplicate_resource(
    db: Session,
    resource: Resource,
    workspace_id: str,
    name: str | None = None,
) -> Resource:
    duplicate = Resource(
        name=name or f"{resource.name} Copy",
        type=resource.type,
        icon=_copy_icon_reference(resource.icon),
        description=resource.description,
        hostname=resource.hostname,
        tags=resource.tags,
        workspace_id=workspace_id,
    )
    db.add(duplicate)
    db.flush()

    for credential in resource.credentials:
        db.add(
            Credential(
                name=credential.name,
                template=credential.template,
                summary=credential.summary,
                encrypted_data=credential.encrypted_data,
                resource_id=duplicate.id,
            )
        )
    for note in resource.notes:
        db.add(
            Note(
                title=note.title,
                content=note.content,
                resource_id=duplicate.id,
            )
        )
    for file_obj in resource.files:
        db.add(_copy_resource_file(file_obj, duplicate.id))

    db.commit()
    db.refresh(duplicate)
    return duplicate


def delete_resource(db: Session, resource: Resource) -> None:
    db.delete(resource)
    db.commit()


def counts_for_resource(db: Session, resource_id: str) -> dict[str, int]:
    return {
        "credential_count": db.query(Credential).filter(Credential.resource_id == resource_id).count(),
        "file_count": db.query(ResourceFile).filter(ResourceFile.resource_id == resource_id).count(),
        "note_count": db.query(Note).filter(Note.resource_id == resource_id).count(),
    }
