import { useRef, useState, type DragEvent, type FormEvent } from "react";
import {
  UploadCloud,
  FileArchive,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/common/toast";
import { useAuth } from "@/store/auth-context";
import { formatDateTime } from "@/lib/datetime";
import { usePreferences } from "@/store/preferences-context";
import type { BackupRestoreResult, BackupVerifyResult } from "@/types";

const COUNT_LABELS: Record<string, string> = {
  workspaces: "Workspaces",
  resources: "Systems",
  credentials: "Credentials",
  notes: "Notes",
  files: "Files",
  audit_logs: "Audit entries",
};

export function BackupRestoreSection() {
  const { notify } = useToast();
  const { logout } = useAuth();
  const { preferences } = usePreferences();

  const [file, setFile] = useState<File | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<BackupVerifyResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [restoreOpen, setRestoreOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  async function handleFile(selected: File) {
    setFile(selected);
    setResult(null);
    setVerifying(true);
    try {
      const form = new FormData();
      form.append("file", selected);
      const verifyResult = await api.postForm<BackupVerifyResult>("/backup/verify", form);
      setResult(verifyResult);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to inspect backup file", "error");
      setFile(null);
    } finally {
      setVerifying(false);
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFile(dropped);
  }

  async function handleRestoreSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setRestoring(true);
    setRestoreError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("current_password", currentPassword);
      form.append("confirm_overwrite", "true");
      const restoreResult = await api.postForm<BackupRestoreResult>("/backup/restore", form);
      if (restoreResult.restored) {
        notify("Backup restored. Please sign in again.");
        logout();
      }
    } catch (err) {
      setRestoreError(err instanceof ApiError ? err.message : "Failed to restore backup");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Import &amp; restore</CardTitle>
          <CardDescription>
            Restore from a <code className="font-mono text-ink">.keyanu</code> backup. This replaces
            everything currently in Keyanu.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!file && (
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
                accept=".keyanu"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <UploadCloud className="h-6 w-6 text-ink-faint" />
              <p className="text-sm font-medium text-ink">Drag & drop a .keyanu file here, or click to browse</p>
            </div>
          )}

          {file && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-md border border-border bg-base/40 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-active text-ink-faint">
                  <FileArchive className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{file.name}</p>
                  <p className="text-xs text-ink-faint">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <Button variant="ghost" size="sm" onClick={reset}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Choose another
                </Button>
              </div>

              {verifying ? (
                <div className="flex items-center gap-2 text-sm text-ink-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying backup...
                </div>
              ) : result ? (
                <div className="space-y-3 rounded-md border border-border bg-base/40 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink">Verification result</span>
                    <Badge variant={result.valid ? "success" : "danger"}>
                      {result.valid ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> Valid
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3" /> Invalid
                        </>
                      )}
                    </Badge>
                  </div>

                  {result.manifest && (
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <dt className="text-ink-faint">Exported by</dt>
                      <dd className="text-ink-muted">{result.manifest.exported_by}</dd>
                      <dt className="text-ink-faint">Created</dt>
                      <dd className="text-ink-muted">
                        {formatDateTime(result.manifest.created_at, preferences.time_format)}
                      </dd>
                      <dt className="text-ink-faint">App version</dt>
                      <dd className="text-ink-muted">{result.manifest.app_version}</dd>
                    </dl>
                  )}

                  {result.counts && (
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(result.counts).map(([key, value]) => (
                        <span
                          key={key}
                          className="rounded-full border border-border bg-surface-active px-2 py-0.5 text-[11px] text-ink-muted"
                        >
                          {value} {COUNT_LABELS[key] ?? key}
                        </span>
                      ))}
                    </div>
                  )}

                  {result.errors.length > 0 && (
                    <div className="space-y-1.5">
                      {result.errors.map((err) => (
                        <div key={err} className="flex items-start gap-2 text-xs text-danger">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{err}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant={result.valid ? "destructive" : "secondary"}
                    disabled={!result.valid}
                    onClick={() => setRestoreOpen(true)}
                  >
                    Restore this backup
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={restoreOpen} onClose={() => setRestoreOpen(false)} className="max-w-sm">
        <form onSubmit={handleRestoreSubmit}>
          <DialogHeader
            title="Restore backup?"
            description="This permanently replaces every workspace, system, credential, file, and note currently in Keyanu with the contents of this backup."
            onClose={() => setRestoreOpen(false)}
          />
          <DialogBody className="space-y-4">
            <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
              This cannot be undone. All devices will be signed out, including this one, since account
              security settings (two-factor authentication, session timeout) are restored too.
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="restore-password">Current password</Label>
              <Input
                id="restore-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <label className="flex items-start gap-2 text-xs text-ink-muted">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 rounded border-border"
                required
              />
              I understand this will overwrite all existing data and cannot be undone.
            </label>
            {restoreError && <p className="text-xs text-danger">{restoreError}</p>}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setRestoreOpen(false)} disabled={restoring}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" loading={restoring} disabled={!confirmed}>
              Restore and sign out
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
