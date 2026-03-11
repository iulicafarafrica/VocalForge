"""
core/modules/pipeline_manager.py
Pipeline: BS RoFormer → RVC → ACE-Step Refinement → Mix & Master

Stage 1: /demucs_separate  (bs_roformer_1297)  → vocals.wav + instrumental.wav
Stage 2: /rvc/convert                          → converted_raw.mp3
Stage 3: ACE-Step /audio2audio                 → final_refined_vocals.wav
Stage 4: mix_master.mix_and_master             → final_master.wav + .mp3
"""

import os
import sys
import uuid
import asyncio
import aiohttp
import aiofiles
from pathlib import Path
from typing import Optional
from dataclasses import dataclass
from enum import Enum

_MODULE_DIR = Path(__file__).resolve().parent.parent.parent
if str(_MODULE_DIR) not in sys.path:
    sys.path.insert(0, str(_MODULE_DIR))

BASE_DIR    = Path("D:/VocalForge")
AUDIO_DIR   = BASE_DIR / "audio" / "pipeline"
BACKEND_URL = "http://localhost:8000"
ACE_URL     = "http://localhost:8001"


class StageStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    DONE    = "done"
    ERROR   = "error"
    SKIPPED = "skipped"


@dataclass
class PipelineJob:
    job_id: str
    input_path: str
    rvc_model: str
    rvc_pitch: int           = 0
    rvc_protect: float       = 0.55  # Changed from 0.33 — better for singing
    ace_strength: float      = 0.4
    ace_steps: int           = 24
    sep_model: str           = "bs_roformer_1297"
    vocal_chain_preset: str  = "studio_radio"
    enable_stage3: bool      = False  # Changed from True — disabled by default
    enable_stage4: bool      = True

    vocals_path: Optional[str]         = None
    instrumental_path: Optional[str]   = None
    rvc_output_path: Optional[str]     = None
    refined_vocals_path: Optional[str] = None
    final_mix_path: Optional[str]      = None

    stage1_status: StageStatus = StageStatus.PENDING
    stage2_status: StageStatus = StageStatus.PENDING
    stage3_status: StageStatus = StageStatus.PENDING
    stage4_status: StageStatus = StageStatus.PENDING

    error: Optional[str] = None
    progress: int = 0


_jobs: dict[str, PipelineJob] = {}


def create_job(input_path, rvc_model, rvc_pitch=0, rvc_protect=0.55,
               ace_strength=0.4, ace_steps=24, sep_model="bs_roformer_1297",
               vocal_chain_preset="studio_radio",
               enable_stage3=False, enable_stage4=True):
    job_id = str(uuid.uuid4())[:8]
    job = PipelineJob(
        job_id=job_id, input_path=input_path, rvc_model=rvc_model,
        rvc_pitch=rvc_pitch, rvc_protect=rvc_protect,
        ace_strength=ace_strength, ace_steps=ace_steps,
        sep_model=sep_model, vocal_chain_preset=vocal_chain_preset,
        enable_stage3=enable_stage3, enable_stage4=enable_stage4,
    )
    _jobs[job_id] = job
    (AUDIO_DIR / job_id).mkdir(parents=True, exist_ok=True)
    return job


def get_job(job_id: str) -> Optional[PipelineJob]:
    return _jobs.get(job_id)


