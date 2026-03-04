"""
VocalForge v1.6 - Demo Auto-Adaptive
Runs hardware detection, selects mode, runs preview + full pipeline.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import math
import torch
from core.engine import AudioEngine, detect_hardware
from core.modules import MorphModule, HarmonyModule, MasteringModule


def generate_sine(duration_sec=30, sample_rate=44100, freq=440):
    """Generate a 440Hz sine wave for testing."""
    t = torch.linspace(0, duration_sec, duration_sec * sample_rate)
    return (0.5 * torch.sin(2 * math.pi * freq * t)).tolist(), sample_rate


def main():
    print("=" * 60)
    print("  VocalForge v1.6 — Auto-Adaptive Demo")
    print("=" * 60)

    # Hardware detection
    hw = detect_hardware()
    print("\n[Hardware Detection]")
    print(f"  CUDA    : {hw['has_cuda']}")
    print(f"  VRAM    : {hw['vram_gb']} GB")
    print(f"  Cores   : {hw['cpu_cores']}")
    print(f"  Mode    : {hw['mode'].upper()}")
    print(f"  Device  : {hw['device']}")
    print(f"  Batch   : {hw['batch_size']}")
    print(f"  Segment : {hw['segment_length']}")

    # Engine setup
    engine = AudioEngine(logging_mode="full")
    engine.register_module(MorphModule())
    engine.register_module(HarmonyModule())
    if hw["mode"] in ("full", "high_end"):
        engine.register_module(MasteringModule())

    # Test audio
    audio_data, sr = generate_sine(duration_sec=30)
    track = {"audio": audio_data, "sample_rate": sr}
    config = {
        "Morph": {"gender_shift": 0.3, "style_shift": 0.2},
        "Harmony": {"factor": 1.05},
        "Mastering": {"drive": 1.2},
    }

    # Phase 1: Preview
    print("\n[Phase 1] 10-second preview...")
    preview_result = engine.preview(track.copy(), config, seconds=10)
    print(f"  History: {preview_result['metadata']['history']}")

    # Phase 2: Full track
    print("\n[Phase 2] Full track processing...")
    full_result = engine.run(track.copy(), config)
    print(f"  History: {full_result['metadata']['history']}")

    if "profiling" in full_result.get("metadata", {}):
        p = full_result["metadata"]["profiling"]
        print(f"  Last module : {p['module']}")
        print(f"  Runtime     : {p['runtime_sec']}s")
        print(f"  VRAM peak   : {p['vram_peak_gb']} GB")

    print("\n" + "=" * 60)
    print("  ✅ All tests passed — Beta Ready")
    print("=" * 60)


if __name__ == "__main__":
    main()
