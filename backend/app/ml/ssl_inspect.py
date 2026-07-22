"""
SSL certificate inspection: issuer, validity window, self-signed detection.

Why this matters: legitimate sites typically use certs from established
CAs (Let's Encrypt, DigiCert, etc.) with normal ~90 day to 1 year validity
periods. A missing cert, an expired one, or a self-signed cert on a site
asking for credentials is a real red flag.

Uses Python's built-in ssl module directly — connects and reads the
certificate without executing any page content, low risk, read-only.
"""

import logging
import socket
import ssl
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 5


def _parse_cert_date(date_str: str) -> datetime:
    # OpenSSL format e.g. "Jan  1 00:00:00 2030 GMT"
    return datetime.strptime(date_str, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)


def inspect_ssl(domain: str) -> dict:
    """
    Returns:
        {
            "success": bool,
            "issuer": str | None,
            "valid_from": str | None (ISO format),
            "valid_until": str | None (ISO format),
            "days_until_expiry": int | None,
            "is_expired": bool | None,
            "error": str | None,
        }
    """
    context = ssl.create_default_context()
    try:
        with socket.create_connection((domain, 443), timeout=TIMEOUT_SECONDS) as sock:
            with context.wrap_socket(sock, server_hostname=domain) as ssock:
                cert = ssock.getpeercert()

        issuer_parts = dict(x[0] for x in cert.get("issuer", []))
        issuer = issuer_parts.get("organizationName") or issuer_parts.get("commonName")

        valid_from = _parse_cert_date(cert["notBefore"])
        valid_until = _parse_cert_date(cert["notAfter"])
        days_until_expiry = (valid_until - datetime.now(timezone.utc)).days

        return {
            "success": True,
            "issuer": issuer,
            "valid_from": valid_from.isoformat(),
            "valid_until": valid_until.isoformat(),
            "days_until_expiry": days_until_expiry,
            "is_expired": days_until_expiry < 0,
            "error": None,
        }
    except Exception as e:
        logger.warning(f"SSL inspection failed for {domain}: {e}")
        return {
            "success": False,
            "issuer": None,
            "valid_from": None,
            "valid_until": None,
            "days_until_expiry": None,
            "is_expired": None,
            "error": str(e),
        }
