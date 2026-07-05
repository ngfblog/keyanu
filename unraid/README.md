# Deploying Keyanu on Unraid

Keyanu ships as two containers — `keyanu-backend` (FastAPI + SQLite) and
`keyanu-frontend` (the web UI, served by nginx). There are two supported ways
to run it on Unraid.

## Option A — Community Applications style XML templates (recommended)

This is the recommended path: every setting is a field in Unraid's own
Docker UI. No `.env` file, no SSH, no file editing at all.

Two templates are provided in this folder:

- `keyanu-backend.xml`
- `keyanu-frontend.xml`

To use them:

1. Build (or pull, once you publish images to a registry) the two images:
   ```bash
   docker build -t keyanu-backend:latest ./backend
   docker build -t keyanu-frontend:latest ./frontend
   ```
2. In Unraid, go to **Docker → Add Container → Template repositories** and
   add the raw URL to this folder, or simply copy the two XML files into
   `/boot/config/plugins/dockerMan/templates-user/` on your Unraid server.
3. Create a custom bridge network so the frontend can reach the backend by
   name:
   ```bash
   docker network create keyanu
   ```
   Then, in the **advanced view** of each container in the Unraid Docker UI,
   set the network to `keyanu` instead of the default `bridge`, and give the
   backend container the fixed hostname `backend` (Unraid: "Console name" /
   `--network-alias backend`, or simply name the container `backend`).
4. Install `keyanu-backend` first from **Apps → search "keyanu"** (once the
   template is registered). Fill in each field directly in the Unraid UI —
   all seven are exposed as real Docker environment variables on the
   container, editable any time from **Docker → keyanu-backend → Edit**:

   | Field | Required | Notes |
   |---|---|---|
   | `SECRET_KEY` | ✅ | Random 32-byte hex string — see "Generating secrets" below |
   | `ENCRYPTION_KEY` | ✅ | Random 32-byte hex string. Back this up separately — see warning below |
   | `ADMIN_USERNAME` | ✅ | Login username for the single admin account |
   | `ADMIN_PASSWORD` | ✅ | Temporary password — you'll be forced to change it on first login |
   | `DATA_DIR` | ✅ | Leave as `/data` (must match the App Data volume's container-side path) |
   | `DEFAULT_SESSION_TIMEOUT_MINUTES` | ✅ | Idle session timeout in minutes for the admin account at first boot (default `720` = 12h); each account can change its own value later under Settings > Security |
   | `ENVIRONMENT` | ✅ | Leave as `production` |

   Also set the **App Data** path (e.g. `/mnt/user/appdata/keyanu`) — this
   is where the SQLite database and uploaded files live on your array.
5. Install `keyanu-frontend` the same way, on the same `keyanu` network,
   and set its WebUI port.
6. Open `http://<unraid-ip>:<frontend-port>/` and sign in with the admin
   credentials you set. You'll be required to choose a new password
   immediately.

## Option B — Docker Compose (Compose Manager plugin)

If you'd rather run the provided `docker-compose.yaml` as-is via the
**Compose Manager** (or similar) plugin from Community Applications:

1. Copy the whole `keyanu/` repository folder onto your array, e.g.
   `/mnt/user/appdata/keyanu-src/`.
2. In Compose Manager, add a new stack pointing at
   `/mnt/user/appdata/keyanu-src/docker-compose.yaml`.
3. Create a `.env` file next to it with at least:
   ```env
   SECRET_KEY=<openssl rand -hex 32>
   ENCRYPTION_KEY=<openssl rand -hex 32>
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=<a strong password>
   KEYANU_PORT=8420
   ```
   `DATA_DIR`, `DEFAULT_SESSION_TIMEOUT_MINUTES`, and `ENVIRONMENT` are also
   read from this file if set, otherwise they fall back to sensible
   defaults (`/data`, `720`, `production`).

   Note: this `.env` file is a Docker Compose convention (it's read by
   `docker compose` itself for variable substitution), not something
   Keyanu requires — it's the tradeoff for using Compose Manager instead
   of Option A's native Unraid fields.
4. Bring the stack up. Keyanu will be reachable at `http://<unraid-ip>:8420`.
5. Data (the SQLite database and uploaded files) persists in the
   `keyanu-data` named Docker volume. To store it on the array instead,
   change the `keyanu-data` volume in `docker-compose.yaml` to a bind mount
   under `/mnt/user/appdata/keyanu/`.

## Generating secrets

Both `SECRET_KEY` and `ENCRYPTION_KEY` should be random 32-byte hex strings:

```bash
openssl rand -hex 32
```

Run it twice — each key must be different. Paste the output straight into
the Unraid field (Option A) or your `.env` file (Option B); nothing needs
to be edited afterward.

`ENCRYPTION_KEY` derives the key used to encrypt every credential secret
(and TOTP secret, and backup export) at rest. **Back it up outside of
Unraid's appdata backup plugin** (e.g. in your own password manager) — if
it's lost, stored credentials cannot be recovered, and if it's changed
after credentials already exist, those credentials become unreadable.

## Backups

Everything Keyanu needs to restore itself lives under the app data path
(`/mnt/user/appdata/keyanu` if you followed the paths above): the SQLite
database and any uploaded files. Include that folder in your existing
Unraid backup routine (e.g. the CA Backup / Restore Appdata plugin), and
keep `SECRET_KEY` / `ENCRYPTION_KEY` backed up separately as they are not
stored on disk.

Keyanu also has its own encrypted backup/restore built in (Settings >
Backup & Restore in the app) if you want a portable `.keyanu` export
independent of Unraid's own backup tooling.
