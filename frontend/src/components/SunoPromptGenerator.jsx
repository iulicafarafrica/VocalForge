import { useState, useRef } from "react";

const API = "http://localhost:8000";

// Data from ER-Suno-PromptGenerator (adapted)
const GENRES = [
  'Pop', 'Electronic', 'Rock', 'Hip-Hop', 'Jazz', 'Classical', 'R&B', 'Country', 'Lo-Fi', 'EDM', 'Acoustic',
  'Indie', 'Alternative', 'Folk', 'Soul', 'Funk', 'Blues', 'Reggae', 'Punk', 'Disco', 'House', 'Techno',
  'Trance', 'Dubstep', 'Drum and Bass', 'Synthwave', 'Ambient', 'Trap', 'K-Pop', 'J-Pop'
];

const METAL_SUBGENRES = [
  'Heavy Metal', 'Thrash Metal', 'Death Metal', 'Black Metal', 'Power Metal', 'Doom Metal', 'Symphonic Metal',
  'Progressive Metal', 'Nu Metal', 'Folk Metal', 'Metalcore', 'Deathcore', 'Industrial Metal', 'Groove Metal',
  'Gothic Metal', 'Sludge Metal', 'Post-Metal', 'Djent'
];

const STYLES = [
  'Upbeat', 'Energetic', 'Slow', 'Emotional', 'Aggressive', 'Melancholic', 'Atmospheric', 'Epic', 'Dark',
  'Happy', 'Sad', 'Chill', 'Ambient', 'Fast', 'Heavy', 'Driving', 'Groovy', 'Soothing', 'Dreamy', 'Intense',
  'Romantic', 'Mysterious', 'Euphoric', 'Uplifting', 'Nostalgic', 'Funky', 'Raw', 'Polished'
];

const BPMS = ['80 BPM', '100 BPM', '120 BPM', '140 BPM', '160 BPM', '180 BPM', '200 BPM'];

const TAGS = [
  '[Intro]', '[Verse]', '[Pre-Chorus]', '[Chorus]', '[Bridge]', '[Guitar Solo]', '[Drop]', '[Build-up]',
  '[Breakdown]', '[Outro]', '[Fast Tempo]', '[Slow Tempo]', '[Upbeat]', '[Acoustic]', '[Epic]', '[Intimate]',
  '[Female Vocals]', '[Male Vocals]', '[Instrumental]', '[Bass Drop]', '[Beat Drop]', '[Vocalization]',
  '[Choir]', '[Orchestral]', '[Synth Solo]', '[Drum Fill]', '[Fade Out]', '[Acapella]', '[End]'
];

