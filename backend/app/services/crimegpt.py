"""
CrimeGPT service — legal reasoning and document drafting for police officers.

This is a thin, purpose-built layer over the SAME Gemini client used for
detection explanations and the Investigation Copilot (app/services/
explanation.py). It introduces no new LLM and duplicates none of the
detection/investigation logic. All factual investigation data is assembled by
the frontend from existing APIs and passed in as a read-only context block;
CrimeGPT's job is to reason about applicable law and draft editable documents
from that real data.

Every function degrades gracefully: if Gemini is unavailable (no API key or an
API error) it returns a deterministic, clearly-labelled fallback so the module
stays usable in demos and offline. Nothing fabricates investigation facts — the
fallbacks are generic legal scaffolding, not invented case data.

IMPORTANT: All legal outputs are decision-support only and must be verified by
a qualified officer. Statute references use the current Indian criminal codes
(BNS 2023, BNSS 2023, BSA 2023) alongside the Information Technology Act 2000.
"""

import json
import logging

from google.genai import types, errors as genai_errors

from app.services.explanation import _client, PRIMARY_MODEL, FALLBACK_MODEL

logger = logging.getLogger(__name__)

DISCLAIMER = (
    "AI-generated legal guidance. Decision-support only — every section, "
    "judgment and document MUST be independently verified by the investigating "
    "officer and legal advisor before any official or judicial use."
)


# --------------------------------------------------------------------------- #
# Gemini helpers                                                              #
# --------------------------------------------------------------------------- #

def _generate_json(system_instruction: str, user_text: str, temperature: float = 0.2):
    """Runs Gemini in JSON mode and returns the parsed object, or None on failure."""
    if _client is None:
        return None
    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        temperature=temperature,
        response_mime_type="application/json",
    )
    contents = [types.Content(role="user", parts=[types.Part(text=user_text)])]
    for model_name in (PRIMARY_MODEL, FALLBACK_MODEL):
        try:
            resp = _client.models.generate_content(model=model_name, contents=contents, config=config)
            raw = (resp.text or "").strip()
            if not raw:
                continue
            return json.loads(raw)
        except (genai_errors.APIError, json.JSONDecodeError) as e:
            logger.warning(f"CrimeGPT JSON model {model_name} failed: {e}")
            continue
    return None


def _generate_text(system_instruction: str, user_text: str, temperature: float = 0.3) -> str | None:
    if _client is None:
        return None
    config = types.GenerateContentConfig(system_instruction=system_instruction, temperature=temperature)
    contents = [types.Content(role="user", parts=[types.Part(text=user_text)])]
    for model_name in (PRIMARY_MODEL, FALLBACK_MODEL):
        try:
            resp = _client.models.generate_content(model=model_name, contents=contents, config=config)
            if resp.text:
                return resp.text.strip()
        except genai_errors.APIError as e:
            logger.warning(f"CrimeGPT text model {model_name} failed: {e}")
            continue
    return None


# --------------------------------------------------------------------------- #
# 1. Legal section recommendations                                            #
# --------------------------------------------------------------------------- #

_LEGAL_SYSTEM = """You are a senior legal advisor to an Indian Cyber Crime police unit. Given the facts of a cybercrime investigation, identify the statutory provisions that most plausibly apply.

Use the CURRENT Indian criminal codes:
- BNS  = Bharatiya Nyaya Sanhita, 2023 (replaced the IPC)
- BNSS = Bharatiya Nagarik Suraksha Sanhita, 2023 (replaced the CrPC)
- BSA  = Bharatiya Sakshya Adhiniyam, 2023 (replaced the Indian Evidence Act)
- IT Act = Information Technology Act, 2000 (as amended)

Rules:
- Recommend only provisions that are reasonably supported by the facts provided. Do not invent facts.
- Prefer precision over volume: 4-8 well-justified sections.
- For each provision give the exact act, section number, its short title, a one-sentence reason tied to the facts, and a confidence between 0 and 1.
- These are decision-support suggestions that a human officer must verify.

Respond ONLY with JSON of the form:
{"sections":[{"act":"BNS|BNSS|BSA|IT Act|Other","section":"318(4)","title":"Cheating","reason":"...","confidence":0.82}]}"""


