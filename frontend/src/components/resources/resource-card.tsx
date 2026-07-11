import { Link } from "react-router-dom";
import { Copy, FileText, KeyRound, StickyNote } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RESOURCE_COLORS, defaultResourceIcon, labelForType } from "@/lib/icons";
import { IconPreview } from "@/components/common/icon-preview";
import type { Resource } from "@/types";

interface ResourceCardProps {
  resource: Resource;
  onDuplicate?: (resource: Resource) => void;
}

export function ResourceCard({ resource, onDuplicate }: ResourceCardProps) {
  const color = RESOURCE_COLORS[resource.type] ?? "#8B949E";
  const tags = resource.tags
    ? resource.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <Card className="group flex h-full flex-col gap-3 p-4 transition-all duration-150 hover:border-brass/40 hover:shadow-elevated">
      <div className="flex items-start justify-between gap-2">
        <Link to={`/resources/${resource.id}`} className="flex min-w-0 flex-1 items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
            style={{ backgroundColor: `${color}1A`, color }}
          >
            <IconPreview icon={resource.icon} fallback={defaultResourceIcon(resource.type)} className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-ink transition-colors group-hover:text-brass">
              {resource.name}
            </h3>
            <p className="truncate text-xs text-ink-faint">
              {labelForType(resource.type)}
              {resource.hostname ? ` · ${resource.hostname}` : ""}
            </p>
          </div>
        </Link>
        {onDuplicate && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onDuplicate(resource)}
            aria-label={`Duplicate ${resource.name}`}
            title="Duplicate resource"
            className="shrink-0"
          >
            <Copy className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Duplicate</span>
          </Button>
        )}
      </div>

      <Link to={`/resources/${resource.id}`} className="flex flex-1 flex-col gap-3">
        {resource.description && (
          <p className="line-clamp-2 text-xs text-ink-muted">{resource.description}</p>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border bg-surface-active px-2 py-0.5 text-[10px] text-ink-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center gap-4 border-t border-border pt-3 text-xs text-ink-faint">
          <span className="flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5" />
            {resource.credential_count}
          </span>
          <span className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {resource.file_count}
          </span>
          <span className="flex items-center gap-1.5">
            <StickyNote className="h-3.5 w-3.5" />
            {resource.note_count}
          </span>
        </div>
      </Link>
    </Card>
  );
}
