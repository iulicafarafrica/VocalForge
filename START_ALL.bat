@echo off
title VocalForge Launcher (Multi-Pane)

echo Curatare porturi...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8001 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8002 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul

echo Pornire servicii in Windows Terminal...

:: Comanda WT explicata:
:: 1. Deschide Frontend (fereastra mare din stanga)
:: 2. Split vertical pentru ACE-Step (dreapta sus) - LAZY LOADING
:: 3. Split orizontal sub ACE-Step pentru Backend (dreapta mijloc)
:: 4. Split orizontal sub Backend pentru RVC Voice Conversion (dreapta jos)

wt -w 0 new-tab -p "Command Prompt" --title "Frontend" cmd /k "cd /d D:\VocalForge\frontend && npm run dev" ^
; split-pane --vertical -p "Git Bash" --title "ACE-Step (Lazy Load)" C:\PROGRA~1\Git\usr\bin\bash.exe --login -i /d/VocalForge/start_acestep_env.sh ^
; split-pane --horizontal -p "Command Prompt" --title "Backend" cmd /k "cd /d D:\VocalForge && call venv\Scripts\activate.bat && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000" ^
; split-pane --horizontal -p "Command Prompt" --title "RVC Voice" cmd /k "cd /d D:\VocalForge && call venv\Scripts\activate.bat && python -m uvicorn backend.app:app --host 0.0.0.0 --port 8002"

echo.
echo Toate serviciile pornesc in Windows Terminal...
echo ACE-Step:      http://localhost:8001 (Lazy Loading)
echo Backend:       http://localhost:8000
echo RVC Voice:     http://localhost:8002
echo Frontend:      http://localhost:3000
echo.
echo Default ACE-Step Model: acestep-v15-turbo (8 steps, rapid)
echo.
echo RVC Status:    Available (rvc_available: true)
echo.

timeout /t 10 /nobreak >nul
start http://localhost:3000
