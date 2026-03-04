"""
VocalForge v1.6 - MasteringModule
Basic mastering: peak normalization + soft limiter (tanh).
Active in Full and High-End modes.
"""

import torch
from core.base_module import BaseAudioModule


class MasteringModule(BaseAudioModule):
    """
    Mastering pipeline:
    1. Peak normalization
    2. Soft limiter via tanh
    3. Final clamp [-1, 1]

    Config keys:
      drive: float (default 1.0) — limiter drive amount
    """

    name = "Mastering"
    supports_chunking = True

    def process(self, track: dict, config: dict, device: str = "cpu") -> dict:
        audio = track.get("audio")
        if audio is None:
            raise ValueError("No audio in track.")

        if not isinstance(audio, torch.Tensor):
            audio = torch.tensor(audio, dtype=torch.float32)

        audio = audio.to(device)

        # 1. Peak normalization
        max_val = audio.abs().max()
        if max_val > 1e-8:
            audio = audio / max_val

        # 2. Soft limiter
        drive = float(config.get("drive", 1.0))
        audio = torch.tanh(audio * drive)

        # 3. Final clamp
        audio = torch.clamp(audio, -1.0, 1.0)

        if "metadata" not in track:
            track["metadata"] = {"history": []}

        track["metadata"]["history"].append(f"Mastering(drive={drive:.2f})")
        track["audio"] = audio
        return track
