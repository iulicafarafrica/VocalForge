import React, { useState } from "react";
import { Upload, Music, Activity, GitBranch, Clock } from "lucide-react";

const API = "http://localhost:8000";

export default function AudioAnalysisTab({ addLog }) {
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
      if (addLog) addLog(`[Audio Analysis] File selected: ${selectedFile.name}`);
    }
  };

  const handleAnalyze = async () => {
    if (!file) { setError("Please select an audio file first"); return; }
    setAnalyzing(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch(`${API}/audio/analyze`, { method: "POST", body: formData });
      if (!response.ok) throw new Error((await response.json()).detail || "Analysis failed");
      const data = await response.json();
      setResult(data);
      if (addLog) addLog(`[Audio Analysis] Complete - BPM: ${data.bpm?.value}, Key: ${data.key?.value}`);
    } catch (err) {
      setError(err.message);
      if (addLog) addLog(`[Audio Analysis] Error: ${err.message}`);
    } finally { setAnalyzing(false); }
  };

  const getConfColor = (c) => c >= 0.8 ? "#10b981" : c >= 0.6 ? "#f59e0b" : "#ef4444";
  const getConfLabel = (c) => c >= 0.8 ? "High" : c >= 0.6 ? "Medium" : "Low";

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 24, color: "white", fontSize: 24 }}>🎼 Audio Analysis</h2>
      <div style={{ background: "#1a1a2e", padding: 24, borderRadius: 12, marginBottom: 24 }}>
        <input type="file" accept="audio/*" onChange={handleFileChange} style={{ display: "none" }} id="audio-upload" />
        <label htmlFor="audio-upload" style={{ display: "inline-block", padding: "12px 24px", background: file ? "#06d6a0" : "#3b82f6", color: "white", borderRadius: 8, cursor: "pointer", fontWeight: "bold", marginBottom: 12 }}>
          {file ? "✓ File Selected" : "📁 Choose File"}
        </label>
        <button onClick={handleAnalyze} disabled={!file || analyzing} style={{ padding: "12px 24px", background: analyzing ? "#666" : "#00e5ff", color: "white", border: "none", borderRadius: 8, cursor: analyzing ? "not-allowed" : "pointer", fontWeight: "bold", marginLeft: 8 }}>
          {analyzing ? "⏳ Analyzing..." : "🔍 Start Analysis"}
        </button>
        {error && <div style={{ marginTop: 16, padding: 12, background: "#ef444422", border: "1px solid #ef4444", borderRadius: 8, color: "#ef4444" }}>❌ {error}</div>}
      </div>
      {result && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 24 }}>
          <div style={{ background: "#1a1a2e", padding: 20, borderRadius: 12 }}>
            <div style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>🎵 BPM</div>
            <div style={{ color: "white", fontSize: 36, fontWeight: "bold" }}>{result.bpm?.value || "--"}</div>
            <div style={{ color: getConfColor(result.bpm?.confidence), fontSize: 12, marginTop: 8 }}>
              {(result.bpm?.confidence * 100).toFixed(0)}% ({getConfLabel(result.bpm?.confidence)})
            </div>
          </div>
          <div style={{ background: "#1a1a2e", padding: 20, borderRadius: 12 }}>
            <div style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>🎼 Key</div>
            <div style={{ color: "white", fontSize: 36, fontWeight: "bold" }}>{result.key?.value ? `${result.key.value} (${result.key.mode})` : "--"}</div>
            <div style={{ color: getConfColor(result.key?.confidence), fontSize: 12, marginTop: 8 }}>
              {(result.key?.confidence * 100).toFixed(0)}% ({getConfLabel(result.key?.confidence)})
            </div>
          </div>
          <div style={{ background: "#1a1a2e", padding: 20, borderRadius: 12 }}>
            <div style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>🥁 Time</div>
            <div style={{ color: "white", fontSize: 36, fontWeight: "bold" }}>{result.time_signature?.value || "--"}</div>
            <div style={{ color: getConfColor(result.time_signature?.confidence), fontSize: 12, marginTop: 8 }}>
              {(result.time_signature?.confidence * 100).toFixed(0)}% ({getConfLabel(result.time_signature?.confidence)})
            </div>
          </div>
          <div style={{ background: "#1a1a2e", padding: 20, borderRadius: 12 }}>
            <div style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>⏱️ Duration</div>
            <div style={{ color: "white", fontSize: 36, fontWeight: "bold" }}>{result.duration_seconds || "--"}</div>
            <div style={{ color: "#888", fontSize: 12, marginTop: 8 }}>Analysis: {result.analysis_time_seconds}s</div>
          </div>
        </div>
      )}
    </div>
  );
}
