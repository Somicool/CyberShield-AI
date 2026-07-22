# Datasets

## URL Classifier — PhiUSIIL Phishing URL Dataset
- Source: https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset
- 235,795 URLs (134,850 legitimate, 100,945 phishing), 54 features
- License: CC BY 4.0 — cite Prasad, A. & Chandra, S. (2024)
- Install: `pip install ucimlrepo` → `fetch_ucirepo(id=967)`

## Text Classifier (Email + SMS) — SMS Spam Collection
- Source: https://www.kaggle.com/datasets/uciml/sms-spam-collection-dataset
- 5,574 messages, ham/spam labeled
- Cite: Almeida, T.A., Gómez Hidalgo, J.M., Yamakami, A. (2011)
- Supplement with hand-collected phishing email samples on Day 3 (SMS dataset alone skews toward generic spam, not scam-specific language)
