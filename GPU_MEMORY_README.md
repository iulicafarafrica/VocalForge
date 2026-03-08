# ?? GPU Memory Management - VocalForge v1.9.0  
  
## Overview  
Complete GPU VRAM monitoring and optimization for NVIDIA RTX 3070 8GB.  
  
## Features  
- ? Real-time VRAM monitoring  
- ? Automatic model unloading  
- ? FP16 inference context  
- ? Dynamic batch size calculation  
- ? GPU cleanup endpoint  
- ? Frontend GPUMonitor component  
  
## API Endpoints  
```bash  
GET  /gpu/info          # Get GPU VRAM information  
GET  /gpu/cleanup       # Manual GPU VRAM cleanup  
GET  /gpu/models        # List loaded models in VRAM  
POST /gpu/unload/{name} # Unload specific model from VRAM  
POST /gpu/unload-all    # Unload all models from VRAM  
GET  /gpu/can-load/{name}  # Check if model can be loaded  
```  
  
## Files  
- `core/modules/gpu_memory.py` - VRAM management core  
- `backend/endpoints/gpu_info.py` - 6 API endpoints  
- `frontend/src/components/GPUMonitor.jsx` - React frontend component  
- `backend/main.py` - GPU router integrated  
  
## Optimized For  
- NVIDIA RTX 3070 8GB VRAM  
- CUDA 11.8  
- PyTorch with CUDA support  
  
## Terminal Wrappers  
```batch  
run.bat "command"           # Universal wrapper  
run_ps1.bat "command"       # PowerShell wrapper  
wt -p PowerShell "command"  # Windows Terminal  
```  
  
## Testing  
```bash  
# Test GPU info  
curl http://localhost:8000/gpu/info  
  
# Test cleanup  
curl http://localhost:8000/gpu/cleanup  
```  
