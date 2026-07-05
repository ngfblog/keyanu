import { Link } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-base px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface">
        <KeyRound className="h-6 w-6 text-ink-faint" />
      </div>
      <div>
        <h1 className="text-lg font-semibold text-ink">Page not found</h1>
        <p className="mt-1 text-sm text-ink-muted">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      <Link
        to="/"
        className={cn(
          "inline-flex h-8 items-center justify-center rounded-md border border-border bg-surface-active px-3 text-xs font-medium text-ink transition-colors hover:bg-surface-hover"
        )}
      >
        Back to dashboard
      </Link>
    </div>
  );
}
