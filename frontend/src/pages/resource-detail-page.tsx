import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ChevronRight,
  Pencil,
  Trash2,
  Plus,
  KeyRound,
  FileText,
  StickyNote,
  History,
  LayoutList,
  Globe,
  Tag,
  MoveRight,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ResourceDialog } from "@/components/resources/resource-dialog";
import { ResourceMoveDialog } from "@/components/resources/resource-move-dialog";
import { ResourceDuplicateDialog } from "@/components/resources/resource-duplicate-dialog";
import { CredentialCard } from "@/components/credentials/credential-card";
import { CredentialCreateDialog } from "@/components/credentials/credential-create-dialog";
import { FilesTab } from "@/components/resources/files-tab";
import { NotesTab } from "@/components/resources/notes-tab";
import { AuditTab } from "@/components/resources/audit-tab";
import { RESOURCE_COLORS, defaultResourceIcon, labelForType } from "@/lib/icons";
import { IconPreview } from "@/components/common/icon-preview";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/common/toast";
import type {
  AuditLogEntry,
  Credential,
  Note,
  ResourceDetail as ResourceDetailType,
  ResourceFileMeta,
  TemplateDefinition,
} from "@/types";

type TabId = "overview" | "credentials" | "files" | "notes" | "audit";

export function ResourceDetailPage() {
  const { resourceId } = useParams<{ resourceId: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [searchParams] = useSearchParams();

  const highlightFileId = searchParams.get("file");
  const highlightNoteId = searchParams.get("note");

  const [resource, setResource] = useState<ResourceDetailType | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [files, setFiles] = useState<ResourceFileMeta[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [audit, setAudit] = useState<AuditLogEntry[]>([]);
  const [templates, setTemplates] = useState<TemplateDefinition[]>([]);
  const [tab, setTab] = useState<TabId>(
    (searchParams.get("tab") as TabId) &&
      ["overview", "credentials", "files", "notes", "audit"].includes(searchParams.get("tab") as string)
      ? (searchParams.get("tab") as TabId)
      : "overview"
  );
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [createCredOpen, setCreateCredOpen] = useState(false);

  const loadAll = useCallback(async () => {
    if (!resourceId) return;
    setLoading(true);
    const [res, creds, fls, nts, audits, tmpls] = await Promise.all([
      api.get<ResourceDetailType>(`/resources/${resourceId}`),
      api.get<Credential[]>(`/resources/${resourceId}/credentials`),
      api.get<ResourceFileMeta[]>(`/resources/${resourceId}/files`),
      api.get<Note[]>(`/resources/${resourceId}/notes`),
      api.get<AuditLogEntry[]>(`/resources/${resourceId}/audit`),
      api.get<TemplateDefinition[]>("/meta/credential-templates"),
    ]);
    setResource(res);
    setCredentials(creds);
    setFiles(fls);
    setNotes(nts);
    setAudit(audits);
    setTemplates(tmpls);
    setLoading(false);
  }, [resourceId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const refreshFiles = useCallback(async () => {
    if (!resourceId) return;
    const [fls, audits, res] = await Promise.all([
      api.get<ResourceFileMeta[]>(`/resources/${resourceId}/files`),
      api.get<AuditLogEntry[]>(`/resources/${resourceId}/audit`),
      api.get<ResourceDetailType>(`/resources/${resourceId}`),
    ]);
    setFiles(fls);
    setAudit(audits);
    setResource(res);
  }, [resourceId]);

  const refreshNotes = useCallback(async () => {
    if (!resourceId) return;
    const [nts, audits, res] = await Promise.all([
      api.get<Note[]>(`/resources/${resourceId}/notes`),
      api.get<AuditLogEntry[]>(`/resources/${resourceId}/audit`),
      api.get<ResourceDetailType>(`/resources/${resourceId}`),
    ]);
    setNotes(nts);
    setAudit(audits);
    setResource(res);
  }, [resourceId]);

  async function handleDeleteResource() {
    if (!resource) return;
    setDeleting(true);
    try {
      await api.delete(`/resources/${resource.id}`);
      notify("Resource deleted");
      navigate(`/workspaces/${resource.workspace_id}`);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to delete resource", "error");
    } finally {
      setDeleting(false);
    }
  }

  if (loading || !resource) {
    return (
      <div className="page-pad mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="h-8 w-64 animate-pulse rounded bg-surface-active" />
        <div className="mt-6 h-40 animate-pulse rounded-lg bg-surface" />
      </div>
    );
  }

  const color = RESOURCE_COLORS[resource.type];
  const tags = resource.tags ? resource.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

  return (
    <div className="page-pad mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center gap-1.5 text-xs text-ink-faint">
        <Link to={`/workspaces/${resource.workspace_id}`} className="hover:text-ink">
          {resource.workspace_name}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-ink-muted">{resource.name}</span>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}1A`, color }}
          >
            <IconPreview icon={resource.icon} fallback={defaultResourceIcon(resource.type)} className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-ink">{resource.name}</h1>
            <p className="text-sm text-ink-muted">
              {labelForType(resource.type)}
              {resource.hostname ? ` · ${resource.hostname}` : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setDuplicateOpen(true)}>
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setMoveOpen(true)}>
            <MoveRight className="h-3.5 w-3.5" />
            Move to Workspace
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      <Tabs value={tab} onChange={(v) => setTab(v as TabId)} className="mb-6">
        <TabsList>
          <TabsTrigger value="overview">
            <LayoutList className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="credentials" count={credentials.length}>
            <KeyRound className="h-4 w-4" />
            Credentials
          </TabsTrigger>
          <TabsTrigger value="files" count={files.length}>
            <FileText className="h-4 w-4" />
            Files
          </TabsTrigger>
          <TabsTrigger value="notes" count={notes.length}>
            <StickyNote className="h-4 w-4" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History className="h-4 w-4" />
            Audit &amp; History
          </TabsTrigger>
        </TabsList>

        <div className="pt-5">
          <TabsContent value="overview">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card>
                <CardContent className="space-y-3 pt-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">
                    <Globe className="h-3.5 w-3.5" />
                    Details
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-muted">Type</dt>
                      <dd className="text-ink">{labelForType(resource.type)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-muted">Hostname</dt>
                      <dd className="font-mono text-ink">{resource.hostname || "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-muted">Added</dt>
                      <dd className="text-ink">{new Date(resource.created_at).toLocaleDateString()}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-muted">Updated</dt>
                      <dd className="text-ink">{new Date(resource.updated_at).toLocaleDateString()}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-3 pt-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">
                    <Tag className="h-3.5 w-3.5" />
                    Description &amp; tags
                  </div>
                  <p className="text-sm text-ink-muted">
                    {resource.description || "No description provided yet."}
                  </p>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-border bg-surface-active px-2 py-0.5 text-[11px] text-ink-muted"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="credentials">
            <div className="mb-4 flex justify-end">
              <Button size="sm" onClick={() => setCreateCredOpen(true)}>
                <Plus className="h-4 w-4" />
                Add credential
              </Button>
            </div>
            {credentials.length === 0 ? (
              <EmptyState
                icon={<KeyRound className="h-5 w-5" />}
                title="No credentials stored yet"
                description="Add an SSH key, password, API token, certificate, or any of the other supported templates."
                action={
                  <Button size="sm" onClick={() => setCreateCredOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Add credential
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {credentials.map((cred) => (
                  <CredentialCard
                    key={cred.id}
                    credential={cred}
                    definition={templates.find((t) => t.id === cred.template)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="files">
            <FilesTab
              resourceId={resource.id}
              files={files}
              onChanged={refreshFiles}
              highlightId={highlightFileId}
            />
          </TabsContent>

          <TabsContent value="notes">
            <NotesTab
              resourceId={resource.id}
              notes={notes}
              onChanged={refreshNotes}
              highlightId={highlightNoteId}
            />
          </TabsContent>

          <TabsContent value="audit">
            <AuditTab entries={audit} />
          </TabsContent>
        </div>
      </Tabs>

      <ResourceDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={(updated) => setResource({ ...resource, ...updated })}
        workspaceId={resource.workspace_id}
        resource={resource}
      />

      <ResourceDuplicateDialog
        open={duplicateOpen}
        resource={resource}
        onClose={() => setDuplicateOpen(false)}
        onDuplicated={(duplicated) => {
          notify("Resource duplicated successfully.");
          navigate(`/resources/${duplicated.id}`);
        }}
      />

      <ResourceMoveDialog
        open={moveOpen}
        resource={resource}
        onClose={() => setMoveOpen(false)}
        onMoved={(moved) => {
          setResource({ ...resource, ...moved, workspace_name: null });
          notify("Resource moved successfully.");
          navigate(`/workspaces/${moved.workspace_id}`);
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this resource?"
        description={`"${resource.name}" and all of its credentials, files, and notes will be permanently deleted.`}
        confirmLabel="Delete resource"
        loading={deleting}
        onConfirm={handleDeleteResource}
        onClose={() => setDeleteOpen(false)}
      />

      <CredentialCreateDialog
        open={createCredOpen}
        onClose={() => setCreateCredOpen(false)}
        onCreated={(created) => navigate(`/credentials/${created.id}`)}
        resourceId={resource.id}
        templates={templates}
      />
    </div>
  );
}
