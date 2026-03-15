import React, { useState, useEffect } from "react";

const API = "http://localhost:8000";

export default function LyricsTab({ addLog }) {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  
  // Transcribe state
  const [transcribeFile, setTranscribeFile] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  
  // Lyrics state
  const [lyrics, setLyrics] = useState("");
  const [lyricsTitle, setLyricsTitle] = useState("");
  const [lyricsArtist, setLyricsArtist] = useState("");
  const [lyricsSource, setLyricsSource] = useState("");
  
  // Library state
  const [lyricsLibrary, setLyricsLibrary] = useState([]);
  const [showLibrary, setShowLibrary] = useState(false);
  
  // Save state
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveName, setSaveName] = useState("");

  // Load library on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vocalforge_lyrics_library");
      if (saved) {
        setLyricsLibrary(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load lyrics library:", e);
    }
  }, []);

  // Search lyrics via lyrics.ovh (FREE API)
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      addLog?.("[Lyrics] Please enter artist and title");
      alert("Please enter search in format: Artist - Title");
      return;
    }
    
    // Parse "Artist - Title" format
    const parts = searchQuery.split(/[-–—]/);
    const artist = parts[0]?.trim() || "";
    const title = parts.slice(1).join("-").trim() || searchQuery;
    
    if (!artist || !title) {
      addLog?.("[Lyrics] Please use format: Artist - Title");
      alert("Please enter search in format: Artist - Title (e.g., Queen - Bohemian Rhapsody)");
      return;
    }
    
    setSearching(true);
    addLog?.(`[Lyrics] Searching: ${artist} - ${title}`);
    
    const fd = new FormData();
    fd.append("artist", artist);
    fd.append("title", title);
    fd.append("use_lyrics_ovh", "true");
    
    try {
      const res = await fetch(`${API}/audio/lyrics/search`, {
        method: "POST",
        body: fd,
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || "Search failed");
      
      setLyrics(data.lyrics);
      setLyricsArtist(data.artist);
      setLyricsTitle(data.title);
      setLyricsSource(data.source || "lyrics.ovh");
      
      addLog?.(`[Lyrics] Found: ${data.artist} - ${data.title} (${data.lyrics?.length || 0} chars)`);
    } catch (err) {
      addLog?.(`[Lyrics] Error: ${err.message}`);
      alert(`Search failed: ${err.message}\n\nNote: Not all songs have lyrics available.`);
    } finally {
      setSearching(false);
    }
  };

  // Transcribe lyrics from audio (Whisper AI)
  const handleTranscribe = async () => {
    if (!transcribeFile) {
      addLog?.("[Lyrics] Please select an audio file");
      return;
    }
    
    setTranscribing(true);
    addLog?.(`[Lyrics] Transcribing: ${transcribeFile.name}`);
    
    const fd = new FormData();
    fd.append("file", transcribeFile);
    
    try {
      const res = await fetch(`${API}/audio/lyrics/from-audio`, {
        method: "POST",
        body: fd,
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || "Transcription failed");
      
      setLyrics(data.lyrics);
      setLyricsTitle(transcribeFile.name);
      setLyricsArtist("Unknown");
      setLyricsSource("Whisper AI");
      
      addLog?.(`[Lyrics] Transcribed: ${data.lyrics?.length || 0} characters`);
    } catch (err) {
      addLog?.(`[Lyrics] Error: ${err.message}`);
      alert(`Transcription failed: ${err.message}\n\nMake sure Whisper is installed: pip install openai-whisper`);
    } finally {
      setTranscribing(false);
    }
  };

  // Save to library
  const saveToLibrary = () => {
    if (!lyrics.trim() || !saveName.trim()) return;
    
    const newEntry = {
      id: Date.now(),
      name: saveName,
      artist: lyricsArtist || "Unknown",
      title: lyricsTitle || "Untitled",
      lyrics: lyrics,
      source: lyricsSource || "Manual",
      created: new Date().toLocaleString(),
    };
    
    const updated = [newEntry, ...lyricsLibrary];
    setLyricsLibrary(updated);
    localStorage.setItem("vocalforge_lyrics_library", JSON.stringify(updated));
    
    setSaveName("");
    setShowSaveInput(false);
    addLog?.(`[Lyrics] Saved: ${saveName}`);
  };

  // Load from library
  const loadFromLibrary = (entry) => {
    setLyrics(entry.lyrics);
    setLyricsTitle(entry.title);
    setLyricsArtist(entry.artist);
    setLyricsSource(entry.source || "Library");
    setShowLibrary(false);
    addLog?.(`[Lyrics] Loaded: ${entry.name}`);
  };

  // Delete from library
  const deleteFromLibrary = (id) => {
    const updated = lyricsLibrary.filter(item => item.id !== id);
    setLyricsLibrary(updated);
    localStorage.setItem("vocalforge_lyrics_library", JSON.stringify(updated));
    addLog?.(`[Lyrics] Deleted entry`);
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(lyrics);
    addLog?.("[Lyrics] Copied to clipboard");
    alert("✅ Lyrics copied to clipboard!");
  };

  // Use in ACE-Step
  const useInAceStep = () => {
    localStorage.setItem("acestep_lyrics_from_manager", lyrics);
    addLog?.("[Lyrics] Sent to ACE-Step");
    alert("✅ Lyrics sent to ACE-Step!\n\nGo to ACE-Step tab and check the Lyrics field.");
  };

  // Export to file
  const exportToFile = () => {
    if (!lyrics.trim()) return;
    
    const content = `[${lyricsTitle || "Untitled"}]\nArtist: ${lyricsArtist || "Unknown"}\nSource: ${lyricsSource || "Unknown"}\n\n${lyrics}\n`;
    
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(lyricsTitle || "lyrics").replace(/[^a-z0-9]/gi, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    addLog?.("[Lyrics] Exported to file");
  };

  // Clear lyrics
  const clearLyrics = () => {
    setLyrics("");
    setLyricsTitle("");
    setLyricsArtist("");
    setLyricsSource("");
    addLog?.("[Lyrics] Cleared");
  };

  // Cyberpunk theme
  const cyberpunk = {
    bg: {
      primary: "linear-gradient(135deg, #0a0a1a 0%, #0d0d22 50%, #0a0a1a 100%)",
      card: "linear-gradient(180deg, rgba(13,13,34,0.95) 0%, rgba(8,8,24,0.98) 100%)",
    },
    neon: {
      purple: { primary: "#9b2de0", glow: "rgba(155,45,224,0.5)" },
      cyan: { primary: "#00e5ff", glow: "rgba(0,229,255,0.5)" },
      pink: { primary: "#ff6b9d", glow: "rgba(255,107,157,0.5)" },
      yellow: { primary: "#ffd166", glow: "rgba(255,209,102,0.5)" },
      green: { primary: "#06d6a0", glow: "rgba(6,214,160,0.5)" },
    },
    text: {
      primary: "#e0e0ff",
      secondary: "#8888aa",
      muted: "#444466",
    },
  };

  const S = {
    card: {
      background: cyberpunk.bg.card,
      border: "1px solid rgba(30,30,58,0.5)",
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      backdropFilter: "blur(10px)",
      boxShadow: "0 4px 30px rgba(0,0,0,0.3)",
    },
    label: {
      color: cyberpunk.neon.cyan.primary,
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: 2,
      textTransform: "uppercase",
      marginBottom: 14,
      display: "block",
      textShadow: `0 0 10px ${cyberpunk.neon.cyan.glow}`,
    },
    input: {
      background: "#0a0a1a",
      border: "1px solid rgba(42,42,74,0.5)",
      color: cyberpunk.text.primary,
      borderRadius: 10,
      padding: "10px 14px",
      fontSize: 13,
      width: "100%",
      boxSizing: "border-box",
    },
    button: (color) => ({
      background: `${color}22`,
      color,
      border: `1px solid ${color}44`,
      borderRadius: 8,
      padding: "10px 20px",
      fontSize: 11,
      fontWeight: 800,
      cursor: "pointer",
      letterSpacing: 1,
      textTransform: "uppercase",
      boxShadow: `0 0 10px ${color}33`,
      transition: "all 0.3s ease",
    }),
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ 
          fontSize: 48, 
          marginBottom: 8, 
          filter: `drop-shadow(0 0 20px ${cyberpunk.neon.pink.glow})`,
          animation: "pulse 2s ease-in-out infinite",
        }}>🎤</div>
        <div style={{ 
          fontSize: 28, 
          fontWeight: 900, 
          color: cyberpunk.text.primary, 
          marginBottom: 6,
          letterSpacing: 3,
          textTransform: "uppercase",
          textShadow: `0 0 20px ${cyberpunk.neon.pink.glow}`,
        }}>
          Lyrics Manager
        </div>
        <div style={{ color: cyberpunk.text.secondary, fontSize: 13, letterSpacing: 1 }}>
          SEARCH • TRANSCRIBE • EDIT • SAVE
        </div>
      </div>

      {/* Search Lyrics (lyrics.ovh - FREE) */}
      <div style={S.card}>
        <div style={{ marginBottom: 12 }}>
          <span style={S.label}>🔍 Search Lyrics</span>
          <div style={{ 
            marginTop: 8, 
            padding: 10, 
            background: "rgba(6,214,160,0.08)", 
            borderRadius: 8, 
            border: "1px solid #06d6a033" 
          }}>
            <div style={{ color: cyberpunk.neon.green.primary, fontSize: 10, fontWeight: 800, marginBottom: 4 }}>
              ✅ FREE API - NO TOKEN NEEDED
            </div>
            <div style={{ color: cyberpunk.text.muted, fontSize: 9 }}>
              Powered by lyrics.ovh • Full lyrics • No registration required
            </div>
          </div>
        </div>
        
        <div style={{ marginBottom: 12 }}>
          <label style={{ color: cyberpunk.text.secondary, fontSize: 11, marginBottom: 6, display: "block" }}>
            🔍 Search (format: Artist - Title)
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g., Queen - Bohemian Rhapsody"
            style={{ ...S.input, fontSize: 13, padding: "12px 14px" }}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          />
          <div style={{ color: cyberpunk.text.muted, fontSize: 9, marginTop: 6 }}>
            💡 Examples: "Taylor Swift - Shake It Off" | "Metallica - Enter Sandman" | "The Beatles - Hey Jude"
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={searching || !searchQuery.trim()}
          style={{
            width: "100%",
            ...S.button(cyberpunk.neon.purple.primary),
            opacity: searching || !searchQuery.trim() ? 0.5 : 1,
            cursor: searching || !searchQuery.trim() ? "not-allowed" : "pointer",
            padding: "14px 0",
            fontSize: 13,
          }}
        >
          {searching ? "🔍 Searching..." : "🔍 Search Lyrics"}
        </button>
      </div>

      {/* Transcribe from Audio */}
      <div style={S.card}>
        <span style={S.label}>🎤 Transcribe from Audio (Whisper AI)</span>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setTranscribeFile(e.target.files[0])}
              style={{ display: "none" }}
              id="transcribe-upload"
            />
            <label
              htmlFor="transcribe-upload"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: 16,
                background: "rgba(10,10,26,0.6)",
                border: `2px dashed ${transcribeFile ? cyberpunk.neon.green.primary : "rgba(42,42,74,0.5)"}`,
                borderRadius: 12,
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                if (!transcribeFile) {
                  e.currentTarget.style.borderColor = cyberpunk.neon.green.primary;
                  e.currentTarget.style.boxShadow = `0 0 15px ${cyberpunk.neon.green.glow}`;
                }
              }}
              onMouseLeave={(e) => {
                if (!transcribeFile) {
                  e.currentTarget.style.borderColor = "rgba(42,42,74,0.5)";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            >
              <span style={{ fontSize: 36 }}>{transcribeFile ? "🎵" : "📂"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  color: transcribeFile ? cyberpunk.neon.green.primary : cyberpunk.text.secondary, 
                  fontSize: 13, 
                  fontWeight: 700,
                }}>
                  {transcribeFile ? `✓ ${transcribeFile.name}` : "Click to upload audio file"}
                </div>
                <div style={{ color: cyberpunk.text.muted, fontSize: 10, marginTop: 4 }}>
                  WAV, MP3, FLAC supported • Whisper AI transcription
                </div>
              </div>
            </label>
          </div>
          <button
            onClick={handleTranscribe}
            disabled={transcribing || !transcribeFile}
            style={{
              ...S.button(cyberpunk.neon.green.primary),
              opacity: transcribing || !transcribeFile ? 0.5 : 1,
              cursor: transcribing || !transcribeFile ? "not-allowed" : "pointer",
              padding: "12px 20px",
              fontSize: 11,
            }}
          >
            {transcribing ? "🎤 Transcribing..." : "🎤 Transcribe"}
          </button>
        </div>
      </div>

      {/* Lyrics Editor */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={S.label}>📝 Lyrics Editor</span>
          {lyrics && (
            <button
              onClick={clearLyrics}
              style={{ ...S.button("#e63946"), padding: "6px 12px", fontSize: 9 }}
            >
              🗑️ Clear
            </button>
          )}
        </div>
        
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            value={lyricsTitle}
            onChange={(e) => setLyricsTitle(e.target.value)}
            placeholder="Song Title"
            style={{ ...S.input, marginBottom: 8 }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input
              type="text"
              value={lyricsArtist}
              onChange={(e) => setLyricsArtist(e.target.value)}
              placeholder="Artist Name"
              style={S.input}
            />
            <input
              type="text"
              value={lyricsSource}
              onChange={(e) => setLyricsSource(e.target.value)}
              placeholder="Source (e.g., lyrics.ovh)"
              style={{ ...S.input, color: cyberpunk.text.muted }}
              readOnly
            />
          </div>
        </div>
        
        <textarea
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          placeholder="Lyrics will appear here...&#10;&#10;Search for a song or transcribe from audio to see lyrics."
          rows={16}
          style={{
            ...S.input,
            resize: "vertical",
            minHeight: 300,
            fontFamily: "monospace",
            lineHeight: 1.6,
            fontSize: 13,
          }}
        />
        
        {/* Action Buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginTop: 16 }}>
          <button
            onClick={() => setShowSaveInput(true)}
            disabled={!lyrics.trim()}
            style={{
              ...S.button(cyberpunk.neon.yellow.primary),
              opacity: !lyrics.trim() ? 0.5 : 1,
              cursor: !lyrics.trim() ? "not-allowed" : "pointer",
            }}
          >
            💾 Save
          </button>
          <button
            onClick={copyToClipboard}
            disabled={!lyrics.trim()}
            style={{
              ...S.button(cyberpunk.neon.cyan.primary),
              opacity: !lyrics.trim() ? 0.5 : 1,
              cursor: !lyrics.trim() ? "not-allowed" : "pointer",
            }}
          >
            📋 Copy
          </button>
          <button
            onClick={useInAceStep}
            disabled={!lyrics.trim()}
            style={{
              ...S.button(cyberpunk.neon.purple.primary),
              opacity: !lyrics.trim() ? 0.5 : 1,
              cursor: !lyrics.trim() ? "not-allowed" : "pointer",
            }}
          >
            🎵 Use in ACE
          </button>
          <button
            onClick={exportToFile}
            disabled={!lyrics.trim()}
            style={{
              ...S.button(cyberpunk.neon.green.primary),
              opacity: !lyrics.trim() ? 0.5 : 1,
              cursor: !lyrics.trim() ? "not-allowed" : "pointer",
            }}
          >
            📤 Export
          </button>
          <button
            onClick={() => setShowLibrary(!showLibrary)}
            style={S.button(cyberpunk.neon.pink.primary)}
          >
            📚 Library ({lyricsLibrary.length})
          </button>
        </div>
      </div>

      {/* Save Input Modal */}
      {showSaveInput && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
        onClick={() => setShowSaveInput(false)}
        >
          <div
            style={{ ...S.card, width: "min(400px, 90%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <span style={S.label}>💾 Save to Library</span>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Enter a name for this lyrics"
              style={{ ...S.input, marginBottom: 12 }}
              autoFocus
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={saveToLibrary}
                disabled={!saveName.trim()}
                style={{
                  ...S.button(cyberpunk.neon.yellow.primary),
                  flex: 1,
                  opacity: !saveName.trim() ? 0.5 : 1,
                }}
              >
                💾 Save
              </button>
              <button
                onClick={() => setShowSaveInput(false)}
                style={{ ...S.button("#e63946"), flex: 1 }}
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Library Panel */}
      {showLibrary && (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={S.label}>📚 Saved Lyrics Library</span>
            <button
              onClick={() => setShowLibrary(false)}
              style={{ ...S.button("#e63946"), padding: "6px 12px", fontSize: 10 }}
            >
              ✕ Close
            </button>
          </div>
          {lyricsLibrary.length === 0 ? (
            <div style={{ color: cyberpunk.text.muted, fontSize: 13, textAlign: "center", padding: 30 }}>
              📭 No saved lyrics yet.<br/>Search for a song and click "💾 Save" to add it to your library!
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 400, overflowY: "auto" }}>
              {lyricsLibrary.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    background: "rgba(10,10,26,0.6)",
                    border: "1px solid rgba(42,42,74,0.5)",
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ color: cyberpunk.text.primary, fontSize: 12, fontWeight: 700 }}>
                        {entry.title}
                      </div>
                      <div style={{ color: cyberpunk.text.muted, fontSize: 10 }}>
                        {entry.artist} • {entry.source || "Unknown"} • {entry.created}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        onClick={() => loadFromLibrary(entry)}
                        style={{
                          ...S.button(cyberpunk.neon.cyan.primary),
                          padding: "4px 8px",
                          fontSize: 9,
                        }}
                      >
                        📂 Load
                      </button>
                      <button
                        onClick={() => deleteFromLibrary(entry.id)}
                        style={{
                          ...S.button("#e63946"),
                          padding: "4px 8px",
                          fontSize: 9,
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div style={{
                    color: cyberpunk.text.muted,
                    fontSize: 10,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {entry.lyrics?.slice(0, 80)}...
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Global Styles */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
