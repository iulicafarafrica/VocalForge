"""
Audio Processing Utilities for VocalForge
Based on Applio's audio processing classes
"""

import numpy as np
import torch
import torch.nn.functional as F
import librosa
from scipy import signal


# ── High-Pass Filter (Butterworth) ────────────────────────────────────────────
# Remove rumble below 48Hz (from Applio)
# Note: Filter coefficients are calculated dynamically based on sample rate

FILTER_ORDER = 5
CUTOFF_FREQUENCY = 48  # Hz

def apply_highpass_filter(audio, sample_rate=16000):
    """
    Apply high-pass filter to remove rumble below 48Hz.
    
    Args:
        audio: numpy array with audio samples
        sample_rate: Sample rate of the audio (default: 16000Hz for RVC output)
    
    Returns:
        filtered_audio: numpy array
    """
    # Calculate filter coefficients for this sample rate
    bh, ah = signal.butter(
        N=FILTER_ORDER, Wn=CUTOFF_FREQUENCY, btype="high", fs=sample_rate
    )
    return signal.filtfilt(bh, ah, audio)


# ── AudioProcessor (RMS Matching) ─────────────────────────────────────────────
class AudioProcessor:
    """
    A class for processing audio signals, specifically for adjusting RMS levels.
    Based on Applio's AudioProcessor
    """

    @staticmethod
    def change_rms(
        source_audio: np.ndarray,
        source_rate: int,
        target_audio: np.ndarray,
        target_rate: int,
        rate: float = 0.5,
    ):
        """
        Adjust the RMS level of target_audio to match the RMS of source_audio.
        
        Args:
            source_audio: The source audio signal as a NumPy array.
            source_rate: The sampling rate of the source audio.
            target_audio: The target audio signal to adjust.
            target_rate: The sampling rate of the target audio.
            rate: The blending rate between the source and target RMS levels.
                  0.0 = keep target RMS, 1.0 = match source RMS
        
        Returns:
            adjusted_audio: Audio with adjusted RMS
        """
        # Calculate RMS of both audio data
        rms1 = librosa.feature.rms(
            y=source_audio,
            frame_length=source_rate // 2 * 2,
            hop_length=source_rate // 2,
        )
        rms2 = librosa.feature.rms(
            y=target_audio,
            frame_length=target_rate // 2 * 2,
            hop_length=target_rate // 2,
        )

        # Interpolate RMS to match target audio length
        # rms1 and rms2 are 2D tensors: (1, num_frames)
        # Need to interpolate to match target_audio length
        target_length = target_audio.shape[0]
        
        rms1 = F.interpolate(
            torch.from_numpy(rms1).float().unsqueeze(0),
            size=target_length,
            mode="linear",
            align_corners=False,
        ).squeeze(0).squeeze(0)
        
        rms2 = F.interpolate(
            torch.from_numpy(rms2).float().unsqueeze(0),
            size=target_length,
            mode="linear",
            align_corners=False,
        ).squeeze(0).squeeze(0)
        
        rms2 = torch.maximum(rms2, torch.zeros_like(rms2) + 1e-6)

        # Adjust target audio RMS based on the source audio RMS
        # Formula: target * (source_rms / target_rms)^rate
        # When rate=1.0: fully match source RMS
        # When rate=0.0: keep original target RMS
        adjusted_audio = (
            target_audio
            * (torch.pow(rms1, rate) * torch.pow(rms2, 1 - rate) / rms2).numpy()
        )
        return adjusted_audio


