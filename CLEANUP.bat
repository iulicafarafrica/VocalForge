@echo off
title VocalForge - System Cleanup Utility
color 0C

echo ================================================
echo   VocalForge v1.7 - System Cleanup Utility
echo ================================================
echo.
echo This script will clean up:
echo   - Python processes (ports 8000, 8001, 8002)
echo   - Node.js processes
echo   - Temporary files
echo.
echo Press Ctrl+C to cancel, or any key to continue...
pause >nul

echo.
echo ================================================
echo   Starting Cleanup...
echo ================================================
echo.

REM ==================================================
REM   CLEANUP FUNCTIONS
REM ==================================================

:clean_tmp
echo [1/5] Clearing temporary files...
del /q /s %TEMP%\* >nul 2>&1
del /q /s C:\Windows\Temp\* >nul 2>&1
for /d %%i in (%TEMP%\*) do rd /q /s "%%i" >nul 2>&1 2>nul
for /d %%i in (C:\Windows\Temp\*) do rd /q /s "%%i" >nul 2>&1 2>nul
echo [OK] Temporary files cleaned
goto :eof

:clean_python_ports
echo [2/5] Killing Python processes on ports 8000, 8001, 8002...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 :8001 :8002" ^| findstr "LISTENING"') do (
    for /f "tokens=*" %%p in ('tasklist /FI "PID eq %%a" /FO CSV ^| findstr "python"') do (
        echo   Killing PID %%a (python)
        taskkill /F /PID %%a >nul 2>&1
    )
)
echo [OK] Python ports cleaned
goto :eof

:clean_all_python
echo [3/5] Killing all Python processes...
taskkill /F /FI "WINDOWTITLE eq *python*" >nul 2>&1
taskkill /F /FI "IMAGENAME eq python.exe" >nul 2>&1
taskkill /F /FI "IMAGENAME eq pythonw.exe" >nul 2>&1
timeout /t 2 /nobreak >nul
echo [OK] All Python processes killed
goto :eof

:clean_node
echo [4/5] Killing Node.js processes...
taskkill /F /FI "IMAGENAME eq node.exe" >nul 2>&1
timeout /t 1 /nobreak >nul
echo [OK] Node.js processes killed
goto :eof

:wait_for_ports
echo [5/5] Waiting for ports to be released...
timeout /t 3 /nobreak >nul
echo [OK] Ports released
goto :eof

REM ==================================================
REM   MAIN EXECUTION
REM ==================================================

call :clean_all_python
call :clean_node
call :clean_python_ports
call :clean_tmp
call :wait_for_ports

echo.
echo ================================================
echo   Cleanup Completed!
echo ================================================
echo.
echo You can now start your services with a clean state.
echo.

pause
