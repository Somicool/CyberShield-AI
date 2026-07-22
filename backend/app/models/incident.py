"""
Incident model — the core record created every time Detection flags something.

Design note: `raw_content` and `investigation_data` are JSON columns rather
than fully normalized tables. For a 10-day MVP, normalizing WHOIS/SSL/DNS
results into their own tables would cost real time for no demo-visible
benefit — JSON columns let the Investigation Agent (Day 4) attach whatever
fields it finds without a schema migration each time. Post-hackathon this
would be worth normalizing.
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Enum, Float, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.db.session import Base


class IncidentType(str, enum.Enum):
    url = "url"
    email = "email"
    sms = "sms"
    qr = "qr"


class ThreatLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    incident_type = Column(Enum(IncidentType), nullable=False)
    raw_content = Column(Text, nullable=False)  # the URL / email body / SMS text / QR payload

    risk_score = Column(Float, nullable=True)  # 0-100, set by Detection Agent
    threat_level = Column(Enum(ThreatLevel), nullable=True)
    ai_explanation = Column(Text, nullable=True)  # Gemini-generated explanation

    investigation_data = Column(JSONB, nullable=True)  # WHOIS/SSL/DNS/blacklist results, Day 4+
    report_url = Column(String, nullable=True)  # generated PDF path/URL, Day 8+

    reported_by = Column(UUID(as_uuid=True), nullable=True)  # FK to users.id, nullable for anonymous reports
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
