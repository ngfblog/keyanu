import { useState, type FormEvent } from "react";
import { Plus, StickyNote, Trash2, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/common/toast";
import type { Note } from "@/types";

function NoteEditDialog({
  open,
  onClose,
  onSaved,
  resourceId,
  note,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  resourceId: string;
  note?: Note | null;
}) {
  const { notify } = useToast();
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (note) {
        await api.put(`/notes/${note.id}`, { title, content });
        notify("Note updated");
      } else {
        await api.post(`/resources/${resourceId}/notes`, { title, content });
        notify("Note added");
      }
      onSaved();
      onClose();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to save note", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <DialogHeader title={note ? "Edit note" : "New note"} onClose={onClose} />
        <DialogBody className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="note-title">Title</Label>
            <Input
              id="note-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Firmware upgrade checklist"
              required
              maxLength={255}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note-content">Content</Label>
            <Textarea
              id="note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              placeholder="Anything worth remembering about this resource..."
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Save note
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export function NotesTab({
  resourceId,
  notes,
  onChanged,
}: {
  resourceId: string;
  notes: Note[];
  onChanged: () => void;
}) {
  const { notify } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditingNote(null);
    setDialogOpen(true);
  }

  function openEdit(note: Note) {
    setEditingNote(note);
    setDialogOpen(true);
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/notes/${pendingDelete.id}`);
      notify("Note deleted");
      onChanged();
      setPendingDelete(null);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to delete note", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New note
        </Button>
      </div>

      {notes.length === 0 ? (
        <EmptyState icon={<StickyNote className="h-5 w-5" />} title="No notes yet" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {notes.map((note) => (
            <Card key={note.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold text-ink">{note.title}</h4>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => openEdit(note)}
                    className="rounded p-1 text-ink-faint hover:bg-surface-hover hover:text-ink"
                    aria-label="Edit note"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setPendingDelete(note)}
                    className="rounded p-1 text-ink-faint hover:bg-surface-hover hover:text-danger"
                    aria-label="Delete note"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {note.content && (
                <p className="whitespace-pre-wrap text-xs text-ink-muted line-clamp-6">{note.content}</p>
              )}
            </Card>
          ))}
        </div>
      )}

      <NoteEditDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={onChanged}
        resourceId={resourceId}
        note={editingNote}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this note?"
        description={`"${pendingDelete?.title}" will be permanently deleted.`}
        confirmLabel="Delete note"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
