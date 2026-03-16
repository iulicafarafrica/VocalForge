import React, { useState } from "react";

const API = "http://localhost:8000";

export default function LyricsTab() {
  const [artist, setArtist] = useState("");
  const [title, setTitle] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchLyrics = async () => {
    if (!artist.trim() || !title.trim()) {
      setError("Please enter both artist and title");
      return;
    }
    
    setLoading(true);
    setError("");
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyLyrics = () => {
    navigator.clipboard.writeText(lyrics);
    alert("✅ Lyrics copied!");
  };

  const clearAll = () => {
    setArtist("");
    setTitle("");
    setLyrics("");
    setError("");
  };

  const styles = {
    container: {
      padding: 24,
      maxWidth: 900,
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

      {/* Search Form */}
      <div style={styles.card}>
        <label style={styles.label}>🔍 Search Lyrics</label>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ color: "#8888aa", fontSize: 11, marginBottom: 6, display: "block" }}>
              Artist
            </label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="e.g., Queen"
              style={styles.input}
              onKeyPress={(e) => e.key === "Enter" && searchLyrics()}
            />
          </div>
          <div>
            <label style={{ color: "#8888aa", fontSize: 11, marginBottom: 6, display: "block" }}>
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Bohemian Rhapsody"
              style={styles.input}
              onKeyPress={(e) => e.key === "Enter" && searchLyrics()}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={searchLyrics}
            disabled={loading || !artist.trim() || !title.trim()}
            style={{
              ...styles.button,
              flex: 1,
              opacity: loading || !artist.trim() || !title.trim() ? 0.5 : 1,
              cursor: loading || !artist.trim() || !title.trim() ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "🔍 Searching..." : "🔍 Search Lyrics"}
          </button>
          {lyrics && (
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

      {/* Lyrics Display */}
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
              🎵 {title}
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
          Enter artist and song title to get full lyrics
        </div>
      </div>

    </div>
  );
}
