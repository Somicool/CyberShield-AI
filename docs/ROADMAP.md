# CyberAid — Build Roadmap

Originally planned as 10 days solo. **Revised on 2026-07-18: deadline moved up to Jul 22-23, so Days 1-5 (backend) are done and Days 6-10 are compressed into 4 days + 1 buffer day.** Nothing was cut from scope — Day 6+7 (dashboard) is merged into one combined work session since the backend is fully built and tested, making dashboard-building faster than originally estimated.

| Date | Focus | Outcome |
|---|---|---|
| Done | Foundation, Detection (URL+text ML, heuristics, Gemini explanations), Investigation Agent (WHOIS/DNS/SSL), Threat Intelligence Graph (Neo4j) | Full backend working end-to-end, tested |
| Jul 18-19 | Dashboard (was Day 6+7): live threat feed, incident detail, Recharts analytics, graph viz, search/filter, threat heatmap | Full policing dashboard, done |
| Jul 20 | Report Generator (Day 8): Gemini investigation summary + PDF export | One-click PDF report from any incident |
| Jul 21 | Chrome Extension + Citizen Assistance Agent (Day 9) | Live browser demo + recovery guidance |
| Jul 22 | QR/SMS polish, end-to-end bug fixes, demo script (Day 10) | Full pitch-ready product |
| Jul 23 | Buffer / rehearsal | Absorbs any day that ran long, practice the pitch |

## Original 10-day plan (for reference)

| Day | Focus | Outcome |
|---|---|---|
| 1 | Foundation: repo structure, FastAPI skeleton, Postgres schema, React+Vite+Tailwind skeleton, JWT auth | Backend health check works, frontend loads, login/signup functional |
| 2 | Detection Core part 1: URL classifier (PhiUSIIL dataset) + heuristic layer | POST a URL → risk score |
| 3 | Detection Core part 2: Text classifier (SMS/email) + Gemini explanation wiring | Full detection response: score + AI explanation for URL/email/SMS |
| 4 | Investigation Agent: WHOIS, SSL, DNS (blacklist deferred, see note) | `POST /api/detect/{id}/investigate` enriches an incident with domain intel |
| 5 | Threat Intelligence Graph: Neo4j AuraDB setup, entity extraction, graph push | `GET /api/detect/graph/{type}/{value}` shows everything connected to an entity through shared incidents |
| 6 | Dashboard part 1: live threat feed, incident detail view, Recharts analytics | Incidents visible live on dashboard |
| 7 | Dashboard part 2: graph viz, search/filter, threat heatmap | Feels like a real SOC tool |
| 8 | Report Generator: Gemini investigation summary + PDF export | One-click PDF report from any incident |
| 9 | Chrome Extension + Citizen Assistance Agent | Live browser demo + recovery guidance |
| 10 | QR/SMS polish, end-to-end bug fixes, demo script | Full pitch-ready product |

## Key Architecture Decisions

1. **Agents = deterministic pipeline, not autonomous LLM agents.** Detection → Threat Intel → Investigation → Report → Citizen Assistance is a fixed sequence of service calls. Gemini is invoked for reasoning/explanation/text generation at specific steps, not given free rein to call tools. This is predictable and demo-safe.

2. **Detection = hybrid ML + heuristics + Gemini.**
   - URL Classifier: RandomForest trained on PhiUSIIL dataset, URL-string features only (see note below on why HTML-derived features were dropped from the ML model)
   - Text Classifier: TF-IDF + Logistic Regression trained on SMS Spam Collection + supplemented phishing email samples (handles both email and SMS — same task: "does this text read like a scam")
   - QR codes are decoded, then routed to URL or Text classifier based on payload — not a separate model
   - Heuristics layer adds points on top of the ML base score for: IP-literal domains, suspicious TLDs, brand impersonation, `@` obfuscation, excessive subdomains/hyphens, missing HTTPS, and (when a page fetch succeeds) password fields submitting externally, no-HTTPS password collection, excessive iframes
   - Gemini generates the human-readable explanation from the combined score + signals (Day 3). Model: `gemini-2.5-flash` (primary, reliably available on free tier), auto-falls back to `gemini-3.5-flash` if the primary model errors. Note: Gemini API keys created after mid-2026 are "auth keys" (start with `AQ.` instead of the older `AIza...` format) — used identically via `genai.Client(api_key=...)`, no code difference. If explanation generation fails for any reason, detection returns a generic fallback message rather than failing the whole request — the risk score/heuristics are the reliable, deterministic part of the response.

   **Note on HTML-derived ML features:** originally planned a second "full" model trained on HTML-derived columns (password fields, iframe count, etc.) for when a page fetch succeeds. Dropped this after discovering PhiUSIIL's HTML-derived columns use undocumented computation formulas we can't replicate — training on their numbers while computing our own at inference time caused severe train/inference mismatch (verified: github.com and wikipedia.org scored 90%+ "phishing"). Also found and fixed a related dataset artifact: ~100% of PhiUSIIL's "legitimate" URLs include `www.` vs ~42% of phishing URLs, which leaked into every length-based feature and caused real apex domains (github.com, google.com) to misclassify. Fixed by normalizing away `www.` before feature extraction, applied identically at train and inference time. HTML signals are now heuristics only, not a second black-box model — see `app/ml/training/train_url_model.py` for full details.

   **Setup note:** `app/ml/models/` and `app/ml/data/` are gitignored (large, regenerable). After a fresh clone, run these once before starting the API:
   ```
   python -m app.ml.training.fetch_dataset
   python -m app.ml.training.train_url_model
   python -m app.ml.training.train_text_model
   ```
   (SMS Spam Collection zip must also be downloaded to `app/ml/data/sms_spam_raw/` — see train_text_model.py for the source URL.)

