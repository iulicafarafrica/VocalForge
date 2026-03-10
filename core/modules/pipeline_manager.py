"""
core/modules/pipeline_manager.py
Pipeline: Separation → (optional RVC) → UVR5 Clarification → FFmpeg Post-process
"""

import os
import uuid
import asyncio
import aiohttp
import aiofiles
import shutil
import librosa
import soundfile as sf
import numpy as np
import torch
import gc
import subprocess
from pathlib import Path
from typing import Optional
from dataclasses import dataclass
from enum import Enum

BASE_DIR    = Path("D:/VocalForge")
AUDIO_DIR   = BASE_DIR / "audio" / "pipeline"
BACKEND_URL = "http://localhost:8000"

# === UVR5 CONFIG ===
# User needs to install UVR5 from: https://github.com/Anjok07/ultimatevocalremovergui/releases
UVR_PATH = r"D:\Tools\UVR5\UVR.exe"  # Update this path after installation
UVR_MODEL = "VR-De-Reverb-Ensemble"  # Options: VR-De-Reverb-Ensemble, MDX23C-DeReverb, HP-Karaoke-UVR
USE_RVC = True  # Set False to skip RVC entirely


def force_cleanup():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.ipc_collect()
    print("[SYSTEM] [OK] VRAM curatat complet.")


class StageStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    DONE    = "done"
    ERROR   = "error"


@dataclass
class PipelineJob:
    job_id: str
    input_path: str
    rvc_model: str = "none"  # "none" = skip RVC
    rvc_pitch: int = 0
    rvc_protect: float = 0.55  # Optimized for singing
    sep_model: str = "bs_roformer_1297"
    
    # Applio Features (Stage 2)
    enable_autotune: bool = True
    autotune_strength: float = 0.4
    enable_highpass: bool = True
    enable_volume_envelope: bool = True
    
    # Stage 3 Clarification (optional)
    enable_stage3: bool = False  # Default OFF (like RVC Tab)

    vocals_path: Optional[str] = None
    instrumental_path: Optional[str] = None  # Stage 1 output
    rvc_output_path: Optional[str] = None
    clarified_path: Optional[str] = None
    final_output_path: Optional[str] = None  # Doar vocal clarificat
    final_mix_path: Optional[str] = None  # Stage 4: Vocal + Instrumental mix

    stage1_status: StageStatus = StageStatus.PENDING
    stage2_status: StageStatus = StageStatus.PENDING
    stage3_status: StageStatus = StageStatus.PENDING
    stage4_status: StageStatus = StageStatus.PENDING

    error: Optional[str] = None
    progress: int = 0


_jobs: dict[str, PipelineJob] = {}


def create_job(input_path, rvc_model="none", rvc_pitch=0, rvc_protect=0.33, sep_model="bs_roformer_1297"):
    job_id = str(uuid.uuid4())[:8]
    job = PipelineJob(
        job_id=job_id, input_path=input_path, rvc_model=rvc_model,
        rvc_pitch=rvc_pitch, rvc_protect=rvc_protect, sep_model=sep_model
    )
    _jobs[job_id] = job
    (AUDIO_DIR / job_id).mkdir(parents=True, exist_ok=True)
    return job


def get_job(job_id: str) -> Optional[PipelineJob]:
    return _jobs.get(job_id)


