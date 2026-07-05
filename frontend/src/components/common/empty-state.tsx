import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-14 text-center",
        className
      )}
    >
      {icon && (
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-active text-ink-faint">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        {description && <p className="mx-auto max-w-sm text-xs text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
