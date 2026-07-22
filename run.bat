@echo off
REM CyberShield AI - starts backend (FastAPI) and frontend (Vite) each in
REM their own window. Close those windows (or Ctrl+C inside them) to stop.
REM Postgres runs as a Windows service already, nothing to start for it.

echo Starting backend (FastAPI) on http://127.0.0.1:8000 ...
start "CyberShield Backend" cmd /k "cd backend && venv\Scripts\python.exe -m uvicorn app.main:app --reload --reload-dir app --port 8000"

echo Starting frontend (Vite) on http://localhost:5173 ...
start "CyberShield Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting in separate windows.
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:5173
echo.
pause
