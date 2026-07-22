"""
AI Investigation Copilot route.

POST /api/copilot/chat streams a Gemini-generated response (text/plain chunks).
The client sends a read-only `context` string (assembled from existing APIs)
and the running `messages` for conversation memory. No investigation data is
gathered here — this endpoint only relays to the shared Gemini client.
"""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.copilot import stream_chat

router = APIRouter(prefix="/api/copilot", tags=["copilot"])


class CopilotMessage(BaseModel):
    role: str
    content: str


class CopilotRequest(BaseModel):
    context: str | None = None
    messages: list[CopilotMessage]


@router.post("/chat")
def chat(payload: CopilotRequest):
    messages = [m.model_dump() for m in payload.messages]
    return StreamingResponse(
        stream_chat(payload.context, messages),
        media_type="text/plain; charset=utf-8",
    )
