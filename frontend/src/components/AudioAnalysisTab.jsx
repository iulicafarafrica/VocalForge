import React, { useState } from "react";

const API = "http://localhost:8000";

export default function AudioAnalysisTab({ addLog }) {
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setResult(null);
      setError(null);
      addLog?.(`[Audio Analysis] Selected: ${f.name}`);
    }
  };

  const runAnalysis = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${API}/detect_bpm_key`, { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).detail || "Analysis failed");
      const data = await res.json();
      setResult(data);
      addLog?.(`[Audio Analysis] Complete`);
    } catch (err) {
      setError(err.message);
      addLog?.(`[Audio Analysis] Error: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const S = {
    card: {
      background: "linear-gradient(135deg, rgba(13,13,34,0.95), rgba(8,8,24,0.98))",
      border: "1px solid rgba(30,30,58,0.5)",
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      backdropFilter: "blur(10px)",
      boxShadow: "0 4px 30px rgba(0,0,0,0.3)",
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
    grid4: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 12,
    },
    statBox: (color) => ({
      background: "rgba(10,10,26,0.8)",
      border: `1px solid ${color}44`,
      borderRadius: 10,
      padding: 14,
      textAlign: "center",
      boxShadow: `0 0 15px ${color}22`,
    }),
    statValue: (color) => ({
      color,
      fontSize: 28,
      fontWeight: 900,
      textShadow: `0 0 20px ${color}66`,
      marginBottom: 4,
    }),
    statLabel: {
      color: "#8888aa",
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    uploadBtn: {
      display: "inline-block",
      padding: "14px 28px",
      background: "linear-gradient(135deg, #06d6a0, #00e5ff)",
      color: "white",
      borderRadius: 10,
      cursor: "pointer",
      fontWeight: 900,
      fontSize: 13,
      letterSpacing: 1,
      textTransform: "uppercase",
      boxShadow: "0 0 20px rgba(6,214,160,0.5)",
      transition: "all 0.3s ease",
    },
    analyzeBtn: {
      padding: "14px 32px",
      background: "linear-gradient(135deg, #9b2de0, #c77dff)",
      color: "white",
      border: "none",
      borderRadius: 10,
      cursor: "pointer",
      fontWeight: 900,
      fontSize: 13,
      letterSpacing: 2,
      textTransform: "uppercase",
      boxShadow: "0 0 20px rgba(155,45,224,0.5)",
      transition: "all 0.3s ease",
    },
    progressFill: (pct, color) => ({
      height: 8,
      background: `linear-gradient(90deg, ${color}, ${color}88)`,
      width: `${Math.min(100, Math.max(0, pct))}%`,
      borderRadius: 4,
      boxShadow: `0 0 10px ${color}66`,
      transition: "width 0.5s ease",
    }),
    badge: (color) => ({
      background: `${color}22`,
      color,
      border: `1px solid ${color}44`,
      borderRadius: 6,
      padding: "4px 10px",
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: 1,
      display: "inline-block",
      marginTop: 6,
    }),
  };

  const getLoudnessPenalty = (lufs) => {
    return {
      spotify: { penalty: (lufs - (-14)).toFixed(1) },
      youtube: { penalty: (lufs - (-14)).toFixed(1) },
      apple: { penalty: (lufs - (-16)).toFixed(1) },
      tidal: { penalty: (lufs - (-14)).toFixed(1) },
    };
  };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8, filter: "drop-shadow(0 0 20px rgba(155,45,224,0.5))" }}>🎼</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#e0e0ff", letterSpacing: 3, textTransform: "uppercase", textShadow: "0 0 20px rgba(155,45,224,0.5)" }}>
          Audio Analysis
        </div>
        <div style={{ color: "#8888aa", fontSize: 13, letterSpacing: 1 }}>
          BPM • KEY • LOUDNESS • FREQUENCY • ENERGY • MOOD
        </div>
      </div>

      {/* Upload Section */}
      <div style={S.card}>
        <span style={S.label}>🎵 Upload Audio File</span>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <input type="file" accept="audio/*" onChange={handleFileChange} style={{ display: "none" }} id="audio-upload" />
          <label htmlFor="audio-upload" style={{
            ...S.uploadBtn,
            background: file ? "linear-gradient(135deg, #00e5ff, #06d6a0)" : "linear-gradient(135deg, #06d6a0, #00e5ff)",
          }}
          onMouseEnter={(e) => { if (!file) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 0 30px rgba(6,214,160,0.7)"; }}}
          onMouseLeave={(e) => { if (!file) { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(6,214,160,0.5)"; }}}
          >
            {file ? `✓ ${file.name}` : "📁 Choose File"}
          </label>
          <button onClick={runAnalysis} disabled={!file || analyzing} style={{
            ...S.analyzeBtn,
            opacity: !file || analyzing ? 0.5 : 1,
            cursor: !file || analyzing ? "not-allowed" : "pointer",
          }}
          onMouseEnter={(e) => { if (!analyzing && file) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 0 30px rgba(155,45,224,0.7)"; }}}
          onMouseLeave={(e) => { if (!analyzing && file) { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(155,45,224,0.5)"; }}}
          >
            {analyzing ? "⚙ Analyzing..." : "🚀 Analyze"}
          </button>
        </div>
        {error && (
          <div style={{ marginTop: 12, padding: 12, background: "rgba(239,68,68,0.15)", borderRadius: 8, border: "1px solid #ef444444" }}>
            <span style={{ color: "#ef4444", fontSize: 12, fontWeight: 700 }}>❌ {error}</span>
          </div>
        )}
      </div>

      {/* Analysis Results */}
      {result && (
        <>
          {/* BPM & Key */}
          <div style={S.card}>
            <span style={S.label}>🎵 Tempo & Key</span>
            <div style={S.grid4}>
              <div style={S.statBox("#ffd166")}>
                <div style={S.statValue("#ffd166")}>{result.bpm || "N/A"}</div>
                <div style={S.statLabel}>BPM</div>
              </div>
              <div style={S.statBox("#00e5ff")}>
                <div style={S.statValue("#00e5ff")}>{result.key || "N/A"}</div>
                <div style={S.statLabel}>Key</div>
              </div>
              <div style={S.statBox("#06d6a0")}>
                <div style={S.statValue("#06d6a0")}>{result.time_signature || "4/4"}</div>
                <div style={S.statLabel}>Time Sig</div>
              </div>
              <div style={S.statBox("#c77dff")}>
                <div style={S.statValue("#c77dff")}>{result.duration || "N/A"}</div>
                <div style={S.statLabel}>Duration</div>
              </div>
            </div>
          </div>

          {/* Loudness */}
          {result.loudness && (
            <div style={S.card}>
              <span style={S.label}>📊 Loudness & Dynamics</span>
              <div style={S.grid4}>
                <div style={S.statBox("#ffd166")}>
                  <div style={S.statValue("#ffd166")}>{result.loudness.lufs}</div>
                  <div style={S.statLabel}>LUFS</div>
                </div>
                <div style={S.statBox("#06d6a0")}>
                  <div style={S.statValue("#06d6a0")}>{result.loudness.rms_db}</div>
                  <div style={S.statLabel}>RMS</div>
                </div>
                <div style={S.statBox("#00e5ff")}>
                  <div style={S.statValue("#00e5ff")}>{result.loudness.true_peak_db}</div>
                  <div style={S.statLabel}>Peak</div>
                </div>
                <div style={S.statBox("#c77dff")}>
                  <div style={S.statValue("#c77dff")}>{result.loudness.dynamic_range}</div>
                  <div style={S.statLabel}>DR</div>
                </div>
              </div>
              <div style={{ marginTop: 12, padding: 10, background: "rgba(6,214,160,0.1)", borderRadius: 8, border: "1px solid #06d6a044" }}>
                <div style={{ color: "#06d6a0", fontSize: 11, fontWeight: 700 }}>
                  ✅ {result.loudness.category}
                </div>
              </div>
              {/* Loudness Penalty */}
              <div style={{ marginTop: 12, padding: 10, background: "rgba(255,159,28,0.1)", borderRadius: 8, border: "1px solid #ff9f1c44" }}>
                <div style={{ color: "#ff9f1c", fontSize: 10, fontWeight: 700, marginBottom: 8 }}>📉 LOUDNESS PENALTY</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, fontSize: 10 }}>
                  <div style={{ color: "#8888aa" }}>Spotify: <strong style={{ color: "#1DB954" }}>{getLoudnessPenalty(result.loudness.lufs).spotify.penalty} dB</strong></div>
                  <div style={{ color: "#8888aa" }}>YouTube: <strong style={{ color: "#FF0000" }}>{getLoudnessPenalty(result.loudness.lufs).youtube.penalty} dB</strong></div>
                  <div style={{ color: "#8888aa" }}>Apple: <strong style={{ color: "#FA243C" }}>{getLoudnessPenalty(result.loudness.lufs).apple.penalty} dB</strong></div>
                  <div style={{ color: "#8888aa" }}>Tidal: <strong style={{ color: "#000000" }}>{getLoudnessPenalty(result.loudness.lufs).tidal.penalty} dB</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* Frequency Spectrum */}
          {result.frequency_spectrum && (
            <div style={S.card}>
              <span style={S.label}>📉 Frequency Spectrum</span>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#ff9f1c", fontSize: 11, fontWeight: 800 }}>BASS (20-250 Hz)</span>
                  <span style={{ color: "#ff9f1c", fontSize: 16, fontWeight: 900 }}>{result.frequency_spectrum.bass_percent}%</span>
                </div>
                <div style={{ height: 16, background: "rgba(10,10,26,0.8)", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={S.progressFill(result.frequency_spectrum.bass_percent, "#ff9f1c")} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#00e5ff", fontSize: 11, fontWeight: 800 }}>MIDS (250-4000 Hz)</span>
                  <span style={{ color: "#00e5ff", fontSize: 16, fontWeight: 900 }}>{result.frequency_spectrum.mid_percent}%</span>
                </div>
                <div style={{ height: 16, background: "rgba(10,10,26,0.8)", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={S.progressFill(result.frequency_spectrum.mid_percent, "#00e5ff")} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#c77dff", fontSize: 11, fontWeight: 800 }}>HIGHS (4000-20000 Hz)</span>
                  <span style={{ color: "#c77dff", fontSize: 16, fontWeight: 900 }}>{result.frequency_spectrum.high_percent}%</span>
                </div>
                <div style={{ height: 16, background: "rgba(10,10,26,0.8)", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={S.progressFill(result.frequency_spectrum.high_percent, "#c77dff")} />
                </div>
              </div>
              <div style={{ padding: 14, background: "rgba(255,159,28,0.1)", borderRadius: 10, border: "1px solid #ff9f1c44", textAlign: "center" }}>
                <div style={{ color: "#ff9f1c", fontSize: 12, fontWeight: 800 }}>📊 {result.frequency_spectrum.description}</div>
              </div>
            </div>
          )}

          {/* Energy & Mood */}
          {result.energy_mood && (
            <div style={S.card}>
              <span style={S.label}>⚡ Energy & Mood</span>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#10b981", fontSize: 11, fontWeight: 800 }}>ENERGY</span>
                  <span style={{ color: "#10b981", fontSize: 16, fontWeight: 900 }}>{result.energy_mood.energy}%</span>
                </div>
                <div style={{ height: 16, background: "rgba(10,10,26,0.8)", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={S.progressFill(result.energy_mood.energy, "#10b981")} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#8b5cf6", fontSize: 11, fontWeight: 800 }}>DANCEABILITY</span>
                  <span style={{ color: "#8b5cf6", fontSize: 16, fontWeight: 900 }}>{result.energy_mood.danceability}%</span>
                </div>
                <div style={{ height: 16, background: "rgba(10,10,26,0.8)", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={S.progressFill(result.energy_mood.danceability, "#8b5cf6")} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {result.energy_mood.mood_labels?.map((label, i) => (
                  <span key={i} style={{ ...S.badge("#10b981"), padding: "6px 14px", fontSize: 11 }}>{label}</span>
                ))}
              </div>
              <div style={{ marginTop: 16, padding: 14, background: "rgba(0,229,255,0.1)", borderRadius: 10, border: "1px solid #00e5ff44", textAlign: "center" }}>
                <div style={{ color: "#00e5ff", fontSize: 14, fontWeight: 900 }}>🎵 {result.energy_mood.description}</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
