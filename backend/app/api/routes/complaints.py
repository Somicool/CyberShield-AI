"""
Citizen complaints routes.

Citizens file cybercrime reports here. When a report includes something
scannable (a URL, or email/SMS content), we run the EXISTING detection
services (app/services/detection.py) to attach an AI risk summary and create a
linked Incident — reusing the detection pipeline rather than duplicating it.

Access model (reuses the existing JWT/role dependencies):
- create / list-mine / read-own: any authenticated user (citizens).
- status updates + list-all: police/admin (officers triage complaints).
"""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_current_police
from app.db.session import get_db, SessionLocal
from app.models.complaint import Complaint, ComplaintStatus
from app.models.incident import Incident, IncidentType
from app.models.user import User
from app.schemas.complaint import ComplaintCreate, ComplaintOut, ComplaintStatusUpdate
from app.services.detection import detect_url, detect_text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/complaints", tags=["complaints"])


def _make_reference() -> str:
    year = datetime.now(timezone.utc).year
    return f"CMP-{year}-{uuid.uuid4().hex[:6].upper()}"


# Categories that hint the report is about email / SMS text, so we can scan the
# description as text when no URL is supplied.
_EMAIL_CATEGORIES = {"Phishing Email"}
_SMS_CATEGORIES = {"SMS Scam"}


def _pick_scan_target(payload: ComplaintCreate):
    """Decide what (if anything) about a complaint is scannable by detection."""
    if payload.url and payload.url.strip():
        return IncidentType.url, payload.url.strip()
    if payload.category in _EMAIL_CATEGORIES and payload.description.strip():
        return IncidentType.email, payload.description.strip()
    if payload.category in _SMS_CATEGORIES and payload.description.strip():
        return IncidentType.sms, payload.description.strip()
    return None, None


def _run_detection_and_update(complaint_id: uuid.UUID, detect_type: IncidentType, content: str, user_id):
    """
    Background job: runs the (potentially slow, network-bound) detection
    pipeline AFTER the complaint has already been saved and the response
    returned, then writes the AI summary back onto the complaint. Uses its own
    DB session because the request session is long gone by the time this runs.

    This is the key fix for "the report never submits": detection performs live
    URL fetches that can hang, so it must never block complaint creation.
    """
    db = SessionLocal()
    try:
        if detect_type == IncidentType.url:
            result = detect_url(content)
            investigation_data = {
                "ml_base_score": result["ml_base_score"],
                "ml_phishing_probability": result["ml_phishing_probability"],
                "heuristics_triggered": result["heuristics_triggered"],
                "page_fetched": result["page_fetched"],
                "source": "citizen_complaint",
            }
        else:
            result = detect_text(content)
            investigation_data = {
                "ml_base_score": result["ml_base_score"],
                "ml_scam_probability": result["ml_scam_probability"],
                "heuristics_triggered": result["heuristics_triggered"],
                "embedded_urls": result["embedded_urls"],
                "source": "citizen_complaint",
            }

        incident = Incident(
            incident_type=detect_type,
            raw_content=content,
            risk_score=result["risk_score"],
            threat_level=result["threat_level"],
            ai_explanation=result["explanation"],
            investigation_data=investigation_data,
            reported_by=user_id,
        )
        db.add(incident)
        db.commit()
        db.refresh(incident)

        complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
        if complaint:
            complaint.incident_id = incident.id
            complaint.risk_score = result["risk_score"]
            complaint.threat_level = result["threat_level"].value
            complaint.ai_summary = result["explanation"]
            complaint.updated_at = datetime.now(timezone.utc)
            db.add(complaint)
            db.commit()
    except Exception:
        db.rollback()
        logger.exception("Background detection for complaint %s failed", complaint_id)
    finally:
        db.close()


@router.post("", response_model=ComplaintOut, status_code=status.HTTP_201_CREATED)
def create_complaint(
    payload: ComplaintCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Save the complaint immediately so the citizen always gets an instant
    # Complaint ID — detection runs afterwards in the background.
    complaint = Complaint(
        reference=_make_reference(),
        reported_by=user.id,
        category=payload.category,
        description=payload.description,
        url=payload.url,
        email=payload.email,
        phone=payload.phone,
        notes=payload.notes,
        attachment_name=payload.attachment_name,
        status=ComplaintStatus.submitted,
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    detect_type, content = _pick_scan_target(payload)
    if detect_type and content:
        background_tasks.add_task(_run_detection_and_update, complaint.id, detect_type, content, user.id)

    return complaint


@router.get("/mine", response_model=list[ComplaintOut])
def list_my_complaints(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (
        db.query(Complaint)
        .filter(Complaint.reported_by == user.id)
        .order_by(Complaint.created_at.desc())
        .all()
    )
    return rows


@router.get("/{complaint_id}", response_model=ComplaintOut)
def get_complaint(complaint_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if complaint is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    # Owner can read their own; police/admin can read any.
    from app.models.user import UserRole
    if complaint.reported_by != user.id and user.role not in (UserRole.police, UserRole.admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this complaint")
    return complaint


@router.patch("/{complaint_id}/status", response_model=ComplaintOut)
def update_status(
    complaint_id: uuid.UUID,
    payload: ComplaintStatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_police),
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if complaint is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    complaint.status = payload.status
    complaint.updated_at = datetime.now(timezone.utc)
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return complaint
