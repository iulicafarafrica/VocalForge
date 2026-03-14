# launch_services.ps1
# VocalForge v2.0 Service Launcher
# Hardware: NVIDIA RTX 3070 8GB VRAM
$ErrorActionPreference = "Stop"

Write-Host "--- Lansare VocalForge v2.0 ---" -ForegroundColor Cyan
Write-Host "Hardware: NVIDIA RTX 3070 8GB VRAM" -ForegroundColor Gray
Write-Host ""

# ============================================================================
# ACE-Step Configuration for RTX 3070 8GB
# Based on official ACE-Step v1.5 documentation (tier: low/medium ~8GB)
# ============================================================================
# Conform documentatiei oficiale pentru <8GB VRAM:
# - DiT: acestep-v15-turbo (8 steps, fast)
# - LM:  acestep-5Hz-lm-0.6B (cel mai mic, recomandat pentru 8GB)
# - OFFLOAD_TO_CPU=true     <-- oficial recomandat pentru <=8GB VRAM
# - OFFLOAD_DIT_TO_CPU=true <-- oficial recomandat pentru <=8GB VRAM
# - VAE_ON_CPU=0            <-- VAE decodifica pe GPU (tiled decode activ)
# - INIT_LLM=false          <-- LM se incarca lazy la prima cerere
# ============================================================================

# 1. Pornire Frontend (React/Vite :3000)
Write-Host "[1/5] Starting Frontend (port 3000)..." -ForegroundColor Cyan
Start-Process "cmd.exe" -ArgumentList "/k cd /d D:\VocalForge\frontend && title VocalForge Frontend && npm run dev"

# 2. Pornire Backend (FastAPI :8000)
Write-Host "[2/5] Starting Backend API (port 8000)..." -ForegroundColor Cyan
Start-Process "cmd.exe" -ArgumentList "/k cd /d D:\VocalForge && title VocalForge Backend && call venv\Scripts\activate.bat && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"

# 3. Pornire ACE-Step API (:8001)
Write-Host "[3/5] Starting ACE-Step API (port 8001)..." -ForegroundColor Cyan
Write-Host "    Settings: LM=0.6B, OFFLOAD_TO_CPU=true, OFFLOAD_DIT_TO_CPU=true (oficial 8GB)" -ForegroundColor Gray
$aceStepArgs = "/k cd /d D:\VocalForge\ace-step && title VocalForge ACE-Step API && call .venv\Scripts\activate.bat && set CUDA_VISIBLE_DEVICES=0 && set ACESTEP_CONFIG_PATH=acestep-v15-turbo && set ACESTEP_LM_MODEL_PATH=acestep-5Hz-lm-0.6B && set ACESTEP_LM_BACKEND=vllm && set ACESTEP_DEVICE=cuda && set ACESTEP_INIT_LLM=false && set ACESTEP_NO_INIT=1 && set ACESTEP_FP16=true && set ACESTEP_USE_TILED_DECODE=true && set ACESTEP_BATCH_SIZE=1 && set ACESTEP_OFFLOAD_TO_CPU=true && set ACESTEP_OFFLOAD_DIT_TO_CPU=true && set ACESTEP_VAE_ON_CPU=0 && set ACESTEP_VAE_DECODE_CHUNK_SIZE=256 && set ACESTEP_AUTH_DISABLED=1 && set XFORMERS_FORCE_DISABLE_TRITON=1 && python acestep/api_server.py --host 0.0.0.0 --port 8001"
Start-Process "cmd.exe" -ArgumentList $aceStepArgs

# 4. Pornire RVC Voice Conversion (:8002)
Write-Host "[4/5] Starting RVC API (port 8002)..." -ForegroundColor Cyan
Start-Process "cmd.exe" -ArgumentList "/k cd /d D:\VocalForge && title VocalForge RVC && call venv\Scripts\activate.bat && python -m uvicorn backend.app:app --host 0.0.0.0 --port 8002"

# 5. Pornire Suno-API (:8080)
Write-Host "[5/5] Starting Suno-API (port 8080)..." -ForegroundColor Cyan
Start-Process "cmd.exe" -ArgumentList "/k cd /d D:\VocalForge && title VocalForge Suno-API && python suno-api/start_suno.py"

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  All services started successfully!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services:" -ForegroundColor White
Write-Host "  Frontend (React)     : http://localhost:3000" -ForegroundColor Gray
Write-Host "  Backend API          : http://localhost:8000" -ForegroundColor Gray
Write-Host "  ACE-Step API         : http://localhost:8001" -ForegroundColor Gray
Write-Host "  RVC Voice Conversion : http://localhost:8002" -ForegroundColor Gray
Write-Host "  Suno-API (optional)  : http://localhost:8080" -ForegroundColor Gray
Write-Host ""
Write-Host "VRAM Optimization (RTX 3070 8GB):" -ForegroundColor White
Write-Host "  - DiT Model  : acestep-v15-turbo (8 steps, ~3GB)" -ForegroundColor Gray
Write-Host "  - LM Model   : acestep-5Hz-lm-0.6B (recomandat oficial pentru 8GB)" -ForegroundColor Gray
Write-Host "  - Offload    : ENABLED (oficial recomandat pentru 8GB VRAM)" -ForegroundColor Gray
Write-Host "  - FP16       : Enabled" -ForegroundColor Gray
Write-Host "  - Tiled Decode: Enabled" -ForegroundColor Gray
Write-Host "  - Expected VRAM: ~4-5GB activ pe GPU, restul offload pe CPU" -ForegroundColor Gray
Write-Host ""
Write-Host "To free RAM: Run RESTART_ACESTEP.bat" -ForegroundColor Yellow
Write-Host ""

Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"
