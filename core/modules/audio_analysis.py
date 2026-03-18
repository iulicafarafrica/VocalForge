#!/usr/bin/env python3
"""
Audio Analysis Module - BPM, Key, Chord Detection
Part of VocalForge v1.9.1 - Audio Understanding Engine
"""

import librosa
import numpy as np
from scipy.signal import butter, lfilter
from typing import Dict, List, Optional, Tuple
import time

KEY_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']


def detect_bpm(y: np.ndarray, sr: int) -> Tuple[float, float]:
    """Detect BPM (beats per minute) from audio."""
    tempo, beats = librosa.beat.beat_track(y=y, sr=sr, hop_length=512)
    if isinstance(tempo, np.ndarray):
        bpm = float(tempo[0]) if len(tempo) > 0 else 0.0
    else:
        bpm = float(tempo)
    
    if len(beats) > 0:
        beat_intervals = np.diff(beats)
        if len(beat_intervals) > 1:
            interval_std = np.std(beat_intervals)
            confidence = max(0.0, min(1.0, 1.0 - (interval_std / 10.0)))
        else:
            confidence = 0.5
    else:
        confidence = 0.0
    
    return round(bpm, 1), round(confidence, 2)


def detect_key(y: np.ndarray, sr: int) -> Tuple[str, str, float]:
    """Detect musical key using Krumhansl-Schmiedler algorithm."""
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=512)
    chroma_mean = np.mean(chroma, axis=1)
    
    krumhansl_key = {
        'major': np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]),
        'minor': np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
    }
    
    best_score, best_key, best_mode = -1, '', ''
    for mode, profile in krumhansl_key.items():
        for i in range(12):
            rotated_profile = np.roll(profile, i)
            correlation = np.corrcoef(chroma_mean, rotated_profile)[0, 1]
            if correlation > best_score:
                best_score, best_key, best_mode = correlation, KEY_NAMES[i], mode
    
    key_name = f'{best_key}m' if best_mode == 'minor' else best_key
    confidence = max(0.0, min(1.0, (best_score + 1.0) / 2.0))
    
    return key_name, best_mode, round(confidence, 2)