# Stage 1: Separation
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
                data.add_field("mode", "stems")

                async with session.post(f"{BACKEND_URL}/demucs_separate", data=data, timeout=300) as resp:
                    if resp.status != 200:
                        raise Exception(f"Separare esuata ({resp.status}): {await resp.text()}")
                    result = await resp.json()

        stems = result.get("stems", {})
        vocals_url = stems.get("vocals")
        instrumental_url = stems.get("instrumental") or stems.get("other")

        if not vocals_url:
            raise Exception("No vocals in response")

        vocals_path = str(job_dir / "vocals.wav")
        instrumental_path = str(job_dir / "instrumental.wav")

        async with aiohttp.ClientSession() as session:
            async with session.get(f"{BACKEND_URL}{vocals_url}") as r:
                async with aiofiles.open(vocals_path, "wb") as out:
                    await out.write(await r.read())

            if instrumental_url:
                async with session.get(f"{BACKEND_URL}{instrumental_url}") as r:
                    async with aiofiles.open(instrumental_path, "wb") as out:
                        await out.write(await r.read())

        job.vocals_path = vocals_path
        job.instrumental_path = instrumental_path if instrumental_url else None

        normalize_audio_to_target(vocals_path, vocals_path, target_db=-1.0)

        job.stage1_status = StageStatus.DONE
        job.progress = 35
        print(f"[Stage 1] OK: {vocals_path}")
        return True

    except Exception as e:
        job.stage1_status = StageStatus.ERROR
        job.error = str(e)
        print(f"[Stage 1] Error: {e}")
        return False


# Stage 2: RVC (optional)
async def run_stage2_rvc(job: PipelineJob) -> bool:
    if job.rvc_model == "none":
        print("[Stage 2] Skipped (no RVC)")
        job.rvc_output_path = job.vocals_path
        job.stage2_status = StageStatus.DONE
        job.progress = 65
        return True

    job.stage2_status = StageStatus.RUNNING
    job.progress = 40
    job_dir = AUDIO_DIR / job.job_id
    rvc_output = str(job_dir / "converted_raw.wav")

    try:
        async with aiohttp.ClientSession() as session:
            with open(job.vocals_path, "rb") as f:
                data = aiohttp.FormData()
                data.add_field("vocal_file", f, filename="vocals.wav", content_type="audio/wav")
                data.add_field("model_name", job.rvc_model)
                data.add_field("pitch_shift", str(job.rvc_pitch))
                data.add_field("protect", str(job.rvc_protect))
                
                # Optimized parameters for SINGING (not speech)
                data.add_field("f0_method", "harvest")        # Better for singing
                data.add_field("index_rate", "0.40")          # Preserves original style
                data.add_field("filter_radius", "3")
                data.add_field("rms_mix_rate", "0.25")
                data.add_field("emotion", "neutral")
                data.add_field("output_format", "wav")
                data.add_field("dry_wet", "1.0")
                data.add_field("formant_shift", "0.0")
                
                # Applio Features
                data.add_field("auto_tune", str(job.enable_autotune).lower())
                data.add_field("autotune_strength", str(job.autotune_strength))
                data.add_field("apply_highpass", str(job.enable_highpass).lower())
                data.add_field("volume_envelope", str(job.enable_volume_envelope))

                async with session.post(f"{BACKEND_URL}/rvc/convert", data=data, timeout=600) as resp:
                    if resp.status != 200:
                        raise Exception(f"RVC failed ({resp.status}): {await resp.text()}")
                    result = await resp.json()

        out_url = result.get("url") or result.get("output_url")
        if not out_url:
            raise Exception("No RVC output URL")

        async with aiohttp.ClientSession() as session:
            async with session.get(f"{BACKEND_URL}{out_url}") as r:
                async with aiofiles.open(rvc_output, "wb") as out:
                    await out.write(await r.read())

        job.rvc_output_path = rvc_output

        await unload_rvc_model_from_backend()

        job.stage2_status = StageStatus.DONE
        job.progress = 65
        print(f"[Stage 2] OK: {rvc_output}")
        return True

    except Exception as e:
        job.stage2_status = StageStatus.ERROR
        job.error = str(e)
        print(f"[Stage 2] Error: {e}")
        return False


