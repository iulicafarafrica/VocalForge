import { useState, useRef, useEffect } from "react";

const API = "http://localhost:8000";

function formatTime(sec) {
  if (!sec) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function WaveformBar({ playing, color = "#00e5ff" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height: 20 }}>
      {[4, 8, 12, 8, 14, 10, 6, 12, 8, 4].map((h, i) => (
        <div key={i} style={{
          width: 3, height: playing ? h : 3, background: color,
          borderRadius: 2, transition: "height 0.15s",
          animation: playing ? `wave ${0.4 + i * 0.07}s ease-in-out infinite alternate` : "none",
        }} />
      ))}
    </div>
  );
}

function TrackRow({ track, onDelete, isSegment = false }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(track.duration || 0);
  const [volume, setVolume] = useState(1.0);
  const [muted, setMuted] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(track.analysis || null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  };

  const seek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * duration;
  };

  const handleVolume = (v) => {
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const handleMute = () => {
    setMuted(!muted);
    if (audioRef.current) audioRef.current.muted = !muted;
  };

  const handleAnalyze = async () => {
    if (analyzing) return;
    setAnalyzing(true);
    
    try {
      const response = await fetch(`${API}/detect_bpm_key`, {
        method: 'POST',
        body: (() => {
          const fd = new FormData();
          fd.append('file', new File([], track.filename, { type: 'audio/wav' }));
          return fd;
        })(),
        headers: {
          // Need to fetch actual audio blob
        }
      });
      
      // Fetch actual audio file
      const audioBlob = await fetch(track.url).then(r => r.blob());
      const fd = new FormData();
      fd.append('file', audioBlob, 'audio.wav');
      
      const result = await fetch(`${API}/detect_bpm_key`, {
        method: 'POST',
        body: fd
      });
      
      const data = await result.json();
      if (data.status === 'ok') {
        setAnalysis(data);
        // Save to track metadata
        const updatedTracks = tracks.map(t => 
          t.id === track.id 
            ? { ...t, analysis: data, metadata: { ...t.metadata, bpm: data.bpm, key: data.key } }
            : t
        );
        setTracks(updatedTracks);
      }
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const meta = track.metadata || {};
  const timing = meta.timing || {};
  const color = isSegment ? "#7209b7" : (track.preview ? "#ffd166" : "#00e5ff");

  return (
    <div style={{
      background: "#0a0a1a", borderRadius: 10, padding: "10px 12px", marginBottom: 8,
      border: `1px solid ${playing ? color + "66" : "#1a1a2e"}`,
      transition: "border-color 0.2s",
    }}>
      <audio ref={audioRef} src={track.url} preload="metadata" />

      {/* Top row: play + info */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Play button */}
        <button onClick={togglePlay} style={{
          width: 36, height: 36, borderRadius: "50%",
          background: playing ? color : "#1a1a2e",
          border: `1px solid ${color}44`,
          color: playing ? "#000" : color,
          fontSize: 14, cursor: "pointer", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s",
        }}>
          {playing ? "⏸" : "▶"}
        </button>

        {/* Waveform animation */}
        <WaveformBar playing={playing} color={color} />

        {/* Track info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#e0e0ff", fontSize: 11, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {isSegment ? `📦 ${track.filename}` : `🎵 ${track.filename}`}
          </div>
          <div style={{ color: "#444466", fontSize: 10, marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {track.speaker && <span style={{ color: "#8888ff" }}>{track.speaker}</span>}
            {duration > 0 && <span>{formatTime(currentTime)} / {formatTime(duration)}</span>}
            {track.created && <span>{track.created}</span>}
            {track.preview && <span style={{ color: "#ffd166" }}>PREVIEW</span>}
            {isSegment && <span style={{ color: "#7209b7" }}>SEG {track.segIdx + 1}</span>}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {/* Analyze button */}
          <button 
            onClick={handleAnalyze} 
            disabled={analyzing}
            title="Analyze Audio (BPM, Key, Time Sig)"
            style={{
              background: analyzing ? "#444466" : analysis ? "#06d6a022" : "#1a1a2e",
              color: analyzing ? "#8888aa" : analysis ? "#06d6a0" : "#6666aa",
              border: `1px solid ${analyzing ? "#444466" : analysis ? "#06d6a044" : "#2a2a4a"}`,
              borderRadius: 5,
              padding: "3px 7px",
              fontSize: 11,
              cursor: analyzing ? "wait" : "pointer",
              fontWeight: 600,
            }}
          >
            {analyzing ? "⏳" : analysis ? "✅" : "🎛️"}
          </button>
          
          <button onClick={handleMute} title={muted ? "Unmute" : "Mute"} style={{
            background: muted ? "#e6394622" : "#1a1a2e", color: muted ? "#e63946" : "#6666aa",
            border: `1px solid ${muted ? "#e6394644" : "#2a2a4a"}`, borderRadius: 5,
            padding: "3px 7px", fontSize: 11, cursor: "pointer",
          }}>
            {muted ? "🔇" : "🔊"}
          </button>
          {track.url && (
            <a href={track.url} download style={{
              background: "#06d6a022", color: "#06d6a0", border: "1px solid #06d6a044",
              padding: "3px 8px", borderRadius: 5, fontSize: 11, textDecoration: "none", fontWeight: 700,
            }}>↓</a>
          )}
          <button onClick={onDelete} style={{
            background: "#e6394622", color: "#e63946", border: "1px solid #e6394644",
            padding: "3px 8px", borderRadius: 5, fontSize: 11, cursor: "pointer",
          }}>✕</button>
        </div>
      </div>

      {/* Seek bar */}
      {duration > 0 && (
        <div onClick={seek} style={{
          marginTop: 8, height: 4, background: "#1a1a2e", borderRadius: 2,
          cursor: "pointer", position: "relative", overflow: "hidden",
        }}>
          <div style={{
            height: 4, background: `linear-gradient(90deg, ${color}, ${color}88)`,
            width: `${(currentTime / duration) * 100}%`,
            borderRadius: 2, transition: "width 0.1s",
          }} />
        </div>
      )}

      {/* Volume slider */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
        <span style={{ color: "#444466", fontSize: 10 }}>Vol</span>
        <input type="range" min={0} max={1} step={0.05} value={volume}
          onChange={e => handleVolume(Number(e.target.value))}
          style={{ flex: 1, accentColor: color, height: 3 }} />
        <span style={{ color: color, fontSize: 10, fontFamily: "monospace", minWidth: 28 }}>
          {Math.round(volume * 100)}%
        </span>
      </div>

      {/* Metadata (collapsible) */}
      {(timing.total_sec || meta.output_size_mb || analysis) && (
        <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {/* Audio Analysis Results */}
          {analysis && (
            <>
              <span style={{ color: "#06d6a0", fontSize: 10, fontFamily: "monospace", fontWeight: 600 }}>🎛️ {analysis.bpm} BPM</span>
              <span style={{ color: "#00e5ff", fontSize: 10, fontFamily: "monospace" }}>🎵 {analysis.key}</span>
              <span style={{ color: "#ffd166", fontSize: 10, fontFamily: "monospace" }}>📏 {analysis.time_signature}/4</span>
              <span style={{ color: "#c77dff", fontSize: 10, fontFamily: "monospace" }}>⏱ {analysis.duration}s</span>
            </>
          )}
          
          {timing.total_sec && <span style={{ color: "#333355", fontSize: 10, fontFamily: "monospace" }}>⏱ {timing.total_sec}s total</span>}
          {timing.demucs_sec && <span style={{ color: "#333355", fontSize: 10, fontFamily: "monospace" }}>demucs:{timing.demucs_sec}s</span>}
          {timing.sovits_sec && <span style={{ color: "#333355", fontSize: 10, fontFamily: "monospace" }}>sovits:{timing.sovits_sec}s</span>}
          {meta.output_size_mb && <span style={{ color: "#333355", fontSize: 10, fontFamily: "monospace" }}>💾 {meta.output_size_mb}MB</span>}
          {meta.vram_used_gb && <span style={{ color: "#333355", fontSize: 10, fontFamily: "monospace" }}>GPU:{meta.vram_used_gb}GB</span>}
        </div>
      )}
    </div>
  );
}

export default function TracksPanel({ tracks, setTracks }) {
  const [filter, setFilter] = useState("all"); // all | covers | previews | segments

  const filtered = tracks.filter(t => {
    if (filter === "covers") return !t.preview && !t.isSegment;
    if (filter === "previews") return t.preview;
    if (filter === "segments") return t.isSegment;
    return true;
  });

  const covers = tracks.filter(t => !t.preview && !t.isSegment).length;
  const previews = tracks.filter(t => t.preview).length;
  const segments = tracks.filter(t => t.isSegment).length;

  const S = {
    card: { background: "linear-gradient(135deg,#0d0d22 0%,#0a0a1a 100%)", border: "1px solid #1e1e3a", borderRadius: 12, padding: 16 },
    label: { color: "#6666aa", fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10, display: "block" },
    tab: (active) => ({
      padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
      background: active ? "#00e5ff22" : "transparent",
      color: active ? "#00e5ff" : "#444466",
      border: `1px solid ${active ? "#00e5ff44" : "#1a1a2e"}`,
    }),
  };

  return (
    <div style={S.card}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={S.label}>📁 Tracks ({tracks.length})</span>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { key: "all", label: `All (${tracks.length})` },
            { key: "covers", label: `Covers (${covers})` },
            { key: "previews", label: `Previews (${previews})` },
            { key: "segments", label: `Segments (${segments})` },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={S.tab(filter === f.key)}>
              {f.label}
            </button>
          ))}
          {tracks.length > 0 && (
            <button onClick={() => setTracks([])} style={{
              padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer",
              background: "#e6394611", color: "#e63946", border: "1px solid #e6394433",
            }}>
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Track list */}
      <div style={{ maxHeight: 500, overflowY: "auto" }}>
        {filtered.length === 0 && (
          <div style={{ color: "#333355", fontSize: 12, textAlign: "center", padding: "30px 0" }}>
            {tracks.length === 0 ? "No tracks yet. Generate a cover to get started!" : "No tracks in this category."}
          </div>
        )}
        {filtered.map(track => (
          <TrackRow
            key={track.id}
            track={track}
            isSegment={track.isSegment}
            onDelete={() => setTracks(prev => prev.filter(t => t.id !== track.id))}
          />
        ))}
      </div>
    </div>
  );
}
