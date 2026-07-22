"""
Lightweight domain reputation allowlist.

Why: the URL-only ML model is reliable on the *domain* but over-flags long
legitimate URLs (search results, watch pages, etc.). As a safety net against
false positives on well-known sites, we keep a curated allowlist of major
legitimate registrable domains. A match short-circuits detection to a
low-risk verdict.

This is NOT a substitute for detection — it only covers well-known good
domains. Phishing domains are never on this list (a phishing site that puts
"google.com" in a subdomain resolves to a *different* registrable domain, so
it will not match).
"""

import tldextract

# Registrable domains (domain + public suffix). Subdomains are covered
# automatically because we compare the registrable domain only.
TRUSTED_DOMAINS = {
    # Search / big tech
    "google.com", "google.co.in", "youtube.com", "gmail.com", "microsoft.com",
    "live.com", "office.com", "office365.com", "bing.com", "apple.com", "icloud.com",
    "amazon.com", "amazon.in", "aws.amazon.com", "meta.com", "facebook.com",
    "instagram.com", "whatsapp.com", "threads.net", "x.com", "twitter.com",
    "linkedin.com", "github.com", "gitlab.com", "stackoverflow.com", "cloudflare.com",
    "mozilla.org", "wikipedia.org", "wikimedia.org", "reddit.com", "netflix.com",
    "spotify.com", "adobe.com", "dropbox.com", "slack.com", "zoom.us", "atlassian.com",
    "notion.so", "figma.com", "openai.com", "chatgpt.com",
    # News / reference
    "bbc.com", "bbc.co.uk", "cnn.com", "nytimes.com", "theguardian.com",
    "ndtv.com", "indiatimes.com", "hindustantimes.com",
    # Commerce / payments
    "paypal.com", "stripe.com", "flipkart.com", "myntra.com", "ebay.com",
    "razorpay.com", "paytm.com", "phonepe.com",
    # Indian government / banking (commonly impersonated — the REAL domains are safe)
    "gov.in", "nic.in", "irctc.co.in", "uidai.gov.in", "incometax.gov.in",
    "onlinesbi.sbi", "sbi.co.in", "hdfcbank.com", "icicibank.com", "axisbank.com",
    "pnbindia.in", "kotak.com", "cybercrime.gov.in",
    # Dev / infra
    "vercel.app", "netlify.app", "herokuapp.com", "googleapis.com", "gstatic.com",
}


def registered_domain(url: str) -> str:
    """Return the registrable domain (e.g. 'mail.google.com' -> 'google.com')."""
    ext = tldextract.extract(url)
    if ext.suffix:
        return f"{ext.domain}.{ext.suffix}".lower()
    return (ext.domain or "").lower()


def is_trusted_domain(url: str) -> bool:
    """True if the URL's registrable domain is a known-legitimate domain."""
    return registered_domain(url) in TRUSTED_DOMAINS
