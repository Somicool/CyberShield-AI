"""One-off: generate a PDF documenting all datasets used in CyberShield AI."""
from pathlib import Path
from fpdf import FPDF

OUT = Path(__file__).parent.parent / "docs" / "CyberShield_AI_Dataset_Documentation.pdf"

PRIMARY = (79, 70, 229)      # indigo
DARK = (30, 41, 59)
GREY = (100, 116, 139)


def s(t):
    return str(t).encode("latin-1", "replace").decode("latin-1")


class PDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*GREY)
        self.cell(0, 6, "CyberShield AI - Dataset Documentation", align="L")
        self.cell(0, 6, f"Page {self.page_no()}", align="R")
        self.ln(8)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 7)
        self.set_text_color(*GREY)
        self.cell(0, 10, "Generated for the CyberShield AI project report", align="C")


pdf = PDF()
pdf.set_auto_page_break(auto=True, margin=18)
pdf.add_page()


def h1(t):
    pdf.set_font("Helvetica", "B", 15)
    pdf.set_text_color(*PRIMARY)
    pdf.multi_cell(0, 8, s(t))
    pdf.ln(1)
    pdf.set_draw_color(*PRIMARY)
    pdf.set_line_width(0.4)
    x, y = pdf.get_x(), pdf.get_y()
    pdf.line(x, y, x + 180, y)
    pdf.ln(3)


def h2(t):
    pdf.ln(1)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(*DARK)
    pdf.multi_cell(0, 7, s(t))
    pdf.ln(1)


def body(t):
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*DARK)
    pdf.multi_cell(0, 5.5, s(t))
    pdf.ln(1)


def field(label, value):
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*DARK)
    pdf.write(5.5, s(label) + ": ")
    pdf.set_font("Helvetica", "", 10)
    pdf.write(5.5, s(value))
    pdf.ln(6.5)


def bullet(t):
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*DARK)
    x = pdf.get_x()
    pdf.set_x(x + 3)
    pdf.multi_cell(0, 5.5, s("- " + t))


# ---------------- Title page ----------------
pdf.ln(30)
pdf.set_font("Helvetica", "B", 26)
pdf.set_text_color(*PRIMARY)
pdf.multi_cell(0, 12, "CyberShield AI", align="C")
pdf.set_font("Helvetica", "B", 16)
pdf.set_text_color(*DARK)
pdf.multi_cell(0, 9, "Dataset Documentation", align="C")
pdf.ln(4)
pdf.set_font("Helvetica", "", 11)
pdf.set_text_color(*GREY)
pdf.multi_cell(0, 6, "AI-Powered Cybercrime Intelligence Platform", align="C")
pdf.ln(20)
pdf.set_font("Helvetica", "", 10)
pdf.set_text_color(*DARK)
pdf.multi_cell(0, 6,
    s("This document describes every dataset used to train and support the machine-learning "
      "models in CyberShield AI: the URL phishing classifier, the text (email/SMS) scam "
      "classifier, and the supplementary scam-text dataset. It covers each dataset's source, "
      "size, licensing, how it is used, preprocessing, and the resulting model performance."),
    align="C")

# ---------------- 1. Overview ----------------
pdf.add_page()
h1("1. Overview")
body("CyberShield AI uses supervised machine-learning models for real-time phishing and scam "
     "detection. These models are trained on three datasets:")
bullet("PhiUSIIL Phishing URL Dataset - trains the URL phishing classifier.")
bullet("SMS Spam Collection (UCI) - primary dataset for the email/SMS scam classifier.")
bullet("Supplementary Scam Texts (custom) - modern scam patterns added to the text classifier.")
pdf.ln(2)
body("A summary of dataset usage is given below.")

h2("Summary Table")
rows = [
    ("Dataset", "Model", "Records", "Type"),
    ("PhiUSIIL Phishing URL", "URL Classifier (RandomForest)", "235,795 URLs", "Labeled"),
    ("SMS Spam Collection", "Text Classifier (TF-IDF + LogReg)", "5,574 messages", "Labeled"),
    ("Supplementary Scam Texts", "Text Classifier (added)", "30 messages", "Labeled (custom)"),
]
col_w = [55, 62, 40, 33]
pdf.set_font("Helvetica", "B", 8.5)
pdf.set_fill_color(*PRIMARY)
pdf.set_text_color(255, 255, 255)
for i, c in enumerate(rows[0]):
    pdf.cell(col_w[i], 7, s(c), border=1, fill=True, align="C")
pdf.ln()
pdf.set_text_color(*DARK)
for r_i, row in enumerate(rows[1:]):
    pdf.set_font("Helvetica", "", 8.5)
    fill = r_i % 2 == 0
    pdf.set_fill_color(238, 240, 250)
    for i, c in enumerate(row):
        pdf.cell(col_w[i], 7, s(c), border=1, fill=fill, align="C")
    pdf.ln()
