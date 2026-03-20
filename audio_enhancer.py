"""
VocalForge — Audio Enhancer v2.0
═══════════════════════════════════════════════════════════════════
Auto noise profile detection + multi-stage FFmpeg denoising chain.

Modes:
  auto       → Analizează primele secunde pentru profil de zgomot
  light      → Denoising ușor (tape hiss, ușor)
  medium     → Denoising moderat (mic noise, studio)
  aggressive → Denoising puternic (câmp, exterior)

Pipeline:
  adeclick → anlmdn → afftdn (cu profil auto) → HPF → EQ → loudnorm
"""

import os
import sys
import json
import subprocess
import tempfile
import struct
import wave
import argparse
from pathlib import Path


# ─── PRESETS ──────────────────────────────────────────────────────────────────

PRESETS = {
    "light": {
        "highpass":  "40",
        "afftdn":    "nr=10:nf=-25",
        "anlmdn":    "s=7:p=0.002:r=0.002:m=15",
        "adeclick":  None,   # Nu e necesar pentru hiss simplu
        "eq":        None,
    },
    "medium": {
        "highpass":  "40",
        "afftdn":    "nr=20:nf=-20",
        "anlmdn":    "s=7:p=0.005:r=0.005:m=15",
        "adeclick":  None,
        "eq":        (
            "equalizer=f=8000:t=q:w=2:g=-1.5,"
            "equalizer=f=12000:t=q:w=2:g=-2"
        ),
    },
    "aggressive": {
        "highpass":  "50",
        "afftdn":    "nr=30:nf=-15",
        "anlmdn":    "s=7:p=0.008:r=0.008:m=15",
        "adeclick":  "w=55:o=25:a=2",
        "eq":        (
            "equalizer=f=6000:t=q:w=1.5:g=-2,"
            "equalizer=f=9000:t=q:w=1.5:g=-3,"
            "equalizer=f=13000:t=q:w=1.5:g=-4"
        ),
    },
}


# ─── NOISE PROFILE AUTO-DETECTION ─────────────────────────────────────────────

def detect_silence_segment(input_path: str, max_duration: float = 10.0) -> tuple[float, float] | None:
    """
    Detectează primul segment de liniște din audio (candidat pentru profil de zgomot).
    Returnează (start_sec, end_sec) sau None dacă nu găsește.
    """
    cmd = [
        "ffmpeg", "-i", input_path,
        "-af", "silencedetect=noise=-40dB:duration=0.3",
        "-f", "null", "-",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    output = result.stderr

    # Parsează output-ul silencedetect
    import re
    starts = [float(m) for m in re.findall(r"silence_start:\s*([\d.]+)", output)]
    ends   = [float(m) for m in re.findall(r"silence_end:\s*([\d.]+)", output)]

    if not starts or not ends:
        return None

    # Caută primul segment de liniște cu durată >= 0.3s
    for s, e in zip(starts, ends):
        duration = e - s
        if duration >= 0.3:
            # Limitează la max_duration secunde de la început
            if s < max_duration:
                return (s, min(e, s + 2.0))  # Max 2s pentru profil

    return None


def extract_noise_profile(input_path: str, start: float, end: float) -> str | None:
    """
    Extrage un profil de zgomot WAV din segmentul specificat.
    Returnează calea către fișierul profil temporar sau None.
    """
    profile_path = tempfile.mktemp(suffix="_noise_profile.wav")
    duration = end - start

    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start),
        "-t",  str(duration),
        "-i",  input_path,
        "-ac", "1",           # Mono pentru profil
        "-ar", "44100",
        profile_path,
    ]

    result = subprocess.run(cmd, capture_output=True, timeout=15)
    if result.returncode == 0 and os.path.exists(profile_path):
        return profile_path
    return None


def analyze_noise_floor(input_path: str, start: float, end: float) -> float:
    """
    Analizează nivelul RMS al segmentului de liniște.
    Returnează noise floor în dBFS.
    """
    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start),
        "-t",  str(end - start),
        "-i",  input_path,
        "-af", "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level",
        "-f",  "null", "-",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)

    import re
    match = re.search(r"RMS_level=(-[\d.]+)", result.stderr)
    if match:
        rms_db = float(match.group(1))
        return rms_db

    return -30.0  # Default se noise floor nu e detectabil