# Stage 3: Clarificare cu BS-RoFormer + FFmpeg (fără UVR5)
async def run_stage3_clarify(job: PipelineJob) -> bool:
    job.stage3_status = StageStatus.RUNNING
    job.progress = 80

    try:
        input_wav = job.rvc_output_path or job.vocals_path
        output_dir = AUDIO_DIR / job.job_id / "clarified"
        output_dir.mkdir(exist_ok=True)
        final_path = str(AUDIO_DIR / job.job_id / "final_clear_vocals.wav")

        print(f"\n[Stage 3] Clarificare ușoară (fără UVR5): {input_wav}")

        # Pas 1: Re-extragere vocals cu BS-RoFormer (reduce artefacte reziduale)
        # Folosim endpoint-ul /demucs_separate care deja funcționează
        print(f"[Stage 3] Re-separare prin backend API...")
        
        temp_clarified = str(output_dir / "temp_vocals.wav")
        
        async with aiohttp.ClientSession() as session:
            with open(input_wav, "rb") as f:
                data = aiohttp.FormData()
                data.add_field("file", f, filename=os.path.basename(input_wav), content_type="audio/wav")
                data.add_field("model", "bs_roformer_1297")
                data.add_field("mode", "stems")
                data.add_field("single_stem", "vocals")

                async with session.post(
                    f"{BACKEND_URL}/demucs_separate",
                    data=data,
                    timeout=aiohttp.ClientTimeout(total=120)
                ) as resp:
                    if resp.status != 200:
                        raise Exception(f"Re-separare esuata ({resp.status}): {await resp.text()}")
                    result = await resp.json()

            if result.get("status") != "ok":
                raise Exception(f"Re-separare esuata: {result.get('error')}")

            # Descarcă vocals din response (în aceeași session)
            stems = result.get("stems", {})
            vocals_url = stems.get("vocals")
            
            if not vocals_url:
                # Fallback: folosim input-ul dacă nu s-a creat nou
                temp_clarified = input_wav
                print("[Stage 3] Fallback: nu s-a creat vocals, folosim input-ul")
            else:
                # Descarcă vocals
                async with session.get(f"{BACKEND_URL}{vocals_url}") as r:
                    async with aiofiles.open(temp_clarified, "wb") as out:
                        await out.write(await r.read())
                print(f"[Stage 3] Re-separare OK: {temp_clarified}")

        # Pas 2: FFmpeg curățare (fără lowpass și afftdn - prea agresive)
        # Filtre: highpass, deesser, loudnorm (-10 LUFS for commercial loudness), compressor
        ffmpeg_cmd = [
            "ffmpeg", "-y", "-i", temp_clarified,
            "-af",
            "highpass=f=100, "           # Elimină rumble sub 100Hz
            # "lowpass=f=8000, "         # ❌ SCOS (taie prea mult din "air" și "sparkle")
            # "afftdn=..."               # ❌ SCOS (distruge armonicele naturale)
            "deesser=i=0.1, "            # Controlează sibilanțele
            "loudnorm=I=-10:TP=-1:LRA=11, "  # Commercial loudness (-10 LUFS, like Spotify/YouTube)
            "acompressor=threshold=-1dB:ratio=1.5:attack=5:release=50",  # Compresie ușoară
            final_path
        ]

        print(f"\n[Stage 3] FFmpeg curățare: {' '.join(ffmpeg_cmd)}")
        ffmpeg_result = subprocess.run(ffmpeg_cmd, check=True, capture_output=True, text=True, timeout=60)
        print(f"[FFmpeg Clarify] Output:\n{ffmpeg_result.stdout}")

        if not Path(final_path).exists():
            raise Exception("FFmpeg nu a creat fișierul final")

        job.final_output_path = final_path
        job.stage3_status = StageStatus.DONE
        job.progress = 100
        print(f"\n[Pipeline] Final clar (fără UVR5): {final_path}")
        return True

    except subprocess.TimeoutExpired as e:
        job.stage3_status = StageStatus.ERROR
        job.error = f"Timeout: {e}"
        print(f"[Stage 3] Timeout Error: {e}")
        return False

    except subprocess.CalledProcessError as e:
        job.stage3_status = StageStatus.ERROR
        job.error = f"Process error: {e.stderr}"
        print(f"[Stage 3] Process Error: {e.stderr}")
        return False

    except Exception as e:
        job.stage3_status = StageStatus.ERROR
        job.error = str(e)
        print(f"[Stage 3] Error: {e}")
        return False


