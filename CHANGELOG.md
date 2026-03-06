# 🎵 VocalForge Changelog

All notable changes to VocalForge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.8.4] - 2026-03-06

### 🎯 **RVC Rescue Post-Processing** (NEW!)

**Fix RVC-Damaged Vocals and Restore Musicality**

#### ⚠️ The Problem: RVC is Trained on SPEECH, Not SINGING

**Critical Discovery:**
- RVC models are trained on **speech audio** (vorbire = speaking voice)
- RVC doesn't understand **singing techniques** (vibrato, sustain, dynamics)
- RVC treats singing like speech → destroys musicality

**Quality Breakdown:**
```
Pipeline Step               | Quality | Description
---------------------------|---------|----------------------------------
BS-RoFormer Separation     | 9/10 ✅ | "Excellent, clean vocal, natural"
RVC Raw (before v1.8.4)    | 5/10 ❌ | "Terrible - robotic poetry reading"
RVC Rescue (v1.8.4+)       | 8/10 🎯 | "Very good - sounds musical"
```

**What RVC Destroys:**
| Characteristic | Before RVC (Singing) | After RVC (Speech) |
|---------------|---------------------|-------------------|
| Note Sustain | ✅ Long, sustained | ❌ Cut short |
| Vibrato | ✅ Natural vibration | ❌ Disappears |
| Harmony | ✅ Rich overtones | ❌ Lost |
| Dynamics | ✅ Expressive | ❌ Monotone |
| Sound | 🎵 Musical | 📖 Poetry reading |

#### 🔧 The Solution: "RVC Rescue" Post-Processing

**New Default Parameters for SINGING:**
```python
# Changed in v1.8.4 (optimized for singing, not speech)
f0_method: "harvest"      # Smoother than rmvpe
index_rate: 0.40          # Was 0.75 (preserves original style)
protect: 0.55             # Was 0.33 (protects consonants)
```

**New Post-Processing Chain (Applied Automatically):**
```python
1. EQ → Surgical fix
   ├─ High-pass @ 80Hz (cleanup rumble)
   ├─ Cut 2.5kHz -6dB (remove harshness)
   ├─ Cut 5kHz -3dB (reduce sibilance)
   └─ Boost 150Hz +3dB (restore warmth lost from RVC)

2. Compressor → Smooth dynamics
   ├─ Threshold: -22dB
   ├─ Ratio: 3:1
   ├─ Attack: 30ms
   ├─ Release: 120ms
   └─ Makeup: 5dB

3. Reverb → Recreate "musical space" ⭐ CRITICAL
   ├─ Early reflections: 50ms (room sound)
   └─ Reverb tail: 120ms (space)
   # This makes it sound less like "poetry reading"
   # and more like actual singing

4. Limiter → Prevent clipping
   └─ Limit: -1dB ceiling

5. Loudness Normalization → Streaming standard
   └─ Target: -14 LUFS (Spotify/YouTube standard)
```

#### 📊 Results

**What RVC Rescue FIXES:**
- ✅ Harsh frequencies reduced (2.5-5kHz)
- ✅ Warmth restored (150Hz boost)
- ✅ Dynamics smoothed (compression)
- ✅ Musical space added (reverb)
- ✅ Less robotic, more natural
- ✅ Harmony and vibrato preserved better

**What RVC Rescue CANNOT FIX:**
- ❌ Completely restore original singing quality
- ❌ Add back vibrato that RVC destroyed
- ❌ Make RVC sound like professional studio

**Reality Check:**
```
Best Case:
- BS-RoFormer: 9/10 (excellent)
- After RVC + Rescue: 8/10 (very good)
- Loss: ~1 point (acceptable trade-off)
```

#### 🔧 Technical Changes

**File**: `backend/endpoints/rvc_conversion.py`

**Added Function**:
```python
def apply_rvc_rescue_post_processing(input_path, output_path):
    """
    Repair RVC-damaged vocals and restore musicality.
    Chain: EQ → Compressor → Reverb → Limiter → Loudness
    """
```

