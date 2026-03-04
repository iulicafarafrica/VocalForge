#!/bin/bash
cd /d/VocalForge/ace-step

export ACESTEP_CONFIG_PATH=acestep-v15-turbo
export ACESTEP_LM_MODEL_PATH=acestep-5Hz-lm-0.6B
export ACESTEP_DEVICE=cuda
export ACESTEP_LM_BACKEND=pt
export ACESTEP_INIT_LLM=true
export ACESTEP_DOWNLOAD_SOURCE=auto
export ACESTEP_API_HOST=0.0.0.0
export ACESTEP_API_PORT=8001
export ACESTEP_OFFLOAD_TO_CPU=true
export ACESTEP_OFFLOAD_DIT_TO_CPU=false
export ACESTEP_BATCH_SIZE=1
export ACESTEP_VAE_ON_CPU=0
export XFORMERS_FORCE_DISABLE_TRITON=1
export ACESTEP_VAE_DECODE_CHUNK_SIZE=512
export ACESTEP_VAE_DECODE_OVERLAP=16
export CUDA_VISIBLE_DEVICES=0

echo "==================================="
echo "  ACE-Step v1.5 API Server"
echo "  Port: 8001"
echo "  OFFLOAD_TO_CPU: $ACESTEP_OFFLOAD_TO_CPU"
echo "  VAE_ON_CPU: $ACESTEP_VAE_ON_CPU"
echo "==================================="

/c/Users/gigid/.local/bin/uv.exe run acestep-api --host 0.0.0.0 --port 8001
