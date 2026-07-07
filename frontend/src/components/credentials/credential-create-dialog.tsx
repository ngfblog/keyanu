import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FieldInput } from "@/components/credentials/field-input";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/common/toast";
import type { Credential, CredentialTemplateId, TemplateDefinition } from "@/types";

export function CredentialCreateDialog({
  open,
  onClose,
  onCreated,
  resourceId,
  templates,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (credential: Credential) => void;
  resourceId: string;
  templates: TemplateDefinition[];
}) {
  const { notify } = useToast();
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState<CredentialTemplateId | "">("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const template = useMemo(
    () => templates.find((t) => t.id === templateId) ?? null,
    [templates, templateId]
  );

  useEffect(() => {
    if (open) {
      setName("");
      setTemplateId("");
      setFieldValues({});
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    setFieldValues({});
  }, [templateId]);

  const standardFields = template?.fields.filter((field) => field.help_text !== "Advanced") ?? [];
  const advancedFields = template?.fields.filter((field) => field.help_text === "Advanced") ?? [];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!template) return;
    setSaving(true);
    setError(null);
    try {
      const credential = await api.post<Credential>(`/resources/${resourceId}/credentials`, {
        name,
        template: template.id,
        fields: fieldValues,
      });
      notify("Credential added");
      onCreated(credential);
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
          title="Add credential"
          description="Choose a template, then fill in only the fields you have."
          onClose={onClose}
        />
        <DialogBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5 sm:col-span-1">
              <Label htmlFor="cred-template">Template</Label>
              <Select
                id="cred-template"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value as CredentialTemplateId)}
                required
              >
                <option value="" disabled>
                  Select a template
                </option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
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
            </>
          )}

          {error && <p className="text-xs text-danger">{error}</p>}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} disabled={!template}>
            Save credential
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
