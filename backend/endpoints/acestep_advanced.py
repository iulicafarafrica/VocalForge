"""
ACE-Step Advanced Features: Repaint, Lego, Complete
Endpoints for advanced music editing and generation

Fixed version with proper authentication and status parsing.
"""

import os
import uuid
import json
import time
import shutil
import asyncio
import tempfile
import traceback
import soundfile as sf
from datetime import datetime
from typing import Optional, Tuple, Any, Dict, List

from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse

# Import configuration
from endpoints.acestep_config import ACE_STEP_API, ACE_STEP_API_KEY, OUTPUT_DIR

router = APIRouter(prefix="/acestep", tags=["ACE-Step Advanced"])


# =============================================================================
# Helper Functions
# =============================================================================

def _map_acestep_status(status_raw: Any) -> int:
    """
    Map ACE-Step status to integer code.
    
    ACE-Step returns status as string ("running", "succeeded", "failed"),
    but we convert to int for consistency:
        0 = running
        1 = succeeded
        2 = failed
    """
    if isinstance(status_raw, int):
        return status_raw
    
    if isinstance(status_raw, str):
        status_map = {
            "running": 0,
            "succeeded": 1,
            "failed": 2,
            "success": 1,
            "error": 2,
            "timeout": 2,
        }
        return status_map.get(status_raw.lower(), 0)
    
    return 0  # Default to running


def _extract_audio_file_path(result_arr: List[Dict]) -> Optional[str]:
    """Extract audio file path from ACE-Step result array."""
    if not result_arr or not isinstance(result_arr, list):
        return None
    
    for item in result_arr:
        if isinstance(item, dict):
            # Try different possible keys
            for key in ["file", "audio_path", "path", "audio_file"]:
                if item.get(key):
                    return item[key]
    
    return None


async def _poll_acestep_task(
    client,
    task_id: str,
    job_id: str,
    max_wait: int = 300
) -> Tuple[str, List[Dict]]:
    """
    Poll ACE-Step task until completion.
    
    Args:
        client: httpx.AsyncClient instance
        task_id: ACE-Step task ID to poll
        job_id: Local job ID for logging
        max_wait: Maximum wait time in seconds
    
    Returns:
        Tuple of (audio_file_path, result_array)
    
    Raises:
        RuntimeError: If task fails
        TimeoutError: If task times out
    """
    poll_interval = 3.0
    elapsed = 0

    # Prepare headers with API key if configured
    poll_headers = {}
    if ACE_STEP_API_KEY:
        poll_headers["Authorization"] = f"Bearer {ACE_STEP_API_KEY}"

    while elapsed < max_wait:
        await asyncio.sleep(poll_interval)
        elapsed += poll_interval

        # Query task result
        r = await client.post(
            f"{ACE_STEP_API}/query_result",
            json={"task_id_list": [task_id]},
            headers=poll_headers,
        )

        if r.status_code != 200:
            print(f"[ACE {job_id[:8]}] query_result HTTP {r.status_code}, retrying...")
            continue
        
        resp_data = r.json()
        data_list = resp_data.get("data") or resp_data
        
        if not isinstance(data_list, list) or not data_list:
            continue
        
        item = data_list[0]
        status_int = _map_acestep_status(item.get("status", 0))
        progress_text = item.get("progress_text", "")
        
        # Clean up progress text
        if " | " in progress_text:
            progress_text = progress_text.split(" | ")[-1].strip()
        
        print(f"[ACE {job_id[:8]}] Status: {status_int} | {progress_text} ({round(elapsed)}s)")
        
        if status_int == 2:
            # Failed - extract error message
            result_str = item.get("result", "[]")
            try:
                result_arr = json.loads(result_str) if isinstance(result_str, str) else result_str
                err = (result_arr[0].get("error") if result_arr else None) or "Unknown error"
            except Exception:
                err = result_str[:200] if result_str else "Unknown error"
            raise RuntimeError(f"ACE-Step failed: {err}")
        
        if status_int == 1:
            # Succeeded - extract audio file path
            result_str = item.get("result", "[]")
            try:
                result_arr = json.loads(result_str) if isinstance(result_str, str) else result_str
            except Exception:
                result_arr = []
            
            audio_file_path = _extract_audio_file_path(result_arr)
            
            if not audio_file_path:
                raise RuntimeError("ACE-Step succeeded but no audio file path in result")
            
            return audio_file_path, result_arr
    
    raise TimeoutError(f"ACE-Step timed out after {max_wait}s")


