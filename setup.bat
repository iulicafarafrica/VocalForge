@echo off
title VocalForge v1.6 - Setup
color 0A
echo.
echo  ============================================
echo   VocalForge v1.6 - Windows Setup
echo   RTX 3070 + 32GB RAM Optimized
echo  ============================================
echo.

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

echo [1/5] Creating Python virtual environment...
python -m venv venv
if errorlevel 1 ( echo [ERROR] venv creation failed & pause & exit /b 1 )

echo [2/5] Activating virtualenv...
call venv\Scripts\activate

echo [3/5] Installing PyTorch with CUDA 12.1 (RTX 3070)...
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 --quiet
if errorlevel 1 (
    echo [WARN] CUDA install failed, trying CPU version...
    pip install torch torchvision torchaudio --quiet
)

echo [4/5] Installing Python dependencies...
pip install -r requirements.txt --quiet
if errorlevel 1 ( echo [ERROR] pip install failed & pause & exit /b 1 )

echo [5/5] Installing frontend dependencies...
cd frontend
npm install --silent
cd ..

echo.
echo  ============================================
echo   Checking GPU...
echo  ============================================
python -c "import torch; cuda=torch.cuda.is_available(); name=torch.cuda.get_device_name(0) if cuda else 'CPU only'; print(f'  GPU: {cuda} | {name}'); print(f'  VRAM: {torch.cuda.get_device_properties(0).total_memory//1024//1024//1024}GB' if cuda else '  VRAM: N/A')"

echo.
echo  ============================================
echo   Setup Complete!
echo.
echo   TO START:
echo     Double-click start_backend.bat  (Terminal 1)
echo     Double-click start_frontend.bat (Terminal 2)
echo.
echo   Then open: http://localhost:3000
echo  ============================================
pause
