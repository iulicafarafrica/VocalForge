import { useState } from "react";

const API = "http://localhost:8000";

export default function KaraokeTab({ addLog, tracks, setTracks }) {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [vocalReduction, setVocalReduction] = useState(1.0);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFile(file);
    addLog(`[OK] Karaoke: uploaded ${file.name}`);
  };

  const handleGenerate = async () => {
    if (!uploadedFile) { addLog("[ERR] No file uploaded"); return; }
    setProcessing(true);
    setProgress(10);
    addLog(`[OK] Karaoke: removing vocals (reduction=${vocalReduction})...`);

    const fd = new FormData();
    fd.append("file", uploadedFile);
    fd.append("vocal_reduction", vocalReduction);

    try {
      setProgress(30);
      const res = await fetch(`${API}/karaoke`, { method: "POST", body: fd });
      setProgress(90);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const t = {
        id: Date.now(),
        filename: data.filename,
        url: `${API}${data.url}`,
        duration: data.duration_sec,
        created: new Date().toLocaleTimeString(),
        isKaraoke: true,
        metadata: data.metadata || {},
      };
      setTracks(prev => [t, ...prev]);
      setProgress(100);
      addLog(`[OK] Karaoke done: ${data.filename} (${data.duration_sec}s, ${data.processing_time_sec}s processing)`);
    } catch (err) {
      addLog(`[ERR] Karaoke failed: ${err.message}`);
    } finally {
      setTimeout(() => { setProcessing(false); setProgress(0); }, 1200);
    }
  };

  const S = {
    card: { background: "linear-gradient(135deg,#0d0d22,#0a0a1a)", border: "1px solid #1e1e3a", borderRadius: 12, padding: 20, marginBottom: 16 },
    label: { color: "#6666aa", fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10, display: "block" },
  };

  const reductionLabel = vocalReduction === 1.0 ? "Full Removal" : vocalReduction >= 0.7 ? "Strong" : vocalReduction >= 0.4 ? "Medium" : "Light";
  const reductionColor = vocalReduction === 1.0 ? "#e63946" : vocalReduction >= 0.7 ? "#ffd166" : "#06d6a0";

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🎵</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#e0e0ff", marginBottom: 4 }}>Karaoke Mode</div>
        <div style={{ color: "#444466", fontSize: 13 }}>Remove vocals from any song using AI (Demucs htdemucs)</div>
      </div>

      {/* Upload */}
      <div style={S.card}>
        <span style={S.label}>🎵 Upload Song</span>
        <label style={{
          display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
          background: "#0a0a1a", border: `2px dashed ${uploadedFile ? "#06d6a0" : "#2a2a4a"}`,
          borderRadius: 10, cursor: "pointer", transition: "border-color 0.2s",
        }}>
          <span style={{ fontSize: 28 }}>🎤</span>
          <div>
            <div style={{ color: uploadedFile ? "#06d6a0" : "#6666aa", fontSize: 14, fontWeight: 600 }}>
              {uploadedFile ? uploadedFile.name : "Click to upload audio file"}
            </div>
            <div style={{ color: "#333355", fontSize: 11, marginTop: 2 }}>WAV, MP3, FLAC — vocals will be removed by AI</div>
          </div>
          <input type="file" accept="audio/*" onChange={handleUpload} style={{ display: "none" }} />
        </label>
      </div>

      {/* Vocal Reduction Slider */}
      <div style={S.card}>
        <span style={S.label}>🎚 Vocal Reduction</span>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ color: "#8888aa", fontSize: 12 }}>Reduction Amount</span>
          <span style={{ color: reductionColor, fontSize: 13, fontWeight: 700, fontFamily: "monospace" }}>
            {Math.round(vocalReduction * 100)}% — {reductionLabel}
          </span>
        </div>
        <input
          type="range" min={0} max={1} step={0.05} value={vocalReduction}
          onChange={e => setVocalReduction(Number(e.target.value))}
          style={{ width: "100%", accentColor: reductionColor }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ color: "#333355", fontSize: 10 }}>0% — Original</span>
          <span style={{ color: "#333355", fontSize: 10 }}>100% — Full Karaoke</span>
        </div>

        {/* Presets */}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {[
            { label: "Full Karaoke", val: 1.0, color: "#e63946" },
            { label: "Soft Remove", val: 0.7, color: "#ffd166" },
            { label: "Blend 50%", val: 0.5, color: "#06d6a0" },
            { label: "Subtle", val: 0.3, color: "#00e5ff" },
          ].map(p => (
            <button key={p.val} onClick={() => setVocalReduction(p.val)} style={{
              flex: 1, padding: "6px 4px", borderRadius: 6, fontSize: 10, fontWeight: 700,
              background: vocalReduction === p.val ? p.color + "33" : "#0a0a1a",
              border: `1px solid ${vocalReduction === p.val ? p.color : "#2a2a4a"}`,
              color: vocalReduction === p.val ? p.color : "#444466",
              cursor: "pointer", transition: "all 0.15s",
            }}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <div style={S.card}>
        <button
          onClick={handleGenerate}
          disabled={processing || !uploadedFile}
          style={{
            width: "100%", padding: "16px 0", borderRadius: 10,
            background: processing ? "#1a1a2e" : (uploadedFile ? "linear-gradient(135deg, #06d6a0, #06d6a0bb)" : "#1a1a2e"),
            color: "#000", fontWeight: 800, fontSize: 16, border: "none",
            cursor: (processing || !uploadedFile) ? "not-allowed" : "pointer",
            opacity: !uploadedFile ? 0.5 : 1,
          }}>
          {processing ? "⚙ Removing vocals..." : "🎵 Generate Karaoke"}
        </button>

        {processing && (
          <div style={{ marginTop: 8 }}>
            <div style={{ height: 4, background: "#1a1a2e", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: 4, background: "linear-gradient(90deg, #06d6a0, #fff)", width: `${progress}%`, transition: "width 0.6s", borderRadius: 2 }} />
            </div>
            <div style={{ color: "#6666aa", fontSize: 11, marginTop: 4, textAlign: "center" }}>
              Separating vocals with Demucs AI...
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ ...S.card, background: "#06d6a011", border: "1px solid #06d6a033" }}>
        <div style={{ color: "#06d6a0", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>ℹ How it works</div>
        <div style={{ color: "#6666aa", fontSize: 12, lineHeight: 1.7 }}>
          <div>1. 🎵 Upload any song (WAV, MP3, FLAC)</div>
          <div>2. 🤖 Demucs AI separates vocals from instruments</div>
          <div>3. 🎚 Adjust vocal reduction (100% = pure instrumental)</div>
          <div>4. ⬇ Download your karaoke track</div>
        </div>
      </div>

      {/* Recent karaoke tracks */}
      {tracks.filter(t => t.isKaraoke).length > 0 && (
        <div style={S.card}>
          <span style={S.label}>📁 Recent Karaoke Tracks</span>
          {tracks.filter(t => t.isKaraoke).map(track => (
            <div key={track.id} style={{ background: "#0a0a1a", borderRadius: 8, padding: "10px 12px", marginBottom: 8, border: "1px solid #1a1a2e" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ color: "#06d6a0", fontSize: 12, fontFamily: "monospace" }}>🎵 {track.filename}</span>
                <div style={{ display: "flex", gap: 4 }}>
                  <a href={track.url} download style={{ background: "#06d6a022", color: "#06d6a0", border: "1px solid #06d6a044", padding: "3px 8px", borderRadius: 5, fontSize: 11, textDecoration: "none", fontWeight: 700 }}>↓</a>
                  <button onClick={() => setTracks(prev => prev.filter(t => t.id !== track.id))} style={{ background: "#e6394622", color: "#e63946", border: "1px solid #e6394644", padding: "3px 8px", borderRadius: 5, fontSize: 11, cursor: "pointer" }}>✕</button>
                </div>
              </div>
              <audio controls src={track.url} style={{ width: "100%", height: 28 }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
