import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import type { Resource, ResourceDetail, Workspace } from "@/types";

interface ResourceMoveDialogProps {
  open: boolean;
  resource: ResourceDetail;
  onClose: () => void;
  onMoved: (resource: Resource) => void;
}

export function ResourceMoveDialog({ open, resource, onClose, onMoved }: ResourceMoveDialogProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [query, setQuery] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setDestinationId("");
    setConfirming(false);
    setError(null);
    api
      .get<Workspace[]>("/workspaces")
      .then(setWorkspaces)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load Workspaces"));
  }, [open]);

  const destinations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return workspaces
      .filter((workspace) => workspace.id !== resource.workspace_id)
      .filter((workspace) => workspace.name.toLowerCase().includes(normalized));
  }, [query, resource.workspace_id, workspaces]);

  const destination = workspaces.find((workspace) => workspace.id === destinationId) ?? null;

  async function handleMove() {
    if (!destination) return;
    setLoading(true);
    setError(null);
    try {
      const moved = await api.post<Resource>(`/resources/${resource.id}/move`, {
        destination_workspace_id: destination.id,
      });
      onMoved(moved);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to move resource");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader title="Move to Workspace" description="Move this resource without changing its ID or stored data." onClose={onClose} />
      <DialogBody className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Current Workspace</label>
          <div className="rounded-md border border-border bg-surface-active px-3 py-2 text-sm text-ink">
            {resource.workspace_name ?? "Current Workspace"}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Destination Workspace</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Workspaces" className="pl-9" />
          </div>
          <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-border bg-surface">
            {destinations.length === 0 ? (
              <p className="px-3 py-2 text-sm text-ink-muted">No matching Workspaces.</p>
            ) : (
              destinations.map((workspace) => (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => {
                    setDestinationId(workspace.id);
                    setConfirming(false);
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover ${
                    destinationId === workspace.id ? "bg-surface-active text-ink" : "text-ink-muted"
                  }`}
                >
                  {workspace.name} ({workspace.resource_count})
                </button>
              ))
            )}
          </div>
        </div>

        {confirming && destination && (
          <div className="rounded-md border border-brass/30 bg-brass-subtle p-3 text-sm text-ink">
            Move resource <span className="font-semibold">"{resource.name}"</span>
            <br />
            from <span className="font-semibold">"{resource.workspace_name}"</span>
            <br />
            to <span className="font-semibold">"{destination.name}"</span>?
          </div>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
        {confirming ? (
          <Button onClick={handleMove} disabled={!destination || loading}>{loading ? "Moving…" : "Move Resource"}</Button>
        ) : (
          <Button onClick={() => setConfirming(true)} disabled={!destination}>Move Resource</Button>
        )}
      </DialogFooter>
    </Dialog>
  );
}
