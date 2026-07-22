"""
Inference pipeline: given a raw URL, attempts Tier 1 (fetch page + full
feature set), falls back to Tier 2 (URL-only) if the fetch fails.

Returns a risk score (0-100, higher = more likely phishing) plus which
tier was used and the raw feature values, so the API/heuristics layer and
Gemini explanation step (Day 3) have something concrete to reference.
"""

import json
from pathlib import Path

import joblib
import pandas as pd

from app.ml.features_url import extract_url_features
from app.ml.training.train_url_model import URL_ONLY_FEATURES

MODELS_DIR = Path(__file__).parent / "models"

_url_only_model = joblib.load(MODELS_DIR / "url_only_model.joblib")
with open(MODELS_DIR / "tld_legitimate_prob.json") as f:
    _tld_probs = json.load(f)


def _tld_legitimate_prob(tld: str) -> float:
    return _tld_probs.get(tld, _tld_probs["__default__"])


def predict_url(url: str) -> dict:
    """
    Returns:
        {
            "risk_score": float 0-100,      # higher = more likely phishing
            "model_phishing_probability": float 0-1,
            "features": dict,               # raw feature values used
        }

    Note: this is the ML score only. HTML-derived signals (password fields,
    external form submits, iframe count, etc.) are applied separately as
    transparent heuristic adjustments in app/services/detection.py — not
    baked into a second black-box model, since we can't verify HTML feature
    extraction against ground truth the way we can for the URL-only model.
    """
    url_features = extract_url_features(url)
    url_features["TLDLegitimateProb"] = _tld_legitimate_prob(url_features["TLD"])

    row = pd.DataFrame([{col: url_features.get(col, 0) for col in URL_ONLY_FEATURES}])
    phishing_prob = _url_only_model.predict_proba(row)[0][0]  # class 0 = phishing

    return {
        "risk_score": round(float(phishing_prob) * 100, 2),
        "model_phishing_probability": round(float(phishing_prob), 4),
        "features": url_features,
    }
