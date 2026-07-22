"""
Audit log model — records CrimeGPT AI actions and document generation for
accountability. Every legal-document generation and significant AI action
(legal-section suggestion, case-law lookup, assistant query) is written here
with the acting officer, so the trail is reviewable.

Kept deliberately simple and append-only. `detail` is a JSON column so each
action type can attach whatever structured metadata is useful without a
schema migration.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.db.session import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    actor_id = Column(UUID(as_uuid=True), nullable=True)  # users.id of the acting officer
    actor_email = Column(String, nullable=True)  # denormalized for easy reading

    action = Column(String, nullable=False)  # e.g. "document.generate", "legal.suggest", "assistant.query"
    incident_id = Column(UUID(as_uuid=True), nullable=True)  # related investigation, if any
    case_id = Column(String, nullable=True)  # human-friendly case number
    summary = Column(Text, nullable=True)  # short human-readable description
    detail = Column(JSONB, nullable=True)  # structured metadata (doc type, section count, etc.)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
