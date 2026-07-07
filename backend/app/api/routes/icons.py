import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.api.deps import get_current_user
from app.core.config import settings
from app.models.user import User

router = APIRouter(prefix="/icons", tags=["icons"])

MAX_ICON_BYTES = 1024 * 1024  # 1 MB
ALLOWED_ICON_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
}


def _icon_path(filename: str) -> Path:
    safe_name = Path(filename).name
    path = settings.icons_dir_path / safe_name
    try:
        path.relative_to(settings.icons_dir_path)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Icon not found")
    return path


@router.post("/upload")
async def upload_icon(
    upload: UploadFile,
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    content_type = (upload.content_type or "").split(";", 1)[0].lower()
    extension = ALLOWED_ICON_TYPES.get(content_type)
    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Icon must be a PNG, JPG, WEBP, or SVG image",
        )

    contents = await upload.read()
    if not contents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Icon file is empty")
    if len(contents) > MAX_ICON_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Icon exceeds the {MAX_ICON_BYTES // (1024 * 1024)}MB upload limit",
        )

    stored_name = f"{current_user.id}_{uuid.uuid4().hex}{extension}"
    destination = settings.icons_dir_path / stored_name
    destination.write_bytes(contents)
    return {"icon": f"custom:{stored_name}", "url": f"/api/icons/{stored_name}"}


@router.get("/{filename}")
def get_icon(filename: str):
    path = _icon_path(filename)
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Icon not found")
    media_type = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
    }.get(path.suffix.lower(), "application/octet-stream")
    return FileResponse(path, media_type=media_type)
