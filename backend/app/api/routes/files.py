import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.routes.resources import get_owned_resource_or_404
from app.core.config import settings
from app.crud import crud_audit
from app.db.session import get_db
from app.models.enums import AuditAction
from app.models.file import ResourceFile
from app.models.user import User
from app.schemas.file import ResourceFileRead

router = APIRouter(tags=["files"])

MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB


def _get_owned_file_or_404(db: Session, file_id: str, owner_id: str) -> ResourceFile:
    file_obj = db.get(ResourceFile, file_id)
    if not file_obj or file_obj.resource.workspace.owner_id != owner_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return file_obj


@router.get("/resources/{resource_id}/files", response_model=list[ResourceFileRead])
def list_files(
    resource_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ResourceFileRead]:
    resource = get_owned_resource_or_404(db, resource_id, current_user.id)
    return resource.files


@router.post(
    "/resources/{resource_id}/files",
    response_model=ResourceFileRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_file(
    resource_id: str,
    upload: UploadFile,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResourceFileRead:
    resource = get_owned_resource_or_404(db, resource_id, current_user.id)

    contents = await upload.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)}MB upload limit",
        )

    resource_dir: Path = settings.files_dir_path / resource_id
    resource_dir.mkdir(parents=True, exist_ok=True)

    safe_name = Path(upload.filename or "upload.bin").name
    stored_name = f"{uuid.uuid4().hex}_{safe_name}"
    destination = resource_dir / stored_name
    destination.write_bytes(contents)

    file_obj = ResourceFile(
        filename=safe_name,
        content_type=upload.content_type,
        size_bytes=len(contents),
        storage_path=str(destination),
        resource_id=resource_id,
    )
    db.add(file_obj)
    db.commit()
    db.refresh(file_obj)

    crud_audit.log(
        db,
        action=AuditAction.CREATE,
        entity_type="file",
        entity_id=file_obj.id,
        entity_name=file_obj.filename,
        user_id=current_user.id,
        resource_id=resource.id,
        workspace_id=resource.workspace_id,
    )
    return file_obj


@router.get("/files/{file_id}/download")
def download_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    file_obj = _get_owned_file_or_404(db, file_id, current_user.id)
    path = Path(file_obj.storage_path)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="File is missing from disk")
    return FileResponse(path, filename=file_obj.filename, media_type=file_obj.content_type)


@router.delete("/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    file_obj = _get_owned_file_or_404(db, file_id, current_user.id)
    path = Path(file_obj.storage_path)
    if path.exists():
        path.unlink()
    crud_audit.log(
        db,
        action=AuditAction.DELETE,
        entity_type="file",
        entity_id=file_obj.id,
        entity_name=file_obj.filename,
        user_id=current_user.id,
        resource_id=file_obj.resource_id,
        workspace_id=file_obj.resource.workspace_id,
    )
    db.delete(file_obj)
    db.commit()
