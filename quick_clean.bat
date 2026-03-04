@echo off
title Quick Clean - GPU VRAM & Ports
color 0E

echo [Quick Clean] Killing Python/Node processes and freeing GPU VRAM...

REM Kill Python on specific ports
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 :8001 :8002 :3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

REM Kill all Python
taskkill /F /FI "IMAGENAME eq python.exe" >nul 2>&1
taskkill /F /FI "IMAGENAME eq pythonw.exe" >nul 2>&1

REM Kill Node.js
taskkill /F /FI "IMAGENAME eq node.exe" >nul 2>&1

REM Kill CUDA processes
for /f "tokens=2 delims=," %%a in ('nvidia-smi --query-compute-apps=pid --format=csv,noheader 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 2 /nobreak >nul

echo [OK] Clean complete!
echo.
echo GPU Memory:
nvidia-smi --query-gpu=memory.used --format=csv,noheader
echo.
