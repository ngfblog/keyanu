import { useEffect, useState } from "react";
import { Copy, Eye, EyeOff, Trash2, Check } from "lucide-react";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/common/toast";
import type { Credential, CredentialRevealResponse, TemplateDefinition } from "@/types";

export function CredentialViewDialog({
  open,
  onClose,
  credential,
  definition,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  credential: Credential | null;
  definition?: TemplateDefinition;
  onDeleted: (id: string) => void;
}) {
  const { notify } = useToast();
  const [fields, setFields] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (open && credential) {
      setFields(null);
      setRevealedKeys(new Set());
      setLoading(true);
      api
        .post<CredentialRevealResponse>(`/credentials/${credential.id}/reveal`)
        .then((res) => setFields(res.fields))
        .catch((err) => notify(err instanceof ApiError ? err.message : "Failed to load credential", "error"))
        .finally(() => setLoading(false));
    }
  }, [open, credential, notify]);

  if (!credential) return null;

  function toggleReveal(key: string) {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function copyValue(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    notify("Copied to clipboard");
    setTimeout(() => setCopiedKey(null), 1500);
  }

  async function handleDelete() {
    if (!credential) return;
    setDeleting(true);
    try {
      await api.delete(`/credentials/${credential.id}`);
      notify("Credential deleted");
      onDeleted(credential.id);
      setConfirmOpen(false);
      onClose();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to delete credential", "error");
    } finally {
      setDeleting(false);
    }
  }

  const fieldDefs = definition?.fields ?? [];

  return (
    <>
      <Dialog open={open} onClose={onClose} className="max-w-xl">
        <DialogHeader
          title={credential.name}
          description={definition?.label ?? credential.template}
          onClose={onClose}
        />
        <DialogBody className="space-y-3">
          {loading || !fields ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-md bg-surface-active" />
              ))}
            </div>
          ) : (
            fieldDefs.map((field) => {
              const value = fields[field.key] ?? "";
              if (!value) return null;
              const isRevealed = revealedKeys.has(field.key) || !field.secret;
              const isMonoBlock = field.input_type === "monospace" || field.input_type === "textarea";

              return (
                <div key={field.key} className="rounded-md border border-border bg-base/40 p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-ink-muted">{field.label}</span>
                    <div className="flex items-center gap-1">
                      {field.secret && (
                        <button
                          onClick={() => toggleReveal(field.key)}
                          className="rounded p-1 text-ink-faint hover:bg-surface-hover hover:text-ink"
                          aria-label={isRevealed ? "Hide value" : "Show value"}
                        >
                          {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      <button
                        onClick={() => copyValue(field.key, value)}
                        className="rounded p-1 text-ink-faint hover:bg-surface-hover hover:text-ink"
                        aria-label="Copy value"
                      >
                        {copiedKey === field.key ? (
                          <Check className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div
                    className={
                      isMonoBlock
                        ? "max-h-40 overflow-y-auto whitespace-pre-wrap break-all font-mono text-xs text-ink"
                        : "truncate font-mono text-sm text-ink"
                    }
                  >
                    {isRevealed ? value : "•".repeat(Math.min(value.length, 24))}
                  </div>
                </div>
              );
            })
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this credential?"
        description={`"${credential.name}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete credential"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  );
}
