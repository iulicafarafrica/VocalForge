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
import subprocess
import json

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


# ── Vocal Separation ──────────────────────────────────────────────────────────
@router.post("/separate")
async def separate_vocals(
    audio_file: UploadFile = File(..., description="Full song (vocals + instrumental)"),
    model: str = Form("bs_roformer", description="Separation model: bs_roformer"),
):
    """
    Separate vocals from instrumental using BS-RoFormer (audio-separator).
    Optimized for RTX 3070 (8GB VRAM).
    Returns URLs for vocal track and instrumental track.
    """
    tmp_files = []
    try:
        from main import OUTPUT_DIR
        suffix = os.path.splitext(audio_file.filename)[1] or ".wav"
        fd, input_path = tempfile.mkstemp(prefix="sep_input_", suffix=suffix)
        os.close(fd)
        tmp_files.append(input_path)

        with open(input_path, "wb") as f:
            f.write(await audio_file.read())

        job_id = uuid.uuid4().hex
        out_dir = os.path.join(OUTPUT_DIR, f"sep_{job_id}")
        os.makedirs(out_dir, exist_ok=True)

        # BS-RoFormer with audio-separator (optimized for RTX 3070)
        print(f"[RVC API] Separating vocals with BS-RoFormer (audio-separator)...")
        print(f"[RVC API] RTX 3070 optimizations: segment=256, fp16, batch_size=1")
        
        from audio_separator import Separator
        
        # Initialize separator with RTX 3070 optimizations
        separator = Separator(
            output_dir=out_dir,
            output_format="WAV",
            segment_size=256,      # reduce VRAM usage
            batch_size=1,          # stability
            precision="float16",   # fp16 for less VRAM
        )
        
        # Load BS-RoFormer model
        separator.load_model(model_name="model_bs_roformer_ep_317_sdr_12.9755")
        
        # Separate vocals
        output = separator.separate(input_path)
        
        # Find output files
        vocals_path = None
        instrumental_path = None
        for out_file in output:
            out_path = os.path.join(out_dir, out_file)
            if "vocals" in out_file.lower():
                vocals_path = out_path
            elif "instrumental" in out_file.lower() or "instruments" in out_file.lower():
                instrumental_path = out_path

        if not vocals_path:
            raise RuntimeError("Demucs did not produce vocal output")

        # Convert to mp3
        def to_mp3(wav_path, label):
            mp3_name = f"{job_id}_{label}.mp3"
            mp3_path = os.path.join(OUTPUT_DIR, mp3_name)
            subprocess.run([
                "ffmpeg", "-y", "-i", wav_path,
                "-codec:a", "libmp3lame", "-qscale:a", "2", mp3_path
            ], check=True, capture_output=True)
            return mp3_name, mp3_path

        vocals_filename, _ = to_mp3(vocals_path, "vocals")
        instrumental_filename = None
        if instrumental_path:
            instrumental_filename, _ = to_mp3(instrumental_path, "instrumental")

        return JSONResponse({
            "status": "ok",
            "job_id": job_id,
            "vocals_url": f"/audio/{vocals_filename}",
            "vocals_filename": vocals_filename,
            "instrumental_url": f"/audio/{instrumental_filename}" if instrumental_filename else None,
            "instrumental_filename": instrumental_filename,
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse({"status": "error", "error": str(e)}, status_code=500)
    finally:
        for f in tmp_files:
            try: os.remove(f)
            except: pass


# ── Mix Vocals + Instrumental ─────────────────────────────────────────────────
@router.post("/mix")
async def mix_vocals_instrumental(
    vocals_file: UploadFile = File(..., description="Converted vocals"),
    instrumental_file: UploadFile = File(..., description="Instrumental track"),
    vocals_volume: float = Form(1.0, description="Vocals volume multiplier (0.5-2.0)"),
    instrumental_volume: float = Form(1.0, description="Instrumental volume multiplier (0.5-2.0)"),
):
    """
    Mix converted vocals back over instrumental track.
    """
    tmp_files = []
    try:
        from main import OUTPUT_DIR

        fd1, voc_path = tempfile.mkstemp(prefix="mix_voc_", suffix=".wav")
        os.close(fd1)
        tmp_files.append(voc_path)
        with open(voc_path, "wb") as f:
            f.write(await vocals_file.read())

        fd2, inst_path = tempfile.mkstemp(prefix="mix_inst_", suffix=".wav")
        os.close(fd2)
        tmp_files.append(inst_path)
        with open(inst_path, "wb") as f:
            f.write(await instrumental_file.read())

        # Load both tracks
        vocals, sr_v = librosa.load(voc_path, sr=None, mono=True)
        instrumental, sr_i = librosa.load(inst_path, sr=None, mono=True)

        # Resample instrumental to match vocals sr
        if sr_i != sr_v:
            instrumental = librosa.resample(instrumental, orig_sr=sr_i, target_sr=sr_v)

        # Match lengths
        target_len = max(len(vocals), len(instrumental))
        vocals = np.pad(vocals, (0, max(0, target_len - len(vocals))))
        instrumental = np.pad(instrumental, (0, max(0, target_len - len(instrumental))))

        # Mix with volume control
        mixed = (vocals * vocals_volume) + (instrumental * instrumental_volume)

        # Normalize to prevent clipping
        max_val = np.abs(mixed).max()
        if max_val > 0.95:
            mixed = mixed * (0.95 / max_val)

        # Save as mp3
        job_id = uuid.uuid4().hex
        tmp_wav = os.path.join(OUTPUT_DIR, f"{job_id}_mixed_tmp.wav")
        out_filename = f"{job_id}_mixed_final.mp3"
        out_path = os.path.join(OUTPUT_DIR, out_filename)

        sf.write(tmp_wav, mixed, sr_v)
        subprocess.run([
            "ffmpeg", "-y", "-i", tmp_wav,
            "-codec:a", "libmp3lame", "-qscale:a", "2", out_path
        ], check=True, capture_output=True)
        os.remove(tmp_wav)

        duration = round(len(mixed) / sr_v, 2)
        size_mb = round(os.path.getsize(out_path) / 1024 / 1024, 2)

        return JSONResponse({
            "status": "ok",
            "filename": out_filename,
            "url": f"/audio/{out_filename}",
            "duration_sec": duration,
            "size_mb": size_mb,
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse({"status": "error", "error": str(e)}, status_code=500)
    finally:
        for f in tmp_files:
            try: os.remove(f)
            except: pass


# ── Presets ───────────────────────────────────────────────────────────────────
PRESETS_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "presets_rvc.json")

def load_presets():
    if os.path.exists(PRESETS_FILE):
        with open(PRESETS_FILE, "r") as f:
            return json.load(f)
    return {}

def save_presets(presets):
    with open(PRESETS_FILE, "w") as f:
        json.dump(presets, f, indent=2)

@router.get("/presets")
async def get_presets():
    return JSONResponse({"status": "ok", "presets": load_presets()})

@router.post("/presets/save")
async def save_preset(
    name: str = Form(..., description="Preset name"),
    model_name: str = Form(""),
    pitch_shift: float = Form(0),
    emotion: str = Form("neutral"),
    f0_method: str = Form("rmvpe"),
    index_rate: float = Form(0.75),
    filter_radius: int = Form(3),
    rms_mix_rate: float = Form(0.25),
    protect: float = Form(0.33),
    dry_wet: float = Form(1.0),
    formant_shift: float = Form(0.0),
    auto_tune: bool = Form(False),
):
    presets = load_presets()
    presets[name] = {
        "model_name": model_name,
        "pitch_shift": pitch_shift,
        "emotion": emotion,
        "f0_method": f0_method,
        "index_rate": index_rate,
        "filter_radius": filter_radius,
        "rms_mix_rate": rms_mix_rate,
        "protect": protect,
        "dry_wet": dry_wet,
        "formant_shift": formant_shift,
        "auto_tune": auto_tune,
    }
    save_presets(presets)
    return JSONResponse({"status": "ok", "message": f"Preset '{name}' saved", "presets": presets})

@router.delete("/presets/{name}")
async def delete_preset(name: str):
    presets = load_presets()
    if name in presets:
        del presets[name]
        save_presets(presets)
        return JSONResponse({"status": "ok", "message": f"Preset '{name}' deleted"})
    return JSONResponse({"status": "error", "error": "Preset not found"}, status_code=404)


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
    dry_wet: float = Form(1.0, description="Dry/Wet mix: 0.0=original, 1.0=converted"),
    formant_shift: float = Form(0.0, description="Formant shift in semitones (-6 to +6)"),
    auto_tune: bool = Form(False, description="Apply auto-tune pitch correction"),
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
            dry_wet=dry_wet,
            formant_shift=formant_shift,
            auto_tune=auto_tune,
        )
        
        # Save output
        job_id = uuid.uuid4().hex
        output_format = "mp3"  # Force MP3 output
        
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
            "url": f"/audio/{out_filename}",
            "duration_sec": out_duration,
            "size_mb": round(size_mb, 2),
            "sample_rate": out_sr,
            "model_used": model_name,
            "pitch_shift": pitch_shift,
            "emotion": emotion,
            "f0_method": f0_method,
            "index_rate": index_rate,
            "dry_wet": dry_wet,
            "formant_shift": formant_shift,
            "auto_tune": auto_tune,
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