# ── Stage 1: BS RoFormer ──────────────────────────────────────────────────────
async def run_stage1_separation(job: PipelineJob) -> bool:
    job.stage1_status = StageStatus.RUNNING
    job.progress = 5
    job_dir = AUDIO_DIR / job.job_id
    try:
        async with aiohttp.ClientSession() as session:
            with open(job.input_path, "rb") as f:
                data = aiohttp.FormData()
                data.add_field("file", f, filename=os.path.basename(job.input_path), content_type="audio/mpeg")
                data.add_field("model", job.sep_model)
                data.add_field("mode",  "stems")
                async with session.post(f"{BACKEND_URL}/demucs_separate", data=data,
                                        timeout=aiohttp.ClientTimeout(total=300)) as resp:
                    if resp.status != 200:
                        raise Exception(f"Separare esuata ({resp.status}): {await resp.text()}")
                    result = await resp.json()

        if result.get("status") != "ok":
            raise Exception(result.get("error", "Separare esuata"))

        stems      = result.get("stems", {})
        vocals_url = stems.get("vocals")
        inst_url   = stems.get("instrumental") or stems.get("other")
        if not vocals_url:
            raise Exception(f"Nu gasesc vocals: {stems}")

        vocals_path = str(job_dir / "vocals.wav")
        inst_path   = str(job_dir / "instrumental.wav")

        async with aiohttp.ClientSession() as session:
            async with session.get(f"{BACKEND_URL}{vocals_url}") as r:
                if r.status != 200:
                    raise Exception(f"Download vocals esuat: {r.status}")
                async with aiofiles.open(vocals_path, "wb") as out:
                    await out.write(await r.read())
            if inst_url:
                async with session.get(f"{BACKEND_URL}{inst_url}") as r:
                    if r.status == 200:
                        async with aiofiles.open(inst_path, "wb") as out:
                            await out.write(await r.read())

        job.vocals_path       = vocals_path
        job.instrumental_path = inst_path if inst_url else None
        job.stage1_status     = StageStatus.DONE
        job.progress          = 30
        return True
    except Exception as e:
        job.stage1_status = StageStatus.ERROR
        job.error         = f"Stage 1 error: {e}"
        return False


# ── Stage 2: RVC ──────────────────────────────────────────────────────────────
async def run_stage2_rvc(job: PipelineJob) -> bool:
    job.stage2_status = StageStatus.RUNNING
    job.progress      = 35
    job_dir    = AUDIO_DIR / job.job_id
    rvc_output = str(job_dir / "converted_raw.mp3")
    try:
        async with aiohttp.ClientSession() as session:
            with open(job.vocals_path, "rb") as f:
                data = aiohttp.FormData()
                data.add_field("vocal_file", f, filename="vocals.wav", content_type="audio/wav")
                data.add_field("model_name",    job.rvc_model)
                data.add_field("pitch_shift",   str(job.rvc_pitch))
                data.add_field("protect",       str(job.rvc_protect))
                data.add_field("f0_method",     "harvest")  # Changed from rmvpe — better for singing
                data.add_field("index_rate",    "0.40")     # Changed from 0.75 — preserves timbre
                data.add_field("filter_radius", "3")
                data.add_field("rms_mix_rate",  "0.25")
                data.add_field("emotion",       "neutral")
                data.add_field("output_format", "mp3")
                data.add_field("dry_wet",       "1.0")
                data.add_field("formant_shift", "0.0")
                data.add_field("auto_tune",     "false")
                async with session.post(f"{BACKEND_URL}/rvc/convert", data=data,
                                        timeout=aiohttp.ClientTimeout(total=600)) as resp:
                    if resp.status != 200:
                        raise Exception(f"RVC esuat ({resp.status}): {await resp.text()}")
                    result = await resp.json()

        if result.get("status") != "ok":
            raise Exception(result.get("error", "RVC esuata"))
        out_url = result.get("url") or result.get("output_url")
        if not out_url:
            raise Exception(f"RVC fara URL: {result}")

        async with aiohttp.ClientSession() as session:
            async with session.get(f"{BACKEND_URL}{out_url}") as r:
                if r.status != 200:
                    raise Exception(f"Download RVC esuat: {r.status}")
                async with aiofiles.open(rvc_output, "wb") as out:
                    await out.write(await r.read())

        job.rvc_output_path = rvc_output
        job.stage2_status   = StageStatus.DONE
        job.progress        = 58
        return True
    except Exception as e:
        job.stage2_status = StageStatus.ERROR
        job.error         = f"Stage 2 error: {e}"
        return False


