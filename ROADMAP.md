# Roadmap

See [CHANGELOG.md](CHANGELOG.md) for what's already shipped, in detail.

## Sprint 1 — Foundation ✅ complete

- [x] Project structure, single-image Docker packaging, Unraid template
- [x] FastAPI backend shell with auth, workspaces, resources
- [x] React frontend shell with dark theme, sidebar, dashboard
- [x] Login page
- [x] System (resource) list and detail page with tabs
- [x] Credentials tab (all 9 templates, encrypted at rest)
- [x] Files tab (drag & drop upload/download/delete)
- [x] Notes tab
- [x] Audit & History tab

## Sprint 2 — Security, Data Portability, Findability ✅ complete

- [x] Settings shell + General & Appearance preferences
- [x] Security: server-side sessions, forced password change, TOTP,
      recovery codes, active sessions, session timeout
- [x] Backup & Restore (`.keyanu` encrypted export/import, verify-before-
      restore, encryption-key-mismatch detection)
- [x] Credential Page (permanent URL, replacing the view modal)
- [x] Global Search (Ctrl+K), linking only to permanent URLs

## Release engineering ✅ complete

Deployment and packaging work done ahead of the first public release,
outside the numbered feature sprints (see CHANGELOG.md for full detail):

- [x] Single-image production architecture (`nirgf/keyanu:latest`) —
      frontend, backend, and nginx in one container, one port, one volume
- [x] Full Dark / Light / System theme support
- [x] Public GitHub + Docker Hub + Unraid packaging (this release)

## Sprint 3 — Proposed next

Not yet started; order and scope subject to review before work begins.

- [ ] Infrastructure-oriented sidebar: **Workspace → Category → System**
      navigation, replacing the flat workspace → system list. Requires
      settling a two-level taxonomy (Category, e.g. Firewall/Cloud/Network,
      driving navigation; Type, e.g. pfSense/Cloudflare/MikroTik, driving
      icons/templates/defaults) shared by the sidebar, the "Add System"
      flow, and the resource header.
- [ ] Rename "Resource" to "System" throughout the UI (backend model name
      can stay as-is).
- [ ] Replace the bare Delete button with an Actions (`...`) menu
      (Rename / Duplicate / Export / Delete) across Systems and Credentials.
- [ ] Resource header redesign: category label, and future status
      indicators (Online / Reachable / Certificate Valid / Last Backup /
      Last Sync) once a health-check mechanism exists.
- [ ] Resource Overview summary cards (Credentials / Files / Certificates /
      Notes / Recent Activity / Health).
- [ ] Notes: Markdown rendering, code blocks with syntax highlighting and a
      copy button.
- [ ] File Preview and Replace (currently: upload / download / delete).
- [ ] "Add System" wizard as the primary entry point for creating a system,
      including category selection.

## Later / unscheduled

- [ ] Multi-user support with roles and per-workspace sharing (v1 is
      explicitly single-user; this is a deliberate future expansion, not an
      oversight).
- [ ] Per-credential file attachments, distinct from resource-level files.
- [ ] Automatic metadata extraction from uploaded files (certificate
      expiry, SSH key type/fingerprint detection).
- [ ] Credential expiry reminders and live TOTP code generation/display for
      stored TOTP-template credentials.
- [ ] Two-factor recovery codes / session management surfaced in a global
      "Account activity" view (currently per-resource and per-credential
      audit trails only).

## Explicitly out of scope for v1

- Any dependency on external/third-party APIs (e.g. an update-checker
  calling out to GitHub) unless there's a clear, specific product
  requirement for it.
- Enterprise complexity (RBAC, SSO, multi-tenant isolation) — Keyanu v1
  targets a single homelab administrator, not an organization.
