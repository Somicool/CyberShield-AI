"""
Read-only incident routes for the dashboard: list/feed, single incident
detail, and aggregate stats for charts.

Kept separate from app/api/routes/detection.py, which handles WRITING
incidents (detect/investigate). This file only reads — a clean split
between "create a threat record" and "browse threat records".
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_police
from app.db.session import get_db
from app.models.complaint import Complaint
from app.models.incident import Incident, IncidentType, ThreatLevel
from app.models.user import User
from app.schemas.incident import (
    IncidentDetail,
    IncidentListResponse,
    IncidentSummary,
    StatsResponse,
    ThreatLevelCount,
    IncidentTypeCount,
    DailyCount,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


@router.get("", response_model=IncidentListResponse)
def list_incidents(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    threat_level: ThreatLevel | None = None,
    incident_type: IncidentType | None = None,
    search: str | None = Query(None, description="Case-insensitive substring match on raw_content"),
):
    """
    Live threat feed, newest first. Supports filtering by threat level,
    incident type, and a simple text search over the raw content — enough
    for a dashboard's search/filter bar without needing full-text search
    infrastructure for a hackathon MVP.
    """
    query = db.query(Incident)

    if threat_level is not None:
        query = query.filter(Incident.threat_level == threat_level)
    if incident_type is not None:
        query = query.filter(Incident.incident_type == incident_type)
    if search:
        query = query.filter(Incident.raw_content.ilike(f"%{search}%"))

    total = query.count()

    items = (
        query.order_by(Incident.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return IncidentListResponse(
        items=[IncidentSummary.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db), days: int = Query(14, ge=1, le=90)):
    """
    Aggregate numbers for the dashboard's analytics charts: counts by
    threat level, by incident type, a daily trend line, and the average
    risk score. `days` controls how far back the daily trend goes.
    """
    total = db.query(Incident).count()

    by_level_rows = (
        db.query(Incident.threat_level, func.count(Incident.id))
        .group_by(Incident.threat_level)
        .all()
    )
    by_level = [
        ThreatLevelCount(threat_level=level.value if level else "unknown", count=count)
        for level, count in by_level_rows
    ]

    by_type_rows = (
        db.query(Incident.incident_type, func.count(Incident.id))
        .group_by(Incident.incident_type)
        .all()
    )
    by_type = [
        IncidentTypeCount(incident_type=t.value, count=count) for t, count in by_type_rows
    ]

    since = datetime.now(timezone.utc) - timedelta(days=days)
    daily_rows = (
        db.query(func.date(Incident.created_at), func.count(Incident.id))
        .filter(Incident.created_at >= since)
        .group_by(func.date(Incident.created_at))
        .order_by(func.date(Incident.created_at))
        .all()
    )
    daily_counts = [DailyCount(date=str(d), count=count) for d, count in daily_rows]

    avg_score = db.query(func.avg(Incident.risk_score)).scalar() or 0.0

    return StatsResponse(
        total_incidents=total,
        by_threat_level=by_level,
        by_type=by_type,
        daily_counts=daily_counts,
        average_risk_score=round(float(avg_score), 2),
    )


@router.get("/{incident_id}", response_model=IncidentDetail)
def get_incident(incident_id: uuid.UUID, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    return IncidentDetail.model_validate(incident)


@router.delete("/{incident_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_incident(
    incident_id: uuid.UUID,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_police),
):
    """
    Permanently deletes a single case (incident) record.

    Restricted to police officers and administrators — case records are
    evidence, so deletion must never be available to citizens or anonymous
    callers. The action is irreversible, which is why the UI confirms first.

    Cleanup performed alongside the row delete:
    - Any citizen complaint that referenced this incident is detached
      (incident_id set to NULL) so the complaint itself survives intact
      rather than pointing at a missing record.
    - The matching Incident node is removed from the Neo4j threat graph,
      along with entities left orphaned by its removal. A graph failure is
      logged but never blocks the delete, since Postgres is the system of
      record.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    db.query(Complaint).filter(Complaint.incident_id == incident_id).update(
        {"incident_id": None}, synchronize_session=False
    )

    db.delete(incident)
    db.commit()

    logger.info("incident %s deleted by %s", incident_id, actor.email)

    try:
        from app.services.graph import delete_incident_from_graph

        delete_incident_from_graph(str(incident_id))
    except Exception:
        logger.exception("Failed to remove incident %s from the threat graph", incident_id)

    return None


@router.get("/map/points")
def get_map_points(db: Session = Depends(get_db)):
    """
    Returns lat/lon points for every URL incident that has been
    investigated (i.e. has geolocation data from its hosting IP). Feeds
    the dashboard's threat heatmap. Incidents that haven't been
    investigated yet, or whose IP couldn't be geolocated, are omitted
    rather than plotted with a fabricated location.
    """
    incidents = (
        db.query(Incident)
        .filter(Incident.incident_type == IncidentType.url)
        .filter(Incident.investigation_data.isnot(None))
        .all()
    )

    points = []
    for incident in incidents:
        geo = (incident.investigation_data or {}).get("investigation", {}).get("geolocation")
        if geo:
            points.append({
                "incident_id": str(incident.id),
                "lat": geo["lat"],
                "lon": geo["lon"],
                "country": geo.get("country"),
                "city": geo.get("city"),
                "risk_score": incident.risk_score,
                "threat_level": incident.threat_level.value if incident.threat_level else None,
                "content": incident.raw_content,
            })

    return {"points": points}
