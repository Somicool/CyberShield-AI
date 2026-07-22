"""
Complaint model — citizen-submitted cybercrime reports.

Distinct from `Incident` (which is a detection record created by the scanning
pipeline): a Complaint is a human report filed by a citizen through the Citizen
Portal. A complaint MAY be linked to an Incident when the report includes
something scannable (a URL / email / SMS), so the citizen sees an AI summary
alongside their report — reusing the existing detection services rather than
duplicating logic.

`status` follows a simple citizen-facing lifecycle: submitted -> under_review
-> resolved. Officers move complaints along; the field is stored here so the
citizen can track progress.
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Enum, Float, Text
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


class ComplaintStatus(str, enum.Enum):
    submitted = "submitted"
    under_review = "under_review"
    resolved = "resolved"


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reference = Column(String, unique=True, index=True, nullable=False)  # human-friendly, e.g. CMP-2026-A1B2C3

    reported_by = Column(UUID(as_uuid=True), nullable=True)  # users.id of the citizen

    category = Column(String, nullable=False)  # Suspicious Website / Phishing Email / ...
    description = Column(Text, nullable=False)
    url = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    attachment_name = Column(String, nullable=True)  # reference to an uploaded file (name only)

    status = Column(Enum(ComplaintStatus), default=ComplaintStatus.submitted, nullable=False)

    # Optional AI detection summary, populated when the report includes a
    # scannable artifact — reuses the existing detection services.
    incident_id = Column(UUID(as_uuid=True), nullable=True)
    risk_score = Column(Float, nullable=True)
    threat_level = Column(String, nullable=True)
    ai_summary = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
