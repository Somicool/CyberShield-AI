import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.complaint import ComplaintStatus


class ComplaintCreate(BaseModel):
    category: str
    description: str
    url: str | None = None
    email: str | None = None
    phone: str | None = None
    notes: str | None = None
    attachment_name: str | None = None


class ComplaintStatusUpdate(BaseModel):
    status: ComplaintStatus


class ComplaintOut(BaseModel):
    id: uuid.UUID
    reference: str
    category: str
    description: str
    url: str | None
    email: str | None
    phone: str | None
    notes: str | None
    attachment_name: str | None
    status: ComplaintStatus
    incident_id: uuid.UUID | None
    risk_score: float | None
    threat_level: str | None
    ai_summary: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
