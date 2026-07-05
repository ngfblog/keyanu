import { Card } from "@/components/ui/card";
import { getCredentialIcon, CREDENTIAL_COLORS } from "@/lib/icons";
import type { Credential, TemplateDefinition } from "@/types";

export function CredentialCard({
  credential,
  definition,
  onClick,
}: {
  credential: Credential;
  definition?: TemplateDefinition;
  onClick: () => void;
}) {
  const Icon = getCredentialIcon(definition?.icon ?? "lock");
  const color = CREDENTIAL_COLORS[credential.template] ?? "#8B949E";

  return (
    <button onClick={onClick} className="block w-full text-left">
      <Card
        className="flex items-center gap-3 border-l-2 p-3.5 transition-all duration-150 hover:border-l-brass hover:bg-surface-hover"
        style={{ borderLeftColor: color }}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: `${color}1A`, color }}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{credential.name}</p>
          <p className="truncate text-xs text-ink-faint">
            {definition?.label ?? credential.template}
            {credential.summary ? ` · ${credential.summary}` : ""}
          </p>
        </div>
      </Card>
    </button>
  );
}
