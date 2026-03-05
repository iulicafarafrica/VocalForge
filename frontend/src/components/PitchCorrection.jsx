/**
 * PitchCorrection Component
 * Apply auto-tune style pitch correction to vocal recordings
 * Flow: Upload vocal → Select scale → Apply correction → Preview A/B → Export
 */

import { useState, useRef } from "react";

const API = "http://localhost:8000";

const SCALES = [
  { label: "🎵 C Major", value: "C major" },
  { label: "🎵 D♭ Major", value: "C# major" },
  { label: "🎵 D Major", value: "D major" },
  { label: "🎵 E♭ Major", value: "D# major" },
  { label: "🎵 E Major", value: "E major" },
  { label: "🎵 F Major", value: "F major" },
  { label: "🎵 G♭ Major", value: "F# major" },
  { label: "🎵 G Major", value: "G major" },
  { label: "🎵 A♭ Major", value: "G# major" },
  { label: "🎵 A Major", value: "A major" },
  { label: "🎵 B♭ Major", value: "A# major" },
  { label: "🎵 B Major", value: "B major" },
  { label: "🎹 A Minor", value: "A minor" },
  { label: "🎹 C Minor", value: "C minor" },
  { label: "🎹 D Minor", value: "D minor" },
  { label: "🎹 E Minor", value: "E minor" },
  { label: "🎹 F Minor", value: "F minor" },
  { label: "🎹 G Minor", value: "G minor" },
  { label: "🎼 C Major Pentatonic", value: "C major pentatonic" },
  { label: "🎼 A Minor Pentatonic", value: "A minor pentatonic" },
  { label: "🎹 Chromatic (All Notes)", value: "chromatic" },
];

const PRESETS = [
  { label: "Natural", strength: 0.3, desc: "Subtle polish" },
  { label: "Pop", strength: 0.7, desc: "Radio ready" },
  { label: "Hyperpop", strength: 1.0, desc: "Full T-Pain effect" },
  { label: "Rap", strength: 0.5, desc: "Light correction" },
];

