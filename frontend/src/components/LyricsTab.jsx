import React, { useState, useEffect } from "react";

const API = "http://localhost:8000";

// Genre categories for lyrics
const LYRICS_GENRES = [
  "All",
  "Pop",
  "Rock",
  "Hip-Hop",
  "R&B",
  "Electronic",
  "Country",
  "Jazz",
  "Classical",
  "Metal",
  "Folk",
  "Romanian",
  "Manele",
  "Other",
];

export default function LyricsTab({ addLog }) {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  
  // Selected song
  const [selectedArtist, setSelectedArtist] = useState("");
  const [selectedTitle, setSelectedTitle] = useState("");
  
  // Lyrics state
  const [lyrics, setLyrics] = useState("");
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  
  // Library state
  const [lyricsLibrary, setLyricsLibrary] = useState([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState("All");
  
  // Save state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveGenre, setSaveGenre] = useState("Other");
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Error state
  const [error, setError] = useState("");

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

  // Search for songs
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    setError("");
    setSuggestions([]);
    
    try {
      const fd = new FormData();
      fd.append("query", searchQuery);
      
      const res = await fetch(`${API}/audio/lyrics/suggest`, {
        method: "POST",
        body: fd,
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || "Search failed");
      
      setSuggestions(data.songs || []);
      addLog?.(`[Lyrics] Found ${data.count || 0} songs for "${searchQuery}"`);
    } catch (err) {
      setError(err.message);
      addLog?.(`[Lyrics] Search error: ${err.message}`);
    } finally {
      setSearching(false);
    }
  };

  // Get lyrics for selected song
  const handleSelectSong = async (artist, title) => {
    if (!artist || !title) return;
    
    setLoadingLyrics(true);
    setError("");
    setSelectedArtist(artist);
    setSelectedTitle(title);
    setLyrics("");
    
    try {
      const fd = new FormData();
      fd.append("artist", artist);
      fd.append("title", title);
      fd.append("search_type", "song");
      
      const res = await fetch(`${API}/audio/lyrics/search`, {
        method: "POST",
        body: fd,
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || "Lyrics not found");
      
      setLyrics(data.lyrics || "No lyrics available");
      addLog?.(`[Lyrics] Loaded: ${artist} - ${title}`);
    } catch (err) {
      setError(err.message);
      setSelectedArtist("");
      setSelectedTitle("");
      addLog?.(`[Lyrics] Error: ${err.message}`);
    } finally {
      setLoadingLyrics(false);
    }
  };

  // Save to library
  const saveToLibrary = () => {
    if (!lyrics.trim() || !saveName.trim()) return;
    
    const newEntry = {
      id: Date.now(),
      name: saveName,
      artist: selectedArtist || "Unknown",
      title: selectedTitle || "Untitled",
      lyrics: lyrics,
      genre: saveGenre,
      favorite: isFavorite,
      created: new Date().toLocaleString(),
    };
    
    const updated = [newEntry, ...lyricsLibrary];
    setLyricsLibrary(updated);
    localStorage.setItem("vocalforge_lyrics_library", JSON.stringify(updated));
    
    setSaveName("");
    setSaveGenre("Other");
    setIsFavorite(false);
    setShowSaveModal(false);
    addLog?.(`[Lyrics] Saved: ${saveName}`);
  };

  // Load from library
  const loadFromLibrary = (entry) => {
    setLyrics(entry.lyrics);
    setSelectedTitle(entry.title);
    setSelectedArtist(entry.artist);
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

  // Toggle favorite
  const toggleFavorite = (id) => {
    const updated = lyricsLibrary.map(item => 
      item.id === id ? { ...item, favorite: !item.favorite } : item
    );
    setLyricsLibrary(updated);
    localStorage.setItem("vocalforge_lyrics_library", JSON.stringify(updated));
  };

  // Copy to clipboard
  const copyLyrics = () => {
    navigator.clipboard.writeText(lyrics);
    addLog?.("[Lyrics] Copied to clipboard");
    alert("✅ Lyrics copied to clipboard!");
  };

  // Export to file
  const exportToFile = () => {
    if (!lyrics.trim()) return;
    
    const content = `[${selectedTitle || "Untitled"}]\nArtist: ${selectedArtist || "Unknown"}\n\n${lyrics}\n`;
    
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(selectedTitle || "lyrics").replace(/[^a-z0-9]/gi, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    addLog?.("[Lyrics] Exported to file");
  };

  // Use in ACE-Step
  const useInAceStep = () => {
    localStorage.setItem("acestep_lyrics_from_manager", lyrics);
    addLog?.("[Lyrics] Sent to ACE-Step");
    alert("✅ Lyrics sent to ACE-Step!\n\nGo to ACE-Step tab and check the Lyrics field.");
  };

  // Clear all
  const clearAll = () => {
    setSearchQuery("");
    setSuggestions([]);
    setSelectedArtist("");
    setSelectedTitle("");
    setLyrics("");
    setError("");
  };

  // Filter library by genre
  const filteredLibrary = libraryFilter === "All" 
    ? lyricsLibrary 
    : lyricsLibrary.filter(item => item.genre === libraryFilter);

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
    container: {
      padding: 24,
      maxWidth: 1200,
      margin: "0 auto",
      color: "#e0e0ff",
    },
    header: {
      textAlign: "center",
      marginBottom: 24,
    },
    card: {
      background: cyberpunk.bg.card,
      border: "1px solid rgba(48,48,80,0.5)",
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
    },
    input: {
      background: "#0a0a1a",
      border: "1px solid rgba(42,42,74,0.5)",
      color: "#e0e0ff",
      borderRadius: 10,
      padding: "12px 16px",
      fontSize: 14,
      width: "100%",
      boxSizing: "border-box",
    },
    button: (color) => ({
      background: `linear-gradient(135deg, ${color}, ${color}88)`,
      color: "white",
      border: "none",
      borderRadius: 10,
      padding: "10px 18px",
      fontSize: 12,
      fontWeight: 700,
      cursor: "pointer",
      textTransform: "uppercase",
      letterSpacing: 1,
      transition: "all 0.3s ease",
    }),
    songCard: {
      background: "rgba(10,10,26,0.6)",
      border: "1px solid rgba(42,42,74,0.5)",
      borderRadius: 10,
      padding: 14,
      cursor: "pointer",
      transition: "all 0.2s ease",
    },
    genreBadge: (genre) => ({
      background: `${cyberpunk.neon.purple.primary}22`,
      color: cyberpunk.neon.purple.primary,
      border: `1px solid ${cyberpunk.neon.purple.primary}44`,
      borderRadius: 6,
      padding: "4px 10px",
      fontSize: 9,
      fontWeight: 700,
      marginLeft: 8,
    }),
  };

  return (
    <div style={S.container}>
      
      {/* Header */}
      <div style={S.header}>
        <div style={{ color: cyberpunk.text.secondary, fontSize: 13, letterSpacing: 1 }}>
          Powered by lyrics.ovh — Free lyrics API
        </div>
      </div>

      {/* Search */}
      <div style={S.card}>
        <label style={S.label}>🔍 Search</label>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter artist and song (e.g., Queen Bohemian Rhapsody)"
            style={S.input}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            style={{
              ...S.button(cyberpunk.neon.purple.primary),
              opacity: searching || !searchQuery.trim() ? 0.5 : 1,
              cursor: searching || !searchQuery.trim() ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
              minWidth: 120,
            }}
          >
            {searching ? "⏳ Finding..." : "🔍 Find"}
          </button>
          {(suggestions.length > 0 || lyrics) && (
            <button
              onClick={clearAll}
              style={{
                ...S.button("#e63946"),
                whiteSpace: "nowrap",
                minWidth: 80,
              }}
            >
              🗑️ Clear
            </button>
          )}
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <label style={S.label}>🎵 Select Song</label>
            <span style={{ color: "#8888aa", fontSize: 11 }}>
              {suggestions.length} results
            </span>
          </div>
          
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", 
            gap: 12,
            maxHeight: "450px",
            overflowY: "auto",
          }}>
            {suggestions.map((song, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectSong(song.artist?.name || "Unknown", song.title)}
                style={{
                  ...S.songCard,
                  opacity: loadingLyrics ? 0.6 : 1,
                  cursor: loadingLyrics ? "not-allowed" : "pointer",
                }}
              >
                <div style={{ color: "#e0e0ff", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  🎵 {song.title}
                </div>
                <div style={{ color: "#8888aa", fontSize: 11 }}>
                  🎤 {song.artist?.name || "Unknown"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lyrics Display */}
      {lyrics && (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <label style={S.label}>📝 Lyrics</label>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setShowSaveModal(true)} style={{ ...S.button(cyberpunk.neon.yellow.primary), fontSize: 10, padding: "8px 12px" }}>💾 Save</button>
              <button onClick={copyLyrics} style={{ ...S.button(cyberpunk.neon.cyan.primary), fontSize: 10, padding: "8px 12px" }}>📋 Copy</button>
              <button onClick={exportToFile} style={{ ...S.button(cyberpunk.neon.green.primary), fontSize: 10, padding: "8px 12px" }}>📤 Export</button>
              <button onClick={useInAceStep} style={{ ...S.button(cyberpunk.neon.purple.primary), fontSize: 10, padding: "8px 12px" }}>🎵 Use in ACE</button>
            </div>
          </div>
          
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: "#e0e0ff", fontSize: 18, fontWeight: 900, marginBottom: 4 }}>
              🎵 {selectedTitle}
            </div>
            <div style={{ color: "#8888aa", fontSize: 12 }}>
              🎤 {selectedArtist} • {lyrics.length.toLocaleString()} characters
            </div>
          </div>
          
          <textarea
            value={lyrics}
            readOnly
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

      {/* Library Button & Modal */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 100 }}>
        <button
          onClick={() => setShowLibrary(!showLibrary)}
          style={{
            ...S.button(cyberpunk.neon.pink.primary),
            padding: "14px 20px",
            fontSize: 12,
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          }}
        >
          📚 Library ({lyricsLibrary.length})
        </button>
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
          <div 
            style={{ ...S.card, width: "min(700px, 90%)", maxHeight: "80vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <label style={S.label}>📚 Saved Lyrics Library</label>
              <button onClick={() => setShowLibrary(false)} style={{ ...S.button("#e63946"), padding: "6px 12px", fontSize: 10 }}>✕ Close</button>
            </div>
            
            {/* Genre Filter */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ color: "#8888aa", fontSize: 9, marginBottom: 6, display: "block" }}>Filter by Genre:</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {LYRICS_GENRES.map(genre => (
                  <button
                    key={genre}
                    onClick={() => setLibraryFilter(genre)}
                    style={{
                      ...S.button(libraryFilter === genre ? cyberpunk.neon.purple.primary : "#2a2a4a"),
                      fontSize: 9,
                      padding: "6px 10px",
                    }}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
            
            {filteredLibrary.length === 0 ? (
              <div style={{ color: "#8888aa", fontSize: 13, textAlign: "center", padding: 30 }}>
                📭 No saved lyrics{libraryFilter !== "All" ? ` in ${libraryFilter}` : ""} yet
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filteredLibrary.map((entry) => (
                  <div 
                    key={entry.id} 
                    style={{ 
                      background: "rgba(10,10,26,0.6)", 
                      border: "1px solid rgba(42,42,74,0.5)", 
                      borderRadius: 10, 
                      padding: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <div style={{ color: "#e0e0ff", fontSize: 12, fontWeight: 700 }}>{entry.title}</div>
                          {entry.favorite && <span style={{ marginLeft: 8 }}>⭐</span>}
                          <span style={S.genreBadge(entry.genre)}>{entry.genre}</span>
                        </div>
                        <div style={{ color: "#8888aa", fontSize: 10 }}>{entry.artist} • {entry.created}</div>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => loadFromLibrary(entry)} style={{ ...S.button(cyberpunk.neon.cyan.primary), padding: "4px 8px", fontSize: 9 }}>📂 Load</button>
                        <button onClick={() => toggleFavorite(entry.id)} style={{ ...S.button(cyberpunk.neon.yellow.primary), padding: "4px 8px", fontSize: 9 }}>{entry.favorite ? "⭐" : "☆"}</button>
                        <button onClick={() => deleteFromLibrary(entry.id)} style={{ ...S.button("#e63946"), padding: "4px 8px", fontSize: 9 }}>🗑️</button>
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
      {showSaveModal && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }} onClick={() => setShowSaveModal(false)}>
          <div 
            style={{ ...S.card, width: "min(500px, 90%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <label style={S.label}>💾 Save to Library</label>
            
            <div style={{ marginBottom: 12 }}>
              <label style={{ color: "#8888aa", fontSize: 11, marginBottom: 6, display: "block" }}>Name</label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Enter a name for this lyrics"
                style={S.input}
                autoFocus
              />
            </div>
            
            <div style={{ marginBottom: 12 }}>
              <label style={{ color: "#8888aa", fontSize: 11, marginBottom: 6, display: "block" }}>Genre</label>
              <select
                value={saveGenre}
                onChange={(e) => setSaveGenre(e.target.value)}
                style={S.input}
              >
                {LYRICS_GENRES.filter(g => g !== "All").map(genre => (
                  <option key={genre} value={genre} style={{ background: "#0a0a1a", color: "#e0e0ff" }}>
                    {genre}
                  </option>
                ))}
              </select>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#e0e0ff", fontSize: 11, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={isFavorite}
                  onChange={(e) => setIsFavorite(e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                ⭐ Mark as Favorite
              </label>
            </div>
            
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
                onClick={() => setShowSaveModal(false)} 
                style={{ ...S.button("#e63946"), flex: 1 }}
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          ...S.card,
          border: "1px solid #e63946",
          background: "rgba(230,57,70,0.1)",
        }}>
          <div style={{ color: "#e63946", fontSize: 13, fontWeight: 700 }}>
            ❌ {error}
          </div>
        </div>
      )}

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
