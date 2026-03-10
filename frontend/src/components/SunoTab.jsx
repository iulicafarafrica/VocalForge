import { useState, useRef, useEffect } from "react";

const API = "http://localhost:8000";

const MODELS = [
  { id: "chirp-auk-turbo", label: "Turbo", desc: "Free · Rapid" },
  { id: "chirp-v5",        label: "v5",    desc: "Pro · Best" },
  { id: "chirp-v4-5",      label: "v4.5",  desc: "Pro · Balanced" },
  { id: "chirp-v4",        label: "v4",    desc: "Pro · Stable" },
];

const STYLE_PRESETS = [
  "romanian pop",
  "hip-hop trap",
  "melodic drill",
  "r&b soul",
  "electronic dance",
  "acoustic folk",
  "cinematic orchestral",
  "lo-fi chill",
];

// Status message for suno-api connection
const SUNO_API_STATUS = {
  connected: "🟢 suno-api connected (localhost:8080)",
  disconnected: "🔴 suno-api not running — start with: python suno-api/start_suno.py",
};

function WaveAnimation({ active }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 24 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{
          width: 3,
          borderRadius: 2,
          background: "#f59e0b",
          height: active ? `${8 + Math.random() * 16}px` : "4px",
          animation: active ? `wave ${0.5 + i * 0.1}s ease-in-out infinite alternate` : "none",
          transition: "height 0.3s",
        }} />
      ))}
      <style>{`
        @keyframes wave {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1.4); }
        }
      `}</style>
    </div>
  );
}

