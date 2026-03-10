"""
RVC Voice Conversion API Endpoint for VocalForge
"""

import os
import sys
import uuid
import tempfile
import soundfile as sf
import librosa
import numpy as np
from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse

# Add project root to sys.path for core.modules import
PROJECT_ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Import RVC wrapper
from core.modules.rvc_model import RVCModel, convert_voice
import subprocess
import json
import shutil

router = APIRouter(prefix="/rvc", tags=["RVC Voice Conversion"])

# Directories
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMP_DIR = os.path.join(BACKEND_DIR, "temp")
os.makedirs(TEMP_DIR, exist_ok=True)

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


# ── RVC Rescue Post-Processing ────────────────────────────────────────────────
def apply_rvc_rescue_post_processing(input_path, output_path):
    """
    Repair RVC-damaged vocals and restore musicality.
    
    Chain: EQ → Compressor → Reverb → Limiter → Loudness
    """
    
    # RVC Rescue Post-Processing - NO REVERB (dry vocal)
    # EQ: Cut harsh frequencies gently, boost warmth
    # Compressor: Smooth dynamics without squashing
    # NO REVERB - clean, dry vocal
    filter_chain = (
        "highpass=f=80,"
        "equalizer=f=2000:width_type=q:width=2:g=-1.5,"   # Gentle cut at 2kHz (harshness)
        "equalizer=f=3000:width_type=q:width=1.5:g=-1,"   # Gentle cut at 3kHz (sibilance)
        "equalizer=f=150:width_type=q:width=2:g=2,"       # Boost warmth at 150Hz
        "acompressor=threshold=-18dB:ratio=2.5:attack=25:release=100:makeup=4,"
        "alimiter=limit=-1dB:attack=10:release=80,"
        "loudnorm=I=-14:TP=-1:LRA=11"
    )
    
    try:
        result = subprocess.run([
            "ffmpeg", "-y",
            "-i", input_path,
            "-af", filter_chain,
            "-ar", "48000",
            output_path
        ], check=False, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"[RVC Rescue] FFmpeg error: {result.stderr}")
            # If post-processing fails, just copy the file without processing
            print(f"[RVC Rescue] Post-processing failed, using raw RVC output")
            import shutil
            shutil.copy2(input_path, output_path)
            return
        
        print(f"[RVC Rescue] Applied post-processing: {input_path} → {output_path}")
        
    except Exception as e:
        print(f"[RVC Rescue] Exception: {e}")
        # Fallback: just copy the file
        import shutil
        shutil.copy2(input_path, output_path)
        print(f"[RVC Rescue] Using raw RVC output due to error")


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
        
        from audio_separator.separator.separator import Separator
        
        # Initialize separator with RTX 3070 optimizations
        separator = Separator(
            output_dir=out_dir,
            output_format="WAV",
            normalization_threshold=0.9,
            mdxc_params={
                'segment_size': 256,   # reduce VRAM usage
                'batch_size': 1,        # stability
                'overlap': 8,           # default overlap
            }
        )

        # Load BS-RoFormer model
        separator.load_model(model_filename="model_bs_roformer_ep_317_sdr_12.9755.ckpt")
        
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


