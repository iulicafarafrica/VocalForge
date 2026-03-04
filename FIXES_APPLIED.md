# 🔧 ACE-Step Integration Fixes

## Summary of Issues Fixed

This document describes the critical issues found and fixed in the VocalForge integration with ACE-Step v1.5.

---

## ❌ Issues Found

### 1. Missing Authentication (Critical)

**Problem:** ACE-Step v1.5 API requires authentication via `ai_token` in request body or `Authorization` header, but VocalForge was sending requests without tokens.

**Files affected:**
- `backend/endpoints/acestep_advanced.py`

**Symptoms:**
- Repaint/Lego/Complete endpoints return 401 Unauthorized
- Tasks fail immediately after submission

### 2. Status Parsing Error (Medium)

**Problem:** ACE-Step returns status as string ("running", "succeeded", "failed"), but code expected integers.

**Symptoms:**
- Task polling might not detect completion correctly
- Jobs appear stuck in "running" state

### 3. Missing Environment Configuration (Medium)

**Problem:** No `.env` file configured for ACE-Step API server.

**Symptoms:**
- API server might use unexpected defaults
- No centralized configuration

---

## ✅ Fixes Applied

### 1. New Configuration File

**Created:** `backend/endpoints/acestep_config.py`

```python
"""ACE-Step API configuration."""
import os

# ACE-Step API endpoint
ACE_STEP_API = os.getenv("ACE_STEP_API", "http://localhost:8001")

# API key for authentication (empty = no auth required)
ACE_STEP_API_KEY = os.getenv("ACESTEP_API_KEY", "")

# Output directory
OUTPUT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "output"
)
```

### 2. Updated acestep_advanced.py

**Changes:**
- ✅ Added `ai_token` to all task payloads
- ✅ Added `Authorization` header to HTTP requests
- ✅ Fixed status parsing to handle both string and integer formats
- ✅ Added proper error handling and logging
- ✅ Improved audio file path extraction from responses
- ✅ Added type hints for better code clarity

**Key functions updated:**
- `_poll_acestep_task()` - Now includes auth token in query_result calls
- `_map_acestep_status()` - New function to handle string/int status conversion
- `_extract_audio_file_path()` - New function to safely extract file paths
- All endpoint handlers (`repaint`, `lego`, `complete`) - Include auth in requests

### 3. Created .env File

**Created:** `ace-step/.env`

```env
# API Server Settings
ACESTEP_API_KEY=  # Empty for local dev
ACESTEP_API_HOST=0.0.0.0
ACESTEP_API_PORT=8001

# Model Settings (optimized for RTX 3070 8GB)
ACESTEP_CONFIG_PATH=acestep-v15-turbo-rl
ACESTEP_LM_MODEL_PATH=acestep-5Hz-lm-1.7B
ACESTEP_DEVICE=auto
ACESTEP_LM_BACKEND=vllm
ACESTEP_INIT_LLM=auto
ACESTEP_BATCH_SIZE=1
```

### 4. Updated main.py

**Changes:**
- ✅ Added environment variable loading from `.env` files
- ✅ Moved `BASE_DIR` definition before env loading
- ✅ Set default ACE-Step API configuration

### 5. Updated requirements.txt

**Added dependencies:**
```txt
python-dotenv>=1.0.0
httpx>=0.24.0
```

---

## 📋 Testing Checklist

After applying these fixes, test the following:

### 1. Start ACE-Step API Server
```bash
# In separate terminal
cd D:\VocalForge\ace-step
C:\Users\gigid\.local\bin\uv.exe run acestep-api --host 0.0.0.0 --port 8001
```

**Expected:** Server starts without errors, shows available models

### 2. Start VocalForge Backend
```bash
# In separate terminal
cd D:\VocalForge
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected:** 
- Backend starts successfully
- Shows "[STARTUP] Loaded environment from ..." message
- No import errors

### 3. Test Repaint Endpoint
```bash
curl -X POST http://localhost:8000/acestep/repaint \
  -F "file=@test_audio.wav" \
  -F "prompt=test prompt" \
  -F "start_time=10" \
  -F "end_time=20"
