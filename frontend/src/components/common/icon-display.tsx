import { getIcon, customIconUrl, isCustomIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

export function IconDisplay({ icon, fallback, className, alt = "" }: { icon?: string | null; fallback?: string; className?: string; alt?: string }) {
  const value = icon || fallback;
  if (isCustomIcon(value)) {
    return <img src={customIconUrl(value)} alt={alt} className={cn("object-contain", className)} />;
  }
  const Icon = getIcon(value);
  return <Icon className={className} />;
}
