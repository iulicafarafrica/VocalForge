#!/bin/bash
cd /d/VocalForge/ace-step

# =============================================================================
# DEFAULT MODEL: acestep-v15-turbo (8 steps, fast)
# =============================================================================
# Optimized for RTX 3070 8GB VRAM
# Fast generation with turbo model
# =============================================================================

export ACESTEP_NO_INIT=0

# LLM ENABLED for lyrics
export ACESTEP_INIT_LLM=true
export ACESTEP_LM_MODEL_PATH=acestep-5Hz-lm-0.6B

# DEFAULT MODEL - Turbo (8 steps, fast)
export ACESTEP_CONFIG_PATH=acestep-v15-turbo

# VAE optimization for 8GB VRAM
export ACESTEP_VAE_ON_CPU=1
export ACESTEP_VAE_DECODE_CHUNK_SIZE=256
export ACESTEP_OFFLOAD_TO_CPU=true
export ACESTEP_OFFLOAD_DIT_TO_CPU=false
export ACESTEP_OFFLOAD_DIT_TO_CPU=false

# Model configuration
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
echo "  Mode: LAZY LOADING (on-demand)"
echo "  OFFLOAD_TO_CPU: $ACESTEP_OFFLOAD_TO_CPU"
echo "  VAE_ON_CPU: $ACESTEP_VAE_ON_CPU"
echo "==================================="
echo ""
echo "Default Model: acestep-v15-turbo (8 steps, fast)"
echo ""
echo "VRAM Usage: ~2-4 GB at startup"
echo "              +4-6 GB when model loads"
echo ""
echo "Model loads automatically on first request"
echo "via /v1/init endpoint"
echo ""

python main.py
