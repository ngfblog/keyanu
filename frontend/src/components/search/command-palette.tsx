import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { Search, Loader2, Server, KeyRound, FileText, StickyNote, Clock, X, CornerDownLeft } from "lucide-react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { RESOURCE_ICONS, RESOURCE_COLORS, RESOURCE_LABELS, CREDENTIAL_COLORS } from "@/lib/icons";
import { HighlightMatch } from "@/components/search/highlight-match";
import { addRecentSearch, getRecentSearches, clearRecentSearches } from "@/lib/recent-searches";
import type { SearchResults } from "@/types";

const DEBOUNCE_MS = 250;

interface FlatResult {
  key: string;
  type: "resource" | "credential" | "file" | "note";
  icon: LucideIcon;
  color: string;
  title: string;
  subtitle: string;
  url: string;
}

function buildFlatResults(results: SearchResults | null): FlatResult[] {
  if (!results) return [];
  const flat: FlatResult[] = [];

  for (const r of results.resources) {
    flat.push({
      key: `resource-${r.id}`,
      type: "resource",
      icon: RESOURCE_ICONS[r.type] ?? Server,
      color: RESOURCE_COLORS[r.type] ?? "#8B949E",
      title: r.name,
      subtitle: `${RESOURCE_LABELS[r.type]} · ${r.workspace_name}`,
      url: `/resources/${r.id}`,
    });
  }
  for (const c of results.credentials) {
    flat.push({
      key: `credential-${c.id}`,
      type: "credential",
      icon: KeyRound,
      color: CREDENTIAL_COLORS[c.template] ?? "#8B949E",
      title: c.name,
      subtitle: `Credential · ${c.resource_name}`,
      url: `/credentials/${c.id}`,
    });
  }
  for (const f of results.files) {
    flat.push({
      key: `file-${f.id}`,
      type: "file",
      icon: FileText,
      color: "#8B949E",
      title: f.filename,
      subtitle: `File · ${f.resource_name}`,
      url: `/resources/${f.resource_id}?tab=files&file=${f.id}`,
    });
  }
  for (const n of results.notes) {
    flat.push({
      key: `note-${n.id}`,
      type: "note",
      icon: StickyNote,
      color: "#8B949E",
      title: n.title,
      subtitle: `Note · ${n.resource_name}`,
      url: `/resources/${n.resource_id}?tab=notes&note=${n.id}`,
    });
  }
  return flat;
}

const GROUP_LABELS: Record<FlatResult["type"], string> = {
  resource: "Systems",
  credential: "Credentials",
  file: "Files",
  note: "Notes",
};

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flatResults = useMemo(() => buildFlatResults(results), [results]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults(null);
      setSelectedIndex(0);
      setRecent(getRecentSearches());
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get<SearchResults>(`/search?q=${encodeURIComponent(q.trim())}`);
      setResults(data);
      setSelectedIndex(0);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search: typing feels instant (controlled input updates
  // immediately) while the network request waits for a pause in typing.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => runSearch(query), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  const openResult = useCallback(
    (result: FlatResult) => {
      addRecentSearch(query);
      onClose();
      navigate(result.url);
    },
    [query, onClose, navigate]
  );

  function handleRecentClick(term: string) {
    setQuery(term);
    runSearch(term);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (flatResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = flatResults[selectedIndex];
      if (target) openResult(target);
    }
  }

  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`);
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  let runningIndex = -1;
  const groups: { type: FlatResult["type"]; items: FlatResult[] }[] = (
    ["resource", "credential", "file", "note"] as const
  )
    .map((type) => ({ type, items: flatResults.filter((r) => r.type === type) }))
    .filter((g) => g.items.length > 0);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 pt-[10vh]">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-lg border border-border bg-surface shadow-elevated animate-scale-in"
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-ink-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search systems, credentials, files, notes..."
            className="w-full min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
          />
          {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ink-faint" />}
          {query && !loading && (
            <button
              onClick={() => setQuery("")}
              className="shrink-0 rounded p-0.5 text-ink-faint hover:text-ink"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden shrink-0 rounded border border-border bg-surface-active px-1.5 py-0.5 text-[10px] text-ink-faint sm:inline">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
          {!query.trim() ? (
            <div className="p-2">
              {recent.length > 0 ? (
                <>
                  <div className="flex items-center justify-between px-2 pb-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                      Recent searches
                    </span>
                    <button
                      onClick={() => {
                        clearRecentSearches();
                        setRecent([]);
                      }}
                      className="text-[11px] text-ink-faint hover:text-ink"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {recent.map((term) => (
                      <button
                        key={term}
                        onClick={() => handleRecentClick(term)}
                        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-ink-muted hover:bg-surface-hover hover:text-ink"
                      >
                        <Clock className="h-3.5 w-3.5 text-ink-faint" />
                        {term}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="px-2 py-6 text-center text-sm text-ink-faint">
                  Start typing to search across everything in Keyanu.
                </p>
              )}
            </div>
          ) : loading && !results ? (
            <div className="space-y-1.5 p-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-11 animate-pulse rounded-md bg-surface-active" />
              ))}
            </div>
          ) : flatResults.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-ink-faint">No results for "{query}"</p>
          ) : (
            groups.map((group) => (
              <div key={group.type} className="mb-1 last:mb-0">
                <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  {GROUP_LABELS[group.type]}
                </div>
                {group.items.map((item) => {
                  runningIndex += 1;
                  const idx = runningIndex;
                  const Icon = item.icon;
                  const active = idx === selectedIndex;
                  return (
                    <button
                      key={item.key}
                      data-index={idx}
                      onClick={() => openResult(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                        active ? "bg-surface-active text-ink" : "text-ink-muted hover:bg-surface-hover"
                      )}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                        style={{ backgroundColor: `${item.color}1A`, color: item.color }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate">
                          <HighlightMatch text={item.title} query={query} />
                        </p>
                        <p className="truncate text-xs text-ink-faint">{item.subtitle}</p>
                      </div>
                      {active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-ink-faint" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-[11px] text-ink-faint">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-surface-active px-1 py-0.5">↑</kbd>
            <kbd className="rounded border border-border bg-surface-active px-1 py-0.5">↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-surface-active px-1 py-0.5">Enter</kbd>
            Open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-surface-active px-1 py-0.5">Esc</kbd>
            Close
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
