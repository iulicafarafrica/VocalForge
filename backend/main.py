"""
VocalForge v1.9 - FastAPI Backend
Real pipeline: Demucs vocal separation → so-vits-svc voice conversion → remix

Endpoints:
  POST /process_cover       - full cover: separate vocals → convert → remix
  POST /preview             - 10-second preview of same pipeline
  POST /upload_model        - upload a so-vits-svc model (.pth + config.json)
  GET  /list_models         - list available voice models
  DELETE /delete_model/{id} - delete a model
  GET  /speakers/{model_id} - list speakers in a model
  POST /detect_bpm_key      - detect BPM and musical key
  GET  /hardware            - hardware info
  GET  /vram_usage          - current VRAM usage
  GET  /clear_cache         - clear GPU VRAM cache
  GET  /health              - health check
  
  GPU Memory Management (NEW in v1.9):
  GET  /gpu/info             - get GPU VRAM information
  GET  /gpu/cleanup          - manual GPU VRAM cleanup
  GET  /gpu/models           - list loaded models in VRAM
  POST /gpu/unload/{name}    - unload specific model from VRAM
  POST /gpu/unload-all       - unload all models from VRAM
  GET  /gpu/can-load/{name}  - check if model can be loaded
"""

import os
import sys
import uuid
import json
import random
import shutil
import asyncio
import tempfile
import time
import subprocess
import torch
import numpy as np
import soundfile as sf
import librosa
import uvicorn
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add backend directory to sys.path for proper module imports
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Fix Windows asyncio ConnectionResetError (WinError 10054)
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

print("[STARTUP] Loading heavy libraries...")
try:
    import demucs
    print("[STARTUP] OK - Demucs loaded")
except ImportError as e:
    print(f"[STARTUP] ERR - Demucs not available: {e}")

try:
    import audio_separator
    print("[STARTUP] OK - Audio Separator loaded")
except ImportError as e:
    print(f"[STARTUP] ERR - Audio Separator not available: {e}")

try:
    import edge_tts
    print("[STARTUP] OK - Edge TTS loaded")
except ImportError as e:
    print(f"[STARTUP] ERR - Edge TTS not available: {e}")

print(f"[STARTUP] OK - Librosa loaded (v{librosa.__version__})")
print("[STARTUP] All heavy libraries loaded at startup (lazy loading disabled)")

# ── Ensure FFmpeg is in PATH (WinGet install location) ───────────────────────
_FFMPEG_WINGET = (
    r"C:\Users\gigid\AppData\Local\Microsoft\WinGet\Packages"
    r"\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin"
)
_FFMPEG_COMMON = [
    _FFMPEG_WINGET,
    r"C:\ffmpeg\bin",
    r"C:\Program Files\FFmpeg\bin",
]
for _ffp in _FFMPEG_COMMON:
    if os.path.isdir(_ffp) and _ffp not in os.environ.get("PATH", ""):
        os.environ["PATH"] = os.environ.get("PATH", "") + os.pathsep + _ffp
        print(f"[STARTUP] Added FFmpeg to PATH: {_ffp}")
        break

# ── Audio format configuration ────────────────────────────────────────────────
# Default output format: mp3 (smaller file size, better compatibility)
# Change to "wav" if you need uncompressed audio
OUTPUT_FORMAT = "mp3"  # "mp3" or "wav"
MP3_BITRATE = "192k"   # Quality: 128k, 192k, 256k, 320k

# ── Logging configuration ────────────────────────────────────────────────────────
import logging

# Configure logging format for better debugging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s - %(name)s: %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("vocalforge")

# ── Lazy loading disabled ─────────────────────────────────────────────────────
# All heavy libraries (librosa, demucs, audio_separator, edge_tts) are now
# loaded at startup for faster runtime performance.

def _convert_to_mp3(wav_path: str, mp3_path: str = None, bitrate: str = MP3_BITRATE) -> str:
    """
    Convert WAV to MP3 using FFmpeg.
    Returns the path to the MP3 file.
    If mp3_path is None, replaces .wav extension with .mp3
    """
    if mp3_path is None:
        mp3_path = wav_path.replace(".wav", ".mp3")
    
    cmd = [
        "ffmpeg", "-y", "-i", wav_path,
        "-codec:a", "libmp3lame",
        "-b:a", bitrate,
        "-q:a", "2",  # VBR quality (0-9, lower is better)
        mp3_path
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"[FFMPEG] Warning: conversion failed: {result.stderr}")
        # Return original WAV if conversion fails
        return wav_path
    
    # Remove original WAV if MP3 was created successfully
    if os.path.exists(mp3_path) and os.path.getsize(mp3_path) > 0:
        try:
            os.remove(wav_path)
        except Exception:
            pass
        return mp3_path
    
    return wav_path

def save_audio(audio: np.ndarray, sr: int, output_path: str, output_format: str = OUTPUT_FORMAT) -> tuple[str, float]:
    """
    Save audio to file. Converts to MP3 if output_format is 'mp3'.
    Returns (final_file_path, file_size_mb)
    """
    if output_format.lower() == "mp3" and output_path.endswith(".wav"):
        # Save as WAV first, then convert to MP3
        wav_path = output_path
        mp3_path = output_path.replace(".wav", ".mp3")
        sf.write(wav_path, audio, sr)
        final_path = _convert_to_mp3(wav_path, mp3_path)
    else:
        # Save directly in requested format
        final_path = output_path
        sf.write(final_path, audio, sr)
    
    file_size_mb = round(os.path.getsize(final_path) / 1024 / 1024, 2)
    return final_path, file_size_mb

def _suppress_connection_reset(loop, context):
    exc = context.get("exception")
    if isinstance(exc, ConnectionResetError):
        return
    loop.default_exception_handler(context)

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Import ACE-Step Advanced router
from endpoints.acestep_advanced import router as acestep_advanced_router

# ── Directories ────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
TEMP_DIR   = os.path.join(BASE_DIR, "temp")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")

for d in [MODELS_DIR, TEMP_DIR, OUTPUT_DIR]:
    os.makedirs(d, exist_ok=True)

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(title="VocalForge API", version="1.7")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Audio Analysis router (BPM, Key, Chords detection)
from endpoints.audio_analysis import router as audio_analysis_router
app.include_router(audio_analysis_router)

app.mount("/tracks", StaticFiles(directory=OUTPUT_DIR), name="tracks")

from fastapi.responses import FileResponse

@app.get("/audio/{filename}")
async def serve_audio(filename: str):
    file_path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    ext = filename.rsplit(".", 1)[-1].lower()
    media_types = {"mp3": "audio/mpeg", "wav": "audio/wav", "flac": "audio/flac"}
    media_type = media_types.get(ext, "audio/mpeg")
    return FileResponse(file_path, media_type=media_type, headers={
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache",
    })

# Include ACE-Step Advanced router
app.include_router(acestep_advanced_router)

# Include RVC Voice Conversion router
from endpoints.rvc_conversion import router as rvc_conversion_router
app.include_router(rvc_conversion_router)

# Include GPU Memory Management router
from endpoints.gpu_info import router as gpu_router
app.include_router(gpu_router)

# Include Vocal Pipeline router
from endpoints.pipeline import router as pipeline_router
app.include_router(pipeline_router)

@app.on_event("startup")
async def startup_event():
    loop = asyncio.get_running_loop()
    loop.set_exception_handler(_suppress_connection_reset)

# ── Hardware detection ─────────────────────────────────────────────────────────
def detect_hardware():
    has_cuda = torch.cuda.is_available()
    vram_gb = 0.0
    if has_cuda:
        try:
            vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        except Exception:
            pass
    device = "cuda" if has_cuda else "cpu"

    # Determine mode (same logic as core/engine.py)
    if not has_cuda or vram_gb < 4:
        mode = "light"
    elif vram_gb < 8:
        mode = "full"
    else:
        mode = "high_end"

    return {
        "device": device,
        "has_cuda": has_cuda,
        "vram_gb": round(vram_gb, 2),
        "cpu_cores": os.cpu_count() or 1,
        "mode": mode,
    }

hw = detect_hardware()

# ── Job store (in-memory progress tracking) ───────────────────────────────────
# job_id → {"step": str, "pct": int, "logs": [...], "done": bool, "result": dict|None, "error": str|None}
_jobs: dict = {}

def _job_log(job_id: str, msg: str, pct: int = None):
    """Append a log line to a job and optionally update progress %."""
    ts = datetime.now().strftime("%H:%M:%S")
    entry = f"[{ts}] {msg}"
    print(f"[JOB {job_id[:8]}] {msg}")
    if job_id in _jobs:
        _jobs[job_id]["logs"].append(entry)
        if pct is not None:
            _jobs[job_id]["pct"] = pct
        _jobs[job_id]["step"] = msg

def _vram_used_gb() -> float:
    if torch.cuda.is_available():
        return round(torch.cuda.memory_allocated() / (1024**3), 2)
    return 0.0

# ── Lazy model cache ───────────────────────────────────────────────────────────
_svc_cache: dict = {}   # model_id → SoVITSInfer instance

# so-vits-svc directory (needed for pretrain/ and other relative paths)
SOVITS_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "so-vits-svc"))

def _get_svc(model_id: str):
    """Load (or return cached) SoVITSInfer for a model_id."""
    if model_id in _svc_cache:
        return _svc_cache[model_id]

    model_dir = os.path.join(MODELS_DIR, model_id)
    if not os.path.isdir(model_dir):
        raise FileNotFoundError(f"Model directory not found: {model_dir}")

    # Find .pth file
    pth_files = [f for f in os.listdir(model_dir) if f.endswith(".pth")]
    if not pth_files:
        raise FileNotFoundError(f"No .pth file found in {model_dir}")
    model_path = os.path.join(model_dir, pth_files[0])

    config_path = os.path.join(model_dir, "config.json")
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"config.json not found in {model_dir}")

    # Ensure so-vits-svc is on path and set as cwd for pretrain/ lookups
    if SOVITS_DIR not in sys.path:
        sys.path.insert(0, SOVITS_DIR)
    modules_dir = os.path.join(BASE_DIR, "modules")
    if modules_dir not in sys.path:
        sys.path.insert(0, modules_dir)

    # Change cwd to so-vits-svc so relative paths (pretrain/) work
    _orig_cwd = os.getcwd()
    os.chdir(SOVITS_DIR)
    try:
        from sovits_infer import SoVITSInfer
        svc = SoVITSInfer(model_path=model_path, config_path=config_path, device=hw["device"])
        # Trigger lazy load while still in correct cwd
        _ = svc.speakers
    finally:
        os.chdir(_orig_cwd)

    _svc_cache[model_id] = svc
    return svc


