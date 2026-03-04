@echo off
title Install Missing Dependencies
color 0E

echo ============================================================
echo   Installing missing Python packages for ACE-Step
echo ============================================================
echo.

call d:\VocalForge\venv\Scripts\activate.bat

echo Installing vector_quantize_pytorch...
pip install vector_quantize_pytorch

echo.
echo Done! Press any key to close...
pause >nul