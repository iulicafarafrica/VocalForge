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

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto', color: '#e5e7eb', fontFamily: 'sans-serif' }}>
      <h2 style={{ fontSize: '22px', marginBottom: '4px', color: 'white' }}>🎙️ Vocal Pipeline</h2>
      <p style={{ color: '#888', fontSize: '13px', marginBottom: '24px' }}>
        BS RoFormer → RVC Voice Conversion → Mix & Master (-14 LUFS)
      </p>

      {/* Stage cards */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
        {STAGES.map(s => {
          const st = stages[s.key] || 'pending';
          return (
            <div key={s.key} style={{
              flex: 1, background: '#111827', borderRadius: '12px', padding: '14px',
              border: `1px solid ${st === 'running' ? s.color : '#1f2937'}`,
              boxShadow: st === 'running' ? `0 0 12px ${s.color}44` : 'none',
              transition: 'all 0.3s',
            }}>
              <div style={{ fontSize: '22px', marginBottom: '6px' }}>{s.icon}</div>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: s.color }}>{s.label}</div>
              <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '6px', lineHeight: 1.3 }}>{s.desc}</div>
              <div style={{ fontSize: '11px', color: STATUS_COLOR[st] || '#444', fontWeight: 'bold' }}>
                {STATUS_LABEL[st] || '⏳ Astept'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>Progress</span>
          <span style={{ fontSize: '13px', color: 'white', fontWeight: 'bold' }}>{progress}%</span>
        </div>
        <div style={{ background: '#1f2937', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
          <div style={{
            width: `${progress}%`, height: '100%', borderRadius: '999px',
            background: error ? '#ef4444' : 'linear-gradient(90deg, #6366f1, #ec4899)',
            transition: 'width 0.5s ease',
          }} />
        </div>
        {error && <div style={{ marginTop: '8px', color: '#ef4444', fontSize: '12px' }}>✗ {error}</div>}
      </div>

      {/* Config */}
      {!running && !done && (
        <div style={{ background: '#111827', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Configurare
          </h3>

          {/* Upload */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>
              🎵 Fisier Audio Input
            </label>
            <input type="file" accept="audio/*" onChange={e => setFile(e.target.files[0])}
              style={{ fontSize: '13px', color: '#e5e7eb', background: '#1f2937',
                border: '1px solid #374151', borderRadius: '8px', padding: '8px 12px', width: '100%' }} />
            {file && <div style={{ fontSize: '11px', color: '#6366f1', marginTop: '4px' }}>✓ {file.name}</div>}
          </div>

          {/* RVC Model */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>🎤 Model RVC</label>
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

          {/* F0 Method */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>🎵 F0 Method (Pitch Extraction)</label>
            <select value={f0Method} onChange={e => setF0Method(e.target.value)}
              style={{ width: '100%', background: '#1f2937', color: 'white', border: '1px solid #374151',
                borderRadius: '8px', padding: '8px 12px', fontSize: '13px' }}>
              <option value="harvest">🎤 harvest — Best for singing (slow, accurate)</option>
              <option value="rmvpe">🎙️ rmvpe — Best for speech (fast, good quality)</option>
              <option value="crepe">🔬 crepe — High quality (very slow, GPU intensive)</option>
              <option value="pm">⚡ pm — Fastest (poor quality, testing only)</option>
              <option value="dio">📊 dio — Fast (decent quality)</option>
            </select>
            <p style={{ fontSize: '10px', color: '#6b7280', marginTop: '6px', fontStyle: 'italic' }}>
              Recomandat: <strong>harvest</strong> pentru muzică, <strong>rmvpe</strong> pentru vorbire
            </p>
          </div>

          {/* Vocal Chain Preset */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>🎤 Vocal Chain Preset</label>
            <select value={vocalPreset} onChange={e => setVocalPreset(e.target.value)}
              style={{ width: '100%', background: '#1f2937', color: 'white', border: '1px solid #374151',
                borderRadius: '8px', padding: '8px 12px', fontSize: '13px' }}>
              <option value="studio_radio">🎙️ Studio Radio — Clar, compresat (pop/manele)</option>
              <option value="natural">🎤 Natural — Minimal procesare (acoustic/folk)</option>
              <option value="arena">🏟️ Arena — Mult reverb (concert/live)</option>
              <option value="radio">📻 Radio — Foarte compresat (commercial)</option>
              <option value="balanced">🎵 Balanced — Echilibrat (all-round)</option>
            </select>
            <p style={{ fontSize: '10px', color: '#6b7280', marginTop: '6px', fontStyle: 'italic' }}>
              Recomandat: <strong>Studio Radio</strong> pentru muzică românească
            </p>
          </div>

          {/* Sliders 3x2 Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
            {sliders.map(({ label, val, set, min, max, step, display, desc, example, color }) => (
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

          {/* Feature toggles 3-col */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            {/* Applio */}
            <div style={{ background: '#0d1117', borderRadius: '8px', padding: '12px', border: '1px solid #1f2937' }}>
              <h4 style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '10px', fontWeight: 'bold' }}>🎛️ Applio (Stage 2)</h4>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '11px', color: '#e5e7eb', marginBottom: '6px', cursor: 'pointer' }}>
                <input type="checkbox" checked={enableAutotune} onChange={e => setEnableAutotune(e.target.checked)}
                  style={{ marginRight: '8px', accentColor: '#6366f1' }} />
                🎵 Autotune
              </label>
              {enableAutotune && (
                <input type="range" min="0" max="1" step="0.1" value={autotuneStrength}
                  onChange={e => setAutotuneStrength(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#6366f1', marginBottom: '6px' }} />
              )}
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '11px', color: '#e5e7eb', marginBottom: '6px', cursor: 'pointer' }}>
                <input type="checkbox" checked={enableHighpass} onChange={e => setEnableHighpass(e.target.checked)}
                  style={{ marginRight: '8px', accentColor: '#6366f1' }} />
                🔊 HPF (48Hz)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '11px', color: '#e5e7eb', cursor: 'pointer' }}>
                <input type="checkbox" checked={enableVolumeEnvelope} onChange={e => setEnableVolumeEnvelope(e.target.checked)}
                  style={{ marginRight: '8px', accentColor: '#6366f1' }} />
                📊 Vol. Envelope
              </label>
            </div>

            {/* Stage 4 (Mix) */}
            <div style={{ background: '#0d1117', borderRadius: '8px', padding: '12px', border: `1px solid ${enableStage4 ? '#ec489944' : '#1f2937'}` }}>
              <h4 style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '10px', fontWeight: 'bold' }}>🎚️ Mix & Master</h4>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '11px', color: '#e5e7eb', marginBottom: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={enableStage4} onChange={e => setEnableStage4(e.target.checked)}
                  style={{ marginRight: '8px', accentColor: '#ec4899' }} />
                Enable
              </label>
              <p style={{ fontSize: '10px', color: '#6b7280', margin: 0, lineHeight: 1.4 }}>
                Mix vocal + instrumental.<br />
                Loudnorm <span style={{ color: '#10b981' }}>-14 LUFS</span> Spotify.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        {!running && !done && (
          <button onClick={handleRun} disabled={!file || !rvcModel}
            style={{ flex: 1, padding: '14px', cursor: file && rvcModel ? 'pointer' : 'not-allowed',
              background: file && rvcModel ? 'linear-gradient(135deg, #6366f1, #ec4899)' : '#374151',
              color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px' }}>
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

      {/* Downloads */}
      {done && jobId && (
        <div style={{ background: '#111827', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            📁 Descarca Fisierele
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            {[
              { key: 'vocals',       label: '🎵 Vocals Separat',       color: '#6366f1' },
              { key: 'instrumental', label: '🎸 Instrumental',         color: '#6366f1' },
              { key: 'rvc_raw',      label: '🎤 RVC Converted',        color: '#8b5cf6' },
              { key: 'final_mix',    label: '🎚️ Mix Final WAV',      color: '#ec4899' },
              { key: 'final_mix_mp3', label: '🎧 Mix Final MP3 320k', color: '#f43f5e' },
            ].map(({ key, label, color }) => (
              <a key={key} href={`${API}/pipeline/download/${jobId}/${key}`}
                style={{
                  display: 'block', padding: '12px 14px', background: '#1f2937',
                  borderRadius: '8px', color: color, textDecoration: 'none',
                  fontSize: '12px', fontWeight: 'bold', border: `1px solid ${color}44`,
                  opacity: outputs[key] ? 1 : 0.3,
                  pointerEvents: outputs[key] ? 'auto' : 'none',
                  transition: 'opacity 0.2s',
                  textAlign: 'center',
                }}>
                {label}
                {!outputs[key] && <div style={{ fontSize: '10px', color: '#555', marginTop: '3px' }}>not available</div>}
              </a>
            ))}
          </div>

          {/* Audio Players */}
          <h3 style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            🎧 Preview Audio
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {outputs.final_mix && (
              <div style={{ background: '#0d1117', borderRadius: '10px', padding: '16px', border: '1px solid #ec489944' }}>
                <div style={{ fontSize: '12px', color: '#ec4899', fontWeight: 'bold', marginBottom: '8px' }}>
                  🎚️ Mix Final — Spotify Ready
                </div>
                <audio controls style={{ width: '100%', marginBottom: '8px' }}>
                  <source src={`${API}/pipeline/download/${jobId}/final_mix`} type="audio/wav" />
                  Your browser does not support the audio element.
                </audio>
                <div style={{ fontSize: '10px', color: '#6b7280' }}>-14 LUFS · True Peak -1dB · 48kHz/16bit</div>
              </div>
            )}
            {outputs.rvc_raw && (
              <div style={{ background: '#0d1117', borderRadius: '10px', padding: '16px', border: '1px solid #8b5cf644' }}>
                <div style={{ fontSize: '12px', color: '#8b5cf6', fontWeight: 'bold', marginBottom: '8px' }}>
                  🎤 RVC Converted
                </div>
                <audio controls style={{ width: '100%', marginBottom: '8px' }}>
                  <source src={`${API}/pipeline/download/${jobId}/rvc_raw`} type="audio/wav" />
                  Your browser does not support the audio element.
                </audio>
                <div style={{ fontSize: '10px', color: '#6b7280' }}>Voce convertită prin RVC</div>
              </div>
            )}
            {outputs.vocals && (
              <div style={{ background: '#0d1117', borderRadius: '10px', padding: '16px', border: '1px solid #6366f144' }}>
                <div style={{ fontSize: '12px', color: '#6366f1', fontWeight: 'bold', marginBottom: '8px' }}>
                  🎵 Vocals Separat (BS-RoFormer)
                </div>
                <audio controls style={{ width: '100%', marginBottom: '8px' }}>
                  <source src={`${API}/pipeline/download/${jobId}/vocals`} type="audio/wav" />
                  Your browser does not support the audio element.
                </audio>
                <div style={{ fontSize: '10px', color: '#6b7280' }}>Separare vocal/instrumental SDR 12.97</div>
              </div>
            )}
            {outputs.instrumental && (
              <div style={{ background: '#0d1117', borderRadius: '10px', padding: '16px', border: '1px solid #6366f144' }}>
                <div style={{ fontSize: '12px', color: '#6366f1', fontWeight: 'bold', marginBottom: '8px' }}>
                  🎸 Instrumental
                </div>
                <audio controls style={{ width: '100%', marginBottom: '8px' }}>
                  <source src={`${API}/pipeline/download/${jobId}/instrumental`} type="audio/wav" />
                  Your browser does not support the audio element.
                </audio>
                <div style={{ fontSize: '10px', color: '#6b7280' }}>Pista instrumentală pentru mix final</div>
              </div>
            )}
          </div>

          {outputs.final_mix && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#0d1117', borderRadius: '8px',
              border: '1px solid #ec489944', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#ec4899', fontWeight: 'bold', marginBottom: '4px' }}>
                🎚️ Mix Final — Spotify Ready
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>-14 LUFS · True Peak -1dB · 48kHz/16bit</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
