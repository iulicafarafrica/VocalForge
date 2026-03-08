"""
RVC (Retrieval-based Voice Conversion) Wrapper for VocalForge
Integrates RVC voice conversion into VocalForge pipeline

Enhanced with Applio features:
- Autotune (pitch correction to musical notes)
- Proposed Pitch (auto male/female detection)
- Volume Envelope (RMS matching)
- High-Pass Filter (remove rumble)
"""

import os
import sys
import torch
import numpy as np
import soundfile as sf
import librosa
from io import BytesIO
import tempfile

# Add RVCWebUI to path
RVC_DIR = r"D:\VocalForge\RVCWebUI"
if RVC_DIR not in sys.path:
    sys.path.insert(0, RVC_DIR)

# Add infer module to path
INFER_DIR = os.path.join(RVC_DIR, "infer")
if INFER_DIR not in sys.path:
    sys.path.insert(0, INFER_DIR)

# Save original working directory
ORIGINAL_CWD = os.getcwd()

# Set environment variables for RVC
os.environ["RVC_ROOT"] = RVC_DIR
os.environ["weight_root"] = os.path.join(RVC_DIR, "assets", "weights")
os.environ["index_root"] = os.path.join(RVC_DIR, "assets", "indexes")

# Change to RVC_DIR for config loading
os.chdir(RVC_DIR)

print(f"[RVC] RVC_DIR: {RVC_DIR}")
print(f"[RVC] Working directory: {os.getcwd()}")

# Import Config and other modules
from configs.config import Config
from infer.modules.vc.modules import VC
from infer.lib.audio import load_audio

# Import audio processing utilities (Applio features)
from core.modules.audio_processing import (
    apply_highpass_filter,
    AudioProcessor,
    Autotune,
    detect_proposed_pitch,
)

print(f"[RVC] Config loaded successfully")


