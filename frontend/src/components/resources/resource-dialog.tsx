import { useEffect, useState, type FormEvent } from "react";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/common/toast";
import { RESOURCE_LABELS, RESOURCE_TYPES, defaultResourceIcon } from "@/lib/icons";
import { IconPicker } from "@/components/common/icon-picker";
import { IconPreview, isUploadedIcon } from "@/components/common/icon-preview";
import type { Resource, ResourceType } from "@/types";

export function ResourceDialog({
  open,
  onClose,
  onSaved,
  workspaceId,
  resource,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (resource: Resource) => void;
  workspaceId: string;
  resource?: Resource | null;
}) {
  const { notify } = useToast();
  const [name, setName] = useState("");
  const [type, setType] = useState<ResourceType>("custom");
  const [customType, setCustomType] = useState("");
  const [icon, setIcon] = useState("box");
  const [hostname, setHostname] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [iconSource, setIconSource] = useState<"built-in" | "upload">("built-in");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(null);
  const [iconError, setIconError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(resource?.name ?? "");
      const resType = resource?.type ?? "custom";
      const known = RESOURCE_TYPES.includes(resType);
      setType(known ? resType : "custom");
      setCustomType(known ? "" : resType);
      const currentIcon = resource?.icon ?? defaultResourceIcon(resType);
      setIcon(currentIcon);
      setIconSource(isUploadedIcon(currentIcon) ? "upload" : "built-in");
      setIconFile(null);
      if (iconPreviewUrl) URL.revokeObjectURL(iconPreviewUrl);
      setIconPreviewUrl(null);
      setIconError(null);
      setHostname(resource?.hostname ?? "");
      setDescription(resource?.description ?? "");
      setTags(resource?.tags ?? "");
      setError(null);
    }
  }, [open, resource]);

  function handleIconFile(file: File | null) {
    setIconFile(null);
    setIconError(null);
    if (iconPreviewUrl) URL.revokeObjectURL(iconPreviewUrl);
    setIconPreviewUrl(null);
    if (!file) return;
    const validTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      setIconError("Icon image must be PNG, JPG, JPEG, WEBP, or safe SVG.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setIconError("Icon image must be 1 MB or smaller.");
      return;
    }
    setIconFile(file);
    setIconPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const realType = type === "custom" ? customType.trim() : type;
      if (iconError) return;
      const payload = {
        name,
        type: realType,
        icon: iconSource === "built-in" ? (icon || defaultResourceIcon(realType)) : (isUploadedIcon(icon) ? icon : defaultResourceIcon(realType)),
        hostname: hostname || null,
        description: description || null,
        tags: tags || null,
      };
      const result = resource
        ? await api.put<Resource>(`/resources/${resource.id}`, payload)
        : await api.post<Resource>(`/workspaces/${workspaceId}/resources`, payload);
      const saved = iconSource === "upload" && iconFile ? await api.upload<Resource>(`/resources/${result.id}/icon`, iconFile) : result;
      notify(resource ? "Resource updated" : "Resource added");
      onSaved(saved);
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
          title={resource ? "Edit resource" : "Add resource"}
          description="A resource is a device, service, or system you manage credentials for."
          onClose={onClose}
        />
        <DialogBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5 sm:col-span-1">
              <Label htmlFor="res-name">Name</Label>
              <Input
                id="res-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="pfSense Firewall"
                required
                maxLength={128}
              />
            </div>
            <div className="col-span-2 space-y-1.5 sm:col-span-1">
              <Label htmlFor="res-type">Type</Label>
              <Select id="res-type" value={type} onChange={(e) => { const v = e.target.value as ResourceType; setType(v); if (v !== "custom") setIcon(defaultResourceIcon(v)); }}>
                {RESOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === "custom" ? "Other / Custom" : RESOURCE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {type === "custom" && (
            <div className="space-y-1.5">
              <Label htmlFor="res-custom-type">Custom type</Label>
              <Input id="res-custom-type" value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder="Internal API" required maxLength={64} />
            </div>
          )}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex items-center gap-3 rounded-md border border-border bg-surface-muted p-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-surface-active">
                {iconPreviewUrl ? <img src={iconPreviewUrl} alt="Selected upload preview" className="h-8 w-8 rounded object-cover" /> : <IconPreview icon={icon} fallback={defaultResourceIcon(type === "custom" ? customType : type)} className="h-8 w-8" />}
              </span>
              <span className="text-xs text-ink-muted">Current icon preview</span>
            </div>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="radio" checked={iconSource === "built-in"} onChange={() => { setIconSource("built-in"); setIcon(defaultResourceIcon(type === "custom" ? customType : type)); handleIconFile(null); }} /> Built-in icon</label>
              <label className="flex items-center gap-2"><input type="radio" checked={iconSource === "upload"} onChange={() => setIconSource("upload")} /> Upload image</label>
            </div>
            {iconSource === "built-in" ? <IconPicker value={isUploadedIcon(icon) ? defaultResourceIcon(type === "custom" ? customType : type) : icon} onChange={setIcon} /> : <Input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => handleIconFile(e.target.files?.[0] ?? null)} />}
            {iconSource === "upload" && isUploadedIcon(icon) && !iconFile && <Button type="button" variant="secondary" onClick={() => { setIconSource("built-in"); setIcon(defaultResourceIcon(type === "custom" ? customType : type)); handleIconFile(null); }}>Remove custom image</Button>}
            {iconError && <p className="text-xs text-danger">{iconError}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="res-hostname">Hostname / IP</Label>
            <Input
              id="res-hostname"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder="10.10.20.1 or pfsense.lan"
              mono
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="res-description">Description</Label>
            <Textarea
              id="res-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this and why does it matter?"
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="res-tags">Tags</Label>
            <Input
              id="res-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="firewall, edge, critical"
            />
            <p className="text-[11px] text-ink-faint">Comma-separated</p>
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {resource ? "Save changes" : "Add resource"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
