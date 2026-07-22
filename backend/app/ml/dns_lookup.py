"""
DNS lookups: A records, MX records, nameservers.

Why this matters: legitimate businesses almost always have MX records
(they receive email at their domain) and nameservers from established
providers. Phishing domains thrown up for a few days often have minimal
DNS setup (just an A record, no MX, generic/free nameservers).
"""

import logging

import dns.resolver

logger = logging.getLogger(__name__)


def _query(domain: str, record_type: str) -> list[str]:
    try:
        answers = dns.resolver.resolve(domain, record_type, lifetime=5)
        return [str(rdata) for rdata in answers]
    except Exception:
        return []


def lookup_dns(domain: str) -> dict:
    """
    Returns:
        {
            "a_records": list[str],
            "mx_records": list[str],
            "nameservers": list[str],
            "has_mx": bool,
        }
    """
    a_records = _query(domain, "A")
    mx_records = _query(domain, "MX")
    nameservers = _query(domain, "NS")

    return {
        "a_records": a_records,
        "mx_records": mx_records,
        "nameservers": nameservers,
        "has_mx": len(mx_records) > 0,
    }
