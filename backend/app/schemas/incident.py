"""Pydantic schemas for reading incidents (dashboard/feed use, not detection)."""

import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.incident import IncidentType, ThreatLevel


class IncidentSummary(BaseModel):
    """Lightweight shape for list views — omits large fields like investigation_data."""

    id: uuid.UUID
    incident_type: IncidentType
    raw_content: str
    risk_score: float | None
    threat_level: ThreatLevel | None
    created_at: datetime

    model_config = {"from_attributes": True}


class IncidentDetail(IncidentSummary):
    """Full shape for a single incident view — includes everything."""

    ai_explanation: str | None
    investigation_data: dict | None
    report_url: str | None

    model_config = {"from_attributes": True}


class IncidentListResponse(BaseModel):
    items: list[IncidentSummary]
    total: int
    page: int
    page_size: int


class ThreatLevelCount(BaseModel):
    threat_level: str
    count: int


class IncidentTypeCount(BaseModel):
    incident_type: str
    count: int


class DailyCount(BaseModel):
    date: str
    count: int


class StatsResponse(BaseModel):
    total_incidents: int
    by_threat_level: list[ThreatLevelCount]
    by_type: list[IncidentTypeCount]
    daily_counts: list[DailyCount]
    average_risk_score: float
