/**
 * RVC Voice Conversion Component - Curat
 * Tabs: Pipeline Automat | Mix | Presets
 * 
 * Enhanced with Applio features:
 * - Autotune (snap F0 to musical notes)
 * - Clean Audio (noise reduction)
 * - Volume Envelope (RMS matching)
 * - High-Pass Filter (remove rumble)
 */

import { useState, useEffect } from "react";

const API = "http://localhost:8000";

export default function RVCConversion({ addLog, tracks, setTracks }) {
  // Models
  const [models, setModels] = useState([]);

  // Pipeline state
  const [pipelineFile, setPipelineFile] = useState(null);
  const [pipelineModel, setPipelineModel] = useState("");
  const [pipelineF0Method, setPipelineF0Method] = useState("harvest");
  const [pipelinePitch, setPipelinePitch] = useState(0);
  const [pipelineIndexRate, setPipelineIndexRate] = useState(0.40);
  
  // NEW: Applio features state
  const [autotuneEnabled, setAutotuneEnabled] = useState(false);
  const [autotuneStrength, setAutotuneStrength] = useState(0.5);
  const [cleanAudioEnabled, setCleanAudioEnabled] = useState(false);
  const [cleanStrength, setCleanStrength] = useState(0.5);
  const [volumeEnvelope, setVolumeEnvelope] = useState(1.0);
  const [applyHighpass, setApplyHighpass] = useState(true);
  
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState(0);
  const [pipelineResult, setPipelineResult] = useState(null);
  const [pipelineError, setPipelineError] = useState(null);

  // Vocal/Instrumental from pipeline (for Mix tab)
  const [separatedInstrumental, setSeparatedInstrumental] = useState(null);
  const [convertedVocals, setConvertedVocals] = useState(null);

  // Mix state
  const [mixing, setMixing] = useState(false);
  const [mixResult, setMixResult] = useState(null);
  const [vocalsVolume, setVocalsVolume] = useState(1.0);
  const [instrumentalVolume, setInstrumentalVolume] = useState(1.0);

  // Presets state
  const [presets, setPresets] = useState({});
  const [presetName, setPresetName] = useState("");

  // Active tab
  const [activeTab, setActiveTab] = useState("pipeline");

  useEffect(() => {
    loadModels();
    loadPresets();
  }, []);

  const loadModels = async () => {
    try {
      const res = await fetch(`${API}/rvc/models`);
      const data = await res.json();
      if (data.status === "ok") {
        setModels(data.models || []);
        if (data.models?.length > 0) {
          setPipelineModel(data.models[0].name);
          addLog(`🎤 RVC: ${data.models.length} model(s) available`);
        }
      }
    } catch (err) {
      addLog(`[ERR] RVC: Could not load models`);
    }
  };

  const loadPresets = async () => {
    try {
      const res = await fetch(`${API}/rvc/presets`);
      const data = await res.json();
      if (data.status === "ok") setPresets(data.presets || {});
    } catch (err) { console.error("Failed to load presets:", err); }
  };

  const runPipeline = async () => {
    if (!pipelineFile || !pipelineModel) return;
    setPipelineRunning(true);
    setPipelineProgress(0);
    setPipelineResult(null);
    setPipelineError(null);
    setSeparatedInstrumental(null);
    setConvertedVocals(null);

    try {
      addLog(`⚡ Pipeline: ${pipelineFile.name}`);
      const formData = new FormData();
      formData.append("audio_file", pipelineFile);
      formData.append("rvc_model_name", pipelineModel);
      formData.append("f0_method", pipelineF0Method);
      formData.append("pitch_shift", pipelinePitch.toString());
      formData.append("index_rate", pipelineIndexRate.toString());
      
      // NEW: Applio features
      formData.append("autotune_strength", autotuneEnabled ? autotuneStrength.toString() : "0.0");
      formData.append("clean_audio", cleanAudioEnabled.toString());
      formData.append("clean_strength", cleanStrength.toString());
      formData.append("volume_envelope", volumeEnvelope.toString());
      formData.append("apply_highpass", applyHighpass.toString());

      const progressInterval = setInterval(() => {
        setPipelineProgress(prev => prev >= 90 ? prev : prev + 8);
      }, 600);

      const response = await fetch(`${API}/rvc/auto_pipeline`, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      const data = await response.json();

      if (data.status === "ok") {
        setPipelineProgress(100);
        setPipelineResult(data);
        // Store for Mix tab
        if (data.instrumental_url) setSeparatedInstrumental({ url: `${API}${data.instrumental_url}`, filename: data.instrumental_filename });
        if (data.url) setConvertedVocals({ url: `${API}${data.url}`, filename: data.filename });
        addLog(`✅ Pipeline complete! ${data.total_time_sec}s`);
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (err) {
      setPipelineError(err.message);
      addLog(`❌ Pipeline: ${err.message}`);
    } finally {
      setPipelineRunning(false);
    }
  };

  const handleMix = async () => {
    if (!convertedVocals || !separatedInstrumental) return;
    setMixing(true);
    addLog(`🎚 Mixing vocals + instrumental...`);
    try {
      const [vocBlob, instBlob] = await Promise.all([
        fetch(convertedVocals.url).then(r => r.blob()),
        fetch(separatedInstrumental.url).then(r => r.blob()),
      ]);
      const fd = new FormData();
      fd.append("vocals_file", vocBlob, "vocals.mp3");
      fd.append("instrumental_file", instBlob, "instrumental.mp3");
      fd.append("vocals_volume", vocalsVolume.toString());
      fd.append("instrumental_volume", instrumentalVolume.toString());
      const res = await fetch(`${API}/rvc/mix`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.status !== "ok") throw new Error(data.error);
      setMixResult({ url: `${API}${data.url}`, filename: data.filename, duration: data.duration_sec, size: data.size_mb });
      addLog(`✅ Final mix: ${data.filename} (${data.duration_sec}s)`);
    } catch (err) {
      addLog(`[ERR] Mix: ${err.message}`);
    } finally {
      setMixing(false);
    }
  };

  const savePreset = async () => {
    if (!presetName.trim()) return;
    const fd = new FormData();
    fd.append("name", presetName);
    fd.append("model_name", pipelineModel);
    fd.append("pitch_shift", pipelinePitch.toString());
    fd.append("emotion", "neutral");
    fd.append("f0_method", pipelineF0Method);
    fd.append("index_rate", pipelineIndexRate.toString());
    fd.append("filter_radius", "3");
    fd.append("rms_mix_rate", "0.25");
    fd.append("protect", "0.33");
    fd.append("dry_wet", "1.0");
    fd.append("formant_shift", "0.0");
    fd.append("auto_tune", "false");
    const res = await fetch(`${API}/rvc/presets/save`, { method: "POST", body: fd });
    const data = await res.json();
    if (data.status === "ok") {
      setPresets(data.presets);
      setPresetName("");
      addLog(`💾 Preset saved: ${presetName}`);
    }
  };

  const loadPreset = (name) => {
    const p = presets[name];
    if (!p) return;
    if (p.model_name) setPipelineModel(p.model_name);
    setPipelinePitch(p.pitch_shift ?? 0);
    setPipelineF0Method(p.f0_method ?? "rmvpe");
    setPipelineIndexRate(p.index_rate ?? 0.75);
    setActiveTab("pipeline");
    addLog(`✅ Preset loaded: ${name}`);
  };

  const deletePreset = async (name) => {
    await fetch(`${API}/rvc/presets/${encodeURIComponent(name)}`, { method: "DELETE" });
    loadPresets();
  };

  const S = {
    card: {
      background: "linear-gradient(135deg, #0d0d22 0%, #0a0a1a 100%)",
      border: "1px solid #1e1e3a",
      borderRadius: 12,
      padding: 16,
      marginBottom: 14,
    },
    label: {
      color: "#6666aa",
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      marginBottom: 8,
      display: "block",
    },
    input: {
      width: "100%",
      background: "#080812",
      border: "1px solid #2a2a4a",
      color: "#e0e0ff",
      borderRadius: 8,
      padding: "10px 12px",
      fontSize: 14,
      outline: "none",
    },
    btn: {
      background: "linear-gradient(135deg, #ff6b9d, #ff8fab)",
      color: "#fff",
      border: "none",
      borderRadius: 10,
      padding: "12px 20px",
      fontSize: 14,
      fontWeight: 700,
      cursor: "pointer",
    },
    select: {
      width: "100%",
      background: "#080812",
      border: "1px solid #2a2a4a",
      color: "#e0e0ff",
      borderRadius: 8,
      padding: "10px 12px",
      fontSize: 13,
      outline: "none",
    },
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }} className="fade-in">

      {/* Header + Tabs */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{
          fontSize: 24, fontWeight: 800,
          background: "linear-gradient(135deg, #ff6b9d, #ff8fab)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8,
        }}>🎤 RVC Voice Conversion</h2>
        
        {/* Description */}
        <div style={{
          background: "linear-gradient(135deg, #1a1a2e, #0f0f1a)",
          border: "1px solid #2a2a4a",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 13, color: "#a0a0cc", lineHeight: 1.6, marginBottom: 8 }}>
            <strong style={{ color: "#ff6b9d" }}>What is RVC?</strong> RVC (Retrieval-based Voice Conversion) uses AI to transform vocals from one voice to another using trained voice models.
          </div>
          <div style={{ fontSize: 12, color: "#6666aa" }}>
            <strong>⚡ Auto Pipeline:</strong> Upload full song → Separate vocals → Convert with RVC → Save instrumental → Mix together in Final Mix tab
          </div>
          <div style={{ fontSize: 11, color: "#444466", marginTop: 8, fontStyle: "italic" }}>
            💡 <strong>Tip:</strong> For best singing quality, use <strong style={{ color: "#4ade80" }}>harvest</strong> F0 method and <strong style={{ color: "#4ade80" }}>0.40</strong> Index Rate (optimized for singing, not speech)
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[["pipeline", "⚡ Auto Pipeline"], ["mix", "🎚 Final Mix"], ["presets", "💾 Presets"]].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              background: activeTab === id ? "linear-gradient(135deg,#ff6b9d,#ff8fab)" : "#1a1a2e",
              color: activeTab === id ? "#fff" : "#6666aa",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── PIPELINE TAB ── */}
      {activeTab === "pipeline" && (
        <div>
          <div style={S.card}>
            {/* Upload */}
            <span style={S.label}>🎵 Upload Full Song</span>
            <div
              onClick={() => { const i = document.createElement("input"); i.type = "file"; i.accept = "audio/*"; i.onchange = e => setPipelineFile(e.target.files[0]); i.click(); }}
              style={{ border: pipelineFile ? "2px solid #ff6b9d" : "2px dashed #2a2a4a", borderRadius: 12, padding: 24, textAlign: "center", cursor: "pointer", background: pipelineFile ? "#ff6b9d11" : "transparent", marginBottom: 16 }}
            >
              {pipelineFile ? (
                <div><div style={{ fontSize: 28, marginBottom: 6 }}>🎵</div><div style={{ color: "#ff6b9d", fontWeight: 600 }}>{pipelineFile.name}</div><div style={{ color: "#444466", fontSize: 11 }}>{(pipelineFile.size / 1024 / 1024).toFixed(2)} MB · Click to change</div></div>
              ) : (
                <div><div style={{ fontSize: 28, marginBottom: 6 }}>📁</div><div style={{ color: "#6666aa" }}>Click to upload full song</div><div style={{ color: "#444466", fontSize: 11, marginTop: 4 }}>WAV, MP3, FLAC supported</div></div>
              )}
            </div>

            {/* Model */}
            <span style={S.label}>🧠 RVC Model</span>
            <select value={pipelineModel} onChange={e => setPipelineModel(e.target.value)} style={{ ...S.select, marginBottom: 16 }}>
              {models.map((m, i) => (
                <option key={i} value={m.name}>{m.name} ({m.size_mb} MB){m.version === "v2" ? " 🆕 v2" : ""}</option>
              ))}
            </select>

            {/* F0 Method */}
            <span style={S.label}>🎛 F0 Method (Pitch Extraction)</span>
            <select value={pipelineF0Method} onChange={e => setPipelineF0Method(e.target.value)} style={{ ...S.select, marginBottom: 16 }}>
              <option value="harvest">🎵 Harvest - Best for singing (smooth, natural)</option>
              <option value="rmvpe">⚡ RMVPE - Fast & accurate (default)</option>
              <option value="pm">🚀 PM - Fastest (lower quality)</option>
              <option value="crepe">🎛 Crepe - GPU accelerated (best quality)</option>
            </select>
            <div style={{ fontSize: 11, color: "#6666aa", marginBottom: 16, background: "#080812", padding: 8, borderRadius: 6 }}>
              💡 <strong>Recommendation:</strong> Use <strong style={{ color: "#4ade80" }}>harvest</strong> for singing (preserves vibrato & harmony better than rmvpe)
            </div>

            {/* Pitch */}
            <span style={S.label}>🎚 Pitch Shift: {pipelinePitch > 0 ? "+" : ""}{pipelinePitch} semitones</span>
            <input type="range" min="-12" max="12" value={pipelinePitch} onChange={e => setPipelinePitch(parseInt(e.target.value))} style={{ width: "100%", marginBottom: 4 }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6666aa", marginBottom: 16 }}>
              <span>-12 (lower)</span><span>0</span><span>+12 (higher)</span>
            </div>
            <div style={{ fontSize: 11, color: "#6666aa", marginBottom: 16, background: "#080812", padding: 8, borderRadius: 6 }}>
              🎯 <strong>Tip:</strong> Keep at 0 for same key. Use ±1-3 for small adjustments. Extreme shifts may reduce quality.
            </div>

            {/* Index Rate */}
            <span style={S.label}>📊 Index Rate: {pipelineIndexRate.toFixed(2)}</span>
            <input type="range" min="0" max="1" step="0.01" value={pipelineIndexRate} onChange={e => setPipelineIndexRate(parseFloat(e.target.value))} style={{ width: "100%", marginBottom: 4 }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6666aa", marginBottom: 16 }}>
              <span>0 (original voice)</span><span>0.40 (singing)</span><span>1.0 (full conversion)</span>
            </div>
            <div style={{ fontSize: 11, color: "#6666aa", background: "#080812", padding: 8, borderRadius: 6 }}>
              💡 <strong>For Singing:</strong> Use <strong style={{ color: "#4ade80" }}>0.35-0.50</strong> to preserve original singing style. Higher values (0.75+) may destroy vibrato and harmony.
            </div>

            {/* ── ADVANCED SETTINGS (APPLIO FEATURES) ────────────────────────── */}
            <div style={{
              background: "linear-gradient(135deg, #1a1a2e, #0f0f1a)",
              border: "1px solid #3a3a5a",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#ff6b9d", marginBottom: 12 }}>
                🎛 Advanced Settings (Applio Features)
              </div>

              {/* Autotune */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={autotuneEnabled}
                    onChange={e => setAutotuneEnabled(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: "pointer" }}
                  />
                  <span style={{ color: "#e0e0ff", fontWeight: 600 }}>🎵 Autotune</span>
                </label>
                {autotuneEnabled && (
                  <div>
                    <div style={{ fontSize: 11, color: "#6666aa", marginBottom: 4 }}>
                      Strength: {autotuneStrength.toFixed(2)}
                    </div>
                    <input
                      type="range"
                      min="0" max="1" step="0.05"
                      value={autotuneStrength}
                      onChange={e => setAutotuneStrength(parseFloat(e.target.value))}
                      style={{ width: "100%" }}
                    />
                    <div style={{ fontSize: 10, color: "#444466", marginTop: 4 }}>
                      Snap F0 to musical notes (recommended for singing)
                    </div>
                  </div>
                )}
              </div>

              {/* Clean Audio */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={cleanAudioEnabled}
                    onChange={e => setCleanAudioEnabled(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: "pointer" }}
                  />
                  <span style={{ color: "#e0e0ff", fontWeight: 600 }}>🧹 Clean Audio</span>
                </label>
                {cleanAudioEnabled && (
                  <div>
                    <div style={{ fontSize: 11, color: "#6666aa", marginBottom: 4 }}>
                      Strength: {cleanStrength.toFixed(2)}
                    </div>
                    <input
                      type="range"
                      min="0" max="1" step="0.05"
                      value={cleanStrength}
                      onChange={e => setCleanStrength(parseFloat(e.target.value))}
                      style={{ width: "100%" }}
                    />
                    <div style={{ fontSize: 10, color: "#444466", marginTop: 4 }}>
                      Noise reduction (recommended for speech)
                    </div>
                  </div>
                )}
              </div>

              {/* Volume Envelope */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "#6666aa", marginBottom: 4 }}>
                  📊 Volume Envelope (RMS Matching): {volumeEnvelope.toFixed(2)}
                </div>
                <input
                  type="range"
                  min="0" max="1" step="0.05"
                  value={volumeEnvelope}
                  onChange={e => setVolumeEnvelope(parseFloat(e.target.value))}
                  style={{ width: "100%" }}
                />
                <div style={{ fontSize: 10, color: "#444466", marginTop: 4 }}>
                  Match dynamics of original audio (1.0 = full match)
                </div>
              </div>

              {/* High-Pass Filter */}
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={applyHighpass}
                    onChange={e => setApplyHighpass(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: "pointer" }}
                  />
                  <span style={{ color: "#e0e0ff", fontWeight: 600 }}>🔊 High-Pass Filter</span>
                </label>
                <div style={{ fontSize: 10, color: "#444466", marginTop: 4, marginLeft: 26 }}>
                  Remove rumble below 48Hz (recommended)
                </div>
              </div>
            </div>

            {/* Run Button */}
            <button onClick={runPipeline} disabled={!pipelineFile || pipelineRunning || !pipelineModel} style={{
              width: "100%", padding: "14px 20px", fontSize: 15, fontWeight: 700,
              background: (!pipelineFile || pipelineRunning || !pipelineModel) ? "#2a2a4a" : "linear-gradient(135deg, #ff6b9d, #ff8fab)",
              color: "#fff", border: "none", borderRadius: 12,
              cursor: (!pipelineFile || pipelineRunning || !pipelineModel) ? "not-allowed" : "pointer",
              opacity: (!pipelineFile || pipelineRunning || !pipelineModel) ? 0.6 : 1,
            }}>
              {pipelineRunning ? `⏳ Processing... ${pipelineProgress}%` : "⚡ Start Auto Pipeline"}
            </button>

            {/* Progress */}
            {pipelineRunning && (
              <div style={{ marginTop: 16 }}>
                <div style={{ background: "#1a1a2e", borderRadius: 8, height: 8, overflow: "hidden" }}>
                  <div style={{ width: `${pipelineProgress}%`, background: "linear-gradient(90deg, #ff6b9d, #ff8fab)", height: "100%", transition: "width 0.3s" }} />
                </div>
                <div style={{ fontSize: 12, color: "#6666aa", marginTop: 6, textAlign: "center" }}>
                  {pipelineProgress < 30 && "🎵 Separating vocals..."}
                  {pipelineProgress >= 30 && pipelineProgress < 60 && "🔊 Processing audio..."}
                  {pipelineProgress >= 60 && pipelineProgress < 90 && "🎤 RVC Conversion..."}
                  {pipelineProgress >= 90 && "💾 Finalizing..."}
                </div>
              </div>
            )}
          </div>

          {/* Result */}
          {pipelineResult && (
            <div style={{ ...S.card, background: "#ff6b9d11", border: "2px solid #ff6b9d44" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#ff6b9d", textAlign: "center", marginBottom: 8 }}>✅ Pipeline Complete!</div>
              <div style={{ fontSize: 13, color: "#6666aa", textAlign: "center", marginBottom: 12 }}>
                Total time: {pipelineResult.total_time_sec}s | WAV + MP3
              </div>
              <audio controls src={`${API}${pipelineResult.url}`} style={{ width: "100%", marginBottom: 12 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <a href={`${API}${pipelineResult.url}`} download={pipelineResult.filename_wav || pipelineResult.filename}
                  style={{ flex: 1, textAlign: "center", background: "#ff6b9d22", color: "#ff6b9d", border: "1px solid #ff6b9d44", padding: 10, borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 13 }}>
                  ⬇ Download WAV (High Quality)
                </a>
                <a href={`${API}${pipelineResult.url_mp3}`} download={pipelineResult.filename_mp3}
                  style={{ flex: 1, textAlign: "center", background: "#ff6b9d11", color: "#ff6b9d", border: "1px solid #ff6b9d33", padding: 10, borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 13 }}>
                  ⬇ Download MP3
                </a>
              </div>
              {/* Go to Final Mix Button */}
              {convertedVocals && separatedInstrumental && (
                <button onClick={() => setActiveTab("mix")} style={{
                  width: "100%", marginTop: 12, padding: "14px 20px", fontSize: 15, fontWeight: 700,
                  background: "linear-gradient(135deg, #4ecdc4, #45b7aa)",
                  color: "#fff", border: "none", borderRadius: 12,
                  cursor: "pointer",
                }}>
                  🎚 Go to Final Mix →
                </button>
              )}
            </div>
          )}

          {/* Error */}
          {pipelineError && (
            <div style={{ ...S.card, background: "#e6394611", border: "2px solid #e6394644" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#e63946", textAlign: "center" }}>❌ {pipelineError}</div>
            </div>
          )}
        </div>
      )}

      {/* ── MIX TAB ── */}
      {activeTab === "mix" && (
        <div>
          <div style={S.card}>
            <span style={S.label}>🎚 Mix Converted Voice + Instrumental</span>
            {!convertedVocals || !separatedInstrumental ? (
              <div style={{ color: "#ff6b9d", fontSize: 13, padding: 12, background: "#ff6b9d11", borderRadius: 8 }}>
                ⚠️ First run <strong>Auto Pipeline</strong> to get the converted voice and instrumental.
              </div>
            ) : (
              <div>
                <div style={{ color: "#4ade80", fontSize: 13, padding: 8, background: "#4ade8011", borderRadius: 8, marginBottom: 16, border: "1px solid #4ade8044" }}>
                  ✅ Files ready from Auto Pipeline! You can now mix them together.
                </div>
                <div style={{ color: "#a0a0cc", fontSize: 13, marginBottom: 16 }}>
                  <div style={{ marginBottom: 4 }}>🎤 Vocals: <strong>{convertedVocals.filename}</strong></div>
                  <div>🎹 Instrumental: <strong>{separatedInstrumental.filename}</strong></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <div>
                    <span style={{ color: "#6666aa", fontSize: 11, display: "block", marginBottom: 6 }}>🎤 Vocals Volume ({Math.round(vocalsVolume * 100)}%)</span>
                    <input type="range" min="0.1" max="2" step="0.05" value={vocalsVolume} onChange={e => setVocalsVolume(parseFloat(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div>
                    <span style={{ color: "#6666aa", fontSize: 11, display: "block", marginBottom: 6 }}>🎹 Instrumental Volume ({Math.round(instrumentalVolume * 100)}%)</span>
                    <input type="range" min="0.1" max="2" step="0.05" value={instrumentalVolume} onChange={e => setInstrumentalVolume(parseFloat(e.target.value))} style={{ width: "100%" }} />
                  </div>
                </div>
                <button onClick={handleMix} disabled={mixing} style={{ ...S.btn, width: "100%", opacity: mixing ? 0.5 : 1 }}>
                  {mixing ? "⏳ Mixing..." : "🎚 Create Final Mix"}
                </button>
              </div>
            )}
          </div>

          {mixResult && (
            <div style={{ ...S.card, borderLeft: "4px solid #ff6b9d" }}>
              <span style={{ ...S.label, color: "#ff6b9d" }}>✅ Final Mix Ready!</span>
              <div style={{ color: "#a0a0cc", fontSize: 13, marginBottom: 10 }}>
                <div>🎵 {mixResult.filename}</div>
                <div>⏱ {mixResult.duration}s · 📦 {mixResult.size} MB</div>
              </div>
              <audio controls src={mixResult.url} style={{ width: "100%", marginBottom: 10 }} />
              <a href={mixResult.url} download={mixResult.filename}
                style={{ display: "block", textAlign: "center", background: "#ff6b9d22", color: "#ff6b9d", border: "1px solid #ff6b9d44", padding: 10, borderRadius: 8, textDecoration: "none", fontWeight: 700 }}>
                ⬇ Download Final Mix
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── PRESETS TAB ── */}
      {activeTab === "presets" && (
        <div>
          <div style={S.card}>
            <span style={S.label}>💾 Save Current Settings as Preset</span>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={presetName}
                onChange={e => setPresetName(e.target.value)}
                placeholder='E.g. "Kanye Sad -3" or "Bad Bunny +5"'
                style={{ ...S.input, flex: 1 }}
              />
              <button onClick={savePreset} disabled={!presetName.trim()}
                style={{ ...S.btn, padding: "10px 16px", opacity: !presetName.trim() ? 0.5 : 1 }}>
                💾 Save
              </button>
            </div>
            <div style={{ color: "#444466", fontSize: 11, marginTop: 6 }}>
              Saves model + pitch + F0 method + index rate from Pipeline
            </div>
          </div>

          <div style={S.card}>
            <span style={S.label}>📂 Saved Presets</span>
            {Object.keys(presets).length === 0 ? (
              <div style={{ color: "#444466", fontSize: 13, padding: 12, textAlign: "center" }}>
                No presets saved yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Object.entries(presets).map(([name, p]) => (
                  <div key={name} style={{ background: "#0d0d22", border: "1px solid #2a2a4a", borderRadius: 8, padding: 12, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#e0e0ff", fontWeight: 600, marginBottom: 4 }}>💾 {name}</div>
                      <div style={{ color: "#444466", fontSize: 11 }}>
                        {p.model_name && `${p.model_name.replace(".pth", "")} · `}
                        Pitch: {p.pitch_shift > 0 ? "+" : ""}{p.pitch_shift} ·
                        F0: {p.f0_method} ·
                        Index: {Math.round(p.index_rate * 100)}%
                      </div>
                    </div>
                    <button onClick={() => loadPreset(name)}
                      style={{ background: "#ff6b9d22", color: "#ff6b9d", border: "1px solid #ff6b9d44", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                      ▶ Apply
                    </button>
                    <button onClick={() => deletePreset(name)}
                      style={{ background: "#e6394622", color: "#e63946", border: "1px solid #e6394644", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}>
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
