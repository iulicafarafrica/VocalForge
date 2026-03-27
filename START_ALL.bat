@echo off
title VocalForge v3.1.0 Launcher
echo.
echo ============================================
echo   VocalForge v3.1.0 - AI Music Studio
echo ============================================
echo.
echo Starting services...
echo.

:: Start Ollama first (External LLM for prompt expansion)
echo [1/4] Starting Ollama (External LLM)...
start "" ollama serve
timeout /t 3 /nobreak >nul
echo     ✓ Ollama started on port 11434
echo.

:: Launch PowerShell script for remaining services
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
echo.
echo RAM Management:
echo   - LLM enabled for text-to-music generation
echo   - Expected RAM: ~6-8GB at startup
echo   - To free RAM: Run RESTART_ACESTEP.bat
echo.
echo Press any key to exit...
pause >nul
