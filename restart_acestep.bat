@echo off
echo Restarting ACE-Step API Server...
echo.

REM Stop the running ACE-Step server
echo Stopping ACE-Step server (PID 13204)...
taskkill /F /PID 13204 2>nul
if %errorlevel% neq 0 (
    echo Server not running or already stopped.
)

REM Wait a moment for port to be released
timeout /t 2 /nobreak >nul

REM Start the ACE-Step server
echo Starting ACE-Step API server...
cd /d "%~dp0ace-step"
start "ACE-Step API" cmd /c "start_api_server.bat"

echo.
echo ACE-Step API server is restarting...
echo Check the ACE-Step window for status.
pause
