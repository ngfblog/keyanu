import { useState, useRef, useEffect, type ReactNode } from "react";
import { Menu, LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import { useAuth } from "@/store/auth-context";
import { cn } from "@/lib/utils";

export function Topbar({
  breadcrumb,
  onMenuClick,
  actions,
}: {
  breadcrumb: ReactNode;
  onMenuClick: () => void;
  actions?: ReactNode;
}) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/60 px-4 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-1.5 text-ink-muted hover:bg-surface-hover hover:text-ink lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 truncate text-sm text-ink-muted">{breadcrumb}</div>
      </div>

      <div className="flex items-center gap-2">
        {actions}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className={cn(
              "flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-ink transition-colors hover:bg-surface-hover",
              menuOpen && "bg-surface-hover"
            )}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brass-subtle text-brass">
              <UserIcon className="h-3 w-3" />
            </span>
            <span className="hidden max-w-[10rem] truncate sm:inline">
              {user?.display_name || user?.username}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-ink-faint" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-20 mt-1.5 w-48 rounded-md border border-border bg-surface p-1 shadow-elevated animate-scale-in">
              <div className="px-2 py-1.5 text-xs text-ink-faint">
                Signed in as <span className="text-ink-muted">{user?.username}</span>
              </div>
              <div className="my-1 h-px bg-border" />
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-ink-muted hover:bg-surface-hover hover:text-danger"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
