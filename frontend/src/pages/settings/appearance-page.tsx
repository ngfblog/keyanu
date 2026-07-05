import { useState } from "react";
import { Check, Moon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { usePreferences } from "@/store/preferences-context";
import { useToast } from "@/components/common/toast";
import { ApiError } from "@/lib/api";
import { ACCENT_COLOR_OPTIONS } from "@/lib/color";
import { cn } from "@/lib/utils";

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
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-xs text-ink-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-brass" : "bg-surface-active"
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5"
          )}
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
          <div className="flex max-w-sm items-center gap-2.5 rounded-md border border-border bg-base/40 px-3 py-2">
            <Moon className="h-4 w-4 text-ink-faint" />
            <span className="text-sm text-ink">Dark</span>
          </div>
          <p className="mt-1.5 text-[11px] text-ink-faint">Additional themes may be added in a future release.</p>
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
