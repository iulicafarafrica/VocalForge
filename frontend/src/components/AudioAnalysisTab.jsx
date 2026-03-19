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
      // Use original /detect_bpm_key endpoint (fast, reliable)
      const res = await fetch(`${API}/detect_bpm_key`, { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).detail || "Analysis failed");
      const data = await res.json();
      setResult({
        bpm: { value: data.bpm },
        key: { value: data.key },
        time_signature: { value: data.time_signature },
        duration: data.duration,
      });
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
    },
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8, filter: "drop-shadow(0 0 20px rgba(155,45,224,0.5))" }}>🎼</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#e0e0ff", letterSpacing: 3, textTransform: "uppercase", textShadow: "0 0 20px rgba(155,45,224,0.5)" }}>
          Audio Analysis
        </div>
        <div style={{ color: "#8888aa", fontSize: 13, letterSpacing: 1 }}>
          BPM • KEY • TIME SIGNATURE • DURATION
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
          }}>
            {file ? `✓ ${file.name}` : "📁 Choose File"}
          </label>
          <button onClick={runAnalysis} disabled={!file || analyzing} style={{
            ...S.analyzeBtn,
            opacity: !file || analyzing ? 0.5 : 1,
            cursor: !file || analyzing ? "not-allowed" : "pointer",
          }}>
            {analyzing ? "⚙ Analyzing..." : "🚀 Analyze"}
          </button>
        </div>
        {error && (
          <div style={{ marginTop: 12, padding: 12, background: "rgba(239,68,68,0.15)", borderRadius: 8, border: "1px solid #ef444444" }}>
            <span style={{ color: "#ef4444", fontSize: 12, fontWeight: 700 }}>❌ {error}</span>
          </div>
        )}
      </div>

      {/* Analysis Result */}
      {result && (
        <div style={S.card}>
          <span style={S.label}>🎵 BPM & Key Detection</span>
          <div style={S.grid4}>
            <div style={S.statBox("#ffd166")}>
              <div style={S.statValue("#ffd166")}>{result.bpm?.value || "N/A"}</div>
              <div style={S.statLabel}>BPM</div>
            </div>
            <div style={S.statBox("#00e5ff")}>
              <div style={S.statValue("#00e5ff")}>{result.key?.value || "N/A"}</div>
              <div style={S.statLabel}>Key</div>
            </div>
            <div style={S.statBox("#06d6a0")}>
              <div style={S.statValue("#06d6a0")}>{result.time_signature?.value || "4/4"}</div>
              <div style={S.statLabel}>Time Sig</div>
            </div>
            <div style={S.statBox("#c77dff")}>
              <div style={S.statValue("#c77dff")}>{result.duration || "N/A"}</div>
              <div style={S.statLabel}>Duration</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
