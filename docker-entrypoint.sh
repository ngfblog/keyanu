#!/bin/bash
set -e

echo "[keyanu] Running database migrations..."
cd /app/backend
alembic upgrade head

echo "[keyanu] Starting API server (127.0.0.1:8000, internal only)..."
uvicorn app.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

echo "[keyanu] Starting web server (0.0.0.0:8420)..."
nginx -g "daemon off;" &
NGINX_PID=$!

# If either process dies, stop the container so Docker's restart policy
# (or an orchestrator watching the healthcheck) can bring it back cleanly,
# rather than limping along with only half the app working.
trap 'kill -TERM $BACKEND_PID $NGINX_PID 2>/dev/null' TERM INT

wait -n "$BACKEND_PID" "$NGINX_PID"
EXIT_CODE=$?

echo "[keyanu] One of the processes exited (code $EXIT_CODE), shutting down..."
kill -TERM $BACKEND_PID $NGINX_PID 2>/dev/null
wait
exit $EXIT_CODE
