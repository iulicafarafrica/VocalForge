"""
core/modules/pipeline_manager.py
Pipeline: BS RoFormer (/demucs_separate) -> RVC (/rvc/convert) -> ACE-Step (/audio2audio)

Stage 1 foloseste /demucs_separate cu model=bs_roformer_1297
- acelasi endpoint ca DemucsTab => rapid (25-40 sec), model deja pe disk

Optimizations v2.0:
- Gain Staging: Normalize vocals to -1dB after Stage 1
- VRAM Management: Unload RVC after Stage 2 before ACE-Step
- Force RMVPE for stable pipeline
- Sample rate check: Ensure 48kHz for ACE-Step
- Health Check: Wait for ACE-Step to be ready before Stage 3
"""

import os
import uuid
import asyncio
import aiohttp
import aiofiles
import subprocess
import shutil
import librosa
import soundfile as sf
import torch
import gc
from pathlib import Path
from typing import Optional
from dataclasses import dataclass
from enum import Enum

BASE_DIR    = Path("D:/VocalForge")
AUDIO_DIR   = BASE_DIR / "audio" / "pipeline"
BACKEND_URL = "http://localhost:8000"
ACE_URL     = "http://localhost:8001"


def force_cleanup():
    """
    Eliberare brutala a memoriei GPU pentru stabilitate pe RTX 3070 (8GB).
    Combina gc.collect() + torch.cuda.empty_cache() + torch.cuda.ipc_collect()
    
    This is CRITICAL for preventing OOM errors when running:
    - Stage 1: BS-RoFormer (4-5GB VRAM)
    - Stage 2: RVC (4-6GB VRAM)
    - Stage 3: ACE-Step (6-8GB VRAM)
    
    On 8GB VRAM, we need to FREE memory between stages!
    """
    gc.collect()
    
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.ipc_collect()
        
    print("[SYSTEM] [OK] VRAM curatat complet (force_cleanup).")


async def wait_for_ace_step(max_retries=12):
    """
    Wait for ACE-Step API to be ready and models loaded.
    Retries every 5 seconds, max wait = 60 seconds.
    """
    for i in range(max_retries):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{ACE_URL}/health", timeout=2) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data.get("data", {}).get("models_initialized"):
                            print("[Pipeline] [OK] ACE-Step is READY (models loaded)!")
                            return True
        except Exception as e:
            pass
        print(f"[Pipeline] (clock) Waiting for ACE-Step... ({i+1}/{max_retries})")
        await asyncio.sleep(5)
    
    print("[Pipeline] [X] ACE-Step did not become ready in time!")
    return False


class StageStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    DONE    = "done"
    ERROR   = "error"


@dataclass
class PipelineJob:
    job_id: str
    input_path: str
    rvc_model: str
    rvc_pitch: int        = 0
    rvc_protect: float    = 0.33
    ace_strength: float   = 0.35  # Updated default: 0.35 (balanced)
    ace_steps: int        = 16    # Updated default: 16 (faster, good quality)
    sep_model: str        = "bs_roformer_1297"

    vocals_path: Optional[str]       = None
    instrumental_path: Optional[str] = None
    rvc_output_path: Optional[str]   = None
    final_output_path: Optional[str] = None

    stage1_status: StageStatus = StageStatus.PENDING
    stage2_status: StageStatus = StageStatus.PENDING
    stage3_status: StageStatus = StageStatus.PENDING

    error: Optional[str] = None
    progress: int = 0


_jobs: dict[str, PipelineJob] = {}


def create_job(input_path, rvc_model, rvc_pitch=0, rvc_protect=0.33,
               ace_strength=0.35, ace_steps=16, sep_model="bs_roformer_1297"):
    job_id = str(uuid.uuid4())[:8]
    job = PipelineJob(
        job_id=job_id, input_path=input_path, rvc_model=rvc_model,
        rvc_pitch=rvc_pitch, rvc_protect=rvc_protect,
        ace_strength=ace_strength, ace_steps=ace_steps,
        sep_model=sep_model,
    )
    _jobs[job_id] = job
    (AUDIO_DIR / job_id).mkdir(parents=True, exist_ok=True)
    return job


def get_job(job_id: str) -> Optional[PipelineJob]:
    return _jobs.get(job_id)


