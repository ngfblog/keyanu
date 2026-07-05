import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/common/toast";

const TIMEOUT_OPTIONS = [
  { minutes: 30, label: "30 minutes" },
  { minutes: 60, label: "1 hour" },
  { minutes: 240, label: "4 hours" },
  { minutes: 720, label: "12 hours" },
  { minutes: 1440, label: "24 hours" },
  { minutes: 10080, label: "7 days" },
  { minutes: 43200, label: "30 days" },
];

export function SessionTimeoutSection() {
  const { notify } = useToast();
  const [minutes, setMinutes] = useState<number>(720);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .get<{ session_timeout_minutes: number }>("/security/session-timeout")
      .then((res) => setMinutes(res.session_timeout_minutes))
      .finally(() => setLoaded(true));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await api.put("/security/session-timeout", { session_timeout_minutes: minutes });
      notify("Session timeout updated");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to update session timeout", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session timeout</CardTitle>
        <CardDescription>
          How long you can stay signed in without activity before a session expires.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex max-w-xs items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="session-timeout">Idle timeout</Label>
            <Select
              id="session-timeout"
              value={minutes}
              disabled={!loaded}
              onChange={(e) => setMinutes(Number(e.target.value))}
            >
              {TIMEOUT_OPTIONS.map((opt) => (
                <option key={opt.minutes} value={opt.minutes}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          <Button size="sm" onClick={handleSave} loading={saving} disabled={!loaded}>
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
