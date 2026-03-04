@echo off
title Reinstall Triton for ACE-Step
color 0E

echo ============================================================
echo   Reinstall Triton for ACE-Step
echo ============================================================
echo.
echo This script reinstalls triton-windows in the ACE-Step virtual environment.
echo.

echo Installing triton-windows...
C:\Users\gigid\.local\bin\uv.exe pip install --directory D:\VocalForge\ace-step "triton-windows>=3.2.0,<3.4"

echo.
echo Verifying installation...
C:\Users\gigid\.local\bin\uv.exe run --directory D:\VocalForge\ace-step python -c "import triton; print(f'Triton version: {triton.__version__}')"

echo.
echo ============================================================
echo   Done!
echo ============================================================
echo.
pause
