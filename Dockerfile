# Keyanu -- single-container production image.
#
# Combines the built React frontend, the FastAPI backend, and nginx (acting
# as both static file server and reverse proxy) into one image, so
# production deployment is `docker run` with one image and one port.
#
# Build from the REPO ROOT (not from backend/ or frontend/):
#   docker build -t nirgf/keyanu:latest .

# --- Stage 1: build the frontend ------------------------------------------
FROM --platform=$BUILDPLATFORM node:20-alpine AS frontend-build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ .
RUN npm run build

# --- Stage 2: backend + nginx, single runtime image ------------------------
FROM python:3.12-slim AS final

ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION} \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx curl \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/nginx/sites-enabled/default

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install -r backend/requirements.txt

COPY backend/app ./backend/app
COPY backend/alembic ./backend/alembic
COPY backend/alembic.ini ./backend/alembic.ini

# Built frontend static assets, served directly by nginx.
COPY --from=frontend-build /app/dist /usr/share/nginx/html

# nginx serves the SPA on 8420 and reverse-proxies /api/ to the backend
# process, which listens only on 127.0.0.1 inside this same container.
COPY nginx.conf /etc/nginx/conf.d/keyanu.conf
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 8420

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8420/api/health || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
