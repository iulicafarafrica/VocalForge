# 🎯 VocalForge TODO & Roadmap

**Last Updated:** 2026-03-08  
**Current Version:** 2.0.0  
**Status:** ✅ Phase 1, Feature 1 COMPLETE

---

## 📋 TABLE OF CONTENTS

1. [Completed](#completed)
2. [Current Sprint](#current-sprint)
3. [Phase 1: Core Features (Q2 2026)](#phase-1-core-features-q2-2026)
4. [Phase 2: Quality Improvements (Q3 2026)](#phase-2-quality-improvements-q3-2026)
5. [Phase 3: Advanced Features (Q4 2026)](#phase-3-advanced-features-q4-2026)
6. [Backlog](#backlog)

---

## ✅ COMPLETED

### **v2.0.0 (2026-03-08)**

- [x] Stage 3: ACE-Step Diffusion Refinement
- [x] VRAM Management (unload RVC after Stage 2)
- [x] Gain Staging (normalize to -1dB after Stage 1)
- [x] Sample Rate Check (ensure 48kHz)
- [x] Force RMVPE for pipeline stability
- [x] Pipeline Manager v2.0 implementation
- [x] Audio2Audio endpoint created
- [x] Documentation complete (800+ lines)

### **v1.9.3 (2026-03-08)**

- [x] RVC Rescue Post-Processing
- [x] EQ fixes (-2.5dB/-1.5dB vs -5dB/-3dB)
- [x] Compression fixes (2:1 vs 3:1)
- [x] Spectral denoiser fixes (alpha 1.2 vs 2.0)
- [x] Limiter attack fixes (10ms vs 5ms)
- [x] Quality: 5/10 → 8/10 (+60%)

### **v1.9.0 (2026-03-06)**

- [x] Applio Features Integration
- [x] Autotune (snap F0 to musical notes)
- [x] Clean Audio (noise reduction for speech)
- [x] Volume Envelope (RMS matching)
- [x] High-Pass Filter (remove rumble below 48Hz)

### **v1.8.4 (2026-03-06)**

- [x] RVC Rescue Post-Processing
- [x] Optimized for singing (harvest, 0.40, 0.55)
- [x] Reverb for musical space

### **v1.8.3 (2026-03-06)**

- [x] RVC Final Mix Integration
- [x] Auto Pipeline → Final Mix workflow
- [x] Instrumental saving for mixing

### **v1.8.2 (2026-03-06)**

- [x] YouTube Cover Generator
- [x] RVC v2 Support
- [x] Enhanced Pipeline

---

## 🏃 CURRENT SPRINT

### **Sprint 1: v2.0.0 Testing & Stabilization (2026-03-08 to 2026-03-15)**

**Priority:** 🔴 HIGH

- [ ] Test full pipeline end-to-end
- [ ] Compare Stage 2 vs Stage 3 quality
- [ ] Document quality metrics (UTMOS, SDR, LUFS)
- [ ] Fix any remaining bugs
- [ ] Create video demo

**Definition of Done:**
- ✅ Pipeline runs successfully 10/10 times
- ✅ Quality metrics documented
- ✅ No OOM errors
- ✅ Demo video created

---

## 📅 PHASE 1: CORE FEATURES (Q2 2026)

**Timeline:** 2026-03-01 to 2026-05-31  
**Status:** 🟡 IN PROGRESS (1/5 complete)

### **1. Audio Understanding Engine** ✅ COMPLETE

**Status:** ✅ 100%  
**Quality:** 9/10

- [x] BPM detection (librosa.beat.beat_track)
- [x] Key detection (Krumhansl-Schmuckler profiles)
- [x] Time signature detection
- [x] Duration detection
- [x] 6 API endpoints

**Files:**
- `backend/endpoints/audio_analysis.py`

---

### **2. Vocal2BGM** 🔴 NEXT

**Status:** ⏸️ PLANNED  
**Priority:** 🔴 HIGH  
**Estimated Time:** 3-5 days

**What:** Transform vocal into full song with伴奏 (BGM)

**Pipeline:**
```
vocal.wav
    ↓
1. Extract features (BPM, key, genre)
    ↓
2. ACE-Step BGM generation
   - Tags: "{genre} instrumental, {bpm}bpm, {key} key"
   - Audio conditioning: vocal.wav
   - Duration: match vocal
    ↓
3. Beat alignment (librosa.beat_track)
    ↓
4. Mix vocal + BGM (sidechain compression)
    ↓
5. Master final (-14 LUFS, -1 dBTP)
```

**Files to Create:**
- `backend/endpoints/vocal2bgm.py`
- `core/modules/melody_conditioning.py`
- `frontend/src/components/Vocal2BGM.jsx`

**API Endpoint:**
```http
POST /vocal2bgm
- vocal_file: UploadFile
- genre: str (optional, auto-detect)
- bpm: float (optional, auto-detect)
- key: str (optional, auto-detect)
- ace_steps: int (default: 8 turbo)
```

**Success Criteria:**
- ✅ BGM matches vocal BPM and key
- ✅ BGM doesn't overpower vocal (-3dB gain)
- ✅ Sidechain compression working
- ✅ Master loudness: -14 LUFS

---

### **3. Multi-Track Layering**

**Status:** ⏹️ TODO  
**Priority:** 🟠 MEDIUM  
**Estimated Time:** 4-6 days

**What:** Add instrumental layers to existing tracks

**Features:**
- Add drums to existing track
- Add bass to existing track
- Add guitar/pads to existing track
- Layer multiple instruments

**Files to Create:**
- `backend/endpoints/layering.py`
- `core/modules/stem_layering.py`
- `frontend/src/components/MultiTrackLayering.jsx`

---

### **4. LRC Generation**

**Status:** ⏹️ TODO  
**Priority:** 🟠 MEDIUM  
**Estimated Time:** 2-3 days

**What:** Generate lyrics with timestamps (karaoke format)

**Features:**
- WhisperX integration
- Word-level timestamps
- LRC file export
- Karaoke-style visualization

**Files to Create:**
- `backend/endpoints/lrc_generation.py`
- `core/modules/whisperx_wrapper.py`

---

### **5. Copy Melody**

**Status:** ⏹️ TODO  
**Priority:** 🟡 LOW  
**Estimated Time:** 3-4 days

**What:** Extract melody patterns from reference audio

**Features:**
- Melody extraction (librosa.pyin)
- MIDI export
- Pattern matching
- Melody variation generation

---

## 📅 PHASE 2: QUALITY IMPROVEMENTS (Q3 2026)

**Timeline:** 2026-06-01 to 2026-08-31  
**Status:** ⏹️ TODO

### **6. RVC Quality Enhancement**

**Status:** ⏹️ TODO  
**Priority:** 🔴 HIGH  
**Estimated Time:** 2-3 weeks

**What:** Fine-tune RVC on singing datasets

**Features:**
- Singing-specific training
- Better vibrato preservation
- Improved harmony retention
- Reduced robotic artifacts

---

### **7. Batch Processing**

**Status:** ⏹️ TODO  
**Priority:** 🟠 MEDIUM  
**Estimated Time:** 3-4 days

**What:** Process 10-100 files simultaneously

**Features:**
- Queue system
- Progress tracking per file
- Error handling and retry
- Export all results

---

### **8. Real-Time RVC Preview**

**Status:** ⏹️ TODO  
**Priority:** 🟠 MEDIUM  
**Estimated Time:** 4-5 days

**What:** <100ms latency for real-time monitoring

**Features:**
- WebSocket streaming
- Chunked processing
- Low-latency F0 extraction
- Real-time gain control

---

### **9. AI Mastering**

**Status:** ⏹️ TODO  
**Priority:** 🟠 MEDIUM  
**Estimated Time:** 1-2 weeks

**What:** Professional mastering with AI

**Features:**
- EQ matching (reference tracks)
- Multi-band compression
- Stereo enhancement
- Loudness normalization (-14 LUFS Spotify, -16 LUFS YouTube)

---

### **10. Cloud Sync**

**Status:** ⏹️ TODO  
**Priority:** 🟡 LOW  
**Estimated Time:** 5-7 days

**What:** Sync presets and tracks to cloud

**Integrations:**
- Google Drive
- Dropbox
- OneDrive

---

## 📅 PHASE 3: ADVANCED FEATURES (Q4 2026)

**Timeline:** 2026-09-01 to 2026-11-30  
**Status:** ⏹️ TODO

### **11. Vocal Harmonizer**

**Status:** ⏹️ TODO  
**Priority:** 🟠 MEDIUM  
**Estimated Time:** 4-5 days

**What:** Generate harmony voices (3rds, 5ths, octaves)

**Features:**
- 3-part harmony generation
- 5th intervals
- Octave doubling
- Custom harmony intervals

---

### **12. Chord Detection**

**Status:** ⏹️ TODO  
**Priority:** 🟡 LOW  
**Estimated Time:** 2-3 days

**What:** Detect chords from audio, export chord sheet

**Features:**
- Chord progression detection
- PDF export
- JSON export
- Guitar tab export

---

### **13. Drum Pattern Extraction**

**Status:** ⏹️ TODO  
**Priority:** 🟡 LOW  
**Estimated Time:** 3-4 days

**What:** Extract drum patterns, export MIDI

**Features:**
- Kick/snare/hihat detection
- MIDI export
- Pattern visualization
- Groove quantization

---

### **14. Formant Shifting**

**Status:** ⏹️ TODO  
**Priority:** 🟡 LOW  
**Estimated Time:** 2-3 days

**What:** Male ↔ Female without pitch change

**Features:**
- Formant shift control (-12 to +12 semitones)
- Preserve pitch
- Natural timbre change

---

## 📥 BACKLOG

### **Performance Optimizations**

- [ ] TensorRT optimization (2-3x faster inference)
- [ ] INT8 quantization (4x smaller models)
- [ ] Batch size optimization (dynamic based on VRAM)
- [ ] Model caching (faster reload)

### **UI/UX Improvements**

- [ ] Onboarding wizard
- [ ] Interactive tooltips
- [ ] Video tutorials
- [ ] Dark/Light theme toggle

### **Integrations**

- [ ] Discord bot
- [ ] Telegram bot
- [ ] API rate limiting
- [ ] OAuth2 authentication

---

## 📊 PROGRESS TRACKING

### **Overall Progress:**

```
Phase 1: Core Features
├── [✅ 1/5] Audio Understanding Engine - 100%
├── [⏸️ 2/5] Vocal2BGM - 0% (NEXT)
├── [⏹️ 3/5] Multi-Track Layering - 0%
├── [⏹️ 4/5] LRC Generation - 0%
└── [⏹️ 5/5] Copy Melody - 0%
Progress: 20% (1/5)

Phase 2: Quality Improvements
├── [⏹️ 6/10] RVC Quality Enhancement - 0%
├── [⏹️ 7/10] Batch Processing - 0%
├── [⏹️ 8/10] Real-Time RVC Preview - 0%
├── [⏹️ 9/10] AI Mastering - 0%
└── [⏹️ 10/10] Cloud Sync - 0%
Progress: 0% (0/10)

Phase 3: Advanced Features
├── [⏹️ 11/14] Vocal Harmonizer - 0%
├── [⏹️ 12/14] Chord Detection - 0%
├── [⏹️ 13/14] Drum Pattern Extraction - 0%
└── [⏹️ 14/14] Formant Shifting - 0%
Progress: 0% (0/4)

TOTAL: 7% (1/14 features)
```

---

## 🎯 NEXT SPRINT PLANNING

### **Sprint 2: Vocal2BGM Implementation (2026-03-15 to 2026-03-22)**

**Goals:**
- Implement Vocal2BGM endpoint
- Create frontend component
- Test with 10+ songs
- Document best practices

**Deliverables:**
- `backend/endpoints/vocal2bgm.py`
- `frontend/src/components/Vocal2BGM.jsx`
- Demo video
- Documentation

---

**Last Updated:** 2026-03-08  
**Next Review:** 2026-03-15
