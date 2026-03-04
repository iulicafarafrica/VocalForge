import { useState, useRef, useEffect } from 'react';

const API_BASE = 'http://localhost:8000';

const StyleTransferTab = ({ addLog }) => {
  // Style Influence state
  const [styleFile, setStyleFile] = useState(null);
  const [stylePrompt, setStylePrompt] = useState('');
  const [styleLyrics, setStyleLyrics] = useState('');
  const [styleStrength, setStyleStrength] = useState(0.7);
  const [styleDuration, setStyleDuration] = useState(30);
  const [styleBpm, setStyleBpm] = useState('');
  const [styleGenerating, setStyleGenerating] = useState(false);
  const [styleProgress, setStyleProgress] = useState('');
  
  // Audio Influence (Cover) state
  const [coverFile, setCoverFile] = useState(null);
  const [coverPrompt, setCoverPrompt] = useState('');
  const [coverLyrics, setCoverLyrics] = useState('');
  const [coverStrength, setCoverStrength] = useState(0);
  const [coverNoiseStrength, setCoverNoiseStrength] = useState(0);
  const [coverDuration, setCoverDuration] = useState(30);
  const [coverBpm, setCoverBpm] = useState('');
  const [coverGenerating, setCoverGenerating] = useState(false);
  const [coverProgress, setCoverProgress] = useState('');
  
  // Results
  const [styleResult, setStyleResult] = useState(null);
  const [coverResult, setCoverResult] = useState(null);
  const [styleError, setStyleError] = useState('');
  const [coverError, setCoverError] = useState('');
  
  // Active tab
  const [activeSubTab, setActiveSubTab] = useState('style');
  
  // Connection status
  const [apiConnected, setApiConnected] = useState(null);
  
  const styleFileInputRef = useRef(null);
  const coverFileInputRef = useRef(null);
  
  // Check API connection on mount
  const checkApiConnection = async () => {
    try {
      const response = await fetch(`${API_BASE}/ace_health`, {
        method: 'GET',
      });
      if (response.ok) {
        const data = await response.json();
        setApiConnected(data.online === true);
      } else {
        setApiConnected(false);
      }
    } catch (err) {
      setApiConnected(false);
    }
  };
  
  // Check connection on mount
  useEffect(() => {
    checkApiConnection();
    // Also load stats when connected
    const interval = setInterval(() => {
      if (apiConnected) loadServerStats();
    }, 5000);
    return () => clearInterval(interval);
  }, [apiConnected]);

  // Server stats state
  const [serverStats, setServerStats] = useState(null);

  // Load server stats
  const loadServerStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/acestep/stats`);
      const data = await res.json();
      if (!data.error) {
        setServerStats(data);
      }
    } catch (e) {
      // Ignore stats errors
    }
  };

  // Format stats for display
  const formatStats = () => {
    if (!serverStats) return null;
    
    const items = [];
    if (serverStats.queue !== undefined) items.push(`Queue: ${serverStats.queue}`);
    if (serverStats.jobs_running !== undefined) items.push(`Running: ${serverStats.jobs_running}`);
    if (serverStats.jobs_done !== undefined) items.push(`Done: ${serverStats.jobs_done}`);
    if (serverStats.gpu_memory !== undefined) items.push(`VRAM: ${serverStats.gpu_memory}`);
    
    return items.length > 0 ? items.join(' · ') : null;
  };

  // Handle file selection
  const handleStyleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setStyleFile(file);
      setStyleError('');
    }
  };

  const handleCoverFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverFile(file);
      setCoverError('');
    }
  };

  // Style Influence generation (text2music cu referință audio)
  const generateStyleInfluence = async () => {
    if (!styleFile) {
      setStyleError('Please select a reference audio file');
      return;
    }

    setStyleGenerating(true);
    setStyleError('');
    setStyleResult(null);
    setStyleProgress('Starting generation...');
    if (addLog) addLog('[STYLE] Starting style influence generation...');

    try {
      const formData = new FormData();
      formData.append('prompt', stylePrompt || 'instrumental music');
      formData.append('lyrics', styleLyrics);
      formData.append('duration', styleDuration.toString());
      if (styleBpm) formData.append('bpm', styleBpm);
      formData.append('source_audio', styleFile);
      formData.append('source_audio_strength', styleStrength.toString());
      formData.append('task_type', 'text2music');

      setStyleProgress('Processing...');
      
      const response = await fetch(`${API_BASE}/ace_generate`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok || data.error) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      if (data.status === 'ok' && data.url) {
        setStyleResult([{
          url: data.url,
          duration: data.duration_sec,
          metadata: data.metadata
        }]);
        setStyleProgress('Done!');
        if (addLog) addLog('[STYLE] Generation complete!');
      } else {
        throw new Error('No audio URL in response');
      }

    } catch (err) {
      console.error('Style Influence error:', err);
      setStyleError(err.message || 'Generation failed');
      if (addLog) addLog(`[ERR] Style: ${err.message}`);
    } finally {
      setStyleGenerating(false);
      if (!styleResult) setStyleProgress('');
    }
  };

  // Audio Influence (Cover) generation
  const generateCover = async () => {
    if (!coverFile) {
      setCoverError('Please select a source audio file');
      return;
    }

    setCoverGenerating(true);
    setCoverError('');
    setCoverResult(null);
    setCoverProgress('Starting generation...');
    if (addLog) addLog('[COVER] Starting audio cover generation...');

    try {
      const formData = new FormData();
      formData.append('prompt', coverPrompt || 'cover this song');
      formData.append('lyrics', coverLyrics);
      formData.append('duration', coverDuration.toString());
      if (coverBpm) formData.append('bpm', coverBpm);
      formData.append('source_audio', coverFile);
      formData.append('source_audio_strength', coverStrength.toString());
      formData.append('noise_strength', coverNoiseStrength.toString());
      formData.append('task_type', 'cover');

      setCoverProgress('Processing...');
      
      const response = await fetch(`${API_BASE}/ace_generate`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok || data.error) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      if (data.status === 'ok' && data.url) {
        setCoverResult([{
          url: data.url,
          duration: data.duration_sec,
          metadata: data.metadata
        }]);
        setCoverProgress('Done!');
        if (addLog) addLog('[COVER] Generation complete!');
      } else {
        throw new Error('No audio URL in response');
      }

    } catch (err) {
      console.error('Cover error:', err);
      setCoverError(err.message || 'Generation failed');
      if (addLog) addLog(`[ERR] Cover: ${err.message}`);
    } finally {
      setCoverGenerating(false);
      if (!coverResult) setCoverProgress('');
    }
  };

  // Format duration display
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Styles
  const containerStyle = {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
  };

  const titleStyle = {
    fontSize: '28px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #f72585, #7209b7)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '1px',
  };

  const tabContainerStyle = {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    padding: '4px',
    background: 'rgba(13, 13, 34, 0.6)',
    borderRadius: '12px',
    width: 'fit-content',
  };

  const tabStyle = (active) => ({
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    background: active 
      ? 'linear-gradient(135deg, #f72585, #7209b7)'
      : 'transparent',
    color: active ? '#fff' : '#8888aa',
    boxShadow: active ? '0 4px 15px rgba(247, 37, 133, 0.3)' : 'none',
  });

  const cardStyle = {
    background: 'linear-gradient(180deg, rgba(13, 13, 34, 0.8) 0%, rgba(8, 8, 18, 0.9) 100%)',
    borderRadius: '16px',
    border: '1px solid rgba(247, 37, 133, 0.2)',
    padding: '24px',
    marginBottom: '20px',
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px',
  };

  const uploadZoneStyle = (hasFile) => ({
    border: `2px dashed ${hasFile ? '#06d6a0' : '#333366'}`,
    borderRadius: '12px',
    padding: '32px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    background: hasFile ? 'rgba(6, 214, 160, 0.05)' : 'rgba(51, 51, 102, 0.1)',
  });

  const inputStyle = {
    width: '100%',
    background: 'rgba(51, 51, 102, 0.2)',
    border: '1px solid #333366',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#e0e0ff',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  };

  const textareaStyle = {
    ...inputStyle,
    resize: 'vertical',
    minHeight: '80px',
  };

  const labelStyle = {
    display: 'block',
    color: '#aaaacc',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '8px',
  };

  const sliderContainerStyle = {
    marginBottom: '16px',
  };

  const sliderStyle = {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    background: 'linear-gradient(90deg, #333366, #f72585)',
    outline: 'none',
    cursor: 'pointer',
  };

  const buttonStyle = (disabled) => ({
    width: '100%',
    padding: '14px 24px',
    borderRadius: '10px',
    border: 'none',
    fontSize: '15px',
    fontWeight: '600',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.3s ease',
    background: disabled 
      ? '#333355'
      : 'linear-gradient(135deg, #f72585, #7209b7)',
    color: disabled ? '#666688' : '#fff',
    boxShadow: disabled ? 'none' : '0 4px 20px rgba(247, 37, 133, 0.4)',
  });

  const resultCardStyle = {
    background: 'rgba(51, 51, 102, 0.2)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #333366',
  };

  const errorStyle = {
    background: 'rgba(230, 57, 70, 0.1)',
    border: '1px solid rgba(230, 57, 70, 0.3)',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#ff6b6b',
    fontSize: '14px',
  };

  const progressStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    background: 'rgba(247, 37, 133, 0.1)',
    borderRadius: '8px',
    color: '#f72585',
    fontSize: '14px',
  };

  const infoBoxStyle = {
    background: 'rgba(51, 51, 102, 0.2)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #333366',
  };

  const renderStyleInfluence = () => (
    <div style={cardStyle}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#f72585', marginBottom: '8px' }}>
          🎭 Style Influence
        </h3>
        <p style={{ color: '#8888aa', fontSize: '14px' }}>
          Upload a reference audio to influence the style of new music generation
        </p>
      </div>

      <div style={gridStyle}>
        {/* Left Column - Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Upload Zone */}
          <div>
            <label style={labelStyle}>Reference Audio (Style Source) *</label>
            <div 
              style={uploadZoneStyle(styleFile)}
              onClick={() => styleFileInputRef.current?.click()}
              onMouseEnter={(e) => {
                if (!styleFile) e.currentTarget.style.borderColor = '#f72585';
              }}
              onMouseLeave={(e) => {
                if (!styleFile) e.currentTarget.style.borderColor = '#333366';
              }}
            >
              <input
                ref={styleFileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleStyleFileChange}
                style={{ display: 'none' }}
              />
              {styleFile ? (
                <div>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎵</div>
                  <div style={{ color: '#06d6a0', fontWeight: '500' }}>{styleFile.name}</div>
                  <div style={{ color: '#666688', fontSize: '12px', marginTop: '4px' }}>Click to change</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📁</div>
                  <div style={{ color: '#8888aa' }}>Click to select audio file</div>
                  <div style={{ color: '#555577', fontSize: '12px', marginTop: '4px' }}>MP3, WAV, FLAC supported</div>
                </div>
              )}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label style={labelStyle}>Style Description (optional)</label>
            <textarea
              value={stylePrompt}
              onChange={(e) => setStylePrompt(e.target.value)}
              placeholder="e.g., 'Electronic dance music with heavy bass'"
              style={textareaStyle}
              onFocus={(e) => e.target.style.borderColor = '#f72585'}
              onBlur={(e) => e.target.style.borderColor = '#333366'}
            />
          </div>

          {/* Lyrics */}
          <div>
            <label style={labelStyle}>Lyrics (optional)</label>
            <textarea
              value={styleLyrics}
              onChange={(e) => setStyleLyrics(e.target.value)}
              placeholder="Enter lyrics or leave empty for instrumental"
              style={{ ...textareaStyle, minHeight: '100px' }}
              onFocus={(e) => e.target.style.borderColor = '#f72585'}
              onBlur={(e) => e.target.style.borderColor = '#333366'}
            />
          </div>

          {/* Settings Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Strength Slider */}
            <div style={sliderContainerStyle}>
              <label style={labelStyle}>Style Strength: {styleStrength.toFixed(2)}</label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={styleStrength}
                onChange={(e) => setStyleStrength(parseFloat(e.target.value))}
                style={sliderStyle}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666688', marginTop: '4px' }}>
                <span>Subtle</span>
                <span>Strong</span>
              </div>
            </div>

            {/* Duration Slider */}
            <div style={sliderContainerStyle}>
              <label style={labelStyle}>Duration: {formatDuration(styleDuration)}</label>
              <input
                type="range"
                min="10"
                max="300"
                step="5"
                value={styleDuration}
                onChange={(e) => setStyleDuration(parseInt(e.target.value))}
                style={sliderStyle}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666688', marginTop: '4px' }}>
                <span>10s</span>
                <span>5min</span>
              </div>
            </div>
          </div>

          {/* BPM */}
          <div>
            <label style={labelStyle}>BPM (optional)</label>
            <input
              type="number"
              value={styleBpm}
              onChange={(e) => setStyleBpm(e.target.value)}
              placeholder="Auto-detect from reference"
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = '#f72585'}
              onBlur={(e) => e.target.style.borderColor = '#333366'}
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={generateStyleInfluence}
            disabled={styleGenerating || !styleFile}
            style={buttonStyle(styleGenerating || !styleFile)}
          >
            {styleGenerating ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <svg style={{ animation: 'spin 1s linear infinite', width: '20px', height: '20px' }} viewBox="0 0 24 24">
                  <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </span>
            ) : (
              '🎭 Generate Style-Influenced Music'
            )}
          </button>

          {/* Progress */}
          {styleGenerating && styleProgress && (
            <div style={progressStyle}>
              <svg style={{ animation: 'spin 1s linear infinite', width: '16px', height: '16px' }} viewBox="0 0 24 24">
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {styleProgress}
            </div>
          )}

          {/* Error */}
          {styleError && (
            <div style={errorStyle}>
              ⚠️ {styleError}
            </div>
          )}
        </div>

        {/* Right Column - Result */}
        <div>
          <label style={labelStyle}>Generated Result</label>
          {styleResult && styleResult.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {styleResult.map((audio, index) => (
                <div key={index} style={resultCardStyle}>
                  {audio.url && (
                    <audio
                      controls
                      src={`${API_BASE}${audio.url}`}
                      style={{ width: '100%', marginBottom: '8px' }}
                    />
                  )}
                  <div style={{ fontSize: '12px', color: '#8888aa' }}>
                    {audio.duration && <span>Duration: {audio.duration}s</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ 
              ...resultCardStyle, 
              textAlign: 'center', 
              padding: '48px',
              borderStyle: 'dashed'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>🎵</div>
              <div style={{ color: '#666688' }}>Generated music will appear here</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderAudioCover = () => (
    <div style={cardStyle}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#7209b7', marginBottom: '8px' }}>
          🎵 Audio Cover / Remix
        </h3>
        <p style={{ color: '#8888aa', fontSize: '14px' }}>
          Create a cover or remix of an existing audio with a new style
        </p>
      </div>

      <div style={gridStyle}>
        {/* Left Column - Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Upload Zone */}
          <div>
            <label style={labelStyle}>Source Audio to Cover *</label>
            <div 
              style={uploadZoneStyle(coverFile)}
              onClick={() => coverFileInputRef.current?.click()}
              onMouseEnter={(e) => {
                if (!coverFile) e.currentTarget.style.borderColor = '#7209b7';
              }}
              onMouseLeave={(e) => {
                if (!coverFile) e.currentTarget.style.borderColor = '#333366';
              }}
            >
              <input
                ref={coverFileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleCoverFileChange}
                style={{ display: 'none' }}
              />
              {coverFile ? (
                <div>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎵</div>
                  <div style={{ color: '#06d6a0', fontWeight: '500' }}>{coverFile.name}</div>
                  <div style={{ color: '#666688', fontSize: '12px', marginTop: '4px' }}>Click to change</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📁</div>
                  <div style={{ color: '#8888aa' }}>Click to select audio file</div>
                  <div style={{ color: '#555577', fontSize: '12px', marginTop: '4px' }}>MP3, WAV, FLAC supported</div>
                </div>
              )}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label style={labelStyle}>New Style Description</label>
            <textarea
              value={coverPrompt}
              onChange={(e) => setCoverPrompt(e.target.value)}
              placeholder="e.g., 'Jazz version with saxophone' or 'Rock cover with electric guitars'"
              style={textareaStyle}
              onFocus={(e) => e.target.style.borderColor = '#7209b7'}
              onBlur={(e) => e.target.style.borderColor = '#333366'}
            />
          </div>

          {/* Lyrics */}
          <div>
            <label style={labelStyle}>New Lyrics (optional)</label>
            <textarea
              value={coverLyrics}
              onChange={(e) => setCoverLyrics(e.target.value)}
              placeholder="Leave empty to keep original lyrics"
              style={{ ...textareaStyle, minHeight: '100px' }}
              onFocus={(e) => e.target.style.borderColor = '#7209b7'}
              onBlur={(e) => e.target.style.borderColor = '#333366'}
            />
          </div>

          {/* Settings Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Cover Strength Slider */}
            <div style={sliderContainerStyle}>
              <label style={labelStyle}>Cover Strength: {coverStrength.toFixed(1)}</label>
              <input
                type="range"
                min="0"
                max="1.0"
                step="0.1"
                value={coverStrength}
                onChange={(e) => setCoverStrength(parseFloat(e.target.value))}
                style={{ ...sliderStyle, background: 'linear-gradient(90deg, #333366, #7209b7)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666688', marginTop: '4px' }}>
                <span>Loose</span>
                <span>Faithful</span>
              </div>
            </div>

            {/* Noise Strength Slider */}
            <div style={sliderContainerStyle}>
              <label style={labelStyle}>Noise/Diffusion: {coverNoiseStrength.toFixed(2)}</label>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={coverNoiseStrength}
                onChange={(e) => setCoverNoiseStrength(parseFloat(e.target.value))}
                style={{ ...sliderStyle, background: 'linear-gradient(90deg, #333366, #00e5ff)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666688', marginTop: '4px' }}>
                <span>Clean</span>
                <span>Noisy</span>
              </div>
            </div>
          </div>

          {/* Duration Slider - Full Width */}
          <div style={sliderContainerStyle}>
            <label style={labelStyle}>Duration: {formatDuration(coverDuration)}</label>
            <input
              type="range"
              min="10"
              max="300"
              step="5"
              value={coverDuration}
              onChange={(e) => setCoverDuration(parseInt(e.target.value))}
              style={{ ...sliderStyle, background: 'linear-gradient(90deg, #333366, #7209b7)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666688', marginTop: '4px' }}>
              <span>10s</span>
              <span>5min</span>
            </div>
          </div>

          {/* BPM */}
          <div>
            <label style={labelStyle}>BPM (optional)</label>
            <input
              type="number"
              value={coverBpm}
              onChange={(e) => setCoverBpm(e.target.value)}
              placeholder="Auto-detect from source"
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = '#7209b7'}
              onBlur={(e) => e.target.style.borderColor = '#333366'}
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={generateCover}
            disabled={coverGenerating || !coverFile}
            style={{ ...buttonStyle(coverGenerating || !coverFile), background: coverGenerating || !coverFile ? '#333355' : 'linear-gradient(135deg, #7209b7, #560bad)' }}
          >
            {coverGenerating ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <svg style={{ animation: 'spin 1s linear infinite', width: '20px', height: '20px' }} viewBox="0 0 24 24">
                  <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating Cover...
              </span>
            ) : (
              '🎵 Generate Cover / Remix'
            )}
          </button>

          {/* Progress */}
          {coverGenerating && coverProgress && (
            <div style={{ ...progressStyle, background: 'rgba(114, 9, 183, 0.1)', color: '#7209b7' }}>
              <svg style={{ animation: 'spin 1s linear infinite', width: '16px', height: '16px' }} viewBox="0 0 24 24">
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {coverProgress}
            </div>
          )}

          {/* Error */}
          {coverError && (
            <div style={errorStyle}>
              ⚠️ {coverError}
            </div>
          )}
        </div>

        {/* Right Column - Result */}
        <div>
          <label style={labelStyle}>Generated Cover</label>
          {coverResult && coverResult.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {coverResult.map((audio, index) => (
                <div key={index} style={resultCardStyle}>
                  {audio.url && (
                    <audio
                      controls
                      src={`${API_BASE}${audio.url}`}
                      style={{ width: '100%', marginBottom: '8px' }}
                    />
                  )}
                  <div style={{ fontSize: '12px', color: '#8888aa' }}>
                    {audio.duration && <span>Duration: {audio.duration}s</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ 
              ...resultCardStyle, 
              textAlign: 'center', 
              padding: '48px',
              borderStyle: 'dashed'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>🎵</div>
              <div style={{ color: '#666688' }}>Cover will appear here</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #f72585, #7209b7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
        }}>
          🎨
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={titleStyle}>Style & Audio Transfer</h2>
          <div style={{ color: '#666688', fontSize: '13px' }}>Transform music with AI-powered style transfer</div>
        </div>
        
        {/* Server Stats */}
        {serverStats && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: 'rgba(6, 214, 160, 0.1)',
            border: '1px solid rgba(6, 214, 160, 0.3)',
            borderRadius: '8px',
            fontSize: '11px',
            color: '#06d6a0',
            fontFamily: 'monospace',
          }}>
            📊 {formatStats()}
          </div>
        )}
        
        {/* Refresh Stats Button */}
        <button
          onClick={loadServerStats}
          style={{
            background: '#1a1a2e',
            border: '1px solid #2a2a4a',
            color: '#6666aa',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '11px',
            cursor: 'pointer',
            marginLeft: '8px',
          }}
          title="Refresh stats"
        >
          ↻
        </button>
      </div>

      {/* Tab Switcher */}
      <div style={tabContainerStyle}>
        <button
          onClick={() => setActiveSubTab('style')}
          style={tabStyle(activeSubTab === 'style')}
        >
          🎭 Style Influence
        </button>
        <button
          onClick={() => setActiveSubTab('cover')}
          style={tabStyle(activeSubTab === 'cover')}
        >
          🎵 Audio Cover
        </button>
      </div>

      {/* Content */}
      {activeSubTab === 'style' ? renderStyleInfluence() : renderAudioCover()}

      {/* Info Box */}
      <div style={infoBoxStyle}>
        <h4 style={{ color: '#aaaacc', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
          💡 Tips & Info
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          <div style={{ color: '#8888aa', fontSize: '13px', lineHeight: '1.6' }}>
            <strong style={{ color: '#f72585' }}>Style Influence:</strong> Upload a reference track to influence the style of new music. Higher strength = more similar to reference.
          </div>
          <div style={{ color: '#8888aa', fontSize: '13px', lineHeight: '1.6' }}>
            <strong style={{ color: '#7209b7' }}>Audio Cover:</strong> Upload a song to create a cover/remix in a new style. The melody and structure will be preserved.
          </div>
          <div style={{ color: '#8888aa', fontSize: '13px', lineHeight: '1.6' }}>
            <strong style={{ color: '#06d6a0' }}>Duration:</strong> Longer tracks take more time to generate. Start with 30-60 seconds for testing.
          </div>
          <div style={{ color: '#8888aa', fontSize: '13px', lineHeight: '1.6' }}>
            <strong style={{ color: '#00e5ff' }}>BPM:</strong> Leave empty to auto-detect from the audio, or set manually for specific tempo.
          </div>
        </div>
      </div>
    </div>
  );
};

export default StyleTransferTab;