**Updated Auto Pipeline**:
- Step 3: RVC Conversion (with new params: harvest, 0.40, 0.55)
- **Step 4: RVC Rescue Post-Processing** ⭐ NEW
  - Applies FFmpeg filter chain
  - Adds reverb for musical space
  - Smooths dynamics
  - Normalizes loudness

**API Response Enhanced**:
```json
{
  "status": "ok",
  "message": "Pipeline complet! (with RVC Rescue post-processing)",
  "steps": {
    "separation": 25.2,
    "normalize": 2.1,
    "rvc_conversion": 24.8,
    "post_processing": 3.5        // NEW
  },
  "post_processing_applied": true  // NEW
}
```

#### 📝 Documentation

- Updated README.md with RVC limitations explanation
- Added "RVC Rescue" section with before/after comparison
- Documented what can and cannot be fixed
- Added realistic expectations (8/10 best case)

---

## [1.8.3] - 2026-03-06

### 🎯 **RVC Final Mix Integration** (NEW!)

**Complete Auto Pipeline → Final Mix Workflow**

The RVC tab now has a fully integrated workflow from upload to final mix!

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
│         ⚠️ May contain RVC artifacts (5/10 quality)     │
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

#### ⚠️ Known Issue: RVC Audio Quality

**Current Quality: 5/10** - RVC conversion introduces artifacts

**Root Cause Analysis:**

```
Pipeline Step          | Quality | Notes
-----------------------|---------|----------------------------------
BS-RoFormer Separation | 9/10 ✅ | Clean vocal/instrumental split
Normalize (loudnorm)   | 10/10 ✅ | Professional loudness
RVC Conversion         | 5/10 ⚠️ | Adds artifacts, harsh frequencies
Final Mix              | 8/10 ✅ | Good balance, normalized
```

**Why RVC Adds Artifacts:**

1. **F0 Method Limitations**
   - RMVPE can be too aggressive
   - Pitch extraction errors cause robotic artifacts
   - High-frequency harshness

2. **Index Rate Too High**
   - Default 0.75 may be too strong
   - Blends too much target voice characteristics
   - Loses natural vocal timbre

3. **Protect Too Low**
   - Default 0.33 doesn't protect voiceless consonants enough
   - Artifacts on "s", "sh", "f", "th" sounds

4. **No Post-Processing**
   - RVC output is raw, unprocessed
   - No EQ to cut harsh frequencies
   - No de-esser to reduce sibilance
   - No compressor to smooth dynamics

**Temporary Workarounds (Until Fixed):**

```python
# Option 1: Lower Index Rate (More Natural)
index_rate: 0.50  # Instead of 0.75
# Pros: More natural, less artifacts
# Cons: Less voice transformation

# Option 2: Higher Protect (Better Consonants)
protect: 0.50  # Instead of 0.33
# Pros: Cleaner consonants, less artifacts
# Cons: Slightly less transformation

# Option 3: Different F0 Method
f0_method: "harvest"  # Instead of "rmvpe"
# Pros: Smoother, less aggressive
# Cons: Slower, may lose some accuracy

# Option 4: Lower Pitch Shift
pitch_shift: 0  # Avoid extreme shifts
# Pros: Fewer artifacts
# Cons: Limited range
```

**Recommended Settings for Better Quality:**

```
# For Natural Sound (Less Transformation)
F0 Method: rmvpe
Index Rate: 0.50
Protect: 0.50
Pitch: 0

# For Heavy Transformation (More Artifacts)
F0 Method: rmvpe
Index Rate: 0.75
Protect: 0.33
Pitch: ±3

# For Balanced Quality
F0 Method: harvest
Index Rate: 0.60
Protect: 0.45
Pitch: 0
```

**Planned Fix (v1.8.4):**

