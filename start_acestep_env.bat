@echo off
cd /d D:\VocalForge\ace-step

:: Seteaza variabilele manual din .env
set ACESTEP_CONFIG_PATH=acestep-v15-turbo
set ACESTEP_LM_MODEL_PATH=acestep-5Hz-lm-0.6B
set ACESTEP_DEVICE=cuda
set ACESTEP_LM_BACKEND=pt
set ACESTEP_INIT_LLM=false
set ACESTEP_DOWNLOAD_SOURCE=auto
set ACESTEP_API_HOST=0.0.0.0
set ACESTEP_API_PORT=8001
set ACESTEP_OFFLOAD_TO_CPU=false
set ACESTEP_OFFLOAD_DIT_TO_CPU=false
set ACESTEP_BATCH_SIZE=1
set ACESTEP_VAE_ON_CPU=0
set XFORMERS_FORCE_DISABLE_TRITON=1
set ACESTEP_VAE_DECODE_CHUNK_SIZE=512
set ACESTEP_VAE_DECODE_OVERLAP=16
set CUDA_VISIBLE_DEVICES=0

echo  Configuratie incarcata:
echo    OFFLOAD_TO_CPU=%ACESTEP_OFFLOAD_TO_CPU%
echo    OFFLOAD_DIT_TO_CPU=%ACESTEP_OFFLOAD_DIT_TO_CPU%
echo    VAE_ON_CPU=%ACESTEP_VAE_ON_CPU%
echo    DEVICE=%ACESTEP_DEVICE%
echo.

:: Porneste serverul
call .venv\Scripts\activate.bat
python -m acestep.api_server --host 0.0.0.0 --port 8001