# ── Autotune ───────────────────────────────────────────────────────────────────
class Autotune:
    """
    A class for applying autotune to a given fundamental frequency (F0) contour.
    Based on Applio's Autotune class
    
    Snaps each frequency to the closest musical note.
    """

    def __init__(self):
        """
        Initializes the Autotune class with a set of reference frequencies.
        All musical notes from G1 to C6
        """
        self.note_dict = np.array([
            49.00,   # G1
            51.91,   # G#1 / Ab1
            55.00,   # A1
            58.27,   # A#1 / Bb1
            61.74,   # B1
            65.41,   # C2
            69.30,   # C#2 / Db2
            73.42,   # D2
            77.78,   # D#2 / Eb2
            82.41,   # E2
            87.31,   # F2
            92.50,   # F#2 / Gb2
            98.00,   # G2
            103.83,  # G#2 / Ab2
            110.00,  # A2
            116.54,  # A#2 / Bb2
            123.47,  # B2
            130.81,  # C3
            138.59,  # C#3 / Db3
            146.83,  # D3
            155.56,  # D#3 / Eb3
            164.81,  # E3
            174.61,  # F3
            185.00,  # F#3 / Gb3
            196.00,  # G3
            207.65,  # G#3 / Ab3
            220.00,  # A3
            233.08,  # A#3 / Bb3
            246.94,  # B3
            261.63,  # C4 (Middle C)
            277.18,  # C#4 / Db4
            293.66,  # D4
            311.13,  # D#4 / Eb4
            329.63,  # E4
            349.23,  # F4
            369.99,  # F#4 / Gb4
            392.00,  # G4
            415.30,  # G#4 / Ab4
            440.00,  # A4
            466.16,  # A#4 / Bb4
            493.88,  # B4
            523.25,  # C5
            554.37,  # C#5 / Db5
            587.33,  # D5
            622.25,  # D#5 / Eb5
            659.25,  # E5
            698.46,  # F5
            739.99,  # F#5 / Gb5
            783.99,  # G5
            830.61,  # G#5 / Ab5
            880.00,  # A5
            932.33,  # A#5 / Bb5
            987.77,  # B5
            1046.50, # C6
        ])

    def autotune_f0(self, f0: np.ndarray, strength: float = 1.0):
        """
        Autotunes a given F0 contour by snapping each frequency to the closest reference frequency.
        
        Args:
            f0: The input F0 contour as a NumPy array.
            strength: How strong to apply autotune (0.0 = no effect, 1.0 = full snap to note)
        
        Returns:
            autotuned_f0: Autotuned F0 contour
        """
        autotuned_f0 = np.zeros_like(f0)
        
        for i, freq in enumerate(f0):
            if freq <= 0:
                # Skip silent/unvoiced parts
                autotuned_f0[i] = freq
                continue
            
            # Find closest musical note
            closest_note = self.note_dict[np.argmin(np.abs(self.note_dict - freq))]
            
            # Snap to note with strength control
            autotuned_f0[i] = freq + (closest_note - freq) * strength
        
        return autotuned_f0


# ── Proposed Pitch Detection ──────────────────────────────────────────────────
def detect_proposed_pitch(f0: np.ndarray, threshold_male: float = 155.0, threshold_female: float = 255.0):
    """
    Automatically detect pitch shift needed based on median F0.
    Based on Applio's proposed_pitch feature.
    
    Args:
        f0: F0 contour as numpy array
        threshold_male: Target frequency for male voice (default 155Hz)
        threshold_female: Target frequency for female voice (default 255Hz)
    
    Returns:
        up_key: Pitch shift in semitones (rounded to integer)
        detected_gender: 'male' or 'female' based on median F0
    """
    limit = 12  # Max pitch shift
    
    # Get valid F0 values (exclude silence/unvoiced)
    valid_f0 = np.where(f0 > 0)[0]
    
    if len(valid_f0) < 2:
        # No valid F0 detected
        return 0, 'unknown'
    
    # Calculate median F0
    median_f0 = float(np.median(np.interp(np.arange(len(f0)), valid_f0, f0[valid_f0])))
    
    if median_f0 <= 0 or np.isnan(median_f0):
        return 0, 'unknown'
    
    # Detect gender based on median F0
    if median_f0 < 200:
        detected_gender = 'male'
        target_pitch = threshold_male
    else:
        detected_gender = 'female'
        target_pitch = threshold_female
    
    # Calculate pitch shift needed
    up_key = max(
        -limit,
        min(
            limit,
            int(np.round(12 * np.log2(target_pitch / median_f0)))
        )
    )
    
    print(f"[Proposed Pitch] Median F0: {median_f0:.2f}Hz, Gender: {detected_gender}, Shift: {up_key:+d} semitones")
    
    return up_key, detected_gender


# ── Tiled Inference Helper ────────────────────────────────────────────────────
def find_optimal_split_points(audio: np.ndarray, window: int = 160, sample_rate: int = 16000, 
                               t_center: int = 48000, t_query: int = 16000, t_max: int = 192000):
    """
    Find optimal split points for tiled inference (at zero-crossings).
    Based on Applio's tiled inference.
    
    Args:
        audio: Input audio array
        window: Window size for processing
        sample_rate: Sample rate
        t_center: Center window size
        t_query: Query window size
        t_max: Maximum window size
    
    Returns:
        opt_ts: List of optimal split points
    """
    opt_ts = []
    
    if audio.shape[0] <= t_max:
        # Audio is short enough, no need to split
        return opt_ts
    
    # Pad audio
    audio_pad = np.pad(audio, (window // 2, window // 2), mode="reflect")
    
    # Calculate cumulative sum for finding quiet points
    audio_sum = np.zeros_like(audio)
    for i in range(window):
        audio_sum += audio_pad[i : i - window]
    
    # Find optimal split points at minimum amplitude
    for t in range(t_center, audio.shape[0], t_center):
        opt_ts.append(
            t
            - t_query
            + np.where(
                np.abs(audio_sum[t - t_query : t + t_query])
                == np.abs(audio_sum[t - t_query : t + t_query]).min()
            )[0][0]
        )
    
    return opt_ts
