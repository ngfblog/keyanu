# Deploying Keyanu on Unraid

Keyanu is a self-hosted infrastructure credential manager for homelabs, IT professionals and system administrators.

The official Docker image (`nirgf/keyanu:latest`) includes everything required to run Keyanu:

- Web interface
- REST API
- SQLite database
- Nginx reverse proxy

No additional containers, databases or custom Docker networks are required.

---

# Installation

1. Copy `unraid/keyanu.xml` to:

```
/boot/config/plugins/dockerMan/templates-user/
```

2. In Unraid, open:

```
Docker → Add Container
```

3. Select the **keyanu** template.

4. Fill in the required configuration values.

5. Click **Apply**.

Unraid will automatically download the latest Keyanu image from Docker Hub and start the container.

---

# Appdata

Default location:

```
/mnt/user/appdata/keyanu
```

This folder stores:

- SQLite database
- Uploaded files
- Encrypted application data
- Application backups

Include this folder in your normal Unraid backup routine.

---

# Cryptographic Keys

Before starting Keyanu you must generate **two different cryptographic keys**.

Generate each key separately:

```bash
openssl rand -hex 32
```

Run the command twice.

Do **not** use the same value for both keys.

---

## SECRET_KEY

Purpose:

- Protects authenticated user sessions.
- Signs internal security tokens.
- Secures application authentication.

Generate with:

```bash
openssl rand -hex 32
```

Changing this key invalidates existing user sessions.

---

## ENCRYPTION_KEY

Purpose:

Encrypts every secret stored by Keyanu, including:

- Passwords
- SSH keys
- API tokens
- Certificates
- TOTP secrets
- Encrypted backups

Generate with:

```bash
openssl rand -hex 32
```

## IMPORTANT

This is the most important value in your Keyanu installation.

If this key is:

- Lost
- Deleted
- Changed

all previously encrypted data becomes permanently unreadable.

There is **no recovery mechanism**.

Store this key safely before saving any credentials.

---

# Back Up Your Keys

Store both keys outside of your Unraid server.

Recommended locations include:

- A password manager
- An encrypted offline backup
- Secure physical storage

Your Appdata backup does **not** contain these keys.

Without the original keys, encrypted data cannot be restored.

---

# Administrator Account

| Field | Description |
| ------ | ----------- |
| `ADMIN_USERNAME` | Initial administrator username |
| `ADMIN_PASSWORD` | Temporary administrator password |

After the first login you will be required to choose a new administrator password.

---

# Advanced Settings

Normally these values should not be changed.

| Variable | Default |
| -------- | ------- |
| `DATA_DIR` | `/data` |
| `DEFAULT_SESSION_TIMEOUT_MINUTES` | `720` |
| `ENVIRONMENT` | `production` |

---

# Network

The default Docker **bridge** network is recommended for almost every installation.

There is normally no reason to use Host, Macvlan or Ipvlan networking.

Advanced users may choose a dedicated Docker bridge network if additional container isolation is required.

---

# Accessing Keyanu

After the container starts, open:

```
http://<UNRAID-IP>:8420
```

Sign in using the administrator credentials you configured.

You will immediately be prompted to choose a new administrator password.

---

# Updating

Update Keyanu like any other Docker container on Unraid by pulling the latest image from Docker Hub.

Your data remains inside the Appdata folder.

---

# Backups

## Unraid Appdata Backup

Back up:

```
/mnt/user/appdata/keyanu
```

This preserves:

- Database
- Uploaded files
- Application data

## Keyanu Backup

Keyanu also includes its own encrypted backup and restore feature.

Both backup methods require the original `ENCRYPTION_KEY` to restore encrypted data.

---

# Support

GitHub

https://github.com/ngfblog/keyanu

Issues

https://github.com/ngfblog/keyanu/issues

Docker Hub

https://hub.docker.com/r/nirgf/keyanu
