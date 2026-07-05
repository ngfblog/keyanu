# Keyanu

Keyanu is a self-hosted **infrastructure credential manager** for homelabs
and system administrators. It's built for people who run pfSense, Unraid,
MikroTik, Home Assistant, Cloudflare tunnels, and a dozen other systems, and
are tired of secrets scattered across notes apps, spreadsheets, and browser
password managers.

> **Status:** Actively developed. Auth, workspaces/systems/credentials/
> files/notes, encrypted secrets, sessions with TOTP + recovery codes,
> encrypted backup/restore, a permanent-URL credential page, and global
> search are all implemented and tested. See [ROADMAP.md](ROADMAP.md) for
> what's next.

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

## Quick start (Docker Hub image)

Keyanu is distributed as a single Docker image containing the frontend,
the backend, and the database engine. One container, one port, one
volume — no `.env` file, no Docker Compose, no custom network required.

```bash
docker volume create keyanu-data

docker run -d \
  --name keyanu \
  -p 8420:8420 \
  -v keyanu-data:/data \
  -e SECRET_KEY=$(openssl rand -hex 32) \
  -e ENCRYPTION_KEY=$(openssl rand -hex 32) \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=change-me-please \
  -e DATA_DIR=/data \
  -e DEFAULT_SESSION_TIMEOUT_MINUTES=720 \
  -e ENVIRONMENT=production \
  --restart unless-stopped \
  nirgf/keyanu:latest
```

Open `http://localhost:8420` and sign in with `ADMIN_USERNAME` /
`ADMIN_PASSWORD`. You'll be required to choose a new password immediately
on first login.

### Generating `SECRET_KEY` and `ENCRYPTION_KEY`

Both must be random 32-byte hex strings. Generate each one separately —
don't reuse the same value for both:

```bash
openssl rand -hex 32   # SECRET_KEY
openssl rand -hex 32   # ENCRYPTION_KEY
```

> **⚠️ Never change `ENCRYPTION_KEY` after data exists.** It encrypts
> every credential secret, TOTP secret, and backup export at rest. If you
> lose it, that data is permanently unrecoverable — there is no reset or
> recovery path. If you change it after credentials already exist, those
> credentials become permanently unreadable. Store it somewhere durable
> and separate from your appdata backups (a password manager, printed and
> locked away, etc.) the moment you generate it.

### All configuration is environment variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `SECRET_KEY` | ✅ | — | Signs session tokens |
| `ENCRYPTION_KEY` | ✅ | — | Encrypts secrets at rest — see warning above |
| `ADMIN_USERNAME` | ✅ | — | Login username for the single admin account |
| `ADMIN_PASSWORD` | ✅ | — | Temporary password, forced change on first login |
| `DATA_DIR` | ✅ | `/data` | Internal path for the database and files — leave as `/data` unless you also change the volume's container-side mount path |
| `DEFAULT_SESSION_TIMEOUT_MINUTES` | ✅ | `720` | Idle session timeout (minutes) applied to the admin account on first boot; changeable later per-account under Settings > Security |
| `ENVIRONMENT` | ✅ | `production` | Deployment environment label |

None of these are read from a file — pass them however your platform
prefers (`docker run -e`, Unraid's template fields, Portainer's
environment UI, Kubernetes secrets, etc.).

## Unraid

One template, one container, no custom Docker network.

1. Copy `unraid/keyanu.xml` into
   `/boot/config/plugins/dockerMan/templates-user/` on your Unraid server,
   or add this repo as a template repository under **Docker → Add
   Container → Template repositories**.
2. In Unraid, go to **Apps** (or **Docker → Add Container**) and search
   for "keyanu". The template pulls `nirgf/keyanu:latest` directly from
   Docker Hub — nothing to build.
