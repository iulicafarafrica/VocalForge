# VocalForge - RTX 3070 8GB VRAM + 32GB RAM Optimization Guide

## ✅ Current Status: 90% Optimized

Your VocalForge project is **already well-optimized** for RTX 3070 + 32GB RAM.
Most critical optimizations are in place.

---

## 🎯 Hardware Detection

Your system will be detected as:
- **Mode**: `full` (6-8GB VRAM tier)
- **Device**: `cuda`
- **VRAM**: ~8GB
- **RAM**: 32GB (not fully utilized yet)

---

## 📋 Current Optimizations

### 1. **Backend (backend/main.py)**
```python
# VRAM-based chunk sizing
vram_gb >= 10  → chunk_size = 485100  # ~11s
vram_gb >= 6   → chunk_size = 256000  # ~5.8s ← YOUR CONFIG
vram_gb < 6    → chunk_size = 131072  # ~3s

# ACE-Step VRAM optimizations
"batch_size": 1,           # Prevents OOM
"use_tiled_decode": True,  # VRAM optimization for VAE decode
```

### 2. **Engine (core/engine.py)**
```python
# Auto-detection
if vram_gb < 4:       → "light" mode
elif vram_gb < 8:     → "full" mode   ← YOUR CONFIG
else:                 → "high_end" mode

# FP16 AMP enabled for vram_gb >= 6
self.use_amp = (device == "cuda" and vram_gb >= 6)
```

### 3. **ACE-Step (.env)**
```env
ACESTEP_CONFIG_PATH=acestep-v15-turbo     # 8 steps, fast
ACESTEP_LM_MODEL_PATH=acestep-5Hz-lm-1.7B # Perfect for 8GB VRAM
ACESTEP_DEVICE=auto                        # Auto-detect CUDA
ACESTEP_LM_BACKEND=vllm                    # Faster inference
ACESTEP_INIT_LLM=auto                      # GPU-based decision
```

---

## 🚀 Recommended Improvements for 32GB RAM

### 1. **Increase Segment Length for CPU Operations**

**File**: `core/engine.py`
```python
# Current
"full": {
    "segment_length": 2048,
    "batch_size": 1,
}

# Optimized for 32GB RAM
"full": {
    "segment_length": 4096,  # Double the buffer
    "batch_size": 1,
}
```

**Why**: With 32GB RAM, you can afford larger audio buffers for CPU-side processing
(crossfade, concatenation, effects) without impacting VRAM.

---

### 2. **Enable Parallel Segment Processing**

**File**: `backend/main.py` (UVR section)
```python
# Current
"batch_size": 1,

# Optimized (for non-GPU operations)
"batch_size": 2,  # Process 2 segments in parallel (CPU-side)
```

**Why**: GPU batch is limited to 1 (VRAM), but CPU can handle 2-3 segments
in parallel with 32GB RAM.

---

### 3. **FFmpeg Memory Buffer**

**File**: `backend/main.py`
```python
# Add near FFmpeg configuration
os.environ["FFMPEG_OPTS"] = "-max_muxing_queue_size 9999 -buffer_size 100M"
```

**Why**: Larger buffer prevents issues with long audio files.

---

### 4. **Model Caching Strategy**

**File**: `backend/main.py` (AdvancedCache class)
```python
# Current
def __init__(self, max_size: int = 10, ttl_seconds: int = 3600):

# Optimized for 32GB RAM
def __init__(self, max_size: int = 20, ttl_seconds: int = 7200):
```

**Why**: With more RAM, you can cache more models for longer periods.

---

### 5. **Advanced Settings Preset for RTX 3070**

**File**: `frontend/src/App.jsx`
```javascript
const [advancedSettings, setAdvancedSettings] = useState({
  // Generation Parameters
  durationEnabled: false, duration: 60,
  bpmEnabled: false, bpm: 120,
  keyScaleEnabled: false, keyScale: "",
  negativePromptEnabled: false, negativePrompt: "",
  
  // ACE-Step AI Generation
  guidanceEnabled: false, guidanceScale: 9.0,
  inferStepsEnabled: false, inferSteps: 12,  // Turbo model works great with 12
  seedEnabled: false, seed: -1,
  lmCfgEnabled: false, lmCfgScale: 2.2,
  tempEnabled: false, temperature: 0.8,
  topkEnabled: false, topK: 0,
  toppEnabled: false, topP: 0.92,
  
  // Audio Format
  audioFormatEnabled: false, audioFormat: "mp3",
  tiledDecodeEnabled: true, useTiledDecode: true,  // ALWAYS ON for VRAM
  
  // Processing - OPTIMIZED FOR RTX 3070 + 32GB RAM
  fp16Enabled: true, fp16: true,  // FP16 for VRAM savings
  segmentEnabled: true, segmentLength: 4096,  // Increased for 32GB RAM
  batchEnabled: true, batchSize: 1,  // Keep at 1 for GPU stability
});
```

---

## 📊 Expected Performance (RTX 3070 + 32GB RAM)

| Task | Duration | VRAM Usage | Notes |
|------|----------|------------|-------|
| **ACE-Step Turbo (30s)** | ~10-15s | ~6-7GB | 8 inference steps |
| **ACE-Step Turbo (60s)** | ~20-30s | ~7-8GB | Tiled decode active |
| **UVR (Demucs)** | ~30s/min | ~4-5GB | 5.8s chunks |
| **Voice Conversion** | ~15s/30s | ~3-4GB | FP16 enabled |
| **Full Pipeline** | ~2-3min | ~7-8GB peak | All stages combined |

---

## ⚠️ Important Notes

### 1. **VRAM vs RAM**
- **VRAM (8GB)**: Limited, used for GPU operations (DiT, LM, SVC)
- **RAM (32GB)**: Abundant, can be used for CPU operations, caching, buffering

### 2. **Bottlenecks**
- **Primary**: VRAM (8GB) - limits batch size and model size
- **Secondary**: GPU compute - Turbo model helps here
- **Not a bottleneck**: RAM (32GB is plenty)

### 3. **Best Practices**
```bash
# 1. Always use Turbo model for production
acestep-v15-turbo → 8 steps, ~10s generation

# 2. Keep LM model at 1.7B (sweet spot for 8GB VRAM)
acestep-5Hz-lm-1.7B → good quality, fits in VRAM

# 3. Enable FP16 everywhere
Reduces VRAM usage by ~40%

# 4. Use tiled decode (already enabled)
Prevents VAE decode OOM for long audio

# 5. Clear cache between large operations
GET /clear_cache endpoint
```

---

## 🔧 Quick Optimization Checklist

- [x] FP16 enabled for vram_gb >= 6
- [x] Tiled decode always on
- [x] Batch size = 1 (GPU stability)
- [x] Chunk sizing dynamic (5.8s for your VRAM)
- [x] LM model = 1.7B (perfect fit)
- [x] Turbo model default (8 steps)
- [ ] Segment length → 4096 (for 32GB RAM)
- [ ] Cache size → 20 models (for 32GB RAM)
- [ ] FFmpeg buffer → 100M (for long files)

---

## 📝 Conclusion

**Your project is 90% optimized for RTX 3070 + 32GB RAM.**

The remaining 10% are minor tweaks to better utilize your 32GB system RAM
for CPU-side operations, caching, and buffering.

**Critical optimizations (VRAM-related) are already in place.** ✅
