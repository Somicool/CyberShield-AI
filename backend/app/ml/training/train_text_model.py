"""
Trains the text classifier used for both email and SMS scam detection.

Why one model for both: email and SMS scams share the same underlying
task — "does this text read like a scam" (urgency, fake links, requests
for money/credentials) — so a single text classifier serves both incident
types (see app/services/detection.py routing).

Datasets combined:
1. SMS Spam Collection (UCI) — 5,574 messages, ham/spam labeled. Good
   volume and clean labels, but skews toward generic spam (ringtones,
   promos) rather than scam-specific fraud patterns, since it's from 2011.
2. Supplementary hand-written scam texts (app/ml/data/supplementary_scam_texts.csv)
   — ~20 modern scam patterns (OTP phishing, fake bank alerts, fake
   delivery fees, gift card scams) + ~10 ordinary "ham" texts, added to
   fill the gap in (1) per the plan noted in docs/DATASETS.md.

Model: TF-IDF + Logistic Regression. Chosen over a heavier model (e.g. a
fine-tuned transformer) because it trains in seconds on this data size,
requires no GPU, and is easy to explain to judges — "we weight suspicious
words/phrases and their combinations" is a legible pitch, unlike a black
box neural net.

Run: python -m app.ml.training.train_text_model
"""

import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split

DATA_DIR = Path(__file__).parent.parent / "data"
MODELS_DIR = Path(__file__).parent.parent / "models"

SMS_PATH = DATA_DIR / "sms_spam_raw" / "SMSSpamCollection"
SUPPLEMENT_PATH = DATA_DIR / "supplementary_scam_texts.csv"


def load_sms_dataset() -> pd.DataFrame:
    df = pd.read_csv(SMS_PATH, sep="\t", header=None, names=["label", "text"])
    return df


def load_supplementary_dataset() -> pd.DataFrame:
    return pd.read_csv(SUPPLEMENT_PATH)


def main():
    sms_df = load_sms_dataset()
    supplement_df = load_supplementary_dataset()

    df = pd.concat([sms_df, supplement_df], ignore_index=True)
    df = df.drop_duplicates(subset="text").reset_index(drop=True)
    print(f"Combined dataset: {len(df)} rows ({df['label'].value_counts().to_dict()})")

    # label: 1 = scam/spam, 0 = legitimate (ham) — same convention as the URL model
    # (1 = phishing there is inverted; here we keep spam=1 for clarity in this module)
    y = (df["label"] == "spam").astype(int)
    X = df["text"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    vectorizer = TfidfVectorizer(
        lowercase=True,
        stop_words="english",
        ngram_range=(1, 2),  # unigrams + bigrams catch phrases like "click here", "verify now"
        max_features=5000,
        min_df=2,
    )
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    model = LogisticRegression(max_iter=1000, class_weight="balanced")
    model.fit(X_train_vec, y_train)

    preds = model.predict(X_test_vec)
    metrics = {
        "accuracy": round(accuracy_score(y_test, preds), 4),
        "precision": round(precision_score(y_test, preds), 4),
        "recall": round(recall_score(y_test, preds), 4),
        "f1": round(f1_score(y_test, preds), 4),
    }
    print(f"Test set metrics: {metrics}")

    # Show the most scam-indicative words/phrases learned — useful for the
    # dashboard's "why was this flagged" explanation and for sanity-checking
    # the model learned sensible signal, not noise.
    feature_names = vectorizer.get_feature_names_out()
    coefs = model.coef_[0]
    top_scam_terms = sorted(zip(feature_names, coefs), key=lambda x: -x[1])[:15]
    print("Top scam-indicative terms:", [t for t, _ in top_scam_terms])

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODELS_DIR / "text_model.joblib")
    joblib.dump(vectorizer, MODELS_DIR / "text_vectorizer.joblib")

    with open(MODELS_DIR / "text_model_manifest.json", "w") as f:
        json.dump(
            {
                "metrics": metrics,
                "top_scam_terms": [t for t, _ in top_scam_terms],
                "training_rows": len(df),
                "sources": ["SMS Spam Collection (UCI)", "supplementary_scam_texts.csv"],
            },
            f,
            indent=2,
        )

    print(f"Model + vectorizer saved to {MODELS_DIR}")


if __name__ == "__main__":
    main()
