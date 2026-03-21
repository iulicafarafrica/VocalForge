@echo off
title VocalForge v3.1.2 - Setup
color 0B
echo.
echo  ============================================
echo   VocalForge v3.1.2 - Complete Setup
echo   LLM Enabled + CoT Logging + Custom EQ
echo   RTX 3070 8GB VRAM + 32GB RAM Optimized
echo  ============================================
echo.

:: ============================================
:: PRE-INSTALLATION CHECKS
:: ============================================

:: Check Python
python --version 2>nul
if errorlevel 1 (
    echo [ERROR] Python not found!
    echo Please install Python 3.10+ from https://www.python.org/
    echo Make sure to check "Add Python to PATH" during install.
    pause
    exit /b 1
)

:: Check Node.js
node --version 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

:: Check FFmpeg (CRITICAL)
ffmpeg -version 2>nul
if errorlevel 1 (
    echo [INFO] FFmpeg not found - installing...
    winget install ffmpeg --silent
    if errorlevel 1 (
        echo [ERROR] FFmpeg installation failed!
        echo Please install manually from https://ffmpeg.org/
        pause
        exit /b 1
    )
)

:: Check Git LFS (MEDIUM)
git lfs version 2>nul
if errorlevel 1 (
    echo [INFO] Git LFS not found - installing...
    winget install Git.Git.LFS --silent
    if errorlevel 1 (
        echo [WARN] Git LFS installation failed
        echo Large models may not download correctly
    )
)

:: Check Visual C++ Redistributable
echo [INFO] Checking Visual C++ Redistributable...
reg query "HKLM\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Installing Visual C++ Redistributable...
    winget install Microsoft.VCRedist.2015+.x64 --silent
)

:: Check CUDA (OPTIONAL)
nvcc --version 2>nul
if errorlevel 1 (
    echo [INFO] CUDA Toolkit not in PATH
    echo PyTorch will use bundled CUDA runtime (OK for most tasks)
    echo.
)

:: ============================================
:: PYTHON ENVIRONMENT
:: ============================================

echo [1/8] Creating Python virtual environment...
if exist "venv" (
    echo [INFO] Removing old venv...
    rmdir /s /q venv 2>nul
)
python -m venv venv
if errorlevel 1 (
    echo [ERROR] venv creation failed
    pause
    exit /b 1
)

echo [2/8] Activating virtualenv...
call venv\Scripts\activate

:: ============================================
:: PYTORCH WITH CUDA
:: ============================================

echo [3/8] Installing PyTorch with CUDA 12.1 (RTX 3070)...
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 --quiet
if errorlevel 1 (
    echo [WARN] CUDA 12.1 failed, trying CUDA 11.8...
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118 --quiet
    if errorlevel 1 (
        echo [WARN] CUDA install failed, falling back to CPU...
        pip install torch torchvision torchaudio --quiet
    )
)

:: ============================================
:: CORE DEPENDENCIES
:: ============================================

echo [4/8] Installing core Python dependencies...
pip install fastapi uvicorn python-dotenv httpx requests --quiet

:: ============================================
:: AUDIO PROCESSING
:: ============================================

echo [5/8] Installing audio processing libraries...
pip install librosa soundfile pydub scipy numpy --quiet

:: ============================================
:: STEM SEPARATION
:: ============================================

echo [6/8] Installing stem separation tools...
pip install demucs audio-separator --quiet

:: ============================================
:: AUDIO ANALYSIS
:: ============================================

echo [7/8] Installing audio analysis tools...
pip install madmom essentia-tensorflow pystoi pesq --quiet

:: ============================================
:: FRONTEND
:: ============================================

echo [8/8] Installing frontend dependencies...
if exist "frontend\package.json" (
    cd frontend
    call npm install --silent
    cd ..
) else (
    echo [WARN] frontend/package.json not found
)

:: ============================================
:: ACE-STEP CHECK
:: ============================================

echo [9/9] Checking ACE-Step configuration...
if exist "ace-step\.env" (
    echo [OK] ACE-Step configuration found
) else (
    echo [WARN] ace-step/.env not found - will use defaults
)

:: ============================================
:: GPU VERIFICATION
:: ============================================

echo.
echo  ============================================
echo   Verifying GPU Configuration
echo  ============================================
python -c "import torch; cuda=torch.cuda.is_available(); name=torch.cuda.get_device_name(0) if cuda else 'CPU only'; vram=f'{torch.cuda.get_device_properties(0).total_memory//1024//1024//1024}GB' if cuda else 'N/A'; print(f'  GPU: {name}'); print(f'  CUDA Available: {cuda}'); print(f'  VRAM: {vram}')"

:: ============================================
:: FINAL VERIFICATION
:: ============================================

echo.
echo  ============================================
echo   Final Verification
echo  ============================================
python -c "import librosa; print('  [OK] Librosa')"
python -c "import torch; print(f'  [OK] PyTorch: {torch.__version__}')"
python -c "import demucs; print('  [OK] Demucs')" 2>nul || echo "  [WARN] Demucs - check installation"
python -c "import audio_separator; print('  [OK] Audio-Separator')" 2>nul || echo "  [WARN] Audio-Separator - check installation"
ffmpeg -version >nul 2>&1 && echo "  [OK] FFmpeg" || echo "  [WARN] FFmpeg - check installation"

:: ============================================
:: COMPLETION
:: ============================================

echo.
echo  ============================================
echo   Setup Complete!
echo  ============================================
echo.
echo  TO START ALL SERVICES:
echo    Double-click START_ALL.bat
echo.
echo  OR start individually:
echo    - start_frontend.bat   (Port 3000 - React/Vite)
echo    - start_backend.bat    (Port 8000 - FastAPI Main)
echo    - start_acestep.bat    (Port 8001 - ACE-Step API)
echo.
echo  Then open: http://localhost:3000
echo.
echo  Active Features (v3.1.2):
echo    ✓ LLM Enabled (acestep-5Hz-lm-0.6B)
echo    ✓ CoT Logging (Caption/Language/Thinking)
echo    ✓ Custom EQ (13 genre presets)
echo    ✓ Audio Enhancer (Noise Hiss removal)
echo    ✓ ACE-Step Music Generation
echo    ✓ Stem Separation (BS-RoFormer SDR 12.97)
echo    ✓ GPU Memory Management
echo.
echo  Removed (v3.1.1):
echo    ✗ RVC Voice Conversion (stability issues)
echo    ✗ Vocal Pipeline (disabled until refactored)
echo.
echo  ============================================
pause
