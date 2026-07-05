export type ResourceType =
  | "pfsense"
  | "unraid"
  | "mikrotik"
  | "github"
  | "cloudflare"
  | "home_assistant"
  | "docker_host"
  | "nas"
  | "router"
  | "server"
  | "custom";

export type CredentialTemplateId =
  | "ssh_key_pair"
  | "tls_certificate"
  | "api_token"
  | "password"
  | "wireguard_peer"
  | "totp"
  | "gpg_key"
  | "secure_note"
  | "custom";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "view_secret"
  | "login"
  | "login_failed";

export interface User {
  id: string;
  username: string;
  display_name: string | null;
  created_at: string;
  must_change_password: boolean;
  totp_enabled: boolean;
}

export interface TotpSetupResponse {
  secret: string;
  otpauth_url: string;
}

export interface RecoveryCodesResponse {
  codes: string[];
  generated_at: string;
}

export interface RecoveryCodesStatus {
  available: boolean;
  remaining: number;
  generated_at: string | null;
}

export interface SearchResourceResult {
  id: string;
  name: string;
  type: ResourceType;
  hostname: string | null;
  workspace_id: string;
  workspace_name: string;
}

export interface SearchCredentialResult {
  id: string;
  name: string;
  template: CredentialTemplateId;
  resource_id: string;
  resource_name: string;
}

export interface SearchFileResult {
  id: string;
  filename: string;
  resource_id: string;
  resource_name: string;
}

export interface SearchNoteResult {
  id: string;
  title: string;
  resource_id: string;
  resource_name: string;
}

export interface SearchResults {
  query: string;
  resources: SearchResourceResult[];
  credentials: SearchCredentialResult[];
  files: SearchFileResult[];
  notes: SearchNoteResult[];
}
export interface SessionInfo {
  id: string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  user_agent: string | null;
  ip_address: string | null;
  is_current: boolean;
}

export interface BackupCounts {
  workspaces: number;
  resources: number;
  credentials: number;
  notes: number;
  files: number;
  audit_logs: number;
}

export interface BackupManifest {
  keyanu_backup_format: number;
  app_name: string;
  app_version: string;
  created_at: string;
  exported_by: string;
  encryption_key_fingerprint: string;
  payload_checksum_sha256: string;
  counts: BackupCounts;
}

export interface BackupVerifyResult {
  valid: boolean;
  structure_ok: boolean;
  checksum_ok: boolean;
  version_compatible: boolean;
  encryption_key_matches: boolean;
  can_decrypt: boolean;
  manifest: BackupManifest | null;
  counts: BackupCounts | null;
  errors: string[];
}

export interface BackupRestoreResult {
  restored: boolean;
  counts: BackupCounts;
}

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
  resource_count: number;
}

export interface Resource {
  id: string;
  workspace_id: string;
  name: string;
  type: ResourceType;
  description: string | null;
  hostname: string | null;
  tags: string | null;
  created_at: string;
  updated_at: string;
  credential_count: number;
  file_count: number;
  note_count: number;
}

export interface ResourceDetail extends Resource {
  workspace_name: string | null;
}

export interface Credential {
  id: string;
  resource_id: string;
  name: string;
  template: CredentialTemplateId;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface CredentialDetail extends Credential {
  resource_name: string | null;
  workspace_id: string | null;
  workspace_name: string | null;
}

export interface CredentialRevealResponse {
  id: string;
  fields: Record<string, string>;
}

export interface TemplateField {
  key: string;
  label: string;
  input_type: "text" | "textarea" | "password" | "monospace";
  required: boolean;
  secret: boolean;
  placeholder: string;
  help_text: string;
}

export interface TemplateDefinition {
  id: CredentialTemplateId;
  label: string;
  description: string;
  icon: string;
  fields: TemplateField[];
}

export interface ResourceFileMeta {
  id: string;
  resource_id: string;
  filename: string;
  content_type: string | null;
  size_bytes: number;
  detected_metadata: string | null;
  created_at: string;
}

export interface Note {
  id: string;
  resource_id: string;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  detail: string | null;
  created_at: string;
  user_id: string | null;
}

export interface Preferences {
  display_name: string | null;
  time_format: "12h" | "24h";
  accent_color: string;
  compact_mode: boolean;
  animations_enabled: boolean;
}

export interface AboutInfo {
  app_name: string;
  version: string;
  environment: string;
  license: string;
}
