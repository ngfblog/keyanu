import { useEffect, useState } from "react";
import { Copy, Eye, EyeOff, Check } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/common/toast";
import type { CredentialRevealResponse, TemplateDefinition } from "@/types";

export function CredentialFieldsPanel({
  credentialId,
  definition,
}: {
  credentialId: string;
  definition?: TemplateDefinition;
}) {
  const { notify } = useToast();
  const [fields, setFields] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    setFields(null);
    setRevealedKeys(new Set());
    setLoading(true);
    api
      .post<CredentialRevealResponse>(`/credentials/${credentialId}/reveal`)
      .then((res) => setFields(res.fields))
      .catch((err) => notify(err instanceof ApiError ? err.message : "Failed to load credential", "error"))
      .finally(() => setLoading(false));
  }, [credentialId, notify]);

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

  const fieldDefs = definition?.fields ?? [];

  if (loading || !fields) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-md bg-surface-active" />
        ))}
      </div>
    );
  }

  const visibleFields = fieldDefs.filter((f) => fields[f.key]);

  if (visibleFields.length === 0) {
    return <p className="text-sm text-ink-muted">No fields have been set on this credential yet.</p>;
  }

  return (
    <div className="space-y-3">
      {visibleFields.map((field) => {
        const value = fields[field.key] ?? "";
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
                  ? "max-h-52 overflow-y-auto whitespace-pre-wrap break-all font-mono text-xs text-ink"
                  : "truncate font-mono text-sm text-ink"
              }
            >
              {isRevealed ? value : "•".repeat(Math.min(value.length, 24))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
