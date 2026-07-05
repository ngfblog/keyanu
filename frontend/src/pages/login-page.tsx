import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { KeyRound, Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/store/auth-context";
import { ApiError } from "@/lib/api";

export function LoginPage() {
  const { login, loginWithTotp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState<"credentials" | "totp">("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loginTicket, setLoginTicket] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function goToApp() {
    const from = (location.state as { from?: string } | null)?.from ?? "/";
    navigate(from, { replace: true });
  }

  async function handleCredentialsSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await login(username, password);
      if (result.requiresTotp && result.loginTicket) {
        setLoginTicket(result.loginTicket);
        setStep("totp");
      } else {
        goToApp();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  async function handleTotpSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await loginWithTotp(loginTicket, code);
      goToApp();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-base px-4">
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full opacity-[0.12] blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgb(var(--accent)), transparent)" }}
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-brass/30 bg-brass-subtle shadow-glow">
            {step === "credentials" ? (
              <KeyRound className="h-6 w-6 text-brass" />
            ) : (
              <ShieldCheck className="h-6 w-6 text-brass" />
            )}
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-ink">
            {step === "credentials" ? "Sign in to Keyanu" : "Two-factor verification"}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {step === "credentials"
              ? "Your infrastructure credential manager"
              : "Enter the code from your authenticator app"}
          </p>
        </div>

        {step === "credentials" ? (
          <form
            onSubmit={handleCredentialsSubmit}
            className="space-y-4 rounded-lg border border-border bg-surface p-6 shadow-card"
          >
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoFocus
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>
        ) : (
          <form
            onSubmit={handleTotpSubmit}
            className="space-y-4 rounded-lg border border-border bg-surface p-6 shadow-card"
          >
            <div className="space-y-1.5">
              <Label htmlFor="totp-code">Authentication code</Label>
              <Input
                id="totp-code"
                autoFocus
                inputMode="text"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456 or a recovery code"
                mono
                required
              />
              <p className="text-[11px] text-ink-faint">
                You can also enter one of your recovery codes if you've lost access to your authenticator.
              </p>
            </div>

            {error && (
              <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setStep("credentials");
                setCode("");
                setError(null);
              }}
              className="flex w-full items-center justify-center gap-1.5 text-xs text-ink-faint hover:text-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-ink-faint">
          Self-hosted on your own infrastructure. No data leaves your server.
        </p>
      </div>
    </div>
  );
}
