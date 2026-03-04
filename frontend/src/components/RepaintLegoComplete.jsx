/**
 * Repaint / Lego / Complete Tab
 * ACE-Step Advanced Features - UI aligned with VocalForge theme
 */

import React, { useState, useRef } from 'react';

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

export default function RepaintLegoComplete() {
  const [mode, setMode] = useState('repaint');
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [instruction, setInstruction] = useState('');
  const [guidanceScale, setGuidanceScale] = useState(9.0);
  const [seed, setSeed] = useState(-1);
  const [inferSteps, setInferSteps] = useState(12);
  const [keyScale, setKeyScale] = useState('');
  const [audioFormat, setAudioFormat] = useState('mp3');
  const [ditModel, setDitModel] = useState('acestep-v15-turbo');
  const [audioCoverStrength, setAudioCoverStrength] = useState(1.0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');

  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(30);
  const [lyrics, setLyrics] = useState('');

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select an audio file');
      return;
    }
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setProgress('Uploading file...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('prompt', prompt);
    formData.append('instruction', instruction);
    formData.append('guidance_scale', guidanceScale);
    formData.append('seed', seed);
    formData.append('infer_steps', inferSteps);
    formData.append('key_scale', keyScale);
    formData.append('audio_format', audioFormat);
    formData.append('dit_model', ditModel);

    if (mode === 'repaint') {
      formData.append('start_time', startTime);
      formData.append('end_time', endTime);
      formData.append('lyrics', lyrics);
      formData.append('audio_cover_strength', audioCoverStrength);
    } else if (mode === 'lego') {
      // instruction is already appended above
    } else if (mode === 'complete') {
      // instruction is already appended above
    }

    try {
      const endpoint = mode === 'repaint' ? '/acestep/repaint' : mode === 'lego' ? '/acestep/lego' : '/acestep/complete';
      setProgress(`Processing ${mode}...`);

      const response = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', body: formData });
      let data = {};
      try { data = await response.json(); } catch (_) {}


      if (!response.ok) {
        const errMsg = typeof data.error === 'string' ? data.error : typeof data.detail === 'string' ? data.detail : typeof data.detail === 'object' ? JSON.stringify(data.detail) : JSON.stringify(data) || `HTTP ${response.status}`;
        throw new Error(errMsg);
      }
      setResult(data);
      setProgress('Done!');
    } catch (err) {
      setError(err.message);
      setProgress('');
    } finally {
      setIsProcessing(false);
    }
  };

  const modeConfig = {
    repaint: {
      label: 'Repaint',
      icon: '🖌️',
      color: '#9b5de5',
      desc: 'Select a portion of the track (e.g. seconds 30–60) and regenerate it.\nUseful to fix a section that doesn\'t sound right without regenerating everything.\nYou can change lyrics, add a bridge, modify endings.\nAll models support Repaint.',
      modelSupport: {
        'acestep-v15-turbo': { supported: true, note: '✅ Fast (8 steps)' },
        'acestep-v15-turbo-shift3': { supported: true, note: '✅ Fast (8 steps)' },
        'acestep-v15-base': { supported: true, note: '✅ Full support + CFG (50 steps)' },
        'acestep-v15-sft': { supported: true, note: '✅ High quality + CFG (50 steps)' },
      },
    },
    lego: {
      label: 'Lego',
      icon: '🧱',
      color: '#f9c74f',
      desc: 'Add or regenerate specific instruments in a track.\nUse the instruction field to describe what track/instrument to add.\nThe rest of the audio stays unchanged.\n⚠️ ONLY Base model supports Lego!',
      modelSupport: {
        'acestep-v15-turbo': { supported: false, note: '❌ Not supported' },
        'acestep-v15-turbo-shift3': { supported: false, note: '❌ Not supported' },
        'acestep-v15-base': { supported: true, note: '✅ ONLY Base model supports Lego' },
        'acestep-v15-sft': { supported: false, note: '❌ Not supported' },
      },
    },
    complete: {
      label: 'Complete',
      icon: '🎼',
      color: '#06d6a0',
      desc: 'Auto-complete incomplete tracks with specified instruments.\nUse the instruction field to describe what instruments to add.\n⚠️ ONLY Base model supports Complete!',
      modelSupport: {
        'acestep-v15-turbo': { supported: false, note: '❌ Not supported' },
        'acestep-v15-turbo-shift3': { supported: false, note: '❌ Not supported' },
        'acestep-v15-base': { supported: true, note: '✅ ONLY Base model supports Complete' },
        'acestep-v15-sft': { supported: false, note: '❌ Not supported' },
      },
    },
  };

  const currentMode = modeConfig[mode];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Title */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: 1,
          background: 'linear-gradient(135deg, #e0e0ff, #00e5ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 4,
        }}>
          {currentMode.icon} {currentMode.label}
        </h2>
        <p style={{ color: '#444466', fontSize: 13 }}>{currentMode.label} - ACE-Step Advanced</p>
      </div>

      {/* Mode selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {Object.entries(modeConfig).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 10,
              border: `1px solid ${mode === key ? cfg.color : '#2a2a4a'}`,
              background: mode === key ? `${cfg.color}22` : 'transparent',
              color: mode === key ? cfg.color : '#6666aa',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {cfg.icon} {cfg.label}
          </button>
        ))}
      </div>

      {/* Mode description card */}
      <div style={{ ...sectionStyle, borderLeft: `4px solid ${currentMode.color}` }}>
        <p style={{ color: '#a0a0cc', fontSize: 14, lineHeight: 1.55, margin: 0, whiteSpace: 'pre-line' }}>
          {currentMode.desc}
        </p>
      </div>

      {/* Model Compatibility Card */}
      <div style={{
        ...sectionStyle,
        borderColor: 'rgba(255,209,102,0.35)',
        background: 'rgba(255,209,102,0.04)',
        borderLeft: `4px solid #ffd166`,
      }}>
        <span style={{ ...labelStyle, color: '#ffd166', marginBottom: 10 }}>
          🔍 Model Compatibility for {currentMode.label}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'monospace', fontSize: 11 }}>
          {Object.entries(currentMode.modelSupport).map(([modelId, { supported, note }]) => (
            <div
              key={modelId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderRadius: 6,
                background: supported ? 'rgba(6,214,160,0.08)' : 'rgba(230,57,70,0.08)',
                border: `1px solid ${supported ? '#06d6a044' : '#e6394644'}`,
              }}
            >
              <span style={{ color: supported ? '#06d6a0' : '#e63946', fontWeight: 600 }}>
                {modelId.replace('acestep-v15-', '')}
              </span>
              <span style={{ color: supported ? '#06d6a0' : '#e63946' }}>{note}</span>
            </div>
          ))}
        </div>
      </div>

      {/* File upload */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Source audio</span>
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          style={{
            border: '2px dashed #2a2a4a',
            borderRadius: 12,
            padding: 28,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.2s, background 0.2s',
            background: file ? '#0d0d22' : 'transparent',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = currentMode.color;
            e.currentTarget.style.background = '#0d0d22';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = '#2a2a4a';
            e.currentTarget.style.background = file ? '#0d0d22' : 'transparent';
          }}
        >
          {file ? (
            <div>
              <p style={{ color: '#e0e0ff', fontWeight: 600, marginBottom: 4 }}>{file.name}</p>
              <p style={{ color: '#6666aa', fontSize: 12 }}>{(file.size / 1024 / 1024).toFixed(2)} MB · Click to change</p>
            </div>
          ) : (
            <div>
              <p style={{ color: '#6666aa', marginBottom: 4 }}>Click to select audio file</p>
              <p style={{ color: '#444466', fontSize: 12 }}>WAV, MP3, FLAC</p>
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileChange} style={{ display: 'none' }} />
      </div>

      {/* Mode-specific options */}
      {mode === 'repaint' && (
        <div style={sectionStyle}>
          <span style={labelStyle}>Repaint region</span>

          {/* Start Time */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ ...labelStyle, marginBottom: 4 }}>Start time (seconds)</label>
            <input
              type="number"
              min="0"
              max="300"
              step="0.1"
              value={startTime}
              onChange={(e) => setStartTime(parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
          </div>

          {/* End Time */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ ...labelStyle, marginBottom: 4 }}>End time (seconds)</label>
            <input
              type="number"
              min="0"
              max="300"
              step="0.1"
              value={endTime}
              onChange={(e) => setEndTime(parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
          </div>

          {/* Instruction */}
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Instruction (optional)</label>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g., Change the melody, Add jazz drums, Make it more energetic..."
              style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
            />
          </div>

          {/* Lyrics */}
          <div>
            <label style={labelStyle}>Lyrics (optional)</label>
            <textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Lyrics for the repainted section..."
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
            />
          </div>

          {/* Audio Cover Strength */}
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>Audio Cover Strength: {audioCoverStrength.toFixed(1)}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={audioCoverStrength}
              onChange={(e) => setAudioCoverStrength(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6666aa', marginTop: '4px' }}>
              <span>Creative (0.0)</span>
              <span>Faithful (1.0)</span>
            </div>
            <span style={{ color: '#6666aa', fontSize: 11, marginTop: 4, display: 'block' }}>
              How much to preserve from the original audio
            </span>
          </div>
        </div>
      )}

      {/* LEGO mode options */}
      {mode === 'lego' && (
        <div style={sectionStyle}>
          <span style={labelStyle}>Instruction for track generation</span>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g., Add drums and bass to this track, Generate a guitar solo section..."
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
          />
          <span style={{ color: '#6666aa', fontSize: 11, marginTop: 4, display: 'block' }}>
            Describe what instrument or track element to add/generate
          </span>
        </div>
      )}

      {/* Complete mode options */}
      {mode === 'complete' && (
        <div style={sectionStyle}>
          <span style={labelStyle}>Instruction for completion</span>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g., Complete this track with drums, bass, and guitar, Add missing instruments to make it a full song..."
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
          />
          <span style={{ color: '#6666aa', fontSize: 11, marginTop: 4, display: 'block' }}>
            Describe what instruments should be added to complete the track
          </span>
        </div>
      )}

      {/* Common parameters */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Generation parameters</span>
        
        {/* Prompt */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ ...labelStyle, marginBottom: 4 }}>Prompt</label>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the style..."
            style={inputStyle}
          />
        </div>

        {/* guidance Scale */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ ...labelStyle, marginBottom: 4 }}>Guidance Scale (CFG)</label>
          <input
            type="number"
            min="1"
            max="20"
            step="0.5"
            value={guidanceScale}
            onChange={(e) => setGuidanceScale(parseFloat(e.target.value) || 7)}
            style={inputStyle}
          />
        </div>

        {/* Inference Steps */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ ...labelStyle, marginBottom: 4 }}>Inference Steps (quality)</label>
          <input
            type="number"
            min="4"
            max="50"
            step="1"
            value={inferSteps}
            onChange={(e) => setInferSteps(parseInt(e.target.value, 10) || 12)}
            style={inputStyle}
          />
          <span style={{ color: '#6666aa', fontSize: 11, marginTop: 4, display: 'block' }}>
            More steps = better quality, slower generation (default: 12, recommended: 8-20)
          </span>
        </div>

        {/* DiT Model Selection */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ ...labelStyle, marginBottom: 4 }}>DiT Model</label>
          <select
            value={ditModel}
            onChange={(e) => setDitModel(e.target.value)}
            style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }}
          >
            <option value="acestep-v15-turbo">⚡ turbo         │ 8 steps  │ CFG: ❌ │ Fast generation</option>
            <option value="acestep-v15-turbo-shift3">⚡ turbo-shift3 │ 8 steps  │ CFG: ❌ │ Alternative variant</option>
            <option value="acestep-v15-base">🎯 base          │ 50 steps │ CFG: ✅ │ All features (Lego, Complete, Extract)</option>
            <option value="acestep-v15-sft">🎵 sft           │ 50 steps │ CFG: ✅ │ High quality generation</option>
          </select>
          
          {/* Model Compatibility Warning */}
          {currentMode.modelSupport[ditModel] && !currentMode.modelSupport[ditModel].supported && (
            <div style={{
              marginTop: 8,
              padding: '8px 12px',
              background: 'rgba(230,57,70,0.1)',
              border: '1px solid #e63946',
              borderRadius: 6,
              color: '#e63946',
              fontSize: 11,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span>⚠️</span>
              <span>
                {currentMode.modelSupport[ditModel].note} — Switch to Base model for {currentMode.label}!
              </span>
            </div>
          )}
          
          <span style={{ color: '#6666aa', fontSize: 11, marginTop: 4, display: 'block' }}>
            ⚡ Turbo: Fast (8 steps, no CFG) · 🎯 Base: All features · 🎵 SFT: High quality
          </span>
        </div>

        {/* Key Scale */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ ...labelStyle, marginBottom: 4 }}>Key Scale (musical key)</label>
          <input
            type="text"
            value={keyScale}
            onChange={(e) => setKeyScale(e.target.value)}
            placeholder="e.g., C major, A minor, D# major..."
            style={inputStyle}
          />
          <span style={{ color: '#6666aa', fontSize: 11, marginTop: 4, display: 'block' }}>
            Musical key for the repainted section (leave empty for auto)
          </span>
        </div>

        {/* Seed */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: '#8888aa', fontSize: 12 }}>🎲 Seed (-1 = random)</span>
            <span style={{ color: '#c77dff', fontSize: 13, fontFamily: 'monospace', fontWeight: 700 }}>{seed === -1 ? 'Random' : seed}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input 
              type="number" 
              value={seed} 
              onChange={(e) => setSeed(parseInt(e.target.value, 10) || -1)}
              style={{ 
                flex: 1,
                background: '#080812', 
                border: '1px solid #2a2a4a', 
                color: '#e0e0ff', 
                borderRadius: 8, 
                padding: '8px 12px', 
                fontSize: 12,
              }} 
            />
            <button 
              onClick={() => setSeed(-1)} 
              style={{ 
                background: '#0a0a1a', 
                color: '#8888aa', 
                border: '1px solid #2a2a4a', 
                borderRadius: 8, 
                padding: '8px 12px', 
                fontSize: 11, 
                cursor: 'pointer', 
                fontWeight: 600 
              }} 
              title="Random seed"
            >🎲 Random</button>
            <button 
              onClick={() => setSeed(Math.floor(Math.random() * 999999))} 
              style={{ 
                background: '#0a0a1a', 
                color: '#6666aa', 
                border: '1px solid #2a2a4a', 
                borderRadius: 8, 
                padding: '8px 10px', 
                fontSize: 11, 
                cursor: 'pointer' 
              }} 
              title="Random numeric"
            >🔀</button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div style={{
          ...sectionStyle,
          borderColor: '#e63946',
          background: 'rgba(230,57,70,0.08)',
          marginBottom: 20,
        }}>
          <p style={{ color: '#e63946', fontSize: 14 }}>{error}</p>
        </div>
      )}

      {progress && !error && (
        <div style={{
          ...sectionStyle,
          borderColor: '#00e5ff',
          background: 'rgba(0,229,255,0.06)',
          marginBottom: 20,
        }}>
          <p style={{ color: '#00e5ff', fontSize: 14 }}>{progress}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isProcessing || !file}
        style={{
          width: '100%',
          padding: '14px 24px',
          borderRadius: 12,
          border: 'none',
          background: isProcessing || !file
            ? '#1a1a3a'
            : `linear-gradient(135deg, ${currentMode.color}, #00e5ff)`,
          color: isProcessing || !file ? '#444466' : '#080812',
          fontWeight: 700,
          fontSize: 15,
          cursor: isProcessing || !file ? 'not-allowed' : 'pointer',
          transition: 'opacity 0.2s',
          marginBottom: 24,
        }}
      >
        {isProcessing ? 'Processing…' : `Generate ${currentMode.label}`}
      </button>

      {/* Result */}
      {result && (
        <div style={{ ...sectionStyle, borderLeft: '4px solid #06d6a0' }}>
          <span style={{ ...labelStyle, color: '#06d6a0' }}>Result</span>
          <div style={{ color: '#a0a0cc', fontSize: 13, marginBottom: 16 }}>
            <p style={{ marginBottom: 4 }}>Duration: {result.duration_sec}s</p>
            <p style={{ marginBottom: 4 }}>Processing: {result.processing_time_sec}s</p>
            {result.seed !== undefined && (
              <p style={{ marginBottom: 4 }}>
                🎲 Seed: <span style={{ color: '#c77dff', fontFamily: 'monospace', fontWeight: 700 }}>{result.seed}</span>
                <button
                  onClick={() => setSeed(result.seed)}
                  style={{
                    marginLeft: 8,
                    background: '#1a1a3a',
                    border: '1px solid #2a2a4a',
                    color: '#8888aa',
                    borderRadius: 4,
                    padding: '2px 8px',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                  title="Use this seed"
                >
                  Use
                </button>
              </p>
            )}
          </div>
          {result.url && (
            <div>
              <audio controls src={`${API_BASE}${result.url}`} style={{ width: '100%', marginBottom: 12 }} />
              <a
                href={`${API_BASE}${result.url}`}
                download
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  borderRadius: 8,
                  background: '#06d6a0',
                  color: '#080812',
                  fontWeight: 600,
                  fontSize: 13,
                  textDecoration: 'none',
                  transition: 'opacity 0.2s',
                }}
              >
                Download audio
              </a>
            </div>
          )}
        </div>
      )}

      {/* Note */}
      <div style={{
        ...sectionStyle,
        borderColor: 'rgba(255,209,102,0.35)',
        background: 'rgba(255,209,102,0.06)',
        marginBottom: 0,
      }}>
        <p style={{ color: '#ffd166', fontSize: 13, margin: 0 }}>
          ACE-Step API must be running on port 8001. Use <code style={{ background: '#1a1a3a', padding: '2px 6px', borderRadius: 4 }}>start_acestep.bat</code> to start it.
        </p>
      </div>
    </div>
  );
}
