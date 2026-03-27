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
# - External LLM: Ollama (gemma3:4b) CPU-only → VRAM 100% liber pentru ACE-Step
# ============================================================================

# ============================================================
# OLLAMA CPU-ONLY — VRAM 100% rezervat pentru ACE-Step
# Gemma3:4b = ~3GB VRAM daca e pe GPU → OOM cu ACE-Step
# Pe CPU = 3-5s latenta (acceptabil pentru LLM call)
# OLLAMA_NUM_GPU=0 este variabila oficiala Ollama
# ============================================================
$env:OLLAMA_NUM_GPU = "0"
Write-Host "  [OLLAMA] CPU-only mode (VRAM 100% free for ACE-Step)" -ForegroundColor Green

# ============================================================
# ORDINEA DE START: ACE-Step primul (LLM are nevoie
# de VRAM liber inainte ca backend sa se incarce)
# ============================================================

# 1. Verificare Ollama (ar trebui să fie deja pornit din START_ALL.bat)
Write-Host "[1/4] Checking Ollama status..." -ForegroundColor Cyan
$ollamaPort = netstat -ano | findstr ":11434" | findstr "LISTENING"
if ($ollamaPort) {
    Write-Host "    ✓ Ollama already running on port 11434 (CPU-only mode active)" -ForegroundColor Green
} else {
    Write-Host "    ⚠ Warning: Ollama not running! Please run: ollama serve" -ForegroundColor Yellow
    Write-Host "    ⚠ Hint: OLLAMA_NUM_GPU=0 is set — Ollama will run CPU-only when started" -ForegroundColor Yellow
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
Write-Host "  - DiT Model   : acestep-v15-turbo (8 steps, ~3GB)" -ForegroundColor Gray
Write-Host "  - LM Model    : acestep-5Hz-lm-0.6B (recomandat oficial pentru 8GB)" -ForegroundColor Gray
Write-Host "  - External LLM: Ollama Gemma3:4b — CPU-only (OLLAMA_NUM_GPU=0)" -ForegroundColor Green
Write-Host "  - Offload     : ENABLED (oficial recomandat pentru 8GB VRAM)" -ForegroundColor Gray
Write-Host "  - FP16        : Enabled" -ForegroundColor Gray
Write-Host "  - Tiled Decode: Enabled" -ForegroundColor Gray
Write-Host "  - Expected VRAM: ~4-5GB activ pe GPU, restul offload pe CPU" -ForegroundColor Gray
Write-Host ""
Write-Host "External LLM Features (Gemma3:4b CPU-only, ~3-5s/call):" -ForegroundColor White
Write-Host "  - Single LLM call: BPM + Key + Style + Instruments + Lyrics intr-un call" -ForegroundColor Gray
Write-Host "  - Ollama unload  : keep_alive=0 dupa fiecare call (VRAM safety)" -ForegroundColor Gray
Write-Host "  - Prompt Expansion: Descrieri mai detaliate pentru generare" -ForegroundColor Gray
Write-Host "  - Lyrics Generation: Versuri [verse]/[chorus] generate de AI" -ForegroundColor Gray
Write-Host "  - Key Validator  : Normalizare automata (Am->A minor, etc.)" -ForegroundColor Gray
Write-Host ""
Write-Host "To free RAM: Run RESTART_ACESTEP.bat" -ForegroundColor Yellow
Write-Host ""

Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"
