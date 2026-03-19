import React, { useState, useRef } from "react";

const API = "http://localhost:8000";

export default function AudioEnhancerTab({ addLog }) {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState("noise_removal");
  const [strength, setStrength] = useState("medium");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setResult(null);
      setError(null);
      addLog?.(`[Audio Enhancer] Selected: ${f.name}`);
      // Reset input so same file can be selected again
      e.target.value = '';
    }
  };

  const handleEnhance = async () => {
    if (!file) {
      setError("Please select an audio file");
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("mode", mode);
    fd.append("strength", strength);

    try {
      addLog?.(`[Audio Enhancer] Processing (${mode}, ${strength})...`);
      
      const res = await fetch(`${API}/audio/enhance`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Enhancement failed");
      }

      setResult(data);
      addLog?.(`[Audio Enhancer] Complete in ${data.processing_time_sec}s`);
    } catch (err) {
      setError(err.message);
      addLog?.(`[Audio Enhancer] Error: ${err.message}`);
    } finally {
      setProcessing(false);
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
    enhanceBtn: {
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
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8, filter: "drop-shadow(0 0 20px rgba(155,45,224,0.5))" }}>🎧</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#e0e0ff", letterSpacing: 3, textTransform: "uppercase", textShadow: "0 0 20px rgba(155,45,224,0.5)" }}>
          Audio Enhancer
        </div>
        <div style={{ color: "#8888aa", fontSize: 13, letterSpacing: 1 }}>
          Professional Audio Enhancement (AcoustiClean-inspired)
        </div>
      </div>

      {/* Upload Section */}
      <div style={S.card}>
        <span style={S.label}>🎵 Upload Audio File</span>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="file"
            accept="audio/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: "none" }}
            id="audio-upload"
          />
          <label
            htmlFor="audio-upload"
            onClick={() => fileInputRef.current?.click()}
            style={{
              ...S.uploadBtn,
              background: file ? "linear-gradient(135deg, #00e5ff, #06d6a0)" : "linear-gradient(135deg, #06d6a0, #00e5ff)",
            }}
            onMouseEnter={(e) => {
              if (!file) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 0 30px rgba(6,214,160,0.7)";
              }
            }}
            onMouseLeave={(e) => {
              if (!file) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(6,214,160,0.5)";
              }
            }}
          >
            {file ? `✓ ${file.name}` : "📁 Choose File"}
          </label>
        </div>
      </div>

      {/* Mode Selection */}
      <div style={S.card}>
        <span style={S.label}>🔧 Enhancement Mode</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {[
            { value: "noise_removal", label: "🔇 Noise Removal", desc: "Remove hiss, hum, static" },
            { value: "vocal_separation", label: "🎤 Vocal Separation", desc: "Extract vocals" },
            { value: "source_separation", label: "🎸 Source Separation", desc: "Separate stems (Demucs)" },
          ].map(({ value, label, desc }) => (
            <label
              key={value}
              onClick={() => setMode(value)}
              style={{
                padding: 14,
                background: mode === value ? "rgba(155,45,224,0.2)" : "rgba(10,10,26,0.6)",
                border: `1px solid ${mode === value ? "#9b2de0" : "rgba(42,42,74,0.5)"}`,
                borderRadius: 10,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = mode === value ? "#9b2de0" : "rgba(155,45,224,0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = mode === value ? "#9b2de0" : "rgba(42,42,74,0.5)";
              }}
            >
              <div style={{ color: mode === value ? "#c77dff" : "#8888aa", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                {label}
              </div>
              <div style={{ color: "#444466", fontSize: 10 }}>{desc}</div>
            </label>
          ))}
        </div>
      </div>

      {/* Strength Selection (only for noise_removal) */}
      {mode === "noise_removal" && (
        <div style={S.card}>
          <span style={S.label}>💪 Noise Reduction Strength</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            {[
              { value: "light", label: "🌱 Light", desc: "Gentle reduction" },
              { value: "medium", label: "⚖️ Medium", desc: "Balanced" },
              { value: "aggressive", label: "🔥 Aggressive", desc: "Strong reduction" },
            ].map(({ value, label, desc }) => (
              <label
                key={value}
                onClick={() => setStrength(value)}
                style={{
                  padding: 12,
                  background: strength === value ? "rgba(6,214,160,0.2)" : "rgba(10,10,26,0.6)",
                  border: `1px solid ${strength === value ? "#06d6a0" : "rgba(42,42,74,0.5)"}`,
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ color: strength === value ? "#06d6a0" : "#8888aa", fontSize: 11, fontWeight: 700, marginBottom: 2 }}>
                  {label}
                </div>
                <div style={{ color: "#444466", fontSize: 9 }}>{desc}</div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Enhance Button */}
      <div style={S.card}>
        <button
          onClick={handleEnhance}
          disabled={!file || processing}
          style={{
            ...S.enhanceBtn,
            opacity: !file || processing ? 0.5 : 1,
            cursor: !file || processing ? "not-allowed" : "pointer",
          }}
          onMouseEnter={(e) => {
            if (!processing && file) {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 0 30px rgba(155,45,224,0.7)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = !processing && file
              ? "0 0 20px rgba(155,45,224,0.5)"
              : "none";
          }}
        >
          {processing ? "⚙ Processing..." : "🚀 Enhance Audio"}
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
                background: "linear-gradient(90deg, #9b2de0, #c77dff, #9b2de0)",
                width: "100%",
                borderRadius: 4,
                backgroundSize: "200% 100%",
                animation: "shimmer 2s linear infinite",
                boxShadow: "0 0 20px rgba(155,45,224,0.5)",
              }} />
            </div>
            <div style={{ color: "#8888aa", fontSize: 11, marginTop: 8, textAlign: "center" }}>
              Processing audio... This may take 30-60 seconds
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 12, padding: 12, background: "rgba(239,68,68,0.15)", borderRadius: 8, border: "1px solid #ef444444" }}>
            <span style={{ color: "#ef4444", fontSize: 12, fontWeight: 700 }}>❌ {error}</span>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div style={S.card}>
          <span style={{ ...S.label, color: "#06d6a0" }}>
            ✅ Enhancement Complete!
          </span>
          <div style={{ marginTop: 12 }}>
            <div style={{ color: "#8888aa", fontSize: 11, marginBottom: 8 }}>
              Processing time: <strong style={{ color: "#06d6a0" }}>{result.processing_time_sec}s</strong>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {result.output_files.map((out, i) => (
                <div
                  key={i}
                  style={{
                    padding: 12,
                    background: "rgba(6,214,160,0.1)",
                    borderRadius: 8,
                    border: "1px solid #06d6a044",
                  }}
                >
                  <div style={{ color: "#06d6a0", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    🎵 {out.type.toUpperCase()}
                  </div>
                  <audio controls src={`${API}${out.url}`} style={{ width: "100%", marginBottom: 8 }} />
                  <a
                    href={`${API}${out.url}`}
                    download={out.filename}
                    style={{
                      display: "inline-block",
                      padding: "6px 12px",
                      background: "rgba(6,214,160,0.2)",
                      color: "#06d6a0",
                      borderRadius: 6,
                      textDecoration: "none",
                      fontSize: 11,
                      fontWeight: 700,
                      border: "1px solid #06d6a044",
                    }}
                  >
                    ⬇️ Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Global Styles */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
