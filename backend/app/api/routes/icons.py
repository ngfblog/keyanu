from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from app.core.icon_files import icon_dir_path

router = APIRouter(prefix="/icons", tags=["icons"])


@router.get("/{filename}")
def get_icon(filename: str) -> FileResponse:
    if "/" in filename or "\\" in filename or filename.startswith("."):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Icon not found")
    path = icon_dir_path() / filename
    if not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Icon not found")
    return FileResponse(path)
