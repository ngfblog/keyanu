# Security Policy

Keyanu stores infrastructure credentials including SSH keys, passwords, API tokens, certificates and other sensitive data. Security issues are treated as the highest priority and take precedence over new features.

---

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Use GitHub's private vulnerability reporting instead:

1. Open the Keyanu repository on GitHub.
2. Click the **Security** tab.
3. Click **Report a vulnerability**.
4. Provide a detailed description, reproduction steps and the affected version, if known.

Your report will remain private between you and the maintainer until a fix is available and ready for responsible disclosure.

If GitHub private reporting is unavailable for any reason, open a regular GitHub issue requesting an alternative contact method **without including any vulnerability details**.

---

## What to Expect

- Acknowledgement of your report as soon as reasonably possible.
- Initial assessment of severity and impact.
- A fix targeted for the next appropriate release, when applicable.
- Credit in the release notes if you would like to be acknowledged.

---

## Supported Versions

Keyanu is currently under active development.

Only the latest released version receives security fixes.

| Version | Supported |
|----------|-----------|
| Latest release | ✅ |
| Older releases | ❌ |

---

## Security Model

See the project's [README.md](README.md) for a general overview of Keyanu.

### Summary

- Keyanu currently supports a single administrator account. Multi-user access and role-based permissions are planned for future releases.
- Do **not** expose Keyanu directly to the public Internet. Use a VPN such as Tailscale or WireGuard, or place it behind a reverse proxy with its own authentication layer.
- Sessions are stored server-side. The client only stores an opaque session identifier and never receives credentials or authentication claims.
- Every password, SSH key, API token, certificate, TOTP secret and encrypted backup is protected using a key derived from `ENCRYPTION_KEY`.
- Generate separate values for `SECRET_KEY` and `ENCRYPTION_KEY`.
- Back up both `SECRET_KEY` and `ENCRYPTION_KEY` before storing any credentials.
- Losing or changing `ENCRYPTION_KEY` after encrypted data has been created permanently makes existing data unreadable. There is no recovery mechanism.
- Optional TOTP two-factor authentication with bcrypt-hashed recovery codes.
- Every credential creation, update, deletion and secret reveal is recorded in the audit log.

---

## Dependencies

Keyanu has no runtime dependency on external APIs or telemetry services during normal operation.

It does not communicate with GitHub, Anthropic or any other third-party service while running.

All credentials and application data remain on your own server.
