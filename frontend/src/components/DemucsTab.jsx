import { useState } from "react";

const API = "http://localhost:8000";

const SEPARATION_MODELS = [
  // ── Demucs (via demucs package) — funcționează out-of-the-box ────────────
  {
    id: "htdemucs_ft",
    name: "htdemucs_ft ✅ Recommended",
    desc: "Demucs fine-tuned — SDR 10.8 vocals, 4 stems. Fast, no extra dependencies. Works out of the box.",
    stems: ["vocals", "drums", "bass", "other"],
    color: "#00e5ff",
    badge: "RECOMANDAT",
    engine: "demucs",
  },
  {
    id: "htdemucs",
    name: "htdemucs",
    desc: "Demucs v4 standard — fast and accurate, 4 stems. SDR 10.0 vocals.",
    stems: ["vocals", "drums", "bass", "other"],
    color: "#6666aa",
    badge: "FAST",
    engine: "demucs",
  },
  {
    id: "htdemucs_6s",
    name: "htdemucs_6s",
    desc: "Demucs 6-stem — also separates guitar & piano. SDR 10.0.",
    stems: ["vocals", "drums", "bass", "other", "guitar", "piano"],
    color: "#06d6a0",
    badge: "6 STEMS",
    engine: "demucs",
  },
  // ── BS-RoFormer / Mel-Band RoFormer (necesită audio-separator instalat) ───
  {
    id: "bs_roformer_1297",
    name: "BS-RoFormer 🏆 SDR 12.97",
    desc: "⚠ Requires: pip install audio-separator[gpu] — Best model, SDR 12.97. Auto-downloads ~500MB.",
    stems: ["vocals", "instrumental"],
    color: "#ffd166",
    badge: "BEST QUALITY",
    engine: "uvr",
    requiresPackage: "audio-separator",
  },
  {
    id: "mel_band_roformer",
    name: "Mel-Band RoFormer SDR 11.4",
    desc: "⚠ Requires: pip install audio-separator[gpu] — Mel-Band RoFormer. SDR 11.4. Auto-downloads ~400MB.",
    stems: ["vocals", "instrumental"],
    color: "#ff9f1c",
    badge: "EXCELLENT",
    engine: "uvr",
    requiresPackage: "audio-separator",
  },
];

