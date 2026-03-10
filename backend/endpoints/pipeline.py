"""
backend/endpoints/pipeline.py
BS RoFormer → RVC → ACE-Step → Mix & Master
"""

import asyncio
import json
import os
import aiofiles
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse, FileResponse
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
    rvc_protect: float  = Form(0.33),
    ace_strength: float = Form(0.4),
    ace_steps: int      = Form(24),
    enable_stage3: bool = Form(True),
    enable_stage4: bool = Form(True),
    # Applio features (forwarded to RVC but accepted here to avoid 422)
    enable_autotune: bool        = Form(True),
    autotune_strength: float     = Form(0.4),
    enable_highpass: bool        = Form(True),
    enable_volume_envelope: bool = Form(True),
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
async def download_file(job_id: str, file_type: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job negasit")

    path_map = {
        "vocals":       job.vocals_path,
        "instrumental": job.instrumental_path,
        "rvc_raw":      job.rvc_output_path,
        "final":        job.refined_vocals_path,
        "final_mix":    job.final_mix_path,
        # MP3 variant of final mix
        "final_mix_mp3": (job.final_mix_path or "").replace(".wav", ".mp3"),
    }

    path = path_map.get(file_type)
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Fisier '{file_type}' nu e gata")

    ext      = os.path.splitext(path)[1]
    media    = "audio/mpeg" if ext == ".mp3" else "audio/wav"
    filename = f"{job_id}_{file_type}{ext}"
    return FileResponse(path, media_type=media, filename=filename)


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
