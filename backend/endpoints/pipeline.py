"""
backend/endpoints/pipeline.py
Endpoint FastAPI pentru pipeline-ul BS RoFormer → RVC → ACE-Step
"""

import asyncio
import json
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse, FileResponse
from pathlib import Path
import aiofiles
import os

from core.modules.pipeline_manager import (
    create_job,
    get_job,
    run_pipeline,
    AUDIO_DIR,
    StageStatus,
)

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


# ── POST /pipeline/run ────────────────────────────────────────────────────────
@router.post("/run")
async def start_pipeline(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    rvc_model: str = Form(...),
    rvc_pitch: int = Form(0),
    rvc_protect: float = Form(0.33),
):
    """
    Porneste pipeline-ul complet.
    Returneaza job_id pentru a urmari progresul.
    """
    # Salveaza fisierul input
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    input_path = str(AUDIO_DIR / f"input_{file.filename}")

    async with aiofiles.open(input_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    # Creeaza job (fara ace_strength/ace_steps - nu mai e nevoie pentru Stage 3 simplu)
    job = create_job(
        input_path=input_path,
        rvc_model=rvc_model,
        rvc_pitch=rvc_pitch,
        rvc_protect=rvc_protect,
    )

    # Porneste pipeline in background
    background_tasks.add_task(run_pipeline, job.job_id)

    return {
        "job_id": job.job_id,
        "status": "started",
        "message": f"Pipeline pornit pentru {file.filename}",
    }


# ── GET /pipeline/status/{job_id} ─────────────────────────────────────────────
@router.get("/status/{job_id}")
async def get_status(job_id: str):
    """Returneaza statusul curent al unui job."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} nu exista")

    return {
        "job_id": job.job_id,
        "progress": job.progress,
        "error": job.error,
        "stages": {
            "stage1_separation": job.stage1_status,
            "stage2_rvc": job.stage2_status,
            "stage3_refinement": job.stage3_status,
        },
        "outputs": {
            "vocals": job.vocals_path,
            "instrumental": job.instrumental_path,
            "rvc_raw": job.rvc_output_path,
            "final": job.final_output_path,
        },
    }


# ── GET /pipeline/progress/{job_id} - SSE live progress ─────────────────────
@router.get("/progress/{job_id}")
async def stream_progress(job_id: str):
    """
    Server-Sent Events pentru progress bar live in frontend.
    Frontend-ul asculta: new EventSource('/pipeline/progress/JOB_ID')
    """
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
                    "stage1": job.stage1_status,
                    "stage2": job.stage2_status,
                    "stage3": job.stage3_status,
                    "error": job.error,
                    "done": job.progress == 100,
                    "final_path": job.final_output_path,
                }
                yield f"data: {json.dumps(data)}\n\n"

            # Job terminat (succes sau eroare)
            if job.progress == 100 or job.error:
                break

            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── GET /pipeline/download/{job_id}/{file_type} ───────────────────────────────
@router.get("/download/{job_id}/{file_type}")
async def download_file(job_id: str, file_type: str):
    """
    Descarca un fisier din pipeline.
    file_type: vocals | instrumental | rvc_raw | final | final_mix
    """
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job negasit")

    path_map = {
        "vocals": job.vocals_path,
        "instrumental": job.instrumental_path,
        "rvc_raw": job.rvc_output_path,
        "final": job.final_output_path,
        "final_mix": job.final_mix_path,  # NEW: Mix Final (Vocal + Instrumental)
    }

    path = path_map.get(file_type)
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Fisier {file_type} nu e gata inca")

    filename = f"{job_id}_{file_type}.wav"
    return FileResponse(path, media_type="audio/wav", filename=filename)


# ── GET /pipeline/models ──────────────────────────────────────────────────────
@router.get("/models")
async def list_rvc_models():
    """Lista modelele RVC disponibile."""
    import aiohttp
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get("http://localhost:8000/rvc/models") as resp:
                if resp.status == 200:
                    return await resp.json()
    except Exception:
        pass
    return {"models": [], "error": "RVC service indisponibil"}
