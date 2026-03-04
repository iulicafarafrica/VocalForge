# VocalForge v1.7 Architecture Documentation

## Overview

VocalForge is a modular AI audio framework designed for voice conversion, audio processing, and music generation. The system combines multiple cutting-edge technologies including so-vits-svc for voice conversion, Demucs for audio separation, and ACE-Step for music generation.

## Core Architecture

### Backend Structure

The backend is built with FastAPI and organized as follows:

```
backend/
├── main.py                 # Main API server with all endpoints
├── model_loader.py         # Model loading utilities
├── endpoints/              # Additional API route modules
├── models/                 # Voice models storage (HQ_SVC/, LoRA/)
├── temp/                   # Temporary processing files
└── output/                 # Generated output files
```

### Key Components

#### 1. Audio Processing Pipeline
The main pipeline follows this sequence:
1. **Audio Separation**: Uses Demucs or UVR (audio-separator) to separate vocals from instrumental
2. **Voice Conversion**: Uses so-vits-svc models to convert vocals to target voice
3. **Audio Mixing**: Combines converted vocals with original instrumental
4. **Output**: Saves as WAV or MP3 format

#### 2. Model Management System
- **AdvancedCache**: Implements LRU caching with TTL for voice models
- **Model Isolation**: Runs models in separate processes to prevent memory leaks
- **Memory Management**: Automatic GPU memory cleanup and cache eviction

#### 3. Hardware Detection and Optimization
```python
def detect_hardware():
    has_cuda = torch.cuda.is_available()
    vram_gb = 0.0
    if has_cuda:
        try:
            vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        except Exception:
            pass
    device = "cuda" if has_cuda else "cpu"

    # Determine mode (same logic as core/engine.py)
    if not has_cuda or vram_gb < 4:
        mode = "light"
    elif vram_gb < 8:
        mode = "full"
    else:
        mode = "high_end"
```

Based on VRAM availability, the system adapts:
- **Light Mode** (< 4GB VRAM): Basic processing with minimal memory usage
- **Full Mode** (4-8GB VRAM): Enhanced processing with additional features
- **High-End Mode** (> 8GB VRAM): Full feature set with maximum quality

#### 4. AudioEngine Framework
Located in `core/engine.py`, this modular system includes:
- **MorphModule**: Pitch and gender shifting
- **HarmonyModule**: Audio harmonization
- **MasteringModule**: Audio mastering (normalization, limiting)
- **Chunk Processing**: Handles long audio tracks by splitting into segments
- **AMP Support**: Mixed precision training for efficiency

## Frontend Architecture

### React Application Structure
```
frontend/
├── src/
│   ├── App.jsx             # Main application with tabbed interface
│   ├── components/         # UI components for each feature
│   │   ├── AceStepTab.jsx  # ACE-Step music generation UI
│   │   ├── DemucsTab.jsx   # Audio separation UI
│   │   ├── ModelsTab.jsx   # Model management UI
│   │   └── ...
│   └── index.css           # Styling
```

### Key UI Features
- **Tabbed Interface**: Multiple functional tabs for different operations
- **Real-time Logging**: Activity logs and progress tracking
- **Model Management**: Upload, list, and manage voice models
- **Audio Preview**: Built-in player for generated tracks

## ACE-Step Integration

### Music Generation Capabilities
ACE-Step v1.5 integration provides:
- **Text-to-Music**: Generate complete songs from text prompts
- **Audio Cover**: Transform existing audio to match a style
- **Repaint**: Edit specific sections of audio
- **Lego**: Add instruments to existing tracks
- **Complete**: Extend existing audio

### API Communication
The frontend communicates with ACE-Step through proxy endpoints:
```javascript
// Proxy endpoints in main.py
@app.post("/ace_generate")
async def ace_generate(...):
    # Proxies to ACE-Step API server running on port 8001
```

## Key Endpoints

### Processing Endpoints
- `POST /process_cover`: Full voice conversion pipeline
- `POST /preview`: 10-second preview of conversion
- `POST /lyrics_cover`: Lyrics-to-cover generation
- `POST /karaoke`: Vocal removal for instrumental tracks

### Model Management
- `POST /upload_model`: Upload new voice models
- `GET /list_models`: List available models
- `DELETE /delete_model/{id}`: Remove models
- `GET /speakers/{model_id}`: List speakers in a model

### Audio Analysis
- `POST /detect_bpm_key`: Detect BPM and musical key
- `POST /demucs_separate`: Audio stem separation

### System Utilities
- `GET /hardware`: Hardware information
- `GET /vram_usage`: GPU memory usage
- `GET /clear_cache`: Clear GPU cache
- `GET /health`: System health check

## Advanced Features

### Job Management
- **Progress Tracking**: Real-time progress updates via SSE
- **Job Queue**: Asynchronous processing with status tracking
- **Error Handling**: Comprehensive error reporting and recovery

### Cache Management
- **Model Caching**: Advanced LRU cache with TTL for models
- **Memory Optimization**: Automatic cleanup and memory management
- **Performance Metrics**: Cache hit/miss ratios and statistics

### Audio Formats
- **Input Support**: Various formats converted to WAV internally
- **Output Options**: MP3 (default) or WAV with configurable bitrates
- **Quality Control**: Configurable MP3 bitrates (128k, 192k, 256k, 320k)

## Configuration

### Environment Variables
The system uses various configuration options:
- `OUTPUT_FORMAT`: Output format (mp3 or wav)
- `MP3_BITRATE`: Bitrate for MP3 output
- FFmpeg path configuration for Windows systems

### Hardware Optimization
Automatic optimization based on detected hardware:
- **VRAM Management**: Chunk sizes adjusted based on available VRAM
- **Processing Parameters**: Batch sizes and segment lengths adapted to hardware
- **Fallback Mechanisms**: CPU fallback when GPU unavailable

## Security and Reliability

### Input Validation
- File type and size validation
- Audio format verification
- Malicious content prevention

### Error Handling
- Graceful degradation when components fail
- Comprehensive logging for debugging
- Recovery mechanisms for common failures

### Resource Management
- Automatic memory cleanup
- Process isolation for model loading
- Timeout protection for long operations

## Performance Optimization

### Memory Efficiency
- Lazy loading of heavy libraries
- GPU memory management with automatic cleanup
- Efficient caching strategies

### Processing Speed
- Parallel processing where possible
- Optimized algorithms for audio operations
- Hardware-accelerated computations

## Extensibility

The modular design allows for easy addition of new features:
- New audio processing modules can be added to the AudioEngine
- Additional model formats can be integrated
- New UI components can be added to the frontend
- Additional API endpoints can be implemented

This architecture provides a robust, scalable foundation for AI-powered audio processing applications with support for various voice conversion, music generation, and audio manipulation tasks.