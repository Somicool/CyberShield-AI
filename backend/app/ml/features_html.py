"""
Extracts lightweight signals from fetched page HTML, used ONLY by the
heuristic layer (app/ml/heuristics.py) — NOT fed into the ML model.

Why not ML: we can't verify HTML-derived features against PhiUSIIL's
ground truth (they didn't ship the original scraped HTML, only derived
numbers), and re-scraping 235K URLs 2+ years later is infeasible. Using
these as transparent, explainable heuristic checks instead avoids
repeating the train/inference mismatch bug found in the URL-only model.
"""

from bs4 import BeautifulSoup


def extract_html_signals(html: str, domain: str) -> dict:
    """Given fetched HTML and the domain it came from, return heuristic signal flags."""
    soup = BeautifulSoup(html, "html.parser")

    forms = soup.find_all("form")
    has_external_form_submit = any(
        form.get("action", "").startswith("http") and domain not in form.get("action", "")
        for form in forms
    )

    return {
        "has_password_field": bool(soup.find("input", attrs={"type": "password"})),
        "has_external_form_submit": has_external_form_submit,
        "iframe_count": len(soup.find_all("iframe")),
    }