3. Fill in the fields directly in the Unraid UI (all seven map to the
   environment variables in the table above):

   | Field | Required |
   |---|---|
   | `SECRET_KEY` | ✅ |
   | `ENCRYPTION_KEY` | ✅ |
   | `ADMIN_USERNAME` | ✅ |
   | `ADMIN_PASSWORD` | ✅ |
   | `DATA_DIR` | ✅ (leave as `/data`) |
   | `DEFAULT_SESSION_TIMEOUT_MINUTES` | ✅ (default `720`) |
   | `ENVIRONMENT` | ✅ (leave as `production`) |

   Also confirm the **Appdata** path — defaults to
   `/mnt/user/appdata/keyanu` → `/data` inside the container.
4. Apply, then open `http://<unraid-ip>:8420/` and sign in.

That's the entire installation. No building on Unraid, no second
container, no custom network, no separate frontend/backend templates.

See [`unraid/README.md`](unraid/README.md) for troubleshooting and backup
notes.

## Publishing to Docker Hub

For maintainers building and pushing new images:

```bash
# From the repo root -- the Dockerfile here builds the frontend AND the
# backend into one image, so the build context must be the repo root,
# not backend/ or frontend/.
docker build -t nirgf/keyanu:latest .

# Tag a version alongside `latest` (recommended for anything but a quick test)
docker tag nirgf/keyanu:latest nirgf/keyanu:0.1.0

docker login
docker push nirgf/keyanu:latest
docker push nirgf/keyanu:0.1.0
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

## Running tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

The suite spins up the real FastAPI app against an isolated temp SQLite
database and exercises it end-to-end through HTTP (no mocked internals):
authentication and sessions, forced password change, TOTP and recovery
codes, workspace/system/credential CRUD and encryption, files, notes, audit
trails, backup/restore (including the encryption-key-mismatch rejection
path), and search.

## Project structure

```
keyanu/
├── Dockerfile                 Single-image production build (frontend + backend + nginx)
├── nginx.conf                 Combined nginx config for the single-image build (port 8420)
├── docker-entrypoint.sh       Single-image entrypoint (migrate, start backend + nginx)
├── .dockerignore              Build context excludes for the single-image build
├── docker-compose.yaml        Two-container setup for LOCAL DEVELOPMENT only
├── backend/                   FastAPI application
│   ├── app/
│   │   ├── api/routes/        HTTP endpoints (incl. security, backup, search)
│   │   ├── core/               config, security/session/TOTP, backup packaging,
│   │   │                       credential template definitions
│   │   ├── crud/               database access layer
│   │   ├── db/                 SQLAlchemy engine/session/base
│   │   ├── models/              ORM models
│   │   ├── schemas/             Pydantic request/response models
│   │   └── main.py               app entrypoint
│   ├── alembic/                database migrations
│   ├── tests/                  pytest suite (auth, security, backup, search, ...)
│   ├── Dockerfile               standalone backend image, used only by docker-compose.yaml (dev)
│   └── requirements.txt
├── frontend/                   React application
│   ├── src/
│   │   ├── components/          ui/, layout/, resources/, credentials/,
│   │   │                        settings/, search/, common/
│   │   ├── pages/                route-level pages (incl. settings/)
│   │   ├── lib/                   api client, icon maps, cn() helper
│   │   ├── store/                 auth + preferences contexts
│   │   └── types/                  shared TypeScript types
│   ├── Dockerfile                standalone frontend image, used only by docker-compose.yaml (dev)
│   └── nginx.conf                 nginx config for the standalone dev frontend image
├── unraid/                      keyanu.xml template + deployment guide
├── CHANGELOG.md
└── ROADMAP.md
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

## Roadmap & Changelog

Sprints 1 and 2 are complete: full CRUD for workspaces/systems/credentials/
files/notes, encrypted-at-rest secrets, server-side sessions with TOTP and
recovery codes, encrypted `.keyanu` backup/restore, a permanent-URL
Credential page, and Ctrl+K global search.

See [ROADMAP.md](ROADMAP.md) for what's planned next, and
[CHANGELOG.md](CHANGELOG.md) for a detailed record of everything shipped
so far.

## License

MIT — see [LICENSE](LICENSE).
