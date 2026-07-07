import {
  ShieldCheck, Server, Router, Github, Cloud, Home, Container, HardDrive, Wifi, Box,
  KeyRound, Lock, LockKeyhole, Shuffle, ScanLine, Stamp, StickyNote, Puzzle, SquareAsterisk,
  Folder, Globe, Smartphone, Database, Network, AppWindow, type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  folder: Folder, globe: Globe, server: Server, network: Network, cloud: Cloud, database: Database,
  app: AppWindow, shield: ShieldCheck, router: Router, github: Github, home: Home, container: Container,
  drive: HardDrive, wifi: Wifi, box: Box, phone: Smartphone, key: KeyRound, lock: Lock,
};

export const ICON_OPTIONS = Object.keys(ICONS);
export function isCustomIcon(iconKey?: string | null): boolean { return Boolean(iconKey?.startsWith("custom:")); }
export function customIconUrl(iconKey?: string | null): string | undefined {
  if (!isCustomIcon(iconKey)) return undefined;
  return `/api/icons/${encodeURIComponent(iconKey!.slice("custom:".length))}`;
}
export function getIcon(iconKey?: string | null): LucideIcon { return ICONS[iconKey ?? ""] ?? Folder; }

export const WORKSPACE_TYPES = ["website", "app", "server", "network", "cloud", "database"] as const;
export const WORKSPACE_LABELS: Record<string, string> = { website: "Website", app: "App", server: "Server", network: "Network", cloud: "Cloud", database: "Database" };
export function labelForType(type?: string | null): string { if (!type) return "Custom"; return WORKSPACE_LABELS[type] ?? RESOURCE_LABELS[type] ?? type; }
export function defaultWorkspaceIcon(type?: string | null): string {
  const map: Record<string, string> = { website: "globe", app: "app", server: "server", network: "network", cloud: "cloud", database: "database" };
  return map[type ?? ""] ?? "folder";
}

export const RESOURCE_LABELS: Record<string, string> = {
  pfsense: "pfSense", unraid: "Unraid", mikrotik: "MikroTik", github: "GitHub", cloudflare: "Cloudflare",
  home_assistant: "Home Assistant", docker_host: "Docker Host", nas: "NAS", router: "Router", server: "Server",
  website: "Website", custom: "Custom",
};
export const RESOURCE_TYPES = Object.keys(RESOURCE_LABELS);
export const RESOURCE_COLORS: Record<string, string> = {
  pfsense: "#F85149", unraid: "#FB923C", mikrotik: "#58A6FF", github: "#E6E8EB", cloudflare: "#FB923C",
  home_assistant: "#2DD4BF", docker_host: "#58A6FF", nas: "#A78BFA", router: "#3FB950", server: "#8B949E",
  website: "#58A6FF", custom: "#D4A72C",
};
export const RESOURCE_ICON_KEYS: Record<string, string> = {
  pfsense: "shield", unraid: "server", mikrotik: "router", github: "github", cloudflare: "cloud", home_assistant: "home",
  docker_host: "container", nas: "drive", router: "wifi", server: "server", website: "globe", custom: "box",
};
export const RESOURCE_ICONS: Record<string, LucideIcon> = Object.fromEntries(Object.entries(RESOURCE_ICON_KEYS).map(([k,v]) => [k, getIcon(v)]));
export function defaultResourceIcon(type?: string | null): string { return RESOURCE_ICON_KEYS[type ?? ""] ?? "box"; }

const CREDENTIAL_ICON_MAP: Record<string, LucideIcon> = { "key-round": KeyRound, "shield-check": ShieldCheck, "square-asterisk": SquareAsterisk, "lock-keyhole": LockKeyhole, shuffle: Shuffle, "scan-line": ScanLine, stamp: Stamp, "sticky-note": StickyNote, puzzle: Puzzle, lock: Lock };
export function getCredentialIcon(iconKey: string): LucideIcon { return CREDENTIAL_ICON_MAP[iconKey] ?? Lock; }
export const CREDENTIAL_COLORS: Record<string, string> = { ssh_key_pair: "#2DD4BF", tls_certificate: "#58A6FF", api_token: "#A78BFA", password: "#D4A72C", wireguard_peer: "#F472B6", totp: "#FB923C", gpg_key: "#F85149", secure_note: "#8B949E", custom: "#3FB950" };
