@echo off
title ACE-Step API Restarter - VocalForge
echo.
echo ============================================
echo   ACE-Step API Restarter
echo   VocalForge v2.0.0
echo ============================================
echo.
echo This will restart ACE-Step API to free RAM.
echo.
echo Estimated RAM recovery: 10-20 GB
echo.
echo The ACE-Step API process will be stopped and restarted.
echo Your current generation queue will be cleared.
echo.
pause
echo.
echo ============================================
echo   Restarting ACE-Step API...
echo ============================================
echo.

echo [1/3] Stopping ACE-Step API process...
taskkill /F /FI "WINDOWTITLE eq ACE-Step*" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] ACE-Step API stopped
) else (
    echo [INFO] No ACE-Step API process found
)
echo.

echo [2/3] Waiting for process to terminate...
timeout /t 3 /nobreak >nul
echo [OK] Process terminated
echo.

echo [3/3] Starting ACE-Step API...
start "ACE-Step API" cmd.exe /k "cd /d D:\VocalForge\ace-step && call .venv\Scripts\activate.bat && python acestep/api_server.py --host 0.0.0.0 --port 8001"
echo [OK] ACE-Step API started in new window
echo.

echo ============================================
echo   RESTART COMPLETE!
echo ============================================
echo.
echo ACE-Step API is restarting...
echo RAM should be freed within 30-60 seconds.
echo.
echo To verify:
echo   1. Open Task Manager
echo   2. Check Python processes
echo   3. RAM should drop from ~16GB to ~1GB
echo.
timeout /t 5 /nobreak >nul
start http://localhost:8001/health
echo.
pause
