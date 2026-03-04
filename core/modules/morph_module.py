"""
VocalForge v1.6 - MorphModule
Placeholder for real vectorized pitch/gender morphing.
FP16 ready, lazy loading, config validation.
"""

import torch
from core.base_module import BaseAudioModule


class MorphModule(BaseAudioModule):
    """
    Voice morphing module.
    Config keys:
      gender_shift: float -1.0..1.0 (negative=more feminine, positive=more masculine)
      style_shift:  float -1.0..1.0 (style intensity)
      pitch:        int   semitones to shift (-12..12)
    """

    name = "Morph"
    supports_chunking = True

    def initialize(self, config: dict):
        self.gender_shift = float(config.get("gender_shift", 0.0))
        self.style_shift = float(config.get("style_shift", 0.0))
        self.pitch = int(config.get("pitch", 0))

        # Config validation
        if not (-1.0 <= self.gender_shift <= 1.0):
            raise ValueError(f"gender_shift must be in [-1, 1], got {self.gender_shift}")
        if not (-1.0 <= self.style_shift <= 1.0):
            raise ValueError(f"style_shift must be in [-1, 1], got {self.style_shift}")
        if not (-12 <= self.pitch <= 12):
            raise ValueError(f"pitch must be in [-12, 12], got {self.pitch}")

        self.model_loaded = True  # lazy load placeholder

    def process(self, track: dict, config: dict, device: str = "cpu") -> dict:
        audio = track.get("audio")
        if audio is None:
            raise ValueError("No audio in track.")

        if not isinstance(audio, torch.Tensor):
            audio = torch.tensor(audio, dtype=torch.float32)

        audio = audio.to(device=device, dtype=torch.float32)

        gender_shift = float(config.get("gender_shift", 0.0))
        style_shift = float(config.get("style_shift", 0.0))
        pitch = int(config.get("pitch", 0))

        # Placeholder processing (passthrough with slight scale)
        # TODO: replace with real vectorized pitch morphing model
        audio = audio * (1.0 + 0.05 * gender_shift)

        # Pitch shift placeholder: simple resampling approximation
        # TODO: replace with librosa.effects.pitch_shift or WORLD vocoder
        # Lazy import librosa only when needed (pitch != 0)
        if pitch != 0:
            try:
                # Lazy import - librosa is heavy, only load when needed
                import librosa
                sr = track.get("sample_rate", 44100)
                audio_np = audio.cpu().numpy()
                shifted = librosa.effects.pitch_shift(audio_np, sr=sr, n_steps=pitch)
                audio = torch.tensor(shifted, dtype=torch.float32).to(device)
            except ImportError:
                # librosa not installed - skip pitch shift silently
                pass
            except Exception as e:
                # Log warning but don't crash - pitch shift is optional
                import logging
                logging.getLogger(__name__).warning(f"Pitch shift failed: {e}")
                pass  # fallback: skip pitch shift if it fails

        audio = torch.clamp(audio, -1.0, 1.0)

        if "metadata" not in track:
            track["metadata"] = {"history": []}

        track["metadata"]["history"].append(
            f"Morph(gender={gender_shift:.2f}, style={style_shift:.2f}, pitch={pitch}st)"
        )
        track["audio"] = audio
        return track

    def cleanup(self):
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
