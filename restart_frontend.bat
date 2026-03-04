@echo off
title VocalForge - Clear Vite Cache and Restart Frontend
color 0B
echo.
echo ================================================
echo   VocalForge - Clear Vite Cache and Restart
echo ================================================
echo.

echo [1/3] Stopping any running Vite processes...
taskkill /F /FI "WINDOWTITLE eq *Frontend*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq *vite*" >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/3] Clearing Vite cache...
cd /d d:\VocalForge\frontend
if exist "node_modules\.vite" (
    rmdir /s /q "node_modules\.vite"
    echo Cache cleared.
) else (
    echo No cache found.
)

if exist "dist" (
    rmdir /s /q "dist"
    echo Dist folder cleared.
)

echo.
echo [3/3] Starting Vite dev server...
echo.
echo  Frontend URL: http://localhost:3000
echo  HMR should now work properly!
echo.
echo  Press Ctrl+C to stop the server
echo.

npm run dev
