"""Backup & Restore.

A `.keyanu` file is a ZIP containing:
  - manifest.json   plaintext metadata (version, checksum, key fingerprint,
                     counts) -- used to validate a backup *before* attempting
                     to decrypt anything.
  - payload.enc     the entire data payload (workspaces, resources,
                     credentials, files, notes, audit log, user settings)
                     serialized to JSON and encrypted with the same Fernet
                     key (derived from ENCRYPTION_KEY) used everywhere else
                     in Keyanu. No separate encryption mechanism.

Credential and TOTP secrets inside the payload are carried through exactly
as they're stored in the database -- already Fernet-ciphertext strings tied
to ENCRYPTION_KEY. Restoring onto a server with a different ENCRYPTION_KEY
is detected up front via the manifest's key fingerprint, before any data is
touched.
"""
import base64
import hashlib
import io
import json
import zipfile
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from cryptography.fernet import InvalidToken
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.icon_files import icon_dir_path, icon_filename, is_custom_icon
from app.core.security import decrypt_secret, encrypt_secret, encryption_key_fingerprint
from app.crud import crud_audit, crud_resource, crud_workspace
from app.models.credential import Credential
from app.models.enums import AuditAction, CredentialTemplate
from app.models.note import Note
from app.models.recovery_code import RecoveryCode
from app.models.resource import Resource
from app.models.user import User
from app.models.workspace import Workspace

BACKUP_FORMAT_VERSION = 1
MANIFEST_NAME = "manifest.json"
PAYLOAD_NAME = "payload.enc"


@dataclass
class BackupCheckResult:
    valid: bool = False
    structure_ok: bool = False
    checksum_ok: bool = False
    version_compatible: bool = False
    encryption_key_matches: bool = False
    can_decrypt: bool = False
    manifest: dict | None = None
    counts: dict | None = None
    errors: list[str] = field(default_factory=list)


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value is not None else None


