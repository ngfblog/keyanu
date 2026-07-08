import re
import uuid
from pathlib import Path
from xml.etree import ElementTree

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

MAX_ICON_BYTES = 1024 * 1024
ALLOWED_CONTENT_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
}
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".svg"}
CUSTOM_ICON_PREFIX = "custom:"


def icon_dir_path() -> Path:
    return settings.icons_dir_path


def legacy_icon_dir_path() -> Path:
    """Pre-0.3 custom icon location kept readable for existing installs."""
    return settings.data_dir_path / "icons"


def resolve_icon_path(filename: str) -> Path | None:
    for root in (icon_dir_path(), legacy_icon_dir_path()):
        path = root / filename
        if path.is_file():
            return path
    return None


def is_custom_icon(value: str | None) -> bool:
    return bool(value and value.startswith(CUSTOM_ICON_PREFIX))


def icon_filename(value: str) -> str:
    return value.removeprefix(CUSTOM_ICON_PREFIX)


def icon_reference(filename: str) -> str:
    return f"{CUSTOM_ICON_PREFIX}{filename}"


def icon_url(value: str) -> str:
    return f"/api/icons/{icon_filename(value)}"


def validate_svg(content: bytes) -> None:
    text = content.decode("utf-8", errors="ignore")
    lowered = text.lower()
    if any(token in lowered for token in ("<script", "javascript:", "data:text/html", "<iframe", "<object", "<embed")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SVG icon contains unsafe content.")
    if re.search(r"\son[a-z]+\s*=", lowered):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SVG icon contains unsafe event handlers.")
    try:
        root = ElementTree.fromstring(content)
    except ElementTree.ParseError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SVG icon is not valid XML.")
    if not root.tag.lower().endswith("svg"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SVG icon must use an <svg> root element.")


async def save_uploaded_icon(upload: UploadFile) -> str:
    content = await upload.read()
    if len(content) > MAX_ICON_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Icon image must be 1 MB or smaller.")
    suffix = Path(upload.filename or "").suffix.lower()
    content_type = (upload.content_type or "").split(";")[0].lower()
    if suffix == ".jpeg":
        suffix = ".jpg"
    if suffix not in ALLOWED_EXTENSIONS or content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Icon image must be PNG, JPG, JPEG, WEBP, or safe SVG.")
    if content_type == "image/svg+xml" or suffix == ".svg":
        suffix = ".svg"
        validate_svg(content)
    filename = f"{uuid.uuid4().hex}{suffix}"
    (icon_dir_path() / filename).write_bytes(content)
    return icon_reference(filename)


def delete_icon_reference(value: str | None) -> None:
    if not is_custom_icon(value):
        return
    target = icon_dir_path() / icon_filename(value or "")
    try:
        if target.is_file():
            target.unlink()
    except OSError:
        pass
