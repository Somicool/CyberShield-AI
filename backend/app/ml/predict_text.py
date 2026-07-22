"""
Inference for the text classifier (email/SMS). See train_text_model.py
for training details and dataset sources.
"""

from pathlib import Path

import joblib

MODELS_DIR = Path(__file__).parent / "models"

_model = joblib.load(MODELS_DIR / "text_model.joblib")
_vectorizer = joblib.load(MODELS_DIR / "text_vectorizer.joblib")


def predict_text(text: str) -> dict:
    """
    Returns:
        {
            "risk_score": float 0-100,   # higher = more likely scam/spam
            "model_scam_probability": float 0-1,
        }
    """
    vec = _vectorizer.transform([text])
    scam_prob = _model.predict_proba(vec)[0][1]  # class 1 = spam/scam

    return {
        "risk_score": round(float(scam_prob) * 100, 2),
        "model_scam_probability": round(float(scam_prob), 4),
    }
