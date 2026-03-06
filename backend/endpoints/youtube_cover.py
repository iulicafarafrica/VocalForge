"""
YouTube Cover Generator Endpoint for VocalForge
Download audio from YouTube and process for RVC conversion
"""

import os
import uuid
import yt_dlp
import subprocess
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/youtube", tags=["YouTube Cover"])

# Directories
BASE_DIR = Path(__file__).parent.parent
OUTPUT_DIR = BASE_DIR / "output" / "youtube"
TEMP_DIR = BASE_DIR / "temp" / "youtube"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/download")
async def youtube_download(
    url: str = Form(..., description="YouTube video URL"),
    output_format: str = Form("wav", description="Output format: wav, mp3"),
    quality: str = Form("best", description="Audio quality: best, high, medium, low"),
):
    """
    Download audio from YouTube video.
    
    Supports:
    - YouTube videos
    - YouTube Music
    - Shorts
    
    Returns downloaded audio file path.
    """
    job_id = uuid.uuid4().hex
    
    try:
        print(f"\n[YouTube] Downloading: {url}")
        print(f"[YouTube] Format: {output_format} | Quality: {quality}")
        
        # Configure yt-dlp options
        ydl_opts = {
            'format': 'bestaudio/best',
            'quiet': True,
            'no_warnings': True,
            'extractaudio': True,
            'audioformat': output_format,
            'audioquality': '0' if quality == 'best' else '5' if quality == 'high' else '8',
            'outtmpl': str(TEMP_DIR / f"{job_id}_%(title)s.%(ext)s"),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': output_format,
                'preferredquality': '0' if quality == 'best' else '192',
            }],
        }
        
        # Download
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            
            # Get video info
            video_title = info.get('title', 'Unknown')
            video_duration = info.get('duration', 0)
            video_uploader = info.get('uploader', 'Unknown')
            
            # Find downloaded file
            downloaded_file = None
            for ext in [output_format, 'webm', 'm4a', 'mp3']:
                potential_file = TEMP_DIR / f"{job_id}_{video_title}.{ext}"
                if potential_file.exists():
                    downloaded_file = potential_file
                    break
            
            if not downloaded_file:
                # Try to find any file with job_id
                for f in TEMP_DIR.glob(f"{job_id}_*"):
                    downloaded_file = f
                    break
            
            if not downloaded_file:
                raise Exception("Downloaded file not found")
            
            # Rename to clean filename
            clean_filename = f"youtube_{job_id}.{output_format}"
            final_path = OUTPUT_DIR / clean_filename
            
            # Move to output folder
            import shutil
            shutil.move(str(downloaded_file), str(final_path))
            
            print(f"[YouTube] Download complete: {final_path.name}")
            print(f"[YouTube] Title: {video_title}")
            print(f"[YouTube] Duration: {video_duration}s")
            print(f"[YouTube] Uploader: {video_uploader}")
            
            return JSONResponse({
                "status": "ok",
                "filename": clean_filename,
                "url": f"/tracks/youtube/{clean_filename}",
                "video_title": video_title,
                "video_duration": video_duration,
                "video_uploader": video_uploader,
                "job_id": job_id,
            })
            
    except Exception as e:
        print(f"[YouTube] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cover")
