import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { ICON_OPTIONS, getIcon, isCustomIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { IconDisplay } from "@/components/common/icon-display";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_ICON_BYTES = 1024 * 1024;

type UploadResponse = { icon: string; url: string };

export function IconPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [mode, setMode] = useState<"built-in" | "upload">("built-in");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file?: File) {
    setError(null);
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Choose a PNG, JPG, WEBP, or SVG image.");
      return;
    }
    if (file.size > MAX_ICON_BYTES) {
      setError("Icon must be 1MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const uploaded = await api.upload<UploadResponse>("/icons/upload", file);
      onChange(uploaded.icon);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Icon upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode("built-in")} className={cn("rounded-md border border-border px-3 py-1.5 text-xs", mode === "built-in" && "border-brass bg-brass-subtle text-brass")}>Built-in icons</button>
        <button type="button" onClick={() => setMode("upload")} className={cn("rounded-md border border-border px-3 py-1.5 text-xs", mode === "upload" && "border-brass bg-brass-subtle text-brass")}>Upload custom icon</button>
      </div>

      {mode === "built-in" ? (
        <div className="grid grid-cols-6 gap-2">
          {ICON_OPTIONS.map((key) => {
            const Icon = getIcon(key);
            return (
              <button key={key} type="button" onClick={() => onChange(key)} className={cn("flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface transition-colors hover:border-brass/60 hover:text-brass", value === key && "border-brass bg-brass-subtle text-brass")} aria-label={`Choose ${key} icon`} title={key}>
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
          {isCustomIcon(value) && (
            <div className="flex items-center gap-2 text-xs text-ink-muted">
              <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface"><IconDisplay icon={value} className="h-6 w-6" alt="Custom icon preview" /></span>
              Current custom icon
            </div>
          )}
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(event) => void handleUpload(event.target.files?.[0])} />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-ink-muted hover:border-brass/60 hover:text-brass disabled:opacity-60">
            <Upload className="h-4 w-4" /> {uploading ? "Uploading..." : "Upload custom icon"}
          </button>
          <p className="text-xs text-ink-faint">PNG, JPG, WEBP, or SVG. Max 1MB.</p>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
