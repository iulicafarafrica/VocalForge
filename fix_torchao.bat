@echo off
echo ============================================================
echo Fixing torchao compatibility issue for ACE-Step
echo Issue: https://github.com/pytorch/ao/issues/2919
echo ============================================================
echo.

set ACE_STEP_DIR=%~dp0ace-step
set TORCHAO_FILE=%ACE_STEP_DIR%\.venv\Lib\site-packages\diffusers\quantizers\torchao\torchao_quantizer.py

echo Checking torchao_quantizer.py...
if exist "%TORCHAO_FILE%" (
    echo Found: %TORCHAO_FILE%
    
    REM Check if already patched
    findstr /C:"logger = logging.get_logger" "%TORCHAO_FILE%" >nul
    if %ERRORLEVEL% EQU 0 (
        echo File is already patched!
    ) else (
        echo Patching torchao_quantizer.py...
        
        REM Create backup
        copy "%TORCHAO_FILE%" "%TORCHAO_FILE%.bak" >nul
        echo Backup created: %TORCHAO_FILE%.bak
        
        REM Create patched file using PowerShell
        powershell -Command ^
            "$content = Get-Content '%TORCHAO_FILE%' -Raw; ^
            if ($content -match 'from \.\.base import DiffusersQuantizer') { ^
                $patched = $content -replace '(from \.\.base import DiffusersQuantizer)', '$1`n`nlogger = logging.get_logger(__name__)'; ^
                Set-Content '%TORCHAO_FILE%' $patched -NoNewline; ^
                Write-Host 'Patch applied successfully!' ^
            } else { ^
                Write-Host 'Pattern not found, manual patch required' ^
            }"
    )
) else (
    echo File not found: %TORCHAO_FILE%
    echo Please ensure ACE-Step is installed in %ACE_STEP_DIR%
)

echo.
echo ============================================================
echo Fix complete! Try starting the server again.
echo ============================================================
pause
