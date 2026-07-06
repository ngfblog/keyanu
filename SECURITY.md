# Security Policy

Keyanu stores infrastructure credentials — SSH keys, passwords, API
tokens, certificates. Security issues are taken seriously and prioritized
over everything else, including new features.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Use GitHub's private vulnerability reporting instead:

1. Go to the [Security tab](https://github.com/nirgf/keyanu/security) of
   this repository.
2. Click **Report a vulnerability**.
3. Describe the issue, including steps to reproduce and, if possible, the
   affected version.

This opens a private advisory visible only to the maintainer and you,
until a fix is ready to disclose responsibly.

If you're unable to use GitHub's private reporting for any reason, open a
regular issue asking for an alternative contact method — without
including any vulnerability details in that issue.

## What to expect

- Acknowledgement of your report as soon as reasonably possible.
- An assessment of severity and, for confirmed issues, a fix targeted for
  the next release.
- Credit in the release notes, if you'd like it (let us know your
  preference when reporting).

## Supported versions

Keyanu is pre-1.0 and under active development. Only the latest released
version is supported with security fixes; there is no long-term-support
branch at this stage.

| Version | Supported |
|---|---|
| Latest (`nirgf/keyanu:latest`) | ✅ |
| Older tagged releases | ❌ |

## Security model, in brief

Full detail lives in the root [README.md](README.md#security-model-v1).
The short version, relevant to anyone evaluating this project's security
posture:

- Single user in v1 — no role-based access control yet. Don't expose
  Keyanu directly to the internet; put it behind a VPN (Tailscale,
  WireGuard) or a reverse proxy with its own auth layer.
- Sessions are server-side; the client only ever holds an opaque session
  token, never credentials or claims.
- Every credential secret, TOTP secret, and backup export is encrypted at
  rest with a key derived from `ENCRYPTION_KEY`. **This key cannot be
  rotated after data exists** — losing it or changing it makes existing
  encrypted data permanently unreadable. This is a deliberate design
  tradeoff (no key-rotation machinery exists yet), not an oversight —
  back it up outside of your regular appdata backups the moment you
  generate it.
- Optional TOTP two-factor authentication with single-use, bcrypt-hashed
  recovery codes.
- Every create/update/delete/secret-reveal is written to an audit log.

## Dependencies

Keyanu has no runtime dependency on any third-party API or telemetry
service — it does not call out to Anthropic, GitHub, or anywhere else
during normal operation. (An earlier draft of an "update check" feature
that would have called the GitHub API was deliberately removed before
release — see CHANGELOG.md — since it wasn't justified by a real product
need.) All data stays on your own server.
