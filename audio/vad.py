"""
Voice Activity Detection and Silence Trimming
"""

import librosa
import numpy as np


def detect_speech(audio, sr):
    """
    Detect speech segments in audio
    
    Args:
        audio: Audio array
        sr: Sample rate
    
    Returns:
        List of audio segments
    """
    intervals = librosa.effects.split(
        audio,
        top_db=30
    )
    
    segments = []
    for start, end in intervals:
        segments.append(audio[start:end])
    
    return segments


def trim_silence(audio, top_db=30):
    """
    Trim silence from beginning and end of audio
    
    Args:
        audio: Audio array
        top_db: Threshold in dB
    
    Returns:
        Trimmed audio
    """
    trimmed, _ = librosa.effects.trim(audio, top_db=top_db)
    return trimmed