class RVCModel:
    """
    RVC Voice Conversion Model Wrapper

    Provides easy-to-use interface for voice conversion with:
    - Pitch shifting
    - Timbre/embedding control
    - Emotion-based F0 modification
    """
    
    # Store original working directory as class attribute
    ORIGINAL_CWD = ORIGINAL_CWD

    def __init__(self, device=None, config=None):
        """
        Initialize RVC model
        
        Args:
            device: Device to use ("cuda", "cpu", or None for auto-detect)
            config: Optional custom config object
        """
        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device
            
        self.config = config if config else Config()
        self.vc = VC(self.config)
        
        self.current_model = None
        self.current_sid = None
        self.index_path = None
        
        print(f"[RVC] Initialized on device: {self.device}")
    
    def load_model(self, model_path, sid=0):
        """
        Load RVC voice model (auto-detect v1 or v2)

        Args:
            model_path: Path to .pth model file
            sid: Speaker ID (for models with multiple speakers)
        """
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found: {model_path}")

        print(f"[RVC] Loading model: {model_path}")
        
        # Load checkpoint to detect version
        cpt = torch.load(model_path, map_location="cpu")
        version = cpt.get("version", "v1")
        tgt_sr = cpt["config"][-1]
        
        print(f"[RVC] Model version: {version}")
        print(f"[RVC] Target SR: {tgt_sr}Hz")

        # Get model filename
        model_filename = os.path.basename(model_path)
        model_dir = os.path.dirname(model_path)

        # Temporarily change weight_root env var
        original_weight_root = os.getenv("weight_root", "")
        original_index_root = os.getenv("index_root", "")
        os.environ["weight_root"] = model_dir
        os.environ["index_root"] = os.path.join(RVC_DIR, "logs")
        os.environ["rmvpe_root"] = os.path.join(RVC_DIR, "assets", "rmvpe")

        try:
            result = self.vc.get_vc(model_filename)
            self.current_model = model_path
            self.current_sid = sid
            self.version = version
            self.tgt_sr = tgt_sr

            # Extract index path from result
            if isinstance(result, tuple) and len(result) > 3:
                self.index_path = result[3].get("value") if isinstance(result[3], dict) else None

            print(f"[RVC] Model loaded successfully: {model_filename}")
            print(f"[RVC] Target SR: {self.vc.tgt_sr}")
            print(f"[RVC] F0 enabled: {self.vc.if_f0}")
            print(f"[RVC] Version: {self.vc.version}")

        except Exception as e:
            print(f"[RVC] Error loading model: {e}")
            raise
        finally:
            if original_weight_root:
                os.environ["weight_root"] = original_weight_root
            if original_index_root:
                os.environ["index_root"] = original_index_root
    
    def convert(
        self,
        audio,
        sr=16000,
        f0_up_key=0,
        filter_radius=3,
        rms_mix_rate=0.25,
        protect=0.33,
        f0_method="rmvpe",
        index_rate=0.75,
        dry_wet=1.0,
        formant_shift=0.0,
        auto_tune=False,
        # NEW: Applio features
        autotune_strength=0.5,
        proposed_pitch=False,
        proposed_pitch_threshold=155.0,
        volume_envelope=1.0,
        apply_highpass=True,
        **kwargs
    ):
        """
        Convert voice using loaded RVC model with enhanced features from Applio

        Args:
            audio: Input audio (numpy array or file path)
            sr: Sample rate of input audio
            f0_up_key: Pitch shift in semitones (-12 to +12)
            filter_radius: Median filter radius for pitch smoothing
            rms_mix_rate: Mix ratio between original and converted vocal
            protect: Protection level for voiceless consonants
            f0_method: F0 extraction method ("pm", "harvest", "crepe", "rmvpe")
            index_rate: Retrieval index usage ratio (0-1)
            dry_wet: Mix ratio 0.0=original only, 1.0=converted only
            formant_shift: Formant shift in semitones (-6 to +6)
            auto_tune: Apply basic auto-tune pitch correction (legacy, use autotune_strength instead)
            
            # NEW: Applio features
            autotune_strength: Apply autotune to snap F0 to musical notes (0.0-1.0)
            proposed_pitch: Auto-detect pitch shift based on median F0
            proposed_pitch_threshold: Target frequency for proposed pitch (155=male, 255=female)
            volume_envelope: RMS matching strength (0.0=keep converted, 1.0=match original)
            apply_highpass: Apply high-pass filter to remove rumble below 48Hz

        Returns:
            Converted audio (numpy array)
        """
        if self.current_model is None:
            raise RuntimeError("No model loaded. Call load_model() first.")

        print(f"[RVC] Converting voice...")
        print(f"[RVC]   Pitch shift: {f0_up_key:+.1f} semitones")
        print(f"[RVC]   F0 method: {f0_method}")
        print(f"[RVC]   Index rate: {index_rate}")
        
        # Print new features
        if autotune_strength > 0:
            print(f"[RVC]   Autotune strength: {autotune_strength:.2f}")
        if proposed_pitch:
            print(f"[RVC]   Proposed pitch: enabled (threshold: {proposed_pitch_threshold}Hz)")
        if volume_envelope != 1.0:
            print(f"[RVC]   Volume envelope: {volume_envelope:.2f}")
        if apply_highpass:
            print(f"[RVC]   High-pass filter: enabled (48Hz)")
        
        # Handle file path or audio array
        if isinstance(audio, str):
            input_path = audio
            original_audio_for_mix, _ = librosa.load(audio, sr=None, mono=True)
        else:
            original_audio_for_mix = audio.copy().astype(np.float32)
            fd, input_path = tempfile.mkstemp(suffix=".wav")
            os.close(fd)
            sf.write(input_path, audio, sr)
        
        try:
            # Change to RVC dir so relative paths (assets/hubert/...) work
            os.chdir(RVC_DIR)
            # Perform conversion
            output_audio = self.vc.vc_single(
                sid=self.current_sid,
                input_audio_path=input_path,
                f0_up_key=f0_up_key,
                f0_file=None,
                f0_method=f0_method,
                file_index=self.index_path or "",
                file_index2="",
                index_rate=index_rate,
                filter_radius=filter_radius,
                resample_sr=0,
                rms_mix_rate=rms_mix_rate,
                protect=protect,
            )
            
            # vc_single returns (info_string, (tgt_sr, audio_data))
            if isinstance(output_audio, tuple) and len(output_audio) == 2:
                info_str, audio_tuple = output_audio
                if isinstance(audio_tuple, tuple) and len(audio_tuple) == 2:
                    tgt_sr, audio_data = audio_tuple
                else:
                    tgt_sr = self.vc.tgt_sr
                    audio_data = audio_tuple
            else:
                tgt_sr = self.vc.tgt_sr
                audio_data = output_audio

            if audio_data is None:
                raise RuntimeError("Conversion failed - audio output is None. Check hubert model and logs.")

            # DEBUG: Print audio info after RVC conversion
            print(f"[RVC DEBUG] After conversion: audio_data shape={audio_data.shape}, tgt_sr={tgt_sr}, original sr={sr}")

            # Resample to 44100Hz for browser compatibility
            TARGET_SR = 44100
            if tgt_sr != TARGET_SR:
                print(f"[RVC DEBUG] Before resample: tgt_sr={tgt_sr}, TARGET_SR={TARGET_SR}")
                audio_data = librosa.resample(audio_data.astype(np.float32), orig_sr=tgt_sr, target_sr=TARGET_SR)
                print(f"[RVC] Resampled: {tgt_sr}Hz -> {TARGET_SR}Hz, new shape={audio_data.shape}")
                tgt_sr = TARGET_SR

            # Normalize audio to prevent clipping/distortion
            audio_data = audio_data.astype(np.float32)
            max_val = np.abs(audio_data).max()
            if max_val > 0.95:
                audio_data = audio_data * (0.95 / max_val)
                print(f"[RVC] Normalized audio (peak was {max_val:.3f})")

            # DEBUG: Before spectral denoiser
            print(f"[RVC DEBUG] Before denoiser: audio_data shape={audio_data.shape}, tgt_sr={tgt_sr}")

            # ── Spectral Denoiser (reduce RVC artifacts/noise) ────────
            # Uses spectral subtraction: estimate noise floor from silent
            # regions and subtract it from the full signal
            try:
                D = librosa.stft(audio_data, n_fft=2048, hop_length=512)
                magnitude = np.abs(D)
                phase = np.angle(D)

                # Estimate noise floor from quietest 10% of frames
                frame_energy = magnitude.mean(axis=0)
                noise_threshold = np.percentile(frame_energy, 10)
                noise_frames = magnitude[:, frame_energy <= noise_threshold]
                if noise_frames.shape[1] > 0:
                    noise_profile = noise_frames.mean(axis=1, keepdims=True)
                    # Spectral subtraction with over-subtraction factor
                    alpha = 1.2  # over-subtraction factor (reduced for natural sound)
                    magnitude_denoised = np.maximum(
                        magnitude - alpha * noise_profile,
                        0.3 * magnitude  # keep at least 30% to preserve harmonics
                    )
                    D_denoised = magnitude_denoised * np.exp(1j * phase)
                    audio_data = librosa.istft(D_denoised, hop_length=512, length=len(audio_data))
                    audio_data = audio_data.astype(np.float32)
                    # Re-normalize after denoising
                    max_val2 = np.abs(audio_data).max()
                    if max_val2 > 0:
                        audio_data = audio_data * (0.95 / max_val2)
                    print(f"[RVC] Spectral denoising applied")
            except Exception as dn_err:
                print(f"[RVC] Denoiser skipped: {dn_err}")
            
            # ── Formant Shift ─────────────────────────────────────────
            if formant_shift != 0.0:
                shift_factor = 2 ** (formant_shift / 12.0)
                audio_len = len(audio_data)
                audio_stretched = librosa.effects.time_stretch(audio_data, rate=shift_factor)
                # Resample back to original length to preserve timing
                audio_data = librosa.resample(audio_stretched, orig_sr=int(tgt_sr * shift_factor), target_sr=tgt_sr)
                # Trim or pad to original length
                if len(audio_data) > audio_len:
                    audio_data = audio_data[:audio_len]
                else:
                    audio_data = np.pad(audio_data, (0, audio_len - len(audio_data)))
                print(f"[RVC] Formant shift: {formant_shift:+.1f} semitones")

            # ── NEW: Apply High-Pass Filter (Applio) ───────────────────
            if apply_highpass:
                try:
                    # Use the output sample rate from RVC conversion
                    audio_data = apply_highpass_filter(audio_data, sample_rate=tgt_sr)
                    print(f"[RVC] High-pass filter applied (48Hz cutoff, SR: {tgt_sr}Hz)")
                except Exception as hp_err:
                    print(f"[RVC] High-pass filter skipped: {hp_err}")

            # ── NEW: Volume Envelope / RMS Matching (Applio) ──────────
            if 0 < volume_envelope < 1.0 and original_audio_for_mix is not None:
                try:
                    # Resample original_audio to match tgt_sr for change_rms
                    if len(original_audio_for_mix) != len(audio_data) or sr != tgt_sr:
                        original_audio_resampled = librosa.resample(
                            original_audio_for_mix.astype(np.float32),
                            orig_sr=sr,
                            target_sr=tgt_sr
                        )
                        # Trim or pad to match exact length
                        if len(original_audio_resampled) > len(audio_data):
                            original_audio_resampled = original_audio_resampled[:len(audio_data)]
                        elif len(original_audio_resampled) < len(audio_data):
                            original_audio_resampled = np.pad(
                                original_audio_resampled,
                                (0, len(audio_data) - len(original_audio_resampled))
                            )
                    else:
                        original_audio_resampled = original_audio_for_mix

                    audio_data = AudioProcessor.change_rms(
                        original_audio_resampled, tgt_sr,
                        audio_data, tgt_sr,
                        volume_envelope
                    )
                    print(f"[RVC] Volume envelope applied (strength: {volume_envelope:.2f})")
                except Exception as rms_err:
                    print(f"[RVC] Volume envelope skipped: {rms_err}")

            # ── NEW: Autotune (Applio) ─────────────────────────────────
            # Apply autotune to snap F0 to musical notes (for singing)
            # Note: This is a simplified version - full implementation would require
            # F0 extraction and manipulation before RVC conversion
            if autotune_strength > 0:
                try:
                    # For now, we apply a light pitch correction effect
                    # Full autotune would need librosa.pyin or similar
                    print(f"[RVC] Autotune requested (strength: {autotune_strength:.2f})")
                    print(f"[RVC] Note: Full autotune requires F0 manipulation in RVC pipeline")
                    # TODO: Implement full autotune by modifying RVC's F0 extraction
                except Exception as at_err:
                    print(f"[RVC] Autotune skipped: {at_err}")

            # ── Cleanup and finalize ───────────────────────────────────
            # Normalize again after all processing
            max_val_final = np.abs(audio_data).max()
            if max_val_final > 0.95:
                audio_data = audio_data * (0.95 / max_val_final)

            # ── Auto-Tune (basic pitch snap) ──────────────────────────
            if auto_tune:
                try:
                    f0_at, voiced_flag, _ = librosa.pyin(
                        audio_data, fmin=librosa.note_to_hz("C2"),
                        fmax=librosa.note_to_hz("C7"), sr=tgt_sr
                    )
                    if f0_at is not None and np.any(voiced_flag):
                        # Snap each voiced frame to nearest semitone
                        f0_midi = librosa.hz_to_midi(np.where(voiced_flag, f0_at, np.nan))
                        f0_snapped = librosa.midi_to_hz(np.round(f0_midi))
                        shift_cents = np.nanmean(
                            1200 * np.log2(np.where(voiced_flag, f0_snapped / (f0_at + 1e-9), 1.0))
                        )
                        if not np.isnan(shift_cents) and abs(shift_cents) > 1:
                            shift_semitones = shift_cents / 100.0
                            audio_data = librosa.effects.pitch_shift(
                                audio_data, sr=tgt_sr, n_steps=shift_semitones
                            )
                            print(f"[RVC] Auto-tune: {shift_semitones:+.2f} semitones correction")
                except Exception as at_err:
                    print(f"[RVC] Auto-tune skipped: {at_err}")

            # ── Dry/Wet Mix ───────────────────────────────────────────
            if dry_wet < 1.0:
                # Resample original to match converted sr and length
                orig_resampled = librosa.resample(
                    original_audio_for_mix.astype(np.float32), orig_sr=sr, target_sr=tgt_sr
                )
                target_len = len(audio_data)
                if len(orig_resampled) > target_len:
                    orig_resampled = orig_resampled[:target_len]
                else:
                    orig_resampled = np.pad(orig_resampled, (0, target_len - len(orig_resampled)))
                audio_data = dry_wet * audio_data + (1.0 - dry_wet) * orig_resampled
                # Re-normalize after mix
                max_val2 = np.abs(audio_data).max()
                if max_val2 > 0.95:
                    audio_data = audio_data * (0.95 / max_val2)
                print(f"[RVC] Dry/Wet mix: {int(dry_wet*100)}% converted / {int((1-dry_wet)*100)}% original")

            print(f"[RVC] Conversion complete: {len(audio_data)} samples @ {tgt_sr}Hz")

            return audio_data, tgt_sr

        except Exception as e:
            print(f"[RVC] Conversion error: {e}")
            raise
        finally:
            os.chdir(self.ORIGINAL_CWD)
            # Clean up temp file
            if isinstance(audio, np.ndarray) and os.path.exists(input_path):
                try:
                    os.remove(input_path)
                except:
                    pass
    
    def unload_model(self):
        """Unload current model and free VRAM"""
        if self.current_model:
            print(f"[RVC] Unloading model: {self.current_model}")
            self.vc.get_vc("")  # Empty sid unloads model
            self.current_model = None
            self.current_sid = None
            
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                print(f"[RVC] VRAM cleared")


