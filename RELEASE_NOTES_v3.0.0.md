# 🎵 VocalForge v3.0.0 - Audio Enhancer Release

**Release Date:** March 19, 2026

## ✨ What's New

### 🎧 Audio Enhancer (NEW TAB)
Professional audio post-processing for hiss removal and audio enhancement.

**Features:**
- 🔇 **Noise Removal** - Remove hiss, hum, and static from audio
- 🎚️ **3-Stage Processing:**
  - Highpass Filter @ 20Hz (removes infrasound, preserves bass)
  - Spectral Denoise (afftdn) - removes hiss without affecting music
  - Loudness Normalization (-14 LUFS for streaming standard)
- 💪 **3 Strength Levels:**
  - 🌱 **Light** (nr=15) - Gentle reduction, natural sound
  - ⚖️ **Medium** (nr=20 + EQ) - **Smart EQ targets hiss at 6/9/13kHz**
  - 🔥 **Aggressive** (nr=25) - Strong reduction for noisy recordings

### 🔇 Noise Hiss Remover (ACE-Step Integration)
Audio enhancement now integrated directly into ACE-Step generation!

**Location:** ACE-Step Tab → Audio section → "🔇 Noise Hiss Remover"

**How it works:**
1. Generate music with ACE-Step
2. Audio Enhancer automatically processes the output
3. Result: Clean audio with no hiss, full bass, consistent loudness

**Processing time:** +6-8 seconds per track

---

## 🐛 Bug Fixes

1. **Audio Enhancer file upload** - Fixed file input not triggering
2. **Audio Enhancer 404 errors** - Fixed output files not being served
3. **Audio enhancement boolean conversion** - Fixed FormData string/bool issue
4. **Bass preservation** - Lowered highpass to 20Hz (preserves kick/bass guitar)
5. **Brightness preservation** - Removed lowpass filter (keeps highs clear)

---

## 🔧 Technical Changes

### Backend (`backend/endpoints/audio_enhancer.py`)
- New endpoint: `POST /audio/enhance`
- New function: `enhance_audio_file()` for integration
- FFmpeg-based processing (highpass + afftdn + loudnorm)
- Optional EQ for medium preset (targets 6/9/13kHz)

### Frontend (`frontend/src/components/AudioEnhancerTab.jsx`)
- New tab: Audio Enhancer
- File upload with drag & drop
- Mode selection (Noise Removal only)
- Strength selector (light/medium/aggressive)
- Audio preview player
- Download buttons

### ACE-Step Integration (`backend/main.py`, `frontend/src/components/AceStepTab.jsx`)
- New parameters: `audio_enhance`, `enhance_strength`
- Automatic post-processing after generation
- UI dropdown: "🔇 Noise Hiss Remover" (OFF/Light/Medium/Aggressive)

---

## 📊 Performance

| Operation | Time |
|-----------|------|
| Noise Removal (light) | ~6-7s |
| Noise Removal (medium) | ~7-8s |
| Noise Removal (aggressive) | ~8-9s |
| ACE-Step + Enhancement | +6-8s |

---

## 🎯 Usage Examples

### Standalone Audio Enhancer
1. Go to **Audio Enhancer** tab
2. Upload audio file (WAV/MP3/FLAC)
3. Select **Noise Removal** mode
4. Choose strength: **Light** / **Medium** / **Aggressive**
5. Click **🚀 Enhance Audio**
6. Download processed file

### ACE-Step Generation with Enhancement
1. Go to **ACE-Step** tab
2. Configure generation settings
3. Set **🔇 Noise Hiss Remover: Medium** (recommended)
4. Generate music
5. Audio is automatically enhanced

---

## 🎵 Audio Quality Comparison

### Before Enhancement:
- ❌ Hiss in high frequencies (5kHz+)
- ❌ Inconsistent loudness
- ❌ Possible infrasound rumble

### After Enhancement (Medium):
- ✅ Clean highs (hiss removed at 6/9/13kHz)
- ✅ Consistent loudness (-14 LUFS)
- ✅ Full bass intact (20Hz highpass only)
- ✅ Natural, unprocessed sound

---

## 🎯 Why This Matters

> **"Audio quality is now 10/10 — crystal clear clarity from ACE-Step"**
> 
> **Before v3.0.0:** ❌ Hiss and noise in high frequencies
> 
> **After v3.0.0:** ✅ Crystal clear audio with full bass, no hiss, professional loudness

---

## 📝 Notes

- **Recommended setting:** Medium (best balance)
- **For very clean recordings:** Light
- **For noisy recordings:** Aggressive
- **Bass preservation:** Highpass @ 20Hz (doesn't affect kick/bass guitar)
- **Brightness preservation:** No lowpass filter (keeps air/sparkle)

---

## 🙏 Credits

- **Audio processing:** FFmpeg (afftdn, EQ, loudnorm)
- **Inspiration:** AcoustiClean (https://github.com/CSuvarna23/AcoustiClean)
- **ACE-Step:** https://github.com/ace-step/ACE-Step-1.5

---

## 📥 Installation

```bash
# Pull latest changes
git pull origin main

# Restart backend
cd D:\VocalForge\backend
python main.py

# Refresh frontend (Ctrl+F5)
```

---

**Enjoy clean, professional-sounding audio!** 🎵🎧✨
