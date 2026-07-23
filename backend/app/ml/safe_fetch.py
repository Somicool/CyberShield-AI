"""
Safe HTML fetcher for arbitrary, user-submitted URLs.

Security note: this function fetches URLs supplied by end users (or scraped
from emails/SMS), which makes it a classic SSRF risk surface — a malicious
submitter could try to point us at http://localhost, http://169.254.169.254
(cloud metadata endpoints), internal hostnames, etc. to probe our own
infrastructure through our server.

Guards applied here:
- Only http/https schemes allowed
- Resolve the hostname and reject private/loopback/link-local/reserved IPs
  BEFORE connecting (blocks localhost, 127.0.0.1, 169.254.169.254, 10.x, etc.)
- Short timeout (5s) so a slow/hanging target can't tie up a request thread
- Redirects capped and each redirect hop is re-validated (a URL can pass the
  IP check then redirect to an internal address)
- Response size capped to avoid memory exhaustion from huge responses
- No JavaScript execution — we only ever read raw HTML text, never render it
"""

import ipaddress
import socket
from urllib.parse import urlparse

import requests

MAX_REDIRECTS = 2
# (connect, read) timeouts in seconds. A short connect timeout means dead /
# unreachable phishing domains fail fast instead of hanging the whole request.
TIMEOUT_SECONDS = (3, 3)
MAX_RESPONSE_BYTES = 2 * 1024 * 1024  # 2 MB is plenty for phishing page HTML
USER_AGENT = "CyberShieldAI-Detector/1.0 (+security research; automated scan)"


class UnsafeURLError(Exception):
    """Raised when a URL resolves to a disallowed/private address."""


def _is_private_or_reserved(ip_str: str) -> bool:
    ip = ipaddress.ip_address(ip_str)
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


def _validate_host(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise UnsafeURLError(f"Disallowed scheme: {parsed.scheme}")

    hostname = parsed.hostname
    if not hostname:
        raise UnsafeURLError("URL has no hostname")

    try:
        resolved_ips = socket.getaddrinfo(hostname, None)
    except socket.gaierror as e:
        raise UnsafeURLError(f"DNS resolution failed: {e}") from e

    for family, _, _, _, sockaddr in resolved_ips:
        ip_str = sockaddr[0]
        if _is_private_or_reserved(ip_str):
            raise UnsafeURLError(f"URL resolves to a private/reserved IP: {ip_str}")


def _fetch(start_url: str) -> str | None:
    """Runs the actual fetch+redirect loop starting from a fully-qualified URL."""
    current_url = start_url

    for _ in range(MAX_REDIRECTS + 1):
        _validate_host(current_url)

        response = requests.get(
            current_url,
            timeout=TIMEOUT_SECONDS,
            headers={"User-Agent": USER_AGENT},
            allow_redirects=False,
            stream=True,
        )

        if response.is_redirect or response.is_permanent_redirect:
            next_url = response.headers.get("Location")
            if not next_url:
                return None
            current_url = next_url
            continue

        # Read up to MAX_RESPONSE_BYTES only
        content = b""
        for chunk in response.iter_content(chunk_size=8192):
            content += chunk
            if len(content) > MAX_RESPONSE_BYTES:
                break

        return content.decode(response.encoding or "utf-8", errors="ignore")

    return None  # too many redirects


def fetch_page_html(url: str) -> str | None:
    """
    Attempts to safely fetch a URL's HTML. Returns the HTML text on success,
    or None if the fetch fails/is unsafe/times out — callers should treat
    None as "fall back to Tier 2 (URL-only) scoring", not as an error.

    If the URL has no scheme (e.g. a user typed "www.instagram.com" without
    "https://"), we try HTTPS first — since the vast majority of real sites
    serve HTTPS today — and only fall back to plain HTTP if the HTTPS
    attempt fails outright (connection refused, TLS error, etc.), not just
    on redirects (those are already handled inside _fetch's loop).
    """
    if "://" in url:
        try:
            return _fetch(url)
        except (UnsafeURLError, requests.RequestException):
            return None

    try:
        return _fetch(f"https://{url}")
    except (UnsafeURLError, requests.RequestException):
        try:
            return _fetch(f"http://{url}")
        except (UnsafeURLError, requests.RequestException):
            return None
