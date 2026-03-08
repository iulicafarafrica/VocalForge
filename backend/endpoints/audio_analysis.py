#!/usr/bin/env python3
"""
Audio Analysis API Endpoints
Part of VocalForge v1.9.1 - Audio Understanding Engine
"""

import os
import sys
import uuid
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
import shutil

# Add project root to path for core module imports
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), '..'))

from core.modules.audio_analysis import analyze_audio

router = APIRouter(prefix="/audio", tags=["Audio Analysis"])

TEMP_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "temp")
os.makedirs(TEMP_DIR, exist_ok=True)


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


@router.post("/bpm")
async def detect_bpm_endpoint(file: UploadFile = File(...)):
    """Detect BPM from audio file."""
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".wav"
    temp_path = os.path.join(TEMP_DIR, f"audio_{file_id}{file_ext}")
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        from core.modules.audio_analysis import detect_bpm
        import librosa
        
        y, sr = librosa.load(temp_path, sr=None)
        bpm, confidence = detect_bpm(y, sr)
        
        return {"status": "success", "bpm": bpm, "confidence": confidence, "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"BPM detection failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/key")
async def detect_key_endpoint(file: UploadFile = File(...)):
    """Detect musical key from audio file."""
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".wav"
    temp_path = os.path.join(TEMP_DIR, f"audio_{file_id}{file_ext}")
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        from core.modules.audio_analysis import detect_key
        import librosa
        
        y, sr = librosa.load(temp_path, sr=None)
        key, mode, confidence = detect_key(y, sr)
        
        return {"status": "success", "key": key, "mode": mode, "confidence": confidence, "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Key detection failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/chords")
async def detect_chords_endpoint(file: UploadFile = File(...), segment_seconds: float = Form(3.0)):
    """Detect chord progression in audio file."""
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".wav"
    temp_path = os.path.join(TEMP_DIR, f"audio_{file_id}{file_ext}")
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        from core.modules.audio_analysis import detect_chords
        import librosa
        
        y, sr = librosa.load(temp_path, sr=None)
        chords = detect_chords(y, sr, segment_seconds=segment_seconds)
        
        return {
            "status": "success",
            "chords": chords,
            "unique_chords": list(set([c['chord'] for c in chords])),
            "progression": [c['chord'] for c in chords],
            "filename": file.filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chord detection failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/time-signature")
async def detect_time_signature_endpoint(file: UploadFile = File(...)):
    """Detect time signature from audio file."""
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".wav"
    temp_path = os.path.join(TEMP_DIR, f"audio_{file_id}{file_ext}")
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        from core.modules.audio_analysis import detect_time_signature
        import librosa
        
        y, sr = librosa.load(temp_path, sr=None)
        time_sig, confidence = detect_time_signature(y, sr)
        
        return {"status": "success", "time_signature": time_sig, "confidence": confidence, "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Time signature detection failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.get("/info")
async def audio_analysis_info():
    """Get information about audio analysis capabilities."""
    return {
        "status": "ok",
        "capabilities": {
            "bpm_detection": {"description": "Detect beats per minute", "endpoint": "POST /audio/bpm"},
            "key_detection": {"description": "Detect musical key", "endpoint": "POST /audio/key"},
            "chord_detection": {"description": "Detect chord progression", "endpoint": "POST /audio/chords"},
            "time_signature": {"description": "Detect time signature", "endpoint": "POST /audio/time-signature"},
            "full_analysis": {"description": "Run all analyses at once", "endpoint": "POST /audio/analyze", "recommended": True}
        }
    }