def auto_detect_preset(input_path: str) -> dict:
    """
    Analizează fișierul audio și returnează parametrii optimi pentru denoising.

    Logică:
    - Dacă găsește segment de liniște: extrage profil real, calculează nr optim
    - Dacă nu găsește liniște: folosește preset 'medium' cu estimare automată
    """
    print("  [AUTO] Analizez profilul de zgomot...")

    silence = detect_silence_segment(input_path)

    if silence:
        start, end = silence
        duration = end - start
        print(f"  [AUTO] Segment de liniște găsit: {start:.2f}s → {end:.2f}s ({duration:.2f}s)")

        noise_floor = analyze_noise_floor(input_path, start, end)
        print(f"  [AUTO] Noise floor detectat: {noise_floor:.1f} dBFS")

        # Calculează parametrii bazat pe noise floor măsurat
        if noise_floor > -20:
            # Zgomot puternic (> -20dBFS) → aggressive
            nr_strength = 35
            nf_value    = int(noise_floor) - 2
            preset_base = "aggressive"
            print(f"  [AUTO] Nivel zgomot: RIDICAT → preset aggressive")

        elif noise_floor > -30:
            # Zgomot moderat (-30 → -20 dBFS) → medium
            nr_strength = 20
            nf_value    = int(noise_floor) - 2
            preset_base = "medium"
            print(f"  [AUTO] Nivel zgomot: MODERAT → preset medium")

        else:
            # Zgomot ușor (< -30 dBFS) → light
            nr_strength = 12
            nf_value    = int(noise_floor) - 2
            preset_base = "light"
            print(f"  [AUTO] Nivel zgomot: UȘOR → preset light")

        # Construiește preset custom bazat pe profil real
        base = PRESETS[preset_base].copy()
        base["afftdn"]   = f"nr={nr_strength}:nf={nf_value}"
        base["_source"]  = "auto_detected"
        base["_noise_floor"] = noise_floor
        base["_silence_segment"] = silence
        return base

    else:
        print("  [AUTO] Nu s-a găsit segment de liniște — folosesc estimare automată (medium)")
        base = PRESETS["medium"].copy()
        # Fără nf= explicit → afftdn estimează automat din primele 500ms
        base["afftdn"]  = "nr=20"
        base["_source"] = "auto_estimated"
        return base


# ─── BUILD FILTER CHAIN ───────────────────────────────────────────────────────

def build_filter_chain(params: dict) -> str:
    """
    Construiește lanțul de filtre FFmpeg în ordinea corectă.
    Ordine: adeclick → anlmdn → afftdn → highpass → eq → loudnorm
    """
    filters = []

    # 1. Adeclick — elimină click-uri/pops înainte de orice altceva
    if params.get("adeclick"):
        filters.append(f"adeclick={params['adeclick']}")

    # 2. anlmdn — Non-Local Means, lucrează complementar cu afftdn
    if params.get("anlmdn"):
        filters.append(f"anlmdn={params['anlmdn']}")

    # 3. afftdn — Adaptive Frequency Filtering Denoising (core)
    if params.get("afftdn"):
        filters.append(f"afftdn={params['afftdn']}")

    # 4. High-pass filter — elimină rumble sub X Hz
    if params.get("highpass"):
        filters.append(f"highpass=f={params['highpass']}")

    # 5. EQ — targhetează frecvențele de hiss rămase
    if params.get("eq"):
        filters.append(params["eq"])

    # 6. Loudnorm — normalizare la standard streaming
    filters.append("loudnorm=I=-14:TP=-1:LRA=7")

    chain = ",".join(filters)
    return chain


# ─── MAIN PROCESS ─────────────────────────────────────────────────────────────

