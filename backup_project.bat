@echo off
setlocal

set SRC=D:\VocalForge
for /f "tokens=1-5 delims=/:. " %%a in ("%date% %time%") do (
    set DATESTAMP=%%c-%%b-%%a_%%d-%%e
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
echo             .venv, dist, gradio_outputs, .cache
echo   Excludes: *.ckpt *.pth *.pt *.bin *.safetensors
echo             *.wav *.mp3 *.flac *.gguf
echo ============================================
echo.

robocopy "%SRC%" "%DST%" /E ^
  /XD node_modules checkpoints uvr_models so-vits-svc models __pycache__ .venv dist gradio_outputs .cache .git ^
  /XF *.ckpt *.pth *.pt *.bin *.safetensors *.gguf *.wav *.mp3 *.flac ^
  /NFL /NDL /NJH /NJS /nc /ns /np

echo.
echo ============================================
echo   Backup DONE!
echo   Location: %DST%
echo ============================================
echo.
pause
endlocal