def _convert_wav_to_mp3(
    wav_path: str,
    mp3_path: str,
    bitrate: str = "320k"
) -> str:
    """
    Convert WAV to MP3 via FFmpeg.
    
    Returns mp3_path on success, else wav_path.
    """
    import subprocess
    
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        wav_path,
        "-codec:a",
        "libmp3lame",
        "-b:a",
        bitrate,
        "-q:a",
        "2",
        mp3_path,
    ]
    
    r = subprocess.run(cmd, capture_output=True, text=True)
    
    if r.returncode == 0 and os.path.exists(mp3_path) and os.path.getsize(mp3_path) > 0:
        try:
            os.remove(wav_path)
        except Exception:
            pass
        return mp3_path
    
    return wav_path


async def _download_acestep_audio(
    client,
    audio_file_path: str,
    job_id: str,
    output_format: str = "mp3"
) -> Tuple[str, str]:
    """
    Download audio from ACE-Step and save to output directory.

    Converts to MP3 when output_format is 'mp3'.

    Returns:
        Tuple of (output_path, output_filename)
    """
    import urllib.parse

    real_path = audio_file_path

    # Parse audio path if it's a URL
    if "/v1/audio" in audio_file_path:
        if audio_file_path.startswith("http"):
            parsed = urllib.parse.urlparse(audio_file_path)
        else:
            parsed = urllib.parse.urlparse(f"http://localhost{audio_file_path}")
        qs = urllib.parse.parse_qs(parsed.query)
        path_vals = qs.get("path", [])
        if path_vals:
            real_path = urllib.parse.unquote(path_vals[0])

    # ACE-Step returns WAV; we always save to .wav first, then convert to mp3 if requested
    out_filename = f"{job_id}_ace.{output_format}"
    wav_path = os.path.join(OUTPUT_DIR, f"{job_id}_ace.wav")
    out_path = os.path.join(OUTPUT_DIR, out_filename)

    print(f"[ACE {job_id[:8]}] OUTPUT_DIR: {OUTPUT_DIR}")
    print(f"[ACE {job_id[:8]}] Real path from ACE-Step: {real_path}")
    print(f"[ACE {job_id[:8]}] Will save to: {out_path}")

    # Copy from disk or download via HTTP
    if os.path.exists(real_path):
        shutil.copy2(real_path, wav_path)
        print(f"[ACE {job_id[:8]}] Copied from disk: {real_path} -> {wav_path}")
    else:
        # Build download URL
        if "/v1/audio" in audio_file_path:
            download_url = (
                audio_file_path
                if audio_file_path.startswith("http")
                else f"{ACE_STEP_API}{audio_file_path}"
            )
        else:
            encoded = urllib.parse.quote(real_path, safe="")
            download_url = f"{ACE_STEP_API}/v1/audio?path={encoded}"

        print(f"[ACE {job_id[:8]}] Downloading from: {download_url}")
        r = await client.get(download_url)

        if r.status_code != 200:
            raise RuntimeError(f"Failed to download audio (HTTP {r.status_code})")

        with open(wav_path, "wb") as f_out:
            f_out.write(r.content)
        print(f"[ACE {job_id[:8]}] Downloaded to: {wav_path}")

    # Convert to MP3 if requested
    if output_format.lower() == "mp3":
        out_path = _convert_wav_to_mp3(wav_path, out_path)
        out_filename = f"{job_id}_ace.mp3"
        print(f"[ACE {job_id[:8]}] Converted to MP3: {out_path}")
    else:
        out_path = wav_path
        out_filename = f"{job_id}_ace.wav"

    print(f"[ACE {job_id[:8]}] Final output: {out_path}")
    return out_path, out_filename


