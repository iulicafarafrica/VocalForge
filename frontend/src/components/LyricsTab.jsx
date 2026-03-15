import React, { useState, useEffect } from "react";

const API = "http://localhost:8000";

export default function LyricsTab({ addLog }) {
  // Search state
  const [searchArtist, setSearchArtist] = useState("");
  const [searchTitle, setSearchTitle] = useState("");
  const [searching, setSearching] = useState(false);
  
  // Genius API config state
  const [geniusClientId, setGeniusClientId] = useState("");
  const [geniusClientSecret, setGeniusClientSecret] = useState("");
  const [geniusAccessToken, setGeniusAccessToken] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null); // 'success' | 'error' | null
  
  // Transcribe state
  const [transcribeFile, setTranscribeFile] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  
  // Lyrics state
  const [lyrics, setLyrics] = useState("");
  const [lyricsTitle, setLyricsTitle] = useState("");
  const [lyricsArtist, setLyricsArtist] = useState("");
  
  // Library state
  const [lyricsLibrary, setLyricsLibrary] = useState([]);
  const [showLibrary, setShowLibrary] = useState(false);
  
  // Save state
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveName, setSaveName] = useState("");

  // Load library and Genius credentials on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vocalforge_lyrics_library");
      if (saved) {
        setLyricsLibrary(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load lyrics library:", e);
    }
    
    // Load Genius API credentials
    try {
      const savedClientId = localStorage.getItem("genius_client_id");
      const savedClientSecret = localStorage.getItem("genius_client_secret");
      const savedAccessToken = localStorage.getItem("genius_access_token");
      
      if (savedClientId) setGeniusClientId(savedClientId);
      if (savedClientSecret) setGeniusClientSecret(savedClientSecret);
      if (savedAccessToken) setGeniusAccessToken(savedAccessToken);
    } catch (e) {
      console.error("Failed to load Genius credentials:", e);
    }
  }, []);

  // Test Genius API connection
  const testConnection = async () => {
    if (!geniusAccessToken.trim()) {
      alert("Please enter an Access Token");
      return;
    }
    
    // Auto-save credentials on successful test
    saveGeniusCredentials();
    
    setTestingConnection(true);
    setConnectionStatus(null);
    
    try {
      // Test through backend to avoid CORS issues
      const fd = new FormData();
      fd.append("access_token", geniusAccessToken);
      
      const response = await fetch(`${API}/audio/lyrics/test-connection`, {
        method: "POST",
        body: fd,
      });
      
      const data = await response.json();
      
      if (response.ok && data.status === "success") {
        setConnectionStatus("success");
        addLog?.("[Lyrics] Genius API connection successful!");
        alert("✅ Connected to Genius API successfully! Credentials saved.");
      } else {
        setConnectionStatus("error");
        addLog?.("[Lyrics] Genius API connection failed");
        alert(`❌ Connection failed: ${data.error || "Invalid token"}`);
      }
    } catch (err) {
      setConnectionStatus("error");
      addLog?.(`[Lyrics] Connection error: ${err.message}`);
      alert("❌ Connection error: " + err.message);
    } finally {
      setTestingConnection(false);
    }
  };

  // Save Genius credentials to localStorage
  const saveGeniusCredentials = () => {
    try {
      if (geniusClientId) localStorage.setItem("genius_client_id", geniusClientId);
      if (geniusClientSecret) localStorage.setItem("genius_client_secret", geniusClientSecret);
      if (geniusAccessToken) localStorage.setItem("genius_access_token", geniusAccessToken);
      addLog?.("[Lyrics] Genius credentials saved to localStorage");
    } catch (e) {
      console.error("Failed to save Genius credentials:", e);
    }
  };

  // Search lyrics via Genius API
  const handleSearch = async () => {
    if (!searchArtist.trim() || !searchTitle.trim()) {
      addLog?.("[Lyrics] Please enter artist and title");
      return;
    }
    
    if (!geniusAccessToken.trim()) {
      addLog?.("[Lyrics] Please configure Genius API credentials");
      alert("Please configure Genius API credentials first. Click '🔑 API Config' button.");
      return;
    }
    
    // Auto-save credentials
    saveGeniusCredentials();
    
    setSearching(true);
    addLog?.(`[Lyrics] Searching: ${searchArtist} - ${searchTitle}`);
    
    const fd = new FormData();
    fd.append("artist", searchArtist);
    fd.append("title", searchTitle);
    fd.append("access_token", geniusAccessToken);
    
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
      addLog?.(`[Lyrics] Found: ${data.artist} - ${data.title}`);
    } catch (err) {
      addLog?.(`[Lyrics] Error: ${err.message}`);
      alert(`Search failed: ${err.message}`);
    } finally {
      setSearching(false);
    }
  };

  // Transcribe lyrics from audio
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
      addLog?.(`[Lyrics] Transcribed: ${data.lyrics.length} characters`);
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
    addLog?.(`[Lyrics] Deleted entry`);
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(lyrics);
    addLog?.("[Lyrics] Copied to clipboard");
    alert("Lyrics copied to clipboard!");
  };

  // Use in ACE-Step
  const useInAceStep = () => {
    // Store in localStorage for ACE-Step to pick up
    localStorage.setItem("acestep_lyrics_from_manager", lyrics);
    addLog?.("[Lyrics] Sent to ACE-Step");
    alert("Lyrics sent to ACE-Step! Go to ACE-Step tab and check the Lyrics field.");
  };

  // Export to file
  const exportToFile = () => {
    if (!lyrics.trim()) return;
    
    const content = `[${lyricsTitle || "Untitled"}]
Artist: ${lyricsArtist || "Unknown"}

${lyrics}
`;
    
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(lyricsTitle || "lyrics").replace(/[^a-z0-9]/gi, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    addLog?.("[Lyrics] Exported to file");
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

      {/* Search Lyrics (Genius API) */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={S.label}>🔍 Search Lyrics (Genius API)</span>
          <button
            onClick={() => setShowConfig(!showConfig)}
            style={{
              ...S.button(cyberpunk.neon.yellow.primary),
              padding: "6px 12px",
              fontSize: 10,
            }}
          >
            🔑 API Config
          </button>
        </div>
        
        {/* API Config Panel */}
        {showConfig && (
          <div style={{
            marginBottom: 16,
            padding: 14,
            background: "rgba(255,209,102,0.08)",
            borderRadius: 10,
            border: "1px solid #ffd16633",
          }}>
            <div style={{ color: cyberpunk.neon.yellow.primary, fontSize: 10, fontWeight: 800, marginBottom: 10, letterSpacing: 1 }}>
              🔐 GENIUS API CREDENTIALS
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ color: cyberpunk.text.secondary, fontSize: 9, marginBottom: 4, display: "block" }}>
                  Client ID (optional)
                </label>
                <input
                  type="text"
                  value={geniusClientId}
                  onChange={(e) => setGeniusClientId(e.target.value)}
                  placeholder="Your Genius Client ID"
                  style={{ ...S.input, fontSize: 11, padding: "8px 10px" }}
                />
              </div>
              <div>
                <label style={{ color: cyberpunk.text.secondary, fontSize: 9, marginBottom: 4, display: "block" }}>
                  Client Secret (optional)
                </label>
                <input
                  type="password"
                  value={geniusClientSecret}
                  onChange={(e) => setGeniusClientSecret(e.target.value)}
                  placeholder="Your Genius Client Secret"
                  style={{ ...S.input, fontSize: 11, padding: "8px 10px" }}
                />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ color: cyberpunk.text.secondary, fontSize: 9, marginBottom: 4, display: "block" }}>
                Access Token (required)
              </label>
              <input
                type="password"
                value={geniusAccessToken}
                onChange={(e) => setGeniusAccessToken(e.target.value)}
                placeholder="Your Genius Access Token"
                style={{ ...S.input, fontSize: 11, padding: "8px 10px" }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={testConnection}
                disabled={testingConnection || !geniusAccessToken}
                style={{
                  ...S.button(cyberpunk.neon.green.primary),
                  opacity: testingConnection || !geniusAccessToken ? 0.5 : 1,
                  cursor: testingConnection || !geniusAccessToken ? "not-allowed" : "pointer",
                  padding: "6px 14px",
                  fontSize: 10,
                }}
              >
                {testingConnection ? "⏳ Testing..." : "🔌 Test Connection"}
              </button>
              {connectionStatus === "success" && (
                <span style={{ color: cyberpunk.neon.green.primary, fontSize: 10, fontWeight: 700 }}>
                  ✅ Connected
                </span>
              )}
              {connectionStatus === "error" && (
                <span style={{ color: "#ef4444", fontSize: 10, fontWeight: 700 }}>
                  ❌ Connection Failed
                </span>
              )}
            </div>
            <div style={{ marginTop: 10, padding: 8, background: "rgba(0,229,255,0.08)", borderRadius: 6, border: "1px solid #00e5ff33" }}>
              <div style={{ color: cyberpunk.text.muted, fontSize: 9, lineHeight: 1.5 }}>
                💡 <strong>How to get credentials:</strong><br/>
                1. Go to <a href="https://genius.com/api-clients" target="_blank" style={{ color: cyberpunk.neon.cyan.primary }}>genius.com/api-clients</a><br/>
                2. Create a new API client<br/>
                3. Copy your Access Token above
              </div>
            </div>
          </div>
        )}
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ color: cyberpunk.text.secondary, fontSize: 11, marginBottom: 6, display: "block" }}>
              Artist
            </label>
            <input
              type="text"
              value={searchArtist}
              onChange={(e) => setSearchArtist(e.target.value)}
              placeholder="e.g., Queen"
              style={S.input}
            />
          </div>
          <div>
            <label style={{ color: cyberpunk.text.secondary, fontSize: 11, marginBottom: 6, display: "block" }}>
              Title
            </label>
            <input
              type="text"
              value={searchTitle}
              onChange={(e) => setSearchTitle(e.target.value)}
              placeholder="e.g., Bohemian Rhapsody"
              style={S.input}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              onClick={handleSearch}
              disabled={searching || !searchArtist || !searchTitle}
              style={{
                ...S.button(cyberpunk.neon.purple.primary),
                flex: 1,
                opacity: searching || !searchArtist || !searchTitle ? 0.5 : 1,
                cursor: searching || !searchArtist || !searchTitle ? "not-allowed" : "pointer",
              }}
            >
              {searching ? "🔍 Searching..." : "🔍 Search"}
            </button>
          </div>
        </div>
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
                gap: 12,
                padding: 12,
                background: "rgba(10,10,26,0.6)",
                border: `2px dashed ${transcribeFile ? cyberpunk.neon.green.primary : "rgba(42,42,74,0.5)"}`,
                borderRadius: 10,
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
            >
              <span style={{ fontSize: 32 }}>{transcribeFile ? "🎵" : "📂"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  color: transcribeFile ? cyberpunk.neon.green.primary : cyberpunk.text.secondary, 
                  fontSize: 13, 
                  fontWeight: 700,
                }}>
                  {transcribeFile ? `✓ ${transcribeFile.name}` : "Click to upload audio file"}
                </div>
                <div style={{ color: cyberpunk.text.muted, fontSize: 10, marginTop: 4 }}>
                  WAV, MP3, FLAC supported
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
            }}
          >
            {transcribing ? "🎤 Transcribing..." : "🎤 Transcribe"}
          </button>
        </div>
      </div>

      {/* Lyrics Editor */}
      <div style={S.card}>
        <span style={S.label}>📝 Lyrics Editor</span>
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            value={lyricsTitle}
            onChange={(e) => setLyricsTitle(e.target.value)}
            placeholder="Song Title"
            style={{ ...S.input, marginBottom: 8 }}
          />
          <input
            type="text"
            value={lyricsArtist}
            onChange={(e) => setLyricsArtist(e.target.value)}
            placeholder="Artist Name"
            style={S.input}
          />
        </div>
        <textarea
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          placeholder="Lyrics will appear here...&#10;&#10;You can also type or paste lyrics manually."
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
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <button
            onClick={() => setShowSaveInput(true)}
            disabled={!lyrics.trim()}
            style={{
              ...S.button(cyberpunk.neon.yellow.primary),
              opacity: !lyrics.trim() ? 0.5 : 1,
              cursor: !lyrics.trim() ? "not-allowed" : "pointer",
            }}
          >
            💾 Save to Library
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
            🎵 Use in ACE-Step
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
              No saved lyrics yet. Save your first lyrics!
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
                        {entry.artist} • {entry.created}
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
                        🗑️ Delete
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
                    {entry.lyrics.slice(0, 100)}...
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
