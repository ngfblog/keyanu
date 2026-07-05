import { useState } from "react";
import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { usePreferences } from "@/store/preferences-context";
import { useToast } from "@/components/common/toast";
import { ApiError } from "@/lib/api";
import { ACCENT_COLOR_OPTIONS } from "@/lib/color";

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-xs text-ink-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-brass" : "bg-surface-active"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export function AppearanceSettingsPage() {
  const { preferences, update } = usePreferences();
  const { notify } = useToast();
  const [savingColor, setSavingColor] = useState<string | null>(null);

  async function handleAccentChange(color: string) {
    setSavingColor(color);
    try {
      await update({ accent_color: color });
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to update accent color", "error");
    } finally {
      setSavingColor(null);
    }
  }

  async function handleToggle(key: "compact_mode" | "animations_enabled", value: boolean) {
    try {
      await update({ [key]: value });
      notify("Preferences saved");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to update preference", "error");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Keyanu is dark-themed by design — built for long infrastructure sessions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm space-y-1.5">
            <Select value="dark" disabled>
              <option value="dark">Dark</option>
            </Select>
            <p className="text-[11px] text-ink-faint">Additional themes may be added in a future release.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accent color</CardTitle>
          <CardDescription>Used for buttons, active states, and highlights throughout the app.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2.5">
            {ACCENT_COLOR_OPTIONS.map((color) => {
              const active = preferences.accent_color.toLowerCase() === color.toLowerCase();
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleAccentChange(color)}
                  disabled={savingColor !== null}
                  className="flex h-9 w-9 items-center justify-center rounded-full ring-offset-2 ring-offset-surface transition-transform hover:scale-105 disabled:opacity-60"
                  style={{ backgroundColor: color, boxShadow: active ? `0 0 0 2px ${color}` : undefined }}
                  aria-label={`Use accent color ${color}`}
                >
                  {active && <Check className="h-4 w-4 text-[#0B0E14]" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Layout</CardTitle>
          <CardDescription>Fine-tune density and motion.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <Toggle
            checked={preferences.compact_mode}
            onChange={(v) => handleToggle("compact_mode", v)}
            label="Compact mode"
            description="Tighter padding on cards and pages for higher information density."
          />
          <Toggle
            checked={preferences.animations_enabled}
            onChange={(v) => handleToggle("animations_enabled", v)}
            label="Animations"
            description="Fade and scale transitions on dialogs, tabs, and toasts."
          />
        </CardContent>
      </Card>
    </div>
  );
}
