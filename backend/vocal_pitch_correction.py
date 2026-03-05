"""
Vocal Pitch Correction Endpoint
Detects pitch from vocal and corrects notes to specified scale.
"""

from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse
import librosa
import numpy as np
import soundfile as sf
import tempfile
import os
import uuid

router = APIRouter(tags=["Pitch Correction"])

# Note frequencies (A4 = 440Hz)
NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# Scale definitions (semitones from root)
SCALES = {
    "C major": [0, 2, 4, 5, 7, 9, 11],
    "C# major": [0, 2, 4, 5, 7, 9, 11],
    "D major": [0, 2, 4, 5, 7, 9, 11],
    "D# major": [0, 2, 4, 5, 7, 9, 11],
    "E major": [0, 2, 4, 5, 7, 9, 11],
    "F major": [0, 2, 4, 5, 7, 9, 11],
    "F# major": [0, 2, 4, 5, 7, 9, 11],
    "G major": [0, 2, 4, 5, 7, 9, 11],
    "G# major": [0, 2, 4, 5, 7, 9, 11],
    "A major": [0, 2, 4, 5, 7, 9, 11],
    "A# major": [0, 2, 4, 5, 7, 9, 11],
    "B major": [0, 2, 4, 5, 7, 9, 11],
    "C minor": [0, 2, 3, 5, 7, 8, 10],
    "C# minor": [0, 2, 3, 5, 7, 8, 10],
    "D minor": [0, 2, 3, 5, 7, 8, 10],
    "D# minor": [0, 2, 3, 5, 7, 8, 10],
    "E minor": [0, 2, 3, 5, 7, 8, 10],
    "F minor": [0, 2, 3, 5, 7, 8, 10],
    "F# minor": [0, 2, 3, 5, 7, 8, 10],
    "G minor": [0, 2, 3, 5, 7, 8, 10],
    "G# minor": [0, 2, 3, 5, 7, 8, 10],
    "A minor": [0, 2, 3, 5, 7, 8, 10],
    "A# minor": [0, 2, 3, 5, 7, 8, 10],
    "B minor": [0, 2, 3, 5, 7, 8, 10],
    "C major pentatonic": [0, 2, 4, 7, 9],
    "A minor pentatonic": [0, 3, 5, 7, 10],
    "chromatic": list(range(12)),
}


def midi_to_freq(midi_note):
    """Convert MIDI note number to frequency."""
    return 440 * (2 ** ((midi_note - 69) / 12))


def freq_to_midi(freq):
    """Convert frequency to MIDI note number."""
    return 69 + 12 * np.log2(freq / 440)


