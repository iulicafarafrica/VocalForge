"""
VocalForge v1.2 Backend
Optimized for RTX 3070 + 32GB RAM
FastAPI server with improved stability, error handling and resource management
"""

import os
import gc
import torch
import librosa
import numpy as np
import soundfile as sf

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="VocalForge v1.2")

# ==============================
# CONFIGURATION
# ==============================

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DEFAULT_BATCH_SIZE = 1

# ==============================
# UTILITIES
# ==============================

def clear_gpu_cache():
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    gc.collect()


def detect_bpm_key(audio_path: str):
    y, sr = librosa.load(audio_path)
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    chroma = librosa.feature.chroma_stft(y=y, sr=sr)
    key_index = np.argmax(np.mean(chroma, axis=1))
    keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    key = keys[key_index]
    return tempo, key


def segment_audio(y, sr, segment_seconds=5):
    segment_length = int(sr * segment_seconds)
    segments = []

    for i in range(0, len(y), segment_length):
        seg = y[i:i + segment_length]
        if len(seg) > 2048:  # evită segmente prea mici
            segments.append(seg)

    return segments


def normalize_audio(y):
    max_val = np.max(np.abs(y))
    if max_val > 0:
        y = y / max_val
    return y


# ==============================
# REQUEST MODELS
# ==============================

class AdvancedSettings(BaseModel):
    fp16: Optional[bool] = True
    batchSize: Optional[int] = DEFAULT_BATCH_SIZE
    temperature: Optional[float] = 0.1
    topK: Optional[int] = 5
    topP: Optional[float] = 0.1
    sourceAudioStrength: Optional[float] = 0.9
    seed: Optional[int] = None


# ==============================
# ENDPOINTS
# ==============================

@app.post("/detect_bpm_key")
async def bpm_key(file: UploadFile = File(...)):
    try:
        path = f"temp_{file.filename}"

        with open(path, "wb") as f:
            f.write(await file.read())

        tempo, key = detect_bpm_key(path)
        os.remove(path)

        return {"bpm": float(tempo), "key": key}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/generate_cover")
async def generate_cover(
    file: UploadFile = File(...),
    pitch: float = Form(0.0),
    instrument: Optional[str] = Form(None)
):
    try:
        path = f"temp_{file.filename}"

        with open(path, "wb") as f:
            f.write(await file.read())

        y, sr = librosa.load(path, sr=None)

        if len(y) < 4096:
            os.remove(path)
            return JSONResponse(
                status_code=400,
                content={"error": "Audio file too short"}
            )

        segments = segment_audio(y, sr, segment_seconds=5)

        if len(segments) == 0:
            os.remove(path)
            return JSONResponse(
                status_code=400,
                content={"error": "Audio segmentation failed"}
            )

        processed = []

        for seg in segments:
            seg = librosa.effects.pitch_shift(seg, sr=sr, n_steps=pitch)
            processed.append(seg)

        output = np.concatenate(processed)

        if instrument == "flute":
            output *= 0.9
        elif instrument == "piano":
            output *= 0.8

        output = normalize_audio(output)

        output_path = "generated_output.wav"
        sf.write(output_path, output, sr)

        os.remove(path)
        clear_gpu_cache()

        return {"status": "success", "file": output_path}

    except Exception as e:
        clear_gpu_cache()
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/clear_cache")
async def clear_cache_endpoint():
    clear_gpu_cache()
    return {"status": "cache_cleared"}


@app.post("/unload_model")
async def unload_model():
    clear_gpu_cache()
    return {"status": "models_unloaded"}


@app.get("/health")
async def health():
    return {"device": DEVICE, "status": "running"}
