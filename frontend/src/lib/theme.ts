export type ThemeSetting = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

const CACHE_KEY = "keyanu_theme_cache";

function systemPrefersDarkSupported(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

function systemPrefersDark(): boolean {
  if (!systemPrefersDarkSupported()) return true; // browsers without matchMedia: fall back to dark
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Resolves a theme setting ("dark" | "light" | "system") to an actual
 * theme to render. "system" falls back to dark if the browser can't tell
 * us the OS preference at all (requirement: default to Dark when System
 * isn't supported). */
export function resolveTheme(setting: ThemeSetting): ResolvedTheme {
  if (setting === "dark") return "dark";
  if (setting === "light") return "light";
  // setting === "system"
  return systemPrefersDark() ? "dark" : "light";
}

export function applyResolvedTheme(resolved: ResolvedTheme): void {
  document.documentElement.setAttribute("data-theme", resolved);
}

/** Cached purely so the very first paint (before any API round-trip, or
 * for a signed-out visitor on the login page) can reflect the last known
 * choice instead of flashing an unstyled/wrong theme. Not a source of
 * truth -- the server-persisted preference always wins once loaded. */
export function getCachedThemeSetting(): ThemeSetting | null {
  try {
    const value = localStorage.getItem(CACHE_KEY);
    return value === "dark" || value === "light" || value === "system" ? value : null;
  } catch {
    return null;
  }
}

export function setCachedThemeSetting(setting: ThemeSetting): void {
  try {
    localStorage.setItem(CACHE_KEY, setting);
  } catch {
    // localStorage unavailable (private browsing, quota) -- fail silently,
    // the app still works, it just won't remember across a hard refresh
    // until the server preference loads again.
  }
}

export function subscribeToSystemThemeChange(onChange: () => void): () => void {
  if (!systemPrefersDarkSupported()) return () => undefined;
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  // Safari < 14 only supports addListener/removeListener.
  if (mql.addEventListener) {
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }
  mql.addListener(onChange);
  return () => mql.removeListener(onChange);
}