def get_note_name(midi_note):
    """Get note name from MIDI note number."""
    note_idx = midi_note % 12
    octave = (midi_note // 12) - 1
    return f"{NOTE_NAMES[note_idx]}{octave}"


def get_scale_notes(root_note, scale_name):
    """Get all valid MIDI notes for a scale across octaves."""
    root_midi = NOTE_NAMES.index(root_note) + 12  # Start from octave 1
    scale_semitones = SCALES.get(scale_name, SCALES["C major"])
    
    valid_notes = set()
    for octave in range(1, 9):  # Octaves 1-8
        for semitone in scale_semitones:
            midi = root_midi + semitone + (octave - 1) * 12
            if 12 <= midi <= 108:  # Valid MIDI range
                valid_notes.add(midi)
    return valid_notes


def snap_to_scale(pitch_contour, valid_notes, correction_strength):
    """
    Snap pitch values to nearest valid note in scale.
    
    Args:
        pitch_contour: array of frequencies
        valid_notes: set of valid MIDI notes
        correction_strength: 0.0 (no correction) to 1.0 (full correction)
    
    Returns:
        corrected pitch contour
    """
    corrected = []
    for freq in pitch_contour:
        if freq is None or freq < 50 or freq > 5000:
            corrected.append(freq)
            continue
        
        current_midi = freq_to_midi(freq)
        
        # Find nearest valid note
        nearest_note = min(valid_notes, key=lambda n: abs(n - current_midi))
        target_freq = midi_to_freq(nearest_note)
        
        # Blend original and corrected based on strength
        if correction_strength >= 1.0:
            corrected.append(target_freq)
        else:
            # Linear interpolation between original and target
            blended = freq + (target_freq - freq) * correction_strength
            corrected.append(blended)
    
    return np.array(corrected)


def apply_pitch_correction(audio, sr, original_pitch, corrected_pitch, hop_length):
    """
    Apply pitch correction using phase vocoder.
    
    Args:
        audio: original audio signal
        sr: sample rate
        original_pitch: original pitch contour
        corrected_pitch: corrected pitch contour
        hop_length: hop length for STFT
    
    Returns:
        pitch-corrected audio
    """
    # Use librosa's pitch shift approach
    # Calculate semitone shifts for each frame
    n_frames = len(original_pitch)
    
    # Create a copy for processing
    corrected_audio = audio.copy()
    
    # Process in small chunks
    for i in range(n_frames):
        if original_pitch[i] is None or corrected_pitch[i] is None:
            continue
        if original_pitch[i] < 50 or original_pitch[i] > 5000:
            continue
            
        # Calculate semitone shift needed
        shift_semitones = 12 * np.log2(corrected_pitch[i] / original_pitch[i])
        
        # Skip if shift is negligible
        if abs(shift_semitones) < 0.1:
            continue
        
        # Apply pitch shift to this frame's region
        start_sample = i * hop_length
        end_sample = min(start_sample + hop_length * 4, len(audio))  # 4-frame window
        
        if end_sample <= start_sample:
            continue
            
        # Apply pitch shift using librosa
        frame = audio[start_sample:end_sample]
        if len(frame) > 0:
            shifted = librosa.effects.pitch_shift(
                frame, 
                sr=sr, 
                n_steps=shift_semitones,
                bins_per_octave=12
            )
            # Crossfade blend
            blend_start = max(0, start_sample)
            blend_end = min(len(corrected_audio), end_sample)
            corrected_audio[blend_start:blend_end] = shifted[:blend_end-blend_start]
    
    return corrected_audio


@router.post("/vocal_correct")
async def vocal_correct(
    vocal_file: UploadFile = File(..., description="Vocal audio file"),
    key_scale: str = Form("C major", description="Target scale (e.g., 'C major', 'A minor')"),
    correction_strength: float = Form(0.7, description="Correction strength 0.0-1.0"),
    preserve_formant: bool = Form(True, description="Preserve vocal formant/timbre"),
    output_format: str = Form("wav", description="Output format: wav, mp3, flac"),
):
    """
    Apply pitch correction to vocal recordings.
    
    Detects the pitch contour of the vocal and snaps notes to the specified scale.
    Useful for creating auto-tune effects or subtle pitch polishing.
    """
    tmp_files = []
    try:
        # Save uploaded file
        suffix = os.path.splitext(vocal_file.filename)[1] or ".wav"
        fd, vocal_path = tempfile.mkstemp(prefix="vocal_", suffix=suffix)
        os.close(fd)
        tmp_files.append(vocal_path)
        
        with open(vocal_path, "wb") as f:
            f.write(await vocal_file.read())
        
        # Load audio
        audio, sr = librosa.load(vocal_path, sr=None, mono=True)
        
        # Parse scale (e.g., "C major" -> root="C", scale="major")
        parts = key_scale.split()
        root_note = parts[0] if parts else "C"
        scale_type = " ".join(parts[1:]) if len(parts) > 1 else "major"
        full_scale = f"{root_note} {scale_type}"
        
        # Handle special scales
        if "pentatonic" in key_scale.lower():
            full_scale = key_scale.lower()
        elif "chromatic" in key_scale.lower():
            full_scale = "chromatic"
        
        # Get valid notes for the scale
        valid_notes = get_scale_notes(root_note, full_scale)
        
        # Detect pitch contour using PYIN
        print(f"[PitchCorrection] Detecting pitch with PYIN...")
        fmin = librosa.note_to_hz("C2")  # ~65Hz
        fmax = librosa.note_to_hz("C6")  # ~1046Hz
        
        pitches, magnitudes = librosa.pyin(
            audio,
            fmin=fmin,
            fmax=fmax,
            sr=sr,
            frame_length=2048,
            hop_length=256,
            fill_mode="constant"
        )
        
        print(f"[PitchCorrection] Detected {np.sum(~np.isnan(pitches))} voiced frames")
        
        # Convert None/NaN to None for processing
        pitch_list = [p if not np.isnan(p) else None for p in pitches]
        
        # Snap to scale
        print(f"[PitchCorrection] Snapping to {full_scale}...")
        corrected_pitches = snap_to_scale(pitch_list, valid_notes, correction_strength)
        
        # Apply correction using phase vocoder
        print(f"[PitchCorrection] Applying pitch correction (strength: {correction_strength})...")
        
        # Alternative approach: use librosa's time-stretch and pitch-shift
        # For each frame, calculate the required pitch shift
        hop_length = 256
        
        # Create corrected audio using a simpler approach
        # We'll use the original audio and apply global pitch adjustments per frame
        
        # For a more robust solution, use world or pyin-based resynthesis
        # Here we use a simplified approach with librosa.effects.pitch_shift
        
        # Generate corrected audio
        corrected_audio = apply_pitch_correction(
            audio, sr, pitch_list, corrected_pitches, hop_length
        )
        
        # Save output
        job_id = uuid.uuid4().hex
        output_format = output_format if output_format in ("mp3", "wav", "flac") else "wav"
        
        from main import OUTPUT_DIR
        out_filename = f"{job_id}_corrected.{output_format}"
        out_path = os.path.join(OUTPUT_DIR, out_filename)
        
        sf.write(out_path, corrected_audio, sr)
        
        # Calculate file size
        size_mb = os.path.getsize(out_path) / 1024 / 1024
        duration = round(len(corrected_audio) / sr, 2)
        
        # Detect some stats
        original_mean_pitch = np.nanmean([p for p in pitch_list if p is not None])
        corrected_mean_pitch = np.nanmean([p for p in corrected_pitches if p is not None and not np.isnan(p)])
        
        return JSONResponse({
            "status": "ok",
            "filename": out_filename,
            "url": f"/tracks/{out_filename}",
            "duration_sec": duration,
            "size_mb": round(size_mb, 2),
            "detected_key": f"{get_note_name(freq_to_midi(original_mean_pitch))}",
            "target_scale": full_scale,
            "correction_strength": correction_strength,
            "preserve_formant": preserve_formant,
            "sample_rate": sr,
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            {"status": "error", "error": str(e)}, 
            status_code=500
        )
    
    finally:
        for f in tmp_files:
            try:
                os.remove(f)
            except Exception:
                pass


@router.get("/pitch_scales")
async def get_pitch_scales():
    """Get list of available scales for pitch correction."""
    return JSONResponse({
        "status": "ok",
        "scales": list(SCALES.keys()),
        "note_names": NOTE_NAMES,
    })
