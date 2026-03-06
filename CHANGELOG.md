# 🎵 VocalForge Changelog

All notable changes to VocalForge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.8.1] - 2026-03-06

### 🔧 Fixed

#### RVC Separation Endpoint
- **Fixed `Separator.load_model()` parameter name** in `backend/endpoints/rvc_conversion.py`
  - Changed `model_name=` to `model_filename=` (audio-separator API compliance)
  - Added `.ckpt` extension to BS-RoFormer model filename
  - Full model filename: `model_bs_roformer_ep_317_sdr_12.9755.ckpt`
- **Stem separation now works correctly** for vocal/instrumental extraction
- First separation triggers automatic model download (~300MB) from audio-separator repository

### 📝 Technical Notes
- The audio-separator library requires the full `.ckpt` filename for model loading
- Model is cached in `/tmp/audio-separator-models/` after first download
- RTX 3070 optimizations remain active (segment_size=256, batch_size=1, fp16)

---

## [1.8.0] - 2026-03-05

### 🎯 Added

#### New Tabs (Workflow Enhancement)

**✂️ Separate Tab**
- Upload full song → auto-separate with Demucs/BS-RoFormer
- Vocals + Instrumental separation
- One-click "Use Vocals in Convert" button
- Download individual stems
- BS-RoFormer model for highest quality vocal extraction
- RTX 3070 optimized settings (segment=256, fp16, batch_size=1)

**🎚️ Mix Tab**
- Mix converted vocal with instrumental
- Independent volume control (Vocal / Instrumental)
  - Range: 0.0 to 2.0 (50% - 200%)
- Real-time preview
- Export final mix (MP3, WAV)
- Automatic normalization to prevent clipping

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
- Added comprehensive API documentation at `/docs` for each service

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
| **1.8.1** | 2026-03-06 | 🟢 Latest | RVC Separation Fix |
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

### v2.0.0 (Q3 2026)
- [ ] Multi-language UI support
- [ ] Cloud sync for presets and tracks
- [ ] Real-time collaboration features
- [ ] Plugin system for third-party extensions

---

## Bug Reports & Feature Requests

- **GitHub Issues:** https://github.com/iulicafarafrica/VocalForge/issues
- **Discussions:** https://github.com/iulicafarafrica/VocalForge/discussions

---

*Last Updated: March 6, 2026 | VocalForge v1.8.1*
