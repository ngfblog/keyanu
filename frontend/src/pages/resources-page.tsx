import { useCallback, useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { Plus, Search, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/common/empty-state";
import { ResourceCard } from "@/components/resources/resource-card";
import { ResourceDialog } from "@/components/resources/resource-dialog";
import { api } from "@/lib/api";
import type { Resource, Workspace } from "@/types";

interface ShellContext {
  workspaces: Workspace[];
  refreshWorkspaces: () => Promise<void>;
}

export function ResourcesPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { workspaces, refreshWorkspaces } = useOutletContext<ShellContext>();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const workspace = workspaces.find((w) => w.id === workspaceId);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    const data = await api.get<Resource[]>(`/workspaces/${workspaceId}/resources`);
    setResources(data);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = resources.filter((r) =>
    `${r.name} ${r.hostname ?? ""} ${r.tags ?? ""}`.toLowerCase().includes(query.toLowerCase())
  );

  async function handleSaved() {
    await load();
    await refreshWorkspaces();
  }

  return (
    <div className="page-pad mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-ink">
            {workspace?.name ?? "Workspace"}
          </h1>
          {workspace?.description && (
            <p className="mt-0.5 text-sm text-ink-muted">{workspace.description}</p>
          )}
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add resource
        </Button>
      </div>

      {resources.length > 0 && (
        <div className="relative mb-5 max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search resources..."
            className="pl-8"
          />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg border border-border bg-surface" />
          ))}
        </div>
      ) : filtered.length === 0 && resources.length === 0 ? (
        <EmptyState
          icon={<Server className="h-5 w-5" />}
          title="No resources yet"
          description="Add pfSense, Unraid, MikroTik, GitHub, Cloudflare, Home Assistant, or any other system you manage credentials for."
          action={
            <Button onClick={() => setDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4" />
              Add your first resource
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Search className="h-5 w-5" />} title="No matching resources" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}

      {workspaceId && (
        <ResourceDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSaved={handleSaved}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}
