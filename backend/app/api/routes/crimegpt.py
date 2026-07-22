"""
CrimeGPT routes — legal-reasoning and document-drafting tooling for police.

All endpoints are guarded by `get_current_police` (police officers and admins
only). Legal-section suggestions, case-law lookups, document generation and
assistant queries are relayed to the shared Gemini client via
app/services/crimegpt.py. Significant actions are written to the audit log for
accountability.

No detection/investigation logic is duplicated here: the client sends a
read-only `context` block assembled from existing APIs.
"""

import logging

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_police
from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.services import crimegpt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/crimegpt", tags=["crimegpt"])


# --------------------------------------------------------------------------- #
# Schemas                                                                     #
# --------------------------------------------------------------------------- #

class ContextRequest(BaseModel):
    context: str | None = None
    incident_id: str | None = None
    case_id: str | None = None


class EntityRequest(BaseModel):
    narrative: str
    incident_id: str | None = None
    case_id: str | None = None


class DocumentRequest(BaseModel):
    doc_type: str
    context: str | None = None
    incident_id: str | None = None
    case_id: str | None = None


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    context: str | None = None
    messages: list[ChatMessage]
    incident_id: str | None = None
    case_id: str | None = None


class AuditRequest(BaseModel):
    action: str
    incident_id: str | None = None
    case_id: str | None = None
    summary: str | None = None
    detail: dict | None = None


# --------------------------------------------------------------------------- #
# Audit helper                                                                #
# --------------------------------------------------------------------------- #

def _write_audit(db: Session, actor: User, action: str, *, incident_id=None, case_id=None, summary=None, detail=None):
    """Best-effort audit write — never blocks the primary response."""
    try:
        entry = AuditLog(
            actor_id=actor.id,
            actor_email=actor.email,
            action=action,
            incident_id=incident_id,
            case_id=case_id,
            summary=summary,
            detail=detail,
        )
        db.add(entry)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to write audit log entry")


# --------------------------------------------------------------------------- #
# Endpoints                                                                   #
# --------------------------------------------------------------------------- #

@router.get("/document-types")
def document_types(_: User = Depends(get_current_police)):
    return {"types": [{"id": k, "title": v} for k, v in crimegpt.DOCUMENT_TYPES.items()]}


@router.post("/legal")
def legal_sections(payload: ContextRequest, db: Session = Depends(get_db), user: User = Depends(get_current_police)):
    result = crimegpt.suggest_legal_sections(payload.context or "")
    _write_audit(
        db, user, "legal.suggest",
        incident_id=payload.incident_id, case_id=payload.case_id,
        summary=f"Suggested {len(result.get('sections', []))} legal sections",
        detail={"source": result.get("source"), "count": len(result.get("sections", []))},
    )
    return result


@router.post("/caselaw")
def case_law(payload: ContextRequest, db: Session = Depends(get_db), user: User = Depends(get_current_police)):
    result = crimegpt.suggest_case_law(payload.context or "")
    _write_audit(
        db, user, "caselaw.suggest",
        incident_id=payload.incident_id, case_id=payload.case_id,
        summary=f"Suggested {len(result.get('cases', []))} case-law references",
        detail={"source": result.get("source"), "count": len(result.get("cases", []))},
    )
    return result


@router.post("/entities")
def entities(payload: EntityRequest, user: User = Depends(get_current_police)):
    # Entity extraction is not audited (no document produced, high frequency).
    return crimegpt.extract_entities(payload.narrative or "")


@router.post("/document")
def document(payload: DocumentRequest, db: Session = Depends(get_db), user: User = Depends(get_current_police)):
    result = crimegpt.generate_document(payload.doc_type, payload.context or "")
    _write_audit(
        db, user, "document.generate",
        incident_id=payload.incident_id, case_id=payload.case_id,
        summary=f"Generated document: {result.get('title')}",
        detail={"doc_type": payload.doc_type, "source": result.get("source")},
    )
    return result


@router.post("/assistant/chat")
def assistant_chat(payload: ChatRequest, db: Session = Depends(get_db), user: User = Depends(get_current_police)):
    messages = [m.model_dump() for m in payload.messages]
    last_user = next((m["content"] for m in reversed(messages) if m.get("role") in ("officer", "user")), "")
    _write_audit(
        db, user, "assistant.query",
        incident_id=payload.incident_id, case_id=payload.case_id,
        summary=(last_user[:180] or "Legal assistant query"),
    )
    return StreamingResponse(
        crimegpt.stream_legal_assistant(payload.context, messages),
        media_type="text/plain; charset=utf-8",
    )


@router.post("/audit")
def record_audit(payload: AuditRequest, db: Session = Depends(get_db), user: User = Depends(get_current_police)):
    _write_audit(
        db, user, payload.action,
        incident_id=payload.incident_id, case_id=payload.case_id,
        summary=payload.summary, detail=payload.detail,
    )
    return {"status": "recorded"}


@router.get("/audit")
def list_audit(incident_id: str | None = None, limit: int = 100, db: Session = Depends(get_db), user: User = Depends(get_current_police)):
    q = db.query(AuditLog)
    if incident_id:
        q = q.filter(AuditLog.incident_id == incident_id)
    rows = q.order_by(AuditLog.created_at.desc()).limit(min(limit, 500)).all()
    return {
        "items": [
            {
                "id": str(r.id),
                "actor_email": r.actor_email,
                "action": r.action,
                "incident_id": str(r.incident_id) if r.incident_id else None,
                "case_id": r.case_id,
                "summary": r.summary,
                "detail": r.detail,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
    }
