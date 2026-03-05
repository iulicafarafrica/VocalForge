/**
 * Voice Converter Component
 * Simple interface for voice conversion with pitch + RVC + emotion
 */

import { useState, useRef, useEffect } from "react";

const API = "http://localhost:8000";

export default function VoiceConverter({ addLog, tracks, setTracks }) {
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  
  const [pitch, setPitch] = useState(0);
  const [normalize, setNormalize] = useState(true);
  const [gender, setGender] = useState("female");
  const [emotion, setEmotion] = useState("neutral");
  const [f0Method, setF0Method] = useState("rmvpe");
  
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  // Load available models
  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const res = await fetch(`${API}/rvc/models`);
      const data = await res.json();
      if (data.status === "ok") {
        setModels(data.models || []);
        if (data.models && data.models.length > 0) {
          setSelectedModel(data.models[0].name);
        }
      }
    } catch (err) {
      console.error("Failed to load models:", err);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileUrl(URL.createObjectURL(selectedFile));
      setResult(null);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Please select a file");
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

    addLog(`🎤 Voice Conversion: ${file.name}`);
    addLog(`   Model: ${selectedModel}, Gender: ${gender}, Emotion: ${emotion}`);

    const form = new FormData();
    form.append("file", file);
    form.append("model_name", selectedModel);
    form.append("pitch_shift", pitch.toString());
    form.append("normalize_pitch_flag", normalize.toString());
    form.append("target_gender", gender);
    form.append("emotion", emotion);
    form.append("f0_method", f0Method);
    form.append("output_format", "wav");

    const progressTimer = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 1000);

    try {
      const response = await fetch(`${API}/convert_voice/`, {
        method: "POST",
        body: form,
      });

      clearInterval(progressTimer);

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || "Conversion failed");
      }

      const track = {
        id: Date.now(),
        filename: data.filename,
        url: `${API}${data.url}`,
        duration: data.duration_sec,
        created: new Date().toLocaleTimeString(),
        isVoiceConverted: true,
        metadata: {
          original_file: file.name,
          model: data.model_used,
          pitch_shift: data.pitch_shift,
          emotion: data.emotion,
          target_gender: data.target_gender,
        },
      };

      setTracks(prev => [track, ...prev]);
      setResult(data);
      setProgress(100);
      addLog(`[OK] Voice converted: ${data.filename} (${data.duration_sec}s)`);

    } catch (err) {
      setError(err.message);
      addLog(`[ERR] Voice conversion: ${err.message}`);
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
      <div style={{ marginBottom: 24 }}>
        <h2 style={{
          fontSize: 24,
          fontWeight: 800,
          background: "linear-gradient(135deg, #ff6b9d, #ff8fab)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: 4,
        }}>
          🎤 Voice Converter
        </h2>
        <p style={{ color: "#444466", fontSize: 13 }}>
          Complete voice conversion: Pitch + RVC + Emotion
        </p>
      </div>

      {/* Upload */}
      <div style={S.card}>
        <span style={S.label}>🎤 Step 1: Upload Audio</span>
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: file ? "2px solid #ff6b9d" : "2px dashed #2a2a4a",
            borderRadius: 12,
            padding: 24,
            textAlign: "center",
            cursor: "pointer",
            background: file ? "#ff6b9d11" : "transparent",
          }}
        >
          {file ? (
            <div>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎵</div>
              <div style={{ color: "#ff6b9d", fontWeight: 600 }}>
                {file.name}
              </div>
              <div style={{ color: "#444466", fontSize: 12 }}>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
              <div style={{ color: "#6666aa" }}>Click to upload</div>
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
        {fileUrl && (
          <audio controls src={fileUrl} style={{ width: "100%", marginTop: 12 }} />
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
            ⚠️ No models found. Add .pth files to RVCWebUI/assets/weights/
          </div>
        )}
      </div>

      {/* Pitch & Gender */}
      <div style={S.grid}>
        <div style={S.card}>
          <span style={S.label}>🎚 Pitch Shift</span>
          <input
            type="number"
            min="-12"
            max="12"
            value={pitch}
            onChange={(e) => setPitch(parseInt(e.target.value) || 0)}
            style={S.input}
          />
        </div>

        <div style={S.card}>
          <span style={S.label}>👤 Target Gender</span>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            style={S.input}
          >
            <option value="female">👩 Female (+5 semitones)</option>
            <option value="male">👨 Male (-5 semitones)</option>
          </select>
        </div>
      </div>

      {/* Emotion & Options */}
      <div style={S.grid}>
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

        <div style={S.card}>
          <span style={S.label}>⚙️ Options</span>
          <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#a0a0cc", fontSize: 13 }}>
            <input
              type="checkbox"
              checked={normalize}
              onChange={(e) => setNormalize(e.target.checked)}
              style={{ accentColor: "#ff6b9d" }}
            />
            Normalize pitch
          </label>
        </div>
      </div>

      {/* Convert Button */}
      <button
        onClick={handleSubmit}
        disabled={converting || !file || !selectedModel}
        style={{
          width: "100%",
          ...S.btn,
          opacity: converting || !file || !selectedModel ? 0.5 : 1,
          cursor: converting || !file || !selectedModel ? "not-allowed" : "pointer",
          marginBottom: 16,
        }}
      >
        {converting ? `⏳ Converting... (${progress}%)` : "🎤 Convert Voice"}
      </button>

      {/* Progress */}
      {converting && (
        <div style={{ marginBottom: 16 }}>
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

      {/* Result */}
      {result && (
        <div style={{ ...S.card, borderLeft: "4px solid #ff6b9d" }}>
          <span style={{ ...S.label, color: "#ff6b9d" }}>✅ Complete!</span>
          <div style={{ color: "#a0a0cc", fontSize: 13, marginBottom: 12 }}>
            <div>🎵 <strong>{result.filename}</strong></div>
            <div>⏱ {result.duration_sec}s | 📦 {result.size_mb} MB</div>
            <div>🎚 Pitch: {result.pitch_shift > 0 ? "+" : ""}{result.pitch_shift}</div>
          </div>
          <audio controls src={result.url} style={{ width: "100%", marginBottom: 12 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <a
              href={result.url}
              download={result.filename}
              style={{
                flex: 1,
                textAlign: "center",
                background: "#ff6b9d22",
                color: "#ff6b9d",
                border: "1px solid #ff6b9d44",
                padding: "10px",
                borderRadius: 8,
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
                padding: "10px",
                borderRadius: 8,
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
