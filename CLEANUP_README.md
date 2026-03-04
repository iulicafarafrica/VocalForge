# VocalForge Cleanup Utilities

## Overview
The project now includes comprehensive cleanup utilities to ensure clean service starts and optimal GPU memory management.

## Available Scripts

### 1. `START_ALL.bat` (Enhanced)
Main launcher with automatic cleanup before starting services.

**Cleanup steps performed:**
- ✅ Kills all Python processes
- ✅ Kills Node.js processes
- ✅ Frees ports 8000, 8001, 8002, 3000
- ✅ Resets GPU VRAM (kills CUDA processes)
- ✅ Clears temporary files
- ✅ Waits for ports to be released

**Usage:**
```batch
START_ALL.bat
```

### 2. `CLEANUP.bat` (Full Cleanup)
Standalone comprehensive cleanup utility with detailed output.

**Features:**
- Interactive confirmation before cleanup
- Shows progress for each cleanup step
- Displays GPU status after cleanup
- Cleans temp files, processes, and ports

**Usage:**
```batch
CLEANUP.bat
```

### 3. `quick_clean.bat` (Fast Clean)
Quick cleanup for GPU VRAM and ports only.

**Features:**
- Fast execution (no temp file cleanup)
- Shows GPU memory usage after cleanup
- Perfect for quick restarts between testing sessions

**Usage:**
```batch
quick_clean.bat
```

## Cleanup Functions Explained

### `clean_tmp`
- Deletes files in `%TEMP%` and `C:\Windows\Temp`
- Removes empty directories
- Frees disk space

### `clean_python_ports`
- Identifies Python processes on ports 8000, 8001, 8002
- Kills only Python processes (not other services)
- Prevents "port already in use" errors

### `clean_gpu_vram`
- Uses `nvidia-smi` to find CUDA processes
- Kills all GPU compute processes
- Frees VRAM for new model loads

### `clean_all_python`
- Kills all Python processes by image name
- Includes python.exe and pythonw.exe
- 2-second wait for clean termination

### `clean_node`
- Kills all Node.js processes
- 1-second wait for clean termination
- Frees port 3000 (frontend)

### `wait_for_ports`
- 3-second delay for OS to release ports
- Ensures clean state for restart

## When to Use

| Scenario | Recommended Script |
|----------|-------------------|
| Starting all services | `START_ALL.bat` |
| Services stuck/crashed | `CLEANUP.bat` |
| Quick restart between tests | `quick_clean.bat` |
| GPU out of memory | `CLEANUP.bat` or `quick_clean.bat` |
| Port already in use error | `quick_clean.bat` |

## GPU Memory Management

### Check GPU Status
```batch
nvidia-smi
```

### Quick Memory Check
```batch
nvidia-smi --query-gpu=memory.total,memory.used --format=csv
```

### Kill Specific CUDA Process
```batch
nvidia-smi  # Find PID
taskkill /F /PID <PID>
```

## Troubleshooting

### "Access is denied" when killing processes
Run the script as Administrator.

### Ports still in use after cleanup
Wait 10 seconds and run `quick_clean.bat` again.

### GPU memory not freed
1. Run `CLEANUP.bat`
2. Wait 30 seconds
3. Check with `nvidia-smi`
4. If still stuck, reboot system

### Temporary files locked
Some temp files may be in use. This is normal - they will be cleaned on next reboot.

## Integration with Other Scripts

The cleanup functions are also available in:
- `start_acestep.bat` - Basic port cleanup
- `START_SERVERS.bat` - Port cleanup for API servers

## Best Practices

1. **Always use cleanup before starting services** - Prevents port conflicts
2. **Run quick_clean between tests** - Faster than full cleanup
3. **Use CLEANUP.bat for fresh start** - Complete system reset
4. **Monitor GPU memory** - Run `nvidia-smi` periodically

## Example Workflow

```batch
REM Morning startup
START_ALL.bat

REM Between testing sessions
quick_clean.bat
START_ALL.bat

REM End of day or stuck processes
CLEANUP.bat
```

## Requirements

- Windows 10/11
- NVIDIA GPU with drivers installed
- `nvidia-smi` available in PATH
- Administrator privileges recommended

## Related Files

- `START_ALL.bat` - Main launcher with cleanup
- `CLEANUP.bat` - Full cleanup utility
- `quick_clean.bat` - Fast cleanup
- `START_SERVERS.bat` - API server launcher
- `start_acestep.bat` - ACE-Step server launcher