const TOOLTIPS = {
  // Styles
  'Upbeat': 'Positive, cheerful, and fast-paced.',
  'Energetic': 'High-intensity, lively, and driving.',
  'Slow': 'Unrushed, relaxed, and deliberate pace.',
  'Emotional': 'Expressive, deeply feeling, and moving.',
  'Aggressive': 'Fierce, intense, and forceful.',
  'Melancholic': 'Sorrowful, pensive, and sad.',
  'Atmospheric': 'Focuses on mood, texture, and spatial audio.',
  'Epic': 'Grand, monumental, and cinematic.',
  'Dark': 'Ominous, gloomy, or brooding tone.',
  'Happy': 'Joyful, bright, and positive.',
  'Sad': 'Sorrowful, downbeat, and expressing grief.',
  'Chill': 'Relaxing, laid-back, and easygoing.',
  'Ambient': 'Background-focused, texture-heavy, no strict beat.',
  'Fast': 'Quick tempo, rapid delivery.',
  'Heavy': 'Thick texture, often loud, distorted, or bass-heavy.',
  'Driving': 'Relentless forward momentum in rhythm.',
  'Groovy': 'Rhythmic feel that strongly invites dancing or movement.',
  'Soothing': 'Calming, gentle, and peaceful.',
  'Dreamy': 'Ethereal, surreal, and smooth.',
  'Intense': 'Extreme emotion or volume; highly focused.',
  'Romantic': 'Expressing love or deep affection.',
  'Mysterious': 'Enigmatic, suspenseful, and secretive.',
  'Euphoric': 'Intensely happy, soaring, and ecstatic.',
  'Uplifting': 'Inspiring hope, elevation, and optimism.',
  'Nostalgic': 'Evocative of the past, sentimental.',
  'Funky': 'Syncopated, bass-forward, and bouncy.',
  'Raw': 'Unpolished, authentic, and gritty.',
  'Polished': 'Clean, highly produced, and perfect.',
  // Tags
  '[Intro]': 'The opening section of the song before the main vocals.',
  '[Verse]': 'The main storytelling section; melody is often consistent while lyrics change.',
  '[Pre-Chorus]': 'Builds tension and transitions from the verse to the chorus.',
  '[Chorus]': 'The memorable, repeating core message and melody of the song.',
  '[Bridge]': 'A contrasting section to introduce new musical ideas, often near the end.',
  '[Guitar Solo]': 'An instrumental section featuring a lead guitar.',
  '[Drop]': 'The climax of an electronic track, featuring heavy bass and beats.',
  '[Build-up]': 'A section of rising tension and increasing speed, usually before a drop.',
  '[Breakdown]': 'A stripped-back section where most instruments drop out to rebuild energy.',
  '[Outro]': 'The closing, fading section of the song.',
  '[Fast Tempo]': 'Instruction to suddenly increase the speed of the song.',
  '[Slow Tempo]': 'Instruction to suddenly decrease the speed or stretch out the timing.',
  '[Upbeat]': 'Instruction to shift to a happier, bouncy rhythm.',
  '[Acoustic]': 'Instruction to switch to non-electronic, organic instruments.',
  '[Epic]': 'Instruction to shift to a massive, cinematic arrangement.',
  '[Intimate]': 'Instruction to bring the vocals closer and quiet the instruments.',
  '[Female Vocals]': 'Request female singer.',
  '[Male Vocals]': 'Request male singer.',
  '[Instrumental]': 'Request a section (or whole song) without any vocals.',
  '[Bass Drop]': 'A sudden, heavy impact of sub-bass frequencies.',
  '[Beat Drop]': 'The moment the full rhythm section kicks in.',
  '[Vocalization]': 'Non-lyrical singing (e.g., "oohs", "aahs").',
  '[Choir]': 'A group of voices singing in harmony.',
  '[Orchestral]': 'Instruction to bring in classical string and brass sections.',
  '[Synth Solo]': 'An instrumental section featuring an electronic synthesizer.',
  '[Drum Fill]': 'A short flourish played on the drums to fill a gap.',
  '[Fade Out]': 'Instruction to gradually lower the volume to end the song.',
  '[Acapella]': 'Vocals only, completely without instrumental backing.',
  '[End]': 'Hard stop to officially terminate the song generation.'
};

const HELP_DATA = {
  genres: {
    title: "Genres",
    description: "Genres define the foundational sound and instrumental arrangement. Suno understands a wide variety of global genres. Combining them can lead to unique fusion styles.",
    url: "https://help.suno.com/",
    examples: [
      { title: "Synthwave Banger", template: "Synthwave, 80s, Electronic, Retrowave, Driving" },
      { title: "Acoustic Ballad", template: "Acoustic, Indie Folk, Intimate, Emotional, Guitar" }
    ]
  },
  metal: {
    title: "Metal Subgenres",
    description: "Highly specific subgenres in Metal dictate the vocal style (e.g. growls vs clean singing), guitar tuning, and drumming patterns.",
    url: "https://help.suno.com/",
    examples: [
      { title: "Epic Symphonic Metal", template: "Symphonic Metal, Operatic Female Vocals, Orchestral, Epic" },
      { title: "Aggressive Deathcore", template: "Deathcore, Breakdowns, Deep Growls, Blast Beats, Heavy" }
    ]
  },
  styles: {
    title: "Styles (Tone & Vibe)",
    description: "Styles act as adjectives to shape the mood, feeling, and energy of the chosen genres.",
    url: "https://help.suno.com/"
  },
  bpm: {
    title: "BPM (Beats Per Minute)",
    description: "Setting a specific BPM helps guide Suno's internal tempo generator.",
    url: "https://help.suno.com/"
  },
  tags: {
    title: "Structure Tags",
    description: "Metatags like [Verse], [Chorus], or [Drop] tell Suno's AI how to structure the song flow.",
    url: "https://help.suno.com/",
    examples: [
      { title: "Standard Pop Structure", template: "[Intro]\n(Instrumental build up)\n\n[Verse 1]\nWalking down the neon street...\n\n[Chorus]\nElectric love in the night!" },
      { title: "EDM Drop Structure", template: "[Intro]\nAtmospheric pads\n\n[Build-up]\nFaster drums, rising tension\n\n[Drop]\nHeavy bassline, energetic" }
    ]
  }
};