def process_audio(
    input_path: str,
    output_path: str,
    mode: str = "auto",
    verbose: bool = False,
) -> dict:
    """
    Procesează fișierul audio cu denoising.

    Args:
        input_path:  Calea fișierului input
        output_path: Calea fișierului output
        mode:        'auto' | 'light' | 'medium' | 'aggressive'
        verbose:     Afișează log detaliat

    Returns:
        dict cu rezultate și statistici
    """
    input_path  = str(Path(input_path).resolve())
    output_path = str(Path(output_path).resolve())

    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input nu există: {input_path}")

    print(f"\n{'═'*60}")
    print(f"  VocalForge Audio Enhancer v2.0")
    print(f"{'═'*60}")
    print(f"  Input : {Path(input_path).name}")
    print(f"  Output: {Path(output_path).name}")
    print(f"  Mode  : {mode.upper()}")
    print(f"{'─'*60}")

    # Selectează parametrii
    if mode == "auto":
        params = auto_detect_preset(input_path)
    elif mode in PRESETS:
        params = PRESETS[mode].copy()
        params["_source"] = "preset"
        print(f"  [PRESET] Folosesc preset: {mode}")
    else:
        raise ValueError(f"Mode invalid: {mode}. Alege: auto, light, medium, aggressive")

    # Build filter chain
    filter_chain = build_filter_chain(params)

    if verbose:
        print(f"\n  [CHAIN] {filter_chain}\n")

    print(f"{'─'*60}")
    print(f"  Procesez audio...")

    # Rulează FFmpeg
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-af", filter_chain,
        "-ar", "44100",
        "-ac", "2",
        "-b:a", "320k" if output_path.endswith(".mp3") else "0",
        output_path,
    ]

    if not verbose:
        cmd += ["-loglevel", "error"]

    result = subprocess.run(cmd, capture_output=not verbose, text=True, timeout=300)

    if result.returncode != 0:
        error = result.stderr if result.stderr else "FFmpeg error"
        raise RuntimeError(f"FFmpeg failed:\n{error}")

    # Verifică output
    if not os.path.exists(output_path):
        raise RuntimeError("Output nu a fost creat")

    output_size = os.path.getsize(output_path)
    input_size  = os.path.getsize(input_path)

    print(f"  ✓ Gata!")
    print(f"{'─'*60}")
    print(f"  Input size : {input_size / 1024 / 1024:.1f} MB")
    print(f"  Output size: {output_size / 1024 / 1024:.1f} MB")

    if "_noise_floor" in params:
        print(f"  Noise floor: {params['_noise_floor']:.1f} dBFS")
    if "_silence_segment" in params:
        s, e = params["_silence_segment"]
        print(f"  Profil din : {s:.2f}s → {e:.2f}s")

    print(f"{'═'*60}\n")

    return {
        "success":      True,
        "input":        input_path,
        "output":       output_path,
        "mode":         mode,
        "source":       params.get("_source", "preset"),
        "noise_floor":  params.get("_noise_floor"),
        "filter_chain": filter_chain,
    }


# ─── BATCH PROCESSING ─────────────────────────────────────────────────────────

def batch_process(input_dir: str, output_dir: str, mode: str = "auto", ext: str = "wav"):
    """
    Procesează toate fișierele dintr-un folder.
    """
    input_dir  = Path(input_dir)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    files = list(input_dir.glob(f"*.{ext}")) + list(input_dir.glob(f"*.mp3")) + list(input_dir.glob(f"*.flac"))

    if not files:
        print(f"Nu s-au găsit fișiere audio în: {input_dir}")
        return

    print(f"\nBatch processing: {len(files)} fișiere")
    results = []

    for i, f in enumerate(files, 1):
        print(f"\n[{i}/{len(files)}] {f.name}")
        out = output_dir / f"{f.stem}_enhanced{f.suffix}"
        try:
            r = process_audio(str(f), str(out), mode=mode)
            results.append(r)
        except Exception as e:
            print(f"  ✗ Eroare: {e}")
            results.append({"success": False, "input": str(f), "error": str(e)})

    success = sum(1 for r in results if r.get("success"))
    print(f"\n{'═'*60}")
    print(f"  Batch complet: {success}/{len(files)} reușite")
    print(f"{'═'*60}\n")


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="VocalForge Audio Enhancer v2.0 — Hiss & noise removal",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemple:
  python audio_enhancer.py input.wav output.wav
  python audio_enhancer.py input.wav output.wav --mode aggressive
  python audio_enhancer.py input.wav output.wav --mode auto --verbose
  python audio_enhancer.py --batch ./input_folder ./output_folder --mode auto
        """
    )

    parser.add_argument("input",  nargs="?", help="Fișier audio input")
    parser.add_argument("output", nargs="?", help="Fișier audio output")
    parser.add_argument(
        "--mode", "-m",
        choices=["auto", "light", "medium", "aggressive"],
        default="auto",
        help="Modul de denoising (default: auto)"
    )
    parser.add_argument("--verbose", "-v", action="store_true", help="Log detaliat FFmpeg")
    parser.add_argument("--batch",   "-b", nargs=2, metavar=("INPUT_DIR", "OUTPUT_DIR"),
                        help="Procesare batch: --batch input_dir output_dir")
    parser.add_argument("--show-chain", action="store_true", help="Afișează filter chain și iese")

    args = parser.parse_args()

    # Show filter chain
    if args.show_chain:
        for name, preset in PRESETS.items():
            chain = build_filter_chain(preset)
            print(f"\n[{name.upper()}]\n{chain}")
        return

    # Batch mode
    if args.batch:
        batch_process(args.batch[0], args.batch[1], mode=args.mode)
        return

    # Single file mode
    if not args.input or not args.output:
        parser.print_help()
        sys.exit(1)

    try:
        result = process_audio(
            args.input,
            args.output,
            mode=args.mode,
            verbose=args.verbose,
        )
        sys.exit(0)
    except Exception as e:
        print(f"\n✗ Eroare: {e}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
