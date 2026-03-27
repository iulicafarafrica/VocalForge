# External LLM (Gemma 3 4B for intelligent music parameter extraction)
# Copy this code block to backend/main.py lines 2834-2941

if use_external_llm:
    print(f"[ACE {job_id[:8]}] 🌟 External LLM enabled: gemma3:4b for music parameter extraction")
    
    # Helper functions for parsing
    def parse_bpm(bpm_value):
        """Parse BPM value - handle ranges like '140-160' → 150 (average)"""
        if not bpm_value:
            return None
        bpm_str = str(bpm_value).strip()
        if "-" in bpm_str:
            try:
                parts = bpm_str.split("-")
                return (int(parts[0].strip()) + int(parts[1].strip())) // 2
            except:
                return None
        try:
            return int(bpm_str)
        except:
            return None
    
    def validate_key(key_value):
        """Validate and fix common key errors"""
        if not key_value:
            return ""
        key_str = str(key_value).strip()
        
        # Common shorthand mappings
        KEY_MAPPINGS = {
            "am": "A minor", "amin": "A minor", "a min": "A minor",
            "cm": "C minor", "cmin": "C minor", "c min": "C minor",
            "dm": "D minor", "dmin": "D minor", "d min": "D minor",
            "em": "E minor", "emin": "E minor", "e min": "E minor",
            "fm": "F minor", "fmin": "F minor", "f min": "F minor",
            "gm": "G minor", "gmin": "G minor", "g min": "G minor",
            "bm": "B minor", "bmin": "B minor", "b min": "B minor",
            "c": "C major", "d": "D major", "e": "E major",
            "f": "F major", "g": "G major", "a": "A major", "b": "B major",
            "platykey": "C minor", "minor": "A minor", "major": "C major"
        }
        
        key_lower = key_str.lower()
        if key_lower in KEY_MAPPINGS:
            return KEY_MAPPINGS[key_lower]
        
        # Try to normalize (e.g., "Am" → "A minor")
        if len(key_str) == 2:
            note = key_str[0].upper()
            suffix = key_str[1:].lower()
            if suffix == "m":
                return f"{note} minor"
            elif suffix in ["", "j"]:
                return f"{note} major"
        
        return key_str  # Return as-is, let ACE-Step validate
    
    # Build intelligent prompt for music parameter extraction
    has_user_lyrics = bool(lyrics and lyrics.strip())
    lyrics_instruction = ""
    if has_user_lyrics:
        lyrics_instruction = f"\n- Versuri existente: DA (user-ul a furnizat versuri)"
    elif generate_lyrics:
        lyrics_instruction = "\n- Versuri existente: NU - GENREAZĂ VERSURI NOI"
        lyrics_instruction += f"\n- Limba dorită: {vocal_language if vocal_language != 'unknown' else 'ro'}"
    else:
        lyrics_instruction = "\n- Versuri existente: NU - INSTRUMENTAL"
    
    llm_prompt = f"""Ești un asistent muzical expert. Extrage parametrii din: "{prompt}"
{lyrics_instruction}

Returnează DOAR JSON:
{{"bpm": <număr sau "140-160">, "key": "<ex: Am, C, Cm>", "style": "<gen>", "instruments": ["lista"], "mood": "<stare>", "time_signature": "4/4"{"," if not has_user_lyrics else ""}{"lyrics_structure": "<verse-chorus...>", "lyrics_theme": "<teme>", "language": "<ro/en>"} if not has_user_lyrics else ""}}

Exemple:
- "manele": {{"bpm": 110, "key": "Am", "style": "manele", "instruments": ["accordion", "synth", "drums"], "mood": "party", "time_signature": "4/4"}}
- "trap": {{"bpm": 140, "key": "Cm", "style": "trap", "instruments": ["808", "hi-hats", "synth"], "mood": "dark", "time_signature": "4/4"}}

Acum pentru: "{prompt}"
"""
    
    try:
        import httpx
        async with httpx.AsyncClient(timeout=30.0) as ollama_client:
            print(f"[ACE {job_id[:8]}] 📤 Sending prompt to Gemma 3...")
            ollama_response = await ollama_client.post(
                "http://localhost:11434/api/generate",
                json={"model": "gemma3:4b", "prompt": llm_prompt, "stream": False, "format": "json"}
            )
            
            if ollama_response.status_code == 200:
                response_data = ollama_response.json()
                response_text = response_data.get("response", "")
                print(f"[ACE {job_id[:8]}] 📥 Gemma 3 response received ({len(response_text)} chars)")
                
                import json, re
                json_match = re.search(r'\{[^{}]*\}', response_text, re.DOTALL)
                if json_match:
                    json_str = json_match.group(0)
                    try:
                        music_params = json.loads(json_str)
                        print(f"[ACE {job_id[:8]}] ✅ JSON parsed successfully")
                        
                        # Apply BPM (with range handling)
                        if music_params.get("bpm"):
                            parsed_bpm = parse_bpm(music_params["bpm"])
                            if parsed_bpm:
                                task_payload["bpm"] = parsed_bpm
                                print(f"[ACE {job_id[:8]}] 🎵 BPM: {music_params['bpm']} → {parsed_bpm}")
                        
                        # Apply Key (with validation)
                        if music_params.get("key"):
                            validated_key = validate_key(music_params["key"])
                            task_payload["key_scale"] = validated_key
                            print(f"[ACE {job_id[:8]}] 🎼 Key: {music_params['key']} → {validated_key}")
                        
                        # Apply Time Signature
                        if music_params.get("time_signature"):
                            task_payload["time_signature"] = str(music_params["time_signature"])
                            print(f"[ACE {job_id[:8]}] 🎶 Time Signature: {music_params['time_signature']}")
                        
                        # Enhance prompt
                        enhanced_prompt = prompt
                        if music_params.get("style"):
                            enhanced_prompt = f"{music_params['style']}, {prompt}"
                            print(f"[ACE {job_id[:8]}] 🎭 Style: {music_params['style']}")
                        if music_params.get("instruments"):
                            enhanced_prompt = f"{enhanced_prompt}, {', '.join(music_params['instruments'])}"
                            print(f"[ACE {job_id[:8]}] 🎸 Instruments: {music_params['instruments']}")
                        if music_params.get("mood"):
                            enhanced_prompt = f"{enhanced_prompt}, {music_params['mood']}"
                            print(f"[ACE {job_id[:8]}] 😊 Mood: {music_params['mood']}")
                        task_payload["prompt"] = enhanced_prompt
                        print(f"[ACE {job_id[:8]}] ✨ Enhanced prompt: {enhanced_prompt[:100]}...")
                        
                        # Generate Lyrics if enabled and no user lyrics
                        if generate_lyrics and not has_user_lyrics:
                            print(f"[ACE {job_id[:8]}] 📝 Generate Lyrics enabled...")
                            lyrics_structure = music_params.get("lyrics_structure", "verse-chorus-verse-chorus")
                            lyrics_theme = music_params.get("lyrics_theme", "generic")
                            lyrics_lang = music_params.get("language", vocal_language if vocal_language != 'unknown' else 'ro')
                            
                            lyrics_prompt = f"Scrie versuri pentru {music_params.get('style', 'melodie')}. Tema: {lyrics_theme}. Structura: {lyrics_structure}. Limba: {lyrics_lang}. Scrie DOAR versurile cu formatul [Verse], [Chorus], etc."
                            
                            lyrics_response = await ollama_client.post(
                                "http://localhost:11434/api/generate",
                                json={"model": "gemma3:4b", "prompt": lyrics_prompt, "stream": False},
                                timeout=60.0
                            )
                            
                            if lyrics_response.status_code == 200:
                                generated_lyrics = lyrics_response.json().get("response", "")
                                if generated_lyrics and generated_lyrics.strip():
                                    lyrics = generated_lyrics.strip()
                                    print(f"[ACE {job_id[:8]}] ✅ Lyrics generated ({len(lyrics)} chars)")
                                    print(f"[ACE {job_id[:8]}] 📝 Preview: {lyrics[:100]}...")
                        
                        # Set instrumental flag
                        if music_params.get("instrumental") == True:
                            task_payload["instrumental"] = True
                            print(f"[ACE {job_id[:8]}] 🎵 Instrumental: TRUE")
                        
                    except json.JSONDecodeError as json_err:
                        print(f"[ACE {job_id[:8]}] ⚠️ JSON parse error: {json_err}")
                else:
                    print(f"[ACE {job_id[:8]}] ⚠️ No JSON found in response")
            else:
                print(f"[ACE {job_id[:8]}] ❌ Ollama HTTP error: {ollama_response.status_code}")
                
    except Exception as ext_llm_err:
        print(f"[ACE {job_id[:8]}] ❌ External LLM error: {ext_llm_err}")
        import traceback
        traceback.print_exc()
else:
    task_payload["use_external_llm"] = False
