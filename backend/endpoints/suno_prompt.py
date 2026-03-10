"""
backend/endpoints/suno_prompt.py
Suno Prompt Generator - Adapted from ER-Suno-PromptGenerator
https://github.com/Eidolf/ER-Suno-PromptGenerator

Generate structured prompts for Suno AI with genres, styles, BPM, and structure tags.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/suno/prompt", tags=["Suno Prompt Generator"])


class PromptRequest(BaseModel):
    text: str
    genres: List[str] = []
    styles: List[str] = []
    bpm: Optional[str] = None


class PromptResponse(BaseModel):
    style_prompt: str  # Combined genres, styles, BPM for Suno style field
    lyrics_formatted: str  # Formatted lyrics with structure tags


@router.post("/generate", response_model=PromptResponse)
def generate_prompt(req: PromptRequest):
    """
    Generate a structured prompt for Suno AI.
    
    Combines:
    - Genres (e.g., "Electronic, Rock, Synthwave")
    - Styles (e.g., "Dark, Energetic, Epic")
    - BPM (e.g., "140 BPM")
    - Lyrics with structure tags ([Verse], [Chorus], etc.)
    """
    # Format lyrics - clean up empty lines and strip whitespace
    lines = req.text.split("\n")
    formatted_lyrics = []
    
    for line in lines:
        stripped = line.strip()
        if stripped:
            formatted_lyrics.append(stripped)
    
    # Build style prompt: genres + styles + BPM
    style_parts = []
    
    # Add genres first
    if req.genres:
        style_parts.extend(req.genres)
    
    # Add styles (tones/moods)
    if req.styles:
        style_parts.extend(req.styles)
    
    # Add BPM at the end
    if req.bpm:
        style_parts.append(req.bpm)
    
    style_prompt = ", ".join(style_parts) if style_parts else ""
    
    return PromptResponse(
        style_prompt=style_prompt,
        lyrics_formatted="\n".join(formatted_lyrics)
    )


@router.get("/tags")
def get_available_tags():
    """Get all available tags, genres, styles, and BPM options."""
    return {
        "genres": [
            'Pop', 'Electronic', 'Rock', 'Hip-Hop', 'Jazz', 'Classical', 'R&B', 'Country', 
            'Lo-Fi', 'EDM', 'Acoustic', 'Indie', 'Alternative', 'Folk', 'Soul', 'Funk', 
            'Blues', 'Reggae', 'Punk', 'Disco', 'House', 'Techno', 'Trance', 'Dubstep', 
            'Drum and Bass', 'Synthwave', 'Ambient', 'Trap', 'K-Pop', 'J-Pop'
        ],
        "metal_subgenres": [
            'Heavy Metal', 'Thrash Metal', 'Death Metal', 'Black Metal', 'Power Metal', 
            'Doom Metal', 'Symphonic Metal', 'Progressive Metal', 'Nu Metal', 'Folk Metal', 
            'Metalcore', 'Deathcore', 'Industrial Metal', 'Groove Metal', 'Gothic Metal', 
            'Sludge Metal', 'Post-Metal', 'Djent'
        ],
        "styles": [
            'Upbeat', 'Energetic', 'Slow', 'Emotional', 'Aggressive', 'Melancholic', 
            'Atmospheric', 'Epic', 'Dark', 'Happy', 'Sad', 'Chill', 'Ambient', 'Fast', 
            'Heavy', 'Driving', 'Groovy', 'Soothing', 'Dreamy', 'Intense', 'Romantic', 
            'Mysterious', 'Euphoric', 'Uplifting', 'Nostalgic', 'Funky', 'Raw', 'Polished'
        ],
        "bpms": ['80 BPM', '100 BPM', '120 BPM', '140 BPM', '160 BPM', '180 BPM', '200 BPM'],
        "structure_tags": [
            '[Intro]', '[Verse]', '[Pre-Chorus]', '[Chorus]', '[Bridge]', '[Guitar Solo]', 
            '[Drop]', '[Build-up]', '[Breakdown]', '[Outro]', '[Fast Tempo]', '[Slow Tempo]', 
            '[Upbeat]', '[Acoustic]', '[Epic]', '[Intimate]', '[Female Vocals]', '[Male Vocals]', 
            '[Instrumental]', '[Bass Drop]', '[Beat Drop]', '[Vocalization]', '[Choir]', 
            '[Orchestral]', '[Synth Solo]', '[Drum Fill]', '[Fade Out]', '[Acapella]', '[End]'
        ],
        "tooltips": {
            # Styles
            'Upbeat': 'Positive, cheerful, and fast-paced.',
            'Energetic': 'High-intensity, lively, and driving.',
            'Slow': 'Unrushed, relaxed, and deliberate pace.',
            'Emotional': 'Expressive, deeply feeling, and moving.',
            'Aggressive': 'Fierce, intense, and forceful.',
            'Melancholic': 'Sorrowful, pensive, and sad.',
            'Atmospheric': 'Focuses on mood, texture, and spatial audio.',
            'Epic': 'Grand, monumental, and cinematic.',
            'Dark': 'Ominous, gloomy, or brooding tone.',
            'Happy': 'Joyful, bright, and positive.',
            'Sad': 'Sorrowful, downbeat, and expressing grief.',
            'Chill': 'Relaxing, laid-back, and easygoing.',
            'Ambient': 'Background-focused, texture-heavy, no strict beat.',
            'Fast': 'Quick tempo, rapid delivery.',
            'Heavy': 'Thick texture, often loud, distorted, or bass-heavy.',
            'Driving': 'Relentless forward momentum in rhythm.',
            'Groovy': 'Rhythmic feel that strongly invites dancing or movement.',
            'Soothing': 'Calming, gentle, and peaceful.',
            'Dreamy': 'Ethereal, surreal, and smooth.',
            'Intense': 'Extreme emotion or volume; highly focused.',
            'Romantic': 'Expressing love or deep affection.',
            'Mysterious': 'Enigmatic, suspenseful, and secretive.',
            'Euphoric': 'Intensely happy, soaring, and ecstatic.',
            'Uplifting': 'Inspiring hope, elevation, and optimism.',
            'Nostalgic': 'Evocative of the past, sentimental.',
            'Funky': 'Syncopated, bass-forward, and bouncy.',
            'Raw': 'Unpolished, authentic, and gritty.',
            'Polished': 'Clean, highly produced, and perfect.',
            
            # Tags
            '[Intro]': 'The opening section of the song before the main vocals.',
            '[Verse]': 'The main storytelling section; melody is often consistent while lyrics change.',
            '[Pre-Chorus]': 'Builds tension and transitions from the verse to the chorus.',
            '[Chorus]': 'The memorable, repeating core message and melody of the song.',
            '[Bridge]': 'A contrasting section to introduce new musical ideas, often near the end.',
            '[Guitar Solo]': 'An instrumental section featuring a lead guitar.',
            '[Drop]': 'The climax of an electronic track, featuring heavy bass and beats.',
            '[Build-up]': 'A section of rising tension and increasing speed, usually before a drop.',
            '[Breakdown]': 'A stripped-back section where most instruments drop out to rebuild energy.',
            '[Outro]': 'The closing, fading section of the song.',
            '[Fast Tempo]': 'Instruction to suddenly increase the speed of the song.',
            '[Slow Tempo]': 'Instruction to suddenly decrease the speed or stretch out the timing.',
            '[Upbeat]': 'Instruction to shift to a happier, bouncy rhythm.',
            '[Acoustic]': 'Instruction to switch to non-electronic, organic instruments.',
            '[Epic]': 'Instruction to shift to a massive, cinematic arrangement.',
            '[Intimate]': 'Instruction to bring the vocals closer and quiet the instruments.',
            '[Female Vocals]': 'Request female singer.',
            '[Male Vocals]': 'Request male singer.',
            '[Instrumental]': 'Request a section (or whole song) without any vocals.',
            '[Bass Drop]': 'A sudden, heavy impact of sub-bass frequencies.',
            '[Beat Drop]': 'The moment the full rhythm section kicks in.',
            '[Vocalization]': 'Non-lyrical singing (e.g., "oohs", "aahs").',
            '[Choir]': 'A group of voices singing in harmony.',
            '[Orchestral]': 'Instruction to bring in classical string and brass sections.',
            '[Synth Solo]': 'An instrumental section featuring an electronic synthesizer.',
            '[Drum Fill]': 'A short flourish played on the drums to fill a gap.',
            '[Fade Out]': 'Instruction to gradually lower the volume to end the song.',
            '[Acapella]': 'Vocals only, completely without instrumental backing.',
            '[End]': 'Hard stop to officially terminate the song generation.'
        }
    }