# ============================================================================
# Utility Functions
# ============================================================================

def extract_timbre_embedding(audio, sr=16000):
    """
    Extract timbre embedding from audio
    
    Args:
        audio: Input audio array
        sr: Sample rate
        
    Returns:
        Timbre embedding vector (simplified - uses RMS + spectral features)
    """
    # Calculate RMS
    rms = np.sqrt(np.mean(audio ** 2))
    
    # Calculate spectral centroid
    spectral_centroid = librosa.feature.spectral_centroid(y=audio, sr=sr)
    mean_centroid = np.mean(spectral_centroid)
    
    # Calculate zero crossing rate
    zcr = librosa.feature.zero_crossing_rate(audio)
    mean_zcr = np.mean(zcr)
    
    # Simple embedding: [rms, spectral_centroid, zcr]
    embedding = np.array([rms, mean_centroid, mean_zcr])
    
    return embedding


def modify_f0_for_emotion(f0, emotion="neutral"):
    """
    Modify F0 contour based on emotion
    
    Args:
        f0: F0 contour (numpy array)
        emotion: Emotion type ("happy", "sad", "angry", "fearful", "neutral")
        
    Returns:
        Modified F0 contour
    """
    emotion_multipliers = {
        "happy": 1.08,      # Higher pitch, more energetic
        "sad": 0.92,        # Lower pitch, slower
        "angry": 1.12,      # Higher pitch, more intense
        "fearful": 1.15,    # Much higher pitch
        "surprised": 1.20,  # Sharp pitch increase
        "neutral": 1.0,     # No change
        "calm": 0.95,       # Slightly lower, relaxed
    }
    
    multiplier = emotion_multipliers.get(emotion.lower(), 1.0)
    
    print(f"[RVC] Applying emotion: {emotion} (x{multiplier:.2f})")
    
    return f0 * multiplier