```python
# Post-Processing Pipeline After RVC
Step 1: De-reverb    → Remove RVC reverb artifacts
Step 2: Denoise      → Remove background noise
Step 3: EQ           → Cut harsh frequencies (2-4kHz)
Step 4: De-esser     → Reduce sibilance (5-8kHz)
Step 5: Compressor   → Smooth dynamics (2:1 ratio)
Step 6: Limiter      → Prevent clipping (-1dB ceiling)
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

### 📊 **Technical Improvements**

- **Audio Quality**: Instrumental saved at 320kbps MP3, 48kHz
- **File Management**: Proper cleanup of temporary files after pipeline
- **UI/UX**: Clear visual feedback at each step
- **Workflow**: Seamless transition between pipeline and mixing

### 🐛 **Bug Fixes**

- Fixed: Final Mix tab showing "First run Auto Pipeline" even after completion
- Fixed: Missing instrumental URL in Auto Pipeline response
- Fixed: Incomplete file detection for BS-RoFormer outputs

---

## [1.8.2] - 2026-03-06

### 🆕 **YouTube Cover Generator**

**New Feature - Complete YouTube to AI Cover Pipeline**

- Added `/youtube/download` endpoint for audio extraction from YouTube
  - Support for YouTube videos, Music, Shorts
  - Output formats: WAV, MP3
  - Quality selection: best, high, medium, low
  - Auto-cleanup of temporary files

- Added `/youtube/cover` endpoint for full cover pipeline
  - Download → Separate → RVC → Mix → Output
  - Automatic BS-RoFormer vocal separation
  - RVC voice conversion with selected model
  - Mix converted vocals with instrumental
  - Progress tracking per step

- Created `YouTubeCover.jsx` React component
  - URL input with validation
  - Download only mode toggle
  - RVC model selection
  - Pitch shift control (-12 to +12)
  - F0 method selection (RMVPE, harvest, pm, crepe)
  - Index rate slider (0.00-1.00)
  - Real-time progress bar
  - Audio preview player
  - Download final result

- Added new tab to Web UI: "📺 YouTube Cover"
  - Red Sparkles icon
  - Integrated with existing models list
  - Shares RVC models with main RVC tab

### 🎯 **RVC v2 Support**

**Auto-detection and Support for RVC v2 Models**

- Updated `pipeline_loader.py` with RVC v2 support
  - Auto-detect v1 vs v2 from checkpoint
  - 768-dim architecture support (v2)
  - 48kHz output for v2 models
  - YAML config loading for v2
  - Backward compatible with v1

- Created RVC v2 script suite in `RVCWebUI/scripts/`
  - `pipeline_loader.py` — Unified model loader
  - `inference_rvc_v2.py` — Single file CLI conversion
  - `run_pipeline_v2.py` — One model, all files
  - `run_pipeline_multi_v2.py` — All models, all files

- Enhanced model structure
  - `assets/weights/` — RVC v1 models (.pth)
  - `models/v2/` — RVC v2 models (model.pth + model.yaml)

### 🔧 **Enhanced Pipeline**

**Professional Audio Processing Pipeline**

- Added MelBand cleanup support
  - Pre-RVC cleanup (remove artifacts)
  - Post-RVC cleanup (remove RVC artifacts)
  - Optional toggle (on/off)

- Added De-reverb support (optional)
  - Remove reverb from vocals
  - Cleaner RVC conversion

- Added Denoise support (optional)
  - Remove background noise
  - Improve conversion quality

- Improved RMVPE integration
  - Better pitch extraction
  - More natural voice conversion
  - Reduced artifacts

### 📦 **Dependencies**

- Added `yt-dlp` for YouTube download
- Added `faiss-cpu` for RVC indexing
- Added `praat-parselmouth` for F0 detection
- Added `pyworld` for audio processing
- Added `ffmpeg-python` for audio manipulation
- Added `av` (PyAV) for audio decoding

### 📚 **Documentation**

- Updated README.md with v1.8.2 features
  - YouTube Cover section
  - RVC v2 support documentation
  - Enhanced pipeline diagram
  - API endpoint documentation
  - Troubleshooting section

- Created comprehensive CHANGELOG.md
  - All versions documented
  - Feature breakdown per version
  - Technical details included

### 🐛 **Bug Fixes**

- Fixed RVC config loading issue
  - Changed to absolute paths in `config.py`
  - Fixed singleton initialization
  - Proper working directory handling

- Fixed BS-RoFormer model loading
  - Correct parameter name (`model_filename` vs `model_name`)
  - Added `.ckpt` extension handling
  - Auto-download on first use

- Fixed Unicode encoding errors
  - Removed Romanian diacritics from print statements
  - Windows CP1252 compatibility

### ⚡ **Performance**

- Optimized RVC model loading
  - Lazy loading for models
  - Proper VRAM cleanup
  - Auto-unload after conversion

- Improved pipeline speed
  - Parallel processing where possible
  - Reduced temporary file I/O
  - Better error handling

---

## [1.8.1] - 2026-03-06

### 🐛 Fixed

- **RVC Separation Endpoint**
  - Fixed `Separator.load_model()` parameter name
  - Changed `model_name` to `model_filename` (audio-separator API compliance)
  - Added `.ckpt` extension to BS-RoFormer model filename
  - Model now downloads automatically on first use

- **Stem Separation**
  - BS-RoFormer now working correctly for vocal/instrumental extraction
  - Proper output file detection

### 🔧 Technical

- Updated `backend/endpoints/rvc_conversion.py` line 84
- Model filename: `model_bs_roformer_ep_317_sdr_12.9755.ckpt`
- First separation triggers automatic model download (~300MB)

---

## [1.8.0] - 2026-03-05

### 🎯 Added

#### New Tabs (Workflow Enhancement)

**✂️ Separate Tab**
- Upload full song → auto-separate with Demucs
- Vocals + Instrumental separation
- One-click "Use Vocals in Convert" button
- Download individual stems

**🎚️ Mix Tab**
- Mix converted vocal with instrumental
- Independent volume control (Vocal / Instrumental)
  - Range: 0.0 to 2.0 (50% - 200%)
- Real-time preview
- Export final mix (MP3, WAV)

**💾 Presets Tab**
- Save all RVC settings with custom name
  - Model selection
  - Pitch shift (±12 semitones)
  - Emotion (5 types: Happy, Sad, Angry, Fearful, Neutral)
  - F0 Method (rmvpe, harvest, pm, crepe)
  - Index Rate (0-1)
  - Filter Radius
  - RMS Mix Rate
  - Protect (voiceless consonants)
  - Dry/Wet mix
  - Formant Shift
  - Auto-Tune toggle
- Apply preset with single click
- Delete or export presets
- Import community presets (JSON format)

### 🐛 Fixed

- **RVC working directory issues** — Proper path handling for model loading
- **Unicode encoding errors** — Windows compatibility improvements
- **Config path loading errors** — Relative path resolution fixed
- **Argument parsing conflicts** — Form parameter conflicts resolved

### 🔧 Technical

- Added RVC Voice API endpoints on port 8002
- Enhanced `core/modules/rvc_model.py` with better error handling
- Updated `START_ALL.bat` to launch 4 services (Frontend, Backend, RVC, ACE-Step)
- Improved error handling and logging across all endpoints

---

## [1.7.0] - 2026-03-01

### ✨ Added

#### RVC Voice Conversion
- **Complete AI voice transformation** using RVC models
- **Custom .pth model support** — Load any RVC voice model
- **Pitch shifting** — ±12 semitones range
- **Emotion control** — 5 emotions (Happy, Sad, Angry, Calm, Fearful)
- **Formant preservation** — Maintain natural vocal timbre
- **4 pre-loaded models**:
  - Bad Bunny
  - Florin Salam
  - Justin Bieber
  - Kanye West

#### Enhanced UI
- **Windows Terminal integration** — Required for multi-tab startup
- **Improved RVC conversion interface** — Better parameter controls
- **Real-time conversion status** — Progress indicators
- **Model management** — List, load, unload models

### 🗑️ Removed

- **Vocal2BGM** — Feature deprecated (will be re-added in future release)
- **Pitch Correction Tab** — Replaced by RVC voice conversion

### 🔧 Technical

- Integrated RVC-WebUI as submodule
- Added `backend/endpoints/rvc_conversion.py` with full RVC API
- Created `core/modules/rvc_model.py` wrapper for RVC inference
- Optimized for NVIDIA RTX 3070 (8GB VRAM)
- Added VRAM management (model unload on demand)

---

## [1.6.0] - 2026-02-15

### ✨ Added

#### ACE-Step Integration
- **Text-to-Music generation** — Generate songs from text prompts
- **Audio Cover** — Create instrumentals from reference audio
- **50+ Genre presets** — Hip-Hop, Pop, EDM, Manele, Reggaeton, etc.
- **Multiple models support**:
  - Turbo (8 steps) — Fast generation
  - Base (50 steps) — All features
  - SFT (50 steps) — High quality

#### Stem Separation
- **Demucs integration** — Industry-leading source separation
- **4 stems mode** — Vocals, Drums, Bass, Other
- **6 stems mode** — Plus Guitar, Piano
- **Multiple models**:
  - htdemucs — Fast, good quality
  - htdemucs_ft — Slower, better quality
  - htdemucs_6s — 6 stems detailed separation

#### Audio Editing
- **Repaint** — Edit specific sections with new prompts
- **Lego** — Add instruments to existing tracks
- **Complete** — Extend/continue audio seamlessly

#### Additional Features
- **BPM/Key Detection** — Automatic audio analysis
- **Seed Library** — Save and reuse generation seeds
- **Tracks Management** — Organize generated tracks
- **Advanced Settings** — LM parameters, audio format, batch size
- **GPU Info Tab** — Real-time hardware monitoring
- **Notes Tab** — In-app notes and reminders

### 🔧 Technical

- 3-service architecture (Frontend:3000, Backend:8000, ACE-Step:8001)
- FastAPI backend with async processing
- React + Vite frontend with tabbed interface
- Windows Terminal startup script (`START_ALL.bat`)
- Comprehensive health check endpoints

---

## [1.5.0] - 2026-02-01

### ✨ Added

- Initial ACE-Step prototype integration
- Basic stem separation with Demucs
- Simple web interface

---

## Version History Summary

| Version | Date | Status | Key Feature |
|---------|------|--------|-------------|
| **1.8.2** | 2026-03-06 | 🟢 Latest | YouTube Cover + RVC v2 |
| **1.8.1** | 2026-03-06 | 🟢 Stable | RVC Separation Fix |
| **1.8.0** | 2026-03-05 | 🟢 Stable | Separate/Mix/Presets Tabs |
| **1.7.0** | 2026-03-01 | 🟡 Legacy | RVC Voice Conversion |
| **1.6.0** | 2026-02-15 | 🟡 Legacy | ACE-Step Integration |
| **1.5.0** | 2026-02-01 | 🔴 Deprecated | Prototype |

---

## Upcoming Features (Roadmap)

### v1.9.0 (Q2 2026)
- [ ] Audio Understanding — Extract BPM/Key/Time Signature from audio
- [ ] Vocal2BGM Reborn — Transform vocals into full song with beat alignment
- [ ] Multi-Track Layering — Add instrumental layers to existing tracks
- [ ] LRC Generation — Generate lyrics with timestamps
- [ ] Copy Melody — Extract melody patterns from reference audio
- [ ] De-reverb Integration — Automatic reverb removal
- [ ] Denoise Integration — Automatic noise removal

### v2.0.0 (Q3 2026)
- [ ] Multi-language UI support
- [ ] Cloud sync for presets and tracks
- [ ] Real-time collaboration features
- [ ] Plugin system for third-party extensions
- [ ] Mobile app (iOS/Android)
- [ ] Desktop app (Electron)

---

## Bug Reports & Feature Requests

- **GitHub Issues:** https://github.com/iulicafarafrica/VocalForge/issues
- **Discussions:** https://github.com/iulicafarafrica/VocalForge/discussions

---

*Last Updated: March 6, 2026 | VocalForge v1.8.2*
