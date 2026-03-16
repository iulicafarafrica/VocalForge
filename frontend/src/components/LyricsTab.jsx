import React, { useState } from "react";

const API_BASE = "http://localhost:8000";

export default function LyricsTab() {
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

  /**
   * Search for songs using lyrics.ovh suggest endpoint
   * Via backend proxy to avoid CORS issues
   */
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    setError("");
    setSuggestions([]);
    setLyrics("");
    
    try {
      // Use backend proxy for suggest endpoint
      const fd = new FormData();
      fd.append("query", searchQuery);
      
      const res = await fetch(`${API_BASE}/audio/lyrics/suggest`, {
        method: "POST",
        body: fd,
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || "Search failed");
      
      setSuggestions(data.songs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  /**
   * Get lyrics for selected song
   */
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
      
      const res = await fetch(`${API_BASE}/audio/lyrics/search`, {
        method: "POST",
        body: fd,
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || "Lyrics not found");
      
      setLyrics(data.lyrics || "No lyrics available");
    } catch (err) {
      setError(err.message);
      setSelectedArtist("");
      setSelectedTitle("");
    } finally {
      setLoadingLyrics(false);
    }
  };

  /**
   * Copy lyrics to clipboard
   */
  const copyLyrics = () => {
    navigator.clipboard.writeText(lyrics);
    alert("✅ Lyrics copied to clipboard!");
  };

  /**
   * Clear all
   */
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
    bg: {
      primary: "linear-gradient(135deg, #0a0a1a 0%, #0d0d22 50%, #0a0a1a 100%)",
      card: "linear-gradient(180deg, rgba(13,13,34,0.95), rgba(8,8,24,0.98))",
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
    container: {
      padding: 24,
      maxWidth: 1100,
      margin: "0 auto",
      color: cyberpunk.text.primary,
    },
    header: {
      textAlign: "center",
      marginBottom: 32,
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
      textShadow: `0 0 10px ${cyberpunk.neon.cyan.glow}`,
    },
    input: {
      background: "#0a0a1a",
      border: "1px solid rgba(42,42,74,0.5)",
      color: cyberpunk.text.primary,
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
      padding: "12px 24px",
      fontSize: 13,
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
      
      {/* Header */}
      <div style={styles.header}>
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
          Lyrics Search
        </div>
        <div style={{ color: cyberpunk.text.secondary, fontSize: 13, letterSpacing: 1 }}>
          Powered by lyrics.ovh — Free lyrics API
        </div>
      </div>

      {/* Step 1: Search */}
      <div style={S.card}>
        <label style={S.label}>🔍 Step 1: Search for a Song</label>
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
              minWidth: 140,
            }}
          >
            {searching ? "🔍 Searching..." : "🔍 Search"}
          </button>
          {suggestions.length > 0 && (
            <button
              onClick={clearAll}
              style={{
                ...S.button("#e63946"),
                whiteSpace: "nowrap",
                minWidth: 100,
              }}
            >
              🗑️ Clear
            </button>
          )}
        </div>
        
        {/* Info box */}
        <div style={{ 
          padding: 12, 
          background: "rgba(6,214,160,0.08)", 
          borderRadius: 8, 
          border: "1px solid #06d6a033" 
        }}>
          <div style={{ color: cyberpunk.neon.green.primary, fontSize: 10, fontWeight: 800, marginBottom: 4 }}>
            ✅ OFFICIAL lyrics.ovh API
          </div>
          <div style={{ color: cyberpunk.text.muted, fontSize: 9 }}>
            📚 Fetches from: Genius • AZLyrics • Paroles.net • LyricsMania • Letras • Lyrics.com
          </div>
        </div>
      </div>

      {/* Step 2: Select Song */}
      {suggestions.length > 0 && (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <label style={S.label}>🎵 Step 2: Select a Song</label>
            <span style={{ color: cyberpunk.text.muted, fontSize: 11 }}>
              {suggestions.length} results for "<strong style={{ color: cyberpunk.neon.purple.primary }}>{searchQuery}</strong>"
            </span>
          </div>
          
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", 
            gap: 12,
            maxHeight: "450px",
            overflowY: "auto",
            paddingRight: 8,
          }}>
            {suggestions.map((song, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectSong(song.artist.name, song.title)}
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
                <div style={{ color: cyberpunk.text.primary, fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  🎵 {song.title}
                </div>
                <div style={{ color: cyberpunk.text.muted, fontSize: 11 }}>
                  🎤 {song.artist.name}
                </div>
                {song.album && song.album.title && (
                  <div style={{ color: cyberpunk.text.muted, fontSize: 10, marginTop: 6 }}>
                    💿 {song.album.title}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: View Lyrics */}
      {lyrics && (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <label style={S.label}>📝 Lyrics</label>
            <button
              onClick={copyLyrics}
              style={{
                ...S.button(cyberpunk.neon.green.primary),
                padding: "8px 16px",
                fontSize: 11,
              }}
            >
              📋 Copy
            </button>
          </div>
          
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: cyberpunk.text.primary, fontSize: 18, fontWeight: 900, marginBottom: 4 }}>
              🎵 {selectedTitle}
            </div>
            <div style={{ color: cyberpunk.text.muted, fontSize: 12 }}>
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

      {/* API Info */}
      <div style={{
        ...S.card,
        background: "rgba(0,229,255,0.08)",
        border: "1px solid #00e5ff33",
        textAlign: "center",
      }}>
        <div style={{ color: cyberpunk.neon.cyan.primary, fontSize: 11, fontWeight: 800, marginBottom: 6 }}>
          📚 OFFICIAL lyrics.ovh API
        </div>
        <div style={{ color: cyberpunk.text.muted, fontSize: 10, lineHeight: 1.6 }}>
          <div>✨ Free API • No authentication required • CORS enabled</div>
          <div>🔗 <a href="https://github.com/NTag/lyrics.ovh" target="_blank" style={{ color: cyberpunk.neon.cyan.primary }}>github.com/NTag/lyrics.ovh</a></div>
        </div>
      </div>

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
