from pydantic import BaseModel


class BackupExportRequest(BaseModel):
    current_password: str


class BackupCounts(BaseModel):
    workspaces: int
    resources: int
    credentials: int
    notes: int
    files: int
    custom_icons: int = 0
    audit_logs: int


class BackupManifest(BaseModel):
    keyanu_backup_format: int
    app_name: str
    app_version: str
    created_at: str
    exported_by: str
    encryption_key_fingerprint: str
    payload_checksum_sha256: str
    counts: BackupCounts


class BackupVerifyResult(BaseModel):
    valid: bool
    structure_ok: bool
    checksum_ok: bool
    version_compatible: bool
    encryption_key_matches: bool
    can_decrypt: bool
    manifest: BackupManifest | None = None
    counts: BackupCounts | None = None
    errors: list[str]


class BackupRestoreResult(BaseModel):
    restored: bool
    counts: BackupCounts
