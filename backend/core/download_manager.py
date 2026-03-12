"""download_manager.py — Centralized Download Manager for Demodokos Foundry (v1.0.0)

Single source of truth for model registry, downloads, and availability.
Thread-safe, supports: start, stop, retry, delete, scan, status query.

Download types handled:
  - binary:          GitHub release ZIP archives (llama.cpp framework)
  - huggingface:     Transformers snapshot-style (DiT, VAE, TextEncoder, LM)
  - huggingface_hub: Single-file GGUF downloads (GGUF LM, Creative AI)

Usage:
  from download_manager import DownloadManager
  dm = DownloadManager(catalog=DOWNLOAD_CATALOG, checkpoint_dir_fn=_get_checkpoint_dir, bin_dir=bin_dir, server_config=_server_config)
  dm.scan_all(force=True)         # Initial inventory check
  dm.download("acestep-v15-turbo") # Start a background download
  dm.is_ready("acestep-v15-turbo") # Check if model is ready
  dm.cancel("acestep-v15-turbo")   # Cancel active download
  dm.delete("acestep-v15-turbo")   # Remove model files from disk

Status flow:
  not_downloaded → downloading → complete
                              → error    (network, disk, timeout)
                              → partial  (interrupted, incomplete)
  downloading    → cancelling  → not_downloaded | partial
  error/partial  → downloading (retry)
  complete       → not_downloaded (delete)
"""

__version__ = "1.0.0"

import os
import sys
import time
import shutil
import threading
import traceback
from pathlib import Path
from typing import Dict, Optional, Callable, Tuple, Any, Set

# ─── Status Constants ────────────────────────────────────────────────────────
NOT_DOWNLOADED = "not_downloaded"
DOWNLOADING = "downloading"
COMPLETE = "complete"
PARTIAL = "partial"
ERROR = "error"
CANCELLING = "cancelling"

# Stall detection: if download bytes don't change for this many seconds, mark as stalled
STALL_TIMEOUT_SECONDS = 180
# Heartbeat interval: how often the monitor thread checks download progress (seconds)
MONITOR_INTERVAL_SECONDS = 3