def _build_payload(db: Session, user: User) -> dict:
    workspaces = crud_workspace.list_workspaces(db, user.id)

    workspaces_out = []
    resources_out = []
    credentials_out = []
    notes_out = []
    files_out = []
    custom_icons_out = []
    seen_icon_files = set()

    def collect_icon(value: str | None) -> None:
        if not is_custom_icon(value):
            return
        filename = icon_filename(value or "")
        if filename in seen_icon_files:
            return
        seen_icon_files.add(filename)
        path = icon_dir_path() / filename
        custom_icons_out.append({
            "reference": value,
            "filename": filename,
            "content_base64": base64.b64encode(path.read_bytes()).decode("ascii") if path.exists() else None,
        })

    for ws in workspaces:
        collect_icon(ws.icon)
        workspaces_out.append(
            {
                "id": ws.id,
                "name": ws.name,
                "description": ws.description,
                "type": ws.type,
                "icon": ws.icon,
                "color": ws.color,
                "created_at": _iso(ws.created_at),
                "updated_at": _iso(ws.updated_at),
            }
        )
        for res in crud_resource.list_resources(db, ws.id):
            collect_icon(res.icon)
            resources_out.append(
                {
                    "id": res.id,
                    "workspace_id": ws.id,
                    "name": res.name,
                    "type": res.type,
                    "icon": res.icon,
                    "description": res.description,
                    "hostname": res.hostname,
                    "tags": res.tags,
                    "created_at": _iso(res.created_at),
                    "updated_at": _iso(res.updated_at),
                }
            )
            for cred in db.query(Credential).filter(Credential.resource_id == res.id).all():
                credentials_out.append(
                    {
                        "id": cred.id,
                        "resource_id": res.id,
                        "name": cred.name,
                        "template": cred.template.value,
                        "summary": cred.summary,
                        "encrypted_data": cred.encrypted_data,
                        "created_at": _iso(cred.created_at),
                        "updated_at": _iso(cred.updated_at),
                    }
                )
            for note in db.query(Note).filter(Note.resource_id == res.id).all():
                notes_out.append(
                    {
                        "id": note.id,
                        "resource_id": res.id,
                        "title": note.title,
                        "content": note.content,
                        "created_at": _iso(note.created_at),
                        "updated_at": _iso(note.updated_at),
                    }
                )
            for file_row in res.files:
                path = Path(file_row.storage_path)
                content_b64 = base64.b64encode(path.read_bytes()).decode("ascii") if path.exists() else None
                files_out.append(
                    {
                        "id": file_row.id,
                        "resource_id": res.id,
                        "filename": file_row.filename,
                        "content_type": file_row.content_type,
                        "size_bytes": file_row.size_bytes,
                        "detected_metadata": file_row.detected_metadata,
                        "created_at": _iso(file_row.created_at),
                        "content_base64": content_b64,
                    }
                )

    audit_logs_out = [
        {
            "id": a.id,
            "action": a.action.value,
            "entity_type": a.entity_type,
            "entity_id": a.entity_id,
            "entity_name": a.entity_name,
            "detail": a.detail,
            "created_at": _iso(a.created_at),
            "user_id": a.user_id,
            "resource_id": a.resource_id,
            "workspace_id": a.workspace_id,
        }
        for a in crud_audit.list_all(db)
    ]

    recovery_codes = db.query(RecoveryCode).filter(RecoveryCode.user_id == user.id).all()
    recovery_codes_out = [
        {
            "code_hash": rc.code_hash,
            "created_at": _iso(rc.created_at),
            "used_at": _iso(rc.used_at),
        }
        for rc in recovery_codes
    ]

    return {
        "workspaces": workspaces_out,
        "resources": resources_out,
        "credentials": credentials_out,
        "notes": notes_out,
        "files": files_out,
        "custom_icons": custom_icons_out,
        "audit_logs": audit_logs_out,
        "user": {
            "display_name": user.display_name,
            "time_format": user.time_format,
            "accent_color": user.accent_color,
            "compact_mode": user.compact_mode,
            "animations_enabled": user.animations_enabled,
            "totp_enabled": user.totp_enabled,
            "totp_secret_encrypted": user.totp_secret_encrypted,
            "recovery_codes_generated_at": _iso(user.recovery_codes_generated_at),
            "session_timeout_minutes": user.session_timeout_minutes,
        },
        "recovery_codes": recovery_codes_out,
    }


def _counts(payload: dict) -> dict:
    return {
        "workspaces": len(payload.get("workspaces", [])),
        "resources": len(payload.get("resources", [])),
        "credentials": len(payload.get("credentials", [])),
        "notes": len(payload.get("notes", [])),
        "files": len(payload.get("files", [])),
        "custom_icons": len(payload.get("custom_icons", [])),
        "audit_logs": len(payload.get("audit_logs", [])),
    }


def build_backup_zip(db: Session, user: User) -> tuple[bytes, str]:
    """Returns (zip_bytes, filename)."""
    payload = _build_payload(db, user)
    payload_json = json.dumps(payload)
    encrypted = encrypt_secret(payload_json).encode("utf-8")
    checksum = hashlib.sha256(encrypted).hexdigest()

    manifest = {
        "keyanu_backup_format": BACKUP_FORMAT_VERSION,
        "app_name": settings.APP_NAME,
        "app_version": settings.APP_VERSION,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "exported_by": user.username,
        "encryption_key_fingerprint": encryption_key_fingerprint(),
        "payload_checksum_sha256": checksum,
        "counts": _counts(payload),
    }

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(MANIFEST_NAME, json.dumps(manifest, indent=2))
        zf.writestr(PAYLOAD_NAME, encrypted)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    filename = f"keyanu-backup-{timestamp}.keyanu"
    return buffer.getvalue(), filename


