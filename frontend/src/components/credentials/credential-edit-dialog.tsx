import { useEffect, useState, type FormEvent } from "react";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FieldInput } from "@/components/credentials/field-input";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/common/toast";
import type { Credential, CredentialRevealResponse, TemplateDefinition } from "@/types";

export function CredentialEditDialog({
  open,
  onClose,
  onSaved,
  credential,
  template,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (credential: Credential) => void;
  credential: Credential;
  template?: TemplateDefinition;
}) {
  const { notify } = useToast();
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setFieldValues({});
    setError(null);
    setLoading(true);
    api
      .post<CredentialRevealResponse>(`/credentials/${credential.id}/reveal`)
      .then((res) => setFieldValues(res.fields))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load credential values"))
      .finally(() => setLoading(false));
  }, [credential.id, open]);

  const standardFields = template?.fields.filter((field) => field.help_text !== "Advanced") ?? [];
  const advancedFields = template?.fields.filter((field) => field.help_text === "Advanced") ?? [];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await api.put<Credential>(`/credentials/${credential.id}`, {
        fields: fieldValues,
      });
      notify("Credential updated");
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-xl">
      <form onSubmit={handleSubmit}>
        <DialogHeader
          title="Edit credential"
          description="Update the saved values for this credential. Leave unchanged values as-is. Clear a field to remove it."
          onClose={onClose}
        />
        <DialogBody className="space-y-4">
          {template && <p className="text-xs text-ink-muted">{template.description}</p>}

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-md bg-surface-active" />
              ))}
            </div>
          ) : template ? (
            <div className="space-y-4 rounded-md border border-border bg-base/40 p-3.5">
              {standardFields.map((field) => (
                <FieldInput
                  key={field.key}
                  field={field}
                  value={fieldValues[field.key] ?? ""}
                  onChange={(value) => setFieldValues((prev) => ({ ...prev, [field.key]: value }))}
                />
              ))}
              {advancedFields.length > 0 && (
                <details className="rounded-md border border-border bg-surface/60 p-3">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-ink-faint">Advanced</summary>
                  <div className="mt-3 space-y-4">
                    {advancedFields.map((field) => (
                      <FieldInput
                        key={field.key}
                        field={field}
                        value={fieldValues[field.key] ?? ""}
                        onChange={(value) => setFieldValues((prev) => ({ ...prev, [field.key]: value }))}
                      />
                    ))}
                  </div>
                </details>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">This credential template could not be loaded.</p>
          )}

          {error && <p className="text-xs text-danger">{error}</p>}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} disabled={loading || !template}>
            Save changes
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
