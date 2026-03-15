import { useState, useEffect } from "react";

const API = "http://localhost:8000";

export default function ModelsTab({ addLog }) {
  const [hwInfo, setHwInfo] = useState(null);
  const [vram, setVram] = useState(null);
  const [sysLogs, setSysLogs] = useState([]);
  const [loading, setLoading] = useState("");

  const addSysLog = (msg) =>
    setSysLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 99)]);

  useEffect(() => {
    fetch(`${API}/hardware`).then(r => r.json()).then(setHwInfo).catch(() =>
      setHwInfo({ mode: "offline", device: "cpu", vram_gb: 0, has_cuda: false, cpu_cores: "?" })
    );
    fetchVram();
    
    // Auto-refresh VRAM every 2 seconds
    const interval = setInterval(fetchVram, 2000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchVram = () => {
    fetch(`${API}/vram_usage`)
      .then(r => r.json())
      .then(data => {
        setVram(data);
      })
      .catch(() => {
        setVram({ available: false, used_gb: 0, total_gb: 8, pct: 0 });
      });
  };

  const action = async (endpoint, label) => {
    setLoading(endpoint);
    addSysLog(`${label}...`);
    try {
      const res = await fetch(`${API}/${endpoint}`);
      const data = await res.json();
      addSysLog(`✓ ${data.message || label + " OK"}`);
      addLog(`[OK] ${label}`);
      fetchVram();
    } catch {
      addSysLog(`✗ ${label} failed (server offline?)`);
      addLog(`[WARN] ${label} failed`);
    } finally { setLoading(""); }
  };

  const vramPct = vram?.pct || 0;
  const vramColor = vramPct > 80 ? "#e63946" : vramPct > 60 ? "#ffd166" : "#06d6a0";

  const S = {
    card: { background: "linear-gradient(135deg,#0d0d22 0%,#0a0a1a 100%)", border: "1px solid #1e1e3a", borderRadius: 12, padding: 16, marginBottom: 14 },
    label: { color: "#6666aa", fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12, display: "block" },
    btn: (bg, fg = "#000") => ({
      background: bg, color: fg, border: "none", borderRadius: 8, padding: "10px 16px",
      fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%", textAlign: "left",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      transition: "opacity 0.2s",
    }),
  };

  const modeColors = { light: "#ffd166", full: "#06d6a0", high_end: "#00e5ff", offline: "#e63946" };
  const modeColor = modeColors[hwInfo?.mode] || "#888";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="fade-in">
      <div>
        {/* Hardware Info */}
        <div style={S.card}>
          <span style={S.label}>🖥 Hardware</span>
          {hwInfo ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{
                  background: modeColor + "22", color: modeColor, border: `1px solid ${modeColor}44`,
                  borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 700, letterSpacing: 1,
                }}>
                  {hwInfo.mode?.toUpperCase()} MODE
                </span>
              </div>
              {[
                ["Device", hwInfo.device],
                ["VRAM", `${hwInfo.vram_gb} GB`],
                ["CUDA", hwInfo.has_cuda ? "✓ Available" : "✗ Not found"],
                ["CPU Cores", hwInfo.cpu_cores],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #0d0d22" }}>
                  <span style={{ color: "#6666aa", fontSize: 12 }}>{k}</span>
                  <span style={{ color: "#e0e0ff", fontSize: 12, fontFamily: "monospace", fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "#444466", fontSize: 12 }}>Loading hardware info...</div>
          )}
        </div>

        {/* VRAM Usage - Enhanced with GPU Monitor stats */}
        <div style={S.card}>
          <span style={S.label}>📊 VRAM Usage (GPU Monitor)</span>
          
          {/* VRAM Grid Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 12 }}>
            <div style={{ background: "#0a0a1a", padding: 10, borderRadius: 8, border: "1px solid #1a1a2e" }}>
              <div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>Total VRAM</div>
              <div style={{ color: "#00e5ff", fontSize: 18, fontWeight: 700 }}>{vram?.total_gb?.toFixed(2) || "8.00"} GB</div>
            </div>
            <div style={{ background: "#0a0a1a", padding: 10, borderRadius: 8, border: "1px solid #1a1a2e" }}>
              <div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>Free VRAM</div>
              <div style={{ color: "#10b981", fontSize: 18, fontWeight: 700 }}>{((vram?.total_gb || 8) - (vram?.used_gb || 0)).toFixed(2)} GB</div>
            </div>
            <div style={{ background: "#0a0a1a", padding: 10, borderRadius: 8, border: "1px solid #1a1a2e" }}>
              <div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>Allocated</div>
              <div style={{ color: "#f59e0b", fontSize: 18, fontWeight: 700 }}>{vram?.used_gb?.toFixed(2) || "0.00"} GB</div>
            </div>
            <div style={{ background: "#0a0a1a", padding: 10, borderRadius: 8, border: "1px solid #1a1a2e" }}>
              <div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>Usage</div>
              <div style={{ color: vramColor, fontSize: 18, fontWeight: 700 }}>{vramPct.toFixed(1)}%</div>
            </div>
          </div>

          {/* VRAM Progress Bar */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ height: 14, background: "#0a0a1a", borderRadius: 7, overflow: "hidden", border: "1px solid #1a1a2e" }}>
              <div style={{
                height: 14, borderRadius: 7,
                background: `linear-gradient(90deg, ${vramColor}, ${vramColor}88)`,
                width: `${vramPct}%`, transition: "width 0.5s",
                boxShadow: `0 0 8px ${vramColor}66`,
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ color: vramColor, fontSize: 13, fontFamily: "monospace", fontWeight: 700 }}>
                {vram?.used_gb?.toFixed(2) || "0.00"} GB used
              </span>
              <span style={{ color: "#444466", fontSize: 12 }}>
                / {vram?.total_gb?.toFixed(2) || "8.00"} GB total
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={fetchVram}
              style={{ background: "#3b82f6", color: "white", border: "none", borderRadius: 7, padding: "8px 16px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
              🔄 Refresh
            </button>
            <button onClick={() => action("clear_cache", "Clear GPU Cache")}
              disabled={loading === "clear_cache"}
              style={{ background: loading === "clear_cache" ? "#666" : "#ef4444", color: "white", border: "none", borderRadius: 7, padding: "8px 16px", fontSize: 12, cursor: loading === "clear_cache" ? "not-allowed" : "pointer", fontWeight: 600 }}>
              🧹 Cleanup VRAM
            </button>
          </div>
        </div>

        {/* GPU Actions */}
        <div style={S.card}>
          <span style={S.label}>⚡ GPU Actions</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={() => action("clear_cache", "Clear GPU Cache")}
              disabled={loading === "clear_cache"}
              style={{ ...S.btn("#06d6a022", "#06d6a0"), border: "1px solid #06d6a044" }}>
              <span>🧹 Clear GPU Cache</span>
              <span style={{ fontSize: 16 }}>›</span>
            </button>
            <button onClick={() => action("unload_models", "Unload Models")}
              disabled={loading === "unload_models"}
              style={{ ...S.btn("#ffd16622", "#ffd166"), border: "1px solid #ffd16644" }}>
              <span>📤 Unload Models</span>
              <span style={{ fontSize: 16 }}>›</span>
            </button>
            <button onClick={() => action("list_models", "Reload Models")}
              disabled={loading === "list_models"}
              style={{ ...S.btn("#00e5ff22", "#00e5ff"), border: "1px solid #00e5ff44" }}>
              <span>🔄 Reload Models</span>
              <span style={{ fontSize: 16 }}>›</span>
            </button>
          </div>
        </div>
      </div>

      {/* System Log */}
      <div>
        <div style={{ ...S.card, maxHeight: 520, overflowY: "auto" }}>
          <span style={S.label}>📋 System Log</span>
          {sysLogs.length === 0 && (
            <div style={{ color: "#333355", fontSize: 12, textAlign: "center", padding: "20px 0" }}>
              No system events yet.
            </div>
          )}
          {sysLogs.map((log, i) => (
            <div key={i} style={{
              fontFamily: "monospace", fontSize: 11,
              color: log.includes("✓") ? "#06d6a0" : log.includes("✗") ? "#e63946" : "#6666aa",
              borderBottom: "1px solid #0d0d22", padding: "5px 0", lineHeight: 1.5,
            }}>
              {log}
            </div>
          ))}
        </div>

        {/* Health Check */}
        <div style={S.card}>
          <span style={S.label}>❤ Health</span>
          <button onClick={() => action("health", "Health Check")}
            style={{ ...S.btn("#1a1a2e", "#aaaacc"), border: "1px solid #2a2a4a" }}>
            <span>🔍 Run Health Check</span>
            <span style={{ fontSize: 16 }}>›</span>
          </button>
        </div>
      </div>
    </div>
  );
}
