import React, { useState } from "react";

const API = "http://localhost:8000";

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
  
  // Error state
  const [error, setError] = useState("");

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
      
      // Clean up lyrics (remove Genius metadata headers)
      let rawLyrics = data.lyrics || "No lyrics available";
      const cleanedLyrics = cleanLyrics(rawLyrics);
      
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
      
      // Skip metadata lines at the beginning
      if (skipIntro) {
        // Skip lines containing these keywords
        const skipKeywords = [
          'Contributors',
          'Translations',
          'English',
          'Lyrics',
          'About',
          'Produced by',
          'Written by',
          'Featuring',
          'Views',
          'Released on',
          'Credits'
        ];
        
        // Check if line should be skipped
        const shouldSkip = skipKeywords.some(keyword => 
          trimmed.toLowerCase().includes(keyword.toLowerCase())
        );
        
        // Also skip lines that are just numbers or very short
        const isMetadata = /^\d+$/.test(trimmed) || (trimmed.length < 20 && /[0-9]/.test(trimmed));
        
        if (shouldSkip || isMetadata) {
          continue;
        }
        
        // If we find a line that looks like actual lyrics (has brackets for section or is longer)
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

  // Copy to clipboard
  const copyLyrics = () => {
    navigator.clipboard.writeText(lyrics);
    addLog?.("[Lyrics] Copied to clipboard");
    alert("✅ Lyrics copied to clipboard!");
  };

  // Use in ACE-Step
  const useInAceStep = () => {
    localStorage.setItem("acestep_lyrics_from_manager", lyrics);
    localStorage.setItem("acestep_lyrics_artist", selectedArtist);
    localStorage.setItem("acestep_lyrics_title", selectedTitle);
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
      maxWidth: 1000,
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
  };

  return (
    <div style={S.container}>

      {/* Header - Minimal */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ color: "#8888aa", fontSize: 13, letterSpacing: 1 }}>
          Powered by Genius.com
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
              <button onClick={copyLyrics} style={{ ...S.button(cyberpunk.neon.cyan.primary), fontSize: 10, padding: "8px 12px" }}>📋 Copy</button>
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
