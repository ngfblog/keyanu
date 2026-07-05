import { useCallback, useEffect, useState } from "react";
import { Monitor, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/common/toast";
import { usePreferences } from "@/store/preferences-context";
import { formatDateTime } from "@/lib/datetime";
import { describeUserAgent } from "@/lib/user-agent";
import { useAuth } from "@/store/auth-context";
import type { SessionInfo } from "@/types";

export function SessionsSection() {
  const { notify } = useToast();
  const { preferences } = usePreferences();
  const { logout } = useAuth();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [logoutAllOpen, setLogoutAllOpen] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<SessionInfo[]>("/security/sessions");
      setSessions(data);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to load sessions", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRevoke(session: SessionInfo) {
    setRevokingId(session.id);
    try {
      await api.delete(`/security/sessions/${session.id}`);
      notify("Session signed out");
      if (session.is_current) {
        logout();
        return;
      }
      await load();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to sign out session", "error");
    } finally {
      setRevokingId(null);
    }
  }

  async function handleLogoutEverywhere() {
    setLoggingOutAll(true);
    try {
      await api.post("/security/sessions/logout-everywhere");
      setLogoutAllOpen(false);
      logout();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to sign out other sessions", "error");
      setLoggingOutAll(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active sessions</CardTitle>
              <CardDescription>Devices currently signed in to your account.</CardDescription>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setLogoutAllOpen(true)}>
              <LogOut className="h-3.5 w-3.5" />
              Log out everywhere
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            [...Array(2)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-md bg-surface-active" />
            ))
          ) : sessions.length === 0 ? (
            <p className="text-xs text-ink-muted">No active sessions.</p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-3 rounded-md border border-border bg-base/40 p-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-active text-ink-faint">
                  <Monitor className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-ink">
                      {describeUserAgent(session.user_agent)}
                    </p>
                    {session.is_current && <Badge variant="brass">This device</Badge>}
                  </div>
                  <p className="text-xs text-ink-faint">
                    {session.ip_address ?? "Unknown IP"} · last active{" "}
                    {formatDateTime(session.last_seen_at, preferences.time_format)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  loading={revokingId === session.id}
                  onClick={() => handleRevoke(session)}
                >
                  Sign out
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={logoutAllOpen}
        title="Log out everywhere?"
        description="This immediately signs out every device, including this one. You'll need to sign in again."
        confirmLabel="Log out everywhere"
        loading={loggingOutAll}
        onConfirm={handleLogoutEverywhere}
        onClose={() => setLogoutAllOpen(false)}
      />
    </>
  );
}
