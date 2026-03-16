import React, { useState, useEffect } from "react";

const API = "http://localhost:8000";

// Genre options
const GENRES = [
  "Pop", "Rock", "Hip-Hop", "R&B", "Electronic", "Dance",
  "Metal", "Jazz", "Classical", "Country", "Folk", "Indie",
  "Alternative", "Punk", "Reggae", "Blues", "Soul", "Funk",
  "Latin", "K-Pop", "J-Pop", "Romanian", "Manele", "Other"
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
  const [rawLyrics, setRawLyrics] = useState("");
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  
  // Library state
  const [lyricsLibrary, setLyricsLibrary] = useState([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryFilter, setLibraryFilter] = useState("all"); // all, favorites, genre
  
  // Save/Edit state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveGenre, setSaveGenre] = useState("Other");
  const [isFavorite, setIsFavorite] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editLyrics, setEditLyrics] = useState("");
  
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

  // Save library to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("vocalforge_lyrics_library", JSON.stringify(lyricsLibrary));
    } catch (e) {
      console.error("Failed to save lyrics library:", e);
    }
  }, [lyricsLibrary]);

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
  const handleSelectSong = async (song) => {
    const artist = song.artist?.name || "Unknown";
    const title = song.title || "Unknown";
    
    if (!artist || !title) return;
    
    setLoadingLyrics(true);
    setError("");
    setSelectedArtist(artist);
    setSelectedTitle(title);
    setLyrics("");
    setRawLyrics("");
    
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
      
      // Store raw lyrics (for ACE-Step) and cleaned lyrics (for display)
      const rawLyricsData = data.lyrics || "No lyrics available";
      setRawLyrics(rawLyricsData);
      
      const cleanedLyrics = cleanLyrics(rawLyricsData);
      setLyrics(cleanedLyrics);
      
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

  // Clean Genius metadata from lyrics
  const cleanLyrics = (lyrics) => {
    if (!lyrics) return "";
    
    const lines = lyrics.split('\n');
    const cleanedLines = [];
    let skipIntro = true;
    
    for (let line of lines) {
      const trimmed = line.trim();
      
      if (skipIntro) {
        const skipKeywords = [
          'Contributors', 'Translations', 'English', 'Lyrics',
          'About', 'Produced by', 'Written by', 'Featuring',
          'Views', 'Released on', 'Credits'
        ];
        
        const shouldSkip = skipKeywords.some(keyword => 
          trimmed.toLowerCase().includes(keyword.toLowerCase())
        );
        
        const isMetadata = /^\d+$/.test(trimmed) || (trimmed.length < 20 && /[0-9]/.test(trimmed));
        
        if (shouldSkip || isMetadata) {
          continue;
        }
        
        if (trimmed.startsWith('[') || trimmed.length > 30) {
          skipIntro = false;
          cleanedLines.push(line);
        } else {
          cleanedLines.push(line);
        }
      } else {
        cleanedLines.push(line);
      }
    }
    
    return cleanedLines.join('\n');
  };

  // Save to library
  const saveToLibrary = () => {
    if (!lyrics.trim() || !saveName.trim()) return;
    
    const newEntry = {
      id: editingId || Date.now(),
      name: saveName,
      artist: selectedArtist || "Unknown",
      title: selectedTitle || "Untitled",
      lyrics: editingId ? editLyrics : lyrics,
      genre: saveGenre,
      favorite: isFavorite,
      created: editingId 
        ? lyricsLibrary.find(l => l.id === editingId)?.created || new Date().toLocaleString()
        : new Date().toLocaleString(),
      updated: new Date().toLocaleString(),
    };
    
    let updated;
    if (editingId) {
      updated = lyricsLibrary.map(l => l.id === editingId ? newEntry : l);
      addLog?.(`[Library] Updated: ${saveName}`);
    } else {
      updated = [newEntry, ...lyricsLibrary];
      addLog?.(`[Library] Saved: ${saveName}`);
    }
    
    setLyricsLibrary(updated);
    setSaveName("");
    setSaveGenre("Other");
    setIsFavorite(false);
    setShowSaveModal(false);
    setEditingId(null);
    setEditLyrics("");
  };

  // Edit lyrics
  const editLyricsEntry = (entry) => {
    setEditingId(entry.id);
    setSaveName(entry.name);
    setSaveGenre(entry.genre);
    setIsFavorite(entry.favorite);
    setEditLyrics(entry.lyrics);
    setShowSaveModal(true);
  };

  // Delete from library
  const deleteFromLibrary = (id) => {
    if (!confirm("Are you sure you want to delete this lyrics?")) return;
    
    const updated = lyricsLibrary.filter(l => l.id !== id);
    setLyricsLibrary(updated);
    addLog?.(`[Library] Deleted entry`);
  };

  // Load from library
  const loadFromLibrary = (entry) => {
    setLyrics(entry.lyrics);
    setRawLyrics(entry.lyrics);
    setSelectedArtist(entry.artist);
    setSelectedTitle(entry.title);
    setShowLibrary(false);
    addLog?.(`[Library] Loaded: ${entry.name}`);
    
    // Auto-send to ACE-Step
    localStorage.setItem("acestep_lyrics_from_manager", entry.lyrics);
    localStorage.setItem("acestep_lyrics_artist", entry.artist);
    localStorage.setItem("acestep_lyrics_title", entry.title);
    addLog?.(`[Library] Sent to ACE-Step: ${entry.name}`);
    
    alert(`✅ Lyrics loaded!\n\n"${entry.name}" has been sent to ACE-Step.\n\nGo to ACE-Step tab to generate music!`);
  };

  // Toggle favorite
  const toggleFavorite = (id) => {
    const updated = lyricsLibrary.map(l => 
      l.id === id ? { ...l, favorite: !l.favorite } : l
    );
    setLyricsLibrary(updated);
  };

  // Copy to clipboard
  const copyLyrics = () => {
    navigator.clipboard.writeText(lyrics);
    addLog?.("[Lyrics] Copied to clipboard");
    alert("✅ Lyrics copied to clipboard!");
  };

  // Use in ACE-Step
  const useInAceStep = () => {
    const lyricsToSend = lyrics;
    
    localStorage.setItem("acestep_lyrics_from_manager", lyricsToSend);
    localStorage.setItem("acestep_lyrics_artist", selectedArtist);
    localStorage.setItem("acestep_lyrics_title", selectedTitle);
    
    addLog?.("[Lyrics] Sent to ACE-Step");
    alert("✅ Lyrics sent to ACE-Step!\n\nGo to ACE-Step tab and check the Lyrics field.");
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

  // Import from file
  const importFromFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      setLyrics(content);
      setRawLyrics(content);
      setSelectedTitle(file.name.replace(/\.[^/.]+$/, ""));
      setSelectedArtist("Imported");
      addLog?.(`[Lyrics] Imported: ${file.name}`);
    };
    reader.readAsText(file);
  };

  // Clear all
  const clearAll = () => {
    setSearchQuery("");
    setSuggestions([]);
    setSelectedArtist("");
    setSelectedTitle("");
    setLyrics("");
    setRawLyrics("");
    setError("");
  };

  // Filter library
  const filteredLibrary = lyricsLibrary.filter(entry => {
    const matchesSearch = entry.name.toLowerCase().includes(librarySearch.toLowerCase()) ||
                         entry.artist.toLowerCase().includes(librarySearch.toLowerCase()) ||
                         entry.title.toLowerCase().includes(librarySearch.toLowerCase());
    
    if (libraryFilter === "favorites") {
      return matchesSearch && entry.favorite;
    } else if (libraryFilter === "genre") {
      return matchesSearch;
    }
    return matchesSearch;
  });

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
      card: "linear-gradient(135deg, rgba(13,13,34,0.95), rgba(8,8,24,0.98))",
    },
  };

  const S = {
    container: {
      padding: 24,
      maxWidth: 1200,
      margin: "0 auto",
      color: "#e0e0ff",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    },
    card: {
      background: "linear-gradient(135deg, rgba(13,13,34,0.95), rgba(8,8,24,0.98))",
      border: "1px solid rgba(0,229,255,0.2)",
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      boxShadow: "0 4px 30px rgba(0,229,255,0.1)",
      backdropFilter: "blur(10px)",
    },
    label: {
      color: "#00e5ff",
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: 2,
      textTransform: "uppercase",
      marginBottom: 14,
      display: "block",
      textShadow: "0 0 10px rgba(0,229,255,0.5)",
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
    libraryCard: {
      background: "rgba(10,10,26,0.8)",
      border: "1px solid rgba(42,42,74,0.5)",
      borderRadius: 10,
      padding: 14,
      marginBottom: 10,
      transition: "all 0.2s ease",
    },
  };

  return (
    <div style={S.container}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ color: "#8888aa", fontSize: 13, letterSpacing: 1 }}>
          Powered by Genius.com
        </div>
      </div>

      {/* Search */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <label style={S.label}>🔍 Search Lyrics</label>
          <button
            onClick={() => setShowLibrary(!showLibrary)}
            style={{
              ...S.button(cyberpunk.neon.pink.primary),
              fontSize: 10,
              padding: "8px 14px",
              whiteSpace: "nowrap",
            }}
          >
            📚 Library ({lyricsLibrary.length})
          </button>
        </div>
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
                onClick={() => handleSelectSong(song)}
                style={{
                  ...S.songCard,
                  opacity: loadingLyrics ? 0.6 : 1,
                  cursor: loadingLyrics ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (loadingLyrics) return;
                  e.currentTarget.style.background = "rgba(155,45,224,0.15)";
                  e.currentTarget.style.borderColor = cyberpunk.neon.purple.primary;
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(10,10,26,0.6)";
                  e.currentTarget.style.borderColor = "rgba(42,42,74,0.5)";
                  e.currentTarget.style.transform = "translateY(0)";
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

      {/* Library Modal */}
      {showLibrary && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
        }} onClick={() => setShowLibrary(false)}>
          <div
            style={{ 
              ...S.card, 
              width: "min(900px, 90%)", 
              maxHeight: "85vh", 
              overflowY: "auto",
              background: "linear-gradient(135deg, rgba(13,13,34,0.98), rgba(8,8,24,0.99))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <label style={{ ...S.label, fontSize: 12, marginBottom: 0 }}>📚 My Lyrics Library</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="file"
                  accept=".txt"
                  onChange={importFromFile}
                  style={{ display: "none" }}
                  id="import-file"
                />
                <label htmlFor="import-file" style={{ ...S.button(cyberpunk.neon.green.primary), fontSize: 10, padding: "8px 12px", cursor: "pointer", margin: 0 }}>📥 Import</label>
                <button onClick={() => setShowLibrary(false)} style={{ ...S.button("#e63946"), fontSize: 10, padding: "8px 12px" }}>✕ Close</button>
              </div>
            </div>

            {/* Search & Filter */}
            <div style={{ marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                type="text"
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                placeholder="🔍 Search library..."
                style={{ ...S.input, width: "250px", padding: "10px 14px" }}
              />
              <select
                value={libraryFilter}
                onChange={(e) => setLibraryFilter(e.target.value)}
                style={{ ...S.input, width: "auto", padding: "10px 14px" }}
              >
                <option value="all">All Lyrics</option>
                <option value="favorites">⭐ Favorites</option>
                <option value="genre">🎭 By Genre</option>
              </select>
              {libraryFilter === "genre" && (
                <select
                  value={saveGenre}
                  onChange={(e) => setSaveGenre(e.target.value)}
                  style={{ ...S.input, width: "auto", padding: "10px 14px" }}
                >
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              )}
            </div>

            {/* Library List */}
            {filteredLibrary.length === 0 ? (
              <div style={{ color: "#8888aa", fontSize: 14, textAlign: "center", padding: 40 }}>
                📭 No lyrics found{librarySearch ? ` matching "${librarySearch}"` : ""} in your library yet
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {filteredLibrary.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      ...S.libraryCard,
                      border: entry.favorite ? "1px solid #ffd166" : "1px solid rgba(42,42,74,0.5)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(155,45,224,0.15)";
                      e.currentTarget.style.transform = "translateX(5px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(10,10,26,0.8)";
                      e.currentTarget.style.transform = "translateX(0)";
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <div style={{ color: "#e0e0ff", fontSize: 14, fontWeight: 700 }}>{entry.name}</div>
                          {entry.favorite && <span style={{ fontSize: 16 }}>⭐</span>}
                          <span style={{
                            background: `${cyberpunk.neon.purple.primary}22`,
                            color: cyberpunk.neon.purple.primary,
                            border: `1px solid ${cyberpunk.neon.purple.primary}44`,
                            borderRadius: 6,
                            padding: "2px 8px",
                            fontSize: 9,
                            fontWeight: 700,
                          }}>{entry.genre}</span>
                        </div>
                        <div style={{ color: "#8888aa", fontSize: 11, marginBottom: 4 }}>
                          🎤 {entry.artist} • 🎵 {entry.title}
                        </div>
                        <div style={{ color: "#6666aa", fontSize: 10 }}>
                          📅 {entry.updated} • 📝 {entry.lyrics.length} chars
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button onClick={() => loadFromLibrary(entry)} style={{ ...S.button(cyberpunk.neon.cyan.primary), padding: "6px 10px", fontSize: 9 }}>🎵 Send to ACE</button>
                        <button onClick={() => editLyricsEntry(entry)} style={{ ...S.button(cyberpunk.neon.yellow.primary), padding: "6px 10px", fontSize: 9 }}>✏️ Edit</button>
                        <button onClick={() => toggleFavorite(entry.id)} style={{ ...S.button(cyberpunk.neon.yellow.primary), padding: "6px 10px", fontSize: 9 }}>{entry.favorite ? "⭐" : "☆"}</button>
                        <button onClick={() => deleteFromLibrary(entry.id)} style={{ ...S.button("#e63946"), padding: "6px 10px", fontSize: 9 }}>🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save/Edit Modal */}
      {showSaveModal && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10001,
        }} onClick={() => setShowSaveModal(false)}>
          <div
            style={{ ...S.card, width: "min(600px, 90%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <label style={{ ...S.label, fontSize: 12, marginBottom: 16 }}>
              {editingId ? "✏️ Edit Lyrics" : "💾 Save to Library"}
            </label>
            
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
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            {editingId && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ color: "#8888aa", fontSize: 11, marginBottom: 6, display: "block" }}>Edit Lyrics</label>
                <textarea
                  value={editLyrics}
                  onChange={(e) => setEditLyrics(e.target.value)}
                  rows={10}
                  style={{
                    ...S.input,
                    resize: "vertical",
                    minHeight: 200,
                    fontFamily: "monospace",
                    lineHeight: 1.6,
                    fontSize: 13,
                  }}
                />
              </div>
            )}
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#e0e0ff", fontSize: 11, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={isFavorite}
                  onChange={(e) => setIsFavorite(e.target.checked)}
                  style={{ width: 18, height: 18 }}
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
                {editingId ? "💾 Update" : "💾 Save"}
              </button>
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setEditingId(null);
                  setEditLyrics("");
                }}
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
