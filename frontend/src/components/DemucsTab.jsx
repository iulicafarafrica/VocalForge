import { useState } from "react";

const API = "http://localhost:8000";

const SEPARATION_MODELS = [
  {
    id: "bs_roformer_1297",
    name: "BS-RoFormer 🏆 SDR 12.97",
    desc: "⚠ Requires: pip install audio-separator[gpu] — Best model, SDR 12.97.",
    stems: ["vocals", "instrumental"],
    color: "#ffd166",
    glow: "#ffd166",
    badge: "BEST QUALITY",
    engine: "uvr",
    requiresPackage: "audio-separator",
  },
  {
    id: "mel_band_roformer",
    name: "Mel-Band RoFormer SDR 12.6",
    desc: "⚠ Requires: pip install audio-separator[gpu] — Mel-Band RoFormer. SDR 12.6.",
    stems: ["vocals", "instrumental"],
    color: "#ff9f1c",
    glow: "#ff9f1c",
    badge: "EXCELLENT",
    engine: "uvr",
    requiresPackage: "audio-separator",
  },
  {
    id: "htdemucs_ft",
    name: "htdemucs_ft ✅ Recommended",
    desc: "Demucs fine-tuned — SDR 10.8 vocals, 4 stems. Fast, no extra dependencies.",
    stems: ["vocals", "drums", "bass", "other"],
    color: "#00e5ff",
    glow: "#00e5ff",
    badge: "",
    engine: "demucs",
  },
  {
    id: "htdemucs",
    name: "htdemucs",
    desc: "Demucs v4 standard — fast and accurate, 4 stems. SDR 10.0 vocals.",
    stems: ["vocals", "drums", "bass", "other"],
    color: "#6666aa",
    glow: "#6666aa",
    badge: "FAST",
    engine: "demucs",
  },
  {
    id: "htdemucs_6s",
    name: "htdemucs_6s",
    desc: "Demucs 6-stem — also separates guitar & piano. SDR 10.0.",
    stems: ["vocals", "drums", "bass", "other", "guitar", "piano"],
    color: "#06d6a0",
    glow: "#06d6a0",
    badge: "6 STEMS",
    engine: "demucs",
  },
];

const STEM_ICONS = {
  vocals: "🎙️", drums: "◎", bass: "◈", other: "⊞",
  guitar: "◈", piano: "⊞", instrumental: "⌾",
};

const STEM_COLORS = {
  vocals: "#00e5ff", drums: "#ffd166", bass: "#06d6a0",
  other: "#9b2de0", guitar: "#e63946", piano: "#ff9f1c",
  instrumental: "#7209b7",
};

