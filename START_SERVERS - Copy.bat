@echo off
title VocalForge - Start All Servers
color 0B
echo.
echo  ========================================================
echo   VocalForge v1.7 - Starting All Servers
echo  ========================================================
echo.

:: Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    pause
    exit /b 1
)

:: Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    pause
    exit /b 1
)

echo [INFO] Starting servers...
echo.

:: Terminal 1: ACE-Step API Server (Port 8001)
echo [1/3] Starting ACE-Step API Server on port 8001...
start "ACE-Step API" cmd.exe /k "cd /d D:\VocalForge\ace-step && C:\Users\gigid\.local\bin\uv.exe run acestep-api --host 0.0.0.0 --port 8001"
timeout /t 3 /nobreak >nul

:: Terminal 2: VocalForge Backend (Port 8000)
echo [2/3] Starting VocalForge Backend on port 8000...
start "VocalForge Backend" cmd.exe /k "cd /d D:\VocalForge && python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000"
timeout /t 3 /nobreak >nul

:: Terminal 3: React Frontend (Port 3000)
echo [3/3] Starting React Frontend on port 3000...
start "VocalForge Frontend" cmd.exe /k "cd /d D:\VocalForge\frontend && npm run dev"

echo.
echo  ========================================================
echo   All servers are starting...
echo  ========================================================
echo.
echo  Server URLs:
echo    - ACE-Step API:    http://localhost:8001
echo    - VocalForge API:  http://localhost:8000
echo    - Frontend UI:     http://localhost:3000
echo    - API Docs:        http://localhost:8000/docs
echo.
echo  Wait 30-60 seconds for all servers to fully start.
echo.
echo  Press any key to run health check...
pause >nul

:: Run health check
echo.
echo  Running health check...
python test_acestep_fixes.py

pause
