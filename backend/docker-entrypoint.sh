#!/bin/sh
set -e

echo "[keyanu] Running database migrations..."
alembic upgrade head

echo "[keyanu] Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
