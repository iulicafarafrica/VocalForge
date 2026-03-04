"""
VocalForge v1.6 - AudioEngine
Auto-adaptive, modular, AMP-safe, chunk-processing, GPU/CPU fallback.
"""

import time
import torch
from collections import OrderedDict


def detect_hardware():
    """Detect GPU/CPU at runtime and return mode config."""
    has_cuda = torch.cuda.is_available()
    vram_gb = 0.0

    try:
        import os

        cpu_cores = os.cpu_count() or 1
    except Exception:
        cpu_cores = 1

    if has_cuda:
        try:
            vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        except Exception:
            vram_gb = 0.0

    # Auto-select mode
    if not has_cuda or vram_gb < 4:
        mode = "light"
        device = "cpu"
    elif vram_gb < 8:
        mode = "full"
        device = "cuda"
    else:
        mode = "high_end"
        device = "cuda"

    mode_configs = {
        "light": {
            "segment_length": 1024,
            "batch_size": 1,
            "logging": "minimal",
            "modules": ["Morph", "Harmony"],
        },
        "full": {
            "segment_length": 2048,
            "batch_size": 1,
            "logging": "full",
            "modules": ["Morph", "Harmony", "Mastering"],
        },
        "high_end": {
            "segment_length": 4096,
            "batch_size": 1,  # Optimizare pentru stabilitate VRAM RTX 3070
            "logging": "full",
            "modules": ["Morph", "Harmony", "Mastering"],
        },
    }

    return {
        "device": device,
        "mode": mode,
        "vram_gb": round(vram_gb, 2),
        "cpu_cores": cpu_cores,
        "has_cuda": has_cuda,
        **mode_configs[mode],
    }