# =============================================================================
# Repaint Endpoint
# =============================================================================

@router.post("/repaint")
async def repaint_audio(
    file: UploadFile = File(...),
    prompt: str = Form(""),
    start_time: float = Form(0.0),
    end_time: float = Form(-1.0),
    lyrics: str = Form(""),
    guidance_scale: float = Form(7.0),
    seed: int = Form(-1),
    infer_steps: int = Form(8),
    key_scale: str = Form(""),
    audio_format: str = Form("mp3"),
    dit_model: str = Form("acestep-v15-turbo"),
    audio_cover_strength: float = Form(1.0),
    bpm: int = Form(0),
    time_signature: str = Form(""),
    vocal_language: str = Form("unknown"),
    thinking: bool = Form(True),
):
    """
    Repaint: Selective audio editing and regeneration (ACE-Step v1.5 official API).
    
    Regenerates a specific time region (start_time to end_time) of the audio
    while keeping the rest unchanged.
    
    Official ACE-Step-1.5 parameters:
    - task_type: "repaint"
    - src_audio: path to source audio file
    - repainting_start: start time in seconds
    - repainting_end: end time in seconds (-1 for end of file)
    - caption: description for repainted section
    """
    import httpx
    import random

    job_id = uuid.uuid4().hex
    t_start = time.time()

    # Generate actual seed if -1 (random)
    actual_seed = seed if seed >= 0 else random.randint(0, 2**31)

    print(f"[REPAINT {job_id[:8]}] Region: {start_time}s-{end_time}s | prompt: '{prompt[:60]}' | seed={actual_seed}")

    src_path = None

    try:
        # Save uploaded file to temp
        fd, src_path = tempfile.mkstemp(prefix="repaint_src_", suffix=".wav")
        os.close(fd)

        src_bytes = await file.read()
        with open(src_path, "wb") as f:
            f.write(src_bytes)

        async with httpx.AsyncClient(timeout=300.0) as client:
            # Step 0: Ensure model is loaded
            model_init_needed = False
            try:
                models_response = await client.get(f"{ACE_STEP_API}/v1/models", timeout=10.0)
                if models_response.status_code == 200:
                    models_data = models_response.json()
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
                        print(f"[REPAINT {job_id[:8]}] Model {dit_model} not loaded, initializing...")
                    else:
                        print(f"[REPAINT {job_id[:8]}] Model {dit_model} already loaded")
                else:
                    model_init_needed = True
            except Exception as check_err:
                model_init_needed = True
                print(f"[REPAINT {job_id[:8]}] Model check skipped: {check_err}")

            # Initialize model if needed
            if model_init_needed:
                try:
                    init_response = await client.post(
                        f"{ACE_STEP_API}/v1/init",
                        json={"model": dit_model, "init_llm": False},
                        timeout=180.0
                    )
                    if init_response.status_code == 200:
                        init_data = init_response.json()
                        loaded_model = init_data.get("data", {}).get("loaded_model", dit_model)
                        print(f"[REPAINT {job_id[:8]}] ✅ Model loaded: {loaded_model}")
                        await asyncio.sleep(2)
                    else:
                        print(f"[REPAINT {job_id[:8]}] ⚠️ Model init returned status {init_response.status_code}")
                except Exception as init_err:
                    print(f"[REPAINT {job_id[:8]}] ⚠️ Model init error (may already be loaded): {init_err}")

            # Build ACE-Step v1.5 official repaint payload
            # Based on: https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/INFERENCE.md
            task_payload = {
                # Core repaint parameters (REQUIRED)
                "task_type": "repaint",
                "src_audio_path": src_path,
                "repainting_start": float(start_time),
                "repainting_end": float(end_time) if end_time > 0 else -1.0,
                "caption": prompt.strip() if prompt else "",
                
                # Optional metadata
                "bpm": int(bpm) if bpm > 0 else None,
                "key_scale": key_scale.strip() if key_scale else "",
                "time_signature": time_signature.strip() if time_signature else "",
                "vocal_language": vocal_language if vocal_language != "unknown" else "en",
                "lyrics": lyrics.strip() if lyrics else "",
                
                # Generation settings
                "inference_steps": int(infer_steps),
                "guidance_scale": float(guidance_scale),
                "seed": actual_seed,
                "use_random_seed": seed < 0,
                
                # Audio influence
                "audio_cover_strength": float(audio_cover_strength),
                
                # Advanced DiT settings
                "model": dit_model,
                "thinking": False,  # LLM disabled
                "use_cot_metas": False,  # LLM disabled
                "use_cot_caption": False,  # LLM disabled
                
                # Batch & decode settings
                "batch_size": 1,
                "use_tiled_decode": True,
                "audio_format": audio_format,
            }

            print(f"[REPAINT {job_id[:8]}] Submitting task to ACE-Step API...")
            
            # Add API key for authentication if configured
            submit_headers = {}
            if ACE_STEP_API_KEY:
                submit_headers["Authorization"] = f"Bearer {ACE_STEP_API_KEY}"
            
            r = await client.post(
                f"{ACE_STEP_API}/release_task",
                json=task_payload,
                headers=submit_headers,
            )

            if r.status_code != 200:
                raise RuntimeError(f"Task submission failed (HTTP {r.status_code}): {r.text[:500]}")

            task_data = r.json()
            task_id = (
                task_data.get("task_id")
                or task_data.get("id")
                or (task_data.get("data") or {}).get("task_id")
            )

            if not task_id:
                raise RuntimeError(f"No task_id in response: {task_data}")

            print(f"[REPAINT {job_id[:8]}] Task ID: {task_id}")

            # Poll for result
            audio_file_path, result_arr = await _poll_acestep_task(
                client, task_id, job_id
            )

            # Download audio
            out_path, out_filename = await _download_acestep_audio(
                client, audio_file_path, job_id, audio_format
            )

            # Get audio info
            audio_data, audio_sr = sf.read(out_path, dtype="float32")
            duration_sec = round(len(audio_data) / audio_sr, 2)
            out_size_mb = round(os.path.getsize(out_path) / 1024 / 1024, 2)
            t_sec = round(time.time() - t_start, 1)

            print(f"[REPAINT {job_id[:8]}] Done in {t_sec}s — {duration_sec}s audio")

            return {
                "status": "ok",
                "job_id": job_id,
                "filename": out_filename,
                "url": f"/tracks/{out_filename}",
                "duration_sec": duration_sec,
                "processing_time_sec": t_sec,
                "seed": actual_seed,
                "metadata": {
                    "input_file": file.filename,
                    "prompt": prompt,
                    "repaint_region": f"{start_time}s - {end_time if end_time > 0 else 'end'}s",
                    "seed": actual_seed,
                    "output_size_mb": out_size_mb,
                    "created_at": datetime.now().isoformat(),
                }
            }

    except Exception as e:
        print(f"[REPAINT {job_id[:8]}] ERROR: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": str(e),
                "traceback": traceback.format_exc()
            }
        )
    finally:
        # Cleanup temp file
        if src_path and os.path.exists(src_path):
            try:
                os.unlink(src_path)
            except Exception:
                pass


