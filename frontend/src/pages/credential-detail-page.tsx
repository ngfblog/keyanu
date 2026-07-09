import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Pencil, Trash2, LayoutList, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { CredentialFieldsPanel } from "@/components/credentials/credential-fields-panel";
import { CredentialRenameDialog } from "@/components/credentials/credential-rename-dialog";
import { CredentialEditDialog } from "@/components/credentials/credential-edit-dialog";
import { AuditTab } from "@/components/resources/audit-tab";
import { getCredentialIcon, CREDENTIAL_COLORS } from "@/lib/icons";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/common/toast";
import { formatDate } from "@/lib/datetime";
import type { AuditLogEntry, Credential, CredentialDetail as CredentialDetailType, TemplateDefinition } from "@/types";

type TabId = "overview" | "history";

export function CredentialDetailPage() {
  const { credentialId } = useParams<{ credentialId: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();

  const [credential, setCredential] = useState<CredentialDetailType | null>(null);
  const [definition, setDefinition] = useState<TemplateDefinition | undefined>(undefined);
  const [audit, setAudit] = useState<AuditLogEntry[]>([]);
  const [tab, setTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadAll = useCallback(async () => {
    if (!credentialId) return;
    setLoading(true);
    try {
      const [cred, templates, auditEntries] = await Promise.all([
        api.get<CredentialDetailType>(`/credentials/${credentialId}`),
        api.get<TemplateDefinition[]>("/meta/credential-templates"),
        api.get<AuditLogEntry[]>(`/credentials/${credentialId}/audit`),
      ]);
      setCredential(cred);
      setDefinition(templates.find((t) => t.id === cred.template));
      setAudit(auditEntries);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to load credential", "error");
    } finally {
      setLoading(false);
    }
  }, [credentialId, notify]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleDelete() {
    if (!credential) return;
    setDeleting(true);
    try {
      await api.delete(`/credentials/${credential.id}`);
      notify("Credential deleted");
      navigate(`/resources/${credential.resource_id}`);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to delete credential", "error");
      setDeleting(false);
    }
  }

  if (loading || !credential) {
    return (
      <div className="page-pad mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="h-8 w-64 animate-pulse rounded bg-surface-active" />
        <div className="mt-6 h-40 animate-pulse rounded-lg bg-surface" />
      </div>
    );
  }

  const Icon = getCredentialIcon(definition?.icon ?? "lock");
  const color = CREDENTIAL_COLORS[credential.template] ?? "#8B949E";

  return (
    <div className="page-pad mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-ink-faint">
        <Link to={`/workspaces/${credential.workspace_id}`} className="hover:text-ink">
          {credential.workspace_name}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link to={`/resources/${credential.resource_id}`} className="hover:text-ink">
          {credential.resource_name}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-ink-muted">{credential.name}</span>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}1A`, color }}
          >
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-ink">{credential.name}</h1>
            <p className="text-sm text-ink-muted">{definition?.label ?? credential.template}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setRenameOpen(true)}>
            <Pencil className="h-3.5 w-3.5" />
            Rename
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
          <TabsTrigger value="history">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <div className="pt-5">
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <CredentialFieldsPanel key={credential.updated_at} credentialId={credential.id} definition={definition} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-2 pt-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Metadata</div>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-muted">Template</dt>
                    <dd className="text-ink">{definition?.label ?? credential.template}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-muted">System</dt>
                    <dd className="text-ink">
                      <Link to={`/resources/${credential.resource_id}`} className="hover:text-brass">
                        {credential.resource_name}
                      </Link>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-muted">Added</dt>
                    <dd className="text-ink">{formatDate(credential.created_at)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-muted">Updated</dt>
                    <dd className="text-ink">{formatDate(credential.updated_at)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <AuditTab entries={audit} />
          </TabsContent>
        </div>
      </Tabs>

      <CredentialEditDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        credential={credential}
        template={definition}
        onSaved={(updated) => {
          setCredential({ ...credential, ...updated });
          loadAll();
        }}
      />

      <CredentialRenameDialog
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        credential={credential}
        onRenamed={(updated: Credential) => setCredential({ ...credential, ...updated })}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this credential?"
        description={`"${credential.name}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete credential"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}
