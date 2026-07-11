import { useEffect, useMemo, useState } from "react";
import { Copy, Search } from "lucide-react";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import type { Resource, ResourceDetail, Workspace } from "@/types";

interface ResourceDuplicateDialogProps {
  open: boolean;
  resource: ResourceDetail;
  onClose: () => void;
  onDuplicated: (resource: Resource) => void;
}

const copyOptionLabels = {
  copy_credentials: "Credentials",
  copy_notes: "Secure Notes",
  copy_files: "Files",
  copy_icon: "Custom Icon",
  copy_tags: "Tags",
} as const;

type CopyOption = keyof typeof copyOptionLabels;

export function ResourceDuplicateDialog({ open, resource, onClose, onDuplicated }: ResourceDuplicateDialogProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [options, setOptions] = useState<Record<CopyOption, boolean>>({
    copy_credentials: true,
    copy_notes: true,
    copy_files: true,
    copy_icon: true,
    copy_tags: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(`${resource.name} Copy`);
    setQuery("");
    setDestinationId(resource.workspace_id);
    setOptions({ copy_credentials: true, copy_notes: true, copy_files: true, copy_icon: true, copy_tags: true });
    setError(null);
    api
      .get<Workspace[]>("/workspaces")
      .then(setWorkspaces)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load Workspaces"));
  }, [open, resource.name, resource.workspace_id]);

  const destinations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return workspaces.filter((workspace) => workspace.name.toLowerCase().includes(normalized));
  }, [query, workspaces]);

  async function handleDuplicate() {
    if (!name.trim()) {
      setError("New Resource Name is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const duplicate = await api.post<Resource>(`/resources/${resource.id}/duplicate`, {
        name: name.trim(),
        destination_workspace_id: destinationId,
        ...options,
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
      <DialogHeader title="Duplicate Resource" description="Create a new resource by copying selected data from this one." onClose={onClose} />
      <DialogBody className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">New Resource Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Destination Workspace</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Workspaces" className="pl-9" />
          </div>
          <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-border bg-surface">
            {destinations.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                onClick={() => setDestinationId(workspace.id)}
                className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover ${
                  destinationId === workspace.id ? "bg-surface-active text-ink" : "text-ink-muted"
                }`}
              >
                {workspace.name} {workspace.id === resource.workspace_id ? "(current)" : ""}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-ink-muted">Copy options</p>
          <div className="space-y-2 rounded-md border border-border bg-surface p-3">
            {(Object.keys(copyOptionLabels) as CopyOption[]).map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm text-ink-muted">
                <input
                  type="checkbox"
                  checked={options[key]}
                  onChange={(e) => setOptions((current) => ({ ...current, [key]: e.target.checked }))}
                  className="h-4 w-4 rounded border-border accent-brass"
                />
                {copyOptionLabels[key]}
              </label>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleDuplicate} loading={loading} disabled={!name.trim() || !destinationId}>
          <Copy className="h-4 w-4" />
          Create Copy
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
