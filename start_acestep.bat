@echo off
title ACE-Step v1.5 API Server
color 0A
echo.
echo  ============================================
echo   ACE-Step v1.5 - Music Generation API
echo   Port: 8001
echo  ============================================
echo.

cd /d d:\VocalForge\ace-step

:: Kill anything on port 8001
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8001 " ^| findstr "LISTENING"') do (
    echo   Killing PID %%a on port 8001...
    taskkill /PID %%a /F >nul 2>&1
)

echo  Starting ACE-Step API server...
echo  API: http://localhost:8001
echo  Docs: http://localhost:8001/docs
echo  Health: http://localhost:8001/health
echo.

C:\Users\gigid\.local\bin\uv.exe run acestep-api --host 0.0.0.0 --port 8001

pause
