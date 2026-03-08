#!/usr/bin/env python3
"""
Audio Analysis Module - BPM, Key, Chord Detection
Part of VocalForge v1.9.1 - Audio Understanding Engine
"""

import librosa
import numpy as np
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


def analyze_audio(file_path: str, duration: Optional[float] = None) -> Dict:
    """Complete audio analysis: BPM, Key, Chords, Time Signature."""
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
        analysis['status'] = 'error'
        analysis['error'] = str(e)
    
    analysis['analysis_time_seconds'] = round(time.time() - start_time, 2)
    return analysis


if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1:
        result = analyze_audio(sys.argv[1])
        print(f"BPM: {result['bpm']['value']}, Key: {result['key']['value']} {result['key']['mode']}")
    else:
        print("Usage: python audio_analysis.py <audio_file>")
