import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, clearToken, getToken, setToken } from "@/lib/api";
import type { User } from "@/types";

interface LoginResult {
  requiresTotp: boolean;
  loginTicket?: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  loginWithTotp: (loginTicket: string, code: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

interface LoginResponse {
  access_token: string | null;
  token_type: string;
  must_change_password: boolean;
  requires_totp: boolean;
  login_ticket: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const me = await api.get<User>("/auth/me");
    setUser(me);
    return me;
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    loadUser()
      .catch(() => clearToken())
      .finally(() => setIsLoading(false));
  }, [loadUser]);

  const login = useCallback(
    async (username: string, password: string): Promise<LoginResult> => {
      const response = await api.post<LoginResponse>("/auth/login", { username, password });
      if (response.requires_totp && response.login_ticket) {
        return { requiresTotp: true, loginTicket: response.login_ticket };
      }
      if (response.access_token) {
        setToken(response.access_token);
        await loadUser();
      }
      return { requiresTotp: false };
    },
    [loadUser]
  );

  const loginWithTotp = useCallback(
    async (loginTicket: string, code: string) => {
      const response = await api.post<LoginResponse>("/auth/login/totp", { login_ticket: loginTicket, code });
      if (response.access_token) {
        setToken(response.access_token);
        await loadUser();
      }
    },
    [loadUser]
  );

  const logout = useCallback(() => {
    api.post("/auth/logout").catch(() => undefined).finally(() => {
      clearToken();
      setUser(null);
      window.location.href = "/login";
    });
  }, []);

  const refreshUser = useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  const value = useMemo(
    () => ({ user, isLoading, isAuthenticated: !!user, login, loginWithTotp, logout, refreshUser }),
    [user, isLoading, login, loginWithTotp, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
