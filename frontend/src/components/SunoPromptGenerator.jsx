import { useState, useRef } from "react";

const API = "http://localhost:8000";

// ── Genres with Subgenres (like ACE-Step) ────────────────────────────────────
const GENRE_CATEGORIES = {
  'Romanian': [
    'Manele', 'Manele Clasice', 'Manele Moderne', 'Manele de Dragoste',
    'Manele Trap', 'Manele de Petrecere', 'Manele Orientale',
    'Muzică Populară', 'Folclor', 'Doină', 'Muzică Lăutărească', 'Taraf',
    'Sârbă', 'Hora', 'Brâu', 'Bătătură', 'Muzică de Nuntă', 'Muzică de Restaurant',
    'Muzică Ușoară Românească', 'Cântec Bătrânesc', 'Etno Românesc',
    'Pop Românesc', 'Rock Românesc', 'Hip-Hop Românesc', 'Trap Românesc',
    'Muzică Balcanică', 'Muzică Orientală', 'Colinde', 'Cântec Patriotic',
    'Indie / Alternativă România',
  ],
  'Hip-Hop': [
    'Hip-Hop', 'Trap', 'Atlanta Trap', 'Melodic Trap', 'Hard Trap', 'EDM Trap',
    'Drill', 'UK Drill', 'NY Drill', 'Afro Drill',
    'Melodic Rap', 'Emo Rap', 'Cloud Rap', 'Phonk', 'Drift Phonk', 'Memphis Rap',
    'Boom Bap', 'Gangsta Rap', 'G-Funk', 'Crunk', 'Trap Soul',
    'Mumble Rap', 'Rage Rap', 'Pluggnb', 'SoundCloud Rap', 'Hyphy',
    'Chopped & Screwed', 'Trap Metal', 'Latin Trap', 'Afrotrap',
    'Grime', 'Trap EDM', 'Lo-fi Hip-Hop', 'Jazz Rap', 'Conscious Rap',
    'Trap Beats', 'Plugg', 'Detroit Rap', 'Trap Flamenco',
  ],
  'Electronic': [
    'House', 'Deep House', 'Tech House', 'Progressive House', 'Electro House',
    'Big Room', 'Future House', 'Bass House', 'Jackin House', 'Chicago House',
    'Funky House', 'Soulful House', 'Vocal House', 'Disco House', 'Italo House',
    'Acid House', 'Ghetto House', 'Juke', 'Footwork', 'Afro House', 'Amapiano',
    'Techno', 'Trance', 'Dubstep', 'Drum & Bass', 'Ambient', 'EDM',
    'Synthwave', 'Chillout', 'Dark Ambient', 'Hardstyle', 'Psytrance',
  ],
  'Rock': [
    'Alternative Rock', 'Hard Rock', 'Indie Rock', 'Pop Punk', 'Grunge',
    'Post-Rock', 'Garage Rock', 'Psychedelic Rock',
  ],
  'Pop': [
    'Pop', 'Synth Pop', 'Dance Pop', 'K-Pop', 'J-Pop', 'Electropop', 'Indie Pop', 'Dream Pop',
  ],
  'R&B': [
    'R&B', 'Soul', 'Neo-Soul', 'Funk', 'Motown', 'Quiet Storm', 'Trap Soul',
  ],
  'Jazz': [
    'Jazz', 'Smooth Jazz', 'Jazz Fusion', 'Bebop', 'Cool Jazz', 'Swing', 'Blues',
  ],
  'Latin': [
    'Reggaeton', 'Latin Pop', 'Salsa', 'Timba', 'Bachata', 'Merengue', 'Cumbia', 'Mambo',
  ],
  'Metal': [
    'Heavy Metal', 'Metalcore', 'Death Metal', 'Black Metal', 'Power Metal',
    'Doom Metal', 'Symphonic Metal', 'Deathcore', 'Industrial Metal',
    'Groove Metal', 'Gothic Metal', 'Progressive Metal', 'Nu Metal',
    'Folk Metal', 'Sludge Metal', 'Post-Metal', 'Djent',
  ],
  'Other': [
    'Classical', 'Country', 'Bluegrass', 'Reggae', 'Dancehall', 'Dub',
    'Disco', 'Folk', 'Ambient', 'Ska', 'Rocksteady',
  ],
};

// ── Styles ───────────────────────────────────────────────────────────────────
const STYLES = [
  'Upbeat', 'Energetic', 'Emotional', 'Dark', 'Happy', 'Sad', 'Chill',
  'Aggressive', 'Melancholic', 'Atmospheric', 'Epic', 'Romantic', 'Funky'
];

// ── BPM Options ──────────────────────────────────────────────────────────────
const BPMS = ['80 BPM', '100 BPM', '120 BPM', '140 BPM', '160 BPM', '180 BPM', '200 BPM'];

// ── Tags ─────────────────────────────────────────────────────────────────────
const TAGS = [
  '[Intro]', '[Verse]', '[Pre-Chorus]', '[Chorus]', '[Bridge]', '[Outro]',
  '[Drop]', '[Build-up]', '[Breakdown]', '[Fast Tempo]', '[Slow Tempo]'
];

