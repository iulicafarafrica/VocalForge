import { useState, useCallback, useEffect } from "react";
import { BookOpen, Sliders, Sparkles, Layers, FolderOpen, Monitor, FileText, Music2, Activity, Zap, Mic2, Wand2 } from "lucide-react";
import "./index.css";
import ModelsTab from "./components/ModelsTab";
import NotesTab from "./components/NotesTab";
import TracksPanel from "./components/TracksPanel";
import DemucsTab from "./components/DemucsTab";
import AceStepTab from "./components/AceStepTab";
import RepaintLegoComplete from "./components/RepaintLegoComplete";
import ReadmeTab from "./components/ReadmeTab";
import AudioAnalysisTab from "./components/AudioAnalysisTab";
import AudioEnhancerTab from "./components/AudioEnhancerTab";
import PipelineTab from "./components/PipelineTab";
import LyricsTab from "./components/LyricsTab";

const API = "http://localhost:8000";

const TABS = [
  { id: "Readme",  Icon: BookOpen,   label: "ReadMe", color: "#00e5ff" },
  { id: "Demucs",  Icon: Sliders,    label: "Stem Separation", color: "#00e5ff" },
  { id: "ACEStep", Icon: Music2,     label: "ACE-Step", color: "#ff6b9d" },
  { id: "Pipeline", Icon: Zap, label: "Vocal Pipeline", color: "#a855f7" },
  { id: "Lyrics", Icon: Mic2, label: "Lyrics Finder", color: "#ff6b9d" },
  { id: "ACEAdvanced", Icon: Layers, label: "Repaint", color: "#00b4d8" },
  { id: "AudioEnhancer", Icon: Wand2, label: "Audio Enhancer", color: "#06d6a0" },
  { id: "AudioAnalysis", Icon: Activity, label: "Audio Analysis", color: "#f59e0b" },
  { id: "Tracks",  Icon: FolderOpen, label: "Tracks", color: "#ffd166" },
  { id: "Models",  Icon: Monitor,    label: "Models & GPU", color: "#e63946" },
  { id: "Notes",   Icon: FileText,   label: "Notes", color: "#06d6a0" },
];

