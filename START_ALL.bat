@echo off
title VocalForge Launcher

echo Curatare porturi...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8001 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul

echo Pornire servicii in Windows Terminal...

:: Create temporary batch files for each service
echo @echo off > "%TEMP%\vocalforge_acestep.bat"
echo cd /d D:\VocalForge\ace-step >> "%TEMP%\vocalforge_acestep.bat"
echo call start_acestep.bat >> "%TEMP%\vocalforge_acestep.bat"

echo @echo off > "%TEMP%\vocalforge_backend.bat"
echo cd /d D:\VocalForge >> "%TEMP%\vocalforge_backend.bat"
echo call venv\Scripts\activate.bat >> "%TEMP%\vocalforge_backend.bat"
echo set PYTHONPATH=. >> "%TEMP%\vocalforge_backend.bat"
echo python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 >> "%TEMP%\vocalforge_backend.bat"

echo @echo off > "%TEMP%\vocalforge_frontend.bat"
echo cd /d D:\VocalForge\frontend >> "%TEMP%\vocalforge_frontend.bat"
echo npm run dev >> "%TEMP%\vocalforge_frontend.bat"

:: Open Windows Terminal with 3 tabs
start "" wt -M ^
  --tab "ACE-Step :8001" --tabColor "#1a6b3c" cmd /k "%TEMP%\vocalforge_acestep.bat" ^
  --tab "Backend :8000" --tabColor "#1a3a6b" cmd /k "%TEMP%\vocalforge_backend.bat" ^
  --tab "Frontend :3000" --tabColor "#6b1a6b" cmd /k "%TEMP%\vocalforge_frontend.bat"

echo.
echo Toate serviciile pornesc in Windows Terminal...
echo ACE-Step:  http://localhost:8001
echo Backend:   http://localhost:8000
echo Frontend:  http://localhost:3000
echo.
timeout /t 15 /nobreak >nul
start http://localhost:3000
