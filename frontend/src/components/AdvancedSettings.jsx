/**
 * AdvancedSettings Component for ACE-Step v1.5
 * Simplified version with essential parameters only
 */

export default function AdvancedSettings({ settings, setSettings }) {
  const set = (key, val) => setSettings(p => ({ ...p, [key]: val }));
  const toggle = (key) => setSettings(p => ({ ...p, [key]: !p[key] }));

  const S = {
    card: { background: "linear-gradient(135deg, #0d0d22 0%, #0a0a1a 100%)", border: "1px solid #1e1e3a", borderRadius: 12, padding: 16, marginBottom: 14 },
    label: { color: "#6666aa", fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12, display: "block" },
    sectionHeader: { fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 },
  };

  const Toggle = ({ on, onChange }) => (
    <div
      onClick={() => onChange(!on)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: on ? "linear-gradient(135deg, #00e5ff, #00b4d8)" : "#1a1a2e",
        position: "relative",
        cursor: "pointer",
        border: `1px solid ${on ? "#00e5ff" : "#2a2a4a"}`,
        transition: "all 0.25s ease",
        flexShrink: 0,
        boxShadow: on ? "0 0 12px #00e5ff44" : "none",
      }}
    >
      <div style={{
        position: "absolute",
        top: 3,
        left: on ? 22 : 3,
        width: 16,
        height: 16,
        borderRadius: "50%",
        background: on ? "#000" : "#555",
        transition: "left 0.25s ease",
        boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
      }} />
    </div>
  );

  const Slider = ({ value, min, max, step, onChange, color = "#00e5ff", unit = "" }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onInput={e => onChange(Number(e.target.value))}
        className="advanced-slider"
        style={{ flex: 1, cursor: "pointer" }}
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => {
          const val = Number(e.target.value);
          if (!isNaN(val) && val >= min && val <= max) {
            onChange(val);
          }
        }}
        style={{
          width: 70,
          background: "#080812",
          border: `1px solid ${color}44`,
          color: color,
          borderRadius: 6,
          padding: "4px 8px",
          fontSize: 11,
          fontFamily: "monospace",
          textAlign: "center",
          cursor: "pointer",
        }}
      />
      {unit && (
        <span style={{ color: color, fontSize: 11, minWidth: 20 }}>{unit}</span>
      )}
    </div>
  );

  const Row = ({ enableKey, icon, label, children, description }) => (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      marginBottom: 8,
      padding: "12px 14px",
      background: settings[enableKey]
        ? "linear-gradient(135deg, #0d0d22, #0a0a1a)"
        : "#080812",
      borderRadius: 10,
      border: `1px solid ${settings[enableKey] ? "#00e5ff33" : "#1a1a2e"}`,
      transition: "all 0.2s ease",
      opacity: settings[enableKey] ? 1 : 0.7,
    }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          minWidth: 180,
          flexShrink: 0,
          userSelect: "none",
        }}
        onClick={() => toggle(enableKey)}
      >
        <div style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          border: `2px solid ${settings[enableKey] ? "#00e5ff" : "#2a2a4a"}`,
          background: settings[enableKey] ? "#00e5ff" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease",
          flexShrink: 0,
        }}>
          {settings[enableKey] && (
            <span style={{ color: "#000", fontSize: 12, fontWeight: 900 }}>✓</span>
          )}
        </div>
        <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{
            color: settings[enableKey] ? "#e0e0ff" : "#6666aa",
            fontSize: 12,
            fontWeight: 600,
            transition: "color 0.2s ease",
          }}>{label}</span>
          {description && (
            <span style={{ color: "#444466", fontSize: 9.5 }}>{description}</span>
          )}
        </div>
      </div>
      <div style={{ flex: 1, pointerEvents: settings[enableKey] ? "auto" : "none", opacity: settings[enableKey] ? 1 : 0.5 }}>
        {children}
      </div>
    </div>
  );

  const SectionHeader = ({ color, icon, title }) => (
    <div style={{
      ...S.sectionHeader,
      color: color,
    }}>
      <span style={{
        background: `${color}22`,
        padding: "4px 10px",
        borderRadius: 6,
        border: `1px solid ${color}33`
      }}>{icon} {title}</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 800 }} className="fade-in">
      {/* Helper Info */}
      <div style={{
        color: "#6666aa",
        fontSize: 11,
        marginBottom: 16,
        padding: "10px 14px",
        background: "linear-gradient(135deg, #0d0d22, #0a0a1a)",
        borderRadius: 10,
        border: "1px solid #1a1a2e",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <span style={{ fontSize: 14 }}>ℹ</span>
        <span>All settings are <strong style={{ color: "#ffd166" }}>disabled by default</strong>. Enable each parameter to customize generation.</span>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1: Music Control Parameters
          Based on: GenerateMusicRequest.bpm, key_scale, time_signature
      ═══════════════════════════════════════════════════════════════════ */}
      <div style={S.card}>
        <SectionHeader color="#ffd166" icon="🎵" title="Music Control" />

        <Row enableKey="bpmEnabled" icon="♩" label="BPM" description="Beats per minute (40-200)">
          <Slider value={settings.bpm || 120} min={40} max={200} step={1}
            onChange={v => set("bpm", v)} color="#ffd166" unit=" BPM" />
        </Row>

        <Row enableKey="keyScaleEnabled" icon="🎼" label="Key Scale" description="Musical key (e.g., C major, A minor)">
          <input
            type="text"
            value={settings.keyScale || ""}
            onChange={e => set("keyScale", e.target.value)}
            placeholder="e.g., C major, A minor, F# minor"
            style={{
              flex: 1,
              background: "#080812",
              border: "1px solid #ffd16644",
              color: "#ffd166",
              borderRadius: 6,
              padding: "8px 12px",
              fontSize: 12,
              fontFamily: "monospace",
            }}
          />
        </Row>

        <Row enableKey="timeSigEnabled" icon="📐" label="Time Signature" description="Time signature (e.g., 4/4, 3/4)">
          <select
            value={settings.timeSignature || ""}
            onChange={e => set("timeSignature", e.target.value)}
            style={{
              flex: 1,
              background: "#080812",
              border: "1px solid #ffd16644",
              color: "#ffd166",
              borderRadius: 6,
              padding: "8px 12px",
              fontSize: 12,
              fontFamily: "monospace",
            }}
          >
            <option value="">Auto</option>
            <option value="4/4">4/4 (Common)</option>
            <option value="3/4">3/4 (Waltz)</option>
            <option value="6/8">6/8 (Compound)</option>
            <option value="2/4">2/4 (March)</option>
            <option value="5/4">5/4 (Odd)</option>
            <option value="7/8">7/8 (Odd)</option>
          </select>
        </Row>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2: Seed & Random Control
          Based on: use_random_seed, seed
      ═══════════════════════════════════════════════════════════════════ */}
      <div style={S.card}>
        <SectionHeader color="#c77dff" icon="🎲" title="Seed & Random Control" />

        <Row enableKey="useRandomSeedEnabled" icon="🔀" label="Random Seed" description="Use random seed for each generation">
          <Toggle on={settings.useRandomSeed !== false} onChange={v => set("useRandomSeed", v)} />
        </Row>

        <Row enableKey="seedEnabled" icon="🔢" label="Fixed Seed" description="Specific seed for reproducible results">
          <Slider value={settings.seed || -1} min={-1} max={2147483647} step={1}
            onChange={v => set("seed", v)} color="#c77dff" />
        </Row>

        {settings.seedEnabled && settings.seed >= 0 && (
          <div style={{ color: "#c77dff", fontSize: 10, marginTop: 8, padding: "8px 12px", background: "#080812", borderRadius: 6, border: "1px solid #c77dff33" }}>
            🔒 Seed locked to <strong>#{settings.seed}</strong> - results will be reproducible
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3: Language Model (LM) Parameters
          Based on: lm_temperature, lm_cfg_scale, lm_top_k, lm_top_p, lm_negative_prompt
      ═══════════════════════════════════════════════════════════════════ */}
      <div style={S.card}>
        <SectionHeader color="#00e5ff" icon="🧠" title="Language Model (LM) Parameters" />

        <Row enableKey="lmTempEnabled" icon="🌡" label="Temperature" description="LM sampling temperature (0.5-2.0)">
          <Slider value={settings.lmTemperature || 0.85} min={0.5} max={2} step={0.01}
            onChange={v => set("lmTemperature", v)} color="#00e5ff" />
        </Row>

        <Row enableKey="lmCfgEnabled" icon="📐" label="LM CFG Scale" description="LM guidance scale (1.0-5.0)">
          <Slider value={settings.lmCfgScale || 2.5} min={1} max={5} step={0.1}
            onChange={v => set("lmCfgScale", v)} color="#00e5ff" />
        </Row>

        <Row enableKey="lmTopPEnabled" icon="📊" label="Top-P (Nucleus)" description="Nucleus sampling threshold (0.8-1.0)">
          <Slider value={settings.lmTopP || 0.9} min={0.8} max={1} step={0.01}
            onChange={v => set("lmTopP", v)} color="#00e5ff" />
        </Row>

        <Row enableKey="lmTopKEnabled" icon="🔝" label="Top-K" description="Top-K token sampling (0 = disabled)">
          <Slider value={settings.lmTopK || 0} min={0} max={100} step={1}
            onChange={v => set("lmTopK", v)} color="#00e5ff" unit="" />
        </Row>

        <Row enableKey="lmNegativePromptEnabled" icon="🚫" label="LM Negative Prompt" description="What to avoid in lyrics/metadata">
          <input
            type="text"
            value={settings.lmNegativePrompt || ""}
            onChange={e => set("lmNegativePrompt", e.target.value)}
            placeholder="e.g., NO USER INPUT, low quality"
            style={{
              flex: 1,
              background: "#080812",
              border: "1px solid #00e5ff44",
              color: "#00e5ff",
              borderRadius: 6,
              padding: "8px 12px",
              fontSize: 12,
              fontFamily: "monospace",
            }}
          />
        </Row>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 4: Audio Format & Output
          Based on: audio_format, vocal_language
      ═══════════════════════════════════════════════════════════════════ */}
      <div style={S.card}>
        <SectionHeader color="#e63946" icon="🔊" title="Audio Format & Output" />

        <Row enableKey="audioFormatEnabled" icon="📀" label="Output Format" description="Audio file format">
          <select
            value={settings.audioFormat || "mp3"}
            onChange={e => set("audioFormat", e.target.value)}
            style={{
              flex: 1,
              background: "#080812",
              border: "1px solid #e6394644",
              color: "#e63946",
              borderRadius: 6,
              padding: "8px 12px",
              fontSize: 12,
              fontFamily: "monospace",
            }}
          >
            <option value="mp3">MP3 (compressed, small)</option>
            <option value="wav">WAV (uncompressed)</option>
            <option value="flac">FLAC (lossless)</option>
          </select>
        </Row>

        <Row enableKey="vocalLanguageEnabled" icon="🗣" label="Vocal Language" description="Preferred vocal language">
          <select
            value={settings.vocalLanguage || "en"}
            onChange={e => set("vocalLanguage", e.target.value)}
            style={{
              flex: 1,
              background: "#080812",
              border: "1px solid #e6394644",
              color: "#e63946",
              borderRadius: 6,
              padding: "8px 12px",
              fontSize: 12,
              fontFamily: "monospace",
            }}
          >
            <option value="en">English</option>
            <option value="ro">Romanian (Română)</option>
            <option value="es">Spanish (Español)</option>
            <option value="ar">Arabic (العربية)</option>
            <option value="el">Greek (Ελληνικά)</option>
            <option value="unknown">Auto-detect</option>
          </select>
        </Row>

        <Row enableKey="audioCoverStrengthEnabled" icon="🎚" label="Cover Strength" description="Audio2Audio source strength (0-1)">
          <Slider value={settings.audioCoverStrength ?? 0.5} min={0} max={1} step={0.05}
            onChange={v => set("audioCoverStrength", v)} color="#e63946" />
        </Row>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 5: Chain-of-Thought (CoT) Control
          Based on: use_cot_caption, use_cot_language
      ═══════════════════════════════════════════════════════════════════ */}
      <div style={S.card}>
        <SectionHeader color="#7209b7" icon="🔗" title="Chain-of-Thought (CoT) Control" />

        <Row enableKey="cotCaptionEnabled" icon="📝" label="CoT Caption" description="Use LM for caption generation">
          <Toggle on={settings.useCotCaption !== false} onChange={v => set("useCotCaption", v)} />
        </Row>

        <Row enableKey="cotLanguageEnabled" icon="🌐" label="CoT Language" description="Use LM for language detection">
          <Toggle on={settings.useCotLanguage !== false} onChange={v => set("useCotLanguage", v)} />
        </Row>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 6: Batch & Performance
          Based on: batch_size
      ═══════════════════════════════════════════════════════════════════ */}
      <div style={S.card}>
        <SectionHeader color="#8338ec" icon="📦" title="Batch & Performance" />

        <Row enableKey="batchSizeEnabled" icon="📦" label="Batch Size" description="Parallel generations (VRAM intensive)">
          <Slider value={settings.batchSize || 1} min={1} max={8} step={1}
            onChange={v => set("batchSize", v)} color="#8338ec" />
        </Row>

        <div style={{ color: "#fb5607", fontSize: 10, marginTop: 8, padding: "8px 12px", background: "#080812", borderRadius: 6, border: "1px solid #fb560733" }}>
          ⚠️ <strong>Warning:</strong> Batch size &gt;1 requires significant VRAM. RTX 3070: batch=1 recommended.
        </div>
      </div>

      {/* Reset Button */}
      <button
        onClick={() => {
          if (confirm("Reset all advanced settings to defaults?")) {
            setSettings({});
          }
        }}
        style={{
          width: "100%",
          padding: "12px",
          background: "#1a1a2e",
          border: "1px solid #2a2a4a",
          borderRadius: 8,
          color: "#6666aa",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          marginTop: 16,
        }}
      >
        🗑 Reset All Settings to Defaults
      </button>
    </div>
  );
}
