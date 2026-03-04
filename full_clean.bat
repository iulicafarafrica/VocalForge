@echo off
REM ============================================
REM VocalForge - Full Clean Script
REM ============================================
REM Sterge cache-uri si fisiere temporare de pe C: si D:
REM ============================================

echo ============================================
echo   VocalForge - Curatare COMPLETA (C: + D:)
echo ============================================
echo.

REM ========== D: Drive - Project Temp ==========
echo [D:] Stergere foldere temporare proiect...
if exist "backend\temp" rmdir /s /q "backend\temp"
if exist "backend\output" rmdir /s /q "backend\output"
if exist "__pycache__" rmdir /s /q "__pycache__"
if exist "backend\__pycache__" rmdir /s /q "backend\__pycache__"
if exist "backend\modules\__pycache__" rmdir /s /q "backend\modules\__pycache__"
if exist "backend\endpoints\__pycache__" rmdir /s /q "backend\endpoints\__pycache__"
if exist "frontend\__pycache__" rmdir /s /q "frontend\__pycache__"
if exist ".ruff_cache" rmdir /s /q ".ruff_cache"
if exist "backup ui" rmdir /s /q "backup ui"
del /q "*.wav" 2>nul
del /q "*.log" 2>nul
del /q "output.wav" 2>nul
echo   + Foldere temporare D: sterse
echo.

REM ========== C: Drive - pip cache ==========
echo [C:] Stergere cache pip (%USERPROFILE%\AppData\Local\pip)...
if exist "%USERPROFILE%\AppData\Local\pip\cache" (
    rmdir /s /q "%USERPROFILE%\AppData\Local\pip\cache"
    echo   + Cache pip sters
) else (
    echo   + Nu exista cache pip de sters
)
echo.

REM ========== C: Drive - npm cache ==========
echo [C:] Stergere cache npm...
call npm cache clean --force 2>nul
echo   + Cache npm curatat
echo.

REM ========== C: Drive - Windows Temp ==========
echo [C:] Stergere Windows Temp...
del /q /s "%TEMP%\*" 2>nul
echo   + Windows Temp curatat
echo.

REM ========== Configure pip cache pe D: ==========
echo Configurare pip cache pe D:...
mkdir "D:\VocalForge\.pip_cache" 2>nul
if not exist "%USERPROFILE%\pip" mkdir "%USERPROFILE%\pip"
echo [global] > "%USERPROFILE%\pip\pip.ini"
echo cache-dir = D:\VocalForge\.pip_cache >> "%USERPROFILE%\pip\pip.ini"
echo   + pip.ini creat
echo.

echo ============================================
echo   CURATARE COMPLETA!
echo ============================================
echo.
echo   Spatiu eliberat estimat: ~18 GB
echo   - pip cache C: ~15 GB
echo   - npm cache C: ~2.4 GB
echo   - Temp D: ~3 GB
echo.
echo   pip va folosi acum: D:\VocalForge\.pip_cache
echo.

pause
