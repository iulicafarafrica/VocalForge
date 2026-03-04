@echo off
title VocalForge Launcher

echo ================================================
echo   VocalForge v1.7 - Starting All Services
echo ================================================
echo.

echo [1/3] Curatare porturi...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8001 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul
echo [OK] Porturi curatate
echo.

echo [2/3] Pornire servicii in ferestre separate...
echo.

:: ACE-Step API Server (Port 8001)
echo [ACE-Step] Starting API server on port 8001...
start "ACE-Step :8001" cmd /k "cd /d D:\VocalForge\ace-step && call start_acestep.bat"

timeout /t 3 /nobreak >nul

:: Backend (Port 8000)
echo [Backend] Starting FastAPI on port 8000...
start "Backend :8000" cmd /k "cd /d D:\VocalForge && call venv\Scripts\activate.bat && set PYTHONPATH=. && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

:: Frontend (Port 3000)
echo [Frontend] Starting React dev server on port 3000...
start "Frontend :3000" cmd /k "cd /d D:\VocalForge\frontend && npm run dev"

echo.
echo ================================================
echo   Toate serviciile pornesc!
echo ================================================
echo.
echo   ACE-Step:  http://localhost:8001
echo   Backend:   http://localhost:8000
echo   Frontend:  http://localhost:3000
echo.
echo   Asteapta 30-60 secunde pentru startup complet...
echo ================================================
echo.

timeout /t 15 /nobreak >nul
start http://localhost:3000

echo [OK] Browser deschis la http://localhost:3000
echo.
pause
