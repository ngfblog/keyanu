import { KeyRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAboutInfo } from "@/hooks/use-about-info";

export function AboutSettingsPage() {
  const about = useAboutInfo();

  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-brass/30 bg-brass-subtle">
          <KeyRound className="h-6 w-6 text-brass" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">{about?.app_name ?? "Keyanu"}</p>
          <p className="text-xs text-ink-muted">
            Version {about?.version ?? "—"} · {about?.license ?? "MIT"} License · {about?.environment ?? "—"} mode
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
