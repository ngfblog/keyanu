from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.backup import build_backup_zip, decrypt_payload, inspect_backup, restore_payload
from app.core.security import verify_password
from app.crud import crud_audit, crud_session
from app.db.session import get_db
from app.models.enums import AuditAction
from app.models.user import User
from app.schemas.backup import BackupExportRequest, BackupRestoreResult, BackupVerifyResult

router = APIRouter(prefix="/backup", tags=["backup"])

MAX_BACKUP_UPLOAD_BYTES = 200 * 1024 * 1024  # 200 MB


def _require_current_password(user: User, current_password: str) -> None:
    if not verify_password(current_password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")


@router.post("/export")
def export_backup(
    payload: BackupExportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    _require_current_password(current_user, payload.current_password)

    zip_bytes, filename = build_backup_zip(db, current_user)

    crud_audit.log(
        db,
        action=AuditAction.CREATE,
        entity_type="backup",
        entity_name=filename,
        user_id=current_user.id,
        detail="Backup exported",
    )

    return Response(
        content=zip_bytes,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/verify", response_model=BackupVerifyResult)
async def verify_backup(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
) -> BackupVerifyResult:
    contents = await file.read()
    if len(contents) > MAX_BACKUP_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Backup file exceeds the {MAX_BACKUP_UPLOAD_BYTES // (1024 * 1024)}MB limit",
        )
    result = inspect_backup(contents)
    return BackupVerifyResult(**result.__dict__)


@router.post("/restore", response_model=BackupRestoreResult)
async def restore_backup(
    file: UploadFile,
    current_password: str = Form(...),
    confirm_overwrite: bool = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BackupRestoreResult:
    _require_current_password(current_user, current_password)

    if not confirm_overwrite:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must confirm that this will overwrite all existing data",
        )

    contents = await file.read()
    if len(contents) > MAX_BACKUP_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Backup file exceeds the {MAX_BACKUP_UPLOAD_BYTES // (1024 * 1024)}MB limit",
        )

    check = inspect_backup(contents)
    if not check.valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=check.errors[0] if check.errors else "This backup cannot be restored",
        )

    payload = decrypt_payload(contents)
    counts = restore_payload(db, current_user, payload)

    crud_audit.log(
        db,
        action=AuditAction.UPDATE,
        entity_type="backup",
        user_id=current_user.id,
        detail="Backup restored -- all data replaced",
    )

    # The account's security posture (TOTP, preferences, session timeout) may
    # have just changed. Force a fresh sign-in everywhere, including here.
    crud_session.revoke_all_sessions(db, current_user.id)

    return BackupRestoreResult(restored=True, counts=counts)
