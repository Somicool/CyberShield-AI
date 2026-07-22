"""
Tier 2 feature extraction: computed purely from the URL string, no network
request required. These features always work, even if the target site is
down, blocks scrapers, or the request times out — this is our fallback
tier and also the fast path before we even attempt a page fetch.

Every feature name here matches a column in the PhiUSIIL dataset so the
Tier 2 model can be trained on the same schema this function produces.
"""

import re
from urllib.parse import urlparse

import tldextract

from app.ml.url_utils import ensure_scheme

SPECIAL_CHARS = set("!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~")


def _strip_www(url: str) -> str:
    """
    Normalizes away a leading 'www.' subdomain before feature extraction.

    Why: verified via debugging that in the PhiUSIIL training data, 100% of
    legitimate URLs include 'www.' vs ~42% of phishing URLs — a dataset
    collection artifact (how the "legitimate" URL list was sourced), not a
    real phishing signal. Because 'www.' adds ~4 characters, it leaks into
    nearly every length-based feature (URLLength, DomainLength,
    NoOfLettersInURL, etc.), causing real apex-domain sites without www
    (github.com, google.com) to be misclassified as phishing. Stripping
    'www.' consistently at both training and inference time removes the
    shortcut at its source instead of chasing it through every correlated
    feature.
    """
    return re.sub(r"^(https?://)?www\.", r"\1", url, flags=re.IGNORECASE)


def extract_url_features(url: str) -> dict:
    """Given a raw URL string, return a dict of URL-only structural features."""
    url = _strip_www(url)
    parsed = urlparse(ensure_scheme(url))
    ext = tldextract.extract(url)

    domain = f"{ext.domain}.{ext.suffix}" if ext.suffix else ext.domain
    full_domain = parsed.netloc or domain

    letters = sum(c.isalpha() for c in url)
    digits = sum(c.isdigit() for c in url)
    specials = sum(c in SPECIAL_CHARS for c in url)
    url_len = len(url) or 1  # avoid div-by-zero

    return {
        "URLLength": len(url),
        "DomainLength": len(full_domain),
        "IsDomainIP": 1 if re.match(r"^\d{1,3}(\.\d{1,3}){3}$", ext.domain) else 0,
        "TLD": ext.suffix or "",
        "TLDLength": len(ext.suffix or ""),
        "NoOfSubDomain": len(ext.subdomain.split(".")) if ext.subdomain else 0,
        "HasObfuscation": 1 if "%" in url else 0,
        "NoOfObfuscatedChar": url.count("%"),
        "ObfuscationRatio": url.count("%") / url_len,
        "NoOfLettersInURL": letters,
        "LetterRatioInURL": letters / url_len,
        "NoOfDegitsInURL": digits,
        "DegitRatioInURL": digits / url_len,
        "NoOfEqualsInURL": url.count("="),
        "NoOfQMarkInURL": url.count("?"),
        "NoOfAmpersandInURL": url.count("&"),
        "NoOfOtherSpecialCharsInURL": specials,
        "SpacialCharRatioInURL": specials / url_len,
        "IsHTTPS": 1 if parsed.scheme == "https" else 0,
        "CharContinuationRate": _char_continuation_rate(url),
    }


def _char_continuation_rate(url: str) -> float:
    """
    Fraction of the URL made up of runs of 3+ repeated same-class characters
    (e.g. 'aaa', '111'). Legit URLs rarely have long repeated runs; some
    obfuscated/generated phishing URLs do. Mirrors the intent of PhiUSIIL's
    CharContinuationRate without needing their proprietary computation.
    """
    if not url:
        return 0.0
    run_len = 1
    continuation_chars = 0
    for i in range(1, len(url)):
        if url[i] == url[i - 1]:
            run_len += 1
            if run_len >= 3:
                continuation_chars += 1
        else:
            run_len = 1
    return continuation_chars / len(url)