def detect_chords(y: np.ndarray, sr: int, segment_seconds: float = 3.0) -> List[Dict]:
    """Detect chord progression in audio."""
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=512)
    segment_frames = int(segment_seconds * sr / 512)
    
    chord_templates = {}
    for i, key in enumerate(KEY_NAMES):
        template = np.zeros(12)
        template[i] = 1.0
        template[(i + 4) % 12] = 0.6
        template[(i + 7) % 12] = 0.8
        chord_templates[key] = template
    
    for i, key in enumerate(KEY_NAMES):
        template = np.zeros(12)
        template[i] = 1.0
        template[(i + 3) % 12] = 0.6
        template[(i + 7) % 12] = 0.8
        chord_templates[f'{key}m'] = template
    
    chords = []
    num_segments = max(1, chroma.shape[1] // segment_frames)
    for seg_idx in range(num_segments):
        start_frame = seg_idx * segment_frames
        end_frame = min(start_frame + segment_frames, chroma.shape[1])
        segment_chroma = np.mean(chroma[:, start_frame:end_frame], axis=1)
        
        best_chord, best_score = '', -1
        for chord_name, template in chord_templates.items():
            correlation = np.corrcoef(segment_chroma, template)[0, 1]
            if correlation > best_score:
                best_score, best_chord = correlation, chord_name
        
        if best_score > 0.3:
            start_time = round(start_frame * 512 / sr, 2)
            end_time = round(end_frame * 512 / sr, 2)
            chords.append({
                'chord': best_chord,
                'start_time': start_time,
                'end_time': end_time,
                'confidence': round(max(0.0, min(1.0, (best_score + 1.0) / 2.0)), 2)
            })
    
    return chords


def detect_time_signature(y: np.ndarray, sr: int) -> Tuple[str, float]:
    """Detect time signature (4/4, 3/4, 6/8)."""
    tempo, beats = librosa.beat.beat_track(y=y, sr=sr, hop_length=512)
    if len(beats) < 4:
        return '4/4', 0.5
    return '4/4', 0.5  # Simplified for now


def detect_loudness(y: np.ndarray, sr: int) -> Dict:
    """Detect loudness metrics: LUFS, RMS, True Peak, Dynamic Range."""
    # Convert to mono for analysis
    if len(y.shape) > 1:
        y_mono = np.mean(y, axis=1)
    else:
        y_mono = y

    # RMS (Root Mean Square) - average loudness
    rms = librosa.feature.rms(y=y_mono, frame_length=2048, hop_length=512)[0]
    rms_db = librosa.amplitude_to_db(rms, ref=np.max)
    avg_rms_db = float(np.mean(rms_db))

    # True Peak (simplified - max sample value)
    true_peak = float(np.max(np.abs(y_mono)))
    true_peak_db = float(20 * np.log10(true_peak + 1e-10))

    # LUFS approximation (simplified EBU R128 with K-weighting)
    # Apply simple high-pass filter to approximate K-weighting
    b, a = butter(2, 150 / (sr / 2), btype='high')
    y_filtered = lfilter(b, a, y_mono)
    
    # Calculate power in dB
    power = np.mean(y_filtered ** 2)
    lufs = float(10 * np.log10(power + 1e-10) - 0.691)  # Approximate LUFS

    # Dynamic Range (difference between peak and RMS)
    dynamic_range = float(true_peak_db - avg_rms_db)

    # Categorize loudness
    if lufs > -10:
        category = "Very Loud (Club/DJ)"
    elif lufs > -14:
        category = "Loud (Streaming)"
    elif lufs > -18:
        category = "Moderate"
    else:
        category = "Quiet"

    return {
        'lufs': round(lufs, 2),
        'rms_db': round(avg_rms_db, 2),
        'true_peak_db': round(true_peak_db, 2),
        'dynamic_range': round(dynamic_range, 2),
        'category': category
    }


def detect_vocal_range(y: np.ndarray, sr: int) -> Dict:
    """Detect vocal range and suggest voice type."""
    # Convert to mono
    if len(y.shape) > 1:
        y_mono = np.mean(y, axis=1)
    else:
        y_mono = y

    # Extract fundamental frequency (F0) using pyin
    try:
        f0, voiced_flag, voiced_prob = librosa.pyin(
            y_mono, 
            fmin=librosa.note_to_hz('C2'), 
            fmax=librosa.note_to_hz('C7'),
            sr=sr, 
            frame_length=2048, 
            hop_length=256
        )
        
        # Get voiced frames
        if voiced_flag is not None and len(voiced_flag) > 0:
            voiced_f0 = f0[voiced_flag]
        else:
            voiced_f0 = f0[f0 > 0]
            
    except Exception as e:
        print(f"Vocal range pyin error: {e}")
        # Fallback to simpler method using harmonic detection
        harmonics = librosa.core.harmonic(y_mono, sr=sr, hop_length=512, n_harmonics=1)
        if harmonics.ndim > 1:
            f0 = np.mean(harmonics, axis=1)
        else:
            f0 = harmonics
        voiced_f0 = f0[f0 > 0]

    if len(voiced_f0) < 50:
        return {
            'detected': False,
            'reason': 'No clear vocal content detected or audio too short'
        }

    # Calculate vocal range (use percentiles to ignore outliers)
    min_freq = float(np.percentile(voiced_f0, 10))
    max_freq = float(np.percentile(voiced_f0, 90))
    avg_freq = float(np.mean(voiced_f0))

    # Convert to MIDI notes
    min_midi = librosa.hz_to_midi(min_freq)
    max_midi = librosa.hz_to_midi(max_freq)

    # Get note names
    min_note = librosa.midi_to_note(int(round(min_midi)))
    max_note = librosa.midi_to_note(int(round(max_midi)))

    # Calculate octaves
    range_octaves = (max_midi - min_midi) / 12

    # Determine voice type based on average frequency
    if avg_freq < 150:
        voice_type = "Bass / Baritone"
        model_recommendations = ["Male Vocals", "Deep Voice", "Bass"]
    elif avg_freq < 250:
        voice_type = "Tenor / Alto"
        model_recommendations = ["Male Tenor", "Female Alto", "Pop Vocal"]
    elif avg_freq < 400:
        voice_type = "Soprano"
        model_recommendations = ["Female Soprano", "High Female", "Pop Female"]
    else:
        voice_type = "High Soprano / Child"
        model_recommendations = ["High Female", "Child Voice", "Choir"]

    return {
        'detected': True,
        'min_note': min_note,
        'max_note': max_note,
        'min_freq_hz': round(min_freq, 1),
        'max_freq_hz': round(max_freq, 1),
        'avg_freq_hz': round(avg_freq, 1),
        'range_octaves': round(range_octaves, 2),
        'voice_type': voice_type,
        'model_recommendations': model_recommendations
    }


def detect_energy_mood(y: np.ndarray, sr: int) -> Dict:
    """Detect energy, danceability, and mood from audio."""
    # Convert to mono
    if len(y.shape) > 1:
        y_mono = np.mean(y, axis=1)
    else:
        y_mono = y

    # Tempo and beat strength
    try:
        tempo, beats = librosa.beat.beat_track(y=y_mono, sr=sr, hop_length=512)
        if isinstance(tempo, np.ndarray):
            tempo = float(tempo[0]) if len(tempo) > 0 else 120.0
    except Exception:
        tempo = 120.0
        beats = np.array([])

    # Beat strength (how regular the beats are)
    if len(beats) > 2:
        beat_intervals = np.diff(beats)
        beat_regularness = 1.0 - min(1.0, np.std(beat_intervals) / 5.0)
    else:
        beat_regularness = 0.3

    # RMS energy
    rms = librosa.feature.rms(y=y_mono, frame_length=2048, hop_length=512)[0]
    avg_energy = float(np.mean(rms))
    energy_normalized = min(100, max(0, (avg_energy - 0.01) / 0.1 * 100))

    # Spectral centroid (brightness)
    spectral_centroid = librosa.feature.spectral_centroid(y=y_mono, sr=sr, hop_length=512)[0]
    avg_centroid = float(np.mean(spectral_centroid))
    brightness = min(100, max(0, (avg_centroid - 500) / 3000 * 100))

    # Zero crossing rate (percussiveness)
    zcr = librosa.feature.zero_crossing_rate(y_mono, frame_length=2048, hop_length=512)[0]
    avg_zcr = float(np.mean(zcr))

    # Calculate metrics
    energy = int(energy_normalized)
    danceability = int((beat_regularness * 50 + min(100, tempo / 180 * 100) * 0.5))
    valence = float((brightness + energy_normalized) / 200)  # 0-1 scale

    # Mood labels
    mood_labels = []
    if energy > 70:
        mood_labels.append("High Energy")
    elif energy < 30:
        mood_labels.append("Calm")
    else:
        mood_labels.append("Moderate")

    if valence > 0.6:
        mood_labels.append("Positive")
    elif valence < 0.4:
        mood_labels.append("Melancholic")
    else:
        mood_labels.append("Neutral")

    if danceability > 70:
        mood_labels.append("Danceable")
    elif danceability < 30:
        mood_labels.append("Non-Danceable")

    # Description
    if energy > 70 and danceability > 60:
        description = "Energetic and danceable track"
    elif energy < 30 and valence < 0.4:
        description = "Calm and melancholic atmosphere"
    elif energy > 50 and valence > 0.6:
        description = "Upbeat and positive vibe"
    else:
        description = "Balanced track with moderate energy"

    return {
        'energy': energy,
        'danceability': danceability,
        'valence': round(valence, 2),
        'tempo': round(tempo, 1),
        'brightness': round(brightness, 1),
        'mood_labels': mood_labels,
        'description': description
    }


def detect_frequency_spectrum(y: np.ndarray, sr: int) -> Dict:
    """Analyze frequency spectrum: Bass, Mids, Highs distribution."""
    # Convert to mono
    if len(y.shape) > 1:
        y_mono = np.mean(y, axis=1)
    else:
        y_mono = y

    # Compute STFT
    try:
        D = np.abs(librosa.stft(y_mono, n_fft=2048, hop_length=512))
        freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
    except Exception as e:
        print(f"Frequency spectrum error: {e}")
        return {
            'bass_percent': 33.3,
            'mid_percent': 33.3,
            'high_percent': 33.4,
            'bass_hz': '20-250',
            'mid_hz': '250-4000',
            'high_hz': '4000-20000',
            'description': 'Unable to analyze spectrum'
        }

    # Define frequency bands
    bass_mask = (freqs >= 20) & (freqs < 250)
    mid_mask = (freqs >= 250) & (freqs < 4000)
    high_mask = (freqs >= 4000) & (freqs <= 20000)

    # Calculate energy in each band
    bass_energy = np.sum(D[bass_mask, :])
    mid_energy = np.sum(D[mid_mask, :])
    high_energy = np.sum(D[high_mask, :])
    total_energy = bass_energy + mid_energy + high_energy

    # Calculate percentages
    if total_energy > 0:
        bass_percent = float(bass_energy / total_energy * 100)
        mid_percent = float(mid_energy / total_energy * 100)
        high_percent = float(high_energy / total_energy * 100)
    else:
        bass_percent = mid_percent = high_percent = 0.0

    # Spectral balance description
    if bass_percent > 40:
        bass_desc = "Bass-heavy"
    elif bass_percent < 20:
        bass_desc = "Light bass"
    else:
        bass_desc = "Balanced bass"

    if mid_percent > 50:
        mid_desc = "Prominent mids"
    elif mid_percent < 35:
        mid_desc = "Recessed mids"
    else:
        mid_desc = "Natural mids"

    if high_percent > 30:
        high_desc = "Bright"
    elif high_percent < 15:
        high_desc = "Dark/Warm"
    else:
        high_desc = "Balanced highs"

    description = f"{bass_desc}, {mid_desc}, {high_desc}"

    return {
        'bass_percent': round(bass_percent, 1),
        'mid_percent': round(mid_percent, 1),
        'high_percent': round(high_percent, 1),
        'bass_hz': '20-250',
        'mid_hz': '250-4000',
        'high_hz': '4000-20000',
        'description': description
    }


def analyze_audio(file_path: str, duration: Optional[float] = None) -> Dict:
    """Complete audio analysis: BPM, Key, Chords, Time Signature, Loudness, Vocal, Mood, Frequency."""
    start_time = time.time()

    y, sr = librosa.load(file_path, sr=None, duration=duration)

    analysis = {
        'status': 'success',
        'file': file_path,
        'duration_seconds': round(len(y) / sr, 2),
        'sample_rate': sr,
        'analysis_time_seconds': 0.0
    }

    try:
        # Basic analysis
        bpm, bpm_conf = detect_bpm(y, sr)
        analysis['bpm'] = {'value': bpm, 'confidence': bpm_conf}

        key, mode, key_conf = detect_key(y, sr)
        analysis['key'] = {'value': key, 'mode': mode, 'confidence': key_conf}

        time_sig, ts_conf = detect_time_signature(y, sr)
        analysis['time_signature'] = {'value': time_sig, 'confidence': ts_conf}

        chords = detect_chords(y, sr, segment_seconds=3.0)
        analysis['chords'] = {
            'progression': [c['chord'] for c in chords],
            'details': chords,
            'unique_chords': list(set([c['chord'] for c in chords]))
        }
    except Exception as e:
        analysis['basic_error'] = str(e)

    # Advanced analysis (each with individual error handling)
    try:
        analysis['loudness'] = detect_loudness(y, sr)
    except Exception as e:
        analysis['loudness'] = {'error': str(e)}
        print(f"Loudness error: {e}")

    try:
        analysis['vocal_range'] = detect_vocal_range(y, sr)
    except Exception as e:
        analysis['vocal_range'] = {'detected': False, 'reason': f'Error: {str(e)}'}
        print(f"Vocal range error: {e}")

    try:
        analysis['energy_mood'] = detect_energy_mood(y, sr)
    except Exception as e:
        analysis['energy_mood'] = {'error': str(e)}
        print(f"Energy/mood error: {e}")

    try:
        analysis['frequency_spectrum'] = detect_frequency_spectrum(y, sr)
    except Exception as e:
        analysis['frequency_spectrum'] = {'error': str(e)}
        print(f"Frequency error: {e}")

    analysis['analysis_time_seconds'] = round(time.time() - start_time, 2)
    return analysis


if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1:
        result = analyze_audio(sys.argv[1])
        print(f"BPM: {result['bpm']['value']}, Key: {result['key']['value']} {result['key']['mode']}")
    else:
        print("Usage: python audio_analysis.py <audio_file>")
