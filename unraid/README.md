# Deploying Keyanu on Unraid

Keyanu ships as **one Docker image** (`nirgf/keyanu:latest`) containing the
web UI, the API, and the database engine. One container, one port
(`8420`), one appdata volume (`/data`). No custom Docker network, no
second container, and nothing to build on Unraid itself.

## Installation

1. In Unraid, go to **Docker → Add Container → Template repositories** and
   add this repository's raw URL, or copy `unraid/keyanu.xml` directly
   into `/boot/config/plugins/dockerMan/templates-user/` on your Unraid
   server.
2. Go to **Apps** (or **Docker → Add Container**) and search for
   "keyanu". The template pulls `nirgf/keyanu:latest` straight from Docker
   Hub.
3. Fill in the required fields directly in Unraid's UI — every one of
   these is a plain Docker environment variable on the container, editable
   any time from **Docker → keyanu → Edit**, no file editing or SSH
   required:

   | Field | Required | Notes |
   |---|---|---|
   | `SECRET_KEY` | ✅ | Random 32-byte hex string — see "Generating secrets" below |
   | `ENCRYPTION_KEY` | ✅ | Random 32-byte hex string. **Never change this after data exists** — see warning below |
   | `ADMIN_USERNAME` | ✅ | Login username for the single admin account |
   | `ADMIN_PASSWORD` | ✅ | Temporary password — you'll be forced to change it on first login |
   | `DATA_DIR` | ✅ | Leave as `/data` (must match the Appdata volume's container-side path) |
   | `DEFAULT_SESSION_TIMEOUT_MINUTES` | ✅ | Idle session timeout in minutes for the admin account at first boot (default `720` = 12h); each account can change its own value later under Settings > Security |
   | `ENVIRONMENT` | ✅ | Leave as `production` |

4. Confirm the **Appdata** path — defaults to `/mnt/user/appdata/keyanu`
   on the host, mapped to `/data` inside the container. This is where the
   SQLite database and any uploaded files live.
5. Apply. Unraid pulls the image and starts the container.
6. Open `http://<unraid-ip>:8420/` and sign in with the admin credentials
   you set. You'll be required to choose a new password immediately.

That's the entire installation — no building on Unraid, no separate
frontend/backend containers, no custom network, no second template.

## Generating secrets

Both `SECRET_KEY` and `ENCRYPTION_KEY` should be random 32-byte hex
strings, generated separately (don't reuse one value for both):

```bash
openssl rand -hex 32
```

Run it twice and paste each result straight into its Unraid field.
Nothing needs to be edited afterward.

`ENCRYPTION_KEY` encrypts every credential secret, TOTP secret, and backup
export at rest. **Back it up outside of Unraid's appdata backup plugin**
(e.g. in your own password manager) the moment you generate it:

> **⚠️ Never change `ENCRYPTION_KEY` once data exists.** If it's lost,
> stored credentials cannot be recovered — there is no reset path. If it's
> changed after credentials already exist, those credentials become
> permanently unreadable.

## Backups

Everything Keyanu needs to restore itself lives under the Appdata path
(`/mnt/user/appdata/keyanu` if you used the default): the SQLite database
and any uploaded files. Include that folder in your existing Unraid backup
routine (e.g. the CA Backup / Restore Appdata plugin), and keep
`SECRET_KEY` / `ENCRYPTION_KEY` backed up separately, since they are never
written to disk.

Keyanu also has its own encrypted backup/restore built in (Settings >
Backup & Restore in the app) for a portable `.keyanu` export independent
of Unraid's own backup tooling.

## Updating

Docker Hub image updates are handled the normal Unraid way: **Docker → 
keyanu → check for updates**, or re-pull `nirgf/keyanu:latest` manually.
Your data lives in the Appdata volume, not the container, so updates don't
affect it.

## Local development

If you're working on Keyanu itself rather than just running it, see the
root [`README.md`](../README.md) — `docker-compose.yaml` at the repo root
runs the backend and frontend as two separate containers with live rebuild
support, which is more convenient for development than the single
production image. It isn't intended for production use.
