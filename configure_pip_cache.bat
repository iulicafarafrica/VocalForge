@echo off
REM ============================================
REM Configureaza pip cache pe D:
REM ============================================

echo Configurare pip cache pe D:...

mkdir "D:\VocalForge\.pip_cache"

echo [global] > "%USERPROFILE%\pip\pip.ini"
echo cache-dir = D:\VocalForge\.pip_cache >> "%USERPROFILE%\pip\pip.ini"

echo.
echo pip.ini creat: %USERPROFILE%\pip\pip.ini
echo Cache-ul va fi stocat in: D:\VocalForge\.pip_cache
echo.

REM Sterge cache vechi de pe C:
echo Stergere cache pip vechi de pe C:...
if exist "%USERPROFILE%\AppData\Local\pip\cache" (
    rmdir /s /q "%USERPROFILE%\AppData\Local\pip\cache"
    echo   + Cache vechi sters
) else (
    echo   + Nu exista cache vechi de sters
)

echo.
echo ============================================
echo   CONFIGURARE COMPLETA!
echo ============================================
echo.
echo   Urmatoarele comenzi pip vor folosi D: pentru cache:
echo     pip install <package>
echo.

pause
