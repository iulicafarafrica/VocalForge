"""GPU Memory Management for NVIDIA RTX 3070 8GB"""

import torch
import gc
from contextlib import contextmanager
from typing import Dict, Any, Optional


class GPUMemoryManager:
    VRAM_TOTAL_GB = 8.0
    MODEL_VRAM = {"ace_step_turbo": 4.0, "ace_step_base": 6.0, "rvc_v2": 2.5, "bs_roformer": 4.0}

    def __init__(self):
        self.loaded_models = {}
        self.model_priority = {}

    def get_vram_info(self):
        if not torch.cuda.is_available():
            return {"available": False}
        t = torch.cuda.get_device_properties(0).total_memory / 1e9
        a = torch.cuda.memory_allocated(0) / 1e9
        return {"available": True, "gpu_name": torch.cuda.get_device_name(0), "total_gb": round(t,2), "allocated_gb": round(a,2), "free_gb": round(t-a,2), "usage_percent": round((a/t)*100,1)}

    def register_model(self, name, model, priority=5):
        self.loaded_models[name] = model
        self.model_priority[name] = priority

    def unload_model(self, name, force=False):
        if name not in self.loaded_models: return False
        if self.model_priority.get(name, 5) >= 8 and not force: return False
        self.loaded_models.pop(name)
        self.model_priority.pop(name, None)
        torch.cuda.empty_cache()
        gc.collect()
        return True

    def unload_all_models(self):
        count = 0
        for n in list(self.loaded_models.keys()):
            if self.unload_model(n, True): count += 1
        return count

    def get_available_vram(self):
        return self.get_vram_info().get("free_gb", 0)

    def can_load_model(self, name):
        return self.get_available_vram() >= (self.MODEL_VRAM.get(name, 3.0) + 1.0)

    def auto_cleanup(self):
        self.unload_all_models()
        torch.cuda.empty_cache()
        gc.collect()


_gpu_manager = None

def get_gpu_manager():
    global _gpu_manager
    if _gpu_manager is None: _gpu_manager = GPUMemoryManager()
    return _gpu_manager


@contextmanager
def gpu_inference_context():
    try:
        with torch.no_grad():
            with torch.cuda.amp.autocast(dtype=torch.float16):
                yield
    finally:
        torch.cuda.empty_cache()
        gc.collect()
