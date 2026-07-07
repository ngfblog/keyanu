import { useEffect, useState, type FormEvent } from "react";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { IconPicker } from "@/components/common/icon-picker";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/common/toast";
import { WORKSPACE_LABELS, WORKSPACE_TYPES, defaultWorkspaceIcon, labelForType } from "@/lib/icons";
import type { Workspace } from "@/types";

const COLOR_OPTIONS = ["#D4A72C", "#58A6FF", "#2DD4BF", "#A78BFA", "#F472B6", "#FB923C", "#3FB950", "#F85149"];

export function WorkspaceDialog({
  open,
  onClose,
  onSaved,
  workspace,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (workspace: Workspace) => void;
  workspace?: Workspace | null;
}) {
  const { notify } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("website");
  const [customType, setCustomType] = useState("");
  const [icon, setIcon] = useState("folder");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(workspace?.name ?? "");
      setDescription(workspace?.description ?? "");
      const wsType = workspace?.type ?? "website";
      const known = WORKSPACE_TYPES.includes(wsType as any);
      setType(known ? wsType : "custom");
      setCustomType(known ? "" : wsType);
      setIcon(workspace?.icon ?? defaultWorkspaceIcon(wsType));
      setColor(workspace?.color ?? COLOR_OPTIONS[0]);
      setError(null);
    }
  }, [open, workspace]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const realType = type === "custom" ? customType.trim() : type;
      const payload = { name, description: description || null, type: realType, color, icon: icon || defaultWorkspaceIcon(realType) };
      const result = workspace
        ? await api.put<Workspace>(`/workspaces/${workspace.id}`, payload)
        : await api.post<Workspace>("/workspaces", payload);
      notify(workspace ? "Workspace updated" : "Workspace created");
      onSaved(result);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <DialogHeader
          title={workspace ? "Edit workspace" : "New workspace"}
          description="Group related infrastructure resources together."
          onClose={onClose}
        />
        <DialogBody className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ws-name">Name</Label>
            <Input
              id="ws-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Home Lab"
              required
              maxLength={128}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ws-description">Description</Label>
            <Textarea
              id="ws-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What lives in this workspace?"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ws-type">Type</Label>
              <Select id="ws-type" value={type} onChange={(e) => { const v = e.target.value; setType(v); if (v !== "custom") setIcon(defaultWorkspaceIcon(v)); }}>
                {WORKSPACE_TYPES.map((t) => <option key={t} value={t}>{WORKSPACE_LABELS[t]}</option>)}
                <option value="custom">Other / Custom</option>
              </Select>
            </div>
            {type === "custom" && (
              <div className="space-y-1.5">
                <Label htmlFor="ws-custom-type">Custom type</Label>
                <Input id="ws-custom-type" value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder="Client portal" required maxLength={64} />
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Icon</Label>
            <IconPicker value={icon} onChange={setIcon} />
            <p className="text-[11px] text-ink-faint">Default: {labelForType(type === "custom" ? customType : type)}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full ring-offset-2 ring-offset-surface transition-transform hover:scale-105"
                  style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
                  aria-label={`Choose color ${c}`}
                />
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {workspace ? "Save changes" : "Create workspace"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
