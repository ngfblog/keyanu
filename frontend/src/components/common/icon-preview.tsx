import { getIcon } from "@/lib/icons";

export function isUploadedIcon(value?: string | null): boolean {
  return Boolean(value?.startsWith("custom:"));
}

export function uploadedIconUrl(value?: string | null): string | null {
  return isUploadedIcon(value) ? `/api/icons/${value!.slice("custom:".length)}` : null;
}

export function IconPreview({ icon, fallback, className = "h-5 w-5" }: { icon?: string | null; fallback: string; className?: string }) {
  const src = uploadedIconUrl(icon);
  if (src) return <img src={src} alt="" className={`${className} rounded object-cover`} />;
  const Icon = getIcon(icon || fallback);
  return <Icon className={className} />;
}
