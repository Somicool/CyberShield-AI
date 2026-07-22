"""
AI Investigation Copilot service.

This is a thin wrapper over the SAME Gemini integration used for detection
explanations (app/services/explanation.py) — it does not introduce a new LLM
and does not duplicate any detection/investigation logic. All factual
investigation data is gathered by the frontend from existing APIs
(getIncident, /detect/graph, WHOIS/DNS/SSL/GeoIP results already stored on the
incident) and passed in as a read-only context block. The Copilot's job is
purely to explain/summarise that real data for officers.

Streaming: uses Gemini's streaming API so the UI can render tokens as they
arrive.
"""

import logging

from google.genai import types, errors as genai_errors

from app.services.explanation import _client, PRIMARY_MODEL, FALLBACK_MODEL

logger = logging.getLogger(__name__)

SYSTEM_INSTRUCTION = """You are the CyberShield AI Investigation Copilot, a context-aware assistant for Cyber Crime police officers. You help officers understand, summarise and act on real cybercrime investigations.

STRICT GROUNDING RULES:
- Use ONLY the information in the provided INVESTIGATION CONTEXT and the conversation so far. Never invent investigations, entities, domains, wallets, phone numbers, Telegram handles, relationships, WHOIS/DNS/SSL/GeoIP values, risk scores or statistics.
- If the context does not contain something the officer asks about, say so plainly, e.g. "The current investigation does not contain WHOIS information."
- Always identify which backend data sources informed your answer (for example: Risk Score, Detection Heuristics, Gemini Summary, WHOIS, DNS, SSL, GeoIP, Threat Graph, Related Cases, Officer Notes, Timeline).
- Write for a non-technical police officer: clear and direct, explain any technical term in plain language.
- You are read-only. You never perform actions; you recommend them.

ALWAYS respond in Markdown using EXACTLY these section headings, in order:
### Summary
### Evidence Used
### Explanation
### Risk Assessment
### Recommended Actions
### Confidence

Keep each section concise. Use bullet lists or tables where they aid clarity. In "Evidence Used" list only the specific backend sources present in the context that you actually used. In "Confidence" give High, Medium or Low with a one-line justification based on how much real data was available. If no investigation context was provided, answer general questions helpfully but state that no investigation is currently selected."""


def _build_contents(context, messages):
    contents = []
    if context:
        contents.append(
            types.Content(
                role="user",
                parts=[types.Part(text=f"INVESTIGATION CONTEXT (the ONLY factual data you may use):\n\n{context}")],
            )
        )
        contents.append(
            types.Content(
                role="model",
                parts=[types.Part(text="Investigation context loaded. I will base my answers only on this data and clearly flag anything unavailable.")],
            )
        )
    for m in messages:
        role = "model" if m.get("role") in ("assistant", "model", "copilot") else "user"
        text = (m.get("content") or "").strip()
        if text:
            contents.append(types.Content(role=role, parts=[types.Part(text=text)]))
    return contents


def stream_chat(context, messages):
    """Yields response text chunks (str). Falls back across models on error."""
    if _client is None:
        yield "The AI service is not configured on the server (missing GEMINI_API_KEY)."
        return

    contents = _build_contents(context, messages)
    config = types.GenerateContentConfig(system_instruction=SYSTEM_INSTRUCTION, temperature=0.3)

    for model_name in (PRIMARY_MODEL, FALLBACK_MODEL):
        try:
            stream = _client.models.generate_content_stream(model=model_name, contents=contents, config=config)
            produced = False
            for chunk in stream:
                if getattr(chunk, "text", None):
                    produced = True
                    yield chunk.text
            if produced:
                return
        except genai_errors.APIError as e:
            logger.warning(f"Copilot model {model_name} failed: {e}")
            continue

    yield "I'm unable to generate a response right now. Please try again in a moment."
