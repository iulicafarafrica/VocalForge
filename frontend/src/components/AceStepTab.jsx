import { useState, useEffect, useRef, useCallback } from "react";

const API = "http://localhost:8000";

// ── Seed Library helpers ───────────────────────────────────────────────────────
const SEEDS_KEY = "acestep_seeds_v1";
function loadSeeds() {
  try { const s = localStorage.getItem(SEEDS_KEY); if (s) return JSON.parse(s); } catch {}
  return [];
}
function saveSeedsToStorage(seeds) {
  try { localStorage.setItem(SEEDS_KEY, JSON.stringify(seeds)); } catch {}
}

// ── Preset helpers ─────────────────────────────────────────────────────────────
const PRESETS_KEY = "acestep_presets_v1";

const DEFAULT_PRESETS = [
  {
    id: "default_generate",
    name: "🎵 Generate Track",
    icon: "🎵",
    color: "#ffd166",
    builtIn: true,
    settings: {
      taskType: "text2music",
      prompt: "pop music, upbeat, catchy chorus, modern production, radio-friendly",
      lyrics: "",
      duration: 60,
      guidanceScale: 7,
      inferSteps: 8,
      seed: -1,
      sourceStrength: 0.5,
    },
  },
  {
    id: "default_cover",
    name: "🎤 Audio Cover",
    icon: "🎤",
    color: "#c77dff",
    builtIn: true,
    settings: {
      taskType: "audio2audio",
      prompt: "pop music, modern production, high quality",
      lyrics: "",
      duration: 60,
      guidanceScale: 7,
      inferSteps: 8,
      seed: -1,
      sourceStrength: 0.5,
    },
  },
  {
    id: "default_turbo",
    name: "⚡ Turbo Fast",
    icon: "⚡",
    color: "#06d6a0",
    builtIn: true,
    settings: {
      taskType: "text2music",
      prompt: "hip hop trap beat, 808 bass, dark atmosphere",
      lyrics: "",
      duration: 30,
      guidanceScale: 5,
      inferSteps: 8,
      seed: -1,
      sourceStrength: 0.5,
    },
  },
];

function loadPresets() {
  try {
    const s = localStorage.getItem(PRESETS_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      return [...DEFAULT_PRESETS, ...parsed.filter(p => !p.builtIn)];
    }
  } catch {}
  return DEFAULT_PRESETS;
}