# Stage 4: Mix Final - Vocal + Instrumental
async def run_stage4_mix(job: PipelineJob) -> bool:
    """
    Stage 4: Mix clarified vocals with instrumental from Stage 1
    Similar to RVC Auto Pipeline → Final Mix workflow
    """
    job.stage4_status = StageStatus.RUNNING
    job.progress = 95

    try:
        # Check if we have instrumental
        if not job.instrumental_path or not Path(job.instrumental_path).exists():
            print("[Stage 4] No instrumental found - skipping mix")
            job.final_mix_path = job.final_output_path  # Use vocal-only as final
            job.stage4_status = StageStatus.DONE
            job.progress = 100
            return True

        vocal_wav = job.final_output_path
        instrumental_wav = job.instrumental_path
        mix_output = str(AUDIO_DIR / job.job_id / "final_mix.wav")

        print(f"\n[Stage 4] Mix Final: Vocal + Instrumental")
        print(f"  Vocal: {vocal_wav}")
        print(f"  Instrumental: {instrumental_wav}")

        # Get durations to match
        vocal_dur = librosa.get_duration(path=vocal_wav)
        inst_dur = librosa.get_duration(path=instrumental_wav)

        print(f"  Vocal duration: {vocal_dur:.2f}s")
        print(f"  Instrumental duration: {inst_dur:.2f}s")

        # Build FFmpeg mix command
        # Mix vocal (front) with instrumental, boosted volumes for commercial loudness
        if vocal_dur <= inst_dur:
            # Vocal mai scurt - tăiem instrumentalul
            ffmpeg_cmd = [
                "ffmpeg", "-y",
                "-i", vocal_wav,
                "-i", instrumental_wav,
                "-filter_complex",
                f"[0:a]volume=1.2[v]; [1:a]volume=1.0,atrim=0:{vocal_dur}[i]; [v][i]amix=inputs=2:duration=shortest",
                # Boost: Vocal 1.2x (+1.6dB), Instrumental 1.0x (0dB)
                "-c:a", "pcm_s16le",
                mix_output
            ]
        else:
            # Vocal mai lung - loop instrumental sau trim
            ffmpeg_cmd = [
                "ffmpeg", "-y",
                "-i", vocal_wav,
                "-i", instrumental_wav,
                "-filter_complex",
                f"[0:a]volume=1.2[v]; [1:a]volume=1.0,atrim=0:{vocal_dur}[i]; [v][i]amix=inputs=2:duration=shortest",
                # Boost: Vocal 1.2x (+1.6dB), Instrumental 1.0x (0dB)
                "-c:a", "pcm_s16le",
                mix_output
            ]

        print(f"[Stage 4] FFmpeg mix: {' '.join(ffmpeg_cmd)}")
        result = subprocess.run(ffmpeg_cmd, check=True, capture_output=True, text=True, timeout=120)
        print(f"[Stage 4] Mix output:\n{result.stdout}")

        if not Path(mix_output).exists():
            raise Exception("FFmpeg mix failed")

        job.final_mix_path = mix_output
        job.stage4_status = StageStatus.DONE
        job.progress = 100
        print(f"\n[Stage 4] OK Mix final: {mix_output}")
        return True

    except Exception as e:
        job.stage4_status = StageStatus.ERROR
        job.error = f"Mix error: {str(e)}"
        print(f"[Stage 4] Error: {e}")
        # Fallback: use vocal-only
        job.final_mix_path = job.final_output_path
        return False


# Stage 4: FFmpeg Post-process
def run_stage4_postprocess(job: PipelineJob) -> bool:
    job.progress = 95

    try:
        input_wav = job.clarified_path or job.rvc_output_path or job.vocals_path
        final_path = str(AUDIO_DIR / job.job_id / "final_clear_vocals.wav")

        print(f"\n[Stage 4] FFmpeg Post-Process: {input_wav} → {final_path}")

        cmd = [
            "ffmpeg", "-y", "-i", input_wav,
            "-af", "highpass=f=100, loudnorm=I=-16:TP=-1:LRA=11, limiter=limit=0.99",
            final_path
        ]

        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(f"[FFmpeg] Output:\n{result.stdout}")

        if not Path(final_path).exists():
            raise Exception("FFmpeg did not generate final file")

        job.final_output_path = final_path
        job.progress = 100
        print(f"[Stage 4] OK: {final_path}")
        return True

    except Exception as e:
        print(f"[Stage 4] Error: {e}")
        return False


