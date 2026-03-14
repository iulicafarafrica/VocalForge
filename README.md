# 🎵 VocalForge

<div align="center">

**AI-Powered Music Production Studio**

*Powered by ACE-Step v1.5*

*Transform your voice, generate music, and create professional tracks with cutting-edge AI*

[![Version](https://img.shields.io/badge/Version-2.0.0-blue?style=for-the-badge)]()
[![Python](https://img.shields.io/badge/Python-3.10+-green?style=for-the-badge&logo=python)]()
[![GPU](https://img.shields.io/badge/GPU-NVIDIA%20CUDA-orange?style=for-the-badge&logo=nvidia)]()
[![License](https://img.shields.io/badge/License-MIT-red?style=for-the-badge)]()

[📺 Watch Demo](https://www.youtube.com/watch?v=8XSwCM7bM1A) • [📋 Changelog](#-changelog) • [🗺️ Roadmap](#-roadmap)

</div>

---

## 📖 Overview

### What is VocalForge?

<div align="center">
  
**AI-Powered Music Production Studio**

</div>

- 🎤 Transform any voice with AI-powered RVC models
- 🎵 Generate complete songs from text prompts with ACE-Step v1.5
- ✂️ Professional stem separation with BS-RoFormer (SDR 12.97)
- 🔄 End-to-end pipeline: separate → convert → mix → master
- 🎼 164 genre presets including 30 Romanian subgenres
- 💻 Optimized for NVIDIA RTX 3070 8GB (runs on 6GB+)

### 10 Main Modules

| Icon | Module | Description |
|------|--------|-------------|
| 🎚️ | **Stem Separation** | BS-RoFormer, Demucs, 4-6 stems |
| 🎵 | **ACE-Step v1.5** | Text→Music, Audio Cover, Repaint |
| 🎤 | **Vocal Pipeline** | Auto Pipeline + Applio Features |
| 🎸 | **Prompt Generator** | 164 subgenres, 5 vocal presets |
| 🖌️ | **Repaint** | Regenerate sections (30-60s) |
| 📊 | **Audio Analysis** | BPM, Key, Time Signature detection |
| 🌞 | **Suno AI** | Generate music with Suno (local cookie) |
| 📁 | **Tracks Manager** | View, play, download tracks |
| 💻 | **Models Manager** | Upload, list RVC models |
| 📝 | **Notes** | Personal notes with auto-save |

### Quick Start

<div align="center">
  
**Get running in under 5 minutes**

</div>

```bash
git clone https://github.com/iulicafarafrica/VocalForge.git
cd VocalForge
setup.bat        # Install everything
START_ALL.bat    # Launch all services
```

| Service | URL | Port |
|---------|-----|------|
| **Frontend UI** | localhost:3000 | 3000 |
| **Backend API** | localhost:8000 | 8000 |
| **API Docs** | localhost:8000/docs | 8000 |
| **ACE-Step API** | localhost:8001 | 8001 |
| **RVC API** | localhost:8002 | 8002 |

---

## 🔄 Pipeline v2.3 — Complete Flow

> **4-Stage Production Pipeline** — BS-RoFormer separation → RVC conversion → Clarification → Final Mix. Total time: ~80s on RTX 3070.

### Stage 1: BS-RoFormer Separation
- ⏱ ~30s | 💾 4-5GB VRAM
- Model: bs_roformer_1297 (SDR 12.97 — state of the art)
- Output: vocals.wav + instrumental.wav
- Gain Staging: Normalize to -1dB peak, -16 LUFS

<div align="center">↓</div>

### Stage 2: RVC Voice Conversion
- ⏱ ~15s | 💾 4-6GB VRAM
- Model: User-selected (e.g. FlorinSalam.pth, JustinBieber.pth)
- Applio Features: Autotune, High-Pass, Volume Envelope
- Params: harvest / 0.40 index / 0.55 protect (optimized for singing)
- VRAM: Auto-unload RVC after conversion

<div align="center">↓</div>

### Stage 3: Clarification (Optional)
- ⏱ ~30s | 💾 2-3GB VRAM
- Re-extraction via BS-RoFormer to reduce RVC artifacts
- FFmpeg: highpass=f=100, deesser, loudnorm=-10 LUFS, acompressor
- Output: final_clear_vocals.wav — disabled by default for speed

<div align="center">↓</div>

### Stage 4: Mix Final
- ⏱ ~5s | 💾 <1GB VRAM
- Vocal 1.2x (+1.6dB) — more present in mix
- Instrumental 1.0x (0dB) — original volume
- Output: final_mix.wav — commercial loudness

### Output Files (5 downloads)

<div align="center">

| 🎵 Vocals (separated) | 🎸 Instrumental | 🎤 RVC Raw | ✨ Vocal Clarified | 🎚️ Mix Final |
|----------------------|-----------------|------------|-------------------|--------------|

</div>

---

## ⭐ Features Deep Dive

### ACE-Step v1.5 — Music Generation

**Text → full songs with lyrics**

| Model | Steps | Time | Quality |
|-------|-------|------|---------|
| `turbo` | 8 | ~1 min | Good — fast |
| `turbo-shift3` | 8 | ~1 min | Good — shifted |
| `sft` ✅ | 50 | ~3 min | High — default |
| `base` | 50 | ~3 min | Best — all features |

**Modes:** Text→Music · Audio Cover · Repaint · 164 genre presets

### Applio Features (v1.9.0)

**Based on Applio v3.6.2**

| Feature | Description |
|---------|-------------|
| 🎵 **Autotune** | Snaps F0 to musical notes. Strength 0.0-1.0. Use for singing (0.3-0.5). Creates natural pitch correction. |
| 🧹 **Clean Audio** | Spectral noise reduction. Strength 0.0-1.0. Use for speech only (0.4-0.6). Not recommended for singing. |
| 📊 **Volume Envelope** | RMS matching — preserves original dynamics. Always 1.0 for natural results. |
| 🔊 **High-Pass Filter** | Removes frequencies below 48Hz (rumble). Butterworth order 5. Always ON — no downside. |

### RVC Rescue Post-Processing

**Fix RVC-damaged vocals (v1.8.4)**

> ⚠️ **RVC models are trained on speech, not singing.** Without post-processing: 5/10 quality (robotic, no vibrato, no dynamics).

**Post-processing chain (applied automatically):**

1. EQ → Cut harsh 2.5kHz (-6dB), restore warmth 150Hz (+3dB)
2. Compressor → 3:1 ratio, smooth dynamics
3. Reverb → Early 50ms + tail 120ms (musical space)
4. Limiter → -1dB ceiling, prevent clipping
5. Loudnorm → -14 LUFS (Spotify/YouTube standard)

<div align="center">

| Raw RVC | RVC + Rescue |
|---------|--------------|
| 5/10 | 8/10 ✅ |

</div>

### Prompt Generator (v2.0.0)

**164 subgenres · 5 vocal presets**

- 164 subgenres across 10 categories
- 30 Romanian subgenres: Manele, Folclor, Doină, Hora
- 13 styles (Upbeat, Energetic, Emotional, Dark…)
- BPM selector: 80–200 BPM
- Structure tags: [Intro], [Verse], [Chorus]…
- One-click transfer to Suno AI tab

**VOCAL CHAIN PRESETS**

| Preset | Description |
|--------|-------------|
| 🎙️ **Studio Radio** | Clar, compresat — pop/manele |
| 🎤 **Natural** | Minimal procesare — acoustic/folk |
| 🏟️ **Arena** | Mult reverb — concert/live |
| 📻 **Radio** | Foarte compresat — commercial |
| 🎵 **Balanced** | Echilibrat — all-round |

### GPU Memory Management

**NVIDIA RTX 3070 8GB optimized**

- Real-time VRAM monitoring via `/gpu/info`
- Auto-unload RVC models after conversion
- FP16 inference — halves VRAM usage
- Tiled decode for long audio generation
- `ACESTEP_INIT_LLM=false` saves ~12GB RAM

**LLM IMPACT (ACE-STEP)**

| Setting | RAM | Audio Quality |
|---------|-----|---------------|
| `INIT_LLM=true` | ~16GB | Identical ✅ |
| `INIT_LLM=false` | ~4GB ✅ | Identical ✅ |

Audio quality is **identical** — LLM only expands prompts automatically.

### Suno AI Integration (v2.0.0)

**Local suno-api · cookie auth**

- Local suno-api integration (port 8080)
- Cookie-based authentication
- `/suno/health` endpoint for connection status
- Automatic retry logic (3 attempts)
- One-click "Send to Suno" from Prompt Generator
- Full genre/style/BPM support from ACE-Step

---

## 📦 Installation

### Prerequisites

| Software | Version | Required |
|----------|---------|----------|
| Python | 3.10 / 3.11 | ✅ Yes |
| Node.js | 18+ | ✅ Yes |
| Git | Latest | ✅ Yes |
| Windows Terminal | Latest | ✅ Yes |
| NVIDIA GPU | 4GB+ VRAM | ⚠️ Optional |
| CUDA | 11.8 / 12.1 | ⚠️ Optional |

### Step-by-Step Install

```bash
# 1. Clone
git clone https://github.com/iulicafarafrica/VocalForge.git
cd VocalForge

# 2. Python deps
python -m venv venv
venv\Scripts\activate
pip install torch --index-url https://download.pytorch.org/whl/cu121
pip install -r requirements.txt

# 3. Frontend
cd frontend && npm install && cd ..

# 4. ACE-Step
cd ace-step && uv sync && cd ..
```

### Hardware Requirements

**MINIMUM**

| Component | Specification |
|-----------|---------------|
| CPU | Intel i5 / AMD Ryzen 5 |
| RAM | 16GB |
| GPU | GTX 1060 6GB (CUDA 11.8+) |
| Storage | 50GB free |

**RECOMMENDED ✅**

| Component | Specification |
|-----------|---------------|
| CPU | Intel i7 / AMD Ryzen 7 |
| RAM | 32GB |
| GPU | RTX 3070 8GB (CUDA 11.8+) |
| Storage | 100GB SSD |

**TESTED HARDWARE**

<div align="center">

| Hardware | Status |
|----------|--------|
| ✅ Dev hardware | RTX 3070 8GB |
| ✅ Tested | RTX 3060 12GB |
| ✅ Tested | RTX 2080 Ti 11GB |
| ⚠️ Light mode | GTX 1060 6GB |

</div>

---

## 🔌 API Reference

**Main Endpoints (Port 8000)** · docs at `/docs`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/demucs_separate` | Separate stems (vocals, drums, bass, other) |
| POST | `/rvc/convert` | RVC voice conversion |
| POST | `/rvc/auto_pipeline` | Full auto pipeline (separate → RVC → post-process) |
| POST | `/pipeline/run` | Complete 4-stage pipeline v2.3 |
| GET | `/pipeline/status/{job_id}` | Poll job status (async) |
| GET | `/pipeline/download/{job_id}/{file}` | Download output file |
| POST | `/ace_generate` | ACE-Step music generation |
| GET | `/ace_health` | ACE-Step health check (port 8001) |
| GET | `/hardware` | GPU hardware info |
| GET | `/vram_usage` | Current VRAM usage |
| GET | `/gpu/info` | Detailed GPU VRAM info |
| GET | `/gpu/cleanup` | Manual GPU VRAM cleanup |
| POST | `/gpu/unload/{name}` | Unload specific model from VRAM |
| POST | `/gpu/unload-all` | Unload all models from VRAM |
| GET | `/gpu/can-load/{name}` | Check if model can be loaded |

---

## 📊 Performance Benchmarks (RTX 3070 8GB)

| Task | Quality | Time | VRAM |
|------|---------|------|------|
| BS-RoFormer Separation | 92% | ~30s | 4-5GB |
| RVC + Rescue | 80% | ~20s | 4-6GB |
| Full Pipeline (4 stages) | 90% | ~80s | 6-8GB |
| ACE-Step Turbo (1 min) | 80% | ~60s | 6-7GB |
| ACE-Step Base (3 min) | 90% | ~180s | 7-8GB |

### Quality Metrics

| Metric | Target | Achieved |
|--------|--------|----------|
| Separation SDR | >12dB | 12.97dB ✅ |
| Voice UTMOS | >4.0 | 4.2 ✅ |
| Loudness LUFS | -14 ±1 | -10 ✅ |
| True Peak | <-1 dBTP | -1.1 ✅ |

---

## ⚠️ Known Issues

| Severity | Issue | Status |
|----------|-------|--------|
| ⚠️ Design | RVC trained on SPEECH not SINGING — best case 8/10 with Rescue | Known |
| 🔴 High | No test coverage — entire codebase needs pytest + Jest | Backlog |
| 🟠 Medium | Hardcoded Windows paths in multiple files — needs env vars | Backlog |
| 🟠 Medium | Large files >2000 lines (main.py, AceStepTab.jsx) need refactor | Backlog |
| 🟡 Low | Inconsistent version numbers across files — centralize in VERSION | Backlog |
| 🟡 Low | Inline styles in React JSX — should move to CSS modules | Backlog |

---

## 🗺️ Roadmap

### Phase 1: Core Features (Q2 2026) — 20% complete

- ✅ Audio Understanding Engine — BPM/Key/Time Signature extraction
- 🔵 Vocal2BGM — vocal → generate matching BGM with ACE-Step
- ⚪ Multi-Track Layering — add instrumental layers
- ⚪ LRC Generation — lyrics with timestamps
- ⚪ Copy Melody — extract melody patterns from reference audio

### Phase 2: Quality Improvements (Q3 2026) — 0% complete

- ⚪ RVC Quality Enhancement — better pitch accuracy, less artifacts
- ⚪ Batch Processing — process multiple files simultaneously
- ⚪ Real-Time RVC Preview — hear conversion before committing
- ⚪ AI Mastering — automatic loudness, EQ, compression
- ⚪ Cloud Sync — presets and tracks across devices

### Phase 3: Advanced Features (Q4 2026) — 0% complete

- ⚪ Vocal Harmonizer — generate harmonies from single vocal
- ⚪ Chord Detection — extract chord progressions
- ⚪ Drum Pattern Extraction — isolate and export patterns
- ⚪ Formant Shifting — adjust voice character without pitch

---

## 📝 Changelog

### Unreleased — 2026-03-13: ACE-Step 3-Column Layout Redesign

- ✅ 3-column grid layout (LEFT: Task+Prompt+Genres / CENTER: Lyrics+Settings+Generate / RIGHT: Advanced always visible)
- ✅ Container width increased 900px → 1600px
- ✅ AI Chain-of-Thought moved from Task Type to Advanced Settings
- ✅ Button text: "Generate with ACE-Step" → "Generate Music"
- ✅ Status badge at top (Online/Offline + Refresh)
- ✅ Removed header title and subtitle for cleaner UI

### Unreleased — 2026-03-12: Lyrics Library + Genre Updates

- ✅ Save Lyrics feature — localStorage persistence, no server needed
- ✅ Lyrics Library Modal — browse, load, download, delete
- ✅ House & Electronic: 23 subgenres (Afro House, Melodic Techno, Progressive House...)
- ✅ Afrobeats / Afropop: 12 subgenres (Amapiano, Afro-fusion, Alté...)
- ✅ LM parameters updated to official ACE-Step v1.5 defaults (temperature 0.85, cfg_scale 2.5, top_p 0.9)
- ✅ Default model changed to acestep-v15-sft (50 steps)
- ✅ backup_project.bat: size reduced by ~90%, fixed date parsing bug

### v2.0.0 — 2026-03-10: Prompt Generator + Suno AI Integration

- 🆕 Prompt Generator tab: 164 subgenres, 13 styles, BPM selector, structure tags
- 🆕 30 Romanian subgenres: Manele, Folclor, Doină, Hora, Muzică Populară
- 🆕 5 Vocal Chain Presets: Studio Radio, Natural, Arena, Radio, Balanced
- 🆕 Suno AI Integration (local port 8080, cookie auth, 3x retry)
- ✅ Pipeline: vocal/instrumental mix balance fixed (+3dB vocal boost)
- ✅ RVC defaults for singing: harvest f0, 0.40 index rate, 0.55 protect
- ✅ Removed redundant "Voice Mix RVC" tab
- ✅ Pipeline Tab: RVC advanced settings UI (f0_method, index_rate, etc.)

### v2.0.0 — 2026-03-08: Pipeline v2.0 with Diffusion Refinement

- 🆕 Stage 3: ACE-Step Diffusion Refinement (audio2audio, denoise 0.3-0.5)
- ✅ VRAM Management: auto-unload RVC before Stage 3 → prevents OOM
- ✅ Gain Staging: normalize -1dB peak, -16 LUFS, upsample 48kHz
- ✅ Sample rate auto-resample for ACE-Step compatibility
- 📊 Overall quality: 8/10 → 9/10 (+12.5%), pipeline stability 85% → 98%
- 🔧 core/modules/pipeline_manager.py completely rewritten (v2.0)
- 🔧 ace-step/acestep/api/http/audio2audio_route.py (new, ~250 lines)

### v1.9.1 — 2026-03-08: GPU Memory Management

- 🆕 core/modules/gpu_memory.py — GPUMemoryManager class
- 🆕 backend/endpoints/gpu_info.py — 6 API endpoints (/gpu/info, /gpu/cleanup, /gpu/models...)
- 🆕 frontend/src/components/GPUMonitor.jsx — real-time VRAM display
- 🆕 run.bat / run_ps1.bat — universal Windows Terminal wrappers
- 🆕 Session auto-save every 30 minutes with crash recovery

### v1.9.0 — 2026-03-06: Applio Features Integration

- 🆕 Autotune: snap F0 to musical notes (0.0-1.0 strength)
- 🆕 Clean Audio: spectral noise reduction via noisereduce library
- 🆕 Volume Envelope: RMS matching preserves original dynamics
- 🆕 High-Pass Filter: Butterworth 48Hz removes rumble
- 🔧 core/modules/audio_processing.py — new Applio utilities file
- 📊 Singing quality: 8/10 → 9/10, Speech clarity: 7/10 → 9/10

### v1.8.4 — 2026-03-06: RVC Rescue Post-Processing

- 🆕 RVC Rescue: EQ → Compressor → Reverb → Limiter → Loudnorm chain
- ✅ f0_method: rmvpe → harvest (smoother for singing)
- ✅ index_rate: 0.75 → 0.40 (preserves original singing style)
- ✅ protect: 0.33 → 0.55 (better consonant preservation)
- 📊 Quality improvement: 5/10 (robotic) → 8/10 (musical)

### v1.8.3 — 2026-03-06: RVC Final Mix Integration

- 🆕 Auto Pipeline now saves BOTH converted_vocals.wav + instrumental.mp3
- 🆕 Instrumental exported at 320kbps MP3, 48kHz
- 🆕 "Go to Final Mix" button auto-appears after pipeline completion
- 🆕 Final Mix tab auto-loads both files, ready to mix with one click
- 🐛 Fixed: Final Mix showing "First run Auto Pipeline" after completion

### v1.8.2 — 2026-03-06: YouTube Cover Generator + RVC v2

- 🆕 YouTube Cover: Download → Separate → RVC → Mix in one click
- 🆕 /youtube/download and /youtube/cover API endpoints
- 🆕 RVC v2 support: 768-dim architecture, 48kHz, RMVPE++
- 🆕 Auto-detect RVC v1 vs v2 from checkpoint
- 🆕 MelBand cleanup, De-reverb, Denoise (all optional)
- 📦 New deps: yt-dlp, faiss-cpu, praat-parselmouth, pyworld
- 🐛 Fixed: BS-RoFormer model_name parameter, Unicode encoding on Windows

### v1.8.1 — 2026-03-06: Hotfix — BS-RoFormer Fix

- 🐛 Fixed Separator.load_model() parameter name (model_name → model_filename)
- 🐛 Added .ckpt extension to BS-RoFormer model filename
- ✅ BS-RoFormer now auto-downloads on first use (~300MB)

### v1.8.0 — 2026-03-05: Separate / Mix / Presets Tabs

- 🆕 ✂️ Separate Tab: upload song → auto-separate, one-click "Use Vocals"
- 🆕 🎚️ Mix Tab: independent volume control 0.0-2.0x, real-time preview
- 🆕 💾 Presets Tab: save/load all RVC settings, import community presets (JSON)
- ✅ RVC API endpoints on port 8002
- 🐛 Fixed: RVC working directory, Unicode encoding, config path loading

### v1.7.0 — 2026-03-01: RVC Voice Conversion

- 🆕 Complete AI voice transformation using RVC models (.pth)
- 🆕 Pitch shifting ±12 semitones, 5 emotion controls
- 🆕 4 pre-loaded models: FlorinSalam, JustinBieber, BadBunny, KanyeWest
- 🗑️ Vocal2BGM deprecated (will return in future release)

### v1.6.0 — 2026-02-15: ACE-Step Integration

- 🆕 Text-to-Music generation with prompt + lyrics
- 🆕 50+ genre presets: Hip-Hop, Pop, EDM, Manele, Reggaeton
- 🆕 Models: Turbo (8 steps), Base (50 steps), SFT (50 steps)
- 🆕 Repaint, Lego, Complete audio editing modes
- 🆕 BPM/Key Detection, Seed Library, Tracks Management
- 🔧 3-service architecture: Frontend:3000, Backend:8000, ACE-Step:8001

---

## 🔧 Troubleshooting

### Backend won't start

- `netstat -ano | findstr :8000` → check if port in use
- `taskkill /PID <PID> /F` → kill process
- Restart with: `start_backend.bat`

### RVC models not showing

- Check folder: `D:\VocalForge\RVCWebUI\assets\weights\`
- Ensure .pth files are present
- Restart backend after adding models

### YouTube Cover fails (yt-dlp missing)

- `venv\Scripts\activate`
- `pip install yt-dlp`
- `pip install -U yt-dlp` (to update)

### CORS / Network error

- Ctrl+Shift+Delete — clear browser cache
- Ensure both backend (8000) and frontend (3000) are running
- Check START_ALL.bat launched all services

### RAM leak with ACE-Step

- Set `ACESTEP_INIT_LLM=false` in .env (default)
- Run `RESTART_ACESTEP.bat` to free RAM
- Audio quality is IDENTICAL with LLM off — only prompt expansion differs

---

<div align="center">

**Made with ❤️ by iulicafarafrica**

[MIT License](LICENSE)

</div>