export default function PitchCorrection({ addLog, tracks, setTracks }) {
  const [vocalFile, setVocalFile] = useState(null);
  const [vocalUrl, setVocalUrl] = useState(null);
  const [selectedScale, setSelectedScale] = useState("C major");
  const [correctionStrength, setCorrectionStrength] = useState(0.7);
  const [preserveFormant, setPreserveFormant] = useState(true);
  const [correcting, setCorrecting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isPlayingOriginal, setIsPlayingOriginal] = useState(false);

  const fileInputRef = useRef(null);
  const originalAudioRef = useRef(null);
  const correctedAudioRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVocalFile(file);
      setVocalUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
      setProgress(0);
    }
  };

  const handlePresetClick = (preset) => {
    setCorrectionStrength(preset.strength);
    addLog(`[PitchCorrection] Preset "${preset.label}" selected (${preset.strength * 100}%)`);
  };

  const handleCorrect = async () => {
    if (!vocalFile) return;

    setCorrecting(true);
    setResult(null);
    setError(null);
    setProgress(10);

    try {
      const fd = new FormData();
      fd.append("vocal_file", vocalFile);
      fd.append("key_scale", selectedScale);
      fd.append("correction_strength", correctionStrength.toString());
      fd.append("preserve_formant", preserveFormant.toString());
      fd.append("output_format", "wav");

      // Simulate progress
      const progressTimer = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + 5 : prev));
      }, 1000);

      const res = await fetch(`${API}/vocal_correct`, {
        method: "POST",
        body: fd,
      });
      clearInterval(progressTimer);

      const data = await res.json();
      if (data.error || data.status === "error") {
        throw new Error(data.error || "Pitch correction failed");
      }

      setProgress(100);
      
      const track = {
        id: Date.now(),
        filename: data.filename,
        url: `${API}${data.url}`,
        duration: data.duration_sec,
        created: new Date().toLocaleTimeString(),
        isPitchCorrected: true,
        metadata: {
          original_file: vocalFile.name,
          scale: selectedScale,
          strength: correctionStrength,
          formant_preserved: preserveFormant,
          type: "pitch_correction",
        },
      };

      setTracks((prev) => [track, ...prev]);
      setResult({
        ...data,
        originalUrl: vocalUrl,
        correctedUrl: `${API}${data.url}`,
      });
      addLog(`[OK] Pitch Correction: ${data.filename} (${data.duration_sec}s)`);
    } catch (err) {
      setError(err.message);
      addLog(`[Error] Pitch correction failed: ${err.message}`);
    } finally {
      setCorrecting(false);
    }
  };

  const handlePlayOriginal = () => {
    if (originalAudioRef.current) {
      if (isPlayingOriginal) {
        originalAudioRef.current.pause();
      } else {
        correctedAudioRef.current?.pause();
        originalAudioRef.current.play();
      }
      setIsPlayingOriginal(!isPlayingOriginal);
    }
  };

  const handlePlayCorrected = () => {
    if (correctedAudioRef.current) {
      correctedAudioRef.current.play();
      originalAudioRef.current?.pause();
      setIsPlayingOriginal(false);
    }
  };

  const S = {
    container: {
      maxWidth: 900,
      margin: "0 auto",
      padding: 20,
      fontFamily: "'Segoe UI', sans-serif",
    },
    card: {
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      border: "1px solid #2a2a4a",
    },
    label: {
      display: "block",
      color: "#c77dff",
      fontSize: 12,
      fontWeight: 700,
      marginBottom: 8,
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    input: {
      width: "100%",
      background: "#0f0f1a",
      border: "1px solid #2a2a4a",
      borderRadius: 8,
      padding: "10px 12px",
      fontSize: 14,
      color: "#e0e0ff",
      outline: "none",
      boxSizing: "border-box",
    },
    btn: {
      background: "linear-gradient(135deg, #7209b7, #560bad)",
      color: "#fff",
      border: "none",
      padding: "12px 24px",
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 700,
      cursor: "pointer",
    },
    chip: (color) => ({
      background: `${color}22`,
      border: `1px solid ${color}44`,
      color: color,
      padding: "6px 12px",
      borderRadius: 6,
      fontSize: 11,
      cursor: "pointer",
      fontWeight: 600,
    }),
    presetChip: (active) => ({
      background: active ? "#7209b7" : "#7209b722",
      border: `1px solid ${active ? "#7209b7" : "#7209b744"}`,
      color: active ? "#fff" : "#c77dff",
      padding: "6px 12px",
      borderRadius: 6,
      fontSize: 11,
      cursor: "pointer",
      fontWeight: 600,
      transition: "all 0.2s",
    }),
  };

  return (
    <div style={S.container}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{
          fontSize: 24, fontWeight: 800,
          background: "linear-gradient(135deg, #e0e0ff, #c77dff)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: 4,
        }}>
          🎤 Vocal Pitch Correction
        </h2>
        <p style={{ color: "#444466", fontSize: 13 }}>
          Auto-tune style pitch correction - snap vocals to a musical scale
        </p>
      </div>

      {/* Upload Vocal */}
      <div style={S.card}>
        <span style={S.label}>🎵 Step 1: Upload Vocal</span>
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: vocalFile ? "2px solid #7209b7" : "2px dashed #2a2a4a",
            borderRadius: 12, padding: 24, textAlign: "center",
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
              <div style={{ color: "#6666aa", marginBottom: 4 }}>Click to upload vocal</div>
              <div style={{ color: "#444466", fontSize: 12 }}>WAV, MP3, FLAC supported</div>
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
          <audio
            ref={originalAudioRef}
            controls
            src={vocalUrl}
            style={{ width: "100%", marginTop: 12 }}
            onEnded={() => setIsPlayingOriginal(false)}
          />
        )}
      </div>

      {/* Scale Selection */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={S.card}>
          <span style={S.label}>🎼 Target Scale</span>
          <select
            value={selectedScale}
            onChange={(e) => setSelectedScale(e.target.value)}
            style={{ ...S.input, fontFamily: "inherit" }}
          >
            {SCALES.map((scale) => (
              <option key={scale.value} value={scale.value}>
                {scale.label}
              </option>
            ))}
          </select>
        </div>

        <div style={S.card}>
          <span style={S.label}>⚡ Correction Strength: {Math.round(correctionStrength * 100)}%</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={correctionStrength}
            onChange={(e) => setCorrectionStrength(parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePresetClick(preset)}
                style={S.presetChip(correctionStrength === preset.strength)}
                title={preset.desc}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Formant Toggle */}
      <div style={S.card}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={preserveFormant}
            onChange={(e) => setPreserveFormant(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          <span style={{ color: "#a0a0cc", fontSize: 14 }}>
            🎙 Preserve Formant (keep vocal timbre natural)
          </span>
        </label>
        <p style={{ color: "#444466", fontSize: 11, margin: "8px 0 0 28px" }}>
          When enabled, maintains the natural character of the voice while correcting pitch
        </p>
      </div>

      {/* Correct Button */}
      <button
        onClick={handleCorrect}
        disabled={correcting || !vocalFile}
        style={{
          width: "100%", ...S.btn, marginBottom: 16,
          opacity: correcting || !vocalFile ? 0.5 : 1,
          cursor: correcting || !vocalFile ? "not-allowed" : "pointer",
        }}
      >
        {correcting ? `⏳ Processing... (${progress}%)` : "🎤 Apply Pitch Correction"}
      </button>

      {/* Progress */}
      {correcting && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: "#6666aa", fontSize: 12, marginBottom: 6 }}>
            {progress < 100 ? "Analyzing pitch and applying correction..." : "Done!"}
          </div>
          <div style={{ background: "#1a1a2e", borderRadius: 8, height: 8, overflow: "hidden" }}>
            <div style={{
              background: "linear-gradient(90deg, #7209b7, #c77dff)",
              height: "100%", width: `${progress}%`, transition: "width 0.3s",
            }} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ ...S.card, borderColor: "#e63946", background: "rgba(230,57,70,0.08)" }}>
          <span style={{ color: "#e63946", fontSize: 12 }}>❌ {error}</span>
        </div>
      )}

      {/* Result - A/B Comparison */}
      {result && (
        <div style={{ ...S.card, borderLeft: "4px solid #06d6a0" }}>
          <span style={{ ...S.label, color: "#06d6a0" }}>✅ Correction Complete!</span>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <div>
              <div style={{ color: "#a0a0cc", fontSize: 12, marginBottom: 4 }}>Original</div>
              <audio
                ref={originalAudioRef}
                controls
                src={result.originalUrl}
                style={{ width: "100%" }}
                onEnded={() => setIsPlayingOriginal(false)}
              />
            </div>
            <div>
              <div style={{ color: "#06d6a0", fontSize: 12, marginBottom: 4 }}>Corrected</div>
              <audio
                ref={correctedAudioRef}
                controls
                src={result.correctedUrl}
                style={{ width: "100%" }}
                onEnded={() => setIsPlayingOriginal(false)}
              />
            </div>
          </div>

          <div style={{ 
            background: "#0f0f1a", 
            borderRadius: 8, 
            padding: 12, 
            marginTop: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div style={{ color: "#a0a0cc", fontSize: 12 }}>
              <div>🎼 Scale: <strong style={{ color: "#c77dff" }}>{result.target_scale}</strong></div>
              <div>⚡ Strength: <strong style={{ color: "#c77dff" }}>{Math.round(result.correction_strength * 100)}%</strong></div>
              <div>⏱ Duration: <strong style={{ color: "#c77dff" }}>{result.duration_sec}s</strong></div>
            </div>
            <a
              href={result.correctedUrl}
              download={result.filename}
              style={{
                background: "#06d6a022",
                color: "#06d6a0",
                border: "1px solid #06d6a044",
                padding: "10px 20px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              ⬇ Download Corrected
            </a>
          </div>

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
              marginTop: 12,
            }}
          >
            ✕ Close
          </button>
        </div>
      )}

      {/* Info */}
      <div style={{ ...S.card, borderColor: "rgba(255,209,102,0.35)", background: "rgba(255,209,102,0.06)" }}>
        <p style={{ color: "#ffd166", fontSize: 12, margin: 0, lineHeight: 1.6 }}>
          💡 <strong>How it works:</strong> The AI detects the pitch contour of your vocal and snaps each note 
          to the nearest valid note in the selected scale. Higher correction strength = more robotic (T-Pain effect). 
          Lower strength = subtle polish while keeping natural variations.
        </p>
      </div>
    </div>
  );
}
