import React, { useState, useRef, useEffect } from 'react';

const API = 'http://localhost:8000';

const STAGES = [
  { key: 'stage1_separation', label: 'Stage 1', desc: 'BS-RoFormer — Separare vocala',    icon: '🎵', color: '#6366f1' },
  { key: 'stage2_rvc',        label: 'Stage 2', desc: 'RVC — Voice Conversion',           icon: '🎤', color: '#8b5cf6' },
  { key: 'stage4_mix',        label: 'Stage 3', desc: 'Mix Final — Vocal + Instrumental', icon: '🎚️', color: '#ec4899' },
];

const STATUS_COLOR = { pending: '#444', running: '#f59e0b', done: '#10b981', error: '#ef4444', skipped: '#6b7280' };
const STATUS_LABEL = { pending: '⏳ Astept', running: '⚙️ Rulează', done: '✅ Gata', error: '❌ Eroare', skipped: '⏭️ Skip' };

export default function PipelineTab() {
  const [file, setFile]             = useState(null);
  const [models, setModels]         = useState([]);
  const [rvcModel, setRvcModel]     = useState('');
  const [rvcPitch, setRvcPitch]     = useState(0);
  const [rvcProtect, setRvcProtect] = useState(0.55);

  // RVC Advanced Settings
  const [f0Method, setF0Method]         = useState('harvest');
  const [indexRate, setIndexRate]       = useState(0.40);
  const [filterRadius, setFilterRadius] = useState(3);
  const [rmsMixRate, setRmsMixRate]     = useState(0.25);

  // Vocal Chain Preset
  const [vocalPreset, setVocalPreset]   = useState('studio_radio');

  // Stage 2 options (Applio - disabled for music)
  const [enableAutotune, setEnableAutotune]             = useState(false);
  const [autotuneStrength, setAutotuneStrength]         = useState(0.0);
  const [enableHighpass, setEnableHighpass]             = useState(false);
  const [enableVolumeEnvelope, setEnableVolumeEnvelope] = useState(false);

  // Stage 3 (Mix) - always enabled
  const [enableStage4, setEnableStage4] = useState(true);

  const [jobId, setJobId]     = useState(null);
  const [progress, setProgress] = useState(0);
  const [stages, setStages]   = useState({});
  const [error, setError]     = useState(null);
  const [outputs, setOutputs] = useState({});
  const [running, setRunning] = useState(false);
  const [done, setDone]       = useState(false);
  const esRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/pipeline/models`)
      .then(r => r.json())
      .then(d => {
        if (d.models && d.models.length > 0) {
          const names = d.models.map(m => typeof m === 'object' ? m.name : m);
          setModels(names);
          setRvcModel(names[0]);
        }
      })
      .catch(() => {});
  }, []);

  const listenProgress = (jid) => {
    if (esRef.current) esRef.current.close();
    const es = new EventSource(`${API}/pipeline/progress/${jid}`);
    esRef.current = es;

    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setProgress(data.progress);
      setStages({
        stage1_separation: data.stage1,
        stage2_rvc:        data.stage2,
        stage3_clarify:    data.stage3,
        stage4_mix:        data.stage4,
      });
      if (data.error) { setError(data.error); setRunning(false); es.close(); }
      if (data.done) {
        setDone(true); setRunning(false); es.close();
        fetch(`${API}/pipeline/status/${jid}`)
          .then(r => r.json())
          .then(d => setOutputs(d.outputs || {}));
      }
    };
    es.onerror = () => { setError('Conexiune pierduta cu serverul.'); setRunning(false); es.close(); };
  };

  const handleRun = async () => {
    if (!file) return;
    setRunning(true); setDone(false); setError(null);
    setProgress(0); setStages({}); setOutputs({}); setJobId(null);

    const form = new FormData();
    form.append('file', file);
    form.append('rvc_model', rvcModel);
    form.append('rvc_pitch', rvcPitch);
    form.append('rvc_protect', rvcProtect);
    form.append('f0_method', f0Method);
    form.append('index_rate', indexRate.toString());
    form.append('filter_radius', filterRadius.toString());
    form.append('rms_mix_rate', rmsMixRate.toString());
    form.append('vocal_chain_preset', vocalPreset);
    form.append('enable_autotune', enableAutotune);
    form.append('autotune_strength', autotuneStrength);
    form.append('enable_highpass', enableHighpass);
    form.append('enable_volume_envelope', enableVolumeEnvelope);
    form.append('enable_stage4', enableStage4);

    try {
      const res = await fetch(`${API}/pipeline/run`, { 
        method: 'POST', 
        body: form,
        headers: {
          "Authorization": `Bearer ${import.meta.env.VITE_API_TOKEN || "dev-token"}`,
        },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setJobId(data.job_id);
      listenProgress(data.job_id);
    } catch (e) {
      setError(e.message);
      setRunning(false);
    }
  };

  const handleReset = () => {
    if (esRef.current) esRef.current.close();
    setFile(null); setJobId(null); setProgress(0);
    setStages({}); setError(null); setOutputs({});
    setRunning(false); setDone(false);
  };

  const sliders = [
    {
      label: 'RVC Pitch', val: rvcPitch, set: setRvcPitch, min: -12, max: 12, step: 1,
      display: `${rvcPitch > 0 ? '+' : ''}${rvcPitch} semitones`,
      desc: 'Shifts the pitch of the converted voice up or down.',
      example: '0 = no change  ·  +12 = one octave up  ·  -12 = one octave down',
      color: '#6366f1',
    },
    {
      label: 'RVC Protect', val: rvcProtect, set: setRvcProtect, min: 0, max: 0.5, step: 0.01,
      display: rvcProtect.toFixed(2),
      desc: 'Protects voiceless consonants (s, t, f) from voice conversion.',
      example: '0.55 = recomandat pentru voce  ·  0.33 = default',
      color: '#8b5cf6',
    },
    {
      label: 'Index Rate', val: indexRate, set: setIndexRate, min: 0, max: 1, step: 0.05,
      display: indexRate.toFixed(2),
      desc: 'How much of target voice timbre to use (lower = more original character)',
      example: '0.40 = preserves singing style  ·  0.75 = speech default',
      color: '#10b981',
    },
    {
      label: 'Filter Radius', val: filterRadius, set: setFilterRadius, min: 0, max: 7, step: 1,
      display: filterRadius.toString(),
      desc: 'Median filtering for pitch smoothing (reduces vibrato artifacts)',
      example: '3 = default  ·  5 = smoother  ·  0 = no filtering',
      color: '#f59e0b',
    },
    {
      label: 'RMS Mix Rate', val: rmsMixRate, set: setRmsMixRate, min: 0, max: 1, step: 0.05,
      display: rmsMixRate.toFixed(2),
      desc: 'Blend ratio between original and converted volume envelopes',
      example: '0.25 = preserve dynamics  ·  0.50 = balanced  ·  1.0 = full converted',
      color: '#ec4899',
    },
  ];

  // Cyberpunk theme colors
  const cyberpunk = {
    bg: {
      primary: "linear-gradient(135deg, #0a0a1a 0%, #0d0d22 50%, #0a0a1a 100%)",
      card: "linear-gradient(180deg, rgba(13,13,34,0.95) 0%, rgba(8,8,24,0.98) 100%)",
    },
    neon: {
      indigo: { primary: "#6366f1", glow: "rgba(99,102,241,0.5)" },
      purple: { primary: "#8b5cf6", glow: "rgba(139,92,246,0.5)" },
      pink: { primary: "#ec4899", glow: "rgba(236,72,153,0.5)" },
      cyan: { primary: "#00e5ff", glow: "rgba(0,229,255,0.5)" },
      green: { primary: "#10b981", glow: "rgba(16,185,129,0.5)" },
      yellow: { primary: "#f59e0b", glow: "rgba(245,158,11,0.5)" },
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
    },
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto', color: cyberpunk.text.primary }}>
      
      {/* Header Cyberpunk */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ 
          fontSize: 48, 
          marginBottom: 8, 
          filter: `drop-shadow(0 0 20px ${cyberpunk.neon.purple.glow})`,
          animation: "pulse 2s ease-in-out infinite",
        }}>🎙️</div>
        <div style={{ 
          fontSize: 28, 
          fontWeight: 900, 
          color: cyberpunk.text.primary, 
          marginBottom: 6,
          letterSpacing: 3,
          textTransform: "uppercase",
          textShadow: `0 0 20px ${cyberpunk.neon.purple.glow}`,
        }}>
          Vocal Pipeline
        </div>
        <div style={{ 
          color: cyberpunk.text.secondary, 
          fontSize: 13,
          letterSpacing: 1,
        }}>
          BS-ROFORMER → RVC CONVERSION → MIX & MASTER (-14 LUFS)
        </div>
      </div>

      {/* Stage Cards */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: 28, flexWrap: 'wrap' }}>
        {STAGES.map(s => {
          const st = stages[s.key] || 'pending';
          return (
            <div key={s.key} style={{
              flex: 1, 
              minWidth: '200px',
              background: "linear-gradient(135deg, rgba(13,13,34,0.9), rgba(8,8,24,0.95))", 
              borderRadius: '14px', 
              padding: '16px',
              border: `2px solid ${st === 'running' ? s.color : 'rgba(31,41,55,0.5)'}`,
              boxShadow: st === 'running' ? `0 0 20px ${s.color}44` : 'none',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {st === 'running' && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '3px',
                  background: `linear-gradient(90deg, transparent, ${s.color}, transparent)`,
                  animation: 'shimmer 1.5s infinite',
                }} />
              )}
              <div style={{ fontSize: '28px', marginBottom: '8px', filter: st === 'running' ? `drop-shadow(0 0 10px ${s.color})` : 'none' }}>
                {s.icon}
              </div>
              <div style={{ fontSize: '10px', fontWeight: 800, color: s.color, letterSpacing: 1, marginBottom: 4 }}>
                {s.label.toUpperCase()}
              </div>
              <div style={{ fontSize: '10px', color: cyberpunk.text.secondary, marginBottom: 8, lineHeight: 1.4 }}>
                {s.desc}
              </div>
              <div style={{ 
                fontSize: '11px', 
                color: STATUS_COLOR[st] || '#444', 
                fontWeight: 700,
                padding: '4px 8px',
                background: `${STATUS_COLOR[st] || '#444'}22`,
                borderRadius: 6,
                display: 'inline-block',
                border: `1px solid ${STATUS_COLOR[st] || '#444'}44`,
              }}>
                {STATUS_LABEL[st] || '⏳ Astept'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: cyberpunk.text.secondary, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>
            Pipeline Progress
          </span>
          <span style={{ 
            fontSize: 14, 
            color: error ? cyberpunk.neon.pink.primary : cyberpunk.neon.cyan.primary, 
            fontWeight: 800,
            fontFamily: 'monospace',
            textShadow: error ? `0 0 10px ${cyberpunk.neon.pink.glow}` : `0 0 10px ${cyberpunk.neon.cyan.glow}`,
          }}>
            {progress}%
          </span>
        </div>
        <div style={{ 
          height: 12, 
          background: "rgba(10,10,26,0.8)", 
          borderRadius: 6, 
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{
            width: `${progress}%`, 
            height: '100%', 
            borderRadius: 6,
            background: error 
              ? `linear-gradient(90deg, #ef4444, #dc2626)` 
              : `linear-gradient(90deg, ${cyberpunk.neon.indigo.primary}, ${cyberpunk.neon.pink.primary})`,
            transition: 'width 0.5s ease',
            boxShadow: error ? `0 0 20px #ef444466` : `0 0 20px ${cyberpunk.neon.indigo.glow}`,
          }} />
        </div>
        {error && (
          <div style={{ 
            marginTop: 10, 
            color: cyberpunk.neon.pink.primary, 
            fontSize: 12,
            padding: '10px 14px',
            background: `${cyberpunk.neon.pink.primary}11`,
            borderRadius: 8,
            border: `1px solid ${cyberpunk.neon.pink.primary}44`,
          }}>
            ❌ {error}
          </div>
        )}
      </div>

      {/* Configuration Panel */}
      {!running && !done && (
        <div style={S.card}>
          <span style={S.label}>⚙️ Configurare Pipeline</span>

          {/* Upload & Model Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            
            {/* File Upload */}
            <div>
              <label style={{ fontSize: 11, color: cyberpunk.text.secondary, display: 'block', marginBottom: 8, letterSpacing: 1 }}>
                🎵 FISIER AUDIO INPUT
              </label>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                background: "rgba(10,10,26,0.6)",
                border: `2px dashed ${file ? cyberpunk.neon.indigo.primary : 'rgba(55,65,81,0.5)'}`,
                borderRadius: 10,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                if (!file) {
                  e.currentTarget.style.borderColor = cyberpunk.neon.indigo.primary;
                  e.currentTarget.style.boxShadow = `0 0 15px ${cyberpunk.neon.indigo.glow}`;
                }
              }}
              onMouseLeave={(e) => {
                if (!file) {
                  e.currentTarget.style.borderColor = 'rgba(55,65,81,0.5)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
              >
                <span style={{ fontSize: 32 }}>{file ? '🎵' : '📂'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    color: file ? cyberpunk.neon.indigo.primary : cyberpunk.text.secondary, 
                    fontSize: 13, 
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {file ? file.name : 'Click to upload audio'}
                  </div>
                  <div style={{ color: cyberpunk.text.muted, fontSize: 10, marginTop: 2 }}>
                    WAV · MP3 · FLAC · M4A
                  </div>
                </div>
                <input type="file" accept="audio/*" onChange={e => setFile(e.target.files[0])} style={{ display: 'none' }} />
              </label>
              {file && (
                <div style={{ 
                  marginTop: 8, 
                  fontSize: 10, 
                  color: cyberpunk.neon.indigo.primary,
                  padding: '6px 10px',
                  background: `${cyberpunk.neon.indigo.primary}11`,
                  borderRadius: 6,
                  display: 'inline-block',
                  border: `1px solid ${cyberpunk.neon.indigo.primary}33`,
                }}>
                  ✓ {file.name}
                </div>
              )}
            </div>

            {/* RVC Model */}
            <div>
              <label style={{ fontSize: 11, color: cyberpunk.text.secondary, display: 'block', marginBottom: 8, letterSpacing: 1 }}>
                🎤 MODEL RVC
              </label>
              {models.length > 0 ? (
                <select value={rvcModel} onChange={e => setRvcModel(e.target.value)}
                  style={{ 
                    width: '100%', 
                    background: "#0a0a1a", 
                    color: cyberpunk.text.primary, 
                    border: '1px solid rgba(55,65,81,0.5)',
                    borderRadius: 10, 
                    padding: '12px 14px', 
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}>
                  {models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              ) : (
                <input 
                  value={rvcModel} 
                  onChange={e => setRvcModel(e.target.value)} 
                  placeholder="Numele modelului RVC"
                  style={{ 
                    width: '100%', 
                    background: "#0a0a1a", 
                    color: cyberpunk.text.primary, 
                    border: '1px solid rgba(55,65,81,0.5)',
                    borderRadius: 10, 
                    padding: '12px 14px', 
                    fontSize: 13,
                  }} 
                />
              )}
            </div>
          </div>

          {/* F0 Method */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: cyberpunk.text.secondary, display: 'block', marginBottom: 8, letterSpacing: 1 }}>
              🎵 F0 METHOD (PITCH EXTRACTION)
            </label>
            <select value={f0Method} onChange={e => setF0Method(e.target.value)}
              style={{ 
                width: '100%', 
                background: "#0a0a1a", 
                color: 'white', 
                border: '1px solid rgba(55,65,81,0.5)',
                borderRadius: 10, 
                padding: '12px 14px', 
                fontSize: 13,
                cursor: 'pointer',
              }}>
              <option value="harvest">🎤 harvest — Best for singing (slow, accurate)</option>
              <option value="rmvpe">🎙️ rmvpe — Best for speech (fast, good quality)</option>
              <option value="crepe">🔬 crepe — High quality (very slow, GPU intensive)</option>
              <option value="pm">⚡ pm — Fastest (poor quality, testing only)</option>
              <option value="dio">📊 dio — Fast (decent quality)</option>
            </select>
            <p style={{ fontSize: 10, color: cyberpunk.text.muted, marginTop: 6, fontStyle: 'italic' }}>
              Recomandat: <strong style={{ color: cyberpunk.neon.green.primary }}>harvest</strong> pentru muzică, <strong style={{ color: cyberpunk.neon.yellow.primary }}>rmvpe</strong> pentru vorbire
            </p>
          </div>

          {/* Vocal Chain Preset */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: cyberpunk.text.secondary, display: 'block', marginBottom: 8, letterSpacing: 1 }}>
              🎤 VOCAL CHAIN PRESET
            </label>
            <select value={vocalPreset} onChange={e => setVocalPreset(e.target.value)}
              style={{ 
                width: '100%', 
                background: "#0a0a1a", 
                color: 'white', 
                border: '1px solid rgba(55,65,81,0.5)',
                borderRadius: 10, 
                padding: '12px 14px', 
                fontSize: 13,
                cursor: 'pointer',
              }}>
              <option value="studio_radio">🎙️ Studio Radio — Clar, compresat (pop/manele)</option>
              <option value="natural">🎤 Natural — Minimal procesare (acoustic/folk)</option>
              <option value="arena">🏟️ Arena — Mult reverb (concert/live)</option>
              <option value="radio">📻 Radio — Foarte compresat (commercial)</option>
              <option value="balanced">🎵 Balanced — Echilibrat (all-round)</option>
            </select>
            <p style={{ fontSize: 10, color: cyberpunk.text.muted, marginTop: 6, fontStyle: 'italic' }}>
              Recomandat: <strong style={{ color: cyberpunk.neon.cyan.primary }}>Studio Radio</strong> pentru muzică românească
            </p>
          </div>

          {/* Sliders 3x2 Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            {sliders.map(({ label, val, set, min, max, step, display, desc, example, color }) => (
              <div key={label} style={{ 
                background: "rgba(13,17,23,0.8)", 
                borderRadius: 10, 
                padding: 14, 
                border: `1px solid rgba(31,41,55,0.5)`,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = color;
                e.currentTarget.style.boxShadow = `0 0 15px ${color}33`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(31,41,55,0.5)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'white', fontWeight: 700, letterSpacing: 0.5 }}>{label}</span>
                  <span style={{ 
                    fontSize: 11, 
                    color, 
                    fontWeight: 700, 
                    fontFamily: 'monospace',
                    textShadow: `0 0 8px ${color}66`,
                  }}>
                    {display}
                  </span>
                </div>
                <p style={{ fontSize: 10, color: cyberpunk.text.secondary, margin: '0 0 4px 0', lineHeight: 1.4 }}>
                  {desc}
                </p>
                <p style={{ fontSize: 9, color: '#555577', margin: '0 0 10px 0', fontStyle: 'italic' }}>
                  {example}
                </p>
                <input 
                  type="range" 
                  min={min} 
                  max={max} 
                  step={step} 
                  value={val}
                  onChange={e => set(Number(e.target.value))}
                  style={{ 
                    width: '100%', 
                    accentColor: color,
                    height: 6,
                    borderRadius: 3,
                  }} 
                />
              </div>
            ))}
          </div>

          {/* Feature Toggles */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Applio */}
            <div style={{ 
              background: "rgba(13,17,23,0.8)", 
              borderRadius: 10, 
              padding: 14, 
              border: '1px solid rgba(31,41,55,0.5)',
            }}>
              <h4 style={{ fontSize: 11, color: cyberpunk.text.secondary, marginBottom: 12, fontWeight: 700, letterSpacing: 1 }}>
                🎛️ APPLIO (STAGE 2)
              </h4>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                fontSize: 11, 
                color: cyberpunk.text.primary, 
                marginBottom: 8, 
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: 6,
                background: enableAutotune ? `${cyberpunk.neon.indigo.primary}11` : 'transparent',
                border: enableAutotune ? `1px solid ${cyberpunk.neon.indigo.primary}44` : 'none',
              }}>
                <input 
                  type="checkbox" 
                  checked={enableAutotune} 
                  onChange={e => setEnableAutotune(e.target.checked)}
                  style={{ marginRight: 8, accentColor: cyberpunk.neon.indigo.primary, width: 16, height: 16 }} 
                />
                🎵 Autotune
              </label>
              {enableAutotune && (
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1" 
                  value={autotuneStrength}
                  onChange={e => setAutotuneStrength(Number(e.target.value))}
                  style={{ 
                    width: '100%', 
                    accentColor: cyberpunk.neon.indigo.primary, 
                    marginBottom: 8,
                    height: 6,
                  }} 
                />
              )}
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                fontSize: 11, 
                color: cyberpunk.text.primary, 
                marginBottom: 8, 
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: 6,
                background: enableHighpass ? `${cyberpunk.neon.indigo.primary}11` : 'transparent',
                border: enableHighpass ? `1px solid ${cyberpunk.neon.indigo.primary}44` : 'none',
              }}>
                <input 
                  type="checkbox" 
                  checked={enableHighpass} 
                  onChange={e => setEnableHighpass(e.target.checked)}
                  style={{ marginRight: 8, accentColor: cyberpunk.neon.indigo.primary, width: 16, height: 16 }} 
                />
                🔊 HPF (48Hz)
              </label>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                fontSize: 11, 
                color: cyberpunk.text.primary, 
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: 6,
                background: enableVolumeEnvelope ? `${cyberpunk.neon.indigo.primary}11` : 'transparent',
                border: enableVolumeEnvelope ? `1px solid ${cyberpunk.neon.indigo.primary}44` : 'none',
              }}>
                <input 
                  type="checkbox" 
                  checked={enableVolumeEnvelope} 
                  onChange={e => setEnableVolumeEnvelope(e.target.checked)}
                  style={{ marginRight: 8, accentColor: cyberpunk.neon.indigo.primary, width: 16, height: 16 }} 
                />
                📊 Vol. Envelope
              </label>
            </div>

            {/* Stage 4 (Mix) */}
            <div style={{ 
              background: "rgba(13,17,23,0.8)", 
              borderRadius: 10, 
              padding: 14, 
              border: `1px solid ${enableStage4 ? `${cyberpunk.neon.pink.primary}44` : 'rgba(31,41,55,0.5)'}`,
              boxShadow: enableStage4 ? `0 0 15px ${cyberpunk.neon.pink.glow}` : 'none',
            }}>
              <h4 style={{ fontSize: 11, color: cyberpunk.text.secondary, marginBottom: 10, fontWeight: 700, letterSpacing: 1 }}>
                🎚️ MIX & MASTER
              </h4>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                fontSize: 11, 
                color: cyberpunk.text.primary, 
                marginBottom: 10, 
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: 6,
                background: enableStage4 ? `${cyberpunk.neon.pink.primary}11` : 'transparent',
                border: enableStage4 ? `1px solid ${cyberpunk.neon.pink.primary}44` : 'none',
              }}>
                <input 
                  type="checkbox" 
                  checked={enableStage4} 
                  onChange={e => setEnableStage4(e.target.checked)}
                  style={{ marginRight: 8, accentColor: cyberpunk.neon.pink.primary, width: 16, height: 16 }} 
                />
                Enable
              </label>
              <p style={{ fontSize: 10, color: cyberpunk.text.muted, margin: 0, lineHeight: 1.6 }}>
                Mix vocal + instrumental.
                <br />
                Loudnorm <span style={{ color: cyberpunk.neon.green.primary, fontWeight: 700 }}>-14 LUFS</span> Spotify.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {!running && !done && (
          <button 
            onClick={handleRun} 
            disabled={!file || !rvcModel}
            style={{ 
              flex: 1, 
              padding: '16px 0', 
              cursor: file && rvcModel ? 'pointer' : 'not-allowed',
              background: file && rvcModel 
                ? `linear-gradient(135deg, ${cyberpunk.neon.indigo.primary}, ${cyberpunk.neon.pink.primary})` 
                : 'rgba(55,65,81,0.5)',
              color: 'white', 
              border: 'none', 
              borderRadius: 12, 
              fontWeight: 900, 
              fontSize: 16,
              letterSpacing: 2,
              textTransform: 'uppercase',
              boxShadow: file && rvcModel ? `0 0 30px ${cyberpunk.neon.indigo.glow}` : 'none',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              if (file && rvcModel) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 0 40px ${cyberpunk.neon.indigo.glow}`;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = file && rvcModel 
                ? `0 0 30px ${cyberpunk.neon.indigo.glow}` 
                : 'none';
            }}
          >
            🚀 PORNESTE PIPELINE
          </button>
        )}
        {running && (
          <div style={{ 
            flex: 1, 
            padding: '16px 0', 
            background: "rgba(31,41,55,0.8)", 
            borderRadius: 12,
            textAlign: 'center', 
            color: cyberpunk.text.secondary, 
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 1,
            border: '1px solid rgba(245,158,11,0.3)',
            boxShadow: `0 0 20px ${cyberpunk.neon.yellow.glow}`,
          }}>
            ⚙️ PROCESARE IN CURS... ({progress}%)
          </div>
        )}
        {(done || error) && (
          <button 
            onClick={handleReset}
            style={{ 
              padding: '16px 32px', 
              background: "rgba(55,65,81,0.8)", 
              color: 'white', 
              border: `1px solid rgba(255,255,255,0.2)`,
              borderRadius: 12, 
              cursor: 'pointer', 
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 1,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(75,85,99,0.8)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(55,65,81,0.8)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
            }}
          >
            🔄 JOB NOU
          </button>
        )}
      </div>

      {/* Results Section */}
      {done && jobId && (
        <div style={S.card}>
          <span style={S.label}>📁 DESCARCA FISIERELE</span>
          
          {/* Download Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 20 }}>
            {[
              { key: 'vocals',       label: '🎵 Vocals',       color: cyberpunk.neon.indigo.primary },
              { key: 'instrumental', label: '🎸 Instrumental', color: cyberpunk.neon.indigo.primary },
              { key: 'rvc_raw',      label: '🎤 RVC Converted',color: cyberpunk.neon.purple.primary },
              { key: 'final_mix',    label: '🎚️ Mix WAV',     color: cyberpunk.neon.pink.primary },
              { key: 'final_mix_mp3',label: '🎧 Mix MP3 320k',color: '#f43f5e' },
            ].map(({ key, label, color }) => (
              <a 
                key={key} 
                href={`${API}/pipeline/download/${jobId}/${key}`}
                style={{
                  display: 'block', 
                  padding: '14px 12px', 
                  background: "rgba(31,41,55,0.6)",
                  borderRadius: 10, 
                  color: color, 
                  textDecoration: 'none',
                  fontSize: 11, 
                  fontWeight: 700, 
                  border: `1px solid ${color}44`,
                  opacity: outputs[key] ? 1 : 0.4,
                  pointerEvents: outputs[key] ? 'auto' : 'none',
                  transition: 'all 0.2s ease',
                  textAlign: 'center',
                  letterSpacing: 0.5,
                }}
                onMouseEnter={(e) => {
                  if (outputs[key]) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 0 15px ${color}66`;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {label}
                {!outputs[key] && (
                  <div style={{ fontSize: 9, color: cyberpunk.text.muted, marginTop: 4 }}>
                    not available
                  </div>
                )}
              </a>
            ))}
          </div>

          {/* Audio Players */}
          <span style={S.label}>🎧 PREVIEW AUDIO</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {outputs.final_mix && (
              <div style={{ 
                background: "rgba(13,17,23,0.8)", 
                borderRadius: 12, 
                padding: 16, 
                border: `1px solid ${cyberpunk.neon.pink.primary}44`,
                boxShadow: `0 0 15px ${cyberpunk.neon.pink.glow}`,
              }}>
                <div style={{ 
                  fontSize: 12, 
                  color: cyberpunk.neon.pink.primary, 
                  fontWeight: 800, 
                  marginBottom: 10,
                  letterSpacing: 1,
                }}>
                  🎚️ MIX FINAL — SPOTIFY READY
                </div>
                <audio controls style={{ width: '100%', marginBottom: 10 }}>
                  <source src={`${API}/pipeline/download/${jobId}/final_mix`} type="audio/wav" />
                </audio>
                <div style={{ fontSize: 10, color: cyberpunk.text.muted, fontFamily: 'monospace' }}>
                  -14 LUFS · True Peak -1dB · 48kHz/16bit
                </div>
              </div>
            )}
            {outputs.rvc_raw && (
              <div style={{ 
                background: "rgba(13,17,23,0.8)", 
                borderRadius: 12, 
                padding: 16, 
                border: `1px solid ${cyberpunk.neon.purple.primary}44`,
                boxShadow: `0 0 15px ${cyberpunk.neon.purple.glow}`,
              }}>
                <div style={{ 
                  fontSize: 12, 
                  color: cyberpunk.neon.purple.primary, 
                  fontWeight: 800, 
                  marginBottom: 10,
                  letterSpacing: 1,
                }}>
                  🎤 RVC CONVERTED
                </div>
                <audio controls style={{ width: '100%', marginBottom: 10 }}>
                  <source src={`${API}/pipeline/download/${jobId}/rvc_raw`} type="audio/wav" />
                </audio>
                <div style={{ fontSize: 10, color: cyberpunk.text.muted }}>
                  Voce convertită prin RVC
                </div>
              </div>
            )}
            {outputs.vocals && (
              <div style={{ 
                background: "rgba(13,17,23,0.8)", 
                borderRadius: 12, 
                padding: 16, 
                border: `1px solid ${cyberpunk.neon.indigo.primary}44`,
                boxShadow: `0 0 15px ${cyberpunk.neon.indigo.glow}`,
              }}>
                <div style={{ 
                  fontSize: 12, 
                  color: cyberpunk.neon.indigo.primary, 
                  fontWeight: 800, 
                  marginBottom: 10,
                  letterSpacing: 1,
                }}>
                  🎵 VOCALS SEPARAT (BS-ROFORMER)
                </div>
                <audio controls style={{ width: '100%', marginBottom: 10 }}>
                  <source src={`${API}/pipeline/download/${jobId}/vocals`} type="audio/wav" />
                </audio>
                <div style={{ fontSize: 10, color: cyberpunk.text.muted }}>
                  Separare vocal/instrumental SDR 12.97
                </div>
              </div>
            )}
            {outputs.instrumental && (
              <div style={{ 
                background: "rgba(13,17,23,0.8)", 
                borderRadius: 12, 
                padding: 16, 
                border: `1px solid ${cyberpunk.neon.indigo.primary}44`,
                boxShadow: `0 0 15px ${cyberpunk.neon.indigo.glow}`,
              }}>
                <div style={{ 
                  fontSize: 12, 
                  color: cyberpunk.neon.indigo.primary, 
                  fontWeight: 800, 
                  marginBottom: 10,
                  letterSpacing: 1,
                }}>
                  🎸 INSTRUMENTAL
                </div>
                <audio controls style={{ width: '100%', marginBottom: 10 }}>
                  <source src={`${API}/pipeline/download/${jobId}/instrumental`} type="audio/wav" />
                </audio>
                <div style={{ fontSize: 10, color: cyberpunk.text.muted }}>
                  Pista instrumentală pentru mix final
                </div>
              </div>
            )}
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
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
