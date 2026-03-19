@echo off
title VocalForge - Restart ACE-Step
color 0A

echo.
echo  ============================================
echo   RESTART ACE-Step API (RAM Cleanup)
echo  ============================================
echo.

:: ---- Kill ACE-Step process pe portul 8001 ----
echo  [>>] Opresc ACE-Step pe portul 8001...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8001" ^| find "LISTENING"') do (
    echo  [>>] Killing PID %%a...
    taskkill /PID %%a /F >nul 2>&1
)

:: ---- Asteapta sa se elibereze portul ----
timeout /t 3 /nobreak >nul
echo  [OK] ACE-Step oprit.

:: ---- Curata RAM ----
echo  [>>] Curatare RAM...
timeout /t 2 /nobreak >nul

:: ---- Reporneste ACE-Step ----
echo  [>>] Repornesc ACE-Step...
echo.

start "ACE-Step API" cmd /k "cd /d D:\VocalForge\ace-step && call .venv\Scripts\activate.bat && set ACESTEP_INIT_LLM=true && set ACESTEP_NO_INIT=1 && set ACESTEP_OFFLOAD_TO_CPU=true && set ACESTEP_VAE_ON_CPU=0 && set XFORMERS_FORCE_DISABLE_TRITON=1 && python acestep/api_server.py --host 0.0.0.0 --port 8001"

echo.
echo  [OK] ACE-Step repornit!
echo.
echo  Asteapta 10-15 secunde pana se incarca...
echo  Modelul se incarca la primul request.
echo.
echo  RAM ar trebui sa fie acum la ~20-30%%
echo.
pause
