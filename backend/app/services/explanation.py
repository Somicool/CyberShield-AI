"""
Gemini-powered explanation generation: turns a detection result's raw
score + heuristic reasons into a short, human-readable explanation for
end users and the dashboard.

Model choice: gemini-2.5-flash as the primary model — fast, cheap, and
reliably available on the free tier (gemini-3.5-flash returned repeated
503 "high demand" errors during testing on 2026-07-15). We fall back to
gemini-3.5-flash automatically if 2.5-flash ever fails, so we pick up the
newer model transparently once capacity is available, without needing a
code change.

Design note: Gemini is only used for explanation TEXT here, not for the
risk score itself. The score is deterministic (ML model + heuristics,
built Day 2-3) — Gemini never decides whether something is dangerous, it
only explains a decision that's already been made. This keeps detection
reproducible and debuggable, and avoids an LLM hallucinating a risk
assessment.
"""

import logging

from google import genai
from google.genai import errors as genai_errors

from app.core.config import settings

logger = logging.getLogger(__name__)

_client = genai.Client(api_key=settings.GEMINI_API_KEY) if settings.GEMINI_API_KEY else None

PRIMARY_MODEL = "gemini-flash-latest"
FALLBACK_MODEL = "gemini-flash-lite-latest"

FALLBACK_EXPLANATION = (
    "We couldn't generate a detailed explanation right now, but the risk score "
    "above is based on our machine learning model and the specific warning signs "
    "listed, which you should review directly."
)


def _build_prompt(content: str, risk_score: float, threat_level: str, heuristics: list[dict]) -> str:
    reasons = "\n".join(f"- {h['reason']}" for h in heuristics) or "- No specific rule-based red flags were triggered; the score is based on the ML model alone."

    return f"""You are a cybersecurity assistant explaining a scam/phishing detection result to an everyday person with no technical background.

Detected content: "{content}"
Risk score: {risk_score}/100
Threat level: {threat_level}
Specific warning signs detected:
{reasons}

Write a short explanation (2-4 sentences) of why this was flagged, in plain language a non-technical person can understand. Be direct and concrete about what looks suspicious. Do not use technical jargon like "TLD" or "heuristic". Do not repeat the raw score back verbatim. End with one brief, practical piece of advice.
"""


def generate_explanation(
    content: str,
    risk_score: float,
    threat_level: str,
    heuristics: list[dict],
) -> str:
    """
    Returns a plain-language explanation string. Falls back to a generic
    message if Gemini is unavailable or errors — explanation generation
    should never block or fail the detection response itself.
    """
    if _client is None:
        logger.warning("GEMINI_API_KEY not configured; skipping explanation generation")
        return FALLBACK_EXPLANATION

    prompt = _build_prompt(content, risk_score, threat_level, heuristics)

    for model_name in (PRIMARY_MODEL, FALLBACK_MODEL):
        try:
            response = _client.models.generate_content(model=model_name, contents=prompt)
            return response.text.strip()
        except genai_errors.APIError as e:
            logger.warning(f"Gemini model {model_name} failed: {e}")
            continue

    return FALLBACK_EXPLANATION
