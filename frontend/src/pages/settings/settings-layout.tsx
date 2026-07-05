import { NavLink, Outlet } from "react-router-dom";
import { SlidersHorizontal, ShieldCheck, DatabaseBackup, Palette, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/settings/general", label: "General", icon: SlidersHorizontal },
  { to: "/settings/security", label: "Security", icon: ShieldCheck },
  { to: "/settings/backup", label: "Backup & Restore", icon: DatabaseBackup },
  { to: "/settings/appearance", label: "Appearance", icon: Palette },
  { to: "/settings/about", label: "About", icon: Info },
];

export function SettingsLayout() {
  return (
    <div className="page-pad mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight text-ink">Settings</h1>
        <p className="mt-0.5 text-sm text-ink-muted">
          Manage your account, appearance, and instance preferences.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav className="flex shrink-0 gap-1 overflow-x-auto lg:w-48 lg:flex-col lg:overflow-visible">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-surface-active text-ink"
                    : "text-ink-muted hover:bg-surface-hover hover:text-ink"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
