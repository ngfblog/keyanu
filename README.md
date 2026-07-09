<p align="center">
  <img src="https://raw.githubusercontent.com/ngfblog/keyanu/main/unraid/icon.png" width="96" height="96" alt="Keyanu">
</p>

<h1 align="center">Keyanu</h1>

<p align="center">
  <strong>Secure self-hosted infrastructure credential manager</strong><br>
  Store passwords, SSH keys, API tokens, certificates and secure notes in one encrypted application.
</p>

<p align="center">
  <a href="https://github.com/ngfblog/keyanu/releases"><img src="https://img.shields.io/github/v/release/ngfblog/keyanu" alt="Latest Release"></a>
  <a href="https://github.com/ngfblog/keyanu/actions/workflows/ci.yml"><img src="https://github.com/ngfblog/keyanu/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://img.shields.io/docker/pulls/nirgf/keyanu"><img src="https://img.shields.io/docker/pulls/nirgf/keyanu" alt="Docker Pulls"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/ngfblog/keyanu" alt="License"></a>
</p>

---

# What is Keyanu?

Keyanu is a self-hosted infrastructure credential manager designed for homelabs, system administrators, DevOps engineers and IT professionals.

Instead of storing infrastructure credentials across password managers, text files and notes, Keyanu keeps everything securely encrypted in a single application designed specifically for infrastructure management.

Keyanu securely stores:

- Passwords
- SSH keys
- API tokens
- Certificates
- TOTP secrets
- Secure notes
- File attachments

---

# Features

- Secure encrypted credential storage
- Workspaces
- Systems
- Password management
- SSH key management
- API token storage
- Certificate management
- Secure notes
- File attachments
- Global search
- Audit log
- Built-in encrypted backup and restore
- Server-side sessions
- TOTP two-factor authentication
- Recovery codes
- Dark, Light and System themes
- Docker-first deployment
- Single-container architecture

---

# Quick Start

```bash
docker run -d \
  --name keyanu \
  -p 8420:8420 \
  -v ./data:/data \
  -e SECRET_KEY="<generate>" \
  -e ENCRYPTION_KEY="<generate>" \
  -e ADMIN_USERNAME="admin" \
  -e ADMIN_PASSWORD="ChangeMe!" \
  nirgf/keyanu:latest
```

Open:

```text
http://localhost:8420
```

---

# Cryptographic Keys

Keyanu requires **two different cryptographic keys**.

Generate each key separately:

```bash
openssl rand -hex 32
```

Run the command twice.

Do **not** use the same value for both keys.

## SECRET_KEY

Used to protect:

- Authenticated user sessions
- Internal authentication
- Security tokens

Changing this key invalidates active sessions.

---

## ENCRYPTION_KEY

Used to encrypt:

- Passwords
- SSH keys
- API tokens
- Certificates
- TOTP secrets
- Encrypted backups

### IMPORTANT

`ENCRYPTION_KEY` is the most important value in your Keyanu installation.

If this key is:

- Lost
- Deleted
- Changed

all encrypted data becomes permanently unreadable.

There is **no recovery mechanism**.

Back up both keys before storing any credentials.

---

# Backups

Always back up:

- Your Keyanu Appdata directory
- `SECRET_KEY`
- `ENCRYPTION_KEY`

Restoring Appdata without the original keys will **not** restore encrypted data.

---

# Unraid

An official Unraid template is included.

See:

**[Unraid Installation Guide](unraid/README.md)**

Template:

```text
unraid/keyanu.xml
```

---

# Security

Keyanu is designed around a simple security model:

- Server-side sessions
- Encrypted secrets at rest
- Audit logging
- Optional TOTP
- Recovery codes
- No telemetry
- No runtime dependency on external services

For more information see:

**[SECURITY.md](SECURITY.md)**

---

# Documentation

| Document | Description |
|----------|-------------|
| [README.md](README.md) | Project overview |
| [Unraid Guide](unraid/README.md) | Unraid installation |
| [SECURITY.md](SECURITY.md) | Security policy |
| [CHANGELOG.md](CHANGELOG.md) | Release history |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contributing guide |

# Support

- **GitHub:** https://github.com/ngfblog/keyanu
- **Docker Hub:** https://hub.docker.com/r/nirgf/keyanu
- **Issues:** https://github.com/ngfblog/keyanu/issues
## ❤️ Support

If my projects have helped you or saved you time, please consider supporting future development.

👉 https://paypal.me/ShopNGF

Every contribution helps improve Keyanu and other open-source projects.

---

# License

Released under the MIT License.

See the LICENSE file for details.
