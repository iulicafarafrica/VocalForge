# Copyright (c) 2025 Compunect GmbH. All rights reserved.
# Licensed under the Compunect proprietary license. See LICENSE for details.
"""
GGUF LM Backend for ACE-Step — uses demodokos_gguf.exe (renamed llama-server.exe from llama.cpp) for quantized GGUF model inference.
Replaces the transformers-based LLMHandler for the language model phase while
keeping the same interface contract so generate_music() works unchanged.

Key differences from HuggingFace LLMHandler:
  - No true CFG: cfg_scale is a discrete mode selector (0=off, 1=steering, 2=inference)
    Mode 1 injects 'restrict: "negatives"' in the <think> section (restrict key removed before DiT)
    Mode 2 uses ONLY Qwen3-4B-Instruct rewrite (Stage 2) — no Phase 1 steering injection
  - Uses demodokos_gguf.exe as a subprocess (HTTP API on port 19849) for inference
  - CFG rewrite LM runs on dedicated port 19851 (non-ultra) or port 19849 (ultra-VRAM, takes over primary LM port)
  - GGUF models are much smaller and load faster than full-precision checkpoints
  - Binary auto-downloaded from llama.cpp GitHub releases and renamed to demodokos_gguf.exe
    for unique process identification and orphan cleanup (prevents VRAM leaks)

Binary files (demodokos_gguf.exe + CUDA DLLs) are stored in <project_dir>/bin/llama/.
Model files are downloaded from HuggingFace into the checkpoint directory structure
used by the rest of ACE-Step (checkpoints/<model_name>/).
"""

import os
import gc
import sys
import json
import time
import yaml
import shutil
import zipfile
import threading
import subprocess
import traceback
import urllib.request
import urllib.error
import concurrent.futures
from typing import Optional, Dict, Any, List
from pathlib import Path


# ─── llama.cpp Release Configuration ─────────────────────────────────────────
# Update LLAMA_BUILD_TAG and URLs when upgrading the bundled llama.cpp version
# SYNC: LLAMA_BUILD_TAG must match the "build_tag" field of the "llama_framework" entry in DOWNLOAD_CATALOG (acestep_server.py).
LLAMA_BUILD_TAG = "b8192"
LLAMA_SERVER_PORT = 19849
LLAMA_SERVER_HOST = "127.0.0.1"

# Download URLs per CUDA version family — main binary archives + CUDA runtime DLLs
LLAMA_DOWNLOAD_URLS = {
    "cu124": {
        "main": f"https://github.com/ggml-org/llama.cpp/releases/download/{LLAMA_BUILD_TAG}/llama-{LLAMA_BUILD_TAG}-bin-win-cuda-12.4-x64.zip",
        "cudart": f"https://github.com/ggml-org/llama.cpp/releases/download/{LLAMA_BUILD_TAG}/cudart-llama-bin-win-cuda-12.4-x64.zip",
        "label": "CUDA 12.4 (compatible with CUDA 12.x)",
    },
    "cu131": {
        "main": f"https://github.com/ggml-org/llama.cpp/releases/download/{LLAMA_BUILD_TAG}/llama-{LLAMA_BUILD_TAG}-bin-win-cuda-13.1-x64.zip",
        "cudart": f"https://github.com/ggml-org/llama.cpp/releases/download/{LLAMA_BUILD_TAG}/cudart-llama-bin-win-cuda-13.1-x64.zip",
        "label": "CUDA 13.1 (requires driver supporting CUDA 13.x+)",
    },
}

# Maximum parallel slots for batch generation — llama-server allocates one KV cache slot per parallel stream.
# Each slot needs n_ctx tokens of KV memory. With n_parallel=8 and n_ctx=8192, total KV context = 65536.
# VRAM overhead scales linearly: ~640 MB per slot for 4B GQA model. RTX 5090 (32 GB) handles 8 slots easily.
LLAMA_MAX_PARALLEL = 8

# Default system instruction matching the upstream ACE-Step LM training format
DEFAULT_LM_INSTRUCTION = "Generate audio semantic tokens based on the given conditions:"

# ─── Phase 1 CoT GBNF Grammars ──────────────────────────────────────────────
# Grammar is ALWAYS applied for Phase 1 — forces all 6 YAML metadata fields, prevents NO_CAPTION failures.
# Constraints match upstream ACE-Step constrained_logits_processor.py + constants.py:
#   bpm   → 0 (speech/no-tempo) or 30-300 (2-3 digits, range-constrained)
#   cap   → multi-line free-form caption text. Continuation lines start with 2-space indent so yaml.safe_load()
#           treats them as continuation of the caption value (YAML plain scalar folding). Without indentation,
#           continuation lines would be parsed as separate YAML keys, breaking parsing.
#   dur   → 10-600 (2-3 digits, range-constrained)
#   ks    → [A-G][#|b|♯|♭]? [major|minor] — 70 valid combinations
#   lang  → exact ISO 639-1 codes from VALID_LANGUAGES (51 codes) or "unknown" 
#   ts    → only 2, 3, 4, or 6 (valid time signatures)  2 = 2/4, 3 = 3/4, 4 = 4/4, 6 = 6/8

# Shared sub-rules used by both FULL and THINK grammars
_GRAMMAR_RULES = (
    'bpm ::= "0" | [3-9] [0-9] | [1-2] [0-9] [0-9] | "300"\n'
    'cap ::= [^\\n]+ ("\\n  " [^\\n]+)*\n'
    'dur ::= [1-9] | [0-9] [0-9] | [1-5] [0-9] [0-9] | "600"\n'
    'ks ::= [A-G] acc? " " ("major" | "minor")\n'
    'acc ::= "#" | "b" | "♭" | "♯" | "\\u266f" | "\\u266d"\n'
    'lang ::= "ar" | "az" | "bg" | "bn" | "ca" | "cs" | "da" | "de" | "el" | "en" | "es" | "fa" | "fi" | "fr" | "he" | "hi" | "hr" | "ht" | "hu" | "id" | "is" | "it" | "ja" | "ko" | "la" | "lt" | "ms" | "ne" | "nl" | "no" | "pa" | "pl" | "pt" | "ro" | "ru" | "sa" | "sk" | "sr" | "sv" | "sw" | "ta" | "te" | "th" | "tl" | "tr" | "uk" | "ur" | "vi" | "yue" | "zh" | "unknown"\n'
    'ts ::= "2" | "3" | "4" | "6"'
)

# Standard grammar for mode 0 (Off) — model generates YAML fields directly from assistant position
PHASE1_GRAMMAR_FULL = 'root ::= "bpm: " bpm "\\ncaption: " cap "\\nduration: " dur "\\nkeyscale: " ks "\\nlanguage: " lang "\\ntimesignature: " ts "\\n"\n' + _GRAMMAR_RULES

# Steering grammar (mode 1 only) — model continues after "restrict: ...\nbpm:" prefix, first token is space + bpm digits
PHASE1_GRAMMAR_THINK = 'root ::= " " bpm "\\ncaption: " cap "\\nduration: " dur "\\nkeyscale: " ks "\\nlanguage: " lang "\\ntimesignature: " ts "\\n"\n' + _GRAMMAR_RULES

# ─── CFG Stage 2: Caption Rewrite LM Configuration ──────────────────────────
# Dedicated CFG rewrite server on port 19851 — hardcoded Qwen3-4B Q5K, 4K ctx, on-demand.
# Loads briefly during generation when LM CFG = Inference mode, then unloads to free VRAM.
CFG_REWRITE_DEDICATED_PORT = 19851
CFG_REWRITE_CTX = 4096  # 4K context: sufficient for CFG caption rewrite (~200 chars)

# ─── Creative AI (Music Writer) LM Configuration ────────────────────────────
# User-selectable model on port 19850 — configurable model and context size via C# settings.
# On-demand mode: loads when Creative Agent opens, unloads when generation starts (except Extract).
# Always-loaded mode: stays in VRAM alongside primary LM.
CREATIVE_AI_PORT = 19850
CREATIVE_AI_DEFAULT_CTX = 8192  # Default context for Creative AI — larger for conversation history

# SYNC: model_tag, repo, and filename must match the DOWNLOAD_CATALOG entry that has "cfg_rewrite" in required_for (aesthetep_server.py).
CFG_REWRITE_MODEL_INFO = {
    "repo": "cmp-nct/Qwen3-4B-Instruct-2507-GGUF",
    "filename": "Qwen3-4B-Instruct-2507-UD-Q5_K_XL.gguf",
    "model_tag": "Qwen3-4B-Instruct-2507-UD-Q5_K_XL",
    "size_label": "~3.0 GB",
    "vram_estimate": "~3.5 GB",
}
# GBNF grammar — forces output to begin with "CAPTION_NEW: " prefix (also suppresses Qwen3 <think> mode)
CFG_REWRITE_GRAMMAR = 'root ::= "CAPTION_NEW: " caption\ncaption ::= [^\\n]+'
# System prompt for the CFG rewrite LM — uses nearest-safe substitution with teaching examples (arm_a_policy_hint winner from adherence test v4)
CFG_REWRITE_SYSTEM_PROMPT = (
    "You are a music caption sanitizer. UNWANTED items are forbidden semantic concepts. Also mentioning them in negated form is forbidden. "
    "Algorithm: (1) detect conflicting spans, (2) replace each conflicting span with nearest-safe meaning, "
    "(3) preserve non-conflicting musical intent and sentence flow. "
    "Do not output explanations. Do not copy examples literally.\n"
    "Teaching examples (unrelated domains):\n"
    "- 'abrasive clipped lead' + UNWANTED='harsh clipping' -> 'smooth lead with clean dynamic motion'\n"
    "- 'rigid machine pulse' + UNWANTED='mechanical stiffness' -> 'flowing groove with gentle pulse texture'\n"
    "- 'metallic glare in highs' + UNWANTED='piercing sheen' -> 'balanced highs with hushed human texture'\n"
    "- 'music without piercing sheen' + UNWANTED='piercing sheen' -> 'music with balanced highs and hushed human texture'\n"
    "When UNWANTED removes concrete sound sources (e.g., instruments), remove source-linked action words too "
    "(pluck, strum, stick-hit gestures) and convert them to neutral texture-energy phrasing. "
    "Keep intent using non-source descriptors like vocal texture, breath layer, rhythmic syllables, ambience, or sparse silence. "
    "If no conflict exists, keep caption unchanged. Output only CAPTION_NEW."
)


# ─── Binary Download & Setup Helpers ─────────────────────────────────────────

# Module-level cache for detected CUDA family — only needs to be detected once per process lifetime
_cached_cuda_family: Optional[str] = None
# Serializes _ensure_llama_server() so concurrent callers (PM auto-download + Creative AI init) don't race on downloads
_ensure_server_lock = threading.Lock()

def set_cuda_version_override(version: str) -> None:
    """Override the CUDA family detection from C# config. Called early in server startup to force a specific binary set.
    version: "12" → cu124 binaries, "13" → cu131 binaries, "auto" → no override (auto-detect)."""
    global _cached_cuda_family
    if version == "12":
        _cached_cuda_family = "cu124"
        print(f"[gguf-lm] CUDA version override: forced cu124 (CUDA 12.4 binaries)", flush=True)
    elif version == "13":
        _cached_cuda_family = "cu131"
        print(f"[gguf-lm] CUDA version override: forced cu131 (CUDA 13.1 binaries)", flush=True)
    # "auto" or any other value — leave _cached_cuda_family as None so _detect_cuda_family() auto-detects

def _detect_cuda_family() -> str:
    """Detect the CUDA version family to select the right llama.cpp binaries.
    Primary: nvidia-smi (reports the driver's maximum supported CUDA version — found in system32 on Windows).
    Fallback: PyTorch CUDA version. Default: cu124.
    Returns 'cu131' for CUDA >=13.0 (any 13.x driver), 'cu124' otherwise. Result is cached after first call.
    cu131 binaries include native Blackwell (SM 120) kernels — ~50-70% faster than cu124 on RTX 50-series.
    cu124 ARCHS only go up to SM 890 (Ada Lovelace), forcing slow PTX JIT on Blackwell GPUs."""
    global _cached_cuda_family
    if _cached_cuda_family is not None:
        return _cached_cuda_family

    # Primary detection: nvidia-smi — the driver's max supported CUDA version determines which precompiled binaries we can use
    try:
        import re as _re_cuda
        smi_paths = [
            os.path.join(os.environ.get("SystemRoot", r"C:\Windows"), "System32", "nvidia-smi.exe"),
            "nvidia-smi",  # PATH fallback for non-Windows or custom installs
        ]
        for smi_path in smi_paths:
            try:
                result = subprocess.run([smi_path], capture_output=True, text=True, timeout=10)
                if result.returncode == 0 and result.stdout:
                    match = _re_cuda.search(r"CUDA Version:\s*(\d+)\.(\d+)", result.stdout)
                    if match:
                        major, minor = int(match.group(1)), int(match.group(2))
                        # cu131 works with any CUDA 13.x driver — includes native Blackwell SM 120 kernels
                        family = "cu131" if major >= 13 else "cu124"
                        print(f"[gguf-lm] nvidia-smi detected CUDA {major}.{minor} — selecting {family} binaries", flush=True)
                        _cached_cuda_family = family
                        return family
            except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
                continue
    except Exception:
        pass

    # Fallback: PyTorch CUDA version (may differ from driver's max supported version, e.g. PyTorch cu128 on a CUDA 13.0 driver)
    try:
        import torch
        cuda_ver = getattr(torch.version, 'cuda', None)
        if cuda_ver:
            # Parse major from PyTorch CUDA string (e.g. "13.1", "12.8") — same threshold as nvidia-smi
            parts = cuda_ver.split(".")
            if len(parts) >= 2:
                pt_major = int(parts[0])
                family = "cu131" if pt_major >= 13 else "cu124"
            else:
                family = "cu124"
            print(f"[gguf-lm] PyTorch CUDA {cuda_ver} — selecting {family} binaries (nvidia-smi unavailable)", flush=True)
            _cached_cuda_family = family
            return family
    except ImportError:
        pass

    print("[gguf-lm] No CUDA detection succeeded — defaulting to cu124 binaries", flush=True)
    _cached_cuda_family = "cu124"
    return "cu124"


def _download_with_progress(url: str, dest_path: str, label: str = "", progress_callback=None):
    """Download a file from a URL with periodic [STATUS] progress messages for the C# UI.
    Uses requests library for robust downloading with timeout and redirect handling.
    Falls back to urllib if requests is not available.
    progress_callback: optional callable(downloaded_bytes, total_bytes) invoked during download for external progress tracking."""
    desc = label or os.path.basename(dest_path)
    print(f"[gguf-lm] Downloading {desc} from {url}", flush=True)
    try:
        import requests
        response = requests.get(url, stream=True, timeout=(30, 300), allow_redirects=True)  # 30s connect, 300s read
        response.raise_for_status()
        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0
        last_report = time.time()
        with open(dest_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8 * 1024 * 1024):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if progress_callback:
                        progress_callback(downloaded, total_size)
                    now = time.time()
                    if total_size > 0 and (now - last_report >= 2.0 or downloaded >= total_size):
                        pct = min(100.0, downloaded / total_size * 100)
                        mb_done = downloaded / (1024 * 1024)
                        mb_total = total_size / (1024 * 1024)
                        print(f"[gguf-lm] Downloading {desc}: {mb_done:.0f}/{mb_total:.0f} MB ({pct:.0f}%)", flush=True)
                        last_report = now
    except ImportError:
        # Fallback to urllib if requests is not available
        last_report = [0.0]
        def _reporthook(block_num, block_size, total_size):
            downloaded = block_num * block_size
            if progress_callback:
                progress_callback(downloaded, total_size)
            if total_size > 0:
                pct = min(100.0, downloaded / total_size * 100)
                now = time.time()
                if now - last_report[0] >= 2.0 or pct >= 100:
                    mb_done = downloaded / (1024 * 1024)
                    mb_total = total_size / (1024 * 1024)
                    print(f"[gguf-lm] Downloading {desc}: {mb_done:.0f}/{mb_total:.0f} MB ({pct:.0f}%)", flush=True)
                    last_report[0] = now
        urllib.request.urlretrieve(url, dest_path, reporthook=_reporthook)
    size_mb = os.path.getsize(dest_path) / (1024 * 1024)
    print(f"[gguf-lm] Downloaded {desc}: {size_mb:.0f} MB", flush=True)