# =============================================================================
# Lego Endpoint
# =============================================================================

@router.post("/lego")
async def lego_generation(
    file: UploadFile = File(...),
    prompt: str = Form(""),
    start_time: float = Form(0.0),
    end_time: float = Form(-1.0),
    guidance_scale: float = Form(9.0),
    seed: int = Form(-1),
    infer_steps: int = Form(50),  # diffusion steps (50 optimal for sft/base models)
    audio_format: str = Form("mp3"),
    dit_model: str = Form("acestep-v15-sft"),
    instruction: str = Form(""),
):
    """
    Lego: Multi-track generation - add new layers to existing audio.
    
    Generates a specific track (drums, bass, guitar, etc.) based on the context
    of the existing audio.
    
    Example: Add drums to an existing melody, or add bass line to a guitar track.
    """
    import httpx
    
    job_id = uuid.uuid4().hex
    t_start = time.time()
    
    print(f"[LEGO {job_id[:8]}] Track: {track_name} | region: {start_time}s-{end_time}s")
    
    src_path = None
    
    try:
        # Save uploaded file to temp
        fd, src_path = tempfile.mkstemp(prefix="lego_src_", suffix=".wav")
        os.close(fd)
        
        src_bytes = await file.read()
        with open(src_path, "wb") as f:
            f.write(src_bytes)
        
        async with httpx.AsyncClient(timeout=300.0) as client:
            # Submit lego task
            task_payload = {
                "task_type": "lego",
                "src_audio_path": src_path,
                "prompt": prompt or instruction,
                "repainting_start": start_time,
                "repainting_end": end_time if end_time > 0 else -1.0,
                "inference_steps": infer_steps,
                "guidance_scale": guidance_scale,
                "use_random_seed": seed < 0,
                "seed": seed if seed >= 0 else -1,
                "audio_format": audio_format,
                "batch_size": 1,
                "use_tiled_decode": True,
                "model": dit_model,
                "instruction": instruction or f"Generate {prompt} track",
            }

            print(f"[LEGO {job_id[:8]}] Submitting task...")
            # Add API key for authentication if configured
            submit_headers = {}
            if ACE_STEP_API_KEY:
                submit_headers["Authorization"] = f"Bearer {ACE_STEP_API_KEY}"
            r = await client.post(
                f"{ACE_STEP_API}/release_task",
                json=task_payload,
                headers=submit_headers,
            )

            if r.status_code != 200:
                raise RuntimeError(f"Task submission failed: {r.text[:500]}")
            
            task_data = r.json()
            task_id = (
                task_data.get("task_id")
                or task_data.get("id")
                or (task_data.get("data") or {}).get("task_id")
            )
            
            if not task_id:
                raise RuntimeError(f"No task_id in response: {task_data}")
            
            print(f"[LEGO {job_id[:8]}] Task ID: {task_id}")
            
            # Poll for result
            audio_file_path, result_arr = await _poll_acestep_task(
                client, task_id, job_id
            )
            
            # Download audio
            out_path, out_filename = await _download_acestep_audio(
                client, audio_file_path, job_id, audio_format
            )
            
            # Get audio info
            audio_data, audio_sr = sf.read(out_path, dtype="float32")
            duration_sec = round(len(audio_data) / audio_sr, 2)
            out_size_mb = round(os.path.getsize(out_path) / 1024 / 1024, 2)
            t_sec = round(time.time() - t_start, 1)
            
            print(f"[LEGO {job_id[:8]}] Done in {t_sec}s — {duration_sec}s audio")
            
            return {
                "status": "ok",
                "job_id": job_id,
                "filename": out_filename,
                "url": f"/tracks/{out_filename}",
                "duration_sec": duration_sec,
                "processing_time_sec": t_sec,
                "metadata": {
                    "input_file": file.filename,
                    "track_name": track_name,
                    "prompt": prompt,
                    "region": f"{start_time}s - {end_time}s",
                    "output_size_mb": out_size_mb,
                    "created_at": datetime.now().isoformat(),
                }
            }
    
    except Exception as e:
        print(f"[LEGO {job_id[:8]}] ERROR: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": str(e),
                "traceback": traceback.format_exc()
            }
        )
    finally:
        # Cleanup temp file
        if src_path and os.path.exists(src_path):
            try:
                os.unlink(src_path)
            except Exception:
                pass


