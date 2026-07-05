import { useEffect, useState } from "react";
import { Copy, Download, KeyRound, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { PasswordConfirmDialog } from "@/components/settings/password-confirm-dialog";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/common/toast";
import { useAuth } from "@/store/auth-context";
import { formatDateTime } from "@/lib/datetime";
import { usePreferences } from "@/store/preferences-context";
import type { RecoveryCodesResponse, RecoveryCodesStatus } from "@/types";

export function RecoveryCodesSection() {
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const { notify } = useToast();
  const [status, setStatus] = useState<RecoveryCodesStatus | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [codes, setCodes] = useState<RecoveryCodesResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const loadStatus = () => {
    api
      .get<RecoveryCodesStatus>("/security/recovery-codes/status")
      .then(setStatus)
      .catch(() => undefined);
  };

  useEffect(() => {
    if (user?.totp_enabled) loadStatus();
  }, [user?.totp_enabled]);

  async function handleGenerate(currentPassword: string) {
    const result = await api.post<RecoveryCodesResponse>("/security/recovery-codes/generate", {
      current_password: currentPassword,
    });
    setCodes(result);
    loadStatus();
  }

  async function copyCodes() {
    if (!codes) return;
    await navigator.clipboard.writeText(codes.codes.join("\n"));
    setCopied(true);
    notify("Copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadCodes() {
    if (!codes) return;
    const blob = new Blob([codes.codes.join("\n") + "\n"], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "keyanu-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!user?.totp_enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recovery codes</CardTitle>
          <CardDescription>
            Enable two-factor authentication first to generate one-time recovery codes.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Recovery codes</CardTitle>
          <CardDescription>
            Use these to sign in if you lose access to your authenticator app. Each code works once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {status && status.generated_at ? (
            <p className="text-xs text-ink-muted">
              {status.remaining} of 10 codes remaining · generated{" "}
              {formatDateTime(status.generated_at, preferences.time_format)}
            </p>
          ) : (
            <p className="text-xs text-ink-muted">No recovery codes generated yet.</p>
          )}
          <Button size="sm" variant="secondary" onClick={() => setConfirmOpen(true)}>
            <KeyRound className="h-3.5 w-3.5" />
            {status?.generated_at ? "Regenerate codes" : "Generate codes"}
          </Button>
        </CardContent>
      </Card>

      <PasswordConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Generate recovery codes?"
        description="This replaces any existing codes. Codes already saved elsewhere will stop working."
        confirmLabel="Generate"
        onConfirm={handleGenerate}
      />

      <Dialog open={!!codes} onClose={() => setCodes(null)} className="max-w-sm">
        <DialogHeader
          title="Your recovery codes"
          description="Save these somewhere safe. They won't be shown again."
          onClose={() => setCodes(null)}
        />
        <DialogBody>
          <div className="grid grid-cols-1 gap-1.5 rounded-md border border-border bg-base/40 p-3 font-mono text-sm text-ink">
            {codes?.codes.map((c) => (
              <div key={c}>{c}</div>
            ))}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={downloadCodes}>
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
          <Button size="sm" onClick={copyCodes}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            Copy all
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
