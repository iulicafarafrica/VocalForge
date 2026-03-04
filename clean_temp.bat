@echo off
REM ============================================
REM VocalForge Clean Script
REM ============================================
REM Sterge fisiere temporare si foldere regenerabile
REM ============================================

echo ============================================
echo   VocalForge - Curatare fisiere temporare
echo ============================================
echo.

echo Stergere foldere temporare...
if exist "backend\temp" rmdir /s /q "backend\temp"
if exist "backend\output" rmdir /s /q "backend\output"
if exist "__pycache__" rmdir /s /q "__pycache__"
if exist "backend\__pycache__" rmdir /s /q "backend\__pycache__"
if exist "backend\modules\__pycache__" rmdir /s /q "backend\modules\__pycache__"
if exist "backend\endpoints\__pycache__" rmdir /s /q "backend\endpoints\__pycache__"
if exist "frontend\__pycache__" rmdir /s /q "frontend\__pycache__"
if exist ".ruff_cache" rmdir /s /q ".ruff_cache"
echo   + Foldere temporare sterse
echo.

echo Stergere backup vechi...
if exist "backup ui" rmdir /s /q "backup ui"
echo   + Backup vechi sters
echo.

echo Stergere fisiere generate...
del /q "*.wav" 2>nul
del /q "*.log" 2>nul
del /q "backend\*.log" 2>nul
del /q "output.wav" 2>nul
echo   + Fisiere generate sterse
echo.

echo ============================================
echo   CURATARE COMPLETA!
echo ============================================
echo.
echo   Nota: venv/ si node_modules/ NU au fost sterse.
echo   Daca vrei sa le stergi, ruleaza manual:
echo     rmdir /s /q venv
echo     rmdir /s /q frontend\node_modules
echo.

pause
