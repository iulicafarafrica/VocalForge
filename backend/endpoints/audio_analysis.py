#!/usr/bin/env python3
"""
Audio Analysis API Endpoints
Part of VocalForge v2.1.0 - Advanced Audio Understanding Engine
"""

import os
import sys
import uuid
import math
import numpy as np
import librosa
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional, List, Dict, Any
import shutil

# Add project root to path for core modules
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), '..'))

from core.modules.audio_analysis import analyze_audio, detect_bpm, detect_key, detect_chords, detect_time_signature

router = APIRouter(prefix="/audio", tags=["Audio Analysis"])

TEMP_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "temp")
os.makedirs(TEMP_DIR, exist_ok=True)


# ── Loudness Analysis ──────────────────────────────────────────────────────────

def calculate_loudness(y: np.ndarray, sr: int) -> Dict[str, Any]:
    """Calculate loudness metrics: LUFS, RMS, True Peak, Dynamic Range."""
    if len(y.shape) > 1:
        y = librosa.to_mono(y)
    
    # RMS (Root Mean Square)
    rms = librosa.feature.rms(y=y)[0]
    rms_db = 20 * np.log10(np.mean(rms) + 1e-10)
    
    # Approximate LUFS (simplified K-weighted)
    y_filtered = librosa.effects.preemphasis(y, coef=0.97)
    loudness_db = 20 * np.log10(np.mean(np.abs(y_filtered)) + 1e-10)
    
    # True Peak
    true_peak = np.max(np.abs(y))
    true_peak_db = 20 * np.log10(true_peak + 1e-10)
    
    # Dynamic Range
    dynamic_range = true_peak_db - rms_db
    
    # Category
    loudness_category = "Too Quiet"
    if loudness_db > -10:
        loudness_category = "Too Loud (Over-compressed)"
    elif loudness_db > -16:
        loudness_category = "Spotify Ready"
    elif loudness_db > -20:
        loudness_category = "Good"
    
    return {
        "lufs": round(loudness_db, 2),
        "rms_db": round(rms_db, 2),
        "true_peak_db": round(true_peak_db, 2),
        "dynamic_range": round(dynamic_range, 1),
        "category": loudness_category
    }


# ── Vocal Range Detection ──────────────────────────────────────────────────────