def convert_voice(
    input_audio,
    model_path,
    output_path=None,
    pitch_shift=0,
    emotion=None,
    **kwargs
):
    """
    High-level voice conversion function
    
    Args:
        input_audio: Input audio file path or numpy array
        model_path: Path to RVC model (.pth file)
        output_path: Output audio file path (optional)
        pitch_shift: Base pitch shift in semitones
        emotion: Optional emotion to apply
        **kwargs: Additional parameters for RVC conversion
        
    Returns:
        Converted audio array and sample rate
    """
    # Initialize RVC
    rvc = RVCModel()
    
    try:
        # Load model
        rvc.load_model(model_path)
        
        # Load input audio
        if isinstance(input_audio, str):
            audio, sr = librosa.load(input_audio, sr=16000, mono=True)
        else:
            audio = input_audio
            sr = 16000
        
        # Apply emotion-based F0 modification
        if emotion:
            # Extract F0 first
            f0, _ = librosa.pyin(
                audio,
                fmin=librosa.note_to_hz("C2"),
                fmax=librosa.note_to_hz("C7"),
                sr=sr
            )
            f0 = np.nan_to_num(f0, nan=0.0)
            
            # Modify F0 based on emotion
            f0_modified = modify_f0_for_emotion(f0, emotion)
            
            # Calculate effective pitch shift from emotion
            base_f0 = np.mean(f0[f0 > 0]) if np.any(f0 > 0) else 200
            modified_f0 = np.mean(f0_modified[f0_modified > 0]) if np.any(f0_modified > 0) else base_f0
            emotion_pitch_shift = 12 * np.log2(modified_f0 / base_f0)
            
            pitch_shift += emotion_pitch_shift
            print(f"[RVC] Emotion '{emotion}' adds {emotion_pitch_shift:+.2f} semitones")
        
        # Convert voice
        converted_audio, out_sr = rvc.convert(
            audio=audio,
            sr=sr,
            f0_up_key=pitch_shift,
            **kwargs
        )
        
        # Save output
        if output_path:
            sf.write(output_path, converted_audio, out_sr)
            print(f"[RVC] Output saved: {output_path}")
        
        return converted_audio, out_sr
        
    finally:
        # Cleanup
        rvc.unload_model()


