#!/bin/bash
cd /d/VocalForge/ace-step

# =============================================================================
# MERGED MODEL CONFIGURATION - Best of Turbo + SFT in ONE model!
# =============================================================================
# Model: acestep_v1.5_merge_sft_turbo_ta_0.4.safetensors
# - Turbo speed (8 steps) + SFT quality
# - Single model (~5-6 GB VRAM)
# - No lazy loading needed
# =============================================================================

export ACESTEP_NO_INIT=0

# LLM ENABLED for lyrics
export ACESTEP_INIT_LLM=true
export ACESTEP_LM_MODEL_PATH=acestep-5Hz-lm-0.6B

# MERGED MODEL - replaces standard turbo
export ACESTEP_CONFIG_PATH=acestep-v15-merge

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
echo "Models (loaded on first request):"
echo "  1. acestep-v15-turbo (8 steps, fast)"
echo "  2. acestep-v15-base (50 steps, all features)"
echo "  3. acestep-v15-sft (50 steps, high quality)"
echo ""
echo "VRAM Usage: ~2-4 GB at startup"
echo "              +4-6 GB per model when loaded"
echo ""
echo "Models load automatically when requested"
echo "via /v1/init endpoint"
echo ""

/c/Users/gigid/.local/bin/uv.exe run acestep-api --host 0.0.0.0 --port 8001