def detect_vocal_range(y: np.ndarray, sr: int) -> Dict[str, Any]:
    """Detect vocal range and classify voice type (optimized for speed)."""
    if len(y.shape) > 1:
        y = librosa.to_mono(y)
    
    # Downsample for faster processing (keep quality for vocal detection)
    if sr > 22050:
        y = librosa.resample(y, orig_sr=sr, target_sr=22050)
        sr = 22050
    
    # Use simpler F0 tracking (faster than pYIN)
    f0, voiced_flag = librosa.piptrack(y=y, sr=sr, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7'))
    
    # Extract voiced frames
    voiced_f0 = f0[voiced_flag > 0.8]  # Only confident detections
    
    if len(voiced_f0) == 0:
        # Fallback: use simpler method
        intervals, pitch = librosa.pyin(y, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7'), sr=sr, frame_length=2048)
        voiced_f0 = intervals[pitch != np.nan]
        if len(voiced_f0) == 0:
            return {"detected": False, "reason": "No vocals detected"}
    
    min_freq = float(np.percentile(voiced_f0, 5))
    max_freq = float(np.percentile(voiced_f0, 95))
    min_note = librosa.hz_to_note(min_freq)
    max_note = librosa.hz_to_note(max_freq)
    
    range_semitones = librosa.note_to_midi(max_note) - librosa.note_to_midi(min_note)
    range_octaves = range_semitones / 12
    
    avg_freq = np.mean(voiced_f0)
    voice_type = "Unknown"
    if avg_freq > 520: voice_type = "Soprano"
    elif avg_freq > 350: voice_type = "Alto"
    elif avg_freq > 195: voice_type = "Tenor"
    elif avg_freq > 130: voice_type = "Baritone"
    else: voice_type = "Bass"
    
    model_recommendations = []
    if voice_type in ["Soprano", "Alto"]:
        model_recommendations = ["Female models", "High-pitched voices"]
    elif voice_type in ["Tenor", "Baritone"]:
        model_recommendations = ["Male models", "Mid-range voices"]
    else:
        model_recommendations = ["All models"]
    
    return {
        "detected": True,
        "min_freq_hz": round(min_freq, 1),
        "max_freq_hz": round(max_freq, 1),
        "min_note": min_note,
        "max_note": max_note,
        "range_octaves": round(range_octaves, 1),
        "voice_type": voice_type,
        "avg_freq_hz": round(avg_freq, 1),
        "model_recommendations": model_recommendations,
        "processing_time": "optimized"
    }


# ── Energy & Mood Analysis ─────────────────────────────────────────────────────

def analyze_energy_mood(y: np.ndarray, sr: int) -> Dict[str, Any]:
    """Analyze energy, danceability, valence (mood)."""
    if len(y.shape) > 1:
        y = librosa.to_mono(y)
    
    rms = librosa.feature.rms(y=y)[0]
    zcr = librosa.feature.zero_crossing_rate(y)[0]
    energy = (np.mean(rms) * 0.7 + np.mean(zcr) * 0.3) * 1000
    energy = min(100, max(0, energy))
    
    tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
    beat_strength = np.std(beats) if len(beats) > 1 else 0
    danceability = (60 + beat_strength * 20 + (float(tempo) / 200) * 20)
    danceability = min(100, max(0, danceability))
    
    spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
    valence = (np.mean(spectral_centroid) / 5000) * 100
    valence = min(100, max(0, valence))
    
    mood_labels = []
    if energy > 70: mood_labels.append("Energetic")
    elif energy < 30: mood_labels.append("Calm")
    else: mood_labels.append("Moderate")
    
    if valence > 60: mood_labels.append("Happy")
    elif valence < 40: mood_labels.append("Sad")
    else: mood_labels.append("Neutral")
    
    if danceability > 70: mood_labels.append("Danceable")
    elif danceability < 30: mood_labels.append("Not Danceable")
    
    return {
        "energy": round(energy, 1),
        "danceability": round(danceability, 1),
        "valence": round(valence, 2),
        "tempo_bpm": round(float(tempo), 1),
        "mood_labels": mood_labels,
        "description": f"{mood_labels[0]} & {mood_labels[1]}"
    }


# ── Frequency Spectrum Analysis ────────────────────────────────────────────────

def analyze_frequency_spectrum(y: np.ndarray, sr: int) -> Dict[str, Any]:
    """Analyze frequency distribution: bass, mids, highs."""
    if len(y.shape) > 1:
        y = librosa.to_mono(y)
    
    D = np.abs(librosa.stft(y, n_fft=2048, hop_length=512))
    freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
    
    bass_mask = (freqs >= 20) & (freqs < 250)
    mid_mask = (freqs >= 250) & (freqs < 4000)
    high_mask = (freqs >= 4000) & (freqs <= 20000)
    
    bass_energy = np.mean(D[bass_mask, :])
    mid_energy = np.mean(D[mid_mask, :])
    high_energy = np.mean(D[high_mask, :])
    total = bass_energy + mid_energy + high_energy
    
    bass_pct = (bass_energy / total) * 100 if total > 0 else 0
    mid_pct = (mid_energy / total) * 100 if total > 0 else 0
    high_pct = (high_energy / total) * 100 if total > 0 else 0
    
    balance_notes = []
    if bass_pct > 40: balance_notes.append("Bass-heavy")
    elif bass_pct < 20: balance_notes.append("Light bass")
    if mid_pct > 50: balance_notes.append("Prominent mids")
    elif mid_pct < 30: balance_notes.append("Recessed mids")
    if high_pct > 30: balance_notes.append("Bright")
    elif high_pct < 15: balance_notes.append("Dark")
    if not balance_notes: balance_notes = ["Balanced"]
    
    return {
        "bass_percent": round(bass_pct, 1),
        "mid_percent": round(mid_pct, 1),
        "high_percent": round(high_pct, 1),
        "bass_range": "20-250 Hz",
        "mid_range": "250-4000 Hz",
        "high_range": "4000-20000 Hz",
        "balance_notes": balance_notes,
        "description": ", ".join(balance_notes)
    }


# ── API Endpoints ──────────────────────────────────────────────────────────────

@router.post("/analyze")
async def analyze_audio_endpoint(file: UploadFile = File(...), duration: Optional[float] = Form(None)):
    """Complete audio analysis: BPM, Key, Chords, Time Signature."""
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".wav"
    temp_path = os.path.join(TEMP_DIR, f"audio_{file_id}{file_ext}")

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        result = analyze_audio(temp_path, duration=duration)
        result['original_filename'] = file.filename
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/loudness")
async def analyze_loudness_endpoint(file: UploadFile = File(...)):
    """Analyze loudness: LUFS, RMS, True Peak, Dynamic Range."""
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".wav"
    temp_path = os.path.join(TEMP_DIR, f"audio_{file_id}{file_ext}")

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        y, sr = librosa.load(temp_path, sr=None)
        result = calculate_loudness(y, sr)
        result['filename'] = file.filename
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Loudness analysis failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/vocal-range")
async def detect_vocal_range_endpoint(file: UploadFile = File(...)):
    """Detect vocal range and classify voice type."""
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".wav"
    temp_path = os.path.join(TEMP_DIR, f"audio_{file_id}{file_ext}")

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        y, sr = librosa.load(temp_path, sr=None)
        result = detect_vocal_range(y, sr)
        result['filename'] = file.filename
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vocal range failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/energy-mood")
async def analyze_energy_mood_endpoint(file: UploadFile = File(...)):
    """Analyze energy, danceability, and mood."""
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".wav"
    temp_path = os.path.join(TEMP_DIR, f"audio_{file_id}{file_ext}")

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        y, sr = librosa.load(temp_path, sr=None)
        result = analyze_energy_mood(y, sr)
        result['filename'] = file.filename
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Mood analysis failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/frequency-spectrum")
async def analyze_frequency_spectrum_endpoint(file: UploadFile = File(...)):
    """Analyze frequency spectrum distribution."""
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".wav"
    temp_path = os.path.join(TEMP_DIR, f"audio_{file_id}{file_ext}")

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        y, sr = librosa.load(temp_path, sr=None)
        result = analyze_frequency_spectrum(y, sr)
        result['filename'] = file.filename
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Frequency analysis failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/full-analysis")
async def full_audio_analysis_endpoint(file: UploadFile = File(...)):
    """Complete audio analysis: all metrics in one call."""
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".wav"
    temp_path = os.path.join(TEMP_DIR, f"audio_{file_id}{file_ext}")

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        y, sr = librosa.load(temp_path, sr=None)
        
        loudness = calculate_loudness(y, sr)
        vocal_range = detect_vocal_range(y, sr)
        energy_mood = analyze_energy_mood(y, sr)
        frequency = analyze_frequency_spectrum(y, sr)
        duration = len(y) / sr
        
        return {
            "status": "success",
            "filename": file.filename,
            "duration_seconds": round(duration, 2),
            "loudness": loudness,
            "vocal_range": vocal_range,
            "energy_mood": energy_mood,
            "frequency_spectrum": frequency
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Full analysis failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.get("/info")
async def audio_analysis_info():
    """Get information about audio analysis capabilities."""
    return {
        "status": "ok",
        "capabilities": {
            "bpm_detection": {"description": "Detect BPM", "endpoint": "POST /audio/bpm"},
            "key_detection": {"description": "Detect musical key", "endpoint": "POST /audio/key"},
            "loudness": {"description": "LUFS, RMS, Peak, DR", "endpoint": "POST /audio/loudness", "recommended": True},
            "vocal_range": {"description": "Voice type & range", "endpoint": "POST /audio/vocal-range", "recommended": True},
            "energy_mood": {"description": "Energy, danceability, mood", "endpoint": "POST /audio/energy-mood"},
            "frequency": {"description": "Bass/mid/high distribution", "endpoint": "POST /audio/frequency-spectrum"},
            "full_analysis": {"description": "All analyses combined", "endpoint": "POST /audio/full-analysis", "recommended": True}
        }
    }
