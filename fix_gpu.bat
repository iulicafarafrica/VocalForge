@echo off
title Fix VocalForge GPU/CUDA Support

echo ================================================================
echo   VocalForge GPU/CUDA Fix Script
echo   RTX 3070 (8GB VRAM) Configuration
echo ================================================================
echo.

REM Step 1: Check NVIDIA GPU detection
echo [1/6] Checking NVIDIA GPU detection...
nvidia-smi >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] NVIDIA GPU not detected! Install NVIDIA drivers first.
    echo Download from: https://www.nvidia.com/drivers
    pause
    exit /b 1
)
echo [OK] NVIDIA GPU detected
echo.

REM Step 2: Stop all running processes
echo [2/6] Stopping existing processes...
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo [OK] Processes stopped
echo.

REM Step 3: Activate venv and check current PyTorch
echo [3/6] Checking current PyTorch installation...
cd /d d:\VocalForge
call venv\Scripts\activate

python -c "import torch; print('CUDA available:', torch.cuda.is_available()); print('CUDA version:', torch.version.cuda if torch.cuda.is_available() else 'N/A'); print('Device count:', torch.cuda.device_count())" > torch_check.txt 2>&1
type torch_check.txt
findstr /C:"CUDA available: False" torch_check.txt >nul
if %errorlevel% equ 0 (
    echo [WARN] PyTorch CPU-only detected. Reinstalling with CUDA support...
) else (
    echo [OK] PyTorch CUDA support detected
)
del torch_check.txt
echo.

REM Step 4: Reinstall PyTorch with CUDA 12.1
echo [4/6] Installing PyTorch with CUDA 12.1 support...
echo This may take 5-10 minutes depending on your internet connection...
pip uninstall torch torchvision torchaudio -y >nul 2>&1
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install PyTorch with CUDA!
    pause
    exit /b 1
)
echo [OK] PyTorch CUDA installed
echo.

REM Step 5: Verify installation
echo [5/6] Verifying PyTorch CUDA installation...
python -c "import torch; print('CUDA available:', torch.cuda.is_available()); print('CUDA version:', torch.version.cuda); print('Device count:', torch.cuda.device_count()); print('GPU Name:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A'); print('VRAM:', round(torch.cuda.get_device_properties(0).total_memory / 1024**3, 2), 'GB' if torch.cuda.is_available() else 'N/A')"
echo.

REM Step 6: Update .env files
echo [6/6] Updating configuration files...

REM Update VocalForge .env
echo # VocalForge Environment Configuration > .env
echo # ───────────────────────────────────────────────────────────── >> .env
echo. >> .env
echo # GPU Configuration >> .env
echo # NVIDIA GeForce RTX 3070 (8GB) >> .env
echo CUDA_VISIBLE_DEVICES=0 >> .env
echo. >> .env
echo # Optional: Enable torch.compile for better performance >> .env
echo # ACESTEP_COMPILE_MODEL=1 >> .env
echo [OK] Updated D:\VocalForge\.env

REM Update ACE-Step .env with optimized settings for 8GB VRAM
echo # ACE-Step Environment Configuration for VocalForge > ace-step\.env
echo # This file configures ACE-Step v1.5 API server >> ace-step\.env
echo. >> ace-step\.env
echo # ==================== Model Settings ==================== >> ace-step\.env
echo # DiT model path - using turbo for best quality/speed balance >> ace-step\.env
echo ACESTEP_CONFIG_PATH=acestep-v15-turbo >> ace-step\.env
echo. >> ace-step\.env
echo # LM model path - DISABLED for 8GB VRAM (more headroom) >> ace-step\.env
echo ACESTEP_LM_MODEL_PATH=acestep-5Hz-lm-0.6B >> ace-step\.env
echo. >> ace-step\.env
echo # Device selection: auto, cuda, cpu >> ace-step\.env
echo ACESTEP_DEVICE=cuda >> ace-step\.env
echo. >> ace-step\.env
echo # LM backend: vllm (faster) or pt (PyTorch native) >> ace-step\.env
echo ACESTEP_LM_BACKEND=pt >> ace-step\.env
echo. >> ace-step\.env
echo # ==================== LLM Initialization ==================== >> ace-step\.env
echo # DISABLED for 8GB VRAM - more memory for generation >> ace-step\.env
echo ACESTEP_INIT_LLM=false >> ace-step\.env
echo. >> ace-step\.env
echo # ==================== Download Settings ==================== >> ace-step\.env
echo ACESTEP_DOWNLOAD_SOURCE=auto >> ace-step\.env
echo. >> ace-step\.env
echo # ==================== API Server Settings ==================== >> ace-step\.env
echo # Empty = no authentication required (local dev) >> ace-step\.env
echo ACESTEP_API_KEY= >> ace-step\.env
echo. >> ace-step\.env
echo ACESTEP_API_HOST=0.0.0.0 >> ace-step\.env
echo ACESTEP_API_PORT=8001 >> ace-step\.env
echo. >> ace-step\.env
echo # ==================== Gradio UI Settings ==================== >> ace-step\.env
echo PORT=7860 >> ace-step\.env
echo SERVER_NAME=0.0.0.0 >> ace-step\.env
echo LANGUAGE=en >> ace-step\.env
echo. >> ace-step\.env
echo # ==================== GPU Optimization Settings ==================== >> ace-step\.env
echo # For RTX 3070 8GB VRAM >> ace-step\.env
echo ACESTEP_OFFLOAD_TO_CPU=true >> ace-step\.env
echo ACESTEP_OFFLOAD_DIT_TO_CPU=true >> ace-step\.env
echo ACESTEP_BATCH_SIZE=1 >> ace-step\.env
echo. >> ace-step\.env
echo # Force VAE decode on CPU to save ~1.5GB VRAM >> ace-step\.env
echo ACESTEP_VAE_ON_CPU=1 >> ace-step\.env
echo. >> ace-step\.env
echo # Enable memory efficient attention >> ace-step\.env
echo XFORMERS_FORCE_DISABLE_TRITON=1 >> ace-step\.env
echo [OK] Updated D:\VocalForge\ace-step\.env
echo.

echo ================================================================
echo   GPU Fix Complete!
echo ================================================================
echo.
echo Next steps:
echo   1. Close this window
echo   2. Run: d:\VocalForge\START_ALL.bat
echo   3. Wait 60 seconds for initialization
echo   4. Try generating music (30s test recommended)
echo.
echo Expected backend output after restart:
echo   Device : cuda
echo   VRAM   : 8.0 GB
echo.
pause
