"""
VocalForge Audio Analysis API
Features: BPM detection, Key detection, Chord detection, Time signature, Lyrics (Genius API)
"""

import os
import sys
import uuid
import json
import math
import numpy as np
import librosa
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional, List, Dict, Any
import shutil

# Add project root to path for core modules
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), '..'))

from core.modules.audio_analysis import analyze_audio, detect_bpm, detect_key, detect_chords, detect_time_signature

router = APIRouter(prefix="/audio", tags=["Audio Analysis"])

TEMP_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "temp")
os.makedirs(TEMP_DIR, exist_ok=True)


@router.post("/analyze")
async def analyze_audio_endpoint(file: UploadFile = File(...), duration: Optional[float] = Form(None)):
    """Complete audio analysis: BPM, Key, Chords, Time Signature."""
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".wav"
    temp_path = os.path.join(TEMP_DIR, f"audio_{file_id}{file_ext}")

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = analyze_audio(temp_path, duration=duration)
        result['original_filename'] = file.filename
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/bpm")
async def detect_bpm_endpoint(file: UploadFile = File(...)):
    """Detect BPM from audio file."""
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".wav"
    temp_path = os.path.join(TEMP_DIR, f"audio_{file_id}{file_ext}")

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        from core.modules.audio_analysis import detect_bpm
        import librosa

        y, sr = librosa.load(temp_path, sr=None)
        bpm, confidence = detect_bpm(y, sr)

        return {"status": "success", "bpm": bpm, "confidence": confidence, "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"BPM detection failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/key")
async def detect_key_endpoint(file: UploadFile = File(...)):
    """Detect musical key from audio file."""
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".wav"
    temp_path = os.path.join(TEMP_DIR, f"audio_{file_id}{file_ext}")

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        from core.modules.audio_analysis import detect_key
        import librosa

        y, sr = librosa.load(temp_path, sr=None)
        key, mode, confidence = detect_key(y, sr)

        return {"status": "success", "key": key, "mode": mode, "confidence": confidence, "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Key detection failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/chords")
async def detect_chords_endpoint(file: UploadFile = File(...), segment_seconds: float = Form(3.0)):
    """Detect chord progression in audio file."""
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".wav"
    temp_path = os.path.join(TEMP_DIR, f"audio_{file_id}{file_ext}")

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        from core.modules.audio_analysis import detect_chords
        import librosa

        y, sr = librosa.load(temp_path, sr=None)
        chords = detect_chords(y, sr, segment_seconds=segment_seconds)

        return {
            "status": "success",
            "chords": chords,
            "unique_chords": list(set([c['chord'] for c in chords])),
            "progression": [c['chord'] for c in chords],
            "filename": file.filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chord detection failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/time-signature")
async def detect_time_signature_endpoint(file: UploadFile = File(...)):
    """Detect time signature from audio file."""
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".wav"
    temp_path = os.path.join(TEMP_DIR, f"audio_{file_id}{file_ext}")

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        from core.modules.audio_analysis import detect_time_signature
        import librosa

        y, sr = librosa.load(temp_path, sr=None)
        time_sig, confidence = detect_time_signature(y, sr)

        return {"status": "success", "time_signature": time_sig, "confidence": confidence, "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Time signature detection failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


# ── Lyrics Search (Genius API via LyricsGenius) ────────────────────────────────

# Genius API token (optional but recommended for better rate limits)
# Set in backend/.env as GENIUS_ACCESS_TOKEN
GENIUS_TOKEN = os.getenv("GENIUS_ACCESS_TOKEN", None)


@router.post("/lyrics/suggest")
async def suggest_songs(query: str = Form(...)):
    """
    Search for songs using Genius.com API via LyricsGenius.
    Returns list of songs from Genius.
    """
    try:
        import lyricsgenius
        
        print(f"[Genius] Suggest: {query}")
        
        # Initialize Genius client (token optional for basic search)
        genius = lyricsgenius.Genius(GENIUS_TOKEN) if GENIUS_TOKEN else lyricsgenius.Genius()
        genius.timeout = 10
        genius.delay = 0.5
        
        # Search for songs using search_songs
        results = genius.search_songs(query, per_page=10)
        
        if not results or 'hits' not in results:
            return {"songs": [], "count": 0}
        
        # Format results for frontend
        songs = []
        for hit in results.get('hits', [])[:10]:
            song = hit.get('result', {})
            songs.append({
                "title": song.get('title', 'Unknown'),
                "artist": {
                    "name": song.get('primary_artist', {}).get('name', 'Unknown')
                },
                "url": song.get('url', ''),
                "id": song.get('id', 0)
            })
        
        print(f"[Genius] Found {len(songs)} songs")
        
        return {
            "status": "success",
            "songs": songs,
            "count": len(songs),
            "source": "Genius.com"
        }
            
    except ImportError:
        print("[Genius] LyricsGenius not installed. Run: pip install lyricsgenius")
        raise HTTPException(status_code=500, detail="LyricsGenius not installed. Run: pip install lyricsgenius")
    except Exception as e:
        print(f"[Genius] Suggest error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"songs": [], "count": 0, "error": str(e)}


@router.post("/lyrics/search")
async def search_lyrics(
    artist: str = Form(None),
    title: str = Form(None),
    search_type: str = Form("song")
):
    """
    Search lyrics using Genius.com API via LyricsGenius Python client.
    Official Genius API client - https://github.com/johnwmillr/LyricsGenius
    """
    
    try:
        import lyricsgenius
        
        if search_type == "artist":
            # Search for artist
            if not artist:
                raise HTTPException(status_code=400, detail="Artist name required")
            
            print(f"[Genius] Searching artist: {artist}")
            genius = lyricsgenius.Genius(GENIUS_TOKEN) if GENIUS_TOKEN else lyricsgenius.Genius()
            genius.timeout = 10
            genius.delay = 0.5
            
            artist_obj = genius.search_artist(artist, max_songs=20, sort="popularity")
            
            if not artist_obj or not artist_obj.songs:
                raise HTTPException(status_code=404, detail=f"Artist '{artist}' not found on Genius")
            
            songs = []
            for song in artist_obj.songs:
                songs.append({
                    "title": song.title,
                    "artist": artist_obj.name,
                    "url": song.url,
                    "id": song.id
                })
            
            return {
                "status": "success",
                "artist": artist,
                "songs": songs,
                "count": len(songs),
                "source": "Genius.com"
            }
        
        else:  # search_type == "song"
            # Get lyrics for specific song
            if not artist or not title:
                raise HTTPException(status_code=400, detail="Artist and title required")
            
            print(f"[Genius] Searching: {artist} - {title}")
            genius = lyricsgenius.Genius(GENIUS_TOKEN) if GENIUS_TOKEN else lyricsgenius.Genius()
            genius.timeout = 10
            genius.delay = 0.5
            genius.remove_section_headers = True  # Remove [Chorus], [Verse] headers
            genius.verbose = False
            
            # Search for song
            song = genius.search_song(title, artist)
            
            if not song:
                raise HTTPException(
                    status_code=404,
                    detail=f"Lyrics not found on Genius.com for '{artist} - {title}'"
                )
            
            if not song.lyrics or len(song.lyrics.strip()) < 50:
                raise HTTPException(
                    status_code=404,
                    detail="Lyrics not available on Genius.com (incomplete)"
                )
            
            print(f"[Genius] Found lyrics: {len(song.lyrics)} chars")
            
            # Convert all attributes to strings (FastAPI needs JSON-serializable data)
            return {
                "status": "success",
                "artist": str(artist),
                "title": str(title),
                "lyrics": str(song.lyrics),
                "source": "Genius.com",
                "length": len(song.lyrics),
                "url": str(song.url) if hasattr(song, 'url') and song.url else "",
                "album": str(song.album) if hasattr(song, 'album') and song.album else "",
                "release_date": str(song.release_date) if hasattr(song, 'release_date') and song.release_date else ""
            }
            
    except ImportError:
        print("[Genius] LyricsGenius not installed. Run: pip install lyricsgenius")
        raise HTTPException(
            status_code=500,
            detail="LyricsGenius not installed. Run: pip install lyricsgenius"
        )
    except Exception as e:
        print(f"[Genius] Search error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Genius.com error: {str(e)}")


@router.post("/lyrics/from-audio")
async def detect_lyrics_from_audio(file: UploadFile = File(...)):
    """Detect lyrics from audio using Whisper transcription."""
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".wav"
    temp_path = os.path.join(TEMP_DIR, f"audio_{file_id}{file_ext}")

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Load audio
        y, sr = librosa.load(temp_path, sr=None)

        # Use Whisper for transcription (if available)
        try:
            import whisper
            model = whisper.load_model("base")
            result = model.transcribe(temp_path)
            lyrics = result["text"]
        except ImportError:
            raise HTTPException(status_code=500, detail="Whisper not installed. Run: pip install openai-whisper")

        return {
            "status": "success",
            "filename": file.filename,
            "lyrics": lyrics,
            "source": "Whisper AI",
            "length": len(lyrics)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.get("/info")
async def audio_analysis_info():
    """Get information about audio analysis capabilities."""
    return {
        "status": "ok",
        "capabilities": {
            "bpm_detection": {"description": "Detect BPM", "endpoint": "POST /audio/bpm"},
            "key_detection": {"description": "Detect musical key", "endpoint": "POST /audio/key"},
            "chord_detection": {"description": "Detect chord progression", "endpoint": "POST /audio/chords"},
            "time_signature": {"description": "Detect time signature", "endpoint": "POST /audio/time-signature"},
            "loudness": {"description": "Detect LUFS, RMS, True Peak, Dynamic Range", "endpoint": "POST /audio/loudness"},
            "vocal_range": {"description": "Detect vocal range and voice type", "endpoint": "POST /audio/vocal-range"},
            "energy_mood": {"description": "Detect energy, danceability, mood", "endpoint": "POST /audio/energy-mood"},
            "frequency_spectrum": {"description": "Analyze frequency spectrum", "endpoint": "POST /audio/frequency"},
            "full_analysis": {"description": "Run all analyses at once", "endpoint": "POST /audio/analyze", "recommended": True},
            "lyrics_search": {"description": "Search lyrics via Genius API", "endpoint": "POST /audio/lyrics/search", "recommended": True},
            "lyrics_transcribe": {"description": "Transcribe lyrics from audio (Whisper)", "endpoint": "POST /audio/lyrics/from-audio"}
        }
    }


@router.post("/loudness")
async def detect_loudness_endpoint(file: UploadFile = File(...)):
    """Detect loudness metrics: LUFS, RMS, True Peak, Dynamic Range."""
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".wav"
    temp_path = os.path.join(TEMP_DIR, f"audio_{file_id}{file_ext}")

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        from core.modules.audio_analysis import detect_loudness
        import librosa

        y, sr = librosa.load(temp_path, sr=None)
        loudness = detect_loudness(y, sr)

        return {"status": "success", "loudness": loudness, "filename": file.filename}
    except Exception as e:
        print(f"Loudness endpoint error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Loudness detection failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/vocal-range")
async def detect_vocal_range_endpoint(file: UploadFile = File(...)):
    """Detect vocal range and voice type."""
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".wav"
    temp_path = os.path.join(TEMP_DIR, f"audio_{file_id}{file_ext}")

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        from core.modules.audio_analysis import detect_vocal_range
        import librosa

        y, sr = librosa.load(temp_path, sr=None)
        vocal_range = detect_vocal_range(y, sr)

        return {"status": "success", "vocal_range": vocal_range, "filename": file.filename}
    except Exception as e:
        print(f"Vocal range endpoint error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Vocal range detection failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/energy-mood")
async def detect_energy_mood_endpoint(file: UploadFile = File(...)):
    """Detect energy, danceability, and mood from audio."""
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".wav"
    temp_path = os.path.join(TEMP_DIR, f"audio_{file_id}{file_ext}")

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        from core.modules.audio_analysis import detect_energy_mood
        import librosa

        y, sr = librosa.load(temp_path, sr=None)
        energy_mood = detect_energy_mood(y, sr)

        return {"status": "success", "energy_mood": energy_mood, "filename": file.filename}
    except Exception as e:
        print(f"Energy/mood endpoint error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Energy/mood detection failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/frequency")
async def detect_frequency_spectrum_endpoint(file: UploadFile = File(...)):
    """Analyze frequency spectrum: Bass, Mids, Highs distribution."""
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".wav"
    temp_path = os.path.join(TEMP_DIR, f"audio_{file_id}{file_ext}")

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        from core.modules.audio_analysis import detect_frequency_spectrum
        import librosa

        y, sr = librosa.load(temp_path, sr=None)
        frequency = detect_frequency_spectrum(y, sr)

        return {"status": "success", "frequency_spectrum": frequency, "filename": file.filename}
    except Exception as e:
        print(f"Frequency endpoint error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Frequency analysis failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
