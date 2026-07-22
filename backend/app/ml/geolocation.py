"""
IP geolocation for the threat heatmap: given a hosting IP (from DNS A
records), returns approximate lat/lon + country.

Uses ip-api.com's free endpoint — no API key required for non-commercial
use, rate limited to 45 requests/minute. This is why geolocation is looked
up on-demand per incident (cached in investigation_data once computed)
rather than batch-processed — we don't have volume that would hit the
rate limit in a hackathon demo context.
"""

import logging

import requests

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 5


def geolocate_ip(ip: str) -> dict | None:
    """
    Returns {"lat": float, "lon": float, "country": str, "city": str} or
    None if the lookup fails (private IP, rate limited, network error).
    """
    try:
        response = requests.get(f"http://ip-api.com/json/{ip}", timeout=TIMEOUT_SECONDS)
        data = response.json()

        if data.get("status") != "success":
            return None

        return {
            "lat": data["lat"],
            "lon": data["lon"],
            "country": data.get("country"),
            "city": data.get("city"),
        }
    except Exception as e:
        logger.warning(f"Geolocation failed for {ip}: {e}")
        return None
