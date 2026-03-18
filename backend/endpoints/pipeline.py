"""
backend/endpoints/pipeline.py
BS RoFormer → RVC → ACE-Step → Mix & Master
"""

import asyncio
import json
import os
import re
import aiofiles
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from pathlib import Path

from core.modules.pipeline_manager import (
    create_job, get_job, run_pipeline, AUDIO_DIR, StageStatus,
)

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


# ── POST /pipeline/run ────────────────────────────────────────────────────────
@router.post("/run")
async def start_pipeline(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    rvc_model: str   = Form(...),
    rvc_pitch: int   = Form(0),
    rvc_protect: float  = Form(0.55),
    # RVC Advanced Settings
    f0_method: str      = Form("harvest", description="harvest (singing), rmvpe (speech), crepe, pm, dio"),
    index_rate: float   = Form(0.40, description="0.40 preserves singing style, 0.75 for speech"),
    filter_radius: int  = Form(3, description="Median filter radius 0-7"),
    rms_mix_rate: float = Form(0.25, description="RMS mix rate 0.0-1.0"),
    # Vocal Chain Preset
    vocal_chain_preset: str = Form("studio_radio", description="studio_radio, natural, arena, radio, balanced"),
    ace_strength: float = Form(0.4),
    ace_steps: int      = Form(24),
    enable_stage3: bool = Form(False),  # Changed to False — ACE-Step disabled
    enable_stage4: bool = Form(True),
    # Applio features — DISABLED for music (designed for speech)
    enable_autotune: bool        = Form(False),
    autotune_strength: float     = Form(0.0),
    enable_highpass: bool        = Form(False),
    enable_volume_envelope: bool = Form(False),
):
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    # Preserve original extension
    original_ext = os.path.splitext(file.filename)[1] or ".wav"
    input_path   = str(AUDIO_DIR / f"input_{file.filename}")

    async with aiofiles.open(input_path, "wb") as f:
        await f.write(await file.read())

    job = create_job(
        input_path=input_path,
        rvc_model=rvc_model,
        rvc_pitch=rvc_pitch,
        rvc_protect=rvc_protect,
        ace_strength=ace_strength,
        ace_steps=ace_steps,
        vocal_chain_preset=vocal_chain_preset,
        enable_stage3=enable_stage3,
        enable_stage4=enable_stage4,
    )

    background_tasks.add_task(run_pipeline, job.job_id)

    return {
        "job_id":  job.job_id,
        "status":  "started",
        "message": f"Pipeline pornit pentru {file.filename}",
    }


# ── GET /pipeline/status/{job_id} ─────────────────────────────────────────────
@router.get("/status/{job_id}")
async def get_status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} nu exista")

    def _exists(p):
        return bool(p and os.path.exists(p))

    return {
        "job_id":   job.job_id,
        "progress": job.progress,
        "error":    job.error,
        "stages": {
            "stage1_separation": job.stage1_status,
            "stage2_rvc":        job.stage2_status,
            "stage3_clarify":    job.stage3_status,
            "stage4_mix":        job.stage4_status,
        },
        "outputs": {
            "vocals":       job.vocals_path       if _exists(job.vocals_path)             else None,
            "instrumental": job.instrumental_path if _exists(job.instrumental_path)       else None,
            "rvc_raw":      job.rvc_output_path   if _exists(job.rvc_output_path)         else None,
            "final":        job.refined_vocals_path if _exists(job.refined_vocals_path)   else None,
            "final_mix":    job.final_mix_path    if _exists(job.final_mix_path)          else None,
        },
    }


# ── GET /pipeline/progress/{job_id} SSE ──────────────────────────────────────
@router.get("/progress/{job_id}")
async def stream_progress(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} nu exista")

    async def event_generator():
        last_progress = -1
        while True:
            job = get_job(job_id)
            if not job:
                break

            if job.progress != last_progress:
                last_progress = job.progress
                data = {
                    "progress": job.progress,
                    "stage1":   job.stage1_status,
                    "stage2":   job.stage2_status,
                    "stage3":   job.stage3_status,
                    "stage4":   job.stage4_status,
                    "error":    job.error,
                    "done":     job.progress == 100,
                }
                yield f"data: {json.dumps(data)}\n\n"

            if job.progress == 100 or job.error:
                break

            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── GET /pipeline/download/{job_id}/{file_type} ───────────────────────────────
@router.get("/download/{job_id}/{file_type}")
async def download_file(job_id: str, file_type: str, request: Request):
    from starlette.responses import StreamingResponse
    import subprocess

    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Check if MP3 is requested but doesn't exist - create it from WAV
    if file_type == "final_mix_mp3":
        wav_path = job.final_mix_path
        mp3_path = wav_path.replace(".wav", ".mp3") if wav_path else None
        
        if not mp3_path or not os.path.exists(mp3_path):
            # MP3 doesn't exist - create it from WAV
            if wav_path and os.path.exists(wav_path):
                try:
                    subprocess.run([
                        'ffmpeg', '-y', '-i', wav_path,
                        '-codec:a', 'libmp3lame', '-b:a', '320k',
                        mp3_path
                    ], check=True, capture_output=True)
                    print(f"[Pipeline] Created MP3: {mp3_path}")
                except subprocess.CalledProcessError as e:
                    print(f"[Pipeline] MP3 conversion failed: {e.stderr.decode()}")
                    raise HTTPException(status_code=500, detail="MP3 conversion failed")
            else:
                raise HTTPException(status_code=404, detail="Final mix WAV not found")
        
        path = mp3_path
    else:
        path_map = {
            "vocals":       job.vocals_path,
            "instrumental": job.instrumental_path,
            "rvc_raw":      job.rvc_output_path,
            "final":        job.refined_vocals_path,
            "final_mix":    job.final_mix_path,
        }
        path = path_map.get(file_type)
    
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"File '{file_type}' not ready")

    ext      = os.path.splitext(path)[1]
    media    = "audio/mpeg" if ext == ".mp3" else "audio/wav"
    filename = f"{job_id}_{file_type}{ext}"
    
    # Support range requests for audio seeking
    file_size = os.path.getsize(path)
    range_header = request.headers.get("range")
    
    if range_header:
        # Parse range header
        range_match = re.search(r"bytes=(\d+)-(\d*)", range_header)
        if range_match:
            start = int(range_match.group(1))
            end = int(range_match.group(2)) if range_match.group(2) else file_size - 1
            end = min(end, file_size - 1)
            
            # Stream the requested range
            def iterfile():
                with open(path, "rb") as f:
                    f.seek(start)
                    remaining = end - start + 1
                    chunk_size = 1024 * 1024  # 1MB chunks
                    while remaining > 0:
                        chunk = f.read(min(chunk_size, remaining))
                        if not chunk:
                            break
                        remaining -= len(chunk)
                        yield chunk
            
            headers = {
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(end - start + 1),
                "Content-Type": media,
            }
            return StreamingResponse(iterfile(), status_code=206, headers=headers, media_type=media)
    else:
        # No range request - send full file
        headers = {
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
            "Content-Type": media,
        }
        def iterfile():
            with open(path, "rb") as f:
                yield from f
        return StreamingResponse(iterfile(), headers=headers, media_type=media)


# ── GET /pipeline/models ──────────────────────────────────────────────────────
@router.get("/models")
async def list_rvc_models():
    import aiohttp
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get("http://localhost:8000/rvc/models") as resp:
                if resp.status == 200:
                    return await resp.json()
    except Exception:
        pass
    return {"models": [], "error": "RVC service indisponibil"}
