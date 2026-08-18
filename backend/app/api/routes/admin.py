"""
Administration & System Management routes.

All endpoints require the admin role (see deps.get_current_admin) and reuse the
existing JWT auth + User model — no new auth system. Only genuinely supported
capabilities live here: user management, role/status changes, password reset,
platform counts, real uptime, and live health checks against the services we
actually run. Features with no backend (audit logs, backups, sessions, failed
logins, announcements, settings persistence) are intentionally absent and shown
as "Planned Module" / "Not Available" in the UI.
"""

import logging
import secrets
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.config import settings
from app.core.security import hash_password
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.incident import Incident

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])


# ---- schemas -------------------------------------------------------------

class AdminUser(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str | None
    role: UserRole
    is_active: bool
    last_login: datetime | None
    created_at: datetime | None

    model_config = {"from_attributes": True}


class RoleUpdate(BaseModel):
    role: UserRole


class StatusUpdate(BaseModel):
    is_active: bool


# ---- overview ------------------------------------------------------------

@router.get("/overview")
def overview(db: Session = Depends(get_db)):
    from app.main import STARTED_AT

    role_rows = db.query(User.role, func.count(User.id)).group_by(User.role).all()
    by_role = {r.value: 0 for r in UserRole}
    for role, count in role_rows:
        by_role[role.value if hasattr(role, "value") else role] = count

    total_users = db.query(func.count(User.id)).scalar() or 0
    total_investigations = db.query(func.count(Incident.id)).scalar() or 0

    uptime_seconds = int((datetime.now(timezone.utc) - STARTED_AT).total_seconds())

    return {
        "citizens": by_role.get("citizen", 0),
        "police": by_role.get("police", 0),
        "admins": by_role.get("admin", 0),
        "total_users": total_users,
        "total_investigations": total_investigations,
        "uptime_seconds": uptime_seconds,
        "started_at": STARTED_AT.isoformat(),
        # Active sessions require server-side session tracking; JWT is stateless.
        "active_sessions": None,
    }


# ---- user management -----------------------------------------------------

@router.get("/users", response_model=list[AdminUser])
def list_users(
    db: Session = Depends(get_db),
    search: str | None = Query(None),
    role: UserRole | None = None,
):
    query = db.query(User)
    if role is not None:
        query = query.filter(User.role == role)
    if search:
        like = f"%{search}%"
        query = query.filter((User.email.ilike(like)) | (User.full_name.ilike(like)))
    return query.order_by(User.created_at.desc().nullslast()).all()


@router.patch("/users/{user_id}/role", response_model=AdminUser)
def change_role(user_id: uuid.UUID, payload: RoleUpdate, db: Session = Depends(get_db),
                admin: User = Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id and payload.role != UserRole.admin:
        raise HTTPException(status_code=400, detail="You cannot remove your own admin role")
    user.role = payload.role
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/status", response_model=AdminUser)
def change_status(user_id: uuid.UUID, payload: StatusUpdate, db: Session = Depends(get_db),
                  admin: User = Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id and not payload.is_active:
        raise HTTPException(status_code=400, detail="You cannot disable your own account")
    user.is_active = payload.is_active
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/{user_id}/reset-password")
def reset_password(user_id: uuid.UUID, db: Session = Depends(get_db)):
    """
    Generates a random temporary password, stores its hash, and returns the
    plaintext ONCE so the administrator can convey it to the user. There is no
    email delivery, so this is the honest mechanism available today.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    temp = secrets.token_urlsafe(9)
    user.hashed_password = hash_password(temp)
    db.add(user)
    db.commit()
    return {"user_id": str(user.id), "temporary_password": temp}


@router.post("/users/{user_id}/reset-mfa")
def reset_mfa(user_id: uuid.UUID, db: Session = Depends(get_db)):
    """
    Clears an officer's two-factor enrollment — the recovery path for a lost or
    replaced phone. The officer keeps their password and is required to enrol a
    new authenticator the next time they sign in, so this weakens nothing
    permanently. Also clears any active lockout.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    user.mfa_enabled = False
    user.totp_secret = None
    user.failed_login_attempts = 0
    user.locked_until = None
    db.add(user)
    db.commit()

    logging.getLogger("cybershield.auth").info("mfa reset by administrator for %s", user.email)
    return {"user_id": str(user.id), "mfa_enabled": False, "unlocked": True}


@router.post("/users/{user_id}/unlock")
def unlock_account(user_id: uuid.UUID, db: Session = Depends(get_db)):
    """Clears a failed-attempt lockout without touching the password or 2FA."""
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    user.failed_login_attempts = 0
    user.locked_until = None
    db.add(user)
    db.commit()
    return {"user_id": str(user.id), "unlocked": True}


# ---- system health -------------------------------------------------------

def _now_iso():
    return datetime.now(timezone.utc).isoformat()


@router.get("/health")
def system_health(db: Session = Depends(get_db)):
    services = []

    # FastAPI — if this handler runs, the API is up.
    services.append({"name": "FastAPI API", "status": "healthy", "state": "Responding", "last_check": _now_iso()})

    # PostgreSQL
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        services.append({"name": "PostgreSQL", "status": "healthy", "state": "Connected", "last_check": _now_iso()})
    except Exception as e:
        services.append({"name": "PostgreSQL", "status": "unavailable", "state": str(e)[:80], "last_check": _now_iso()})

    # Neo4j
    try:
        from app.db.graph import get_driver
        get_driver().verify_connectivity()
        services.append({"name": "Neo4j", "status": "healthy", "state": "Connected", "last_check": _now_iso()})
    except Exception as e:
        services.append({"name": "Neo4j", "status": "unavailable", "state": str(e)[:80], "last_check": _now_iso()})

    # Gemini — reports configuration state (a live call is avoided to save quota).
    if settings.GEMINI_API_KEY:
        services.append({"name": "Gemini AI", "status": "healthy", "state": "Configured", "last_check": _now_iso()})
    else:
        services.append({"name": "Gemini AI", "status": "unavailable", "state": "No API key configured", "last_check": _now_iso()})

    # Authentication — part of this API surface.
    services.append({"name": "Authentication", "status": "healthy", "state": "JWT enabled", "last_check": _now_iso()})

    return {
        "services": services,
        "checked_at": _now_iso(),
        "token_expiry_minutes": settings.ACCESS_TOKEN_EXPIRE_MINUTES,
    }