export default function PromptGenerator({ addLog }) {
  const [text, setText] = useState('');
  const [selectedGenreCat, setSelectedGenreCat] = useState('Hip-Hop');
  const [selectedSubgenres, setSelectedSubgenres] = useState([]);
  const [selectedStyles, setSelectedStyles] = useState([]);
  const [selectedBpm, setSelectedBpm] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);

  const toggleSubgenre = (s) => {
    setSelectedSubgenres(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const toggleStyle = (s) => {
    setSelectedStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setResult(null);

    try {
      const res = await fetch(`${API}/suno/prompt/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          genres: selectedSubgenres,
          styles: selectedStyles,
          bpm: selectedBpm,
        }),
      });
      
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }
      
      const data = await res.json();
      setResult(data);
      addLog?.(`[Prompt Gen] Generated: ${data.style_prompt}`);
    } catch (e) {
      console.error(e);
      addLog?.(`[ERR] Prompt Gen: ${e.message}`);
      setResult({ error: e.message });
    }
  };

  const handleCopy = () => {
    if (result?.style_prompt) {
      const full = `${result.style_prompt}\n\n${result.lyrics_formatted || text}`;
      navigator.clipboard.writeText(full).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleSendToSuno = () => {
    if (!result) return;
    localStorage.setItem('suno_prompt_from_generator', JSON.stringify({
      prompt: result.style_prompt,
      lyrics: result.lyrics_formatted || text,
    }));
    addLog?.(`[Prompt Gen] Sent to Suno tab`);
    alert(`✅ Prompt sent to Suno tab!\n\nOpen Suno AI tab and paste in Custom Mode.`);
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px' }}>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1a1a2e, #0f0f1a)",
        borderRadius: 12,
        padding: "20px 24px",
        marginBottom: 24,
        border: "1px solid #2a2a4a",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 10,
            background: "linear-gradient(135deg, #ffd166, #06d6a0)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, boxShadow: "0 4px 15px rgba(255,209,102,0.3)",
          }}>🎸</div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#e0e0ff", margin: 0 }}>
              Prompt Generator
            </h2>
            <p style={{ fontSize: 12, color: "#8888aa", margin: "4px 0 0 0" }}>
              Create professional prompts for AI music generation
            </p>
          </div>
        </div>
      </div>

      {/* Genre Categories */}
      <div style={{
        background: "#111122",
        borderRadius: 10,
        padding: "18px 20px",
        marginBottom: 20,
        border: "1px solid #2a2a4a",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ color: "#8888aa", fontSize: 13, fontWeight: 700 }}>🎵 GENRE & SUBGENRE</span>
          <span style={{ color: "#666688", fontSize: 11 }}>{selectedSubgenres.length} selected</span>
        </div>

        {/* Category Buttons */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {Object.keys(GENRE_CATEGORIES).map(cat => (
            <button
              key={cat}
              onClick={() => { setSelectedGenreCat(cat); setSelectedSubgenres([]); }}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                background: selectedGenreCat === cat ? "#00e5ff22" : "#0a0a1a",
                border: `1px solid ${selectedGenreCat === cat ? "#00e5ff" : "#2a2a4a"}`,
                color: selectedGenreCat === cat ? "#00e5ff" : "#666688",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {cat}
              <span style={{
                marginLeft: 6,
                background: selectedGenreCat === cat ? "#00e5ff44" : "#1a1a2e",
                color: selectedGenreCat === cat ? "#00e5ff" : "#444466",
                borderRadius: 10,
                padding: "2px 6px",
                fontSize: 9,
                fontWeight: 800,
              }}>{GENRE_CATEGORIES[cat].length}</span>
            </button>
          ))}
        </div>

        {/* Subgenre Buttons */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {GENRE_CATEGORIES[selectedGenreCat].map(sub => (
            <button
              key={sub}
              onClick={() => toggleSubgenre(sub)}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                background: selectedSubgenres.includes(sub) ? "#00e5ff22" : "#0a0a1a",
                border: `1px solid ${selectedSubgenres.includes(sub) ? "#00e5ff" : "#2a2a4a"}`,
                color: selectedSubgenres.includes(sub) ? "#00e5ff" : "#666688",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* Styles */}
      <div style={{
        background: "#111122",
        borderRadius: 10,
        padding: "18px 20px",
        marginBottom: 20,
        border: "1px solid #2a2a4a",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ color: "#8888aa", fontSize: 13, fontWeight: 700 }}>🎨 STYLES (TONE/VIBE)</span>
          <span style={{ color: "#666688", fontSize: 11 }}>{selectedStyles.length} selected</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {STYLES.map(s => (
            <button key={s} onClick={() => toggleStyle(s)}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                background: selectedStyles.includes(s) ? "#c77dff22" : "#0a0a1a",
                border: `1px solid ${selectedStyles.includes(s) ? "#c77dff" : "#2a2a4a"}`,
                color: selectedStyles.includes(s) ? "#c77dff" : "#666688",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* BPM */}
      <div style={{
        background: "#111122",
        borderRadius: 10,
        padding: "18px 20px",
        marginBottom: 20,
        border: "1px solid #2a2a4a",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ color: "#8888aa", fontSize: 13, fontWeight: 700 }}>⏱️ BPM (TEMPO)</span>
          <span style={{ color: selectedBpm ? "#ffd166" : "#666688", fontSize: 12, fontFamily: "monospace" }}>
            {selectedBpm || "None"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {BPMS.map(b => (
            <button key={b} onClick={() => setSelectedBpm(selectedBpm === b ? null : b)}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: 8,
                background: selectedBpm === b ? "#ffd16622" : "#0a0a1a",
                border: `1px solid ${selectedBpm === b ? "#ffd166" : "#2a2a4a"}`,
                color: selectedBpm === b ? "#ffd166" : "#666688",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}>
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div style={{
        background: "#111122",
        borderRadius: 10,
        padding: "18px 20px",
        marginBottom: 20,
        border: "1px solid #2a2a4a",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ color: "#8888aa", fontSize: 13, fontWeight: 700 }}>🏷️ STRUCTURE TAGS</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {TAGS.map(t => (
            <button key={t} onClick={() => {
              const current = text;
              const pos = textareaRef.current?.selectionStart || 0;
              const newText = current.slice(0, pos) + t + '\n' + current.slice(pos);
              setText(newText);
            }}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                background: "#0a0a1a",
                border: "1px solid #2a2a4a",
                color: "#8888aa",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Lyrics Input */}
      <div style={{
        background: "#111122",
        borderRadius: 10,
        padding: "18px 20px",
        marginBottom: 20,
        border: "1px solid #2a2a4a",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ color: "#8888aa", fontSize: 13, fontWeight: 700 }}>📝 LYRICS / PROMPT</span>
          <span style={{ color: "#666688", fontSize: 11 }}>{text.length} chars</span>
        </div>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter your lyrics or prompt here..."
          rows={10}
          style={{
            width: "100%",
            background: "#0a0a1a",
            border: "1px solid #2a2a4a",
            borderRadius: 8,
            padding: "14px 16px",
            color: "#e0e0ff",
            fontSize: 13,
            fontFamily: "monospace",
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#00e5ff";
            e.target.style.boxShadow = "0 0 0 2px #00e5ff22";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#2a2a4a";
            e.target.style.boxShadow = "none";
          }}
        />
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={!text.trim()}
        style={{
          width: "100%",
          padding: "16px",
          borderRadius: 10,
          border: "none",
          background: text.trim()
            ? "linear-gradient(135deg, #ffd166, #06d6a0)"
            : "#2a2a4a",
          color: text.trim() ? "#0a0a1a" : "#666688",
          fontWeight: 800,
          fontSize: 15,
          cursor: text.trim() ? "pointer" : "not-allowed",
          transition: "all 0.2s",
          marginBottom: 20,
        }}
      >
        {text.trim() ? "✨ Generate Prompt" : "Enter text to generate"}
      </button>

      {/* Result */}
      {result && (
        <div style={{
          background: result.error ? "#ef444422" : "#111122",
          borderRadius: 10,
          padding: "18px 20px",
          marginBottom: 20,
          border: result.error ? "1px solid #ef444444" : "1px solid #00e5ff44",
        }}>
          {result.error ? (
            <div style={{ color: "#ef4444", fontSize: 13 }}>
              ❌ Error: {result.error}
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ color: "#00e5ff", fontSize: 13, fontWeight: 700 }}>✅ GENERATED PROMPT</span>
              </div>

              {/* Style Prompt */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: "#8888aa", fontSize: 11, marginBottom: 6 }}>🎨 STYLE</div>
                <div style={{
                  background: "#0a0a1a",
                  borderRadius: 8,
                  padding: "12px 14px",
                  color: "#e0e0ff",
                  fontSize: 13,
                  border: "1px solid #2a2a4a",
                }}>
                  {result.style_prompt}
                </div>
              </div>

              {/* Lyrics */}
              {result.lyrics_formatted && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: "#8888aa", fontSize: 11, marginBottom: 6 }}>📝 LYRICS</div>
                  <pre style={{
                    background: "#0a0a1a",
                    borderRadius: 8,
                    padding: "12px 14px",
                    color: "#e0e0ff",
                    fontSize: 12,
                    fontFamily: "monospace",
                    whiteSpace: "pre-wrap",
                    border: "1px solid #2a2a4a",
                    margin: 0,
                  }}>
                    {result.lyrics_formatted}
                  </pre>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleCopy}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: 8,
                    border: "none",
                    background: copied ? "#06d6a0" : "#2a2a4a",
                    color: "white",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {copied ? "✅ Copied!" : "📋 Copy"}
                </button>
                <button
                  onClick={handleSendToSuno}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: 8,
                    border: "1px solid #c77dff",
                    background: "#c77dff22",
                    color: "#c77dff",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  🚀 Send to Suno
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
