import { useEffect, useState, type FormEvent } from "react";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/common/toast";
import type { Credential } from "@/types";

export function CredentialRenameDialog({
  open,
  onClose,
  credential,
  onRenamed,
}: {
  open: boolean;
  onClose: () => void;
  credential: Credential;
  onRenamed: (credential: Credential) => void;
}) {
  const { notify } = useToast();
  const [name, setName] = useState(credential.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(credential.name);
      setError(null);
    }
  }, [open, credential.name]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await api.put<Credential>(`/credentials/${credential.id}`, { name });
      notify("Credential renamed");
      onRenamed(updated);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to rename credential");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-sm">
      <form onSubmit={handleSubmit}>
        <DialogHeader title="Rename credential" onClose={onClose} />
        <DialogBody>
          <div className="space-y-1.5">
            <Label htmlFor="credential-name">Name</Label>
            <Input
              id="credential-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={128}
            />
          </div>
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Save
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
