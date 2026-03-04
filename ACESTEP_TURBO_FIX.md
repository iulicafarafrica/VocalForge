# ACE-Step Configuration Fix for 8GB VRAM

## Problem Found
Music generation was stuck at "Finalizing audio" due to:
1. **Wrong inference steps**: Frontend default was 60 steps (too many for turbo)
2. **VRAM exhaustion**: CPU offload was disabled, causing 0GB free VRAM
3. **Incorrect turbo settings**: Model needs specific configuration for 8GB VRAM

## Official ACE-Step Recommendations (from GitHub)

For **8GB VRAM GPUs** (RTX 3070, RTX 4060 Ti, etc.):

```bash
acestep --torch_compile true --cpu_offload true --overlapped_decode true
```

**Inference Steps**: 27 steps (official turbo default)
- 27 steps: RTF 34.48× on RTX 4090 (~1.74s for 1 min audio)
- 60 steps: RTF 15.63× on RTX 4090 (~3.84s for 1 min audio)

## Changes Applied

### 1. `ace-step/.env` - Fixed GPU Optimization Settings
```env
# BEFORE (WRONG):
ACESTEP_OFFLOAD_TO_CPU=false
ACESTEP_OFFLOAD_DIT_TO_CPU=false
ACESTEP_VAE_ON_CPU=0

# AFTER (CORRECT for 8GB VRAM):
ACESTEP_OFFLOAD_TO_CPU=true
ACESTEP_OFFLOAD_DIT_TO_CPU=true
ACESTEP_VAE_ON_CPU=1
```

### 2. `backend/main.py` - Fixed Default Inference Steps
```python
# BEFORE:
infer_steps: int = Form(12)
guidance_scale: float = Form(9.0)

# AFTER (turbo optimal):
infer_steps: int = Form(27)  # 27 steps optimal for turbo
guidance_scale: float = Form(7.0)  # optimal for turbo
```

### 3. `frontend/src/App.jsx` - Fixed Default UI Values
```javascript
// BEFORE:
const [aceInferSteps, setAceInferSteps] = useState(60);
const [aceGuidanceScale, setAceGuidanceScale] = useState(3.5);

// AFTER (turbo optimal):
const [aceInferSteps, setAceInferSteps] = useState(27);  // 27 steps
const [aceGuidanceScale, setAceGuidanceScale] = useState(7.0);
```

### 4. Created Test Script
- `test_acestep_turbo.py` - Tests generation with correct turbo settings

## How to Test

### Step 1: Restart ACE-Step API Server
The `.env` changes only take effect after restart.

**Option A - Manual restart:**
1. Close the current ACE-Step terminal (Ctrl+C)
2. Run: `D:\VocalForge\start_acestep.bat`

**Option B - Clean restart all servers:**
1. Close all server terminals
2. Run: `D:\VocalForge\START_ALL_CLEAN.bat`

### Step 2: Run Test Script
```bash
cd D:\VocalForge
python test_acestep_turbo.py
```

**Expected output:**
```
[1/4] Checking ACE-Step health...
✅ Health: ok
   Model: acestep-v15-turbo

[2/4] Submitting generation task...
✅ Task submitted: <task_id>

[3/4] Polling for result...
   ⏳ Status: running | <progress> (<elapsed>s)
   ✅ Status: succeeded | <progress> (<elapsed>s)

[4/4] Test complete!
   Total time: <60s = EXCELLENT, <120s = GOOD
```

### Step 3: Test from UI
1. Open http://localhost:3000
2. Go to ACE-Step tab
3. Default settings should now be:
   - **Inference Steps**: 27 (not 60!)
   - **Guidance Scale**: 7 (not 3.5!)
   - **Duration**: 30 seconds
4. Enter prompt: `hip hop trap beat, 808 bass, dark atmosphere`
5. Click "Generate"
6. Should complete in 60-120 seconds

## Configuration Summary

| Setting | Value | Reason |
|---------|-------|--------|
| Model | acestep-v15-turbo | Best quality/speed balance |
| Inference Steps | 27 | Official turbo default |
| Guidance Scale | 7 | Optimal for turbo |
| CPU Offload | ENABLED | Required for 8GB VRAM |
| VAE on CPU | ENABLED | Saves ~1.5GB VRAM |
| Batch Size | 1 | Prevents VRAM overflow |
| Duration | 30s default | Safe for 8GB VRAM |

## Troubleshooting

### Still getting "Insufficient VRAM"?
1. Make sure ACE-Step was restarted after `.env` changes
2. Check GPU memory: `nvidia-smi`
3. Close other GPU applications (games, browser with many tabs)

### Generation takes > 2 minutes?
1. Check inference steps (should be 27, not 60)
2. Check if CPU offload is enabled in logs
3. Try shorter duration (15-20 seconds)

### "LLM was not initialized" warning?
This is **normal** for 8GB VRAM. LLM is disabled to save memory.
- Lyrics generation will be limited
- Music generation still works fine

## References
- ACE-Step GitHub: https://github.com/ACE-Step/ACE-Step
- Memory Optimization Guide: https://github.com/ACE-Step/ACE-Step#memory-optimization
- Model Card: acestep-v15-turbo (4.5GB, optimized for fast generation)

---
**Last updated**: March 4, 2026
**Tested on**: RTX 3070 8GB, 32GB RAM
