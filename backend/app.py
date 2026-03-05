"""
VocalForge Backend API - Voice Conversion Pipeline
Combines pitch correction, RVC voice conversion, and emotion processing
"""

from fastapi import FastAPI, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import librosa
import soundfile as sf
import numpy as np
from io import BytesIO
import os
import sys
import uuid
import tempfile
import traceback

# Add paths
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)

# Add RVCWebUI to path
RVC_DIR = r"D:\VocalForge\RVCWebUI"
INFER_DIR = os.path.join(RVC_DIR, "infer")

for path in [PROJECT_ROOT, RVC_DIR, INFER_DIR]:
    if path not in sys.path:
        sys.path.insert(0, path)

print(f"[App] PROJECT_ROOT: {PROJECT_ROOT}")
print(f"[App] RVC_DIR: {RVC_DIR}")

# Import audio processing modules (with error handling)
try:
    from core.modules.rvc_model import RVCModel, extract_timbre_embedding, modify_f0_for_emotion, convert_voice
    RVC_AVAILABLE = True
    print("[App] OK - RVC modules loaded successfully")
except Exception as e:
    RVC_AVAILABLE = False
    print(f"[App] ERR - RVC modules not available: {e}")
    traceback.print_exc()

app = FastAPI(title="VocalForge Voice Conversion API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global RVC instance (lazy loaded)
_rvc_instance = None


def get_rvc():
    """Get or create RVC instance"""
    global _rvc_instance
    if not RVC_AVAILABLE:
        raise RuntimeError("RVC modules not available. Check startup logs for errors.")
    if _rvc_instance is None:
        _rvc_instance = RVCModel(device="cuda")
    return _rvc_instance


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "VocalForge Voice Conversion",
        "rvc_available": RVC_AVAILABLE
    }


