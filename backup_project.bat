@echo off
setlocal

set SRC=D:\VocalForge

REM Get current date and time safely (avoid 'nul' and invalid chars)
for /f "tokens=1-5 delims=/:. " %%a in ("%date% %time: =0%") do (
    set DATESTAMP=%%c-%%b-%%a_%%d-%%e
)

REM Validate datestamp - if empty or invalid, use alternative format
if "%DATESTAMP%"=="" (
    for /f "tokens=2-4 delims=/ " %%a in ("%date%") do (
        for /f "tokens=1-2 delims=:. " %%d in ("%time: =0%") do (
            set DATESTAMP=%%c-%%b-%%a_%%d-%%e
        )
    )
)

set DST=D:\VocalForge_backup_%DATESTAMP%

echo.
echo ============================================
echo   VocalForge Backup
echo ============================================
echo   Source : %SRC%
echo   Dest   : %DST%
echo   Excludes: node_modules, checkpoints, models,
echo             uvr_models, so-vits-svc, __pycache__,
echo             .venv, dist, gradio_outputs, .cache, .git
echo   Excludes: ace-step, RVCWebUI, ace-step-ui-ref
echo   Excludes: .qwen, .roo, .minimax, .pip_cache
echo   Excludes: local, assets, unused, storage
echo   Excludes: test_output, test_reverb_temp, venv
echo   Excludes: *.ckpt *.pth *.pt *.bin *.safetensors
echo             *.gguf *.wav *.mp3 *.flac
echo   Excludes: *.log *.tmp *.temp *.png *.jpg *.jpeg *.gif *.pdf
echo             proiect*.txt proiect*.md
echo             qwen_*.py qwen_*.bat qwen_*.ps1 SESSION_*.md
echo ============================================
echo.

robocopy "%SRC%" "%DST%" /E ^
  /XD node_modules checkpoints uvr_models so-vits-svc models __pycache__ .venv dist gradio_outputs .cache .git ^
      ace-step RVCWebUI ace-step-ui-ref ^
      .qwen .roo .minimax .pip_cache ^
      local assets unused storage ^
      test_output test_reverb_temp venv ^
  /XF *.ckpt *.pth *.pt *.bin *.safetensors *.gguf *.wav *.mp3 *.flac ^
      *.log *.tmp *.temp *.png *.jpg *.jpeg *.gif *.pdf ^
      proiect*.txt proiect*.md ^
      qwen_*.py qwen_*.bat qwen_*.ps1 SESSION_*.md ^
      nul CON PRN AUX COM* LPT* ^
  /NFL /NDL /NJH /NJS /nc /ns /np

echo.
echo ============================================
echo   Backup DONE!
echo   Location: %DST%
echo ============================================
echo.
pause
endlocal
