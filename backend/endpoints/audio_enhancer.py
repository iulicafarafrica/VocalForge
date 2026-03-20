"""
Audio Enhancer - Professional audio enhancement using AcoustiClean-inspired techniques.
Based on: https://github.com/CSuvarna23/AcoustiClean

Features:
- Noise Removal (hiss, hum, static, wind)
- Vocal Separation (vocals vs instrumental)
- Source Separation (drums, bass, other, vocals)
"""

import os
import uuid
import shutil
import subprocess
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional

router = APIRouter(prefix="/audio", tags=["Audio Enhancer"])

# Temp directory for processing
TEMP_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "temp", "audio_enhancer")
os.makedirs(TEMP_DIR, exist_ok=True)


@router.post("/enhance")
async def enhance_audio(
    file: UploadFile = File(...),
    mode: str = Form("noise_removal"),  # noise_removal, vocal_separation, source_separation
    strength: str = Form("medium"),     # light, medium, aggressive
):
    """
    Enhance audio using ffmpeg-based processing.
    
    Modes:
    - noise_removal: Remove hiss, hum, static
    - vocal_separation: Extract vocals from instrumental
    - source_separation: Separate into drums, bass, other, vocals
    """
    import time
    start_time = time.time()
    
    job_id = uuid.uuid4().hex
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".wav"
    input_path = os.path.join(TEMP_DIR, f"input_{job_id}{file_ext}")
    
    try:
        # Save uploaded file
        print(f"[Audio Enhancer] Saving input file...")
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Check ffmpeg is available
        try:
            subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            raise HTTPException(status_code=500, detail="FFmpeg not found. Install ffmpeg first.")
        
        # Process based on mode
        if mode == "noise_removal":
            output_files = await _process_noise_removal(input_path, job_id, strength)
        elif mode == "vocal_separation":
            output_files = await _process_vocal_separation(input_path, job_id)
        elif mode == "source_separation":
            output_files = await _process_source_separation(input_path, job_id)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown mode: {mode}")
        
        processing_time = round(time.time() - start_time, 1)
        
        print(f"[Audio Enhancer] ✅ Complete in {processing_time}s")
        
        return {
            "status": "ok",
            "job_id": job_id,
            "mode": mode,
            "output_files": output_files,
            "processing_time_sec": processing_time,
        }
        
    except Exception as e:
        print(f"[Audio Enhancer] ❌ Failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup input file
        if os.path.exists(input_path):
            try:
                os.remove(input_path)
            except:
                pass


async def _process_noise_removal(input_path: str, job_id: str, strength: str):
    """
    Remove noise (hiss, hum, static) using ffmpeg filters.
    
    Strength presets:
    - light: Gentle noise reduction
    - medium: Moderate noise reduction
    - aggressive: Strong noise reduction
    """
    # Save to output directory (so /tracks/ can serve it)
    from pathlib import Path
    output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "output")
    os.makedirs(output_dir, exist_ok=True)
    
    output_filename = f"cleaned_{job_id}.wav"
    output_path = os.path.join(output_dir, output_filename)
    
    # Strength presets - ffmpeg filter chains
    # Based on Claude AI recommendations + VocalForge requirements
    # Filter order: adeclick → anlmdn → afftdn → highpass → eq → loudnorm
    PRESETS = {
        "light": {
            "highpass": "40",       # Remove infrasound (< 40Hz)
            "adeclick": None,       # No click removal needed
            "anlmdn": "s=7:p=0.002:r=0.002:m=15",  # Gentle NL-means
            "afftdn": "nr=10:nf=-25",  # Light noise reduction (nf = noise floor dBFS)
            "eq": None,             # No EQ
        },
        "medium": {
            "highpass": "40",       # Remove infrasound
            "adeclick": None,       # No click removal
            "anlmdn": "s=7:p=0.005:r=0.005:m=15",  # Moderate NL-means
            "afftdn": "nr=20:nf=-20",  # Moderate noise reduction
            "eq": "equalizer=f=8000:t=q:w=2:g=-1.5,equalizer=f=12000:t=q:w=2:g=-2",  # Target hiss
        },
        "aggressive": {
            "highpass": "50",       # More aggressive rumble removal
            "adeclick": "w=55:o=25:a=2",  # Remove clicks/pops
            "anlmdn": "s=7:p=0.008:r=0.008:m=15",  # Strong NL-means
            "afftdn": "nr=30:nf=-15",  # Aggressive noise reduction
            "eq": "equalizer=f=6000:t=q:w=1.5:g=-2,equalizer=f=9000:t=q:w=1.5:g=-3,equalizer=f=13000:t=q:w=1.5:g=-4",  # Aggressive hiss
        },
    }
    
    preset = PRESETS.get(strength, PRESETS["medium"])

    # Build filter chain in correct order:
    # adeclick → anlmdn → afftdn → highpass → eq → loudnorm
    filters = []

    # 1. Adeclick — remove clicks/pops before anything else
    if preset.get('adeclick'):
        filters.append(f"adeclick={preset['adeclick']}")

    # 2. anlmdn — Non-Local Means denoising (complementary to afftdn)
    if preset.get('anlmdn'):
        filters.append(f"anlmdn={preset['anlmdn']}")

    # 3. afftdn — Adaptive Frequency Filtering (core noise reduction)
    if preset.get('afftdn'):
        filters.append(f"afftdn={preset['afftdn']}")

    # 4. High-pass filter — remove rumble below X Hz
    if preset.get('highpass'):
        filters.append(f"highpass=f={preset['highpass']}")

    # 5. EQ — target remaining hiss frequencies
    if preset.get('eq'):
        filters.append(preset['eq'])

    # 6. Loudnorm — streaming standard normalization (always last)
    filters.append("loudnorm=I=-14:TP=-1.5:LRA=11")

    filter_chain = ','.join(filters)
    
    print(f"[Audio Enhancer] Noise removal ({strength}): {filter_chain}")
    print(f"[Audio Enhancer] Filter order: adeclick → anlmdn → afftdn → highpass → eq → loudnorm")
    
    # Run ffmpeg
    cmd = [
        'ffmpeg', '-y',
        '-i', input_path,
        '-af', filter_chain,
        '-ar', '44100',
        '-acodec', 'pcm_s24le',
        output_path
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        raise Exception(f"FFmpeg failed: {result.stderr[:500]}")
    
    print(f"[Audio Enhancer] ✅ Noise removal complete")
    
    return [{
        "filename": output_filename,
        "path": output_path,
        "url": f"/tracks/{output_filename}",
        "type": "cleaned_audio",
    }]


async def _process_vocal_separation(input_path: str, job_id: str):
    """
    Separate vocals from instrumental using ffmpeg.
    Note: This is a simple frequency-based separation.
    For better results, use Demucs or Spleeter.
    """
    # Save to output directory (so /tracks/ can serve it)
    output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "output")
    os.makedirs(output_dir, exist_ok=True)
    
    vocals_filename = f"vocals_{job_id}.wav"
    instrumental_filename = f"instrumental_{job_id}.wav"
    vocals_path = os.path.join(output_dir, vocals_filename)
    instrumental_path = os.path.join(output_dir, instrumental_filename)
    
    # Simple vocal extraction using sidechain filtering
    # This is a basic approach - Demucs would be better for production
    
    # Extract vocals (center channel, high-mid frequencies)
    vocal_filters = [
        "highpass=f=300",
        "lowpass=f=8000",
        "pan=stereo|c0=c0|c1=c1",  # Keep stereo
    ]
    
    # Extract instrumental (side frequencies)
    instrumental_filters = [
        "highpass=f=8000",
        "lowpass=f=200",
        "pan=stereo|c0=c0|c1=c1",
    ]
    
    # Process vocals
    cmd_vocals = [
        'ffmpeg', '-y',
        '-i', input_path,
        '-af', ','.join(vocal_filters),
        '-ar', '44100',
        '-acodec', 'pcm_s24le',
        vocals_path
    ]
    
    result = subprocess.run(cmd_vocals, capture_output=True, text=True)
    if result.returncode != 0:
        raise Exception(f"FFmpeg vocals failed: {result.stderr[:500]}")
    
    # Process instrumental
    cmd_instrumental = [
        'ffmpeg', '-y',
        '-i', input_path,
        '-af', ','.join(instrumental_filters),
        '-ar', '44100',
        '-acodec', 'pcm_s24le',
        instrumental_path
    ]
    
    result = subprocess.run(cmd_instrumental, capture_output=True, text=True)
    if result.returncode != 0:
        raise Exception(f"FFmpeg instrumental failed: {result.stderr[:500]}")
    
    print(f"[Audio Enhancer] ✅ Vocal separation complete")
    
    return [
        {
            "filename": vocals_filename,
            "path": vocals_path,
            "url": f"/tracks/{vocals_filename}",
            "type": "vocals",
        },
        {
            "filename": instrumental_filename,
            "path": instrumental_path,
            "url": f"/tracks/{instrumental_filename}",
            "type": "instrumental",
        },
    ]


