"""
Detection routes.

Only `type: "url"` is implemented today (Day 2). Email/SMS text detection
and QR decoding land Day 3 — routing them here now would mean silently
returning a wrong/fake score, so we return a clear 501 instead.
"""

import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_optional
from app.db.session import get_db
from app.models.incident import Incident, IncidentType
from app.models.user import User
from app.schemas.detection import DetectRequest, DetectResponse, InvestigateResponse, GraphConnectionsResponse, ScanRequest, ScanResponse
from app.services.detection import detect_url, detect_text, scan_url
from app.services.investigation import investigate_url
from app.services.graph import push_incident_to_graph, get_connected_entities

router = APIRouter(prefix="/api/detect", tags=["detection"])


def _graph_push_safe(incident_id: str, incident_type: str, domain: str | None, content: str):
    """Push an incident to the threat graph, swallowing any Neo4j errors.
    Runs as a background task so a slow/unreachable Neo4j never delays the
    user-facing detection response."""
    try:
        push_incident_to_graph(incident_id, incident_type, domain, content)
    except Exception:
        logging.getLogger(__name__).exception("Failed to push incident to graph")


@router.post("", response_model=DetectResponse)
def detect(
    payload: DetectRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    if payload.type == IncidentType.url:
        result = detect_url(payload.content)
        investigation_data = {
            "ml_base_score": result["ml_base_score"],
            "ml_phishing_probability": result["ml_phishing_probability"],
            "heuristics_triggered": result["heuristics_triggered"],
            "page_fetched": result["page_fetched"],
        }
    elif payload.type in (IncidentType.email, IncidentType.sms):
        result = detect_text(payload.content)
        investigation_data = {
            "ml_base_score": result["ml_base_score"],
            "ml_scam_probability": result["ml_scam_probability"],
            "heuristics_triggered": result["heuristics_triggered"],
            "embedded_urls": result["embedded_urls"],
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=f"Detection for type '{payload.type.value}' isn't implemented yet (QR decoding coming Day 10)",
        )

    incident = Incident(
        incident_type=payload.type,
        raw_content=payload.content,
        risk_score=result["risk_score"],
        threat_level=result["threat_level"],
        ai_explanation=result["explanation"],
        investigation_data=investigation_data,
        reported_by=current_user.id if current_user else None,
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    domain = None
    if payload.type == IncidentType.url:
        from urllib.parse import urlparse
        domain = urlparse(payload.content if "://" in payload.content else f"http://{payload.content}").netloc

    # Push to the threat graph in the background — never block the response on
    # Neo4j (supporting infrastructure, not core detection).
    background_tasks.add_task(_graph_push_safe, str(incident.id), payload.type.value, domain, payload.content)

    return DetectResponse(
        incident_id=incident.id,
        risk_score=result["risk_score"],
        threat_level=result["threat_level"],
        ml_base_score=result["ml_base_score"],
        heuristics_triggered=result["heuristics_triggered"],
        page_fetched=result.get("page_fetched", False),
        explanation=result["explanation"],
    )


@router.post("/scan", response_model=ScanResponse)
def scan(payload: ScanRequest):
    """
    Fast, non-persisting URL risk check used by the CyberShield Guardian
    browser extension for real-time protection. No incident is created.
    """
    result = scan_url(payload.url)
    return ScanResponse(
        url=payload.url,
        risk_score=result["risk_score"],
        threat_level=result["threat_level"],
        heuristics_triggered=result["heuristics_triggered"],
    )


@router.post("/{incident_id}/investigate", response_model=InvestigateResponse)
def investigate(incident_id: uuid.UUID, db: Session = Depends(get_db)):
    """
    Runs the Investigation Agent (WHOIS/DNS/SSL) against an existing
    incident's URL and merges the results into investigation_data.

    Only makes sense for URL incidents right now — email/SMS incidents
    don't have a single domain to investigate directly (though embedded
    URLs within them do; investigating those individually is a natural
    follow-up, not built yet).
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    if incident.incident_type != IncidentType.url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Investigation currently only supports URL incidents",
        )

    result = investigate_url(incident.raw_content)

    updated_data = dict(incident.investigation_data or {})
    updated_data["investigation"] = {
        "whois": result["whois"],
        "dns": result["dns"],
        "ssl": result["ssl"],
        "geolocation": result["geolocation"],
        "red_flags": result["red_flags"],
    }
    incident.investigation_data = updated_data
    db.add(incident)
    db.commit()

    return InvestigateResponse(
        incident_id=incident.id,
        domain=result["domain"],
        whois=result["whois"],
        dns=result["dns"],
        ssl=result["ssl"],
        geolocation=result["geolocation"],
        red_flags=result["red_flags"],
    )


VALID_ENTITY_LABELS = {"Domain", "Email", "Phone", "Wallet", "TelegramHandle"}


@router.get("/graph/{entity_type}/{entity_value}", response_model=GraphConnectionsResponse)
def get_graph_connections(entity_type: str, entity_value: str):
    """
    Threat Intelligence Graph query: "what else is connected to this
    domain/email/phone/wallet/telegram handle, through shared incidents?"
    This is the core "discover cybercrime networks" capability.
    """
    if entity_type not in VALID_ENTITY_LABELS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"entity_type must be one of {sorted(VALID_ENTITY_LABELS)}",
        )

    result = get_connected_entities(entity_type, entity_value)
    return GraphConnectionsResponse(**result)
