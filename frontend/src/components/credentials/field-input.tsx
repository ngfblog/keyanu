import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { TemplateField } from "@/types";

export function FieldInput({
  field,
  value,
  onChange,
}: {
  field: TemplateField;
  value: string;
  onChange: (value: string) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const isSecretText = field.secret && field.input_type !== "textarea" && field.input_type !== "monospace";

  return (
    <div className="space-y-1.5">
      <Label htmlFor={`field-${field.key}`}>
        {field.label}
        {field.required && <span className="ml-0.5 text-brass">*</span>}
      </Label>

      {field.input_type === "textarea" || field.input_type === "monospace" ? (
        <Textarea
          id={`field-${field.key}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          mono={field.input_type === "monospace"}
          rows={field.input_type === "monospace" ? 5 : 3}
          spellCheck={false}
        />
      ) : (
        <div className="relative">
          <Input
            id={`field-${field.key}`}
            type={isSecretText && !revealed ? "password" : "text"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className={isSecretText ? "pr-9" : undefined}
            spellCheck={false}
          />
          {isSecretText && (
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
              aria-label={revealed ? "Hide value" : "Show value"}
            >
              {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
      )}
      {field.help_text && <p className="text-[11px] text-ink-faint">{field.help_text}</p>}
    </div>
  );
}
