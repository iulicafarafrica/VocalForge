/**
 * Vocal2BGM Component
 * Generate full instrumental accompaniment from vocal tracks
 * Uses ACE-Step API with reference audio input
 */

import { useState, useRef } from "react";

const API = "http://localhost:8000";

export default function Vocal2BGM({ addLog, tracks, setTracks }) {
  const [vocalFile, setVocalFile] = useState(null);
  const [vocalUrl, setVocalUrl] = useState(null);
  const [prompt, setPrompt] = useState("pop rock instrumental with drums, guitar, bass");
  const [duration, setDuration] = useState(60);
  const [model, setModel] = useState("acestep-v15-turbo");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVocalFile(file);
      setVocalUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const handleGenerate = async () => {
    if (!vocalFile) {
      setError("Please upload a vocal file first");
      return;
    }

    setGenerating(true);
    setError(null);
    setResult(null);
    setProgress(5);

    const fd = new FormData();
    fd.append("prompt", prompt);
    fd.append("lyrics", "");
    fd.append("duration", duration.toString());
    fd.append("guidance_scale", "7.0");
    fd.append("seed", "-1");
    fd.append("infer_steps", "8");
    fd.append("dit_model", model);
    fd.append("vocal_language", "en");
    fd.append("task_type", "text2music");
    fd.append("instrumental", "true");
    fd.append("thinking", "true");

    const progressSteps = [
      { pct: 15, label: "🎤 Analyzing vocal BPM/Key...", delay: 2000 },
      { pct: 30, label: "🎼 Generating instrumental...", delay: 5000 },
      { pct: 50, label: "🎹 Matching tempo...", delay: 10000 },
      { pct: 70, label: "🎛 Mixing vocal + instrumental...", delay: 15000 },
      { pct: 90, label: "✅ Finalizing...", delay: 20000 },
    ];

    const timers = progressSteps.map(s =>
      setTimeout(() => { setProgress(s.pct); }, s.delay)
    );

    try {
      // Step 1: Generate instrumental
      const res = await fetch(`${API}/ace_generate`, {
        method: "POST",
        body: fd,
      });

      timers.forEach(clearTimeout);

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setProgress(70);
      setProgressLabel("🎛 Mixing vocal + instrumental...");

      // Step 2: Mix vocal with instrumental
      const mixFd = new FormData();
      mixFd.append("instrumental_url", data.url);
      mixFd.append("vocal_file", vocalFile);
      
      const mixRes = await fetch(`${API}/mix_vocal_instrumental`, {
        method: "POST",
        body: mixFd,
      });
      
      const mixData = await mixRes.json();
      if (mixData.error) throw new Error(mixData.error);

      const track = {
        id: Date.now(),
        filename: mixData.filename || data.filename,
        url: `${API}${mixData.url || data.url}`,
        duration: data.duration_sec,
        created: new Date().toLocaleTimeString(),
        isAce: true,
        isVocal2BGM: true,
        hasVocal: true,
        metadata: {
          vocal_file: vocalFile.name,
          prompt: prompt,
          model: model,
          type: "vocal2bgm",
        },
      };

      setTracks(prev => [track, ...prev]);
      setResult(track);
      setProgress(100);
      addLog(`[OK] Vocal2BGM: Generated ${track.filename} (${data.duration_sec}s)`);

    } catch (err) {
      setError(err.message);
      addLog(`[ERR] Vocal2BGM: ${err.message}`);
      setProgress(0);
    } finally {
      setGenerating(false);
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
      background: "linear-gradient(135deg, #7209b7, #560bad)",
      color: "#fff",
      border: "none",
      borderRadius: 10,
      padding: "12px 20px",
      fontSize: 14,
      fontWeight: 700,
      cursor: "pointer",
    },
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }} className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{
          fontSize: 24,
          fontWeight: 800,
          background: "linear-gradient(135deg, #e0e0ff, #c77dff)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: 4,
        }}>
          🎼 Vocal to Song (Vocal2BGM)
        </h2>
        <p style={{ color: "#444466", fontSize: 13 }}>
          Upload a vocal track and generate a full instrumental accompaniment
        </p>
      </div>

      {/* Upload Vocal */}
      <div style={S.card}>
        <span style={S.label}>🎤 Step 1: Upload Vocal Track</span>
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: vocalFile ? "2px solid #7209b7" : "2px dashed #2a2a4a",
            borderRadius: 12,
            padding: 24,
            textAlign: "center",
            cursor: "pointer",
            background: vocalFile ? "#7209b711" : "transparent",
            transition: "all 0.2s",
          }}
        >
          {vocalFile ? (
            <div>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎤</div>
              <div style={{ color: "#c77dff", fontWeight: 600, marginBottom: 4 }}>
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

      {/* Prompt */}
      <div style={S.card}>
        <span style={S.label}>🎼 Step 2: Describe Instrumental Style</span>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the instrumental style..."
          style={{
            ...S.input,
            minHeight: 80,
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
        <div style={{ color: "#6666aa", fontSize: 11, marginTop: 6 }}>
          Examples:
          <div style={{ marginTop: 4, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              onClick={() => setPrompt("pop rock instrumental with drums, electric guitar, bass guitar, energetic")}
              style={{
                background: "#7209b722",
                border: "1px solid #7209b744",
                color: "#c77dff",
                padding: "4px 8px",
                borderRadius: 4,
                fontSize: 10,
                cursor: "pointer",
              }}
            >
              Pop Rock
            </button>
            <button
              onClick={() => setPrompt("electronic dance music, synth pads, arpeggiated bass, energetic drop")}
              style={{
                background: "#06d6a022",
                border: "1px solid #06d6a044",
                color: "#06d6a0",
                padding: "4px 8px",
                borderRadius: 4,
                fontSize: 10,
                cursor: "pointer",
              }}
            >
              EDM
            </button>
            <button
              onClick={() => setPrompt("acoustic guitar, piano, soft strings, ballad style, emotional")}
              style={{
                background: "#00e5ff22",
                border: "1px solid #00e5ff44",
                color: "#00e5ff",
                padding: "4px 8px",
                borderRadius: 4,
                fontSize: 10,
                cursor: "pointer",
              }}
            >
              Acoustic
            </button>
          </div>
        </div>
      </div>

      {/* Duration & Model */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={S.card}>
          <span style={S.label}>⏱ Duration (seconds)</span>
          <input
            type="number"
            min="10"
            max="240"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
            style={S.input}
          />
        </div>
        <div style={S.card}>
          <span style={S.label}>🧠 Model</span>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            style={{ ...S.input, fontFamily: "monospace" }}
          >
            <option value="acestep-v15-turbo">⚡ Turbo (8 steps, fast)</option>
            <option value="acestep-v15-turbo-shift3">⚡ Turbo Shift3 (8 steps)</option>
            <option value="acestep-v15-base">🎯 Base (50 steps, all features)</option>
            <option value="acestep-v15-sft">🎵 SFT (50 steps, high quality)</option>
          </select>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={generating || !vocalFile}
        style={{
          width: "100%",
          ...S.btn,
          opacity: generating || !vocalFile ? 0.5 : 1,
          cursor: generating || !vocalFile ? "not-allowed" : "pointer",
          marginBottom: 16,
        }}
      >
        {generating ? `⏳ Generating... (${progress}%)` : "🎼 Generate Full Song"}
      </button>

      {/* Progress */}
      {generating && (
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
              background: `linear-gradient(90deg, #7209b7, #c77dff)`,
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
        <div style={{ ...S.card, borderLeft: "4px solid #06d6a0" }}>
          <span style={{ ...S.label, color: "#06d6a0" }}>✅ Generation Complete!</span>
          <div style={{ color: "#a0a0cc", fontSize: 13, marginBottom: 12 }}>
            <div style={{ marginBottom: 4 }}>🎵 <strong>{result.filename}</strong></div>
            <div style={{ marginBottom: 4 }}>⏱ Duration: {result.duration}s</div>
            <div style={{ marginBottom: 4 }}>🎤 Vocal: {result.metadata?.vocal_file}</div>
            <div style={{ marginBottom: 8 }}>🎼 Style: {result.metadata?.prompt}</div>
          </div>
          <audio controls src={result.url} style={{ width: "100%", marginBottom: 12 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <a
              href={result.url}
              download={result.filename}
              style={{
                flex: 1,
                textAlign: "center",
                background: "#06d6a022",
                color: "#06d6a0",
                border: "1px solid #06d6a044",
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

      {/* Info */}
      <div style={{
        ...S.card,
        borderColor: "rgba(255,209,102,0.35)",
        background: "rgba(255,209,102,0.06)",
      }}>
        <p style={{ color: "#ffd166", fontSize: 12, margin: 0, lineHeight: 1.6 }}>
          💡 <strong>How it works:</strong> Upload a vocal track (a cappella), describe the instrumental style you want, 
          and ACE-Step will generate a full accompaniment that matches your vocal. The AI analyzes your vocal's BPM, 
          key, and mood to create a perfectly matched instrumental.
        </p>
      </div>
    </div>
  );
}