def _fallback_legal(context: str) -> dict:
    """Deterministic, clearly-generic scaffolding used when Gemini is unavailable."""
    text = (context or "").lower()
    items = [
        {"act": "BNS", "section": "318", "title": "Cheating", "reason": "Cyber fraud typically involves inducing a victim to part with property by deception.", "confidence": 0.6},
        {"act": "BNS", "section": "319", "title": "Cheating by personation", "reason": "Impersonation of a person or brand to deceive the victim.", "confidence": 0.5},
        {"act": "IT Act", "section": "66C", "title": "Identity theft", "reason": "Fraudulent use of another's electronic identity, passwords or unique identification.", "confidence": 0.55},
        {"act": "IT Act", "section": "66D", "title": "Cheating by personation using computer resource", "reason": "Deception carried out by means of a communication device or computer resource.", "confidence": 0.6},
    ]
    if "phish" in text or "url" in text or "http" in text or "website" in text:
        items.append({"act": "IT Act", "section": "66", "title": "Computer-related offences", "reason": "Dishonest or fraudulent acts referred to in section 43 done via a computer resource.", "confidence": 0.5})
    if "wallet" in text or "bitcoin" in text or "crypto" in text or "upi" in text or "bank" in text:
        items.append({"act": "BNS", "section": "316", "title": "Criminal breach of trust", "reason": "Misappropriation of funds entrusted or transferred by the victim.", "confidence": 0.45})
    items.append({"act": "BNSS", "section": "173", "title": "Information in cognizable cases (FIR)", "reason": "Registration of first information for a cognizable cyber offence.", "confidence": 0.7})
    items.append({"act": "BSA", "section": "63", "title": "Admissibility of electronic records", "reason": "Digital evidence must be accompanied by the required certificate to be admissible.", "confidence": 0.65})
    return {"sections": items, "source": "fallback", "disclaimer": DISCLAIMER}


def suggest_legal_sections(context: str) -> dict:
    data = _generate_json(_LEGAL_SYSTEM, f"INVESTIGATION FACTS:\n\n{context}")
    if not data or not isinstance(data, dict) or not data.get("sections"):
        return _fallback_legal(context)
    # Normalise / clamp confidence.
    for s in data["sections"]:
        try:
            s["confidence"] = max(0.0, min(1.0, float(s.get("confidence", 0.5))))
        except (TypeError, ValueError):
            s["confidence"] = 0.5
    data["source"] = "ai"
    data["disclaimer"] = DISCLAIMER
    return data


# --------------------------------------------------------------------------- #
# 2. Case-law suggestions                                                     #
# --------------------------------------------------------------------------- #

_CASELAW_SYSTEM = """You are a legal researcher for an Indian Cyber Crime unit. Given the facts of a cybercrime investigation, suggest landmark or well-established Indian judgments that are genuinely relevant to the legal issues involved (cyber fraud, electronic evidence, intermediary liability, privacy, identity theft, etc.).

Rules:
- Suggest only real, well-known Indian judgments you are confident about. If unsure, prefer fewer, safer citations. Never fabricate a citation.
- 3-6 judgments.
- For each: case name, court, year, a one-line summary, and why it is relevant to these facts.
- These are research pointers a human officer/advocate MUST verify.

Respond ONLY with JSON of the form:
{"cases":[{"name":"...","court":"Supreme Court of India","year":"2015","summary":"...","relevance":"..."}]}"""


def _fallback_caselaw() -> dict:
    cases = [
        {"name": "Shreya Singhal v. Union of India", "court": "Supreme Court of India", "year": "2015",
         "summary": "Struck down Section 66A of the IT Act for vagueness; clarified limits on online speech restrictions.",
         "relevance": "Foundational authority on the scope and limits of IT Act offences involving online communication."},
        {"name": "Anvar P.V. v. P.K. Basheer", "court": "Supreme Court of India", "year": "2014",
         "summary": "Laid down that electronic records require a certificate under the then Section 65B Evidence Act to be admissible.",
         "relevance": "Directly governs how digital evidence in this case must be certified for court (now BSA s.63)."},
        {"name": "Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal", "court": "Supreme Court of India", "year": "2020",
         "summary": "Reaffirmed the mandatory nature of the electronic-evidence certificate.",
         "relevance": "Confirms the certification requirement for the digital evidence collected in this investigation."},
    ]
    return {"cases": cases, "source": "fallback", "disclaimer": DISCLAIMER}


def suggest_case_law(context: str) -> dict:
    data = _generate_json(_CASELAW_SYSTEM, f"INVESTIGATION FACTS:\n\n{context}")
    if not data or not isinstance(data, dict) or not data.get("cases"):
        return _fallback_caselaw()
    data["source"] = "ai"
    data["disclaimer"] = DISCLAIMER
    return data


# --------------------------------------------------------------------------- #
# 3. Intelligent entity extraction                                            #
# --------------------------------------------------------------------------- #

_ENTITY_CATEGORIES = [
    "victims", "suspects", "urls", "domains", "emails", "phone_numbers",
    "ip_addresses", "wallet_addresses", "bank_accounts", "organizations",
    "dates", "locations", "financial_amounts",
]

_ENTITY_SYSTEM = """You extract structured entities from a cybercrime investigation narrative for a police officer.

Extract ONLY entities that are explicitly present in the text. Do not infer or invent. Organise into these categories:
victims, suspects, urls, domains, emails, phone_numbers, ip_addresses, wallet_addresses, bank_accounts, organizations, dates, locations, financial_amounts.

Each category is a list of short strings. Use [] for categories with nothing found.

Respond ONLY with JSON: {"victims":[],"suspects":[], ... }"""


def extract_entities(narrative: str) -> dict:
    empty = {c: [] for c in _ENTITY_CATEGORIES}
    if not (narrative or "").strip():
        return {"entities": empty, "source": "empty"}
    data = _generate_json(_ENTITY_SYSTEM, f"NARRATIVE:\n\n{narrative}", temperature=0.0)
    if not data or not isinstance(data, dict):
        return {"entities": empty, "source": "unavailable"}
    result = {c: (data.get(c) if isinstance(data.get(c), list) else []) for c in _ENTITY_CATEGORIES}
    return {"entities": result, "source": "ai"}


