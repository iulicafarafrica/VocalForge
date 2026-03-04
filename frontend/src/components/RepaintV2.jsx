/**
 * RepaintV2 Tab
 * Advanced In-painting/Repaint functionality
 * Regenerate specific sections of audio tracks
 */

import React, { useState, useRef, useEffect } from 'react';

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

export default function RepaintV2({ addLog }) {
  // File
  const [file, setFile] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const fileInputRef = useRef(null);

  // Repaint Region
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(30);
  const [regionPrompt, setRegionPrompt] = useState('');

  // Prompt & Lyrics
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState('');

  // Music Attributes
  const [bpm, setBpm] = useState(0);
  const [keyScale, setKeyScale] = useState('');
  const [timeSignature, setTimeSignature] = useState('');
  const [audioFormat, setAudioFormat] = useState('mp3');

  // Generation Control
  const [inferSteps, setInferSteps] = useState(20);
  const [guidanceScale, setGuidanceScale] = useState(15.0);
  const [seed, setSeed] = useState(-1);
  const [useRandomSeed, setUseRandomSeed] = useState(true);

  // Advanced
  const [cfgStart, setCfgStart] = useState(0.0);
  const [cfgEnd, setCfgEnd] = useState(1.0);
  const [useTiledDecode, setUseTiledDecode] = useState(true);

  // Processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');

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

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);

      // Get audio duration
      const audio = new Audio();
      audio.onloadstart = () => {
        audio.onloadedmetadata = () => {
          setAudioDuration(Math.round(audio.duration));
          setEndTime(Math.min(30, Math.round(audio.duration)));
        };
      };
      audio.src = URL.createObjectURL(selectedFile);
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
    if (addLog) addLog('[REPAINT] Starting repaint task...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('task_type', 'repaint');
    
    // Repaint region
    formData.append('start_time', startTime.toString());
    formData.append('end_time', endTime.toString());
    
    // Prompts
    formData.append('prompt', prompt);
    formData.append('lyrics', lyrics);
    formData.append('region_prompt', regionPrompt);
    
    // Music attributes
    if (bpm > 0) formData.append('bpm', bpm.toString());
    if (keyScale) formData.append('key_scale', keyScale);
    if (timeSignature) formData.append('time_signature', timeSignature);
    formData.append('audio_format', audioFormat);
    
    // Generation control
    formData.append('inference_steps', inferSteps.toString());
    formData.append('guidance_scale', guidanceScale.toString());
    formData.append('use_random_seed', useRandomSeed.toString());
    if (!useRandomSeed) formData.append('seed', seed.toString());
    
    // Advanced
    formData.append('cfg_interval_start', cfgStart.toString());
    formData.append('cfg_interval_end', cfgEnd.toString());
    formData.append('use_tiled_decode', useTiledDecode.toString());
    
    // Model
    if (model) formData.append('model', model);

    try {
      setProgress('Processing repaint...');
      
      const response = await fetch(`${API_BASE}/acestep/repaint`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setResult(data);
      setProgress('Done!');
      setIsProcessing(false);
      if (addLog) addLog('[REPAINT] Repaint complete!');

    } catch (err) {
      setError(err.message);
      setProgress('');
      setIsProcessing(false);
      if (addLog) addLog(`[ERR] ${err.message}`);
    }
  };

  const setRegionPreset = (preset) => {
    if (!audioDuration) return;
    switch (preset) {
      case 'intro':
        setStartTime(0);
        setEndTime(Math.min(15, audioDuration));
        break;
      case 'verse':
        setStartTime(Math.min(15, audioDuration * 0.1));
        setEndTime(Math.min(45, audioDuration * 0.3));
        break;
      case 'chorus':
        setStartTime(Math.min(45, audioDuration * 0.3));
        setEndTime(Math.min(75, audioDuration * 0.5));
        break;
      case 'bridge':
        setStartTime(Math.min(audioDuration * 0.6, audioDuration - 30));
        setEndTime(Math.min(audioDuration * 0.8, audioDuration - 15));
        break;
      case 'outro':
        setStartTime(Math.max(0, audioDuration - 20));
        setEndTime(audioDuration);
        break;
      default:
        break;
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
          background: 'linear-gradient(135deg, #e0e0ff, #ff6b9d)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 4,
        }}>
          🖌️ Repaint V2
        </h2>
        <p style={{ color: '#444466', fontSize: 13 }}>
          Regenerate specific sections of your audio track
        </p>
      </div>

      {/* Description */}
      <div style={{ ...sectionStyle, borderLeft: '4px solid #ff6b9d' }}>
        <p style={{ color: '#a0a0cc', fontSize: 14, lineHeight: 1.55, margin: 0 }}>
          Select a portion of your track and regenerate it with new style or lyrics.
          Perfect for fixing sections, adding variations, or modifying specific parts
          without regenerating the entire track. Works with Turbo and Base models.
        </p>
      </div>

      {/* File Upload */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Source Audio</span>
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed #2a2a4a',
            borderRadius: 12,
            padding: 28,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.2s, background 0.2s',
            background: file ? '#0d0d22' : 'transparent',
          }}
        >
          {file ? (
            <div>
              <p style={{ color: '#e0e0ff', fontWeight: 600, marginBottom: 4 }}>🎵 {file.name}</p>
              <p style={{ color: '#6666aa', fontSize: 12 }}>
                {(file.size / 1024 / 1024).toFixed(2)} MB · Duration: {audioDuration}s · Click to change
              </p>
            </div>
          ) : (
            <div>
              <p style={{ color: '#6666aa', marginBottom: 4 }}>Click to select audio file</p>
              <p style={{ color: '#444466', fontSize: 12 }}>WAV, MP3, FLAC supported</p>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      {/* Repaint Region */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Repaint Region</span>
        
        {/* Quick Presets */}
        <div style={{ marginBottom: 16 }}>
          <span style={{ ...labelStyle, marginBottom: 8 }}>Quick Select</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['intro', 'verse', 'chorus', 'bridge', 'outro'].map(preset => (
              <button
                key={preset}
                onClick={() => setRegionPreset(preset)}
                disabled={!audioDuration}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid #2a2a4a',
                  background: 'transparent',
                  color: '#8888aa',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: audioDuration ? 'pointer' : 'not-allowed',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s',
                }}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Time Range */}
        <div style={gridStyle}>
          <div>
            <label style={{ ...labelStyle, marginBottom: 4 }}>Start Time (s)</label>
            <input
              type="number"
              min="0"
              max={audioDuration || 300}
              step="0.1"
              value={startTime}
              onChange={(e) => setStartTime(parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ ...labelStyle, marginBottom: 4 }}>End Time (s)</label>
            <input
              type="number"
              min="0"
              max={audioDuration || 300}
              step="0.1"
              value={endTime}
              onChange={(e) => setEndTime(parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Region Duration Display */}
        <div style={{ marginTop: 12, padding: '8px 12px', background: '#0a0a1a', borderRadius: 8 }}>
          <span style={{ color: '#8888aa', fontSize: 12 }}>
            Region Duration: <span style={{ color: '#ff6b9d', fontWeight: 700 }}>{(endTime - startTime).toFixed(1)}s</span>
            {audioDuration > 0 && (
              <span style={{ marginLeft: 12 }}>
                of {audioDuration}s total
              </span>
            )}
          </span>
        </div>

        {/* Region-specific prompt */}
        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>Region Prompt (optional)</label>
          <textarea
            value={regionPrompt}
            onChange={(e) => setRegionPrompt(e.target.value)}
            placeholder="Describe how the repainted section should sound..."
            style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
          />
        </div>
      </div>

      {/* Style & Lyrics */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Style & Lyrics</span>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ ...labelStyle, marginBottom: 4 }}>Style Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. 80s synthwave, upbeat, female vocals..."
            style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
          />
        </div>

        <div>
          <label style={labelStyle}>Lyrics for Repainted Section (optional)</label>
          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder="[Verse]&#10;New lyrics for this section..."
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
          />
        </div>
      </div>

      {/* Music Attributes */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Music Attributes</span>
        <div style={grid3Style}>
          <div>
            <label style={{ ...labelStyle, marginBottom: 4 }}>BPM</label>
            <input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(parseInt(e.target.value) || 0)}
              placeholder="auto"
              min="30"
              max="300"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ ...labelStyle, marginBottom: 4 }}>Key</label>
            <input
              type="text"
              value={keyScale}
              onChange={(e) => setKeyScale(e.target.value)}
              placeholder="C major"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ ...labelStyle, marginBottom: 4 }}>Time Sig.</label>
            <select
              value={timeSignature}
              onChange={(e) => setTimeSignature(e.target.value)}
              style={inputStyle}
            >
              <option value="">Auto</option>
              <option value="4">4/4</option>
              <option value="3">3/4</option>
              <option value="6">6/8</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={{ ...labelStyle, marginBottom: 4 }}>Output Format</label>
          <select value={audioFormat} onChange={(e) => setAudioFormat(e.target.value)} style={inputStyle}>
            <option value="mp3">MP3</option>
            <option value="flac">FLAC</option>
            <option value="wav">WAV</option>
          </select>
        </div>
      </div>

      {/* Generation Control */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Generation Control</span>
        
        <div style={gridStyle}>
          <div>
            <label style={{ ...labelStyle, marginBottom: 4 }}>Inference Steps</label>
            <input
              type="number"
              value={inferSteps}
              onChange={(e) => setInferSteps(parseInt(e.target.value) || 20)}
              min="4"
              max="50"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ ...labelStyle, marginBottom: 4 }}>CFG Scale</label>
            <input
              type="number"
              value={guidanceScale}
              onChange={(e) => setGuidanceScale(parseFloat(e.target.value) || 15)}
              min="1"
              max="30"
              step="0.5"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Seed */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: '#8888aa', fontSize: 12 }}>🎲 Seed</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={useRandomSeed}
                onChange={(e) => setUseRandomSeed(e.target.checked)}
                style={{ accentColor: '#ff6b9d' }}
              />
              <span style={{ color: '#6666aa', fontSize: 11 }}>Random</span>
            </label>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value) || -1)}
              disabled={useRandomSeed}
              style={{ ...inputStyle, opacity: useRandomSeed ? 0.4 : 1 }}
            />
            <button
              onClick={() => setSeed(Math.floor(Math.random() * 999999))}
              disabled={useRandomSeed}
              style={{
                background: '#0a0a1a',
                color: '#8888aa',
                border: '1px solid #2a2a4a',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 11,
                cursor: useRandomSeed ? 'not-allowed' : 'pointer',
              }}
            >
              🎲
            </button>
          </div>
        </div>

        {/* CFG Interval */}
        <div style={{ ...gridStyle, marginTop: 16 }}>
          <div>
            <label style={{ ...labelStyle, marginBottom: 4 }}>CFG Start</label>
            <input
              type="number"
              value={cfgStart}
              onChange={(e) => setCfgStart(parseFloat(e.target.value) || 0)}
              min="0"
              max="1"
              step="0.05"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ ...labelStyle, marginBottom: 4 }}>CFG End</label>
            <input
              type="number"
              value={cfgEnd}
              onChange={(e) => setCfgEnd(parseFloat(e.target.value) || 1)}
              min="0"
              max="1"
              step="0.05"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Tiled Decode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <div
            onClick={() => setUseTiledDecode(!useTiledDecode)}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              width: 36,
              height: 20,
              background: useTiledDecode ? '#ff6b9d' : '#3a3a3a',
              borderRadius: 10,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <div style={{
              position: 'absolute',
              left: useTiledDecode ? 18 : 2,
              width: 16,
              height: 16,
              background: '#fff',
              borderRadius: '50%',
              transition: 'left 0.2s',
            }} />
          </div>
          <span style={{ color: '#8888aa', fontSize: 11 }}>Tiled Decode (saves VRAM)</span>
        </div>
      </div>

      {/* Model Selection */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Model Selection</span>
        <select value={model} onChange={(e) => setModel(e.target.value)} style={inputStyle}>
          <option value="">Default (server selected)</option>
          {models.map(m => (
            <option key={m.name} value={m.name}>
              {m.name}{m.is_default ? ' ★' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div style={{ ...sectionStyle, borderColor: '#e63946', background: 'rgba(230,57,70,0.08)' }}>
          <p style={{ color: '#e63946', fontSize: 14 }}>{error}</p>
        </div>
      )}

      {/* Progress */}
      {progress && !error && (
        <div style={{ ...sectionStyle, borderColor: '#00e5ff', background: 'rgba(0,229,255,0.06)' }}>
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
            : 'linear-gradient(135deg, #ff6b9d, #9b2de0)',
          color: isProcessing || !file ? '#444466' : '#080812',
          fontWeight: 700,
          fontSize: 15,
          cursor: isProcessing || !file ? 'not-allowed' : 'pointer',
          marginBottom: 24,
        }}
      >
        {isProcessing ? 'Processing…' : '🖌️ Repaint Section'}
      </button>

      {/* Results */}
      {result && (
        <div style={{ ...sectionStyle, borderLeft: '4px solid #06d6a0' }}>
          <span style={{ ...labelStyle, color: '#06d6a0' }}>Result</span>
          <div style={{ color: '#a0a0cc', fontSize: 13, marginBottom: 16 }}>
            <p style={{ marginBottom: 4 }}>Duration: {result.duration_sec}s</p>
            <p style={{ marginBottom: 4 }}>Processing time: {result.processing_time_sec}s</p>
            {result.seed !== undefined && (
              <p style={{ marginBottom: 4 }}>
                🎲 Seed: <span style={{ color: '#c77dff', fontFamily: 'monospace', fontWeight: 700 }}>{result.seed}</span>
                <button
                  onClick={() => { setSeed(result.seed); setUseRandomSeed(false); }}
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
                >
                  Use
                </button>
              </p>
            )}
          </div>
          {result.url && (
            <>
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
                }}
              >
                Download Repainted Audio
              </a>
            </>
          )}
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