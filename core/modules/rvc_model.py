"""
RVC (Retrieval-based Voice Conversion) Wrapper for VocalForge
Integrates RVC voice conversion into VocalForge pipeline
"""

import os
import sys
import torch
import numpy as np
import soundfile as sf
import librosa
from io import BytesIO

# Add RVCWebUI to path
RVC_DIR = r"D:\VocalForge\RVCWebUI"
if RVC_DIR not in sys.path:
    sys.path.insert(0, RVC_DIR)

# Add infer module to path
INFER_DIR = os.path.join(RVC_DIR, "infer")
if INFER_DIR not in sys.path:
    sys.path.insert(0, INFER_DIR)

# Save original working directory and change to RVC_DIR for config loading
ORIGINAL_CWD = os.getcwd()
os.chdir(RVC_DIR)

print(f"[RVC] RVC_DIR: {RVC_DIR}")
print(f"[RVC] sys.path updated: {RVC_DIR in sys.path}")
print(f"[RVC] Working directory: {os.getcwd()}")

from infer.modules.vc.modules import VC
from infer.lib.audio import load_audio
from configs.config import Config

# Change back to original directory after imports
os.chdir(ORIGINAL_CWD)


class RVCModel:
    """
    RVC Voice Conversion Model Wrapper
    
    Provides easy-to-use interface for voice conversion with:
    - Pitch shifting
    - Timbre/embedding control
    - Emotion-based F0 modification
    """
    
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
        Load RVC voice model
        
        Args:
            model_path: Path to .pth model file
            sid: Speaker ID (for models with multiple speakers)
        """
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found: {model_path}")
        
        print(f"[RVC] Loading model: {model_path}")
        
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
        **kwargs
    ):
        """
        Convert voice using loaded RVC model
        
        Args:
            audio: Input audio (numpy array or file path)
            sr: Sample rate of input audio
            f0_up_key: Pitch shift in semitones (-12 to +12)
            filter_radius: Median filter radius for pitch smoothing
            rms_mix_rate: Mix ratio between original and converted vocal
            protect: Protection level for voiceless consonants
            f0_method: F0 extraction method ("pm", "harvest", "crepe", "rmvpe")
            index_rate: Retrieval index usage ratio (0-1)
            
        Returns:
            Converted audio (numpy array)
        """
        if self.current_model is None:
            raise RuntimeError("No model loaded. Call load_model() first.")
        
        print(f"[RVC] Converting voice...")
        print(f"[RVC]   Pitch shift: {f0_up_key:+.1f} semitones")
        print(f"[RVC]   F0 method: {f0_method}")
        print(f"[RVC]   Index rate: {index_rate}")
        
        # Handle file path or audio array
        if isinstance(audio, str):
            input_path = audio
        else:
            # Save audio to temp file
            import tempfile
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
            
            # Resample to 44100Hz for browser compatibility
            TARGET_SR = 44100
            if tgt_sr != TARGET_SR:
                audio_data = librosa.resample(audio_data.astype(np.float32), orig_sr=tgt_sr, target_sr=TARGET_SR)
                print(f"[RVC] Resampled: {tgt_sr}Hz -> {TARGET_SR}Hz")
                tgt_sr = TARGET_SR
            
            print(f"[RVC] Conversion complete: {len(audio_data)} samples @ {tgt_sr}Hz")
            
            return audio_data, tgt_sr
            
        except Exception as e:
            print(f"[RVC] Conversion error: {e}")
            raise
        finally:
            os.chdir(ORIGINAL_CWD)
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
