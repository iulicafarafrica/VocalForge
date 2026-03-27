# launch_services.ps1
# VocalForge v3.1.0 Service Launcher
# Hardware: NVIDIA RTX 3070 8GB VRAM
$ErrorActionPreference = "Stop"

Write-Host "--- Lansare VocalForge v3.1.0 ---" -ForegroundColor Cyan
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
# - INIT_LLM=true           <-- LM se incarca la startup (text-to-music activ)
# - External LLM: Ollama (llama3.2:1b) pentru prompt expansion
# ============================================================================

# ============================================================
# ORDINEA DE START: Ollama primul, apoi ACE-Step (LLM are nevoie
# de VRAM liber inainte ca backend sa se incarce)
# ============================================================

# 1. Verificare și pornire Ollama (port 11434)
Write-Host "[1/4] Checking Ollama status..." -ForegroundColor Cyan

# Verifică dacă portul 11434 este deja în uz
$ollamaPort = netstat -ano | findstr ":11434" | findstr "LISTENING"
if ($ollamaPort) {
    Write-Host "    ✓ Ollama already running on port 11434" -ForegroundColor Green
} else {
    Write-Host "    ⚠ Ollama not running, starting..." -ForegroundColor Yellow
    Start-Process "ollama" -ArgumentList "serve" -WindowStyle Normal -NoNewWindow
    Write-Host "    Waiting 3s for Ollama to start..." -ForegroundColor Gray
    Start-Sleep -Seconds 3

    # Verifică din nou dacă a pornit
    $ollamaPort2 = netstat -ano | findstr ":11434" | findstr "LISTENING"
    if ($ollamaPort2) {
        Write-Host "    ✓ Ollama started successfully" -ForegroundColor Green
    } else {
        Write-Host "    ⚠ Warning: Ollama may not have started correctly" -ForegroundColor Yellow
    }
}

Write-Host ""

# 2. Pornire ACE-Step API (:8001)
Write-Host "[2/4] Starting ACE-Step API (port 8001)..." -ForegroundColor Cyan
Write-Host "    LM=0.6B, BACKEND=pt (PyTorch, stable on Windows), OFFLOAD=true" -ForegroundColor Gray
$aceStepArgs = "/k cd /d D:\VocalForge\ace-step && title VocalForge ACE-Step API && call .venv\Scripts\activate.bat && set CUDA_VISIBLE_DEVICES=0 && set ACESTEP_LM_MODEL_PATH=acestep-5Hz-lm-0.6B && set ACESTEP_LM_BACKEND=pt && set ACESTEP_DEVICE=cuda && set ACESTEP_INIT_LLM=true && set ACESTEP_NO_INIT=0 && set ACESTEP_FP16=true && set ACESTEP_USE_TILED_DECODE=true && set ACESTEP_BATCH_SIZE=1 && set ACESTEP_OFFLOAD_TO_CPU=true && set ACESTEP_OFFLOAD_DIT_TO_CPU=true && set ACESTEP_VAE_ON_CPU=0 && set ACESTEP_VAE_DECODE_CHUNK_SIZE=256 && set ACESTEP_AUTH_DISABLED=1 && set XFORMERS_FORCE_DISABLE_TRITON=1 && set EXTERNAL_LM_PROVIDER=ollama && set EXTERNAL_LM_MODEL=gemma3:4b && set EXTERNAL_LM_ENDPOINT=http://localhost:11434 && python acestep/api_server.py --host 0.0.0.0 --port 8001"
Start-Process "cmd.exe" -ArgumentList $aceStepArgs

# Asteapta ACE-Step + LLM sa se incarce complet inainte de restul
Write-Host "    Waiting 50s for ACE-Step + LLM to load (RTX 3070)..." -ForegroundColor Yellow
Start-Sleep -Seconds 50

# 3. Pornire Backend (FastAPI :8000)
Write-Host "[3/4] Starting Backend API (port 8000)..." -ForegroundColor Cyan
Start-Process "cmd.exe" -ArgumentList "/k cd /d D:\VocalForge && title VocalForge Backend && call venv\Scripts\activate.bat && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"

# Mica pauza intre servicii
Start-Sleep -Seconds 5

# 4. Pornire Frontend (React/Vite :3000) — ultimul, nu foloseste VRAM
Write-Host "[4/4] Starting Frontend (port 3000)..." -ForegroundColor Cyan
Start-Process "cmd.exe" -ArgumentList "/k cd /d D:\VocalForge\frontend && title VocalForge Frontend && npm run dev"

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  All services started successfully!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services:" -ForegroundColor White
Write-Host "  Ollama (External LLM)  : http://localhost:11434" -ForegroundColor Gray
Write-Host "  Frontend (React)       : http://localhost:3000" -ForegroundColor Gray
Write-Host "  Backend API            : http://localhost:8000" -ForegroundColor Gray
Write-Host "  ACE-Step API           : http://localhost:8001" -ForegroundColor Gray
Write-Host ""
Write-Host "VRAM Optimization (RTX 3070 8GB):" -ForegroundColor White
Write-Host "  - DiT Model  : acestep-v15-turbo (8 steps, ~3GB)" -ForegroundColor Gray
Write-Host "  - LM Model   : acestep-5Hz-lm-0.6B (recomandat oficial pentru 8GB)" -ForegroundColor Gray
Write-Host "  - External LLM: Ollama Gemma 3 4B (Google model, best for creative writing)" -ForegroundColor Gray
Write-Host "  - Offload    : ENABLED (oficial recomandat pentru 8GB VRAM)" -ForegroundColor Gray
Write-Host "  - FP16       : Enabled" -ForegroundColor Gray
Write-Host "  - Tiled Decode: Enabled" -ForegroundColor Gray
Write-Host "  - Expected VRAM: ~4-5GB activ pe GPU, restul offload pe CPU" -ForegroundColor Gray
Write-Host ""
Write-Host "External LLM Features:" -ForegroundColor White
Write-Host "  - Prompt Expansion: Descrieri mai detaliate pentru generare" -ForegroundColor Gray
Write-Host "  - Lyrics Generation: Versuri creative generate de AI" -ForegroundColor Gray
Write-Host "  - Query Rewriting: Transformă prompt-uri simple în descrieri detaliate" -ForegroundColor Gray
Write-Host ""
Write-Host "To free RAM: Run RESTART_ACESTEP.bat" -ForegroundColor Yellow
Write-Host ""

Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"
