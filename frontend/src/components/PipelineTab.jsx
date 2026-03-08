import React, { useState, useRef, useEffect } from 'react';

const API = 'http://localhost:8000';

const STAGES = [
  { key: 'stage1_separation', label: 'Stage 1', desc: 'BS RoFormer — Separare vocala', icon: '🎵', color: '#6366f1' },
  { key: 'stage2_rvc',        label: 'Stage 2', desc: 'RVC — Voice Conversion',       icon: '🎤', color: '#8b5cf6' },
  { key: 'stage3_refinement', label: 'Stage 3', desc: 'ACE-Step — Refinement',         icon: '✨', color: '#a855f7' },
];

const STATUS_COLOR = {
  pending: '#444',
  running: '#f59e0b',
  done:    '#10b981',
  error:   '#ef4444',
};

const STATUS_LABEL = {
  pending: '⏳ Astept',
  running: '⚙️ Rulează',
  done:    '✅ Gata',
  error:   '❌ Eroare',
};

export default function PipelineTab() {
  const [file, setFile]           = useState(null);
  const [models, setModels]       = useState([]);
  const [rvcModel, setRvcModel]   = useState('');
  const [rvcPitch, setRvcPitch]   = useState(0);
  const [rvcProtect, setRvcProtect] = useState(0.33);
  const [aceStrength, setAceStrength] = useState(0.4);
  const [aceSteps, setAceSteps]   = useState(24);
  const [jobId, setJobId]         = useState(null);
  const [progress, setProgress]   = useState(0);
  const [stages, setStages]       = useState({});
  const [error, setError]         = useState(null);
  const [outputs, setOutputs]     = useState({});
  const [running, setRunning]     = useState(false);
  const [done, setDone]           = useState(false);
  const esRef = useRef(null);

  // Incarca modele RVC la mount
  useEffect(() => {
    fetch(`${API}/pipeline/models`)
      .then(r => r.json())
      .then(d => {
        if (d.models && d.models.length > 0) {
          // Suporta atat string-uri cat si obiecte {name, size_mb}
          const names = d.models.map(m => typeof m === 'object' ? m.name : m);
          setModels(names);
          setRvcModel(names[0]);
        }
      })
      .catch(() => {});
  }, []);

  // SSE progress listener
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
        stage3_refinement: data.stage3,
      });
      if (data.error) {
        setError(data.error);
        setRunning(false);
        es.close();
      }
      if (data.done) {
        setDone(true);
        setRunning(false);
        es.close();
        // Fetch outputs
        fetch(`${API}/pipeline/status/${jid}`)
          .then(r => r.json())
          .then(d => setOutputs(d.outputs || {}));
      }
    };

    es.onerror = () => {
      setError('Conexiune pierduta cu serverul.');
      setRunning(false);
      es.close();
    };
  };

  const handleRun = async () => {
    if (!file) return;
    setRunning(true);
    setDone(false);
    setError(null);
    setProgress(0);
    setStages({});
    setOutputs({});
    setJobId(null);

    const form = new FormData();
    form.append('file', file);
    form.append('rvc_model', rvcModel);
    form.append('rvc_pitch', rvcPitch);
    form.append('rvc_protect', rvcProtect);
    form.append('ace_strength', aceStrength);
    form.append('ace_steps', aceSteps);

    try {
      const res = await fetch(`${API}/pipeline/run`, { method: 'POST', body: form });
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

  return (
    <div style={{ padding: '24px', maxWidth: '860px', margin: '0 auto', color: '#e5e7eb', fontFamily: 'sans-serif' }}>
      <h2 style={{ fontSize: '22px', marginBottom: '4px', color: 'white' }}>🎙️ Vocal Pipeline</h2>
      <p style={{ color: '#888', fontSize: '13px', marginBottom: '24px' }}>
        BS RoFormer → RVC Voice Conversion → ACE-Step Refinement
      </p>

      {/* ── Stagii vizuale ── */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '28px' }}>
        {STAGES.map((s, i) => {
          const st = stages[s.key] || 'pending';
          return (
            <div key={s.key} style={{ flex: 1, background: '#111827', borderRadius: '12px', padding: '16px',
              border: `1px solid ${st === 'running' ? s.color : '#1f2937'}`,
              boxShadow: st === 'running' ? `0 0 12px ${s.color}44` : 'none',
              transition: 'all 0.3s' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{s.icon}</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: s.color }}>{s.label}</div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '8px' }}>{s.desc}</div>
              <div style={{ fontSize: '12px', color: STATUS_COLOR[st], fontWeight: 'bold' }}>
                {STATUS_LABEL[st] || '⏳ Astept'}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Progress bar ── */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>Progress</span>
          <span style={{ fontSize: '13px', color: 'white', fontWeight: 'bold' }}>{progress}%</span>
        </div>
        <div style={{ width: '100%', height: '8px', background: '#1f2937', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            width: `${progress}%`, height: '100%',
            background: error ? '#ef4444' : done ? '#10b981' : 'linear-gradient(90deg, #6366f1, #a855f7)',
            transition: 'width 0.5s ease',
          }} />
        </div>
        {error && <div style={{ marginTop: '8px', color: '#ef4444', fontSize: '12px' }}>❌ {error}</div>}
        {done  && <div style={{ marginTop: '8px', color: '#10b981', fontSize: '12px' }}>✅ Pipeline finalizat!</div>}
      </div>

      {/* ── Parametri ── */}
      {!running && !done && (
        <div style={{ background: '#111827', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Configurare
          </h3>

          {/* Upload */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>
              🎵 Fisier Audio Input
            </label>
            <input type="file" accept="audio/*"
              onChange={e => setFile(e.target.files[0])}
              style={{ fontSize: '13px', color: '#e5e7eb', background: '#1f2937',
                border: '1px solid #374151', borderRadius: '8px', padding: '8px 12px', width: '100%' }} />
            {file && <div style={{ fontSize: '11px', color: '#6366f1', marginTop: '4px' }}>✓ {file.name}</div>}
          </div>

          {/* RVC Model */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>
              🎤 Model RVC
            </label>
            {models.length > 0 ? (
              <select value={rvcModel} onChange={e => setRvcModel(e.target.value)}
                style={{ width: '100%', background: '#1f2937', color: 'white', border: '1px solid #374151',
                  borderRadius: '8px', padding: '8px 12px', fontSize: '13px' }}>
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            ) : (
              <input value={rvcModel} onChange={e => setRvcModel(e.target.value)} placeholder="Numele modelului RVC"
                style={{ width: '100%', background: '#1f2937', color: 'white', border: '1px solid #374151',
                  borderRadius: '8px', padding: '8px 12px', fontSize: '13px' }} />
            )}
          </div>

          {/* Slider-e */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {[
              {
                label: 'RVC Pitch', val: rvcPitch, set: setRvcPitch, min: -12, max: 12, step: 1,
                display: `${rvcPitch > 0 ? '+' : ''}${rvcPitch} semitones`,
                desc: 'Shifts the pitch of the converted voice up or down.',
                example: '0 = no change  ·  +12 = one octave up  ·  -12 = one octave down',
                color: '#6366f1',
              },
              {
                label: 'RVC Protect', val: rvcProtect, set: setRvcProtect, min: 0, max: 0.5, step: 0.01,
                display: rvcProtect,
                desc: 'Protects voiceless consonants (s, t, f) from voice conversion.',
                example: '0.33 = recommended  ·  0 = convert all  ·  0.5 = max protection',
                color: '#8b5cf6',
              },
              {
                label: 'ACE Strength', val: aceStrength, set: setAceStrength, min: 0.1, max: 0.9, step: 0.05,
                display: aceStrength,
                desc: 'How strongly ACE-Step refines the audio. Lower = closer to RVC output.',
                example: '0.3 = subtle cleanup  ·  0.5 = balanced  ·  0.8 = heavy regen',
                color: '#a855f7',
              },
              {
                label: 'ACE Steps', val: aceSteps, set: setAceSteps, min: 8, max: 50, step: 4,
                display: `${aceSteps} steps`,
                desc: 'Number of diffusion steps. More steps = better quality but slower.',
                example: '8 = fast/turbo  ·  24 = recommended  ·  50 = max quality',
                color: '#a855f7',
              },
            ].map(({ label, val, set, min, max, step, display, desc, example, color }) => (
              <div key={label} style={{ background: '#0d1117', borderRadius: '8px', padding: '12px', border: '1px solid #1f2937' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontSize: '12px', color: 'white', fontWeight: 'bold' }}>{label}</span>
                  <span style={{ fontSize: '12px', color, fontWeight: 'bold', fontFamily: 'monospace' }}>{display}</span>
                </div>
                <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 2px 0', lineHeight: 1.4 }}>{desc}</p>
                <p style={{ fontSize: '10px', color: '#555577', margin: '0 0 8px 0', fontStyle: 'italic' }}>e.g. {example}</p>
                <input type="range" min={min} max={max} step={step} value={val}
                  onChange={e => set(Number(e.target.value))}
                  style={{ width: '100%', accentColor: color }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Butoane actiune ── */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        {!running && !done && (
          <button onClick={handleRun} disabled={!file || !rvcModel}
            style={{ flex: 1, padding: '14px', background: file && rvcModel ? 'linear-gradient(135deg, #6366f1, #a855f7)' : '#374151',
              color: 'white', border: 'none', borderRadius: '10px', cursor: file && rvcModel ? 'pointer' : 'not-allowed',
              fontWeight: 'bold', fontSize: '15px', transition: 'opacity 0.2s' }}>
            🚀 Porneste Pipeline
          </button>
        )}
        {running && (
          <div style={{ flex: 1, padding: '14px', background: '#1f2937', borderRadius: '10px',
            textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
            ⚙️ Procesare in curs... ({progress}%)
          </div>
        )}
        {(done || error) && (
          <button onClick={handleReset}
            style={{ padding: '14px 24px', background: '#374151', color: 'white', border: 'none',
              borderRadius: '10px', cursor: 'pointer', fontSize: '14px' }}>
            🔄 Job Nou
          </button>
        )}
      </div>

      {/* ── Download outputs ── */}
      {done && jobId && (
        <div style={{ background: '#111827', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            📁 Descarca Fisierele
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { key: 'vocals',       label: '🎵 Vocals (separat)',        color: '#6366f1' },
              { key: 'instrumental', label: '🎸 Instrumental',            color: '#6366f1' },
              { key: 'rvc_raw',      label: '🎤 RVC Raw (nerafinat)',     color: '#8b5cf6' },
              { key: 'final',        label: '✨ Final Rafinat (ACE-Step)', color: '#10b981' },
            ].map(({ key, label, color }) => (
              <a key={key} href={`${API}/pipeline/download/${jobId}/${key}`}
                style={{ display: 'block', padding: '12px 16px', background: '#1f2937',
                  borderRadius: '8px', color: color, textDecoration: 'none', fontSize: '13px',
                  fontWeight: 'bold', border: `1px solid ${color}44`,
                  opacity: outputs[key] ? 1 : 0.4, pointerEvents: outputs[key] ? 'auto' : 'none',
                  transition: 'opacity 0.2s' }}>
                {label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