pdf.ln(3)

# ---------------- 2. PhiUSIIL ----------------
pdf.add_page()
h1("2. Dataset 1 - PhiUSIIL Phishing URL Dataset")
field("Purpose", "Train the URL phishing classifier (Tier-2, URL-string only).")
field("Source", "UCI Machine Learning Repository (dataset id 967)")
field("URL", "https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset")
field("Total records", "235,795 URLs")
field("Class balance", "134,850 legitimate + 100,945 phishing")
field("Original features", "54 columns (URL, domain, HTML-derived, and computed features)")
field("License", "CC BY 4.0")
field("Citation", "Prasad, A. & Chandra, S. (2024). PhiUSIIL Phishing URL Dataset. UCI ML Repository.")
field("Access method", "Python 'ucimlrepo' package: fetch_ucirepo(id=967)")
field("Local cache", "app/ml/data/phiusiil_raw.parquet (cached after first fetch)")

h2("How it is used")
body("Instead of using PhiUSIIL's original pre-computed feature columns, every training row's raw "
     "URL is passed through the project's own feature extractor (app/ml/features_url.py), so the "
     "features used at training time exactly match those computed at inference time. This avoids a "
     "train/inference mismatch that was found to misclassify real sites such as github.com and "
     "wikipedia.org.")

h2("Features used by the model (20 URL-only features)")
feats = ("URLLength, DomainLength, IsDomainIP, TLDLength, NoOfSubDomain, HasObfuscation, "
         "NoOfObfuscatedChar, ObfuscationRatio, NoOfLettersInURL, LetterRatioInURL, "
         "NoOfDegitsInURL, DegitRatioInURL, NoOfEqualsInURL, NoOfQMarkInURL, NoOfAmpersandInURL, "
         "NoOfOtherSpecialCharsInURL, SpacialCharRatioInURL, IsHTTPS, CharContinuationRate, "
         "TLDLegitimateProb")
body(feats)

h2("Preprocessing notes")
bullet("A leading 'www.' is normalized away before feature extraction (a dataset artifact where "
       "~100% of legitimate URLs had 'www.' vs ~42% of phishing URLs leaked into length features).")
bullet("TLDLegitimateProb is recomputed as a per-TLD legitimacy frequency table built only from "
       "training data, and reapplied identically at inference.")
bullet("Dropped columns: URL, Domain, Title (raw text); URLSimilarityIndex, URLCharProb "
       "(proprietary computation); HTML-derived columns (used as heuristics instead, not ML).")

h2("Model & Performance")
field("Algorithm", "RandomForestClassifier (200 trees, max_depth 20, class_weight balanced)")
field("Train/test split", "80% / 20% (stratified, random_state 42)")
h2("Test-set metrics")
metrics = [("Accuracy", "0.9954"), ("Precision", "0.9944"), ("Recall", "0.9976"), ("F1-score", "0.9960")]
pdf.set_font("Helvetica", "B", 9)
pdf.set_fill_color(*PRIMARY); pdf.set_text_color(255, 255, 255)
for m, _ in metrics:
    pdf.cell(45, 7, s(m), border=1, fill=True, align="C")
pdf.ln()
pdf.set_font("Helvetica", "", 9); pdf.set_text_color(*DARK); pdf.set_fill_color(238, 240, 250)
for _, v in metrics:
    pdf.cell(45, 7, s(v), border=1, fill=True, align="C")
pdf.ln(9)
body("Label convention: class 1 = legitimate, class 0 = phishing. The model returns the phishing "
     "probability, scaled to a 0-100 risk score.")

# ---------------- 3. SMS Spam Collection ----------------
pdf.add_page()
h1("3. Dataset 2 - SMS Spam Collection")
field("Purpose", "Primary dataset for the text classifier (email + SMS scam detection).")
field("Source", "UCI Machine Learning Repository / Kaggle")
field("URL", "https://www.kaggle.com/datasets/uciml/sms-spam-collection-dataset")
field("Total records", "5,574 messages")
field("Labels", "ham (legitimate) / spam")
field("License", "Public (UCI). Free for research use.")
field("Citation", "Almeida, T.A., Gomez Hidalgo, J.M., Yamakami, A. (2011).")
field("Local file", "app/ml/data/sms_spam_raw/SMSSpamCollection (tab-separated)")

h2("How it is used")
body("One text model serves both email and SMS because they share the same task - 'does this text "
     "read like a scam'. This dataset provides clean, high-volume labeled data but skews toward "
     "generic 2011-era spam (ringtones, promotions) rather than modern fraud patterns, which is why "
     "the supplementary dataset (Section 4) is added.")

