# CyberShield Guardian (Browser Extension)

Real-time phishing & scam protection for citizens. The extension contains **no
AI/model logic** — every check calls the existing CyberShield AI FastAPI backend.

## What it does
- **Real-time protection** — every website you open is checked via `POST /api/detect/scan`; malicious sites trigger a full-page warning before you continue.
- **Right-click analysis** — "Analyze with CyberShield AI" on any link/page runs `POST /api/detect` (full result + Gemini AI summary).
- **Popup dashboard** — current site risk, prediction, confidence, AI explanation; Analyze Again, Report Website, Open Citizen Dashboard.
- **One-click reporting** — files a complaint via `POST /api/complaints` (reuses your CyberShield login).
- **Local history** — recent checks stored on-device only; clearable.

## Backend endpoints reused (no separate backend)
| Feature | Endpoint |
| --- | --- |
| Real-time scan | `POST /api/detect/scan` |
| Full analysis (AI summary) | `POST /api/detect` |
| Report website | `POST /api/complaints` |
| Auth | JWT bridged from the CyberShield web session |

## Configuration
Edit `utils/api.js` → `CONFIG.apiBase` and `CONFIG.dashboardUrl` to match your
running backend / frontend (defaults: `http://127.0.0.1:8000/api` and
`http://localhost:5173`).

## Install (development, unpacked)
1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this `browser-extension` folder.
4. Pin CyberShield Guardian to the toolbar.
5. Log in to the CyberShield citizen portal once so the extension can report on your behalf.

## Security & privacy
- No passwords are ever stored. The extension reuses the JWT from your active CyberShield web session for reporting only.
- Browsing history is stored locally (`chrome.storage.local`) and never leaves your device.
- Reporting requires an authenticated citizen session.
