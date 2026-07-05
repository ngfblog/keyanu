# Deploying Keyanu on Unraid

Keyanu ships as two containers — `keyanu-backend` (FastAPI + SQLite) and
`keyanu-frontend` (the web UI, served by nginx). There are two supported ways
to run it on Unraid.

## Option A — Docker Compose (Compose Manager plugin)

This is the simplest path if you have the **Compose Manager** (or similar)
plugin installed from Community Applications.

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
4. Bring the stack up. Keyanu will be reachable at `http://<unraid-ip>:8420`.
5. Data (the SQLite database and uploaded files) persists in the
   `keyanu-data` named Docker volume. To store it on the array instead,
   change the `keyanu-data` volume in `docker-compose.yaml` to a bind mount
   under `/mnt/user/appdata/keyanu/`.

## Option B — Community Applications style XML templates

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
   template is registered), fill in `SECRET_KEY`, `ENCRYPTION_KEY`,
   `ADMIN_USERNAME`, and `ADMIN_PASSWORD`, and set the App Data path to
   `/mnt/user/appdata/keyanu`.
5. Install `keyanu-frontend` the same way, and set its WebUI port.
6. Open `http://<unraid-ip>:<frontend-port>/` and sign in with the admin
   credentials you set.

## Generating secrets

Both `SECRET_KEY` and `ENCRYPTION_KEY` should be random 32-byte hex strings:

```bash
openssl rand -hex 32
```

`ENCRYPTION_KEY` derives the key used to encrypt every credential secret at
rest. **Back it up outside of Unraid's appdata backup plugin** (e.g. in your
own password manager) — if it's lost, stored credentials cannot be
recovered, and if it's changed after credentials already exist, those
credentials become unreadable.

## Backups

Everything Keyanu needs to restore itself lives under the app data path
(`/mnt/user/appdata/keyanu` if you followed the paths above): the SQLite
database and any uploaded files. Include that folder in your existing
Unraid backup routine (e.g. the CA Backup / Restore Appdata plugin), and
keep `SECRET_KEY` / `ENCRYPTION_KEY` backed up separately as they are not
stored on disk.
