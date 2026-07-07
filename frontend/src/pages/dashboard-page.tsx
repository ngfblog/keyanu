import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Link } from "react-router-dom";
import { Plus, Folder, KeyRound, Server, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { WorkspaceDialog } from "@/components/layout/workspace-dialog";
import { api } from "@/lib/api";
import { defaultWorkspaceIcon, labelForType } from "@/lib/icons";
import { IconPreview } from "@/components/common/icon-preview";
import type { Resource, Workspace } from "@/types";

interface ShellContext {
  workspaces: Workspace[];
  refreshWorkspaces: () => Promise<void>;
}

export function DashboardPage() {
  const { workspaces, refreshWorkspaces } = useOutletContext<ShellContext>();
  const [resourceCount, setResourceCount] = useState(0);
  const [credentialCount, setCredentialCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);

  const loadStats = useCallback(async () => {
    if (workspaces.length === 0) {
      setResourceCount(0);
      setCredentialCount(0);
      setLoadingStats(false);
      return;
    }
    setLoadingStats(true);
    const allResources = await Promise.all(
      workspaces.map((ws) => api.get<Resource[]>(`/workspaces/${ws.id}/resources`))
    );
    const flat = allResources.flat();
    setResourceCount(flat.length);
    setCredentialCount(flat.reduce((sum, r) => sum + r.credential_count, 0));
    setLoadingStats(false);
  }, [workspaces]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const stats = [
    { label: "Workspaces", value: workspaces.length, icon: Folder, color: "#D4A72C" },
    { label: "Resources", value: resourceCount, icon: Server, color: "#58A6FF" },
    { label: "Credentials", value: credentialCount, icon: KeyRound, color: "#2DD4BF" },
  ];

  return (
    <div className="page-pad mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-ink">Dashboard</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            An overview of everything Keyanu is keeping safe.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          New workspace
        </Button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="flex items-center gap-3.5 p-4">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
              style={{ backgroundColor: `${stat.color}1A`, color: stat.color }}
            >
              <stat.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xl font-semibold tabular-nums text-ink">
                {loadingStats ? "–" : stat.value}
              </p>
              <p className="text-xs text-ink-muted">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <LayoutGrid className="h-4 w-4 text-ink-faint" />
        <h2 className="text-sm font-semibold text-ink">Your workspaces</h2>
      </div>

      {workspaces.length === 0 ? (
        <EmptyState
          icon={<Folder className="h-5 w-5" />}
          title="No workspaces yet"
          description="Workspaces group related infrastructure — a homelab, a client's environment, or a project. Create one to start adding resources."
          action={
            <Button onClick={() => setDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4" />
              Create a workspace
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws) => {
            return (
            <Link key={ws.id} to={`/workspaces/${ws.id}`} className="group block">
              <Card className="flex h-full flex-col gap-3 p-4 transition-all duration-150 hover:border-brass/40 hover:shadow-elevated">
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                    style={{ backgroundColor: `${ws.color}1A`, color: ws.color ?? "#D4A72C" }}
                  >
                    <IconPreview icon={ws.icon} fallback={defaultWorkspaceIcon(ws.type)} className="h-[18px] w-[18px]" />
                  </span>
                  <h3 className="truncate text-sm font-semibold text-ink group-hover:text-brass transition-colors">
                    {ws.name}
                  </h3>
                </div>
                <p className="text-xs text-ink-faint">{labelForType(ws.type)}</p>
                {ws.description && (
                  <p className="line-clamp-2 text-xs text-ink-muted">{ws.description}</p>
                )}
                <div className="mt-auto flex items-center gap-1.5 border-t border-border pt-3 text-xs text-ink-faint">
                  <Server className="h-3.5 w-3.5" />
                  {ws.resource_count} {ws.resource_count === 1 ? "resource" : "resources"}
                </div>
              </Card>
            </Link>
          );})}
        </div>
      )}

      <WorkspaceDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={() => refreshWorkspaces()}
      />
    </div>
  );
}
