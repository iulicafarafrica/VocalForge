import React, { useState } from "react";

const API = "http://localhost:8000";

export default function LyricsTab() {
  // Search state
  const [artist, setArtist] = useState("");
  const [songs, setSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Search for artist
  const searchArtist = async () => {
    if (!artist.trim()) return;
    
    setLoading(true);
    setError("");
    setSongs([]);
    setSelectedSong("");
    setLyrics("");
    
    try {
      const fd = new FormData();
      fd.append("artist", artist);
      fd.append("search_type", "artist");
      
      const res = await fetch(`${API}/audio/lyrics/search`, {
        method: "POST",
        body: fd,
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || "Artist not found");
      
      setSongs(data.songs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get lyrics for song
  const getLyrics = async (songTitle) => {
    if (!songTitle) return;
    
    setLoading(true);
    setError("");
    setSelectedSong(songTitle);
    setLyrics("");
    
    try {
      const fd = new FormData();
      fd.append("artist", artist);
      fd.append("title", songTitle);
      fd.append("search_type", "song");
      
      const res = await fetch(`${API}/audio/lyrics/search`, {
        method: "POST",
        body: fd,
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || "Lyrics not found");
      
      setLyrics(data.lyrics || "No lyrics available");
    } catch (err) {
      setError(err.message);
      setSelectedSong("");
    } finally {
      setLoading(false);
    }
  };

  // Copy lyrics
  const copyLyrics = () => {
    navigator.clipboard.writeText(lyrics);
    alert("✅ Lyrics copied to clipboard!");
  };

  // Clear all
  const clearAll = () => {
    setArtist("");
    setSongs([]);
    setSelectedSong("");
    setLyrics("");
    setError("");
  };

  // Styles
  const styles = {
    container: {
      padding: 24,
      maxWidth: 1000,
      margin: "0 auto",
      color: "#e0e0ff",
    },
    header: {
      textAlign: "center",
      marginBottom: 32,
    },
    card: {
      background: "linear-gradient(135deg, rgba(13,13,34,0.95), rgba(8,8,24,0.98))",
      border: "1px solid rgba(48,48,80,0.5)",
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
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
    button: {
      background: "linear-gradient(135deg, #9b2de0, #c77dff)",
      color: "white",
      border: "none",
      borderRadius: 10,
      padding: "12px 24px",
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    songButton: {
      background: "rgba(10,10,26,0.6)",
      border: "1px solid rgba(42,42,74,0.5)",
      color: "#8888aa",
      borderRadius: 8,
      padding: "10px 14px",
      fontSize: 12,
      cursor: "pointer",
      textAlign: "left",
      transition: "all 0.2s",
    },
    songButtonActive: {
      background: "rgba(155,45,224,0.15)",
      border: "1px solid #9b2de0",
      color: "#c77dff",
    },
    label: {
      color: "#00e5ff",
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: 2,
      textTransform: "uppercase",
      marginBottom: 14,
      display: "block",
    },
  };

  return (
    <div style={styles.container}>
      
      {/* Header */}
      <div style={styles.header}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🎤</div>
        <div style={{ 
          fontSize: 28, 
          fontWeight: 900, 
          marginBottom: 6,
          background: "linear-gradient(135deg, #e0e0ff, #9b2de0)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          Lyrics Search
        </div>
        <div style={{ color: "#8888aa", fontSize: 13 }}>
          Powered by lyrics.ovh — Free lyrics API
        </div>
      </div>

      {/* Step 1: Search Artist */}
      <div style={styles.card}>
        <label style={styles.label}>🔍 Step 1: Search Artist</label>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <input
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Enter artist name (e.g., Queen, Taylor Swift, Metallica)"
            style={styles.input}
            onKeyPress={(e) => e.key === "Enter" && searchArtist()}
          />
          <button
            onClick={searchArtist}
            disabled={loading || !artist.trim()}
            style={{
              ...styles.button,
              opacity: loading || !artist.trim() ? 0.5 : 1,
              cursor: loading || !artist.trim() ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "🔍 Searching..." : "🔍 Search"}
          </button>
          {songs.length > 0 && (
            <button
              onClick={clearAll}
              style={{
                ...styles.button,
                background: "linear-gradient(135deg, #e63946, #ff6b6b)",
              }}
            >
              🗑️ Clear
            </button>
          )}
        </div>
      </div>

      {/* Step 2: Select Song */}
      {songs.length > 0 && (
        <div style={styles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <label style={styles.label}>🎵 Step 2: Select Song</label>
            <span style={{ color: "#8888aa", fontSize: 11 }}>
              {songs.length} songs by <strong style={{ color: "#9b2de0" }}>{artist}</strong>
            </span>
          </div>
          
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", 
            gap: 8,
            maxHeight: "400px",
            overflowY: "auto",
          }}>
            {songs.map((song, idx) => (
              <button
                key={idx}
                onClick={() => getLyrics(song.title)}
                disabled={loading}
                style={{
                  ...styles.songButton,
                  ...(selectedSong === song.title ? styles.songButtonActive : {}),
                  opacity: loading ? 0.5 : 1,
                }}
              >
                🎵 {song.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: View Lyrics */}
      {lyrics && (
        <div style={styles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <label style={styles.label}>📝 Lyrics</label>
            <button
              onClick={copyLyrics}
              style={{
                ...styles.button,
                background: "linear-gradient(135deg, #06d6a0, #00e5ff)",
                padding: "8px 16px",
                fontSize: 11,
              }}
            >
              📋 Copy
            </button>
          </div>
          
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: "#e0e0ff", fontSize: 18, fontWeight: 900, marginBottom: 4 }}>
              🎵 {selectedSong}
            </div>
            <div style={{ color: "#8888aa", fontSize: 12 }}>
              🎤 {artist} • {lyrics.length.toLocaleString()} characters
            </div>
          </div>
          
          <textarea
            value={lyrics}
            readOnly
            rows={20}
            style={{
              ...styles.input,
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
          ...styles.card,
          border: "1px solid #e63946",
          background: "rgba(230,57,70,0.1)",
        }}>
          <div style={{ color: "#e63946", fontSize: 13, fontWeight: 700 }}>
            ❌ {error}
          </div>
        </div>
      )}

      {/* Info */}
      <div style={{
        ...styles.card,
        background: "rgba(6,214,160,0.08)",
        border: "1px solid #06d6a033",
        textAlign: "center",
      }}>
        <div style={{ color: "#06d6a0", fontSize: 11, fontWeight: 800, marginBottom: 4 }}>
          ✅ FREE API — NO TOKEN NEEDED
        </div>
        <div style={{ color: "#8888aa", fontSize: 10 }}>
          Search for an artist → Select a song → View full lyrics
        </div>
      </div>

    </div>
  );
}
