@echo off
:: qwen_write.bat - Wrapper pentru Qwen/AionUI
:: Executa scriptul PowerShell temp creat de Qwen
:: 
:: FLUX CORECT pentru Qwen:
:: 1. Qwen foloseste python pentru a scrie .ps1 temp:
::      python -c "open('.qwen_temp.ps1','w',encoding='utf-8').write(open('.qwen_input.txt','r',encoding='utf-8').read())"
:: 2. Sau Qwen scrie direct .qwen_temp.ps1 via python write_file.py
:: 3. Apoi ruleaza: qwen_write.bat

powershell.exe -ExecutionPolicy Bypass -File "%~dp0.qwen_temp.ps1"
if %errorlevel% neq 0 (
    echo [EROARE] Scriptul a esuat cu codul: %errorlevel%
    exit /b %errorlevel%
)
echo [OK] Script executat cu succes.
del "%~dp0.qwen_temp.ps1" 2>nul