3. **Two databases, two jobs.** Postgres = structured data (users, incidents, cases). Neo4j = relationship graph (URLs/domains/emails/phones/wallets connected into networks).

   **Graph shape (Day 5):** every incident connects via `INVOLVES` edges to whatever entities were extracted from its content — Domain, Email, Phone, Wallet, TelegramHandle. Entities are extracted with regex (`app/ml/entity_extraction.py`), not NER — the patterns for wallet addresses/phone numbers/telegram handles are well-defined enough that a trained model would be overkill. All graph writes use `MERGE` so re-processing is idempotent. Network discovery ("what else is connected to this wallet") is a 2-hop traversal: entity → shared incidents → their other entities — see `app/services/graph.py`. Verified end-to-end: two different scam SMS messages sharing one bitcoin wallet correctly surface each other's emails/Telegram handles via `GET /api/detect/graph/Wallet/{address}`.

   **Neo4j Aura credential note:** the username is NOT the default `neo4j` — Aura generates instance-specific credentials where the username matches the instance ID (e.g. `bcd1404d`), shown in the downloaded credentials file. Using the wrong default username causes a generic `AuthError` that looks identical to a wrong password, worth checking the credentials file directly if auth fails.

5. **Dashboard (Jul 18-19).** Read-only routes for browsing incidents live in `app/api/routes/incidents.py` (list/filter/search, single incident detail, aggregate stats, map points) — kept separate from `detection.py` which only WRITES incidents. Frontend: `DashboardLayout` (sidebar nav) wraps 4 pages — Live Feed (polls every 10s, filter by threat level/type, search), Incident Detail (explanation, heuristics, on-demand Investigate button), Analytics (Recharts: bar/pie/line), Threat Graph (react-force-graph, search any entity type/value), Heatmap (Leaflet, plots real geolocated incidents).

   **Heatmap data is real, not faked:** incidents don't have inherent GPS data, so the heatmap plots the geolocated hosting IP of investigated URL incidents (first DNS A record → ip-api.com free lookup, no key needed, added to `app/services/investigation.py`). Only incidents that have been investigated and successfully geolocated appear — nothing is fabricated. Run "Investigate" on a URL incident's detail page to add it to the map.

   **Demo data:** `backend/seed_data.py` posts 10 realistic sample incidents (mix of legit sites and scam patterns) through the real `/api/detect` endpoint — useful to repopulate the feed before a demo/rehearsal. Safe to run multiple times.

6. **Scheme-less URL bug (found via manual testing, fixed 2026-07-18):** typing a URL without `http(s)://` (e.g. "www.instagram.com" — how most people actually type URLs) was defaulting to `http://` in six different places across the codebase. Since `IsHTTPS` is the ML model's single strongest feature, this alone caused real legitimate sites to score as critical risk. Fixed with one shared `ensure_scheme()` util (`app/ml/url_utils.py`) that defaults to `https://` instead — matching both real-world site behavior and how browsers themselves handle bare domains. `safe_fetch.py` goes further: it actually attempts HTTPS first and only falls back to HTTP if that connection fails outright, rather than guessing either way.

4. **Investigation runs separately from detection, on demand.** Detection (Day 2-3) needs to respond fast since a user is waiting; investigation (WHOIS/DNS/SSL, Day 4) can take longer (multiple network round-trips) and is triggered via `POST /api/detect/{incident_id}/investigate` — a natural "Investigate" button for the police dashboard, not part of the initial detection response. Results merge into the incident's `investigation_data` JSON column.

   **Blacklist checking deferred:** URLhaus now requires a free Auth-Key (changed from keyless access when originally researched). Decided to use Google Safe Browsing API instead (same Google account as Gemini), but not yet set up — WHOIS/DNS/SSL alone already provide solid investigation signal without it. Add later via `app/services/investigation.py`.

4. **Datasets (see docs/DATASETS.md):**
   - URL: PhiUSIIL Phishing URL Dataset (UCI, CC BY 4.0)
   - SMS: SMS Spam Collection (UCI/Kaggle)
   - Email: supplement SMS-trained classifier with hand-collected phishing email samples