const STEM_ICONS = {
  vocals: "🎤", drums: "🥁", bass: "🎸", other: "🎹",
  guitar: "🎸", piano: "🎹", instrumental: "🎼",
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
      { pct: 15, label: isUVR ? "⬇ Downloading model (first time only)..." : "🔄 Loading model...", delay: 1500 },
      { pct: 35, label: "🎵 Analyzing audio spectrum...", delay: 5000 },
      { pct: 60, label: "🧠 AI separation in progress...", delay: 12000 },
      { pct: 80, label: "💾 Encoding output files...", delay: 20000 },
    ];
    const timers = steps.map(s => setTimeout(() => { setProgress(s.pct); setProgressLabel(s.label); }, s.delay));

    try {
      const res = await fetch(`${API}/demucs_separate`, { method: "POST", body: fd });
      timers.forEach(clearTimeout);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setResults(data.stems);
      setProgress(100);
      setProgressLabel("✅ Separation complete!");
      addLog(`[OK] Separation done: ${Object.keys(data.stems).length} stems | model: ${selectedModel} | SDR: ${model?.id.includes("bs_roformer") ? "12.97" : model?.id.includes("mel_band") ? "12.6" : "10.8"}`);

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

  const S = {
    card: { background: "linear-gradient(135deg,#0d0d22,#0a0a1a)", border: "1px solid #1e1e3a", borderRadius: 12, padding: 18, marginBottom: 14 },
    label: { color: "#6666aa", fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, display: "block" },
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 6 }}>🎛</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#e0e0ff", marginBottom: 4, letterSpacing: 1 }}>
          Stem Separation
        </div>
        <div style={{ color: "#444466", fontSize: 13 }}>
          AI-powered audio separation — BS-RoFormer, Mel-Band RoFormer, Demucs
        </div>
        {/* SDR comparison bar */}
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          {[
            { label: "BS-RoFormer", sdr: 12.97, color: "#ffd166", pct: 100 },
            { label: "Mel-Band RoFormer", sdr: 12.6, color: "#ff9f1c", pct: 97 },
            { label: "htdemucs_ft", sdr: 10.8, color: "#00e5ff", pct: 83 },
            { label: "htdemucs", sdr: 10.0, color: "#6666aa", pct: 77 },
          ].map(item => (
            <div key={item.label} style={{ textAlign: "center", minWidth: 100 }}>
              <div style={{ color: item.color, fontSize: 10, fontWeight: 700, marginBottom: 3 }}>{item.label}</div>
              <div style={{ height: 4, background: "#1a1a2e", borderRadius: 2, overflow: "hidden", width: 100 }}>
                <div style={{ height: 4, background: item.color, width: `${item.pct}%`, borderRadius: 2 }} />
              </div>
              <div style={{ color: item.color, fontSize: 10, marginTop: 2 }}>SDR {item.sdr}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* LEFT */}
        <div>

          {/* Upload */}
          <div style={{ ...S.card, border: uploadedFile ? "1px solid #00e5ff44" : "1px solid #1e1e3a" }}>
            <span style={S.label}>① Upload Audio</span>
            <label style={{
              display: "flex", alignItems: "center", gap: 12, padding: "18px 16px",
              background: "#080812", border: `2px dashed ${uploadedFile ? "#00e5ff" : "#2a2a4a"}`,
              borderRadius: 10, cursor: "pointer",
            }}>
              <span style={{ fontSize: 32 }}>{uploadedFile ? "🎵" : "📂"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: uploadedFile ? "#00e5ff" : "#6666aa", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {uploadedFile ? uploadedFile.name : "Click to upload audio file"}
                </div>
                <div style={{ color: "#333355", fontSize: 11, marginTop: 2 }}>WAV · MP3 · FLAC · M4A</div>
              </div>
              <input type="file" accept="audio/*" onChange={handleUpload} style={{ display: "none" }} />
            </label>
            {uploadedFile && (
              <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                <span style={{ background: "#00e5ff22", color: "#00e5ff", border: "1px solid #00e5ff44", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontFamily: "monospace" }}>
                  📁 {(uploadedFile.size / 1024 / 1024).toFixed(1)} MB
                </span>
                <button onClick={() => { setUploadedFile(null); setResults(null); }}
                  style={{ background: "#e6394611", color: "#e63946", border: "1px solid #e6394633", borderRadius: 6, padding: "3px 10px", fontSize: 11, cursor: "pointer" }}>
                  ✕ Remove
                </button>
              </div>
            )}
          </div>

          {/* Model Selection */}
          <div style={S.card}>
            <span style={S.label}>② Separation Model</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SEPARATION_MODELS.map(m => (
                <div key={m.id} onClick={() => setSelectedModel(m.id)} style={{
                  padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                  background: selectedModel === m.id ? m.color + "11" : "#080812",
                  border: `1px solid ${selectedModel === m.id ? m.color : "#1a1a2e"}`,
                  transition: "all 0.15s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: "50%",
                      background: selectedModel === m.id ? m.color : "#1a1a2e",
                      border: `2px solid ${m.color}`, flexShrink: 0,
                    }} />
                    <span style={{ color: selectedModel === m.id ? m.color : "#aaaacc", fontSize: 13, fontWeight: 700 }}>{m.name}</span>
                    <span style={{
                      background: m.color + "22", color: m.color, border: `1px solid ${m.color}44`,
                      borderRadius: 4, padding: "1px 6px", fontSize: 9, fontWeight: 800, letterSpacing: 1,
                    }}>{m.badge}</span>
                    {m.engine === "uvr" && (
                      <span style={{ background: "#ffd16622", color: "#ffd166", border: "1px solid #ffd16644", borderRadius: 4, padding: "1px 5px", fontSize: 9, fontWeight: 700 }}>UVR</span>
                    )}
                  </div>
                  <div style={{ color: "#444466", fontSize: 11, marginLeft: 22 }}>{m.desc}</div>
                  <div style={{ display: "flex", gap: 4, marginTop: 6, marginLeft: 22, flexWrap: "wrap" }}>
                    {m.stems.map(s => (
                      <span key={s} style={{
                        background: (STEM_COLORS[s] || "#6666aa") + "22",
                        color: STEM_COLORS[s] || "#6666aa",
                        border: `1px solid ${(STEM_COLORS[s] || "#6666aa")}44`,
                        borderRadius: 4, padding: "1px 6px", fontSize: 10,
                      }}>{STEM_ICONS[s] || "🎵"} {s}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT */}
        <div>

          {/* Output Mode */}
          <div style={S.card}>
            <span style={S.label}>③ Output Mode</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { id: "stems", icon: "🎛", label: "All Stems", desc: `Separate all ${model?.stems.length || 2} stems individually` },
                { id: "vocals_only", icon: "🎤", label: "Vocals Only", desc: "Extract only the vocal track" },
                { id: "instrumental_only", icon: "🎼", label: "Instrumental Only", desc: "Remove vocals, keep everything else" },
              ].map(opt => (
                <div key={opt.id} onClick={() => setMode(opt.id)} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                  borderRadius: 10, cursor: "pointer",
                  background: mode === opt.id ? "#00e5ff11" : "#080812",
                  border: `1px solid ${mode === opt.id ? "#00e5ff" : "#1a1a2e"}`,
                  transition: "all 0.15s",
                }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: "50%",
                    background: mode === opt.id ? "#00e5ff" : "#1a1a2e",
                    border: "2px solid #00e5ff", flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 20 }}>{opt.icon}</span>
                  <div>
                    <div style={{ color: mode === opt.id ? "#00e5ff" : "#aaaacc", fontSize: 13, fontWeight: 700 }}>{opt.label}</div>
                    <div style={{ color: "#444466", fontSize: 11 }}>{opt.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Separate Button */}
          <div style={S.card}>
            <button
              onClick={handleSeparate}
              disabled={processing || !uploadedFile}
              style={{
                width: "100%", padding: "18px 0", borderRadius: 10,
                background: processing ? "#1a1a2e" : (uploadedFile
                  ? `linear-gradient(135deg, ${model?.color || "#00e5ff"}, #7209b7)`
                  : "#1a1a2e"),
                color: "#fff", fontWeight: 900, fontSize: 17, border: "none",
                cursor: (processing || !uploadedFile) ? "not-allowed" : "pointer",
                opacity: !uploadedFile ? 0.5 : 1,
                letterSpacing: 1,
                boxShadow: uploadedFile && !processing ? `0 0 20px ${model?.color || "#00e5ff"}33` : "none",
              }}>
              {processing ? `⚙ ${progressLabel || "Processing..."}` : "🎛 Separate Stems"}
            </button>

            {processing && (
              <div style={{ marginTop: 10 }}>
                <div style={{ height: 6, background: "#1a1a2e", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: 6, background: `linear-gradient(90deg, ${model?.color || "#00e5ff"}, #7209b7)`, width: `${progress}%`, transition: "width 0.8s", borderRadius: 3 }} />
                </div>
                <div style={{ color: "#6666aa", fontSize: 11, marginTop: 6, textAlign: "center" }}>{progressLabel}</div>
              </div>
            )}

            {/* Info box */}
            <div style={{ marginTop: 12, padding: "10px 12px", background: "#0a0a1a", borderRadius: 8, border: "1px solid #1a1a2e" }}>
              <div style={{ color: "#ffd166", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>🏆 Quality Ranking (SDR vocals)</div>
              <div style={{ color: "#444466", fontSize: 11, lineHeight: 1.9 }}>
                <div>① <strong style={{ color: "#ffd166" }}>BS-RoFormer</strong> — SDR 12.97 (best ever)</div>
                <div>② <strong style={{ color: "#ff9f1c" }}>Mel-Band RoFormer</strong> — SDR 12.6</div>
                <div>③ <strong style={{ color: "#00e5ff" }}>htdemucs_ft</strong> — SDR 10.8 (4 stems)</div>
                <div>④ <strong style={{ color: "#6666aa" }}>htdemucs</strong> — SDR 10.0 (fast)</div>
                <div style={{ marginTop: 6, color: "#333355", fontSize: 10 }}>
                  ⚠ UVR models auto-download on first use (~400-500MB)
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          {results && (
            <div style={{ ...S.card, border: "1px solid #06d6a044", background: "#06d6a011" }}>
              <span style={{ ...S.label, color: "#06d6a0" }}>✅ Stems Ready — Download Below</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Object.entries(results).map(([stem, url]) => (
                  <div key={stem} style={{
                    background: "#080812", borderRadius: 10, padding: "10px 12px",
                    border: `1px solid ${STEM_COLORS[stem] || "#2a2a4a"}44`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ color: STEM_COLORS[stem] || "#aaaacc", fontSize: 13, fontWeight: 700 }}>
                        {STEM_ICONS[stem] || "🎵"} {stem.charAt(0).toUpperCase() + stem.slice(1)}
                      </span>
                      <a href={`${API}${url}`} download style={{
                        background: (STEM_COLORS[stem] || "#00e5ff") + "22",
                        color: STEM_COLORS[stem] || "#00e5ff",
                        border: `1px solid ${(STEM_COLORS[stem] || "#00e5ff")}44`,
                        padding: "4px 12px", borderRadius: 6, fontSize: 12,
                        textDecoration: "none", fontWeight: 700,
                      }}>⬇ Download</a>
                    </div>
                    <audio controls src={`${API}${url}`} style={{ width: "100%", height: 28 }} />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
