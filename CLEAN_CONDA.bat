@echo off
title Conda Cache Cleaner - VocalForge
echo.
echo ============================================
echo   Conda Cache Cleaner
echo   VocalForge v2.0.0
echo ============================================
echo.
echo This will clean conda cache and free up disk space.
echo.
echo The following will be cleaned:
echo   - Package cache (unused packages)
echo   - Tarballs (downloaded archives)
echo   - Index cache
echo   - Unused environments
echo.
echo Estimated space recovery: 5-15 GB
echo.
pause
echo.
echo ============================================
echo   Cleaning Conda Cache...
echo ============================================
echo.

echo [1/4] Cleaning package cache...
call conda clean --packages --yes
if %ERRORLEVEL% EQU 0 (
    echo [OK] Package cache cleaned
) else (
    echo [WARN] Package cache cleaning failed
)
echo.

echo [2/4] Cleaning tarballs...
call conda clean --tarballs --yes
if %ERRORLEVEL% EQU 0 (
    echo [OK] Tarballs cleaned
) else (
    echo [WARN] Tarballs cleaning failed
)
echo.

echo [3/4] Cleaning index cache...
call conda clean --index-cache --yes
if %ERRORLEVEL% EQU 0 (
    echo [OK] Index cache cleaned
) else (
    echo [WARN] Index cache cleaning failed
)
echo.

echo [4/4] Removing unused environments...
call conda clean --unused --yes
if %ERRORLEVEL% EQU 0 (
    echo [OK] Unused environments removed
) else (
    echo [WARN] Unused environments removal failed
)
echo.

echo ============================================
echo   CLEANUP COMPLETE!
echo ============================================
echo.
echo To see how much space was freed, run:
echo   dir C:\Users\gigid\miniconda3
echo.
echo Tip: Run this script once a week to keep conda clean.
echo.
pause
