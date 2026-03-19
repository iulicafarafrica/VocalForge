/**
 * Repaint Tab - ACE-Step Advanced Feature
 * Cyberpunk Redesign for VocalForge v2.1.0
 */

import React, { useState, useRef, useEffect } from 'react';

const API_BASE = 'http://localhost:8000';

export default function RepaintLegoComplete() {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [guidanceScale, setGuidanceScale] = useState(9.0);
  const [seed, setSeed] = useState(-1);
  const [inferSteps, setInferSteps] = useState(12);
  const [keyScale, setKeyScale] = useState('');
  const [audioFormat, setAudioFormat] = useState('mp3');
  const [audioCoverStrength, setAudioCoverStrength] = useState(1.0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(30);
  const [lyrics, setLyrics] = useState('');
  const [ditModel, setDitModel] = useState('acestep-v15-turbo');
  const [bpm, setBpm] = useState(0);
  const [timeSignature, setTimeSignature] = useState('');
  const [vocalLanguage, setVocalLanguage] = useState('unknown');

  const fileInputRef = useRef(null);

  const TENSOR_MODELS = [
    {
      id: "acestep-v15-turbo",
      name: "◈ Turbo",
      desc: "8 steps │ ~1 min │ Fast",
      color: "#06d6a0",
      steps: 8,
    },
    {
      id: "acestep-v15-sft-turbo_0.5",
      name: "◈ SFT-Turbo 0.5",
      desc: "Hybrid │ ~2 min │ Balanced",
      color: "#ffd166",
      steps: 32,
    },
    {
      id: "acestep-v15-sft",
      name: "♫ SFT",
      desc: "50 steps │ ~3 min │ Quality",
      color: "#c77dff",
      steps: 50,
    },
    {
      id: "acestep-v15-base-sft",
      name: "◉ Base-SFT",
      desc: "50 steps │ ~3 min │ Enhanced",
      color: "#00e5ff",
      steps: 50,
    },
    {
      id: "acestep-v15-base",
      name: "◉ Base",
      desc: "50 steps │ ~4 min │ All Features",
      color: "#118ab2",
      steps: 50,
    },
  ];

  const modelInfo = TENSOR_MODELS.find(m => m.id === ditModel) || TENSOR_MODELS[0];

  // Auto-adjust inferSteps when model changes
  useEffect(() => {
    const currentModel = TENSOR_MODELS.find(m => m.id === ditModel);
    if (currentModel && currentModel.steps) {
      setInferSteps(currentModel.steps);
    }
  }, [ditModel]);

  // Cyberpunk theme colors
  const cyberpunk = {
    bg: {
      primary: "linear-gradient(135deg, #0a0a1a 0%, #0d0d22 50%, #0a0a1a 100%)",
      card: "linear-gradient(180deg, rgba(13,13,34,0.95) 0%, rgba(8,8,24,0.98) 100%)",
    },
    neon: {
      purple: { primary: "#9b5de5", glow: "rgba(155,93,229,0.5)" },
      cyan: { primary: "#00e5ff", glow: "rgba(0,229,255,0.5)" },
      pink: { primary: "#ff6b9d", glow: "rgba(255,107,157,0.5)" },
      yellow: { primary: "#ffd166", glow: "rgba(255,209,102,0.5)" },
      green: { primary: "#06d6a0", glow: "rgba(6,214,160,0.5)" },
    },
    text: {
      primary: "#e0e0ff",
      secondary: "#8888aa",
      muted: "#444466",
    },
  };

  const S = {
    card: {
      background: cyberpunk.bg.card,
      border: "1px solid rgba(30,30,58,0.5)",
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      backdropFilter: "blur(10px)",
      boxShadow: "0 4px 30px rgba(0,0,0,0.3)",
    },
    label: {
      color: cyberpunk.neon.cyan.primary,
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: 2,
      textTransform: "uppercase",
      marginBottom: 14,
      display: "block",
      textShadow: `0 0 10px ${cyberpunk.neon.cyan.glow}`,
    },
    input: {
      background: "#0a0a1a",
      border: "1px solid rgba(42,42,74,0.5)",
      color: cyberpunk.text.primary,
      borderRadius: 10,
      padding: "10px 14px",
      fontSize: 13,
      width: "100%",
      boxSizing: "border-box",
    },
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select an audio file');
      return;
    }
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setProgress('Uploading file...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('prompt', prompt || '');
    formData.append('guidance_scale', guidanceScale.toString());
    formData.append('seed', seed.toString());
    formData.append('infer_steps', inferSteps.toString());
    formData.append('key_scale', keyScale || '');
    formData.append('audio_format', audioFormat);
    formData.append('dit_model', ditModel);
    formData.append('start_time', startTime.toString());
    formData.append('end_time', endTime.toString());
    formData.append('lyrics', lyrics || '');
    formData.append('audio_cover_strength', audioCoverStrength.toString());
    formData.append('bpm', bpm.toString());
    formData.append('time_signature', timeSignature || '');
    formData.append('vocal_language', vocalLanguage);
    formData.append('thinking', 'true');

    try {
      const endpoint = '/acestep/repaint';
      setProgress(`Processing repaint...`);

      const response = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', body: formData });
      let data = {};
      try { data = await response.json(); } catch (_) {}

      if (!response.ok) {
        const errMsg = typeof data.error === 'string' ? data.error : typeof data.detail === 'string' ? data.detail : typeof data.detail === 'object' ? JSON.stringify(data.detail) : JSON.stringify(data) || `HTTP ${response.status}`;
        throw new Error(errMsg);
      }
      setResult(data);
      setProgress('Done!');
    } catch (err) {
      setError(err.message);
      setProgress('');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      
      {/* Repaint / Lego / Complete */}
      <div style={{
        ...S.card,
        borderLeft: `4px solid ${cyberpunk.neon.purple.primary}`,
        marginBottom: 20,
      }}>
        <p style={{ color: cyberpunk.text.secondary, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          🖌️ <strong>Repaint</strong> allows you to select a portion of the track (e.g., seconds 30–60) and regenerate it.
          <br />
          ✨ Useful to fix a section that doesn't sound right without regenerating everything.
          <br />
          🎵 You can change lyrics, add a bridge, modify endings.
          <br />
          ✅ All ACE-Step models support Repaint.
        </p>
      </div>

      {/* File Upload */}
      <div style={S.card}>
        <span style={S.label}>🎵 Upload Audio File</span>
        <input
          type="file"
          accept="audio/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        <label
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: 20,
            background: "rgba(10,10,26,0.6)",
            border: `2px dashed ${file ? cyberpunk.neon.purple.primary : "rgba(42,42,74,0.5)"}`,
            borderRadius: 12,
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            if (!file) {
              e.currentTarget.style.borderColor = cyberpunk.neon.purple.primary;
              e.currentTarget.style.boxShadow = `0 0 20px ${cyberpunk.neon.purple.glow}`;
            }
          }}
          onMouseLeave={(e) => {
            if (!file) {
              e.currentTarget.style.borderColor = "rgba(42,42,74,0.5)";
              e.currentTarget.style.boxShadow = "none";
            }
          }}
        >
          <span style={{ fontSize: 40 }}>{file ? '🎵' : '📂'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ 
              color: file ? cyberpunk.neon.purple.primary : cyberpunk.text.secondary, 
              fontSize: 14, 
              fontWeight: 700,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {file ? file.name : 'Click to upload or drag and drop'}
            </div>
            <div style={{ color: cyberpunk.text.muted, fontSize: 11, marginTop: 4 }}>
              WAV, MP3, FLAC supported
            </div>
          </div>
        </label>
      </div>

      {/* Time Range Selection */}
      <div style={{
        ...S.card,
        marginBottom: 16,
      }}>
        <span style={S.label}>⏱️ Time Range (seconds)</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ color: cyberpunk.text.secondary, fontSize: 11, marginBottom: 6, display: "block" }}>
              Start Time
            </label>
            <input
              type="number"
              value={startTime}
              onChange={(e) => setStartTime(Number(e.target.value))}
              style={{ ...S.input, borderColor: cyberpunk.neon.cyan.primary }}
              min="0"
            />
          </div>
          <div>
            <label style={{ color: cyberpunk.text.secondary, fontSize: 11, marginBottom: 6, display: "block" }}>
              End Time
            </label>
            <input
              type="number"
              value={endTime}
              onChange={(e) => setEndTime(Number(e.target.value))}
              style={{ ...S.input, borderColor: cyberpunk.neon.pink.primary }}
              min="0"
            />
          </div>
        </div>
        <div style={{ marginTop: 10, padding: 10, background: `${cyberpunk.neon.cyan.primary}11`, borderRadius: 8, border: `1px solid ${cyberpunk.neon.cyan.primary}33` }}>
          <div style={{ color: cyberpunk.neon.cyan.primary, fontSize: 11, fontWeight: 700 }}>
            ⏱️ Duration: <strong>{endTime - startTime} seconds</strong>
          </div>
        </div>
      </div>

      {/* Prompt */}
      <div style={S.card}>
        <span style={S.label}>📝 New Prompt (Optional)</span>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you want in this section..."
          rows={4}
          style={{
            ...S.input,
            resize: "vertical",
            minHeight: 100,
            fontFamily: "inherit",
            lineHeight: 1.6,
          }}
        />
      </div>

      {/* Lyrics */}
      <div style={S.card}>
        <span style={S.label}>🎤 Lyrics (Optional)</span>
        <textarea
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          placeholder="Enter lyrics for this section..."
          rows={4}
          style={{
            ...S.input,
            resize: "vertical",
            minHeight: 100,
            fontFamily: "inherit",
            lineHeight: 1.6,
          }}
        />
      </div>

      {/* Model Selection */}
      <div style={S.card}>
        <span style={S.label}>🦁 ACE-Step Model</span>
        <select
          value={ditModel}
          onChange={(e) => setDitModel(e.target.value)}
          style={{
            ...S.input,
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {TENSOR_MODELS.map(model => (
            <option key={model.id} value={model.id}>
              {model.name} — {model.desc}
            </option>
          ))}
        </select>

        {/* Model Info */}
        {modelInfo && (
          <div style={{
            marginTop: 10,
            padding: 10,
            background: `linear-gradient(135deg, ${modelInfo.color}22, ${modelInfo.color}11)`,
            border: `1px solid ${modelInfo.color}44`,
            borderRadius: 8,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: modelInfo.color, fontSize: 14, fontWeight: 900 }}>{modelInfo.steps}</div>
              <div style={{ color: cyberpunk.text.muted, fontSize: 9 }}>Steps</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: modelInfo.color, fontSize: 14, fontWeight: 900 }}>{modelInfo.id}</div>
              <div style={{ color: cyberpunk.text.muted, fontSize: 9 }}>Model</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: cyberpunk.neon.green.primary, fontSize: 14, fontWeight: 900 }}>✓ Repaint</div>
              <div style={{ color: cyberpunk.text.muted, fontSize: 9 }}>Supported</div>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Settings Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 16 }}>

        {/* BPM */}
        <div style={S.card}>
          <span style={S.label}>🎵 BPM</span>
          <input
            type="number"
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            placeholder="0 = auto"
            min="0"
            max="300"
            style={{ ...S.input, marginTop: 8 }}
          />
          <div style={{ color: cyberpunk.text.muted, fontSize: 10, marginTop: 6 }}>
            0 = Auto-detect | 30-300 = Manual
          </div>
        </div>

        {/* Time Signature */}
        <div style={S.card}>
          <span style={S.label}>🎼 Time Signature</span>
          <select
            value={timeSignature}
            onChange={(e) => setTimeSignature(e.target.value)}
            style={{ ...S.input, marginTop: 8 }}
          >
            <option value="">Auto</option>
            <option value="2">2/2</option>
            <option value="3">3/4</option>
            <option value="4">4/4</option>
            <option value="6">6/8</option>
          </select>
          <div style={{ color: cyberpunk.text.muted, fontSize: 10, marginTop: 6 }}>
            Leave empty for auto-detect
          </div>
        </div>

        {/* Vocal Language */}
        <div style={S.card}>
          <span style={S.label}>🎤 Vocal Language</span>
          <select
            value={vocalLanguage}
            onChange={(e) => setVocalLanguage(e.target.value)}
            style={{ ...S.input, marginTop: 8 }}
          >
            <option value="unknown">Unknown / Auto</option>
            <option value="en">English</option>
            <option value="ro">Romanian</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
            <option value="ru">Russian</option>
            <option value="zh">Chinese</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="ar">Arabic</option>
            <option value="tr">Turkish</option>
            <option value="hi">Hindi</option>
          </select>
          <div style={{ color: cyberpunk.text.muted, fontSize: 10, marginTop: 6 }}>
            Language for vocal generation
          </div>
        </div>

        {/* Guidance Scale */}
        <div style={S.card}>
          <span style={S.label}>🎯 Guidance Scale</span>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: cyberpunk.text.muted, fontSize: 11 }}>CFG</span>
            <span style={{ color: cyberpunk.neon.purple.primary, fontSize: 14, fontWeight: 900, fontFamily: "monospace" }}>
              {guidanceScale.toFixed(1)}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="20"
            step="0.5"
            value={guidanceScale}
            onChange={(e) => setGuidanceScale(Number(e.target.value))}
            style={{ width: "100%", accentColor: cyberpunk.neon.purple.primary, height: 6, borderRadius: 3 }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ color: cyberpunk.text.muted, fontSize: 9 }}>1</span>
            <span style={{ color: cyberpunk.text.muted, fontSize: 9 }}>20</span>
          </div>
        </div>

        {/* Infer Steps */}
        <div style={S.card}>
          <span style={S.label}>🔢 Steps</span>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: cyberpunk.text.muted, fontSize: 11 }}>Inference</span>
            <span style={{ color: cyberpunk.neon.cyan.primary, fontSize: 14, fontWeight: 900, fontFamily: "monospace" }}>
              {inferSteps}
            </span>
          </div>
          <input
            type="range"
            min="8"
            max="50"
            step="1"
            value={inferSteps}
            onChange={(e) => setInferSteps(Number(e.target.value))}
            style={{ width: "100%", accentColor: cyberpunk.neon.cyan.primary, height: 6, borderRadius: 3 }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ color: cyberpunk.text.muted, fontSize: 9 }}>8 (Turbo)</span>
            <span style={{ color: cyberpunk.text.muted, fontSize: 9 }}>50 (Quality)</span>
          </div>
        </div>

        {/* Audio Cover Strength */}
        <div style={S.card}>
          <span style={S.label}>💪 Cover Strength</span>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: cyberpunk.text.muted, fontSize: 11 }}>Influence</span>
            <span style={{ color: cyberpunk.neon.pink.primary, fontSize: 14, fontWeight: 900, fontFamily: "monospace" }}>
              {(audioCoverStrength * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={audioCoverStrength}
            onChange={(e) => setAudioCoverStrength(Number(e.target.value))}
            style={{ width: "100%", accentColor: cyberpunk.neon.pink.primary, height: 6, borderRadius: 3 }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ color: cyberpunk.text.muted, fontSize: 9 }}>0% (Ignore)</span>
            <span style={{ color: cyberpunk.text.muted, fontSize: 9 }}>100% (Full)</span>
          </div>
        </div>

        {/* Seed */}
        <div style={S.card}>
          <span style={S.label}>🎲 Seed</span>
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value))}
            placeholder="-1 for random"
            style={{ ...S.input, marginTop: 8 }}
          />
          <div style={{ color: cyberpunk.text.muted, fontSize: 10, marginTop: 6 }}>
            -1 = Random | Any number = Fixed seed
          </div>
        </div>

      </div>

      {/* Generate Button */}
      <div style={S.card}>
        <button
          onClick={handleSubmit}
          disabled={!file || isProcessing}
          style={{
            width: "100%",
            padding: "18px 0",
            borderRadius: 12,
            background: isProcessing || !file
              ? "rgba(55,65,81,0.5)"
              : `linear-gradient(135deg, ${cyberpunk.neon.purple.primary}, ${cyberpunk.neon.pink.primary})`,
            color: "white",
            border: "none",
            cursor: isProcessing || !file ? "not-allowed" : "pointer",
            fontWeight: 900,
            fontSize: 16,
            letterSpacing: 2,
            textTransform: "uppercase",
            boxShadow: isProcessing || !file ? "none" : `0 0 30px ${cyberpunk.neon.purple.glow}`,
            transition: "all 0.3s ease",
            opacity: isProcessing || !file ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isProcessing && file) {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = `0 0 40px ${cyberpunk.neon.purple.glow}`;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = !isProcessing && file
              ? `0 0 30px ${cyberpunk.neon.purple.glow}`
              : "none";
          }}
        >
          {isProcessing ? `⚙ ${progress || "PROCESSING..."}` : "🖌️ REPAINT SECTION"}
        </button>

        {isProcessing && (
          <div style={{ marginTop: 14 }}>
            <div style={{
              height: 8,
              background: "rgba(10,10,26,0.8)",
              borderRadius: 4,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.1)",
            }}>
              <div style={{
                height: 8,
                background: `linear-gradient(90deg, ${cyberpunk.neon.purple.primary}, ${cyberpunk.neon.pink.primary}, ${cyberpunk.neon.purple.primary})`,
                width: "100%",
                borderRadius: 4,
                backgroundSize: "200% 100%",
                animation: "shimmer 2s linear infinite",
                boxShadow: `0 0 20px ${cyberpunk.neon.purple.glow}`,
              }} />
            </div>
            <div style={{ color: cyberpunk.text.secondary, fontSize: 11, marginTop: 8, textAlign: "center" }}>
              {progress}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: 14,
          background: "rgba(239,68,68,0.15)",
          borderRadius: 10,
          border: "1px solid #ef444444",
          marginBottom: 16,
        }}>
          <div style={{ color: "#ef4444", fontSize: 12, fontWeight: 700 }}>
            ❌ {error}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{
          ...S.card,
          border: `1px solid ${cyberpunk.neon.green.primary}44`,
          background: `${cyberpunk.neon.green.primary}11`,
          boxShadow: `0 0 30px ${cyberpunk.neon.green.glow}`,
        }}>
          <span style={{ ...S.label, color: cyberpunk.neon.green.primary }}>
            ✅ Repaint Complete!
          </span>
          <div style={{ marginTop: 12 }}>
            <audio controls src={`${API_BASE}${result.url}`} style={{ width: "100%", marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={async () => {
                  try {
                    // Fetch the file as blob to force download
                    const response = await fetch(`${API_BASE}${result.url}`);
                    const blob = await response.blob();
                    const blobUrl = window.URL.createObjectURL(blob);

                    // Create download link
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = result.filename || 'repaint-output.mp3';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(blobUrl);
                  } catch (err) {
                    // Fallback: direct download
                    const a = document.createElement('a');
                    a.href = `${API_BASE}${result.url}`;
                    a.download = result.filename || 'repaint-output.mp3';
                    a.target = '_blank';
                    a.click();
                  }
                }}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  background: `${cyberpunk.neon.green.primary}22`,
                  color: cyberpunk.neon.green.primary,
                  border: `1px solid ${cyberpunk.neon.green.primary}44`,
                  borderRadius: 8,
                  textAlign: "center",
                  textDecoration: "none",
                  fontWeight: 800,
                  fontSize: 11,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${cyberpunk.neon.green.primary}33`;
                  e.currentTarget.style.boxShadow = `0 0 20px ${cyberpunk.neon.green.glow}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `${cyberpunk.neon.green.primary}22`;
                  e.currentTarget.style.boxShadow = `0 0 10px ${cyberpunk.neon.green.glow}`;
                }}
              >
                ⬇️ Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Styles */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
