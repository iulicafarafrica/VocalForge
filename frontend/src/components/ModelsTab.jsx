import { useState, useEffect } from "react";

const API = "http://localhost:8000";

export default function ModelsTab({ addLog }) {
  const [hwInfo, setHwInfo] = useState(null);
  const [sysLogs, setSysLogs] = useState([]);
  const [loading, setLoading] = useState("");
  
  // Cache & Storage states
  const [storageAnalysis, setStorageAnalysis] = useState(null);
  const [showAutoCleanup, setShowAutoCleanup] = useState(false);
  const [autoCleanupSettings, setAutoCleanupSettings] = useState(null);

  const addSysLog = (msg) =>
    setSysLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 99)]);

  // Fetch hardware info and storage analysis on mount
  useEffect(() => {
    fetch(`${API}/hardware`).then(r => r.json()).then(setHwInfo).catch(() =>
      setHwInfo({ mode: "offline", device: "cpu", vram_gb: 0, has_cuda: false, cpu_cores: "?" })
    );
    fetchStorageAnalysis();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStorageAnalysis = async () => {
    try {
      const res = await fetch(`${API}/gpu/storage/analyze`);
      const data = await res.json();
      setStorageAnalysis(data);
    } catch (err) {
      console.error("Failed to fetch storage analysis:", err);
    }
  };

  const fetchAutoCleanupSettings = async () => {
    if (showAutoCleanup && !autoCleanupSettings) {
      try {
        const res = await fetch(`${API}/gpu/auto-cleanup/settings`);
        const data = await res.json();
        setAutoCleanupSettings(data);
      } catch (err) {
        console.error("Failed to fetch auto-cleanup settings:", err);
      }
    }
  };

  const action = async (endpoint, label) => {
    setLoading(endpoint);
    addSysLog(`${label}...`);
    try {
      const res = await fetch(`${API}/${endpoint}`, { method: "POST" });
      const data = await res.json();
      addSysLog(`✓ ${data.message || label + " OK"}`);
      addLog(`[OK] ${label}`);
    } catch {
      addSysLog(`✗ ${label} failed (server offline?)`);
      addLog(`[WARN] ${label} failed`);
    } finally { setLoading(""); }
  };

  const clearCache = async (type) => {
    setLoading(`cache_${type}`);
    addSysLog(`Clearing ${type} cache...`);
    try {
      const res = await fetch(`${API}/gpu/cache/clear?cache_type=${type}`, { method: "POST" });
      const data = await res.json();
      const freed = data.results ? Object.values(data.results).reduce((sum, r) => sum + (r.mb_freed || 0), 0) : 0;
      addSysLog(`✓ Cleared ${type} cache - ${freed.toFixed(1)} MB freed`);
      addLog(`[OK] Cleared ${type} cache (${freed.toFixed(1)} MB)`);
      fetchStorageAnalysis();
    } catch (err) {
      addSysLog(`✗ Clear cache failed: ${err.message}`);
      addLog(`[WARN] Clear cache failed`);
    } finally { setLoading(""); }
  };

  const clearOldFiles = async (directory, days) => {
    setLoading(`clear_old_${directory}`);
    addSysLog(`Removing files older than ${days} days from ${directory}...`);
    try {
      const res = await fetch(`${API}/gpu/storage/clear-old?directory=${directory}&days_old=${days}`, { method: "POST" });
      const data = await res.json();
      addSysLog(`✓ Deleted ${data.files_deleted} files - ${data.mb_freed.toFixed(1)} MB freed`);
      addLog(`[OK] Cleaned old files from ${directory}`);
      fetchStorageAnalysis();
    } catch (err) {
      addSysLog(`✗ Clear old files failed: ${err.message}`);
      addLog(`[WARN] Clear old files failed`);
    } finally { setLoading(""); }
  };

  const updateAutoCleanupSetting = async (key, value) => {
    const newSettings = { ...autoCleanupSettings, [key]: value };
    try {
      await fetch(`${API}/gpu/auto-cleanup/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });
      setAutoCleanupSettings(newSettings);
      addLog(`[OK] Auto-cleanup setting updated: ${key} = ${value}`);
    } catch (err) {
      addLog(`[WARN] Failed to update setting: ${key}`);
    }
  };

  const S = {
    card: { background: "linear-gradient(135deg,#0d0d22 0%,#0a0a1a 100%)", border: "1px solid #1e1e3a", borderRadius: 12, padding: 16, marginBottom: 14 },
    label: { color: "#6666aa", fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12, display: "block" },
    btn: (bg, fg = "#000") => ({
      background: bg, color: fg, border: "none", borderRadius: 8, padding: "10px 16px",
      fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%", textAlign: "left",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      transition: "opacity 0.2s",
    }),
    btnSmall: (bg, fg = "#000") => ({
      background: bg, color: fg, border: "none", borderRadius: 6, padding: "6px 12px",
      fontSize: 11, fontWeight: 700, cursor: "pointer",
      transition: "opacity 0.2s",
    }),
  };

  const modeColors = { light: "#ffd166", full: "#06d6a0", high_end: "#00e5ff", offline: "#e63946" };
  const modeColor = modeColors[hwInfo?.mode] || "#888";

  const formatMB = (mb) => {
    if (mb === undefined || mb === null) return "0 MB";
    if (mb >= 1000) return `${(mb / 1000).toFixed(1)} GB`;
    return `${mb.toFixed(0)} MB`;
  };

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

        {/* Storage Breakdown */}
        <div style={S.card}>
          <span style={S.label}>💾 Storage Breakdown</span>
          {storageAnalysis && storageAnalysis.total_size_mb > 0 ? (
            <div>
              {/* Total Storage Bar */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "#6666aa", fontSize: 11 }}>Total Cache & Temp</span>
                  <span style={{ color: "#e0e0ff", fontSize: 11, fontWeight: 700 }}>{formatMB(storageAnalysis.total_size_mb)}</span>
                </div>
                <div style={{ width: "100%", height: 16, background: "#0a0a1a", borderRadius: 8, overflow: "hidden", display: "flex" }}>
                  {Object.entries(storageAnalysis.directories).filter(([_, info]) => info.exists && info.size_bytes > 0).map(([name, info], idx, arr) => {
                    const pct = (info.size_bytes / (storageAnalysis.total_size_mb * 1024 * 1024)) * 100;
                    const colors = ["#9b2de0", "#06d6a0", "#e63946", "#ffd166", "#00e5ff", "#ff6b9d"];
                    return (
                      <div key={name} style={{ width: `${pct}%`, height: "100%", background: colors[idx % colors.length], position: "relative" }} title={`${name}: ${formatMB(info.size_bytes / (1024*1024))}`}>
                        <title>{name}: {formatMB(info.size_bytes / (1024*1024))}</title>
                      </div>
                    );
                  })}
                </div>
                {storageAnalysis.disk_info && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: "#6666aa" }}>
                    <span>Disk: {storageAnalysis.disk_info.free_gb} GB free</span>
                    <span>{storageAnalysis.disk_info.usage_percent}% used</span>
                  </div>
                )}
              </div>

              {/* Directory List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {Object.entries(storageAnalysis.directories).filter(([_, info]) => info.exists && info.size_bytes > 0).map(([name, info]) => (
                  <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, padding: 6, background: "#0a0a1a", borderRadius: 6 }}>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#e0e0ff", fontSize: 10, textTransform: "capitalize", fontWeight: 600 }}>{name.replace(/_/g, " ")}</span>
                      <span style={{ color: "#6666aa", fontSize: 9 }}>{info.file_count} files</span>
                    </div>
                    <span style={{ color: "#06d6a0", fontSize: 11, fontWeight: 700 }}>{formatMB(info.size_bytes / (1024 * 1024))}</span>
                    <button onClick={() => clearCache(name.split("_")[0])} disabled={loading === `cache_${name.split("_")[0]}`} style={{ ...S.btnSmall("#e6394622", "#e63946"), border: "1px solid #e6394644", padding: "4px 8px" }}>
                      🗑
                    </button>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, marginTop: 10 }}>
                <button onClick={() => clearCache("all")} disabled={loading === "cache_all"} style={{ ...S.btnSmall("#e6394622", "#e63946"), border: "1px solid #e6394644" }}>
                  🗑 Clear All
                </button>
                <button onClick={fetchStorageAnalysis} style={{ ...S.btnSmall("#06d6a022", "#06d6a0"), border: "1px solid #06d6a044" }}>
                  🔄 Refresh
                </button>
              </div>
            </div>
          ) : (
            <div style={{ color: "#444466", fontSize: 12, textAlign: "center", padding: "40px 0" }}>
              📭 No cache or temp files found - your storage is clean!
            </div>
          )}
        </div>

        {/* Quick Clean All */}
        <div style={S.card}>
          <span style={S.label}>🗑️ Quick Clean</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={() => clearCache("all")} disabled={loading === "cache_all"} style={{ ...S.btn("#e6394622", "#e63946"), border: "1px solid #e6394644" }}>
              <span>🗑 Clear All Caches</span>
              <span style={{ fontSize: 16 }}>›</span>
            </button>
            <button onClick={() => clearOldFiles("backend_output", 7)} disabled={loading.includes("clear_old")} style={{ ...S.btn("#ffd16622", "#ffd166"), border: "1px solid #ffd16644" }}>
              <span>📁 Clean Output &gt;7 days</span>
              <span style={{ fontSize: 16 }}>›</span>
            </button>
            <button onClick={fetchStorageAnalysis} style={{ ...S.btn("#06d6a022", "#06d6a0"), border: "1px solid #06d6a044" }}>
              <span>🔄 Refresh Analysis</span>
              <span style={{ fontSize: 16 }}>›</span>
            </button>
          </div>
        </div>
      </div>

      <div>
        {/* Auto-Cleanup Settings */}
        <div style={S.card}>
          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={S.label}>⚙️ Auto-Cleanup Settings</span>
            <button onClick={() => { setShowAutoCleanup(!showAutoCleanup); if (!showAutoCleanup && !autoCleanupSettings) fetchAutoCleanupSettings(); }} style={{ ...S.btnSmall("#6666aa22", "#6666aa"), border: "1px solid #6666aa44" }}>
              {showAutoCleanup ? "✕" : "⚙️"}
            </button>
          </span>
          {showAutoCleanup && autoCleanupSettings && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, padding: 6, background: "#0a0a1a", borderRadius: 6 }}>
                <input type="checkbox" checked={autoCleanupSettings.enabled || false} onChange={(e) => updateAutoCleanupSetting("enabled", e.target.checked)} style={{ accentColor: "#06d6a0" }} />
                <span style={{ color: "#e0e0ff", fontSize: 11 }}>Enable Auto-Cleanup</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, padding: 6, background: "#0a0a1a", borderRadius: 6 }}>
                <input type="checkbox" checked={autoCleanupSettings.clear_temp_after_task || false} onChange={(e) => updateAutoCleanupSetting("clear_temp_after_task", e.target.checked)} style={{ accentColor: "#06d6a0" }} />
                <span style={{ color: "#e0e0ff", fontSize: 11 }}>Clear temp after each task</span>
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 6, background: "#0a0a1a", borderRadius: 6 }}>
                <span style={{ color: "#e0e0ff", fontSize: 11 }}>Clear output older than:</span>
                <select value={autoCleanupSettings.clear_output_days || 7} onChange={(e) => updateAutoCleanupSetting("clear_output_days", parseInt(e.target.value))} style={{ background: "#1a1a2e", color: "#e0e0ff", border: "1px solid #1e1e3a", borderRadius: 4, padding: "4px 8px", fontSize: 11 }}>
                  <option value="3">3 days</option>
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 6, background: "#0a0a1a", borderRadius: 6 }}>
                <span style={{ color: "#e0e0ff", fontSize: 11 }}>Alert when cache &gt;</span>
                <select value={autoCleanupSettings.alert_threshold_mb || 500} onChange={(e) => updateAutoCleanupSetting("alert_threshold_mb", parseInt(e.target.value))} style={{ background: "#1a1a2e", color: "#e0e0ff", border: "1px solid #1e1e3a", borderRadius: 4, padding: "4px 8px", fontSize: 11 }}>
                  <option value="200">200 MB</option>
                  <option value="500">500 MB</option>
                  <option value="1000">1 GB</option>
                  <option value="2000">2 GB</option>
                </select>
              </div>
            </div>
          )}
          {!showAutoCleanup && (
            <div style={{ color: "#444466", fontSize: 11, padding: "10px 0" }}>
              Click ⚙️ to configure auto-cleanup rules
            </div>
          )}
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
            <button onClick={() => action("gpu/unload-all", "Unload Models")}
              disabled={loading === "gpu/unload-all"}
              style={{ ...S.btn("#ffd16622", "#ffd166"), border: "1px solid #ffd16644" }}>
              <span>📤 Unload All Models</span>
              <span style={{ fontSize: 16 }}>›</span>
            </button>
            <button onClick={() => action("gpu/cleanup", "Auto Cleanup")}
              disabled={loading === "gpu/cleanup"}
              style={{ ...S.btn("#00e5ff22", "#00e5ff"), border: "1px solid #00e5ff44" }}>
              <span>🔄 Auto Cleanup</span>
              <span style={{ fontSize: 16 }}>›</span>
            </button>
          </div>
        </div>

        {/* System Log */}
        <div style={{ ...S.card, maxHeight: 300, overflowY: "auto" }}>
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
