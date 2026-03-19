@echo off
title VocalForge v2.0.0 Launcher
echo.
echo ============================================
echo   VocalForge v2.0.0 - AI Music Studio
echo ============================================
echo.
echo Starting services...
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0launch_services.ps1"
echo.
echo ============================================
echo   All services started!
echo ============================================
echo.
echo Services:
echo   - Frontend (React/Vite) : http://localhost:3000
echo   - Backend API (FastAPI) : http://localhost:8000
echo   - ACE-Step API          : http://localhost:8001
echo   - RVC Voice Conversion  : http://localhost:8002
echo.
echo RAM Management:
echo   - LLM disabled by default (ACESTEP_INIT_LLM=false)
echo   - Expected RAM: ~2-4GB per generation
echo   - To free RAM: Run RESTART_ACESTEP.bat
echo.
echo Cleanup Scripts:
echo   - CLEAN_CONDA.bat      - Clean conda cache
echo   - RESTART_ACESTEP.bat  - Restart ACE-Step API
echo.
echo Press any key to exit...
pause >nul
