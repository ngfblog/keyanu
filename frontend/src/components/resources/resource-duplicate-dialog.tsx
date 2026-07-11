import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { api, ApiError } from "@/lib/api";
import type { Resource, Workspace } from "@/types";

interface ResourceDuplicateDialogProps {
  open: boolean;
  resource: Resource | null;
  workspaces: Workspace[];
  onClose: () => void;
  onDuplicated: (resource: Resource) => void;
}

export function ResourceDuplicateDialog({
  open,
  resource,
  workspaces,
  onClose,
  onDuplicated,
}: ResourceDuplicateDialogProps) {
  const [destinationWorkspaceId, setDestinationWorkspaceId] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !resource) return;
    setDestinationWorkspaceId(resource.workspace_id);
    setName(resource.name);
    setError(null);
    setLoading(false);
  }, [open, resource]);

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === destinationWorkspaceId),
    [destinationWorkspaceId, workspaces]
  );

  async function handleDuplicate() {
    if (!resource || !destinationWorkspaceId || !name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const duplicate = await api.post<Resource>(`/resources/${resource.id}/duplicate`, {
        destination_workspace_id: destinationWorkspaceId,
        name: name.trim(),
      });
      onDuplicated(duplicate);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to duplicate resource");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader
        title="Duplicate Resource"
        description="Create a full copy of this resource and its associated data."
        onClose={onClose}
      />
      <DialogBody className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="duplicate-resource-name">Resource name</Label>
          <Input
            id="duplicate-resource-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Resource name"
            disabled={loading}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="duplicate-resource-workspace">Workspace</Label>
          <Select
            id="duplicate-resource-workspace"
            value={destinationWorkspaceId}
            onChange={(e) => setDestinationWorkspaceId(e.target.value)}
            disabled={loading || workspaces.length === 0}
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </Select>
        </div>

        {resource && selectedWorkspace && (
          <div className="rounded-md border border-border bg-surface-active p-3 text-xs text-ink-muted">
            A copy of <span className="font-medium text-ink">{resource.name}</span> will be created in{" "}
            <span className="font-medium text-ink">{selectedWorkspace.name}</span>. The original resource will not be changed.
          </div>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleDuplicate} disabled={!resource || !destinationWorkspaceId || !name.trim() || loading}>
          {loading ? "Duplicating…" : "Duplicate"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