export default function SunoPromptGenerator({ addLog }) {
  const [text, setText] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedStyles, setSelectedStyles] = useState([]);
  const [selectedBpm, setSelectedBpm] = useState(null);
  const [genreFilter, setGenreFilter] = useState('');
  const [result, setResult] = useState(null);
  const [activeHelp, setActiveHelp] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);

  const toggleGenre = (genre) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const toggleStyle = (style) => {
    setSelectedStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  };

  const toggleBpm = (bpm) => {
    setSelectedBpm((prev) => (prev === bpm ? null : bpm));
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const insertTag = (tag) => {
    if (!textareaRef.current) return;

    let tagToInsert = tag;
    if (tag === '[Verse]') {
      const verseMatches = text.match(/\[Verse \d+\]/gi) || [];
      const nextVerseNum = verseMatches.length + 1;
      tagToInsert = `[Verse ${nextVerseNum}]`;
    }

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const newText = text.substring(0, start) + tagToInsert + text.substring(end);
    setText(newText);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + tagToInsert.length;
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleGenerate = async () => {
    try {
      const response = await fetch(`${API}/suno/prompt/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          genres: selectedGenres,
          styles: selectedStyles,
          bpm: selectedBpm
        })
      });
      const data = await response.json();
      setResult(data);
      setCopied(false);
      addLog?.(`[Prompt Generator] Generated prompt: ${data.style_prompt}`);
    } catch (error) {
      console.error("Error generating prompt:", error);
      addLog?.(`[ERR] Prompt Generator: ${error.message}`);
    }
  };

  const handleCopy = () => {
    if (result?.lyrics_formatted) {
      const fullPrompt = `${result.style_prompt}\n\n${result.lyrics_formatted}`;
      navigator.clipboard.writeText(fullPrompt).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleSendToSuno = () => {
    if (!result) return;
    // Store in localStorage for Suno tab to pick up
    localStorage.setItem('suno_prompt_from_generator', JSON.stringify({
      prompt: result.style_prompt,
      lyrics: result.lyrics_formatted
    }));
    addLog?.(`[Prompt Generator] Sent to Suno tab`);
    alert(`✅ Prompt sent to Suno tab!\n\nStyle: ${result.style_prompt}\n\nOpen the Suno AI tab and paste in Custom Mode.`);
  };

  const renderChips = (items, selected, toggleFn, sectionId, isInsert = false) => {
    const isExpanded = expandedSections[sectionId];
    const filteredItems = items.filter(i => i.toLowerCase().includes(genreFilter.toLowerCase()));
    const displayCount = 10;

    let itemsToDisplay = [];
    if (isExpanded) {
      itemsToDisplay = filteredItems;
    } else {
      const selectedFiltered = filteredItems.filter(i => selected.includes(i) || (typeof selected === 'string' && selected === i));
      const unselectedFiltered = filteredItems.filter(i => !selected.includes(i) && selected !== i);
      const remainingSlots = Math.max(0, displayCount - selectedFiltered.length);
      itemsToDisplay = [...selectedFiltered, ...unselectedFiltered.slice(0, remainingSlots)];
    }

    return (
      <>
        <div className="chip-container" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {itemsToDisplay.map(item => {
            const isSelected = selected.includes ? selected.includes(item) : selected === item;
            return (
              <button
                key={item}
                className={`chip ${isInsert ? 'tag-chip' : ''} ${isSelected ? 'active' : ''}`}
                onClick={() => isInsert ? insertTag(item) : toggleFn(item)}
                title={TOOLTIPS[item] || (isInsert ? "Click to insert at cursor position" : "Toggle selection")}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: isSelected ? '1px solid #f59e0b' : '1px solid #374151',
                  background: isSelected ? '#f59e0b22' : 'transparent',
                  color: isSelected ? '#f59e0b' : '#6b7280',
                  fontSize: 11,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {item}
              </button>
            );
          })}
        </div>
        {filteredItems.length > displayCount && (
          <button
            className="show-more-btn"
            onClick={() => toggleSection(sectionId)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid #374151',
              background: 'transparent',
              color: '#9ca3af',
              fontSize: 10,
              cursor: 'pointer',
              marginBottom: 16
            }}
          >
            {isExpanded ? 'Show Less ⬆' : `Show More (${filteredItems.length - itemsToDisplay.length}) ⬇`}
          </button>
        )}
      </>
    );
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', color: '#e5e7eb', padding: 20 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, boxShadow: '0 0 20px #f59e0b44'
          }}>🎸</div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: 0, letterSpacing: 1 }}>
              Suno Prompt Generator
            </h2>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
              Create structured prompts for Suno AI (adapted from ER-Suno-PromptGenerator)
            </p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Search tags, genres, and styles..."
          value={genreFilter}
          onChange={(e) => setGenreFilter(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 10,
            border: '1px solid #374151',
            background: '#111827',
            color: 'white',
            fontSize: 13,
            boxSizing: 'border-box',
            outline: 'none'
          }}
        />
      </div>

      {/* Genres */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: 0 }}>Select Genres</h3>
          <button
            onClick={() => setActiveHelp('genres')}
            style={{
              width: 20, height: 20, borderRadius: '50%',
              border: '1px solid #6b7280', background: 'transparent',
              color: '#6b7280', fontSize: 12, cursor: 'pointer'
            }}
          >?</button>
        </div>
        {renderChips(GENRES, selectedGenres, toggleGenre, 'genres')}
      </div>

      {/* Metal Subgenres */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: 0 }}>Metal Subgenres (Primary)</h3>
          <button
            onClick={() => setActiveHelp('metal')}
            style={{
              width: 20, height: 20, borderRadius: '50%',
              border: '1px solid #6b7280', background: 'transparent',
              color: '#6b7280', fontSize: 12, cursor: 'pointer'
            }}
          >?</button>
        </div>
        {renderChips(METAL_SUBGENRES, selectedGenres, toggleGenre, 'metal')}
      </div>

      {/* Styles */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: 0 }}>Select Styles (Tone/Vibe)</h3>
          <button
            onClick={() => setActiveHelp('styles')}
            style={{
              width: 20, height: 20, borderRadius: '50%',
              border: '1px solid #6b7280', background: 'transparent',
              color: '#6b7280', fontSize: 12, cursor: 'pointer'
            }}
          >?</button>
        </div>
        {renderChips(STYLES, selectedStyles, toggleStyle, 'styles')}
      </div>

      {/* BPM */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: 0 }}>Select BPM (Tempo)</h3>
          <button
            onClick={() => setActiveHelp('bpm')}
            style={{
              width: 20, height: 20, borderRadius: '50%',
              border: '1px solid #6b7280', background: 'transparent',
              color: '#6b7280', fontSize: 12, cursor: 'pointer'
            }}
          >?</button>
        </div>
        {renderChips(BPMS, selectedBpm, toggleBpm, 'bpm')}
      </div>

      {/* Tags */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: 0 }}>Insert Tags</h3>
          <button
            onClick={() => setActiveHelp('tags')}
            style={{
              width: 20, height: 20, borderRadius: '50%',
              border: '1px solid #6b7280', background: 'transparent',
              color: '#6b7280', fontSize: 12, cursor: 'pointer'
            }}
          >?</button>
        </div>
        {renderChips(TAGS, [], insertTag, 'tags', true)}
      </div>

      {/* Lyrics Textarea */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 8, fontWeight: 600 }}>
          📝 Lyrics / Song Text
        </label>
        <textarea
          ref={textareaRef}
          placeholder="Enter lyrics here. Click tags above to insert them at the cursor..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 10,
            border: '1px solid #374151',
            background: '#0d1117',
            color: 'white',
            fontSize: 13,
            boxSizing: 'border-box',
            resize: 'vertical',
            fontFamily: 'monospace',
            lineHeight: 1.6
          }}
        />
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button
          onClick={handleGenerate}
          style={{
            flex: 1,
            padding: '14px 20px',
            borderRadius: 10,
            border: 'none',
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            color: 'white',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            boxShadow: '0 4px 20px #f59e0b44'
          }}
        >
          🎵 Generate Prompt
        </button>
        <button
          onClick={() => setText('[Instrumental]')}
          style={{
            padding: '14px 20px',
            borderRadius: 10,
            border: '1px solid #374151',
            background: '#1f2937',
            color: '#9ca3af',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer'
          }}
        >
          🎸 [Instrumental]
        </button>
      </div>

      {/* Results */}
      {result && (
        <div style={{
          background: 'linear-gradient(135deg, #0d1117 0%, #111827 100%)',
          border: '1px solid #f59e0b33',
          borderRadius: 14,
          padding: 20,
          marginBottom: 20
        }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 8, textTransform: 'uppercase' }}>
              🎨 Style Prompt
            </h3>
            <p style={{ fontSize: 13, color: '#e5e7eb', background: '#1f2937', padding: 12, borderRadius: 8 }}>
              {result.style_prompt}
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 8, textTransform: 'uppercase' }}>
              📝 Formatted Lyrics
            </h3>
            <pre style={{
              fontSize: 12,
              color: '#e5e7eb',
              background: '#1f2937',
              padding: 12,
              borderRadius: 8,
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              margin: 0
            }}>
              {result.lyrics_formatted}
            </pre>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleCopy}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 8,
                border: 'none',
                background: copied ? '#059669' : '#374151',
                color: 'white',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              {copied ? '✅ Copied!' : '📋 Copy to Clipboard'}
            </button>
            <button
              onClick={handleSendToSuno}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid #a855f744',
                background: '#a855f711',
                color: '#a855f7',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              🚀 Send to Suno Tab
            </button>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {activeHelp && HELP_DATA[activeHelp] && (
        <div
          onClick={() => setActiveHelp(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, #0d1117 0%, #111827 100%)',
              border: '1px solid #374151',
              borderRadius: 16,
              padding: 24,
              maxWidth: 500,
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative'
            }}
          >
            <button
              onClick={() => setActiveHelp(null)}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                width: 28,
                height: 28,
                borderRadius: '50%',
                border: '1px solid #374151',
                background: 'transparent',
                color: '#9ca3af',
                fontSize: 18,
                cursor: 'pointer'
              }}
            >×</button>

            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 12 }}>
              {HELP_DATA[activeHelp].title}
            </h2>
            <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16, lineHeight: 1.6 }}>
              {HELP_DATA[activeHelp].description}
            </p>

            {HELP_DATA[activeHelp].examples && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f59e0b', marginBottom: 10 }}>Examples</h3>
                {HELP_DATA[activeHelp].examples.map((ex, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <strong style={{ fontSize: 12, color: '#e5e7eb' }}>{ex.title}:</strong>
                    <pre style={{
                      fontSize: 11,
                      color: '#9ca3af',
                      background: '#1f2937',
                      padding: 10,
                      borderRadius: 6,
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace',
                      margin: '6px 0 0 0'
                    }}>
                      {ex.template}
                    </pre>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a
                href={HELP_DATA[activeHelp].url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid #374151',
                  background: 'transparent',
                  color: '#6b7280',
                  fontSize: 11,
                  textDecoration: 'none'
                }}
              >
                📖 Official Suno Help
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
