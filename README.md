<div align="center">

# CyberShield AI

### AI-powered cybercrime intelligence platform — detect phishing & scams in real time, and turn scattered complaints into actionable investigation intelligence.

*From a citizen's suspicious link → AI detection → police investigation → organised-crime network discovery — on one backend.*

<br/>

![Python](https://img.shields.io/badge/Python-3.13-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Data-4169E1?logo=postgresql&logoColor=white)
![Neo4j](https://img.shields.io/badge/Neo4j-Graph-4581C3?logo=neo4j&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-ML-F7931E?logo=scikitlearn&logoColor=white)
![Gemini](https://img.shields.io/badge/Google_Gemini-AI-8E75B2?logo=googlegemini&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Chrome_Extension-MV3-4285F4?logo=googlechrome&logoColor=white)

</div>

---

## Overview

**CyberShield AI** is an end-to-end platform that protects citizens from phishing/scam attacks and equips **Cyber Crime police** with AI-assisted investigation tooling. It fuses a **machine-learning detection engine**, a **transparent rule-based heuristic layer**, and **Google Gemini** for plain-language explanations — then links every detected entity (domains, emails, phones, crypto wallets, Telegram handles) into a **Neo4j threat-intelligence graph** to expose organised campaigns hiding behind unrelated-looking complaints.

One backend powers **three surfaces**:

| Citizen Portal | Police Command Center | Browser Extension |
|---|---|---|
| Check links/emails/SMS/QR, file complaints, learn cyber-safety | Live threat feed, case management, AI investigation workspace, threat graph, analytics | Real-time site protection & one-click reporting |

> **Design philosophy:** explainable AI (never a black box), a deterministic pipeline (Gemini only *explains*, it never decides the risk score), and **honesty** — implemented features are real; anything not built is clearly labelled *"Planned Module"*.

---

## Key Features

- **Hybrid Detection Engine** — ML model + transparent heuristics + Gemini AI explanation for URLs, emails, SMS, and QR codes.
- **Threat Intelligence Graph (Neo4j)** — discovers that different complaints share the same wallet / domain / Telegram handle → surfaces coordinated campaigns via 2-hop network traversal.
- **AI Investigation Copilot** — a context-aware chat assistant grounded strictly in a case's real data (cites its sources, says *"Not Available"* when data is missing).
- **Investigation Workspace** — one screen: AI briefing, detection breakdown, WHOIS/DNS/SSL/GeoIP, linked entities, related cases, timeline, officer notes, and PDF export.
- **CrimeGPT** — legal-section suggestions, case-law references, and document drafting for officers, with an audit trail.
- **CyberShield Guardian** — a Manifest V3 browser extension that blocks malicious sites in real time (no AI inside — it reuses the same backend).
- **Analytics & Heatmap** — Recharts dashboards + a Leaflet map plotting **real** geolocated hosting IPs (nothing fabricated).
- **Role-Based Access Control** — Citizen · Police · Admin, enforced with JWT on both backend and frontend.

---

## Architecture

```
   Citizens · Browser Extension · Police · Admins
                      │  HTTPS · REST /api · JWT
          ┌───────────▼────────────┐
          │     React Frontend      │   Citizen Portal + Police Dashboard
          └───────────┬────────────┘
          ┌───────────▼────────────┐
          │      FastAPI Backend     │
          │  Auth · Detection ·      │
          │  Investigation ·         │
          │  Complaints · Incidents ·│
          │  Copilot · CrimeGPT ·    │
          │  Admin · Graph           │
          └───┬──────────┬─────────┬─┘
      ┌───────▼──┐  ┌────▼──────┐  ┌▼─────────────┐
      │PostgreSQL│  │   Neo4j    │  │  Gemini API  │
      │ users,   │  │ entity     │  │ explanations │
      │ incidents│  │ relationship│ │ & summaries  │
      │ complaints│ │ graph      │  │              │
      │ audit_logs│ └────────────┘  └──────────────┘
      └──────────┘
```

**Why two databases?** PostgreSQL stores structured records (users, incidents, complaints, audit logs); Neo4j stores the *relationships* between entities — which is what turns isolated reports into a visible criminal network.

---

## How Detection Works

```
 URL / Email / SMS / QR
          │
          ▼
 ┌──────────────────┐     ┌───────────────────────┐     ┌──────────────────────┐
 │  ML Base Score   │  +  │  Heuristic Points      │  →  │  Gemini Explanation  │
 │  (scikit-learn)  │     │  (transparent rules)   │     │  (plain language)    │
 └──────────────────┘     └───────────────────────┘     └──────────────────────┘
          │                                                        │
          ▼                                                        ▼
   Risk Score 0–100  →  Threat Level (low/medium/high/critical)  +  Why it was flagged
```

- **URL classifier** — RandomForest trained on the **PhiUSIIL** dataset (235,795 URLs). *Origin-based scoring* + a trusted-domain allowlist keep false positives near zero on sites like Google/YouTube/GitHub.
- **Text classifier** — TF-IDF + Logistic Regression (SMS Spam Collection + curated modern scam samples) for both email and SMS.
- **Heuristics** — IP-literal domains, suspicious TLDs, brand impersonation, `@`-obfuscation, missing HTTPS, external password forms, and more.
- **Gemini** — only *explains* a decision the deterministic pipeline already made — keeping results reproducible and audit-friendly.

### Model Performance

| Model | Dataset | Accuracy | Precision | Recall | F1 |
|---|---|:---:|:---:|:---:|:---:|
| **URL phishing** | PhiUSIIL (235,795 URLs) | **99.5%** | 99.4% | 99.8% | **0.996** |
| **Text scam (email/SMS)** | SMS Spam Collection + supplement (~5,199 rows) | **97.6%** | 91.0% | 90.4% | **0.907** |

---

## Platform Modules

<details>
<summary><b>Citizen Portal</b></summary>

- **Check for Scams** — one tabbed tool for Link / Email / SMS / QR
- **Report Cyber Crime** — files a complaint; auto-attaches an AI risk summary in the background
- **My Complaints** — track status with a reference number (`CMP-2026-XXXXXX`)
- **Cyber Safety** — awareness content
- **CyberShield Guardian** — extension status, live stats, install guide
</details>

<details>
<summary><b>Police Command Center</b></summary>

- **Dashboard** — KPIs, AI intelligence feed, high-priority cases, live threat feed (auto-refresh, filter, search)
- **Cases** — filter/sort, status workflow, officer assignment, bulk actions
- **Investigation Workspace** — AI briefing, WHOIS/DNS/SSL/GeoIP, linked entities, related cases, timeline, notes, PDF report
- **Threat / Intelligence Graph** — interactive network visualization + AI campaign analysis
- **AI Copilot** & **CrimeGPT** — investigation and legal assistants
- **Analytics** (Recharts) + **Heatmap** (Leaflet, real geolocated IPs)
</details>

<details>
<summary><b>CyberShield Guardian (Browser Extension, MV3)</b></summary>

- **Real-time protection** — checks each site's origin; blocks high-confidence malicious sites, warns on uncertain ones
- **Right-click "Analyze with CyberShield AI"**
- **Popup dashboard** — risk, prediction, confidence, AI explanation, local history
- **One-click reporting** — reuses the complaint API + your citizen session
</details>

<details>
<summary><b>🛠️ Administration</b></summary>

- User management (roles, enable/disable, password reset)
- **System Health Center** — live checks of FastAPI, PostgreSQL, Neo4j, Gemini, Auth
- Real uptime, platform KPIs, and data export
</details>

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | FastAPI · SQLAlchemy · Pydantic · JWT (python-jose) · Uvicorn |
| **Databases** | PostgreSQL (records) · Neo4j Aura (graph) |
| **AI / ML** | scikit-learn (RandomForest, TF-IDF + Logistic Regression) · Google Gemini |
| **Investigation** | python-whois · dnspython · ssl · ip-api (GeoIP) |
| **Frontend** | React 19 · Vite · Tailwind CSS · React Router · Recharts · Leaflet · react-force-graph-2d · react-markdown |
| **Extension** | Chrome/Edge Manifest V3 (service worker · content scripts · popup) |

---

## Project Structure

```
CyberShield-AI/
├── backend/              # FastAPI backend
│   └── app/
│       ├── api/routes/   # auth, detection, incidents, complaints, copilot, crimegpt, admin
│       ├── ml/           # ML models, feature extraction, heuristics, training scripts
│       ├── services/     # detection, investigation, graph, explanation, copilot
│       ├── models/       # SQLAlchemy models (user, incident, complaint, audit)
│       └── main.py       # app entrypoint
├── frontend/             # React + Vite + Tailwind (citizen portal + police dashboard)
│   └── src/{pages,components,api,context,lib}
├── browser-extension/    # CyberShield Guardian (Manifest V3)
└── docs/                 # architecture notes, datasets
```

---

## Getting Started

### Prerequisites
- Python 3.13, Node.js 18+
- PostgreSQL, a Neo4j Aura instance, and a Google Gemini API key

### 1) Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows  (macOS/Linux: source venv/bin/activate)
pip install -r requirements.txt

# Configure secrets
copy .env.example .env          # then fill in DATABASE_URL, SECRET_KEY, GEMINI_API_KEY, NEO4J_*

# Run
python -m uvicorn app.main:app --reload --port 8000
```

> **Trained ML models are already included** in `backend/app/ml/models/`, so detection works out of the box.
> To retrain from scratch (optional):
> ```bash
> python -m app.ml.training.fetch_dataset
> python -m app.ml.training.train_url_model
> python -m app.ml.training.train_text_model
> ```

### 2) Frontend
```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

### 3) Browser Extension
1. Open `chrome://extensions` → enable **Developer mode**
2. **Load unpacked** → select the `browser-extension/` folder
3. Sign in to the citizen portal once so the extension can report on your behalf

> On Windows, `run.bat` starts the backend and frontend together.

---

## API Highlights

| Method & Path | Purpose |
|---|---|
| `POST /api/detect` | Detect a URL / email / SMS (persists an incident + AI explanation) |
| `POST /api/detect/scan` | Fast, non-persisting URL check (used by the extension) |
| `POST /api/detect/{id}/investigate` | WHOIS / DNS / SSL / GeoIP enrichment |
| `GET /api/detect/graph/{type}/{value}` | Threat-graph network query |
| `POST /api/complaints` | File a citizen complaint |
| `POST /api/copilot/chat` | Streaming AI investigation copilot |
| `GET /api/incidents` · `/stats` · `/map/points` | Dashboard feed, analytics, heatmap |
| `GET /api/admin/health` | Live system health |

---

## Datasets

| Dataset | Use | Size | License |
|---|---|---|---|
| [PhiUSIIL Phishing URL Dataset](https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset) | URL classifier | 235,795 URLs | CC BY 4.0 |
| [SMS Spam Collection](https://www.kaggle.com/datasets/uciml/sms-spam-collection-dataset) + curated supplement | Email/SMS classifier | ~5,199 rows | Research use |

*Citations: Prasad, A. & Chandra, S. (2024); Almeida, T.A., Gómez Hidalgo, J.M., & Yamakami, A. (2011).*

---

## Security & Privacy

- **JWT authentication** with three roles (Citizen / Police / Admin), enforced backend + frontend.
- **bcrypt** password hashing; disabled accounts cannot log in.
- Secrets live only in `backend/.env` (**gitignored, never committed**).
- The extension stores **no passwords** (it bridges the web session token); browsing history stays **on-device**.
- AI guardrails: deterministic scores, source-attributed answers, and **no fabricated** entities, relationships, or evidence.

---

## Roadmap

- [ ] External threat feeds (Google Safe Browsing / URLhaus)
- [ ] Continuous live health monitoring & alerting
- [ ] Evidence Vault & Chain of Custody
- [ ] CERT-In / CCTNS integration
- [ ] MFA / SSO / LDAP
- [ ] Multilingual & voice citizen assistant

---

<div align="center">

**CyberShield AI** — turning scattered scam reports into organised-crime intelligence, one detection at a time.

*Built with ❤️ for safer citizens and smarter policing.*

</div>
