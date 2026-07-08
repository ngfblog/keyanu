from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from app.core.icon_files import resolve_icon_path

router = APIRouter(prefix="/icons", tags=["icons"])


@router.get("/{filename}")
def get_icon(filename: str) -> FileResponse:
    if "/" in filename or "\\" in filename or filename.startswith("."):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Icon not found")
    path = resolve_icon_path(filename)
    if path is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Icon not found")
    return FileResponse(path)
