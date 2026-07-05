import { useState } from "react";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PasswordConfirmDialog } from "@/components/settings/password-confirm-dialog";
import { downloadPost } from "@/lib/api";
import { useToast } from "@/components/common/toast";

export function BackupExportSection() {
  const { notify } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  async function handleExport(currentPassword: string) {
    const { blob, filename } = await downloadPost("/backup/export", { current_password: currentPassword });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    notify("Backup exported");
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Export backup</CardTitle>
          <CardDescription>
            Download a single encrypted <code className="font-mono text-ink">.keyanu</code> file containing
            every workspace, system, credential, file, note, and setting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Download className="h-3.5 w-3.5" />
            Export backup
          </Button>
          <p className="mt-2 text-[11px] text-ink-faint">
            The backup is encrypted with this server's encryption key. It can only be restored on a
            server configured with the same key.
          </p>
        </CardContent>
      </Card>

      <PasswordConfirmDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Export backup?"
        description="Confirm your password to download an encrypted backup of everything in Keyanu."
        confirmLabel="Export"
        onConfirm={handleExport}
      />
    </>
  );
}