def _extract_zip_flat(zip_path: str, dest_dir: str):
    """Extract a zip archive into dest_dir. If all files share a single top-level folder (common for GitHub release zips), that folder is stripped so files land directly in dest_dir."""
    with zipfile.ZipFile(zip_path, 'r') as zf:
        names = [n for n in zf.namelist() if not n.endswith('/')]
        # Detect if all files sit inside one common top-level directory (e.g., "llama-b8182-bin-win-cuda-12.4-x64/")
        top_dirs = set(n.split('/')[0] for n in names if '/' in n)
        has_single_root = len(top_dirs) == 1 and all(n.startswith(list(top_dirs)[0] + '/') for n in names if '/' in n)

        for member in zf.infolist():
            if member.is_dir():
                continue
            # Strip the single top-level directory prefix if present
            rel_path = '/'.join(member.filename.split('/')[1:]) if has_single_root and '/' in member.filename else member.filename
            if not rel_path:
                continue
            dest = os.path.join(dest_dir, rel_path)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with zf.open(member) as src, open(dest, 'wb') as dst:
                dst.write(src.read())


def kill_all_gguf_processes():
    """Kill all running demodokos_gguf.exe processes — orphan cleanup.
    Called at Python server startup and from C# during restart/dispose to prevent VRAM leaks.
    Safe to call even when no processes exist. Returns number of processes killed."""
    if sys.platform != "win32":
        return 0
    try:
        result = subprocess.run(["taskkill", "/F", "/IM", "demodokos_gguf.exe"], capture_output=True, text=True, timeout=5)
        killed = result.stdout.count("SUCCESS")
        if killed > 0:
            print(f"[gguf-lm] Killed {killed} orphaned demodokos_gguf.exe process(es)", flush=True)
        return killed
    except Exception:
        return 0


def _ensure_llama_server(bin_dir: str, progress_callback=None) -> str:
    """Ensure demodokos_gguf.exe (renamed llama-server.exe) is available in bin_dir/llama/.
    Downloads from GitHub releases if missing or outdated, then renames to demodokos_gguf.exe.
    Version tracking uses '{build_tag}-{cuda_family}' format (e.g., 'b8182-cu124') so switching
    CUDA families (cu124↔cu131) also triggers a re-download.
    Thread-safe: serialized via _ensure_server_lock so concurrent callers don't corrupt downloads.
    progress_callback: optional callable(downloaded_bytes, total_bytes) for external progress tracking (used by download manager).
    Returns the full path to demodokos_gguf.exe, or raises RuntimeError on failure."""
    # Serialize concurrent callers — PM auto-download and Creative AI init can both trigger this at startup
    with _ensure_server_lock:
        return _ensure_llama_server_locked(bin_dir, progress_callback)


def _ensure_llama_server_locked(bin_dir: str, progress_callback=None) -> str:
    """Inner implementation of _ensure_llama_server — always called under _ensure_server_lock."""
    llama_dir = os.path.join(bin_dir, "llama")
    server_exe = os.path.join(llama_dir, "demodokos_gguf.exe")
    version_file = os.path.join(llama_dir, "version.txt")
    has_existing_server = os.path.isfile(server_exe)  # track for fallback on download failure

    # Detect CUDA family first — needed for both version comparison and URL selection
    cuda_family = _detect_cuda_family()
    urls = LLAMA_DOWNLOAD_URLS.get(cuda_family, LLAMA_DOWNLOAD_URLS["cu124"])
    expected_version = f"{LLAMA_BUILD_TAG}-{cuda_family}"  # e.g., "b8182-cu124"

    # Check if the correct version (build tag + CUDA family) is already installed
    if has_existing_server and os.path.isfile(version_file):
        with open(version_file, "r") as f:
            installed_version = f.read().strip()
        if installed_version == expected_version:
            # Integrity check: exe must be at least as recent as version.txt.
            # A stale exe (from a failed upgrade where rename was buggy) paired with an updated version.txt
            # would pass the version check but crash at runtime due to ABI mismatch with the new DLLs.
            exe_mtime = os.path.getmtime(server_exe)
            ver_mtime = os.path.getmtime(version_file)
            if exe_mtime < ver_mtime - 60:  # 60s tolerance for extraction time
                print(f"[gguf-lm] WARNING: demodokos_gguf.exe is older than version.txt — binary was not properly upgraded, forcing re-download", flush=True)
            else:
                return server_exe
        else:
            print(f"[gguf-lm] Installed version '{installed_version}' differs from required '{expected_version}' — updating", flush=True)

    print(f"[STATUS] Downloading LM runtime environment ({urls['label']})...", flush=True)
    print(f"[gguf-lm] Setting up llama.cpp {LLAMA_BUILD_TAG} for {urls['label']}", flush=True)

    # Kill all running demodokos_gguf.exe processes BEFORE cleanup — Windows locks exe+DLL files while processes are alive.
    # Without this, os.remove() fails silently and the upgrade cannot replace the old binary.
    killed = kill_all_gguf_processes()
    if killed > 0:
        time.sleep(1.5)  # let Windows release file handles after process termination

    # Clean slate: remove all existing files in llama_dir before extracting new ones.
    # Old DLLs (e.g., cu131 alongside cu124) or mismatched exe cause crashes — wiping ensures a consistent install.
    if os.path.isdir(llama_dir):
        for entry in os.listdir(llama_dir):
            entry_path = os.path.join(llama_dir, entry)
            if entry == "_download_temp":
                continue  # keep temp dir (will be recreated below)
            try:
                if os.path.isfile(entry_path):
                    os.remove(entry_path)
                elif os.path.isdir(entry_path):
                    shutil.rmtree(entry_path, ignore_errors=True)
            except OSError as e:
                print(f"[gguf-lm] WARNING: Failed to clean {entry}: {e}", flush=True)
        print(f"[gguf-lm] Cleaned llama directory for fresh install", flush=True)
    has_existing_server = False  # after cleanup, there is no existing binary to fall back to

    os.makedirs(llama_dir, exist_ok=True)
    temp_dir = os.path.join(llama_dir, "_download_temp")
    os.makedirs(temp_dir, exist_ok=True)

    try:
        # Cumulative offset tracks bytes from completed downloads so the external callback sees total progress across both archives
        cumulative_offset = [0]
        def _cumulative_cb(downloaded, total):
            if progress_callback:
                progress_callback(cumulative_offset[0] + downloaded, 0)

        # Download main binaries archive (llama-server.exe + ggml/llama DLLs) — mandatory
        main_zip_path = os.path.join(temp_dir, "llama-main.zip")
        try:
            _download_with_progress(urls["main"], main_zip_path, f"llama.cpp {LLAMA_BUILD_TAG} binaries", progress_callback=_cumulative_cb)
        except Exception as main_err:
            # Main binary is mandatory — fall back to existing binary if available, otherwise raise
            if has_existing_server:
                print(f"[gguf-lm] WARNING: Main binary download failed: {main_err} — using existing (possibly outdated) binary", flush=True)
                print(f"[STATUS] LM runtime update failed — using existing binary", flush=True)
                return server_exe
            raise RuntimeError(f"Failed to download llama.cpp main binaries: {main_err}") from main_err

        # After main download completes, advance cumulative offset by actual file size
        if os.path.isfile(main_zip_path):
            cumulative_offset[0] += os.path.getsize(main_zip_path)

        # Download CUDA runtime DLLs archive (cudart, cublas, etc.) — MANDATORY for GPU inference.
        # Without these DLLs, ggml-cuda.dll cannot load and the server silently falls back to CPU.
        cudart_zip_path = os.path.join(temp_dir, "llama-cudart.zip")
        cudart_ok = False
        try:
            _download_with_progress(urls["cudart"], cudart_zip_path, "CUDA runtime DLLs", progress_callback=_cumulative_cb)
            cudart_ok = True
        except Exception as cudart_err:
            # Retry once after 2 seconds — transient errors are common with GitHub CDN redirects
            print(f"[gguf-lm] CUDA runtime DLLs download failed (attempt 1): {cudart_err} — retrying in 2s...", flush=True)
            time.sleep(2)
            try:
                _download_with_progress(urls["cudart"], cudart_zip_path, "CUDA runtime DLLs (retry)", progress_callback=_cumulative_cb)
                cudart_ok = True
            except Exception as retry_err:
                print(f"[gguf-lm] CUDA runtime DLLs download failed (attempt 2): {retry_err}", flush=True)

        if not cudart_ok:
            # Without cudart DLLs, ggml-cuda.dll cannot load → server falls back to CPU. This is unacceptable.
            raise RuntimeError(f"CUDA runtime DLLs download failed for {cuda_family}. Without cublas/cudart DLLs, GPU inference is impossible. URL: {urls['cudart']}")

        print("[STATUS] Extracting LM runtime environment...", flush=True)

        # Extract main binaries archive (always — we successfully downloaded it)
        _extract_zip_flat(main_zip_path, llama_dir)

        # Extract CUDA runtime DLLs archive (only if download succeeded)
        if cudart_ok and os.path.isfile(cudart_zip_path):
            _extract_zip_flat(cudart_zip_path, llama_dir)

        # Rename llama-server.exe → demodokos_gguf.exe for unique process identification and orphan cleanup
        # On upgrade: old demodokos_gguf.exe exists alongside new llama-server.exe — replace old with new
        source_exe = os.path.join(llama_dir, "llama-server.exe")
        if os.path.isfile(source_exe):
            if os.path.isfile(server_exe):
                os.remove(server_exe)  # remove old version to make way for the updated binary
            os.rename(source_exe, server_exe)
            print(f"[gguf-lm] Renamed llama-server.exe → demodokos_gguf.exe", flush=True)

        # Verify the executable exists after extraction and rename
        if not os.path.isfile(server_exe):
            # Search subdirectories in case the archive had unexpected nesting
            for root, _dirs, files in os.walk(llama_dir):
                if "llama-server.exe" in files:
                    found_exe = os.path.join(root, "llama-server.exe")
                    os.rename(found_exe, server_exe)
                    print(f"[gguf-lm] Found and renamed nested llama-server.exe → demodokos_gguf.exe", flush=True)
                    break
                if "demodokos_gguf.exe" in files:
                    server_exe = os.path.join(root, "demodokos_gguf.exe")
                    break

        if not os.path.isfile(server_exe):
            # Extraction produced no exe — fall back to existing binary if there was one before we started
            if has_existing_server:
                print(f"[gguf-lm] WARNING: Extraction failed to produce demodokos_gguf.exe — using existing binary", flush=True)
                return os.path.join(llama_dir, "demodokos_gguf.exe")
            raise RuntimeError(f"demodokos_gguf.exe not found in {llama_dir} after extraction")

        # Write version marker AFTER successful rename — if anything above fails, version.txt stays absent
        # so the next startup re-triggers the download. Always includes CUDA family since cudart is mandatory.
        with open(version_file, "w") as f:
            f.write(expected_version)

        print(f"[gguf-lm] llama.cpp {LLAMA_BUILD_TAG} ({cuda_family}) installed to {llama_dir} (as demodokos_gguf.exe)", flush=True)
        print("[STATUS] LM runtime environment ready", flush=True)
        return server_exe

    except Exception as e:
        # If download/extraction fails but old server exists, fall back to it (never stall the app)
        if has_existing_server:
            print(f"[gguf-lm] WARNING: Download/install failed: {e} — falling back to existing binary", flush=True)
            print(f"[STATUS] LM runtime update failed — using existing binary", flush=True)
            return server_exe
        print(f"[gguf-lm] ERROR: Download/install failed: {e}", flush=True)
        print(f"[gguf-lm] Traceback:\n{traceback.format_exc()}", flush=True)
        raise RuntimeError(f"Failed to download/install demodokos_gguf: {e}") from e

    finally:
        # Clean up temp download archives
        if os.path.isdir(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)