```

**Expected:** Returns task ID, polling succeeds, audio generated

### 4. Test Lego Endpoint
```bash
curl -X POST http://localhost:8000/acestep/lego \
  -F "file=@test_audio.wav" \
  -F "track_name=drums" \
  -F "prompt=add drum track"
```

**Expected:** Returns task ID, polling succeeds, drums added

### 5. Test Complete Endpoint
```bash
curl -X POST http://localhost:8000/acestep/complete \
  -F "file=@test_audio.wav" \
  -F "track_classes=drums,bass,guitar"
```

**Expected:** Returns task ID, polling succeeds, track completed

---

## 🔍 How to Verify Authentication is Working

### Check ACE-Step API Server Logs

When a request arrives, you should see:
```
[INFO] Task submitted: task_id=abc123, task_type=repaint
```

If authentication fails, you'll see:
```
[WARNING] Authentication failed: Missing ai_token or Authorization header
```

### Check VocalForge Backend Logs

You should see:
```
[ACE xxxxxxxx] Submitting task...
[ACE xxxxxxxx] Task ID: task_abc123
[ACE xxxxxxxx] Status: 0 | Processing... (3s)
[ACE xxxxxxxx] Status: 1 | Completed (15s)
```

---

## 🚨 Troubleshooting

### Issue: "401 Unauthorized" errors

**Solution 1:** Ensure `ACESTEP_API_KEY` is empty in both:
- `ace-step/.env`
- `backend/.env` (if exists)

**Solution 2:** If you want to use authentication, set the same key in both places:
```env
# In ace-step/.env
ACESTEP_API_KEY=sk-my-secret-key

# In backend/.env
ACESTEP_API_KEY=sk-my-secret-key
```

### Issue: "Connection refused" to port 8001

**Solution:** Ensure ACE-Step API server is running:
```bash
cd D:\VocalForge\ace-step
C:\Users\gigid\.local\bin\uv.exe run acestep-api --host 0.0.0.0 --port 8001
```

### Issue: Task stuck in "running" state

**Possible causes:**
1. ACE-Step model not loaded (check API server logs)
2. GPU out of memory (monitor VRAM usage)
3. Task timeout (increase `max_wait` in `_poll_acestep_task`)

**Solution:** Check both terminal outputs for errors

### Issue: "No task_id in response"

**Cause:** ACE-Step API returned unexpected response format

**Solution:** 
1. Check ACE-Step API server is healthy: `curl http://localhost:8001/health`
2. Check API server logs for errors
3. Ensure models are downloaded: `uv run acestep-download`

---

## 📚 File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `backend/endpoints/acestep_config.py` | ✅ Created | Central configuration for ACE-Step API |
| `backend/endpoints/acestep_advanced.py` | ✅ Rewritten | Fixed auth, status parsing, error handling |
| `backend/main.py` | ✅ Modified | Added .env loading, moved BASE_DIR |
| `ace-step/.env` | ✅ Created | ACE-Step server configuration |
| `requirements.txt` | ✅ Modified | Added python-dotenv, httpx |

---

## 🎯 Next Steps

1. **Install new dependencies:**
   ```bash
   pip install python-dotenv httpx
   ```

2. **Restart both servers:**
   - ACE-Step API (port 8001)
   - VocalForge Backend (port 8000)

3. **Test Repaint/Lego/Complete** endpoints from the UI

4. **Monitor logs** in both terminals for any errors

---

## 📞 Support

If issues persist:
1. Check both server logs for error messages
2. Verify ACE-Step API health: `http://localhost:8001/health`
3. Test direct API calls with curl/Postman
4. Check GPU memory usage: `nvidia-smi`

---

**Last updated:** March 3, 2026  
**Version:** VocalForge v1.7 with ACE-Step v1.5
