"""
GPU Information and Memory Management API
- VRAM monitoring with history
- Cache management
- Per-model VRAM tracking
- VRAM alerts
- Storage analysis and cleanup recommendations
"""

from fastapi import APIRouter, Query
from typing import Optional
import os
import time
from datetime import datetime, timedelta

router = APIRouter(prefix="/gpu", tags=["GPU Memory"])

# Import from modules
import sys
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from modules.gpu_memory import get_gpu_manager


@router.get("/info")
async def get_gpu_info():
    """Get current GPU VRAM information."""
    manager = get_gpu_manager()
    return manager.get_vram_info()


@router.get("/cleanup")
async def cleanup_gpu():
    """Perform GPU cleanup (auto-cleanup based on VRAM usage)."""
    manager = get_gpu_manager()
    result = manager.auto_cleanup()
    return result


@router.get("/models")
async def get_loaded_models():
    """Get list of models currently loaded in VRAM."""
    manager = get_gpu_manager()
    return manager.get_loaded_models()


@router.post("/unload/{model_name}")
async def unload_model(model_name: str):
    """Unload a specific model from VRAM tracking."""
    manager = get_gpu_manager()
    success = manager.unregister_model(model_name)
    return {
        "status": "ok" if success else "error",
        "message": f"Model {model_name} unloaded" if success else f"Model {model_name} not found"
    }


@router.post("/unload-all")
async def unload_all_models():
    """Unload all models from VRAM and free GPU memory."""
    import gc
    import torch
    
    manager = get_gpu_manager()
    count = len(manager.loaded_models)
    manager.loaded_models.clear()
    
    # Force free GPU memory
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()
    gc.collect()
    
    return {"status": "ok", "models_unloaded": count}


@router.get("/can-load/{model_name}")
async def can_load_model(model_name: str, required_vram: float = Query(default=2.0, description="Required VRAM in GB")):
    """Check if a model can be loaded with available VRAM."""
    manager = get_gpu_manager()
    can_load = manager.can_load_model(model_name, required_vram)
    return {
        "can_load": can_load,
        "available_vram_gb": manager.get_available_vram(),
        "model_name": model_name,
        "required_vram_gb": required_vram
    }


@router.get("/vram/history")
async def get_vram_history(samples: int = Query(default=60, description="Number of samples to return")):
    """Get VRAM usage history."""
    manager = get_gpu_manager()
    history = manager.get_vram_history()
    
    # Return last N samples
    if samples and samples < len(history):
        history = history[-samples:]
    
    return {
        "samples": history,
        "count": len(history),
        "history_size": manager.history_size
    }


@router.get("/vram/alerts")
async def get_vram_alerts():
    """Get VRAM usage alerts based on current usage."""
    manager = get_gpu_manager()
    alerts = manager.get_vram_alerts()
    current_vram = manager.get_vram_info()
    
    return {
        "alerts": alerts,
        "current_vram": current_vram,
        "alert_count": len(alerts)
    }


@router.get("/cache/size")
async def get_cache_size():
    """Get size of all cache directories."""
    manager = get_gpu_manager()
    return manager.get_cache_size()


@router.post("/cache/clear")
async def clear_cache(cache_type: str = Query(default="all", description="Type of cache to clear: all, torch, acestep, temp, output")):
    """
    Clear cache directories.
    
    Args:
        cache_type: Type of cache to clear
            - all: Clear all caches
            - torch: Clear torch cache only
            - acestep: Clear ACE-Step cache only
            - temp: Clear backend temp files only
            - output: Clear backend output files only
    """
    manager = get_gpu_manager()
    result = manager.clear_cache(cache_type)
    return result


@router.get("/optimal-chunk-size")
async def get_optimal_chunk_size():
    """Get optimal audio chunk size based on available VRAM."""
    manager = get_gpu_manager()
    chunk_size = manager.get_optimal_chunk_size()
    vram = manager.get_available_vram()
    
    return {
        "chunk_size": chunk_size,
        "chunk_duration_approx": f"~{chunk_size / 44100:.1f}s at 44.1kHz",
        "available_vram_gb": round(vram, 2),
        "recommendation": "large" if chunk_size >= 485100 else "medium" if chunk_size >= 256000 else "small"
    }


@router.get("/register-model")
async def register_model(
    name: str = Query(..., description="Model name"),
    size_mb: float = Query(..., description="Model size in MB"),
    vram_gb: float = Query(..., description="VRAM allocated in GB")
):
    """Register a model as loaded in VRAM."""
    manager = get_gpu_manager()
    manager.register_model(name, size_mb, vram_gb)
    return {
        "status": "ok",
        "message": f"Model {name} registered",
        "total_loaded": len(manager.loaded_models)
    }


