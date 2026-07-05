import { useState, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/common/toast";
import { useAuth } from "@/store/auth-context";

export function ChangeUsernameCard() {
  const { user, refreshUser } = useAuth();
  const { notify } = useToast();
  const [newUsername, setNewUsername] = useState(user?.username ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/security/change-username", {
        current_password: currentPassword,
        new_username: newUsername,
      });
      await refreshUser();
      setCurrentPassword("");
      notify("Username updated");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update username");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Username</CardTitle>
        <CardDescription>Used to sign in to Keyanu.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="max-w-sm space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-username">New username</Label>
            <Input
              id="new-username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              required
              maxLength={64}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="username-current-password">Current password</Label>
            <Input
              id="username-current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button
            type="submit"
            size="sm"
            loading={saving}
            disabled={newUsername === user?.username || !newUsername}
          >
            Update username
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ChangePasswordCard() {
  const { notify } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/security/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      notify("Password changed");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to change password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>Choose a strong, unique password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="max-w-sm space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="password-current">Current password</Label>
            <Input
              id="password-current"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password-new">New password</Label>
            <Input
              id="password-new"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password-confirm">Confirm new password</Label>
            <Input
              id="password-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button type="submit" size="sm" loading={saving}>
            Change password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
