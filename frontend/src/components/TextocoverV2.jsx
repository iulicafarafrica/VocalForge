/**
 * TextocoverV2 Tab
 * Text to Music functionality from Aureon
 */

import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8000';

const sectionStyle = {
  background: 'linear-gradient(180deg, #0d0d22 0%, #0a0a1a 100%)',
  border: '1px solid #1a1a3a',
  borderRadius: 12,
  padding: '20px 24px',
  marginBottom: 20,
};

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#6666aa',
  marginBottom: 8,
};

const inputStyle = {
  width: '100%',
  background: '#0d0d25',
  border: '1px solid #2a2a4a',
  color: '#e0e0ff',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '12px',
};

const grid3Style = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: '10px',
};

export default function TextocoverV2({ addLog }) {
  // Sample Mode toggle
  const [sampleMode, setSampleMode] = useState(false);
  const [sampleQuery, setSampleQuery] = useState('');
  const [useFormat, setUseFormat] = useState(false);

  // Prompt & Lyrics
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState('');

  // Music Attributes
  const [vocalLanguage, setVocalLanguage] = useState('en');
  const [duration, setDuration] = useState(30);
  const [bpm, setBpm] = useState('');
  const [keyScale, setKeyScale] = useState('');
  const [timeSignature, setTimeSignature] = useState('');
  const [audioFormat, setAudioFormat] = useState('mp3');

  // Generation Control
  const [steps, setSteps] = useState(8);
  const [guidanceScale, setGuidanceScale] = useState(7.0);
  const [inferMethod, setInferMethod] = useState('ode');
  const [shift, setShift] = useState(3.0);
  const [timesteps, setTimesteps] = useState('');
  const [seed, setSeed] = useState(-1);
  const [useRandomSeed, setUseRandomSeed] = useState(true);
  const [cfgStart, setCfgStart] = useState(0.0);
  const [cfgEnd, setCfgEnd] = useState(1.0);
  const [useAdg, setUseAdg] = useState(false);
  const [useTiledDecode, setUseTiledDecode] = useState(true);
  const [useFormat2, setUseFormat2] = useState(false);

  // Batch
  const [batchSize, setBatchSize] = useState(1);

  // Thinking Mode
  const [thinking, setThinking] = useState(true);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');

  // LM Settings
  const [lmModelPath, setLmModelPath] = useState('');
  const [lmBackend, setLmBackend] = useState('pt');
  const [lmTemperature, setLmTemperature] = useState(0.85);
  const [lmCfgScale, setLmCfgScale] = useState(2.5);
  const [lmRepetitionPenalty, setLmRepetitionPenalty] = useState(1.0);
  const [lmTopK, setLmTopK] = useState(0);
  const [lmTopP, setLmTopP] = useState(0.9);
  const [lmNegativePrompt, setLmNegativePrompt] = useState('NO USER INPUT');
  const [useCotCaption, setUseCotCaption] = useState(true);
  const [useCotLanguage, setUseCotLanguage] = useState(true);
  const [constrainedDecoding, setConstrainedDecoding] = useState(true);
  const [allowLmBatch, setAllowLmBatch] = useState(true);

  // Model
  const [model, setModel] = useState('');
  const [models, setModels] = useState([]);

  // Load models on mount
  useEffect(() => {
    fetch(`${API_BASE}/acestep/models`)
      .then(r => r.json())
      .then(data => {
        if (data.models) setModels(data.models);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);
    setProgress('Starting generation...');
    if (addLog) addLog('[T2M] Starting text-to-music task...');

    const formData = new FormData();
    
    // Core parameters - use exact names as backend expects
    formData.append('prompt', prompt);
    formData.append('lyrics', lyrics);
    formData.append('duration', duration.toString());
    formData.append('guidance_scale', guidanceScale.toString());
    formData.append('seed', useRandomSeed ? '-1' : seed.toString());
    formData.append('infer_steps', steps.toString());
    formData.append('task_type', 'text2music');
    formData.append('vocal_language', vocalLanguage);
    formData.append('audio_format', audioFormat);
    formData.append('infer_method', inferMethod);
    formData.append('shift', shift.toString());
    
    // Optional music parameters
    if (bpm) formData.append('bpm', bpm);
    if (keyScale) formData.append('key_scale', keyScale);
    if (timeSignature) formData.append('time_signature', timeSignature);
    
    // Advanced parameters
    formData.append('use_adg', useAdg.toString());
    formData.append('use_tiled_decode', useTiledDecode.toString());
    formData.append('cfg_interval_start', cfgStart.toString());
    formData.append('cfg_interval_end', cfgEnd.toString());
    
    // LM parameters  
    formData.append('lm_temperature', lmTemperature.toString());
    formData.append('lm_cfg_scale', lmCfgScale.toString());
    formData.append('lm_top_k', lmTopK.toString());
    formData.append('lm_top_p', lmTopP.toString());
    formData.append('lm_negative_prompt', lmNegativePrompt);
    formData.append('use_cot_caption', useCotCaption.toString());
    formData.append('use_cot_language', useCotLanguage.toString());
    formData.append('allow_lm_batch', allowLmBatch.toString());

    try {
      // Use the backend's /ace_generate endpoint which handles polling internally
      const response = await fetch(`${API_BASE}/ace_generate`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok || data.error) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      // The backend already handled the polling and returns the final result
      if (data.status === 'ok' && data.url) {
        setResult([{ file: data.url }]);
        setProgress('Done!');
        setIsProcessing(false);
        if (addLog) addLog('[T2M] Generation complete!');
      } else {
        throw new Error('No audio URL in response');
      }
      
    } catch (err) {
      setError(err.message);
      setProgress('');
      setIsProcessing(false);
      if (addLog) addLog(`[ERR] ${err.message}`);
    }
  };

  const handleRandomSample = async () => {
    if (addLog) addLog('[T2M] Fetching random sample...');
    try {
      const response = await fetch(`${API_BASE}/acestep/random_sample`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sample_type: 'simple_mode' })
      });
      const data = await response.json();
      // ACE-Step returns {code: 200, data: {...}} or direct object
      const d = data.data || data;
      if (d) {
        if (d.caption) setPrompt(d.caption);
        if (d.lyrics) setLyrics(d.lyrics);
        if (d.bpm) setBpm(d.bpm.toString());
        if (d.key_scale) setKeyScale(d.key_scale);
        if (d.time_signature) setTimeSignature(d.time_signature.toString());
        if (d.duration) setDuration(d.duration);
        if (d.vocal_language) setVocalLanguage(d.vocal_language);
        if (addLog) addLog('[T2M] Random sample loaded');
      }
    } catch (err) {
      if (addLog) addLog(`[ERR] Random sample failed: ${err.message}`);
    }
  };

  const handleFormatInput = async () => {
    if (!prompt.trim() && !lyrics.trim()) {
      setError('Enter a prompt or lyrics to format');
      return;
    }
    if (addLog) addLog('[T2M] Formatting input via LM...');
    try {
      const response = await fetch(`${API_BASE}/acestep/format_input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          lyrics,
          temperature: lmTemperature,
          param_obj: JSON.stringify({
            duration: duration || undefined,
            bpm: bpm ? parseInt(bpm) : undefined,
            key: keyScale || undefined,
            time_signature: timeSignature || undefined,
            language: vocalLanguage || 'en'
          })
        })
      });
      const data = await response.json();
      // ACE-Step returns {code: 200, data: {...}} or direct object
      const d = data.data || data;
      if (d) {
        if (d.caption) setPrompt(d.caption);
        if (d.lyrics) setLyrics(d.lyrics);
        if (d.bpm) setBpm(d.bpm.toString());
        if (d.key_scale) setKeyScale(d.key_scale);
        if (d.time_signature) setTimeSignature(d.time_signature.toString());
        if (d.duration) setDuration(d.duration);
        if (d.vocal_language) setVocalLanguage(d.vocal_language);
        if (addLog) addLog('[T2M] Input formatted');
      }
    } catch (err) {
      if (addLog) addLog(`[ERR] Format failed: ${err.message}`);
    }
  };
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Title */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: 1,
          background: 'linear-gradient(135deg, #e0e0ff, #9b2de0)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 4,
        }}>
          🎵 Text to Music V2
        </h2>
        <p style={{ color: '#444466', fontSize: 13 }}>
          Generate music from text descriptions and lyrics
        </p>
      </div>

      {/* Description */}
      <div style={{ ...sectionStyle, borderLeft: '4px solid #9b2de0' }}>
        <p style={{ color: '#a0a0cc', fontSize: 14, lineHeight: 1.55, margin: 0 }}>
          Enter a style description and optional lyrics to generate music.
          Use Description Mode for natural language queries, or enter detailed prompts manually.
          Enable Reasoning/Thinking for LM-powered audio code generation.
        </p>
      </div>

      {/* Sample Mode Toggle */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div
            onClick={() => setSampleMode(!sampleMode)}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              width: 36,
              height: 20,
              background: sampleMode ? '#9b2de0' : '#3a3a3a',
              borderRadius: 10,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
          >
            <div style={{
              position: 'absolute',
              left: sampleMode ? 18 : 2,
              width: 16,
              height: 16,
              background: '#fff',
              borderRadius: '50%',
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
            }} />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#e0e0ff', margin: 0 }}>Description Mode</p>
            <p style={{ fontSize: 10, color: '#555577', margin: 0 }}>Auto-generate from a natural language query</p>
          </div>
        </div>

        {sampleMode && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Description Query</label>
            <textarea
              value={sampleQuery}
              onChange={(e) => setSampleQuery(e.target.value)}
              placeholder="e.g. a soft Bengali love song for a quiet evening…"
              style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <div
                onClick={() => setUseFormat(!useFormat)}
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  width: 36,
                  height: 20,
                  background: useFormat ? '#9b2de0' : '#3a3a3a',
                  borderRadius: 10,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{
                  position: 'absolute',
                  left: useFormat ? 18 : 2,
                  width: 16,
                  height: 16,
                  background: '#fff',
                  borderRadius: '50%',
                  transition: 'left 0.2s'
                }} />
              </div>
              <span style={{ color: '#8888aa', fontSize: 11 }}>Enhance with LM (use_format)</span>
            </div>
          </div>
        )}

        {!sampleMode && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Prompt & Lyrics</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleRandomSample}
                  style={{
                    fontSize: 10,
                    border: '1px solid #2a2a4a',
                    color: '#6666aa',
                    background: 'transparent',
                    padding: '4px 8px',
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                >
                  🎲 Random
                </button>
                <button
                  onClick={handleFormatInput}
                  style={{
                    fontSize: 10,
                    border: '1px solid #2a2a4a',
                    color: '#6666aa',
                    background: 'transparent',
                    padding: '4px 8px',
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                >
                  ✨ Format
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ ...labelStyle, marginBottom: 4 }}>Style / Description Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. 80s synthwave, upbeat, female vocals, reverb-heavy…"
                style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ ...labelStyle, marginBottom: 4 }}>Lyrics (optional)</label>
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="[Verse 1]&#10;…"
                style={{ ...inputStyle, minHeight: 54, resize: 'vertical' }}
              />
            </div>
          </>
        )}
      </div>

      {/* Music Attributes */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Music Attributes</span>
        <div style={grid3Style}>
          <div>
            <label style={{ ...labelStyle, marginBottom: 4 }}>Language</label>
            <input type="text" value={vocalLanguage} onChange={(e) => setVocalLanguage(e.target.value)} placeholder="en/zh/ja" style={inputStyle} />
          </div>
          <div>
            <label style={{ ...labelStyle, marginBottom: 4 }}>Duration (s)</label>
            <input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 30)} min="8" max="600" style={inputStyle} />
          </div>
          <div>
            <label style={{ ...labelStyle, marginBottom: 4 }}>BPM</label>
            <input type="number" value={bpm} onChange={(e) => setBpm(e.target.value)} placeholder="auto" min="30" max="300" style={inputStyle} />
          </div>
        </div>
        <div style={{ ...grid3Style, marginTop: 12 }}>
          <div>
            <label style={{ ...labelStyle, marginBottom: 4 }}>Key / Scale</label>
            <input type="text" value={keyScale} onChange={(e) => setKeyScale(e.target.value)} placeholder="C Major" style={inputStyle} />
          </div>
          <div>
            <label style={{ ...labelStyle, marginBottom: 4 }}>Time Sig.</label>
            <select value={timeSignature} onChange={(e) => setTimeSignature(e.target.value)} style={inputStyle}>
              <option value="">Auto</option>
              <option value="4">4 (4/4)</option>
              <option value="3">3 (3/4)</option>
              <option value="2">2 (2/4)</option>
              <option value="6">6 (6/8)</option>
            </select>
          </div>
          <div>
            <label style={{ ...labelStyle, marginBottom: 4 }}>Format</label>
            <select value={audioFormat} onChange={(e) => setAudioFormat(e.target.value)} style={inputStyle}>
              <option value="mp3">MP3</option>
              <option value="flac">FLAC</option>
              <option value="wav">WAV</option>
              <option value="wav32">WAV32</option>
              <option value="opus">Opus</option>
              <option value="aac">AAC</option>
            </select>
          </div>
        </div>
      </div>

      {/* Generation Control */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Generation Control</span>
        
        <div style={gridStyle}>
          <div>
            <label style={{ ...labelStyle, marginBottom: 4 }}>Diff. Steps</label>
            <input type="number" value={steps} onChange={(e) => setSteps(parseInt(e.target.value) || 8)} min="1" max="200" style={inputStyle} />
          </div>
          <div>
            <label style={{ ...labelStyle, marginBottom: 4 }}>CFG Scale</label>
            <input type="number" value={guidanceScale} onChange={(e) => setGuidanceScale(parseFloat(e.target.value) || 7)} min="0" max="20" step="0.5" style={inputStyle} />
          </div>
        </div>

        <div style={{ ...gridStyle, marginTop: 12 }}>
          <div>
            <label style={{ ...labelStyle, marginBottom: 4 }}>Infer Method</label>
            <select value={inferMethod} onChange={(e) => setInferMethod(e.target.value)} style={inputStyle}>
              <option value="ode">ODE (Euler)</option>
              <option value="sde">SDE (Stochastic)</option>
            </select>
          </div>
          <div>
            <label style={{ ...labelStyle, marginBottom: 4 }}>Shift (base only)</label>
            <input type="number" value={shift} onChange={(e) => setShift(parseFloat(e.target.value) || 3)} min="1" max="5" step="0.1" style={inputStyle} />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ ...labelStyle, marginBottom: 4 }}>Custom Timesteps</label>
          <input type="text" value={timesteps} onChange={(e) => setTimesteps(e.target.value)} placeholder="0.97,0.76,0.615,0.5,0.395,0.28,0.18,0.085,0" style={inputStyle} />
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: '#8888aa', fontSize: 12 }}>🎲 Seed</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={useRandomSeed} onChange={(e) => setUseRandomSeed(e.target.checked)} style={{ accentColor: '#9b2de0' }} />
              <span style={{ color: '#6666aa', fontSize: 11 }}>Random</span>
            </label>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="number" value={seed} onChange={(e) => setSeed(parseInt(e.target.value) || -1)} disabled={useRandomSeed} style={{ ...inputStyle, opacity: useRandomSeed ? 0.4 : 1 }} />
            <button onClick={() => setSeed(Math.floor(Math.random() * 999999))} disabled={useRandomSeed} style={{ background: '#0a0a1a', color: '#8888aa', border: '1px solid #2a2a4a', borderRadius: 8, padding: '8px 12px', fontSize: 11, cursor: useRandomSeed ? 'not-allowed' : 'pointer' }}>🎲</button>
          </div>
        </div>

        <div style={{ ...gridStyle, marginTop: 12 }}>
          <div>
            <label style={{ ...labelStyle, marginBottom: 4 }}>CFG Start</label>
            <input type="number" value={cfgStart} onChange={(e) => setCfgStart(parseFloat(e.target.value) || 0)} min="0" max="1" step="0.05" style={inputStyle} />
          </div>
          <div>
            <label style={{ ...labelStyle, marginBottom: 4 }}>CFG End</label>
            <input type="number" value={cfgEnd} onChange={(e) => setCfgEnd(parseFloat(e.target.value) || 1)} min="0" max="1" step="0.05" style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={useAdg} onChange={(e) => setUseAdg(e.target.checked)} style={{ accentColor: '#9b2de0' }} />
            <span style={{ color: '#8888aa', fontSize: 11 }}>ADG (base only)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={useTiledDecode} onChange={(e) => setUseTiledDecode(e.target.checked)} style={{ accentColor: '#9b2de0' }} />
            <span style={{ color: '#8888aa', fontSize: 11 }}>Tiled Decode</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={useFormat2} onChange={(e) => setUseFormat2(e.target.checked)} style={{ accentColor: '#9b2de0' }} />
            <span style={{ color: '#8888aa', fontSize: 11 }}>Format Input</span>
          </label>
        </div>

        {/* Batch Size */}
        <div style={{ marginTop: 16 }}>
          <span style={{ ...labelStyle, marginBottom: 8 }}>Batch Size</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 4, 8].map(n => (
              <button key={n} type="button" onClick={() => setBatchSize(n)} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: batchSize === n ? '1px solid #9b2de0' : '1px solid #2a2a4a', background: batchSize === n ? 'rgba(155,45,224,0.15)' : 'transparent', color: batchSize === n ? '#9b2de0' : '#8888aa', fontSize: 12, fontWeight: batchSize === n ? 700 : 500, cursor: 'pointer', transition: 'all 0.2s' }}>{n}</button>
            ))}
          </div>
        </div>

        {/* Thinking Mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, padding: '12px', background: '#0a0a1a', borderRadius: 8 }}>
          <div onClick={() => setThinking(!thinking)} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', width: 36, height: 20, background: thinking ? '#9b2de0' : '#3a3a3a', borderRadius: 10, cursor: 'pointer', transition: 'background 0.2s' }}>
            <div style={{ position: 'absolute', left: thinking ? 18 : 2, width: 16, height: 16, background: '#fff', borderRadius: '50%', transition: 'left 0.2s' }} />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#e0e0ff', margin: 0 }}>Reasoning / Thinking</p>
            <p style={{ fontSize: 10, color: '#555577', margin: 0 }}>5Hz LM generates audio codes (lm-dit)</p>
          </div>
        </div>
      </div>

      {/* Model Selection */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Model Selection</span>
        <select value={model} onChange={(e) => setModel(e.target.value)} style={inputStyle}>
          <option value="">Default (server selected)</option>
          {models.map(m => (<option key={m.name} value={m.name}>{m.name}{m.is_default ? ' ★' : ''}</option>))}
        </select>
      </div>

      {/* Advanced LM Settings */}
      <details style={{ ...sectionStyle, cursor: 'pointer' }}>
        <summary style={{ color: '#6666aa', fontSize: 12, fontWeight: 600 }}>Advanced LM Settings</summary>
        <div style={{ marginTop: 12 }}>
          <div style={gridStyle}>
            <div>
              <label style={{ ...labelStyle, marginBottom: 4 }}>LM Model Path</label>
              <input type="text" value={lmModelPath} onChange={(e) => setLmModelPath(e.target.value)} placeholder="server default" style={inputStyle} />
            </div>
            <div>
              <label style={{ ...labelStyle, marginBottom: 4 }}>LM Backend</label>
              <select value={lmBackend} onChange={(e) => setLmBackend(e.target.value)} style={inputStyle}>
                <option value="vllm">vllm</option>
                <option value="pt">pt</option>
                <option value="mlx">mlx</option>
              </select>
            </div>
          </div>
          <div style={grid3Style}>
            <div>
              <label style={{ ...labelStyle, marginBottom: 4 }}>Temperature</label>
              <input type="number" value={lmTemperature} onChange={(e) => setLmTemperature(parseFloat(e.target.value) || 0.85)} min="0" max="2" step="0.05" style={inputStyle} />
            </div>
            <div>
              <label style={{ ...labelStyle, marginBottom: 4 }}>CFG Scale</label>
              <input type="number" value={lmCfgScale} onChange={(e) => setLmCfgScale(parseFloat(e.target.value) || 2.5)} min="1" max="10" step="0.1" style={inputStyle} />
            </div>
            <div>
              <label style={{ ...labelStyle, marginBottom: 4 }}>Rep. Penalty</label>
              <input type="number" value={lmRepetitionPenalty} onChange={(e) => setLmRepetitionPenalty(parseFloat(e.target.value) || 1)} min="1" max="2" step="0.05" style={inputStyle} />
            </div>
          </div>
          <div style={{ ...gridStyle, marginTop: 12 }}>
            <div>
              <label style={{ ...labelStyle, marginBottom: 4 }}>Top-K (0=off)</label>
              <input type="number" value={lmTopK} onChange={(e) => setLmTopK(parseInt(e.target.value) || 0)} min="0" max="200" style={inputStyle} />
            </div>
            <div>
              <label style={{ ...labelStyle, marginBottom: 4 }}>Top-P</label>
              <input type="number" value={lmTopP} onChange={(e) => setLmTopP(parseFloat(e.target.value) || 0.9)} min="0" max="1" step="0.05" style={inputStyle} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ ...labelStyle, marginBottom: 4 }}>LM Negative Prompt</label>
            <input type="text" value={lmNegativePrompt} onChange={(e) => setLmNegativePrompt(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={useCotCaption} onChange={(e) => setUseCotCaption(e.target.checked)} style={{ accentColor: '#9b2de0' }} />
              <span style={{ color: '#8888aa', fontSize: 11 }}>use_cot_caption</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={useCotLanguage} onChange={(e) => setUseCotLanguage(e.target.checked)} style={{ accentColor: '#9b2de0' }} />
              <span style={{ color: '#8888aa', fontSize: 11 }}>use_cot_language</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={constrainedDecoding} onChange={(e) => setConstrainedDecoding(e.target.checked)} style={{ accentColor: '#9b2de0' }} />
              <span style={{ color: '#8888aa', fontSize: 11 }}>constrained_decoding</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={allowLmBatch} onChange={(e) => setAllowLmBatch(e.target.checked)} style={{ accentColor: '#9b2de0' }} />
              <span style={{ color: '#8888aa', fontSize: 11 }}>allow_lm_batch</span>
            </label>
          </div>
        </div>
      </details>

      {/* Error */}
      {error && (<div style={{ ...sectionStyle, borderColor: '#e63946', background: 'rgba(230,57,70,0.08)' }}><p style={{ color: '#e63946', fontSize: 14 }}>{error}</p></div>)}

      {/* Progress */}
      {progress && !error && (<div style={{ ...sectionStyle, borderColor: '#00e5ff', background: 'rgba(0,229,255,0.06)' }}><p style={{ color: '#00e5ff', fontSize: 14 }}>{progress}</p></div>)}

      {/* Submit */}
      <button type="button" onClick={handleSubmit} disabled={isProcessing} style={{ width: '100%', padding: '14px 24px', borderRadius: 12, border: 'none', background: isProcessing ? '#1a1a3a' : 'linear-gradient(135deg, #9b2de0, #00e5ff)', color: isProcessing ? '#444466' : '#080812', fontWeight: 700, fontSize: 15, cursor: isProcessing ? 'not-allowed' : 'pointer', marginBottom: 24 }}>
        {isProcessing ? 'Processing…' : '✨ Generate Music'}
      </button>

      {/* Results */}
      {result && result.length > 0 && (
        <div style={{ ...sectionStyle, borderLeft: '4px solid #06d6a0' }}>
          <span style={{ ...labelStyle, color: '#06d6a0' }}>Generated Results ({result.length})</span>
          {result.map((item, idx) => (
            <div key={idx} style={{ marginTop: idx > 0 ? 16 : 8 }}>
              {item?.file && (
                <>
                  {/* item.file poate fi URL complet sau cale relativă */}
                  <audio controls src={item.file.startsWith('http') ? item.file : `${API_BASE}${item.file}`} style={{ width: '100%', marginBottom: 8 }} />
                  <a href={item.file.startsWith('http') ? item.file : `${API_BASE}${item.file}`} download style={{ display: 'inline-block', padding: '8px 16px', borderRadius: 8, background: '#06d6a0', color: '#080812', fontWeight: 600, fontSize: 12, textDecoration: 'none' }}>Download #{idx + 1}</a>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Note */}
      <div style={{ ...sectionStyle, borderColor: 'rgba(255,209,102,0.35)', background: 'rgba(255,209,102,0.06)' }}>
        <p style={{ color: '#ffd166', fontSize: 13, margin: 0 }}>
          ACE-Step API must be running. Use <code style={{ background: '#1a1a3a', padding: '2px 6px', borderRadius: 4 }}>start_acestep.bat</code> to start it.
        </p>
      </div>
    </div>
  );
}