"""
GPU Information and Memory Management API
- VRAM monitoring with history
- Cache management
- Per-model VRAM tracking
- VRAM alerts
"""

from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter(prefix="/gpu", tags=["GPU Memory"])

# Import from modules
import sys
import os
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
    """Unload all models from VRAM tracking."""
    manager = get_gpu_manager()
    count = len(manager.loaded_models)
    manager.loaded_models.clear()
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
