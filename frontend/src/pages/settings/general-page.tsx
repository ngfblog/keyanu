import { useEffect, useState, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { usePreferences } from "@/store/preferences-context";
import { useToast } from "@/components/common/toast";
import { ApiError } from "@/lib/api";

export function GeneralSettingsPage() {
  const { preferences, update } = usePreferences();
  const { notify } = useToast();
  const [displayName, setDisplayName] = useState(preferences.display_name ?? "");
  const [timeFormat, setTimeFormat] = useState(preferences.time_format);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(preferences.display_name ?? "");
    setTimeFormat(preferences.time_format);
  }, [preferences]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await update({ display_name: displayName || null, time_format: timeFormat });
      notify("Preferences saved");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to save preferences", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Basic profile and display preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-sm space-y-1.5">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Administrator"
              maxLength={128}
            />
            <p className="text-[11px] text-ink-faint">Shown in the top bar instead of your username.</p>
          </div>

          <div className="max-w-sm space-y-1.5">
            <Label htmlFor="time-format">Time format</Label>
            <Select
              id="time-format"
              value={timeFormat}
              onChange={(e) => setTimeFormat(e.target.value as "12h" | "24h")}
            >
              <option value="24h">24-hour (14:30)</option>
              <option value="12h">12-hour (2:30 PM)</option>
            </Select>
            <p className="text-[11px] text-ink-faint">
              Used for timestamps across activity logs and resource details.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 flex justify-end">
        <Button type="submit" loading={saving}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
