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

echo [2/3] Verificare Windows Terminal...
where wt >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Windows Terminal detectat
    set USE_WT=1
) else (
    echo [WARN] Windows Terminal nu e instalat, se folosesc ferestre CMD
    set USE_WT=0
)
echo.

echo [3/3] Pornire servicii...
echo.

if "%USE_WT%"=="1" (
    :: Windows Terminal version (preferred)
    echo [START] Deschidere Windows Terminal cu 3 tab-uri...
    
    :: Create temporary batch files for each service
    echo @echo off > "%TEMP%\acestep_start.bat"
    echo cd /d D:\VocalForge\ace-step >> "%TEMP%\acestep_start.bat"
    echo call start_acestep.bat >> "%TEMP%\acestep_start.bat"
    
    echo @echo off > "%TEMP%\backend_start.bat"
    echo cd /d D:\VocalForge >> "%TEMP%\backend_start.bat"
    echo call venv\Scripts\activate.bat >> "%TEMP%\backend_start.bat"
    echo set PYTHONPATH=. >> "%TEMP%\backend_start.bat"
    echo python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 >> "%TEMP%\backend_start.bat"
    
    echo @echo off > "%TEMP%\frontend_start.bat"
    echo cd /d D:\VocalForge\frontend >> "%TEMP%\frontend_start.bat"
    echo npm run dev >> "%TEMP%\frontend_start.bat"
    
    :: Open Windows Terminal with 3 tabs
    start "" wt --maximized ^
      --tab "ACE-Step :8001" --tabColor "#1a6b3c" cmd /k "%TEMP%\acestep_start.bat" ^
      --tab "Backend :8000" --tabColor "#1a3a6b" cmd /k "%TEMP%\backend_start.bat" ^
      --tab "Frontend :3000" --tabColor "#6b1a6b" cmd /k "%TEMP%\frontend_start.bat"
) else (
    :: Fallback to separate CMD windows
    echo [START] Deschidere ferestre CMD separate...
    start "ACE-Step :8001" cmd /k "cd /d D:\VocalForge\ace-step && call start_acestep.bat"
    timeout /t 2 /nobreak >nul
    start "Backend :8000" cmd /k "cd /d D:\VocalForge && call venv\Scripts\activate.bat && set PYTHONPATH=. && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"
    timeout /t 2 /nobreak >nul
    start "Frontend :3000" cmd /k "cd /d D:\VocalForge\frontend && npm run dev"
)

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
