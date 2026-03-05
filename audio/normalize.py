"""
Audio Normalization Utilities
"""

import numpy as np


def normalize_audio(audio):
    """
    Normalize audio amplitude to [-1, 1] range
    
    Args:
        audio: Audio array
    
    Returns:
        Normalized audio
    """
    peak = np.max(np.abs(audio))
    
    if peak == 0:
        return audio
    
    return audio / peak


def rms_normalize(audio, target_db=-20):
    """
    Normalize audio to target RMS level
    
    Args:
        audio: Audio array
        target_db: Target RMS in dB
    
    Returns:
        Normalized audio
    """
    rms = np.sqrt(np.mean(audio ** 2))
    
    if rms == 0:
        return audio
    
    scalar = 10 ** (target_db / 20) / (rms + 1e-9)
    
    return audio * scalar
