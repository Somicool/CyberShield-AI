"""
Investigation Agent: enriches a detected URL with domain intelligence —
WHOIS (domain age/registrar), DNS (MX/nameservers), SSL certificate info.

Design note: this runs AFTER detection, not as part of the detection score
itself (see app/services/detection.py). Detection needs to be fast (a user
is waiting on a response), while investigation can take longer (multiple
network round-trips to WHOIS servers, DNS, SSL handshake) and produces
supporting evidence for the dashboard/report rather than changing the
risk score in real time.

Blacklist checking (URLhaus/Google Safe Browsing) is deferred — URLhaus
now requires a free Auth-Key (changed from keyless access), Safe Browsing
requires a Google Cloud Console signup. Both are straightforward to add
later; investigation works without them for now.
"""

from urllib.parse import urlparse

from app.ml.whois_lookup import lookup_whois
from app.ml.dns_lookup import lookup_dns
from app.ml.ssl_inspect import inspect_ssl
from app.ml.geolocation import geolocate_ip
from app.ml.url_utils import ensure_scheme


def _extract_domain(url: str) -> str:
    parsed = urlparse(ensure_scheme(url))
    return parsed.netloc.split(":")[0]  # strip port if present


def investigate_url(url: str) -> dict:
    """
    Returns:
        {
            "domain": str,
            "whois": {...},
            "dns": {...},
            "ssl": {...},
            "red_flags": list[str],   # plain-language flags derived from the above
        }
    """
    domain = _extract_domain(url)

    whois_result = lookup_whois(domain)
    dns_result = lookup_dns(domain)
    ssl_result = inspect_ssl(domain)

    # Geolocate the first A record, if any — this is the "where is this
    # threat hosted" signal the dashboard heatmap plots. Best-effort: if
    # there's no A record or the geolocation API fails, we simply omit it
    # rather than fabricating a location.
    geolocation = None
    if dns_result["a_records"]:
        geolocation = geolocate_ip(dns_result["a_records"][0])

    red_flags = []

    if whois_result["success"] and whois_result["domain_age_days"] is not None:
        if whois_result["domain_age_days"] < 30:
            red_flags.append(
                f"Domain was registered only {whois_result['domain_age_days']} days ago"
            )

    if dns_result and not dns_result["has_mx"]:
        red_flags.append("Domain has no email (MX) records, unusual for an established business")

    if ssl_result["success"]:
        if ssl_result["is_expired"]:
            red_flags.append("SSL certificate has expired")
    elif ssl_result["error"]:
        red_flags.append("Could not establish a secure (HTTPS) connection to verify the site's certificate")

    return {
        "domain": domain,
        "whois": whois_result,
        "dns": dns_result,
        "ssl": ssl_result,
        "geolocation": geolocation,
        "red_flags": red_flags,
    }
