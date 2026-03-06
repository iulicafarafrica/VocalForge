/**
 * RVC Voice Conversion Component
 * Convert vocals using trained RVC voice models
 */

import { useState, useRef, useEffect } from "react";

const API = "http://localhost:8000";

export default function RVCConversion({ addLog, tracks, setTracks }) {
  const [vocalFile, setVocalFile] = useState(null);
  const [vocalUrl, setVocalUrl] = useState(null);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [pitchShift, setPitchShift] = useState(0);
  const [emotion, setEmotion] = useState("neutral");
  const [f0Method, setF0Method] = useState("rmvpe");
  const [indexRate, setIndexRate] = useState(0.75);
  const [dryWet, setDryWet] = useState(1.0);
  const [formantShift, setFormantShift] = useState(0.0);
  const [autoTune, setAutoTune] = useState(false);
  const [converting, setConverting] = useState(false);

  // Vocal separator state
  const [fullSongFile, setFullSongFile] = useState(null);
  const [separateModel, setSeparateModel] = useState("bs_roformer");
  const [separating, setSeparating] = useState(false);
  const [separatedVocals, setSeparatedVocals] = useState(null);
  const [separatedInstrumental, setSeparatedInstrumental] = useState(null);

  // Mix state
  const [mixing, setMixing] = useState(false);
  const [mixResult, setMixResult] = useState(null);
  const [vocalsVolume, setVocalsVolume] = useState(1.0);
  const [instrumentalVolume, setInstrumentalVolume] = useState(1.0);

  // Presets state
  const [presets, setPresets] = useState({});
  const [presetName, setPresetName] = useState("");
  const [showPresets, setShowPresets] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState("separate");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  // Load available models and presets on mount
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
        if (data.models && data.models.length > 0) {
          setSelectedModel(data.models[0].name);
          addLog(`🎤 RVC: ${data.models.length} model(e) disponibile`);
        }
      }
    } catch (err) {
      console.error("Failed to load RVC models:", err);
      addLog(`[ERR] RVC: Nu s-au putut încărca modelele`);
    }
  };

  const loadPresets = async () => {
    try {
      const res = await fetch(`${API}/rvc/presets`);
      const data = await res.json();
      if (data.status === "ok") setPresets(data.presets || {});
    } catch (err) { console.error("Failed to load presets:", err); }
  };

  const savePreset = async () => {
    if (!presetName.trim()) return;
    const fd = new FormData();
    fd.append("name", presetName);
    fd.append("model_name", selectedModel);
    fd.append("pitch_shift", pitchShift.toString());
    fd.append("emotion", emotion);
    fd.append("f0_method", f0Method);
    fd.append("index_rate", indexRate.toString());
    fd.append("filter_radius", "3");
    fd.append("rms_mix_rate", "0.25");
    fd.append("protect", "0.33");
    fd.append("dry_wet", dryWet.toString());
    fd.append("formant_shift", formantShift.toString());
    fd.append("auto_tune", autoTune.toString());
    const res = await fetch(`${API}/rvc/presets/save`, { method: "POST", body: fd });
    const data = await res.json();
    if (data.status === "ok") { setPresets(data.presets); setPresetName(""); addLog(`💾 Preset salvat: ${presetName}`); }
  };

  const loadPreset = (name) => {
    const p = presets[name];
    if (!p) return;
    if (p.model_name) setSelectedModel(p.model_name);
    setPitchShift(p.pitch_shift ?? 0);
    setEmotion(p.emotion ?? "neutral");
    setF0Method(p.f0_method ?? "rmvpe");
    setIndexRate(p.index_rate ?? 0.75);
    setDryWet(p.dry_wet ?? 1.0);
    setFormantShift(p.formant_shift ?? 0.0);
    setAutoTune(p.auto_tune ?? false);
    addLog(`✅ Preset încărcat: ${name}`);
  };

  const deletePreset = async (name) => {
    await fetch(`${API}/rvc/presets/${encodeURIComponent(name)}`, { method: "DELETE" });
    loadPresets();
  };

  const handleSeparate = async () => {
    if (!fullSongFile) return;
    setSeparating(true);
    setSeparatedVocals(null);
    setSeparatedInstrumental(null);
    addLog(`🎵 Separare vocale: ${fullSongFile.name} (${separateModel})`);
    const fd = new FormData();
    fd.append("audio_file", fullSongFile);
    fd.append("model", separateModel);
    try {
      const res = await fetch(`${API}/rvc/separate`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.status !== "ok") throw new Error(data.error);
      setSeparatedVocals({ url: `${API}${data.vocals_url}`, filename: data.vocals_filename });
      if (data.instrumental_url) setSeparatedInstrumental({ url: `${API}${data.instrumental_url}`, filename: data.instrumental_filename });
      addLog(`✅ Separare completă: ${data.vocals_filename}`);
    } catch (err) {
      addLog(`[ERR] Separare: ${err.message}`);
    } finally {
      setSeparating(false);
    }
  };

  const handleMix = async () => {
    if (!result || !separatedInstrumental) return;
    setMixing(true);
    addLog(`🎚 Mixare voce + instrumental...`);
    try {
      // Fetch both files as blobs
      const [vocBlob, instBlob] = await Promise.all([
        fetch(`${API}${result.url}`).then(r => r.blob()),
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
      addLog(`✅ Mix final: ${data.filename} (${data.duration_sec}s)`);
    } catch (err) {
      addLog(`[ERR] Mix: ${err.message}`);
    } finally {
      setMixing(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVocalFile(file);
      setVocalUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const handleConvert = async () => {
    if (!vocalFile) {
      setError("Please upload a vocal file first");
      return;
    }

    if (!selectedModel) {
      setError("Please select an RVC model");
      return;
    }

    setConverting(true);
    setError(null);
    setResult(null);
    setProgress(10);

    addLog(`🎤 RVC Conversion: ${vocalFile.name}`);
    addLog(`   Model: ${selectedModel}`);
    addLog(`   Pitch: ${pitchShift > 0 ? "+" : ""}${pitchShift}, Emotion: ${emotion}`);

    const fd = new FormData();
    fd.append("vocal_file", vocalFile);
    fd.append("model_name", selectedModel);
    fd.append("pitch_shift", pitchShift.toString());
    fd.append("emotion", emotion);
    fd.append("f0_method", f0Method);
    fd.append("index_rate", indexRate.toString());
    fd.append("filter_radius", "3");
    fd.append("rms_mix_rate", "0.25");
    fd.append("protect", "0.33");
    fd.append("output_format", "mp3");
    fd.append("dry_wet", dryWet.toString());
    fd.append("formant_shift", formantShift.toString());
    fd.append("auto_tune", autoTune.toString());

    const progressTimer = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 1000);

    try {
      const res = await fetch(`${API}/rvc/convert`, {
        method: "POST",
        body: fd,
      });

      clearInterval(progressTimer);

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const track = {
        id: Date.now(),
        filename: data.filename,
        url: `${API}${data.url}`,
        duration: data.duration_sec,
        created: new Date().toLocaleTimeString(),
        isRVC: true,
        metadata: {
          original_file: vocalFile.name,
          model: selectedModel,
          pitch_shift: pitchShift,
          emotion: emotion,
          f0_method: f0Method,
        },
      };

      setTracks(prev => [track, ...prev]);
      setResult(data);
      setProgress(100);
      addLog(`[OK] RVC converted: ${data.filename} (${data.duration_sec}s)`);

    } catch (err) {
      setError(err.message);
      addLog(`[ERR] RVC: ${err.message}`);
      setProgress(0);
    } finally {
      setConverting(false);
    }
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
    grid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
    },
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }} className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{
          fontSize: 24, fontWeight: 800,
          background: "linear-gradient(135deg, #ff6b9d, #ff8fab)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 12,
        }}>🎤 RVC Voice Conversion</h2>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[["separate","✂️ Separate"],["convert","🎤 Convert"],["mix","🎚 Mix"],["presets","💾 Presets"]].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              background: activeTab === id ? "linear-gradient(135deg,#ff6b9d,#ff8fab)" : "#1a1a2e",
              color: activeTab === id ? "#fff" : "#6666aa",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Upload Vocal */}
      <div style={S.card}>
        <span style={S.label}>🎤 Step 1: Upload Vocal Track</span>
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: vocalFile ? "2px solid #ff6b9d" : "2px dashed #2a2a4a",
            borderRadius: 12,
            padding: 24,
            textAlign: "center",
            cursor: "pointer",
            background: vocalFile ? "#ff6b9d11" : "transparent",
            transition: "all 0.2s",
          }}
        >
          {vocalFile ? (
            <div>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎤</div>
              <div style={{ color: "#ff6b9d", fontWeight: 600, marginBottom: 4 }}>
                {vocalFile.name}
              </div>
              <div style={{ color: "#444466", fontSize: 12 }}>
                {(vocalFile.size / 1024 / 1024).toFixed(2)} MB · Click to change
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
              <div style={{ color: "#6666aa", marginBottom: 4 }}>
                Click to upload vocal track
              </div>
              <div style={{ color: "#444466", fontSize: 12 }}>
                WAV, MP3, FLAC supported
              </div>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        {vocalUrl && (
          <audio controls src={vocalUrl} style={{ width: "100%", marginTop: 12 }} />
        )}
      </div>

      {/* Model Selection */}
      <div style={S.card}>
        <span style={S.label}>🧠 Step 2: Select RVC Model</span>
        {models.length > 0 ? (
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            style={{ ...S.input, fontFamily: "monospace" }}
          >
            {models.map((model) => (
              <option key={model.name} value={model.name}>
                {model.name} ({model.size_mb} MB)
              </option>
            ))}
          </select>
        ) : (
          <div style={{ color: "#ff6b9d", fontSize: 13 }}>
            ⚠️ No RVC models found. Place .pth files in:
            <div style={{ 
              background: "#1a1a2e", 
              padding: "8px 12px", 
              borderRadius: 6, 
              marginTop: 8,
              fontFamily: "monospace",
              fontSize: 11,
            }}>
              D:\VocalForge\RVCWebUI\assets\weights\
            </div>
          </div>
        )}
      </div>

      {/* Pitch & Emotion */}
      <div style={S.grid}>
        <div style={S.card}>
          <span style={S.label}>🎚 Pitch Shift (semitones)</span>
          <input
            type="number"
            min="-12"
            max="12"
            step="1"
            value={pitchShift}
            onChange={(e) => setPitchShift(parseInt(e.target.value) || 0)}
            style={S.input}
          />
          <div style={{ color: "#6666aa", fontSize: 10, marginTop: 6 }}>
            Range: -12 to +12
          </div>
        </div>

        <div style={S.card}>
          <span style={S.label}>😊 Emotion</span>
          <select
            value={emotion}
            onChange={(e) => setEmotion(e.target.value)}
            style={S.input}
          >
            <option value="neutral">😐 Neutral</option>
            <option value="happy">😊 Happy</option>
            <option value="sad">😢 Sad</option>
            <option value="angry">😠 Angry</option>
            <option value="fearful">😨 Fearful</option>
            <option value="calm">😌 Calm</option>
          </select>
        </div>
      </div>

      {/* Advanced Settings */}
      <div style={S.card}>
        <span style={S.label}>⚙️ Advanced Settings</span>
        <div style={S.grid}>
          <div>
            <span style={{ color: "#6666aa", fontSize: 11, display: "block", marginBottom: 6 }}>
              F0 Method
            </span>
            <select
              value={f0Method}
              onChange={(e) => setF0Method(e.target.value)}
              style={{ ...S.input, fontSize: 13 }}
            >
              <option value="rmvpe">RMVPE (best quality)</option>
              <option value="crepe">CREPE (GPU)</option>
              <option value="harvest">Harvest</option>
              <option value="pm">PM (fast)</option>
            </select>
          </div>
          <div>
            <span style={{ color: "#6666aa", fontSize: 11, display: "block", marginBottom: 6 }}>
              Index Rate
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={indexRate}
              onChange={(e) => setIndexRate(parseFloat(e.target.value))}
              style={{ width: "100%" }}
            />
            <div style={{ color: "#6666aa", fontSize: 10, marginTop: 4 }}>
              {Math.round(indexRate * 100)}% retrieval
            </div>
          </div>
        </div>
      </div>

      {/* New Features: Dry/Wet, Formant, AutoTune */}
      <div style={S.card}>
        <span style={S.label}>✨ Funcții Avansate</span>
        <div style={S.grid}>
          <div>
            <span style={{ color: "#6666aa", fontSize: 11, display: "block", marginBottom: 6 }}>
              💧 Dry/Wet Mix ({Math.round(dryWet * 100)}% converted)
            </span>
            <input
              type="range" min="0" max="1" step="0.05"
              value={dryWet}
              onChange={(e) => setDryWet(parseFloat(e.target.value))}
              style={{ width: "100%" }}
            />
            <div style={{ color: "#444466", fontSize: 10, marginTop: 4, display: "flex", justifyContent: "space-between" }}>
              <span>0% = Original</span><span>100% = Converted</span>
            </div>
          </div>
          <div>
            <span style={{ color: "#6666aa", fontSize: 11, display: "block", marginBottom: 6 }}>
              🎵 Formant Shift ({formantShift > 0 ? "+" : ""}{formantShift} semitones)
            </span>
            <input
              type="range" min="-6" max="6" step="0.5"
              value={formantShift}
              onChange={(e) => setFormantShift(parseFloat(e.target.value))}
              style={{ width: "100%" }}
            />
            <div style={{ color: "#444466", fontSize: 10, marginTop: 4, display: "flex", justifyContent: "space-between" }}>
              <span>-6 (bas)</span><span>+6 (înalt)</span>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <div
              onClick={() => setAutoTune(!autoTune)}
              style={{
                width: 40, height: 22, borderRadius: 11,
                background: autoTune ? "#ff6b9d" : "#2a2a4a",
                position: "relative", transition: "background 0.2s", cursor: "pointer",
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: "50%", background: "#fff",
                position: "absolute", top: 2,
                left: autoTune ? 20 : 2,
                transition: "left 0.2s",
              }} />
            </div>
            <span style={{ color: "#a0a0cc", fontSize: 13 }}>
              🎯 Auto-Tune — corectează automat notele false după conversie
            </span>
          </label>
        </div>
      </div>

      {/* Convert Button */}
      <button
        onClick={handleConvert}
        disabled={converting || !vocalFile || !selectedModel}
        style={{
          width: "100%",
          ...S.btn,
          opacity: converting || !vocalFile || !selectedModel ? 0.5 : 1,
          cursor: converting || !vocalFile || !selectedModel ? "not-allowed" : "pointer",
          marginBottom: 16,
        }}
      >
        {converting ? `⏳ Converting... (${progress}%)` : "🎤 Convert Voice"}
      </button>

      {/* Progress */}
      {converting && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: "#6666aa", fontSize: 12, marginBottom: 6 }}>
            {progress < 100 ? "Processing..." : "Done!"}
          </div>
          <div style={{
            background: "#1a1a2e",
            borderRadius: 8,
            height: 8,
            overflow: "hidden",
          }}>
            <div style={{
              background: `linear-gradient(90deg, #ff6b9d, #ff8fab)`,
              height: "100%",
              width: `${progress}%`,
              transition: "width 0.3s",
            }} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          ...S.card,
          borderColor: "#e63946",
          background: "rgba(230,57,70,0.08)",
        }}>
          <span style={{ color: "#e63946", fontSize: 12 }}>❌ {error}</span>
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ ...S.card, borderLeft: "4px solid #ff6b9d" }}>
          <span style={{ ...S.label, color: "#ff6b9d" }}>✅ Conversion Complete!</span>
          <div style={{ color: "#a0a0cc", fontSize: 13, marginBottom: 12 }}>
            <div style={{ marginBottom: 4 }}>🎵 <strong>{result.filename}</strong></div>
            <div style={{ marginBottom: 4 }}>⏱ Duration: {result.duration_sec}s</div>
            <div style={{ marginBottom: 4 }}>🧠 Model: {result.model_used}</div>
            <div style={{ marginBottom: 4 }}>
              🎚 Pitch: <strong>{result.pitch_shift > 0 ? "+" : ""}{result.pitch_shift}</strong>
              {result.emotion && result.emotion !== "neutral" && ` (${result.emotion})`}
            </div>
          </div>
          <audio controls src={`${API}${result.url}`} style={{ width: "100%", marginBottom: 12 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <a
              href={`${API}${result.url}`}
              download={result.filename}
              style={{
                flex: 1,
                textAlign: "center",
                background: "#ff6b9d22",
                color: "#ff6b9d",
                border: "1px solid #ff6b9d44",
                padding: "10px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              ⬇ Download
            </a>
            <button
              onClick={() => setResult(null)}
              style={{
                background: "#e6394622",
                color: "#e63946",
                border: "1px solid #e6394644",
                padding: "10px 16px",
                borderRadius: 8,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}

      {/* ── SEPARATE TAB ── */}
      {activeTab === "separate" && (
        <div>
          <div style={S.card}>
            <span style={S.label}>🎵 Upload Piesă Completă</span>
            <div onClick={() => { const i = document.createElement("input"); i.type="file"; i.accept="audio/*"; i.onchange=e=>{setFullSongFile(e.target.files[0]);}; i.click(); }}
              style={{ border: fullSongFile ? "2px solid #ff6b9d" : "2px dashed #2a2a4a", borderRadius: 12, padding: 24, textAlign: "center", cursor: "pointer", background: fullSongFile ? "#ff6b9d11" : "transparent" }}>
              {fullSongFile ? (
                <div><div style={{fontSize:28,marginBottom:6}}>🎵</div><div style={{color:"#ff6b9d",fontWeight:600}}>{fullSongFile.name}</div></div>
              ) : (
                <div><div style={{fontSize:28,marginBottom:6}}>📁</div><div style={{color:"#6666aa"}}>Click pentru a uploada piesa</div></div>
              )}
            </div>
            
            {/* Model Selector */}
            <div style={{ marginTop: 16 }}>
              <span style={{ ...S.label, display: "block", marginBottom: 8 }}>🏆 Model Separare</span>
              <select
                value={separateModel}
                onChange={(e) => setSeparateModel(e.target.value)}
                style={{
                  width: "100%",
                  background: "#080812",
                  border: "1px solid #2a2a4a",
                  color: "#e0e0ff",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              >
                <option value="bs_roformer">🏆 BS-RoFormer (SDR 12.97) - Best Quality</option>
              </select>
              <div style={{ color: "#6666aa", fontSize: 11, marginTop: 6 }}>
                💡 BS-RoFormer offers best vocal/instrumental separation (SDR 12.97)
              </div>
            </div>
            
            <button onClick={handleSeparate} disabled={!fullSongFile || separating}
              style={{...S.btn, width:"100%", marginTop:12, opacity: (!fullSongFile||separating)?0.5:1}}>
              {separating ? "⏳ Se separă... (poate dura 1-2 min)" : "✂️ Separă Voce + Instrumental"}
            </button>
          </div>
          {separatedVocals && (
            <div style={S.card}>
              <span style={{...S.label, color:"#ff6b9d"}}>✅ Separare Completă!</span>
              <div style={{marginBottom:10}}>
                <div style={{color:"#6666aa",fontSize:11,marginBottom:4}}>🎤 VOCALE</div>
                <audio controls src={separatedVocals.url} style={{width:"100%",marginBottom:6}}/>
                <a href={separatedVocals.url} download={separatedVocals.filename} style={{color:"#ff6b9d",fontSize:12}}>⬇ Download vocale</a>
              </div>
              {separatedInstrumental && (
                <div>
                  <div style={{color:"#6666aa",fontSize:11,marginBottom:4}}>🎹 INSTRUMENTAL</div>
                  <audio controls src={separatedInstrumental.url} style={{width:"100%",marginBottom:6}}/>
                  <a href={separatedInstrumental.url} download={separatedInstrumental.filename} style={{color:"#ff6b9d",fontSize:12}}>⬇ Download instrumental</a>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── MIX TAB ── */}
      {activeTab === "mix" && (
        <div>
          <div style={S.card}>
            <span style={S.label}>🎚 Mix Voce Convertită + Instrumental</span>
            {!result ? (
              <div style={{color:"#ff6b9d",fontSize:13,padding:12,background:"#ff6b9d11",borderRadius:8}}>
                ⚠️ Mai întâi convertește o voce în tab-ul Convert, apoi revino aici.
              </div>
            ) : !separatedInstrumental ? (
              <div style={{color:"#ff6b9d",fontSize:13,padding:12,background:"#ff6b9d11",borderRadius:8}}>
                ⚠️ Mai întâi separă o piesă în tab-ul Separate pentru a obține instrumentalul.
              </div>
            ) : (
              <div>
                <div style={{color:"#a0a0cc",fontSize:13,marginBottom:12}}>
                  <div>🎤 Voce: <strong>{result.filename}</strong></div>
                  <div>🎹 Instrumental: <strong>{separatedInstrumental.filename}</strong></div>
                </div>
                <div style={S.grid}>
                  <div>
                    <span style={{color:"#6666aa",fontSize:11,display:"block",marginBottom:6}}>🎤 Volum Voce ({Math.round(vocalsVolume*100)}%)</span>
                    <input type="range" min="0.1" max="2" step="0.05" value={vocalsVolume} onChange={e=>setVocalsVolume(parseFloat(e.target.value))} style={{width:"100%"}}/>
                  </div>
                  <div>
                    <span style={{color:"#6666aa",fontSize:11,display:"block",marginBottom:6}}>🎹 Volum Instrumental ({Math.round(instrumentalVolume*100)}%)</span>
                    <input type="range" min="0.1" max="2" step="0.05" value={instrumentalVolume} onChange={e=>setInstrumentalVolume(parseFloat(e.target.value))} style={{width:"100%"}}/>
                  </div>
                </div>
                <button onClick={handleMix} disabled={mixing}
                  style={{...S.btn, width:"100%", marginTop:12, opacity:mixing?0.5:1}}>
                  {mixing ? "⏳ Se mixează..." : "🎚 Creează Mix Final"}
                </button>
              </div>
            )}
          </div>
          {mixResult && (
            <div style={{...S.card, borderLeft:"4px solid #ff6b9d"}}>
              <span style={{...S.label,color:"#ff6b9d"}}>✅ Mix Final Gata!</span>
              <div style={{color:"#a0a0cc",fontSize:13,marginBottom:10}}>
                <div>🎵 {mixResult.filename}</div>
                <div>⏱ {mixResult.duration}s · 📦 {mixResult.size} MB</div>
              </div>
              <audio controls src={mixResult.url} style={{width:"100%",marginBottom:10}}/>
              <a href={mixResult.url} download={mixResult.filename}
                style={{display:"block",textAlign:"center",background:"#ff6b9d22",color:"#ff6b9d",border:"1px solid #ff6b9d44",padding:10,borderRadius:8,textDecoration:"none",fontWeight:700}}>
                ⬇ Download Mix Final
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── PRESETS TAB ── */}
      {activeTab === "presets" && (
        <div>
          <div style={S.card}>
            <span style={S.label}>💾 Salvează Setările Curente ca Preset</span>
            <div style={{display:"flex",gap:8}}>
              <input
                value={presetName}
                onChange={e=>setPresetName(e.target.value)}
                placeholder='Ex: "Kanye Sad -3" sau "Bad Bunny High Pitch"'
                style={{...S.input, flex:1}}
              />
              <button onClick={savePreset} disabled={!presetName.trim()}
                style={{...S.btn, padding:"10px 16px", opacity:!presetName.trim()?0.5:1}}>
                💾 Salvează
              </button>
            </div>
            <div style={{color:"#444466",fontSize:11,marginTop:6}}>
              Salvează modelul selectat + toate setările din tab-ul Convert
            </div>
          </div>

          <div style={S.card}>
            <span style={S.label}>📂 Preseturi Salvate</span>
            {Object.keys(presets).length === 0 ? (
              <div style={{color:"#444466",fontSize:13,padding:12,textAlign:"center"}}>
                Nu ai niciun preset salvat încă.
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {Object.entries(presets).map(([name, p]) => (
                  <div key={name} style={{background:"#0d0d22",border:"1px solid #2a2a4a",borderRadius:8,padding:12,display:"flex",alignItems:"center",gap:8}}>
                    <div style={{flex:1}}>
                      <div style={{color:"#e0e0ff",fontWeight:600,marginBottom:4}}>💾 {name}</div>
                      <div style={{color:"#444466",fontSize:11}}>
                        {p.model_name && `Model: ${p.model_name.replace('.pth','')} · `}
                        Pitch: {p.pitch_shift > 0 ? '+' : ''}{p.pitch_shift} · 
                        {p.emotion !== 'neutral' ? ` ${p.emotion} · ` : ' '}
                        Index: {Math.round(p.index_rate*100)}%
                        {p.auto_tune ? ' · 🎯 AutoTune' : ''}
                      </div>
                    </div>
                    <button onClick={() => { loadPreset(name); setActiveTab("convert"); }}
                      style={{background:"#ff6b9d22",color:"#ff6b9d",border:"1px solid #ff6b9d44",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>
                      ▶ Aplică
                    </button>
                    <button onClick={() => deletePreset(name)}
                      style={{background:"#e6394622",color:"#e63946",border:"1px solid #e6394644",borderRadius:6,padding:"6px 10px",cursor:"pointer",fontSize:12}}>
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CONVERT TAB visibility ── */}
      <div style={{display: activeTab === "convert" ? "block" : "none"}}>

      {/* Info */}
      <div style={{
        ...S.card,
        borderColor: "rgba(255,107,157,0.35)",
        background: "rgba(255,107,157,0.06)",
      }}>
        <p style={{ color: "#ff6b9d", fontSize: 12, margin: 0, lineHeight: 1.6 }}>
          💡 <strong>RVC (Retrieval-based Voice Conversion):</strong> AI voice conversion using trained models. 
          Upload a vocal, select a voice model, and convert. Supports pitch shifting, emotion modification, 
          and advanced F0 extraction methods. Models (.pth files) should be placed in the RVCWebUI weights folder.
        </p>
      </div>
      </div> {/* end convert tab */}
    </div>
  );
}
