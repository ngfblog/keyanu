import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import { hexToRgbTriplet, lightenHex } from "@/lib/color";
import {
  applyResolvedTheme,
  getCachedThemeSetting,
  resolveTheme,
  setCachedThemeSetting,
  subscribeToSystemThemeChange,
  type ResolvedTheme,
} from "@/lib/theme";
import { useAuth } from "@/store/auth-context";
import type { Preferences } from "@/types";

const DEFAULT_PREFERENCES: Preferences = {
  display_name: null,
  time_format: "24h",
  theme: "system",
  accent_color: "#D4A72C",
  compact_mode: false,
  animations_enabled: true,
};

interface PreferencesContextValue {
  preferences: Preferences;
  resolvedTheme: ResolvedTheme;
  isLoading: boolean;
  update: (patch: Partial<Preferences>) => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

function applyNonThemeToDocument(prefs: Preferences) {
  const root = document.documentElement;
  root.style.setProperty("--accent", hexToRgbTriplet(prefs.accent_color));
  root.style.setProperty("--accent-hover", hexToRgbTriplet(lightenHex(prefs.accent_color)));
  root.setAttribute("data-compact", String(prefs.compact_mode));
  root.setAttribute("data-animations", String(prefs.animations_enabled));
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(getCachedThemeSetting() ?? "system")
  );
  const [isLoading, setIsLoading] = useState(true);
  const themeSettingRef = useRef<Preferences["theme"]>(getCachedThemeSetting() ?? "system");

  const applyTheme = useCallback((setting: Preferences["theme"]) => {
    themeSettingRef.current = setting;
    const resolved = resolveTheme(setting);
    applyResolvedTheme(resolved);
    setResolvedTheme(resolved);
    setCachedThemeSetting(setting);
  }, []);

  // Re-resolve live if the OS-level preference changes while "System" is
  // selected -- no reload, no re-fetch, just re-apply.
  useEffect(() => {
    return subscribeToSystemThemeChange(() => {
      if (themeSettingRef.current === "system") {
        applyResolvedTheme(resolveTheme("system"));
        setResolvedTheme(resolveTheme("system"));
      }
    });
  }, []);

  useEffect(() => {
    // Apply immediately from cache/system (pre-auth default, or while the
    // real preference is still loading) so there's no flash after the
    // inline bootstrap script in index.html hands off to React.
    applyTheme(getCachedThemeSetting() ?? "system");

    if (!isAuthenticated) {
      applyNonThemeToDocument(DEFAULT_PREFERENCES);
      setIsLoading(false);
      return;
    }
    api
      .get<Preferences>("/settings/preferences")
      .then((prefs) => {
        setPreferences(prefs);
        applyNonThemeToDocument(prefs);
        applyTheme(prefs.theme);
      })
      .catch(() => applyNonThemeToDocument(DEFAULT_PREFERENCES))
      .finally(() => setIsLoading(false));
  }, [isAuthenticated, applyTheme]);

  const update = useCallback(
    async (patch: Partial<Preferences>) => {
      const updated = await api.put<Preferences>("/settings/preferences", patch);
      setPreferences(updated);
      applyNonThemeToDocument(updated);
      if (patch.theme !== undefined) {
        applyTheme(updated.theme);
      }
    },
    [applyTheme]
  );

  const value = useMemo(
    () => ({ preferences, resolvedTheme, isLoading, update }),
    [preferences, resolvedTheme, isLoading, update]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}
