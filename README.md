<p align="center">
  <img src="https://raw.githubusercontent.com/ngfblog/keyanu/main/unraid/icon.png" width="80" height="80" alt="Keyanu icon">
</p>

# Keyanu on Unraid

Keyanu ships as one Docker image (`nirgf/keyanu:latest`) containing the
web UI, the API, and the database engine — one container, one port
(`8420`), one Appdata volume (`/data`). No custom Docker network, no
second container, nothing to build.

## Method 1 — Template repository

The standard way to add a container template that isn't in the default
Community Applications feed:

1. On your Unraid server, go to the **Docker** tab → **Template
   repositories** field near the bottom of the page.
2. Paste `https://github.com/ngfblog/keyanu` and click **Save**. Unraid
   scans the repo for `.xml` templates and finds `unraid/keyanu.xml`
   automatically.
3. **Add Container** → **Template** → select **keyanu**. Fields pre-fill
   from the template.
4. Fill in the required fields (below) and **Apply**.

From then on, "keyanu" appears in your Template dropdown like any other
container added this way.

## Method 2 — Local template file

No GitHub required:

1. Copy `unraid/keyanu.xml` into
   `/boot/config/plugins/dockerMan/templates-user/` on your Unraid server.
2. **Add Container** → **Template** → select **keyanu**.

## Required fields

Every field is a plain Docker environment variable, editable any time
from **Docker → keyanu → Edit** — no file editing or SSH required:

| Field | Required | Notes |
|---|---|---|
| `SECRET_KEY` | ✅ | Random 32-byte hex string — see below |
| `ENCRYPTION_KEY` | ✅ | Random 32-byte hex string. **Never change after data exists** — see warning below |
| `ADMIN_USERNAME` | ✅ | Login username for the single admin account |
| `ADMIN_PASSWORD` | ✅ | Temporary password — you'll be forced to change it on first login |
| `DATA_DIR` | ✅ | Leave as `/data` (must match the Appdata volume's container-side path) |
| `DEFAULT_SESSION_TIMEOUT_MINUTES` | ✅ | Idle session timeout in minutes for the admin account at first boot (default `720`); changeable later under Settings > Security |
| `ENVIRONMENT` | ✅ | Leave as `production` |

Also confirm the **Appdata** path — defaults to `/mnt/user/appdata/keyanu`
on the host, mapped to `/data` in the container. This is where the SQLite
database and uploaded files live.

Apply, then open `http://<unraid-ip>:8420/` and sign in with the admin
credentials you set. You'll be required to choose a new password
immediately.

## Generating secrets

`SECRET_KEY` and `ENCRYPTION_KEY` should each be a random 32-byte hex
string, generated separately:

```bash
openssl rand -hex 32
```

Run it twice and paste each result into its field — nothing needs to be
edited afterward.

> **⚠️ Never change `ENCRYPTION_KEY` once data exists.** It encrypts
> every credential secret, TOTP secret, and backup export. If it's lost,
> stored credentials cannot be recovered — there is no reset path. If
> it's changed after credentials already exist, those credentials become
> permanently unreadable. Back it up outside of Unraid's appdata backup
> plugin the moment you generate it.

## Appdata backup

Everything Keyanu needs to restore itself lives under the Appdata path
(`/mnt/user/appdata/keyanu` by default): the SQLite database and any
uploaded files. Include that folder in your regular Unraid backup routine
(e.g. the CA Backup / Restore Appdata plugin), and keep `SECRET_KEY` /
`ENCRYPTION_KEY` backed up separately, since neither is ever written to
disk.

Keyanu also has its own encrypted backup built in (Settings > Backup &
Restore) for a portable `.keyanu` export independent of Unraid's own
backup tooling.

## Updating

**Docker → keyanu → Check for Updates**, or re-pull `nirgf/keyanu:latest`
manually. Your data lives in the Appdata volume, not the image, so
updates don't affect it.

## ❤️ Support

If my projects helped you or saved you time, consider supporting future development:

👉 https://paypal.me/ShopNGF
---

Working on Keyanu itself rather than just running it? See the root
[README.md](../README.md) for local development setup.
