import React, { useState } from "react";

const API = "http://localhost:8000";

export default function AudioAnalysisTab({ addLog }) {
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("full"); // full, loudness, vocal, mood, frequency

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
      setResult(data);
      addLog?.(`[Audio Analysis] ${endpoint} complete`);
    } catch (err) {
      setError(err.message);
      addLog?.(`[Audio Analysis] Error: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFullAnalysis = () => runAnalysis("full-analysis");

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
      fontSize: 24,
      fontWeight: 900,
      textShadow: `0 0 15px ${color}66`,
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

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8, filter: "drop-shadow(0 0 20px rgba(155,45,224,0.5))" }}>🎼</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#e0e0ff", letterSpacing: 3, textTransform: "uppercase", textShadow: "0 0 20px rgba(155,45,224,0.5)" }}>
          Audio Analysis
        </div>
        <div style={{ color: "#8888aa", fontSize: 13, letterSpacing: 1 }}>
          LOUDNESS · VOCAL RANGE · ENERGY · FREQUENCY SPECTRUM
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
            <button style={S.tabBtn(activeTab === "loudness", "#ffd166")} onClick={() => setActiveTab("loudness")}>📈 Loudness</button>
            <button style={S.tabBtn(activeTab === "vocal", "#c77dff")} onClick={() => setActiveTab("vocal")}>🎤 Vocal Range</button>
            <button style={S.tabBtn(activeTab === "mood", "#06d6a0")} onClick={() => setActiveTab("mood")}>⚡ Energy & Mood</button>
            <button style={S.tabBtn(activeTab === "frequency", "#ff9f1c")} onClick={() => setActiveTab("frequency")}>📉 Frequency</button>
          </div>

          {/* FULL ANALYSIS */}
          {activeTab === "full" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 16 }}>
              
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
                    <div style={S.statLabel}>RMS dB</div>
                  </div>
                  <div style={S.statBox("#00e5ff")}>
                    <div style={S.statValue("#00e5ff")}>{result.loudness?.true_peak_db || "N/A"}</div>
                    <div style={S.statLabel}>True Peak</div>
                  </div>
                  <div style={S.statBox("#c77dff")}>
                    <div style={S.statValue("#c77dff")}>{result.loudness?.dynamic_range || "N/A"}</div>
                    <div style={S.statLabel}>DR</div>
                  </div>
                </div>
                <div style={S.badge(result.loudness?.category?.includes("Ready") ? "#06d6a0" : "#ffd166")}>
                  {result.loudness?.category || "N/A"}
                </div>
              </div>

              {/* Vocal Range */}
              <div style={S.card}>
                <span style={S.label}>🎤 Vocal Range</span>
                {result.vocal_range?.detected ? (
                  <>
                    <div style={{ fontSize: 32, fontWeight: 900, color: "#c77dff", marginBottom: 8, textShadow: "0 0 20px rgba(199,125,255,0.5)" }}>
                      {result.vocal_range.voice_type}
                    </div>
                    <div style={S.grid4}>
                      <div style={S.statBox("#c77dff")}>
                        <div style={S.statValue("#c77dff")}>{result.vocal_range.min_note}</div>
                        <div style={S.statLabel}>Min Note</div>
                      </div>
                      <div style={S.statBox("#c77dff")}>
                        <div style={S.statValue("#c77dff")}>{result.vocal_range.max_note}</div>
                        <div style={S.statLabel}>Max Note</div>
                      </div>
                      <div style={S.statBox("#c77dff")}>
                        <div style={S.statValue("#c77dff")}>{result.vocal_range.range_octaves}</div>
                        <div style={S.statLabel}>Octaves</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 12, padding: 10, background: "rgba(199,125,255,0.1)", borderRadius: 8, border: "1px solid #c77dff44" }}>
                      <div style={{ color: "#8888aa", fontSize: 10, marginBottom: 6, fontWeight: 700 }}>💡 RECOMMENDED RVC MODELS:</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {result.vocal_range.model_recommendations?.map((rec, i) => (
                          <span key={i} style={S.badge("#c77dff")}>{rec}</span>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ color: "#8888aa", fontSize: 12, textAlign: "center", padding: 20 }}>
                    {result.vocal_range?.reason || "No vocals detected"}
                  </div>
                )}
              </div>

              {/* Energy & Mood */}
              <div style={S.card}>
                <span style={S.label}>⚡ Energy & Mood</span>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#8888aa", fontSize: 10, fontWeight: 700 }}>ENERGY</span>
                    <span style={{ color: "#06d6a0", fontSize: 11, fontWeight: 700 }}>{result.energy_mood?.energy || 0}%</span>
                  </div>
                  <div style={S.progressBar(result.energy_mood?.energy, "#06d6a0")}>
                    <div style={S.progressFill(result.energy_mood?.energy, "#06d6a0")} />
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
                    <span style={{ color: "#8888aa", fontSize: 10, fontWeight: 700 }}>VALENCE (Mood)</span>
                    <span style={{ color: "#c77dff", fontSize: 11, fontWeight: 700 }}>{result.energy_mood?.valence || 0}</span>
                  </div>
                  <div style={S.progressBar(result.energy_mood?.valence * 100, "#c77dff")}>
                    <div style={S.progressFill(result.energy_mood?.valence * 100, "#c77dff")} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {result.energy_mood?.mood_labels?.map((label, i) => (
                    <span key={i} style={S.badge("#06d6a0")}>{label}</span>
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
                    <span style={{ color: "#8888aa", fontSize: 10, fontWeight: 700 }}>HIGHS (4000-20000Hz)</span>
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
                  <div style={S.statLabel}>Peak</div>
                </div>
                <div style={S.statBox("#c77dff")}>
                  <div style={S.statValue("#c77dff")}>{result.loudness.dynamic_range}</div>
                  <div style={S.statLabel}>DR</div>
                </div>
              </div>
              <div style={{ marginTop: 16, padding: 12, background: "rgba(6,214,160,0.1)", borderRadius: 8, border: "1px solid #06d6a044" }}>
                <div style={{ color: "#06d6a0", fontSize: 12, fontWeight: 700 }}>
                  ✅ {result.loudness.category}
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
                  <div style={{ fontSize: 48, fontWeight: 900, color: "#c77dff", marginBottom: 16, textAlign: "center", textShadow: "0 0 30px rgba(199,125,255,0.5)" }}>
                    {result.vocal_range.voice_type}
                  </div>
                  <div style={S.grid4}>
                    <div style={S.statBox("#c77dff")}>
                      <div style={{ color: "#c77dff", fontSize: 18, fontWeight: 700 }}>{result.vocal_range.min_note}</div>
                      <div style={S.statLabel}>Lowest Note</div>
                    </div>
                    <div style={S.statBox("#c77dff")}>
                      <div style={{ color: "#c77dff", fontSize: 18, fontWeight: 700 }}>{result.vocal_range.max_note}</div>
                      <div style={S.statLabel}>Highest Note</div>
                    </div>
                    <div style={S.statBox("#c77dff")}>
                      <div style={{ color: "#c77dff", fontSize: 18, fontWeight: 700 }}>{result.vocal_range.range_octaves}</div>
                      <div style={S.statLabel}>Octaves</div>
                    </div>
                    <div style={S.statBox("#c77dff")}>
                      <div style={{ color: "#c77dff", fontSize: 18, fontWeight: 700 }}>{result.vocal_range.avg_freq_hz} Hz</div>
                      <div style={S.statLabel}>Avg Freq</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 16, padding: 12, background: "rgba(199,125,255,0.1)", borderRadius: 8, border: "1px solid #c77dff44" }}>
                    <div style={{ color: "#8888aa", fontSize: 10, marginBottom: 8, fontWeight: 700 }}>💡 RECOMMENDED RVC MODELS:</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {result.vocal_range.model_recommendations?.map((rec, i) => (
                        <span key={i} style={{ ...S.badge("#c77dff"), fontSize: 11 }}>{rec}</span>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ color: "#8888aa", fontSize: 14, textAlign: "center", padding: 40 }}>
                  🚫 {result.vocal_range.reason || "No vocals detected"}
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
                  <span style={{ color: "#8888aa", fontSize: 11, fontWeight: 700 }}>ENERGY</span>
                  <span style={{ color: "#06d6a0", fontSize: 14, fontWeight: 900 }}>{result.energy_mood.energy}%</span>
                </div>
                <div style={{ height: 12, background: "rgba(10,10,26,0.8)", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={S.progressFill(result.energy_mood.energy, "#06d6a0")} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#8888aa", fontSize: 11, fontWeight: 700 }}>DANCEABILITY</span>
                  <span style={{ color: "#ffd166", fontSize: 14, fontWeight: 900 }}>{result.energy_mood.danceability}%</span>
                </div>
                <div style={{ height: 12, background: "rgba(10,10,26,0.8)", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={S.progressFill(result.energy_mood.danceability, "#ffd166")} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#8888aa", fontSize: 11, fontWeight: 700 }}>VALENCE (Positivity)</span>
                  <span style={{ color: "#c77dff", fontSize: 14, fontWeight: 900 }}>{(result.energy_mood.valence * 100).toFixed(0)}%</span>
                </div>
                <div style={{ height: 12, background: "rgba(10,10,26,0.8)", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={S.progressFill(result.energy_mood.valence * 100, "#c77dff")} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {result.energy_mood.mood_labels?.map((label, i) => (
                  <span key={i} style={{ ...S.badge("#06d6a0"), padding: "6px 14px", fontSize: 11 }}>{label}</span>
                ))}
              </div>
              <div style={{ marginTop: 16, padding: 12, background: "rgba(0,229,255,0.1)", borderRadius: 8, border: "1px solid #00e5ff44", textAlign: "center" }}>
                <div style={{ color: "#00e5ff", fontSize: 13, fontWeight: 900 }}>🎵 {result.energy_mood.description}</div>
              </div>
            </div>
          )}

          {/* FREQUENCY TAB */}
          {activeTab === "frequency" && result.frequency_spectrum && (
            <div style={S.card}>
              <span style={S.label}>📉 Frequency Spectrum Analysis</span>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#ff9f1c", fontSize: 11, fontWeight: 700 }}>BASS (20-250 Hz)</span>
                  <span style={{ color: "#ff9f1c", fontSize: 14, fontWeight: 900 }}>{result.frequency_spectrum.bass_percent}%</span>
                </div>
                <div style={{ height: 16, background: "rgba(10,10,26,0.8)", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={S.progressFill(result.frequency_spectrum.bass_percent, "#ff9f1c")} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#00e5ff", fontSize: 11, fontWeight: 700 }}>MIDS (250-4000 Hz)</span>
                  <span style={{ color: "#00e5ff", fontSize: 14, fontWeight: 900 }}>{result.frequency_spectrum.mid_percent}%</span>
                </div>
                <div style={{ height: 16, background: "rgba(10,10,26,0.8)", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={S.progressFill(result.frequency_spectrum.mid_percent, "#00e5ff")} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#c77dff", fontSize: 11, fontWeight: 700 }}>HIGHS (4000-20000 Hz)</span>
                  <span style={{ color: "#c77dff", fontSize: 14, fontWeight: 900 }}>{result.frequency_spectrum.high_percent}%</span>
                </div>
                <div style={{ height: 16, background: "rgba(10,10,26,0.8)", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={S.progressFill(result.frequency_spectrum.high_percent, "#c77dff")} />
                </div>
              </div>
              <div style={{ padding: 12, background: "rgba(255,159,28,0.1)", borderRadius: 8, border: "1px solid #ff9f1c44", textAlign: "center" }}>
                <div style={{ color: "#ff9f1c", fontSize: 12, fontWeight: 700 }}>📊 {result.frequency_spectrum.description}</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
