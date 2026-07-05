import { useEffect, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { ShieldCheck, ShieldOff, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PasswordConfirmDialog } from "@/components/settings/password-confirm-dialog";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/common/toast";
import { useAuth } from "@/store/auth-context";
import type { TotpSetupResponse } from "@/types";

export function TotpSection() {
  const { user, refreshUser } = useAuth();
  const { notify } = useToast();
  const [enabled, setEnabled] = useState(user?.totp_enabled ?? false);
  const [setupData, setSetupData] = useState<TotpSetupResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [startingSetup, setStartingSetup] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);

  useEffect(() => {
    setEnabled(user?.totp_enabled ?? false);
  }, [user]);

  useEffect(() => {
    if (setupData?.otpauth_url) {
      QRCode.toDataURL(setupData.otpauth_url, { margin: 1, width: 220 }).then(setQrDataUrl);
    } else {
      setQrDataUrl(null);
    }
  }, [setupData]);

  async function startSetup() {
    setStartingSetup(true);
    setError(null);
    try {
      const data = await api.post<TotpSetupResponse>("/security/totp/setup");
      setSetupData(data);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to start setup", "error");
    } finally {
      setStartingSetup(false);
    }
  }

  function cancelSetup() {
    setSetupData(null);
    setCode("");
    setError(null);
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setError(null);
    try {
      await api.post("/security/totp/enable", { code });
      await refreshUser();
      notify("Two-factor authentication enabled");
      cancelSetup();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Incorrect code");
    } finally {
      setVerifying(false);
    }
  }

  async function handleDisable(currentPassword: string) {
    await api.post("/security/totp/disable", { current_password: currentPassword });
    await refreshUser();
    notify("Two-factor authentication disabled");
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Two-factor authentication</CardTitle>
            <CardDescription>Require a code from an authenticator app at sign-in.</CardDescription>
          </div>
          <Badge variant={enabled ? "success" : "outline"}>
            {enabled ? (
              <>
                <ShieldCheck className="h-3 w-3" /> Enabled
              </>
            ) : (
              <>
                <ShieldOff className="h-3 w-3" /> Disabled
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {enabled ? (
          <Button variant="destructive" size="sm" onClick={() => setDisableDialogOpen(true)}>
            Disable two-factor authentication
          </Button>
        ) : setupData ? (
          <div className="max-w-sm space-y-4">
            <div className="flex justify-center rounded-md border border-border bg-white p-3">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="TOTP QR code" width={200} height={200} />
              ) : (
                <Loader2 className="h-6 w-6 animate-spin text-ink-faint" />
              )}
            </div>
            <div className="space-y-1">
              <Label>Or enter this key manually</Label>
              <p className="break-all rounded-md border border-border bg-base/40 px-3 py-2 font-mono text-xs text-ink">
                {setupData.secret}
              </p>
            </div>
            <form onSubmit={handleVerify} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="totp-verify-code">Enter the 6-digit code to confirm</Label>
                <Input
                  id="totp-verify-code"
                  autoFocus
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  mono
                  required
                />
              </div>
              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" size="sm" loading={verifying}>
                  Confirm and enable
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={cancelSetup}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <Button size="sm" onClick={startSetup} loading={startingSetup}>
            Set up two-factor authentication
          </Button>
        )}
      </CardContent>

      <PasswordConfirmDialog
        open={disableDialogOpen}
        onClose={() => setDisableDialogOpen(false)}
        title="Disable two-factor authentication?"
        description="Your account will only be protected by your password. Any unused recovery codes will be cleared."
        confirmLabel="Disable"
        destructive
        onConfirm={handleDisable}
      />
    </Card>
  );
}