export default function DemucsTab({ addLog, tracks, setTracks }) {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedModel, setSelectedModel] = useState("htdemucs_ft");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [results, setResults] = useState(null);
  const [mode, setMode] = useState("stems");

  const model = SEPARATION_MODELS.find(m => m.id === selectedModel);
  const isUVR = model?.engine === "uvr";

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFile(file);
    setResults(null);
    addLog(`[OK] Separation: uploaded ${file.name}`);
  };

  const handleSeparate = async () => {
    if (!uploadedFile) return;
    setProcessing(true);
    setProgress(5);
    setProgressLabel("Uploading audio...");
    setResults(null);

    const fd = new FormData();
    fd.append("file", uploadedFile);
    fd.append("model", selectedModel);
    fd.append("mode", mode);

    const steps = [
      { pct: 15, label: isUVR ? "⬇ Downloading model..." : "→ Loading model...", delay: 1500 },
      { pct: 35, label: "⊳ Analyzing audio spectrum...", delay: 5000 },
      { pct: 60, label: "◈ AI separation in progress...", delay: 12000 },
      { pct: 80, label: "⊡ Encoding output files...", delay: 20000 },
    ];
    const timers = steps.map(s => setTimeout(() => { setProgress(s.pct); setProgressLabel(s.label); }, s.delay));

    try {
      const res = await fetch(`${API}/demucs_separate`, { method: "POST", body: fd });
      timers.forEach(clearTimeout);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setResults(data.stems);
      setProgress(100);
      setProgressLabel("✓ Separation complete!");
      addLog(`[OK] Separation done: ${Object.keys(data.stems).length} stems | model: ${selectedModel}`);

      Object.entries(data.stems).forEach(([stem, url]) => {
        setTracks(prev => [{
          id: Date.now() + Math.random(),
          filename: url.split("/").pop(),
          url: `${API}${url}`,
          duration: data.duration_sec,
          created: new Date().toLocaleTimeString(),
          isStem: true,
          stem,
        }, ...prev]);
      });

    } catch (err) {
      timers.forEach(clearTimeout);
      addLog(`[ERR] Separation failed: ${err.message}`);
      setProgress(0);
    } finally {
      setTimeout(() => { setProcessing(false); setProgress(0); setProgressLabel(""); }, 2000);
    }
  };

  const cyberpunk = {
    bg: {
      primary: "linear-gradient(135deg, #0a0a1a 0%, #0d0d22 50%, #0a0a1a 100%)",
      secondary: "linear-gradient(135deg, #0f0f2a 0%, #080818 100%)",
      card: "linear-gradient(180deg, rgba(13,13,34,0.95) 0%, rgba(8,8,24,0.98) 100%)",
    },
    neon: {
      cyan: { primary: "#00e5ff", glow: "rgba(0,229,255,0.5)" },
      purple: { primary: "#9b2de0", glow: "rgba(155,45,224,0.5)" },
      pink: { primary: "#ff6b9d", glow: "rgba(255,107,157,0.5)" },
      yellow: { primary: "#ffd166", glow: "rgba(255,209,102,0.5)" },
      green: { primary: "#06d6a0", glow: "rgba(6,214,160,0.5)" },
    },
    border: {
      default: "1px solid rgba(30,30,58,0.5)",
      active: "1px solid rgba(0,229,255,0.3)",
      glow: "0 0 20px rgba(0,229,255,0.1)",
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
      border: cyberpunk.border.default,
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
    },
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "10px 0" }}>

      {/* Header Cyberpunk */}
      <div style={{ textAlign: "center", marginBottom: 32, position: "relative" }}>
        
        {/* SDR Ranking Bar */}
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          gap: 16, 
          marginTop: 20, 
          flexWrap: "wrap",
          padding: "16px 20px",
          background: cyberpunk.bg.secondary,
          borderRadius: 12,
          border: "1px solid rgba(30,30,58,0.5)",
          maxWidth: 700,
          margin: "20px auto 0",
        }}>
          {[
            { label: "BS-RoFormer", sdr: 12.97, color: cyberpunk.neon.yellow.primary, pct: 100 },
            { label: "Mel-Band RoFormer", sdr: 12.6, color: cyberpunk.neon.pink.primary, pct: 97 },
            { label: "htdemucs_ft", sdr: 10.8, color: cyberpunk.neon.cyan.primary, pct: 83 },
            { label: "htdemucs", sdr: 10.0, color: cyberpunk.text.secondary, pct: 77 },
          ].map(item => (
            <div key={item.label} style={{ textAlign: "center", minWidth: 110 }}>
              <div style={{ color: item.color, fontSize: 10, fontWeight: 800, marginBottom: 6, letterSpacing: 1 }}>
                {item.label}
              </div>
              <div style={{ 
                height: 6, 
                background: "rgba(10,10,26,0.8)", 
                borderRadius: 3, 
                overflow: "hidden", 
                width: 100,
                border: "1px solid rgba(255,255,255,0.1)",
              }}>
                <div style={{ 
                  height: 6, 
                  background: `linear-gradient(90deg, ${item.color}, transparent)`, 
                  width: `${item.pct}%`, 
                  borderRadius: 3,
                  boxShadow: `0 0 10px ${item.color}66`,
                }} />
              </div>
              <div style={{ color: item.color, fontSize: 11, marginTop: 6, fontWeight: 700 }}>
                SDR {item.sdr}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* LEFT COLUMN */}
        <div>

          {/* Upload Card */}
          <div style={{ 
            ...S.card, 
            border: uploadedFile 
              ? `1px solid ${cyberpunk.neon.cyan.primary}` 
              : cyberpunk.border.default,
            boxShadow: uploadedFile 
              ? `0 0 30px ${cyberpunk.neon.cyan.glow}` 
              : "none",
            transition: "all 0.3s ease",
          }}>
            <span style={S.label}>① Upload Audio</span>
            <label style={{
              display: "flex", 
              alignItems: "center", 
              gap: 16, 
              padding: "24px 18px",
              background: "linear-gradient(135deg, rgba(10,10,26,0.8), rgba(15,15,42,0.6))",
              border: `2px dashed ${uploadedFile ? cyberpunk.neon.cyan.primary : "rgba(42,42,74,0.5)"}`,
              borderRadius: 12, 
              cursor: "pointer",
              transition: "all 0.3s ease",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              if (!uploadedFile) {
                e.currentTarget.style.borderColor = cyberpunk.neon.cyan.primary;
                e.currentTarget.style.boxShadow = `0 0 20px ${cyberpunk.neon.cyan.glow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (!uploadedFile) {
                e.currentTarget.style.borderColor = "rgba(42,42,74,0.5)";
                e.currentTarget.style.boxShadow = "none";
              }
            }}
            >
              <span style={{ 
                fontSize: 40,
                filter: uploadedFile ? `drop-shadow(0 0 15px ${cyberpunk.neon.cyan.glow})` : "none",
                transition: "all 0.3s ease",
              }}>
                {uploadedFile ? "♪" : "⊡"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  color: uploadedFile ? cyberpunk.neon.cyan.primary : cyberpunk.text.secondary, 
                  fontSize: 14, 
                  fontWeight: 700, 
                  overflow: "hidden", 
                  textOverflow: "ellipsis", 
                  whiteSpace: "nowrap",
                }}>
                  {uploadedFile ? uploadedFile.name : "Click to upload audio file"}
                </div>
                <div style={{ color: cyberpunk.text.muted, fontSize: 11, marginTop: 4, letterSpacing: 1 }}>
                  WAV · MP3 · FLAC · M4A
                </div>
              </div>
              <input type="file" accept="audio/*" onChange={handleUpload} style={{ display: "none" }} />
            </label>
            {uploadedFile && (
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <span style={{ 
                  background: `${cyberpunk.neon.cyan.primary}22`, 
                  color: cyberpunk.neon.cyan.primary, 
                  border: `1px solid ${cyberpunk.neon.cyan.primary}44`, 
                  borderRadius: 8, 
                  padding: "4px 12px", 
                  fontSize: 11, 
                  fontFamily: "monospace",
                  letterSpacing: 1,
                  boxShadow: `0 0 10px ${cyberpunk.neon.cyan.glow}`,
                }}>
                  ▤ {(uploadedFile.size / 1024 / 1024).toFixed(1)} MB
                </span>
                <button 
                  onClick={() => { setUploadedFile(null); setResults(null); }}
                  style={{ 
                    background: "rgba(230,57,70,0.15)", 
                    color: "#e63946", 
                    border: "1px solid rgba(230,57,70,0.4)", 
                    borderRadius: 8, 
                    padding: "4px 12px", 
                    fontSize: 11, 
                    cursor: "pointer",
                    fontWeight: 700,
                    letterSpacing: 1,
                  }}
                >
                  ✕ Remove
                </button>
              </div>
            )}
          </div>

          {/* Model Selection */}
          <div style={S.card}>
            <span style={S.label}>② Separation Model</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {SEPARATION_MODELS.map(m => {
                const isSelected = selectedModel === m.id;
                return (
                  <div 
                    key={m.id} 
                    onClick={() => setSelectedModel(m.id)} 
                    style={{
                      padding: "14px 16px", 
                      borderRadius: 12, 
                      cursor: "pointer",
                      background: isSelected 
                        ? `linear-gradient(135deg, ${m.color}15, transparent)` 
                        : "linear-gradient(135deg, rgba(10,10,26,0.6), rgba(8,8,24,0.4))",
                      border: isSelected 
                        ? `1px solid ${m.color}` 
                        : "1px solid rgba(26,26,46,0.5)",
                      transition: "all 0.2s ease",
                      position: "relative",
                      overflow: "hidden",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = m.color;
                        e.currentTarget.style.boxShadow = `0 0 15px ${m.color}33`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = "rgba(26,26,46,0.5)";
                        e.currentTarget.style.boxShadow = "none";
                      }
                    }}
                  >
                    {isSelected && (
                      <div style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "3px",
                        height: "100%",
                        background: m.color,
                        boxShadow: `0 0 10px ${m.color}`,
                      }} />
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, marginLeft: isSelected ? 8 : 0 }}>
                      <div style={{
                        width: 16, 
                        height: 16, 
                        borderRadius: "50%",
                        background: isSelected ? m.color : "rgba(26,26,46,0.8)",
                        border: `2px solid ${m.color}`,
                        flexShrink: 0,
                        boxShadow: isSelected ? `0 0 10px ${m.color}` : "none",
                        transition: "all 0.2s ease",
                      }} />
                      <span style={{ 
                        color: isSelected ? m.color : cyberpunk.text.secondary, 
                        fontSize: 13, 
                        fontWeight: 800,
                        letterSpacing: 0.5,
                      }}>
                        {m.name}
                      </span>
                      <span style={{ 
                        background: `${m.color}22`, 
                        color: m.color, 
                        border: `1px solid ${m.color}44`,
                        borderRadius: 4, 
                        padding: "2px 8px", 
                        fontSize: 9, 
                        fontWeight: 800, 
                        letterSpacing: 1,
                        textTransform: "uppercase",
                      }}>
                        {m.badge}
                      </span>
                      {m.engine === "uvr" && (
                        <span style={{ 
                          background: `${cyberpunk.neon.yellow.primary}22`, 
                          color: cyberpunk.neon.yellow.primary, 
                          border: `1px solid ${cyberpunk.neon.yellow.primary}44`, 
                          borderRadius: 4, 
                          padding: "2px 6px", 
                          fontSize: 9, 
                          fontWeight: 800,
                          letterSpacing: 1,
                        }}>
                          UVR
                        </span>
                      )}
                    </div>
                    <div style={{ color: cyberpunk.text.muted, fontSize: 11, marginLeft: isSelected ? 34 : 26, lineHeight: 1.6 }}>
                      {m.desc}
                    </div>
                    <div style={{ display: "flex", gap: 4, marginTop: 8, marginLeft: isSelected ? 34 : 26, flexWrap: "wrap" }}>
                      {m.stems.map(s => (
                        <span key={s} style={{
                          background: `${STEM_COLORS[s] || "#6666aa"}22`,
                          color: STEM_COLORS[s] || "#6666aa",
                          border: `1px solid ${(STEM_COLORS[s] || "#6666aa")}44`,
                          borderRadius: 6, 
                          padding: "2px 8px", 
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: 0.5,
                        }}>
                          {STEM_ICONS[s] || "♪"} {s}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div>

          {/* Output Mode */}
          <div style={S.card}>
            <span style={S.label}>③ Output Mode</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { id: "stems", icon: "⊞", label: "All Stems", desc: `Separate all ${model?.stems.length || 2} stems individually` },
                { id: "vocals_only", icon: "🎙️", label: "Vocals Only", desc: "Extract only the vocal track" },
                { id: "instrumental_only", icon: "⌾", label: "Instrumental Only", desc: "Remove vocals, keep everything else" },
              ].map(opt => {
                const isActive = mode === opt.id;
                return (
                  <div 
                    key={opt.id} 
                    onClick={() => setMode(opt.id)} 
                    style={{
                      display: "flex", 
                      alignItems: "center", 
                      gap: 14, 
                      padding: "14px 16px",
                      borderRadius: 12, 
                      cursor: "pointer",
                      background: isActive 
                        ? `linear-gradient(135deg, ${cyberpunk.neon.cyan.primary}15, transparent)` 
                        : "linear-gradient(135deg, rgba(10,10,26,0.6), rgba(8,8,24,0.4))",
                      border: isActive 
                        ? `1px solid ${cyberpunk.neon.cyan.primary}` 
                        : "1px solid rgba(26,26,46,0.5)",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = cyberpunk.neon.cyan.primary;
                        e.currentTarget.style.boxShadow = `0 0 15px ${cyberpunk.neon.cyan.glow}`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = "rgba(26,26,46,0.5)";
                        e.currentTarget.style.boxShadow = "none";
                      }
                    }}
                  >
                    <div style={{
                      width: 18, 
                      height: 18, 
                      borderRadius: "50%",
                      background: isActive ? cyberpunk.neon.cyan.primary : "rgba(26,26,46,0.8)",
                      border: `2px solid ${cyberpunk.neon.cyan.primary}`,
                      flexShrink: 0,
                      boxShadow: isActive ? `0 0 10px ${cyberpunk.neon.cyan.glow}` : "none",
                      transition: "all 0.2s ease",
                    }} />
                    <span style={{ fontSize: 24 }}>{opt.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        color: isActive ? cyberpunk.neon.cyan.primary : cyberpunk.text.secondary, 
                        fontSize: 13, 
                        fontWeight: 700,
                        letterSpacing: 0.5,
                      }}>
                        {opt.label}
                      </div>
                      <div style={{ color: cyberpunk.text.muted, fontSize: 11, marginTop: 2 }}>
                        {opt.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Separate Button */}
          <div style={S.card}>
            <button
              onClick={handleSeparate}
              disabled={processing || !uploadedFile}
              style={{
                width: "100%", 
                padding: "20px 0", 
                borderRadius: 12,
                background: processing 
                  ? "rgba(26,26,46,0.8)" 
                  : uploadedFile
                    ? `linear-gradient(135deg, ${model?.color || cyberpunk.neon.cyan.primary}, ${cyberpunk.neon.purple.primary})`
                    : "rgba(26,26,46,0.8)",
                color: "#fff", 
                fontWeight: 900, 
                fontSize: 18, 
                border: "none",
                cursor: (processing || !uploadedFile) ? "not-allowed" : "pointer",
                opacity: !uploadedFile ? 0.5 : 1,
                letterSpacing: 2,
                textTransform: "uppercase",
                boxShadow: uploadedFile && !processing 
                  ? `0 0 30px ${model?.color || cyberpunk.neon.cyan.glow}` 
                  : "none",
                transition: "all 0.3s ease",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                if (uploadedFile && !processing) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = `0 0 40px ${model?.color || cyberpunk.neon.cyan.glow}`;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = uploadedFile && !processing 
                  ? `0 0 30px ${model?.color || cyberpunk.neon.cyan.glow}` 
                  : "none";
              }}
            >
              {processing ? `· ${progressLabel || "Processing..."}` : "→ Separate Stems"}
            </button>

            {processing && (
              <div style={{ marginTop: 14 }}>
                <div style={{ 
                  height: 8, 
                  background: "rgba(10,10,26,0.8)", 
                  borderRadius: 4, 
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}>
                  <div style={{ 
                    height: 8, 
                    background: `linear-gradient(90deg, ${model?.color || cyberpunk.neon.cyan.primary}, ${cyberpunk.neon.purple.primary}, ${model?.color || cyberpunk.neon.cyan.primary})`, 
                    width: `${progress}%`, 
                    transition: "width 0.8s ease", 
                    borderRadius: 4,
                    backgroundSize: "200% 100%",
                    animation: "shimmer 2s linear infinite",
                    boxShadow: `0 0 20px ${model?.color || cyberpunk.neon.cyan.glow}`,
                  }} />
                </div>
                <div style={{ 
                  color: cyberpunk.text.secondary, 
                  fontSize: 11, 
                  marginTop: 8, 
                  textAlign: "center",
                  letterSpacing: 1,
                }}>
                  {progressLabel}
                </div>
              </div>
            )}

            {/* Info Box */}
            <div style={{ 
              marginTop: 16, 
              padding: "14px 16px", 
              background: "rgba(10,10,26,0.6)", 
              borderRadius: 10, 
              border: `1px solid ${cyberpunk.neon.yellow.primary}33`,
            }}>
              <div style={{ 
                color: cyberpunk.neon.yellow.primary, 
                fontSize: 11, 
                fontWeight: 800, 
                marginBottom: 10,
                letterSpacing: 1,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}>
                🏆 QUALITY RANKING (SDR VOCALS)
              </div>
              <div style={{ color: cyberpunk.text.muted, fontSize: 11, lineHeight: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: cyberpunk.neon.yellow.primary, fontWeight: 700 }}>① BS-RoFormer</span>
                  <span style={{ color: cyberpunk.neon.yellow.primary }}>SDR 12.97</span>
                  <span style={{ color: "#444466" }}>(best ever)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: cyberpunk.neon.pink.primary, fontWeight: 700 }}>② Mel-Band RoFormer</span>
                  <span style={{ color: cyberpunk.neon.pink.primary }}>SDR 12.6</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: cyberpunk.neon.cyan.primary, fontWeight: 700 }}>③ htdemucs_ft</span>
                  <span style={{ color: cyberpunk.neon.cyan.primary }}>SDR 10.8</span>
                  <span style={{ color: "#444466" }}>(4 stems)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: cyberpunk.text.secondary, fontWeight: 700 }}>④ htdemucs</span>
                  <span style={{ color: cyberpunk.text.secondary }}>SDR 10.0</span>
                  <span style={{ color: "#444466" }}>(fast)</span>
                </div>
                <div style={{ 
                  marginTop: 10, 
                  color: cyberpunk.text.muted, 
                  fontSize: 10,
                  padding: "8px 12px",
                  background: "rgba(255,209,102,0.1)",
                  borderRadius: 6,
                  border: "1px solid rgba(255,209,102,0.2)",
                }}>
                  ⚠ UVR models auto-download on first use (~400-500MB)
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          {results && (
            <div style={{ 
              ...S.card, 
              border: `1px solid ${cyberpunk.neon.green.primary}44`, 
              background: `${cyberpunk.neon.green.primary}11`,
              boxShadow: `0 0 30px ${cyberpunk.neon.green.glow}`,
            }}>
              <span style={{ 
                ...S.label, 
                color: cyberpunk.neon.green.primary,
                textShadow: `0 0 10px ${cyberpunk.neon.green.glow}`,
              }}>
                ✓ STEMS READY — DOWNLOAD BELOW
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.entries(results).map(([stem, url]) => (
                  <div key={stem} style={{
                    background: "rgba(10,10,26,0.8)", 
                    borderRadius: 12, 
                    padding: "12px 14px",
                    border: `1px solid ${STEM_COLORS[stem] || "#2a2a4a"}44`,
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = STEM_COLORS[stem] || cyberpunk.neon.cyan.primary;
                    e.currentTarget.style.boxShadow = `0 0 15px ${STEM_COLORS[stem] || cyberpunk.neon.cyan.glow}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${STEM_COLORS[stem] || "#2a2a4a"}44`;
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ 
                        color: STEM_COLORS[stem] || cyberpunk.text.secondary, 
                        fontSize: 13, 
                        fontWeight: 800,
                        letterSpacing: 0.5,
                      }}>
                        {STEM_ICONS[stem] || "♪"} {stem.charAt(0).toUpperCase() + stem.slice(1)}
                      </span>
                      <a href={`${API}${url}`} download style={{
                        background: `${STEM_COLORS[stem] || cyberpunk.neon.cyan.primary}22`,
                        color: STEM_COLORS[stem] || cyberpunk.neon.cyan.primary,
                        border: `1px solid ${(STEM_COLORS[stem] || cyberpunk.neon.cyan.primary)}44`,
                        padding: "6px 14px", 
                        borderRadius: 8, 
                        fontSize: 11,
                        textDecoration: "none", 
                        fontWeight: 700,
                        letterSpacing: 1,
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = `0 0 15px ${STEM_COLORS[stem] || cyberpunk.neon.cyan.glow}`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                      >
                        ⬇ DOWNLOAD
                      </a>
                    </div>
                    <audio controls src={`${API}${url}`} style={{ width: "100%", height: 32 }} />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Global Styles for animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
