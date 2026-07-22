"""
Heuristic checks for URL detection — hand-written rules for red flags that
are either (a) true by definition (e.g. "this is a raw IP address") rather
than a statistical pattern, or (b) require live signals the training
dataset can't contain (e.g. HTML fetched right now).

Each check returns a (points, reason) tuple if triggered, or None if not.
Points are added on top of the ML model's score — see combine_score() in
app/services/detection.py for how these are merged.

Domain age / WHOIS / SSL checks are NOT here — those need real external
lookups and are the Investigation Agent's job (Day 4), not Detection's.
"""

import re
from urllib.parse import urlparse

from app.ml.url_utils import ensure_scheme

# Free/commonly-abused TLDs favored by scammers because they're cheap or
# free to register with minimal verification. Not a claim that every site
# on these TLDs is malicious — just a mild risk signal, small point value.
SUSPICIOUS_TLDS = {"tk", "ml", "ga", "cf", "gq", "xyz", "top", "club", "work", "click"}

# Brand names commonly impersonated in phishing URLs. If one of these
# appears in the domain but the domain isn't actually that brand's real
# domain, it's a strong impersonation signal.
IMPERSONATED_BRANDS = {
    "paypal": "paypal.com",
    "amazon": "amazon.com",
    "apple": "apple.com",
    "microsoft": "microsoft.com",
    "google": "google.com",
    "netflix": "netflix.com",
    "facebook": "facebook.com",
    "instagram": "instagram.com",
    "bankofamerica": "bankofamerica.com",
    "chase": "chase.com",
    "wellsfargo": "wellsfargo.com",
}


def check_ip_literal_domain(features: dict) -> tuple[int, str] | None:
    if features.get("IsDomainIP"):
        return 25, "URL uses a raw IP address instead of a domain name"
    return None


def check_suspicious_tld(features: dict) -> tuple[int, str] | None:
    tld = (features.get("TLD") or "").lower()
    if tld in SUSPICIOUS_TLDS:
        return 15, f"Uses a TLD ('.{tld}') frequently abused for low-cost throwaway scam domains"
    return None


def check_brand_impersonation(url: str) -> tuple[int, str] | None:
    domain = urlparse(ensure_scheme(url)).netloc.lower()
    for brand, real_domain in IMPERSONATED_BRANDS.items():
        if brand in domain and real_domain not in domain:
            return 30, f"Domain contains '{brand}' but is not the official {real_domain} domain"
    return None


def check_at_symbol_obfuscation(url: str) -> tuple[int, str] | None:
    """
    URLs like http://real-looking-text@malicious-site.com trick users into
    thinking the text before '@' is the domain, when browsers actually
    navigate to whatever comes after '@'.
    """
    if "@" in urlparse(ensure_scheme(url)).netloc:
        return 25, "URL uses '@' to obscure the real destination domain"
    return None


def check_excessive_subdomains(features: dict) -> tuple[int, str] | None:
    if features.get("NoOfSubDomain", 0) >= 3:
        return 10, "Unusually high number of subdomains, a common obfuscation tactic"
    return None


def check_excessive_hyphens(url: str) -> tuple[int, str] | None:
    domain = urlparse(ensure_scheme(url)).netloc
    if domain.count("-") >= 3:
        return 10, "Domain contains an unusually high number of hyphens"
    return None


def check_url_length(features: dict) -> tuple[int, str] | None:
    if features.get("URLLength", 0) > 100:
        return 10, "Unusually long URL, sometimes used to hide the real destination or bury a redirect"
    return None


def check_no_https(features: dict) -> tuple[int, str] | None:
    if not features.get("IsHTTPS"):
        return 10, "Site does not use HTTPS, so any submitted data travels unencrypted"
    return None


# --- HTML-derived checks (only run if we successfully fetched the page) ---


def check_password_field_external_form(html_signals: dict) -> tuple[int, str] | None:
    if html_signals.get("has_password_field") and html_signals.get("has_external_form_submit"):
        return 30, "Page has a password field that submits to a different external domain"
    return None


