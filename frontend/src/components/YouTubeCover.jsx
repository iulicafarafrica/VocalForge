/**
 * YouTube Cover Generator Component
 * Download from YouTube → Separate → RVC → Mix → Download Cover
 */

import { useState, useRef } from "react";

const API = "http://localhost:8000";

export default function YouTubeCover({ addLog, models }) {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [pitchShift, setPitchShift] = useState(0);
  const [f0Method, setF0Method] = useState("rmvpe");
  const [indexRate, setIndexRate] = useState(0.75);
  
  const [downloading, setDownloading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  const [downloadOnly, setDownloadOnly] = useState(false);

  // Download from YouTube
  const downloadFromYouTube = async () => {
    if (!youtubeUrl) {
      setError("Te rog introdu un URL YouTube");
      return;
    }
    
    setDownloading(true);
    setError(null);
    setResult(null);
    setProgress(10);
    
    try {
      addLog(`📺 YouTube: Downloading ${youtubeUrl}`);
      
      const formData = new FormData();
      formData.append("url", youtubeUrl);
      formData.append("output_format", "wav");
      formData.append("quality", "best");
      
      const response = await fetch(`${API}/youtube/download`, {
        method: "POST",
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.status === "ok") {
        setProgress(100);
        addLog(`✅ YouTube download complet: ${data.video_title}`);
        
        if (downloadOnly) {
          setResult({
            filename: data.filename,
            url: data.url,
            video_title: data.video_title,
            video_duration: data.video_duration,
          });
        }
      } else {
        throw new Error(data.detail || "Download failed");
      }
      
    } catch (err) {
      console.error("YouTube download error:", err);
      setError(err.message);
      addLog(`❌ YouTube: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  // Run full cover pipeline
  const runCoverPipeline = async () => {
    if (!youtubeUrl || !selectedModel) {
      setError("Te rog introdu URL YouTube și selectează un model RVC");
      return;
    }
    
    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress(0);
    
    try {
      addLog(`🎵 YouTube Cover: Starting pipeline for ${youtubeUrl}`);
      addLog(`🎤 Model: ${selectedModel} | Pitch: ${pitchShift}`);
      
      const formData = new FormData();
      formData.append("url", youtubeUrl);
      formData.append("rvc_model_name", selectedModel);
      formData.append("pitch_shift", pitchShift.toString());
      formData.append("f0_method", f0Method);
      formData.append("index_rate", indexRate.toString());
      formData.append("output_format", "wav");
      
      // Simulare progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 5;
        });
      }, 1000);
      
      const response = await fetch(`${API}/youtube/cover`, {
        method: "POST",
        body: formData,
      });
      
      clearInterval(progressInterval);

      const data = await response.json();
      console.log("[YouTube Cover] Response data:", data);

      if (data.status === "ok") {
        setProgress(100);
        setResult({
          filename: data.filename,
          url: data.url,
          video_title: data.video_title,
          rvc_model: data.rvc_model,
          total_time_sec: data.total_time_sec,
          steps: data.steps,
        });
        addLog(`✅ YouTube Cover complet! Timp total: ${data.total_time_sec}s`);
        addLog(`📊 Download: ${data.steps.download}s | Separare: ${data.steps.separation}s | RVC: ${data.steps.rvc_conversion}s`);
        addLog(`🎵 Output file: ${data.filename}`);
      } else {
        throw new Error(data.detail || "Pipeline failed");
      }
      
    } catch (err) {
      console.error("YouTube Cover error:", err);
      setError(err.message);
      addLog(`❌ YouTube Cover: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const S = {
    card: {
      background: "#080812",
      border: "1px solid #2a2a4a",
      borderRadius: 12,
      padding: 20,
      marginBottom: 16,
    },
    label: {
      display: "block",
      color: "#a0a0c0",
      fontSize: 13,
      fontWeight: 600,
      marginBottom: 8,
    },
    input: {
      width: "100%",
      background: "#0a0a1a",
      border: "1px solid #2a2a4a",
      color: "#e0e0ff",
      borderRadius: 8,
      padding: "12px 14px",
      fontSize: 14,
      outline: "none",
      fontFamily: "inherit",
      boxSizing: "border-box",
    },
    button: {
      background: "linear-gradient(135deg, #ff0000, #cc0000)",
      color: "#fff",
      border: "none",
      borderRadius: 8,
      padding: "12px 20px",
      fontSize: 14,
      fontWeight: 700,
      cursor: "pointer",
      width: "100%",
      marginTop: 12,
    },
    buttonDisabled: {
      background: "#444466",
      cursor: "not-allowed",
      opacity: 0.6,
    },
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }} className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{
          fontSize: 28, fontWeight: 800,
          background: "linear-gradient(135deg, #ff0000, #ff4444)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: 8,
        }}>
          📺 YouTube Cover Generator
        </h2>
        <p style={{ color: "#6666aa", fontSize: 14 }}>
          Download din YouTube → Separare vocală → RVC Conversion → Mix final
        </p>
      </div>

      {/* Step 1: YouTube URL */}
      <div style={S.card}>
        <span style={S.label}>🔗 Step 1: YouTube URL</span>
        <input
          type="text"
          placeholder="https://www.youtube.com/watch?v=..."
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          style={S.input}
          disabled={downloading || processing}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            onClick={downloadFromYouTube}
            disabled={downloading || !youtubeUrl}
            style={{
              ...S.button,
              ...(downloading || !youtubeUrl ? S.buttonDisabled : {}),
            }}
          >
            {downloading ? `⏳ Download... ${progress}%` : "📥 Download Audio"}
          </button>
          
          <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#8888aa", fontSize: 13, whiteSpace: "nowrap" }}>
            <input
              type="checkbox"
              checked={downloadOnly}
              onChange={(e) => setDownloadOnly(e.target.checked)}
              disabled={downloading || processing}
            />
            Doar download
          </label>
        </div>
      </div>

      {/* Step 2: RVC Settings (only if not download only) */}
      {!downloadOnly && (
        <>
          {/* Model Selection */}
          <div style={S.card}>
            <span style={S.label}>🎤 Step 2: Model RVC</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={S.input}
              disabled={processing}
            >
              <option value="">Selectează un model...</option>
              {models.map((m, i) => (
                <option key={i} value={m.name}>
                  {m.name} ({m.size_mb} MB)
                </option>
              ))}
            </select>
          </div>

          {/* Pitch Shift */}
          <div style={S.card}>
            <span style={S.label}>🎚 Step 3: Pitch Shift</span>
            <input
              type="range"
              min="-12"
              max="12"
              value={pitchShift}
              onChange={(e) => setPitchShift(parseInt(e.target.value))}
              style={{ width: "100%" }}
              disabled={processing}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6666aa", marginTop: 6 }}>
              <span>-12</span>
              <span style={{ color: "#ff4444", fontWeight: 700 }}>{pitchShift > 0 ? "+" : ""}{pitchShift} semitones</span>
              <span>+12</span>
            </div>
          </div>

          {/* Advanced Settings */}
          <div style={S.card}>
            <span style={S.label}>⚙️ Step 4: Setări Avansate</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", color: "#8888aa", fontSize: 12, marginBottom: 6 }}>
                  F0 Method
                </label>
                <select
                  value={f0Method}
                  onChange={(e) => setF0Method(e.target.value)}
                  style={{ ...S.input, padding: "8px 10px", fontSize: 13 }}
                  disabled={processing}
                >
                  <option value="rmvpe">RMVPE (Recomandat)</option>
                  <option value="harvest">Harvest</option>
                  <option value="pm">PM</option>
                  <option value="crepe">Crepe</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: "block", color: "#8888aa", fontSize: 12, marginBottom: 6 }}>
                  Index Rate
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={indexRate}
                  onChange={(e) => setIndexRate(parseFloat(e.target.value))}
                  style={{ width: "100%" }}
                  disabled={processing}
                />
                <div style={{ textAlign: "center", fontSize: 12, color: "#6666aa" }}>
                  {indexRate.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Run Pipeline Button */}
          <button
            onClick={runCoverPipeline}
            disabled={processing || !youtubeUrl || !selectedModel}
            style={{
              ...S.button,
              background: processing || !youtubeUrl || !selectedModel 
                ? "#444466" 
                : "linear-gradient(135deg, #ff4444, #ff6666)",
              ...(processing || !youtubeUrl || !selectedModel ? S.buttonDisabled : {}),
            }}
          >
            {processing ? `⏳ Procesare... ${progress}%` : "🎵 Start YouTube Cover"}
          </button>
        </>
      )}

      {/* Progress Bar */}
      {(downloading || processing) && (
        <div style={{ marginTop: 16 }}>
          <div style={{ background: "#1a1a2e", borderRadius: 8, height: 8, overflow: "hidden" }}>
            <div style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #ff4444, #ff6666)",
              height: "100%",
              transition: "width 0.3s",
            }} />
          </div>
          <div style={{ fontSize: 12, color: "#6666aa", marginTop: 6, textAlign: "center" }}>
            {downloading && progress < 50 && "📥 Download din YouTube..."}
            {downloading && progress >= 50 && "💾 Salvare audio..."}
            {processing && progress < 30 && "📥 Download..."}
            {processing && progress >= 30 && progress < 60 && "✂️ Separare vocală (BS-RoFormer)..."}
            {processing && progress >= 60 && progress < 90 && "🎤 Conversie RVC..."}
            {processing && progress >= 90 && "💾 Finalizare..."}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ ...S.card, background: "#ff444411", border: "2px solid #ff444444", marginTop: 16 }}>
          <div style={{ fontSize: 28, textAlign: "center", marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#ff4444", textAlign: "center", marginBottom: 8 }}>
            {downloadOnly ? "Download Complet!" : "Cover Complet!"}
          </div>
          
          {downloadOnly ? (
            <>
              <div style={{ fontSize: 14, color: "#e0e0ff", textAlign: "center", marginBottom: 4 }}>
                {result.video_title}
              </div>
              <div style={{ fontSize: 12, color: "#6666aa", textAlign: "center", marginBottom: 12 }}>
                Durată: {Math.floor(result.video_duration / 60)}:{(result.video_duration % 60).toString().padStart(2, '0')}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, color: "#6666aa", textAlign: "center", marginBottom: 12 }}>
                Timp total: {result.total_time_sec}s
              </div>
              {result.steps && (
                <div style={{ fontSize: 11, color: "#8888aa", textAlign: "center", marginBottom: 12, display: "flex", justifyContent: "center", gap: 12 }}>
                  <span>⏱️ Download: {result.steps.download}s</span>
                  <span>✂️ Separare: {result.steps.separation}s</span>
                  <span>🎤 RVC: {result.steps.rvc_conversion}s</span>
                </div>
              )}
            </>
          )}

          <div style={{ fontSize: 12, color: "#8888aa", textAlign: "center", marginBottom: 8 }}>
            File: {result.filename}
          </div>
          <audio 
            controls 
            src={`${API}${result.url}`} 
            style={{ width: "100%", marginBottom: 12 }}
            onError={(e) => {
              console.error("Audio load error:", e);
              addLog(`⚠️ Audio player error: Cannot load ${API}${result.url}`);
            }}
          />

          <a
            href={`${API}${result.url}`}
            download={result.filename}
            style={{
              display: "block",
              textAlign: "center",
              background: "#ff444422",
              color: "#ff4444",
              border: "1px solid #ff444444",
              padding: "12px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            ⬇ Download Rezultat
          </a>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ ...S.card, background: "#e6394611", border: "2px solid #e6394644", marginTop: 16 }}>
          <div style={{ fontSize: 28, textAlign: "center", marginBottom: 12 }}>❌</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#e63946", textAlign: "center" }}>
            {error}
          </div>
        </div>
      )}
    </div>
  );
}
