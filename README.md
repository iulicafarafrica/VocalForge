# 🎵 VocalForge v1.7

## Modular AI Audio Framework — Auto-Adaptive, Stable, Beta Ready

---

## 🎬 Demo Video

<div align="center">

[![VocalForge Demo Video](https://img.youtube.com/vi/8XSwCM7bM1A/hqdefault.jpg)](https://www.youtube.com/watch?v=8XSwCM7bM1A)

**🎵 VocalForge v1.7 - AI Music Generation & Audio Processing**

[Click to watch on YouTube →](https://www.youtube.com/watch?v=8XSwCM7bM1A)

</div>

---

## ✅ Current Status (READY FOR TESTING)

| Feature | Status |
|---|---|
| AudioEngine modular orchestrator | ✅ |
| Auto-adaptive hardware detection | ✅ |
| Light / Full / High-End modes | ✅ |
| 10-second preview system | ✅ |
| Harmony basic (pitch layering) | ✅ |
| Mastering basic (normalize + limiter) | ✅ |
| AMP FP16 safe execution | ✅ |
| Chunk processing for long tracks | ✅ |
| Safe execution (try/catch per module) | ✅ |
| Timeout protection per module | ✅ |
| Automatic GPU memory cleanup | ✅ |
| Input audio validation | ✅ |
| Adaptive logging (minimal / full) | ✅ |
| Metadata history tracking | ✅ |
| Profiling (runtime + VRAM) | ✅ |
| FastAPI backend with all endpoints | ✅ |
| React UI — 7 tabs | ✅ |
| Genre / Subgenre system (6 genres, 24 subgenres) | ✅ |
| Auto-prompt generation | ✅ |
| LoRA upload / select / delete | ✅ |
| BPM & Key detection | ✅ |
| Notes tab with local persistence | ✅ |
| Models tab with GPU management | ✅ |

---

## 🎵 ACE-Step v1.5 Integration (NEW!)

**Complete AI music generation from text — beats SUNO in quality!**

### Features:
- ✅ **Text-to-Music** - Generate complete songs from text prompts
- ✅ **Audio Cover** - Full cover conversion with source audio upload
- ✅ **Repaint** - Edit specific sections of audio (time range selection)
- ✅ **Lego** - Add instruments to existing tracks (Drums, Bass, Guitar, Piano, Strings, Synth)
- ✅ **Complete** - Continue/extend existing audio
- ✅ **Auto BPM & Key Detection** - From uploaded source audio
- ✅ **Copy BPM/Key** - One-click copy to generation settings
- ✅ **Genre Presets** - Hip-Hop, Românesc (Romanian), House, Dembow, Other
- ✅ **Seed Library** - Save and reuse generation seeds
- ✅ **Preset Manager** - Save/load custom generation presets
- ✅ **LoRA Style Support** - Add custom styles to generation
- ✅ **Negative Prompt** - Exclude unwanted elements
- ✅ **Vocal Language** - English 🇬🇧 / Română 🇷🇴
- ✅ **Diffusion Steps** - 8 (Turbo) / 12 (Fast) / 20 (Balanced) / 40 (Quality)
- ✅ **Guidance Scale (CFG)** - 3 / 5 / 7 / 9 / 10
- ✅ **Source Strength** - Control similarity to source audio (0 = ignore, 1 = copy)
- ✅ **Advanced Settings** - Integrated in main UI (temperature, top_k, top_p)

### Quick Start:
1. Run `start_acestep.bat` in a separate terminal
2. Wait for model download (~10GB first time)
3. In VocalForge, go to ACE-Step tab
4. Enter a music prompt (e.g., "hip hop trap beat, 808 bass, dark atmosphere")
5. Click "Generate with ACE-Step"

### Example Prompts:
- `pop music, upbeat, catchy chorus, modern production, radio-friendly`
- `hip hop trap beat, 808 bass, dark atmospheric`
- `romantic Romanian ballad, piano, emotional`
- `house music, four-on-the-floor kick, deep bass, synthesizer`
- `manele românești, acordeon, sintetizator oriental, ritm balbanic`

---

## 🧠 Auto-Adaptive Pipeline

Hardware detected at runtime:
- GPU availability + VRAM
- CPU core count

**Light Mode** (CPU or < 4GB VRAM)
- Modules: Morph + Harmony
- Segment: 1024, Batch: 1, Logging: Minimal
- Preview 10s optimized

**Full Mode** (4–8 GB VRAM — RTX 3070)
- Modules: Morph + Harmony + Mastering
- Segment: 2048, Batch: 1, Logging: Full

**High-End Mode** (8+ GB VRAM)
- All modules + profiling
- Segment: 4096+, Batch: 2–4

---

## 🚀 Installation (Windows)

### Step 1: Install prerequisites
- Python 3.10+: https://www.python.org/ (check "Add to PATH")
- Node.js 18+: https://nodejs.org/

### Step 2: Run setup
```
Double-click: setup.bat
```
This installs PyTorch (CUDA 12.1), Python deps, and npm packages.

### Step 3: Start
```
Terminal 1: start_backend.bat  →  http://localhost:8000
Terminal 2: start_frontend.bat →  http://localhost:3000
```

---

## 🎮 Usage

1. Open `http://localhost:3000`
2. Upload audio → BPM & Key auto-detected
3. Select Genre / Subgenre → prompt auto-generated
4. Choose Voice style, Gender, Pitch shift
5. (Optional) Select LoRA adapter
6. Click **Generate Cover**
7. Listen, download, or delete in My Covers panel

---

## 📁 Project Structure

```
VocalForge/
 ├── core/
 │    ├── engine.py              ← AudioEngine main
 │    ├── base_module.py         ← Module interface
 │    └── modules/
 │         ├── morph_module.py   ← Pitch/gender morph (placeholder)
 │         ├── harmony_module.py ← Pitch layering (functional)
 │         └── mastering_module.py ← Normalize + limiter (functional)
 │
 ├── demo/
 │    └── demo_auto_adaptive.py  ← Test pipeline locally
 │
 ├── backend/
 │    ├── main.py                ← FastAPI server
 │    ├── models/
 │    │    ├── HQ_SVC/           ← Put HQ-SVC models here
 │    │    └── LoRA/             ← LoRA files stored here
 │    ├── temp/                  ← Temp audio files
 │    └── output/                ← Generated covers
 │
 ├── frontend/
 │    ├── src/
 │    │    ├── App.jsx           ← Complete React UI
 │    │    └── main.jsx
 │    ├── package.json
 │    └── vite.config.js
 │
 ├── requirements.txt
 ├── setup.bat                   ← One-click install
 ├── start_backend.bat
 ├── start_frontend.bat
 └── start_demo.bat
```

---

## 🔗 API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| /detect_bpm_key | POST | BPM + Key from audio |
| /process_cover | POST | Full-length cover generation |
| /preview | POST | 10-second preview |
| /upload_lora | POST | Upload LoRA file |
| /list_lora | GET | List available LoRAs |
| /delete_lora/{id} | DELETE | Delete a LoRA |
| /hardware | GET | Hardware info |
| /vram_usage | GET | Current VRAM usage |
| /clear_cache | GET | Clear GPU cache |
| /unload_model | GET | Unload models |
| /reload_models | GET | Reload models |
| /health | GET | Health check |

Interactive docs: http://localhost:8000/docs

---

## 🗺 Roadmap — Next Steps

**Very High Priority**
- Implement real MorphModule (vectorized pitch + formant shifting)
- Integrate HQ-SVC for real voice conversion
- BPM conversion in Audio Cover mode (ACE-Step backend)
- Mixed precision FP16 full integration

**High Priority**
- Noise reduction / denoising module
- Multi-instrument layer support (flute, piano, guitar)
- Real-time waveform visualization
- Track history and versioning

**Medium Priority**
- Preset system (save voice + genre + LoRA combinations)
- Auto-style transfer between genres
- Multi-format export (WAV / MP3 / AIFF)
- DAW integration (stem export)

---

## ⚙️ Hardware Requirements

| Component | Minimum | Recommended |
|---|---|---|
| GPU | 4GB VRAM (CPU fallback) | RTX 3070 (8GB) |
| RAM | 8GB | 32GB |
| Storage | 2GB | 10GB+ (for models) |
| OS | Windows 10 | Windows 11 |

---

*VocalForge v1.7 — Beta Ready*
