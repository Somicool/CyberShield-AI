"""
One-time dataset fetch + cache.

Why cache to a local parquet file: ucimlrepo re-downloads/re-parses the full
54MB CSV every time fetch_ucirepo() is called, which takes 30-60s. We only
need to do that once — every subsequent training run should load the cached
parquet file (near-instant) instead of hitting the network again.

Run this once: python -m app.ml.training.fetch_dataset
"""

from pathlib import Path

from ucimlrepo import fetch_ucirepo

CACHE_DIR = Path(__file__).parent.parent / "data"
CACHE_PATH = CACHE_DIR / "phiusiil_raw.parquet"


def fetch_and_cache():
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    print("Fetching PhiUSIIL dataset from UCI (this can take ~1 min)...")
    dataset = fetch_ucirepo(id=967)
    X = dataset.data.features
    y = dataset.data.targets

    df = X.copy()
    df["label"] = y["label"]

    df.to_parquet(CACHE_PATH, index=False)
    print(f"Cached {len(df)} rows to {CACHE_PATH}")


if __name__ == "__main__":
    fetch_and_cache()
