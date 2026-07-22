"""
Extracts named entity types from raw incident content (URL/email/SMS text)
for pushing into the Threat Intelligence Graph: domains, email addresses,
phone numbers, crypto wallet addresses, and Telegram handles/channels.

These are intentionally simple regex-based extractors, not NER models —
for a hackathon MVP, the patterns for these entity types are well-defined
enough (wallet address formats, phone number shapes, telegram t.me links)
that a trained model would be overkill and slower to build than it's worth.
"""

import re

EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")

# International-ish phone numbers: optional +country code, 7-15 digits with
# optional separators. Deliberately permissive since incoming text formats vary.
PHONE_PATTERN = re.compile(r"\+?\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}")

# Bitcoin: base58, starts with 1/3/bc1, 25-62 chars
BTC_PATTERN = re.compile(r"\b(bc1[a-z0-9]{25,62}|[13][a-zA-Z0-9]{25,34})\b")

# Ethereum: 0x followed by 40 hex chars
ETH_PATTERN = re.compile(r"\b0x[a-fA-F0-9]{40}\b")

# Telegram: t.me/xxx links or @handle mentions
TELEGRAM_LINK_PATTERN = re.compile(r"(?:https?://)?t\.me/([a-zA-Z0-9_]{5,32})")
TELEGRAM_HANDLE_PATTERN = re.compile(r"@([a-zA-Z0-9_]{5,32})")


def extract_emails(text: str) -> list[str]:
    return list(set(EMAIL_PATTERN.findall(text)))


def extract_phone_numbers(text: str) -> list[str]:
    matches = PHONE_PATTERN.findall(text)
    # Filter out short numeric noise (e.g. plain years, small numbers) by
    # requiring at least 7 digits total.
    return list({m.strip() for m in matches if len(re.sub(r"\D", "", m)) >= 7})


def extract_wallet_addresses(text: str) -> dict:
    return {
        "bitcoin": list(set(BTC_PATTERN.findall(text))),
        "ethereum": list(set(ETH_PATTERN.findall(text))),
    }


def extract_telegram_handles(text: str) -> list[str]:
    """
    Finds t.me/handle links and @handle mentions. Email addresses are
    stripped first — otherwise "user@domain.com" gets misread as an
    @domain mention (verified this false positive with a real test case).
    """
    text_without_emails = EMAIL_PATTERN.sub(" ", text)

    handles = set(TELEGRAM_LINK_PATTERN.findall(text))
    handles.update(TELEGRAM_HANDLE_PATTERN.findall(text_without_emails))
    return list(handles)


def extract_all_entities(text: str) -> dict:
    """
    Returns:
        {
            "emails": list[str],
            "phone_numbers": list[str],
            "wallets": {"bitcoin": [...], "ethereum": [...]},
            "telegram_handles": list[str],
        }
    """
    return {
        "emails": extract_emails(text),
        "phone_numbers": extract_phone_numbers(text),
        "wallets": extract_wallet_addresses(text),
        "telegram_handles": extract_telegram_handles(text),
    }
