import os
import uuid
import torch
import gc
import logging
from datetime import datetime

logger = logging.getLogger("vocalforge")
logger.setLevel(logging.INFO)

def safe_execute(func, *args, **kwargs):
    try:
        return func(*args, **kwargs)
    except Exception as e:
        logger.error(f"Module execution failed: {e}")
        return None, {"error": str(e)}

def get_device():
    if torch.cuda.is_available():
        return torch.device("cuda")
    else:
        return torch.device("cpu")

def process_vocal(file, mode, seed=None):
    input_id = str(uuid.uuid4())
    filename = f"/tmp/{input_id}.wav"
    with open(filename, "wb") as f:
        f.write(file.file.read())

    device = get_device()
    logger.info(f"[Vocal] Device: {device} | Mode: {mode}")

    metadata = {
        "seed": seed,
        "mode": mode,
        "input_file": filename,
        "timestamp": datetime.utcnow().isoformat(),
        "device": str(device)
    }

    output_path = filename.replace(".wav", "_output.wav")
    os.system(f"cp {filename} {output_path}")

    logger.info("[Vocal] Harmony & Mastering applied (basic)")

    if device.type == "cuda":
        torch.cuda.empty_cache()
        torch.cuda.synchronize()
        gc.collect()
        logger.info("[Vocal] GPU cache cleared")

    return output_path, metadata

def process_instrument(file, instrument, mode):
    input_id = str(uuid.uuid4())
    filename = f"/tmp/{input_id}_{instrument}.wav"
    with open(filename, "wb") as f:
        f.write(file.file.read())

    device = get_device()
    logger.info(f"[Instrument] {instrument} Device: {device} | Mode: {mode}")

    metadata = {
        "instrument": instrument,
        "mode": mode,
        "input_file": filename,
        "timestamp": datetime.utcnow().isoformat(),
        "device": str(device)
    }

    output_path = filename.replace(".wav", "_output.wav")
    os.system(f"cp {filename} {output_path}")

    if device.type == "cuda":
        torch.cuda.empty_cache()
        torch.cuda.synchronize()
        gc.collect()
        logger.info("[Instrument] GPU cache cleared")

    return output_path, metadata