export default function App() {
  const [tab, setTab] = useState("Demucs");
  const [logs, setLogs] = useState([`[OK] VocalForge v2.2.0 loaded — ${new Date().toLocaleTimeString()}`]);
  const [showLogs, setShowLogs] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [models, setModels] = useState([]);
  const [hwInfo, setHwInfo] = useState(null);

  // ── AceStep state lifted here so it persists across tab switches ──────────
  const [acePrompt, setAcePrompt] = useState("");
  const [aceLyrics, setAceLyrics] = useState(() => {
    // Load lyrics from Lyrics Finder if available (ONE TIME ONLY)
    try {
      const savedLyrics = localStorage.getItem("acestep_lyrics_from_manager");
      const savedArtist = localStorage.getItem("acestep_lyrics_artist");
      const savedTitle = localStorage.getItem("acestep_lyrics_title");

      if (savedLyrics) {
        // Clear the localStorage so it doesn't load again on refresh
        localStorage.removeItem("acestep_lyrics_from_manager");
        localStorage.removeItem("acestep_lyrics_artist");
        localStorage.removeItem("acestep_lyrics_title");
        return savedLyrics;
      }
    } catch (e) {
      console.error("[ACE-Step] Failed to load lyrics from Lyrics Finder:", e);
    }
    return "";
  });

  const [aceDuration, setAceDuration] = useState(30);
  const [aceGuidanceScale, setAceGuidanceScale] = useState(7.0);
  const [aceInferSteps, setAceInferSteps] = useState(50);  // 50 steps for high quality (SFT model)
  const [aceSeed, setAceSeed] = useState(-1);
  const [aceGenreCat, setAceGenreCat] = useState("Hip-Hop");
  const [aceResult, setAceResult] = useState(null);

  const [advancedSettings, setAdvancedSettings] = useState({
    // Generation Parameters
    durationEnabled: false, duration: 60,
    bpmEnabled: false, bpm: 120,
    keyScaleEnabled: false, keyScale: "",
    negativePromptEnabled: false, negativePrompt: "",

    // ACE-Step AI Generation
    guidanceEnabled: false, guidanceScale: 9.0,
    inferStepsEnabled: false, inferSteps: 12,
    seedEnabled: false, seed: -1,
    lmCfgEnabled: false, lmCfgScale: 2.2,
    tempEnabled: false, temperature: 0.8,
    topkEnabled: false, topK: 0,
    toppEnabled: false, topP: 0.92,

    // Audio Format
    audioFormatEnabled: false, audioFormat: "mp3",
    tiledDecodeEnabled: true, useTiledDecode: true,  // Always on for VRAM optimization

    // Processing
    fp16Enabled: true, fp16: true,  // Activat implicit pentru RTX 3070
    segmentEnabled: false, segmentLength: 2048,  // Optimizat pentru 8GB VRAM
    batchEnabled: false, batchSize: 1,  // Stabilitate VRAM
  });

  const addLog = useCallback((msg) => {
    setLogs(prev => [...prev.slice(-499), msg]);
  }, []);

  // Listen for lyrics updates from Lyrics Finder tab (real-time sync)
  useEffect(() => {
    const handleLyricsUpdate = (event) => {
      const { lyrics, artist, title } = event.detail || {};
      if (lyrics) {
        console.log("[ACE-Step] Received lyrics from Lyrics Finder:", artist, "-", title);
        setAceLyrics(lyrics);
        addLog?.(`[Lyrics] Loaded from Lyrics Finder: ${artist} - ${title}`);
      }
    };

    window.addEventListener("acestep-lyrics-update", handleLyricsUpdate);
    return () => window.removeEventListener("acestep-lyrics-update", handleLyricsUpdate);
  }, [addLog]);

  useEffect(() => {
    fetch(`${API}/hardware`)
      .then(r => r.json())
      .then(data => {
        setHwInfo(data);
        addLog(`[OK] Backend connected — ${data.mode?.toUpperCase()} mode · ${data.device?.toUpperCase()}`);
      })
      .catch(() => {
        setHwInfo(null);
        addLog("[WARN] Backend offline — start backend to connect");
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hwLabel = hwInfo
    ? `${hwInfo.device === "cuda" ? "GPU" : "CPU"} · ${hwInfo.vram_gb > 0 ? hwInfo.vram_gb + "GB VRAM" : hwInfo.cpu_cores + " cores"} · ${hwInfo.mode?.toUpperCase()}`
    : "Backend offline";

  const hwColor = hwInfo
    ? (hwInfo.mode === "high_end" ? "#00e5ff" : hwInfo.mode === "full" ? "#06d6a0" : "#ffd166")
    : "#e63946";

  return (
    <div style={{ minHeight: "100vh", background: "#080812", color: "#e0e0ff" }}>

      {/* ── Header ── */}
      <header style={{
        background: "linear-gradient(180deg, #0d0d22 0%, #080812 100%)",
        borderBottom: "1px solid #1a1a3a",
        padding: "0 28px",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 0 10px", gap: 16 }}>
          {/* Icon mark */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            {/* Outer glow ring */}
            <div style={{
              position: "absolute", inset: -4, borderRadius: "50%",
              background: "conic-gradient(from 180deg, #7209b7, #00e5ff, #06d6a0, #7209b7)",
              opacity: 0.35, filter: "blur(6px)",
            }} />
            {/* Main circle */}
            <div style={{
              position: "relative",
              width: 46, height: 46, borderRadius: "50%",
              background: "linear-gradient(145deg, #0d0d22, #12122e)",
              border: "1.5px solid #7209b755",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 0 1px #00e5ff22, inset 0 1px 0 #ffffff11",
            }}>
              {/* Waveform bars */}
              <div style={{ display: "flex", alignItems: "center", gap: 2.5 }}>
                {[5, 11, 18, 13, 7, 16, 9].map((h, i) => (
                  <div key={i} style={{
                    width: 2.5, height: h,
                    borderRadius: 2,
                    background: i % 2 === 0
                      ? "linear-gradient(180deg, #00e5ff, #7209b7)"
                      : "linear-gradient(180deg, #06d6a0, #00e5ff)",
                    opacity: 0.9,
                  }} />
                ))}
              </div>
            </div>
          </div>

          {/* Wordmark */}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 0, lineHeight: 1 }}>
              <span style={{
                fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px",
                background: "linear-gradient(90deg, #06d6a0, #00e5ff)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>Vocal</span>
              <span style={{
                fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px",
                background: "linear-gradient(90deg, #9b2de0, #c77dff)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>Forge</span>
            </div>
            <div style={{
              fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase",
              color: "#3a3a5c", fontWeight: 600,
            }}>AI Audio Studio</div>
          </div>
        </div>

        {/* Tabs row */}
        <div style={{
          display: "flex", justifyContent: "center", gap: 2, paddingBottom: 0,
          flexWrap: "wrap", maxWidth: "100%",
        }}>
          {TABS.map(t => {
            const active = tab === t.id;
            const TabIcon = t.Icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px 10px 0 0",
                  border: `1px solid ${active ? t.color + "44" : "transparent"}`,
                  borderBottom: active ? `3px solid ${t.color}` : "3px solid transparent",
                  background: active ? "rgba(13,13,34,0.95)" : "transparent",
                  color: active ? t.color : "#555577",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.2s ease",
                  boxShadow: active ? `0 -2px 12px ${t.color}22` : "none",
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.background = "#0d0d2222";
                    e.currentTarget.style.color = "#8888aa";
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#555577";
                  }
                }}
              >
                <TabIcon size={18} strokeWidth={active ? 2.5 : 2} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* ── Content ── */}
      <main style={{ padding: "16px 16px", maxWidth: 1800, margin: "0 auto" }}>

        <div style={{ display: tab === "Readme" ? "block" : "none" }}>
          <ReadmeTab />
        </div>

        <div style={{ display: tab === "Demucs" ? "block" : "none" }}>
          <DemucsTab addLog={addLog} tracks={tracks} setTracks={setTracks} />
        </div>

        <div style={{ display: tab === "ACEStep" ? "block" : "none" }}>
          <AceStepTab
            addLog={addLog}
            tracks={tracks}
            setTracks={setTracks}
            prompt={acePrompt}               setPrompt={setAcePrompt}
            lyrics={aceLyrics}               setLyrics={setAceLyrics}
            duration={aceDuration}           setDuration={setAceDuration}
            guidanceScale={aceGuidanceScale} setGuidanceScale={setAceGuidanceScale}
            inferSteps={aceInferSteps}       setInferSteps={setAceInferSteps}
            seed={aceSeed}                   setSeed={setAceSeed}
            genreCat={aceGenreCat}           setGenreCat={setAceGenreCat}
            result={aceResult}               setResult={setAceResult}
            advancedSettings={advancedSettings}
            setAdvancedSettings={setAdvancedSettings}
          />
        </div>

        <div style={{ display: tab === "Pipeline" ? "block" : "none" }}>
          <PipelineTab addLog={addLog} />
        </div>

        <div style={{ display: tab === "ACEAdvanced" ? "block" : "none" }}>
          <RepaintLegoComplete />
        </div>

        <div style={{ display: tab === "Lyrics" ? "block" : "none" }}>
          <LyricsTab addLog={addLog} />
        </div>

        <div style={{ display: tab === "AudioAnalysis" ? "block" : "none" }}>
          <AudioAnalysisTab addLog={addLog} />
        </div>

        <div style={{ display: tab === "AudioEnhancer" ? "block" : "none" }}>
          <AudioEnhancerTab addLog={addLog} />
        </div>

        <div style={{ display: tab === "Tracks" ? "block" : "none" }}>
          <TracksPanel tracks={tracks} setTracks={setTracks} />
        </div>

        <div style={{ display: tab === "Models" ? "block" : "none" }}>
          <ModelsTab addLog={addLog} />
        </div>

        <div style={{ display: tab === "Notes" ? "block" : "none" }}>
          <NotesTab />
        </div>

      </main>

      {/* ── Logs Panel ── */}
      {showLogs && (
        <div style={{
          position: "fixed", bottom: 40, left: 0, right: 0, zIndex: 200,
          background: "#0d0d22", borderTop: "1px solid #1a1a3a",
          maxHeight: 220, overflowY: "auto", padding: "10px 28px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ color: "#6666aa", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>
              📋 Activity Log ({logs.length})
            </span>
            <button onClick={() => setShowLogs(false)}
              style={{ background: "none", border: "none", color: "#444466", cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>
          {[...logs].reverse().map((log, i) => (
            <div key={i} style={{
              fontFamily: "monospace", fontSize: 11, lineHeight: 1.7,
              color: log.startsWith("[ERR") ? "#e63946" : log.startsWith("[WARN") ? "#ffd166" : "#06d6a0",
              borderBottom: "1px solid #0d0d1a", padding: "2px 0",
            }}>
              {log}
            </div>
          ))}
        </div>
      )}

      {/* ── Footer ── */}
      <footer style={{
        borderTop: "1px solid #1a1a2e", padding: "10px 28px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "sticky", bottom: 0, background: "#080812", zIndex: 99,
      }}>
        <div style={{ color: "#333355", fontSize: 11, fontFamily: "monospace" }}>
          VocalForge v2.2.0 · Lyrics Manager Complete
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{
            color: hwColor, fontSize: 11, fontFamily: "monospace",
            background: hwColor + "11", border: `1px solid ${hwColor}33`,
            padding: "2px 8px", borderRadius: 4,
          }}>
            {hwLabel}
          </span>
          <button
            onClick={() => setShowLogs(v => !v)}
            style={{
              background: showLogs ? "#1a1a3a" : "transparent",
              border: "1px solid #1a1a3a", borderRadius: 4,
              color: "#444466", cursor: "pointer", fontSize: 11,
              padding: "2px 8px", fontFamily: "monospace",
            }}
          >
            📋 Logs ({logs.length})
          </button>
          {/* Buton monitoring VRAM în timp real */}
          <button
            onClick={() => {
              fetch(`${API}/vram_usage`)
                .then(r => r.json())
                .then(data => {
                  if (data.available) {
                    addLog(`[OK] VRAM: ${data.used_gb}/${data.total_gb}GB (${data.pct}%)`);
                  } else {
                    addLog("[INFO] VRAM monitoring not available (CPU mode)");
                  }
                })
                .catch(err => addLog(`[ERR] VRAM check failed: ${err.message}`));
            }}
            style={{
              background: "#7209b722", border: "1px solid #7209b744",
              color: "#9b2de0", cursor: "pointer", fontSize: 11,
              padding: "2px 8px", borderRadius: 4, fontFamily: "monospace",
            }}
          >
            📊 VRAM
          </button>
          <div style={{ display: "flex", gap: 4 }}>
            {logs.slice(-3).map((log, i) => (
              <span key={i} style={{
                fontSize: 10, fontFamily: "monospace",
                color: log.startsWith("[ERR") ? "#e63946" : log.startsWith("[WARN") ? "#ffd166" : "#06d6a0",
                background: "#0d0d22", padding: "2px 6px", borderRadius: 4,
                maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {log}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
