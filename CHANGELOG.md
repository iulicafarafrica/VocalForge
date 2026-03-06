# 🎵 VocalForge Changelog

All notable changes to VocalForge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
