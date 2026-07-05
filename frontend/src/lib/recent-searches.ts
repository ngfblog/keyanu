const KEY = "keyanu_recent_searches";
const MAX_RECENT = 5;

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): void {
  const trimmed = query.trim();
  if (!trimmed) return;
  const existing = getRecentSearches().filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
  const updated = [trimmed, ...existing].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable (private browsing, quota) -- fail silently
  }
}

export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
