import { BackupExportSection } from "@/components/settings/backup-export-section";
import { BackupRestoreSection } from "@/components/settings/backup-restore-section";

export function BackupSettingsPage() {
  return (
    <div className="space-y-4">
      <BackupExportSection />
      <BackupRestoreSection />
    </div>
  );
}