# ── Vocal separation — htdemucs (fallback) sau BS-RoFormer (preferred) ────────
def separate_vocals(audio_path: str, out_dir: str, model: str = "auto") -> tuple[str, str]:
    """
    Separate vocals from audio.
    model="auto"  → încearcă BS-RoFormer, fallback la htdemucs dacă nu e instalat
    model="bs_roformer_1297" → forțează BS-RoFormer (audio-separator)
    model="htdemucs"         → forțează htdemucs (demucs)
    Returns (vocals_path, instrumental_path).
    """
    # Auto: preferă BS-RoFormer dacă audio-separator e instalat
    if model == "auto":
        try:
            from audio_separator.separator import Separator  # noqa: F401
            model = "bs_roformer_1297"
            print("[SEP] audio-separator disponibil → folosesc BS-RoFormer (SDR 12.97)")
        except ImportError:
            model = "htdemucs"
            print("[SEP] audio-separator lipsă → fallback la htdemucs")

    if model in UVR_MODEL_MAP:
        # ── BS-RoFormer / Mel-Band RoFormer via audio-separator ──────────────
        stems = separate_stems_uvr(audio_path, out_dir, model_id=model)
        vocals_path = stems.get("vocals")
        instr_path  = stems.get("instrumental")

        if not vocals_path or not os.path.exists(vocals_path):
            raise FileNotFoundError(f"BS-RoFormer: vocals stem not found. Got: {list(stems.keys())}")
        if not instr_path or not os.path.exists(instr_path):
            raise FileNotFoundError(f"BS-RoFormer: instrumental stem not found. Got: {list(stems.keys())}")

        return vocals_path, instr_path

    else:
        # ── htdemucs via demucs ───────────────────────────────────────────────
        import subprocess
        demucs_model = model if model != "htdemucs" else "htdemucs"
        result = subprocess.run(
            [
                sys.executable, "-m", "demucs",
                "--two-stems", "vocals",
                "-n", demucs_model,
                "-o", out_dir,
                audio_path,
            ],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise RuntimeError(f"Demucs failed:\n{result.stderr}")

        base_name = os.path.splitext(os.path.basename(audio_path))[0]
        htdemucs_dir = os.path.join(out_dir, demucs_model, base_name)

        vocals_path = os.path.join(htdemucs_dir, "vocals.wav")
        instrumental_path = os.path.join(htdemucs_dir, "no_vocals.wav")

        if not os.path.exists(vocals_path):
            raise FileNotFoundError(f"Demucs vocals not found at {vocals_path}")
        if not os.path.exists(instrumental_path):
            raise FileNotFoundError(f"Demucs instrumental not found at {instrumental_path}")

        return vocals_path, instrumental_path


def mix_audio(vocals: np.ndarray, instrumental: np.ndarray,
              sr_v: int, sr_i: int,
              vocal_gain: float = 1.0,
              instrumental_gain: float = 1.0) -> tuple[np.ndarray, int]:
    """
    Mix vocals + instrumental to same length and sample rate.
    Returns (mixed_audio, sample_rate).
    """
    import librosa

    # Resample instrumental to match vocals SR if needed
    if sr_i != sr_v:
        instrumental = librosa.resample(instrumental, orig_sr=sr_i, target_sr=sr_v)

    # Match lengths
    min_len = min(len(vocals), len(instrumental))
    vocals = vocals[:min_len]
    instrumental = instrumental[:min_len]

    mixed = vocals * vocal_gain + instrumental * instrumental_gain

    # Normalize to prevent clipping
    peak = np.max(np.abs(mixed))
    if peak > 1.0:
        mixed = mixed / peak * 0.95

    return mixed, sr_v


# ──────────────────────────────────────────────────────────────────────────────
# Cover Generation — main endpoint
# ──────────────────────────────────────────────────────────────────────────────

# ── SSE job progress endpoint ─────────────────────────────────────────────────
@app.get("/job/{job_id}/progress")
async def job_progress(job_id: str):
    """SSE stream: sends job progress events until done."""
    async def event_stream():
        last_log_idx = 0
        while True:
            job = _jobs.get(job_id)
            if not job:
                yield f"data: {json.dumps({'error': 'job not found'})}\n\n"
                break
            # Send new log lines
            new_logs = job["logs"][last_log_idx:]
            last_log_idx += len(new_logs)
            payload = {
                "pct": job["pct"],
                "step": job["step"],
                "logs": new_logs,
                "done": job["done"],
                "error": job.get("error"),
            }
            if job["done"] and job.get("result"):
                payload["result"] = job["result"]
            yield f"data: {json.dumps(payload)}\n\n"
            if job["done"]:
                break
            await asyncio.sleep(0.5)
    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/job/{job_id}/status")
def job_status(job_id: str):
    """Polling fallback: returns current job state."""
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.post("/process_cover")
async def process_cover(
    file: UploadFile = File(...),
    model_id: str = Form(...),
    speaker: str = Form(""),
    pitch: int = Form(0),
    slice_db: int = Form(-40),
    noise_scale: float = Form(0.4),
    cluster_ratio: float = Form(0.0),
    auto_predict_f0: bool = Form(False),
    f0_predictor: str = Form("pm"),
    vocal_gain: float = Form(1.0),
    instrumental_gain: float = Form(1.0),
    pad_seconds: float = Form(0.5),
    clip_seconds: float = Form(0.0),
):
    """
    Full cover pipeline with job tracking:
    1. Demucs: separate vocals from instrumental
    2. so-vits-svc: convert vocals to target voice
    3. Mix converted vocals back with instrumental
    Returns job_id immediately; poll /job/{id}/status or stream /job/{id}/progress.
    """
    job_id = uuid.uuid4().hex
    job_dir = os.path.join(TEMP_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)

    # Register job
    _jobs[job_id] = {"step": "Starting...", "pct": 0, "logs": [], "done": False, "result": None, "error": None}

    t_total = time.time()

    try:
        # ── Save uploaded file ────────────────────────────────────────────────
        _job_log(job_id, f"Received file: {file.filename}", pct=2)
        in_path = os.path.join(job_dir, "input.wav")
        raw_bytes = await file.read()
        with open(in_path, "wb") as f:
            f.write(raw_bytes)
        file_size_mb = round(len(raw_bytes) / 1024 / 1024, 2)
        _job_log(job_id, f"File saved ({file_size_mb} MB)", pct=5)

        # ── Step 1: Demucs vocal separation ──────────────────────────────────
        _job_log(job_id, "Step 1/3 — Separating vocals (demucs htdemucs)...", pct=10)
        t1 = time.time()
        vocals_path, instrumental_path = separate_vocals(in_path, job_dir)
        t1_sec = round(time.time() - t1, 1)
        _job_log(job_id, f"Vocal separation done in {t1_sec}s", pct=35)

        # ── Step 2: so-vits-svc voice conversion ─────────────────────────────
        _job_log(job_id, f"Step 2/3 — Voice conversion (model={model_id}, f0={f0_predictor})...", pct=40)
        t2 = time.time()
        svc = _get_svc(model_id)
        spk = speaker or (svc.speakers[0] if svc.speakers else "default")
        _job_log(job_id, f"Using speaker: {spk}", pct=42)

        vram_before = _vram_used_gb()
        converted_audio, converted_sr = svc.convert(
            audio_path=vocals_path,
            speaker=spk,
            pitch_shift=pitch,
            slice_db=slice_db,
            noise_scale=noise_scale,
            cluster_ratio=cluster_ratio,
            auto_predict_f0=auto_predict_f0,
            f0_predictor=f0_predictor,
            pad_seconds=pad_seconds,
            clip_seconds=clip_seconds,
        )
        vram_after = _vram_used_gb()
        t2_sec = round(time.time() - t2, 1)
        _job_log(job_id, f"Voice conversion done in {t2_sec}s | VRAM: {vram_before}→{vram_after} GB", pct=75)

        # ── Step 3: Mix ───────────────────────────────────────────────────────
        _job_log(job_id, "Step 3/3 — Mixing vocals with instrumental...", pct=80)
        t3 = time.time()
        instrumental_audio, instrumental_sr = sf.read(instrumental_path, dtype="float32")
        if instrumental_audio.ndim > 1:
            instrumental_audio = np.mean(instrumental_audio, axis=1)

        mixed, out_sr = mix_audio(
            vocals=converted_audio,
            instrumental=instrumental_audio,
            sr_v=converted_sr,
            sr_i=instrumental_sr,
            vocal_gain=vocal_gain,
            instrumental_gain=instrumental_gain,
        )
        t3_sec = round(time.time() - t3, 1)
        _job_log(job_id, f"Mix done in {t3_sec}s", pct=90)

        # ── Save output ───────────────────────────────────────────────────────
        out_filename = f"{job_id}_cover.{OUTPUT_FORMAT}"
        out_path = os.path.join(OUTPUT_DIR, out_filename)
        final_path, out_size_mb = save_audio(mixed, out_sr, out_path, OUTPUT_FORMAT)
        out_filename = os.path.basename(final_path)
        duration_sec = round(len(mixed) / out_sr, 2)
        t_total_sec = round(time.time() - t_total, 1)

        _job_log(job_id, f"Done! {duration_sec}s audio | {out_size_mb} MB | total time: {t_total_sec}s", pct=100)

        result = {
            "status": "ok",
            "job_id": job_id,
            "filename": out_filename,
            "url": f"/tracks/{out_filename}",
            "speaker": spk,
            "sample_rate": out_sr,
            "duration_sec": duration_sec,
            "metadata": {
                "input_file": file.filename,
                "input_size_mb": file_size_mb,
                "output_size_mb": out_size_mb,
                "model_id": model_id,
                "speaker": spk,
                "pitch": pitch,
                "f0_predictor": f0_predictor,
                "noise_scale": noise_scale,
                "vocal_gain": vocal_gain,
                "instrumental_gain": instrumental_gain,
                "device": hw["device"],
                "vram_used_gb": vram_after,
                "timing": {
                    "demucs_sec": t1_sec,
                    "sovits_sec": t2_sec,
                    "mix_sec": t3_sec,
                    "total_sec": t_total_sec,
                },
                "created_at": datetime.now().isoformat(),
            },
        }
        _jobs[job_id]["result"] = result
        _jobs[job_id]["done"] = True
        return result

    except FileNotFoundError as e:
        _jobs[job_id]["error"] = str(e)
        _jobs[job_id]["done"] = True
        return JSONResponse(status_code=404, content={"error": str(e), "job_id": job_id})
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        _jobs[job_id]["error"] = str(e)
        _jobs[job_id]["done"] = True
        _job_log(job_id, f"ERROR: {e}")
        return JSONResponse(status_code=500, content={"error": str(e), "traceback": tb, "job_id": job_id})
    finally:
        try:
            shutil.rmtree(job_dir, ignore_errors=True)
        except Exception:
            pass


@app.post("/preview")
async def preview_cover(
    file: UploadFile = File(...),
    model_id: str = Form(...),
    speaker: str = Form(""),
    pitch: int = Form(0),
    seconds: int = Form(10),
):
    """
    Preview: run cover pipeline on first N seconds (default 10s).
    Fast path — no job tracking, returns result directly.
    """
    job_id = uuid.uuid4().hex
    job_dir = os.path.join(TEMP_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    t_start = time.time()

    try:
        import librosa

        # Save + trim to preview length
        raw_path = os.path.join(job_dir, "raw.wav")
        with open(raw_path, "wb") as f:
            f.write(await file.read())

        print(f"[PREVIEW {job_id[:8]}] Trimming to {seconds}s...")
        y, sr = librosa.load(raw_path, sr=None, mono=True, duration=seconds)
        in_path = os.path.join(job_dir, "input.wav")
        sf.write(in_path, y, sr)

        # Separate
        print(f"[PREVIEW {job_id[:8]}] Demucs separation...")
        vocals_path, instrumental_path = separate_vocals(in_path, job_dir)

        # Convert
        print(f"[PREVIEW {job_id[:8]}] Voice conversion...")
        svc = _get_svc(model_id)
        spk = speaker or (svc.speakers[0] if svc.speakers else "default")
        converted_audio, converted_sr = svc.convert(
            audio_path=vocals_path,
            speaker=spk,
            pitch_shift=pitch,
        )

        # Mix
        instrumental_audio, instrumental_sr = sf.read(instrumental_path, dtype="float32")
        if instrumental_audio.ndim > 1:
            instrumental_audio = np.mean(instrumental_audio, axis=1)
        mixed, out_sr = mix_audio(converted_audio, instrumental_audio, converted_sr, instrumental_sr)

        out_filename = f"{job_id}_preview.{OUTPUT_FORMAT}"
        out_path = os.path.join(OUTPUT_DIR, out_filename)
        final_path, out_size_mb = save_audio(mixed, out_sr, out_path, OUTPUT_FORMAT)
        out_filename = os.path.basename(final_path)

        t_sec = round(time.time() - t_start, 1)
        duration_sec = round(len(mixed) / out_sr, 2)
        print(f"[PREVIEW {job_id[:8]}] Done in {t_sec}s — {duration_sec}s audio")

        return {
            "status": "ok",
            "filename": out_filename,
            "url": f"/tracks/{out_filename}",
            "speaker": spk,
            "duration_sec": duration_sec,
            "preview_seconds": seconds,
            "processing_time_sec": t_sec,
            "metadata": {
                "model_id": model_id,
                "speaker": spk,
                "pitch": pitch,
                "device": hw["device"],
                "created_at": datetime.now().isoformat(),
            },
        }

    except Exception as e:
        import traceback
        return JSONResponse(status_code=500, content={
            "error": str(e),
            "traceback": traceback.format_exc(),
        })
    finally:
        shutil.rmtree(job_dir, ignore_errors=True)


# ──────────────────────────────────────────────────────────────────────────────
# Model Management
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/upload_model")
async def upload_model(
    pth_file: UploadFile = File(...),
    config_file: UploadFile = File(...),
    name: str = Form(""),
):
    """
    Upload a so-vits-svc model (.pth) + config.json.
    Creates a new model directory under backend/models/.
    """
    model_id = uuid.uuid4().hex[:8]
    model_name = name or os.path.splitext(pth_file.filename)[0]
    model_dir = os.path.join(MODELS_DIR, model_id)
    os.makedirs(model_dir, exist_ok=True)

    pth_path = os.path.join(model_dir, pth_file.filename)
    with open(pth_path, "wb") as f:
        shutil.copyfileobj(pth_file.file, f)

    config_path = os.path.join(model_dir, "config.json")
    with open(config_path, "wb") as f:
        shutil.copyfileobj(config_file.file, f)

    # Save metadata
    meta = {
        "id": model_id,
        "name": model_name,
        "pth": pth_file.filename,
        "size_mb": round(os.path.getsize(pth_path) / 1024 / 1024, 2),
    }
    with open(os.path.join(model_dir, "meta.json"), "w") as f:
        json.dump(meta, f, indent=2)

    return {"status": "ok", "model_id": model_id, "name": model_name}


@app.get("/list_models")
def list_models():
    """List all available voice models."""
    models = []
    for entry in os.scandir(MODELS_DIR):
        if not entry.is_dir():
            continue
        meta_path = os.path.join(entry.path, "meta.json")
        if os.path.exists(meta_path):
            with open(meta_path) as f:
                models.append(json.load(f))
        else:
            # Auto-detect model without meta.json (e.g. pre-existing models)
            pth_files = [fn for fn in os.listdir(entry.path) if fn.endswith(".pth")]
            if pth_files and os.path.exists(os.path.join(entry.path, "config.json")):
                models.append({
                    "id": entry.name,
                    "name": entry.name,
                    "pth": pth_files[0],
                    "size_mb": round(os.path.getsize(os.path.join(entry.path, pth_files[0])) / 1024 / 1024, 2),
                })
    return models


@app.delete("/delete_model/{model_id}")
def delete_model(model_id: str):
    """Delete a model by ID."""
    model_dir = os.path.join(MODELS_DIR, model_id)
    if not os.path.isdir(model_dir):
        raise HTTPException(status_code=404, detail="Model not found")
    shutil.rmtree(model_dir)
    if model_id in _svc_cache:
        _svc_cache[model_id].unload()
        del _svc_cache[model_id]
    return {"status": "ok", "deleted": model_id}


@app.get("/speakers/{model_id}")
def get_speakers(model_id: str):
    """Return list of speakers available in a model."""
    try:
        svc = _get_svc(model_id)
        return {"model_id": model_id, "speakers": svc.speakers}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────────────────────────────────────
# Demucs Stem Separation
# ──────────────────────────────────────────────────────────────────────────────

# ── Model configs ─────────────────────────────────────────────────────────────
DEMUCS_STEM_MAP = {
    "htdemucs":    ["vocals", "drums", "bass", "other"],
    "htdemucs_ft": ["vocals", "drums", "bass", "other"],
    "htdemucs_6s": ["vocals", "drums", "bass", "other", "guitar", "piano"],
    "mdx_extra":   ["vocals", "drums", "bass", "other"],
}

UVR_MODEL_MAP = {
    # BS-RoFormer — best quality vocals/instrumental (SDR 12.97), recomandat
    "bs_roformer_1297":  "model_bs_roformer_ep_317_sdr_12.9755.ckpt",
    # Mel-Band RoFormer — alternativă mai ușoară (mai puțin VRAM)
    "mel_band_roformer": "model_mel_band_roformer_ep_3005_sdr_11.4360.ckpt",
}

# Modele care produc "other" în loc de "instrumental" — trebuie tratate special
UVR_OTHER_AS_INSTRUMENTAL = {"mel_band_roformer"}

UVR_MODELS_DIR = os.path.join(BASE_DIR, "uvr_models")
os.makedirs(UVR_MODELS_DIR, exist_ok=True)


def separate_stems_uvr(audio_path: str, out_dir: str, model_id: str, mode: str = "stems") -> dict:
    """
    Use audio-separator (UVR) to separate stems.
    Supports BS-RoFormer, Mel-Band RoFormer, etc.
    Returns dict: {stem_name: absolute_path}
    """
    try:
        from audio_separator.separator import Separator
    except ImportError:
        raise RuntimeError(
            "audio-separator not installed. Run: pip install \"audio-separator[gpu]\" "
            "(or [cpu] if no GPU)"
        )

    model_file = UVR_MODEL_MAP.get(model_id)
    if not model_file:
        raise ValueError(f"Unknown UVR model: {model_id}")

    # ── VRAM optimization: chunk_size + batch_size reduse ────────────────────
    # BS-RoFormer și Mel-Band RoFormer pot consuma 100% VRAM fără chunking.
    # chunk_size=256000 = ~5.8s la 44100Hz — procesare în bucăți mici
    # batch_size=1 — nu procesa mai multe chunk-uri simultan
    vram_gb = hw.get("vram_gb", 0)
    if vram_gb >= 10:
        chunk_size = 485100   # ~11s chunks — GPU puternic
        overlap = 0.25
    elif vram_gb >= 6:
        chunk_size = 256000   # ~5.8s chunks — GPU mediu
        overlap = 0.25
    else:
        chunk_size = 131072   # ~3s chunks — GPU slab / CPU
        overlap = 0.25

    print(f"[UVR] Loading model: {model_file} | VRAM={vram_gb}GB → chunk_size={chunk_size}")

    separator = Separator(
        model_file_dir=UVR_MODELS_DIR,
        output_dir=out_dir,
        output_format="WAV",
        normalization_threshold=0.9,
        mdx_params={
            "hop_length": 1024,
            "segment_size": 256,
            "overlap": overlap,
            "batch_size": 1,
            "enable_denoise": False,
        },
        vr_params={
            "batch_size": 1,
            "window_size": 512,
            "aggression": 5,
            "enable_tta": False,
            "enable_post_process": False,
            "post_process_threshold": 0.2,
            "high_end_process": False,
        },
    )
    separator.load_model(model_filename=model_file)

    output_files = separator.separate(audio_path)
    print(f"[UVR] Output files: {output_files}")

    # Eliberează VRAM după separare
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    # audio-separator numește fișierele: "input_(Vocals)_model_name.wav"
    # Unele modele (mel_band_roformer) produc "(other)" în loc de "(instrumental)"
    treat_other_as_instr = model_id in UVR_OTHER_AS_INSTRUMENTAL

    stems = {}
    for f in output_files:
        fname = os.path.basename(f) if os.path.isabs(f) else f
        full_path = f if os.path.isabs(f) else os.path.join(out_dir, f)
        fname_lower = fname.lower()

        if "(vocals)" in fname_lower or "_vocals" in fname_lower:
            stems["vocals"] = full_path
        elif "(instrumental)" in fname_lower or "_instrumental" in fname_lower or "no_vocals" in fname_lower:
            stems["instrumental"] = full_path
        elif "(other)" in fname_lower:
            if treat_other_as_instr:
                # mel_band_roformer: "(other)" = tot ce nu e vocals = instrumental
                stems["instrumental"] = full_path
                print(f"[UVR] Mapped (other) → instrumental (model={model_id})")
            else:
                stems["other"] = full_path
        elif "(drums)" in fname_lower:
            stems["drums"] = full_path
        elif "(bass)" in fname_lower:
            stems["bass"] = full_path
        elif "(guitar)" in fname_lower:
            stems["guitar"] = full_path
        elif "(piano)" in fname_lower:
            stems["piano"] = full_path
        else:
            stem_name = os.path.splitext(fname)[0].split("_")[-1].lower()
            stems[stem_name] = full_path

    if not stems:
        raise RuntimeError(f"UVR produced no output files. Got: {output_files}")

    # Dacă tot nu avem "instrumental", încearcă să folosim orice stem non-vocals
    if "instrumental" not in stems and "vocals" in stems:
        non_vocal = [k for k in stems if k != "vocals"]
        if non_vocal:
            stems["instrumental"] = stems[non_vocal[0]]
            print(f"[UVR] Fallback: using '{non_vocal[0]}' as instrumental")

    return stems


def separate_stems_demucs(audio_path: str, out_dir: str, model: str = "htdemucs_ft") -> dict:
    """
    Run demucs with the specified model.
    Returns dict: {stem_name: absolute_path}
    """
    import subprocess
    result = subprocess.run(
        [sys.executable, "-m", "demucs", "-n", model, "-o", out_dir, audio_path],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Demucs failed:\n{result.stderr[-2000:]}")

    base_name = os.path.splitext(os.path.basename(audio_path))[0]
    model_out_dir = os.path.join(out_dir, model, base_name)

    stems = {}
    for stem in DEMUCS_STEM_MAP.get(model, ["vocals", "drums", "bass", "other"]):
        p = os.path.join(model_out_dir, f"{stem}.wav")
        if os.path.exists(p):
            stems[stem] = p
    return stems


def separate_stems(audio_path: str, out_dir: str, model: str = "htdemucs_ft") -> dict:
    """
    Unified stem separation: routes to UVR or Demucs based on model ID.
    """
    if model in UVR_MODEL_MAP:
        return separate_stems_uvr(audio_path, out_dir, model_id=model)
    else:
        return separate_stems_demucs(audio_path, out_dir, model=model)


@app.post("/demucs_separate")
async def demucs_separate(
    file: UploadFile = File(...),
    model: str = Form("htdemucs_ft"),
    mode: str = Form("stems"),  # "stems" | "vocals_only" | "instrumental_only"
):
    """
    Separate audio into stems using Demucs.
    mode=stems: returns all stems
    mode=vocals_only: returns only vocals
    mode=instrumental_only: returns no_vocals mix (drums+bass+other)
    """
    job_id = uuid.uuid4().hex
    job_dir = os.path.join(TEMP_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    t_start = time.time()

    try:
        # Save uploaded file - keep original extension
        original_ext = os.path.splitext(file.filename)[1] or ".wav"
        in_path = os.path.join(job_dir, f"input{original_ext}")
        raw_bytes = await file.read()
        with open(in_path, "wb") as f_out:
            f_out.write(raw_bytes)
        file_size_mb = round(len(raw_bytes) / 1024 / 1024, 2)
        print(f"[DEMUCS {job_id[:8]}] File: {file.filename} ({file_size_mb}MB) | model={model} | mode={mode}")

        # Run demucs
        print(f"[DEMUCS {job_id[:8]}] Running demucs {model}...")
        stems_paths = separate_stems(in_path, job_dir, model=model)
        if not stems_paths:
            raise RuntimeError(f"Demucs produced no output files for model={model}")

        # Get duration from first stem
        first_stem_path = next(iter(stems_paths.values()))
        audio_data, audio_sr = sf.read(first_stem_path, dtype="float32")
        duration_sec = round(len(audio_data) / audio_sr, 2)

        # Build output based on mode
        output_stems = {}

        if mode == "vocals_only":
            if "vocals" not in stems_paths:
                raise RuntimeError("vocals stem not found")
            out_fn = f"{job_id}_vocals.wav"
            out_path = os.path.join(OUTPUT_DIR, out_fn)
            shutil.copy2(stems_paths["vocals"], out_path)
            output_stems["vocals"] = f"/tracks/{out_fn}"

        elif mode == "instrumental_only":
            # Mix all non-vocal stems
            import librosa
            non_vocal = [s for s in stems_paths if s != "vocals"]
            if not non_vocal:
                raise RuntimeError("No non-vocal stems found")
            mixed = None
            mix_sr = None
            for stem_name in non_vocal:
                s_audio, s_sr = sf.read(stems_paths[stem_name], dtype="float32")
                if s_audio.ndim > 1:
                    s_audio = np.mean(s_audio, axis=1)
                if mixed is None:
                    mixed = s_audio
                    mix_sr = s_sr
                else:
                    if s_sr != mix_sr:
                        s_audio = librosa.resample(s_audio, orig_sr=s_sr, target_sr=mix_sr)
                    min_len = min(len(mixed), len(s_audio))
                    mixed = mixed[:min_len] + s_audio[:min_len]
            # Normalize
            peak = np.max(np.abs(mixed))
            if peak > 1.0:
                mixed = mixed / peak * 0.95
            out_fn = f"{job_id}_instrumental.{OUTPUT_FORMAT}"
            out_path = os.path.join(OUTPUT_DIR, out_fn)
            save_audio(mixed, mix_sr, out_path, OUTPUT_FORMAT)
            output_stems["instrumental"] = f"/tracks/{out_fn}"

        else:  # "stems" — all stems
            for stem_name, stem_path in stems_paths.items():
                out_fn = f"{job_id}_{stem_name}.wav"
                out_path = os.path.join(OUTPUT_DIR, out_fn)
                shutil.copy2(stem_path, out_path)
                output_stems[stem_name] = f"/tracks/{out_fn}"

        t_sec = round(time.time() - t_start, 1)
        print(f"[DEMUCS {job_id[:8]}] Done in {t_sec}s — {len(output_stems)} stems | {duration_sec}s audio")

        return {
            "status": "ok",
            "job_id": job_id,
            "model": model,
            "mode": mode,
            "stems": output_stems,
            "duration_sec": duration_sec,
            "processing_time_sec": t_sec,
            "metadata": {
                "input_file": file.filename,
                "input_size_mb": file_size_mb,
                "device": hw["device"],
                "created_at": datetime.now().isoformat(),
            },
        }

    except Exception as e:
        import traceback
        return JSONResponse(status_code=500, content={"error": str(e), "traceback": traceback.format_exc()})
    finally:
        shutil.rmtree(job_dir, ignore_errors=True)


# ──────────────────────────────────────────────────────────────────────────────
# BPM & Key Detection
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/detect_bpm_key")
async def detect_bpm_key(file: UploadFile = File(...)):
    """Detect BPM, musical key, time signature and duration from uploaded audio."""
    try:
        import librosa

        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        y, sr = librosa.load(tmp_path, sr=None, duration=30)
        os.unlink(tmp_path)

        # BPM Detection
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        bpm = round(float(tempo), 1)

        # Key Detection (Krumhansl-Schmuckler profiles)
        major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
        minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

        chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
        avg_chroma = np.mean(chroma, axis=1)

        note_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

        best_score = -np.inf
        best_key = "C major"

        for i in range(12):
            rotated_major = np.roll(major_profile, i)
            rotated_minor = np.roll(minor_profile, i)

            score_major = np.corrcoef(avg_chroma, rotated_major)[0, 1]
            score_minor = np.corrcoef(avg_chroma, rotated_minor)[0, 1]

            if score_major > best_score:
                best_score = score_major
                best_key = f"{note_names[i]} major"
            if score_minor > best_score:
                best_score = score_minor
                best_key = f"{note_names[i]} minor"

        # Time Signature Estimation (simplified)
        # Analyze beat strength patterns
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
        
        # Calculate beat intervals
        if len(beats) > 1:
            beat_intervals = np.diff(beats)
            # Check for common time signatures
            # 4/4: Most common, even intervals
            # 3/4: Waltz pattern (strong-weak-weak)
            # 6/8: Compound duple (two groups of three)
            
            # Simple heuristic: variance in beat strength
            beat_strength = onset_env[beats.astype(int)]
            variance = np.var(beat_strength)
            
            if variance < 0.1:
                time_sig = "4"  # 4/4 - most common
            elif variance < 0.3:
                time_sig = "3"  # 3/4 - waltz
            else:
                time_sig = "4"  # Default to 4/4
        else:
            time_sig = "4"

        # Duration
        duration = round(librosa.get_duration(y=y, sr=sr), 1)

        return {
            "bpm": bpm,
            "key": best_key,
            "time_signature": time_sig,
            "duration": duration,
            "status": "ok"
        }

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


# ──────────────────────────────────────────────────────────────────────────────
# System Utilities
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/hardware")
def hardware_info():
    return hw


@app.get("/vram_usage")
def vram_usage():
    if not torch.cuda.is_available():
        return {"available": False, "used_gb": 0, "total_gb": 0, "pct": 0}
    used  = torch.cuda.memory_allocated() / (1024**3)
    total = torch.cuda.get_device_properties(0).total_memory / (1024**3)
    return {
        "available": True,
        "used_gb":   round(used, 2),
        "total_gb":  round(total, 2),
        "pct":       round(used / total * 100, 1) if total > 0 else 0,
    }


@app.get("/clear_cache")
def clear_cache():
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    return {"status": "ok", "message": "GPU cache cleared"}


@app.get("/clean_temp_files")
async def clean_temp_files():
    """Clean temporary output files from ACE-Step and backend."""
    import shutil
    import asyncio
    
    temp_folders = [
        r"D:\VocalForge\ace-step\.cache\acestep\tmp\api_audio",
        r"D:\VocalForge\backend\output",
    ]
    
    results = []
    total_cleaned = 0
    
    for folder_path in temp_folders:
        try:
            if os.path.exists(folder_path):
                # Count files before cleaning
                file_count = 0
                total_size = 0
                for root, dirs, files in os.walk(folder_path):
                    for f in files:
                        file_count += 1
                        fp = os.path.join(root, f)
                        try:
                            total_size += os.path.getsize(fp)
                        except:
                            pass
                
                # Clean the folder contents but keep the folder itself
                for item in os.listdir(folder_path):
                    item_path = os.path.join(folder_path, item)
                    try:
                        if os.path.isfile(item_path):
                            os.remove(item_path)
                            total_cleaned += 1
                        elif os.path.isdir(item_path):
                            shutil.rmtree(item_path)
                            total_cleaned += 1
                    except Exception as e:
                        results.append({"folder": folder_path, "status": "error", "message": str(e)})
                        continue
                
                results.append({
                    "folder": folder_path,
                    "status": "cleaned",
                    "files_removed": file_count,
                    "size_freed_mb": round(total_size / (1024 * 1024), 2)
                })
            else:
                results.append({"folder": folder_path, "status": "not_found"})
        except Exception as e:
            results.append({"folder": folder_path, "status": "error", "message": str(e)})
    
    return {
        "status": "ok",
        "message": f"Cleaned {total_cleaned} temp files",
        "results": results,
        "total_cleaned": total_cleaned
    }


@app.get("/unload_models")
def unload_all_models():
    for svc in _svc_cache.values():
        try:
            svc.unload()
        except Exception:
            pass
    _svc_cache.clear()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    return {"status": "ok", "message": "All models unloaded"}


@app.get("/health")
def health():
    return {
        "status":   "ok",
        "version":  "1.7",
        "device":   hw["device"],
        "vram_gb":  hw["vram_gb"],
        "models_loaded": list(_svc_cache.keys()),
    }


# ──────────────────────────────────────────────────────────────────────────────
# Segment-by-segment streaming endpoint
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/process_cover_stream")
async def process_cover_stream(
    file: UploadFile = File(...),
    model_id: str = Form(...),
    speaker: str = Form(""),
    pitch: int = Form(0),
    slice_db: int = Form(-40),
    noise_scale: float = Form(0.4),
    f0_predictor: str = Form("pm"),
    vocal_gain: float = Form(1.0),
    instrumental_gain: float = Form(1.0),
    segment_minutes: float = Form(1.0),
):
    """
    Streaming cover pipeline: processes audio in N-minute segments.
    Each segment is saved as a separate WAV and sent via SSE as soon as ready.
    Frontend can play segments immediately without waiting for full track.
    """
    job_id = uuid.uuid4().hex
    job_dir = os.path.join(TEMP_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)

    _jobs[job_id] = {"step": "Starting...", "pct": 0, "logs": [], "done": False, "result": None, "error": None, "segments": []}

    async def stream_gen():
        import librosa

        try:
            # Save uploaded file
            _job_log(job_id, f"Received: {file.filename}", pct=2)
            in_path = os.path.join(job_dir, "input.wav")
            raw_bytes = await file.read()
            with open(in_path, "wb") as f_out:
                f_out.write(raw_bytes)

            # Load full audio
            _job_log(job_id, "Loading audio...", pct=5)
            y, sr = librosa.load(in_path, sr=None, mono=True)
            total_duration = len(y) / sr
            _job_log(job_id, f"Total duration: {round(total_duration, 1)}s", pct=7)

            # Separate vocals once for full track
            _job_log(job_id, "Step 1/3 — Separating vocals (demucs)...", pct=10)
            t1 = time.time()
            vocals_path, instrumental_path = separate_vocals(in_path, job_dir)
            _job_log(job_id, f"Separation done in {round(time.time()-t1,1)}s", pct=30)

            # Load separated tracks
            vocals_full, v_sr = sf.read(vocals_path, dtype="float32")
            if vocals_full.ndim > 1:
                vocals_full = np.mean(vocals_full, axis=1)
            instr_full, i_sr = sf.read(instrumental_path, dtype="float32")
            if instr_full.ndim > 1:
                instr_full = np.mean(instr_full, axis=1)

            # Resample instrumental to match vocals SR
            if i_sr != v_sr:
                instr_full = librosa.resample(instr_full, orig_sr=i_sr, target_sr=v_sr)

            # Split into segments
            seg_samples = int(segment_minutes * 60 * v_sr)
            n_segments = max(1, int(np.ceil(len(vocals_full) / seg_samples)))
            _job_log(job_id, f"Processing {n_segments} segment(s) of {segment_minutes}min each", pct=32)

            svc = _get_svc(model_id)
            spk = speaker or (svc.speakers[0] if svc.speakers else "default")

            all_segments = []
            for seg_idx in range(n_segments):
                seg_start = seg_idx * seg_samples
                seg_end = min(seg_start + seg_samples, len(vocals_full))
                vocals_seg = vocals_full[seg_start:seg_end]
                instr_seg = instr_full[seg_start:seg_end]

                pct_base = 32 + int((seg_idx / n_segments) * 55)
                _job_log(job_id, f"Segment {seg_idx+1}/{n_segments} — voice conversion...", pct=pct_base)

                # Write segment vocals to temp file
                seg_vocals_path = os.path.join(job_dir, f"seg_{seg_idx}_vocals.wav")
                sf.write(seg_vocals_path, vocals_seg, v_sr)

                # Convert segment
                t_seg = time.time()
                converted_seg, conv_sr = svc.convert(
                    audio_path=seg_vocals_path,
                    speaker=spk,
                    pitch_shift=pitch,
                    slice_db=slice_db,
                    noise_scale=noise_scale,
                    f0_predictor=f0_predictor,
                )
                _job_log(job_id, f"Segment {seg_idx+1} converted in {round(time.time()-t_seg,1)}s", pct=pct_base+5)

                # Resample instrumental segment if needed
                if conv_sr != v_sr:
                    instr_seg = librosa.resample(instr_seg, orig_sr=v_sr, target_sr=conv_sr)

                # Mix segment
                min_len = min(len(converted_seg), len(instr_seg))
                mixed_seg = converted_seg[:min_len] * vocal_gain + instr_seg[:min_len] * instrumental_gain
                peak = np.max(np.abs(mixed_seg))
                if peak > 1.0:
                    mixed_seg = mixed_seg / peak * 0.95

                # Save segment
                seg_filename = f"{job_id}_seg{seg_idx:02d}.wav"
                seg_path = os.path.join(OUTPUT_DIR, seg_filename)
                sf.write(seg_path, mixed_seg, conv_sr)
                all_segments.append(seg_filename)

                seg_duration = round(len(mixed_seg) / conv_sr, 2)
                _job_log(job_id, f"Segment {seg_idx+1} ready: {seg_filename} ({seg_duration}s)", pct=pct_base+8)

                # Emit segment event
                payload = {
                    "type": "segment",
                    "segment_idx": seg_idx,
                    "total_segments": n_segments,
                    "filename": seg_filename,
                    "url": f"/tracks/{seg_filename}",
                    "duration_sec": seg_duration,
                    "pct": pct_base + 8,
                    "logs": _jobs[job_id]["logs"][-3:],
                }
                yield f"data: {json.dumps(payload)}\n\n"
                await asyncio.sleep(0)  # yield control

            # All segments done — emit final event
            _job_log(job_id, f"All {n_segments} segments done!", pct=100)
            _jobs[job_id]["done"] = True
            _jobs[job_id]["segments"] = all_segments

            final_payload = {
                "type": "done",
                "segments": all_segments,
                "urls": [f"/tracks/{s}" for s in all_segments],
                "total_segments": n_segments,
                "speaker": spk,
                "pct": 100,
                "logs": _jobs[job_id]["logs"][-5:],
            }
            yield f"data: {json.dumps(final_payload)}\n\n"

        except Exception as e:
            import traceback
            err_msg = str(e)
            _jobs[job_id]["error"] = err_msg
            _jobs[job_id]["done"] = True
            yield f"data: {json.dumps({'type': 'error', 'error': err_msg, 'traceback': traceback.format_exc()})}\n\n"
        finally:
            shutil.rmtree(job_dir, ignore_errors=True)

    # Return job_id immediately in header, then stream
    return StreamingResponse(
        stream_gen(),
        media_type="text/event-stream",
        headers={"X-Job-Id": job_id},
    )


# ──────────────────────────────────────────────────────────────────────────────
# Full pipeline with AudioEngine (Morph + Harmony + Mastering)
# ──────────────────────────────────────────────────────────────────────────────

def _run_audio_engine(audio_np: np.ndarray, sr: int, engine_config: dict, job_id: str = None) -> tuple[np.ndarray, dict]:
    """
    Run the VocalForge AudioEngine pipeline on a numpy audio array.
    Returns (processed_audio_np, metadata_dict).
    """
    sys.path.insert(0, os.path.join(BASE_DIR, ".."))  # add project root

    from core.engine import AudioEngine
    from core.modules.morph_module import MorphModule
    from core.modules.harmony_module import HarmonyModule
    from core.modules.mastering_module import MasteringModule

    engine = AudioEngine(logging_mode="full", device=hw["device"])

    # Register modules based on hardware mode
    morph = MorphModule()
    morph.initialize(engine_config.get("Morph", {}))
    engine.register_module(morph)

    harmony = HarmonyModule()
    engine.register_module(harmony)

    mastering = MasteringModule()
    engine.register_module(mastering)

    import torch
    track = {
        "audio": torch.tensor(audio_np, dtype=torch.float32),
        "sample_rate": sr,
        "metadata": {"history": [], "job_id": job_id or ""},
    }

    result = engine.run(track, engine_config)

    out_audio = result["audio"]
    if isinstance(out_audio, torch.Tensor):
        out_audio = out_audio.cpu().numpy()

    meta = result.get("metadata", {})
    return out_audio, meta


@app.post("/process_cover_full")
async def process_cover_full(
    file: UploadFile = File(...),
    model_id: str = Form(...),
    speaker: str = Form(""),
    pitch: int = Form(0),
    slice_db: int = Form(-40),
    noise_scale: float = Form(0.4),
    f0_predictor: str = Form("pm"),
    vocal_gain: float = Form(1.0),
    instrumental_gain: float = Form(1.0),
    # AudioEngine params
    gender_shift: float = Form(0.0),
    style_shift: float = Form(0.0),
    harmony_factor: float = Form(1.05),
    mastering_drive: float = Form(1.0),
    use_morph: bool = Form(True),
    use_harmony: bool = Form(True),
    use_mastering: bool = Form(True),
):
    """
    Full pipeline with AudioEngine post-processing:
    1. Demucs: separate vocals
    2. so-vits-svc: voice conversion
    3. AudioEngine: Morph → Harmony → Mastering
    4. Mix with instrumental
    """
    job_id = uuid.uuid4().hex
    job_dir = os.path.join(TEMP_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)

    _jobs[job_id] = {"step": "Starting...", "pct": 0, "logs": [], "done": False, "result": None, "error": None}
    t_total = time.time()

    try:
        # Save file
        _job_log(job_id, f"Received: {file.filename}", pct=2)
        in_path = os.path.join(job_dir, "input.wav")
        raw_bytes = await file.read()
        with open(in_path, "wb") as f_out:
            f_out.write(raw_bytes)
        file_size_mb = round(len(raw_bytes) / 1024 / 1024, 2)
        _job_log(job_id, f"File saved ({file_size_mb} MB)", pct=5)

        # Step 1: Demucs
        _job_log(job_id, "Step 1/4 — Separating vocals (demucs)...", pct=10)
        t1 = time.time()
        vocals_path, instrumental_path = separate_vocals(in_path, job_dir)
        t1_sec = round(time.time() - t1, 1)
        _job_log(job_id, f"Separation done in {t1_sec}s", pct=30)

        # Step 2: so-vits-svc
        _job_log(job_id, f"Step 2/4 — Voice conversion (model={model_id})...", pct=35)
        t2 = time.time()
        svc = _get_svc(model_id)
        spk = speaker or (svc.speakers[0] if svc.speakers else "default")
        _job_log(job_id, f"Speaker: {spk}", pct=37)

        converted_audio, converted_sr = svc.convert(
            audio_path=vocals_path,
            speaker=spk,
            pitch_shift=pitch,
            slice_db=slice_db,
            noise_scale=noise_scale,
            f0_predictor=f0_predictor,
        )
        t2_sec = round(time.time() - t2, 1)
        _job_log(job_id, f"Voice conversion done in {t2_sec}s", pct=60)

        # Step 3: AudioEngine (Morph + Harmony + Mastering)
        _job_log(job_id, "Step 3/4 — AudioEngine (Morph → Harmony → Mastering)...", pct=65)
        t3 = time.time()

        engine_config = {
            "Morph": {
                "gender_shift": gender_shift,
                "style_shift": style_shift,
                "pitch": 0,  # pitch already applied in sovits
            },
            "Harmony": {"factor": harmony_factor},
            "Mastering": {"drive": mastering_drive},
        }

        processed_vocals, engine_meta = _run_audio_engine(
            converted_audio, converted_sr, engine_config, job_id=job_id
        )
        t3_sec = round(time.time() - t3, 1)
        engine_history = engine_meta.get("history", [])
        _job_log(job_id, f"AudioEngine done in {t3_sec}s | steps: {len(engine_history)}", pct=80)
        for h in engine_history:
            _job_log(job_id, f"  → {h}")

        # Step 4: Mix
        _job_log(job_id, "Step 4/4 — Mixing with instrumental...", pct=85)
        t4 = time.time()
        instrumental_audio, instrumental_sr = sf.read(instrumental_path, dtype="float32")
        if instrumental_audio.ndim > 1:
            instrumental_audio = np.mean(instrumental_audio, axis=1)

        mixed, out_sr = mix_audio(
            vocals=processed_vocals,
            instrumental=instrumental_audio,
            sr_v=converted_sr,
            sr_i=instrumental_sr,
            vocal_gain=vocal_gain,
            instrumental_gain=instrumental_gain,
        )
        t4_sec = round(time.time() - t4, 1)
        _job_log(job_id, f"Mix done in {t4_sec}s", pct=92)

        # Save
        out_filename = f"{job_id}_full.{OUTPUT_FORMAT}"
        out_path = os.path.join(OUTPUT_DIR, out_filename)
        final_path, out_size_mb = save_audio(mixed, out_sr, out_path, OUTPUT_FORMAT)
        out_filename = os.path.basename(final_path)
        duration_sec = round(len(mixed) / out_sr, 2)
        t_total_sec = round(time.time() - t_total, 1)

        _job_log(job_id, f"Done! {duration_sec}s | {out_size_mb}MB | total: {t_total_sec}s", pct=100)

        result = {
            "status": "ok",
            "job_id": job_id,
            "filename": out_filename,
            "url": f"/tracks/{out_filename}",
            "speaker": spk,
            "sample_rate": out_sr,
            "duration_sec": duration_sec,
            "metadata": {
                "input_file": file.filename,
                "input_size_mb": file_size_mb,
                "output_size_mb": out_size_mb,
                "model_id": model_id,
                "speaker": spk,
                "pitch": pitch,
                "gender_shift": gender_shift,
                "style_shift": style_shift,
                "harmony_factor": harmony_factor,
                "mastering_drive": mastering_drive,
                "device": hw["device"],
                "engine_history": engine_history,
                "timing": {
                    "demucs_sec": t1_sec,
                    "sovits_sec": t2_sec,
                    "engine_sec": t3_sec,
                    "mix_sec": t4_sec,
                    "total_sec": t_total_sec,
                },
                "created_at": datetime.now().isoformat(),
            },
        }
        _jobs[job_id]["result"] = result
        _jobs[job_id]["done"] = True
        return result

    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        _jobs[job_id]["error"] = str(e)
        _jobs[job_id]["done"] = True
        _job_log(job_id, f"ERROR: {e}")
        return JSONResponse(status_code=500, content={"error": str(e), "traceback": tb, "job_id": job_id})
    finally:
        shutil.rmtree(job_dir, ignore_errors=True)


# ──────────────────────────────────────────────────────────────────────────────
# Karaoke — remove vocals, return instrumental only
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/karaoke")
async def karaoke(
    file: UploadFile = File(...),
    vocal_reduction: float = Form(1.0),  # 1.0 = full removal, 0.0 = keep vocals
):
    """
    Remove vocals from a song using Demucs htdemucs.
    Returns the instrumental (no_vocals) track.
    vocal_reduction: 1.0 = full removal, 0.5 = blend
    """
    job_id = uuid.uuid4().hex
    job_dir = os.path.join(TEMP_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    t_start = time.time()

    try:
        in_path = os.path.join(job_dir, "input.wav")
        raw_bytes = await file.read()
        with open(in_path, "wb") as f_out:
            f_out.write(raw_bytes)
        file_size_mb = round(len(raw_bytes) / 1024 / 1024, 2)
        print(f"[KARAOKE {job_id[:8]}] File: {file.filename} ({file_size_mb}MB)")

        # Separate vocals
        print(f"[KARAOKE {job_id[:8]}] Running demucs...")
        vocals_path, instrumental_path = separate_vocals(in_path, job_dir)

        # Load both tracks
        vocals_audio, v_sr = sf.read(vocals_path, dtype="float32")
        instr_audio, i_sr = sf.read(instrumental_path, dtype="float32")

        if vocals_audio.ndim > 1:
            vocals_audio = np.mean(vocals_audio, axis=1)
        if instr_audio.ndim > 1:
            instr_audio = np.mean(instr_audio, axis=1)

        # Blend: instrumental + (1 - vocal_reduction) * vocals
        import librosa
        if i_sr != v_sr:
            instr_audio = librosa.resample(instr_audio, orig_sr=i_sr, target_sr=v_sr)

        min_len = min(len(vocals_audio), len(instr_audio))
        vocals_audio = vocals_audio[:min_len]
        instr_audio = instr_audio[:min_len]

        # vocal_reduction=1.0 → pure instrumental; 0.0 → original mix
        result_audio = instr_audio + vocals_audio * (1.0 - vocal_reduction)
        peak = np.max(np.abs(result_audio))
        if peak > 1.0:
            result_audio = result_audio / peak * 0.95

        out_filename = f"{job_id}_karaoke.wav"
        out_path = os.path.join(OUTPUT_DIR, out_filename)
        sf.write(out_path, result_audio, v_sr)

        duration_sec = round(len(result_audio) / v_sr, 2)
        t_sec = round(time.time() - t_start, 1)
        out_size_mb = round(os.path.getsize(out_path) / 1024 / 1024, 2)
        print(f"[KARAOKE {job_id[:8]}] Done in {t_sec}s — {duration_sec}s audio")

        return {
            "status": "ok",
            "filename": out_filename,
            "url": f"/tracks/{out_filename}",
            "duration_sec": duration_sec,
            "processing_time_sec": t_sec,
            "vocal_reduction": vocal_reduction,
            "metadata": {
                "input_file": file.filename,
                "input_size_mb": file_size_mb,
                "output_size_mb": out_size_mb,
                "device": hw["device"],
                "created_at": datetime.now().isoformat(),
            },
        }

    except Exception as e:
        import traceback
        return JSONResponse(status_code=500, content={"error": str(e), "traceback": traceback.format_exc()})
    finally:
        shutil.rmtree(job_dir, ignore_errors=True)


# ──────────────────────────────────────────────────────────────────────────────
# Lyrics Cover — TTS from lyrics → so-vits-svc → mix with uploaded instrumental
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/lyrics_cover")
async def lyrics_cover(
    file: UploadFile = File(...),
    model_id: str = Form(...),
    speaker: str = Form(""),
    lyrics: str = Form(...),
    pitch: int = Form(0),
    noise_scale: float = Form(0.4),
    f0_predictor: str = Form("pm"),
    vocal_gain: float = Form(1.4),
    instrumental_gain: float = Form(0.85),
    tts_lang: str = Form("ro-RO"),
    tts_rate: str = Form("+0%"),
    time_stretch: bool = Form(True),   # stretch vocals to match song duration
    reverb_mix: float = Form(0.15),    # subtle reverb on vocals (0=dry, 1=wet)
):
    """
    Lyrics-to-cover pipeline (SUNO-style):
    1. Demucs: extract instrumental from uploaded song
    2. Edge-TTS: synthesize lyrics as speech
    3. so-vits-svc: convert TTS voice to target voice model
    4. Time-stretch vocals to match instrumental duration
    5. Apply subtle reverb + EQ blend
    6. Mix converted vocals with instrumental
    """
    job_id = uuid.uuid4().hex
    job_dir = os.path.join(TEMP_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    t_total = time.time()

    try:
        import librosa
        import librosa.effects

        # Save uploaded song
        in_path = os.path.join(job_dir, "input.wav")
        raw_bytes = await file.read()
        with open(in_path, "wb") as f_out:
            f_out.write(raw_bytes)
        file_size_mb = round(len(raw_bytes) / 1024 / 1024, 2)
        print(f"[LYRICS {job_id[:8]}] File: {file.filename} ({file_size_mb}MB) | lyrics: {len(lyrics)} chars")

        # Step 1: Extract instrumental
        print(f"[LYRICS {job_id[:8]}] Step 1/5 — Demucs separation...")
        t1 = time.time()
        _, instrumental_path = separate_vocals(in_path, job_dir)
        t1_sec = round(time.time() - t1, 1)

        # Load instrumental to get duration
        instr_audio, instr_sr = sf.read(instrumental_path, dtype="float32")
        if instr_audio.ndim > 1:
            instr_audio = np.mean(instr_audio, axis=1)
        instr_duration = len(instr_audio) / instr_sr
        print(f"[LYRICS {job_id[:8]}] Instrumental: {round(instr_duration,1)}s | separation: {t1_sec}s")

        # Step 2: TTS — synthesize lyrics
        print(f"[LYRICS {job_id[:8]}] Step 2/5 — TTS synthesis (lang={tts_lang})...")
        t2 = time.time()
        tts_path = os.path.join(job_dir, "tts_output.wav")

        voice_map = {
            "ro-RO": "ro-RO-EmilNeural",
            "en-US": "en-US-GuyNeural",
            "en-GB": "en-GB-RyanNeural",
            "fr-FR": "fr-FR-HenriNeural",
            "de-DE": "de-DE-ConradNeural",
            "es-ES": "es-ES-AlvaroNeural",
            "it-IT": "it-IT-DiegoNeural",
            "ja-JP": "ja-JP-KeitaNeural",
        }

        try:
            import edge_tts
            voice = voice_map.get(tts_lang, "en-US-GuyNeural")
            communicate = edge_tts.Communicate(lyrics, voice, rate=tts_rate)
            await communicate.save(tts_path)
        except ImportError:
            try:
                import pyttsx3
                eng = pyttsx3.init()
                eng.save_to_file(lyrics, tts_path)
                eng.runAndWait()
            except Exception as tts_err:
                raise RuntimeError(f"TTS failed: {tts_err}")

        if not os.path.exists(tts_path) or os.path.getsize(tts_path) < 1000:
            raise RuntimeError("TTS output file is empty or missing")

        t2_sec = round(time.time() - t2, 1)
        print(f"[LYRICS {job_id[:8]}] TTS done in {t2_sec}s")

        # Step 3: so-vits-svc voice conversion on TTS output
        print(f"[LYRICS {job_id[:8]}] Step 3/5 — Voice conversion (model={model_id})...")
        t3 = time.time()
        svc = _get_svc(model_id)
        spk = speaker or (svc.speakers[0] if svc.speakers else "default")

        converted_audio, converted_sr = svc.convert(
            audio_path=tts_path,
            speaker=spk,
            pitch_shift=pitch,
            noise_scale=noise_scale,
            f0_predictor=f0_predictor,
        )
        t3_sec = round(time.time() - t3, 1)
        print(f"[LYRICS {job_id[:8]}] Voice conversion done in {t3_sec}s")

        # Step 4: Time-stretch vocals to match instrumental duration
        print(f"[LYRICS {job_id[:8]}] Step 4/5 — Time-stretch + blend...")
        t4 = time.time()

        vocals = converted_audio.astype(np.float32)
        vocal_duration = len(vocals) / converted_sr

        if time_stretch and abs(vocal_duration - instr_duration) > 0.5:
            # Clamp stretch ratio to reasonable range (0.5x - 2.0x)
            stretch_ratio = instr_duration / vocal_duration
            stretch_ratio = max(0.5, min(2.0, stretch_ratio))
            print(f"[LYRICS {job_id[:8]}] Stretching vocals {round(vocal_duration,1)}s → {round(instr_duration,1)}s (ratio={round(stretch_ratio,3)})")
            vocals = librosa.effects.time_stretch(vocals, rate=stretch_ratio)

        # Resample instrumental to match vocals SR if needed
        if instr_sr != converted_sr:
            instr_audio = librosa.resample(instr_audio, orig_sr=instr_sr, target_sr=converted_sr)
            instr_sr = converted_sr

        # Pad or trim vocals to match instrumental length
        instr_len = len(instr_audio)
        vocal_len = len(vocals)
        if vocal_len < instr_len:
            # Pad with silence at end
            vocals = np.pad(vocals, (0, instr_len - vocal_len), mode="constant")
        elif vocal_len > instr_len:
            vocals = vocals[:instr_len]

        # Subtle reverb via simple convolution (delay + decay)
        if reverb_mix > 0:
            delay_samples = int(0.03 * converted_sr)  # 30ms delay
            decay = 0.4
            reverb_tail = np.zeros_like(vocals)
            if delay_samples < len(vocals):
                reverb_tail[delay_samples:] = vocals[:-delay_samples] * decay
            vocals_wet = vocals + reverb_tail * reverb_mix
            vocals = vocals_wet * (1 - reverb_mix * 0.3) + vocals * (reverb_mix * 0.3)

        # Normalize vocals
        v_peak = np.max(np.abs(vocals))
        if v_peak > 1e-8:
            vocals = vocals / v_peak * 0.85

        # Mix
        mixed = vocals * vocal_gain + instr_audio * instrumental_gain
        peak = np.max(np.abs(mixed))
        if peak > 1.0:
            mixed = mixed / peak * 0.95

        t4_sec = round(time.time() - t4, 1)
        print(f"[LYRICS {job_id[:8]}] Blend done in {t4_sec}s")

        out_filename = f"{job_id}_lyrics_cover.wav"
        out_path = os.path.join(OUTPUT_DIR, out_filename)
        sf.write(out_path, mixed, converted_sr)

        duration_sec = round(len(mixed) / converted_sr, 2)
        t_total_sec = round(time.time() - t_total, 1)
        out_size_mb = round(os.path.getsize(out_path) / 1024 / 1024, 2)
        print(f"[LYRICS {job_id[:8]}] Done in {t_total_sec}s — {duration_sec}s audio")

        return {
            "status": "ok",
            "job_id": job_id,
            "filename": out_filename,
            "url": f"/tracks/{out_filename}",
            "speaker": spk,
            "duration_sec": duration_sec,
            "metadata": {
                "input_file": file.filename,
                "input_size_mb": file_size_mb,
                "output_size_mb": out_size_mb,
                "model_id": model_id,
                "speaker": spk,
                "pitch": pitch,
                "tts_lang": tts_lang,
                "lyrics_chars": len(lyrics),
                "time_stretch": time_stretch,
                "reverb_mix": reverb_mix,
                "device": hw["device"],
                "timing": {
                    "demucs_sec": t1_sec,
                    "tts_sec": t2_sec,
                    "sovits_sec": t3_sec,
                    "blend_sec": t4_sec,
                    "total_sec": t_total_sec,
                },
                "created_at": datetime.now().isoformat(),
            },
        }

    except Exception as e:
        import traceback
        return JSONResponse(status_code=500, content={"error": str(e), "traceback": traceback.format_exc()})
    finally:
        shutil.rmtree(job_dir, ignore_errors=True)


# ──────────────────────────────────────────────────────────────────────────────
# ACE-Step v1.5 — proxy endpoints to ACE-Step API server (port 8001)
# ──────────────────────────────────────────────────────────────────────────────

ACE_STEP_API = "http://localhost:8001"

@app.get("/ace_health")
async def ace_health():
    """Check if ACE-Step API server is running."""
    try:
        import httpx
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"{ACE_STEP_API}/health")
            return {"online": True, "status": r.json()}
    except Exception as e:
        return {"online": False, "error": str(e)}


@app.get("/acestep_genre_presets")
async def acestep_genre_presets():
    """
    Return genre presets for ACE-Step text-to-music generation.
    Returns categorized genre presets with prompts, BPM, and negative prompts.
    """
    # Comprehensive genre presets organized by category
    genre_presets = {
        "version": 1,
        "genres": {
            "Hip-Hop": [
                {"label": "Hip-Hop", "cat": "Hip-Hop", "prompt": "hip hop, boom bap drums, sampled beats, lyrical flow, classic 90s production, East Coast style, punchy kicks, soul samples", "bpm": 92, "negative_prompt": "orchestral, EDM four-on-the-floor, cheesy pop chorus, country twang, metal distortion", "instrumental": False},
                {"label": "Trap", "cat": "Hip-Hop", "prompt": "trap music, booming 808 sub-bass, rapid hi-hat rolls, dark atmospheric synths, modern trap production, Southern hip hop", "bpm": 140, "negative_prompt": "jazz swing, orchestral, acoustic guitar, reggae skank, smooth R&B", "instrumental": False},
                {"label": "Drill", "cat": "Hip-Hop", "prompt": "drill music, dark sliding 808s, aggressive trap drums, menacing atmosphere, UK or Chicago drill", "bpm": 143, "negative_prompt": "bright pop, jazz, reggae groove, uplifting chords, orchestral", "instrumental": False},
                {"label": "Lo-fi Hip-Hop", "cat": "Hip-Hop", "prompt": "lo-fi hip hop, chill beats, vinyl crackle, jazz samples, relaxing study music, mellow", "bpm": 72, "negative_prompt": "aggressive distortion, EDM drop, metal, bright polished mix", "instrumental": True},
                {"label": "Boom Bap", "cat": "Hip-Hop", "prompt": "boom bap hip hop, classic 90s rap, punchy drums, jazz samples, lyrical flow, East Coast", "bpm": 90, "negative_prompt": "EDM four-on-the-floor, trap hi-hat rolls, dubstep, glossy autotune", "instrumental": False},
            ],
            "Electronic": [
                {"label": "House", "cat": "Electronic", "prompt": "house music, four-on-the-floor kick, funky bassline, soulful vocals, disco samples, club energy", "bpm": 124, "negative_prompt": "metal guitars, orchestral, slow ballad, trap 808", "instrumental": False},
                {"label": "Techno", "cat": "Electronic", "prompt": "techno music, repetitive synth loops, industrial sounds, dark atmosphere, Berlin style", "bpm": 135, "negative_prompt": "acoustic instruments, pop chorus, jazz, orchestral", "instrumental": True},
                {"label": "Drum & Bass", "cat": "Electronic", "prompt": "drum and bass, fast breakbeats, heavy bass, jungle rhythms, liquid DnB, atmospheric", "bpm": 174, "negative_prompt": "slow tempo, orchestral, acoustic ballad, country", "instrumental": True},
                {"label": "Dubstep", "cat": "Electronic", "prompt": "dubstep, heavy wobble bass, half-time drums, dark atmosphere, UK bass music", "bpm": 140, "negative_prompt": "bright pop, acoustic guitar, jazz swing, orchestral", "instrumental": True},
                {"label": "Trance", "cat": "Electronic", "prompt": "trance music, uplifting melodies, progressive build-ups, euphoric drops, atmospheric pads", "bpm": 138, "negative_prompt": "metal distortion, acoustic folk, jazz trio, orchestral waltz", "instrumental": True},
            ],
            "Rock": [
                {"label": "Alternative Rock", "cat": "Rock", "prompt": "alternative rock, electric guitars, dynamic drums, emotional vocals, 90s grunge influence", "bpm": 120, "negative_prompt": "orchestral strings, EDM drop, trap 808, smooth jazz", "instrumental": False},
                {"label": "Hard Rock", "cat": "Rock", "prompt": "hard rock, heavy guitar riffs, powerful drums, aggressive vocals, classic rock energy", "bpm": 128, "negative_prompt": "synth pop, orchestral, trap beats, smooth R&B", "instrumental": False},
                {"label": "Indie Rock", "cat": "Rock", "prompt": "indie rock, jangly guitars, lo-fi production, melodic bass, laid-back vocals, bedroom pop influence", "bpm": 115, "negative_prompt": "metal distortion, EDM, orchestral, autotune", "instrumental": False},
                {"label": "Pop Punk", "cat": "Rock", "prompt": "pop punk, fast power chords, energetic drums, catchy hooks, emo influence, 2000s style", "bpm": 150, "negative_prompt": "orchestral, jazz, smooth R&B, trap 808", "instrumental": False},
            ],
            "Pop": [
                {"label": "Pop", "cat": "Pop", "prompt": "pop music, catchy chorus, modern production, radio-friendly, upbeat melody, contemporary", "bpm": 120, "negative_prompt": "metal distortion, orchestral epic, harsh noise, experimental", "instrumental": False},
                {"label": "Synth Pop", "cat": "Pop", "prompt": "synth pop, 80s synthesizers, electronic drums, catchy hooks, new wave influence, retro futuristic", "bpm": 118, "negative_prompt": "acoustic guitar, metal, orchestral, trap 808", "instrumental": False},
                {"label": "Dance Pop", "cat": "Pop", "prompt": "dance pop, electronic production, four-on-the-floor, catchy hooks, club energy, radio-friendly", "bpm": 122, "negative_prompt": "slow ballad, metal, orchestral, jazz", "instrumental": False},
            ],
            "R&B/Soul": [
                {"label": "R&B", "cat": "R&B/Soul", "prompt": "R&B music, smooth vocals, soulful melodies, 808 bass, atmospheric production, contemporary", "bpm": 95, "negative_prompt": "metal screaming, orchestral, fast punk, harsh distortion", "instrumental": False},
                {"label": "Soul", "cat": "R&B/Soul", "prompt": "soul music, warm vocals, live instruments, horns, emotional delivery, classic Motown influence", "bpm": 88, "negative_prompt": "EDM drop, trap 808, metal distortion, autotune", "instrumental": False},
                {"label": "Neo-Soul", "cat": "R&B/Soul", "prompt": "neo soul, jazzy chords, laid-back groove, smooth vocals, hip hop influence, organic production", "bpm": 85, "negative_prompt": "metal, EDM, trap, harsh electronic", "instrumental": False},
            ],
            "Jazz": [
                {"label": "Jazz", "cat": "Jazz", "prompt": "jazz music, saxophone, piano, upright bass, swing drums, improvisation, classic jazz", "bpm": 120, "negative_prompt": "EDM four-on-the-floor, trap hi-hats, metal distortion, autotune", "instrumental": True},
                {"label": "Smooth Jazz", "cat": "Jazz", "prompt": "smooth jazz, mellow saxophone, soft piano, gentle drums, relaxing atmosphere", "bpm": 85, "negative_prompt": "aggressive metal, trap 808, EDM drop, harsh noise", "instrumental": True},
                {"label": "Jazz Fusion", "cat": "Jazz", "prompt": "jazz fusion, electric guitar, complex time signatures, funk influence, virtuosic playing", "bpm": 110, "negative_prompt": "simple pop structure, trap beats, EDM, orchestral", "instrumental": True},
            ],
            "Classical": [
                {"label": "Classical", "cat": "Classical", "prompt": "classical music, orchestral strings, piano, woodwinds, epic composition, cinematic", "bpm": 90, "negative_prompt": "electronic drums, trap 808, metal distortion, EDM", "instrumental": True},
                {"label": "Cinematic", "cat": "Classical", "prompt": "cinematic orchestral, epic strings, brass, percussion, dramatic build-ups, film score", "bpm": 100, "negative_prompt": "pop structure, trap beats, EDM drop, metal", "instrumental": True},
                {"label": "Piano Solo", "cat": "Classical", "prompt": "solo piano, classical composition, emotional melody, virtuosic playing, intimate atmosphere", "bpm": 80, "negative_prompt": "electronic production, drums, metal, EDM", "instrumental": True},
            ],
            "Latin": [
                {"label": "Reggaeton", "cat": "Latin", "prompt": "reggaeton, dembow rhythm, 808 bass, urban Latin, Spanish vocals, dance energy", "bpm": 95, "negative_prompt": "orchestral, metal, jazz, EDM four-on-the-floor", "instrumental": False},
                {"label": "Latin Pop", "cat": "Latin", "prompt": "Latin pop, Spanish vocals, catchy melody, guitar, percussion, romantic atmosphere", "bpm": 110, "negative_prompt": "metal distortion, trap 808, orchestral, harsh electronic", "instrumental": False},
                {"label": "Salsa", "cat": "Latin", "prompt": "salsa music, congas, timbales, brass section, piano montuno, Afro-Cuban rhythms", "bpm": 180, "negative_prompt": "EDM, metal, trap, electronic production", "instrumental": True},
            ],
            "Romanian": [
                {"label": "Manele", "cat": "Romanian", "prompt": "Romanian manele, accordion, oriental synth, Balkan rhythm, party music, Turkish hicaz scale", "bpm": 112, "negative_prompt": "trap 808 dominance, metal distortion, EDM drop, dubstep", "instrumental": False},
                {"label": "Pop Românesc", "cat": "Romanian", "prompt": "Romanian pop modern, contemporary production, catchy melody, radio Romania", "bpm": 120, "negative_prompt": "metal screaming, dark trap, orchestral epic, harsh distortion", "instrumental": False},
                {"label": "Hip-Hop Românesc", "cat": "Romanian", "prompt": "Romanian hip hop, rap in Romanian, urban beat, street lyrics", "bpm": 92, "negative_prompt": "orchestral, EDM four-on-the-floor, smooth jazz, country", "instrumental": False},
                {"label": "Muzică Populară", "cat": "Romanian", "prompt": "Romanian popular music, flute, violin, accordion, traditional rhythm, folk", "bpm": 95, "negative_prompt": "trap beats, EDM, metal, autotune, electronic drop", "instrumental": False},
            ],
            "Metal": [
                {"label": "Heavy Metal", "cat": "Metal", "prompt": "heavy metal, distorted guitar riffs, powerful drums, aggressive vocals, classic metal", "bpm": 140, "negative_prompt": "smooth jazz, pop chorus, orchestral strings, trap 808", "instrumental": False},
                {"label": "Metalcore", "cat": "Metal", "prompt": "metalcore, breakdowns, screaming vocals, melodic guitar leads, heavy drums", "bpm": 160, "negative_prompt": "smooth jazz, pop ballad, orchestral, EDM", "instrumental": False},
                {"label": "Death Metal", "cat": "Metal", "prompt": "death metal, growled vocals, fast blast beats, heavy distortion, dark atmosphere", "bpm": 180, "negative_prompt": "pop melody, jazz swing, orchestral, clean vocals", "instrumental": False},
            ],
            "Ambient": [
                {"label": "Ambient", "cat": "Ambient", "prompt": "ambient music, atmospheric pads, drone sounds, relaxing, meditative, ethereal", "bpm": 60, "negative_prompt": "aggressive drums, metal guitars, trap 808, EDM drop", "instrumental": True},
                {"label": "Chillout", "cat": "Ambient", "prompt": "chillout music, downtempo beats, soft pads, relaxing atmosphere, lounge style", "bpm": 90, "negative_prompt": "aggressive metal, fast punk, trap, harsh EDM", "instrumental": True},
                {"label": "Dark Ambient", "cat": "Ambient", "prompt": "dark ambient, ominous drones, eerie sounds, atmospheric horror, cinematic tension", "bpm": 50, "negative_prompt": "bright pop, upbeat melody, jazz, orchestral", "instrumental": True},
            ],
            "Country": [
                {"label": "Country", "cat": "Country", "prompt": "country music, acoustic guitar, fiddle, storytelling lyrics, Southern US style", "bpm": 110, "negative_prompt": "EDM drop, trap 808, metal distortion, orchestral", "instrumental": False},
                {"label": "Bluegrass", "cat": "Country", "prompt": "bluegrass, banjo, fiddle, acoustic guitar, fast picking, Appalachian folk", "bpm": 140, "negative_prompt": "electronic production, metal, EDM, trap", "instrumental": True},
            ],
            "Reggae": [
                {"label": "Reggae", "cat": "Reggae", "prompt": "reggae music, off-beat guitar skank, bass-heavy, one-drop drums, Jamaican style", "bpm": 85, "negative_prompt": "metal distortion, trap 808, EDM four-on-the-floor, orchestral", "instrumental": False},
                {"label": "Dancehall", "cat": "Reggae", "prompt": "dancehall, riddim, deejay vocals, Caribbean rhythm, energetic, party music", "bpm": 105, "negative_prompt": "orchestral, metal, slow ballad, jazz", "instrumental": False},
            ],
        }
    }
    return genre_presets


@app.get("/acestep/models")
async def acestep_models():
    """
    Return available ACE-Step models and capabilities.
    """
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Try to get model info from ACE-Step API
            r = await client.get(f"{ACE_STEP_API}/health")
            if r.status_code == 200:
                health_data = r.json()
                return {
                    "models": [
                        {
                            "id": "acestep-v1.5",
                            "name": "ACE-Step v1.5",
                            "description": "Text-to-music and audio-to-audio generation model",
                            "capabilities": ["text2music", "audio2audio", "repaint", "lego", "complete"],
                            "status": "online",
                            "version": health_data.get("version", "1.5")
                        }
                    ],
                    "online": True
                }
    except Exception as e:
        # Return offline status
        return {
            "models": [
                {
                    "id": "acestep-v1.5",
                    "name": "ACE-Step v1.5",
                    "description": "Text-to-music and audio-to-audio generation model",
                    "capabilities": ["text2music", "audio2audio", "repaint", "lego", "complete"],
                    "status": "offline",
                    "version": "1.5"
                }
            ],
            "online": False,
            "error": str(e)
        }


@app.get("/acestep/stats")
async def acestep_stats():
    """
    Return ACE-Step server statistics.
    """
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Try to get stats from ACE-Step API
            r = await client.get(f"{ACE_STEP_API}/health")
            if r.status_code == 200:
                health_data = r.json()
                return {
                    "queue": 0,
                    "jobs_running": 0,
                    "jobs_done": 0,
                    "gpu_memory": f"{hw.get('vram_gb', 0)} GB",
                    "online": True,
                    "version": health_data.get("version", "1.5")
                }
    except Exception:
        pass
    
    # Return default stats when ACE-Step is offline
    return {
        "queue": 0,
        "jobs_running": 0,
        "jobs_done": 0,
        "gpu_memory": f"{hw.get('vram_gb', 0)} GB",
        "online": False
    }


@app.post("/ace_generate")
async def ace_generate(
    prompt: str = Form(...),                    # music style/genre description
    lyrics: str = Form(""),                     # song lyrics (optional)
    duration: float = Form(30.0),               # seconds (15-240), -1=auto
    guidance_scale: float = Form(7.0),          # CFG scale (optimal for turbo)
    seed: int = Form(-1),                       # -1 = random
    infer_steps: int = Form(27),                # diffusion steps (27 optimal for turbo)
    # Music parameters
    bpm: int = Form(0),                         # 0 = auto
    key_scale: str = Form(""),                  # e.g. "C major"
    time_signature: str = Form(""),             # e.g. "4"
    # Generation options
    audio_format: str = Form("wav"),            # wav or mp3 or flac
    infer_method: str = Form("ode"),            # ode or sde
    shift: float = Form(3.0),                   # timestep shift
    # LM parameters
    lm_model: str = Form("acestep-5Hz-lm-0.6B"),
    lm_backend: str = Form("pt"),               # pt or vllm
    lm_temperature: float = Form(0.8),
    lm_cfg_scale: float = Form(2.2),
    lm_top_k: int = Form(0),
    lm_top_p: float = Form(0.92),
    lm_negative_prompt: str = Form(""),
    # Task type + audio2audio + custom
    task_type: str = Form("text2music"),        # text2music, audio2audio, cover, custom
    mode: str = Form(""),                       # custom mode (special)
    source_audio: UploadFile = File(None),      # source audio for audio2audio/cover/custom
    source_audio_strength: float = Form(0.5),   # 0=ignore source, 1=copy source
    negative_prompt: str = Form(""),            # alias for lm_negative_prompt
    # Custom mode parameters
    audio_prompt: UploadFile = File(None),      # reference audio for custom mode
    ref_audio_strength: float = Form(0.7),      # 0.0-1.0 for custom mode
    tags: str = Form(""),                       # genre/style tags for custom mode
    # DiT model selection
    dit_model: str = Form("acestep-v15-turbo"), # acestep-v15-turbo or acestep-v15-turbo-shift3
    # Expert / advanced
    use_adg: bool = Form(False),
    cfg_interval_start: float = Form(0.0),
    cfg_interval_end: float = Form(1.0),
    use_cot_metas: bool = Form(True),
    use_cot_caption: bool = Form(True),
    use_cot_language: bool = Form(True),
    allow_lm_batch: bool = Form(True),
    get_lrc: bool = Form(False),
    # Vocal options
    vocal_language: str = Form("en"),
    instrumental: bool = Form(False),
    # Thinking mode (5Hz LM for audio codes)
    thinking: bool = Form(False),
    # VRAM & Performance
    batch_size: int = Form(1),                # 1=save VRAM, 2+=faster but more VRAM
    use_tiled_decode: bool = Form(True),      # VAE decode optimization
):
    """
    Generate music with ACE-Step v1.5.
    Proxies to ACE-Step API server running on port 8001.
    Returns a WAV file URL when done.
    """
    import httpx
    import urllib.parse

    # Check ACE-Step is online
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            health = await client.get(f"{ACE_STEP_API}/health")
            if health.status_code != 200:
                return JSONResponse(status_code=503, content={
                    "error": "ACE-Step API server is not running. Start it with start_acestep.bat"
                })
    except Exception:
        return JSONResponse(status_code=503, content={
            "error": "ACE-Step API server is offline. Run start_acestep.bat first.",
            "hint": "d:\\VocalForge\\start_acestep.bat"
        })

    job_id = uuid.uuid4().hex
    t_start = time.time()
    use_random = seed < 0
    actual_seed = seed if seed >= 0 else random.randint(0, 2**31)
    print(f"[ACE {job_id[:8]}] Generating: prompt='{prompt[:60]}' | duration={duration}s | steps={infer_steps} | model={dit_model}")

    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            # Step 0: Ensure requested model is loaded (lazy loading support)
            # Call /v1/init to load model on-demand if not already loaded
            model_init_needed = False
            try:
                # First check if model is already loaded via /v1/models
                models_response = await client.get(f"{ACE_STEP_API}/v1/models", timeout=10.0)
                if models_response.status_code == 200:
                    models_data = models_response.json()
                    # Handle both wrapped {code, data} and direct responses
                    data_payload = models_data.get("data", models_data) if isinstance(models_data, dict) else models_data
                    loaded_models = data_payload.get("models", []) if isinstance(data_payload, dict) else data_payload
                    if isinstance(loaded_models, list):
                        model_loaded = any(
                            m.get("name") == dit_model and m.get("is_loaded", False)
                            for m in loaded_models
                        )
                    else:
                        model_loaded = False
                    if not model_loaded:
                        model_init_needed = True
                        print(f"[ACE {job_id[:8]}] Model {dit_model} not loaded, initializing...")
                    else:
                        print(f"[ACE {job_id[:8]}] Model {dit_model} already loaded")
                else:
                    model_init_needed = True

            except Exception as check_err:
                # If check fails, assume init needed
                model_init_needed = True
                print(f"[ACE {job_id[:8]}] Model check skipped: {check_err}")
            
            # Initialize model if needed
            if model_init_needed:
                try:
                    init_response = await client.post(
                        f"{ACE_STEP_API}/v1/init",
                        json={"model": dit_model, "init_llm": False},
                        timeout=180.0  # Model loading can take 2-3 minutes
                    )
                    if init_response.status_code == 200:
                        init_data = init_response.json()
                        loaded_model = init_data.get("data", {}).get("loaded_model", dit_model)
                        print(f"[ACE {job_id[:8]}] ✅ Model loaded: {loaded_model}")
                        
                        # Wait a moment for model to fully initialize
                        await asyncio.sleep(2)
                    else:
                        print(f"[ACE {job_id[:8]}] ⚠️ Model init returned status {init_response.status_code}")
                except Exception as init_err:
                    print(f"[ACE {job_id[:8]}] ⚠️ Model init error (may already be loaded): {init_err}")
            
            # Step 1: Submit generation task with correct ACE-Step schema
            # Build prompt with metadata (BPM, key, time signature)
            full_prompt = prompt
            meta_parts = []
            if bpm and bpm > 0:
                meta_parts.append(f"BPM: {bpm}")
            if key_scale:
                meta_parts.append(f"Key: {key_scale}")
            if time_signature:
                meta_parts.append(f"Time: {time_signature}/4")
            if meta_parts:
                full_prompt = full_prompt + "\n" + ", ".join(meta_parts) if full_prompt else ", ".join(meta_parts)

            # ── Optimizări pentru audio cover ──────────────────────────────────
            is_cover = task_type in ("audio2audio", "cover")
            is_custom = mode == "custom" or task_type == "custom"
            effective_duration = duration  # folosim durata exactă setată de utilizator
            # Asigură-te că durata este pozitivă, altfel -1 pentru auto
            if effective_duration <= 0:
                effective_duration = -1
            print(f"[ACE {job_id[:8]}] Duration: {effective_duration}s | task_type={task_type} | vocal_language={vocal_language}")

            task_payload = {
                "prompt": full_prompt,
                "bpm": bpm if bpm and bpm > 0 else None,
                "key_scale": key_scale if key_scale else "",
                "time_signature": time_signature if time_signature else "",
                "lyrics": "" if instrumental else (lyrics.strip() if lyrics.strip() else ""),
                "audio_duration": effective_duration,
                "inference_steps": infer_steps,
                "guidance_scale": guidance_scale,
                "use_random_seed": use_random,
                "seed": actual_seed,
                "audio_format": audio_format if audio_format in ("mp3", "flac", "wav") else "wav",
                "task_type": task_type,
                "model": dit_model,
                # Vocal language as separate parameter (ACE-Step official API)
                "vocal_language": vocal_language if not instrumental and vocal_language != "unknown" else "en",
                # Advanced params
                "infer_method": infer_method,
                "shift": shift,
                "lm_temperature": lm_temperature,
                "lm_cfg_scale": lm_cfg_scale,
                "lm_top_k": lm_top_k,
                "lm_top_p": lm_top_p,
                "use_adg": use_adg,
                "cfg_interval_start": cfg_interval_start,
                "cfg_interval_end": cfg_interval_end,
                # Pentru audio2audio/cover: nu lăsa LM să modifice durata specificată de utilizator
                "use_cot_metas": False if is_cover else use_cot_metas,
                "use_cot_caption": use_cot_caption,
                "use_cot_language": use_cot_language,
                "allow_lm_batch": allow_lm_batch,
                # Thinking mode (5Hz LM for audio code generation)
                "thinking": thinking,
                # ── Optimizări VRAM (RTX 3070 8GB) ───────────────────────────
                # batch_size: from user (default 1 to save VRAM)
                "batch_size": batch_size,
                # use_tiled_decode: from user (VRAM optimization for VAE decode)
                "use_tiled_decode": use_tiled_decode,
            }
            # Negative prompt: use lm_negative_prompt or alias negative_prompt
            neg = (lm_negative_prompt or negative_prompt or "").strip()
            if neg:
                task_payload["lm_negative_prompt"] = neg

            # Custom mode: add reference audio parameters
            if is_custom:
                task_payload["mode"] = "custom"
                if tags:
                    task_payload["tags"] = tags
                task_payload["ref_audio_strength"] = ref_audio_strength
                print(f"[ACE {job_id[:8]}] Custom mode: ref_strength={ref_audio_strength}, tags='{tags[:60]}'")

            # Audio2audio/cover/custom: save source audio in system temp
            if (task_type in ("audio2audio", "cover") or is_custom) and (source_audio or audio_prompt) and (source_audio or audio_prompt).filename:
                src_file = source_audio if source_audio else audio_prompt
                src_bytes = await src_file.read()
                import tempfile as _tmpmod
                suffix = ".wav"
                fd, src_path = _tmpmod.mkstemp(prefix="ace_src_", suffix=suffix)
                os.close(fd)

                try:
                    import torchaudio as _torchaudio
                    fd2, raw_path = _tmpmod.mkstemp(prefix="ace_raw_", suffix=os.path.splitext(src_file.filename)[1] or ".wav")
                    os.close(fd2)
                    try:
                        with open(raw_path, "wb") as f_raw:
                            f_raw.write(src_bytes)
                        _wav, _sr = _torchaudio.load(raw_path)
                        src_duration_s = _wav.shape[-1] / _sr
                        _torchaudio.save(src_path, _wav, _sr)
                        print(f"[ACE {job_id[:8]}] Source audio: {src_file.filename} ({src_duration_s:.1f}s)")
                    finally:
                        try:
                            os.unlink(raw_path)
                        except Exception:
                            pass
                except Exception as _conv_err:
                    print(f"[ACE {job_id[:8]}] WARNING: torchaudio convert failed ({_conv_err})")
                    with open(src_path, "wb") as f_src:
                        f_src.write(src_bytes)

                task_payload["audio_cover_strength"] = source_audio_strength
                task_payload["audio_duration"] = effective_duration

                # Audio cover: use reference_audio_path to preserve vocal
                # Audio2audio: use src_audio_path for style transfer
                # Custom: use audio_prompt_path for reference structure
                if task_type == "cover":
                    task_payload["reference_audio_path"] = src_path  # Preserve vocal
                    print(f"[ACE {job_id[:8]}] Audio cover: reference={source_audio.filename}")
                elif is_custom:
                    task_payload["audio_prompt_path"] = src_path
                    print(f"[ACE {job_id[:8]}] Custom mode: reference={src_file.filename}")
                else:
                    task_payload["src_audio_path"] = src_path
                    print(f"[ACE {job_id[:8]}] Audio2audio: source={source_audio.filename}")

            print(f"[ACE {job_id[:8]}] Submitting task to /release_task...")
            r = await client.post(f"{ACE_STEP_API}/release_task", json=task_payload)
            if r.status_code != 200:
                return JSONResponse(status_code=500, content={
                    "error": f"ACE-Step task submission failed (HTTP {r.status_code}): {r.text[:500]}"
                })

            task_data = r.json()
            # release_task returns {"task_id": "...", ...} or wrapped in data
            task_id = (
                task_data.get("task_id") or
                task_data.get("id") or
                (task_data.get("data") or {}).get("task_id")
            )
            if not task_id:
                return JSONResponse(status_code=500, content={
                    "error": f"No task_id in response: {task_data}"
                })

            print(f"[ACE {job_id[:8]}] Task submitted: {task_id}")

            # Step 2: Poll for result
            # query_result uses task_id_list (not task_ids)
            # status: 0=running, 1=succeeded, 2=failed
            max_wait = 300  # 5 minutes
            poll_interval = 3.0
            elapsed = 0

            while elapsed < max_wait:
                await asyncio.sleep(poll_interval)
                elapsed += poll_interval

                r2 = await client.post(
                    f"{ACE_STEP_API}/query_result",
                    json={"task_id_list": [task_id]}
                )
                if r2.status_code != 200:
                    print(f"[ACE {job_id[:8]}] query_result HTTP {r2.status_code}, retrying...")
                    continue

                resp_data = r2.json()
                # Response: {"data": [...]} or direct list
                data_list = resp_data.get("data") or resp_data
                if not isinstance(data_list, list) or not data_list:
                    continue

                item = data_list[0]
                status_int = item.get("status", 0)  # 0=running, 1=succeeded, 2=failed
                progress_text = item.get("progress_text", "")
                # progress_text is the raw loguru log line (e.g. "13:03:11 | WARNING | [tiled_decode]...")
                # Extract just the meaningful part after the last " | " separator
                if " | " in progress_text:
                    progress_text = progress_text.split(" | ")[-1].strip()
                print(f"[ACE {job_id[:8]}] Status: {status_int} | {progress_text} ({round(elapsed)}s)")

                if status_int == 2:
                    # Failed — parse error from result JSON
                    result_str = item.get("result", "[]")
                    try:
                        result_arr = json.loads(result_str) if isinstance(result_str, str) else result_str
                        err = (result_arr[0].get("error") if result_arr else None) or "Unknown error"
                    except Exception:
                        err = result_str[:200]
                    print(f"[ACE {job_id[:8]}] FAILED: {err}")
                    return JSONResponse(status_code=500, content={"error": f"ACE-Step failed: {err}"})

                if status_int == 1:
                    # Succeeded — get audio file path
                    result_str = item.get("result", "[]")
                    print(f"[ACE {job_id[:8]}] Raw result: {str(result_str)[:500]}")
                    try:
                        result_arr = json.loads(result_str) if isinstance(result_str, str) else result_str
                    except Exception:
                        result_arr = []

                    # ACE-Step returnează lista de fișiere în result_arr
                    # Fiecare element are "file" = URL /v1/audio?path=... sau cale disk
                    audio_file_path = None
                    if result_arr and isinstance(result_arr, list):
                        # Caută primul element cu "file" non-gol
                        for item_r in result_arr:
                            f = item_r.get("file", "")
                            if f:
                                audio_file_path = f
                                break

                    print(f"[ACE {job_id[:8]}] audio_file_path: {audio_file_path}")

                    if not audio_file_path:
                        return JSONResponse(status_code=500, content={
                            "error": "ACE-Step succeeded but no audio file path in result",
                            "result": result_arr,
                            "result_str_raw": str(result_str)[:500],
                        })

                    # audio_file_path poate fi:
                    # 1. URL relativ: /v1/audio?path=C%3A%5C...
                    # 2. Cale disk absolută: D:\VocalForge\ace-step\.cache\...\file.wav
                    # 3. URL complet: http://localhost:8001/v1/audio?path=...
                    real_path = audio_file_path

                    if "/v1/audio" in audio_file_path:
                        # Extrage parametrul "path" din URL
                        # Suportă atât URL relativ cât și absolut
                        if audio_file_path.startswith("http"):
                            parsed = urllib.parse.urlparse(audio_file_path)
                        else:
                            parsed = urllib.parse.urlparse(f"http://localhost{audio_file_path}")
                        qs = urllib.parse.parse_qs(parsed.query)
                        path_vals = qs.get("path", [])
                        if path_vals:
                            real_path = urllib.parse.unquote(path_vals[0])
                        print(f"[ACE {job_id[:8]}] Extracted disk path from URL: {real_path}")
                    elif not os.path.isabs(audio_file_path):
                        # Cale relativă — încearcă față de ace-step dir
                        ace_dir = os.path.join(os.path.dirname(BASE_DIR), "ace-step")
                        real_path = os.path.join(ace_dir, audio_file_path)
                        print(f"[ACE {job_id[:8]}] Relative path resolved to: {real_path}")

                    print(f"[ACE {job_id[:8]}] Final disk path: {real_path} | exists={os.path.exists(real_path)}")

                    # Copiază fișierul audio în output directory
                    out_filename = f"{job_id}_ace.{OUTPUT_FORMAT}"
                    out_path = os.path.join(OUTPUT_DIR, out_filename)

                    if os.path.exists(real_path):
                        # If source is WAV and we want MP3, convert it
                        if OUTPUT_FORMAT == "mp3" and real_path.lower().endswith(".wav"):
                            # Copy to temp WAV, then convert
                            temp_wav = out_path.replace(".mp3", ".wav")
                            shutil.copy2(real_path, temp_wav)
                            final_path = _convert_to_mp3(temp_wav, out_path)
                            out_filename = os.path.basename(final_path)
                        else:
                            shutil.copy2(real_path, out_path)
                        print(f"[ACE {job_id[:8]}] Copied from disk: {real_path}")
                    else:
                        # Descarcă via /v1/audio endpoint
                        # Folosim calea originală din result (URL-encoded corect de ACE-Step)
                        if "/v1/audio" in audio_file_path:
                            # Folosim URL-ul original direct
                            if audio_file_path.startswith("http"):
                                download_url = audio_file_path
                            else:
                                download_url = f"{ACE_STEP_API}{audio_file_path}"
                        else:
                            encoded = urllib.parse.quote(real_path, safe="")
                            download_url = f"{ACE_STEP_API}/v1/audio?path={encoded}"

                        print(f"[ACE {job_id[:8]}] Downloading from: {download_url}")
                        r3 = await client.get(download_url)
                        if r3.status_code != 200:
                            return JSONResponse(status_code=500, content={
                                "error": f"Failed to download audio (HTTP {r3.status_code}): url={download_url}",
                                "real_path": real_path,
                            })
                        with open(out_path, "wb") as f_out:
                            f_out.write(r3.content)
                        print(f"[ACE {job_id[:8]}] Downloaded via /v1/audio ({len(r3.content)//1024}KB)")

                    t_sec = round(time.time() - t_start, 1)
                    out_size_mb = round(os.path.getsize(out_path) / 1024 / 1024, 2)

                    audio_data, audio_sr = sf.read(out_path, dtype="float32")
                    duration_sec = round(len(audio_data) / audio_sr, 2)

                    print(f"[ACE {job_id[:8]}] Done in {t_sec}s — {duration_sec}s audio ({out_size_mb}MB)")

                    return {
                        "status": "ok",
                        "job_id": job_id,
                        "filename": out_filename,
                        "url": f"/tracks/{out_filename}",
                        "duration_sec": duration_sec,
                        "processing_time_sec": t_sec,
                        "metadata": {
                            "prompt": prompt,
                            "lyrics": lyrics[:200] if lyrics else "",
                            "duration_requested": duration,
                            "infer_steps": infer_steps,
                            "guidance_scale": guidance_scale,
                            "seed": actual_seed,
                            "output_size_mb": out_size_mb,
                            "created_at": datetime.now().isoformat(),
                        }
                    }

            return JSONResponse(status_code=504, content={"error": f"ACE-Step timed out after {max_wait}s"})

    except Exception as e:
        import traceback
        return JSONResponse(status_code=500, content={"error": str(e), "traceback": traceback.format_exc()})


# ── Run ────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 52)
    print("  VocalForge v1.7 — Backend Starting")
    print(f"  Device : {hw['device']}")
    print(f"  VRAM   : {hw['vram_gb']} GB")
    print(f"  Models : {MODELS_DIR}")
    print("  URL    : http://localhost:8000")
    print("  Docs   : http://localhost:8000/docs")
    print("=" * 52)
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=False,
        timeout_keep_alive=600,   # 10 min keep-alive (ACE-Step poate dura mult)
        h11_max_incomplete_event_size=16 * 1024 * 1024,  # 16MB pentru upload audio
    )
