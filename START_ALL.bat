@echo off
title VocalForge Launcher

echo Curatare porturi...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8001 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul

echo Pornire ACE-Step...
start "ACE-Step :8001" C:\PROGRA~1\Git\usr\bin\bash.exe --login -i /d/VocalForge/start_acestep_env.sh

echo Pornire Backend...
start "Backend :8000" cmd /k "cd /d D:\VocalForge && call venv\Scripts\activate.bat && set PYTHONPATH=. && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"

echo Pornire Frontend...
start "Frontend :3000" cmd /k "cd /d D:\VocalForge\frontend && npm run dev"

echo.
echo Toate serviciile pornesc...
echo ACE-Step:  http://localhost:8001
echo Backend:   http://localhost:8000
echo Frontend:  http://localhost:3000
echo.
timeout /t 15 /nobreak >nul
start http://localhost:3000