class DownloadManager:
    """Thread-safe centralized download manager for all model types.

    Provides a single abstraction layer between model consumers (backends/servers) and
    the filesystem. Backends call is_ready(tag) or wait_ready(tag) before using models.
    The UI polls get_registry() for real-time status display.
    """

    def __init__(self, catalog: dict, checkpoint_dir_fn: Callable[[], str], bin_dir: str, server_config: dict):
        """Initialize the download manager.

        Args:
            catalog:          DOWNLOAD_CATALOG dict defining all downloadable models (from acestep_server.py)
            checkpoint_dir_fn: Callable returning the current checkpoint directory path (may change at runtime via config)
            bin_dir:          Path to the bin/ directory (same folder as acestep_server.py) for binary downloads
            server_config:    Server config dict (for v15_checkpoint_override and other runtime config)
        """
        self._catalog = catalog
        self._get_checkpoint_dir = checkpoint_dir_fn
        self._bin_dir = bin_dir
        self._server_config = server_config

        # Model registry: tag → entry dict with status, progress, size, error info
        self._registry: Dict[str, dict] = {}
        self._lock = threading.Lock()

        # Download concurrency control: one download at a time (serialized)
        self._download_lock = threading.Lock()
        self._active_tag: Optional[str] = None

        # Cancel events: tag → threading.Event (set=cancel requested)
        self._cancel_events: Dict[str, threading.Event] = {}

        # Download worker threads: tag → Thread
        self._download_threads: Dict[str, threading.Thread] = {}

        # Confirmed-complete cache: tags verified on disk — skipped on non-forced rescans for performance
        self._confirmed_tags: Set[str] = set()

        # Status change callback: called on every status transition — (tag, old_status, new_status, entry)
        self._on_change: Optional[Callable] = None

        # Initialize registry from catalog
        self._init_registry()

    # ─── Registry Initialization ─────────────────────────────────────────────

    def _init_registry(self):
        """Populate the model registry from the catalog. All entries start as not_downloaded."""
        with self._lock:
            for tag, cat in self._catalog.items():
                self._registry[tag] = {
                    "tag": tag,
                    "name": cat["name"],
                    "type": cat["type"],
                    "repo": cat.get("repo", ""),
                    "source_type": cat.get("source_type", ""),
                    "status": NOT_DOWNLOADED,
                    "progress": 0,
                    "size_bytes": 0,
                    "expected_bytes": cat.get("expected_size_bytes", 0),
                    "size_label": cat.get("size_label", ""),
                    "quality": cat.get("quality", ""),
                    "detail": cat.get("quality", ""),
                    "is_main": cat.get("is_main", False),
                    "required_for": cat.get("required_for", []),
                    "error_msg": "",
                    "speed_bps": 0,           # current download speed in bytes/sec
                    "stalled": False,          # True if no progress for STALL_TIMEOUT_SECONDS
                    "last_bytes_time": 0,      # last time size_bytes changed (epoch)
                    "last_bytes_value": 0,     # size_bytes at last_bytes_time
                }

    # ─── Public Query API ────────────────────────────────────────────────────

    def get_registry(self) -> dict:
        """Return the full model registry. Used by /status and /models/list endpoints.
        Returns a snapshot dict[tag, entry] — safe to iterate without holding the lock."""
        with self._lock:
            return {tag: dict(e) for tag, e in self._registry.items()}

    def get_status(self, tag: str) -> Optional[dict]:
        """Return status of a single model, or None if tag is unknown."""
        with self._lock:
            entry = self._registry.get(tag)
            return dict(entry) if entry else None

    def is_ready(self, tag: str) -> bool:
        """Check if a model is downloaded, verified, and ready for use. Non-blocking."""
        with self._lock:
            return self._registry.get(tag, {}).get("status") == COMPLETE

    def wait_ready(self, tag: str, timeout: Optional[float] = None) -> bool:
        """Block until a model is ready. Returns True if ready, False on timeout or terminal error.
        If the model is in error/not_downloaded state and not being retried, returns False immediately."""
        start = time.time()
        while True:
            status = self.get_status(tag)
            if not status:
                return False
            if status["status"] == COMPLETE:
                return True
            # Terminal states: no download in progress, won't become ready on its own
            if status["status"] in (ERROR, NOT_DOWNLOADED) and tag not in self._download_threads:
                return False
            if timeout and (time.time() - start) > timeout:
                return False
            time.sleep(1)

    def get_active_download(self) -> Optional[str]:
        """Return the tag of the currently active download, or None if idle."""
        return self._active_tag

    # ─── Public Download API ─────────────────────────────────────────────────

    def download(self, tag: str, blocking: bool = False) -> Tuple[bool, str]:
        """Start downloading a model. Thread-safe, serialized (one download at a time).

        Args:
            tag:      Model tag from the catalog
            blocking: If True, waits for download completion. If False, starts background thread.

        Returns:
            (success, message) tuple. For blocking=False, success=True means download was queued/started.
        """
        if tag not in self._registry:
            return False, f"Unknown model tag: {tag}"

        entry = self._registry.get(tag)
        if entry["status"] == COMPLETE:
            return True, "Model already downloaded and ready"

        if entry["status"] == DOWNLOADING:
            if blocking:
                # Wait for existing download to finish
                thread = self._download_threads.get(tag)
                if thread and thread.is_alive():
                    thread.join()
                return entry["status"] == COMPLETE, entry.get("detail", "")
            return False, f"Download already in progress: {entry.get('detail', '')}"

        if blocking:
            return self._download_sync(tag)
        else:
            return self._download_async(tag)

    def cancel(self, tag: str) -> Tuple[bool, str]:
        """Cancel an active download. Returns (ok, msg). Non-blocking — sets cancel flag, cleanup happens in worker thread."""
        entry = self._registry.get(tag)
        if not entry:
            return False, f"Unknown model tag: {tag}"

        if entry["status"] != DOWNLOADING:
            return False, f"Model is not downloading (status: {entry['status']})"

        # Set cancel event — the download worker thread checks this and exits
        cancel_event = self._cancel_events.get(tag)
        if cancel_event:
            cancel_event.set()
            self._set_status(tag, CANCELLING, detail="Cancelling download...")
            print(f"[download-mgr] Cancel requested for: {tag}", flush=True)
            return True, "Cancel requested"

        return False, "No active download thread for this model"

    def retry(self, tag: str, blocking: bool = False) -> Tuple[bool, str]:
        """Retry a failed or partial download. Equivalent to download() but explicitly for error/partial states."""
        entry = self._registry.get(tag)
        if not entry:
            return False, f"Unknown model tag: {tag}"

        if entry["status"] not in (ERROR, PARTIAL, NOT_DOWNLOADED):
            return False, f"Cannot retry: model status is {entry['status']}"

        # Reset error state before retrying
        self._set_status(tag, NOT_DOWNLOADED, detail="Preparing retry...", error_msg="")
        return self.download(tag, blocking=blocking)

    def delete(self, tag: str) -> Tuple[bool, str]:
        """Delete model files from disk and reset registry to not_downloaded. Returns (ok, msg).
        Cancels any active download first. Does NOT delete partial/temp files from HuggingFace cache."""
        entry = self._registry.get(tag)
        if not entry:
            return False, f"Unknown model tag: {tag}"

        # Cancel if currently downloading
        if entry["status"] in (DOWNLOADING, CANCELLING):
            self.cancel(tag)
            thread = self._download_threads.get(tag)
            if thread and thread.is_alive():
                thread.join(timeout=10)

        cat = self._catalog.get(tag, {})
        entry_type = cat.get("type", "")

        try:
            # Determine the model directory to delete
            if entry_type == "binary":
                model_dir = os.path.join(self._bin_dir, "llama")
            else:
                checkpoint_dir = self._get_checkpoint_dir()
                if not checkpoint_dir:
                    return False, "Checkpoint directory not configured"
                model_dir = os.path.join(checkpoint_dir, tag)

            if os.path.isdir(model_dir):
                shutil.rmtree(model_dir, ignore_errors=True)
                print(f"[download-mgr] Deleted model directory: {model_dir}", flush=True)
            else:
                print(f"[download-mgr] No directory to delete for: {tag} ({model_dir})", flush=True)

            # Remove from confirmed cache and reset registry
            self._confirmed_tags.discard(tag)
            self._set_status(tag, NOT_DOWNLOADED, progress=0, size_bytes=0, detail="Deleted", error_msg="")
            return True, f"Model {tag} deleted"

        except Exception as e:
            self._set_status(tag, ERROR, detail=f"Delete failed: {e}", error_msg=str(e))
            return False, f"Delete failed: {e}"

    # ─── Public Scan API ─────────────────────────────────────────────────────

    def scan_all(self, force: bool = False) -> dict:
        """Scan disk for all model statuses. Updates registry in-place. Returns dict[tag, status_str].

        force=True: clears confirmed cache, re-checks every model from disk.
        force=False: skips models already confirmed complete (fast path for periodic checks).
        """
        if force:
            self._confirmed_tags.clear()

        checkpoint_dir = self._get_checkpoint_dir()
        results = {}

        for tag in list(self._registry.keys()):
            entry = self._registry.get(tag)
            if not entry:
                continue

            # Skip confirmed-complete models on non-forced scans
            if tag in self._confirmed_tags:
                results[tag] = COMPLETE
                continue

            # Never overwrite active download status
            if entry["status"] in (DOWNLOADING, CANCELLING):
                results[tag] = entry["status"]
                continue

            # Check disk status
            status, progress, size_bytes, detail = self._check_disk_status(tag)
            self._set_status(tag, status, progress=progress, size_bytes=size_bytes, detail=detail)

            if status == COMPLETE:
                self._confirmed_tags.add(tag)

            results[tag] = status

        return results

    def scan_one(self, tag: str) -> Optional[dict]:
        """Scan a single model from disk. Returns updated entry dict or None if unknown."""
        if tag not in self._registry:
            return None

        entry = self._registry.get(tag)
        if entry["status"] in (DOWNLOADING, CANCELLING):
            return dict(entry)

        status, progress, size_bytes, detail = self._check_disk_status(tag)
        self._set_status(tag, status, progress=progress, size_bytes=size_bytes, detail=detail)

        if status == COMPLETE:
            self._confirmed_tags.add(tag)
        else:
            self._confirmed_tags.discard(tag)

        return self.get_status(tag)

    # ─── Callback Registration ───────────────────────────────────────────────

    def set_on_change(self, callback: Optional[Callable]):
        """Register a callback for status changes. callback(tag, old_status, new_status, entry)."""
        self._on_change = callback

    # ─── Internal: Status Management ─────────────────────────────────────────

    def _set_status(self, tag: str, status: str, **kwargs):
        """Thread-safe status update with change notification. Only updates fields provided in kwargs."""
        with self._lock:
            entry = self._registry.get(tag)
            if not entry:
                return
            old_status = entry["status"]
            entry["status"] = status
            for k, v in kwargs.items():
                if k in entry:
                    entry[k] = v
            # Reset stall flag on any status transition
            if old_status != status:
                entry["stalled"] = False

        # Notify callback outside the lock to avoid deadlocks
        if old_status != status and self._on_change:
            try:
                self._on_change(tag, old_status, status, dict(entry))
            except Exception:
                pass  # callbacks must never crash the manager

    # ─── Internal: Disk Status Check ─────────────────────────────────────────

    def _check_disk_status(self, tag: str) -> Tuple[str, int, int, str]:
        """Check if a model's files exist and are complete on disk.
        Returns (status, progress, size_bytes, detail). Never downloads, never raises."""
        cat = self._catalog.get(tag)
        if not cat:
            return ERROR, 0, 0, f"Unknown catalog tag: {tag}"

        entry_type = cat["type"]
        expected = cat.get("expected_size_bytes", 0)

        try:
            # Binary type: check demodokos_gguf.exe + version match
            if entry_type == "binary":
                return self._check_binary(tag, cat)

            checkpoint_dir = self._get_checkpoint_dir()
            if not checkpoint_dir:
                return NOT_DOWNLOADED, 0, 0, "Checkpoint directory not configured"

            model_dir = os.path.join(checkpoint_dir, tag)

            # GGUF single-file models: look for the specific .gguf filename
            if entry_type in ("lm_gguf", "creative_ai"):
                return self._check_gguf(tag, cat, model_dir, expected)

            # Transformers weight files: look for .safetensors / .bin
            if entry_type in ("dit", "lm", "vae", "text_encoder"):
                return self._check_transformers(tag, cat, model_dir, expected)

        except Exception as e:
            return ERROR, 0, 0, f"Check error: {e}"

        return NOT_DOWNLOADED, 0, 0, "Unknown catalog type"

    def _check_binary(self, tag: str, cat: dict) -> Tuple[str, int, int, str]:
        """Check binary (llama.cpp framework) availability — exe exists + version match + CUDA family match + mtime integrity.
        Version file uses '{build_tag}-{cuda_family}' format (e.g., 'b8192-cu131'). Old format ('b7989') also handled.
        Mtime integrity: exe must be at least as recent as version.txt — catches failed upgrades where version.txt was written but exe rename failed (e.g., locked by running process).
        Also updates registry name to show the detected CUDA family and release for PM display."""
        llama_dir = os.path.join(self._bin_dir, "llama")
        exe_path = os.path.join(llama_dir, "demodokos_gguf.exe")
        version_file = os.path.join(llama_dir, "version.txt")
        expected = cat.get("expected_size_bytes", 0)
        required_build = cat.get("build_tag", "")

        # Detect system's optimal CUDA family for full version comparison (cached — fast after first call)
        try:
            from acestep_gguf_lm import _detect_cuda_family
            detected_cuda = _detect_cuda_family()
        except ImportError:
            detected_cuda = "cu124"

        # Human-readable CUDA label: cu131 → "CUDA 13.1", cu124 → "CUDA 12.4"
        cuda_label = f"CUDA {detected_cuda[2:-1]}.{detected_cuda[-1]}" if len(detected_cuda) >= 4 else detected_cuda

        # Update the PM display name to reflect the detected CUDA family and release
        with self._lock:
            entry = self._registry.get(tag)
            if entry:
                entry["name"] = f"GGUF Runtime — {cuda_label} (release {required_build})"

        expected_version = f"{required_build}-{detected_cuda}"  # e.g., "b8182-cu131"

        if not os.path.isfile(exe_path):
            return NOT_DOWNLOADED, 0, 0, f"Not installed — will download llama.cpp {required_build} ({cuda_label})"

        installed_tag = ""
        if os.path.isfile(version_file):
            try:
                installed_tag = open(version_file).read().strip()
            except OSError:
                pass

        if installed_tag != expected_version:
            actual = self._get_dir_size(llama_dir)
            pct = min(90, int(actual * 100 // expected)) if expected > 0 else 50

            # Parse installed version to determine what specifically mismatched for a clear PM detail message
            if "-" in installed_tag:
                inst_build, inst_cuda = installed_tag.rsplit("-", 1)
            else:
                inst_build, inst_cuda = installed_tag, ""  # old format (build tag only, no CUDA family)

            mismatches = []
            if inst_build != required_build:
                mismatches.append(f"release {inst_build} → {required_build}")
            if inst_cuda != detected_cuda:
                old_label = f"CUDA {inst_cuda[2:-1]}.{inst_cuda[-1]}" if len(inst_cuda) >= 4 else (inst_cuda or "unknown")
                mismatches.append(f"{old_label} → {cuda_label}")

            detail = f"Update needed: {', '.join(mismatches)}" if mismatches else f"Version mismatch: {installed_tag!r} → {expected_version!r}"
            return PARTIAL, pct, actual, detail

        # Mtime integrity check: exe must be at least as recent as version.txt.
        # Catches failed upgrades where version.txt was written but the binary rename failed (e.g., file locked by running GGUF process).
        try:
            exe_mtime = os.path.getmtime(exe_path)
            ver_mtime = os.path.getmtime(version_file)
            if exe_mtime < ver_mtime - 60:  # 60s tolerance for extraction time
                actual = self._get_dir_size(llama_dir)
                return PARTIAL, 90, actual, f"Binary stale (failed upgrade?) — re-download needed"
        except OSError:
            pass  # can't stat files — proceed, integrity unknown

        actual = self._get_dir_size(llama_dir)
        return COMPLETE, 100, actual, f"llama.cpp {required_build} • {cuda_label}"

    def _check_gguf(self, tag: str, cat: dict, model_dir: str, expected: int) -> Tuple[str, int, int, str]:
        """Check GGUF single-file model — look for the expected .gguf filename."""
        expected_filename = cat.get("filename", "")
        target_file = os.path.join(model_dir, expected_filename) if expected_filename else None

        # Check exact filename first
        if target_file and os.path.isfile(target_file) and os.path.getsize(target_file) > 1000:
            size = os.path.getsize(target_file)
            return COMPLETE, 100, size, f"{expected_filename} ({size / 1024**3:.1f} GB)"

        # Fallback: any .gguf file in the directory (handles renames)
        if os.path.isdir(model_dir):
            gguf_files = [f for f in os.listdir(model_dir) if f.endswith(".gguf") and os.path.getsize(os.path.join(model_dir, f)) > 1000]
            if gguf_files:
                size = os.path.getsize(os.path.join(model_dir, gguf_files[0]))
                return COMPLETE, 100, size, f"{gguf_files[0]} ({size / 1024**3:.1f} GB)"

            # Directory exists but no complete .gguf file — check for partial download
            actual = self._get_dir_size(model_dir)
            if actual > 0:
                pct = min(99, int(actual * 100 // expected)) if expected else 0
                return PARTIAL, pct, actual, f"Partial: {actual / 1024**3:.1f}/{expected / 1024**3:.1f} GB"

        return NOT_DOWNLOADED, 0, 0, cat.get("size_label", "")

    def _check_transformers(self, tag: str, cat: dict, model_dir: str, expected: int) -> Tuple[str, int, int, str]:
        """Check transformers-style model — look for .safetensors / .bin weight files."""
        if not os.path.isdir(model_dir):
            return NOT_DOWNLOADED, 0, 0, "Directory not found"

        try:
            all_files = os.listdir(model_dir)
        except OSError:
            return ERROR, 0, 0, "Cannot read model directory"

        weight_files = [f for f in all_files if f.endswith((".safetensors", ".bin", ".ckpt"))]
        if weight_files:
            zero_size = [f for f in weight_files if os.path.getsize(os.path.join(model_dir, f)) == 0]
            if zero_size:
                return PARTIAL, 0, 0, f"{len(zero_size)} empty weight file(s) — corrupted download"
            total = sum(os.path.getsize(os.path.join(model_dir, f)) for f in weight_files)
            return COMPLETE, 100, total, f"{len(weight_files)} weight file(s), {total / 1024**3:.1f} GB"

        # No weight files: check if partial data exists (temp files, metadata-only dir)
        actual = self._get_dir_size(model_dir)
        if actual > 0:
            pct = min(99, int(actual * 100 // expected)) if expected else 0
            return PARTIAL, pct, actual, f"Partial: {actual / 1024**3:.1f}/{expected / 1024**3:.1f} GB"

        return NOT_DOWNLOADED, 0, 0, "Config only, no weights downloaded"

    # ─── Internal: Download Execution ────────────────────────────────────────

    def _download_sync(self, tag: str) -> Tuple[bool, str]:
        """Synchronous download — blocks until complete. Used by model loaders and auto-load."""
        cancel_event = threading.Event()
        self._cancel_events[tag] = cancel_event
        self._set_status(tag, DOWNLOADING, progress=0, detail="Starting download...", error_msg="")

        # Start progress monitor in background
        monitor = threading.Thread(target=self._monitor_progress, args=(tag, cancel_event), daemon=True, name=f"dm-monitor-{tag}")
        monitor.start()

        with self._download_lock:
            self._active_tag = tag
            try:
                ok, msg = self._do_download(tag, cancel_event)
                if cancel_event.is_set():
                    self._set_status(tag, PARTIAL if self._has_partial_data(tag) else NOT_DOWNLOADED, detail="Download cancelled")
                    return False, "Download cancelled"
                if ok:
                    # Post-download disk verification
                    status, progress, size_bytes, detail = self._check_disk_status(tag)
                    if status == COMPLETE:
                        self._set_status(tag, COMPLETE, progress=100, size_bytes=size_bytes, detail=detail)
                        self._confirmed_tags.add(tag)
                    else:
                        # Downloader reported success but disk check disagrees — trust the downloader (HF cache architecture)
                        self._set_status(tag, COMPLETE, progress=100, detail=f"Downloaded (via HF cache)")
                        self._confirmed_tags.add(tag)
                    return True, msg
                else:
                    self._set_status(tag, ERROR, detail=f"Download failed: {msg}", error_msg=msg)
                    return False, msg
            except Exception as e:
                self._set_status(tag, ERROR, detail=f"Download error: {e}", error_msg=str(e))
                traceback.print_exc()
                return False, str(e)
            finally:
                self._active_tag = None
                cancel_event.set()  # signal monitor to stop
                self._cancel_events.pop(tag, None)
                self._download_threads.pop(tag, None)

    def _download_async(self, tag: str) -> Tuple[bool, str]:
        """Asynchronous download — starts background thread, returns immediately."""
        cancel_event = threading.Event()
        self._cancel_events[tag] = cancel_event
        self._set_status(tag, DOWNLOADING, progress=0, detail="Queued for download...", error_msg="")

        def _worker():
            # Start progress monitor alongside the worker
            monitor = threading.Thread(target=self._monitor_progress, args=(tag, cancel_event), daemon=True, name=f"dm-monitor-{tag}")
            monitor.start()

            with self._download_lock:
                self._active_tag = tag
                try:
                    # Re-check: might have been cancelled while waiting for lock
                    if cancel_event.is_set():
                        self._set_status(tag, PARTIAL if self._has_partial_data(tag) else NOT_DOWNLOADED, detail="Download cancelled before start")
                        return

                    ok, msg = self._do_download(tag, cancel_event)
                    if cancel_event.is_set():
                        self._set_status(tag, PARTIAL if self._has_partial_data(tag) else NOT_DOWNLOADED, detail="Download cancelled")
                        return

                    if ok:
                        status, progress, size_bytes, detail = self._check_disk_status(tag)
                        if status == COMPLETE:
                            self._set_status(tag, COMPLETE, progress=100, size_bytes=size_bytes, detail=detail)
                            self._confirmed_tags.add(tag)
                        else:
                            self._set_status(tag, COMPLETE, progress=100, detail=f"Downloaded (via HF cache)")
                            self._confirmed_tags.add(tag)
                    else:
                        self._set_status(tag, ERROR, detail=f"Download failed: {msg}", error_msg=msg)

                except Exception as e:
                    self._set_status(tag, ERROR, detail=f"Download error: {e}", error_msg=str(e))
                    traceback.print_exc()
                finally:
                    self._active_tag = None
                    cancel_event.set()  # signal monitor to stop
                    self._cancel_events.pop(tag, None)
                    self._download_threads.pop(tag, None)

        thread = threading.Thread(target=_worker, daemon=True, name=f"dm-download-{tag}")
        self._download_threads[tag] = thread
        thread.start()
        return True, f"Download started: {tag}"

    def _do_download(self, tag: str, cancel_event: threading.Event) -> Tuple[bool, str]:
        """Execute the actual download. Dispatches to type-specific handlers. Returns (ok, msg)."""
        cat = self._catalog.get(tag)
        if not cat:
            return False, f"No catalog entry for: {tag}"

        entry = self._registry.get(tag)
        source_type = cat.get("source_type", "")
        entry_type = cat.get("type", "")

        self._set_status(tag, DOWNLOADING, detail=f"Downloading {cat['name']}...")
        print(f"[download-mgr] Starting download: {tag} (type={entry_type}, source={source_type})", flush=True)

        # Dispatch to type-specific download handler
        if source_type == "github_release" or entry_type == "binary":
            return self._download_binary_type(tag, cat, cancel_event)
        elif source_type == "huggingface_hub" or entry_type in ("lm_gguf", "creative_ai"):
            return self._download_hf_hub_type(tag, cat, cancel_event)
        elif source_type == "huggingface" or entry_type in ("dit", "lm", "vae", "text_encoder"):
            return self._download_hf_snapshot_type(tag, cat, cancel_event)
        else:
            return False, f"Unsupported source type: {source_type} / {entry_type}"

    # ─── Type-Specific Download Handlers ─────────────────────────────────────

    def _download_binary_type(self, tag: str, cat: dict, cancel_event: threading.Event) -> Tuple[bool, str]:
        """Download binary framework (llama.cpp) from GitHub releases. Stops all running GGUF servers first (file locks prevent upgrade on Windows), then downloads two ZIP archives and extracts them."""
        try:
            from acestep_gguf_lm import _ensure_llama_server, kill_all_gguf_processes

            # Stop all running GGUF server processes BEFORE download — Windows locks exe+DLL files while processes run.
            # _ensure_llama_server_locked also kills processes, but doing it here gives the GGUFLLMHandler's in-process
            # state a chance to be updated by the caller (acestep_server.py) before we nuke the binary.
            killed = kill_all_gguf_processes()
            if killed > 0:
                import time as _time
                _time.sleep(1.5)  # let Windows release file handles after process termination
                print(f"[download-mgr] Stopped {killed} GGUF server(s) before framework upgrade", flush=True)

            expected_bytes = cat.get("expected_size_bytes", 0) or 1_100_000_000  # catalog says ~1.1 GB extracted
            start_time = time.time()

            # Progress callback: updates registry entry so the C# PM overlay shows real-time download bytes
            def _binary_progress(downloaded_bytes, _total_unused):
                elapsed = time.time() - start_time
                progress = min(95, int(downloaded_bytes * 100 / expected_bytes)) if expected_bytes > 0 else 0  # cap at 95% — extraction brings it to 100%
                speed_bps = int(downloaded_bytes / elapsed) if elapsed > 1 else 0
                speed_str = f"{speed_bps / 1024**2:.1f} MB/s" if speed_bps > 1024**2 else f"{speed_bps / 1024:.0f} KB/s"
                detail = f"Downloading: {downloaded_bytes / 1024**3:.2f}/{expected_bytes / 1024**3:.2f} GB ({progress}%) @ {speed_str}"
                self._set_status(tag, DOWNLOADING, progress=progress, size_bytes=downloaded_bytes, detail=detail, speed_bps=speed_bps)

            self._set_status(tag, DOWNLOADING, detail="Downloading LM runtime (llama.cpp)...")
            exe_path = _ensure_llama_server(self._bin_dir, progress_callback=_binary_progress)
            return True, f"LM runtime installed: {exe_path}"
        except RuntimeError as e:
            print(f"[download-mgr] llama_framework RuntimeError: {e}", flush=True)
            return False, str(e)
        except Exception as e:
            import traceback
            print(f"[download-mgr] llama_framework unexpected error: {e}\n{traceback.format_exc()}", flush=True)
            return False, f"Binary download failed: {e}"

    def _download_hf_hub_type(self, tag: str, cat: dict, cancel_event: threading.Event) -> Tuple[bool, str]:
        """Download a single GGUF file from HuggingFace via chunked HTTP — supports real-time progress, instant cancel, and resume."""
        repo_id = cat.get("repo", "")
        filename = cat.get("filename", "")
        if not repo_id or not filename:
            return False, f"Missing repo or filename for: {tag}"

        checkpoint_dir = self._get_checkpoint_dir()
        if not checkpoint_dir:
            return False, "Checkpoint directory not configured"

        model_dir = os.path.join(checkpoint_dir, tag)
        target_path = os.path.join(model_dir, filename)

        # Already complete — verify file is not empty
        if os.path.isfile(target_path) and os.path.getsize(target_path) > 1000:
            size_mb = os.path.getsize(target_path) / (1024 ** 2)
            return True, f"Already downloaded: {filename} ({size_mb:.0f} MB)"

        os.makedirs(model_dir, exist_ok=True)

        try:
            import requests as _req
            url = f"https://huggingface.co/{repo_id}/resolve/main/{filename}"
            temp_path = target_path + ".incomplete"

            # Resume support: continue from partial .incomplete file if it exists
            resume_size = 0
            req_headers = {"User-Agent": "demodokos-foundry/1.0"}
            if os.path.isfile(temp_path):
                resume_size = os.path.getsize(temp_path)
                if resume_size > 0:
                    req_headers["Range"] = f"bytes={resume_size}-"
                    print(f"[download-mgr] Resuming {filename} from {resume_size / 1024**3:.2f} GB", flush=True)

            self._set_status(tag, DOWNLOADING, detail=f"Connecting to huggingface.co/{repo_id}...")
            print(f"[download-mgr] Chunked download: {filename} from {repo_id}", flush=True)

            resp = _req.get(url, stream=True, allow_redirects=True, headers=req_headers, timeout=30)
            resp.raise_for_status()

            # Parse total size from Content-Length (for resumed downloads, this is the remaining bytes)
            content_length = int(resp.headers.get("content-length", 0))
            total_size = resume_size + content_length
            expected = cat.get("expected_size_bytes", 0) or total_size

            chunk_size = 8 * 1024 * 1024  # 8 MB chunks — balance between progress granularity and throughput
            downloaded = resume_size
            start_time = time.time()
            last_report_time = start_time

            file_mode = "ab" if resume_size > 0 else "wb"
            with open(temp_path, file_mode) as f:
                for chunk in resp.iter_content(chunk_size=chunk_size):
                    # Cancel check between every chunk — gives ~instant response to cancel requests
                    if cancel_event.is_set():
                        print(f"[download-mgr] Download cancelled: {tag} ({downloaded / 1024**3:.2f} GB written)", flush=True)
                        return False, "Cancelled"

                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)

                        # Throttle status updates to every ~1s to avoid lock contention while keeping UI responsive
                        now = time.time()
                        if now - last_report_time >= 1.0:
                            elapsed = now - start_time
                            progress = min(99, int(downloaded * 100 / expected)) if expected > 0 else 0
                            speed_bps = int((downloaded - resume_size) / elapsed) if elapsed > 0 else 0
                            speed_str = f"{speed_bps / 1024**2:.1f} MB/s" if speed_bps > 1024**2 else f"{speed_bps / 1024:.0f} KB/s"
                            mins, secs = divmod(int(elapsed), 60)
                            elapsed_str = f"{mins}m{secs:02d}s" if mins > 0 else f"{secs}s"
                            detail = f"Downloading: {downloaded / 1024**3:.2f}/{expected / 1024**3:.2f} GB ({progress}%, {elapsed_str}) @ {speed_str}"
                            self._set_status(tag, DOWNLOADING, progress=progress, size_bytes=downloaded, detail=detail, speed_bps=speed_bps)
                            last_report_time = now

            # Final cancel check after download loop completes
            if cancel_event.is_set():
                return False, "Cancelled"

            # Atomic rename: .incomplete → final target (prevents partial files from being used)
            if os.path.isfile(target_path):
                os.remove(target_path)
            os.rename(temp_path, target_path)

            final_size = os.path.getsize(target_path)
            elapsed = time.time() - start_time
            speed_avg = (final_size - resume_size) / elapsed if elapsed > 0 else 0
            print(f"[download-mgr] Download complete: {filename} ({final_size / 1024**2:.0f} MB) in {elapsed:.0f}s @ {speed_avg / 1024**2:.1f} MB/s", flush=True)
            return True, f"Downloaded: {filename} ({final_size / 1024**2:.0f} MB)"

        except Exception as e:
            if cancel_event.is_set():
                return False, "Cancelled"
            print(f"[download-mgr] Chunked download failed for {tag}: {e}", flush=True)
            traceback.print_exc()
            return False, f"Download failed: {e}"

    def _download_hf_snapshot_type(self, tag: str, cat: dict, cancel_event: threading.Event) -> Tuple[bool, str]:
        """Download a transformers-style model via acestep's model_downloader (HuggingFace snapshots).
        Handles main model bundles (DiT+VAE+TextEncoder) and individual submodels."""
        try:
            import acestep.model_downloader as _mdn
            from acestep.model_downloader import download_main_model, download_submodel
        except ImportError as e:
            return False, f"acestep.model_downloader not available: {e}"

        checkpoint_dir = Path(self._get_checkpoint_dir())
        if not checkpoint_dir:
            return False, "Checkpoint directory not configured"

        entry = self._registry.get(tag, {})
        is_main = entry.get("is_main", False)

        self._set_status(tag, DOWNLOADING, detail=f"Downloading from HuggingFace...")
        print(f"[download-mgr] HF snapshot download: {tag} (is_main={is_main})", flush=True)

        try:
            if is_main:
                # Patch HuggingFace downloader to skip the Python transformer LM (we use GGUF LMs instead — saves ~3.6 GB)
                _orig_hf_dl = _mdn._download_from_huggingface_internal
                def _hf_dl_skip_lm(repo_id, local_dir, token=None):
                    from huggingface_hub import snapshot_download
                    snapshot_download(repo_id=repo_id, local_dir=str(local_dir), local_dir_use_symlinks=False, token=token, ignore_patterns=["acestep-5Hz-lm-1.7B/**"])
                _mdn._download_from_huggingface_internal = _hf_dl_skip_lm
                try:
                    ok, msg = download_main_model(checkpoint_dir, force=True, prefer_source="huggingface")
                finally:
                    _mdn._download_from_huggingface_internal = _orig_hf_dl
            else:
                ok, msg = download_submodel(tag, checkpoint_dir, force=True, prefer_source="huggingface")

            if cancel_event.is_set():
                return False, "Cancelled"

            if ok:
                # Main model downloads also fetch VAE, text encoder — rescan all main components
                if is_main:
                    for comp_tag in [t for t, c in self._catalog.items() if c.get("is_main")]:
                        self.scan_one(comp_tag)
                print(f"[download-mgr] HF snapshot download complete: {tag} — {msg}", flush=True)
                return True, msg
            else:
                return False, msg

        except Exception as e:
            if cancel_event.is_set():
                return False, "Cancelled"
            print(f"[download-mgr] HF snapshot download failed for {tag}: {e}", flush=True)
            traceback.print_exc()
            return False, f"Download failed: {e}"

    # ─── Internal: Progress Monitor ──────────────────────────────────────────

    def _monitor_progress(self, tag: str, cancel_event: threading.Event):
        """Background thread that monitors download progress, updates size_bytes, detects stalls.
        Runs alongside every download worker. Exits when cancel_event is set or download finishes."""
        last_size = 0
        last_size_time = time.time()
        start_time = time.time()

        while not cancel_event.is_set():
            time.sleep(MONITOR_INTERVAL_SECONDS)
            if cancel_event.is_set():
                break

            entry = self._registry.get(tag)
            if not entry or entry["status"] not in (DOWNLOADING, CANCELLING):
                break

            # Measure current download size from disk
            current_size = self._measure_download_size(tag)
            elapsed = time.time() - start_time
            mins, secs = divmod(int(elapsed), 60)
            elapsed_str = f"{mins}m{secs:02d}s" if mins > 0 else f"{secs}s"
            expected = entry.get("expected_bytes", 0)

            # Calculate progress percentage
            progress = 0
            if expected > 0 and current_size > 0:
                progress = min(99, int(current_size * 100 / expected))

            # Calculate download speed (bytes per second, smoothed over last interval)
            speed_bps = 0
            if current_size > last_size:
                dt = time.time() - last_size_time
                if dt > 0:
                    speed_bps = int((current_size - last_size) / dt)
                last_size = current_size
                last_size_time = time.time()

            # Stall detection: no size change for STALL_TIMEOUT_SECONDS
            stalled = (time.time() - last_size_time) > STALL_TIMEOUT_SECONDS and current_size > 0

            # Build human-readable detail string
            if expected > 0:
                detail = f"Downloading: {current_size / 1024**3:.1f}/{expected / 1024**3:.1f} GB ({progress}%, {elapsed_str})"
            else:
                size_str = f"{current_size / 1024**3:.1f} GB" if current_size > 0 else ""
                detail = f"Downloading: {size_str} ({elapsed_str} elapsed)"

            if speed_bps > 0:
                if speed_bps > 1024**2:
                    detail += f" @ {speed_bps / 1024**2:.1f} MB/s"
                else:
                    detail += f" @ {speed_bps / 1024:.0f} KB/s"

            if stalled:
                detail += " ⚠ STALLED"

            # Update registry (thread-safe via _set_status which uses the lock)
            # When the download handler reports progress directly (speed_bps > 0 in entry), defer to it
            # — its byte-accurate progress is more precise than periodic disk scanning. Only update stall flag.
            with self._lock:
                handler_active = entry.get("speed_bps", 0) > 0
                if not handler_active:
                    entry["progress"] = progress
                    entry["size_bytes"] = current_size
                    entry["detail"] = detail
                    entry["speed_bps"] = speed_bps
                entry["stalled"] = stalled

            # Print periodic status to Python stdout (picked up by C# log)
            print(f"[STATUS] {detail}", flush=True)

    def _measure_download_size(self, tag: str) -> int:
        """Measure current download size on disk for a given model tag."""
        cat = self._catalog.get(tag, {})
        entry_type = cat.get("type", "")

        if entry_type == "binary":
            return self._get_dir_size(os.path.join(self._bin_dir, "llama"))

        checkpoint_dir = self._get_checkpoint_dir()
        if not checkpoint_dir:
            return 0

        # For main model downloads, sum all main component directories
        entry = self._registry.get(tag, {})
        if entry.get("is_main"):
            total = 0
            for comp_tag, comp_cat in self._catalog.items():
                if comp_cat.get("is_main"):
                    comp_dir = os.path.join(checkpoint_dir, comp_tag)
                    total += self._get_dir_size(comp_dir)
            return total

        return self._get_dir_size(os.path.join(checkpoint_dir, tag))

    # ─── Internal: Utility ───────────────────────────────────────────────────

    def _has_partial_data(self, tag: str) -> bool:
        """Check if a model has any partial download data on disk (for determining post-cancel status)."""
        cat = self._catalog.get(tag, {})
        entry_type = cat.get("type", "")

        if entry_type == "binary":
            return os.path.isdir(os.path.join(self._bin_dir, "llama"))

        checkpoint_dir = self._get_checkpoint_dir()
        if not checkpoint_dir:
            return False
        model_dir = os.path.join(checkpoint_dir, tag)
        return os.path.isdir(model_dir) and self._get_dir_size(model_dir) > 0

    @staticmethod
    def _get_dir_size(path: str) -> int:
        """Recursively compute total file size in bytes for a directory."""
        total = 0
        try:
            for dirpath, _, filenames in os.walk(path):
                for f in filenames:
                    try:
                        total += os.path.getsize(os.path.join(dirpath, f))
                    except OSError:
                        pass
        except OSError:
            pass
        return total
