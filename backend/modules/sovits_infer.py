"""
VocalForge - Real so-vits-svc wrapper.
Uses Svc.slice_inference() from so-vits-svc/inference/infer_tool.py
"""

import os
import sys
import numpy as np

# Add so-vits-svc to path
SOVITS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "so-vits-svc"))
if SOVITS_DIR not in sys.path:
    sys.path.insert(0, SOVITS_DIR)


class SoVITSInfer:
    """
    Real so-vits-svc inference wrapper.
    Loads model once, runs slice_inference for full-song conversion.
    """

    def __init__(self, model_path: str, config_path: str, device: str = "cuda"):
        self.model_path = model_path
        self.config_path = config_path
        self.device = device
        self._svc = None

    def _load(self):
        if self._svc is not None:
            return
        from inference.infer_tool import Svc
        self._svc = Svc(
            net_g_path=self.model_path,
            config_path=self.config_path,
            device=self.device,
            cluster_model_path="",   # no cluster model
            nsf_hifigan_enhance=False,
            shallow_diffusion=False,
            only_diffusion=False,
        )

    def convert(
        self,
        audio_path: str,
        speaker: str,
        pitch_shift: int = 0,
        slice_db: int = -40,
        cluster_ratio: float = 0.0,
        auto_predict_f0: bool = False,
        noise_scale: float = 0.4,
        pad_seconds: float = 0.5,
        clip_seconds: float = 0.0,
        lg_num: float = 0.0,
        f0_predictor: str = "pm",
        cr_threshold: float = 0.05,
    ) -> tuple[np.ndarray, int]:
        """
        Run voice conversion on audio_path.
        Returns (audio_np, sample_rate).
        """
        import torch
        import gc
        
        self._load()
        
        # Clear cache before inference
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        audio = self._svc.slice_inference(
            raw_audio_path=audio_path,
            spk=speaker,
            tran=pitch_shift,
            slice_db=slice_db,
            cluster_infer_ratio=cluster_ratio,
            auto_predict_f0=auto_predict_f0,
            noice_scale=noise_scale,
            pad_seconds=pad_seconds,
            clip_seconds=clip_seconds,
            lg_num=lg_num,
            f0_predictor=f0_predictor,
            cr_threshold=cr_threshold,
        )
        
        # Clear cache after inference to free VRAM
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        gc.collect()
        
        return audio, self._svc.target_sample

    def unload(self):
        if self._svc is not None:
            self._svc.unload_model()
            self._svc = None

    @property
    def speakers(self) -> list[str]:
        """Return list of available speaker names from loaded model."""
        self._load()
        return list(self._svc.spk2id.keys())