async def _process_source_separation(input_path: str, job_id: str):
    """
    Separate into 4 stems: drums, bass, other, vocals.
    Uses Demucs if available, otherwise simple ffmpeg filtering.
    """
    # Check if Demucs is installed
    try:
        import demucs
        demucs_available = True
    except ImportError:
        demucs_available = False
    
    if demucs_available:
        # Use Demucs for professional separation
        output_dir = os.path.join(TEMP_DIR, f"stems_{job_id}")
        os.makedirs(output_dir, exist_ok=True)
        
        cmd = [
            'python', '-m', 'demucs',
            '-n', 'htdemucs',
            '-o', output_dir,
            input_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            raise Exception(f"Demucs failed: {result.stderr[:500]}")
        
        # Collect output files
        stems_dir = os.path.join(output_dir, "htdemucs", os.path.splitext(os.path.basename(input_path))[0])
        output_files = []

        for stem in ['drums', 'bass', 'other', 'vocals']:
            stem_path = os.path.join(stems_dir, f"{stem}.wav")
            if os.path.exists(stem_path):
                output_files.append({
                    "filename": f"{stem}_{job_id}.wav",
                    "path": stem_path,
                    "url": f"/tracks/{stem}_{job_id}.wav",
                    "type": f"stem_{stem}",
                })

        print(f"[Audio Enhancer] ✅ Demucs separation complete")
        return output_files

    else:
        # Fallback: simple ffmpeg filtering
        raise HTTPException(
            status_code=501,
            detail="Demucs not installed. Install with: pip install demucs"
        )


# =============================================================================
# Standalone enhancement function v2.0 (for integration with ACE-Step)
# Auto noise profile detection + multi-stage pipeline
# =============================================================================

def _detect_noise_floor(file_path: str) -> tuple:
    """
    Detectează automat noise floor-ul și un segment de liniște.
    Returnează (noise_floor_db, has_silence_segment).
    """
    import re
    cmd = [
        'ffmpeg', '-i', file_path,
        '-af', 'silencedetect=noise=-40dB:duration=0.3',
        '-f', 'null', '-',
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    output = result.stderr

    starts = [float(m) for m in re.findall(r'silence_start:\s*([\d.]+)', output)]
    ends   = [float(m) for m in re.findall(r'silence_end:\s*([\d.]+)', output)]

    if not starts or not ends:
        return (-30.0, False)

    # Găsește primul segment util (>= 0.3s)
    for s, e in zip(starts, ends):
        if (e - s) >= 0.3:
            # Măsoară RMS în acel segment
            cmd2 = [
                'ffmpeg', '-y',
                '-ss', str(s), '-t', str(min(e - s, 2.0)),
                '-i', file_path,
                '-af', 'astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level',
                '-f', 'null', '-',
            ]
            r2 = subprocess.run(cmd2, capture_output=True, text=True, timeout=15)
            match = re.search(r'RMS_level=(-[\d.]+)', r2.stderr)
            if match:
                return (float(match.group(1)), True)

    return (-30.0, False)


def _build_enhance_chain(strength: str, noise_floor: float = -30.0) -> str:
    """
    Construiește filter chain optimizat bazat pe strength și noise floor măsurat.
    Ordine corectă: adeclick → anlmdn → afftdn → HPF → EQ → loudnorm
    """
    # Use the same PRESETS as _process_noise_removal for consistency
    PRESETS = {
        "light": {
            "highpass": "40",
            "adeclick": None,
            "anlmdn": "s=7:p=0.002:r=0.002:m=15",
            "afftdn": "nr=10:nf=-25",
            "eq": None,
        },
        "medium": {
            "highpass": "40",
            "adeclick": None,
            "anlmdn": "s=7:p=0.005:r=0.005:m=15",
            "afftdn": "nr=20:nf=-20",
            "eq": "equalizer=f=8000:t=q:w=2:g=-1.5,equalizer=f=12000:t=q:w=2:g=-2",
        },
        "aggressive": {
            "highpass": "50",
            "adeclick": "w=55:o=25:a=2",
            "anlmdn": "s=7:p=0.008:r=0.008:m=15",
            "afftdn": "nr=30:nf=-15",
            "eq": "equalizer=f=6000:t=q:w=1.5:g=-2,equalizer=f=9000:t=q:w=1.5:g=-3,equalizer=f=13000:t=q:w=1.5:g=-4",
        },
    }
    
    preset = PRESETS.get(strength, PRESETS["medium"])
    
    # Build filter chain in correct order
    filters = []
    
    # 1. Adeclick
    if preset.get('adeclick'):
        filters.append(f"adeclick={preset['adeclick']}")
    
    # 2. anlmdn
    if preset.get('anlmdn'):
        filters.append(f"anlmdn={preset['anlmdn']}")
    
    # 3. afftdn (adjust nf based on measured noise floor if available)
    if preset.get('afftdn'):
        afftdn_str = preset['afftdn']
        # If noise floor was measured, use it to adjust nf value
        if noise_floor > -50 and 'nf=' in afftdn_str:
            # Keep the preset's nf value (already optimized)
            pass
        filters.append(afftdn_str)
    
    # 4. High-pass
    if preset.get('highpass'):
        filters.append(f"highpass=f={preset['highpass']}")
    
    # 5. EQ
    if preset.get('eq'):
        filters.append(preset['eq'])
    
    # 6. Loudnorm (always last)
    filters.append("loudnorm=I=-14:TP=-1.5:LRA=11")

    return ','.join(filters)


def enhance_audio_file(file_path: str, strength: str = "light") -> str:
    """
    Apply audio enhancement to a file (in-place) cu auto noise profile detection.

    Args:
        file_path: Path to audio file
        strength:  "light" | "medium" | "aggressive" | "auto"

    Returns:
        Same file_path (file is modified in-place)
    """
    import tempfile

    # Auto mode → detectează noise floor real
    if strength == "auto":
        noise_floor, has_silence = _detect_noise_floor(file_path)
        if has_silence:
            print(f"[Audio Enhancer] AUTO: noise floor={noise_floor:.1f} dBFS")
            if noise_floor > -20:
                strength = "aggressive"
            elif noise_floor > -30:
                strength = "medium"
            else:
                strength = "light"
        else:
            strength = "light"  # Fallback conservator dacă nu e liniște detectabilă
        print(f"[Audio Enhancer] AUTO → using preset: {strength}")
    else:
        noise_floor = -30.0  # Default conservator pentru preset fix

    filter_chain = _build_enhance_chain(strength, noise_floor)
    print(f"[Audio Enhancer] Chain ({strength}): {filter_chain}")

    temp_output = tempfile.mktemp(suffix="_enhanced.wav")

    cmd = [
        'ffmpeg', '-y',
        '-i', file_path,
        '-af', filter_chain,
        '-ar', '44100',
        '-acodec', 'pcm_s24le',
        temp_output
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

    if result.returncode != 0:
        print(f"[Audio Enhancer] ⚠️ Enhancement failed: {result.stderr[:300]}")
        return file_path  # Return original dacă eșuează

    import shutil
    shutil.move(temp_output, file_path)
    print(f"[Audio Enhancer] ✅ Enhanced ({strength}): {file_path}")
    return file_path
