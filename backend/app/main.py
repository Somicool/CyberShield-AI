"""
FastAPI application entrypoint.

Table creation: we use Base.metadata.create_all() for the hackathon instead
of a migration tool like Alembic. Alembic is the "right" long-term choice,
but for a 10-day MVP where the schema will still be shifting daily, migrations
add overhead with no payoff — create_all() just makes sure tables exist and
is idempotent (safe to run every startup).
"""

import logging
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.db.session import Base, engine

# Import models so their tables are registered on Base.metadata before create_all()
from app.models import user, incident, audit, complaint  # noqa: F401

from app.api.routes import health, auth, detection, incidents, copilot, admin, crimegpt, complaints

app = FastAPI(title=settings.APP_NAME)

# Process start time — used to report real system uptime in the admin panel.
STARTED_AT = datetime.now(timezone.utc)

# CORS: wide open for hackathon dev (frontend on a different port, extension
# origin). Tighten this before any real deployment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(detection.router)
app.include_router(incidents.router)
app.include_router(copilot.router)
app.include_router(admin.router)
app.include_router(crimegpt.router)
app.include_router(complaints.router)


# Lightweight, idempotent column additions for the admin panel. create_all()
# only creates missing tables — it won't add new columns to an existing
# `users` table — so we add them explicitly here (Postgres IF NOT EXISTS makes
# this safe to run on every startup). This is a pragmatic stand-in for Alembic.
_COLUMN_MIGRATIONS = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP",
]


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    try:
        with engine.begin() as conn:
            for stmt in _COLUMN_MIGRATIONS:
                conn.execute(text(stmt))
    except Exception:
        logging.getLogger(__name__).exception("Column migration step failed")


@app.get("/")
def root():
    return {"message": f"{settings.APP_NAME} API is running"}
