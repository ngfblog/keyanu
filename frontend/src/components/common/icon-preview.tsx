import { useState } from "react";
import { getIcon } from "@/lib/icons";

export function isUploadedIcon(value?: string | null): boolean {
  return Boolean(value?.startsWith("custom:"));
}

export function uploadedIconUrl(value?: string | null): string | null {
  return isUploadedIcon(value) ? `/api/icons/${value!.slice("custom:".length)}` : null;
}

export function IconPreview({ icon, fallback, className = "h-5 w-5" }: { icon?: string | null; fallback: string; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = uploadedIconUrl(icon);
  if (src && src !== failedSrc) {
    return <img src={src} alt="" className={`${className} rounded object-cover`} onError={() => setFailedSrc(src)} />;
  }
  const Icon = getIcon(src ? fallback : icon || fallback);
  return <Icon className={className} />;
}
