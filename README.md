# 🎵 VocalForge v1.8.2

> **AI-Powered Music Production Studio** — Transform your voice, generate music, and create professional tracks with cutting-edge AI.

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.8.2-blue?style=for-the-badge" alt="Version">
  <img src="https://img.shields.io/badge/Status-Beta-yellow?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/Python-3.10%2B-green?style=for-the-badge&logo=python" alt="Python">
  <img src="https://img.shields.io/badge/GPU-NVIDIA%20CUDA-orange?style=for-the-badge&logo=nvidia" alt="GPU">
  <img src="https://img.shields.io/badge/License-MIT-red?style=for-the-badge" alt="License">
</p>

---

## 🎬 Quick Preview

### See VocalForge in Action

**📺 Watch Demo:** [YouTube](https://www.youtube.com/watch?v=8XSwCM7bM1A)

<p align="center">
  <img src="Project.png" alt="VocalForge Interface" width="600"/>
</p>

---

## 📖 Table of Contents

- [What's New in v1.8.2](#-whats-new-in-v182)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Usage Guide](#-usage-guide)
- [API Reference](#-api-reference)
- [Hardware Requirements](#-hardware-requirements)
- [Troubleshooting](#-troubleshooting)
- [Changelog](#-changelog)

---

## ✨ What's New in v1.8.2

### 🆕 **YouTube Cover Generator** (NEW!)

Download audio from YouTube and create AI covers in one click!

**Features:**
- 📥 Download audio from YouTube (WAV/MP3)
- ✂️ Automatic vocal separation (BS-RoFormer)
- 🎤 RVC voice conversion
- 🎚️ Mix vocals with instrumental
- ⬇️ Download final cover

**Usage:**
```bash
# Web UI
1. Open http://localhost:3000
2. Click "📺 YouTube Cover" tab
3. Paste YouTube URL
4. Select RVC model
5. Click "Start YouTube Cover"
```

**API Endpoint:**
```bash
# Download only
POST /youtube/download
- url: https://www.youtube.com/watch?v=...
- output_format: wav

# Full cover pipeline
POST /youtube/cover
- url: https://www.youtube.com/watch?v=...
- rvc_model_name: FlorinSalam.pth
- pitch_shift: 0
- f0_method: rmvpe
- index_rate: 0.75
```

---

### 🎯 **RVC v2 Support** (NEW!)

Auto-detect and use RVC v2 models with improved quality!

**Features:**
- ✅ Auto-detect RVC v1 vs v2
- ✅ RMVPE++ pitch extraction (better quality)
- ✅ 768-dim model architecture (v2)
- ✅ 48kHz output (v2)
- ✅ Backward compatible with v1 models

**Model Structure:**
```
RVCWebUI/
├── assets/weights/        # RVC v1 models (.pth)
└── models/v2/             # RVC v2 models
    ├── Lunar-RVC/
    │    ├── model.pth     # Model weights
    │    └── model.yaml    # Model config
    └── Model-Name/
         ├── model.pth
         └── model.yaml
```

---

### 🔧 **Enhanced Pipeline** (IMPROVED!)

Complete audio processing pipeline with professional quality!

**Pipeline Steps:**
```
Input Audio
    ↓
[1] BS-RoFormer → Vocal separation (SDR 12.97)
    ↓
[2] MelBand Cleanup → Remove artifacts (optional)
    ↓
[3] De-reverb → Remove reverb (optional)
    ↓
[4] Denoise → Remove noise (optional)
    ↓
[5] Normalize → FFmpeg loudnorm (I=-16)
    ↓
[6] RVC v2 Conversion → Voice conversion (RMVPE)
    ↓
[7] MelBand Post → Final cleanup (optional)
    ↓
Output Clean
```

**RVC Script Commands:**
```bash
# Single file conversion
python scripts/inference_rvc_v2.py \
  --input input.wav \
  --model models/v2/Lunar-RVC/model.pth

# One model, all files
python scripts/run_pipeline_v2.py \
  --model models/v2/Lunar-RVC/model.pth

# All models, all files
python scripts/run_pipeline_multi_v2.py
```

---

## 🚀 Quick Start

### One-Click Launch

```bash
# Clone repository
git clone https://github.com/iulicafarafrica/VocalForge.git
cd VocalForge

# Install everything
setup.bat

# Start all services
START_ALL.bat
```

### Access Application

| Service | URL | Port | Description |
|---------|-----|------|-------------|
| **Frontend UI** | http://localhost:3000 | 3000 | React web interface |
| **Backend API** | http://localhost:8000 | 8000 | FastAPI server |
| **API Docs** | http://localhost:8000/docs | 8000 | Interactive API documentation |

> 💡 **Tip:** All services must be running for full functionality. Use `START_ALL.bat` to launch everything at once.

---

## 📦 Installation

### Prerequisites

| Software | Version | Required | Download |
|----------|---------|----------|----------|
| **Python** | 3.10 - 3.11 | ✅ Yes | [Download](https://www.python.org/downloads/) |
| **Node.js** | 18+ | ✅ Yes | [Download](https://nodejs.org/) |
| **Git** | Latest | ✅ Yes | [Download](https://git-scm.com/downloads) |
| **Windows Terminal** | Latest | ✅ Yes | [Download](https://aka.ms/terminal) |
| **NVIDIA GPU** | 4GB+ VRAM | ⚠️ Optional | - |
| **CUDA** | 11.8 / 12.1 | ⚠️ Optional | [Download](https://developer.nvidia.com/cuda-downloads) |

> ⚠️ **Important:** Check "Add Python to PATH" during installation!

---

### Step-by-Step Installation

#### 1. Clone Repository

```bash
git clone https://github.com/iulicafarafrica/VocalForge.git
cd VocalForge
```

#### 2. Install Python Dependencies

**Automatic (Recommended):**
```bash
setup.bat
```

**Manual:**
```bash
# Create virtual environment
python -m venv venv

# Activate
venv\Scripts\activate

# Install PyTorch (CUDA 12.1 for RTX 3070/4070)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Install dependencies
pip install -r requirements.txt

# Install additional for YouTube Cover
pip install yt-dlp
```

#### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

#### 4. Install RVC Models

RVC models are stored in `RVCWebUI/assets/weights/`:

```bash
# Download RVC models from:
# - https://weights.gg/models
# - https://huggingface.co/IAHispano/Applio

# Place models in:
D:\VocalForge\RVCWebUI\assets\weights\
```

> 💡 **Tip:** Pre-loaded models include: FlorinSalam, JustinBieber, BadBunny, KanyeWest, and 16+ more!

---

## 🎯 Usage Guide

### 1. YouTube Cover Generator (NEW!)

**Best for:** Creating AI covers from YouTube songs

1. Go to **YouTube Cover** tab
2. Paste YouTube URL
3. Select RVC model
4. Adjust pitch shift (-12 to +12 semitones)
5. Click **Start YouTube Cover**
6. Wait ~60-90 seconds
7. Download final cover

**Pro Tips:**
- Use "Download Only" to just save audio from YouTube
- Higher index rate (0.75-1.0) = more original voice characteristics
- Lower index rate (0.40-0.60) = more dramatic transformation

---

### 2. RVC Voice Conversion

**Best for:** Voice transformation with custom models

1. Go to **RVC Voice Conversion** tab
2. Upload vocal file (WAV, MP3, FLAC)
3. Select voice model from dropdown
4. Adjust settings:
   - **Pitch Shift** — ±12 semitones
   - **F0 Method** — rmvpe (recommended), harvest, pm, crepe
   - **Index Rate** — 0.75 (recommended)
5. Click **Convert**
6. Download converted audio

**Pro Tips:**
- Use clean a cappella vocals (no background music)
- For male→female: +5 to +10 semitones
- For female→male: -5 to -10 semitones
- Enable "Preserve Formant" for natural sound

---

### 3. ACE-Step Music Generation

**Best for:** Creating beats, full songs, instrumentals

1. Go to **ACE-Step** tab
2. Enter prompt (be specific):
   ```
   ✅ Good: "upbeat pop song with catchy chorus, modern production, female vocals"
   ✅ Good: "dark trap beat, 808 bass, hi-hats, atmospheric pads"
   ✅ Good: "romantic Romanian ballad, piano, strings, emotional"
   ```
3. Select genre preset
4. Choose duration (30-240 seconds)
5. Select model:
   - **Turbo** — 8 steps, ~1 min, good quality
   - **Base** — 50 steps, ~3 min, all features
   - **SFT** — 50 steps, ~3 min, highest quality
6. Click **Generate**
7. Download or add to tracks

---

### 4. Stem Separation

**Best for:** Remixes, karaoke, sampling, acapella extraction

1. Go to **Stem Separation** tab
2. Upload full song
3. Select model:
   - **BS-RoFormer** — Best quality (SDR 12.97)
   - **HT-Demucs** — Fast, good quality
   - **HT-Demucs-FT** — Slower, better quality
4. Click **Separate Stems**
5. Download individual stems

---

## 🔌 API Reference

### Main Backend (Port 8000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/youtube/download` | POST | Download audio from YouTube |
| `/youtube/cover` | POST | Full YouTube cover pipeline |
| `/rvc/convert` | POST | Convert voice using RVC model |
| `/rvc/auto_pipeline` | POST | Automatic pipeline (Separation → RVC) |
| `/rvc/models` | GET | List available RVC models |
| `/rvc/separate` | POST | Separate vocals from instrumental |
| `/detect_bpm_key` | POST | Detect BPM and key from audio |
| `/hardware` | GET | Hardware/GPU info |
| `/vram_usage` | GET | Current VRAM usage |
| `/clear_cache` | GET | Clear GPU memory cache |
| `/health` | GET | Health check |

**Interactive Docs:** http://localhost:8000/docs

---

## 💻 Hardware Requirements

### Minimum vs Recommended

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **GPU** | GTX 1060 (4GB) | RTX 3070 (8GB) or better |
| **RAM** | 8GB | 16-32GB |
| **Storage** | 10GB HDD | 20GB+ SSD |
| **OS** | Windows 10 | Windows 11 |

### Performance Benchmarks

| Task | RTX 3070 (8GB) | RTX 2060 (6GB) | CPU Only |
|------|----------------|----------------|----------|
| **BS-RoFormer Separation** | ~25s | ~40s | ~2 min |
| **RVC Conversion (10s)** | ~5s | ~10s | ~30s |
| **YouTube Download** | ~10s | ~10s | ~10s |
| **Full YouTube Cover** | ~50-60s | ~70-80s | ~3-4 min |

> 💡 **Tip:** Use Turbo model for faster generation on lower-end GPUs.

---

## 🐛 Troubleshooting

### Backend won't start

```bash
# Check if port 8000 is in use
netstat -ano | findstr :8000

# Kill process
taskkill /PID <PID> /F

# Restart
start_backend.bat
```

### RVC models not showing

1. Check folder: `D:\VocalForge\RVCWebUI\assets\weights\`
2. Ensure .pth files are present
3. Restart RVC service

### YouTube Cover fails

**Error: "ModuleNotFoundError: No module named 'yt_dlp'"**
```bash
# Install yt-dlp in virtual environment
cd D:\VocalForge
venv\Scripts\activate
pip install yt-dlp
```

**Error: "Download failed" sau timeout**
```bash
# Update yt-dlp (YouTube changes frequently)
pip install -U yt-dlp

# Check FFmpeg is installed
ffmpeg -version
```

**Error: "RVC model not found"**
```bash
# Verify models exist
dir D:\VocalForge\RVCWebUI\assets\weights\*.pth

# Restart backend
taskkill /F /IM python.exe
cd D:\VocalForge\backend
uvicorn main:app --reload --port 8000
```

**Error: "CORS error" sau "Network error"**
```bash
# Clear browser cache (Ctrl+Shift+Delete)
# Restart frontend
cd frontend
npm run dev

# Make sure backend is running on port 8000
# Make sure frontend is running on port 3000
```

### Pitch correction artifacts

- Lower correction strength (50% vs 100%)
- Enable "Preserve Formant"
- Use WAV instead of MP3
- Check input audio quality

### Frontend blank page

```bash
cd frontend
npm run build
# Clear browser cache (Ctrl+Shift+Delete)
```

---

## 📝 Changelog

### v1.8.2 — Current Release (March 2026)

#### 🆕 YouTube Cover Generator
- **Download from YouTube** — Audio extraction (WAV/MP3)
- **Full cover pipeline** — Download → Separate → RVC → Mix
- **Download only mode** — Save audio without processing
- **Progress tracking** — Real-time status per step
- **Pitch control** — -12 to +12 semitones
- **F0 method selection** — RMVPE, harvest, pm, crepe
- **Index rate control** — 0.00 to 1.00

#### 🎯 RVC v2 Support
- **Auto-detect v1/v2** — Automatic version detection
- **768-dim architecture** — v2 model support
- **48kHz output** — Higher quality
- **RMVPE++** — Improved pitch extraction
- **YAML config support** — Per-model configuration

#### 🔧 Enhanced Pipeline
- **MelBand cleanup** — Pre and post RVC (optional)
- **De-reverb** — Remove reverb (optional)
- **Denoise** — Remove noise (optional)
- **Improved RMVPE** — Better quality conversion
- **Auto-cleanup** — Temp files removed automatically

#### 📚 Scripts
- `pipeline_loader.py` — Unified loader (v1 + v2)
- `inference_rvc_v2.py` — Single file conversion
- `run_pipeline_v2.py` — One model, all files
- `run_pipeline_multi_v2.py` — All models, all files

---

### v1.8.1 — Hotfix Release (March 6, 2026)

#### 🐛 Fixed
- **RVC Separation Endpoint** — Fixed `Separator.load_model()` parameter name
- **Stem Separation** — BS-RoFormer working correctly

---

### v1.8.0 — Major Release (March 2026)

#### 🎯 New Tabs
- **✂️ Separate Tab** — Vocal/instrumental separation
- **🎚️ Mix Tab** — Mix vocals with instrumental
- **💾 Presets Tab** — Save and load RVC presets

---

## 📂 Project Structure

```
VocalForge/
├── backend/
│   ├── main.py                    # FastAPI server (port 8000)
│   ├── endpoints/
│   │   ├── youtube_cover.py       # YouTube Cover API 🆕
│   │   └── rvc_conversion.py      # RVC API
│   └── output/                    # Generated audio
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── YouTubeCover.jsx   # YouTube Cover UI 🆕
│   │   │   └── RVCConversion.jsx  # RVC UI
│   │   └── App.jsx                # Main React app
│   └── package.json
│
├── RVCWebUI/
│   ├── scripts/
│   │   ├── pipeline_loader.py     # RVC loader (v1+v2) 🆕
│   │   ├── inference_rvc_v2.py    # RVC v2 inference 🆕
│   │   ├── run_pipeline_v2.py     # Single model pipeline 🆕
│   │   └── run_pipeline_multi_v2.py # Multi-model pipeline 🆕
│   ├── models/v2/                 # RVC v2 models 🆕
│   ├── assets/weights/            # RVC v1 models
│   └── input/                     # Input audio
│
├── START_ALL.bat                  # Launch all services
├── setup.bat                      # One-click install
└── README.md                      # This file
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

MIT License — See [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **[ACE-Step](https://github.com/ace-step/ACE-Step)** — Music generation
- **[RVC-Project](https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI)** — Voice conversion
- **[AICoverGen](https://github.com/GXCoder78/AICoverGen)** — YouTube cover inspiration
- **[audio-separator](https://github.com/Anjok07/ultimatevocalremovergui)** — BS-RoFormer separation
- **[yt-dlp](https://github.com/yt-dlp/yt-dlp)** — YouTube download
- **[FastAPI](https://fastapi.tiangolo.com/)** — Backend framework
- **[React](https://react.dev/)** — Frontend framework

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/iulicafarafrica/VocalForge/issues)
- **Discussions:** [GitHub Discussions](https://github.com/iulicafarafrica/VocalForge/discussions)
- **Demo:** [YouTube](https://www.youtube.com/watch?v=8XSwCM7bM1A)

---

<p align="center">
  <strong>VocalForge v1.8.2</strong> — Made with ❤️ for music creators
  <br>
  <sub>Last Updated: March 6, 2026</sub>
</p>