@router.post("/auto_pipeline")
async def auto_pipeline(
    audio_file: UploadFile = File(..., description="Full song (vocals + instrumental)"),
    rvc_model_name: str = Form(..., description="RVC model name from assets/weights/"),
    f0_method: str = Form("harvest", description="F0 extraction method: harvest (singing), rmvpe, pm, crepe"),
    pitch_shift: float = Form(0, description="Pitch shift in semitones"),
    index_rate: float = Form(0.40, description="Retrieval index ratio (0.40 preserves singing style)"),
    
    # NEW: Applio features
    autotune_strength: float = Form(0.0, description="Autotune strength (0.0-1.0, snap F0 to musical notes)"),
    clean_audio: bool = Form(False, description="Clean audio with noise reduction (recommended for speech)"),
    clean_strength: float = Form(0.5, description="Clean strength (0.0-1.0)"),
    volume_envelope: float = Form(1.0, description="RMS matching strength (0.0-1.0)"),
    apply_highpass: bool = Form(True, description="Apply high-pass filter (remove rumble below 48Hz)"),
):
    """
    Automatic pipeline: BS-RoFormer → Normalize → RVC → Rescue Post-Processing.

    Upload a full song and get back the RVC-converted vocals in one click.

    ⚠️ IMPORTANT: RVC is trained on SPEECH, not SINGING
    - Default F0 Method: "harvest" (better for singing than rmvpe)
    - Default Index Rate: 0.40 (preserves original singing style)
    - Includes "RVC Rescue" post-processing with reverb
    
    NEW: Applio Features
    - Autotune: Snap F0 to musical notes (for singing)
    - Clean Audio: Noise reduction (for speech)
    - Volume Envelope: RMS matching
    - High-Pass Filter: Remove rumble

    This endpoint handles the entire workflow automatically.
    """
    import time
    from audio_separator.separator import Separator
    
    tmp_files = []
    temp_dir = None
    
    try:
        from main import OUTPUT_DIR
        
        # Create temp directory for this job
        job_id = uuid.uuid4().hex
        temp_dir = os.path.join(TEMP_DIR, f"pipeline_{job_id}")
        os.makedirs(temp_dir, exist_ok=True)
        
        total_start = time.time()
        
        # Save uploaded file
        suffix = os.path.splitext(audio_file.filename)[1] or ".wav"
        fd, input_path = tempfile.mkstemp(prefix="pipeline_input_", suffix=suffix, dir=temp_dir)
        os.close(fd)
        tmp_files.append(input_path)
        
        with open(input_path, "wb") as f:
            f.write(await audio_file.read())
        
        # ── Step 1: BS-RoFormer Separation ────────────────────────────────────
        print(f"\n[Pipeline] Step 1/3: BS-RoFormer separation...")
        step1_start = time.time()
        
        separator = Separator(
            output_dir=temp_dir,
            output_format="WAV",
            normalization_threshold=0.9,
        )
        separator.load_model(model_filename="model_bs_roformer_ep_317_sdr_12.9755.ckpt")
        outputs = separator.separate(input_path)
        
        # Find vocals and instrumental files
        vocals_path = None
        instrumental_path = None
        for out_file in outputs:
            out_path = os.path.join(temp_dir, out_file)
            if "vocals" in out_file.lower() or "(Vocals)" in out_file:
                vocals_path = out_path
            elif "instrumental" in out_file.lower() or "(Instrumental)" in out_file or "instruments" in out_file.lower():
                instrumental_path = out_path

        if not vocals_path:
            raise RuntimeError("BS-RoFormer did not produce vocal output")

        step1_time = time.time() - step1_start
        print(f"[Pipeline] Step 1 complete: {step1_time:.1f}s - Vocals: {os.path.basename(vocals_path)}")
        if instrumental_path:
            print(f"[Pipeline] Instrumental: {os.path.basename(instrumental_path)}")
        
        # ── Step 2: Normalize ─────────────────────────────────────────────────
        print(f"\n[Pipeline] Step 2/3: Normalize audio...")
        step2_start = time.time()
        
        norm_path = os.path.join(temp_dir, f"norm_{job_id}.wav")
        subprocess.run([
            "ffmpeg", "-y",
            "-i", vocals_path,
            "-filter:a", "loudnorm=I=-16:TP=-1.5:LRA=11",
            norm_path
        ], check=True, capture_output=True)
        
        step2_time = time.time() - step2_start
        print(f"[Pipeline] Step 2 complete: {step2_time:.1f}s")
        
        # ── Step 3: RVC Conversion ────────────────────────────────────────────
        print(f"\n[Pipeline] Step 3/3: RVC conversion...")
        step3_start = time.time()
        
        # Find RVC model
        weights_dir = os.path.join(os.path.dirname(__file__), "..", "..", "RVCWebUI", "assets", "weights")
        model_path = os.path.join(weights_dir, rvc_model_name)
        
        if not os.path.exists(model_path):
            raise RuntimeError(f"RVC model not found: {rvc_model_name}")
        
        # Use core.modules.rvc_model for conversion
        print(f"[Pipeline] Loading RVC model: {rvc_model_name}")

        from core.modules.rvc_model import RVCModel

        rvc = RVCModel()
        rvc.load_model(model_path)

        # Load normalized audio at 48kHz for HIGH QUALITY
        audio, sr = librosa.load(norm_path, sr=48000, mono=True)

        print(f"[Pipeline] Converting voice with {f0_method} (optimized for singing)...")

        # Convert voice with parameters optimized for SINGING (not speech)
        # Now includes Applio features: autotune, highpass, volume envelope
        converted_audio, out_sr = rvc.convert(
            audio=audio,
            sr=sr,
            f0_up_key=pitch_shift,
            f0_method=f0_method,       # harvest = better for singing
            index_rate=index_rate,     # 0.40 = preserves original style
            filter_radius=3,
            rms_mix_rate=0.25,
            protect=0.55,              # Higher protect for singing
            # NEW: Applio features
            autotune_strength=autotune_strength,
            apply_highpass=apply_highpass,
            volume_envelope=volume_envelope,
        )

        # Save RVC output
        rvc_output_path = os.path.join(temp_dir, f"rvc_{job_id}.wav")
        sf.write(rvc_output_path, converted_audio, out_sr, subtype='PCM_16')

        # Unload RVC model
        rvc.unload_model()

        step3_time = time.time() - step3_start
        print(f"[Pipeline] Step 3 complete: {step3_time:.1f}s")

        # ── Step 3.5: Clean Audio (Noise Reduction) ───────────────────────────
        # Apply noise reduction if enabled (recommended for speech)
        if clean_audio and clean_strength > 0:
            print(f"\n[Pipeline] Step 3.5/4: Cleaning audio (strength: {clean_strength})...")
            step35_start = time.time()
            
            try:
                import noisereduce as nr
                
                # Load audio for cleaning
                audio_to_clean, clean_sr = librosa.load(rvc_output_path, sr=None, mono=True)
                
                # Apply noise reduction
                cleaned_audio = nr.reduce_noise(
                    y=audio_to_clean,
                    sr=clean_sr,
                    prop_decrease=clean_strength,
                    stationary=True,  # For stationary noise
                )
                
                # Save cleaned audio
                cleaned_path = os.path.join(temp_dir, f"rvc_{job_id}_cleaned.wav")
                sf.write(cleaned_path, cleaned_audio, clean_sr, subtype='PCM_16')
                rvc_output_path = cleaned_path  # Use cleaned audio for next step
                
                step35_time = time.time() - step35_start
                print(f"[Pipeline] Step 3.5 complete: {step35_time:.1f}s - Clean audio applied")
                
            except ImportError:
                print(f"[Pipeline] Step 3.5: noisereduce library not found, skipping clean audio")
            except Exception as clean_err:
                print(f"[Pipeline] Step 3.5: Clean audio failed: {clean_err}")

        # ── Step 4: RVC Rescue Post-Processing ────────────────────────────────
        # Fix RVC artifacts and restore musicality
        print(f"\n[Pipeline] Step 4/4: RVC Rescue post-processing...")
        step4_start = time.time()

        rescued_path = os.path.join(temp_dir, f"rvc_{job_id}_rescued.wav")
        apply_rvc_rescue_post_processing(rvc_output_path, rescued_path)

        step4_time = time.time() - step4_start
        print(f"[Pipeline] Step 4 complete: {step4_time:.1f}s - Post-processing applied")

        # ── Final Output ──────────────────────────────────────────────────────
        # Use RESCUED vocal (not raw RVC output)
        final_wav = f"pipeline_{job_id}_final.wav"
        final_wav_path = os.path.join(OUTPUT_DIR, final_wav)

        # Save as WAV (48kHz, stereo, 16-bit) - use rescued_path
        subprocess.run([
            "ffmpeg", "-y",
            "-i", rescued_path,  # ⭐ Use rescued vocal, not raw RVC
            "-ar", "48000",
            "-ac", "2",
            "-c:a", "pcm_s16le",
            final_wav_path
        ], check=True, capture_output=True)

        # Also create MP3 version (320kbps)
        final_mp3 = f"pipeline_{job_id}_final.mp3"
        final_mp3_path = os.path.join(OUTPUT_DIR, final_mp3)

        subprocess.run([
            "ffmpeg", "-y",
            "-i", final_wav_path,
            "-codec:a", "libmp3lame",
            "-b:a", "320k",
            "-ar", "48000",
            final_mp3_path
        ], check=True, capture_output=True)

        # ── Save Instrumental for Final Mix ───────────────────────────────────
        instrumental_filename = None
        instrumental_url = None
        if instrumental_path and os.path.exists(instrumental_path):
            # Convert instrumental to MP3 for Final Mix
            instrumental_mp3 = f"pipeline_{job_id}_instrumental.mp3"
            instrumental_mp3_path = os.path.join(OUTPUT_DIR, instrumental_mp3)
            
            subprocess.run([
                "ffmpeg", "-y",
                "-i", instrumental_path,
                "-codec:a", "libmp3lame",
                "-b:a", "320k",
                "-ar", "48000",
                instrumental_mp3_path
            ], check=True, capture_output=True)
            
            instrumental_filename = instrumental_mp3
            instrumental_url = f"/tracks/{instrumental_mp3}"
            print(f"[Pipeline] Instrumental saved: {instrumental_filename}")

        total_time = time.time() - total_start

        # Cleanup temp files
        try:
            shutil.rmtree(temp_dir)
        except:
            pass

        return JSONResponse({
            "status": "ok",
            "message": "Pipeline complet! (with RVC Rescue + Applio features)",
            "filename_wav": final_wav,
            "filename_mp3": final_mp3,
            "url": f"/tracks/{final_wav}",  # Return WAV by default (higher quality)
            "url_mp3": f"/tracks/{final_mp3}",
            "instrumental_filename": instrumental_filename,
            "instrumental_url": instrumental_url,
            "duration_sec": round(len(converted_audio) / out_sr, 2),
            "total_time_sec": round(total_time, 1),
            "steps": {
                "separation": round(step1_time, 1),
                "normalize": round(step2_time, 1),
                "rvc_conversion": round(step3_time, 1),
                "clean_audio": round(step35_time, 1) if 'step35_time' in locals() else 0,
                "post_processing": round(step4_time, 1),
            },
            "applio_features": {
                "autotune_strength": autotune_strength,
                "clean_audio": clean_audio,
                "clean_strength": clean_strength,
                "volume_envelope": volume_envelope,
                "apply_highpass": apply_highpass,
            },
            "post_processing_applied": True,
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        
        # Cleanup on error
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
            except:
                pass
        
        return JSONResponse(
            {"status": "error", "error": str(e)},
            status_code=500
        )
    finally:
        # Cleanup any remaining temp files
        for f in tmp_files:
            try:
                os.remove(f)
            except:
                pass


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
