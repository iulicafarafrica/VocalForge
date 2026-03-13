@echo off
title ACE-Step v1.5 API Server (Lazy Loading)
color 0A
echo.
echo  ============================================
echo   ACE-Step v1.5 - Music Generation API
echo   Port: 8001
echo   Default Model: acestep-v15-turbo (8 steps)
echo  ============================================
echo.

cd /d d:\VocalForge\ace-step

:: Kill anything on port 8001
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8001 " ^| findstr "LISTENING"') do (
    echo   Killing PID %%a on port 8001...
    taskkill /PID %%a /F >nul 2>&1
)

:: Enable Lazy Loading - models load on-demand (saves VRAM!)
set ACESTEP_NO_INIT=1

:: Disable LLM to save RAM (recommended for 8GB VRAM)
set ACESTEP_INIT_LLM=false

:: Set default model
set ACESTEP_CONFIG_PATH=acestep-v15-turbo

echo  Starting ACE-Step API server with LAZY LOADING...
echo.
echo  Default Model: acestep-v15-turbo (8 steps, fast)
echo.
echo  Benefits:
echo    - Lower VRAM usage at startup
echo    - Model loads on first request via /v1/init
echo    - Switch models dynamically via API
echo.
echo  API: http://localhost:8001
echo  Docs: http://localhost:8001/docs
echo  Health: http://localhost:8001/health
echo.

C:\Users\gigid\.local\bin\uv.exe run acestep-api --host 0.0.0.0 --port 8001

pause
