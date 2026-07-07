import { NavLink } from "react-router-dom";
import { LayoutDashboard, KeyRound, Plus, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import { defaultWorkspaceIcon, getIcon } from "@/lib/icons";
import type { Workspace } from "@/types";

export function Sidebar({
  workspaces,
  onCreateWorkspace,
  mobile = false,
  onNavigate,
}: {
  workspaces: Workspace[];
  onCreateWorkspace: () => void;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className={cn("flex h-full w-64 flex-col border-r border-border bg-surface", mobile && "w-full")}>
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brass-subtle">
          <KeyRound className="h-4 w-4 text-brass" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-ink">Keyanu</span>
      </div>

      <nav className="flex flex-col gap-0.5 p-2">
        <NavLink
          to="/"
          end
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
              isActive ? "bg-surface-active text-ink" : "text-ink-muted hover:bg-surface-hover hover:text-ink"
            )
          }
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </NavLink>
      </nav>

      <div className="flex items-center justify-between px-4 pb-1.5 pt-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Workspaces
        </span>
        <button
          onClick={onCreateWorkspace}
          className="rounded p-0.5 text-ink-faint transition-colors hover:bg-surface-hover hover:text-brass"
          aria-label="New workspace"
          title="New workspace"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {workspaces.length === 0 ? (
          <button
            onClick={onCreateWorkspace}
            className="mx-0.5 mt-1 flex w-[calc(100%-4px)] items-center gap-2 rounded-md border border-dashed border-border px-2.5 py-2 text-left text-xs text-ink-faint transition-colors hover:border-brass/40 hover:text-brass"
          >
            <Plus className="h-3.5 w-3.5" />
            Create your first workspace
          </button>
        ) : (
          <div className="flex flex-col gap-0.5">
            {workspaces.map((ws) => {
              const Icon = getIcon(ws.icon ?? defaultWorkspaceIcon(ws.type));
              return (
              <NavLink
                key={ws.id}
                to={`/workspaces/${ws.id}`}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-surface-active text-ink"
                      : "text-ink-muted hover:bg-surface-hover hover:text-ink"
                  )
                }
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                  style={{ backgroundColor: `${ws.color}22`, color: ws.color ?? "#D4A72C" }}
                >
                  <Icon className="h-3 w-3" />
                </span>
                <span className="flex-1 truncate">{ws.name}</span>
                <span className="text-[11px] text-ink-faint">{ws.resource_count}</span>
              </NavLink>
            );})}
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        <p className="text-[11px] text-ink-faint">Keyanu v0.1.0 · Sprint 1</p>
      </div>
    </div>
  );
}