async def run_pipeline(job_id: str):
    job = get_job(job_id)
    if not job:
        print(f"[Pipeline] Job not found: {job_id}")
        return

    print(f"\n{'='*60}")
    print(f"[Pipeline] Starting job: {job_id}")
    print(f"Input: {job.input_path}")
    print(f"RVC Model: {job.rvc_model}")
    print(f"{'='*60}\n")

    job.progress = 0

    # Stage 1: Separation
    print("[Pipeline] Stage 1/4: BS-RoFormer Separation...")
    if not await run_stage1_separation(job):
        print("[Pipeline] Failed at Stage 1")
        return
    print("[Pipeline] Stage 1 OK\n")

    # Stage 2: RVC (optional)
    if USE_RVC and job.rvc_model != "none":
        print("[Pipeline] Stage 2/4: RVC Voice Conversion...")
        if not await run_stage2_rvc(job):
            print("[Pipeline] Failed at Stage 2")
            return
        print("[Pipeline] Stage 2 OK\n")
    else:
        print("[Pipeline] Stage 2/4: Skipped (no RVC)")
        job.rvc_output_path = job.vocals_path
        job.stage2_status = StageStatus.DONE
        job.progress = 50
        print("[Pipeline] Stage 2 SKIPPED\n")

    # Stage 3: Clarificare (BS-RoFormer re-extract + FFmpeg) - OPȚIONAL
    if job.enable_stage3:
        print("[Pipeline] Stage 3/4: Clarificare (BS-RoFormer + FFmpeg)...")
        if not await run_stage3_clarify(job):
            print("[Pipeline] Failed at Stage 3")
            return
        print("[Pipeline] Stage 3 OK\n")
    else:
        print("[Pipeline] Stage 3/4: Skipped (Stage 3 disabled)")
        job.final_output_path = job.rvc_output_path  # Use RVC output as final
        job.stage3_status = StageStatus.DONE
        job.progress = 85
        print("[Pipeline] Stage 3 SKIPPED (vocal will be mixed directly)\n")

    # Stage 4: Mix Final (Vocal + Instrumental)
    print("[Pipeline] Stage 4/4: Mix Final (Vocal + Instrumental)...")
    if not await run_stage4_mix(job):
        print("[Pipeline] Failed at Stage 4")
        return
    print("[Pipeline] Stage 4 OK\n")

    print(f"{'='*60}")
    print(f"[Pipeline] COMPLETED SUCCESSFULLY!")
    print(f"Final vocal (clarified): {job.final_output_path}")
    print(f"Final mix (vocal + instrumental): {job.final_mix_path}")
    print(f"{'='*60}\n")


def normalize_audio_to_target(input_path, output_path, target_db=-1.0):
    try:
        y, sr = librosa.load(input_path, sr=None)
        target_amplitude = 10 ** (target_db / 20)
        current_rms = np.sqrt(np.mean(y**2))
        y_normalized = y * (target_amplitude / (current_rms + 1e-6))
        sf.write(output_path, y_normalized, sr)
        print(f"[Pipeline] Normalized to {target_db}dB.")
    except Exception as e:
        print(f"[Pipeline] Normalization failed: {e}")


async def unload_rvc_model_from_backend():
    """
    Unload RVC model from backend to free VRAM.
    Endpoint: GET /rvc/unload
    """
    try:
        async with aiohttp.ClientSession() as session:
            # GET /rvc/unload (nu POST /rvc/unload_model)
            async with session.get(f"{BACKEND_URL}/rvc/unload", timeout=10) as resp:
                if resp.status == 200:
                    print(f"[unload_rvc] Model unloaded successfully")
                elif resp.status == 404:
                    print(f"[unload_rvc] Endpoint not found (404) - model may already be unloaded")
                else:
                    print(f"[unload_rvc] Status: {resp.status}")
    except Exception as e:
        print(f"[unload_rvc] Error: {e}")
