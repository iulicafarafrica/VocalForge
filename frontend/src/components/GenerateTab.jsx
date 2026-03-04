import { useState, useEffect } from "react";

const API = "http://localhost:8000";

function SliderRow({ label, value, min, max, step = 0.01, onChange, color = "#00e5ff", unit = "" }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: "#8888aa", fontSize: 12 }}>{label}</span>
        <span style={{ color, fontSize: 12, fontFamily: "monospace", fontWeight: 700 }}>
          {typeof value === "number" && step < 1 ? value.toFixed(2) : value}{unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: color }}
      />
    </div>
  );
}

export default function GenerateTab({ addLog, tracks, setTracks }) {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [bpm, setBpm] = useState(null);
  const [key, setKey] = useState(null);

  // Model selection
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [speakers, setSpeakers] = useState([]);
  const [selectedSpeaker, setSelectedSpeaker] = useState("");

  // Voice params
  const [pitch, setPitch] = useState(0);
  const [sliceDb, setSliceDb] = useState(-40);
  const [noiseScale, setNoiseScale] = useState(0.4);
  const [f0Predictor, setF0Predictor] = useState("pm");
  const [autoF0, setAutoF0] = useState(false);
  const [vocalGain, setVocalGain] = useState(1.0);
  const [instrumentalGain, setInstrumentalGain] = useState(1.0);

  // AudioEngine params
  const [useFullPipeline, setUseFullPipeline] = useState(false);
  const [genderShift, setGenderShift] = useState(0.0);
  const [styleShift, setStyleShift] = useState(0.0);
  const [harmonyFactor, setHarmonyFactor] = useState(1.05);
  const [masteringDrive, setMasteringDrive] = useState(1.0);

  const [generating, setGenerating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");

  const accentColor = "#00e5ff";

  // Load models on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetch(`${API}/list_models`)
      .then(r => r.json())
      .then(data => {
        setModels(data);
        if (data.length > 0 && !selectedModel) {
          setSelectedModel(data[0].id);
        }
      })
      .catch(() => addLog("[WARN] Could not load models list"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load speakers when model changes
  useEffect(() => {
    if (!selectedModel) return;
    setSpeakers([]);
    setSelectedSpeaker("");
    fetch(`${API}/speakers/${selectedModel}`)
      .then(r => r.json())
      .then(data => {
        if (data.speakers && data.speakers.length > 0) {
          setSpeakers(data.speakers);
          setSelectedSpeaker(data.speakers[0]);
          addLog(`[OK] Model loaded — speakers: ${data.speakers.join(", ")}`);
        }
      })
      .catch(() => addLog("[WARN] Could not load speakers for model"));
  }, [selectedModel]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFile(file);
    addLog(`[OK] Uploaded: ${file.name}`);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${API}/detect_bpm_key`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.bpm) {
        setBpm(data.bpm);
        setKey(data.key);
        addLog(`[OK] BPM: ${data.bpm} · Key: ${data.key}`);
      }
    } catch {
      addLog("[WARN] BPM/Key detection failed");
    }
  };

  const handlePreview = async () => {
    if (!uploadedFile) { addLog("[ERR] No file uploaded"); return; }
    if (!selectedModel) { addLog("[ERR] No model selected"); return; }
    setPreviewing(true);
    addLog("[OK] Generating 10s preview...");
    const fd = new FormData();
    fd.append("file", uploadedFile);
    fd.append("model_id", selectedModel);
    fd.append("speaker", selectedSpeaker);
    fd.append("pitch", pitch);
    fd.append("seconds", 10);
    try {
      const res = await fetch(`${API}/preview`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.url) {
        const t = {
          id: Date.now(),
          filename: data.filename,
          url: `${API}${data.url}`,
          speaker: data.speaker,
          duration: data.duration_sec,
          created: new Date().toLocaleTimeString(),
          preview: true,
          metadata: data.metadata || {},
        };
        setTracks(prev => [t, ...prev]);
        addLog(`[OK] Preview ready: ${data.filename} (${data.duration_sec}s, processed in ${data.processing_time_sec}s)`);
      }
    } catch (err) {
      addLog(`[ERR] Preview failed: ${err.message}`);
    } finally {
      setPreviewing(false);
    }
  };

  // Detect if file is long (>3min) → use streaming mode
  const isLongTrack = uploadedFile && uploadedFile.size > 15 * 1024 * 1024; // ~15MB ≈ 3min WAV

  const handleGenerate = async () => {
    if (!uploadedFile) { addLog("[ERR] No file uploaded"); return; }
    if (!selectedModel) { addLog("[ERR] No model selected — go to Models tab to add one"); return; }
    setGenerating(true);
    setProgress(2);
    setProgressLabel("Uploading...");

    const fd = new FormData();
    fd.append("file", uploadedFile);
    fd.append("model_id", selectedModel);
    fd.append("speaker", selectedSpeaker);
    fd.append("pitch", pitch);
    fd.append("slice_db", sliceDb);
    fd.append("noise_scale", noiseScale);
    fd.append("f0_predictor", f0Predictor);
    fd.append("auto_predict_f0", autoF0);
    fd.append("vocal_gain", vocalGain);
    fd.append("instrumental_gain", instrumentalGain);

    try {
      if (isLongTrack) {
        // ── STREAMING MODE for long tracks ──────────────────────────────────
        addLog(`[OK] Long track detected — streaming mode (segment-by-segment)`);
        fd.append("segment_minutes", "1.0");

        const res = await fetch(`${API}/process_cover_stream`, { method: "POST", body: fd });
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop(); // keep incomplete line

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const ev = JSON.parse(line.slice(6));
              if (ev.pct !== undefined) setProgress(ev.pct);
              if (ev.step) setProgressLabel(ev.step);
              if (ev.logs) ev.logs.forEach(l => addLog(l));

              if (ev.type === "segment") {
                // Add segment immediately for instant playback
                const seg = {
                  id: Date.now() + ev.segment_idx,
                  filename: ev.filename,
                  url: `${API}${ev.url}`,
                  duration: ev.duration_sec,
                  created: new Date().toLocaleTimeString(),
                  isSegment: true,
                  segIdx: ev.segment_idx,
                  speaker: selectedSpeaker,
                };
                setTracks(prev => [...prev, seg]);
                addLog(`[OK] Segment ${ev.segment_idx + 1}/${ev.total_segments} ready — play now!`);
              }

              if (ev.type === "done") {
                setProgress(100);
                setProgressLabel("All segments done!");
                addLog(`[OK] Full track complete: ${ev.total_segments} segments`);
              }

              if (ev.type === "error") throw new Error(ev.error);
            } catch (parseErr) { /* skip malformed */ }
          }
        }

      } else {
        // ── STANDARD or FULL PIPELINE MODE ──────────────────────────────────
        const endpoint = useFullPipeline ? "/process_cover_full" : "/process_cover";
        addLog(`[OK] Starting cover — ${useFullPipeline ? "Full Pipeline (AudioEngine)" : "Standard"} | model: ${selectedModel}`);

        if (useFullPipeline) {
          fd.append("gender_shift", genderShift);
          fd.append("style_shift", styleShift);
          fd.append("harmony_factor", harmonyFactor);
          fd.append("mastering_drive", masteringDrive);
        }

        const res = await fetch(`${API}${endpoint}`, { method: "POST", body: fd });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        // /process_cover and /process_cover_full run synchronously and return
        // the full result directly in the POST response. The job SSE stream is
        // only useful for live log tailing — we don't need to wait on it.
        setProgress(100);
        setProgressLabel("Done!");

        const meta = data.metadata || {};
        const t = {
          id: Date.now(),
          filename: data.filename,
          url: `${API}${data.url}`,
          speaker: data.speaker,
          duration: data.duration_sec,
          created: new Date().toLocaleTimeString(),
          metadata: meta,
        };
        setTracks(prev => [t, ...prev]);

        const timing = meta.timing || {};
        addLog(`[OK] Cover done: ${data.filename}`);
        addLog(`[OK] Duration: ${data.duration_sec}s | Size: ${meta.output_size_mb || "?"}MB`);
        if (timing.total_sec) addLog(`[OK] Time: demucs=${timing.demucs_sec}s | sovits=${timing.sovits_sec}s | total=${timing.total_sec}s`);
        if (meta.vram_used_gb) addLog(`[OK] VRAM: ${meta.vram_used_gb} GB`);
      }

    } catch (err) {
      addLog(`[ERR] Generation failed: ${err.message}`);
      setProgress(0);
    } finally {
      setTimeout(() => { setGenerating(false); setProgress(0); setProgressLabel(""); }, 1500);
    }
  };

  const S = {
    card: { background: "linear-gradient(135deg,#0d0d22 0%,#0a0a1a 100%)", border: "1px solid #1e1e3a", borderRadius: 12, padding: 16, marginBottom: 14 },
    label: { color: "#6666aa", fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10, display: "block" },
    sel: { background: "#0a0a1a", border: "1px solid #2a2a4a", color: "#e0e0ff", borderRadius: 8, padding: "7px 10px", fontSize: 13, width: "100%", cursor: "pointer" },
    btn: (bg, fg = "#000") => ({ background: bg, color: fg, border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }),
    badge: (color) => ({ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontFamily: "monospace" }),
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

      {/* LEFT COLUMN */}
      <div>

        {/* Upload */}
        <div style={S.card}>
          <span style={S.label}>🎵 Upload Song</span>
          <label style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
            background: "#0a0a1a", border: `1px dashed ${uploadedFile ? accentColor : "#2a2a4a"}`,
            borderRadius: 8, cursor: "pointer", transition: "border-color 0.2s",
          }}>
            <span style={{ fontSize: 18 }}>🎤</span>
            <div>
              <div style={{ color: uploadedFile ? accentColor : "#6666aa", fontSize: 13, fontWeight: 600 }}>
                {uploadedFile ? uploadedFile.name : "Click to upload audio file"}
              </div>
              <div style={{ color: "#444466", fontSize: 11 }}>WAV, MP3, FLAC — vocals will be separated automatically</div>
            </div>
            <input type="file" accept="audio/*" onChange={handleUpload} style={{ display: "none" }} />
          </label>
          {bpm && key && (
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <span style={S.badge(accentColor)}>♩ {bpm} BPM</span>
              <span style={S.badge(accentColor)}>🎵 Key: {key}</span>
            </div>
          )}
        </div>

        {/* Model Selection */}
        <div style={S.card}>
          <span style={S.label}>🤖 Voice Model</span>
          {models.length === 0 ? (
            <div style={{ color: "#e63946", fontSize: 12, padding: "8px 0" }}>
              ⚠ No models found. Go to the <strong style={{ color: "#ffd166" }}>Models</strong> tab to add a so-vits-svc model.
            </div>
          ) : (
            <>
              <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} style={{ ...S.sel, marginBottom: 8 }}>
                {models.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.size_mb} MB)</option>
                ))}
              </select>
              {speakers.length > 0 && (
                <>
                  <span style={{ ...S.label, marginTop: 4 }}>🎙 Speaker</span>
                  <select value={selectedSpeaker} onChange={e => setSelectedSpeaker(e.target.value)} style={S.sel}>
                    {speakers.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </>
              )}
            </>
          )}
        </div>

        {/* Voice Params */}
        <div style={S.card}>
          <span style={S.label}>🎚 Voice Parameters</span>
          <SliderRow label="Pitch Shift (semitones)" value={pitch} min={-12} max={12} step={1} onChange={setPitch} color={accentColor} unit=" st" />
          <SliderRow label="Noise Scale (expressiveness)" value={noiseScale} min={0.1} max={1.0} step={0.05} onChange={setNoiseScale} color="#7209b7" />
          <SliderRow label="Slice dB threshold" value={sliceDb} min={-60} max={-20} step={1} onChange={setSliceDb} color="#ffd166" unit=" dB" />

          <div style={{ marginBottom: 10 }}>
            <span style={{ color: "#8888aa", fontSize: 12, display: "block", marginBottom: 4 }}>F0 Predictor</span>
            <select value={f0Predictor} onChange={e => setF0Predictor(e.target.value)} style={S.sel}>
              <option value="pm">PM (fast)</option>
              <option value="harvest">Harvest (accurate)</option>
              <option value="dio">DIO</option>
              <option value="crepe">CREPE (best quality)</option>
              <option value="rmvpe">RMVPE (recommended)</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ color: "#8888aa", fontSize: 12, flex: 1 }}>Auto-predict F0 (no pitch shift)</span>
            <div onClick={() => setAutoF0(!autoF0)} style={{
              width: 36, height: 20, borderRadius: 10,
              background: autoF0 ? "#00e5ff" : "#1a1a2e",
              position: "relative", cursor: "pointer",
              border: `1px solid ${autoF0 ? "#00e5ff" : "#2a2a4a"}`,
            }}>
              <div style={{ position: "absolute", top: 2, left: autoF0 ? 17 : 2, width: 14, height: 14, borderRadius: "50%", background: autoF0 ? "#000" : "#444", transition: "left 0.2s" }} />
            </div>
          </div>
        </div>

        {/* Mix */}
        <div style={S.card}>
          <span style={S.label}>🎛 Mix Settings</span>
          <SliderRow label="Vocal Gain" value={vocalGain} min={0.0} max={2.0} step={0.05} onChange={setVocalGain} color="#06d6a0" />
          <SliderRow label="Instrumental Gain" value={instrumentalGain} min={0.0} max={2.0} step={0.05} onChange={setInstrumentalGain} color="#ffd166" />
        </div>

        {/* AudioEngine */}
        <div style={{ ...S.card, border: useFullPipeline ? "1px solid #7209b744" : "1px solid #1e1e3a" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: useFullPipeline ? 12 : 0 }}>
            <div>
              <span style={{ ...S.label, marginBottom: 2, color: useFullPipeline ? "#9b2de0" : "#6666aa" }}>🧠 AudioEngine</span>
              <span style={{ color: "#444466", fontSize: 10 }}>Morph → Harmony → Mastering</span>
            </div>
            <div onClick={() => setUseFullPipeline(!useFullPipeline)} style={{
              width: 40, height: 22, borderRadius: 11,
              background: useFullPipeline ? "#7209b7" : "#1a1a2e",
              position: "relative", cursor: "pointer",
              border: `1px solid ${useFullPipeline ? "#7209b7" : "#2a2a4a"}`,
              transition: "background 0.2s", flexShrink: 0,
            }}>
              <div style={{ position: "absolute", top: 3, left: useFullPipeline ? 20 : 3, width: 14, height: 14, borderRadius: "50%", background: useFullPipeline ? "#fff" : "#444", transition: "left 0.2s" }} />
            </div>
          </div>
          {useFullPipeline && (
            <div style={{ opacity: 1, transition: "opacity 0.2s" }}>
              <SliderRow label="Gender Shift (♀ ← 0 → ♂)" value={genderShift} min={-1.0} max={1.0} step={0.05} onChange={setGenderShift} color="#e63946" />
              <SliderRow label="Style Shift" value={styleShift} min={-1.0} max={1.0} step={0.05} onChange={setStyleShift} color="#ffd166" />
              <SliderRow label="Harmony Factor" value={harmonyFactor} min={0.5} max={2.0} step={0.05} onChange={setHarmonyFactor} color="#06d6a0" />
              <SliderRow label="Mastering Drive" value={masteringDrive} min={0.1} max={3.0} step={0.1} onChange={setMasteringDrive} color="#7209b7" />
              <div style={{ color: "#444466", fontSize: 10, marginTop: 4, padding: "6px 8px", background: "#0a0a1a", borderRadius: 6 }}>
                ⚡ Uses <span style={{ color: "#7209b7" }}>VocalForge AudioEngine</span> — adds Morph, Harmony layering, and Mastering (peak norm + tanh limiter) after voice conversion.
              </div>
            </div>
          )}
        </div>

      </div>

      {/* RIGHT COLUMN */}
      <div>

        {/* Generate Button */}
        <div style={S.card}>
          <button
            onClick={handleGenerate}
            disabled={generating || !uploadedFile || !selectedModel}
            className={!generating && uploadedFile && selectedModel ? "glow-btn" : ""}
            style={{
              width: "100%", padding: "16px 0", borderRadius: 10,
              background: generating ? "#1a1a2e" : (uploadedFile && selectedModel ? `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)` : "#1a1a2e"),
              color: "#000", fontWeight: 800, fontSize: 16, border: "none",
              cursor: (generating || !uploadedFile || !selectedModel) ? "not-allowed" : "pointer",
              letterSpacing: 1, transition: "all 0.2s",
              opacity: (!uploadedFile || !selectedModel) ? 0.5 : 1,
            }}>
            {generating ? `⚙ ${progressLabel || "Processing..."}` : "▶▶ Generate Cover ◀◀"}
          </button>

          {generating && (
            <div style={{ marginTop: 8 }}>
              <div style={{ height: 4, background: "#1a1a2e", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: 4, background: `linear-gradient(90deg, ${accentColor}, #fff)`, width: `${progress}%`, transition: "width 0.6s", borderRadius: 2 }} />
              </div>
              <div style={{ color: "#6666aa", fontSize: 11, marginTop: 4, textAlign: "center" }}>{progressLabel}</div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              onClick={handlePreview}
              disabled={previewing || !uploadedFile || !selectedModel}
              style={{
                ...S.btn("#1a1a3a", "#00e5ff"), flex: 1,
                border: "1px solid #00e5ff44",
                opacity: (!uploadedFile || !selectedModel || previewing) ? 0.5 : 1,
                cursor: (!uploadedFile || !selectedModel || previewing) ? "not-allowed" : "pointer",
              }}>
              {previewing ? "⏳ Processing..." : "⚡ Preview 10s"}
            </button>
          </div>
        </div>

        {/* Pipeline Info */}
        <div style={S.card}>
          <span style={S.label}>⚙ Pipeline {useFullPipeline && <span style={{ color: "#7209b7", fontSize: 10, marginLeft: 6 }}>+ AudioEngine</span>}</span>
          {[
            { icon: "🎵", label: "Step 1 — Vocal Separation", value: "Demucs htdemucs", color: "#06d6a0" },
            { icon: "🎙", label: "Step 2 — Voice Conversion", value: "so-vits-svc 4.1", color: "#00e5ff" },
            ...(useFullPipeline ? [
              { icon: "🧬", label: "Step 3 — Morph", value: `gender ${genderShift > 0 ? "+" : ""}${genderShift.toFixed(2)}`, color: "#e63946" },
              { icon: "🎶", label: "Step 4 — Harmony", value: `factor ${harmonyFactor.toFixed(2)}`, color: "#06d6a0" },
              { icon: "🔊", label: "Step 5 — Mastering", value: `drive ${masteringDrive.toFixed(1)}`, color: "#7209b7" },
              { icon: "🎛", label: "Step 6 — Mix", value: "vocals + instrumental", color: "#ffd166" },
            ] : [
              { icon: "🎛", label: "Step 3 — Mix", value: "vocals + instrumental", color: "#ffd166" },
            ]),
            { icon: "🤖", label: "Model", value: models.find(m => m.id === selectedModel)?.name || "—", color: "#8888ff" },
            { icon: "🎙", label: "Speaker", value: selectedSpeaker || "—", color: "#e63946" },
            { icon: "🎚", label: "Pitch", value: `${pitch > 0 ? "+" : ""}${pitch} st`, color: accentColor },
            { icon: "🔊", label: "F0 Predictor", value: f0Predictor, color: "#7209b7" },
            { icon: isLongTrack ? "📦" : "⚡", label: "Mode", value: isLongTrack ? "Streaming (segments)" : (useFullPipeline ? "Full Pipeline" : "Standard"), color: isLongTrack ? "#7209b7" : "#06d6a0" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid #0d0d22" }}>
              <span style={{ fontSize: 14, width: 20 }}>{item.icon}</span>
              <span style={{ color: "#8888aa", fontSize: 12, flex: 1 }}>{item.label}</span>
              <span style={{ color: item.color, fontSize: 12, fontFamily: "monospace", fontWeight: 700 }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* My Covers */}
        <div style={{ ...S.card, maxHeight: 380, overflowY: "auto" }}>
          <span style={S.label}>📁 My Covers ({tracks.length})</span>
          {tracks.length === 0 && (
            <div style={{ color: "#333355", fontSize: 12, textAlign: "center", padding: "20px 0" }}>
              No covers yet. Upload a song and generate!
            </div>
          )}
          {tracks.map(track => (
            <div key={track.id} style={{ background: "#0a0a1a", borderRadius: 8, padding: "10px 12px", marginBottom: 8, border: "1px solid #1a1a2e" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "#e0e0ff", fontSize: 12, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    🎵 {track.filename}
                  </div>
                  <div style={{ color: "#444466", fontSize: 10, marginTop: 2 }}>
                    {track.speaker && <span style={{ color: "#8888ff" }}>{track.speaker} · </span>}
                    {track.duration && <span>{track.duration}s · </span>}
                    {track.created}
                    {track.preview && <span style={{ color: "#00e5ff", marginLeft: 6 }}>PREVIEW</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
                  {track.url && (
                    <a href={track.url} download style={{ background: "#06d6a022", color: "#06d6a0", border: "1px solid #06d6a044", padding: "3px 8px", borderRadius: 5, fontSize: 11, textDecoration: "none", fontWeight: 700 }}>↓</a>
                  )}
                  <button
                    onClick={() => setTracks(prev => prev.filter(t => t.id !== track.id))}
                    style={{ background: "#e6394622", color: "#e63946", border: "1px solid #e6394644", padding: "3px 8px", borderRadius: 5, fontSize: 11, cursor: "pointer" }}>
                    ✕
                  </button>
                </div>
              </div>
              {track.url && (
                <audio controls src={track.url} style={{ width: "100%", marginTop: 8, height: 28 }} />
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
