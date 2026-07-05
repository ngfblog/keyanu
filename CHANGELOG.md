# Changelog

All notable changes to Keyanu are documented in this file.

## Unreleased

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
