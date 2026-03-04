# 🚀 VocalForge - Quick Start Guide

## ✅ Configuration Status

Based on the configuration check, your setup is **READY**:

- ✅ ace-step/.env exists and configured
- ✅ ACE-Step API configuration loaded
- ✅ main.py syntax valid
- ✅ All required dependencies installed

---

## 📋 Starting the Servers

### Option 1: Use the Startup Script (Recommended)

```bash
# Double-click this file:
START_SERVERS.bat
```

This will start all 3 servers automatically:
1. ACE-Step API (Port 8001)
2. VocalForge Backend (Port 8000)
3. React Frontend (Port 3000)

---

### Option 2: Manual Startup

#### Terminal 1: ACE-Step API Server
```bash
cd D:\VocalForge\ace-step
C:\Users\gigid\.local\bin\uv.exe run acestep-api --host 0.0.0.0 --port 8001
```

**Wait for:** `Application startup complete` message

#### Terminal 2: VocalForge Backend
```bash
cd D:\VocalForge
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

**Wait for:** `Application startup complete` message

#### Terminal 3: React Frontend
```bash
cd D:\VocalForge\frontend
npm run dev
```

**Wait for:** `Local: http://localhost:3000` message

---

## 🌐 Access URLs

| Service | URL | Status Endpoint |
|---------|-----|-----------------|
| **Frontend UI** | http://localhost:3000 | - |
| **VocalForge API** | http://localhost:8000 | http://localhost:8000/health |
| **ACE-Step API** | http://localhost:8001 | http://localhost:8001/health |
| **API Docs** | http://localhost:8000/docs | - |

---

## 🧪 Testing the Integration

### 1. Run Configuration Check
```bash
cd D:\VocalForge
python check_config.py
```

**Expected:** All checks pass

### 2. Test API Health
```bash
# VocalForge Backend
curl http://localhost:8000/health

# ACE-Step API
curl http://localhost:8001/health
```

**Expected:** Both return `{"status": "ok"}` or similar

### 3. Test from UI

1. Open http://localhost:3000
2. Navigate to **ACE-Step** tab
3. Enter a prompt: `pop music, upbeat, catchy chorus`
4. Click **Generate**
5. Watch the logs panel for progress

---

## 🔧 Troubleshooting

### Issue: Port already in use

**Error:** `Address already in use` or `OSError: [Errno 48]`

**Solution:** Kill the process using that port
```bash
# Find process on port 8000
netstat -ano | findstr ":8000"

# Kill it (replace PID with actual process ID)
taskkill /PID <PID> /F
```

---

### Issue: Module not found (endpoints)

**Error:** `ModuleNotFoundError: No module named 'endpoints'`

**Solution:** This is normal when running `check_config.py` from root directory. The module will be found when running the backend server.

---

### Issue: ACE-Step API returns 401

**Error:** `Unauthorized` or `401` errors

**Solution:** Ensure `ACESTEP_API_KEY=` is empty in `ace-step/.env`:
```env
ACESTEP_API_KEY=
```

Then restart the ACE-Step API server.

---

### Issue: Models not downloading

**Error:** Model download fails or times out

**Solution:** 
1. Check internet connection
2. Try alternative download source in `ace-step/.env`:
   ```env
   ACESTEP_DOWNLOAD_SOURCE=modelscope
   ```
3. Manually download models from HuggingFace

---

### Issue: Out of memory (OOM)

**Error:** `CUDA out of memory` or `RuntimeError: CUDA error`

**Solution:** 
1. Close other GPU applications
2. Reduce batch size in `ace-step/.env`:
   ```env
   ACESTEP_BATCH_SIZE=1
   ```
3. Enable model offloading:
   ```env
   ACESTEP_OFFLOAD_TO_CPU=true
   ACESTEP_OFFLOAD_DIT_TO_CPU=true
   ```

---

## 📊 Monitoring

### Check GPU Usage
```bash
nvidia-smi
```

### Check Server Logs

**ACE-Step API:** Look for task submissions and completions
```
[INFO] Task submitted: task_id=abc123
[INFO] Processing: 50%
[INFO] Task completed: task_id=abc123
```

**VocalForge Backend:** Look for API calls
```
[INFO] Received file: audio.wav
[INFO] Step 1/3 - Separating vocals
[INFO] Voice conversion done
```

---

## 🎯 First Generation Test

### Text-to-Music (ACE-Step)

1. Go to **ACE-Step** tab
2. Enter prompt: `hip hop trap beat, 808 bass, dark atmosphere`
3. Duration: `30` seconds
4. Click **Generate**
5. Wait 2-5 minutes for completion
6. Listen to the result!

### Repaint (Edit Audio)

1. Go to **Repaint** tab (ACE Advanced)
2. Upload an audio file
3. Set start/end time (e.g., 10s - 20s)
4. Enter prompt: `add piano melody`
5. Click **Repaint**

### Lego (Add Instruments)

1. Go to **Repaint** tab → Select **Lego** mode
2. Upload an audio file
3. Track name: `drums`
4. Prompt: `add trap drum pattern`
5. Click **Generate**

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `ace-step/.env` | ACE-Step configuration |
| `backend/endpoints/acestep_config.py` | API endpoint config |
| `backend/endpoints/acestep_advanced.py` | Repaint/Lego/Complete |
| `backend/main.py` | Main backend server |
| `START_SERVERS.bat` | Quick startup script |
| `check_config.py` | Configuration checker |

---

## 🆘 Getting Help

If you encounter issues:

1. **Check logs** in all 3 terminal windows
2. **Run** `python check_config.py`
3. **Verify** both APIs are healthy:
   - http://localhost:8000/health
   - http://localhost:8001/health
4. **Review** `FIXES_APPLIED.md` for known issues

---

## 📝 Quick Reference

### Restart Everything
```bash
# Close all 3 terminal windows
# Then run:
START_SERVERS.bat
```

### Clear Cache
```bash
# Clear Python cache
cd D:\VocalForge
del /s /q __pycache__
del /s /q *.pyc

# Clear temp files
del /s /q backend\temp\*
```

### Update Models
```bash
cd D:\VocalForge\ace-step
uv run acestep-download
```

---

**Last updated:** March 3, 2026  
**Version:** VocalForge v1.7  
**ACE-Step:** v1.5
