"""
VocalForge Stage 4 — Mix & Master
Vocal Chain DSP + Stem Mix + Loudness Master (Spotify -14 LUFS)

Chain:
  vocals.wav  → HPF(80Hz) → EQ → Comp → Deesser → Reverb → Limiter
  + instrumental.wav → gain trim + gentle EQ
  → stereo mix (vocal 1.2x weight) → Loudnorm -14 LUFS / -1dB TP
  → final_master.wav  +  final_master.mp3 (320k)
"""

import os
import subprocess
import numpy as np
import soundfile as sf
import librosa


def get_rms_db(path: str) -> float:
    """Measure RMS level in dBFS."""
    y, sr = librosa.load(path, sr=None, mono=True)
    rms = np.sqrt(np.mean(y ** 2))
    if rms < 1e-9:
        return -96.0
    return float(20 * np.log10(rms))


def match_duration(vocal_path: str, inst_path: str, out_dir: str) -> str:
    """Trim/pad instrumental to match vocal length. Returns matched WAV path."""
    y_v, sr_v = librosa.load(vocal_path, sr=None, mono=False)
    y_i, sr_i = librosa.load(inst_path,  sr=None, mono=False)

    vocal_frames = y_v.shape[-1]
    inst_frames  = y_i.shape[-1]
    matched_path = os.path.join(out_dir, "inst_matched.wav")

    if inst_frames >= vocal_frames:
        y_i = y_i[..., :vocal_frames]
    else:
        pad = vocal_frames - inst_frames
        if y_i.ndim == 1:
            y_i = np.concatenate([y_i, np.zeros(pad, dtype=y_i.dtype)])
        else:
            y_i = np.concatenate([y_i, np.zeros((y_i.shape[0], pad), dtype=y_i.dtype)], axis=-1)

    sf.write(matched_path, y_i.T if y_i.ndim > 1 else y_i, sr_i, subtype="PCM_16")
    return matched_path


def mix_and_master(
    vocal_path: str,
    instrumental_path: str,
    output_path: str,
    vocal_gain_db: float = 0.0,
    inst_gain_db: float = -1.5,
    reverb_wet: float = 0.15,
    target_lufs: float = -14,
    true_peak_db: float = -1,
) -> str:
    """
    Full professional mix + master via FFmpeg.

    Vocal chain:  HPF 80Hz → EQ (warmth/cut/air) → Comp 3:1 → Deesser → Room reverb → Limiter
    Inst chain:   Gain trim → Low shelf → Mid cut → Comp 2:1
    Master:       amix (vocal 1.2 weight) → loudnorm -14 LUFS / -1dB TP
    Export:       WAV 48kHz/16bit  +  MP3 320k

    Returns output_path on success, raises RuntimeError on failure.
    """
    out_dir = os.path.dirname(output_path)
    os.makedirs(out_dir, exist_ok=True)

    # ── Auto-balance via RMS ─────────────────────────────────────────────────
    vocal_rms = get_rms_db(vocal_path)
    inst_rms  = get_rms_db(instrumental_path)
    rms_diff  = inst_rms - vocal_rms
    # Vocal should sit ~3 dB above instrumental in raw RMS before mix
    auto_inst_adjust = rms_diff - 3.0
    final_inst_gain  = inst_gain_db - max(0.0, auto_inst_adjust)
    final_inst_gain  = max(-14.0, min(0.0, final_inst_gain))

    print(f"[Stage4] Vocal RMS={vocal_rms:.1f} dBFS  Inst RMS={inst_rms:.1f} dBFS")
    print(f"[Stage4] Inst gain after auto-balance: {final_inst_gain:.1f} dB")

    # ── Duration match ───────────────────────────────────────────────────────
    matched_inst = match_duration(vocal_path, instrumental_path, out_dir)

    # ── FFmpeg filter_complex ────────────────────────────────────────────────
    reverb_dry = 1.0 - reverb_wet

    vocal_chain = (
        f"volume={vocal_gain_db:.1f}dB,"
        "highpass=f=80:poles=2,"
        "equalizer=f=150:width_type=q:width=1.5:g=1.5,"    # warmth
        "equalizer=f=2500:width_type=q:width=1.2:g=-4,"    # cut boxiness
        "equalizer=f=4000:width_type=q:width=1.0:g=-2,"    # cut harshness
        "equalizer=f=10000:width_type=q:width=2.0:g=1,"    # air
        "acompressor=threshold=-16dB:ratio=3:attack=20:release=150:makeup=3,"
        "equalizer=f=6000:width_type=q:width=2.0:g=-3,"    # deesser approx
        f"aecho=in_gain={reverb_dry:.2f}:out_gain={reverb_dry:.2f}"
        f":delays=60|80:decays={reverb_wet:.2f}|{reverb_wet * 0.7:.2f},"
        "alimiter=limit=-1dB:attack=5:release=50"
    )

    inst_chain = (
        f"volume={final_inst_gain:.1f}dB,"
        "equalizer=f=80:width_type=q:width=1.0:g=1,"
        "equalizer=f=3000:width_type=q:width=1.5:g=-1,"
        "acompressor=threshold=-20dB:ratio=2:attack=30:release=200:makeup=1"
    )

    filter_complex = (
        f"[0:a]{vocal_chain}[voc];"
        f"[1:a]{inst_chain}[ins];"
        "[voc][ins]amix=inputs=2:duration=first:weights=1.2 1[mix];"
        f"[mix]loudnorm=I={int(target_lufs)}:TP={int(true_peak_db)}:LRA=11[out]"
    )

    cmd = [
        "ffmpeg", "-y",
        "-i", vocal_path,
        "-i", matched_inst,
        "-filter_complex", filter_complex,
        "-map", "[out]",
        "-ar", "48000",
        "-ac", "2",
        "-c:a", "pcm_s16le",
        output_path,
    ]

    print("[Stage4] Running FFmpeg mix+master...")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"[Stage4] FFmpeg error:\n{result.stderr[-2000:]}")
        raise RuntimeError(f"Stage 4 mix failed: {result.stderr[-400:]}")

    if not os.path.exists(output_path) or os.path.getsize(output_path) < 1000:
        raise RuntimeError("Mix output file missing or empty")

    size_mb = os.path.getsize(output_path) / 1024 / 1024
    print(f"[Stage4] ✅ Master WAV: {output_path} ({size_mb:.1f} MB)")

    # ── MP3 320k export ──────────────────────────────────────────────────────
    mp3_path = output_path.replace(".wav", ".mp3")
    r = subprocess.run([
        "ffmpeg", "-y", "-i", output_path,
        "-c:a", "libmp3lame", "-b:a", "320k", "-id3v2_version", "3",
        mp3_path,
    ], capture_output=True)
    if r.returncode == 0 and os.path.exists(mp3_path):
        print(f"[Stage4] ✅ Master MP3: {mp3_path} ({os.path.getsize(mp3_path)/1024/1024:.1f} MB)")

    # Cleanup temp file
    if os.path.exists(matched_inst):
        try:
            os.remove(matched_inst)
        except Exception:
            pass

    return output_path
