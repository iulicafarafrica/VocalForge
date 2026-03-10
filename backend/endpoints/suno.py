"""
backend/endpoints/suno.py
Suno AI music generation via LOCAL suno-api (cookie authentication)
Requires: python suno-api/start_suno.py running on port 8080
"""

import httpx
import asyncio
import json
from fastapi import APIRouter, Form, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/suno", tags=["Suno"])

SUNO_LOCAL_URL = "http://localhost:8080"
POLL_INTERVAL  = 3    # secunde între poll-uri
POLL_TIMEOUT   = 180  # secunde maxim de așteptat


@router.post("/generate")
async def suno_generate(
    prompt: str = Form(""),
    lyrics: str = Form(""),
    style: str = Form(""),
    title: str = Form(""),
    model: str = Form("chirp-auk-turbo"),
    instrumental: str = Form("false"),
):
    is_instrumental = instrumental.lower() == "true"
    is_custom = bool(lyrics.strip())

    if is_custom:
        payload = {
            "prompt": lyrics,
            "mv": model,
            "title": title or "",
            "tags": style or prompt,
            "negative_tags": "",
            "make_instrumental": is_instrumental,
            "generation_type": "TEXT",
        }
    else:
        payload = {
            "prompt": "",
            "mv": model,
            "title": title or "",
            "tags": prompt or style or "",
            "negative_tags": "",
            "make_instrumental": is_instrumental,
            "generation_type": "TEXT",
        }

    print(f"[Suno Local] Model: {model}")
    print(f"[Suno Local] Payload: {payload}")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(f"{SUNO_LOCAL_URL}/generate", json=payload)

        print(f"[Suno Local] Generate status: {r.status_code}")
        print(f"[Suno Local] Generate response: {r.text[:500]}")

        if r.status_code not in (200, 201, 202):
            return JSONResponse(status_code=r.status_code, content={
                "status": "error",
                "error": f"suno-api error {r.status_code}: {r.text[:300]}",
            })

        resp = r.json()

        # Extrage clip IDs din răspuns
        clips = resp.get("clips", [])
        if not clips:
            return JSONResponse(status_code=500, content={
                "status": "error",
                "error": "No clips returned from Suno",
            })

        clip_ids = [c["id"] for c in clips if c.get("id")]
        print(f"[Suno Local] Clip IDs: {clip_ids}, polling pentru audio_url...")

        # Polling până când audio_url apare
        elapsed = 0
        while elapsed < POLL_TIMEOUT:
            await asyncio.sleep(POLL_INTERVAL)
            elapsed += POLL_INTERVAL

            ready_clips = []
            all_ready = True

            for clip_id in clip_ids:
                try:
                    async with httpx.AsyncClient(timeout=15.0) as client:
                        feed_r = await client.get(f"{SUNO_LOCAL_URL}/feed/{clip_id}")
                    
                    if feed_r.status_code != 200:
                        all_ready = False
                        continue

                    feed_data = feed_r.json()
                    # feed poate returna lista sau dict
                    if isinstance(feed_data, list):
                        clip = feed_data[0] if feed_data else {}
                    else:
                        clip = feed_data

                    audio_url = clip.get("audio_url", "")
                    status    = clip.get("status", "")

                    print(f"[Suno Poll] {clip_id[:8]}... status={status} audio_url={'YES' if audio_url else 'NO'} ({elapsed}s)")

                    if audio_url and status in ("complete", "streaming", ""):
                        ready_clips.append({
                            "id":        clip.get("id"),
                            "title":     clip.get("title") or title or prompt[:40],
                            "audio_url": audio_url,
                            "image_url": clip.get("image_url") or clip.get("image_large_url"),
                            "duration":  clip.get("metadata", {}).get("duration") or clip.get("duration"),
                            "lyric":     clip.get("lyric") or clip.get("metadata", {}).get("prompt"),
                            "model":     model,
                        })
                    else:
                        all_ready = False

                except Exception as e:
                    print(f"[Suno Poll] Error fetching feed for {clip_id}: {e}")
                    all_ready = False

            if all_ready and len(ready_clips) == len(clip_ids):
                print(f"[Suno Local] Toate clipurile ready după {elapsed}s!")
                return {"status": "ok", "audios": ready_clips}

        # Timeout — returnează ce avem
        print(f"[Suno Local] Timeout după {POLL_TIMEOUT}s!")
        return JSONResponse(status_code=504, content={
            "status": "error",
            "error": f"Timeout — Suno nu a finalizat generarea în {POLL_TIMEOUT}s. Încearcă din nou.",
        })

    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail={
            "status": "error",
            "error": "Cannot connect to suno-api at localhost:8080. Please run: python suno-api/start_suno.py",
        })
    except httpx.TimeoutException:
        return JSONResponse(status_code=504, content={
            "status": "error",
            "error": "Timeout la conectarea cu suno-api",
        })
    except Exception as e:
        return JSONResponse(status_code=500, content={
            "status": "error", "error": str(e)
        })


@router.get("/models")
async def suno_models():
    return {
        "models": [
            {"id": "chirp-auk-turbo", "label": "Suno Turbo — Free tier · Fast"},
            {"id": "chirp-v5",        "label": "Suno v5 — Best quality (Pro)"},
            {"id": "chirp-v4-5",      "label": "Suno v4.5 — Balanced (Pro)"},
            {"id": "chirp-v4",        "label": "Suno v4 — Stable (Pro)"},
        ]
    }


@router.get("/health")
async def suno_health():
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{SUNO_LOCAL_URL}/")
        if r.status_code == 200:
            return {"status": "connected", "url": SUNO_LOCAL_URL, "message": "suno-api is running"}
        else:
            return JSONResponse(status_code=503, content={
                "status": "error",
                "error": f"suno-api returned status {r.status_code}",
            })
    except httpx.ConnectError:
        return JSONResponse(status_code=503, content={
            "status": "disconnected",
            "error": "Cannot connect to suno-api at localhost:8080",
        })
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "error": str(e)})
