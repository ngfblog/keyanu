# Contributing to Keyanu

Thanks for considering a contribution. Keyanu is a young, single-maintainer
project — please open an issue to discuss anything nontrivial before
sending a large pull request, so we don't cross wires on direction.

## Ways to contribute

- **Bug reports** — use the [Bug Report](.github/ISSUE_TEMPLATE/bug_report.yml) template.
- **Feature requests** — use the [Feature Request](.github/ISSUE_TEMPLATE/feature_request.yml) template.
- **Security vulnerabilities** — do **not** open a public issue. See
  [SECURITY.md](SECURITY.md).
- **Pull requests** — welcome for bug fixes, tests, and documentation. For
  new features, please open an issue first (see above).

## Development setup

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env   # local dev only, see .env.example for details
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Run the test suite before opening a PR:

```bash
pytest -v
```

All new backend behavior should have test coverage in `backend/tests/`.
The suite runs the real FastAPI app end-to-end over HTTP against an
isolated SQLite database — see existing tests for the pattern.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Before opening a PR, confirm the production build is clean:

```bash
npm run build
```

This runs `tsc --noEmit` followed by `vite build` — both must succeed
with zero errors.

### Full stack (Docker Compose)

```bash
docker compose up -d --build
```

This is the local-development setup (two containers, live rebuilds). It
is not the production deployment path — see the root README for that
(single image, `nirgf/keyanu:latest`).

## Code conventions

- **Backend**: FastAPI + SQLAlchemy 2.0 + Pydantic v2. Routes stay thin;
  business logic lives in `app/crud/`. Any new database column needs an
  Alembic migration with an explicit `server_default` if it's `NOT NULL`
  (SQLite tables with existing rows will otherwise fail to migrate — see
  any existing migration under `backend/alembic/versions/` for the
  pattern).
- **Frontend**: React + TypeScript, function components only. Only ever
  use the semantic Tailwind tokens already defined in
  `tailwind.config.js` (`bg-base`, `text-ink`, `border-border`, etc.) —
  never raw colors or Tailwind's default gray-scale classes. This is
  what makes the Dark/Light/System theme system work correctly without
  per-component changes; introducing a raw color bypasses it silently.
- **Secrets**: never log credential values, TOTP secrets, or recovery
  codes. Any new sensitive field should be encrypted with the existing
  `encrypt_secret` / `decrypt_secret` helpers in `app/core/security.py`
  (same `ENCRYPTION_KEY`-derived Fernet cipher used everywhere else) —
  don't introduce a second encryption mechanism.

## Commit messages

Plain, descriptive commit messages. No enforced format, but please
explain *why* for anything non-obvious, not just *what*.

## Pull request checklist

- [ ] `pytest -v` passes (backend changes)
- [ ] `npm run build` passes with zero errors (frontend changes)
- [ ] New behavior has test coverage
- [ ] Documentation updated if behavior, configuration, or deployment
      changed (README.md / CHANGELOG.md / ROADMAP.md as applicable)
- [ ] No secrets, tokens, or personal data committed

## License

By contributing, you agree that your contributions will be licensed
under the project's [MIT License](LICENSE).
