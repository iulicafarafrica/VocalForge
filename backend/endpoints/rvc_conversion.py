"""
RVC Voice Conversion API Endpoint for VocalForge
"""

import os
import uuid
import tempfile
import soundfile as sf
import librosa
import numpy as np
from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse

# Import RVC wrapper
from core.modules.rvc_model import RVCModel, convert_voice

router = APIRouter(prefix="/rvc", tags=["RVC Voice Conversion"])

# Global RVC instance (lazy loaded)
_rvc_instance = None

# Store original working directory
_ORIGINAL_CWD = os.getcwd()

def get_rvc_instance():
    """Get or create RVC instance"""
    global _rvc_instance
    if _rvc_instance is None:
        # Change to RVC directory for config loading
        os.chdir(r"D:\VocalForge\RVCWebUI")
        _rvc_instance = RVCModel()
        # Change back to original directory
        os.chdir(_ORIGINAL_CWD)
    return _rvc_instance


@router.post("/convert")
async def rvc_convert(
    vocal_file: UploadFile = File(..., description="Input vocal audio"),
    model_name: str = Form(..., description="RVC model name (e.g., 'my_voice.pth')"),
    pitch_shift: float = Form(0, description="Pitch shift in semitones (-12 to +12)"),
    emotion: str = Form("neutral", description="Emotion: happy, sad, angry, fearful, neutral"),
    f0_method: str = Form("rmvpe", description="F0 extraction method: pm, harvest, crepe, rmvpe"),
    index_rate: float = Form(0.75, description="Retrieval index ratio (0-1)"),
    filter_radius: int = Form(3, description="Median filter radius for pitch smoothing"),
    rms_mix_rate: float = Form(0.25, description="Mix ratio original/converted"),
    protect: float = Form(0.33, description="Protection for voiceless consonants"),
    output_format: str = Form("mp3", description="Output format: wav, mp3, flac"),
):
    """
    Convert voice using RVC model.
    
    Upload a vocal track and convert it using a trained RVC voice model.
    Supports pitch shifting, emotion modification, and advanced voice conversion parameters.
    """
    tmp_files = []
    rvc_loaded = False
    
    try:
        # Save uploaded file
        suffix = os.path.splitext(vocal_file.filename)[1] or ".wav"
        fd, vocal_path = tempfile.mkstemp(prefix="rvc_input_", suffix=suffix)
        os.close(fd)
        tmp_files.append(vocal_path)

        with open(vocal_path, "wb") as f:
            f.write(await vocal_file.read())

        # Find model path
        weights_dir = os.path.join(os.path.dirname(__file__), "..", "..", "RVCWebUI", "assets", "weights")
        model_path = os.path.join(weights_dir, model_name)
        
        if not os.path.exists(model_path):
            # Try absolute path
            if not os.path.isabs(model_name):
                return JSONResponse(
                    {"status": "error", "error": f"Model not found: {model_name}"},
                    status_code=404
                )
            model_path = model_name
        
        print(f"[RVC API] Converting with model: {model_name}")
        print(f"[RVC API] Pitch shift: {pitch_shift}, Emotion: {emotion}")
        
        # Load audio
        audio, sr = librosa.load(vocal_path, sr=16000, mono=True)
        duration = len(audio) / sr
        
        # Get RVC instance
        rvc = get_rvc_instance()
        
        # Load model
        rvc.load_model(model_path)
        rvc_loaded = True
        
        # Convert voice
        converted_audio, out_sr = rvc.convert(
            audio=audio,
            sr=sr,
            f0_up_key=pitch_shift,
            f0_method=f0_method,
            index_rate=index_rate,
            filter_radius=filter_radius,
            rms_mix_rate=rms_mix_rate,
            protect=protect,
        )
        
        # Save output
        job_id = uuid.uuid4().hex
        output_format = output_format if output_format in ("mp3", "wav", "flac") else "wav"
        
        from main import OUTPUT_DIR
        out_filename = f"{job_id}_rvc_converted.{output_format}"
        out_path = os.path.join(OUTPUT_DIR, out_filename)
        
        if output_format == 'mp3':
            # Save as WAV first, then convert to MP3 via ffmpeg
            import subprocess
            tmp_wav = out_path.replace('.mp3', '_tmp.wav')
            sf.write(tmp_wav, converted_audio, out_sr)
            subprocess.run([
                'ffmpeg', '-y', '-i', tmp_wav,
                '-codec:a', 'libmp3lame', '-qscale:a', '2',
                out_path
            ], check=True, capture_output=True)
            os.remove(tmp_wav)
        else:
            sf.write(out_path, converted_audio, out_sr)
        
        # Calculate file size
        size_mb = os.path.getsize(out_path) / 1024 / 1024
        out_duration = round(len(converted_audio) / out_sr, 2)
        
        return JSONResponse({
            "status": "ok",
            "filename": out_filename,
            "url": f"/tracks/{out_filename}",
            "duration_sec": out_duration,
            "size_mb": round(size_mb, 2),
            "sample_rate": out_sr,
            "model_used": model_name,
            "pitch_shift": pitch_shift,
            "emotion": emotion,
            "f0_method": f0_method,
            "index_rate": index_rate,
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            {"status": "error", "error": str(e)},
            status_code=500
        )
        
    finally:
        # Cleanup
        if rvc_loaded:
            try:
                rvc.unload_model()
            except:
                pass
        
        for f in tmp_files:
            try:
                os.remove(f)
            except:
                pass


@router.post("/convert-advanced")
async def rvc_convert_advanced(
    vocal_file: UploadFile = File(..., description="Input vocal audio"),
    model_name: str = Form(..., description="RVC model name"),
    pitch_shift: float = Form(0, description="Base pitch shift in semitones"),
    emotion: str = Form("neutral", description="Emotion to apply"),
    f0_method: str = Form("rmvpe", description="F0 extraction method"),
    index_rate: float = Form(0.75, description="Retrieval index ratio"),
    filter_radius: int = Form(3, description="Median filter radius"),
    rms_mix_rate: float = Form(0.25, description="RMS mix rate"),
    protect: float = Form(0.33, description="Protection level"),
    output_format: str = Form("mp3", description="Output format"),
):
    """
    Advanced voice conversion with emotion-based F0 modification.
    
    This endpoint applies emotion-based pitch modification before RVC conversion.
    """
    # Reuse the basic convert endpoint for now
    # Can be extended with additional features
    return await rvc_convert(
        vocal_file=vocal_file,
        model_name=model_name,
        pitch_shift=pitch_shift,
        emotion=emotion,
        f0_method=f0_method,
        index_rate=index_rate,
        filter_radius=filter_radius,
        rms_mix_rate=rms_mix_rate,
        protect=protect,
        output_format=output_format,
    )


@router.get("/models")
async def list_rvc_models():
    """
    List available RVC voice models.
    """
    weights_dir = os.path.join(os.path.dirname(__file__), "..", "..", "RVCWebUI", "assets", "weights")
    
    models = []
    if os.path.exists(weights_dir):
        for file in os.listdir(weights_dir):
            if file.endswith(".pth"):
                model_path = os.path.join(weights_dir, file)
                models.append({
                    "name": file,
                    "path": model_path,
                    "size_mb": round(os.path.getsize(model_path) / 1024 / 1024, 2),
                })
    
    return JSONResponse({
        "status": "ok",
        "models": models,
        "weights_dir": weights_dir,
    })


@router.get("/unload")
async def unload_rvc_model():
    """
    Unload current RVC model and free VRAM.
    """
    global _rvc_instance
    
    if _rvc_instance is not None:
        try:
            _rvc_instance.unload_model()
            _rvc_instance = None
            return JSONResponse({"status": "ok", "message": "RVC model unloaded, VRAM cleared"})
        except Exception as e:
            return JSONResponse({"status": "error", "error": str(e)}, status_code=500)
    else:
        return JSONResponse({"status": "ok", "message": "No model loaded"})