def inspect_backup(file_bytes: bytes) -> BackupCheckResult:
    """Validates structure, checksum, version, and encryption key fingerprint
    WITHOUT writing anything -- used by both /backup/verify and as the first
    phase of /backup/restore."""
    result = BackupCheckResult()

    try:
        zf = zipfile.ZipFile(io.BytesIO(file_bytes))
        names = set(zf.namelist())
        if MANIFEST_NAME not in names or PAYLOAD_NAME not in names:
            result.errors.append("This doesn't look like a valid .keyanu backup file.")
            return result
        manifest = json.loads(zf.read(MANIFEST_NAME).decode("utf-8"))
        encrypted_payload = zf.read(PAYLOAD_NAME)
    except (zipfile.BadZipFile, json.JSONDecodeError, KeyError):
        result.errors.append("This doesn't look like a valid .keyanu backup file.")
        return result

    result.structure_ok = True
    result.manifest = manifest

    format_version = manifest.get("keyanu_backup_format")
    result.version_compatible = format_version == BACKUP_FORMAT_VERSION
    if not result.version_compatible:
        result.errors.append(
            f"This backup uses format version {format_version}, which this version of Keyanu "
            f"doesn't support (expected {BACKUP_FORMAT_VERSION})."
        )

    expected_checksum = manifest.get("payload_checksum_sha256")
    actual_checksum = hashlib.sha256(encrypted_payload).hexdigest()
    result.checksum_ok = expected_checksum == actual_checksum
    if not result.checksum_ok:
        result.errors.append("The backup file appears to be corrupted or was modified after export (checksum mismatch).")

    result.encryption_key_matches = manifest.get("encryption_key_fingerprint") == encryption_key_fingerprint()
    if not result.encryption_key_matches:
        result.errors.append(
            "This backup was encrypted with a different ENCRYPTION_KEY than this server is using. "
            "It cannot be decrypted here -- restore it on the original server, or on a server "
            "configured with the same ENCRYPTION_KEY."
        )

    # Only attempt decryption if the fingerprint matches -- otherwise we
    # already know it will fail, and Fernet's InvalidToken gives no more
    # useful information than the fingerprint mismatch already did.
    if result.encryption_key_matches and result.checksum_ok:
        try:
            decrypted = decrypt_secret(encrypted_payload.decode("utf-8"))
            payload = json.loads(decrypted)
            result.can_decrypt = True
            result.counts = _counts(payload)
        except (InvalidToken, UnicodeDecodeError, json.JSONDecodeError):
            result.can_decrypt = False
            result.errors.append("Failed to decrypt the backup payload.")

    result.valid = (
        result.structure_ok
        and result.checksum_ok
        and result.version_compatible
        and result.encryption_key_matches
        and result.can_decrypt
    )
    return result


def decrypt_payload(file_bytes: bytes) -> dict:
    """Extracts and decrypts the payload. Caller must have already validated
    via inspect_backup()."""
    zf = zipfile.ZipFile(io.BytesIO(file_bytes))
    encrypted_payload = zf.read(PAYLOAD_NAME)
    decrypted = decrypt_secret(encrypted_payload.decode("utf-8"))
    return json.loads(decrypted)


