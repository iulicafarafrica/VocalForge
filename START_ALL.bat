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
:: 2. Split vertical pentru ACE-Step (dreapta sus) - LAZY LOADING
:: 3. Split orizontal sub ACE-Step pentru Backend (dreapta jos)

wt -w 0 new-tab -p "Command Prompt" --title "Frontend" cmd /k "cd /d D:\VocalForge\frontend && npm run dev" ; ^
split-pane -v -p "Git Bash" --title "ACE-Step (Lazy Load)" C:\PROGRA~1\Git\usr\bin\bash.exe --login -i /d/VocalForge/start_acestep_env.sh ; ^
split-pane -H -p "Command Prompt" --title "Backend" cmd /k "cd /d D:\VocalForge && call venv\Scripts\activate.bat && set PYTHONPATH=. && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"

echo.
echo Toate serviciile pornesc in Windows Terminal...
echo ACE-Step:  http://localhost:8001 (Lazy Loading)
echo Backend:   http://localhost:8000
echo Frontend:  http://localhost:3000
echo.
echo Modele ACE-Step disponibile (incarcare dinamica):
echo   - acestep-v15-turbo (8 steps, rapid)
echo   - acestep-v15-base (50 steps, toate feature-urile)
echo   - acestep-v15-sft (50 steps, calitate inalta)
echo.

timeout /t 10 /nobreak >nul
start http://localhost:3000
