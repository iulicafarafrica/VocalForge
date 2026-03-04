@echo off
title VocalForge - Backend (port 8000)
color 0B
echo.
echo  VocalForge v1.7 - Backend starting...
echo  URL: http://localhost:8000
echo  Docs: http://localhost:8000/docs
echo.
cd /d "%~dp0"
call venv\Scripts\activate.bat
python backend\main.py
pause
