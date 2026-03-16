"""
GPU Memory Management Module
- VRAM monitoring with history tracking
- Cache size detection
- Per-model VRAM tracking
- Auto-cleanup and alerts
"""

import torch
import time
import os
from collections import deque
from typing import Dict, List, Optional, Any
from datetime import datetime


class GPUMemoryManager:
    """Manages GPU VRAM monitoring, history, and cleanup operations."""
    
    def __init__(self, history_size: int = 60):
        """
        Initialize GPU Memory Manager.
        
        Args:
            history_size: Number of VRAM samples to keep (default: 60 for 60s history at 1s interval)
        """
        self.history_size = history_size
        self.vram_history: deque = deque(maxlen=history_size)
        self.loaded_models: Dict[str, Dict[str, Any]] = {}
        self.cache_sizes: Dict[str, int] = {}
        self._last_cleanup = 0
        
    def get_vram_info(self) -> Dict[str, Any]:
        """Get current VRAM information."""
        if not torch.cuda.is_available():
            return {
                "available": False,
                "total_gb": 0,
                "free_gb": 0,
                "allocated_gb": 0,
                "usage_percent": 0,
            }
        
        total_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        allocated_gb = torch.cuda.memory_allocated() / (1024**3)
        reserved_gb = torch.cuda.memory_reserved() / (1024**3)
        free_gb = total_gb - (allocated_gb + reserved_gb)
        usage_percent = (allocated_gb / total_gb) * 100 if total_gb > 0 else 0
        
        return {
            "available": True,
            "total_gb": round(total_gb, 2),
            "free_gb": round(free_gb, 2),
            "allocated_gb": round(allocated_gb, 2),
            "reserved_gb": round(reserved_gb, 2),
            "usage_percent": round(usage_percent, 1),
            "timestamp": datetime.now().isoformat(),
        }
    
    def record_vram_sample(self) -> Dict[str, Any]:
        """Record a VRAM sample to history."""
        info = self.get_vram_info()
        sample = {
            "timestamp": time.time(),
            "allocated_gb": info["allocated_gb"],
            "free_gb": info["free_gb"],
            "usage_percent": info["usage_percent"],
        }
        self.vram_history.append(sample)
        return sample
    
    def get_vram_history(self) -> List[Dict[str, Any]]:
        """Get VRAM history samples."""
        if not self.vram_history:
            self.record_vram_sample()
        return list(self.vram_history)
    
    def get_vram_alerts(self) -> List[Dict[str, Any]]:
        """Check VRAM usage and return alerts if thresholds exceeded."""
        alerts = []
        info = self.get_vram_info()
        
        if not info["available"]:
            return alerts
        
        usage = info["usage_percent"]
        
        if usage >= 95:
            alerts.append({
                "severity": "critical",
                "message": f"VRAM usage critical: {usage:.1f}% - Risk of OOM errors",
                "action": "Unload models or clear cache immediately"
            })
        elif usage >= 85:
            alerts.append({
                "severity": "warning",
                "message": f"VRAM usage high: {usage:.1f}% - Consider clearing cache",
                "action": "Run cleanup or unload unused models"
            })
        elif usage >= 75:
            alerts.append({
                "severity": "info",
                "message": f"VRAM usage moderate: {usage:.1f}%",
                "action": "No action needed"
            })
            
        return alerts
    
    def get_cache_size(self) -> Dict[str, Any]:
        """
        Get cache size for various cache directories.
        
        Returns cache sizes for:
        - ACE-Step cache
        - Torch cache
        - Backend temp files
        """
        cache_dirs = {
            "acestep_cache": r"D:\VocalForge\ace-step\.cache",
            "torch_cache": os.environ.get("TORCH_HOME", r"C:\Users\gigid\.cache\torch"),
            "backend_temp": r"D:\VocalForge\backend\temp",
            "backend_output": r"D:\VocalForge\backend\output",
        }
        
        sizes = {}
        total_bytes = 0
        
        for name, path in cache_dirs.items():
            size_bytes = self._get_dir_size(path)
            sizes[name] = {
                "path": path,
                "size_mb": round(size_bytes / (1024 * 1024), 2),
                "exists": os.path.exists(path)
            }
            total_bytes += size_bytes
        
        self.cache_sizes = sizes
        
        return {
            "caches": sizes,
            "total_size_mb": round(total_bytes / (1024 * 1024), 2),
            "timestamp": datetime.now().isoformat(),
        }
    
    def _get_dir_size(self, path: str) -> int:
        """Calculate total size of directory in bytes."""
        total_size = 0
        if not os.path.exists(path):
            return 0
        
        for dirpath, dirnames, filenames in os.walk(path):
            for filename in filenames:
                file_path = os.path.join(dirpath, filename)
                try:
                    total_size += os.path.getsize(file_path)
                except (OSError, FileNotFoundError):
                    continue
        return total_size
    
    def clear_cache(self, cache_type: str = "all") -> Dict[str, Any]:
        """
        Clear cache directories.
        
        Args:
            cache_type: Type of cache to clear
                - "all": Clear all caches
                - "torch": Clear torch cache only
                - "acestep": Clear ACE-Step cache only
                - "temp": Clear backend temp files only
                - "output": Clear backend output files only
        """
        results = {}
        
        cache_map = {
            "torch": os.environ.get("TORCH_HOME", r"C:\Users\gigid\.cache\torch"),
            "acestep": r"D:\VocalForge\ace-step\.cache\acestep\tmp",
            "temp": r"D:\VocalForge\backend\temp",
            "output": r"D:\VocalForge\backend\output",
        }
        
        targets = []
        if cache_type == "all":
            targets = list(cache_map.items())
        else:
            target_path = cache_map.get(cache_type)
            if target_path:
                targets = [(cache_type, target_path)]
        
        for name, path in targets:
            result = self._clear_directory(path)
            results[name] = result
        
        # Also clear PyTorch CUDA cache
        if cache_type in ("all", "torch") and torch.cuda.is_available():
            torch.cuda.empty_cache()
            results["cuda_cache"] = {
                "status": "cleared",
                "message": "PyTorch CUDA cache emptied"
            }
        
        self._last_cleanup = time.time()
        
        return {
            "status": "completed",
            "results": results,
            "timestamp": datetime.now().isoformat(),
        }
    
    def _clear_directory(self, path: str) -> Dict[str, Any]:
        """Clear contents of a directory."""
        if not os.path.exists(path):
            return {"status": "not_found", "message": f"Path does not exist: {path}"}
        
        try:
            files_deleted = 0
            bytes_freed = 0
            
            for root, dirs, files in os.walk(path):
                for file in files:
                    file_path = os.path.join(root, file)
                    try:
                        bytes_freed += os.path.getsize(file_path)
                        os.remove(file_path)
                        files_deleted += 1
                    except (OSError, PermissionError):
                        continue
                
                # Remove empty directories (except root)
                for dir_name in dirs:
                    dir_path = os.path.join(root, dir_name)
                    try:
                        if not os.listdir(dir_path):
                            os.rmdir(dir_path)
                    except (OSError, PermissionError):
                        continue
            
            return {
                "status": "cleared",
                "files_deleted": files_deleted,
                "bytes_freed": bytes_freed,
                "mb_freed": round(bytes_freed / (1024 * 1024), 2)
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def register_model(self, model_name: str, model_size_mb: float, vram_allocated: float) -> None:
        """Register a model as loaded in VRAM."""
        self.loaded_models[model_name] = {
            "size_mb": model_size_mb,
            "vram_allocated_gb": vram_allocated,
            "loaded_at": time.time(),
            "last_used": time.time(),
        }
    
    def unregister_model(self, model_name: str) -> bool:
        """Unregister a model from VRAM tracking."""
        if model_name in self.loaded_models:
            del self.loaded_models[model_name]
            return True
        return False
    
    def get_loaded_models(self) -> Dict[str, Any]:
        """Get list of loaded models with VRAM usage."""
        models = {}
        total_vram = 0
        
        for name, info in self.loaded_models.items():
            models[name] = {
                "size_mb": info["size_mb"],
                "vram_gb": round(info["vram_allocated_gb"], 2),
                "loaded_duration_s": round(time.time() - info["loaded_at"], 1),
                "idle_duration_s": round(time.time() - info["last_used"], 1),
            }
            total_vram += info["vram_allocated_gb"]
        
        return {
            "models": models,
            "count": len(models),
            "total_vram_gb": round(total_vram, 2),
        }
    
    def get_available_vram(self) -> float:
        """Get available VRAM in GB."""
        info = self.get_vram_info()
        return info["free_gb"]
    
    def can_load_model(self, model_name: str, required_vram_gb: float = 2.0) -> bool:
        """Check if a model can be loaded with available VRAM."""
        available = self.get_available_vram()
        # Reserve 1GB for system/operations
        safe_available = available - 1.0
        return safe_available >= required_vram_gb
    
    def auto_cleanup(self) -> Dict[str, Any]:
        """
        Perform automatic cleanup based on VRAM usage.
        
        Triggers:
        - If VRAM > 90%: Clear all caches + torch empty_cache
        - If VRAM > 80%: Clear torch cache only
        """
        info = self.get_vram_info()
        
        if not info["available"]:
            return {"status": "skipped", "reason": "CUDA not available"}
        
        usage = info["usage_percent"]
        actions_taken = []
        
        if usage >= 90:
            # Aggressive cleanup
            self.clear_cache("all")
            actions_taken.append("cleared_all_caches")
            torch.cuda.empty_cache()
            actions_taken.append("emptied_cuda_cache")
        elif usage >= 80:
            # Light cleanup
            torch.cuda.empty_cache()
            actions_taken.append("emptied_cuda_cache")
        
        return {
            "status": "completed",
            "vram_before": usage,
            "actions_taken": actions_taken,
            "timestamp": datetime.now().isoformat(),
        }
    
    def get_optimal_chunk_size(self) -> int:
        """
        Get optimal chunk size for audio processing based on available VRAM.
        
        Returns:
            Chunk size in samples
        """
        vram_gb = self.get_available_vram()
        
        if vram_gb >= 10:
            return 485100  # ~11s audio
        elif vram_gb >= 6:
            return 256000  # ~5.8s audio (RTX 3070)
        else:
            return 131072  # ~3s audio


# Singleton instance
_gpu_manager: Optional[GPUMemoryManager] = None


def get_gpu_manager() -> GPUMemoryManager:
    """Get or create GPU Memory Manager singleton."""
    global _gpu_manager
    if _gpu_manager is None:
        _gpu_manager = GPUMemoryManager(history_size=60)
    return _gpu_manager


def reset_gpu_manager() -> GPUMemoryManager:
    """Reset GPU Memory Manager (useful for testing)."""
    global _gpu_manager
    _gpu_manager = GPUMemoryManager(history_size=60)
    return _gpu_manager
