# Changelog

All notable changes to Keyanu are documented in this file.

## [Unreleased]

## [0.1.0] - 2026-07-06

First public release.

### Added — GitHub & release packaging
- `CONTRIBUTING.md`, `SECURITY.md`, and GitHub issue templates (bug
  report, feature request) for public contributions.
- GitHub Actions: CI (backend tests, frontend build, Docker image build
  validation on every push/PR) and a separate Docker Hub publish workflow
  gated on version tags.
- Full repository audit for public release: verified no remaining
  placeholder project information (GitHub org, Docker Hub account, or
  contact details) anywhere in the codebase or docs.

### Added — Unraid packaging
- `unraid/icon.png`: a real 512×512 icon (previously the `<Icon>` URL in
  the template pointed at a file that didn't exist yet).
- `unraid/keyanu.xml` finalized with the real Docker Hub repository,
  Support/Project links, and icon URL — no placeholders.
- Corrected the Template Repositories installation instructions after
  verifying the actual mechanism against several real-world Unraid
  template repos: Unraid scans a plain GitHub repo URL (not a raw URL)
  entered in Docker → Template repositories, the same way any third-party
  container template is added.

### Added — Full Dark / Light / System theme support
- Replaced the placeholder single-option Theme dropdown with three real,
  working themes: Dark, Light, and System (follows the OS preference).
- Implemented via CSS custom properties (`--base`, `--surface`, `--border`,
  `--ink` families) scoped to a `[data-theme]` attribute on `<html>`,
  rather than per-component changes -- since every page and component
  already used only semantic Tailwind tokens (never raw colors, confirmed
  by a full grep sweep), the entire app re-themes correctly with zero
  changes needed outside `tailwind.config.js` and `index.css`.
- Switching themes updates the whole UI instantly, no reload -- confirmed
  live through the running app, not just by code review.
- "System" is applied via `window.matchMedia('(prefers-color-scheme:
  dark)')` and updates live if the OS preference changes while the app is
  open (no reload needed there either).
- Default on first launch is System; if the browser doesn't support
  `matchMedia` at all, defaults to Dark, per spec.
- Theme choice persists server-side (new `theme` column on `User`,
  `system`/`dark`/`light`, validated), the same way other Appearance
  settings already persist -- confirmed to survive a fresh login/session,
  not just the current one, via an automated test.
- A small inline script in `index.html` applies the last-known theme
  (cached client-side) before first paint, so there's no flash of the
  wrong theme while the real preference loads from the server.
- Removed the "Additional themes may be added in a future release"
  placeholder text entirely.

### Fixed — UI polish (Settings > Appearance)
- **Theme dropdown**: a `<select>` with a single, disabled "Dark" option
  was misleading (implies choice where none exists). Replaced with a
  static "Dark" label (moon icon + text), matching the current reality
  that Keyanu is dark-only. No functional change; a real theme picker can
  replace this static label if/when a second theme is actually built.
- **Compact mode / Animations switch alignment**: the toggle thumb was
  positioned with `absolute` + a bare `translate-x-*`, with no explicit
  base offset for the browser to anchor "auto" positioning against, which
  could let the thumb render outside the switch track. Rewired to the
  standard `inline-flex` track + in-flow `transform`-based thumb pattern
  (no `absolute` positioning involved), keeping the thumb mathematically
  contained within the track at both toggle states. Purely visual — the
  toggles' behavior and API calls are unchanged.

### Changed — Deployment architecture: single Docker image

Production deployment is now **one container, one image, one port**,
replacing the two-container (backend + frontend) production setup from the
previous change below.

- New root-level `Dockerfile` builds the React frontend and the FastAPI
  backend together into a single image (`nirgf/keyanu:latest`): nginx
  serves the built frontend and reverse-proxies `/api/` to the backend
  process, which runs on `127.0.0.1:8000` inside the same container and is
  never exposed directly. One published port (`8420`), one volume
  (`/data`).
- New `docker-entrypoint.sh` (repo root) runs migrations, starts the
  backend, then starts nginx in the foreground; if either process exits,
  the other is stopped too so the container exits cleanly and a restart
  policy can recover it. Verified by killing the backend process mid-run
  and confirming nginx shuts down with it, rather than serving a
  half-broken app.
- New single Unraid template, `unraid/keyanu.xml`, replacing the previous
  two-template (`keyanu-backend.xml` + `keyanu-frontend.xml`) setup.
  Exposes all 7 required settings (`SECRET_KEY`, `ENCRYPTION_KEY`,
  `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `DATA_DIR`,
  `DEFAULT_SESSION_TIMEOUT_MINUTES`, `ENVIRONMENT`) as environment
  variable fields. No custom Docker network required — there's only one
  container.
- The previous two-container `docker-compose.yaml` (separate backend/
  frontend images) is kept, explicitly re-scoped as a local-development
  convenience (live rebuilds, two containers) and no longer presented as
  a production path.
- README rewritten: Docker Hub install (`docker run`), Unraid install,
  secret generation, an `ENCRYPTION_KEY` warning, and `docker build` /
  `docker tag` / `docker push` instructions for publishing new images.
- Verified end-to-end against the actual single-image process layout (not
  just the previous two-container setup): built the real frontend,
  installed nginx, ran the unmodified `docker-entrypoint.sh` at the exact
  paths the image uses (`/app/backend`, `/usr/share/nginx/html`, `/data`),
  and confirmed through the single port 8420: login, forced password
  change, settings, workspace/system/credential creation, the credential
  page endpoint, search, and a full backup export → verify → restore
  cycle.

### Fixed
- `DEFAULT_SESSION_TIMEOUT_MINUTES` was defined in `Settings` but never
  actually read anywhere — new users (including the bootstrap admin) always
  got a hardcoded 720-minute timeout regardless of this setting. Wired it
  into `crud_user.create_user`; added a regression test
  (`test_00_config_wiring.py`) so a config value silently doing nothing
  can't happen again unnoticed.

### Changed
- Production deployment no longer requires editing a `.env` file anywhere.
  - Unraid templates (`unraid/keyanu-backend.xml`) now expose all seven
    required settings (`SECRET_KEY`, `ENCRYPTION_KEY`, `ADMIN_USERNAME`,
    `ADMIN_PASSWORD`, `DATA_DIR`, `DEFAULT_SESSION_TIMEOUT_MINUTES`,
    `ENVIRONMENT`) as Docker environment variable fields, editable directly
    in Unraid's UI.
  - `docker-compose.yaml` now honors all seven as plain environment
    variables with sensible defaults (`${VAR:-default}`), so they can be
    set via an exported shell environment or `docker run -e` instead of a
    file.
  - `backend/.env.example` is now explicitly documented as local-development-only
    (used only when running `uvicorn` directly, outside Docker).
  - README rewritten: a dedicated **Unraid** section with a full field
    table, and a clarified Quick Start that no longer instructs copying
    `.env.example` for Docker Compose use.

## Sprint 2 — Security, Backup & Restore, Credential Page, Global Search

### Added
- **Global Search (Ctrl+K / Cmd+K)**: command palette searching Systems,
  Credentials, Files, and Notes in one place.
  - Debounced network requests (250ms) with instant, non-blocking typing.
  - Full keyboard navigation: `↑`/`↓` to move, `Enter` to open the selected
    result, `Esc` to close.
  - Matching substrings are highlighted inline in result titles.
  - Recent searches (last 5) are remembered locally and offered when the
    palette is opened with an empty query.
  - Every result links to a permanent URL — a system or credential's own
    page, or a resource page deep-linked to the right tab and item
    (`?tab=files&file=...` / `?tab=notes&note=...`) — never a modal.
  - New backend endpoint: `GET /api/search?q=...`.
- **Credential Page**: every credential now has its own permanent URL
  (`/credentials/{id}`) with Overview (reveal/copy fields), Metadata, and
  History tabs, plus rename and delete. Replaces the old view-in-a-modal
  pattern entirely — `CredentialViewDialog` has been removed.
  - New backend endpoints: `GET /api/credentials/{id}` (with workspace/
    resource breadcrumb context) and `GET /api/credentials/{id}/audit`.
- **Backup & Restore**: encrypted `.keyanu` export/import.
  - Export bundles every workspace, system, credential, file, note, audit
    entry, and account setting into a ZIP containing a plaintext
    `manifest.json` (version, checksum, encryption key fingerprint, counts)
    and an encrypted `payload.enc` — encrypted with the same
    `ENCRYPTION_KEY`-derived cipher used for credentials, not a new scheme.
  - Restore validates structure, checksum, format version, and encryption
    key fingerprint *before* attempting decryption. A backup made with a
    different `ENCRYPTION_KEY` is detected and rejected with zero data
    mutation — verified by automated test and manual cross-key restore
    attempt.
  - Export and Restore both require re-entering the current password.
    Restore additionally requires an explicit overwrite confirmation and
    revokes all sessions afterward.
  - New Settings > Backup & Restore page with a verify-before-restore flow
    (drag-and-drop or browse, instant validation report, then a guarded
    restore confirmation).
- **Security** (Settings > Security):
  - Sessions are now server-side (new `sessions` table). The session JWT
    carries only a session id — no claims, no username — and every request
    re-validates against the database, sliding the idle timeout forward.
  - Forced password change: the bootstrap admin account is created with
    `must_change_password=true`; enforced both server-side (403 on
    everything outside a small allowlist) and client-side (a full-screen
    gate before the rest of the app is reachable).
  - TOTP two-factor authentication: QR + manual-entry setup, confirm-to-
    enable, and a two-step login flow (password, then a TOTP or recovery
    code via a short-lived signed ticket).
  - Recovery codes: 10 single-use, bcrypt-hashed codes, shown once, gated
    behind TOTP being enabled.
  - Active Sessions list with per-session revoke and "Log out everywhere."
  - Configurable session idle timeout (5 minutes – 30 days).
  - Re-entering the current password is required for: changing the
    password, changing the username, disabling TOTP, generating recovery
    codes, and exporting a backup.
- **Settings**: new Settings area with General (display name, time format)
  and Appearance (accent color, compact mode, animation toggle) sections.
  Accent color is applied at runtime via CSS custom properties, not baked
  into the Tailwind build.
- Automated backend test suite (`backend/tests/`, pytest) covering auth,
  sessions, TOTP, recovery codes, workspaces/resources/credentials CRUD,
  files, notes, audit trails, backup/restore (including the encryption-key
  mismatch path), and search — 34 tests, run on every feature going
  forward.

### Changed
- Login response shape changed: `POST /api/auth/login` now returns either
  a token or `{requires_totp: true, login_ticket: ...}`, completed via
  `POST /api/auth/login/totp`.
- `POST /api/auth/change-password` moved to `POST /api/security/change-password`.

### Removed
- `frontend/src/components/credentials/credential-view-dialog.tsx` — no
  longer needed now that credentials have their own page.
- Planned GitHub-API-based "check for updates" feature was scoped out
  before being built — Keyanu has no dependency on any external API.

## Sprint 1 — Initial release

### Added
- Project scaffold: FastAPI + SQLAlchemy + SQLite + Alembic backend, React
  + TypeScript + Vite + Tailwind frontend, Docker/Compose, Unraid
  deployment templates.
- Single-user JWT authentication.
- Workspaces → Systems (Resources) → Credentials/Files/Notes/Audit data
  model.
- Nine credential templates (SSH Key Pair, TLS Certificate, API Token,
  Password, WireGuard Peer, TOTP, GPG Key, Secure Note, Custom), each with
  a dynamic, server-defined field schema shared between backend and
  frontend.
- Credential secrets encrypted at rest with Fernet, keyed from
  `ENCRYPTION_KEY`.
- File attachments with drag-and-drop upload, download, and delete.
- Notes (create/edit/delete).
- Per-resource audit trail (create/update/delete/secret-reveal).
- Dark, card-based UI (GitHub/Lockstep-inspired), dashboard, sidebar,
  resource list and detail pages, login page.

[Unreleased]: https://github.com/nirgf/keyanu/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/nirgf/keyanu/releases/tag/v0.1.0