function AudioCard({ audio, onSendToPipeline, onSendToRVC }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else         { audioRef.current.play();  setPlaying(true);  }
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    audioRef.current.currentTime = pct * duration;
    setProgress(pct * 100);
  };

  return (
    <div style={{
      background: "linear-gradient(135deg, #0d1117 0%, #111827 100%)",
      border: "1px solid #f59e0b33",
      borderRadius: 14,
      padding: "18px 20px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Glow */}
      <div style={{
        position: "absolute", top: -40, right: -40,
        width: 120, height: 120, borderRadius: "50%",
        background: "#f59e0b11", filter: "blur(30px)",
        pointerEvents: "none",
      }} />

      {/* Cover + title */}
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
        {audio.image_url ? (
          <img src={audio.image_url} alt="cover"
            style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", border: "1px solid #f59e0b44" }} />
        ) : (
          <div style={{ width: 56, height: 56, borderRadius: 10, background: "#1f2937",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🎵</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 3,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {audio.title || "Untitled"}
          </div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>
            {audio.model || "chirp"} · {audio.duration ? `${Math.round(audio.duration)}s` : "—"}
          </div>
        </div>
        <WaveAnimation active={playing} />
      </div>

      {/* Audio element */}
      {audio.audio_url && (
        <audio ref={audioRef} src={audio.audio_url}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={() => {
            if (audioRef.current) {
              const dur = audioRef.current.duration || 0;
              if (dur) {
                setDuration(dur);
                setProgress(audioRef.current.currentTime / dur * 100);
              }
            }
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) setDuration(audioRef.current.duration || 0);
          }} />
      )}

      {/* Progress bar */}
      <div onClick={handleSeek} style={{ background: "#1f2937", borderRadius: 999, height: 6, marginBottom: 14, overflow: "hidden", cursor: "pointer", position: "relative" }}>
        <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #f59e0b, #ef4444)", borderRadius: 999, transition: "width 0.1s" }} />
      </div>
      {duration > 0 && (
        <div style={{ fontSize: 10, color: "#6b7280", marginTop: -10, marginBottom: 10, textAlign: "right" }}>
          {audioRef.current ? `${Math.floor(audioRef.current.currentTime)}s / ${Math.floor(duration)}s` : ""}
        </div>
      )}

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={togglePlay} style={{
          padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
          background: playing ? "#374151" : "#f59e0b",
          color: playing ? "#f59e0b" : "#000",
          fontWeight: 700, fontSize: 13,
        }}>
          {playing ? "⏸ Pause" : "▶ Play"}
        </button>

        {audio.audio_url && (
          <a href={audio.audio_url} download target="_blank" rel="noreferrer" style={{
            padding: "8px 14px", borderRadius: 8, border: "1px solid #374151",
            color: "#9ca3af", textDecoration: "none", fontSize: 12, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            ⬇ Download
          </a>
        )}

        <button onClick={() => onSendToPipeline(audio)} style={{
          padding: "8px 14px", borderRadius: 8, border: "1px solid #a855f744",
          background: "#a855f711", color: "#a855f7", cursor: "pointer",
          fontSize: 12, fontWeight: 600,
        }}>
          🚀 → Pipeline
        </button>

        <button onClick={() => onSendToRVC(audio)} style={{
          padding: "8px 14px", borderRadius: 8, border: "1px solid #ec489944",
          background: "#ec489911", color: "#ec4899", cursor: "pointer",
          fontSize: 12, fontWeight: 600,
        }}>
          🎤 → RVC
        </button>
      </div>
    </div>
  );
}

export default function SunoTab({ addLog }) {
  const [model, setModel]           = useState("chirp-auk-turbo");
  const [mode, setMode]             = useState("prompt");   // "prompt" | "custom"
  const [prompt, setPrompt]         = useState("");
  const [style, setStyle]           = useState("");
  const [lyrics, setLyrics]         = useState("");
  const [title, setTitle]           = useState("");
  const [instrumental, setInstrumental] = useState(false);

  const [loading, setLoading]       = useState(false);
  const [statusMsg, setStatusMsg]   = useState("");
  const [results, setResults]       = useState([]);
  const [error, setError]           = useState(null);
  const [elapsed, setElapsed]       = useState(0);
  const [sunoApiConnected, setSunoApiConnected] = useState(null); // null = checking, true/false
  const timerRef                    = useRef(null);

  // Check suno-api connection on mount via backend health endpoint
  useEffect(() => {
    const checkSunoApi = async () => {
      try {
        const res = await fetch(`${API}/suno/health`);
        const data = await res.json();
        setSunoApiConnected(data.status === "connected");
      } catch {
        setSunoApiConnected(false);
      }
    };
    checkSunoApi();
  }, []);

  // Timer
  useEffect(() => {
    if (loading) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [loading]);

  const handleGenerate = async () => {
    if (!prompt.trim() && !lyrics.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setStatusMsg("🎵 Sending request to Suno...");

    const fd = new FormData();
    fd.append("model",        model);
    fd.append("prompt",       prompt);
    fd.append("style",        style);
    fd.append("lyrics",       mode === "custom" ? lyrics : "");
    fd.append("title",        title);
    fd.append("instrumental", instrumental ? "true" : "false");

    try {
      setStatusMsg("⏳ Suno is generating... waiting for audio_url (30-90s)");
      const res  = await fetch(`${API}/suno/generate`, { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok || data.status === "error") {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setResults(data.audios || []);
      setStatusMsg(`✅ ${data.audios?.length || 0} tracks generated!`);
      addLog?.(`[Suno] Generated ${data.audios?.length} tracks — model: ${model}`);
    } catch (e) {
      setError(e.message);
      setStatusMsg("");
      addLog?.(`[ERR] Suno: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendToPipeline = (audio) => {
    // Store in localStorage for Pipeline tab to pick up
    const key = `suno_for_pipeline_${Date.now()}`;
    localStorage.setItem(key, JSON.stringify({ url: audio.audio_url, title: audio.title }));
    addLog?.(`[Suno] Sent to Pipeline: ${audio.title}`);
    alert(`✅ "${audio.title}" sent to Pipeline!\nOpen the Vocal Pipeline tab and load the file manually from URL:\n${audio.audio_url}`);
  };

  const handleSendToRVC = (audio) => {
    addLog?.(`[Suno] Sent to RVC: ${audio.title}`);
    alert(`✅ "${audio.title}" — Audio URL:\n${audio.audio_url}\n\nCopy the URL and use it in the RVC Voice Conversion tab.`);
  };

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", color: "#e5e7eb" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: "linear-gradient(135deg, #f59e0b, #ef4444)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, boxShadow: "0 0 20px #f59e0b44",
          }}>🎵</div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: "white", margin: 0, letterSpacing: 1 }}>
              Suno AI
            </h2>
            <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
              Generate music with Suno (local cookie)
            </p>
          </div>
          {/* Status indicator */}
          <div style={{
            padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
            background: sunoApiConnected === null ? "#1f2937"
              : sunoApiConnected ? "#05966922" : "#ef444422",
            border: `1px solid ${sunoApiConnected === null ? "#374151"
              : sunoApiConnected ? "#05966966" : "#ef444466"}`,
            color: sunoApiConnected === null ? "#6b7280"
              : sunoApiConnected ? "#059669" : "#ef4444",
          }}>
            {sunoApiConnected === null ? "⏳ Checking..."
              : sunoApiConnected ? SUNO_API_STATUS.connected : SUNO_API_STATUS.disconnected}
          </div>
        </div>
      </div>

      {/* Model selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {MODELS.map(m => (
          <button key={m.id} onClick={() => setModel(m.id)} style={{
            flex: 1, padding: "10px 8px", borderRadius: 10, cursor: "pointer",
            background: model === m.id ? "linear-gradient(135deg, #f59e0b22, #ef444422)" : "#111827",
            border: `1px solid ${model === m.id ? "#f59e0b66" : "#1f2937"}`,
            color: model === m.id ? "#f59e0b" : "#6b7280",
            transition: "all 0.2s",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{m.label}</div>
            <div style={{ fontSize: 10, marginTop: 2, opacity: 0.8 }}>{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, background: "#111827",
        borderRadius: 10, padding: 4, border: "1px solid #1f2937" }}>
        {[
          { id: "prompt", label: "🎲 Inspiration Mode", desc: "Suno picks the style" },
          { id: "custom", label: "✏️ Custom Mode",      desc: "Your lyrics + style" },
        ].map(m => (
          <button key={m.id} onClick={() => setMode(m.id)} style={{
            flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", cursor: "pointer",
            background: mode === m.id ? "#1f2937" : "transparent",
            color: mode === m.id ? "white" : "#6b7280",
            fontWeight: mode === m.id ? 700 : 500, fontSize: 13,
            transition: "all 0.2s",
          }}>
            {m.label}
            <span style={{ fontSize: 10, color: "#6b7280", marginLeft: 6 }}>{m.desc}</span>
          </button>
        ))}
      </div>

      {/* Main input area */}
      <div style={{ background: "#111827", borderRadius: 14, padding: 20,
        border: "1px solid #1f2937", marginBottom: 16 }}>

        {/* Prompt / Style */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 6, fontWeight: 600 }}>
            {mode === "prompt" ? "🎯 Music Prompt" : "🎨 Music Style"}
          </label>
          <input
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={mode === "prompt"
              ? "e.g. Romanian pop trap, emotional, male vocal, 120bpm..."
              : "e.g. romanian pop, piano, emotional, studio quality"}
            style={{
              width: "100%", background: "#0d1117", color: "white",
              border: "1px solid #374151", borderRadius: 8,
              padding: "10px 14px", fontSize: 13, boxSizing: "border-box",
              outline: "none",
            }}
          />
          {/* Style presets */}
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            {STYLE_PRESETS.map(p => (
              <button key={p} onClick={() => setPrompt(p)} style={{
                padding: "3px 10px", borderRadius: 999, border: "1px solid #374151",
                background: "transparent", color: "#6b7280", fontSize: 11, cursor: "pointer",
              }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Custom mode extras */}
        {mode === "custom" && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 6, fontWeight: 600 }}>
                📝 Title
              </label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Song title..."
                style={{ width: "100%", background: "#0d1117", color: "white",
                  border: "1px solid #374151", borderRadius: 8,
                  padding: "10px 14px", fontSize: 13, boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 6, fontWeight: 600 }}>
                🎤 Lyrics
              </label>
              <textarea value={lyrics} onChange={e => setLyrics(e.target.value)}
                placeholder={"[Verse]\nYour lyrics here...\n\n[Chorus]\nChorus here..."}
                rows={8}
                style={{ width: "100%", background: "#0d1117", color: "white",
                  border: "1px solid #374151", borderRadius: 8,
                  padding: "10px 14px", fontSize: 13, boxSizing: "border-box",
                  resize: "vertical", fontFamily: "monospace", lineHeight: 1.6 }} />
            </div>
          </>
        )}

        {/* Instrumental toggle */}
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
          <div onClick={() => setInstrumental(v => !v)} style={{
            width: 40, height: 22, borderRadius: 999, position: "relative", cursor: "pointer",
            background: instrumental ? "#f59e0b" : "#374151", transition: "background 0.2s",
          }}>
            <div style={{
              position: "absolute", top: 3, left: instrumental ? 21 : 3,
              width: 16, height: 16, borderRadius: "50%", background: "white",
              transition: "left 0.2s",
            }} />
          </div>
          <span style={{ fontSize: 13, color: "#9ca3af" }}>
            🎸 Instrumental (no vocals)
          </span>
        </label>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={loading || (!prompt.trim() && !lyrics.trim())}
        style={{
          width: "100%", padding: "16px", borderRadius: 12, border: "none",
          cursor: loading || (!prompt.trim() && !lyrics.trim()) ? "not-allowed" : "pointer",
          background: loading
            ? "#1f2937"
            : "linear-gradient(135deg, #f59e0b, #ef4444)",
          color: loading ? "#6b7280" : "white",
          fontWeight: 800, fontSize: 15, letterSpacing: 1,
          marginBottom: 20, transition: "all 0.2s",
          boxShadow: loading ? "none" : "0 4px 20px #f59e0b44",
        }}
      >
        {loading
          ? `⏳ Generating... ${elapsed}s`
          : "🎵 Generate with Suno"}
      </button>

      {/* Status */}
      {statusMsg && (
        <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 10,
          background: error ? "#ef444411" : "#f59e0b11",
          border: `1px solid ${error ? "#ef444433" : "#f59e0b33"}`,
          color: error ? "#ef4444" : "#f59e0b", fontSize: 13 }}>
          {statusMsg}
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 10,
          background: "#ef444411", border: "1px solid #ef444433",
          color: "#ef4444", fontSize: 13 }}>
          ❌ {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 12, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: 1 }}>
            🎧 Generated Tracks ({results.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {results.map((audio, i) => (
              <AudioCard
                key={audio.id || i}
                audio={audio}
                onSendToPipeline={handleSendToPipeline}
                onSendToRVC={handleSendToRVC}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
