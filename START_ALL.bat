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

:: Start ACE-Step API (:8001)
echo [2/4] Starting ACE-Step API (port 8001)...
start "" cmd.exe /k "cd /d D:\VocalForge\ace-step && call .venv\Scripts\activate.bat && set CUDA_VISIBLE_DEVICES=0 && set ACESTEP_LM_MODEL_PATH=acestep-5Hz-lm-0.6B && set ACESTEP_LM_BACKEND=pt && set ACESTEP_DEVICE=cuda && set ACESTEP_INIT_LLM=true && set ACESTEP_NO_INIT=0 && set ACESTEP_FP16=true && set ACESTEP_USE_TILED_DECODE=true && set ACESTEP_BATCH_SIZE=1 && set ACESTEP_OFFLOAD_TO_CPU=true && set ACESTEP_OFFLOAD_DIT_TO_CPU=true && set ACESTEP_VAE_ON_CPU=0 && set ACESTEP_VAE_DECODE_CHUNK_SIZE=256 && set ACESTEP_AUTH_DISABLED=1 && set XFORMERS_FORCE_DISABLE_TRITON=1 && set EXTERNAL_LM_PROVIDER=ollama && set EXTERNAL_LM_MODEL=gemma3:4b && set EXTERNAL_LM_ENDPOINT=http://localhost:11434 && python acestep/api_server.py --host 0.0.0.0 --port 8001"
timeout /t 5 /nobreak >nul

:: Start Backend API (:8000)
echo [3/4] Starting Backend API (port 8000)...
start "" cmd.exe /k "cd /d D:\VocalForge && call venv\Scripts\activate.bat && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"
timeout /t 3 /nobreak >nul

:: Start Frontend (:3000)
echo [4/4] Starting Frontend (port 3000)...
start "" cmd.exe /k "cd /d D:\VocalForge\frontend && npm run dev"

echo.
echo ============================================
echo   All services started successfully!
echo ============================================
echo.
echo Services:
echo   - Ollama (External LLM)  : http://localhost:11434
echo   - Frontend (React)       : http://localhost:3000
echo   - Backend API            : http://localhost:8000
echo   - ACE-Step API           : http://localhost:8001
echo.
echo External LLM: Gemma 3 4B (Google model, best for creative writing)
echo.
echo Press any key to exit...
pause >nul