def restore_payload(db: Session, user: User, payload: dict) -> dict:
    """Wipes all existing workspace/resource/credential/file/note/audit data
    for this account and replaces it with the backup's contents, preserving
    original ids so relationships stay intact. Returns restored counts."""
    # --- Wipe existing data and on-disk files ---
    for ws in crud_workspace.list_workspaces(db, user.id):
        for res in crud_resource.list_resources(db, ws.id):
            resource_dir = settings.files_dir_path / res.id
            if resource_dir.exists():
                for f in resource_dir.iterdir():
                    f.unlink(missing_ok=True)
                resource_dir.rmdir()
        db.delete(ws)  # cascades to resources/credentials/files-rows/notes
    icon_root = icon_dir_path()
    for icon_file in icon_root.iterdir():
        if icon_file.is_file():
            icon_file.unlink(missing_ok=True)
    crud_audit.delete_all(db)
    db.query(RecoveryCode).filter(RecoveryCode.user_id == user.id).delete()
    db.commit()

    # --- Re-create from backup, preserving ids ---
    for ws_data in payload.get("workspaces", []):
        db.add(
            Workspace(
                id=ws_data["id"],
                name=ws_data["name"],
                description=ws_data.get("description"),
                type=ws_data.get("type"),
                icon=ws_data.get("icon"),
                color=ws_data.get("color"),
                owner_id=user.id,
            )
        )
    db.flush()

    for res_data in payload.get("resources", []):
        db.add(
            Resource(
                id=res_data["id"],
                workspace_id=res_data["workspace_id"],
                name=res_data["name"],
                type=res_data["type"],
                icon=res_data.get("icon"),
                description=res_data.get("description"),
                hostname=res_data.get("hostname"),
                tags=res_data.get("tags"),
            )
        )
    db.flush()

    for cred_data in payload.get("credentials", []):
        db.add(
            Credential(
                id=cred_data["id"],
                resource_id=cred_data["resource_id"],
                name=cred_data["name"],
                template=CredentialTemplate(cred_data["template"]),
                summary=cred_data.get("summary"),
                encrypted_data=cred_data["encrypted_data"],
            )
        )

    for note_data in payload.get("notes", []):
        db.add(
            Note(
                id=note_data["id"],
                resource_id=note_data["resource_id"],
                title=note_data["title"],
                content=note_data.get("content"),
            )
        )

    from app.models.file import ResourceFile

    for file_data in payload.get("files", []):
        resource_dir = settings.files_dir_path / file_data["resource_id"]
        resource_dir.mkdir(parents=True, exist_ok=True)
        storage_path = resource_dir / f"{file_data['id']}_{file_data['filename']}"
        content_b64 = file_data.get("content_base64")
        if content_b64:
            storage_path.write_bytes(base64.b64decode(content_b64))
        db.add(
            ResourceFile(
                id=file_data["id"],
                resource_id=file_data["resource_id"],
                filename=file_data["filename"],
                content_type=file_data.get("content_type"),
                size_bytes=file_data.get("size_bytes", 0),
                storage_path=str(storage_path),
                detected_metadata=file_data.get("detected_metadata"),
            )
        )

    for icon_data in payload.get("custom_icons", []):
        content_b64 = icon_data.get("content_base64")
        filename = icon_data.get("filename")
        if content_b64 and filename:
            (icon_dir_path() / filename).write_bytes(base64.b64decode(content_b64))

    from app.models.audit_log import AuditLog

    for audit_data in payload.get("audit_logs", []):
        db.add(
            AuditLog(
                id=audit_data["id"],
                action=AuditAction(audit_data["action"]),
                entity_type=audit_data["entity_type"],
                entity_id=audit_data.get("entity_id"),
                entity_name=audit_data.get("entity_name"),
                detail=audit_data.get("detail"),
                user_id=audit_data.get("user_id"),
                resource_id=audit_data.get("resource_id"),
                workspace_id=audit_data.get("workspace_id"),
            )
        )

    for rc_data in payload.get("recovery_codes", []):
        db.add(
            RecoveryCode(
                user_id=user.id,
                code_hash=rc_data["code_hash"],
            )
        )

    user_data = payload.get("user", {})
    user.display_name = user_data.get("display_name", user.display_name)
    user.time_format = user_data.get("time_format", user.time_format)
    user.accent_color = user_data.get("accent_color", user.accent_color)
    user.compact_mode = user_data.get("compact_mode", user.compact_mode)
    user.animations_enabled = user_data.get("animations_enabled", user.animations_enabled)
    user.totp_enabled = user_data.get("totp_enabled", user.totp_enabled)
    user.totp_secret_encrypted = user_data.get("totp_secret_encrypted", user.totp_secret_encrypted)
    user.session_timeout_minutes = user_data.get("session_timeout_minutes", user.session_timeout_minutes)
    db.add(user)

    db.commit()
    return _counts(payload)