# Stage 1: BS RoFormer via /demucs_separate (exact ca DemucsTab) ────────────
async def run_stage1_separation(job: PipelineJob) -> bool:
    job.stage1_status = StageStatus.RUNNING
    job.progress = 5

    job_dir = AUDIO_DIR / job.job_id

    try:
        async with aiohttp.ClientSession() as session:
            with open(job.input_path, "rb") as f:
                data = aiohttp.FormData()
                data.add_field("file", f,
                               filename=os.path.basename(job.input_path),
                               content_type="audio/mpeg")
                data.add_field("model", job.sep_model)   # bs_roformer_1297
                data.add_field("mode",  "stems")

                async with session.post(
                    f"{BACKEND_URL}/demucs_separate",
                    data=data,
                    timeout=aiohttp.ClientTimeout(total=300),
                ) as resp:
                    if resp.status != 200:
                        raise Exception(f"Separare esuata ({resp.status}): {await resp.text()}")
                    result = await resp.json()

        if result.get("status") != "ok":
            raise Exception(result.get("error", "Separare esuata"))

        stems = result.get("stems", {})
        vocals_url       = stems.get("vocals")
        instrumental_url = stems.get("instrumental") or stems.get("other")

        if not vocals_url:
            raise Exception(f"Nu gasesc vocals in raspuns: {stems}")

        # Descarca vocals si instrumental local
        vocals_path       = str(job_dir / "vocals.wav")
        instrumental_path = str(job_dir / "instrumental.wav")

        async with aiohttp.ClientSession() as session:
            async with session.get(f"{BACKEND_URL}{vocals_url}") as r:
                if r.status != 200:
                    raise Exception(f"Download vocals esuat: {r.status}")
                async with aiofiles.open(vocals_path, "wb") as out:
                    await out.write(await r.read())

            if instrumental_url:
                async with session.get(f"{BACKEND_URL}{instrumental_url}") as r:
                    if r.status == 200:
                        async with aiofiles.open(instrumental_path, "wb") as out:
                            await out.write(await r.read())

        job.vocals_path       = vocals_path
        job.instrumental_path = instrumental_path if instrumental_url else None
        
        # Gain Staging: Normalize vocals to -1dB peak, -16 LUFS
        print(f"\n[Stage 1] Applying gain staging to vocals...")
        await normalize_audio_to_target(vocals_path, target_db=-1.0)
        
        job.stage1_status = StageStatus.DONE
        job.progress = 35
        print(f"[Stage 1] OK Separation complete: {vocals_path}")
        return True

    except Exception as e:
        job.stage1_status = StageStatus.ERROR
        job.error = f"Stage 1 (BS RoFormer) error: {str(e)}"
        print(f"[Stage 1] X Error: {e}")
        return False


# ── Stage 2: RVC Convert via /rvc/convert ────────────────────────────────────
async def run_stage2_rvc(job: PipelineJob) -> bool:
    job.stage2_status = StageStatus.RUNNING
    job.progress = 40

    job_dir = AUDIO_DIR / job.job_id
    rvc_output = str(job_dir / "converted_raw.wav")  # Changed to WAV for lossless

    try:
        async with aiohttp.ClientSession() as session:
            with open(job.vocals_path, "rb") as f:
                data = aiohttp.FormData()
                data.add_field("vocal_file", f,
                               filename="vocals.wav",
                               content_type="audio/wav")
                data.add_field("model_name",    job.rvc_model)
                data.add_field("pitch_shift",   str(job.rvc_pitch))
                data.add_field("protect",       str(job.rvc_protect))
                
                # Force RMVPE for pipeline stability (not harvest)
                data.add_field("f0_method",     "rmvpe")
                data.add_field("index_rate",    "0.75")
                data.add_field("filter_radius", "3")
                data.add_field("rms_mix_rate",  "0.25")
                data.add_field("emotion",       "neutral")
                
                # WAV output for 48kHz compatibility (not MP3)
                data.add_field("output_format", "wav")
                data.add_field("dry_wet",       "1.0")
                data.add_field("formant_shift", "0.0")
                data.add_field("auto_tune",     "false")

                async with session.post(
                    f"{BACKEND_URL}/rvc/convert",
                    data=data,
                    timeout=aiohttp.ClientTimeout(total=600),  # 10 minutes for RVC
                ) as resp:
                    if resp.status != 200:
                        raise Exception(f"RVC esuat ({resp.status}): {await resp.text()}")
                    result = await resp.json()

        if result.get("status") != "ok":
            raise Exception(result.get("error", "RVC conversion esuata"))

        out_url = result.get("url") or result.get("output_url")
        if not out_url:
            raise Exception(f"RVC nu a returnat URL: {result}")

        async with aiohttp.ClientSession() as session:
            async with session.get(f"{BACKEND_URL}{out_url}") as r:
                if r.status != 200:
                    raise Exception(f"Download RVC output esuat: {r.status}")
                async with aiofiles.open(rvc_output, "wb") as out:
                    await out.write(await r.read())

        job.rvc_output_path = rvc_output
        
        # CRITICAL: Unload RVC model BEFORE Stage 3 (VRAM management)
        print(f"\n[Stage 2->3] Unloading RVC model to free VRAM for ACE-Step...")
        await unload_rvc_model_from_backend()
        
        job.stage2_status = StageStatus.DONE
        job.progress = 65
        print(f"[Stage 2] OK RVC conversion complete: {rvc_output}")
        return True

    except Exception as e:
        job.stage2_status = StageStatus.ERROR
        job.error = f"Stage 2 (RVC) error: {str(e)}"
        print(f"[Stage 2] X Error: {e}")
        return False


