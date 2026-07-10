import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldInput } from "@/components/credentials/field-input";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/common/toast";
import type { Credential, CredentialRevealResponse, TemplateDefinition } from "@/types";

export function CredentialEditDialog({
  open,
  onClose,
  onSaved,
  credential,
  templates,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (credential: Credential) => void | Promise<void>;
  credential: Credential;
  templates: TemplateDefinition[];
}) {
  const { notify } = useToast();
  const [name, setName] = useState(credential.name);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const template = useMemo(
    () => templates.find((t) => t.id === credential.template) ?? null,
    [templates, credential.template]
  );

  useEffect(() => {
    if (!open) return;

    let active = true;
    setName(credential.name);
    setFieldValues({});
    setError(null);
    setLoading(true);

    api
      .post<CredentialRevealResponse>(`/credentials/${credential.id}/reveal`)
      .then((response) => {
        if (active) setFieldValues(response.fields);
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : "Failed to load credential values");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, credential.id, credential.name]);

  const standardFields = template?.fields.filter((field) => field.help_text !== "Advanced") ?? [];
  const advancedFields = template?.fields.filter((field) => field.help_text === "Advanced") ?? [];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!template) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.put<Credential>(`/credentials/${credential.id}`, {
        name,
        fields: fieldValues,
      });
      notify("Credential updated");
      await onSaved(updated);
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
          description="Update the saved values for this credential."
          onClose={onClose}
        />
        <DialogBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5 sm:col-span-1">
              <Label htmlFor="cred-template">Template</Label>
              <Input id="cred-template" value={template?.label ?? credential.template} disabled />
            </div>
            <div className="col-span-2 space-y-1.5 sm:col-span-1">
              <Label htmlFor="cred-name">Name</Label>
              <Input
                id="cred-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Root SSH Key"
                required
                maxLength={128}
              />
            </div>
          </div>

          {template && (
            <>
              <p className="text-xs text-ink-muted">{template.description}</p>
              <div className="space-y-4 rounded-md border border-border bg-base/40 p-3.5">
                {loading ? (
                  <p className="text-sm text-ink-muted">Loading saved values…</p>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </>
          )}

          {error && <p className="text-xs text-danger">{error}</p>}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} disabled={!template || loading}>
            Save credential
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