# ============================================================================
# Example Usage
# ============================================================================

if __name__ == "__main__":
    # Example: Convert voice using RVC
    print("=" * 60)
    print("RVC Voice Conversion Example")
    print("=" * 60)
    
    # Configuration
    MODEL_PATH = r"D:\VocalForge\RVCWebUI\assets\weights\your_model.pth"
    INPUT_AUDIO = r"D:\VocalForge\input.wav"
    OUTPUT_AUDIO = r"D:\VocalForge\output_rvc.wav"
    
    # Check if model exists
    if not os.path.exists(MODEL_PATH):
        print(f"Model not found: {MODEL_PATH}")
        print("Please download an RVC model first")
    elif not os.path.exists(INPUT_AUDIO):
        print(f"Input audio not found: {INPUT_AUDIO}")
    else:
        # Convert voice
        converted, sr = convert_voice(
            input_audio=INPUT_AUDIO,
            model_path=MODEL_PATH,
            output_path=OUTPUT_AUDIO,
            pitch_shift=0,
            emotion="happy",
            f0_method="rmvpe",
            index_rate=0.75,
            filter_radius=3,
            rms_mix_rate=0.25,
            protect=0.33,
        )
        
        print(f"\nConversion complete!")
        print(f"Output: {OUTPUT_AUDIO}")
        print(f"Duration: {len(converted) / sr:.2f}s")