# ── Stage 3: ACE-Step ─────────────────────────────────────────────────────────
async def run_stage3_refinement(job: PipelineJob) -> bool:
    if not job.enable_stage3:
        job.stage3_status       = StageStatus.SKIPPED
        job.refined_vocals_path = job.rvc_output_path
        job.progress            = 65
        return True

    job.stage3_status = StageStatus.RUNNING
    job.progress      = 62
    job_dir      = AUDIO_DIR / job.job_id
    final_output = str(job_dir / "final_refined_vocals.wav")

    try:
        async with aiohttp.ClientSession() as session:
            with open(job.rvc_output_path, "rb") as f:
                data = aiohttp.FormData()
                data.add_field("file", f, filename="converted_raw.mp3", content_type="audio/mpeg")
                data.add_field("denoise_strength",    str(job.ace_strength))
                data.add_field("num_inference_steps", str(job.ace_steps))
                data.add_field("guidance_scale",      "3.5")
                data.add_field("prompt",              "")
                data.add_field("tags",                "vocals, clean, studio quality")
                async with session.post(f"{ACE_URL}/audio2audio", data=data,
                                        timeout=aiohttp.ClientTimeout(total=600)) as resp:
                    if resp.status != 200:
                        raise Exception(f"ACE-Step esuat ({resp.status}): {await resp.text()}")
                    ct = resp.headers.get("content-type", "")
                    if "audio" in ct or "octet-stream" in ct:
                        async with aiofiles.open(final_output, "wb") as out:
                            await out.write(await resp.read())
                    else:
                        result  = await resp.json()
                        out_url = result.get("output_url") or result.get("url") or result.get("path")
                        if not out_url:
                            raise Exception(f"ACE-Step raspuns neasteptat: {result}")
                        base = ACE_URL if out_url.startswith("/") else ""
                        async with session.get(f"{base}{out_url}") as r:
                            async with aiofiles.open(final_output, "wb") as out:
                                await out.write(await r.read())

        job.refined_vocals_path = final_output
        job.stage3_status       = StageStatus.DONE
        job.progress            = 75
        return True
    except Exception as e:
        # Graceful degradation — continue to Stage 4 with RVC output
        job.stage3_status       = StageStatus.ERROR
        job.refined_vocals_path = job.rvc_output_path
        print(f"[Stage3] Error (graceful fallback to RVC): {e}")
        return True


# ── Stage 4: Mix & Master ─────────────────────────────────────────────────────
async def run_stage4_mix(job: PipelineJob) -> bool:
    if not job.enable_stage4:
        job.stage4_status = StageStatus.SKIPPED
        job.progress      = 100
        return True

    if not job.instrumental_path or not os.path.exists(job.instrumental_path):
        job.stage4_status = StageStatus.SKIPPED
        job.progress      = 100
        print("[Stage4] No instrumental — skipping mix")
        return True

    vocal_source = job.refined_vocals_path or job.rvc_output_path
    if not vocal_source or not os.path.exists(vocal_source):
        job.stage4_status = StageStatus.ERROR
        job.error         = "Stage 4: no vocal source"
        return False

    job.stage4_status = StageStatus.RUNNING
    job.progress      = 78

    job_dir    = AUDIO_DIR / job.job_id
    output_wav = str(job_dir / "final_master.wav")

    try:
        from core.modules.mix_master import mix_and_master
        await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: mix_and_master(
                vocal_path=vocal_source,
                instrumental_path=job.instrumental_path,
                output_path=output_wav,
                vocal_gain_db=0.0,
                inst_gain_db=0.0,
                vocal_chain_preset=job.vocal_chain_preset,
            )
        )
        if not os.path.exists(output_wav):
            raise RuntimeError("final_master.wav not found after mix")

        job.final_mix_path = output_wav
        job.stage4_status  = StageStatus.DONE
        job.progress       = 100
        print(f"[Stage4] Done: {output_wav}")
        return True
    except Exception as e:
        job.stage4_status = StageStatus.ERROR
        job.error         = f"Stage 4 error: {e}"
        print(f"[Stage4] Error: {e}")
        return False


# ── Full Pipeline ─────────────────────────────────────────────────────────────
async def run_pipeline(job_id: str):
    job = get_job(job_id)
    if not job:
        return
    job.progress = 0
    if not await run_stage1_separation(job): return
    if not await run_stage2_rvc(job):        return
    await run_stage3_refinement(job)
    await run_stage4_mix(job)
    job.progress = 100
    print(f"[Pipeline {job_id}] Complete!")
