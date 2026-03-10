# 🎸 Suno Prompt Generator for VocalForge

**Adapted from:** [ER-Suno-PromptGenerator](https://github.com/Eidolf/ER-Suno-PromptGenerator) by Eidolf  
**License:** AGPL-3.0  
**Original Project:** https://github.com/Eidolf/ER-Suno-PromptGenerator

---

## 📋 Overview

The **Suno Prompt Generator** helps you create structured, professional prompts for Suno AI music generation. It provides an intuitive interface for selecting genres, styles, BPM, and inserting structure tags.

---

## ✨ Features

### **1. Genre Selection**
- 30+ mainstream genres (Pop, Electronic, Rock, Hip-Hop, Jazz, etc.)
- 19 Metal subgenres (Death Metal, Symphonic Metal, Deathcore, etc.)
- Multiple selection allowed for fusion styles

### **2. Style & Mood**
- 28 tone/vibe descriptors (Energetic, Dark, Emotional, Epic, etc.)
- Tooltips explain each style's meaning
- Click to toggle on/off

### **3. BPM Control**
- 7 preset tempos (80-200 BPM)
- Single selection (classic tempo marking)

### **4. Structure Tags**
- 28 metatags for song structure ([Verse], [Chorus], [Drop], etc.)
- Auto-incrementing verse numbers ([Verse 1], [Verse 2], etc.)
- Click to insert at cursor position

### **5. Help System**
- Contextual help modals for each section
- Examples and templates
- Links to official Suno documentation

### **6. Integration**
- **Copy to Clipboard** — Copy full prompt (style + lyrics)
- **Send to Suno Tab** — Direct integration with VocalForge's Suno AI tab

---

## 🚀 Usage

### **Step 1: Open the Tab**
In VocalForge, click the **"Prompt Generator"** tab (guitar icon 🎸).

### **Step 2: Select Parameters**
1. **Genres** — Choose one or multiple genres
2. **Metal Subgenres** — If making metal, select primary subgenre
3. **Styles** — Add mood/tone descriptors
4. **BPM** — Select tempo (optional)

### **Step 3: Write Lyrics**
- Type or paste your lyrics in the text area
- Click structure tags to insert them at cursor position
- Use `[Verse]` for auto-incrementing verse numbers

### **Step 4: Generate**
Click **"🎵 Generate Prompt"** to format your prompt.

### **Step 5: Export**
- **📋 Copy to Clipboard** — Copies full prompt (style + lyrics)
- **🚀 Send to Suno Tab** — Sends to Suno AI tab for generation

---

## 📊 Example Output

**Input:**
- Genres: `Symphonic Metal`, `Electronic`
- Styles: `Epic`, `Dark`, `Energetic`
- BPM: `140 BPM`
- Lyrics:
  ```
  [Verse 1]
  Walking through the shadows...
  
  [Chorus]
  Rise up!
  ```

**Generated Prompt:**
```
Style: Symphonic Metal, Electronic, Epic, Dark, Energetic, 140 BPM

Lyrics:
[Verse 1]
Walking through the shadows...

[Chorus]
Rise up!
```

---

## 🔗 Integration with Suno AI Tab

The Prompt Generator integrates seamlessly with VocalForge's **Suno AI** tab:

1. Generate your prompt in **Prompt Generator**
2. Click **"🚀 Send to Suno Tab"**
3. Switch to **Suno AI** tab
4. The prompt is stored in localStorage
5. Paste into **Custom Mode** fields:
   - **Style** → Style prompt
   - **Lyrics** → Formatted lyrics

---

## 🛠️ API Endpoints

### `POST /suno/prompt/generate`
Generate a structured prompt.

**Request:**
```json
{
  "text": "[Verse]\nLyrics here...",
  "genres": ["Symphonic Metal", "Electronic"],
  "styles": ["Epic", "Dark"],
  "bpm": "140 BPM"
}
```

**Response:**
```json
{
  "style_prompt": "Symphonic Metal, Electronic, Epic, Dark, 140 BPM",
  "lyrics_formatted": "[Verse]\nLyrics here..."
}
```

### `GET /suno/prompt/tags`
Get all available tags, genres, styles, BPM options, and tooltips.

**Response:**
```json
{
  "genres": ["Pop", "Electronic", "Rock", ...],
  "metal_subgenres": ["Heavy Metal", "Thrash Metal", ...],
  "styles": ["Upbeat", "Energetic", "Slow", ...],
  "bpms": ["80 BPM", "100 BPM", ...],
  "structure_tags": ["[Intro]", "[Verse]", ...],
  "tooltips": { ... }
}
```

---

## 📖 Tips & Best Practices

### **Genre Combinations**
- **Fusion:** Combine 2-3 genres for unique styles (e.g., "Symphonic Metal + Electronic")
- **Metal First:** If using metal subgenres, place them first in the list

### **Structure Tags**
- **[Intro]** — Start with instrumental build-up
- **[Verse]** — Storytelling sections (lyrics change, melody consistent)
- **[Chorus]** — Main hook (repeats with same lyrics)
- **[Bridge]** — Contrasting section before final chorus
- **[Drop]** — For EDM/metal (climax section)

### **Style Descriptors**
- Use 2-4 styles max (too many dilutes the prompt)
- Place most important styles first
- Combine mood + energy (e.g., "Dark + Energetic")

### **BPM Guidelines**
- **80-100 BPM:** Slow, ballads, doom metal
- **120-140 BPM:** Mid-tempo, pop, rock
- **160-200 BPM:** Fast, metal, drum & bass

---

## ⚠️ Attribution & License

**This feature is adapted from:**
- **Project:** ER-Suno-PromptGenerator
- **Author:** Eidolf
- **GitHub:** https://github.com/Eidolf/ER-Suno-PromptGenerator
- **License:** AGPL-3.0

**VocalForge Integration:**
- Adapted for VocalForge by iulicafarafrica
- Integrated with Suno AI tab
- Modified for FastAPI + React stack

---

## 🙏 Credits

**Original Development:**
- Eidolf (ER-Suno-PromptGenerator)

**VocalForge Integration:**
- Backend adaptation
- Frontend adaptation (TypeScript → JSX)
- Suno AI tab integration
- Documentation

---

## 🔗 Resources

- **Official Suno Help:** https://help.suno.com/
- **Suno AI Wiki:** https://sunoaiwiki.com/
- **Meta Tag Guide:** https://sunometatagcreator.com/metatags-guide
- **ER-Suno-PromptGenerator:** https://github.com/Eidolf/ER-Suno-PromptGenerator

---

**Last Updated:** 2026-03-10  
**VocalForge Version:** v2.0.0
