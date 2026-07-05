import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    audit,
    auth,
    credentials,
    files,
    meta,
    notes,
    resources,
    security as security_routes,
    settings as settings_routes,
    workspaces,
)
from app.core.config import settings
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import User  # noqa: F401 ensures all models are registered on Base.metadata

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("keyanu")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    # Create tables if they do not exist yet. Alembic remains the source of
    # truth for schema migrations in upgrade scenarios; this call is a
    # convenience for first-run/dev environments and is idempotent.
    Base.metadata.create_all(bind=engine)
    _bootstrap_admin_user()


def _bootstrap_admin_user() -> None:
    from app.crud import crud_user

    db = SessionLocal()
    try:
        if crud_user.count_users(db) == 0:
            crud_user.create_user(
                db,
                username=settings.ADMIN_USERNAME,
                password=settings.ADMIN_PASSWORD,
                display_name="Administrator",
                must_change_password=True,
            )
            logger.info(
                "Bootstrapped initial admin user '%s' (must change password on first login)",
                settings.ADMIN_USERNAME,
            )
    finally:
        db.close()


@app.get("/api/health", tags=["health"])
def health_check() -> dict:
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}


app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(workspaces.router, prefix=settings.API_V1_PREFIX)
app.include_router(resources.router, prefix=settings.API_V1_PREFIX)
app.include_router(credentials.router, prefix=settings.API_V1_PREFIX)
app.include_router(notes.router, prefix=settings.API_V1_PREFIX)
app.include_router(files.router, prefix=settings.API_V1_PREFIX)
app.include_router(audit.router, prefix=settings.API_V1_PREFIX)
app.include_router(meta.router, prefix=settings.API_V1_PREFIX)
app.include_router(settings_routes.router, prefix=settings.API_V1_PREFIX)
app.include_router(security_routes.router, prefix=settings.API_V1_PREFIX)
