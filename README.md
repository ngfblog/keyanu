# Keyanu

Keyanu is a self-hosted **infrastructure credential manager** for homelabs
and system administrators. It's built for people who run pfSense, Unraid,
MikroTik, Home Assistant, Cloudflare tunnels, and a dozen other systems, and
are tired of secrets scattered across notes apps, spreadsheets, and browser
password managers.

> **Status:** Sprint 1 — project scaffold, auth, workspaces, resources, and
> a fully working credentials/files/notes/audit experience for a single
> user. See [Roadmap](#roadmap) below.

## Concept

```
Workspace
 └── Resource
      ├── Credentials   (SSH keys, passwords, API tokens, certs, ...)
      ├── Files         (drag & drop uploads)
      ├── Notes
      └── History / Audit
```

- A **Workspace** groups related infrastructure — a homelab, a client
  environment, a project.
- A **Resource** is a system you manage — a pfSense box, an Unraid server, a
  GitHub org, a Cloudflare zone.
- Each resource holds any number of **Credentials**, built from templates
  (SSH Key Pair, TLS Certificate, API Token, Password, WireGuard Peer, TOTP,
  GPG Key, Secure Note, Custom), plus attached **Files**, freeform **Notes**,
  and an **Audit** trail of everything that happened to it.

## Screenshots

_Add screenshots of the dashboard, resource list, and credential view here
once you have a running instance — the UI is dark-themed and card-based,
inspired by GitHub and Lockstep._

## Tech stack

**Frontend:** React + TypeScript + Vite + Tailwind CSS + hand-rolled
shadcn/ui-style primitives (`class-variance-authority`, `clsx`,
`tailwind-merge`) + Lucide icons.

**Backend:** FastAPI + SQLAlchemy 2.0 + SQLite + Alembic, with credential
secrets encrypted at rest (Fernet, key derived from `ENCRYPTION_KEY`) and a
single-user JWT auth flow.

## Quick start (Docker Compose)

```bash
git clone https://github.com/your-org/keyanu.git
cd keyanu
cp backend/.env.example .env
# edit .env: set SECRET_KEY, ENCRYPTION_KEY, ADMIN_USERNAME, ADMIN_PASSWORD
docker compose up -d --build
```

Open `http://localhost:8420` and sign in with the admin credentials you set.

Generate strong secrets with:

```bash
openssl rand -hex 32
```

## Running for local development (without Docker)

**Backend**

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edit as needed
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

The API is now at `http://localhost:8000/api`, with interactive docs at
`http://localhost:8000/api/docs`.

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

The dev server proxies `/api` to `http://localhost:8000` (see
`vite.config.ts`). Open `http://localhost:5173`.

## Project structure

```
keyanu/
├── backend/                 FastAPI application
│   ├── app/
│   │   ├── api/routes/      HTTP endpoints
│   │   ├── core/            config, security, credential template definitions
│   │   ├── crud/            database access layer
│   │   ├── db/              SQLAlchemy engine/session/base
│   │   ├── models/          ORM models
│   │   ├── schemas/         Pydantic request/response models
│   │   └── main.py          app entrypoint
│   ├── alembic/             database migrations
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                 React application
│   ├── src/
│   │   ├── components/       ui/, layout/, resources/, credentials/, common/
│   │   ├── pages/             route-level pages
│   │   ├── lib/                api client, icon maps, cn() helper
│   │   ├── store/              auth context
│   │   └── types/               shared TypeScript types
│   ├── Dockerfile
│   └── nginx.conf
├── unraid/                    Unraid deployment templates + guide
└── docker-compose.yaml
```

## Security model (v1)

- Single user, bootstrapped from `ADMIN_USERNAME` / `ADMIN_PASSWORD` on
  first boot with `must_change_password=true` — you're required to set a
  new password on first login before anything else is usable.
- Passwords hashed with bcrypt. Sessions are server-side (`sessions` table);
  the JWT handed to the browser only carries a session id, never the
  username or any claims of its own. Every request re-validates the session
  in the database and slides its idle timeout forward.
- Optional TOTP two-factor authentication (Settings > Security), with
  single-use, bcrypt-hashed recovery codes for when you lose your
  authenticator. Login becomes a two-step flow when TOTP is enabled.
- "Log out everywhere" and per-session revocation are real: they delete the
  server-side session, not just the local token.
- Session idle timeout is configurable per-account (5 minutes to 30 days).
- Changing your password, changing your username, disabling TOTP, and
  generating recovery codes all require re-entering your current password.
- Every credential's sensitive fields are serialized to JSON and encrypted
  with Fernet (AES-128-CBC + HMAC) using a key derived from
  `ENCRYPTION_KEY`, before ever touching disk. TOTP secrets are encrypted
  the same way.
- Every create/update/delete/secret-reveal is written to an audit log,
  visible per-resource under the "Audit & History" tab.
- **`ENCRYPTION_KEY` must never change once credentials or TOTP secrets
  exist** — doing so makes them permanently unreadable. Back it up outside
  of Unraid appdata backups.

This is a single-user tool in v1: there is no role-based access control or
per-credential sharing yet. Don't expose it directly to the internet;
put it behind a VPN (Tailscale, WireGuard) or a reverse proxy with its own
auth layer if remote access is needed.

## Roadmap

Sprint 1:
- [x] Project structure, Docker, docker-compose, Unraid templates
- [x] FastAPI backend shell with auth, workspaces, resources
- [x] React frontend shell with dark theme, sidebar, dashboard
- [x] Login page
- [x] Resource list (cards) and resource detail page with tabs
- [x] Working Credentials tab (all 9 templates, encrypted at rest)
- [x] Working Files tab (drag & drop upload/download/delete)
- [x] Working Notes tab
- [x] Working Audit & History tab

Sprint 2 (in progress):
- [x] Settings shell + General & Appearance preferences
- [x] Security: server-side sessions, forced password change, TOTP,
      recovery codes, active sessions, session timeout
- [x] Backup & Restore (`.keyanu` encrypted export/import)
- [ ] Global search (Ctrl+K)
- [ ] Dedicated Credential page (own URL, out of the modal)
- [ ] Infrastructure-oriented sidebar (Workspace → Category → System)

Planned for future sprints:
- [ ] Automatic metadata extraction from uploaded files (cert expiry, SSH
      key type/fingerprint detection, etc.)
- [ ] Multi-user support with roles and per-workspace sharing
- [ ] Credential expiry reminders and TOTP live code generation
- [ ] "Actions" menu (rename/duplicate/export/delete) replacing the bare
      Delete button

## License

MIT — see [LICENSE](LICENSE).