# --------------------------------------------------------------------------- #
# 4. Document generation                                                      #
# --------------------------------------------------------------------------- #

DOCUMENT_TYPES = {
    "fir": "First Information Report (FIR)",
    "charge_sheet": "Charge Sheet",
    "arrest_memo": "Arrest Memo",
    "remand_application": "Remand Application",
    "seizure_memo": "Seizure Memo",
    "medical_letter": "Medical Examination Letter",
    "court_letter": "Letter to the Court",
    "witness_notice": "Witness Notice (BNSS s.179)",
    "investigation_summary": "Investigation Summary",
    "digital_evidence_report": "Digital Evidence Report",
}

_DOC_SYSTEM = """You are CrimeGPT, drafting official Indian police / legal documents for a Cyber Crime investigating officer.

Rules:
- Produce a complete, professional, ready-to-edit draft of the requested document type using ONLY the facts in the provided investigation context. Where a required detail is not in the context, insert a clearly marked placeholder in square brackets, e.g. [ACCUSED NAME], [DATE], so the officer can fill it in. Never invent facts.
- Use the current Indian codes (BNS 2023, BNSS 2023, BSA 2023, IT Act 2000) where statutory references are appropriate.
- Format in clean Markdown with a clear title, numbered sections and signature blocks as appropriate for the document type.
- Do not include commentary outside the document itself.
- End every document with a single italic line: *AI-assisted draft — verify all details before official use.*"""


def _fallback_document(doc_type: str, context: str) -> str:
    title = DOCUMENT_TYPES.get(doc_type, "Investigation Document")
    return (
        f"# {title}\n\n"
        "_This is an offline scaffold generated without the AI service. "
        "Complete all bracketed fields and verify against the case record._\n\n"
        "## Case Reference\n"
        "- Case ID: [CASE ID]\n"
        "- Investigating Officer: [OFFICER NAME]\n"
        "- Date: [DATE]\n\n"
        "## Facts\n"
        "The following facts are drawn from the current investigation context:\n\n"
        f"```\n{(context or 'No context available.').strip()[:2000]}\n```\n\n"
        "## Statutory Provisions\n"
        "- [Add applicable BNS / BNSS / BSA / IT Act sections from the Legal Recommendations tab]\n\n"
        "## Officer Declaration\n"
        "[Signature]\n\n"
        "*AI-assisted draft — verify all details before official use.*"
    )


def generate_document(doc_type: str, context: str) -> dict:
    title = DOCUMENT_TYPES.get(doc_type, "Investigation Document")
    user_text = f"DOCUMENT TYPE: {title}\n\nINVESTIGATION CONTEXT (the ONLY facts you may use):\n\n{context}"
    text = _generate_text(_DOC_SYSTEM, user_text, temperature=0.25)
    if not text:
        return {"doc_type": doc_type, "title": title, "content": _fallback_document(doc_type, context), "source": "fallback"}
    return {"doc_type": doc_type, "title": title, "content": text, "source": "ai"}


# --------------------------------------------------------------------------- #
# 5. Legal assistant chat (streaming)                                         #
# --------------------------------------------------------------------------- #

_ASSISTANT_SYSTEM = """You are the CrimeGPT Legal Assistant for an Indian Cyber Crime investigating officer. You explain legal sections, summarise investigations, suggest next investigative steps, help draft documents, and answer questions — always grounded in the provided investigation context and current Indian law (BNS 2023, BNSS 2023, BSA 2023, IT Act 2000).

Rules:
- Use ONLY the facts in the INVESTIGATION CONTEXT and the conversation. Never invent investigation facts, entities or statistics. If something is not in the context, say so.
- You may explain general legal principles and statutory provisions from your legal knowledge, but clearly separate general law from case-specific facts.
- Be concise, practical and written for a police officer.
- End substantive legal answers with a brief reminder that AI guidance must be verified by the officer.
Format answers in clear Markdown."""


def stream_legal_assistant(context, messages):
    if _client is None:
        yield "The AI service is not configured on the server (missing GEMINI_API_KEY)."
        return
    contents = []
    if context:
        contents.append(types.Content(role="user", parts=[types.Part(text=f"INVESTIGATION CONTEXT (the ONLY case facts you may use):\n\n{context}")]))
        contents.append(types.Content(role="model", parts=[types.Part(text="Context loaded. I will ground case-specific answers in this data and flag anything unavailable.")]))
    for m in messages:
        role = "model" if m.get("role") in ("assistant", "model", "copilot") else "user"
        text = (m.get("content") or "").strip()
        if text:
            contents.append(types.Content(role=role, parts=[types.Part(text=text)]))

    config = types.GenerateContentConfig(system_instruction=_ASSISTANT_SYSTEM, temperature=0.3)
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
            logger.warning(f"CrimeGPT assistant model {model_name} failed: {e}")
            continue
    yield "I'm unable to generate a response right now. Please try again in a moment."