# =============================================================================
# Complete Endpoint
# =============================================================================

@router.post("/complete")
async def complete_track(
    file: UploadFile = File(...),
    prompt: str = Form(""),
    guidance_scale: float = Form(9.0),
    seed: int = Form(-1),
    infer_steps: int = Form(50),  # diffusion steps (50 optimal for sft/base models)
    audio_format: str = Form("mp3"),
    dit_model: str = Form("acestep-v15-sft"),
    instruction: str = Form(""),
):
    """
    Complete: Auto-complete incomplete tracks with specified instruments.
    
    Takes an incomplete track and adds the specified instruments to complete it.
    
    Example: Complete a vocal-only track by adding drums, bass, and guitar.
    """
    import httpx

    job_id = uuid.uuid4().hex
    t_start = time.time()

    print(f"[COMPLETE {job_id[:8]}] Instruction: '{instruction[:60] if instruction else prompt[:60] if prompt else 'auto'}'")

    src_path = None
    
    try:
        # Save uploaded file to temp
        fd, src_path = tempfile.mkstemp(prefix="complete_src_", suffix=".wav")
        os.close(fd)
        
        src_bytes = await file.read()
        with open(src_path, "wb") as f:
            f.write(src_bytes)
        
        async with httpx.AsyncClient(timeout=300.0) as client:
            # Submit complete task
            task_payload = {
                "task_type": "complete",
                "src_audio_path": src_path,
                "prompt": prompt or instruction,
                "inference_steps": infer_steps,
                "guidance_scale": guidance_scale,
                "use_random_seed": seed < 0,
                "seed": seed if seed >= 0 else -1,
                "audio_format": audio_format,
                "batch_size": 1,
                "use_tiled_decode": True,
                "model": dit_model,
                "instruction": instruction or f"Complete track with {prompt}",
            }

            print(f"[COMPLETE {job_id[:8]}] Submitting task...")
            # Add API key for authentication if configured
            submit_headers = {}
            if ACE_STEP_API_KEY:
                submit_headers["Authorization"] = f"Bearer {ACE_STEP_API_KEY}"
            r = await client.post(
                f"{ACE_STEP_API}/release_task",
                json=task_payload,
                headers=submit_headers,
            )

            if r.status_code != 200:
                raise RuntimeError(f"Task submission failed: {r.text[:500]}")
            
            task_data = r.json()
            task_id = (
                task_data.get("task_id")
                or task_data.get("id")
                or (task_data.get("data") or {}).get("task_id")
            )
            
            if not task_id:
                raise RuntimeError(f"No task_id in response: {task_data}")
            
            print(f"[COMPLETE {job_id[:8]}] Task ID: {task_id}")
            
            # Poll for result
            audio_file_path, result_arr = await _poll_acestep_task(
                client, task_id, job_id
            )
            
            # Download audio
            out_path, out_filename = await _download_acestep_audio(
                client, audio_file_path, job_id, audio_format
            )
            
            # Get audio info
            audio_data, audio_sr = sf.read(out_path, dtype="float32")
            duration_sec = round(len(audio_data) / audio_sr, 2)
            out_size_mb = round(os.path.getsize(out_path) / 1024 / 1024, 2)
            t_sec = round(time.time() - t_start, 1)
            
            print(f"[COMPLETE {job_id[:8]}] Done in {t_sec}s — {duration_sec}s audio")
            
            return {
                "status": "ok",
                "job_id": job_id,
                "filename": out_filename,
                "url": f"/tracks/{out_filename}",
                "duration_sec": duration_sec,
                "processing_time_sec": t_sec,
                "metadata": {
                    "input_file": file.filename,
                    "instruction": instruction or prompt,
                    "prompt": prompt,
                    "output_size_mb": out_size_mb,
                    "created_at": datetime.now().isoformat(),
                }
            }
    
    except Exception as e:
        print(f"[COMPLETE {job_id[:8]}] ERROR: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": str(e),
                "traceback": traceback.format_exc()
            }
        )
    finally:
        # Cleanup temp file
        if src_path and os.path.exists(src_path):
            try:
                os.unlink(src_path)
            except Exception:
                pass
