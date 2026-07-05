import { History, KeyRound, FileText, StickyNote, Server, LogIn, Eye, Plus, Pencil, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import type { AuditAction, AuditLogEntry } from "@/types";

const ACTION_ICON: Record<AuditAction, typeof Plus> = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
  view_secret: Eye,
  login: LogIn,
  login_failed: LogIn,
};

const ACTION_LABEL: Record<AuditAction, string> = {
  create: "created",
  update: "updated",
  delete: "deleted",
  view_secret: "revealed",
  login: "signed in",
  login_failed: "failed to sign in",
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AuditTab({ entries }: { entries: AuditLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<History className="h-5 w-5" />}
        title="No activity recorded yet"
        description="Every create, update, delete, and secret reveal for this resource will show up here."
      />
    );
  }

  return (
    <div className="relative space-y-0">
      {entries.map((entry, idx) => {
        const ActionIcon = ACTION_ICON[entry.action] ?? History;
        const isLast = idx === entries.length - 1;
        const isDanger = entry.action === "delete" || entry.action === "login_failed";
        const isSecret = entry.action === "view_secret";

        return (
          <div key={entry.id} className="relative flex gap-3 pb-5">
            {!isLast && <span className="absolute left-[15px] top-8 h-full w-px bg-border" />}
            <span
              className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                isDanger
                  ? "border-danger/30 bg-danger/10 text-danger"
                  : isSecret
                  ? "border-brass/30 bg-brass-subtle text-brass"
                  : "border-border bg-surface-active text-ink-muted"
              }`}
            >
              <ActionIcon className="h-3.5 w-3.5" />
            </span>
            <div className="flex-1 pt-1">
              <p className="text-sm text-ink">
                <span className="font-medium">{entry.entity_name ?? entry.entity_type}</span>{" "}
                <span className="text-ink-muted">was {ACTION_LABEL[entry.action]}</span>
              </p>
              <p className="text-xs text-ink-faint">
                {formatTimestamp(entry.created_at)}
                {entry.detail ? ` · ${entry.detail}` : ""}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
