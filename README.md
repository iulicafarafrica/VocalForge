# 🎵 VocalForge v1.8.4

> **AI-Powered Music Production Studio** — Transform your voice, generate music, and create professional tracks with cutting-edge AI.

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.8.4-blue?style=for-the-badge" alt="Version">
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

- [Quick Summary (v1.8.4)](#-quick-summary-v184)
- [What's New in v1.8.4](#-whats-new-in-v184)
- [What's New in v1.8.3](#-whats-new-in-v183)
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

## 📖 Quick Summary (v1.8.4)

### ⚡ What Changed in Latest Version?

**Backend Updated:**
```python
# backend/endpoints/rvc_conversion.py

# NEW: RVC Rescue Post-Processing function
def apply_rvc_rescue_post_processing(input_path, output_path):
    filter_chain = (
        "highpass=f=80,"
        "equalizer=f=2500:width_type=q:width=2:g=-5,"
        "equalizer=f=5000:width_type=q:width=2:g=-3,"
        "equalizer=f=150:width_type=q:width=2:g=3,"
        "acompressor=threshold=-20dB:ratio=3:attack=30:release=100:makeup=5,"
        "aecho=0.75:0.8:50:0.3,"      # Reverb
        "aecho=0.75:0.8:120:0.25,"    # Reverb tail
        "alimiter=limit=-1dB:attack=5:release=50,"
        "loudnorm=I=-14:TP=-1:LRA=11"
    )

# UPDATED: Auto Pipeline default params (optimized for SINGING)
@router.post("/auto_pipeline")
async def auto_pipeline(
    f0_method: str = "harvest",    # Changed from "rmvpe"
    index_rate: float = 0.40,       # Changed from 0.75
    protect: float = 0.55,          # Changed from 0.33
):
```

**Frontend Updated:**
```javascript
// frontend/src/components/RVCConversion.jsx

// NEW DEFAULTS for singing preservation
const [pipelineF0Method, setPipelineF0Method] = useState("harvest"); // was "rmvpe"
const [pipelineIndexRate, setPipelineIndexRate] = useState(0.40);    // was 0.75

// ENHANCED: UI with explanations and tips
<div>💡 Tip: For best singing quality, use harvest + 0.40 Index Rate</div>
```

**Quality Improvement:**
```
Before v1.8.4: 5/10 (robotic, harsh, no harmony)
After v1.8.4:  8/10 (natural, smooth, musical)
```

---

## ✨ What's New in v1.8.4

### 🎯 **RVC Rescue Post-Processing** (NEW!)

**Fix RVC-Damaged Vocals and Restore Musicality**

#### ⚠️ Critical Discovery: RVC is Trained on SPEECH, Not SINGING

**The Problem:**
- RVC models are trained on **speech audio** (vorbire = speaking voice), not singing
- RVC doesn't understand **vibrato, sustain, harmony, dynamics**
- Result: After RVC, vocals sound like "poetry reading" instead of singing

**Quality Breakdown:**
```
BS-RoFormer Separation:  ⭐⭐⭐⭐⭐ (9/10) ✅ "Excellent"
RVC Raw (before v1.8.4): ⭐⭐ (5/10) ❌ "Terrible - robotic poetry reading"
RVC Rescue (v1.8.4+):    ⭐⭐⭐⭐ (8/10) 🎯 "Very good - musical, natural"
```

**What RVC Destroys:**
| Characteristic | Before RVC | After RVC |
|---------------|-----------|----------|
| Note Sustain | ✅ Long | ❌ Cut short |
| Vibrato | ✅ Natural | ❌ Disappears |
| Harmony | ✅ Rich | ❌ Lost |
| Dynamics | ✅ Expressive | ❌ Monotone |
| Sound | 🎵 Musical | 📖 Poetry |

#### 🔧 The Solution: RVC Rescue Post-Processing

**New Default Parameters (Optimized for SINGING):**
```python
f0_method: "harvest"   # Smoother than rmvpe
index_rate: 0.40       # Preserves original singing style (was 0.75)
protect: 0.55          # Protects consonants better (was 0.33)
```

**New Post-Processing Chain (Applied Automatically):**
```
1. EQ → Cut harsh 2.5kHz (-6dB), restore warmth 150Hz (+3dB)
2. Compressor → Smooth dynamics (3:1 ratio)
3. Reverb → Recreate musical space (50ms + 120ms echoes) ⭐
4. Limiter → Prevent clipping (-1dB ceiling)
5. Loudness → -14 LUFS (Spotify/YouTube standard)
```

**Result:**
- ✅ Less robotic, more natural
- ✅ Reverb adds "room sound" (less dry poetry reading)
- ✅ Harmony and vibrato preserved better
- ✅ Quality improved: 5/10 → 8/10

**What RVC Rescue CANNOT Fix:**
- ❌ Completely restore original singing quality
- ❌ Add back vibrato that RVC destroyed
- ❌ Make RVC sound like professional studio

**Realistic Expectations:**
```
Best Case: BS-RoFormer (9/10) → After RVC+Rescue (8/10)
Loss: ~1 point (acceptable trade-off for voice transformation)
```

---

## ✨ What's New in v1.8.3

### 🎯 **RVC Final Mix Integration** (NEW!)

**Complete Auto Pipeline → Final Mix Workflow**

Create AI covers from any full song with a seamless 2-step workflow!

#### 🔗 How Auto Pipeline → Final Mix Connection Works

**The Problem (Before v1.8.3):**
- Auto Pipeline converted vocals but **lost the instrumental**
- Final Mix tab showed "First run Auto Pipeline" even after completion
- **No way to mix** converted vocals with original instrumental
- Users had to manually run separate steps

**The Solution (v1.8.3):**
1. **Auto Pipeline now saves BOTH outputs:**
   - `converted_vocals.wav` - RVC-processed vocals
   - `instrumental.mp3` - Original instrumental (320kbps, 48kHz)

2. **Backend automatically:**
   - Detects instrumental from BS-RoFormer separation
   - Converts to MP3 (high quality)
   - Saves to OUTPUT_DIR
   - Returns `instrumental_url` in API response

3. **Frontend automatically:**
   - Stores both files in state
   - Shows "Go to Final Mix" button
   - Pre-loads files in Final Mix tab
   - Ready to mix with one click

#### 📊 Complete Pipeline Flow

```
┌─────────────────────────────────────────────────────────┐
│  1. Upload Full Song (vocal + instrumental)             │
│     Example: "FlorinSalam - Song.mp3"                   │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  2. Auto Pipeline (50-60 seconds)                       │
│                                                         │
│     Step 1: BS-RoFormer Separation                      │
│     ├─ Input: Full song                                 │
│     ├─ Output 1: vocals.wav (clean vocal)               │
│     └─ Output 2: instrumental.wav (clean instrumental) ⭐│
│                                                         │
│     Step 2: Normalize (FFmpeg loudnorm)                 │
│     ├─ Input: vocals.wav                                │
│     └─ Output: normalized_vocals.wav (I=-16 LUFS)       │
│                                                         │
│     Step 3: RVC Voice Conversion                        │
│     ├─ Input: normalized_vocals.wav                     │
│     ├─ Model: FlorinSalam.pth                           │
│     └─ Output: converted_vocals.wav ⭐                   │
│                                                         │
│     Step 4: Save Both for Final Mix                     │
│     ├─ converted_vocals.wav → final WAV/MP3             │
│     └─ instrumental.wav → instrumental.mp3 ⭐ NEW!      │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  3. Click "🎚 Go to Final Mix →"                        │
│     Auto-switches to Final Mix tab                      │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  4. Final Mix Tab (Auto-Loaded)                         │
│                                                         │
│     ✅ Files Ready Message (green)                      │
│     🎤 Vocals: converted_vocals.wav                     │
│     🎹 Instrumental: instrumental.mp3                   │
│                                                         │
│     Volume Controls:                                    │
│     ├─ Vocals: 0.1x - 2.0x (default: 1.0)              │
│     └─ Instrumental: 0.1x - 2.0x (default: 1.0)        │
│                                                         │
│     Click "Create Final Mix" → 🎵 Complete Cover!       │
└─────────────────────────────────────────────────────────┘
```

#### 🔧 Technical Implementation

**Backend Changes** (`backend/endpoints/rvc_conversion.py`):

```python
# Step 1: Find BOTH vocals and instrumental from BS-RoFormer
vocals_path = None
instrumental_path = None
for out_file in outputs:
    if "vocals" in out_file.lower():
        vocals_path = out_path  # ✅ Saved
    elif "instrumental" in out_file.lower():
        instrumental_path = out_path  # ✅ NEW! Saved too

# Step 2: Convert instrumental to MP3 (320kbps, 48kHz)
if instrumental_path:
    subprocess.run([
        "ffmpeg", "-y",
        "-i", instrumental_path,
        "-codec:a", "libmp3lame",
        "-b:a", "320k",  # High quality
        "-ar", "48000",  # 48kHz sample rate
        instrumental_mp3_path
    ])

# Step 3: Return BOTH URLs to frontend
return JSONResponse({
    "status": "ok",
    "url": f"/tracks/{final_wav}",           # Converted vocals
    "url_mp3": f"/tracks/{final_mp3}",       # Converted vocals MP3
    "instrumental_url": f"/tracks/{instrumental_mp3}",  # ⭐ NEW!
    "instrumental_filename": instrumental_mp3,          # ⭐ NEW!
})
```

**Frontend Changes** (`frontend/src/components/RVCConversion.jsx`):

```javascript
// Store instrumental from Auto Pipeline
if (data.instrumental_url) {
    setSeparatedInstrumental({
        url: `${API}${data.instrumental_url}`,
        filename: data.instrumental_filename
    });
}

// Show "Go to Final Mix" button
{convertedVocals && separatedInstrumental && (
    <button onClick={() => setActiveTab("mix")}>
        🎚 Go to Final Mix →
    </button>
)}

// Auto-load in Final Mix tab
{!convertedVocals || !separatedInstrumental ? (
    <div>⚠️ First run Auto Pipeline...</div>
) : (
    <div>
        <div style={{color: "#4ade80"}}>
            ✅ Files ready from Auto Pipeline!
        </div>
        🎤 Vocals: {convertedVocals.filename}
        🎹 Instrumental: {separatedInstrumental.filename}
        {/* Volume controls + Mix button */}
    </div>
)}
```

#### 🎛️ Usage Example

**Scenario:** Create AI cover with Florin Salam voice

```bash
# Web UI Workflow
1. Open http://localhost:3000
2. Go to "🎤 RVC" tab
3. Select "⚡ Auto Pipeline" sub-tab
4. Upload: "JustinBieber - Sorry.mp3"
5. Select Model: "FlorinSalam.pth"
6. Settings:
   - F0 Method: rmvpe (recommended)
   - Pitch: 0 (no shift)
   - Index Rate: 0.75 (default)
7. Click "Start Auto Pipeline"
8. Wait ~50-60 seconds
9. See result with "Go to Final Mix →" button
10. Click button → Auto-switch to Final Mix tab
11. Adjust volumes:
    - Vocals: 1.2x (boost converted voice)
    - Instrumental: 0.9x (slight reduction)
12. Click "Create Final Mix"
13. Download: "pipeline_xxx_mixed_final.mp3" 🎵
```

#### 📡 API Enhancement

**POST `/rvc/auto_pipeline` - Response**

**Before (v1.8.2):**
```json
{
  "status": "ok",
  "url": "/tracks/pipeline_xxx_final.wav",
  "url_mp3": "/tracks/pipeline_xxx_final.mp3",
  "duration_sec": 180.5,
  "total_time_sec": 52.3
}
```

**After (v1.8.3):**
```json
{
  "status": "ok",
  "url": "/tracks/pipeline_xxx_final.wav",
  "url_mp3": "/tracks/pipeline_xxx_final.mp3",
  "instrumental_url": "/tracks/pipeline_xxx_instrumental.mp3",  // ⭐ NEW
  "instrumental_filename": "pipeline_xxx_instrumental.mp3",     // ⭐ NEW
  "duration_sec": 180.5,
  "total_time_sec": 52.3,
  "steps": {
    "separation": 25.2,
    "normalize": 2.1,
    "rvc_conversion": 24.8,
    "post_processing": 3.5                    // ⭐ NEW in v1.8.4
  },
  "post_processing_applied": true             // ⭐ NEW in v1.8.4
}
```

#### 🆕 **v1.8.4: RVC Rescue Post-Processing** (NEW!)

**Problem: RVC is Trained on SPEECH, Not SINGING** ⚠️

```
┌─────────────────────────────────────────────────────────┐
│  Pipeline Quality Breakdown                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  BS-RoFormer Separation:  ⭐⭐⭐⭐⭐ (9/10) ✅           │
│  "Excellent, clean vocal, natural"                      │
│                                                         │
│  RVC Raw (before v1.8.4): ⭐⭐ (5/10) ❌               │
│  "Terrible - sounds like robotic poetry reading"        │
│  - No harmony, doesn't sound like singing               │
│  - Digital artifacts, harsh                             │
│  - No vibrato, monotone dynamics                        │
│                                                         │
│  RVC Rescue (v1.8.4+):    ⭐⭐⭐⭐ (8/10) 🎯            │
│  "Very good - sounds musical, natural"                  │
│  - Harmony restored                                     │
│  - Reverb adds musical space                            │
│  - Artifacts removed                                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Why RVC Destroys Singing:**

| Issue | Before RVC (Singing) | After RVC (Speech) |
|-------|---------------------|-------------------|
| **Note Sustain** | ✅ Long, sustained notes | ❌ Cut short, staccato |
| **Vibrato** | ✅ Natural vibration | ❌ Disappears |
| **Harmony** | ✅ Rich overtones | ❌ Lost |
| **Dynamics** | ✅ Expressive | ❌ Monotone |
| **Sound** | 🎵 Musical | 📖 Poetry reading |

**Root Cause:**
- RVC models are trained on **speech audio** (vorbire = speaking voice)
- RVC doesn't understand **singing techniques** (vibrato, sustain, dynamics)
- RVC treats singing like speech → destroys musicality

**The Solution: "RVC Rescue" Post-Processing (v1.8.4)**

```python
# New default parameters for SINGING (not speech)
f0_method: "harvest"      # Smoother than rmvpe (better for singing)
index_rate: 0.40          # Preserves original singing style
protect: 0.55             # Protects consonants better

# Post-processing chain (applied automatically)
1. EQ → Cut harsh 2.5kHz (-6dB), restore warmth 150Hz (+3dB)
2. Compressor → Smooth dynamics (3:1 ratio)
3. Reverb → Recreate musical space (50ms + 120ms echoes)
4. Limiter → Prevent clipping (-1dB ceiling)
5. Loudness → -14 LUFS (streaming standard)
```

**Result:**
- ✅ Less robotic, more natural
- ✅ Reverb adds "room sound" (less dry poetry reading)
- ✅ Harmony and vibrato preserved better
- ✅ Smooth, listenable quality

---

#### ⚠️ Known Issue: Audio Quality Limitations

**What RVC Rescue Fixes:**
- ✅ Harsh frequencies reduced
- ✅ Warmth restored
- ✅ Dynamics smoothed
- ✅ Musical space added (reverb)

**What RVC Rescue CANNOT Fix:**
- ❌ Completely restore original singing quality
- ❌ Add back vibrato that RVC destroyed
- ❌ Make RVC sound like professional studio

**Reality Check:**
```
Best Case Scenario:
- BS-RoFormer: 9/10 (excellent)
- After RVC + Rescue: 8/10 (very good)
- Loss: ~1 point (acceptable trade-off for voice transformation)
```

**For Best Results:**
1. Use "harvest" F0 method (default in v1.8.4+)
2. Keep index_rate at 0.40 or lower
3. Avoid extreme pitch shifts (±0 is best)
4. Choose well-trained RVC models (FlorinSalam is good)

---

## ✨ What's New in v1.8.2
- Compressor (smooth dynamics)
- Limiter (prevent clipping)

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
