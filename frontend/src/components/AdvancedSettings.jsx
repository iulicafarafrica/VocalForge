/**
 * AdvancedSettings Component for ACE-Step v1.5
 * Based on official ACE-Step v1.5 API documentation
 * @see https://github.com/ace-step/ACE-Step-1.5
 * 
 * Documentation Summary:
 * - DiT Models: acestep-v15-base (50 steps, CFG), acestep-v15-turbo (8 steps, no CFG)
 * - LM Models: 0.6B (6-8GB VRAM), 1.7B (12-16GB VRAM), 4B (24GB+ VRAM)
 * - Duration: 10s - 600s (10 minutes)
 * - Batch Size: 1 - 8 (max 8 songs simultaneously)
 * - Supported Languages: 50+ languages
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
          SECTION 2: Diffusion Parameters
          Based on: inference_steps, guidance_scale, infer_method, shift
      ═══════════════════════════════════════════════════════════════════ */}
      <div style={S.card}>
        <SectionHeader color="#06d6a0" icon="🔄" title="Diffusion Parameters" />

        <Row enableKey="inferStepsEnabled" icon="🔢" label="Inference Steps" description="Diffusion sampling steps (4-50)">
          <Slider value={settings.inferSteps || 8} min={4} max={50} step={1}
            onChange={v => set("inferSteps", v)} color="#06d6a0" unit=" steps" />
        </Row>

        <Row enableKey="guidanceEnabled" icon="🎯" label="Guidance Scale (CFG)" description="Classifier-free guidance (1.0-20.0)">
          <Slider value={settings.guidanceScale || 7.0} min={1} max={20} step={0.5}
            onChange={v => set("guidanceScale", v)} color="#06d6a0" />
        </Row>

        <Row enableKey="inferMethodEnabled" icon="🔬" label="Inference Method" description="Diffusion solver type">
          <select
            value={settings.inferMethod || "ode"}
            onChange={e => set("inferMethod", e.target.value)}
            style={{
              flex: 1,
              background: "#080812",
              border: "1px solid #06d6a044",
              color: "#06d6a0",
              borderRadius: 6,
              padding: "8px 12px",
              fontSize: 12,
              fontFamily: "monospace",
            }}
          >
            <option value="ode">ODE (Deterministic)</option>
            <option value="sde">SDE (Stochastic)</option>
          </select>
        </Row>

        <Row enableKey="shiftEnabled" icon="📊" label="Timestep Shift" description="Shift factor for base models (1.0-5.0)">
          <Slider value={settings.shift || 3.0} min={1} max={5} step={0.1}
            onChange={v => set("shift", v)} color="#06d6a0" />
        </Row>

        <div style={{ color: "#444466", fontSize: 10, marginTop: 8, padding: "8px 12px", background: "#080812", borderRadius: 6 }}>
          💡 <strong>Tip:</strong> Turbo models work best with 8 steps. Base models need 12-20 steps with shift=3.0.
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3: Seed & Random Control
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
          SECTION 4: Language Model (LM) Parameters
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

        <div style={{ color: "#444466", fontSize: 10, marginTop: 8, padding: "8px 12px", background: "#080812", borderRadius: 6 }}>
          💡 <strong>Default:</strong> LM negative prompt is "NO USER INPUT" - change to customize lyric generation.
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 5: Advanced Generation Control
          Based on: use_adg, cfg_interval_start, cfg_interval_end, use_tiled_decode, thinking
      ═══════════════════════════════════════════════════════════════════ */}
      <div style={S.card}>
        <SectionHeader color="#ff9f1c" icon="⚙" title="Advanced Generation Control" />

        <Row enableKey="useAdgEnabled" icon="🎛" label="Use ADG" description="Adaptive Dynamic Guidance">
          <Toggle on={settings.useAdg !== false} onChange={v => set("useAdg", v)} />
        </Row>

        <Row enableKey="cfgIntervalEnabled" icon="📏" label="CFG Interval" description="Apply CFG only in this range">
          <div style={{ display: "flex", gap: 8, flex: 1 }}>
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={settings.cfgIntervalStart ?? 0}
              onChange={e => set("cfgIntervalStart", parseFloat(e.target.value))}
              placeholder="Start"
              style={{
                flex: 1,
                background: "#080812",
                border: "1px solid #ff9f1c44",
                color: "#ff9f1c",
                borderRadius: 6,
                padding: "8px 12px",
                fontSize: 12,
                fontFamily: "monospace",
                textAlign: "center",
              }}
            />
            <span style={{ color: "#ff9f1c", fontSize: 12 }}>→</span>
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={settings.cfgIntervalEnd ?? 1}
              onChange={e => set("cfgIntervalEnd", parseFloat(e.target.value))}
              placeholder="End"
              style={{
                flex: 1,
                background: "#080812",
                border: "1px solid #ff9f1c44",
                color: "#ff9f1c",
                borderRadius: 6,
                padding: "8px 12px",
                fontSize: 12,
                fontFamily: "monospace",
                textAlign: "center",
              }}
            />
          </div>
        </Row>

        <Row enableKey="tiledDecodeEnabled" icon="🔲" label="Tiled Decode" description="VRAM optimization for long audio">
          <Toggle on={settings.useTiledDecode !== false} onChange={v => set("useTiledDecode", v)} />
        </Row>

        <Row enableKey="thinkingEnabled" icon="💭" label="Thinking Mode" description="Use 5Hz LM for audio codes (slower, better)">
          <Toggle on={settings.thinking !== false} onChange={v => set("thinking", v)} />
        </Row>

        <div style={{ color: "#444466", fontSize: 10, marginTop: 8, padding: "8px 12px", background: "#080812", borderRadius: 6 }}>
          💡 <strong>CFG Interval:</strong> [0, 1] range. Default [0, 1] applies CFG throughout. Narrow interval speeds up generation.
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 6: Audio Format & Output
          Based on: audio_format, vocal_language, audio_cover_strength
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
            <option value="opus">Opus (web optimized)</option>
            <option value="aac">AAC (iTunes)</option>
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
            <option value="zh">Chinese (中文)</option>
            <option value="ja">Japanese (日本語)</option>
            <option value="ko">Korean (한국어)</option>
            <option value="fr">French (Français)</option>
            <option value="de">German (Deutsch)</option>
            <option value="es">Spanish (Español)</option>
            <option value="it">Italian (Italiano)</option>
            <option value="pt">Portuguese (Português)</option>
            <option value="ru">Russian (Русский)</option>
            <option value="ro">Romanian (Română)</option>
            <option value="ar">Arabic (العربية)</option>
            <option value="unknown">Auto-detect</option>
          </select>
        </Row>

        <Row enableKey="audioCoverStrengthEnabled" icon="🎚" label="Cover Strength" description="Audio2Audio source strength (0-1)">
          <Slider value={settings.audioCoverStrength ?? 0.5} min={0} max={1} step={0.05}
            onChange={v => set("audioCoverStrength", v)} color="#e63946" />
        </Row>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 7: CoT (Chain-of-Thought) Control
          Based on: use_cot_caption, use_cot_language, constrained_decoding
      ═══════════════════════════════════════════════════════════════════ */}
      <div style={S.card}>
        <SectionHeader color="#7209b7" icon="🔗" title="Chain-of-Thought (CoT) Control" />

        <Row enableKey="cotCaptionEnabled" icon="📝" label="CoT Caption" description="Use LM for caption generation">
          <Toggle on={settings.useCotCaption !== false} onChange={v => set("useCotCaption", v)} />
        </Row>

        <Row enableKey="cotLanguageEnabled" icon="🌐" label="CoT Language" description="Use LM for language detection">
          <Toggle on={settings.useCotLanguage !== false} onChange={v => set("useCotLanguage", v)} />
        </Row>

        <Row enableKey="constrainedDecodingEnabled" icon="🔒" label="Constrained Decoding" description="Restrict LM output format">
          <Toggle on={settings.constrainedDecoding !== false} onChange={v => set("constrainedDecoding", v)} />
        </Row>

        <div style={{ color: "#444466", fontSize: 10, marginTop: 8, padding: "8px 12px", background: "#080812", borderRadius: 6 }}>
          💡 <strong>CoT:</strong> Chain-of-Thought enables the LM to reason about music structure before generating audio codes.
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 8: Task Type & Special Modes
          Based on: task_type, sample_mode, analysis_only
      ═══════════════════════════════════════════════════════════════════ */}
      <div style={S.card}>
        <SectionHeader color="#3a86ff" icon="🎯" title="Task Type & Special Modes" />

        <Row enableKey="taskTypeEnabled" icon="📋" label="Task Type" description="Generation task type">
          <select
            value={settings.taskType || "text2music"}
            onChange={e => set("taskType", e.target.value)}
            style={{
              flex: 1,
              background: "#080812",
              border: "1px solid #3a86ff44",
              color: "#3a86ff",
              borderRadius: 6,
              padding: "8px 12px",
              fontSize: 12,
              fontFamily: "monospace",
            }}
          >
            <option value="text2music">Text-to-Music (prompt → audio)</option>
            <option value="audio2audio">Audio-to-Audio (style transfer)</option>
            <option value="cover">Cover (voice conversion)</option>
            <option value="repaint">Repaint (edit audio region)</option>
            <option value="lego">Lego (add track layer)</option>
            <option value="complete">Complete (finish incomplete track)</option>
          </select>
        </Row>

        <Row enableKey="sampleModeEnabled" icon="🎲" label="Sample Mode" description="Auto-generate caption/lyrics from description">
          <Toggle on={settings.sampleMode !== false} onChange={v => set("sampleMode", v)} />
        </Row>

        <Row enableKey="analysisOnlyEnabled" icon="🔍" label="Analysis Only" description="Only analyze, don't generate audio">
          <Toggle on={settings.analysisOnly !== false} onChange={v => set("analysisOnly", v)} />
        </Row>

        <div style={{ color: "#444466", fontSize: 10, marginTop: 8, padding: "8px 12px", background: "#080812", borderRadius: 6 }}>
          💡 <strong>Task Types:</strong> text2music (default), audio2audio/cover (needs source audio), repaint/lego/complete (advanced editing).
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 9: Batch & Performance
          Based on: batch_size, use_format
      ═══════════════════════════════════════════════════════════════════ */}
      <div style={S.card}>
        <SectionHeader color="#8338ec" icon="📦" title="Batch & Performance" />

        <Row enableKey="batchSizeEnabled" icon="📦" label="Batch Size" description="Parallel generations (VRAM intensive)">
          <Slider value={settings.batchSize || 1} min={1} max={8} step={1}
            onChange={v => set("batchSize", v)} color="#8338ec" />
        </Row>

        <Row enableKey="useFormatEnabled" icon="✨" label="Use Format" description="Enhance input with format_sample()">
          <Toggle on={settings.useFormat !== false} onChange={v => set("useFormat", v)} />
        </Row>

        <div style={{ color: "#fb5607", fontSize: 10, marginTop: 8, padding: "8px 12px", background: "#080812", borderRadius: 6, border: "1px solid #fb560733" }}>
          ⚠️ <strong>Warning:</strong> Batch size &gt;1 requires significant VRAM. RTX 3070: batch=1 recommended.
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 10: Model & LoRA Selection
          Based on: model, lm_model, lm_backend
          Models: acestep-v15-base (50 steps), acestep-v15-turbo (8 steps)
          LM Models: 0.6B (6-8GB), 1.7B (12-16GB), 4B (24GB+)
      ═══════════════════════════════════════════════════════════════════ */}
      <div style={S.card}>
        <SectionHeader color="#ff006e" icon="🔧" title="Model & LoRA Selection" />

        <Row enableKey="modelEnabled" icon="🎛" label="DiT Model" description="Select ACE-Step model variant">
          <select
            value={settings.model || ""}
            onChange={e => set("model", e.target.value)}
            style={{
              flex: 1,
              background: "#080812",
              border: "1px solid #ff006e44",
              color: "#ff006e",
              borderRadius: 6,
              padding: "8px 12px",
              fontSize: 12,
              fontFamily: "monospace",
            }}
          >
            <option value="">Auto (default)</option>
            <option value="acestep-v15-turbo">ACE-Step v1.5 Turbo (fast, 8 steps)</option>
            <option value="acestep-v15-base">ACE-Step v1.5 Base (quality, 50 steps)</option>
            <option value="acestep-v15-sft">ACE-Step v1.5 SFT (high quality)</option>
            <option value="acestep-v15-turbo-rl">ACE-Step v1.5 Turbo RL (reinforcement)</option>
          </select>
        </Row>

        <Row enableKey="lmModelEnabled" icon="🧠" label="LM Model" description="Language model for metadata">
          <select
            value={settings.lmModel || ""}
            onChange={e => set("lmModel", e.target.value)}
            style={{
              flex: 1,
              background: "#080812",
              border: "1px solid #ff006e44",
              color: "#ff006e",
              borderRadius: 6,
              padding: "8px 12px",
              fontSize: 12,
              fontFamily: "monospace",
            }}
          >
            <option value="">Auto (default)</option>
            <option value="acestep-5Hz-lm-0.6B">0.6B (6-8GB VRAM, faster)</option>
            <option value="acestep-5Hz-lm-1.7B">1.7B (12-16GB VRAM, better)</option>
            <option value="acestep-5Hz-lm-4B">4B (24GB+ VRAM, best)</option>
          </select>
        </Row>

        <Row enableKey="lmBackendEnabled" icon="⚡" label="LM Backend" description="Language model runtime">
          <select
            value={settings.lmBackend || "vllm"}
            onChange={e => set("lmBackend", e.target.value)}
            style={{
              flex: 1,
              background: "#080812",
              border: "1px solid #ff006e44",
              color: "#ff006e",
              borderRadius: 6,
              padding: "8px 12px",
              fontSize: 12,
              fontFamily: "monospace",
            }}
          >
            <option value="vllm">vLLM (optimized, 8GB+)</option>
            <option value="pt">PyTorch (default, 6-8GB)</option>
            <option value="mlx">MLX (Apple Silicon)</option>
            <option value="int8">INT8 Quantized (≤6GB VRAM)</option>
          </select>
        </Row>

        <div style={{ color: "#444466", fontSize: 10, marginTop: 8, padding: "8px 12px", background: "#080812", borderRadius: 6 }}>
          💡 <strong>VRAM Guide:</strong> ≤6GB: DiT only (INT8), 6-8GB: 0.6B LM, 8-16GB: 1.7B LM, 24GB+: 4B LM
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 11: Duration & Output Control
          Based on: audio_duration, latent_shift, latent_rescale
          Duration: 10s - 600s (10 minutes max)
      ═══════════════════════════════════════════════════════════════════ */}
      <div style={S.card}>
        <SectionHeader color="#00ddff" icon="⏱" title="Duration & Output Control" />

        <Row enableKey="durationEnabled" icon="⏱" label="Duration" description="Audio length in seconds (10-600s)">
          <Slider value={settings.duration || 60} min={10} max={600} step={5}
            onChange={v => set("duration", v)} color="#00ddff" unit=" sec" />
        </Row>

        <Row enableKey="latentShiftEnabled" icon="📈" label="Latent Shift" description="Additive latent post-processing (-1 to 1)">
          <Slider value={settings.latentShift ?? 0} min={-1} max={1} step={0.05}
            onChange={v => set("latentShift", v)} color="#00ddff" />
        </Row>

        <Row enableKey="latentRescaleEnabled" icon="📐" label="Latent Rescale" description="Multiplicative latent post-processing (0.5-2.0)">
          <Slider value={settings.latentRescale ?? 1} min={0.5} max={2} step={0.05}
            onChange={v => set("latentRescale", v)} color="#00ddff" />
        </Row>

        <div style={{ color: "#444466", fontSize: 10, marginTop: 8, padding: "8px 12px", background: "#080812", borderRadius: 6 }}>
          💡 <strong>Duration:</strong> Default 60s. Longer duration = more VRAM. Max 600s (10 minutes).
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 12: Repaint & Edit Control
          Based on: repainting_start, repainting_end, cover_noise_strength
      ═══════════════════════════════════════════════════════════════════ */}
      <div style={S.card}>
        <SectionHeader color="#ff6b6b" icon="✏" title="Repaint & Edit Control" />

        <Row enableKey="repaintingStartEnabled" icon="🔙" label="Repaint Start" description="Repainting start position (seconds)">
          <Slider value={settings.repaintingStart ?? 0} min={0} max={600} step={1}
            onChange={v => set("repaintingStart", v)} color="#ff6b6b" unit=" sec" />
        </Row>

        <Row enableKey="repaintingEndEnabled" icon="🔚" label="Repaint End" description="Repainting end position (-1 = end of audio)">
          <Slider value={settings.repaintingEnd ?? -1} min={-1} max={600} step={1}
            onChange={v => set("repaintingEnd", v)} color="#ff6b6b" unit={settings.repaintingEnd === -1 ? " (end)" : " sec"} />
        </Row>

        <Row enableKey="coverNoiseStrengthEnabled" icon="📢" label="Cover Noise Strength" description="Noise strength for cover generation (0-1)">
          <Slider value={settings.coverNoiseStrength ?? 0} min={0} max={1} step={0.05}
            onChange={v => set("coverNoiseStrength", v)} color="#ff6b6b" />
        </Row>

        <div style={{ color: "#444466", fontSize: 10, marginTop: 8, padding: "8px 12px", background: "#080812", borderRadius: 6 }}>
          💡 <strong>Repaint:</strong> Set start/end to edit specific audio region. End=-1 means end of audio.
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
