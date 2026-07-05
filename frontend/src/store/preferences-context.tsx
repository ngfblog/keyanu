import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import { hexToRgbTriplet, lightenHex } from "@/lib/color";
import { useAuth } from "@/store/auth-context";
import type { Preferences } from "@/types";

const DEFAULT_PREFERENCES: Preferences = {
  display_name: null,
  time_format: "24h",
  accent_color: "#D4A72C",
  compact_mode: false,
  animations_enabled: true,
};

interface PreferencesContextValue {
  preferences: Preferences;
  isLoading: boolean;
  update: (patch: Partial<Preferences>) => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

function applyToDocument(prefs: Preferences) {
  const root = document.documentElement;
  root.style.setProperty("--accent", hexToRgbTriplet(prefs.accent_color));
  root.style.setProperty("--accent-hover", hexToRgbTriplet(lightenHex(prefs.accent_color)));
  root.setAttribute("data-compact", String(prefs.compact_mode));
  root.setAttribute("data-animations", String(prefs.animations_enabled));
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      applyToDocument(DEFAULT_PREFERENCES);
      setIsLoading(false);
      return;
    }
    api
      .get<Preferences>("/settings/preferences")
      .then((prefs) => {
        setPreferences(prefs);
        applyToDocument(prefs);
      })
      .catch(() => applyToDocument(DEFAULT_PREFERENCES))
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  const update = useCallback(async (patch: Partial<Preferences>) => {
    const updated = await api.put<Preferences>("/settings/preferences", patch);
    setPreferences(updated);
    applyToDocument(updated);
  }, []);

  const value = useMemo(() => ({ preferences, isLoading, update }), [preferences, isLoading, update]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}
