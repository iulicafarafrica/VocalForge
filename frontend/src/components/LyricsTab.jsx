import { useState, useEffect } from "react";

const API = "http://localhost:8000";

const TTS_LANGS = [
  { code: "ro-RO", label: "🇷🇴 Romanian" },
  { code: "en-US", label: "🇺🇸 English (US)" },
  { code: "en-GB", label: "🇬🇧 English (UK)" },
  { code: "fr-FR", label: "🇫🇷 Français" },
  { code: "de-DE", label: "🇩🇪 Deutsch" },
  { code: "es-ES", label: "🇪🇸 Español" },
  { code: "it-IT", label: "🇮🇹 Italiano" },
  { code: "ja-JP", label: "🇯🇵 日本語" },
];

export default function LyricsTab({ addLog, tracks, setTracks }) {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [bpm, setBpm] = useState(null);
  const [songKey, setSongKey] = useState(null);
  const [lyrics, setLyrics] = useState("");
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [speakers, setSpeakers] = useState([]);
  const [selectedSpeaker, setSelectedSpeaker] = useState("");

  // Voice params
  const [pitch, setPitch] = useState(0);
  const [noiseScale, setNoiseScale] = useState(0.4);
  const [f0Predictor, setF0Predictor] = useState("pm");
  const [vocalGain, setVocalGain] = useState(1.4);
  const [instrumentalGain, setInstrumentalGain] = useState(0.85);
  const [ttsLang, setTtsLang] = useState("ro-RO");
  const [ttsRate, setTtsRate] = useState("+0%");
  const [timeStretch, setTimeStretch] = useState(true);
  const [reverbMix, setReverbMix] = useState(0.15);

  // Enable/disable toggles for mix settings
  const [pitchEnabled, setPitchEnabled] = useState(true);
  const [vocalGainEnabled, setVocalGainEnabled] = useState(true);
  const [instrumentalGainEnabled, setInstrumentalGainEnabled] = useState(true);
  const [reverbMixEnabled, setReverbMixEnabled] = useState(true);

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetch(`${API}/list_models`).then(r => r.json()).then(data => {
      setModels(data);
      if (data.length > 0) setSelectedModel(data[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedModel) return;
    fetch(`${API}/speakers/${selectedModel}`).then(r => r.json()).then(data => {
      if (data.speakers?.length > 0) { setSpeakers(data.speakers); setSelectedSpeaker(data.speakers[0]); }
    }).catch(() => {});
  }, [selectedModel]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFile(file);
    setResult(null);
    addLog(`[OK] Song Studio: uploaded ${file.name}`);
    // Auto-detect BPM/Key
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${API}/detect_bpm_key`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.bpm) { setBpm(data.bpm); setSongKey(data.key); addLog(`[OK] BPM: ${data.bpm} · Key: ${data.key}`); }
    } catch {}
  };

  const wordCount = lyrics.trim() ? lyrics.trim().split(/\s+/).length : 0;
  const canGenerate = uploadedFile && lyrics.trim() && selectedModel;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setProcessing(true);
    setProgress(5);
    setProgressLabel("Starting...");
    setResult(null);

    const fd = new FormData();
    fd.append("file", uploadedFile);
    fd.append("model_id", selectedModel);
    fd.append("speaker", selectedSpeaker);
    fd.append("lyrics", lyrics);
    fd.append("pitch", pitch);
    fd.append("noise_scale", noiseScale);
    fd.append("f0_predictor", f0Predictor);
    fd.append("vocal_gain", vocalGain);
    fd.append("instrumental_gain", instrumentalGain);
    fd.append("tts_lang", ttsLang);
    fd.append("tts_rate", ttsRate);
    fd.append("time_stretch", timeStretch);
    fd.append("reverb_mix", reverbMix);

    const steps = [
      { pct: 10, label: "🎵 Removing original vocals (Demucs)..." },
      { pct: 35, label: "🗣 Synthesizing your lyrics (Edge-TTS)..." },
      { pct: 60, label: "🎙 Converting voice (so-vits-svc)..." },
      { pct: 85, label: "🎛 Blending vocals with instrumental..." },
    ];
    let stepIdx = 0;
    const stepTimer = setInterval(() => {
      if (stepIdx < steps.length) {
        setProgress(steps[stepIdx].pct);
        setProgressLabel(steps[stepIdx].label);
        addLog(`[OK] ${steps[stepIdx].label}`);
        stepIdx++;
      }
    }, 3000);

    try {
      const res = await fetch(`${API}/lyrics_cover`, { method: "POST", body: fd });
      clearInterval(stepTimer);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const t = {
        id: Date.now(),
        filename: data.filename,
        url: `${API}${data.url}`,
        speaker: data.speaker,
        duration: data.duration_sec,
        created: new Date().toLocaleTimeString(),
        isLyricsCover: true,
        metadata: data.metadata || {},
      };
      setTracks(prev => [t, ...prev]);
      setResult(t);
      setProgress(100);
      setProgressLabel("✅ Done!");

      const timing = data.metadata?.timing || {};
      addLog(`[OK] Song Studio done: ${data.filename} (${data.duration_sec}s)`);
      if (timing.total_sec) addLog(`[OK] demucs=${timing.demucs_sec}s | tts=${timing.tts_sec}s | sovits=${timing.sovits_sec}s | blend=${timing.blend_sec}s | total=${timing.total_sec}s`);

    } catch (err) {
      clearInterval(stepTimer);
      addLog(`[ERR] Song Studio failed: ${err.message}`);
      setProgress(0);
    } finally {
      setTimeout(() => { setProcessing(false); setProgress(0); setProgressLabel(""); }, 2000);
    }
  };

  const S = {
    card: { background: "linear-gradient(135deg,#0d0d22,#0a0a1a)", border: "1px solid #1e1e3a", borderRadius: 12, padding: 18, marginBottom: 14 },
    label: { color: "#6666aa", fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, display: "block" },
    sel: { background: "#0a0a1a", border: "1px solid #2a2a4a", color: "#e0e0ff", borderRadius: 8, padding: "7px 10px", fontSize: 13, width: "100%", cursor: "pointer" },
    toggle: (on, color) => ({
      width: 36, height: 20, borderRadius: 10,
      background: on ? color : "#1a1a2e",
      position: "relative", cursor: "pointer",
      border: `1px solid ${on ? color : "#2a2a4a"}`,
      flexShrink: 0, transition: "background 0.2s",
    }),
    toggleDot: (on) => ({
      position: "absolute", top: 2, left: on ? 17 : 2,
      width: 14, height: 14, borderRadius: "50%",
      background: on ? "#fff" : "#444", transition: "left 0.2s",
    }),
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>

      {/* ── Header ── */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 6 }}>🎤</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#e0e0ff", marginBottom: 4, letterSpacing: 1 }}>Song Studio</div>
        <div style={{ color: "#444466", fontSize: 13 }}>
          Upload a song → write your lyrics → AI removes original vocals and sings yours
        </div>
      </div>

      {/* ── Main grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* LEFT */}
        <div>

          {/* Step 1: Upload */}
          <div style={{ ...S.card, border: uploadedFile ? "1px solid #7209b744" : "1px solid #1e1e3a" }}>
            <span style={S.label}>① Upload Song / Beat</span>
            <label style={{
              display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
              background: "#080812", border: `2px dashed ${uploadedFile ? "#7209b7" : "#2a2a4a"}`,
              borderRadius: 10, cursor: "pointer", transition: "border-color 0.2s",
            }}>
              <span style={{ fontSize: 28 }}>{uploadedFile ? "🎵" : "📂"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: uploadedFile ? "#9b2de0" : "#6666aa", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {uploadedFile ? uploadedFile.name : "Click to upload audio file"}
                </div>
                <div style={{ color: "#333355", fontSize: 11, marginTop: 2 }}>
                  WAV · MP3 · FLAC — original vocals will be removed automatically
                </div>
              </div>
              <input type="file" accept="audio/*" onChange={handleUpload} style={{ display: "none" }} />
            </label>
            {bpm && songKey && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <span style={{ background: "#7209b722", color: "#9b2de0", border: "1px solid #7209b744", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontFamily: "monospace" }}>♩ {bpm} BPM</span>
                <span style={{ background: "#7209b722", color: "#9b2de0", border: "1px solid #7209b744", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontFamily: "monospace" }}>🎵 Key: {songKey}</span>
              </div>
            )}
          </div>

          {/* Step 2: Lyrics */}
          <div style={{ ...S.card, border: lyrics.trim() ? "1px solid #00e5ff44" : "1px solid #1e1e3a" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={S.label}>② Your Lyrics</span>
              <span style={{ color: "#333355", fontSize: 10, fontFamily: "monospace" }}>{wordCount} words</span>
            </div>
            <textarea
              value={lyrics}
              onChange={e => setLyrics(e.target.value)}
              placeholder={"Write your lyrics here...\n\nExample:\nI want to fly high in the clouds\nTo touch the sky with my hand\nTo sing for all the ones I love\nUnder the morning light..."}
              style={{
                width: "100%", minHeight: 180, background: "#080812",
                border: "1px solid #2a2a4a", borderRadius: 8,
                color: "#e0e0ff", fontSize: 13, fontFamily: "monospace",
                padding: "12px", resize: "vertical", outline: "none", lineHeight: 1.7,
                boxSizing: "border-box",
              }}
              onFocus={e => e.target.style.borderColor = "#00e5ff"}
              onBlur={e => e.target.style.borderColor = "#2a2a4a"}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button onClick={() => setLyrics("")} style={{ background: "#e6394611", color: "#e63946", border: "1px solid #e6394633", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>🗑 Clear</button>
              <select value={ttsLang} onChange={e => setTtsLang(e.target.value)} style={{ ...S.sel, flex: 1, padding: "4px 8px", fontSize: 11 }}>
                {TTS_LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
              <select value={ttsRate} onChange={e => setTtsRate(e.target.value)} style={{ ...S.sel, width: 90, padding: "4px 8px", fontSize: 11 }}>
                <option value="-30%">Slow</option>
                <option value="-15%">Slower</option>
                <option value="+0%">Normal</option>
                <option value="+15%">Faster</option>
                <option value="+30%">Fast</option>
              </select>
            </div>
          </div>

          {/* Step 3: Voice Model */}
          <div style={S.card}>
            <span style={S.label}>③ Voice Model</span>
            {models.length === 0 ? (
              <div style={{ color: "#e63946", fontSize: 12 }}>⚠ No models. Go to Models tab.</div>
            ) : (
              <>
                <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} style={{ ...S.sel, marginBottom: 8 }}>
                  {models.map(m => <option key={m.id} value={m.id}>{m.name} ({m.size_mb}MB)</option>)}
                </select>
                {speakers.length > 0 && (
                  <select value={selectedSpeaker} onChange={e => setSelectedSpeaker(e.target.value)} style={S.sel}>
                    {speakers.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
              </>
            )}
          </div>

        </div>

        {/* RIGHT */}
        <div>

          {/* Mix Settings */}
          <div style={S.card}>
            <span style={S.label}>🎚 Mix & Voice Settings</span>

            {[
              { label: "Pitch Shift", value: pitch, min: -12, max: 12, step: 1, onChange: setPitch, color: "#00e5ff", unit: " st", enabled: pitchEnabled, setEnabled: setPitchEnabled },
              { label: "Vocal Gain", value: vocalGain, min: 0.0, max: 2.0, step: 0.05, onChange: setVocalGain, color: "#06d6a0", enabled: vocalGainEnabled, setEnabled: setVocalGainEnabled },
              { label: "Instrumental Gain", value: instrumentalGain, min: 0.0, max: 2.0, step: 0.05, onChange: setInstrumentalGain, color: "#ffd166", enabled: instrumentalGainEnabled, setEnabled: setInstrumentalGainEnabled },
              { label: "Reverb Mix", value: reverbMix, min: 0.0, max: 0.5, step: 0.05, onChange: setReverbMix, color: "#7209b7", enabled: reverbMixEnabled, setEnabled: setReverbMixEnabled },
            ].map(({ label, value, min, max, step, onChange, color, unit = "", enabled, setEnabled }) => (
              <div key={label} style={{ marginBottom: 10, opacity: enabled ? 1 : 0.45, transition: "opacity 0.2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {/* Enable/Disable toggle */}
                    <div onClick={() => setEnabled(!enabled)} style={{
                      width: 32, height: 18, borderRadius: 9,
                      background: enabled ? color : "#1a1a2e",
                      position: "relative", cursor: "pointer",
                      border: `1px solid ${enabled ? color : "#2a2a4a"}`,
                      flexShrink: 0, transition: "background 0.2s",
                    }}>
                      <div style={{
                        position: "absolute", top: 2, left: enabled ? 14 : 2,
                        width: 12, height: 12, borderRadius: "50%",
                        background: enabled ? "#000" : "#444", transition: "left 0.2s",
                      }} />
                    </div>
                    <span style={{ color: enabled ? "#aaaacc" : "#444466", fontSize: 12 }}>{label}</span>
                  </div>
                  <span style={{ color: enabled ? color : "#333355", fontSize: 12, fontFamily: "monospace", fontWeight: 700 }}>
                    {step < 1 ? value.toFixed(2) : value}{unit}
                  </span>
                </div>
                <input type="range" min={min} max={max} step={step} value={value}
                  onChange={e => onChange(Number(e.target.value))}
                  disabled={!enabled}
                  style={{ width: "100%", accentColor: color, cursor: enabled ? "pointer" : "not-allowed" }} />
              </div>
            ))}

            {/* Time Stretch toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid #1a1a2e", marginTop: 4 }}>
              <div>
                <div style={{ color: "#e0e0ff", fontSize: 12, fontWeight: 600 }}>⏱ Auto Time-Stretch</div>
                <div style={{ color: "#444466", fontSize: 10 }}>Stretch vocals to match song duration</div>
              </div>
              <div onClick={() => setTimeStretch(!timeStretch)} style={S.toggle(timeStretch, "#06d6a0")}>
                <div style={S.toggleDot(timeStretch)} />
              </div>
            </div>

            {/* F0 Predictor */}
            <div style={{ marginTop: 8 }}>
              <span style={{ color: "#8888aa", fontSize: 12, display: "block", marginBottom: 4 }}>F0 Predictor</span>
              <select value={f0Predictor} onChange={e => setF0Predictor(e.target.value)} style={S.sel}>
                <option value="pm">PM (fast)</option>
                <option value="harvest">Harvest (accurate)</option>
                <option value="rmvpe">RMVPE (recommended)</option>
                <option value="crepe">CREPE (best quality)</option>
              </select>
            </div>
          </div>

          {/* Generate Button */}
          <div style={S.card}>
            <button
              onClick={handleGenerate}
              disabled={processing || !canGenerate}
              style={{
                width: "100%", padding: "18px 0", borderRadius: 10,
                background: processing ? "#1a1a2e" : (canGenerate
                  ? "linear-gradient(135deg, #7209b7, #00e5ff)"
                  : "#1a1a2e"),
                color: canGenerate ? "#fff" : "#333355",
                fontWeight: 900, fontSize: 17, border: "none",
                cursor: (processing || !canGenerate) ? "not-allowed" : "pointer",
                opacity: !canGenerate ? 0.5 : 1,
                letterSpacing: 1,
                boxShadow: canGenerate && !processing ? "0 0 20px #7209b744" : "none",
              }}>
              {processing ? `⚙ ${progressLabel || "Processing..."}` : "🎤 Generate My Song"}
            </button>

            {processing && (
              <div style={{ marginTop: 10 }}>
                <div style={{ height: 6, background: "#1a1a2e", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: 6, background: "linear-gradient(90deg, #7209b7, #00e5ff)", width: `${progress}%`, transition: "width 0.8s", borderRadius: 3 }} />
                </div>
                <div style={{ color: "#6666aa", fontSize: 11, marginTop: 6, textAlign: "center" }}>{progressLabel}</div>
              </div>
            )}

            {/* Requirements */}
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                { ok: !!uploadedFile, label: uploadedFile ? `✅ Song: ${uploadedFile.name}` : "❌ Upload a song first" },
                { ok: lyrics.trim().length > 0, label: lyrics.trim() ? `✅ Lyrics: ${wordCount} words` : "❌ Write your lyrics" },
                { ok: !!selectedModel, label: selectedModel ? `✅ Model: ${models.find(m => m.id === selectedModel)?.name || selectedModel}` : "❌ Select a voice model" },
              ].map((req, i) => (
                <div key={i} style={{ color: req.ok ? "#06d6a0" : "#e63946", fontSize: 11, fontFamily: "monospace" }}>{req.label}</div>
              ))}
            </div>
          </div>

          {/* Pipeline visualization */}
          <div style={{ ...S.card, background: "#080812" }}>
            <span style={S.label}>⚙ Pipeline</span>
            {[
              { icon: "🎵", step: "1", label: "Remove original vocals", detail: "Demucs htdemucs AI", color: "#06d6a0" },
              { icon: "🗣", step: "2", label: "Synthesize your lyrics", detail: `Edge-TTS · ${TTS_LANGS.find(l => l.code === ttsLang)?.label}`, color: "#ffd166" },
              { icon: "🎙", step: "3", label: "Convert to AI voice", detail: `so-vits-svc · ${selectedSpeaker || "auto"}`, color: "#00e5ff" },
              { icon: "⏱", step: "4", label: "Time-stretch to song", detail: timeStretch ? "Auto-align enabled" : "Disabled", color: timeStretch ? "#06d6a0" : "#444466" },
              { icon: "🎛", step: "5", label: "Mix + Reverb blend", detail: `reverb=${reverbMix.toFixed(2)} · vocal=${vocalGain.toFixed(2)}`, color: "#7209b7" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < 4 ? "1px solid #0d0d1a" : "none" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: item.color + "22", border: `1px solid ${item.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: item.color, fontWeight: 700, flexShrink: 0 }}>{item.step}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#c0c0e0", fontSize: 12 }}>{item.label}</div>
                  <div style={{ color: item.color, fontSize: 10, fontFamily: "monospace" }}>{item.detail}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Result */}
          {result && (
            <div style={{ ...S.card, border: "1px solid #06d6a044", background: "#06d6a011" }}>
              <span style={{ ...S.label, color: "#06d6a0" }}>✅ Your Song is Ready!</span>
              <div style={{ color: "#06d6a0", fontSize: 12, fontFamily: "monospace", marginBottom: 8 }}>🎤 {result.filename}</div>
              <audio controls src={result.url} style={{ width: "100%", marginBottom: 8 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <a href={result.url} download style={{ flex: 1, textAlign: "center", background: "#06d6a022", color: "#06d6a0", border: "1px solid #06d6a044", padding: "8px", borderRadius: 8, fontSize: 13, textDecoration: "none", fontWeight: 700 }}>⬇ Download</a>
                <button onClick={() => setResult(null)} style={{ background: "#e6394611", color: "#e63946", border: "1px solid #e6394633", padding: "8px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>✕</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
