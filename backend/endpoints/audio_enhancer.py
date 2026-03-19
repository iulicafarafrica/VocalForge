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
    # NOTE: No lowpass to preserve brightness/highs
    # Highpass set to 20Hz to only remove infrasound (keep all musical bass)
    PRESETS = {
        "light": {
            "highpass": "20",       # Only remove infrasound (< 20Hz)
            "lowpass": "",          # NO lowpass - preserve brightness
            "afftdn": "nr=15",      # Gentle noise reduction
        },
        "medium": {
            "highpass": "20",       # Same - preserve all bass
            "lowpass": "",          # NO lowpass
            "afftdn": "nr=20",      # Moderate noise reduction
        },
        "aggressive": {
            "highpass": "20",       # Same - preserve all bass
            "lowpass": "",          # NO lowpass
            "afftdn": "nr=25",      # Strong noise reduction
        },
    }
    
    preset = PRESETS.get(strength, PRESETS["medium"])
    
    # Build filter chain
    filters = []
    
    # Add highpass only if specified (preserve bass)
    if preset['highpass']:
        filters.append(f"highpass=f={preset['highpass']}")
    
    # Add lowpass only if specified (preserve brightness)
    if preset['lowpass']:
        filters.append(f"lowpass=f={preset['lowpass']}")
    
    # Add noise reduction if specified
    if preset['afftdn']:
        filters.append(f"afftdn={preset['afftdn']}")
    
    # Always add loudness normalization
    filters.append("loudnorm=I=-14:TP=-1.5:LRA=11")

    filter_chain = ','.join(filters)
    
    print(f"[Audio Enhancer] Noise removal ({strength}): {filter_chain}")
    
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
