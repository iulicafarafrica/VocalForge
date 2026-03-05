"""
GPU-Accelerated Pitch Processing using torchcrepe
"""

import torch
import torchcrepe
import numpy as np
import librosa


class PitchGPU:
    """
    GPU-accelerated pitch extraction and manipulation
    """
    
    def __init__(self, sr=16000, device=None):
        """
        Initialize pitch processor
        
        Args:
            sr: Sample rate
            device: Device to use ("cuda", "cpu", or None for auto)
        """
        self.sr = sr
        
        if device:
            self.device = device
        else:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        print(f"[PitchGPU] Initialized on {self.device} @ {sr}Hz")
    
    def extract_f0(self, audio):
        """
        Extract F0 pitch contour using torchcrepe
        
        Args:
            audio: Audio array
        
        Returns:
            F0 contour (Hz)
        """
        audio_tensor = torch.tensor(audio).float().unsqueeze(0).to(self.device)
        
        hop_length = 160
        
        f0 = torchcrepe.predict(
            audio_tensor,
            self.sr,
            hop_length,
            fmin=50,
            fmax=550,
            model="full",
            batch_size=1024,
            device=self.device
        )
        
        return f0.squeeze().cpu().numpy()
    
    def median_pitch(self, f0):
        """
        Get median pitch from F0 contour
        
        Args:
            f0: F0 contour
        
        Returns:
            Median pitch (Hz) or None
        """
        valid = f0[f0 > 0]
        
        if len(valid) == 0:
            return None
        
        return np.median(valid)
    
    def pitch_shift(self, audio, semitones):
        """
        Shift pitch by specified semitones
        
        Args:
            audio: Audio array
            semitones: Number of semitones to shift
        
        Returns:
            Pitch-shifted audio
        """
        return librosa.effects.pitch_shift(
            audio,
            sr=self.sr,
            n_steps=semitones
        )
    
    def normalize_pitch(self, audio, target_f0=160):
        """
        Normalize pitch to target F0
        
        Args:
            audio: Audio array
            target_f0: Target F0 in Hz
        
        Returns:
            Pitch-normalized audio
        """
        f0 = self.extract_f0(audio)
        median = self.median_pitch(f0)
        
        if median is None:
            print("[PitchGPU] No pitch detected, returning original audio")
            return audio
        
        semitone_shift = 12 * np.log2(target_f0 / median)
        print(f"[PitchGPU] Normalizing pitch: {median:.1f} Hz → {target_f0} Hz ({semitone_shift:+.2f} semitones)")
        
        return self.pitch_shift(audio, semitone_shift)
