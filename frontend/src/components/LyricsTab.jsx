import React, { useState, useEffect } from "react";

const API = "http://localhost:8000";

export default function LyricsTab({ addLog }) {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null); // { artist, songs: [] }
  
  // Selected song
  const [selectedSong, setSelectedSong] = useState(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  
  // Displayed lyrics
  const [lyrics, setLyrics] = useState("");
  const [lyricsTitle, setLyricsTitle] = useState("");
  const [lyricsArtist, setLyricsArtist] = useState("");
  
  // Transcribe state
  const [transcribeFile, setTranscribeFile] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  
  // Library state
  const [lyricsLibrary, setLyricsLibrary] = useState([]);
  const [showLibrary, setShowLibrary] = useState(false);
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

  // Search for artist (returns list of songs)
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      addLog?.("[Lyrics] Please enter an artist name");
      return;
    }
    
    setSearching(true);
    setSearchResults(null);
    setSelectedSong(null);
    setLyrics("");
    addLog?.(`[Lyrics] Searching artist: ${searchQuery}`);
    
    try {
      // Use lyrics.ovh search (artist only)
      const response = await fetch(`https://api.lyrics.ovh/v1/${searchQuery}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Artist "${searchQuery}" not found`);
        }
        throw new Error(`Search failed: HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.songs && Array.isArray(data.songs)) {
        setSearchResults({
          artist: searchQuery,
          songs: data.songs.slice(0, 50), // Limit to 50 songs
        });
        addLog?.(`[Lyrics] Found ${data.songs.length} songs by ${searchQuery}`);
      } else {
        throw new Error("No songs found");
      }
    } catch (err) {
      addLog?.(`[Lyrics] Error: ${err.message}`);
      alert(`Search failed: ${err.message}\n\nTry a different artist or check spelling.`);
    } finally {
      setSearching(false);
    }
  };

  // Get lyrics for selected song
  const handleSelectSong = async (songTitle) => {
    if (!songTitle) return;
    
    setLoadingLyrics(true);
    setSelectedSong(songTitle);
    setLyrics("");
    addLog?.(`[Lyrics] Loading: ${searchQuery} - ${songTitle}`);
    
    try {
      const response = await fetch(`https://api.lyrics.ovh/v1/${searchQuery}/${songTitle}`);
      
      if (!response.ok) {
        throw new Error("Lyrics not found");
      }
      
      const data = await response.json();
      
      if (data && data.lyrics) {
        setLyrics(data.lyrics);
        setLyricsTitle(songTitle);
        setLyricsArtist(searchQuery);
        addLog?.(`[Lyrics] Loaded: ${searchQuery} - ${songTitle} (${data.lyrics.length} chars)`);
      } else {
        throw new Error("No lyrics available");
      }
    } catch (err) {
      addLog?.(`[Lyrics] Error: ${err.message}`);
      alert(`Could not load lyrics for "${songTitle}"\n\nThis song may not have lyrics available.`);
      setSelectedSong(null);
    } finally {
      setLoadingLyrics(false);
    }
  };

  // Transcribe from audio
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
      setLyricsTitle(transcribeFile.name.replace(/\.[^/.]+$/, ""));
      setLyricsArtist("Unknown");
      addLog?.(`[Lyrics] Transcribed: ${data.lyrics?.length || 0} characters`);
    } catch (err) {
      addLog?.(`[Lyrics] Error: ${err.message}`);
      alert(`Transcription failed: ${err.message}`);
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
    setShowLibrary(false);
    addLog?.(`[Lyrics] Loaded: ${entry.name}`);
  };

  // Delete from library
  const deleteFromLibrary = (id) => {
    const updated = lyricsLibrary.filter(item => item.id !== id);
    setLyricsLibrary(updated);
    localStorage.setItem("vocalforge_lyrics_library", JSON.stringify(updated));
    addLog?.(`[Lyrics] Deleted`);
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(lyrics);
    addLog?.("[Lyrics] Copied to clipboard");
    alert("✅ Lyrics copied!");
  };

  // Use in ACE-Step
  const useInAceStep = () => {
    localStorage.setItem("acestep_lyrics_from_manager", lyrics);
    addLog?.("[Lyrics] Sent to ACE-Step");
    alert("✅ Sent to ACE-Step!");
  };

  // Export to file
  const exportToFile = () => {
    if (!lyrics.trim()) return;
    
    const content = `[${lyricsTitle || "Untitled"}]\nArtist: ${lyricsArtist || "Unknown"}\n\n${lyrics}\n`;
    
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(lyricsTitle || "lyrics").replace(/[^a-z0-9]/gi, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    addLog?.("[Lyrics] Exported");
  };

  // Clear
  const clearAll = () => {
    setSearchQuery("");
    setSearchResults(null);
    setSelectedSong(null);
    setLyrics("");
    setLyricsTitle("");
    setLyricsArtist("");
    addLog?.("[Lyrics] Cleared");
  };

  // Cyberpunk theme
  const cyberpunk = {
    neon: {
      purple: { primary: "#9b2de0", glow: "rgba(155,45,224,0.5)" },
      cyan: { primary: "#00e5ff", glow: "rgba(0,229,255,0.5)" },
      pink: { primary: "#ff6b9d", glow: "rgba(255,107,157,0.5)" },
      yellow: { primary: "#ffd166", glow: "rgba(255,209,102,0.5)" },
      green: { primary: "#06d6a0", glow: "rgba(6,214,160,0.5)" },
    },
    bg: {
      card: "linear-gradient(180deg, rgba(13,13,34,0.95), rgba(8,8,24,0.98))",
    },
  };

  const S = {
    card: {
      background: cyberpunk.bg.card,
      border: "1px solid rgba(30,30,58,0.5)",
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
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
      color: "#e0e0ff",
      borderRadius: 10,
      padding: "12px 14px",
      fontSize: 14,
      width: "100%",
      boxSizing: "border-box",
    },
    btn: (color) => ({
      background: `${color}22`,
      color,
      border: `1px solid ${color}44`,
      borderRadius: 8,
      padding: "10px 18px",
      fontSize: 11,
      fontWeight: 800,
      cursor: "pointer",
      letterSpacing: 1,
      textTransform: "uppercase",
      transition: "all 0.2s ease",
    }),
    songBtn: {
      background: "rgba(10,10,26,0.6)",
      border: "1px solid rgba(42,42,74,0.5)",
      color: "#8888aa",
      borderRadius: 8,
      padding: "10px 14px",
      fontSize: 12,
      cursor: "pointer",
      textAlign: "left",
      transition: "all 0.2s ease",
    },
    songBtnActive: {
      background: "rgba(155,45,224,0.15)",
      border: "1px solid #9b2de0",
      color: "#c77dff",
    },
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
          color: "#e0e0ff", 
          marginBottom: 6,
          letterSpacing: 3,
          textTransform: "uppercase",
          textShadow: `0 0 20px ${cyberpunk.neon.pink.glow}`,
        }}>
          Lyrics Manager
        </div>
        <div style={{ color: "#8888aa", fontSize: 13, letterSpacing: 1 }}>
          SEARCH ARTIST • SELECT SONG • VIEW LYRICS
        </div>
      </div>

      {/* Step 1: Search Artist */}
      <div style={S.card}>
        <span style={S.label}>🔍 Step 1: Search Artist</span>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter artist name (e.g., Queen, Taylor Swift, Metallica)"
            style={S.input}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            style={{
              ...S.btn(cyberpunk.neon.purple.primary),
              opacity: searching || !searchQuery.trim() ? 0.5 : 1,
              cursor: searching || !searchQuery.trim() ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {searching ? "🔍 Searching..." : "🔍 Search"}
          </button>
          {searchResults && (
            <button
              onClick={clearAll}
              style={{ ...S.btn("#e63946"), whiteSpace: "nowrap" }}
            >
              🗑️ Clear
            </button>
          )}
        </div>
        <div style={{ 
          padding: 10, 
          background: "rgba(6,214,160,0.08)", 
          borderRadius: 8, 
          border: "1px solid #06d6a033" 
        }}>
          <div style={{ color: "#06d6a0", fontSize: 10, fontWeight: 800, marginBottom: 4 }}>
            ✅ FREE API - NO TOKEN NEEDED
          </div>
          <div style={{ color: "#8888aa", fontSize: 9 }}>
            Powered by lyrics.ovh • Search artist → Select song → View full lyrics
          </div>
        </div>
      </div>

      {/* Step 2: Song List */}
      {searchResults && (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={S.label}>🎵 Step 2: Select Song</span>
            <span style={{ color: "#8888aa", fontSize: 11 }}>
              {searchResults.songs.length} songs by <strong style={{ color: cyberpunk.neon.purple.primary }}>{searchResults.artist}</strong>
            </span>
          </div>
          
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", 
            gap: 8,
            maxHeight: "400px",
            overflowY: "auto",
            paddingRight: 8,
          }}>
            {searchResults.songs.map((song, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectSong(song.title)}
                disabled={loadingLyrics}
                style={{
                  ...S.songBtn,
                  ...(selectedSong === song.title ? S.songBtnActive : {}),
                  opacity: loadingLyrics ? 0.5 : 1,
                  cursor: loadingLyrics ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (selectedSong !== song.title) {
                    e.currentTarget.style.background = "rgba(0,229,255,0.08)";
                    e.currentTarget.style.borderColor = "#00e5ff44";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedSong !== song.title) {
                    e.currentTarget.style.background = "rgba(10,10,26,0.6)";
                    e.currentTarget.style.borderColor = "rgba(42,42,74,0.5)";
                  }
                }}
              >
                <div style={{ color: selectedSong === song.title ? "#c77dff" : "#e0e0ff", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  🎵 {song.title}
                </div>
                {selectedSong === song.title && loadingLyrics && (
                  <div style={{ color: "#8888aa", fontSize: 10 }}>⏳ Loading lyrics...</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Display Lyrics */}
      {lyrics && (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={S.label}>📝 Lyrics</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setShowSaveInput(true)} style={{ ...S.btn(cyberpunk.neon.yellow.primary), fontSize: 9 }}>💾 Save</button>
              <button onClick={copyToClipboard} style={{ ...S.btn(cyberpunk.neon.cyan.primary), fontSize: 9 }}>📋 Copy</button>
              <button onClick={useInAceStep} style={{ ...S.btn(cyberpunk.neon.purple.primary), fontSize: 9 }}>🎵 Use in ACE</button>
              <button onClick={exportToFile} style={{ ...S.btn(cyberpunk.neon.green.primary), fontSize: 9 }}>📤 Export</button>
            </div>
          </div>
          
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: "#e0e0ff", fontSize: 16, fontWeight: 900, marginBottom: 4 }}>
              🎵 {lyricsTitle}
            </div>
            <div style={{ color: "#8888aa", fontSize: 11 }}>
              🎤 {lyricsArtist} • {lyrics.length.toLocaleString()} characters
            </div>
          </div>
          
          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            rows={20}
            style={{
              ...S.input,
              resize: "vertical",
              minHeight: 400,
              fontFamily: "monospace",
              lineHeight: 1.6,
              fontSize: 13,
              whiteSpace: "pre-wrap",
            }}
          />
        </div>
      )}

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
                border: `2px dashed ${transcribeFile ? "#06d6a0" : "rgba(42,42,74,0.5)"}`,
                borderRadius: 12,
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
            >
              <span style={{ fontSize: 36 }}>{transcribeFile ? "🎵" : "📂"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  color: transcribeFile ? "#06d6a0" : "#8888aa", 
                  fontSize: 13, 
                  fontWeight: 700,
                }}>
                  {transcribeFile ? `✓ ${transcribeFile.name}` : "Upload audio file"}
                </div>
                <div style={{ color: "#444466", fontSize: 10, marginTop: 4 }}>
                  WAV, MP3, FLAC • Whisper AI transcription
                </div>
              </div>
            </label>
          </div>
          <button
            onClick={handleTranscribe}
            disabled={transcribing || !transcribeFile}
            style={{
              ...S.btn(cyberpunk.neon.green.primary),
              opacity: transcribing || !transcribeFile ? 0.5 : 1,
              cursor: transcribing || !transcribeFile ? "not-allowed" : "pointer",
            }}
          >
            {transcribing ? "⏳ Transcribing..." : "🎤 Transcribe"}
          </button>
        </div>
      </div>

      {/* Library Modal */}
      {showLibrary && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }} onClick={() => setShowLibrary(false)}>
          <div style={{ ...S.card, width: "min(500px, 90%)", maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={S.label}>📚 Saved Lyrics ({lyricsLibrary.length})</span>
              <button onClick={() => setShowLibrary(false)} style={{ ...S.btn("#e63946"), padding: "6px 12px", fontSize: 10 }}>✕ Close</button>
            </div>
            {lyricsLibrary.length === 0 ? (
              <div style={{ color: "#8888aa", fontSize: 13, textAlign: "center", padding: 30 }}>
                📭 No saved lyrics yet
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {lyricsLibrary.map((entry) => (
                  <div key={entry.id} style={{ background: "rgba(10,10,26,0.6)", border: "1px solid rgba(42,42,74,0.5)", borderRadius: 8, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <div style={{ color: "#e0e0ff", fontSize: 12, fontWeight: 700 }}>{entry.title}</div>
                        <div style={{ color: "#8888aa", fontSize: 10 }}>{entry.artist} • {entry.created}</div>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => loadFromLibrary(entry)} style={{ ...S.btn(cyberpunk.neon.cyan.primary), padding: "4px 8px", fontSize: 9 }}>📂 Load</button>
                        <button onClick={() => deleteFromLibrary(entry.id)} style={{ ...S.btn("#e63946"), padding: "4px 8px", fontSize: 9 }}>🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save Modal */}
      {showSaveInput && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }} onClick={() => setShowSaveInput(false)}>
          <div style={{ ...S.card, width: "min(400px, 90%)" }} onClick={(e) => e.stopPropagation()}>
            <span style={S.label}>💾 Save to Library</span>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Enter a name"
              style={{ ...S.input, marginBottom: 12 }}
              autoFocus
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveToLibrary} disabled={!saveName.trim()} style={{ ...S.btn(cyberpunk.neon.yellow.primary), flex: 1, opacity: !saveName.trim() ? 0.5 : 1 }}>💾 Save</button>
              <button onClick={() => setShowSaveInput(false)} style={{ ...S.btn("#e63946"), flex: 1 }}>❌ Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Library Button (fixed bottom-right) */}
      <button
        onClick={() => setShowLibrary(!showLibrary)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          ...S.btn(cyberpunk.neon.pink.primary),
          padding: "14px 20px",
          fontSize: 12,
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          zIndex: 100,
        }}
      >
        📚 Library ({lyricsLibrary.length})
      </button>

      {/* Global Styles */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0a0a1a; border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: #2a2a4a; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #3a3a5a; }
      `}</style>
    </div>
  );
}