class GGUFLLMHandler:
    """GGUF-based language model handler for ACE-Step v1.5.
    Drop-in replacement for acestep.llm_inference.LLMHandler with compatible
    generate_with_stop_condition() interface.

    Uses demodokos_gguf.exe (renamed llama-server.exe) as a subprocess with HTTP API for inference.
    The server binary is auto-downloaded from GitHub releases on first use and renamed for
    unique process identification and orphan cleanup.

    Lifecycle:
      handler = GGUFLLMHandler()
      handler.initialize(gguf_path, bin_dir, n_gpu_layers=-1, n_ctx=8192)
      result = handler.generate_with_stop_condition(caption, lyrics, ...)
      handler.unload()  # kills demodokos_gguf subprocess, frees VRAM
    """

    def __init__(self):
        self._server_process = None             # subprocess.Popen handle for demodokos_gguf.exe
        self._server_exe = ""                   # resolved path to demodokos_gguf.exe
        self._bin_dir = ""                      # project's bin/ directory (for re-init / reload)
        self.llm_initialized = False
        self.model_path = ""                    # path to the .gguf file currently loaded
        self.device = "cuda"                    # informational only — llama.cpp manages its own GPU
        self.n_gpu_layers = -1                  # -1 = offload all layers to GPU
        # Context window: must fit prompt + max output. Calculation (absolute max, 256-aligned):
        #   Prompt: system(~80) + caption(~200) + lyrics(≤3000 for CJK) + CoT(~400) = ~3680 tokens
        #   Output: max duration 600s × 5Hz = 3000 audio code tokens
        #   Total: ~6680 → round to 8192 (32 × 256) for headroom with extreme lyrics
        self.n_ctx = 8192
        self.llm_backend = "gguf"               # identifier for the backend type (used by debug capture)
        self._unload_after_generation = False   # prepared config: stop server after final generation to free VRAM
        self._n_parallel = 1                    # current --parallel slot count on the running demodokos_gguf instance
        self.save_vram_after_batch = False       # when True, restart with parallel=1 after batch to free KV cache VRAM; when False (default), keep parallel slots for faster subsequent batches
        self._base_url = f"http://{LLAMA_SERVER_HOST}:{LLAMA_SERVER_PORT}"

        # CFG Stage 2 rewrite LM state — dedicated demodokos_gguf on port 19851, hardcoded Qwen3-4B Q5K 4K ctx
        self._cfg_rewrite_process = None        # subprocess handle for dedicated CFG rewrite server (port 19851)
        self._cfg_rewrite_model_path = ""       # path to the hardcoded CFG rewrite GGUF file
        self._cfg_rewrite_initialized = False   # True when CFG dedicated server is running and healthy
        self._cfg_rewrite_enabled = True        # whether CFG rewrite is enabled at all (from C# config)

        # Creative AI state — user-selectable model on port 19850 for Music Writer
        self._creative_server_process = None    # subprocess handle for Creative AI server (port 19850)
        self._creative_model_path = ""          # path to the user-selected Creative AI GGUF file
        self._creative_initialized = False      # True when Creative AI server is running and healthy
        self._creative_on_demand = True         # when True, Creative AI loads on-demand (Music Writer open) and unloads for generation
        self._creative_ctx_size = CREATIVE_AI_DEFAULT_CTX  # context window for Creative AI (user-configurable)
        self._creative_base_url = f"http://{LLAMA_SERVER_HOST}:{CREATIVE_AI_PORT}"

        # Legacy compatibility aliases — still referenced by MusicWriter health check and server.py status
        self._cfg_server_process = None         # mirrors _creative_server_process for MusicWriter IsQwenServerHealthyAsync
        self._cfg_model_path = ""               # path to the instruct GGUF file (Creative AI model, used by MusicWriter)
        self._cfg_initialized = False           # mirrors _creative_initialized for MusicWriter health check
        self._cfg_ultra_vram = False             # legacy — no longer used (dedicated port eliminates ultra-VRAM for CFG rewrite)
        self._cfg_ctx_size = CFG_REWRITE_CTX    # legacy — only Creative AI has configurable ctx now
        self._cfg_base_url = f"http://{LLAMA_SERVER_HOST}:{CREATIVE_AI_PORT}"

        # Instruct model catalog — injected from DOWNLOAD_CATALOG via set_instruct_catalog(), replaces hardcoded CFG_INSTRUCT_MODELS
        self._instruct_catalog = {}  # dict of model_tag -> catalog entry (type=="creative_ai" entries from DOWNLOAD_CATALOG)

        # Constrained processor stub — the upstream inference.py checks llm_handler.constrained_processor
        self.constrained_processor = None
        self._gguf_log_handles = {}  # open file handles for GGUF server logs — closed on server stop
        self.debug_logging = False   # set by server.py from config; when False, GGUF subprocess output is discarded (no log files created)

    def _open_gguf_log(self, name: str):
        """Open (or recreate) a log file for a GGUF server instance. Returns a writable file handle for subprocess stdout/stderr. When debug_logging is disabled, returns subprocess.DEVNULL to suppress log file creation."""
        # Close any previously open handle for this name
        if name in self._gguf_log_handles:
            try: self._gguf_log_handles[name].close()
            except Exception: pass
        # Skip log file creation when debug logging is not enabled — discard subprocess output silently
        if not self.debug_logging:
            return subprocess.DEVNULL
        try:
            log_dir = os.path.join(os.path.dirname(self._bin_dir), "Logs") if self._bin_dir else os.path.join(os.path.dirname(os.path.abspath(__file__)), "Logs")
            os.makedirs(log_dir, exist_ok=True)
            log_path = os.path.join(log_dir, f"demodokos_gguf_{name}.log")
            # Rotate existing log to .last.log before truncating — preserves previous session for debugging
            if os.path.exists(log_path):
                last_path = log_path.replace(".log", ".last.log")
                try: os.replace(log_path, last_path)
                except Exception: pass  # rotation failed, continue with truncation
            fh = open(log_path, "wb", buffering=0)  # binary mode, unbuffered — subprocess writes raw bytes directly to file descriptor
            self._gguf_log_handles[name] = fh
            print(f"[gguf-lm] GGUF {name} server log: {log_path}", flush=True)
            return fh
        except Exception as e:
            print(f"[gguf-lm] WARNING: Failed to create GGUF log file for {name}: {e} — falling back to DEVNULL", flush=True)
            return subprocess.DEVNULL

    def _close_gguf_log(self, name: str):
        """Close the log file handle for a stopped GGUF server."""
        if name in self._gguf_log_handles:
            try: self._gguf_log_handles[name].close()
            except Exception: pass
            del self._gguf_log_handles[name]

    def set_instruct_catalog(self, catalog: dict):
        """Inject the instruct model catalog (creative_ai entries from DOWNLOAD_CATALOG). Called once after construction by acestep_server.py.
        Each key is a model_tag string, each value is a dict with at least: repo, filename, size_label, vram_estimate."""
        self._instruct_catalog = catalog

    def initialize(self, gguf_path: str, bin_dir: str, n_gpu_layers: int = -1, n_ctx: int = 8192, unload_after_generation: bool = False):
        """Start demodokos_gguf.exe with the given GGUF model loaded into VRAM.

        Args:
            gguf_path: Full path to the .gguf model file
            bin_dir: Path to the project's bin/ directory (demodokos_gguf stored in bin/llama/)
            n_gpu_layers: Number of layers to offload to GPU (-1 = all)
            n_ctx: Context window size in tokens
            unload_after_generation: If True, server is stopped after generation to free VRAM

        Returns:
            (status_message, success_bool) matching LLMHandler.initialize() contract
        """
        if not os.path.isfile(gguf_path):
            return f"GGUF model file not found: {gguf_path}", False

        self.model_path = gguf_path
        self._bin_dir = bin_dir
        self.n_gpu_layers = n_gpu_layers
        self.n_ctx = n_ctx
        self._unload_after_generation = unload_after_generation

        try:
            # Ensure llama-server binary is available (downloads ~200-500 MB on first use)
            self._server_exe = _ensure_llama_server(bin_dir)

            # Stop any previously running llama-server instance
            self._stop_server()

            # Start llama-server with the GGUF model
            load_start = time.time()
            self._start_server(gguf_path, n_gpu_layers, n_ctx)

            # Poll /health until model is loaded and ready (up to 120s for large models)
            if not self._wait_for_health(timeout=120):
                self._stop_server()
                return "demodokos_gguf failed to start or load model within 120s timeout", False

            # Verify CUDA GPU backend is active — catches silent CPU fallback early
            if not self._verify_gpu_backend("lm"):
                self._stop_server()
                return "demodokos_gguf started but CUDA GPU backend not detected — refusing to run on CPU", False

            load_time = time.time() - load_start
            self.llm_initialized = True

            model_name = os.path.basename(gguf_path)
            size_gb = os.path.getsize(gguf_path) / (1024 ** 3)
            status = f"GGUF LM loaded: {model_name} ({size_gb:.1f} GB, {load_time:.1f}s, gpu_layers={n_gpu_layers})"
            print(f"[gguf-lm] {status}", flush=True)
            return status, True

        except Exception as e:
            self._stop_server()
            self.llm_initialized = False
            error_msg = f"Failed to start demodokos_gguf for {gguf_path}: {e}"
            print(f"[gguf-lm] ERROR: {error_msg}", flush=True)
            traceback.print_exc()
            return error_msg, False

    # ─── Subprocess Management ────────────────────────────────────────────────

    @staticmethod
    def _kill_port_occupant(port: int):
        """Kill any process listening on the given TCP port. Prevents ghost server conflicts on startup.
        Uses 'netstat' to find the PID occupying the port, then 'taskkill /F' to terminate it."""
        if sys.platform != "win32":
            return
        try:
            result = subprocess.run(["netstat", "-ano", "-p", "TCP"], capture_output=True, text=True, timeout=5)
            for line in result.stdout.splitlines():
                # Match lines like "  TCP    127.0.0.1:19849    0.0.0.0:0    LISTENING    12345"
                if f":{port}" in line and "LISTENING" in line:
                    parts = line.split()
                    pid_str = parts[-1]
                    if pid_str.isdigit() and int(pid_str) != os.getpid():
                        pid = int(pid_str)
                        print(f"[gguf-lm] Port {port} occupied by PID {pid} — killing ghost process", flush=True)
                        subprocess.run(["taskkill", "/F", "/PID", str(pid)], capture_output=True, timeout=5)
                        time.sleep(1.0)  # allow OS to fully release the port — 0.5s was sometimes insufficient
                        return
        except Exception as e:
            print(f"[gguf-lm] Port occupant check failed (non-fatal): {e}", flush=True)

    def _start_server(self, model_path: str, n_gpu_layers: int, n_ctx: int, n_parallel: int = 1):
        """Launch demodokos_gguf.exe as a hidden subprocess with the given model and GPU config.
        n_parallel: number of concurrent completion slots — each slot gets its own KV cache of n_ctx tokens.
        Total KV context allocated = n_ctx * n_parallel. For batch generation, n_parallel matches batch_size.
        Kills any existing process occupying the target port before launching."""
        # Kill any process already occupying our port — prevents ghost server conflicts
        self._kill_port_occupant(LLAMA_SERVER_PORT)
        gpu_layers_str = str(n_gpu_layers) if n_gpu_layers >= 0 else "99"  # 99 = offload all layers
        # --special enables special token rendering in output text — REQUIRED for audio code tokens (<|audio_code_XXXX|>) to appear in the completion response
        # --batch-size 2048: prompt processing batch size (default 2048, ≥512 recommended for throughput). mmap is ON by default in llama.cpp (fast model reloads from disk cache).
        # --parallel N: allocate N independent KV cache slots for concurrent completions. --ctx-size is the TOTAL context across all slots (each slot gets ctx_total / N tokens).
        ctx_total = n_ctx * n_parallel  # scale total context so each slot gets the full n_ctx window
        # GPU offload via --n-gpu-layers 99. No --device flag: ggml-cuda.dll auto-selects the GPU. _verify_gpu_backend() validates CUDA after startup.
        cmd = [self._server_exe, "--model", model_path, "--n-gpu-layers", gpu_layers_str, "--ctx-size", str(ctx_total), "--parallel", str(n_parallel), "--batch-size", "2048", "--port", str(LLAMA_SERVER_PORT), "--host", LLAMA_SERVER_HOST, "--special"]
        self._n_parallel = n_parallel
        print(f"[gguf-lm] Starting demodokos_gguf: {os.path.basename(model_path)} (port {LLAMA_SERVER_PORT}, ngl={gpu_layers_str}, ctx={ctx_total}, parallel={n_parallel}, batch=2048)", flush=True)

        # Start without visible console window on Windows — redirect stdout+stderr to a log file for diagnostics (recreated each start)
        creation_flags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
        log_file = self._open_gguf_log("lm")
        self._server_process = subprocess.Popen(cmd, stdout=log_file, stderr=subprocess.STDOUT, creationflags=creation_flags)

    def _stop_server(self):
        """Terminate the llama-server subprocess if it is running."""
        if self._server_process is not None:
            try:
                self._server_process.terminate()
                self._server_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self._server_process.kill()
                try:
                    self._server_process.wait(timeout=3)
                except Exception:
                    pass
            except Exception:
                pass
            self._server_process = None
            self._close_gguf_log("lm")
            print("[gguf-lm] demodokos_gguf stopped", flush=True)

    def _wait_for_health(self, timeout: float = 120) -> bool:
        """Poll llama-server /health endpoint until the model is loaded and ready.
        Returns True if server reports 'ok' within timeout, False otherwise."""
        start = time.time()
        health_url = f"{self._base_url}/health"
        while time.time() - start < timeout:
            # Check if the process has crashed
            if self._server_process and self._server_process.poll() is not None:
                stderr_out = self._server_process.stderr.read().decode("utf-8", errors="replace") if self._server_process.stderr else ""
                print(f"[gguf-lm] demodokos_gguf process exited unexpectedly (code {self._server_process.returncode})", flush=True)
                if stderr_out:
                    print(f"[gguf-lm] stderr: {stderr_out[:500]}", flush=True)
                return False
            try:
                req = urllib.request.Request(health_url, method="GET")
                with urllib.request.urlopen(req, timeout=2) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    if data.get("status") == "ok":
                        return True
                    elif data.get("status") == "loading model":
                        elapsed = time.time() - start
                        if int(elapsed) % 5 == 0:  # log every ~5s during loading
                            print(f"[gguf-lm] Model loading... ({elapsed:.0f}s elapsed)", flush=True)
            except (urllib.error.URLError, ConnectionRefusedError, TimeoutError, OSError):
                pass  # server not ready yet — keep polling
            time.sleep(0.5)
        print(f"[gguf-lm] Health check timeout after {timeout}s", flush=True)
        return False

    def _is_server_alive(self) -> bool:
        """Quick check if llama-server is still running and responsive (for pre-generation validation)."""
        if self._server_process is None or self._server_process.poll() is not None:
            return False
        try:
            req = urllib.request.Request(f"{self._base_url}/health", method="GET")
            with urllib.request.urlopen(req, timeout=2) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data.get("status") == "ok"
        except Exception:
            return False

    # ─── Lifecycle ────────────────────────────────────────────────────────────

    def unload(self):
        """Stop the primary demodokos_gguf subprocess and free GPU resources. CFG rewrite and Creative AI servers are NOT stopped — use unload_cfg() separately."""
        self._stop_server()
        self.llm_initialized = False
        gc.collect()
        print("[gguf-lm] Model unloaded (demodokos_gguf stopped)", flush=True)

    def full_unload(self):
        """Stop primary LM, CFG rewrite, and Creative AI demodokos_gguf servers — used during full model teardown."""
        self._stop_cfg_rewrite_server()
        self._stop_creative_server()
        self.unload()

    def reload(self):
        """Restart llama-server with the previously loaded model (for re-loading after unload)."""
        if self.model_path and os.path.isfile(self.model_path) and self._bin_dir:
            return self.initialize(self.model_path, self._bin_dir, self.n_gpu_layers, self.n_ctx, self._unload_after_generation)
        return "No model path or bin_dir set for reload", False

    def _ensure_parallel(self, needed: int) -> bool:
        """Restart demodokos_gguf with more parallel slots if the current count is insufficient for the requested batch size.
        Returns True if server is ready with enough slots, False if restart failed.
        Uses mmap so model reload from OS page cache is fast (~1-2s)."""
        needed = min(needed, LLAMA_MAX_PARALLEL)
        if self._n_parallel >= needed:
            return True  # already have enough slots
        print(f"[gguf-lm] Scaling parallel slots {self._n_parallel} → {needed} for batch generation (server restart)...", flush=True)
        restart_start = time.time()
        self._stop_server()
        self._start_server(self.model_path, self.n_gpu_layers, self.n_ctx, n_parallel=needed)
        if not self._wait_for_health(timeout=60):
            print(f"[gguf-lm] Failed to restart server with parallel={needed}", flush=True)
            self._stop_server()
            return False
        restart_time = time.time() - restart_start
        print(f"[gguf-lm] Server restarted with parallel={needed} in {restart_time:.1f}s", flush=True)
        return True

    def _scale_down_parallel(self):
        """After batch generation completes, restart with parallel=1 to free KV cache VRAM.
        Only restarts if currently running with multiple slots."""
        if self._n_parallel <= 1:
            return
        print(f"[gguf-lm] Scaling parallel slots {self._n_parallel} → 1 to free KV cache VRAM...", flush=True)
        self._stop_server()
        self._start_server(self.model_path, self.n_gpu_layers, self.n_ctx, n_parallel=1)
        if not self._wait_for_health(timeout=60):
            print("[gguf-lm] Warning: server restart to parallel=1 failed, reinitializing...", flush=True)
            self._stop_server()
            self._start_server(self.model_path, self.n_gpu_layers, self.n_ctx, n_parallel=1)
            self._wait_for_health(timeout=60)

    # ─── CFG Stage 2: Caption Rewrite LM ─────────────────────────────────────
    # Second llama-server instance running Qwen3 Instruct for post-Phase-1 caption cleanup and Music Writer AI.
    # Downloads the GGUF model on first use from HuggingFace, then starts a server:
    #   Non-ultra-VRAM: port 19850, kept loaded alongside primary LM for instant rewrite.
    #   Ultra-VRAM: primary LM temporarily stopped, CFG loaded on port 19849, rewrite runs, then primary restored.
    # NOTE: Available instruct model definitions are now sourced from DOWNLOAD_CATALOG in acestep_server.py
    # (injected via set_instruct_catalog). No duplicate model list here — single source of truth.

    def initialize_cfg_rewrite(self, checkpoint_dir: str, bin_dir: str, cfg_rewrite_enabled: bool = True):
        """Download the hardcoded CFG rewrite model (Qwen3-4B Q5K, 4K ctx). Download only — server starts on-demand during rewrite_caption() on port 19851.
        Returns (status_msg, success) tuple."""
        self._cfg_rewrite_enabled = cfg_rewrite_enabled
        if not cfg_rewrite_enabled:
            print("[gguf-lm] CFG rewrite disabled via config", flush=True)
            return "CFG rewrite disabled", True

        info = CFG_REWRITE_MODEL_INFO  # hardcoded — always Qwen3-4B Q5K
        model_tag_resolved = info["model_tag"]
        model_dir = os.path.join(checkpoint_dir, model_tag_resolved)
        target_path = os.path.join(model_dir, info["filename"])

        # Download model if not already present
        if not os.path.isfile(target_path) or os.path.getsize(target_path) < 1000:
            os.makedirs(model_dir, exist_ok=True)
            try:
                from huggingface_hub import hf_hub_download
                print(f"[gguf-lm] CFG rewrite: Downloading {info['filename']} from {info['repo']}...", flush=True)
                print(f"[STATUS] Downloading CFG rewrite model ({info['size_label']})...", flush=True)
                # Heartbeat thread — emit periodic download progress since hf_hub_download uses tqdm internally (not captured by C#)
                _cfg_dl_active = [True]
                _cfg_dl_elapsed = [0]
                def _cfg_dl_heartbeat():
                    while _cfg_dl_active[0]:
                        time.sleep(5)
                        _cfg_dl_elapsed[0] += 5
                        if _cfg_dl_active[0]:
                            mins, secs = divmod(_cfg_dl_elapsed[0], 60)
                            elapsed_str = f"{mins}m{secs:02d}s" if mins > 0 else f"{secs}s"
                            print(f"[STATUS] Downloading CFG rewrite model ({elapsed_str} elapsed)...", flush=True)
                import threading as _threading
                _hb = _threading.Thread(target=_cfg_dl_heartbeat, daemon=True, name="cfg-dl-heartbeat")
                _hb.start()
                try:
                    downloaded = hf_hub_download(repo_id=info["repo"], filename=info["filename"], local_dir=model_dir, local_dir_use_symlinks=False)
                finally:
                    _cfg_dl_active[0] = False
                if downloaded != target_path and os.path.isfile(downloaded):
                    shutil.move(downloaded, target_path)
                if not os.path.isfile(target_path):
                    return f"CFG rewrite model download completed but file not found at {target_path}", False
                size_mb = os.path.getsize(target_path) / (1024 ** 2)
                print(f"[gguf-lm] CFG rewrite model downloaded: {info['filename']} ({size_mb:.0f} MB)", flush=True)
            except Exception as e:
                print(f"[gguf-lm] CFG rewrite model download failed: {e}", flush=True)
                traceback.print_exc()
                return f"CFG rewrite model download failed: {e}", False

        self._cfg_rewrite_model_path = target_path
        self._server_exe = _ensure_llama_server(bin_dir)
        size_mb = os.path.getsize(target_path) / (1024 ** 2)
        # Server starts on-demand — no VRAM used until generation with LM CFG = Inference
        print(f"[gguf-lm] CFG rewrite model ready for on-demand loading: {info['filename']} ({size_mb:.0f} MB, ~{info['vram_estimate']} VRAM on port {CFG_REWRITE_DEDICATED_PORT})", flush=True)
        return f"CFG rewrite model prepared: {info['filename']} ({size_mb:.0f} MB)", True

    def initialize_creative_ai(self, checkpoint_dir: str, bin_dir: str, model_tag: str = "", ctx_size: int = 0, on_demand: bool = True):
        """Download the Creative AI model (user-selectable) and optionally start its server on port 19850.
        on_demand=True: download only, server managed by load_creative_ai()/unload_creative_ai().
        on_demand=False: start server immediately so it's always available.
        Returns (status_msg, success) tuple."""
        self._creative_on_demand = on_demand

        # Resolve model info from centralized catalog (injected from DOWNLOAD_CATALOG via set_instruct_catalog)
        if model_tag and model_tag in self._instruct_catalog:
            info = self._instruct_catalog[model_tag]
            model_tag_resolved = model_tag  # catalog dict key IS the model tag
        else:
            info = CFG_REWRITE_MODEL_INFO  # fallback to hardcoded CFG rewrite default
            model_tag_resolved = info["model_tag"]

        # Resolve context size — override or default
        effective_ctx = ctx_size if ctx_size >= 2048 else CREATIVE_AI_DEFAULT_CTX
        self._creative_ctx_size = effective_ctx

        model_dir = os.path.join(checkpoint_dir, model_tag_resolved)
        target_path = os.path.join(model_dir, info["filename"])

        # Download model if not already present
        if not os.path.isfile(target_path) or os.path.getsize(target_path) < 1000:
            os.makedirs(model_dir, exist_ok=True)
            try:
                from huggingface_hub import hf_hub_download
                print(f"[gguf-lm] Creative AI: Downloading {info['filename']} from {info['repo']}...", flush=True)
                print(f"[STATUS] Downloading Creative AI model ({info['size_label']})...", flush=True)
                _dl_active = [True]
                _dl_elapsed = [0]
                def _dl_heartbeat():
                    while _dl_active[0]:
                        time.sleep(5)
                        _dl_elapsed[0] += 5
                        if _dl_active[0]:
                            mins, secs = divmod(_dl_elapsed[0], 60)
                            elapsed_str = f"{mins}m{secs:02d}s" if mins > 0 else f"{secs}s"
                            print(f"[STATUS] Downloading Creative AI model ({elapsed_str} elapsed)...", flush=True)
                import threading as _threading
                _hb = _threading.Thread(target=_dl_heartbeat, daemon=True, name="creative-dl-heartbeat")
                _hb.start()
                try:
                    downloaded = hf_hub_download(repo_id=info["repo"], filename=info["filename"], local_dir=model_dir, local_dir_use_symlinks=False)
                finally:
                    _dl_active[0] = False
                if downloaded != target_path and os.path.isfile(downloaded):
                    shutil.move(downloaded, target_path)
                if not os.path.isfile(target_path):
                    return f"Creative AI model download completed but file not found at {target_path}", False
                size_mb = os.path.getsize(target_path) / (1024 ** 2)
                print(f"[gguf-lm] Creative AI model downloaded: {info['filename']} ({size_mb:.0f} MB)", flush=True)
            except Exception as e:
                print(f"[gguf-lm] Creative AI model download failed: {e}", flush=True)
                traceback.print_exc()
                return f"Creative AI model download failed: {e}", False

        self._creative_model_path = target_path
        # Legacy alias — MusicWriter health check reads _cfg_model_path
        self._cfg_model_path = target_path
        self._server_exe = _ensure_llama_server(bin_dir)
        size_mb = os.path.getsize(target_path) / (1024 ** 2)

        # If always-loaded mode: start Creative AI server immediately on port 19850
        if not on_demand:
            try:
                self._start_creative_server()
                if not self._wait_for_server_health(self._creative_server_process, CREATIVE_AI_PORT, timeout=120):
                    self._stop_creative_server()
                    return "Creative AI server failed to start within timeout", False
                # Verify CUDA GPU backend is active for Creative AI
                if not self._verify_gpu_backend("creative"):
                    self._stop_creative_server()
                    return "Creative AI server started but CUDA GPU backend not detected — refusing to run on CPU", False
                self._creative_initialized = True
                self._cfg_initialized = True  # legacy alias for MusicWriter health check
                print(f"[gguf-lm] Creative AI ready on port {CREATIVE_AI_PORT} ({size_mb:.0f} MB, ~{info['vram_estimate']} VRAM)", flush=True)
                return f"Creative AI loaded: {info['filename']} ({size_mb:.0f} MB)", True
            except Exception as e:
                self._stop_creative_server()
                return f"Creative AI server failed to start: {e}", False
        else:
            print(f"[gguf-lm] Creative AI model ready for on-demand loading: {info['filename']} ({size_mb:.0f} MB, port {CREATIVE_AI_PORT})", flush=True)
            return f"Creative AI model prepared (on-demand): {info['filename']} ({size_mb:.0f} MB)", True

    # ─── CFG Rewrite Server Management (port 19851) ──────────────────────────

    def _start_cfg_rewrite_server(self):
        """Launch a demodokos_gguf instance for CFG caption rewrite on port 19851. Hardcoded 4K ctx, single slot."""
        self._kill_port_occupant(CFG_REWRITE_DEDICATED_PORT)
        # GPU offload via ngl=99. _verify_gpu_backend() validates CUDA after startup.
        cmd = [self._server_exe, "--model", self._cfg_rewrite_model_path, "--n-gpu-layers", "99", "--ctx-size", str(CFG_REWRITE_CTX), "--parallel", "1", "--batch-size", "512", "--port", str(CFG_REWRITE_DEDICATED_PORT), "--host", LLAMA_SERVER_HOST]
        print(f"[gguf-lm] Starting CFG rewrite demodokos_gguf: {os.path.basename(self._cfg_rewrite_model_path)} (port {CFG_REWRITE_DEDICATED_PORT}, ctx={CFG_REWRITE_CTX})", flush=True)
        creation_flags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
        log_file = self._open_gguf_log("cfg_rewrite")
        self._cfg_rewrite_process = subprocess.Popen(cmd, stdout=log_file, stderr=subprocess.STDOUT, creationflags=creation_flags)

    def _stop_cfg_rewrite_server(self):
        """Terminate the dedicated CFG rewrite server on port 19851."""
        if self._cfg_rewrite_process is not None:
            try:
                self._cfg_rewrite_process.terminate()
                self._cfg_rewrite_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self._cfg_rewrite_process.kill()
                try:
                    self._cfg_rewrite_process.wait(timeout=3)
                except Exception:
                    pass
            except Exception:
                pass
            self._cfg_rewrite_process = None
            self._cfg_rewrite_initialized = False
            self._close_gguf_log("cfg_rewrite")
            print("[gguf-lm] CFG rewrite demodokos_gguf stopped (port 19851)", flush=True)

    # ─── Creative AI Server Management (port 19850) ──────────────────────────

    def _start_creative_server(self):
        """Launch a demodokos_gguf instance for Creative AI on port 19850. Uses user-configured context size."""
        self._kill_port_occupant(CREATIVE_AI_PORT)
        # GPU offload via ngl=99. _verify_gpu_backend() validates CUDA after startup.
        # --cache-ram 0: disable RAM prompt cache to avoid llama.cpp crash in ubatch_reserve() for M-RoPE models (Qwen3.5). See repro_prompt_cache_crash.ps1.
        cmd = [self._server_exe, "--model", self._creative_model_path, "--n-gpu-layers", "99", "--ctx-size", str(self._creative_ctx_size), "--parallel", "1", "--batch-size", "512", "--port", str(CREATIVE_AI_PORT), "--host", LLAMA_SERVER_HOST, "--cache-ram", "0"]
        print(f"[gguf-lm] Starting Creative AI demodokos_gguf: {os.path.basename(self._creative_model_path)} (port {CREATIVE_AI_PORT}, ctx={self._creative_ctx_size})", flush=True)
        creation_flags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
        log_file = self._open_gguf_log("creative")
        self._creative_server_process = subprocess.Popen(cmd, stdout=log_file, stderr=subprocess.STDOUT, creationflags=creation_flags)
        self._cfg_server_process = self._creative_server_process  # legacy alias for MusicWriter health check

    def _stop_creative_server(self):
        """Terminate the Creative AI server on port 19850."""
        if self._creative_server_process is not None:
            try:
                self._creative_server_process.terminate()
                self._creative_server_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self._creative_server_process.kill()
                try:
                    self._creative_server_process.wait(timeout=3)
                except Exception:
                    pass
            except Exception:
                pass
            self._creative_server_process = None
            self._cfg_server_process = None  # legacy alias
            self._creative_initialized = False
            self._cfg_initialized = False  # legacy alias
            self._close_gguf_log("creative")
            print("[gguf-lm] Creative AI demodokos_gguf stopped (port 19850)", flush=True)
            time.sleep(1.0)  # allow OS to fully release port before next server start — prevents ghost process conflicts

    def load_creative_ai(self):
        """Start the Creative AI server on port 19850 (on-demand mode). Called by C# when Creative Agent opens.
        Returns (status_msg, success) tuple."""
        if self._creative_initialized:
            # Verify process is actually alive — silently crashed servers leave _creative_initialized=True but no running process
            if self.is_creative_alive():
                return "Creative AI already loaded", True
            print("[gguf-lm] Creative AI was marked initialized but process is dead — restarting...", flush=True)
            self._creative_initialized = False
            self._cfg_initialized = False
        if not self._creative_model_path:
            return "Creative AI model not downloaded — run initialize_creative_ai() first", False
        try:
            self._start_creative_server()
            if not self._wait_for_server_health(self._creative_server_process, CREATIVE_AI_PORT, timeout=120):
                self._stop_creative_server()
                return "Creative AI server failed to start within timeout", False
            # Verify CUDA GPU backend for on-demand Creative AI
            if not self._verify_gpu_backend("creative"):
                self._stop_creative_server()
                return "Creative AI server started but CUDA GPU backend not detected — refusing to run on CPU", False
            self._creative_initialized = True
            self._cfg_initialized = True  # legacy alias for MusicWriter health check
            size_mb = os.path.getsize(self._creative_model_path) / (1024 ** 2)
            print(f"[gguf-lm] Creative AI loaded on port {CREATIVE_AI_PORT} ({size_mb:.0f} MB)", flush=True)
            return f"Creative AI loaded ({size_mb:.0f} MB)", True
        except Exception as e:
            self._stop_creative_server()
            return f"Creative AI server failed to start: {e}", False

    def unload_creative_ai(self):
        """Stop the Creative AI server on port 19850 (on-demand mode). Called by C# before generation starts."""
        self._stop_creative_server()
        self._creative_model_path_saved = getattr(self, '_creative_model_path', "")  # remember for reload
        print("[gguf-lm] Creative AI unloaded (port 19850 freed)", flush=True)

    def is_creative_alive(self) -> bool:
        """Check if the Creative AI subprocess on port 19850 is still running (process-level check, not HTTP health)."""
        if self._creative_server_process is None:
            return False
        exit_code = self._creative_server_process.poll()
        if exit_code is not None:
            # Write crash notice into the GGUF creative log before clearing references — provides persistent disk evidence
            crash_ts = time.strftime("%Y-%m-%d %H:%M:%S")
            if "creative" in self._gguf_log_handles:
                try:
                    self._gguf_log_handles["creative"].write(f"\n--- CRASH DETECTED at {crash_ts} (exit code {exit_code}) ---\n".encode("utf-8"))
                except Exception:
                    pass
            print(f"[gguf-lm] Creative AI process died (exit code {exit_code})", flush=True)
            self._creative_server_process = None
            self._cfg_server_process = None
            self._creative_initialized = False
            self._cfg_initialized = False
            return False
        return True

    def restart_creative_ai(self) -> bool:
        """Restart the Creative AI server after an unexpected crash. Reuses the previously configured model path and context size. Returns True on success."""
        if not self._creative_model_path or not os.path.isfile(self._creative_model_path):
            print("[gguf-lm] Cannot restart Creative AI — no model path configured", flush=True)
            return False
        # Clean up any dead process references
        self._stop_creative_server()
        print(f"[gguf-lm] Restarting Creative AI: {os.path.basename(self._creative_model_path)} (port {CREATIVE_AI_PORT}, ctx={self._creative_ctx_size})", flush=True)
        self._start_creative_server()
        if not self._wait_for_server_health(self._creative_server_process, CREATIVE_AI_PORT, timeout=120):
            print("[gguf-lm] Creative AI restart failed — server did not become healthy", flush=True)
            self._stop_creative_server()
            return False
        # Verify CUDA GPU backend for restarted Creative AI
        if not self._verify_gpu_backend("creative"):
            print("[gguf-lm] Creative AI restart failed — CUDA GPU backend not detected", flush=True)
            self._stop_creative_server()
            return False
        self._creative_initialized = True
        self._cfg_initialized = True
        print(f"[gguf-lm] Creative AI restarted successfully on port {CREATIVE_AI_PORT}", flush=True)
        return True

    def reset_creative_cache(self) -> bool:
        # DISABLED — the n_predict=1 + cache_prompt=false trick did NOT free VRAM (KV cache stays allocated at full context size per slot).
        # The first real request already uses cache_prompt=false which achieves the same prefix replacement.
        # The correct way to truly reset a slot's context is POST /slots/<slot_id>/clear (llama-server /slots endpoint), but this requires context recreation afterwards.
        # Kept as a no-op so existing call sites and the /reset_creative_cache HTTP endpoint don't need removal.
        return True

    # ─── Generic Server Health Check ─────────────────────────────────────────

    def _wait_for_server_health(self, process, port: int, timeout: float = 60) -> bool:
        """Poll a demodokos_gguf server's /health endpoint until ready. Returns True on success."""
        start = time.time()
        health_url = f"http://{LLAMA_SERVER_HOST}:{port}/health"
        while time.time() - start < timeout:
            if process and process.poll() is not None:
                print(f"[gguf-lm] Server on port {port} exited unexpectedly (code {process.returncode})", flush=True)
                return False
            try:
                req = urllib.request.Request(health_url, method="GET")
                with urllib.request.urlopen(req, timeout=2) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    if data.get("status") == "ok":
                        return True
            except (urllib.error.URLError, ConnectionRefusedError, TimeoutError, OSError):
                pass
            time.sleep(0.5)
        print(f"[gguf-lm] Server health check timeout on port {port} after {timeout}s", flush=True)
        return False

    def _verify_gpu_backend(self, log_name: str) -> bool:
        """Read the GGUF server log file and verify the CUDA GPU backend was loaded for model inference.
        Returns True if CUDA device was used, False if only CPU or if log is unavailable.
        Call this after _wait_for_server_health() passes to catch silent CPU fallback."""
        try:
            log_dir = os.path.join(os.path.dirname(self._bin_dir), "Logs") if self._bin_dir else os.path.join(os.path.dirname(os.path.abspath(__file__)), "Logs")
            log_path = os.path.join(log_dir, f"demodokos_gguf_{log_name}.log")
            if not os.path.isfile(log_path):
                print(f"[gguf-lm] WARNING: Cannot verify GPU backend — log file not found: {log_path}", flush=True)
                return True  # assume OK if no log (debug_logging may be off)
            with open(log_path, "rb") as f:
                raw = f.read(16384)  # read first 16 KB — CUDA init lines appear early in the log
            log_text = raw.decode("utf-8", errors="replace")
            has_cuda_init = "ggml_cuda_init:" in log_text
            has_cuda_device = "using device CUDA" in log_text
            if has_cuda_init and has_cuda_device:
                print(f"[gguf-lm] GPU backend verified: CUDA device active for {log_name} server", flush=True)
                return True
            elif has_cuda_init:
                # CUDA driver found but model might not have loaded onto GPU
                print(f"[gguf-lm] WARNING: CUDA init found but model may not be on GPU for {log_name} server", flush=True)
                return True  # CUDA is available, device assignment happens later
            else:
                print(f"[gguf-lm] ERROR: No CUDA backend detected for {log_name} server — running on CPU only!", flush=True)
                return False
        except Exception as e:
            print(f"[gguf-lm] WARNING: GPU backend verification failed for {log_name}: {e}", flush=True)
            return True  # don't block on verification errors

    def rewrite_caption(self, caption: str, negative_keywords: str, temperature: float = 0.3, seed: int = -1) -> str:
        """Use CFG rewrite LM (Qwen3-4B-Instruct) to clean caption of unwanted concepts.
        Always on-demand: starts dedicated server on port 19851, rewrites, then stops server.
        Sends the Phase 1 caption + negative keywords to the rewrite model with grammar enforcement.
        Performs a sanity check: output length must be within ±30% of input length.
        Returns the cleaned caption, or the original caption if rewrite fails or sanity check fails.
        Stores the rewrite prompt in self._cfg_rewrite_prompt for debug capture.
        seed: RNG seed for deterministic output — same seed + same caption → same rewrite."""
        if not caption or not negative_keywords:
            return caption
        if not self._cfg_rewrite_enabled or not self._cfg_rewrite_model_path:
            return caption
        original_caption = caption.strip()

        # Build ChatML prompt for Qwen3-4B-Instruct — arm_a_policy_hint user template from adherence test v4
        user_content = f"CAPTION_ORIGINAL: {original_caption}\n\nUNWANTED_CONCEPTS: {negative_keywords}\nTask: remove forbidden concepts with nearest-safe substitutions; avoid deleting overall musical intent; avoid adding unrelated content."
        prompt = f"<|im_start|>system\n{CFG_REWRITE_SYSTEM_PROMPT}<|im_end|>\n<|im_start|>user\n{user_content}<|im_end|>\n<|im_start|>assistant\n"
        # Store for debug capture — the debug window shows this prompt in the CFG Stage 2 section
        self._cfg_rewrite_prompt = prompt

        rewrite_start = time.time()
        cfg_port = CFG_REWRITE_DEDICATED_PORT  # always port 19851

        try:
            # On-demand: start dedicated CFG rewrite server on port 19851 (small model, fast load)
            print("[gguf-lm] CFG Stage 2: Starting dedicated CFG rewrite server on port 19851...", flush=True)
            self._start_cfg_rewrite_server()
            if not self._wait_for_server_health(self._cfg_rewrite_process, cfg_port, timeout=60):
                print("[gguf-lm] CFG Stage 2: CFG rewrite server failed to start — skipping rewrite", flush=True)
                return original_caption  # finally block will handle cleanup
            # Verify CUDA GPU backend for CFG rewrite — CPU fallback would be unacceptably slow
            if not self._verify_gpu_backend("cfg_rewrite"):
                print("[gguf-lm] CFG Stage 2: CUDA GPU backend not detected — skipping rewrite to avoid CPU overhead", flush=True)
                return original_caption

            # Send caption rewrite request to CFG server
            base_url = f"http://{LLAMA_SERVER_HOST}:{cfg_port}"
            request_data = {"prompt": prompt, "n_predict": 512, "temperature": temperature, "top_k": 40, "top_p": 0.9, "repeat_penalty": 1.0, "stop": ["<|im_end|>", "<|endoftext|>", "\n"], "stream": False, "cache_prompt": True, "grammar": CFG_REWRITE_GRAMMAR, "seed": seed}
            payload = json.dumps(request_data).encode("utf-8")
            req = urllib.request.Request(f"{base_url}/completion", data=payload, headers={"Content-Type": "application/json"}, method="POST")

            with urllib.request.urlopen(req, timeout=20) as resp:
                result = json.loads(resp.read().decode("utf-8"))
            raw_output = result.get("content", "").strip()

            # Extract caption from grammar-enforced output (always starts with "CAPTION_NEW: ")
            new_caption = raw_output[len("CAPTION_NEW: "):].strip() if raw_output.startswith("CAPTION_NEW: ") else raw_output.strip()

            # Sanity check: output length must be within ±30% of input length
            orig_len = len(original_caption)
            new_len = len(new_caption)
            rewrite_time = time.time() - rewrite_start
            if not new_caption:
                print(f"[gguf-lm] CFG Stage 2 WARNING: Empty rewrite output — using original caption ({rewrite_time:.1f}s)", flush=True)
                return original_caption
            # Sanity: >30% reduction in length → rewrite is too aggressive, use original
            if orig_len > 0 and new_len < 0.7 * orig_len:
                print(f"[gguf-lm] CFG Stage 2 WARNING: Rewrite removed >30% of caption — length {new_len} vs original {orig_len} ({rewrite_time:.1f}s)", flush=True)
                print(f"[gguf-lm]   Original ({orig_len}): \"{original_caption}\"", flush=True)
                print(f"[gguf-lm]   Rewrite  ({new_len}): \"{new_caption}\"", flush=True)
                return original_caption
            # Sanity: >768 total characters → rewrite is bloated, use original (raised from 512 — teaching-example prompt produces ~5-10% longer outputs with descriptive substitutions)
            if new_len > 768:
                print(f"[gguf-lm] CFG Stage 2 WARNING: Rewrite exceeds 768 characters ({new_len} chars) — using original caption ({rewrite_time:.1f}s)", flush=True)
                print(f"[gguf-lm]   Original ({orig_len}): \"{original_caption}\"", flush=True)
                print(f"[gguf-lm]   Rewrite  ({new_len}): \"{new_caption}\"", flush=True)
                return original_caption
            # Sanity: <5 words → rewrite is degenerate, use original
            word_count = len(new_caption.split())
            if word_count < 5:
                print(f"[gguf-lm] CFG Stage 2 WARNING: Rewrite has only {word_count} words (<5) — using original caption ({rewrite_time:.1f}s)", flush=True)
                print(f"[gguf-lm]   Original: \"{original_caption}\"", flush=True)
                print(f"[gguf-lm]   Rewrite:  \"{new_caption}\"", flush=True)
                return original_caption
            # Sanity: >30% increase → rewrite might be adding hallucinated content, use original
            if orig_len > 0 and new_len > 1.3 * orig_len:
                print(f"[gguf-lm] CFG Stage 2 WARNING: Rewrite increased caption by >30% — length {new_len} vs original {orig_len} ({rewrite_time:.1f}s)", flush=True)
                print(f"[gguf-lm]   Original ({orig_len}): \"{original_caption}\"", flush=True)
                print(f"[gguf-lm]   Rewrite  ({new_len}): \"{new_caption}\"", flush=True)
                return original_caption

            if new_caption != original_caption:
                print(f"[gguf-lm] CFG Stage 2: Caption rewritten in {rewrite_time:.1f}s", flush=True)
                print(f"[gguf-lm]   Original: \"{original_caption}\"", flush=True)
                print(f"[gguf-lm]   Rewrite:  \"{new_caption}\"", flush=True)
            else:
                print(f"[gguf-lm] CFG Stage 2: Caption unchanged (no restricted concepts found) in {rewrite_time:.1f}s", flush=True)
            return new_caption

        except Exception as e:
            rewrite_time = time.time() - rewrite_start
            print(f"[gguf-lm] CFG Stage 2 ERROR: Caption rewrite failed ({rewrite_time:.1f}s): {e}", flush=True)
            traceback.print_exc()
            return original_caption
        finally:
            # Always stop the dedicated CFG rewrite server after use (frees ~3.5 GB VRAM)
            self._stop_cfg_rewrite_server()

    def unload_cfg(self):
        """Stop both the CFG rewrite server (port 19851) and Creative AI server (port 19850), freeing all instruct model GPU resources."""
        self._stop_cfg_rewrite_server()
        self._stop_creative_server()
        self._cfg_rewrite_model_path = ""
        print("[gguf-lm] CFG rewrite + Creative AI servers unloaded", flush=True)

    # ─── Prompt Construction ──────────────────────────────────────────────────
    # Matches the chat template format used by the upstream Qwen3-based 5Hz LM:
    #   <|im_start|>system\n# Instruction\n{instruction}\n\n<|im_end|>\n
    #   <|im_start|>user\n{content}<|im_end|>\n
    #   <|im_start|>assistant\n{content}<|im_end|>\n

    def _build_chat_prompt(self, system_content: str, user_content: str, assistant_prefix: str = "") -> str:
        """Build a Qwen/ChatML-style prompt string for llama.cpp completion.
        The model uses <|im_start|> / <|im_end|> chat markers (ChatML template)."""
        prompt = f"<|im_start|>system\n{system_content}<|im_end|>\n<|im_start|>user\n{user_content}<|im_end|>\n<|im_start|>assistant\n"
        if assistant_prefix:
            prompt += assistant_prefix
        return prompt

    # ─── Negative Prompt Helpers ─────────────────────────────────────────────
    # GGUF cfg_scale is repurposed as a discrete mode selector (0-2):
    #   0 = Off (no negative effect, negative prompt UI grayed out)
    #   1 = Steering (inject 'restrict: "negatives"' in <think> section only, restrict key removed before DiT)
    #   2 = Inference (NO steering in Phase 1 — only Qwen3 rewrite in Stage 2 cleans restricted concepts from caption)

    @staticmethod
    def _sanitize_negative(text: str) -> str:
        """Sanitize negative prompt text for injection: replace newlines with semicolons, strip carriage returns."""
        return text.replace("\r", "").replace("\n", "; ").strip()

    @staticmethod
    def _cleanup_negative_artifacts(metadata: Dict[str, Any], negative_text: str, cfg_mode: int) -> bool:
        """Remove the manually injected negative prompt artifacts from LM output metadata.
        The 'restrict' YAML key injected into the think section may appear as a parsed metadata key.
        Also cleans any leaked injection text from the caption field.
        Returns True if any cleanup was performed.
        """
        import re
        cleaned = False
        # Remove 'restrict' YAML key artifact from think section injection
        if "restrict" in metadata:
            del metadata["restrict"]
            cleaned = True
        # Legacy: also remove AVOID key if somehow still present
        if "AVOID" in metadata:
            del metadata["AVOID"]
            cleaned = True
        # Caption cleanup: strip any leaked injection text from the generated caption
        if "caption" in metadata and negative_text:
            orig = metadata["caption"]
            cap = orig
            cap = re.sub(r'(?i)\s*restrict:\s*"[^"]*"\s*', ' ', cap)
            cap = re.sub(r'(?i)\s*Absolutely AVOID these:\s*"[^"]*"\s*', ' ', cap)
            cap = re.sub(r'(?i)\s*AVOID:\s*"[^"]*"\s*', ' ', cap)
            cap = re.sub(r'\s{2,}', ' ', cap).strip()
            if cap != orig:
                metadata["caption"] = cap
                print(f"[gguf-lm] Cleaned injected negative line from caption", flush=True)
                cleaned = True
        return cleaned

    def build_formatted_prompt(self, caption: str, lyrics: str, generation_phase: str = "cot", negative_prompt: str = "", cfg_mode: int = 0) -> str:
        """Build the formatted prompt for LM generation — matches LLMHandler.build_formatted_prompt().
        cfg_mode controls negative prompt behavior: 0=off, 1=steering (restrict in think), 2=inference (Qwen3 rewrite only)."""
        system_content = f"# Instruction\n{DEFAULT_LM_INSTRUCTION}\n\n"
        user_content = f"# Caption\n{caption}\n\n# Lyric\n{lyrics}\n"
        assistant_prefix = ""

        # Mode 1 (steering) injects 'restrict' keyword in think section; mode 2 (inference) skips Phase 1 steering
        if negative_prompt and cfg_mode == 1:
            assistant_prefix = f"<think>\nrestrict: \"{negative_prompt}\"\nbpm:"

        return self._build_chat_prompt(system_content, user_content, assistant_prefix=assistant_prefix)

    def build_formatted_prompt_with_cot(self, caption: str, lyrics: str, cot_text: str, negative_prompt: str = "", cfg_mode: int = 0) -> str:
        """Build prompt for codes phase with pre-generated CoT — matches LLMHandler.build_formatted_prompt_with_cot().
        The Qwen3 chat template reformats <think> content and adds \\n\\n after </think> (double newline).
        Matching this is CRITICAL: the model was trained with audio codes at position '</think>\\n\\n', not '</think>\\n'.
        cfg_mode controls negative prompt behavior: 0=off, 1=steering (restrict in think), 2=inference (Qwen3 rewrite only)."""
        system_content = f"# Instruction\n{DEFAULT_LM_INSTRUCTION}\n\n"
        user_content = f"# Caption\n{caption}\n\n# Lyric\n{lyrics}\n"

        # Mode 1 (steering) injects 'restrict' keyword in think section; mode 2 (inference) skips Phase 1 steering
        if negative_prompt and cfg_mode == 1:
            if cot_text.startswith("<think>\n"):
                cot_text = f"<think>\nrestrict: \"{negative_prompt}\"\n" + cot_text[len("<think>\n"):]
            elif cot_text.startswith("<think>"):
                cot_text = f"<think>\nrestrict: \"{negative_prompt}\"\n" + cot_text[len("<think>"):]

        # Double newline after CoT matches the Qwen3 chat template output: '<think>\n{yaml}\n</think>\n\n'
        # The model learned to generate audio codes exactly at this position during training
        return self._build_chat_prompt(system_content, user_content, assistant_prefix=cot_text + "\n\n")

    def _format_metadata_as_cot(self, metadata: Dict[str, Any]) -> str:
        """Format parsed metadata as CoT text using plain YAML format — matches vanilla LM output style.
        Caption is formatted as a multi-line YAML plain scalar with 2-space indented continuation lines,
        wrapped at ~85 char width, splitting at natural break points (.|,|;| |\\n).
        No yaml.dump() — we output exact format matching the LM's raw output."""
        import re
        lines = []
        for key in ['bpm', 'caption', 'duration', 'keyscale', 'language', 'timesignature']:
            if key in metadata and metadata[key] is not None:
                value = metadata[key]
                # Normalize timesignature: strip trailing "/4" since LM outputs just the numerator
                if key == "timesignature" and isinstance(value, str) and value.endswith("/4"):
                    value = value.split("/")[0]
                # Convert numeric-like strings to bare integers (no quotes in output)
                if isinstance(value, str) and value.isdigit():
                    value = int(value)
                if key == "caption" and isinstance(value, str) and len(str(value)) > 85:
                    # Multi-line caption: wrap at ~85 chars, split at .|,|;| |\n
                    caption_text = str(value)
                    wrapped_lines = self._wrap_caption_text(caption_text, max_width=85)
                    if wrapped_lines:
                        lines.append(f"{key}: {wrapped_lines[0]}")
                        for continuation in wrapped_lines[1:]:
                            lines.append(f"  {continuation}")
                    else:
                        lines.append(f"{key}: {value}")
                else:
                    lines.append(f"{key}: {value}")
        cot_yaml = "\n".join(lines)
        return f"<think>\n{cot_yaml}\n</think>"

    @staticmethod
    def _wrap_caption_text(text: str, max_width: int = 85) -> List[str]:
        """Wrap caption text at natural break points for YAML 2-space indented continuation lines.
        Splits at sentence-ending punctuation (.|;), commas, spaces, or existing newlines.
        Each resulting line is at most max_width characters."""
        import re
        # First split on existing newlines
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        segments = text.split("\n")
        result_lines = []
        for segment in segments:
            segment = segment.strip()
            if not segment:
                continue
            while len(segment) > max_width:
                # Find best break point: prefer .|;|, then space, within window
                best_pos = -1
                # Search backward from max_width for natural break chars
                for i in range(min(max_width, len(segment)) - 1, max_width // 2, -1):
                    if segment[i] in '.;,':
                        best_pos = i + 1  # break AFTER the punctuation
                        break
                # Fallback: find last space within window
                if best_pos == -1:
                    space_pos = segment.rfind(' ', max_width // 2, max_width)
                    if space_pos > 0:
                        best_pos = space_pos + 1  # break AFTER the space
                # Last resort: hard break at max_width
                if best_pos == -1:
                    best_pos = max_width
                result_lines.append(segment[:best_pos].rstrip())
                segment = segment[best_pos:].lstrip()
            if segment:
                result_lines.append(segment)
        return result_lines

    def parse_lm_output(self, text: str):
        """Parse CoT output to extract metadata YAML between <think> and </think> tags.
        Returns (metadata_dict, remaining_text) matching LLMHandler.parse_lm_output()."""
        metadata = {}
        remaining = text
        if "<think>" in text and "</think>" in text:
            think_start = text.index("<think>") + len("<think>")
            think_end = text.index("</think>")
            yaml_text = text[think_start:think_end].strip()
            remaining = text[think_end + len("</think>"):].strip()
            if yaml_text:
                try:
                    parsed = yaml.safe_load(yaml_text)
                    if isinstance(parsed, dict):
                        # Convert all values to strings — yaml.safe_load may return ints/floats (e.g. timesignature: 4)
                        # but upstream handler.py calls .strip() on values like time_signature, expecting strings
                        metadata = {k: str(v) for k, v in parsed.items()}
                    else:
                        print(f"[gguf-lm] YAML parse returned non-dict type={type(parsed).__name__}, value={str(parsed)[:200]}", flush=True)
                except yaml.YAMLError as e:
                    print(f"[gguf-lm] YAML parse error: {e}", flush=True)
                    print(f"[gguf-lm] YAML text was: {yaml_text[:500]}", flush=True)
            else:
                print(f"[gguf-lm] YAML text between <think>/<think> was empty", flush=True)
        else:
            has_think = "<think>" in text
            has_end = "</think>" in text
            print(f"[gguf-lm] Missing think tags: <think>={has_think} </think>={has_end}. Raw text: {text[:300]}", flush=True)
        return metadata, remaining

    def has_all_metas(self, user_metadata: Optional[Dict[str, Optional[str]]]) -> bool:
        """Check if all required metadata fields are provided by the user (skip CoT if so)."""
        if user_metadata is None:
            return False
        return all(k in user_metadata and user_metadata[k] is not None for k in ('bpm', 'keyscale', 'timesignature', 'duration'))

    # ─── Core Generation ─────────────────────────────────────────────────────

    def _generate_text(self, prompt: str, max_tokens: int, temperature: float = 0.85, top_k: int = 0, top_p: float = 0.9, repetition_penalty: float = 1.0, frequency_penalty: float = 0.0, presence_penalty: float = 0.0, penalty_last_n: int = 64, dry_multiplier: float = 0.0, dry_base: float = 1.75, dry_allowed_length: int = 2, dry_penalty_last_n: int = -1, stop: Optional[List[str]] = None, grammar: Optional[str] = None, seed: int = -1) -> str:
        """Run a single text completion via llama-server HTTP /completion endpoint.
        seed: RNG seed for deterministic generation (-1 = random). At temp=0 seed is irrelevant (greedy), but at temp>0 same seed → same output.
        frequency_penalty: additive penalty per token occurrence (0.0=off, 0.1=moderate). Prevents individual code repetition.
        presence_penalty: flat additive penalty for any previously-seen token (0.0=off, 0.5=moderate). Encourages vocabulary diversity.
        penalty_last_n: how many past tokens to consider for penalties (-1=all tokens, 0=disabled, 64=default window).
        dry_multiplier: DRY (Don't Repeat Yourself) penalty multiplier for repeated token SEQUENCES (0=off, 2.0=strong). Breaks cyclic patterns.
        dry_base: exponential base for DRY penalty scaling (default 1.75).
        dry_allowed_length: max length of repeated sequences to allow without penalty (default 2, set to 1 for strict).
        dry_penalty_last_n: token window for DRY pattern scanning (-1=all tokens)."""
        if not self._is_server_alive():
            raise RuntimeError("demodokos_gguf is not running or not responsive — call initialize() first")

        # Build the JSON payload for the llama-server /completion API
        # top_k: 0 = disabled (consider all tokens), matching Python/transformers behavior. llama.cpp defaults top_k=40 which is wrong for ~65K audio codes.
        # min_p: 0.0 = disabled. llama.cpp defaults min_p=0.05 which filters tokens below 5% of top — Python model doesn't use min_p at all.
        request_data: Dict[str, Any] = {"prompt": prompt, "n_predict": max_tokens, "temperature": temperature, "top_k": top_k, "top_p": top_p, "min_p": 0.0, "repeat_penalty": repetition_penalty, "frequency_penalty": frequency_penalty, "presence_penalty": presence_penalty, "repeat_last_n": penalty_last_n, "stop": stop or [], "stream": False, "cache_prompt": True, "seed": seed}  # cache_prompt=True: reuses KV cache for shared prompt prefixes (seed determinism handled by C# cached_codes mechanism)
        # DRY sampler — penalizes repeated token sequences (breaks cyclic patterns like 3-code loops)
        if dry_multiplier > 0:
            request_data["dry_multiplier"] = dry_multiplier
            request_data["dry_base"] = dry_base
            request_data["dry_allowed_length"] = dry_allowed_length
            request_data["dry_penalty_last_n"] = dry_penalty_last_n
        # GBNF grammar constrains output to only valid token patterns (e.g. audio codes only)
        if grammar:
            request_data["grammar"] = grammar
        payload = json.dumps(request_data).encode("utf-8")

        req = urllib.request.Request(f"{self._base_url}/completion", data=payload, headers={"Content-Type": "application/json"}, method="POST")

        # Use a long timeout — audio codes generation can produce thousands of tokens taking minutes
        with urllib.request.urlopen(req, timeout=600) as resp:
            result = json.loads(resp.read().decode("utf-8"))

        return result.get("content", "")

    def _generate_text_streaming(self, prompt: str, max_tokens: int, token_callback=None, temperature: float = 0.85, top_k: int = 0, top_p: float = 0.9, repetition_penalty: float = 1.0, frequency_penalty: float = 0.0, presence_penalty: float = 0.0, penalty_last_n: int = 64, dry_multiplier: float = 0.0, dry_base: float = 1.75, dry_allowed_length: int = 2, dry_penalty_last_n: int = -1, stop: Optional[List[str]] = None, grammar: Optional[str] = None, seed: int = -1) -> str:
        """Streaming variant of _generate_text — reads tokens incrementally via llama-server SSE stream.
        token_callback: Optional callable(tokens_so_far: int, max_tokens: int) called after each token chunk arrives.
        Returns the full generated text (same contract as _generate_text)."""
        if not self._is_server_alive():
            raise RuntimeError("demodokos_gguf is not running or not responsive — call initialize() first")

        request_data: Dict[str, Any] = {"prompt": prompt, "n_predict": max_tokens, "temperature": temperature, "top_k": top_k, "top_p": top_p, "min_p": 0.0, "repeat_penalty": repetition_penalty, "frequency_penalty": frequency_penalty, "presence_penalty": presence_penalty, "repeat_last_n": penalty_last_n, "stop": stop or [], "stream": True, "cache_prompt": True, "seed": seed}
        if dry_multiplier > 0:
            request_data["dry_multiplier"] = dry_multiplier
            request_data["dry_base"] = dry_base
            request_data["dry_allowed_length"] = dry_allowed_length
            request_data["dry_penalty_last_n"] = dry_penalty_last_n
        if grammar:
            request_data["grammar"] = grammar
        payload = json.dumps(request_data).encode("utf-8")

        req = urllib.request.Request(f"{self._base_url}/completion", data=payload, headers={"Content-Type": "application/json"}, method="POST")

        # Stream tokens — llama-server sends "data: {json}\n\n" SSE events; count audio_code tokens for progress
        full_text = []
        token_count = 0
        with urllib.request.urlopen(req, timeout=600) as resp:
            for raw_line in resp:
                line = raw_line.decode("utf-8", errors="replace").strip()
                if not line.startswith("data: "):
                    continue
                json_str = line[6:]  # strip "data: " prefix
                try:
                    chunk = json.loads(json_str)
                except json.JSONDecodeError:
                    continue
                content = chunk.get("content", "")
                if content:
                    full_text.append(content)
                    # Count audio code tokens in this chunk (each <|audio_code_XXXX|> is one token from llama-server)
                    token_count += content.count("<|audio_code_")
                    if token_callback:
                        token_callback(token_count, max_tokens)
                if chunk.get("stop", False):
                    break

        return "".join(full_text)

    def generate_with_stop_condition(self, caption: str, lyrics: str, infer_type: str, temperature: float = 0.85, cfg_scale: float = 1.0, negative_prompt: str = "NO USER INPUT", top_k: Optional[int] = None, top_p: Optional[float] = None, repetition_penalty: float = 1.0, use_constrained_decoding: bool = True, constrained_decoding_debug: bool = False, target_duration: Optional[float] = None, user_metadata: Optional[Dict[str, Optional[str]]] = None, use_cot_metas: bool = True, use_cot_caption: bool = True, use_cot_language: bool = True, batch_size: Optional[int] = None, seeds: Optional[List[int]] = None, progress=None) -> Dict[str, Any]:
        """Two-phase LM generation compatible with LLMHandler.generate_with_stop_condition().

        Phase 1 (CoT): Generate metadata (bpm, key, duration, caption, language) — runs once regardless of batch_size.
        Phase 2 (Codes): Generate audio code tokens — runs once per batch item with different seeds.

        cfg_scale is repurposed as a discrete negative-prompt mode (0-2):
          0 = off (no negative effect)
          1 = steering (inject 'restrict' keyword in think section, removed before DiT)
          2 = inference (restrict injection + Qwen3 caption rewrite)

        When batch_size > 1, returns metadata as a list of dicts and audio_codes as a list of strings
        (matching upstream LLMHandler's batch contract expected by inference.py's chunk processing).

        Returns dict with: metadata, audio_codes, success, error, extra_outputs
        """
        if progress is None:
            def progress(*args, **kwargs):
                pass

        actual_batch = batch_size if batch_size and batch_size > 1 else 1

        # Extract seed for deterministic generation — seeds list comes from upstream generate_music()
        generation_seed = seeds[0] if seeds and len(seeds) > 0 else -1

        infer_type = (infer_type or "").strip().lower()
        if infer_type not in {"dit", "llm_dit"}:
            return {"metadata": {}, "audio_codes": "", "success": False, "error": f"invalid infer_type: {infer_type!r}", "extra_outputs": {"time_costs": {}}}

        if not self.llm_initialized:
            return {"metadata": {}, "audio_codes": "", "success": False, "error": "GGUF LM not initialized", "extra_outputs": {"time_costs": {}}}

        # Determine negative prompt mode from cfg_scale (0=off, 1=steering, 2=inference)
        cfg_mode = max(0, min(2, int(round(cfg_scale))))
        has_negative = negative_prompt and negative_prompt != "NO USER INPUT" and negative_prompt.strip()
        sanitized_negative = self._sanitize_negative(negative_prompt) if has_negative else ""
        # Both steering and inference modes require CoT — restrict injection lives in the <think> section
        if cfg_mode > 0 and not use_cot_metas:
            cfg_mode = 0
            print("[gguf-lm] CFG modes 1/2 (steering/inference) require CoT — falling back to mode 0 (off)", flush=True)
        mode_names = {0: "off", 1: "steering", 2: "inference"}
        if has_negative and cfg_mode > 0:
            print(f"[gguf-lm] Negative prompt mode {cfg_mode} ({mode_names[cfg_mode]}): \"{sanitized_negative[:80]}\"", flush=True)

        metadata = {}
        phase1_time = 0.0
        phase2_time = 0.0

        # ═══ PHASE 1: CoT Metadata Generation (once for all batch items) ═══
        # Phase 1 ALWAYS runs when use_cot_metas is True — user-provided bpm/key/timesig are OVERRIDES applied after CoT,
        # NOT reasons to skip generation. The ONLY legal skip is when the LM checkbox is off (use_cot_metas=False).
        progress(0.1, "Phase 1: Generating CoT metadata (GGUF)...")

        if use_cot_metas:
            print("[gguf-lm] Phase 1: Generating CoT metadata...", flush=True)
            phase1_start = time.time()

            # Build prompt for CoT phase — model should output <think>..yaml..</think>
            # cfg_mode == 1 injects 'restrict: "negatives"' in <think> section and steers with bpm: prefix
            # cfg_mode == 2 does NOT inject steering — uses standard prompt, Qwen3 rewrite handles negatives after Phase 1
            cot_prompt = self.build_formatted_prompt(caption, lyrics, generation_phase="cot", negative_prompt=sanitized_negative, cfg_mode=cfg_mode)

            try:
                # When CFG mode 1 is active, prompt has assistant prefix with <think>\nrestrict:...\nbpm:
                # — the model continues from bpm: and generates the rest of the CoT YAML
                # Stop on </think> AND <|im_end|> — the model may generate EOS after grammar completes
                # (--special renders EOS as literal text, so we must stop it explicitly)
                stop_tokens = ["</think>", "<|im_end|>", "<|endoftext|>"]
                # Select GBNF grammar for Phase 1 — grammar is ALWAYS applied to force all 6 YAML fields
                # When CFG mode 1 is active, use THINK grammar since we inject restrict in think section
                phase1_grammar = PHASE1_GRAMMAR_THINK if cfg_mode == 1 else PHASE1_GRAMMAR_FULL
                # If user selected a specific language, constrain the GBNF grammar to force exactly that language code —
                # prevents the model from generating "unknown" and ensures CoT output matches user intent
                if user_metadata and user_metadata.get("language") and user_metadata["language"] != "unknown":
                    forced_lang = user_metadata["language"]
                    import re as _re
                    phase1_grammar = _re.sub(r'lang ::= .*', f'lang ::= "{forced_lang}"', phase1_grammar)
                # Generate until grammar is satisfied or stop token — CoT output is typically 100-300 tokens
                cot_output = self._generate_text(cot_prompt, max_tokens=512, temperature=temperature, top_k=top_k or 0, top_p=top_p or 0.9, repetition_penalty=repetition_penalty, stop=stop_tokens, grammar=phase1_grammar, seed=generation_seed)

                # Sanitize grammar output: strip stray special tokens rendered as text by --special flag,
                # and normalize Windows CRLF→LF. The --special flag causes ALL special tokens to appear as
                # literal text (e.g. <|im_end|>, <|fim_pad|>, <|endoftext|>) which break YAML parsing.
                import re
                cot_output = re.sub(r'<\|[a-zA-Z0-9_]+\|>', '', cot_output)  # strip ALL <|...|> special tokens
                cot_output = cot_output.replace("\r\n", "\n").replace("\r", "")

                # Debug: log raw output BEFORE reconstruction to see exactly what llama-server returned
                print(f"[gguf-lm] Phase 1 raw output ({len(cot_output)} chars): \"{cot_output[:300]}\"", flush=True)

                # Append the stop token back since parse_lm_output expects it
                if "</think>" not in cot_output:
                    cot_output += "</think>"
                # With CFG mode 1 active, model output starts from after "bpm:" — reconstruct the full <think> block
                # by prepending the steering prefix so parse_lm_output can find <think>...</think>
                if cfg_mode == 1 and "<think>" not in cot_output:
                    cot_output = f"<think>\nrestrict: \"{sanitized_negative}\"\nbpm:{cot_output}"
                # Ensure we have the opening tag for parsing
                elif "<think>" not in cot_output:
                    cot_output = "<think>\n" + cot_output

                metadata, _ = self.parse_lm_output(cot_output)
                # Store the raw Phase 1 output for debug capture — shows exactly what the LM produced
                self._phase1_raw_output = cot_output
                if not metadata or "caption" not in metadata:
                    print(f"[gguf-lm] Phase 1 FATAL: Caption missing from parsed metadata. Keys: {list(metadata.keys())}. Output: \"{cot_output[:400]}\"", flush=True)
                    return {"metadata": {}, "audio_codes": "", "success": False, "error": f"Phase 1 CoT failed: caption missing from parsed YAML (keys: {list(metadata.keys())})", "extra_outputs": {"time_costs": {"phase1_time": time.time() - phase1_start}}}
                # Remove deterministic injection artifacts from the LM's CoT output
                if has_negative and cfg_mode > 0:
                    self._cleanup_negative_artifacts(metadata, sanitized_negative, cfg_mode)
                # Apply user overrides — bpm/key/timesig/duration from UI replace CoT-generated values
                if user_metadata:
                    for k, v in user_metadata.items():
                        if v is not None:
                            metadata[k] = str(v)
                phase1_time = time.time() - phase1_start
                print(f"[gguf-lm] Phase 1 completed in {phase1_time:.1f}s — metadata: {list(metadata.keys())}", flush=True)

            except Exception as e:
                phase1_time = time.time() - phase1_start
                print(f"[gguf-lm] Phase 1 error: {e}", flush=True)
                traceback.print_exc()
                return {"metadata": {}, "audio_codes": "", "success": False, "error": f"CoT generation failed: {e}", "extra_outputs": {"time_costs": {"phase1_time": phase1_time}}}
        else:
            # LM checkbox is OFF — no CoT generation, use only user-provided metadata + caption from input
            if user_metadata:
                metadata = {k: v for k, v in user_metadata.items() if v is not None}
            if "caption" not in metadata and caption:
                metadata["caption"] = caption
            if "language" not in metadata:
                metadata["language"] = "unknown"
            # Clear stale Phase 1 debug fields from previous generations
            self._phase1_raw_output = ""
            self._cfg_rewrite_prompt = ""
            print(f"[gguf-lm] Phase 1: Skipped (use_cot_metas=False) — metadata: {list(metadata.keys())}", flush=True)

        # ═══ CFG STAGE 2: Caption Rewrite via Second LM (mode 2 = inference only) ═══
        # After Phase 1 generates metadata, use a second LM (Qwen3-4B-Instruct) to review
        # the caption and remove/rephrase any concepts matching the restricted negative keywords.
        # Only runs in mode 2 (inference), not mode 1 (steering which only uses restrict keyword).
        if has_negative and cfg_mode == 2 and "caption" in metadata and self._cfg_model_path:
            progress(0.3, "CFG Stage 2: Rewriting caption...")
            original_caption = str(metadata["caption"])
            rewritten_caption = self.rewrite_caption(original_caption, sanitized_negative, seed=generation_seed)
            if rewritten_caption != original_caption:
                metadata["caption"] = rewritten_caption
                print(f"[gguf-lm] Caption updated by CFG Stage 2 rewrite", flush=True)
            # Store CFG data for debug capture — original caption before rewrite + restrict keyword + rewrite prompt
            self._cfg_debug = {"restrict": sanitized_negative, "original_caption": original_caption, "rewritten_caption": str(metadata["caption"]), "stage2_ran": rewritten_caption != original_caption, "rewrite_prompt": getattr(self, '_cfg_rewrite_prompt', '')}
        else:
            self._cfg_debug = {}

        # If infer_type is 'dit', stop here — only metadata needed (no audio codes)
        # Include cfg_debug + phase1_raw_output so the debug window still shows Stage 2 info for cover pre-pass
        if infer_type == "dit":
            _dit_cfg_dbg = getattr(self, '_cfg_debug', {})
            _dit_p1_raw = getattr(self, '_phase1_raw_output', '')
            _dit_extra = {"time_costs": {"phase1_time": phase1_time, "total_time": phase1_time}, "backend": "gguf", "model": os.path.basename(self.model_path), "cfg_debug": _dit_cfg_dbg, "phase1_raw_output": _dit_p1_raw, "qdiv": -1}
            # For batch mode, return lists matching upstream's batch contract
            if actual_batch > 1:
                return {"metadata": [dict(metadata) for _ in range(actual_batch)], "audio_codes": ["" for _ in range(actual_batch)], "success": True, "error": None, "extra_outputs": _dit_extra}
            return {"metadata": metadata, "audio_codes": "", "success": True, "error": None, "extra_outputs": _dit_extra}

        # ═══ PHASE 2: Audio Codes Generation (parallel across batch items with different seeds) ═══
        # Diversity slider (0-100) controls Phase 2 anti-degeneration penalty strength.
        # GGUF quantization noise reduces logit differentiation between ~65K audio code tokens.
        # Without penalties, the model enters repeating cycles after ~100 tokens (~20s).
        # Piecewise scaling: 0-50 ramps from off to production defaults, 50-100 ramps to maximum diversity.
        diversity_level = getattr(self, 'diversity_level', 15)  # 0-100 slider, default 15 = light penalties (model naturally produces ~90% unique codes)
        t = max(0.0, min(100.0, float(diversity_level))) / 100.0  # normalize to 0.0-1.0
        if t <= 0.0:
            # Slider at 0: no penalties at all — match Python/transformers defaults
            codes_dry_multiplier = 0.0
            codes_dry_base = 1.75
            codes_dry_allowed_length = 2
            codes_freq_penalty = 0.0
            codes_presence_penalty = 0.0
            codes_penalty_last_n = 0
            penalty_label = "penalties=OFF (diversity=0)"
        elif t <= 0.5:
            # 0-50: ramp from minimal to current production settings (diversity=50 matches old DRY=ON)
            s = t / 0.5  # 0.0 → 1.0 within this half
            codes_dry_multiplier = s * 2.0               # 0.0 → 2.0
            codes_dry_base = 1.5 + s * 0.25              # 1.5 → 1.75
            codes_dry_allowed_length = 3 if s < 0.3 else (2 if s < 0.7 else 1)
            codes_freq_penalty = s * 0.15                 # 0.0 → 0.15
            codes_presence_penalty = s * 0.5              # 0.0 → 0.5
            codes_penalty_last_n = -1  # all tokens
            penalty_label = f"DRY={codes_dry_multiplier:.1f}, freq={codes_freq_penalty:.2f}, pres={codes_presence_penalty:.2f} (diversity={diversity_level})"
        else:
            # 50-100: ramp from production to maximum — push for 90%+ diversity even at temp=0
            s = (t - 0.5) / 0.5  # 0.0 → 1.0 within this half
            codes_dry_multiplier = 2.0 + s * 2.0         # 2.0 → 4.0
            codes_dry_base = 1.75 + s * 0.75             # 1.75 → 2.5
            codes_dry_allowed_length = 1
            codes_freq_penalty = 0.15 + s * 0.35         # 0.15 → 0.5
            codes_presence_penalty = 0.5 + s * 1.0       # 0.5 → 1.5
            codes_penalty_last_n = -1  # all tokens
            penalty_label = f"DRY={codes_dry_multiplier:.1f}, freq={codes_freq_penalty:.2f}, pres={codes_presence_penalty:.2f} (diversity={diversity_level})"

        progress(0.5, f"Phase 2: Generating audio codes (GGUF, batch={actual_batch})...")
        print(f"[gguf-lm] Phase 2: Generating audio codes (batch_size={actual_batch}, {penalty_label})...", flush=True)
        phase2_start = time.time()

        # Format metadata as CoT YAML and build the codes-phase prompt (shared across batch items)
        # Clean CoT text: remove restrict/AVOID artifacts before Phase 2 so audio codes aren't contaminated
        cot_text = self._format_metadata_as_cot(metadata)
        if has_negative and cfg_mode > 0:
            import re
            cot_text = re.sub(r'(?m)^restrict:.*\n?', '', cot_text)  # remove restrict lines from think block
            cot_text = re.sub(r'(?m)^AVOID:.*\n?', '', cot_text)  # legacy: also remove AVOID lines
        # Phase 2 prompt MUST use the CoT-generated caption (potentially rewritten by CFG Stage 2),
        # not the raw input tags. The user content section shows what the model should generate audio for.
        phase2_caption = metadata.get("caption", caption)
        codes_prompt = self.build_formatted_prompt_with_cot(phase2_caption, lyrics, cot_text, negative_prompt=sanitized_negative, cfg_mode=cfg_mode)

        # Calculate max tokens — with --special, each <|audio_code_XXXX|> is a single token
        # 5Hz model = 5 audio codes per second, exact count controls duration
        # Use explicit duration when user provides one (>0), otherwise fall through to CoT metadata or default 60s
        duration_seconds = target_duration if target_duration is not None and target_duration > 0 else metadata.get("duration", 60)
        if isinstance(duration_seconds, str):
            try:
                duration_seconds = float(duration_seconds)
            except ValueError:
                duration_seconds = 60
        # Anti-abuse: clamp to license-enforced maximum if set (defense-in-depth — server also clamps)
        _max_dur = getattr(self, "max_allowed_duration", 0)
        if _max_dur and _max_dur > 0 and duration_seconds > _max_dur:
            print(f"[gguf-lm] Duration clamped from {duration_seconds}s to {_max_dur}s (license limit)", flush=True)
            duration_seconds = _max_dur
        max_code_tokens = int(duration_seconds * 5)

        # GBNF grammar constrains output to ONLY valid audio code tokens with EXACT count
        grammar_str = f'root ::= ("<|audio_code_" [0-9]+ "|>"){{{max_code_tokens}}}'

        # Generate audio codes — parallel for batch > 1, sequential for single
        all_audio_codes = []
        all_metadata = []
        total_code_count = 0

        # ═══ Cached codes replay — deterministic seed replication for GGUF ═══
        # GGML CUDA backend has inherent floating-point non-determinism in quantized matmul kernels, so
        # same seed + same prompt can produce different audio codes on each run. To guarantee deterministic
        # output, the C# client stores codes + context hash from the first generation. On replay (same seed),
        # it sends cached_codes + cached_codes_hash. If the hash matches, we skip Phase 2 and reuse stored codes.
        import hashlib
        _codes_context_hash = ""
        if actual_batch <= 1:
            _hash_seed = seeds[0] if seeds and len(seeds) > 0 else -1
            # Hash covers ALL parameters affecting codecs output: prompt, temperature, seed, sampling params (top_k, top_p), token count, and diversity_level (which deterministically controls DRY mult/base/allowed_length, frequency_penalty, presence_penalty via piecewise scaling curve)
            _codes_hash_input = f"{codes_prompt}|{temperature}|{_hash_seed}|{top_k or 0}|{top_p or 0.9}|{max_code_tokens}|diversity={diversity_level}"
            _codes_context_hash = hashlib.md5(_codes_hash_input.encode("utf-8")).hexdigest()
            _cached_hash = getattr(self, '_cached_codes_hash', None)
            _cached_codes_str = getattr(self, '_cached_codes', None)
            if _cached_hash and _cached_codes_str and _cached_hash == _codes_context_hash:
                all_audio_codes.append(_cached_codes_str)
                all_metadata.append(dict(metadata))
                total_code_count = _cached_codes_str.count("<|audio_code_")
                print(f"[gguf-lm] Phase 2: CACHED codes replay — hash match ({_codes_context_hash[:12]}...), {total_code_count} codes", flush=True)

        if all_audio_codes:
            pass  # Phase 2 skipped — using cached codes
        elif actual_batch > 1:
            # Scale up llama-server parallel slots to match batch size (restart if needed)
            if not self._ensure_parallel(actual_batch):
                return {"metadata": metadata, "audio_codes": "", "success": False, "error": "Failed to scale demodokos_gguf for parallel batch generation", "extra_outputs": {"time_costs": {"phase1_time": phase1_time}}}

            # Fire all batch requests in parallel using ThreadPoolExecutor — each thread sends one HTTP completion request to a different llama-server slot
            def _generate_batch_item(batch_idx):
                batch_seed = seeds[batch_idx] if seeds and batch_idx < len(seeds) else -1
                codes_output = self._generate_text(codes_prompt, max_tokens=max_code_tokens, temperature=temperature, top_k=top_k or 0, top_p=top_p or 0.9, repetition_penalty=repetition_penalty, frequency_penalty=codes_freq_penalty, presence_penalty=codes_presence_penalty, penalty_last_n=codes_penalty_last_n, dry_multiplier=codes_dry_multiplier, dry_base=codes_dry_base, dry_allowed_length=codes_dry_allowed_length, dry_penalty_last_n=-1, stop=["<|im_end|>", "<|endoftext|>"], grammar=grammar_str, seed=batch_seed)
                return batch_idx, batch_seed, codes_output.strip()

            print(f"[gguf-lm] Launching {actual_batch} parallel completion requests (parallel slots={self._n_parallel})...", flush=True)
            batch_results = [None] * actual_batch  # ordered by batch index
            completed_count = 0
            with concurrent.futures.ThreadPoolExecutor(max_workers=actual_batch) as executor:
                futures = {executor.submit(_generate_batch_item, i): i for i in range(actual_batch)}
                for future in concurrent.futures.as_completed(futures):
                    try:
                        batch_idx, batch_seed, batch_codes = future.result()
                        code_count = batch_codes.count("<|audio_code_")
                        total_code_count += code_count
                        batch_results[batch_idx] = batch_codes
                        completed_count += 1
                        # Update progress as each batch item finishes
                        batch_pct = 0.5 + 0.3 * (completed_count / actual_batch)
                        progress(batch_pct, f"Phase 2: Generating audio codes (batch {completed_count}/{actual_batch} done)...")
                        print(f"[gguf-lm] Phase 2 batch {batch_idx+1}/{actual_batch}: {code_count} codes (seed={batch_seed})", flush=True)
                    except Exception as e:
                        failed_idx = futures[future]
                        phase2_time = time.time() - phase2_start
                        print(f"[gguf-lm] Phase 2 batch {failed_idx+1} error: {e}", flush=True)
                        traceback.print_exc()
                        # Always scale back down on error to ensure clean state
                        self._scale_down_parallel()
                        return {"metadata": metadata, "audio_codes": "", "success": False, "error": f"Audio codes generation failed (batch {failed_idx+1}): {e}", "extra_outputs": {"time_costs": {"phase1_time": phase1_time, "phase2_time": phase2_time}}}

            all_audio_codes = batch_results
            all_metadata = [dict(metadata) for _ in range(actual_batch)]

            # Scale server back to parallel=1 to free KV cache VRAM (only if save_vram_after_batch is enabled)
            if self.save_vram_after_batch:
                self._scale_down_parallel()
            else:
                print(f"[gguf-lm] Keeping parallel={self._n_parallel} slots allocated (save_vram_after_batch=False)", flush=True)
        else:
            # Single generation — use streaming to provide real-time token progress updates to the UI
            batch_seed = seeds[0] if seeds and len(seeds) > 0 else -1
            # Token progress callback — updates the progress function with token count so the UI shows Phase 2 activity
            def _phase2_token_progress(tokens_so_far, max_tokens):
                pct = 0.5 + 0.3 * (tokens_so_far / max_tokens) if max_tokens > 0 else 0.5  # Phase 2 spans 50-80% of overall progress
                progress(pct, f"Phase 2: Generating audio codes ({tokens_so_far}/{max_tokens} tokens)...")
            try:
                codes_output = self._generate_text_streaming(codes_prompt, max_tokens=max_code_tokens, token_callback=_phase2_token_progress, temperature=temperature, top_k=top_k or 0, top_p=top_p or 0.9, repetition_penalty=repetition_penalty, frequency_penalty=codes_freq_penalty, presence_penalty=codes_presence_penalty, penalty_last_n=codes_penalty_last_n, dry_multiplier=codes_dry_multiplier, dry_base=codes_dry_base, dry_allowed_length=codes_dry_allowed_length, dry_penalty_last_n=-1, stop=["<|im_end|>", "<|endoftext|>"], grammar=grammar_str, seed=batch_seed)
                batch_codes = codes_output.strip()
                code_count = batch_codes.count("<|audio_code_")
                total_code_count = code_count
                all_audio_codes.append(batch_codes)
                all_metadata.append(dict(metadata))
                # Diversity diagnostic — quick check to verify anti-degeneration is effective
                import re as _re
                _code_ids = _re.findall(r'audio_code_(\d+)', batch_codes)
                _unique_pct = int(100 * len(set(_code_ids)) / len(_code_ids)) if _code_ids else 0
                print(f"[gguf-lm] Phase 2: {code_count} codes (seed={batch_seed}), diversity: {len(set(_code_ids))}/{len(_code_ids)} unique ({_unique_pct}%)", flush=True)
            except Exception as e:
                phase2_time = time.time() - phase2_start
                print(f"[gguf-lm] Phase 2 error: {e}", flush=True)
                traceback.print_exc()
                return {"metadata": metadata, "audio_codes": "", "success": False, "error": f"Audio codes generation failed: {e}", "extra_outputs": {"time_costs": {"phase1_time": phase1_time, "phase2_time": phase2_time}}}

        phase2_time = time.time() - phase2_start
        total_time = phase1_time + phase2_time
        print(f"[gguf-lm] Phase 2 completed in {phase2_time:.1f}s — {total_code_count} total codes across {actual_batch} items", flush=True)

        # ═══ Qdiv — Codec Diversity Quality Metric ═══
        # Normalized 0-100%: 0% = all identical codes, 100% = every code unique.
        # Computed across all audio codes in the generation (combined batch if applicable).
        import re as _re_qdiv
        _all_code_ids = []
        for _ac in all_audio_codes:
            _all_code_ids.extend(_re_qdiv.findall(r'audio_code_(\d+)', _ac))
        qdiv = int(100 * len(set(_all_code_ids)) / len(_all_code_ids)) if _all_code_ids else -1  # -1 = no audio codes produced
        if qdiv >= 0:
            print(f"[gguf-lm] Qdiv: {qdiv}% ({len(set(_all_code_ids))} unique / {len(_all_code_ids)} total codes)", flush=True)

        # Optional: stop server after generation to free VRAM
        if self._unload_after_generation:
            print("[gguf-lm] Unloading model after generation (unload_after_generation=True)", flush=True)
            self.unload()

        # Return format depends on batch size — upstream inference.py expects lists for batch_size > 1
        # CFG debug info + Phase 1 raw output for debug capture
        _cfg_dbg = getattr(self, '_cfg_debug', {})
        _p1_raw = getattr(self, '_phase1_raw_output', '')

        if actual_batch > 1:
            return {
                "metadata": all_metadata,
                "audio_codes": all_audio_codes,
                "success": True,
                "error": None,
                "extra_outputs": {
                    "time_costs": {"phase1_time": phase1_time, "phase2_time": phase2_time, "total_time": total_time},
                    "backend": "gguf",
                    "model": os.path.basename(self.model_path),
                    "code_count": total_code_count,
                    "qdiv": qdiv,
                    "diversity_level": diversity_level,
                    "cfg_debug": _cfg_dbg,
                    "phase1_raw_output": _p1_raw,
                    "codes_hash": _codes_context_hash,
                },
            }
        else:
            return {
                "metadata": metadata,
                "audio_codes": all_audio_codes[0] if all_audio_codes else "",
                "success": True,
                "error": None,
                "extra_outputs": {
                    "time_costs": {"phase1_time": phase1_time, "phase2_time": phase2_time, "total_time": total_time},
                    "backend": "gguf",
                    "model": os.path.basename(self.model_path),
                    "code_count": total_code_count,
                    "qdiv": qdiv,
                    "diversity_level": diversity_level,
                    "cfg_debug": _cfg_dbg,
                    "phase1_raw_output": _p1_raw,
                    "codes_hash": _codes_context_hash,
                },
            }


def find_gguf_model_file(checkpoint_dir: str, model_name: str) -> Optional[str]:
    """Locate the .gguf file for a given model name inside the checkpoint directory.
    Model files live at: <checkpoint_dir>/<model_name>/<filename>.gguf
    Returns the full path to the .gguf file, or None if not found."""
    model_dir = os.path.join(checkpoint_dir, model_name)
    if not os.path.isdir(model_dir):
        return None
    # Find any .gguf file — there should be exactly one per model directory
    gguf_files = [f for f in os.listdir(model_dir) if f.endswith(".gguf")]
    if not gguf_files:
        return None
    # Prefer the file whose name matches the model_name pattern
    for f in gguf_files:
        if model_name.lower().replace("-gguf", "") in f.lower():
            return os.path.join(model_dir, f)
    # Fallback to first .gguf file found
    return os.path.join(model_dir, gguf_files[0])


# ─── GGUF Model Definitions ──────────────────────────────────────────────────
# Maps model tag to HuggingFace repo and expected filename for download
# SYNC: repo and filename must match the corresponding lm_gguf entries in DOWNLOAD_CATALOG (acestep_server.py).
GGUF_MODEL_REGISTRY = {
    "acestep-5Hz-lm-4B-Q4_K_S": {
        "repo": "cmp-nct/acestep-5Hz-lm-4B-GGUF",
        "filename": "acestep-5Hz-lm-4B-Q4_K_S.gguf",
        "size_label": "~2.4 GB",
        "quality": "Q4_K_S — smallest, fast",
    },
    "acestep-5Hz-lm-4B-Q5_K_M": {
        "repo": "cmp-nct/acestep-5Hz-lm-4B-GGUF",
        "filename": "acestep-5Hz-lm-4B-Q5_K_M.gguf",
        "size_label": "~2.8 GB",
        "quality": "Q5_K_M — balanced (recommended)",
    },
    "acestep-5Hz-lm-4B-Q6_K": {
        "repo": "cmp-nct/acestep-5Hz-lm-4B-GGUF",
        "filename": "acestep-5Hz-lm-4B-Q6_K.gguf",
        "size_label": "~3.3 GB",
        "quality": "Q6_K — highest quality",
    },
    "acestep-5Hz-lm-4B-Q8": {
        "repo": "cmp-nct/acestep-5Hz-lm-4B-GGUF",
        "filename": "acestep-5Hz-lm-4B-Q8_0.gguf",
        "size_label": "~4.1 GB",
        "quality": "Q8_0 — near-lossless, best GGUF quality",
    },
    "acestep-5Hz-lm-4B-fp16": {
        "repo": "cmp-nct/acestep-5Hz-lm-4B-GGUF",
        "filename": "acestep-5Hz-lm-4B-fp16.gguf",
        "size_label": "~7.6 GB",
        "quality": "fp16 — full precision, identical to PyTorch",
    },
}


def is_gguf_model(model_name: str) -> bool:
    """Check if a model name refers to a GGUF model (contains GGUF-specific quantization tags)."""
    return model_name in GGUF_MODEL_REGISTRY


def download_gguf_model(model_name: str, checkpoint_dir: str, progress_callback=None) -> tuple:
    """Download a GGUF model from HuggingFace Hub into the checkpoint directory.

    Args:
        model_name: Model tag from GGUF_MODEL_REGISTRY (e.g. "acestep-5Hz-lm-4B-Q5_K_M")
        checkpoint_dir: Base checkpoint directory (e.g. StoragePath/models/checkpoints)
        progress_callback: Optional callable(downloaded_bytes, total_bytes) for progress

    Returns:
        (success, message) tuple
    """
    if model_name not in GGUF_MODEL_REGISTRY:
        return False, f"Unknown GGUF model: {model_name}"

    info = GGUF_MODEL_REGISTRY[model_name]
    repo_id = info["repo"]
    filename = info["filename"]

    model_dir = os.path.join(checkpoint_dir, model_name)
    target_path = os.path.join(model_dir, filename)

    # Already downloaded — verify file is not empty
    if os.path.isfile(target_path) and os.path.getsize(target_path) > 1000:
        size_mb = os.path.getsize(target_path) / (1024 ** 2)
        return True, f"Already downloaded: {filename} ({size_mb:.0f} MB)"

    os.makedirs(model_dir, exist_ok=True)

    try:
        from huggingface_hub import hf_hub_download
        print(f"[gguf-lm] Downloading {filename} from {repo_id}...", flush=True)

        downloaded_path = hf_hub_download(
            repo_id=repo_id,
            filename=filename,
            local_dir=model_dir,
            local_dir_use_symlinks=False,
        )

        # hf_hub_download may place the file directly or in a subfolder — ensure it's at the expected path
        if downloaded_path != target_path and os.path.isfile(downloaded_path):
            shutil.move(downloaded_path, target_path)

        if os.path.isfile(target_path):
            size_mb = os.path.getsize(target_path) / (1024 ** 2)
            print(f"[gguf-lm] Downloaded: {filename} ({size_mb:.0f} MB)", flush=True)
            return True, f"Downloaded: {filename} ({size_mb:.0f} MB)"
        else:
            return False, f"Download completed but file not found at {target_path}"

    except Exception as e:
        print(f"[gguf-lm] Download failed: {e}", flush=True)
        traceback.print_exc()
        return False, f"Download failed: {e}"
