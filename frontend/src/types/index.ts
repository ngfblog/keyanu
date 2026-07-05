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
