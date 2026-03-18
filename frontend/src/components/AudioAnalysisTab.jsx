import React, { useState } from "react";

const API = "http://localhost:8000";

export default function AudioAnalysisTab({ addLog }) {
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("full");

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setResult(null);
      setError(null);
      addLog?.(`[Audio Analysis] Selected: ${f.name}`);
    }
  };

  const runAnalysis = async (endpoint) => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${API}/audio/${endpoint}`, { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).detail || "Analysis failed");
      const data = await res.json();
      
      // Merge results into existing result object
      setResult(prev => {
        const updated = { ...prev, ...data };
        // Merge specific fields
        if (data.loudness) updated.loudness = data.loudness;
        if (data.vocal_range) updated.vocal_range = data.vocal_range;
        if (data.energy_mood) updated.energy_mood = data.energy_mood;
        if (data.frequency_spectrum) updated.frequency_spectrum = data.frequency_spectrum;
        if (data.bpm) updated.bpm = data.bpm;
        if (data.key) updated.key = data.key;
        if (data.chords) updated.chords = data.chords;
        if (data.time_signature) updated.time_signature = data.time_signature;
        return updated;
      });
      
      addLog?.(`[Audio Analysis] ${endpoint} complete`);
    } catch (err) {
      setError(err.message);
      addLog?.(`[Audio Analysis] Error: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFullAnalysis = () => runAnalysis("analyze");

  const handleIndividualAnalysis = async (tab) => {
    if (!file) return;
    
    // Map tabs to endpoints
    const endpointMap = {
      loudness: "loudness",
      vocal: "vocal-range",
      mood: "energy-mood",
      frequency: "frequency"
    };
    
    const endpoint = endpointMap[tab];
    if (endpoint) {
      // First run full analysis if no result exists
      if (!result || Object.keys(result).length === 0) {
        await runAnalysis("analyze");
      } else {
        // Run individual analysis
        await runAnalysis(endpoint);
      }
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
    progressBar: (pct, color) => ({
      height: 8,
      background: "rgba(10,10,26,0.8)",
      borderRadius: 4,
      overflow: "hidden",
      marginTop: 6,
      border: "1px solid rgba(255,255,255,0.1)",
    }),
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
    },
    tabBtn: (active, color) => ({
      flex: 1,
      padding: "10px 16px",
      background: active ? `${color}22` : "rgba(10,10,26,0.6)",
      border: `1px solid ${active ? color : "rgba(42,42,74,0.5)"}`,
      color: active ? color : "#8888aa",
      borderRadius: 8,
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 10,
      letterSpacing: 1,
      textTransform: "uppercase",
      transition: "all 0.2s ease",
    }),
  };

  // Calculate loudness penalty for different platforms
  const getLoudnessPenalty = (lufs) => {
    const platforms = {
      spotify: { target: -14, penalty: (lufs - (-14)).toFixed(1) },
      youtube: { target: -14, penalty: (lufs - (-14)).toFixed(1) },
      apple: { target: -16, penalty: (lufs - (-16)).toFixed(1) },
      tidal: { target: -14, penalty: (lufs - (-14)).toFixed(1) },
    };
    return platforms;
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
          BPM • KEY • LOUDNESS • VOCAL RANGE • ENERGY • FREQUENCY • CHORDS
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
          <button onClick={handleFullAnalysis} disabled={!file || analyzing} style={{
            ...S.analyzeBtn,
            opacity: !file || analyzing ? 0.5 : 1,
            cursor: !file || analyzing ? "not-allowed" : "pointer",
          }}>
            {analyzing ? "⚙ Analyzing..." : "🚀 Run Full Analysis"}
          </button>
        </div>
        {error && (
          <div style={{ marginTop: 12, padding: 12, background: "rgba(239,68,68,0.15)", borderRadius: 8, border: "1px solid #ef444444" }}>
            <span style={{ color: "#ef4444", fontSize: 12, fontWeight: 700 }}>❌ {error}</span>
          </div>
        )}
      </div>

      {/* Analysis Tabs */}
      {result && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <button style={S.tabBtn(activeTab === "full", "#00e5ff")} onClick={() => setActiveTab("full")}>📊 Full Analysis</button>
            <button style={S.tabBtn(activeTab === "basic", "#ffd166")} onClick={() => setActiveTab("basic")}>🎵 BPM & Key</button>
            <button style={S.tabBtn(activeTab === "loudness", "#06d6a0")} onClick={(e) => { setActiveTab("loudness"); handleIndividualAnalysis("loudness"); }}>📈 Loudness</button>
            <button style={S.tabBtn(activeTab === "vocal", "#c77dff")} onClick={(e) => { setActiveTab("vocal"); handleIndividualAnalysis("vocal"); }}>🎤 Vocal</button>
            <button style={S.tabBtn(activeTab === "mood", "#10b981")} onClick={(e) => { setActiveTab("mood"); handleIndividualAnalysis("mood"); }}>⚡ Energy</button>
            <button style={S.tabBtn(activeTab === "frequency", "#ff9f1c")} onClick={(e) => { setActiveTab("frequency"); handleIndividualAnalysis("frequency"); }}>📉 Frequency</button>
          </div>

          {/* FULL ANALYSIS */}
          {activeTab === "full" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: 16 }}>
              
              {/* BPM & Key - BIG CARD */}
              <div style={{ ...S.card, gridColumn: "1 / -1", border: `2px solid #ffd16644`, boxShadow: "0 0 30px rgba(255,209,102,0.2)" }}>
                <span style={{ ...S.label, color: "#ffd166" }}>🎵 Tempo & Key</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                  <div style={{ textAlign: "center", padding: 20, background: "rgba(255,209,102,0.1)", borderRadius: 12, border: "1px solid #ffd16644" }}>
                    <div style={{ fontSize: 48, fontWeight: 900, color: "#ffd166", textShadow: "0 0 30px rgba(255,209,102,0.5)" }}>
                      {result.bpm?.value || "N/A"}
                    </div>
                    <div style={{ color: "#8888aa", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginTop: 8 }}>BPM</div>
                  </div>
                  <div style={{ textAlign: "center", padding: 20, background: "rgba(0,229,255,0.1)", borderRadius: 12, border: "1px solid #00e5ff44" }}>
                    <div style={{ fontSize: 48, fontWeight: 900, color: "#00e5ff", textShadow: "0 0 30px rgba(0,229,255,0.5)" }}>
                      {result.key?.value || "N/A"}
                    </div>
                    <div style={{ color: "#8888aa", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginTop: 8 }}>KEY</div>
                  </div>
                  <div style={{ textAlign: "center", padding: 20, background: "rgba(6,214,160,0.1)", borderRadius: 12, border: "1px solid #06d6a044" }}>
                    <div style={{ fontSize: 48, fontWeight: 900, color: "#06d6a0", textShadow: "0 0 30px rgba(6,214,160,0.5)" }}>
                      {result.time_signature?.value || "4/4"}
                    </div>
                    <div style={{ color: "#8888aa", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginTop: 8 }}>TIME</div>
                  </div>
                </div>
              </div>

              {/* Loudness */}
              <div style={S.card}>
                <span style={S.label}>📊 Loudness & Dynamics</span>
                <div style={S.grid4}>
                  <div style={S.statBox("#ffd166")}>
                    <div style={S.statValue("#ffd166")}>{result.loudness?.lufs || "N/A"}</div>
                    <div style={S.statLabel}>LUFS</div>
                  </div>
                  <div style={S.statBox("#06d6a0")}>
                    <div style={S.statValue("#06d6a0")}>{result.loudness?.rms_db || "N/A"}</div>
                    <div style={S.statLabel}>RMS</div>
                  </div>
                  <div style={S.statBox("#00e5ff")}>
                    <div style={S.statValue("#00e5ff")}>{result.loudness?.true_peak_db || "N/A"}</div>
                    <div style={S.statLabel}>Peak</div>
                  </div>
                  <div style={S.statBox("#c77dff")}>
                    <div style={S.statValue("#c77dff")}>{result.loudness?.dynamic_range || "N/A"}</div>
                    <div style={S.statLabel}>DR</div>
                  </div>
                </div>
                <div style={{ marginTop: 12, padding: 10, background: "rgba(6,214,160,0.1)", borderRadius: 8, border: "1px solid #06d6a044" }}>
                  <div style={{ color: "#06d6a0", fontSize: 11, fontWeight: 700 }}>
                    ✅ {result.loudness?.category || "N/A"}
                  </div>
                </div>
                {/* Loudness Penalty */}
                {result.loudness?.lufs && (
                  <div style={{ marginTop: 12, padding: 10, background: "rgba(255,159,28,0.1)", borderRadius: 8, border: "1px solid #ff9f1c44" }}>
                    <div style={{ color: "#ff9f1c", fontSize: 10, fontWeight: 700, marginBottom: 8 }}>📉 LOUDNESS PENALTY</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, fontSize: 10 }}>
                      <div style={{ color: "#8888aa" }}>Spotify: <strong style={{ color: "#1DB954" }}>{getLoudnessPenalty(result.loudness.lufs).spotify.penalty} dB</strong></div>
                      <div style={{ color: "#8888aa" }}>YouTube: <strong style={{ color: "#FF0000" }}>{getLoudnessPenalty(result.loudness.lufs).youtube.penalty} dB</strong></div>
                      <div style={{ color: "#8888aa" }}>Apple: <strong style={{ color: "#FA243C" }}>{getLoudnessPenalty(result.loudness.lufs).apple.penalty} dB</strong></div>
                      <div style={{ color: "#8888aa" }}>Tidal: <strong style={{ color: "#000000" }}>{getLoudnessPenalty(result.loudness.lufs).tidal.penalty} dB</strong></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Vocal Range */}
              <div style={S.card}>
                <span style={S.label}>🎤 Vocal Analysis</span>
                {result.vocal_range?.detected ? (
                  <>
                    <div style={{ fontSize: 28, fontWeight: 900, color: "#c77dff", marginBottom: 12, textAlign: "center", textShadow: "0 0 20px rgba(199,125,255,0.5)" }}>
                      {result.vocal_range.voice_type}
                    </div>
                    <div style={S.grid4}>
                      <div style={S.statBox("#c77dff")}>
                        <div style={{ color: "#c77dff", fontSize: 16, fontWeight: 700 }}>{result.vocal_range.min_note}</div>
                        <div style={S.statLabel}>Min</div>
                      </div>
                      <div style={S.statBox("#c77dff")}>
                        <div style={{ color: "#c77dff", fontSize: 16, fontWeight: 700 }}>{result.vocal_range.max_note}</div>
                        <div style={S.statLabel}>Max</div>
                      </div>
                      <div style={S.statBox("#c77dff")}>
                        <div style={{ color: "#c77dff", fontSize: 16, fontWeight: 700 }}>{result.vocal_range.range_octaves}</div>
                        <div style={S.statLabel}>Octaves</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 12, padding: 10, background: "rgba(199,125,255,0.1)", borderRadius: 8, border: "1px solid #c77dff44" }}>
                      <div style={{ color: "#8888aa", fontSize: 9, marginBottom: 6, fontWeight: 700 }}>💡 RVC MODELS:</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {result.vocal_range.model_recommendations?.map((rec, i) => (
                          <span key={i} style={{ ...S.badge("#c77dff"), fontSize: 9 }}>{rec}</span>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ color: "#8888aa", fontSize: 12, textAlign: "center", padding: 30 }}>
                    {result.vocal_range?.reason || "No vocals detected (instrumental)"}
                  </div>
                )}
              </div>

              {/* Energy & Mood */}
              <div style={S.card}>
                <span style={S.label}>⚡ Energy & Mood</span>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#8888aa", fontSize: 10, fontWeight: 700 }}>ENERGY</span>
                    <span style={{ color: "#10b981", fontSize: 11, fontWeight: 700 }}>{result.energy_mood?.energy || 0}%</span>
                  </div>
                  <div style={S.progressBar(result.energy_mood?.energy, "#10b981")}>
                    <div style={S.progressFill(result.energy_mood?.energy, "#10b981")} />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#8888aa", fontSize: 10, fontWeight: 700 }}>DANCEABILITY</span>
                    <span style={{ color: "#ffd166", fontSize: 11, fontWeight: 700 }}>{result.energy_mood?.danceability || 0}%</span>
                  </div>
                  <div style={S.progressBar(result.energy_mood?.danceability, "#ffd166")}>
                    <div style={S.progressFill(result.energy_mood?.danceability, "#ffd166")} />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#8888aa", fontSize: 10, fontWeight: 700 }}>POSITIVITY</span>
                    <span style={{ color: "#c77dff", fontSize: 11, fontWeight: 700 }}>{((result.energy_mood?.valence || 0) * 100).toFixed(0)}%</span>
                  </div>
                  <div style={S.progressBar((result.energy_mood?.valence || 0) * 100, "#c77dff")}>
                    <div style={S.progressFill((result.energy_mood?.valence || 0) * 100, "#c77dff")} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {result.energy_mood?.mood_labels?.map((label, i) => (
                    <span key={i} style={S.badge("#10b981")}>{label}</span>
                  ))}
                </div>
              </div>

              {/* Frequency Spectrum */}
              <div style={S.card}>
                <span style={S.label}>📉 Frequency Spectrum</span>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#8888aa", fontSize: 10, fontWeight: 700 }}>BASS (20-250Hz)</span>
                    <span style={{ color: "#ff9f1c", fontSize: 11, fontWeight: 700 }}>{result.frequency_spectrum?.bass_percent || 0}%</span>
                  </div>
                  <div style={S.progressBar(result.frequency_spectrum?.bass_percent, "#ff9f1c")}>
                    <div style={S.progressFill(result.frequency_spectrum?.bass_percent, "#ff9f1c")} />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#8888aa", fontSize: 10, fontWeight: 700 }}>MIDS (250-4000Hz)</span>
                    <span style={{ color: "#00e5ff", fontSize: 11, fontWeight: 700 }}>{result.frequency_spectrum?.mid_percent || 0}%</span>
                  </div>
                  <div style={S.progressBar(result.frequency_spectrum?.mid_percent, "#00e5ff")}>
                    <div style={S.progressFill(result.frequency_spectrum?.mid_percent, "#00e5ff")} />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#8888aa", fontSize: 10, fontWeight: 700 }}>HIGHS (4-20kHz)</span>
                    <span style={{ color: "#c77dff", fontSize: 11, fontWeight: 700 }}>{result.frequency_spectrum?.high_percent || 0}%</span>
                  </div>
                  <div style={S.progressBar(result.frequency_spectrum?.high_percent, "#c77dff")}>
                    <div style={S.progressFill(result.frequency_spectrum?.high_percent, "#c77dff")} />
                  </div>
                </div>
                <div style={S.badge("#ff9f1c")}>{result.frequency_spectrum?.description || "N/A"}</div>
              </div>

            </div>
          )}

          {/* BASIC TAB (BPM & Key) */}
          {activeTab === "basic" && (
            <div style={{ ...S.card, border: `2px solid #ffd16644` }}>
              <span style={{ ...S.label, color: "#ffd166" }}>🎵 Tempo & Key Detection</span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>
                <div style={{ textAlign: "center", padding: 30, background: "rgba(255,209,102,0.1)", borderRadius: 16, border: "2px solid #ffd16644" }}>
                  <div style={{ fontSize: 64, fontWeight: 900, color: "#ffd166", textShadow: "0 0 40px rgba(255,209,102,0.6)" }}>
                    {result.bpm?.value || "N/A"}
                  </div>
                  <div style={{ color: "#8888aa", fontSize: 12, fontWeight: 800, letterSpacing: 3, marginTop: 12 }}>BPM</div>
                  <div style={{ color: "#8888aa", fontSize: 10, marginTop: 8 }}>
                    {result.bpm?.confidence > 0.8 ? "✅ High Confidence" : "⚠️ Medium Confidence"}
                  </div>
                </div>
                <div style={{ textAlign: "center", padding: 30, background: "rgba(0,229,255,0.1)", borderRadius: 16, border: "2px solid #00e5ff44" }}>
                  <div style={{ fontSize: 64, fontWeight: 900, color: "#00e5ff", textShadow: "0 0 40px rgba(0,229,255,0.6)" }}>
                    {result.key?.value || "N/A"}
                  </div>
                  <div style={{ color: "#8888aa", fontSize: 12, fontWeight: 800, letterSpacing: 3, marginTop: 12 }}>KEY</div>
                  <div style={{ color: "#8888aa", fontSize: 10, marginTop: 8 }}>
                    {result.key?.mode === "major" ? "☀️ Major (Happy)" : "🌙 Minor (Sad)"}
                  </div>
                </div>
                <div style={{ textAlign: "center", padding: 30, background: "rgba(6,214,160,0.1)", borderRadius: 16, border: "2px solid #06d6a044" }}>
                  <div style={{ fontSize: 64, fontWeight: 900, color: "#06d6a0", textShadow: "0 0 40px rgba(6,214,160,0.6)" }}>
                    {result.time_signature?.value || "4/4"}
                  </div>
                  <div style={{ color: "#8888aa", fontSize: 12, fontWeight: 800, letterSpacing: 3, marginTop: 12 }}>TIME SIGNATURE</div>
                </div>
              </div>
            </div>
          )}

          {/* LOUDNESS TAB */}
          {activeTab === "loudness" && result.loudness && (
            <div style={S.card}>
              <span style={S.label}>📊 Loudness Analysis</span>
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
                  <div style={S.statLabel}>True Peak</div>
                </div>
                <div style={S.statBox("#c77dff")}>
                  <div style={S.statValue("#c77dff")}>{result.loudness.dynamic_range}</div>
                  <div style={S.statLabel}>Dynamic Range</div>
                </div>
              </div>
              <div style={{ marginTop: 16, padding: 14, background: "rgba(6,214,160,0.1)", borderRadius: 10, border: "1px solid #06d6a044" }}>
                <div style={{ color: "#06d6a0", fontSize: 12, fontWeight: 800 }}>
                  ✅ {result.loudness.category}
                </div>
              </div>
              {/* Loudness Penalty */}
              <div style={{ marginTop: 16, padding: 14, background: "rgba(255,159,28,0.1)", borderRadius: 10, border: "1px solid #ff9f1c44" }}>
                <div style={{ color: "#ff9f1c", fontSize: 11, fontWeight: 800, marginBottom: 12 }}>📉 PLATFORM LOUDNESS PENALTY</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                  {Object.entries(getLoudnessPenalty(result.loudness.lufs)).map(([platform, data]) => (
                    <div key={platform} style={{ 
                      padding: 10, 
                      background: "rgba(10,10,26,0.6)", 
                      borderRadius: 8,
                      border: `1px solid ${Math.abs(data.penalty) > 3 ? '#ef444444' : '#10b98144'}`,
                    }}>
                      <div style={{ color: "#8888aa", fontSize: 10, textTransform: "uppercase", fontWeight: 700 }}>{platform}</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: Math.abs(data.penalty) > 3 ? '#ef4444' : '#10b981', marginTop: 4 }}>
                        {data.penalty > 0 ? '-' : '+'}{data.penalty} dB
                      </div>
                      <div style={{ color: "#444466", fontSize: 9, marginTop: 4 }}>Target: {data.target} LUFS</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VOCAL TAB */}
          {activeTab === "vocal" && result.vocal_range && (
            <div style={S.card}>
              <span style={S.label}>🎤 Vocal Range Analysis</span>
              {result.vocal_range.detected ? (
                <>
                  <div style={{ fontSize: 48, fontWeight: 900, color: "#c77dff", marginBottom: 20, textAlign: "center", textShadow: "0 0 30px rgba(199,125,255,0.5)" }}>
                    {result.vocal_range.voice_type}
                  </div>
                  <div style={S.grid4}>
                    <div style={S.statBox("#c77dff")}>
                      <div style={{ color: "#c77dff", fontSize: 20, fontWeight: 700 }}>{result.vocal_range.min_note}</div>
                      <div style={S.statLabel}>Lowest Note</div>
                    </div>
                    <div style={S.statBox("#c77dff")}>
                      <div style={{ color: "#c77dff", fontSize: 20, fontWeight: 700 }}>{result.vocal_range.max_note}</div>
                      <div style={S.statLabel}>Highest Note</div>
                    </div>
                    <div style={S.statBox("#c77dff")}>
                      <div style={{ color: "#c77dff", fontSize: 20, fontWeight: 700 }}>{result.vocal_range.range_octaves}</div>
                      <div style={S.statLabel}>Octaves</div>
                    </div>
                    <div style={S.statBox("#c77dff")}>
                      <div style={{ color: "#c77dff", fontSize: 20, fontWeight: 700 }}>{result.vocal_range.avg_freq_hz} Hz</div>
                      <div style={S.statLabel}>Avg Frequency</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 16, padding: 14, background: "rgba(199,125,255,0.1)", borderRadius: 10, border: "1px solid #c77dff44" }}>
                    <div style={{ color: "#8888aa", fontSize: 10, marginBottom: 10, fontWeight: 800 }}>💡 RECOMMENDED RVC MODELS:</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {result.vocal_range.model_recommendations?.map((rec, i) => (
                        <span key={i} style={{ ...S.badge("#c77dff"), fontSize: 10, padding: "6px 12px" }}>{rec}</span>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ color: "#8888aa", fontSize: 14, textAlign: "center", padding: 50 }}>
                  🚫 {result.vocal_range.reason || "No vocals detected - this is an instrumental track"}
                </div>
              )}
            </div>
          )}

          {/* MOOD TAB */}
          {activeTab === "mood" && result.energy_mood && (
            <div style={S.card}>
              <span style={S.label}>⚡ Energy & Mood Analysis</span>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#8888aa", fontSize: 11, fontWeight: 800 }}>ENERGY</span>
                  <span style={{ color: "#10b981", fontSize: 16, fontWeight: 900 }}>{result.energy_mood.energy}%</span>
                </div>
                <div style={{ height: 12, background: "rgba(10,10,26,0.8)", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={S.progressFill(result.energy_mood.energy, "#10b981")} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#8888aa", fontSize: 11, fontWeight: 800 }}>DANCEABILITY</span>
                  <span style={{ color: "#ffd166", fontSize: 16, fontWeight: 900 }}>{result.energy_mood.danceability}%</span>
                </div>
                <div style={{ height: 12, background: "rgba(10,10,26,0.8)", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={S.progressFill(result.energy_mood.danceability, "#ffd166")} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#8888aa", fontSize: 11, fontWeight: 800 }}>POSITIVITY (Valence)</span>
                  <span style={{ color: "#c77dff", fontSize: 16, fontWeight: 900 }}>{(result.energy_mood.valence * 100).toFixed(0)}%</span>
                </div>
                <div style={{ height: 12, background: "rgba(10,10,26,0.8)", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={S.progressFill(result.energy_mood.valence * 100, "#c77dff")} />
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

          {/* FREQUENCY TAB */}
          {activeTab === "frequency" && result.frequency_spectrum && (
            <div style={S.card}>
              <span style={S.label}>📉 Frequency Spectrum Analysis</span>
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
        </>
      )}
    </div>
  );
}