@app.post("/convert_voice/")
async def convert_voice_endpoint(
    file: UploadFile,
    model_name: str = Form(..., description="RVC model name (.pth file)"),
    pitch_shift: float = Form(0, description="Pitch shift in semitones"),
    normalize_pitch_flag: bool = Form(True, description="Normalize pitch to target F0"),
    target_gender: str = Form("female", description="Target gender: male, female"),
    emotion: str = Form("neutral", description="Emotion: happy, sad, angry, fearful, neutral, calm"),
    f0_method: str = Form("rmvpe", description="F0 extraction method"),
    output_format: str = Form("wav", description="Output format: wav, mp3"),
):
    """
    Complete voice conversion pipeline:
    1. Trim silence
    2. Normalize audio
    3. Extract and modify F0 based on emotion
    4. Apply pitch shift based on target gender
    5. Convert voice using RVC
    6. Normalize output

    Returns converted audio file
    """
    if not RVC_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="RVC service not available. Check backend logs for details."
        )

    tmp_files = []
    
    try:
        # Read uploaded file
        file_content = await file.read()
        audio_bytes = BytesIO(file_content)
        
        # Load audio
        audio, sr = librosa.load(audio_bytes, sr=16000, mono=True)
        original_duration = len(audio) / sr
        
        print(f"[VoiceConversion] Loaded: {len(audio)} samples, {original_duration:.2f}s @ {sr}Hz")
        
        # Step 1: Trim silence
        from audio.vad import trim_silence
        audio = trim_silence(audio)
        print(f"[VoiceConversion] After trim: {len(audio)} samples")
        
        # Step 2: Normalize audio
        from audio.normalize import normalize_audio
        audio = normalize_audio(audio)
        print(f"[VoiceConversion] Audio normalized")
        
        # Step 3: Extract F0 and apply emotion
        from audio.pitch_gpu import PitchGPU
        pitch = PitchGPU(sr)
        
        if normalize_pitch_flag:
            print(f"[VoiceConversion] Normalizing pitch...")
            audio = pitch.normalize_pitch(audio, target_f0=160)  # Target F0 160Hz
        
        # Extract F0 for emotion modification
        f0 = pitch.extract_f0(audio)
        f0_modified = modify_f0_for_emotion(f0, emotion)
        
        # Calculate effective pitch shift from emotion
        base_f0 = np.mean(f0[f0 > 0]) if np.any(f0 > 0) else 200
        modified_f0 = np.mean(f0_modified[f0_modified > 0]) if np.any(f0_modified > 0) else base_f0
        emotion_pitch_shift = 12 * np.log2(modified_f0 / base_f0)
        
        # Apply gender-based pitch shift
        gender_shift = 0
        if target_gender.lower() == "female":
            gender_shift = pitch_shift + 5  # Higher for female
        elif target_gender.lower() == "male":
            gender_shift = pitch_shift - 5  # Lower for male
        else:
            gender_shift = pitch_shift
        
        total_pitch_shift = gender_shift + emotion_pitch_shift
        print(f"[VoiceConversion] Total pitch shift: {total_pitch_shift:+.2f} semitones")
        print(f"[VoiceConversion]   - Base: {pitch_shift}")
        print(f"[VoiceConversion]   - Gender: {gender_shift}")
        print(f"[VoiceConversion]   - Emotion ({emotion}): {emotion_pitch_shift:+.2f}")
        
        if total_pitch_shift != 0:
            audio = pitch.pitch_shift(audio, semitones=total_pitch_shift)
        
        # Step 4: Convert voice using RVC
        print(f"[VoiceConversion] Loading RVC model: {model_name}")
        rvc = get_rvc()
        
        # Find model path
        weights_dir = os.path.join(PROJECT_ROOT, "RVCWebUI", "assets", "weights")
        model_path = os.path.join(weights_dir, model_name)
        
        if not os.path.exists(model_path):
            raise HTTPException(status_code=404, detail=f"Model not found: {model_name}")
        
        rvc.load_model(model_path)
        
        print(f"[VoiceConversion] Converting voice...")
        audio_out, out_sr = rvc.convert(
            audio=audio,
            sr=sr,
            f0_up_key=0,  # Already applied pitch shift
            f0_method=f0_method,
            index_rate=0.75,
            filter_radius=3,
            rms_mix_rate=0.25,
            protect=0.33,
        )
        
        # Step 5: Normalize output
        audio_out = normalize_audio(audio_out)
        
        # Save output
        job_id = uuid.uuid4().hex
        output_format = output_format if output_format in ("mp3", "wav", "flac") else "wav"
        
        # Use main OUTPUT_DIR
        output_dir = os.path.join(PROJECT_ROOT, "backend", "output")
        os.makedirs(output_dir, exist_ok=True)
        
        out_filename = f"{job_id}_voice_converted.{output_format}"
        out_path = os.path.join(output_dir, out_filename)
        
        sf.write(out_path, audio_out, out_sr)
        
        # Calculate stats
        size_mb = os.path.getsize(out_path) / 1024 / 1024
        duration = round(len(audio_out) / out_sr, 2)
        
        # Unload RVC model
        rvc.unload_model()
        
        return JSONResponse({
            "status": "ok",
            "filename": out_filename,
            "url": f"/tracks/{out_filename}",
            "duration_sec": duration,
            "size_mb": round(size_mb, 2),
            "sample_rate": out_sr,
            "model_used": model_name,
            "pitch_shift": total_pitch_shift,
            "emotion": emotion,
            "target_gender": target_gender,
        })
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup temp files
        for f in tmp_files:
            try:
                os.remove(f)
            except:
                pass


@app.get("/models")
async def list_models():
    """List available RVC models"""
    weights_dir = os.path.join(PROJECT_ROOT, "RVCWebUI", "assets", "weights")
    
    models = []
    if os.path.exists(weights_dir):
        for file in os.listdir(weights_dir):
            if file.endswith(".pth"):
                models.append({
                    "name": file,
                    "size_mb": round(os.path.getsize(os.path.join(weights_dir, file)) / 1024 / 1024, 2),
                })
    
    return {"status": "ok", "models": models}


@app.get("/unload")
async def unload_model():
    """Unload RVC model and free VRAM"""
    global _rvc_instance
    
    if _rvc_instance is not None:
        try:
            _rvc_instance.unload_model()
            _rvc_instance = None
            return {"status": "ok", "message": "Model unloaded, VRAM cleared"}
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    return {"status": "ok", "message": "No model loaded"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
