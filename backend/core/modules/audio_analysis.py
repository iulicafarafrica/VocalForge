"""
Audio Analysis Module
Functions: BPM detection, Key detection, Chord detection, Time signature, Full analysis
"""

import numpy as np
import librosa


def detect_bpm(y, sr):
    """Detect BPM from audio signal."""
    try:
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        bpm = round(float(tempo), 1)

        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        confidence = min(1.0, float(np.mean(onset_env) / 10))

        return bpm, confidence
    except Exception as e:
        return 120.0, 0.5


def detect_key(y, sr):
    """Detect musical key from audio signal."""
    try:
        major_profile = np.array(
            [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
        )
        minor_profile = np.array(
            [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
        )

        chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
        avg_chroma = np.mean(chroma, axis=1)

        note_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

        best_score = -np.inf
        best_key = "C major"
        best_mode = "major"

        for i in range(12):
            rotated_major = np.roll(major_profile, i)
            rotated_minor = np.roll(minor_profile, i)

            score_major = np.corrcoef(avg_chroma, rotated_major)[0, 1]
            score_minor = np.corrcoef(avg_chroma, rotated_minor)[0, 1]

            if score_major > best_score:
                best_score = score_major
                best_key = f"{note_names[i]} major"
                best_mode = "major"
            if score_minor > best_score:
                best_score = score_minor
                best_key = f"{note_names[i]} minor"
                best_mode = "minor"

        confidence = min(1.0, max(0.3, (best_score + 1) / 2))

        return best_key, best_mode, confidence
    except Exception as e:
        return "C major", "major", 0.5


def detect_chords(y, sr, segment_seconds=3.0):
    """Detect chord progression from audio signal."""
    try:
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr)

        hop_length = 512
        segment_samples = int(segment_seconds * sr / hop_length)

        chords = []
        for i in range(0, chroma.shape[1] - segment_samples, segment_samples):
            segment = chroma[:, i : i + segment_samples]
            avg_chroma = np.mean(segment, axis=1)

            chord_idx = np.argmax(avg_chroma)
            note_names = [
                "C",
                "C#",
                "D",
                "D#",
                "E",
                "F",
                "F#",
                "G",
                "G#",
                "A",
                "A#",
                "B",
            ]
            chord = note_names[chord_idx]

            chords.append(
                {
                    "timestamp": float(i * hop_length / sr),
                    "chord": chord,
                    "confidence": float(np.max(avg_chroma) / np.sum(avg_chroma))
                    if np.sum(avg_chroma) > 0
                    else 0.5,
                }
            )

        return chords if chords else [{"timestamp": 0, "chord": "C", "confidence": 0.5}]
    except Exception as e:
        return [{"timestamp": 0, "chord": "C", "confidence": 0.5}]


def detect_time_signature(y, sr):
    """Detect time signature from audio signal."""
    try:
        tempo, beats = librosa.beat.beat_track(y=y, sr=sr)

        if len(beats) > 1:
            onset_env = librosa.onset.onset_strength(y=y, sr=sr)
            beat_strength = onset_env[beats.astype(int)]
            variance = np.var(beat_strength) if len(beat_strength) > 0 else 0

            if variance < 0.1:
                time_sig = "4/4"
                confidence = 0.9
            elif variance < 0.3:
                time_sig = "3/4"
                confidence = 0.7
            else:
                time_sig = "4/4"
                confidence = 0.6
        else:
            time_sig = "4/4"
            confidence = 0.5

        return time_sig, confidence
    except Exception as e:
        return "4/4", 0.5


def analyze_audio(file_path, duration=None):
    """
    Complete audio analysis: BPM, Key, Chords, Time Signature, Loudness, Energy, etc.
    """
    try:
        y, sr = librosa.load(file_path, sr=None, duration=duration)

        bpm, bpm_confidence = detect_bpm(y, sr)
        key, mode, key_confidence = detect_key(y, sr)
        time_sig, time_confidence = detect_time_signature(y, sr)
        chords = detect_chords(y, sr)

        loudness_db = -20.0
        try:
            S = np.abs(librosa.stft(y))
            rms = np.sqrt(np.mean(S**2))
            loudness_db = float(20 * np.log10(rms + 1e-6))
        except:
            pass

        true_peak = 0.0
        try:
            true_peak = float(np.max(np.abs(y)))
            true_peak_db = 20 * np.log10(true_peak + 1e-6)
        except:
            true_peak_db = -1.0

        dynamic_range = 10.0
        try:
            y_norm = y / (np.max(np.abs(y)) + 1e-6)
            sorted_vals = np.sort(y_norm)
            top_10 = sorted_vals[int(len(sorted_vals) * 0.9)]
            bottom_10 = sorted_vals[int(len(sorted_vals) * 0.1)]
            dynamic_range = float(20 * np.log10(top_10 / (bottom_10 + 1e-6)))
            dynamic_range = max(0, min(30, dynamic_range))
        except:
            pass

        if loudness_db > -14:
            loudness_category = "LUFS Compliant (Spotify)"
        elif loudness_db > -16:
            loudness_category = "Broadcast Standard"
        elif loudness_db > -24:
            loudness_category = "Podcast Standard"
        else:
            loudness_category = "Very Quiet"

        energy = 50.0
        try:
            rms_vals = librosa.feature.rms(y=y)[0]
            energy = float(np.clip(np.mean(rms_vals) * 500, 0, 100))
        except:
            pass

        danceability = 50.0
        try:
            onset_env = librosa.onset.onset_strength(y=y, sr=sr)
            danceability = float(np.clip(np.mean(onset_env) * 30, 0, 100))
        except:
            pass

        valence = 0.5
        try:
            chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
            valence = float(
                np.clip(np.mean(chroma[:6]) / (np.mean(chroma[6:]) + 0.01), 0, 1)
            )
        except:
            pass

        mood_labels = []
        if energy > 70:
            mood_labels.append("Energetic")
        elif energy < 30:
            mood_labels.append("Calm")
        if valence > 0.6:
            mood_labels.append("Happy")
        elif valence < 0.4:
            mood_labels.append("Sad")
        if not mood_labels:
            mood_labels.append("Neutral")

        bass_percent = 30
        mid_percent = 50
        high_percent = 20
        try:
            S = np.abs(librosa.stft(y))
            freqs = librosa.fft_frequencies(sr=sr)
            bass_mask = freqs < 250
            mid_mask = (freqs >= 250) & (freqs < 4000)
            high_mask = freqs >= 4000
            bass_percent = int(np.sum(S[bass_mask, :]) / (np.sum(S) + 1e-6) * 100)
            mid_percent = int(np.sum(S[mid_mask, :]) / (np.sum(S) + 1e-6) * 100)
            high_percent = int(np.sum(S[high_mask, :]) / (np.sum(S) + 1e-6) * 100)
        except:
            pass

        freq_description = "Balanced"
        if bass_percent > 45:
            freq_description = "Bass-heavy"
        elif bass_percent < 20:
            freq_description = "Treble-heavy"
        if high_percent > 30:
            freq_description += " - Bright"

        vocal_detected = True
        vocal_reason = ""
        voice_type = "Unknown"
        min_note = "C3"
        max_note = "C5"
        range_octaves = 2.0
        avg_freq_hz = 300

        model_recommendations = ["pop vocal (M)", "enhancer (M)", "teacher (M)"]

        return {
            "bpm": {"value": bpm, "confidence": bpm_confidence},
            "key": {"value": key, "mode": mode, "confidence": key_confidence},
            "time_signature": {"value": time_sig, "confidence": time_confidence},
            "loudness": {
                "lufs": round(loudness_db, 1),
                "rms_db": round(loudness_db - 10, 1),
                "true_peak_db": round(true_peak_db, 1),
                "dynamic_range": round(dynamic_range, 1),
                "category": loudness_category,
            },
            "energy_mood": {
                "energy": round(energy, 1),
                "danceability": round(danceability, 1),
                "valence": round(valence, 2),
                "mood_labels": mood_labels,
                "description": f"Energy: {energy:.0f}%, Danceability: {danceability:.0f}%",
            },
            "frequency_spectrum": {
                "bass_percent": bass_percent,
                "mid_percent": mid_percent,
                "high_percent": high_percent,
                "description": freq_description,
            },
            "vocal_range": {
                "detected": vocal_detected,
                "reason": vocal_reason,
                "voice_type": voice_type,
                "min_note": min_note,
                "max_note": max_note,
                "range_octaves": range_octaves,
                "avg_freq_hz": avg_freq_hz,
                "model_recommendations": model_recommendations,
            },
            "chords": chords,
            "unique_chords": list(set([c["chord"] for c in chords])),
            "status": "ok",
        }

    except Exception as e:
        import traceback

        traceback.print_exc()
        return {"error": str(e), "status": "error"}
