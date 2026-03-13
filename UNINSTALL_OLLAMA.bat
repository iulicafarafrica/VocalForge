@echo off
title Ollama Complete Uninstaller - VocalForge
echo.
echo ============================================
echo   Ollama Complete Uninstaller
echo   VocalForge v2.0.0
echo ============================================
echo.
echo WARNING: This will completely remove Ollama
echo and ALL downloaded models (blobs).
echo.
echo Estimated space recovery: 10-50 GB
echo.
echo The following will be deleted:
echo   - C:\Users\%USERNAME%\.ollama (models/blobs)
echo   - C:\Users\%USERNAME%\AppData\Local\Ollama
echo   - C:\Users\%USERNAME%\AppData\Local\Programs\Ollama
echo   - C:\Program Files\Ollama
echo   - Registry: HKCU\Software\Ollama
echo.
echo ============================================
echo.
set /p CONFIRM="Are you sure? Type YES to continue: "
if /i not "%CONFIRM%"=="YES" (
    echo.
    echo Operation cancelled.
    pause
    exit /b 0
)
echo.
echo ============================================
echo   Starting Uninstallation...
echo ============================================
echo.

echo [1/5] Stopping Ollama processes...
taskkill /F /IM ollama.exe 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Ollama process stopped
) else (
    echo [INFO] Ollama was not running
)
echo.

echo [2/5] Uninstalling Ollama application...
winget uninstall Ollama.Ollama --force --silent 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Ollama uninstalled via winget
) else (
    echo [INFO] winget uninstall failed, continuing with manual cleanup...
)
echo.

echo [3/5] Deleting Ollama folders...
echo.

echo     - Deleting .ollama (models/blobs)...
rmdir /s /q C:\Users\%USERNAME%\.ollama 2>nul
if exist C:\Users\%USERNAME%\.ollama (
    echo     [WARN] Could not delete .ollama - files may be in use
) else (
    echo     [OK] .ollama deleted
)

echo     - Deleting AppData\Local\Ollama...
rmdir /s /q C:\Users\%USERNAME%\AppData\Local\Ollama 2>nul
if exist C:\Users\%USERNAME%\AppData\Local\Ollama (
    echo     [WARN] Could not delete AppData\Local\Ollama
) else (
    echo     [OK] AppData\Local\Ollama deleted
)

echo     - Deleting AppData\Local\Programs\Ollama...
rmdir /s /q C:\Users\%USERNAME%\AppData\Local\Programs\Ollama 2>nul
if exist C:\Users\%USERNAME%\AppData\Local\Programs\Ollama (
    echo     [WARN] Could not delete AppData\Local\Programs\Ollama
) else (
    echo     [OK] AppData\Local\Programs\Ollama deleted
)

echo     - Deleting Program Files\Ollama...
rmdir /s /q C:\Program Files\Ollama 2>nul
if exist C:\Program Files\Ollama (
    echo     [WARN] Could not delete Program Files\Ollama
) else (
    echo     [OK] Program Files\Ollama deleted
)
echo.

echo [4/5] Cleaning registry...
reg delete "HKCU\Software\Ollama" /f 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Registry cleaned
) else (
    echo [INFO] No Ollama registry keys found
)
echo.

echo [5/5] Checking for remaining files...
set REMAINING=0
if exist C:\Users\%USERNAME%\.ollama set /a REMAINING+=1
if exist C:\Users\%USERNAME%\AppData\Local\Ollama set /a REMAINING+=1
if exist C:\Program Files\Ollama set /a REMAINING+=1

if %REMAINING% EQU 0 (
    echo [OK] All Ollama files removed successfully
) else (
    echo [WARN] %REMAINING% folder(s) could not be deleted
    echo        Some files may be in use by another process
)
echo.

echo ============================================
echo   UNINSTALLATION COMPLETE!
echo ============================================
echo.
echo Ollama has been completely removed from your system.
echo.
echo To verify disk space freed:
echo   dir C:\Users\%USERNAME%
echo.
echo To reinstall Ollama later:
echo   winget install Ollama.Ollama
echo.
pause