# ---------------- 4. Supplementary ----------------
h1("4. Dataset 3 - Supplementary Scam Texts (Custom)")
field("Purpose", "Fill the modern-scam gap left by the 2011 SMS dataset.")
field("Local file", "app/ml/data/supplementary_scam_texts.csv")
field("Total records", "30 messages (20 scam/spam + 10 legitimate/ham)")
field("Format", "CSV with columns: label, text")
h2("Scam patterns covered")
body("OTP phishing, fake bank/KYC alerts, fake delivery/customs fees, gift-card and lottery scams, "
     "fake account-security warnings (Apple, Microsoft, Netflix, PayPal, WhatsApp), tax-refund and "
     "loan-forgiveness scams, and work-from-home job scams.")
h2("Example entries")
pdf.set_font("Helvetica", "I", 9)
pdf.set_text_color(*GREY)
for ex in [
    "spam: \"Your bank account has been temporarily suspended... Verify your identity now at http://secure-bankverify.com\"",
    "spam: \"URGENT: Your OTP is 483920. Do not share this code... click here: bit.ly/2xVerify\"",
    "spam: \"Congratulations! You've been selected to receive a $1000 Amazon gift card...\"",
    "ham:  \"Hey, are we still meeting for lunch tomorrow at 1pm?\"",
    "ham:  \"Don't forget to pick up milk on your way home.\"",
]:
    pdf.multi_cell(0, 5, s(ex))
    pdf.ln(0.5)

# ---------------- 5. Combined text training ----------------
pdf.add_page()
h1("5. Combined Text Model Training")
body("The SMS Spam Collection and the supplementary scam texts are combined and de-duplicated, "
     "then used to train a single text classifier.")
field("Combined training rows (after de-duplication)", "5,199")
field("Algorithm", "TF-IDF Vectorizer + Logistic Regression")
field("TF-IDF settings", "lowercase, English stop-words, unigrams+bigrams, max 5000 features, min_df 2")
field("Class weight", "balanced (spam = 1, ham = 0)")
field("Train/test split", "80% / 20% (stratified, random_state 42)")

h2("Test-set metrics")
tmetrics = [("Accuracy", "0.9760"), ("Precision", "0.9104"), ("Recall", "0.9037"), ("F1-score", "0.9071")]
pdf.set_font("Helvetica", "B", 9)
pdf.set_fill_color(*PRIMARY); pdf.set_text_color(255, 255, 255)
for m, _ in tmetrics:
    pdf.cell(45, 7, s(m), border=1, fill=True, align="C")
pdf.ln()
pdf.set_font("Helvetica", "", 9); pdf.set_text_color(*DARK); pdf.set_fill_color(238, 240, 250)
for _, v in tmetrics:
    pdf.cell(45, 7, s(v), border=1, fill=True, align="C")
pdf.ln(9)

h2("Top scam-indicative terms learned")
body("txt, mobile, uk, free, claim, www, text, reply, http, com, new, 150p, prize, stop, 50")

# ---------------- 6. Data files & storage ----------------
h1("6. Data Files & Storage")
bullet("app/ml/data/phiusiil_raw.parquet - cached PhiUSIIL dataset.")
bullet("app/ml/data/sms_spam_raw/SMSSpamCollection - SMS Spam Collection.")
bullet("app/ml/data/supplementary_scam_texts.csv - custom scam texts.")
bullet("app/ml/models/url_only_model.joblib - trained URL model.")
bullet("app/ml/models/text_model.joblib + text_vectorizer.joblib - trained text model.")
bullet("app/ml/models/tld_legitimate_prob.json - per-TLD legitimacy table.")
bullet("app/ml/models/feature_manifest.json + text_model_manifest.json - features & metrics.")
pdf.ln(2)
body("Note: raw datasets and trained models are regenerable. Training scripts: "
     "fetch_dataset.py, train_url_model.py, train_text_model.py (in app/ml/training/).")

# ---------------- 7. References ----------------
h1("7. References")
bullet("Prasad, A. & Chandra, S. (2024). PhiUSIIL Phishing URL Dataset. UCI Machine Learning "
       "Repository. Licensed under CC BY 4.0.")
bullet("Almeida, T.A., Gomez Hidalgo, J.M., Yamakami, A. (2011). Contributions to the Study of "
       "SMS Spam Filtering. SMS Spam Collection, UCI/Kaggle.")
bullet("scikit-learn: RandomForestClassifier, TfidfVectorizer, LogisticRegression - "
       "official documentation.")

pdf.output(str(OUT))
print("PDF written to", OUT)
