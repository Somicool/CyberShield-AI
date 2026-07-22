"""
Shared URL normalization used across detection/heuristics/investigation.

Why this exists: when a user types a URL without a scheme (e.g.
"www.instagram.com" instead of "https://www.instagram.com" — the normal
way people actually type URLs), something has to decide what scheme to
assume before we can parse the domain or check HTTPS.

This used to default to "http://" in six different places across the
codebase. That was a real bug: IsHTTPS is the single strongest feature
the ML model learned (highest feature importance), so defaulting to
http:// made every scheme-less URL — including totally legitimate ones
like "www.instagram.com" — score as if it had no HTTPS, which alone was
enough to flag real sites as critical.

Fix: default to "https://" instead. The overwhelming majority of real
sites serve HTTPS today (browsers themselves default to https:// when you
type a bare domain), so this assumption is far more often correct. It's
still just an assumption when no scheme is given — safe_fetch.py verifies
the real answer by actually attempting a connection and can fall back to
http if https fails.
"""

DEFAULT_SCHEME = "https"


def ensure_scheme(url: str) -> str:
    """Adds a scheme (https://) if the URL doesn't already have one."""
    return url if "://" in url else f"{DEFAULT_SCHEME}://{url}"
