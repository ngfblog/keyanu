import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { WorkspaceDialog } from "@/components/layout/workspace-dialog";
import { CommandPalette } from "@/components/search/command-palette";
import { api } from "@/lib/api";
import type { Workspace } from "@/types";

function breadcrumbForPath(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  if (pathname.startsWith("/workspaces/")) return "Workspace";
  if (pathname.startsWith("/resources/")) return "Resource";
  return "Keyanu";
}

export function AppShell() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const refreshWorkspaces = useCallback(async () => {
    const data = await api.get<Workspace[]>("/workspaces");
    setWorkspaces(data);
    setLoaded(true);
  }, []);

  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const location = useLocation();
  const breadcrumbLabel = breadcrumbForPath(location.pathname);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-base">
      <div className="hidden lg:block">
        <Sidebar workspaces={workspaces} onCreateWorkspace={() => setWorkspaceDialogOpen(true)} />
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="fixed inset-0 bg-black/70" onClick={() => setMobileNavOpen(false)} />
          <div className="relative z-10 h-full animate-fade-in">
            <Sidebar
              workspaces={workspaces}
              onCreateWorkspace={() => {
                setMobileNavOpen(false);
                setWorkspaceDialogOpen(true);
              }}
              mobile
              onNavigate={() => setMobileNavOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          breadcrumb={breadcrumbLabel}
          onMenuClick={() => setMobileNavOpen(true)}
          onSearchClick={() => setSearchOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          {loaded && <Outlet context={{ workspaces, refreshWorkspaces }} />}
        </main>
      </div>

      <WorkspaceDialog
        open={workspaceDialogOpen}
        onClose={() => setWorkspaceDialogOpen(false)}
        onSaved={() => refreshWorkspaces()}
      />

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
