# 🎵 VocalForge v1.7

> **AI-Powered Music Production Studio** — Transform your voice, generate music, and create professional tracks with cutting-edge AI.

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.7-blue?style=for-the-badge" alt="Version">
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

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Usage Guide](#-usage-guide)
- [API Reference](#-api-reference)
- [Hardware Requirements](#-hardware-requirements)
- [Roadmap](#-roadmap)
- [Changelog](#-changelog)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

### 🎤 RVC Voice Conversion
Transform your voice into any other voice using AI models.
- **Custom Models** — Load .pth voice models
- **Pitch Control** — Adjust pitch shifting (±12 semitones)
- **Emotion Engine** — Happy, Sad, Angry, Calm, Fearful
- **Formant Preservation** — Keep natural vocal timbre
- **Pre-loaded Models** — Bad Bunny, Florin Salam, Justin Bieber, Kanye West

### 🎵 ACE-Step Music Generation
Generate complete songs from text descriptions.
- **Text-to-Music** — Describe your song, AI creates it
- **Audio Cover** — Generate instrumental from reference audio
- **50+ Genre Presets** — Hip-Hop, Pop, EDM, Manele, Reggaeton
- **Multiple Models** — Turbo (8 steps), Base/SFT (50 steps)
- **Advanced Editing** — Repaint, Lego, Complete

### 🎚️ Stem Separation
Extract individual instruments from any song.
- **Demucs Integration** — Industry-leading separation
- **4 Stems** — Vocals, Drums, Bass, Other
- **6 Stems Mode** — Plus Guitar, Piano
- **Multiple Models** — htdemucs, htdemucs_ft, htdemucs_6s

### 🎹 Audio Editing
Professional audio manipulation tools.
- **Repaint** — Edit specific sections
- **Lego** — Add instruments to tracks
- **Complete** — Extend/continue audio

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
| **Backend API** | http://localhost:8000 | 8000 | FastAPI server (Demucs, RVC) |
| **RVC Voice API** | http://localhost:8002 | 8002 | Voice conversion service |
| **ACE-Step API** | http://localhost:8001 | 8001 | Music generation service |
| **API Docs** | http://localhost:8000/docs | 8000 | Interactive API documentation |

> 💡 **Tip:** All 4 services must be running for full functionality. Use `START_ALL.bat` to launch everything at once.

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
```

#### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

#### 4. Install ACE-Step

```bash
cd ace-step
uv sync
cd ..
```

> 📝 **Note:** ACE-Step requires ~10GB for models (downloaded on first run)

#### 5. Install RVC Voice Conversion

RVC is included in the project, but requires additional setup:

```bash
# RVC models are stored separately
# Download RVC models (.pth files) from:
# - https://weights.gg/models
# - https://huggingface.co/IAHispano/Applio
# - https://huggingface.co/Rei/RVC-Models

# Place models in:
D:\VocalForge\RVCWebUI\assets\weights\
```

> 💡 **Tip:** Pre-loaded models include: Bad Bunny, Florin Salam, Justin Bieber, Kanye West

#### 6. Verify Installation

```bash
python -c "import torch; print(f'PyTorch: {torch.__version__}')"
python -c "import librosa; print(f'Librosa: {librosa.__version__}')"
python -c "import torch; print(f'CUDA: {torch.cuda.is_available()}')"
```

---

## 🎯 Usage Guide

### 1. RVC Voice Conversion

**Best for:** Voice transformation, character voices, covers

1. Go to **RVC Voice Conversion** tab
2. Upload vocal file (WAV, MP3, FLAC)
3. Select voice model from dropdown
4. Adjust settings:
   - **Pitch Shift** — ±12 semitones
   - **Emotion** — Happy, Sad, Angry, Calm, Fearful
   - **F0 Method** — rmvpe (recommended), harvest, pm
5. Click **Convert**
6. Download converted audio

**Pro Tips:**
- Use clean a cappella vocals (no background music)
- For male→female: +5 to +10 semitones
- For female→male: -5 to -10 semitones
- Enable "Preserve Formant" for natural sound

---

### 2. ACE-Step Music Generation

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
7. Wait for completion
8. Download or add to tracks

**Pro Tips:**
- Use Turbo for quick sketches
- Use SFT for final productions
- Include instruments in prompt for better results
- Reference audio improves style matching

---

### 3. Stem Separation

**Best for:** Remixes, karaoke, sampling, acapella extraction

1. Go to **Stem Separation** tab
2. Upload full song
3. Select model:
   - **htdemucs** — Fast, good quality
   - **htdemucs_ft** — Slower, better quality
   - **htdemucs_6s** — 6 stems (includes guitar, piano)
4. Click **Separate Stems**
5. Download individual stems

**Pro Tips:**
- Use WAV for best quality
- htdemucs_6s for detailed separation
- Extract vocals for acapella
- Remove vocals for karaoke

---

### 4. Repaint / Lego / Complete

**Repaint** — Edit specific section:
1. Select time range (start/end)
2. Enter new prompt for that section
3. Generate modified version

**Lego** — Add instruments:
1. Upload existing track
2. Select instrument (Drums, Bass, Guitar, Piano, Strings)
3. Generate enhanced version

**Complete** — Extend audio:
1. Upload audio
2. Specify extension duration
3. Generate continuation

---

## 🔌 API Reference

### Main Backend (Port 8000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/rvc/convert` | POST | Convert voice using RVC model |
| `/rvc/models` | GET | List available RVC models |
| `/detect_bpm_key` | POST | Detect BPM and key from audio |
| `/demucs_separate` | POST | Separate audio into stems |
| `/ace_generate` | POST | Generate music with ACE-Step |
| `/acestep/repaint` | POST | Edit audio section |
| `/acestep/lego` | POST | Add instrument to track |
| `/acestep/complete` | POST | Extend audio |
| `/hardware` | GET | Hardware/GPU info |
| `/vram_usage` | GET | Current VRAM usage |
| `/clear_cache` | GET | Clear GPU memory cache |
| `/health` | GET | Health check |

**Interactive Docs:** http://localhost:8000/docs

---

### RVC Voice API (Port 8002)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | RVC service status |
| `/convert_voice/` | POST | Convert voice using RVC model |
| `/models` | GET | List available RVC models |
| `/unload` | GET | Unload RVC model and free VRAM |

**Interactive Docs:** http://localhost:8002/docs

---

### ACE-Step API (Port 8001)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server status |
| `/release_task` | POST | Submit generation task |
| `/query_result` | POST | Query task result |
| `/v1/audio` | GET | Download generated audio |

**Interactive Docs:** http://localhost:8001/docs

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

| GPU | ACE-Step (60s) | RVC Conversion | Stem Separation |
|-----|----------------|----------------|-----------------|
| **RTX 4090 (24GB)** | ~30 sec | Real-time | ~10 sec |
| **RTX 3070 (8GB)** | ~1-2 min | ~10 sec | ~20 sec |
| **RTX 2060 (6GB)** | ~3-4 min | ~20 sec | ~30 sec |
| **CPU Only** | ~10-15 min | ~1 min | ~2 min |

> 💡 **Tip:** Use Turbo model for faster generation on lower-end GPUs.

---

## 📋 Roadmap

### 🔜 Coming Soon (v1.8)

| Feature | Priority | Status | Description |
|---------|----------|--------|-------------|
| **✂️ Separate Tab** | 🔥 High | In Development | Upload full song → Demucs auto-separates vocals + instrumental → One-click "Use Vocals in Convert" |
| **🎚️ Mix Tab** | 🔥 High | In Development | Mix converted vocal with instrumental → Independent volume control for vocal and instrumental |
| **💾 Presets Tab** | ⭐ Medium | In Development | Save all settings (model, pitch, emotion, index rate, formant, auto-tune) → Apply with one click → Delete unwanted |

#### Feature Details

**✂️ Separate Tab**
- Upload any full song (MP3, WAV, FLAC)
- Demucs automatically separates: Vocals + Instrumental
- Button: "Use Vocals in Convert" → sends vocals directly to RVC tab
- Optional: Download individual stems

**🎚️ Mix Tab**
- Load converted vocal from RVC
- Load instrumental (from Separate tab or upload)
- Independent volume sliders: Vocal Volume / Instrumental Volume
- Real-time preview before export
- Export final mix (MP3, WAV)

**💾 Presets Tab**
- Save complete configuration:
  - RVC Model
  - Pitch Shift (±12 semitones)
  - Emotion (Happy, Sad, Angry, Calm, Fearful)
  - Index Rate
  - Formant Preservation
  - Auto-Tune settings
- Name your preset (e.g., "Kanye Sad", "Florin Happy", "Justin Pop")
- Apply preset with single click
- Delete or export presets
- Import presets from community

---

### 💡 Future Ideas

- [ ] Batch Processing — Convert multiple vocals at once
- [ ] Real-time Preview — Hear conversion before render
- [ ] Model Sharing — Share custom RVC models
- [ ] Cloud Storage — Save tracks to cloud
- [ ] VST Plugin — Use VocalForge in DAWs
- [ ] Mobile App — iOS/Android companion

---

## 📝 Changelog

### v1.7 — Current Release

#### ✅ Added
- **RVC Voice Conversion** — Complete AI voice transformation
  - Custom .pth model support
  - Pitch shifting (±12 semitones)
  - Emotion control (5 emotions)
  - Formant preservation
  - 4 pre-loaded models
- **Windows Terminal** — Required for multi-tab startup
- **Enhanced RVC UI** — Improved conversion interface

#### ❌ Removed
- **Vocal2BGM** — Feature deprecated
- **Pitch Correction Tab** — Replaced by RVC

#### 🐛 Fixed
- Unicode encoding errors (Windows compatibility)
- RVC config path issues
- RVC argument parsing conflicts
- RVC array bounds safety

#### 🔧 Technical
- Added `backend/app.py` (RVC API, port 8002)
- Added `core/modules/rvc_model.py`
- Updated `START_ALL.bat` (4 services)
- Improved error handling

---

### v1.6 — Previous Release

- ACE-Step integration
- Stem separation (Demucs)
- Repaint/Lego/Complete
- Genre presets (50+)

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

### ACE-Step not responding

```bash
# Check status
curl http://localhost:8001/health

# Restart
taskkill /F /IM python.exe
start_acestep.bat
```

### CUDA Out of Memory

- Reduce batch size in settings
- Use Turbo model (8 steps)
- Close other GPU applications
- Lower audio quality settings

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

## 📂 Project Structure

```
VocalForge/
├── backend/
│   ├── main.py                    # FastAPI server (port 8000)
│   ├── app.py                     # RVC API (port 8002)
│   ├── endpoints/
│   │   ├── rvc_conversion.py      # RVC endpoint
│   │   └── acestep_advanced.py    # Repaint/Lego/Complete
│   ├── output/                    # Generated audio
│   └── temp/                      # Temporary files
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Main React app
│   │   └── components/
│   │       ├── RVCConversion.jsx  # RVC UI
│   │       ├── AceStepTab.jsx     # ACE-Step UI
│   │       └── ...
│   └── package.json
│
├── core/
│   ├── modules/
│   │   ├── rvc_model.py           # RVC wrapper
│   │   └── ...
│   └── engine.py
│
├── RVCWebUI/                      # RVC submodule
├── ace-step/                      # ACE-Step submodule
├── START_ALL.bat                  # Launch all services
├── setup.bat                      # One-click install
└── requirements.txt               # Python dependencies
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
- **[RVC-WebUI](https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI)** — Voice conversion
- **[Demucs](https://github.com/facebookresearch/demucs)** — Stem separation
- **[Librosa](https://librosa.org/)** — Audio analysis
- **[FastAPI](https://fastapi.tiangolo.com/)** — Backend framework
- **[React](https://react.dev/)** — Frontend framework

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/iulicafarafrica/VocalForge/issues)
- **Discussions:** [GitHub Discussions](https://github.com/iulicafarafrica/VocalForge/discussions)
- **Demo:** [YouTube](https://www.youtube.com/watch?v=8XSwCM7bM1A)

---

<p align="center">
  <strong>VocalForge v1.7</strong> — Made with ❤️ for music creators
  <br>
  <sub>Last Updated: March 2026</sub>
</p>
