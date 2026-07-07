import { ICON_OPTIONS, getIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

export function IconPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {ICON_OPTIONS.map((key) => {
        const Icon = getIcon(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface transition-colors hover:border-brass/60 hover:text-brass",
              value === key && "border-brass bg-brass-subtle text-brass"
            )}
            aria-label={`Choose ${key} icon`}
            title={key}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
