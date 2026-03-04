@echo off
title VocalForge Launcher (Multi-Pane)

echo Curatare porturi...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8001 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul

echo Pornire servicii in Windows Terminal...

:: Comanda WT explicata:
:: 1. Deschide Frontend (fereastra mare din stanga)
:: 2. Split vertical pentru ACE-Step (dreapta sus)
:: 3. Split orizontal sub ACE-Step pentru Backend (dreapta jos)

wt -w 0 new-tab -p "Command Prompt" --title "Frontend" cmd /k "cd /d D:\VocalForge\frontend && npm run dev" ; ^
split-pane -v -p "Git Bash" --title "ACE-Step" C:\PROGRA~1\Git\usr\bin\bash.exe --login -i /d/VocalForge/start_acestep_env.sh ; ^
split-pane -H -p "Command Prompt" --title "Backend" cmd /k "cd /d D:\VocalForge && call venv\Scripts\activate.bat && set PYTHONPATH=. && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"

echo.
echo Toate serviciile pornesc in Windows Terminal...
[cite_start]echo ACE-Step:  http://localhost:8001 [cite: 3]
[cite_start]echo Backend:   http://localhost:8000 [cite: 3]
[cite_start]echo Frontend:  http://localhost:3000 [cite: 3]
echo.

timeout /t 10 /nobreak >nul
start http://localhost:3000