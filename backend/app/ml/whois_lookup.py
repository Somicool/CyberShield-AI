"""
WHOIS lookup: domain age, registrar, expiration date.

Why this matters for phishing detection: domain age is one of the
strongest real-time signals that no static training dataset can capture —
a domain registered 3 days ago that impersonates a bank is a massive red
flag regardless of what any ML model says, since the model has never seen
that specific domain before.

This hits public WHOIS servers directly (via the python-whois library),
no API key needed. Best-effort: many WHOIS servers rate-limit or don't
respond for certain TLDs, so failures are expected and handled gracefully.
"""

import logging
from datetime import datetime, timezone

import whois

logger = logging.getLogger(__name__)


def _to_single_datetime(value) -> datetime | None:
    """WHOIS responses sometimes return a list of dates instead of one. Take the earliest."""
    if value is None:
        return None
    if isinstance(value, list):
        value = min((v for v in value if v is not None), default=None)
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value


def get_domain_age_days(creation_date: datetime | None) -> int | None:
    if creation_date is None:
        return None
    return (datetime.now(timezone.utc) - creation_date).days


def lookup_whois(domain: str) -> dict:
    """
    Returns:
        {
            "success": bool,
            "registrar": str | None,
            "creation_date": str | None (ISO format),
            "expiration_date": str | None (ISO format),
            "domain_age_days": int | None,
            "error": str | None,
        }
    """
    try:
        result = whois.whois(domain)

        creation_date = _to_single_datetime(result.creation_date)
        expiration_date = _to_single_datetime(result.expiration_date)

        return {
            "success": True,
            "registrar": result.registrar,
            "creation_date": creation_date.isoformat() if creation_date else None,
            "expiration_date": expiration_date.isoformat() if expiration_date else None,
            "domain_age_days": get_domain_age_days(creation_date),
            "error": None,
        }
    except Exception as e:
        logger.warning(f"WHOIS lookup failed for {domain}: {e}")
        return {
            "success": False,
            "registrar": None,
            "creation_date": None,
            "expiration_date": None,
            "domain_age_days": None,
            "error": str(e),
        }
