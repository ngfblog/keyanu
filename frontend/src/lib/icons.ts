import {
  ShieldCheck,
  Server,
  Router,
  Github,
  Cloud,
  Home,
  Container,
  HardDrive,
  Wifi,
  Box,
  KeyRound,
  Lock,
  LockKeyhole,
  Shuffle,
  ScanLine,
  Stamp,
  StickyNote,
  Puzzle,
  SquareAsterisk,
  type LucideIcon,
} from "lucide-react";
import type { ResourceType } from "@/types";

export const RESOURCE_ICONS: Record<ResourceType, LucideIcon> = {
  pfsense: ShieldCheck,
  unraid: Server,
  mikrotik: Router,
  github: Github,
  cloudflare: Cloud,
  home_assistant: Home,
  docker_host: Container,
  nas: HardDrive,
  router: Wifi,
  server: Server,
  custom: Box,
};

export const RESOURCE_COLORS: Record<ResourceType, string> = {
  pfsense: "#F85149",
  unraid: "#FB923C",
  mikrotik: "#58A6FF",
  github: "#E6E8EB",
  cloudflare: "#FB923C",
  home_assistant: "#2DD4BF",
  docker_host: "#58A6FF",
  nas: "#A78BFA",
  router: "#3FB950",
  server: "#8B949E",
  custom: "#D4A72C",
};

export const RESOURCE_LABELS: Record<ResourceType, string> = {
  pfsense: "pfSense",
  unraid: "Unraid",
  mikrotik: "MikroTik",
  github: "GitHub",
  cloudflare: "Cloudflare",
  home_assistant: "Home Assistant",
  docker_host: "Docker Host",
  nas: "NAS",
  router: "Router",
  server: "Server",
  custom: "Custom",
};

const CREDENTIAL_ICON_MAP: Record<string, LucideIcon> = {
  "key-round": KeyRound,
  "shield-check": ShieldCheck,
  "square-asterisk": SquareAsterisk,
  "lock-keyhole": LockKeyhole,
  shuffle: Shuffle,
  "scan-line": ScanLine,
  stamp: Stamp,
  "sticky-note": StickyNote,
  puzzle: Puzzle,
  lock: Lock,
};

export function getCredentialIcon(iconKey: string): LucideIcon {
  return CREDENTIAL_ICON_MAP[iconKey] ?? Lock;
}

export const CREDENTIAL_COLORS: Record<string, string> = {
  ssh_key_pair: "#2DD4BF",
  tls_certificate: "#58A6FF",
  api_token: "#A78BFA",
  password: "#D4A72C",
  wireguard_peer: "#F472B6",
  totp: "#FB923C",
  gpg_key: "#F85149",
  secure_note: "#8B949E",
  custom: "#3FB950",
};
