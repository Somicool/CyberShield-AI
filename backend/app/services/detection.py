"""
Detection service: combines the ML model's score with heuristic
adjustments into one final risk score, and persists the result as an
Incident.

Score combination approach: the ML model's phishing probability (0-100) is
the base score. Each triggered heuristic ADDS points on top (capped at
100). This is deliberately simple and explainable — "the model said 62,
plus 30 for brand impersonation, plus 15 for a suspicious TLD, capped at
100" is something we can show a judge on screen, unlike a black-box
re-weighting scheme.
"""

import logging
from urllib.parse import urlparse

from app.ml.predict import predict_url
from app.ml.predict_text import predict_text
from app.ml.features_url import extract_url_features
from app.ml.features_html import extract_html_signals
from app.ml.heuristics import run_heuristics, run_text_heuristics, extract_urls_from_text
from app.ml.reputation import is_trusted_domain, registered_domain
from app.ml.safe_fetch import fetch_page_html
from app.ml.url_utils import ensure_scheme
from app.models.incident import ThreatLevel
from app.services.explanation import generate_explanation

logger = logging.getLogger("cybershield.detection")

# Trusted, known-good domains are pinned to a low score regardless of path.
TRUSTED_SCORE = 3.0


def score_to_threat_level(score: float) -> ThreatLevel:
    if score >= 75:
        return ThreatLevel.critical
    if score >= 50:
        return ThreatLevel.high
    if score >= 25:
        return ThreatLevel.medium
    return ThreatLevel.low


def _origin_for_scoring(url: str) -> str:
    """
    The ML base score is computed on the site ORIGIN (scheme://host), not the
    full path/query. The URL-only model over-weights URL length and query
    parameters, so long-but-legitimate URLs (e.g. google.com/search?q=...)
    were scored as phishing. Scoring the origin removes that noise while still
    catching malicious *domains* (their origin scores high on its own).
    """
    parsed = urlparse(ensure_scheme(url))
    if parsed.scheme and parsed.netloc:
        return f"{parsed.scheme}://{parsed.netloc}"
    return url


def compute_url_risk(url: str, html_signals: dict | None = None) -> dict:
    """
    Shared URL risk computation used by both detect_url and scan_url so the
    score, threat level and reasons stay consistent across the pipeline.

    Returns: base_score, ml_phishing_probability, features, heuristics,
    risk_score (final), threat_level, trusted.
    """
    # 1) Known-good domain? Short-circuit to low risk.
    if is_trusted_domain(url):
        features = extract_url_features(url)
        logger.info(
            "detect url=%s domain=%s trusted=True base=%.2f heur=0 final=%.2f level=low",
            url, registered_domain(url), TRUSTED_SCORE, TRUSTED_SCORE,
        )
        return {
            "base_score": TRUSTED_SCORE,
            "ml_phishing_probability": round(TRUSTED_SCORE / 100, 4),
            "features": features,
            "heuristics_triggered": [],
            "risk_score": round(TRUSTED_SCORE, 2),
            "threat_level": ThreatLevel.low,
            "trusted": True,
        }

    # 2) Base ML score on the ORIGIN; heuristics on the FULL url.
    ml_result = predict_url(_origin_for_scoring(url))
    base_score = ml_result["risk_score"]
    full_features = extract_url_features(url)

    triggered = run_heuristics(url, full_features, html_signals)
    heuristic_points = sum(h["points"] for h in triggered)

    final_score = min(100, base_score + heuristic_points)
    threat_level = score_to_threat_level(final_score)

    logger.info(
        "detect url=%s domain=%s trusted=False base=%.2f heur=%d(%s) final=%.2f level=%s",
        url, registered_domain(url), base_score, heuristic_points,
        len(triggered), final_score, threat_level.value,
    )

    return {
        "base_score": base_score,
        "ml_phishing_probability": ml_result["model_phishing_probability"],
        "features": full_features,
        "heuristics_triggered": triggered,
        "risk_score": round(final_score, 2),
        "threat_level": threat_level,
        "trusted": False,
    }


def detect_url(url: str) -> dict:
    """
    Runs the full URL detection pipeline: ML score + heuristics.

    Returns a dict with the combined score, threat level, and a breakdown
    of exactly which signals contributed — this breakdown is what Day 3's
    Gemini explanation step will read from, and what the dashboard will
    display as "why was this flagged".
    """
    # Attempt a live fetch for HTML-based heuristic signals (skipped for
    # trusted domains). Best-effort: if it fails we simply skip HTML checks.
    html = None
    html_signals = None
    if not is_trusted_domain(url):
        html = fetch_page_html(url)
        if html is not None:
            domain = urlparse(ensure_scheme(url)).netloc
            html_signals = extract_html_signals(html, domain=domain)

    risk = compute_url_risk(url, html_signals)

    explanation = generate_explanation(
        content=url,
        risk_score=risk["risk_score"],
        threat_level=risk["threat_level"].value,
        heuristics=risk["heuristics_triggered"],
    )

    return {
        "risk_score": risk["risk_score"],
        "threat_level": risk["threat_level"],
        "ml_base_score": risk["base_score"],
        "ml_phishing_probability": risk["ml_phishing_probability"],
        "heuristics_triggered": risk["heuristics_triggered"],
        "page_fetched": html is not None,
        "features": risk["features"],
        "explanation": explanation,
    }


def scan_url(url: str) -> dict:
    """
    Fast, side-effect-free URL risk check for the CyberShield Guardian browser
    extension. Runs the ML model + URL heuristics only — it deliberately skips
    the live page fetch and the Gemini explanation (the two slow steps) and
    does NOT persist an Incident. This keeps real-time, per-navigation checks
    fast and avoids flooding the incident feed with passive browsing.

    For an explicit user report, the extension uses the full /api/detect
    endpoint instead, which persists and explains.
    """
    risk = compute_url_risk(url, html_signals=None)
    return {
        "risk_score": risk["risk_score"],
        "threat_level": risk["threat_level"],
        "heuristics_triggered": risk["heuristics_triggered"],
    }


def detect_text(text: str) -> dict:
    """
    Runs the full email/SMS detection pipeline: text ML score + text
    heuristics + any embedded URLs also scored through detect_url() and
    folded into the result (a clean-sounding message with a malicious
    link should still be caught).
    """
    text_result = predict_text(text)
    base_score = text_result["risk_score"]

    triggered_heuristics = run_text_heuristics(text)
    heuristic_points = sum(h["points"] for h in triggered_heuristics)

    embedded_urls = extract_urls_from_text(text)
    embedded_url_results = []
    max_embedded_url_score = 0
    for url in embedded_urls[:5]:  # cap to avoid pathological messages with dozens of links
        url_result = detect_url(url)
        embedded_url_results.append({"url": url, "risk_score": url_result["risk_score"]})
        max_embedded_url_score = max(max_embedded_url_score, url_result["risk_score"])

    # If an embedded link is itself high-risk, that should dominate the
    # score even if the surrounding message text reads as fairly benign.
    final_score = min(100, max(base_score + heuristic_points, max_embedded_url_score))
    threat_level = score_to_threat_level(final_score)

    explanation = generate_explanation(
        content=text,
        risk_score=final_score,
        threat_level=threat_level.value,
        heuristics=triggered_heuristics,
    )

    return {
        "risk_score": round(final_score, 2),
        "threat_level": threat_level,
        "ml_base_score": base_score,
        "ml_scam_probability": text_result["model_scam_probability"],
        "heuristics_triggered": triggered_heuristics,
        "embedded_urls": embedded_url_results,
        "explanation": explanation,
    }