async def youtube_cover(
    url: str = Form(..., description="YouTube video URL"),
    rvc_model_name: str = Form(..., description="RVC model name"),
    pitch_shift: float = Form(0, description="Pitch shift in semitones"),
    f0_method: str = Form("rmvpe", description="F0 extraction method"),
    index_rate: float = Form(0.75, description="Index rate"),
    output_format: str = Form("wav", description="Output format"),
):
    """
    Complete YouTube cover pipeline:
    1. Download from YouTube
    2. Separate vocals (BS-RoFormer)
    3. RVC conversion
    4. Mix back with instrumental
    5. Return final cover
    """
    from audio_separator.separator import Separator
    from core.modules.rvc_model import RVCModel
    import librosa
    import soundfile as sf
    import numpy as np
    import time
    
    job_id = uuid.uuid4().hex
    temp_dir = TEMP_DIR / job_id
    temp_dir.mkdir(parents=True, exist_ok=True)
    
    total_start = time.time()
    
    try:
        # Step 1: Download from YouTube
        print(f"\n[Cover] Step 1/5: Downloading from YouTube...")
        step1_start = time.time()
        
        ydl_opts = {
            'format': 'bestaudio/best',
            'quiet': True,
            'no_warnings': True,
            'extractaudio': True,
            'audioformat': 'wav',
            'outtmpl': str(temp_dir / "input.wav"),
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            video_title = info.get('title', 'Unknown')
        
        step1_time = time.time() - step1_start
        print(f"[Cover] Step 1 complete: {step1_time:.1f}s")
        
        # Step 2: Separate vocals with BS-RoFormer
        print(f"\n[Cover] Step 2/5: BS-RoFormer separation...")
        step2_start = time.time()
        
        separator = Separator(
            output_dir=str(temp_dir),
            output_format="WAV",
            normalization_threshold=0.9,
        )
        separator.load_model(model_filename="model_bs_roformer_ep_317_sdr_12.9755.ckpt")
        outputs = separator.separate(str(temp_dir / "input.wav"))
        
        # Find vocals and instrumental
        vocals_path = None
        instrumental_path = None
        for out_file in outputs:
            out_path = temp_dir / out_file
            if "vocals" in out_file.lower() or "(Vocals)" in out_file:
                vocals_path = out_path
            elif "instrumental" in out_file.lower() or "(Instrumental)" in out_file:
                instrumental_path = out_path
        
        if not vocals_path:
            raise Exception("BS-RoFormer did not produce vocal output")
        
        step2_time = time.time() - step2_start
        print(f"[Cover] Step 2 complete: {step2_time:.1f}s")
        
        # Step 3: RVC conversion
        print(f"\n[Cover] Step 3/5: RVC conversion...")
        step3_start = time.time()
        
        # Find RVC model
        weights_dir = BASE_DIR.parent / "RVCWebUI" / "assets" / "weights"
        model_path = weights_dir / rvc_model_name
        
        if not model_path.exists():
            raise Exception(f"RVC model not found: {rvc_model_name}")
        
        # Load and convert
        rvc = RVCModel()
        rvc.load_model(str(model_path))
        
        audio, sr = librosa.load(str(vocals_path), sr=16000, mono=True)
        converted_audio, out_sr = rvc.convert(
            audio=audio,
            sr=sr,
            f0_up_key=pitch_shift,
            f0_method=f0_method,
            index_rate=index_rate,
            filter_radius=3,
            rms_mix_rate=0.25,
            protect=0.33,
        )
        
        rvc.unload_model()
        
        # Save converted vocal
        converted_vocal_path = temp_dir / "converted_vocal.wav"
        sf.write(str(converted_vocal_path), converted_audio, out_sr)
        
        step3_time = time.time() - step3_start
        print(f"[Cover] Step 3 complete: {step3_time:.1f}s")
        
        # Step 4: Mix converted vocal with instrumental
        print(f"\n[Cover] Step 4/5: Mixing...")
        step4_start = time.time()
        
        if instrumental_path and instrumental_path.exists():
            # Load both tracks
            vocals_conv, sr_v = librosa.load(str(converted_vocal_path), sr=None, mono=True)
            instrumental, sr_i = librosa.load(str(instrumental_path), sr=None, mono=True)
            
            # Resample if needed
            if sr_i != sr_v:
                instrumental = librosa.resample(instrumental, orig_sr=sr_i, target_sr=sr_v)
            
            # Match lengths
            target_len = max(len(vocals_conv), len(instrumental))
            vocals_conv = np.pad(vocals_conv, (0, max(0, target_len - len(vocals_conv))))
            instrumental = np.pad(instrumental, (0, max(0, target_len - len(instrumental))))
            
            # Mix (70% vocal, 30% instrumental - adjust as needed)
            mixed = (vocals_conv * 0.7) + (instrumental * 0.3)
            
            # Normalize
            max_val = np.abs(mixed).max()
            if max_val > 0.95:
                mixed = mixed * (0.95 / max_val)
            
            mixed_path = temp_dir / "mixed.wav"
            sf.write(str(mixed_path), mixed, sr_v)
        else:
            # No instrumental, just use converted vocal
            mixed_path = converted_vocal_path
        
        step4_time = time.time() - step4_start
        print(f"[Cover] Step 4 complete: {step4_time:.1f}s")
        
        # Step 5: Save final output
        print(f"\n[Cover] Step 5/5: Saving final output...")
        step5_start = time.time()
        
        # Clean filename
        safe_title = "".join(c for c in video_title if c.isalnum() or c in ' -_')[:50]
        final_filename = f"{safe_title}_{rvc_model_name}_cover.{output_format}"
        final_path = OUTPUT_DIR / final_filename
        
        # Convert to output format
        if output_format == "mp3":
            subprocess.run([
                "ffmpeg", "-y",
                "-i", str(mixed_path),
                "-codec:a", "libmp3lame",
                "-b:a", "192k",
                str(final_path)
            ], check=True, capture_output=True)
        else:
            import shutil
            shutil.copy(str(mixed_path), str(final_path))
        
        step5_time = time.time() - step5_start
        print(f"[Cover] Step 5 complete: {step5_time:.1f}s")
        
        # Cleanup temp
        import shutil
        shutil.rmtree(str(temp_dir))
        
        total_time = time.time() - total_start
        
        print(f"\n{'='*60}")
        print(f"[Cover] PIPELINE COMPLETE")
        print(f"{'='*60}")
        print(f"Title: {video_title}")
        print(f"Model: {rvc_model_name}")
        print(f"Pitch: {pitch_shift} semitones")
        print(f"Total time: {total_time:.1f}s ({total_time/60:.1f} min)")
        print(f"Output: {final_path}")
        print(f"{'='*60}\n")
        
        return JSONResponse({
            "status": "ok",
            "filename": final_filename,
            "url": f"/tracks/youtube/{final_filename}",
            "video_title": video_title,
            "rvc_model": rvc_model_name,
            "total_time_sec": round(total_time, 1),
            "steps": {
                "download": round(step1_time, 1),
                "separation": round(step2_time, 1),
                "rvc_conversion": round(step3_time, 1),
                "mixing": round(step4_time, 1),
                "save": round(step5_time, 1),
            }
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        
        # Cleanup on error
        if temp_dir.exists():
            try:
                import shutil
                shutil.rmtree(str(temp_dir))
            except:
                pass
        
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/temp/cleanup")
async def cleanup_temp():
    """Clean up old temporary files (older than 24 hours)"""
    import time
    
    cleaned = 0
    current_time = time.time()
    
    for f in TEMP_DIR.glob("*"):
        file_age = current_time - f.stat().st_mtime
        if file_age > 86400:  # 24 hours
            try:
                if f.is_file():
                    f.unlink()
                elif f.is_dir():
                    import shutil
                    shutil.rmtree(str(f))
                cleaned += 1
            except:
                pass
    
    return JSONResponse({
        "status": "ok",
        "cleaned_files": cleaned,
    })
