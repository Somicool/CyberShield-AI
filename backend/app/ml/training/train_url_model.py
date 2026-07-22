"""
Trains the URL phishing classifier from the cached PhiUSIIL dataset.

IMPORTANT — why features are REGENERATED instead of using PhiUSIIL's
original columns:

PhiUSIIL's authors computed columns like NoOfLettersInURL,
NoOfOtherSpecialCharsInURL, CharContinuationRate etc. using their own
undocumented counting conventions. We don't have their exact formulas, so
if we train on THEIR numbers but compute features with OUR function at
inference time (app/ml/features_url.py), the model receives values that
don't match what it learned from — verified this caused real, severe
errors (e.g. github.com and wikipedia.org scoring 90%+ "phishing").

Fix: we run every training row's raw URL through our own
extract_url_features() and train on THOSE numbers instead. This guarantees
train-time and inference-time features are always computed by the exact
same code. Accuracy will look less impressive than using PhiUSIIL's
original (more sophisticated) columns, but it will be an honest number
that reflects real inference behavior instead of a mismatched one.

A second issue was found this way: nearly 100% of PhiUSIIL's "legitimate"
URLs include a www. subdomain vs ~42% of phishing URLs (a dataset
collection artifact). This leaked into every length-based feature and
caused real apex-domain sites without www (github.com, google.com) to be
misclassified as phishing. Fixed at the source in features_url.py by
normalizing away a leading www. before computing any feature — applied
identically at training and inference time.

We only train the URL-only tier. An HTML-derived model was considered
(Tier 1) but dropped for the same root reason: we can't verify our HTML
feature extraction against PhiUSIIL's ground truth either (they didn't
ship the original scraped HTML, only derived numbers), and re-scraping
235K URLs 2+ years later is infeasible (many are dead). HTML-based signals
are instead applied as transparent heuristics at the API layer, not a
second black-box model.

Dropped columns and why:
- URL, Domain, Title: raw identifiers/text, not model features
- URLSimilarityIndex, URLCharProb: computed by PhiUSIIL's original authors
  using a proprietary reference database we don't have access to.
- TLDLegitimateProb: recomputed ourselves as a simple label-frequency
  table per TLD, built only from training data, reapplied consistently
  at inference time.

Run: python -m app.ml.training.train_url_model
"""

import json
from pathlib import Path

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
import joblib

from app.ml.features_url import extract_url_features

DATA_PATH = Path(__file__).parent.parent / "data" / "phiusiil_raw.parquet"
MODELS_DIR = Path(__file__).parent.parent / "models"

URL_ONLY_FEATURES = [
    "URLLength", "DomainLength", "IsDomainIP", "TLDLength", "NoOfSubDomain",
    "HasObfuscation", "NoOfObfuscatedChar", "ObfuscationRatio",
    "NoOfLettersInURL", "LetterRatioInURL", "NoOfDegitsInURL", "DegitRatioInURL",
    "NoOfEqualsInURL", "NoOfQMarkInURL", "NoOfAmpersandInURL",
    "NoOfOtherSpecialCharsInURL", "SpacialCharRatioInURL", "IsHTTPS",
    "CharContinuationRate", "TLDLegitimateProb",
]


def regenerate_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Re-derives every URL-only feature from the raw URL column using our
    OWN extract_url_features(), so training data matches inference-time
    computation exactly. TLD is kept from our extractor too (used to
    build the legitimacy probability table below).
    """
    print("Regenerating features from raw URLs (this takes a minute for 235K rows)...")
    records = [extract_url_features(url) for url in df["URL"]]
    features_df = pd.DataFrame(records)
    features_df["label"] = df["label"].values
    return features_df


def build_tld_legitimate_prob(df: pd.DataFrame) -> dict:
    """
    For each TLD, what fraction of training rows with that TLD were
    legitimate (label == 1)? Rare TLDs (<20 samples) fall back to the
    global legitimate rate to avoid noisy estimates from tiny samples.
    """
    global_rate = df["label"].mean()
    counts = df.groupby("TLD")["label"].agg(["mean", "count"])
    probs = {}
    for tld, row in counts.iterrows():
        probs[tld] = row["mean"] if row["count"] >= 20 else global_rate
    probs["__default__"] = global_rate
    return probs


def train_and_eval(df: pd.DataFrame, feature_cols: list[str], tier_name: str):
    X = df[feature_cols]
    y = df["label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=20,
        random_state=42,
        n_jobs=-1,
        class_weight="balanced",
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    metrics = {
        "accuracy": round(accuracy_score(y_test, preds), 4),
        "precision": round(precision_score(y_test, preds), 4),
        "recall": round(recall_score(y_test, preds), 4),
        "f1": round(f1_score(y_test, preds), 4),
    }
    print(f"\n[{tier_name}] Test set metrics: {metrics}")

    importances = sorted(
        zip(feature_cols, model.feature_importances_), key=lambda x: -x[1]
    )
    print(f"[{tier_name}] Top 5 features: {[f'{n}: {v:.3f}' for n, v in importances[:5]]}")

    return model, metrics


def main():
    raw_df = pd.read_parquet(DATA_PATH)
    print(f"Loaded {len(raw_df)} raw rows")

    df = regenerate_features(raw_df)

    tld_probs = build_tld_legitimate_prob(df)
    df["TLDLegitimateProb"] = df["TLD"].map(lambda t: tld_probs.get(t, tld_probs["__default__"]))

    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    url_model, url_metrics = train_and_eval(df, URL_ONLY_FEATURES, "url_only")
    joblib.dump(url_model, MODELS_DIR / "url_only_model.joblib")

    # Save TLD probability table + feature list for inference-time use
    with open(MODELS_DIR / "tld_legitimate_prob.json", "w") as f:
        json.dump(tld_probs, f, indent=2)

    with open(MODELS_DIR / "feature_manifest.json", "w") as f:
        json.dump(
            {
                "url_only_features": URL_ONLY_FEATURES,
                "url_only_metrics": url_metrics,
            },
            f,
            indent=2,
        )

    print(f"\nModel + metadata saved to {MODELS_DIR}")


if __name__ == "__main__":
    main()
