"""GPU Information API"""

from fastapi import APIRouter
from core.modules.gpu_memory import get_gpu_manager

router = APIRouter(prefix="/gpu", tags=["GPU"])


@router.get("/info")
async def get_gpu_info():
    manager = get_gpu_manager()
    return manager.get_vram_info()


@router.get("/cleanup")
async def cleanup_gpu():
    manager = get_gpu_manager()
    manager.auto_cleanup()
    return {"status": "ok", "message": "GPU cleanup completed"}

@router.get("/models")
async def get_loaded_models():
    manager = get_gpu_manager()
    return {"loaded_models": manager.get_loaded_models(), "vram_info": manager.get_vram_info()}


@router.post("/unload/{model_name}")
async def unload_model(model_name: str):
    manager = get_gpu_manager()
    success = manager.unload_model(model_name)
    return {"status": "ok" if success else "error", "message": f"Model {model_name} unloaded" if success else f"Model {model_name} not found"}

@router.post("/unload-all")
async def unload_all_models():
    manager = get_gpu_manager()
    count = manager.unload_all_models()
    return {"status": "ok", "models_unloaded": count}


@router.get("/can-load/{model_name}")
async def can_load_model(model_name: str):
    manager = get_gpu_manager()
    return {"can_load": manager.can_load_model(model_name), "available_vram_gb": manager.get_available_vram(), "model_name": model_name}
