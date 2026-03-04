"""
VocalForge v1.6 - HarmonyModule
Functional pitch layering with tensor-only operations.
"""

import torch
from core.base_module import BaseAudioModule


class HarmonyModule(BaseAudioModule):
    """
    Harmony module: pitch layer scaling with numeric safety.
    Config keys:
      factor: float (default 1.05) — harmony intensity
    """

    name = "Harmony"
    supports_chunking = True

    def process(self, track: dict, config: dict, device: str = "cpu") -> dict:
        audio = track.get("audio")
        if audio is None:
            raise ValueError("No audio in track.")

        if not isinstance(audio, torch.Tensor):
            audio = torch.tensor(audio, dtype=torch.float32)

        audio = audio.to(device)

        factor = float(config.get("factor", 1.05))

        # Safe scaling with epsilon guard
        eps = 1e-8
        factor = max(factor, eps)
        audio = audio * factor

        # Clamp to safe range
        audio = torch.clamp(audio, -1.0, 1.0)

        if "metadata" not in track:
            track["metadata"] = {"history": []}

        track["metadata"]["history"].append(f"Harmony(factor={factor:.3f})")
        track["audio"] = audio
        return track
