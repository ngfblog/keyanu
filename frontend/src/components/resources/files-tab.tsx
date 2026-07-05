import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { UploadCloud, FileText, Download, Trash2, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Card } from "@/components/ui/card";
import { api, ApiError, getToken } from "@/lib/api";
import { useToast } from "@/components/common/toast";
import { cn } from "@/lib/utils";
import type { ResourceFileMeta } from "@/types";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilesTab({
  resourceId,
  files,
  onChanged,
  highlightId,
}: {
  resourceId: string;
  files: ResourceFileMeta[];
  onChanged: () => void;
  highlightId?: string | null;
}) {
  const { notify } = useToast();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ResourceFileMeta | null>(null);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId, files]);

  const uploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
      setUploading(true);
      try {
        for (const file of Array.from(fileList)) {
          await api.upload(`/resources/${resourceId}/files`, file);
        }
        notify(fileList.length > 1 ? "Files uploaded" : "File uploaded");
        onChanged();
      } catch (err) {
        notify(err instanceof ApiError ? err.message : "Upload failed", "error");
      } finally {
        setUploading(false);
      }
    },
    [resourceId, notify, onChanged]
  );

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/files/${pendingDelete.id}`);
      notify("File deleted");
      onChanged();
      setPendingDelete(null);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to delete file", "error");
    } finally {
      setDeleting(false);
    }
  }

  function downloadFile(file: ResourceFileMeta) {
    const token = getToken();
    const url = `/api/files/${file.id}/download`;
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((res) => res.blob())
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = file.filename;
        a.click();
        URL.revokeObjectURL(objectUrl);
      })
      .catch(() => notify("Failed to download file", "error"));
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? "border-brass bg-brass-subtle/40" : "border-border hover:border-brass/40"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-brass" />
        ) : (
          <UploadCloud className="h-6 w-6 text-ink-faint" />
        )}
        <p className="text-sm font-medium text-ink">
          {uploading ? "Uploading..." : "Drag & drop files here, or click to browse"}
        </p>
        <p className="text-xs text-ink-faint">Certificates, config exports, backups — up to 25MB each</p>
      </div>

      {files.length === 0 ? (
        <EmptyState icon={<FileText className="h-5 w-5" />} title="No files attached yet" />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {files.map((file) => (
            <Card
              key={file.id}
              ref={file.id === highlightId ? highlightRef : undefined}
              className={cn(
                "flex items-center gap-3 p-3 transition-shadow",
                file.id === highlightId && "ring-2 ring-brass"
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-active text-ink-faint">
                <FileText className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{file.filename}</p>
                <p className="text-xs text-ink-faint">{formatBytes(file.size_bytes)}</p>
              </div>
              <button
                onClick={() => downloadFile(file)}
                className="rounded p-1.5 text-ink-faint hover:bg-surface-hover hover:text-ink"
                aria-label="Download file"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPendingDelete(file)}
                className="rounded p-1.5 text-ink-faint hover:bg-surface-hover hover:text-danger"
                aria-label="Delete file"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this file?"
        description={`"${pendingDelete?.filename}" will be permanently deleted.`}
        confirmLabel="Delete file"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