function savePresets(presets) {
  try {
    const userPresets = presets.filter(p => !p.builtIn);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(userPresets));
  } catch {}
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AceStepTab({
  addLog,
  tracks,
  setTracks,
  prompt,
  setPrompt,
  lyrics,
  setLyrics,
  duration,
  setDuration,
  guidanceScale,
  setGuidanceScale,
  inferSteps,
  setInferSteps,
  seed,
  setSeed,
  genreCat,
  setGenreCat,
  result,
  setResult,
}) {
  const [aceOnline, setAceOnline] = useState(null);
  const [showPresets, setShowPresets] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [bpm, setBpm] = useState(0);
  const [keyScale, setKeyScale] = useState("");
  const [resultBpm, setResultBpm] = useState(null);
  const [resultKey, setResultKey] = useState(null);
  const [seedLibrary, setSeedLibrary] = useState(loadSeeds);
  const [showSeedLib, setShowSeedLib] = useState(false);
  const [seedSaveName, setSeedSaveName] = useState("");
  const [seedSaveInput, setSeedSaveInput] = useState(false);

  // ── Audio Cover (audio2audio) ──────────────────────────────────────────────
  const [taskType, setTaskType] = useState("text2music");
  const [sourceAudio, setSourceAudio] = useState(null);
  const [sourceAudioUrl, setSourceAudioUrl] = useState(null);
  const [sourceStrength, setSourceStrength] = useState(0.5);
  const [sourceBpm, setSourceBpm] = useState(null);
  const [sourceKey, setSourceKey] = useState(null);
  const [detectingSource, setDetectingSource] = useState(false);

  // ── Extra generation params ────────────────────────────────────────────────
  const [negativePrompt, setNegativePrompt] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [vocalLanguage, setVocalLanguage] = useState("en");
  const [audioFormat, setAudioFormat] = useState("mp3");
  const [tensorModel, setTensorModel] = useState("acestep-v15-turbo");

  const TENSOR_MODELS = [
    { id: "acestep-v15-turbo", name: "⚡ Turbo", desc: "8 steps, fast", color: "#06d6a0" },
    { id: "acestep-v15-turbo-shift3", name: "⚡ Turbo Shift3", desc: "8 steps, alternative", color: "#06d6a0" },
    { id: "acestep-v15-base", name: "🎯 Base", desc: "50 steps, all features", color: "#00e5ff" },
    { id: "acestep-v15-sft", name: "🎵 SFT", desc: "50 steps, high quality", color: "#c77dff" },
  ];

  const VOCAL_LANGUAGES = [
    { code: "unknown", name: "🎵 Instrumental / Auto", native: "Auto-detect" },
    { code: "en", name: "English", native: "English" },
    { code: "ro", name: "Romanian", native: "Română" },
    { code: "es", name: "Spanish", native: "Español" },
    { code: "ar", name: "Arabic", native: "العربية" },
    { code: "el", name: "Greek", native: "Ελληνικά" },
  ];

  // ── Genre presets ───────────────────────────────────────────────────────────
  const [genrePresetsData, setGenrePresetsData] = useState(null);
  const [genreCatFull, setGenreCatFull] = useState("");
  const [selectedGenreSubgenre, setSelectedGenreSubgenre] = useState("");
  const [genrePresetsLoading, setGenrePresetsLoading] = useState(true);

  const loadGenrePresets = useCallback(() => {
    setGenrePresetsLoading(true);
    setGenrePresetsData(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    fetch(`${API}/genre_presets`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        clearTimeout(timeoutId);
        setGenrePresetsData(data);
        if (data && data.default_genre) setGenreCatFull(data.default_genre);
      })
      .catch(() => {})
      .finally(() => setGenrePresetsLoading(false));
  }, []);

  useEffect(() => { loadGenrePresets(); }, [loadGenrePresets]);

  useEffect(() => {
    if (genrePresetsData && genreCatFull) {
      const genreData = genrePresetsData.genres?.find(g => g.name === genreCatFull);
      if (genreData?.subgenres?.length) {
        const firstSub = genreData.subgenres[0].name;
        setSelectedGenreSubgenre(`${genreCatFull}|${firstSub}`);
        const subData = genreData.subgenres.find(s => s.name === firstSub);
        if (subData?.prompt) setPrompt(subData.prompt);
      }
    }
  }, [genrePresetsData, genreCatFull]);

  // ── Check ACE-Step API online ───────────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch(`${API}/ace_health`, { method: "GET" });
        const d = await r.json();
        setAceOnline(d.online === true);
        if (d.online) addLog(`[OK] ACE-Step API online`);
        else addLog(`[WARN] ACE-Step API offline`);
      } catch { setAceOnline(false); addLog(`[ERR] ACE-Step API unreachable`); }
    };
    check();
    const i = setInterval(check, 30000);
    return () => clearInterval(i);
  }, [addLog]);

  // ── Generate ────────────────────────────────────────────────────────────────
  const generate = async () => {
    if (!prompt.trim()) { addLog("[ERR] Prompt required"); return; }
    if (taskType === "audio2audio" && !sourceAudio) { addLog("[ERR] Source audio required for cover"); return; }
    setProcessing(true);
    setProgress(0);
    setProgressLabel("Starting generation...");
    setResult(null);

    const fd = new FormData();
    fd.append("prompt", prompt);
    fd.append("lyrics", lyrics);
    fd.append("duration", duration.toString());
    fd.append("guidance_scale", guidanceScale.toString());
    fd.append("seed", seed.toString());
    fd.append("infer_steps", inferSteps.toString());
    fd.append("dit_model", tensorModel);
    fd.append("vocal_language", vocalLanguage);
    fd.append("instrumental", instrumental || lyrics.trim() === "" || vocalLanguage === "unknown");
    if (bpm && bpm > 0) fd.append("bpm", bpm.toString());
    if (keyScale && keyScale.trim()) fd.append("key_scale", keyScale);
    fd.append("task_type", taskType);
    if (negativePrompt) fd.append("negative_prompt", negativePrompt);
    if (taskType === "audio2audio" && sourceAudio) {
      fd.append("source_audio", sourceAudio);
      fd.append("source_audio_strength", sourceStrength.toString());
    }

    const progressSteps = [
      { pct: 15, label: "🎵 Loading model...", delay: 2000 },
      { pct: 30, label: "🎼 Encoding prompt...", delay: 5000 },
      { pct: 50, label: "🎹 Generating (diffusion)...", delay: 10000 },
      { pct: 70, label: "🎤 Adding vocals...", delay: 15000 },
      { pct: 85, label: "🎛 Finalizing...", delay: 20000 },
    ];
    const timers = progressSteps.map(s => setTimeout(() => { setProgress(s.pct); setProgressLabel(s.label); }, s.delay));

    try {
      const res = await fetch(`${API}/ace_generate`, { method: "POST", body: fd });
      timers.forEach(clearTimeout);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const usedSeed = data.metadata?.seed ?? data.seed;
      const t = {
        id: Date.now(),
        filename: data.filename,
        url: `${API}${data.url}`,
        duration: data.duration_sec,
        created: new Date().toLocaleTimeString(),
        isAce: true,
        prompt: prompt.slice(0, 60),
        metadata: data.metadata || {},
        seed: usedSeed,
      };
      setTracks(prev => [t, ...prev]);
      setResult(t);
      setProgress(100);
      setProgressLabel("✅ Done!");
      addLog(`[OK] ACE-Step done: ${data.filename} (${data.duration_sec}s)`);

      setResultBpm(null); setResultKey(null);
      try {
        const audioBlob = await fetch(`${API}${data.url}`).then(r => r.blob());
        const bkFd = new FormData();
        bkFd.append("file", audioBlob, "detect.wav");
        const bkRes = await fetch(`${API}/detect_bpm_key`, { method: "POST", body: bkFd });
        const bkData = await bkRes.json();
        if (bkData.bpm) { setResultBpm(bkData.bpm); setResultKey(bkData.key); }
      } catch {}

      if (usedSeed >= 0 && !seedLibrary.find(s => s.seed === usedSeed)) {
        const newSeeds = [...seedLibrary, { seed: usedSeed, prompt: prompt.slice(0, 40), date: new Date().toISOString() }].slice(-50);
        setSeedLibrary(newSeeds);
        saveSeedsToStorage(newSeeds);
      }
    } catch (err) {
      timers.forEach(clearTimeout);
      addLog(`[ERR] ${err.message}`);
      setResult({ error: err.message });
      setProgress(0);
      setProgressLabel("");
    } finally {
      setProcessing(false);
    }
  };

  const S = {
    card: { background: "linear-gradient(135deg, #0d0d22 0%, #0a0a1a 100%)", border: "1px solid #1e1e3a", borderRadius: 12, padding: 16, marginBottom: 14 },
    label: { color: "#6666aa", fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, display: "block" },
    input: { width: "100%", background: "#080812", border: "1px solid #2a2a4a", color: "#e0e0ff", borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none" },
    btn: { background: "linear-gradient(135deg, #7209b7, #560bad)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }} className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, background: "linear-gradient(135deg, #e0e0ff, #00e5ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4 }}>
          🎵 ACE-Step v1.5
        </h2>
        <p style={{ color: "#444466", fontSize: 13 }}>
          {aceOnline ? "✅ Online" : "❌ Offline"} · Model: {tensorModel.replace("acestep-v15-", "")}
        </p>
      </div>

      {/* Task Type Selector */}
      <div style={S.card}>
        <span style={S.label}>🎯 Task Type</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setTaskType("text2music")}
            style={{
              flex: 1, padding: "14px 16px", borderRadius: 10, fontSize: 14, fontWeight: 700,
              background: taskType === "text2music" ? "#7209b722" : "#0a0a1a",
              border: `2px solid ${taskType === "text2music" ? "#9b2de0" : "#2a2a4a"}`,
              color: taskType === "text2music" ? "#c77dff" : "#444466", cursor: "pointer",
            }}
          >
            ✍️ Text → Music
          </button>
          <button
            onClick={() => setTaskType("audio2audio")}
            style={{
              flex: 1, padding: "14px 16px", borderRadius: 10, fontSize: 14, fontWeight: 700,
              background: taskType === "audio2audio" ? "#7209b722" : "#0a0a1a",
              border: `2px solid ${taskType === "audio2audio" ? "#9b2de0" : "#2a2a4a"}`,
              color: taskType === "audio2audio" ? "#c77dff" : "#444466", cursor: "pointer",
            }}
          >
            🎤 Audio Cover
          </button>
        </div>
      </div>

      {/* Prompt & Lyrics */}
      <div style={S.card}>
        <span style={S.label}>✍️ Prompt</span>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Describe the music style..."
          style={{ ...S.input, minHeight: 80, resize: "vertical", fontFamily: "inherit" }}
        />
      </div>

      <div style={S.card}>
        <span style={S.label}>📝 Lyrics (optional)</span>
        <textarea
          value={lyrics}
          onChange={e => setLyrics(e.target.value)}
          placeholder="Enter song lyrics..."
          style={{ ...S.input, minHeight: 100, resize: "vertical", fontFamily: "inherit" }}
        />
      </div>

      {/* Source Audio for Cover */}
      {taskType === "audio2audio" && (
        <div style={S.card}>
          <span style={S.label}>🎵 Source Audio</span>
          <div
            onClick={() => document.getElementById("sourceAudioInput")?.click()}
            style={{
              border: "2px dashed #2a2a4a", borderRadius: 12, padding: 24, textAlign: "center",
              cursor: "pointer", background: sourceAudio ? "#7209b711" : "transparent",
              borderColor: sourceAudio ? "#9b2de0" : "#2a2a4a",
            }}
          >
            {sourceAudio ? (
              <div>
                <div style={{ color: "#c77dff", fontWeight: 600 }}>{sourceAudio.name}</div>
                <div style={{ color: "#444466", fontSize: 12 }}>{(sourceAudio.size / 1024 / 1024).toFixed(2)} MB</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🎵</div>
                <div style={{ color: "#6666aa" }}>Click to upload source audio</div>
              </div>
            )}
          </div>
          <input
            id="sourceAudioInput"
            type="file"
            accept="audio/*"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) {
                setSourceAudio(f);
                setSourceAudioUrl(URL.createObjectURL(f));
              }
            }}
            style={{ display: "none" }}
          />
          {sourceAudioUrl && (
            <audio controls src={sourceAudioUrl} style={{ width: "100%", marginTop: 12 }} />
          )}
          {sourceAudio && (
            <div style={{ marginTop: 12 }}>
              <span style={S.label}>Cover Strength: {sourceStrength.toFixed(1)}</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={sourceStrength}
                onChange={e => setSourceStrength(parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6666aa" }}>
                <span>Creative</span>
                <span>Faithful</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Model Selection */}
      <div style={S.card}>
        <span style={S.label}>🧠 DiT Model</span>
        <select
          value={tensorModel}
          onChange={e => setTensorModel(e.target.value)}
          style={{ ...S.input, fontFamily: "monospace", fontSize: 13 }}
        >
          {TENSOR_MODELS.map(m => (
            <option key={m.id} value={m.id}>{m.name} - {m.desc}</option>
          ))}
        </select>
      </div>

      {/* Vocal Language */}
      <div style={S.card}>
        <span style={S.label}>🗣 Vocal Language</span>
        <select
          value={vocalLanguage}
          onChange={e => setVocalLanguage(e.target.value)}
          style={{ ...S.input, fontFamily: "monospace", fontSize: 13 }}
        >
          {VOCAL_LANGUAGES.map(l => (
            <option key={l.code} value={l.code}>{l.name} ({l.native})</option>
          ))}
        </select>
      </div>

      {/* Duration & Seed */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={S.card}>
          <span style={S.label}>⏱ Duration</span>
          <input
            type="number"
            min="5"
            max="240"
            value={duration}
            onChange={e => setDuration(parseInt(e.target.value) || 30)}
            style={S.input}
          />
        </div>
        <div style={S.card}>
          <span style={S.label}>🎲 Seed</span>
          <input
            type="number"
            value={seed}
            onChange={e => setSeed(parseInt(e.target.value) || -1)}
            placeholder="-1 = random"
            style={S.input}
          />
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={generate}
        disabled={processing}
        style={{
          width: "100%",
          ...S.btn,
          opacity: processing ? 0.5 : 1,
          cursor: processing ? "not-allowed" : "pointer",
        }}
      >
        {processing ? `⏳ ${progressLabel}` : "🚀 Generate"}
      </button>

      {/* Progress */}
      {processing && (
        <div style={{ marginTop: 16 }}>
          <div style={{ color: "#6666aa", fontSize: 12, marginBottom: 6 }}>{progressLabel}</div>
          <div style={{ background: "#1a1a2e", borderRadius: 8, height: 8, overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, background: "linear-gradient(90deg, #7209b7, #00e5ff)", height: "100%", transition: "width 0.3s" }} />
          </div>
        </div>
      )}

      {/* Result */}
      {result && !result.error && (
        <div style={{ ...S.card, borderColor: "#06d6a0", marginTop: 16 }}>
          <span style={{ ...S.label, color: "#06d6a0" }}>✅ Result</span>
          <audio controls src={result.url} style={{ width: "100%", marginBottom: 12 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <a
              href={result.url}
              download={result.filename}
              style={{ ...S.btn, textDecoration: "none", display: "inline-block" }}
            >
              ⬇ Download
            </a>
            {resultBpm && (
              <div style={{ color: "#6666aa", fontSize: 12, alignSelf: "center" }}>
                🎵 {resultBpm} BPM · {resultKey}
              </div>
            )}
          </div>
        </div>
      )}

      {result?.error && (
        <div style={{ ...S.card, borderColor: "#e63946", marginTop: 16 }}>
          <span style={{ ...S.label, color: "#e63946" }}>❌ Error</span>
          <p style={{ color: "#e63946", margin: 0 }}>{result.error}</p>
        </div>
      )}
    </div>
  );
}
