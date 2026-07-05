import { ChangeUsernameCard, ChangePasswordCard } from "@/components/settings/account-section";
import { TotpSection } from "@/components/settings/totp-section";
import { RecoveryCodesSection } from "@/components/settings/recovery-codes-section";
import { SessionsSection } from "@/components/settings/sessions-section";
import { SessionTimeoutSection } from "@/components/settings/session-timeout-section";

export function SecuritySettingsPage() {
  return (
    <div className="space-y-4">
      <ChangeUsernameCard />
      <ChangePasswordCard />
      <TotpSection />
      <RecoveryCodesSection />
      <SessionTimeoutSection />
      <SessionsSection />
    </div>
  );
}