@router.get("/stats")
async def get_gpu_stats():
    """Get comprehensive GPU statistics."""
    manager = get_gpu_manager()
    
    vram_info = manager.get_vram_info()
    alerts = manager.get_vram_alerts()
    loaded_models = manager.get_loaded_models()
    cache_info = manager.get_cache_size()
    history = manager.get_vram_history()
    
    # Calculate stats from history
    if history:
        usage_values = [h["usage_percent"] for h in history]
        avg_usage = sum(usage_values) / len(usage_values)
        max_usage = max(usage_values)
        min_usage = min(usage_values)
    else:
        avg_usage = max_usage = min_usage = 0
    
    return {
        "current": vram_info,
        "alerts": alerts,
        "loaded_models": loaded_models,
        "cache": cache_info,
        "history_stats": {
            "samples": len(history),
            "avg_usage_percent": round(avg_usage, 1),
            "max_usage_percent": round(max_usage, 1),
            "min_usage_percent": round(min_usage, 1),
        },
        "optimal_chunk_size": manager.get_optimal_chunk_size(),
        "timestamp": vram_info.get("timestamp", "")
    }


@router.get("/storage/analyze")
async def analyze_storage():
    """
    Analyze storage usage across all VocalForge directories.
    
    Returns detailed breakdown of:
    - Cache directories
    - Temp files
    - Output files
    - Model files
    - Recommendations
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    root_dir = os.path.dirname(base_dir)
    
    directories = {
        "acestep_cache": os.path.join(root_dir, "ace-step", ".cache"),
        "backend_temp": os.path.join(base_dir, "temp"),
        "backend_output": os.path.join(base_dir, "output"),
        "backend_logs": os.path.join(base_dir, "logs"),
        "rvc_models": os.path.join(root_dir, "RVCWebUI", "assets", "weights"),
        "torch_cache": os.environ.get("TORCH_HOME", os.path.join(os.path.expanduser("~"), ".cache", "torch")),
    }
    
    analysis = {}
    total_size = 0
    total_files = 0
    
    for name, path in directories.items():
        info = _analyze_directory(path)
        analysis[name] = info
        total_size += info["size_bytes"]
        total_files += info["file_count"]
    
    # Calculate free space on drive
    try:
        import shutil
        total_disk, used_disk, free_disk = shutil.disk_usage(root_dir[:2] + ":\\")
        disk_info = {
            "total_gb": round(total_disk / (1024**3), 2),
            "used_gb": round(used_disk / (1024**3), 2),
            "free_gb": round(free_disk / (1024**3), 2),
            "usage_percent": round((used_disk / total_disk) * 100, 1)
        }
    except Exception:
        disk_info = None
    
    return {
        "directories": analysis,
        "total_size_mb": round(total_size / (1024 * 1024), 2),
        "total_files": total_files,
        "disk_info": disk_info,
        "timestamp": datetime.now().isoformat(),
    }


def _analyze_directory(path: str) -> dict:
    """Analyze a single directory."""
    if not os.path.exists(path):
        return {
            "path": path,
            "size_bytes": 0,
            "file_count": 0,
            "exists": False,
            "oldest_file": None,
            "newest_file": None,
            "by_age": {"today": 0, "week": 0, "month": 0, "older": 0},
        }
    
    total_size = 0
    file_count = 0
    oldest_time = None
    newest_time = None
    by_age = {"today": 0, "week": 0, "month": 0, "older": 0}
    
    now = datetime.now()
    
    for root, dirs, files in os.walk(path):
        for filename in files:
            filepath = os.path.join(root, filename)
            try:
                stat = os.stat(filepath)
                size = stat.st_size
                mtime = datetime.fromtimestamp(stat.st_mtime)
                
                total_size += size
                file_count += 1
                
                # Track oldest/newest
                if oldest_time is None or mtime < oldest_time:
                    oldest_time = mtime
                if newest_time is None or mtime > newest_time:
                    newest_time = mtime
                
                # Categorize by age
                age_days = (now - mtime).days
                if age_days == 0:
                    by_age["today"] += 1
                elif age_days <= 7:
                    by_age["week"] += 1
                elif age_days <= 30:
                    by_age["month"] += 1
                else:
                    by_age["older"] += 1
                    
            except (OSError, FileNotFoundError):
                continue
    
    return {
        "path": path,
        "size_bytes": total_size,
        "file_count": file_count,
        "exists": True,
        "oldest_file": oldest_time.isoformat() if oldest_time else None,
        "newest_file": newest_time.isoformat() if newest_time else None,
        "by_age": by_age,
    }


@router.get("/storage/recommendations")
async def get_cleanup_recommendations():
    """
    Get smart cleanup recommendations based on current storage state.
    
    Returns actionable recommendations with priority levels.
    """
    analysis = await analyze_storage()
    recommendations = []
    
    # Check each directory
    for name, info in analysis["directories"].items():
        if not info["exists"]:
            continue
        
        size_mb = info["size_bytes"] / (1024 * 1024)
        older_files = info["by_age"]["older"]
        week_files = info["by_age"]["week"]
        
        # Large cache recommendation
        if size_mb > 500:
            recommendations.append({
                "id": f"{name}_large",
                "priority": "high" if size_mb > 1000 else "medium",
                "type": "size",
                "title": f"Large {name.replace('_', ' ').title()} ({size_mb:.0f} MB)",
                "description": f"This directory contains {size_mb:.0f} MB. Consider clearing to free up space.",
                "action": "clear",
                "target": name,
                "potential_savings_mb": round(size_mb * 0.9, 1),
            })
        
        # Old files recommendation
        if older_files > 10:
            recommendations.append({
                "id": f"{name}_old",
                "priority": "medium",
                "type": "age",
                "title": f"{older_files} old files in {name.replace('_', ' ').title()}",
                "description": f"You have {older_files} files older than 30 days. Consider removing outdated files.",
                "action": "review_old",
                "target": name,
                "potential_savings_mb": round(size_mb * 0.5, 1),
            })
        
        # Recent activity check
        if info["file_count"] > 0 and info["newest_file"]:
            newest = datetime.fromisoformat(info["newest_file"])
            days_since = (datetime.now() - newest).days
            if days_since > 14:
                recommendations.append({
                    "id": f"{name}_stale",
                    "priority": "low",
                    "type": "stale",
                    "title": f"{name.replace('_', ' ').title()} not cleaned in {days_since} days",
                    "description": "This directory hasn't been cleaned recently. A quick cleanup might help.",
                    "action": "clear",
                    "target": name,
                    "potential_savings_mb": round(size_mb * 0.8, 1),
                })
    
    # Disk space warning
    if analysis["disk_info"] and analysis["disk_info"]["usage_percent"] > 85:
        recommendations.append({
            "id": "disk_critical",
            "priority": "critical",
            "type": "disk",
            "title": f"Disk space critical ({analysis['disk_info']['usage_percent']}% used)",
            "description": f"Only {analysis['disk_info']['free_gb']} GB free. Immediate cleanup recommended!",
            "action": "clear_all",
            "target": "all",
            "potential_savings_mb": round(analysis["total_size_mb"] * 0.7, 1),
        })
    
    # Sort by priority
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    recommendations.sort(key=lambda x: priority_order.get(x["priority"], 4))
    
    return {
        "recommendations": recommendations,
        "count": len(recommendations),
        "total_potential_savings_mb": round(sum(r["potential_savings_mb"] for r in recommendations), 1),
        "timestamp": datetime.now().isoformat(),
    }


@router.post("/storage/clear-old")
async def clear_old_files(
    directory: str = Query(..., description="Directory name to clean"),
    days_old: int = Query(default=30, description="Remove files older than X days")
):
    """Remove files older than specified days from a directory."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    root_dir = os.path.dirname(base_dir)
    
    dir_map = {
        "acestep_cache": os.path.join(root_dir, "ace-step", ".cache"),
        "backend_temp": os.path.join(base_dir, "temp"),
        "backend_output": os.path.join(base_dir, "output"),
        "backend_logs": os.path.join(base_dir, "logs"),
    }
    
    if directory not in dir_map:
        return {"status": "error", "message": f"Unknown directory: {directory}"}
    
    path = dir_map[directory]
    if not os.path.exists(path):
        return {"status": "error", "message": f"Directory does not exist: {path}"}
    
    cutoff = datetime.now() - timedelta(days=days_old)
    deleted_count = 0
    deleted_size = 0
    
    for root, dirs, files in os.walk(path):
        for filename in files:
            filepath = os.path.join(root, filename)
            try:
                mtime = datetime.fromtimestamp(os.stat(filepath).st_mtime)
                if mtime < cutoff:
                    size = os.path.getsize(filepath)
                    os.remove(filepath)
                    deleted_count += 1
                    deleted_size += size
            except (OSError, FileNotFoundError):
                continue
    
    # Remove empty directories
    for root, dirs, files in os.walk(path, topdown=False):
        for dir_name in dirs:
            dir_path = os.path.join(root, dir_name)
            try:
                if not os.listdir(dir_path):
                    os.rmdir(dir_path)
            except OSError:
                pass
    
    return {
        "status": "ok",
        "directory": directory,
        "files_deleted": deleted_count,
        "bytes_freed": deleted_size,
        "mb_freed": round(deleted_size / (1024 * 1024), 2),
        "days_old": days_old,
    }


@router.get("/auto-cleanup/settings")
async def get_auto_cleanup_settings():
    """Get auto-cleanup settings from config file."""
    config_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "auto_cleanup_config.json"
    )
    
    default_settings = {
        "enabled": False,
        "clear_temp_after_task": False,
        "clear_output_days": 7,
        "alert_threshold_mb": 500,
        "auto_clear_vram_percent": 90,
    }
    
    if os.path.exists(config_path):
        try:
            with open(config_path, "r") as f:
                settings = json.load(f)
                return {**default_settings, **settings}
        except Exception:
            pass
    
    return default_settings


@router.post("/auto-cleanup/settings")
async def update_auto_cleanup_settings(settings: dict):
    """Update auto-cleanup settings."""
    import json
    
    config_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "auto_cleanup_config.json"
    )
    
    allowed_keys = ["enabled", "clear_temp_after_task", "clear_output_days", "alert_threshold_mb", "auto_clear_vram_percent"]
    filtered = {k: v for k, v in settings.items() if k in allowed_keys}
    
    with open(config_path, "w") as f:
        json.dump(filtered, f, indent=2)
    
    return {"status": "ok", "settings": filtered}
