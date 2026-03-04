# Triton Installation Fix for Windows

## Problem
```
Cannot find a working triton installation. Either the package is not installed or it is too old.
```

## Solution Applied
Triton a fost instalat cu succes în mediul virtual ACE-Step.

### Installed Version
- **Triton**: 3.3.1.post21
- **PyTorch**: 2.7.1+cu128
- **Python**: 3.10 (în .venv)

## Installation Command Used
```bash
uv pip install --directory D:\VocalForge\ace-step "triton-windows>=3.2.0,<3.4"
```

## Why This Works
- PyTorch 2.7.1+cu128 necesită Triton 3.x pentru `torch.compile`
- Versiunea `triton-windows==3.2.0` specificată în `requirements.txt` nu există pe PyPI
- Versiunile disponibile sunt: 3.1.0.post17, 3.2.0.post11+, 3.3.x, 3.4.x, etc.
- Am instalat `triton-windows==3.3.1.post21` care este compatibil

## Files Modified
- `start_acestep.bat` - Removed workaround (no longer needed)
- `START_SERVERS.bat` - Removed workaround (no longer needed)
- `.env` - Cleaned up obsolete settings

## Verification
To verify Triton is working:
```bash
uv run --directory D:\VocalForge\ace-step python -c "import triton; print(triton.__version__)"
```

Expected output: `3.3.1`

## Performance Benefits
With Triton installed and `torch.compile` enabled:
- Faster LLM inference
- Better GPU utilization
- Optimized kernel execution

## If Issues Persist
If you still encounter Triton errors, you can temporarily disable torch.compile:

```batch
set ACESTEP_COMPILE_MODEL=0
```

Or add to `.env`:
```
ACESTEP_COMPILE_MODEL=0
```

## Related
- [Triton GitHub](https://github.com/triton-lang/triton)
- [Triton Windows Support](https://github.com/triton-lang/triton#windows-support)
