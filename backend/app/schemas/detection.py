import uuid
from pydantic import BaseModel

from app.models.incident import IncidentType, ThreatLevel


class DetectRequest(BaseModel):
    type: IncidentType
    content: str  # the URL / email body / SMS text / QR payload


class HeuristicHit(BaseModel):
    points: int
    reason: str


class ScanRequest(BaseModel):
    url: str


class ScanResponse(BaseModel):
    url: str
    risk_score: float
    threat_level: ThreatLevel
    heuristics_triggered: list[HeuristicHit]


class DetectResponse(BaseModel):
    incident_id: uuid.UUID
    risk_score: float
    threat_level: ThreatLevel
    ml_base_score: float
    heuristics_triggered: list[HeuristicHit]
    page_fetched: bool
    explanation: str


class InvestigateResponse(BaseModel):
    incident_id: uuid.UUID
    domain: str
    whois: dict
    dns: dict
    ssl: dict
    geolocation: dict | None
    red_flags: list[str]


class GraphConnectionsResponse(BaseModel):
    entity_type: str
    entity_value: str
    connections: list[dict]