def check_password_field_no_https(html_signals: dict, features: dict) -> tuple[int, str] | None:
    if html_signals.get("has_password_field") and not features.get("IsHTTPS"):
        return 20, "Page collects a password over an unencrypted (non-HTTPS) connection"
    return None


def check_excessive_iframes(html_signals: dict) -> tuple[int, str] | None:
    if html_signals.get("iframe_count", 0) >= 3:
        return 10, "Page embeds an unusually high number of iframes"
    return None


URL_CHECKS = [
    check_ip_literal_domain,
    check_suspicious_tld,
    check_excessive_subdomains,
    check_url_length,
    check_no_https,
]

URL_STRING_CHECKS = [
    check_brand_impersonation,
    check_at_symbol_obfuscation,
    check_excessive_hyphens,
]

HTML_CHECKS = [
    check_password_field_external_form,
    check_excessive_iframes,
]


def run_heuristics(url: str, features: dict, html_signals: dict | None = None) -> list[dict]:
    """
    Runs every applicable heuristic check and returns a list of
    {"points": int, "reason": str} for each one that triggered.
    """
    triggered = []

    for check in URL_CHECKS:
        result = check(features)
        if result:
            triggered.append({"points": result[0], "reason": result[1]})

    for check in URL_STRING_CHECKS:
        result = check(url)
        if result:
            triggered.append({"points": result[0], "reason": result[1]})

    if html_signals is not None:
        for check in HTML_CHECKS:
            result = check(html_signals)
            if result:
                triggered.append({"points": result[0], "reason": result[1]})

        pw_no_https = check_password_field_no_https(html_signals, features)
        if pw_no_https:
            triggered.append({"points": pw_no_https[0], "reason": pw_no_https[1]})

    return triggered


# --- Text (email/SMS) heuristic checks ---

import re as _re

URGENT_KEYWORDS = (
    "urgent", "immediately", "suspended", "act now", "verify now",
    "expire", "expires", "final warning", "locked", "restricted",
)

CREDENTIAL_REQUEST_KEYWORDS = (
    "otp", "one-time password", "one time password", "pin number",
    "cvv", "social security", "verify your identity", "confirm your password",
    "bank details", "account number",
)

MONEY_URGENCY_KEYWORDS = (
    "gift card", "wire transfer", "processing fee", "claim your prize",
    "you've won", "you have won", "lottery", "refund",
)


def check_urgency_language(text: str) -> tuple[int, str] | None:
    lowered = text.lower()
    hits = [kw for kw in URGENT_KEYWORDS if kw in lowered]
    if hits:
        return 15, f"Uses urgency/pressure language commonly seen in scams: {', '.join(hits[:3])}"
    return None


def check_credential_request(text: str) -> tuple[int, str] | None:
    lowered = text.lower()
    hits = [kw for kw in CREDENTIAL_REQUEST_KEYWORDS if kw in lowered]
    if hits:
        return 25, f"Requests sensitive credentials/codes: {', '.join(hits[:3])}"
    return None


def check_money_urgency(text: str) -> tuple[int, str] | None:
    lowered = text.lower()
    hits = [kw for kw in MONEY_URGENCY_KEYWORDS if kw in lowered]
    if hits:
        return 20, f"Uses prize/money urgency language typical of scams: {', '.join(hits[:3])}"
    return None


def check_contains_shortened_url(text: str) -> tuple[int, str] | None:
    shorteners = ("bit.ly", "tinyurl.com", "goo.gl", "t.co", "ow.ly")
    if any(s in text.lower() for s in shorteners):
        return 15, "Contains a shortened URL, often used to hide the real destination"
    return None


TEXT_CHECKS = [
    check_urgency_language,
    check_credential_request,
    check_money_urgency,
    check_contains_shortened_url,
]


def extract_urls_from_text(text: str) -> list[str]:
    """Finds http(s):// URLs embedded in a message body, for cross-checking with the URL model."""
    return _re.findall(r"https?://[^\s]+", text)


def run_text_heuristics(text: str) -> list[dict]:
    """Runs every text heuristic check and returns triggered {"points", "reason"} entries."""
    triggered = []
    for check in TEXT_CHECKS:
        result = check(text)
        if result:
            triggered.append({"points": result[0], "reason": result[1]})
    return triggered