# ── Stage 3: ACE-Step Audio2Audio Refinement ─────────────────────────────────
async def run_stage3_refinement(job: PipelineJob) -> bool:
    job.stage3_status = StageStatus.RUNNING
    job.progress = 70

    job_dir = AUDIO_DIR / job.job_id
    final_output = str(job_dir / "final_refined_vocals.wav")

    try:
        # NEW: Wait for ACE-Step to be ready
        print(f"\n[Stage 3] Checking if ACE-Step is ready...")
        if not await wait_for_ace_step():
            raise Exception("ACE-Step not ready after 60 seconds")
        
        async with aiohttp.ClientSession() as session:
            with open(job.rvc_output_path, "rb") as f:
                data = aiohttp.FormData()
                data.add_field("file", f,
                               filename="converted_raw.wav",
                               content_type="audio/wav")
                data.add_field("denoise_strength", str(job.ace_strength))
                data.add_field("num_inference_steps", str(job.ace_steps))
                data.add_field("guidance_scale", "3.5")
                data.add_field("prompt", "clean studio vocal, natural breathing")

                print(f"[Stage 3] Sending to ACE-Step /audio2audio...")
                
                # 10 minutes for ACE-Step processing
                async with session.post(
                    f"{ACE_URL}/audio2audio",
                    data=data,
                    timeout=aiohttp.ClientTimeout(total=600),
                ) as resp:
                    if resp.status != 200:
                        error_text = await resp.text()
                        raise Exception(f"ACE-Step error ({resp.status}): {error_text[:500]}")

                    content_type = resp.headers.get("content-type", "")
                    if "audio" in content_type or "octet-stream" in content_type:
                        async with aiofiles.open(final_output, "wb") as out:
                            await out.write(await resp.read())
                    else:
                        result = await resp.json()
                        out_url = result.get("output_url") or result.get("url")
                        if not out_url:
                            raise Exception(f"ACE-Step unexpected response: {result}")
                        
                        async with session.get(f"{ACE_URL}{out_url}") as r:
                            async with aiofiles.open(final_output, "wb") as out:
                                await out.write(await r.read())

        job.final_output_path = final_output
        job.stage3_status = StageStatus.DONE
        job.progress = 95
        print(f"[Stage 3] OK ACE-Step refinement complete: {final_output}")
        return True

    except Exception as e:
        job.stage3_status = StageStatus.ERROR
        job.error = f"Stage 3 (ACE-Step) error: {str(e)}"
        print(f"[Stage 3] X Error: {e}")
        return False


# ── Runner complet ────────────────────────────────────────────────────────────
async def run_pipeline(job_id: str):
    """
    Run complete pipeline: Stage 1 -> Stage 2 -> Stage 3
    
    Optimizations applied:
    - Gain Staging after Stage 1 (-1dB peak, -16 LUFS)
    - VRAM Management after Stage 2 (unload RVC)
    - Health Check before Stage 3 (wait for ACE-Step)
    - GPU breathing room between stages
    """
    job = get_job(job_id)
    if not job:
        print(f"[Pipeline] X Job not found: {job_id}")
        return
    
    print(f"\n{'='*60}")
    print(f"[Pipeline] Starting pipeline for job: {job_id}")
    print(f"[Pipeline] Input: {job.input_path}")
    print(f"[Pipeline] Settings: model={job.rvc_model}, ace_strength={job.ace_strength}, steps={job.ace_steps}")
    print(f"{'='*60}\n")
    
    job.progress = 0
    
    # Stage 1: Separation
    print(f"[Pipeline] Starting Stage 1/3: BS-RoFormer Separation...")
    if not await run_stage1_separation(job):
        print(f"[Pipeline] X Pipeline failed at Stage 1")
        return
    print(f"[Pipeline] OK Stage 1 complete\n")
    
    # Stage 2: RVC
    print(f"[Pipeline] Starting Stage 2/3: RVC Voice Conversion...")
    if not await run_stage2_rvc(job):
        print(f"[Pipeline] X Pipeline failed at Stage 2")
        return
    print(f"[Pipeline] OK Stage 2 complete\n")
    
    # GPU cleanup + wait before Stage 3
    print(f"\n[Pipeline] Cleaning up VRAM before ACE-Step...")
    force_cleanup()
    await asyncio.sleep(2)  # GPU breathing room
    
    # Wait for ACE-Step to be ready
    if not await wait_for_ace_step():
        job.error = "ACE-Step not ready"
        job.progress = 100
        print(f"[Pipeline] X Pipeline failed - ACE-Step not ready")
        return
    
    # Stage 3: ACE-Step Refinement
    print(f"[Pipeline] Starting Stage 3/3: ACE-Step Diffusion Refinement...")
    if not await run_stage3_refinement(job):
        print(f"[Pipeline] X Pipeline failed at Stage 3")
        return
    print(f"[Pipeline] OK Stage 3 complete\n")
    
    job.progress = 100
    print(f"{'='*60}")
    print(f"[Pipeline] OK PIPELINE COMPLETED SUCCESSFULLY!")
    print(f"[Pipeline] Final output: {job.final_output_path}")
    print(f"{'='*60}\n")
