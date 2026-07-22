# CyberShield AI

AI-powered cybercrime intelligence platform that detects phishing/scam threats in real time and generates actionable intelligence for law enforcement investigations.

## Project Structure

```
CyberShield-AI/
├── backend/          # FastAPI backend (detection, investigation, reports, auth)
├── frontend/         # React + Vite + Tailwind dashboard
├── extension/        # Chrome Extension (Manifest V3) — added Day 9
└── docs/             # Architecture notes, decisions, dataset info
```

## Tech Stack

- **Backend:** FastAPI, PostgreSQL, Neo4j, JWT auth
- **Frontend:** React, Vite, Tailwind CSS, Recharts, Leaflet
- **AI:** scikit-learn, Gemini API
- **Browser:** Chrome Extension (Manifest V3)

## Development Roadmap

See `docs/ROADMAP.md` for the 10-day phased build plan.

## Getting Started

See `backend/README.md` and `frontend/README.md` for setup instructions specific to each part.