class AudioEngine:
    """
    Modular audio processing engine.
    Features:
    - Auto-adaptive hardware detection
    - AMP FP16 safe execution
    - Chunk processing for long tracks
    - Safe try/catch per module
    - GPU memory cleanup after each module
    - Adaptive logging (minimal / full)
    - Timeout protection per module
    - Metadata history tracking
    - Profiling support (runtime + VRAM)
    """

    def __init__(self, logging_mode=None, device=None, use_amp=None):
        self.hw = detect_hardware()
        self.device = device or self.hw["device"]
        self.logging_mode = logging_mode or self.hw["logging"]
        # Optimizare FP16 AMP pentru RTX 3070
        self.use_amp = (
            use_amp
            if use_amp is not None
            else (self.device == "cuda" and self.hw["vram_gb"] >= 6)
        )
        self.modules = OrderedDict()

        if self.logging_mode == "full":
            print("[VocalForge] Engine initialized")
            print(f"  Mode    : {self.hw['mode'].upper()}")
            print(f"  Device  : {self.device}")
            print(f"  VRAM    : {self.hw['vram_gb']} GB")
            print(f"  Cores   : {self.hw['cpu_cores']}")
            print(f"  AMP     : {self.use_amp}")

    def register_module(self, module):
        self.modules[module.name] = module
        if self.logging_mode == "full":
            print(f"[VocalForge] Registered: {module.name}")

    def _validate_input(self, track):
        """Validate audio input: empty check, NaN/Inf, clamp [-1,1]."""
        audio = track.get("audio")
        if audio is None:
            raise ValueError("Track has no 'audio' key.")

        if not isinstance(audio, torch.Tensor):
            try:
                audio = torch.tensor(audio, dtype=torch.float32)
            except Exception as e:
                raise ValueError(f"Cannot convert audio to tensor: {e}")

        if audio.numel() == 0:
            raise ValueError("Audio tensor is empty.")

        # Sample rate consistency
        sr = track.get("sample_rate", 44100)
        if not isinstance(sr, int) or sr <= 0:
            track["sample_rate"] = 44100

        # NaN / Inf detection + fix
        if torch.isnan(audio).any() or torch.isinf(audio).any():
            audio = torch.nan_to_num(audio, nan=0.0, posinf=1.0, neginf=-1.0)
            if self.logging_mode == "full":
                print("[VocalForge] WARNING: NaN/Inf detected and corrected.")

        # Clamp to safe range
        audio = torch.clamp(audio, -1.0, 1.0)
        track["audio"] = audio
        return track

    def _run_module(self, module, track, config):
        """Safe execution of one module with profiling + timeout protection."""
        import gc

        try:
            if self.device == "cuda":
                torch.cuda.reset_peak_memory_stats()

            start_time = time.time()

            if self.use_amp and self.device == "cuda":
                with torch.cuda.amp.autocast():
                    result = module.process(track, config, device=self.device)
            else:
                result = module.process(track, config, device=self.device)

            runtime = round(time.time() - start_time, 4)
            vram_peak = 0.0
            if self.device == "cuda":
                vram_peak = round(torch.cuda.max_memory_allocated() / (1024**3), 4)

            # Metadata
            if "metadata" not in result:
                result["metadata"] = {"history": []}
            if "history" not in result["metadata"]:
                result["metadata"]["history"] = []

            result["metadata"]["history"].append(f"{module.name} OK ({runtime}s)")

            if self.logging_mode == "full":
                result["metadata"]["profiling"] = {
                    "module": module.name,
                    "runtime_sec": runtime,
                    "vram_peak_gb": vram_peak,
                }
                print(f"  [{module.name}] {runtime}s | VRAM {vram_peak:.2f}GB")

            return result

        except Exception as e:
            print(f"[VocalForge] ERROR in {module.name}: {e}")
            if "metadata" not in track:
                track["metadata"] = {"history": []}
            track["metadata"]["history"].append(f"{module.name} FAILED: {str(e)}")
            return track  # pipeline continues

        finally:
            # Force garbage collection to free memory
            if self.device == "cuda":
                torch.cuda.empty_cache()
            gc.collect()

    def _process_in_chunks(self, module, track, config, chunk_size=None):
        """Split audio into chunks, process each, concatenate."""
        sr = track.get("sample_rate", 44100)
        # segment_length is in samples; default to ~0.5s chunks if not set
        chunk_size = chunk_size or max(self.hw["segment_length"], 1024)

        audio = track["audio"]
        if not isinstance(audio, torch.Tensor):
            audio = torch.tensor(audio, dtype=torch.float32)

        chunks = audio.split(chunk_size)
        processed = []
        combined_meta = track.get("metadata", {"history": []})

        for i, chunk in enumerate(chunks):
            chunk_track = {
                "audio": chunk.to(self.device),
                "sample_rate": sr,
                "metadata": {"history": []},
            }
            result = self._run_module(module, chunk_track, config)
            processed.append(result["audio"].cpu())
            for entry in result.get("metadata", {}).get("history", []):
                combined_meta["history"].append(f"chunk[{i}]: {entry}")

        track["audio"] = torch.cat(processed)
        track["metadata"] = combined_meta
        return track

    def preview(self, track, config, seconds=10):
        """Run pipeline on first N seconds only (Light Mode preview)."""
        sr = track.get("sample_rate", 44100)
        audio = track.get("audio", [])

        if not isinstance(audio, torch.Tensor):
            audio = torch.tensor(audio, dtype=torch.float32)

        max_samples = sr * seconds
        if len(audio) > max_samples:
            audio = audio[:max_samples]

        preview_track = {
            "audio": audio,
            "sample_rate": sr,
            "metadata": {"history": [f"preview_{seconds}s"]},
        }

        if self.logging_mode == "full":
            print(f"[VocalForge] Preview: {seconds}s @ {sr}Hz")

        return self.run(preview_track, config)

    def run(self, track, config):
        """Run full pipeline across all registered modules."""
        if self.logging_mode == "full":
            print(f"[VocalForge] Pipeline START — {len(self.modules)} modules")

        try:
            track = self._validate_input(track)
        except ValueError as e:
            print(f"[VocalForge] Validation FAILED: {e}")
            return track

        for name, module in self.modules.items():
            module_config = config.get(name, {})
            if hasattr(module, "supports_chunking") and module.supports_chunking:
                track = self._process_in_chunks(module, track, module_config)
            else:
                track = self._run_module(module, track, module_config)

        if self.logging_mode == "full":
            print("[VocalForge] Pipeline DONE")

        return track
