import {
  Sliders, Sparkles, Mic2, FolderOpen, Monitor, FileText,
  CheckCircle, Wrench, Zap, Trash2, ChevronRight, Server, Globe,
  Cpu, HardDrive, Package, BookOpen, Download, Terminal, Play, Activity
} from "lucide-react";

const s = {
  page: { padding: "32px 28px", maxWidth: 1100, margin: "0 auto" },
  hero: {
    textAlign: "center", marginBottom: 48,
    background: "linear-gradient(135deg, #0d0d22 0%, #12122a 100%)",
    border: "1px solid #1a1a3a", borderRadius: 16, padding: "40px 32px",
  },
  heroTitle: {
    fontSize: 42, fontWeight: 900, letterSpacing: 3,
    background: "linear-gradient(135deg, #e0e0ff, #00e5ff, #7209b7)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    marginBottom: 8,
  },
  heroSub: { color: "#6666aa", fontSize: 15, letterSpacing: 1 },
  version: {
    display: "inline-block", marginTop: 16,
    background: "#06d6a011", border: "1px solid #06d6a033",
    color: "#06d6a0", borderRadius: 20, padding: "4px 16px", fontSize: 12, fontWeight: 700,
  },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginBottom: 32 },
  card: {
    background: "#0d0d22", border: "1px solid #1a1a3a", borderRadius: 12,
    padding: "24px 24px 20px",
  },
  cardHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  cardIcon: {
    width: 44, height: 44, borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  cardTitle: { fontSize: 17, fontWeight: 800, color: "#e0e0ff", letterSpacing: 0.5 },
  cardSub: { fontSize: 11, color: "#444466", marginTop: 2 },
  featureList: { listStyle: "none", padding: 0, margin: 0 },
  featureItem: {
    display: "flex", alignItems: "flex-start", gap: 8,
    padding: "5px 0", borderBottom: "1px solid #0d0d1a",
    fontSize: 13, color: "#aaaacc", lineHeight: 1.5,
  },
  dot: { width: 6, height: 6, borderRadius: "50%", marginTop: 6, flexShrink: 0 },
  sectionTitle: {
    fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase",
    color: "#444466", marginBottom: 16, marginTop: 8,
    display: "flex", alignItems: "center", gap: 8,
  },
  badge: {
    display: "inline-block", fontSize: 10, fontWeight: 700, letterSpacing: 1,
    padding: "2px 8px", borderRadius: 10, textTransform: "uppercase",
  },
  changelogCard: {
    background: "#0d0d22", border: "1px solid #1a1a3a", borderRadius: 12,
    padding: "20px 24px", marginBottom: 12,
  },
  changelogVer: { fontSize: 15, fontWeight: 800, color: "#00e5ff", marginBottom: 4 },
  changelogDate: { fontSize: 11, color: "#444466", marginBottom: 12 },
  changelogItem: { fontSize: 13, color: "#aaaacc", padding: "3px 0", display: "flex", gap: 8, alignItems: "flex-start" },
  shortcutRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "8px 0", borderBottom: "1px solid #0d0d1a", fontSize: 13,
  },
  kbd: {
    background: "#1a1a3a", border: "1px solid #2a2a4a", borderRadius: 4,
    padding: "2px 8px", fontSize: 11, fontFamily: "monospace", color: "#00e5ff",
  },
  apiRow: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "8px 0", borderBottom: "1px solid #0d0d1a",
  },
  method: {
    fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 4,
    fontFamily: "monospace", flexShrink: 0, minWidth: 44, textAlign: "center",
  },
  apiPath: { fontFamily: "monospace", fontSize: 12, color: "#e0e0ff" },
  apiDesc: { fontSize: 12, color: "#6666aa", marginLeft: "auto" },
  todoItem: {
    display: "flex", alignItems: "flex-start", gap: 10,
    padding: "10px 14px", marginBottom: 8,
    background: "#0d0d1a", borderRadius: 8, border: "1px solid #1a1a3a",
  },
  todoIcon: {
    width: 28, height: 28, borderRadius: 6,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, flexShrink: 0,
  },
  todoContent: { flex: 1 },
  todoTitle: { fontSize: 13, fontWeight: 700, color: "#e0e0ff", marginBottom: 4 },
  todoDesc: { fontSize: 11, color: "#6666aa", lineHeight: 1.5 },
};

const features = [
  {
    Icon: Sliders, color: "#00e5ff", bg: "#00e5ff15",
    title: "Stem Separation", sub: "Demucs + BS-RoFormer",
    items: [
      "BS-RoFormer SDR 12.97 — best vocal/instrumental quality",
      "htdemucs / htdemucs_ft / htdemucs_6s — 4 or 6 stems",
      "Modes: Vocals Only, Instrumental Only, All Stems",
      "Auto-detect optimal model based on available VRAM",
      "Adaptive chunking for low VRAM GPUs (3s/5.8s/11s chunks)",
      "Auto fallback BS-RoFormer → htdemucs if audio-separator missing",
    ],
  },
  {
    Icon: Sparkles, color: "#7209b7", bg: "#7209b715",
    title: "ACE-Step v1.5", sub: "AI Music Generation",
    items: [
      "Text→Music: generate track from style description + lyrics",
      "Audio Cover: transform an existing track into another style",
      "Repaint: regenerate sections of a track (30-60s sections)",
      "Advanced params: CFG scale, diffusion steps, seed, shift",
      "LM controls: temperature, top-k, top-p, CFG scale LM",
      "BPM, Key, Time Signature optional in prompt",
      "Vocal language: EN/RO/ZH/JA/KO/FR/DE/ES/IT/PT/RU",
      "Instrumental mode (no vocals)",
      "Savable presets for favorite settings",
      "Polling status with real-time progress",
    ],
  },
  {
    Icon: Mic2, color: "#06d6a0", bg: "#06d6a015",
    title: "Voice Mix RVC", sub: "RVC v2 + Applio Features",
    items: [
      "⚡ Auto Pipeline: Upload full song → Separate → RVC → Mix",
      "🎚️ Final Mix: Mix converted vocals with instrumental",
      "🎛️ Applio Features: Autotune, Clean Audio, Volume Envelope, High-Pass",
      "RVC v2 models support (768-dim, 48kHz, RMVPE++)",
      "Pitch shift ±12 semitones",
      "F0 methods: rmvpe, harvest, pm, crepe",
      "Index rate 0.0-1.0, Protect 0.0-0.5",
      "20+ pre-loaded RVC models",
      "💾 Presets: Save/load all RVC settings",
      "RVC Rescue Post-Processing: EQ, Reverb, Compression for singing",
    ],
  },
  {
    Icon: FolderOpen, color: "#ffd166", bg: "#ffd16615",
    title: "Tracks Manager", sub: "Audio file management",
    items: [
      "View all generated files",
      "Built-in audio player with waveform",
      "Direct download from browser",
      "Filter by type: ace, cover, karaoke, stems",
      "Delete files individually or in bulk",
      "Files are saved in backend/output/",
    ],
  },
  {
    Icon: Monitor, color: "#e63946", bg: "#e6394615",
    title: "Models Manager", sub: "so-vits-svc + RVC models",
    items: [
      "Upload model .pth + config.json",
      "List available models with size",
      "Delete model with unload from VRAM",
      "Auto-detect speakers from config.json",
      "Model cache in memory for fast conversions",
      "Support pre-existing models without meta.json",
      "RVC v1/v2 auto-detection",
    ],
  },
  {
    Icon: Activity, color: "#f59e0b", bg: "#f59e0b15",
    title: "Audio Analysis", sub: "BPM, Key, Time Signature",
    items: [
      "Auto-detect BPM (librosa.beat.beat_track)",
      "Key detection (Krumhansl-Schmuckler profiles)",
      "Time signature detection",
      "Duration detection",
      "6 API endpoints for audio analysis",
      "Integration with ACE-Step generation",
    ],
  },
  {
    Icon: FileText, color: "#a8dadc", bg: "#a8dadc15",
    title: "Notes", sub: "Personal notes",
    items: [
      "Simple text editor for notes",
      "Auto-save to localStorage",
      "Persists between sessions",
    ],
  },
  {
    Icon: Zap, color: "#9b5de5", bg: "#9b5de515",
    title: "Repaint", sub: "ACE-Step Advanced",
    items: [
      "Select a portion (e.g., 30-60s) and regenerate",
      "Change lyrics, add bridge, modify endings",
      "Audio Cover Strength control (0.0-1.0)",
      "All models support Repaint (turbo, base, sft)",
      "Fast generation with turbo models (8 steps)",
      "Full quality with base/sft (50 steps)",
    ],
  },
];

const changelog = [
  {
    ver: "v2.0.0", date: "March 2026", type: "current",
    changes: [
      { type: "new", text: "🎵 Pipeline v2.3 - 4 Stage-uri: Separare → RVC → Clarificare → Mix Final" },
      { type: "new", text: "🎛️ Applio Features Integration: Autotune (snap F0), Clean Audio, Volume Envelope, High-Pass Filter" },
      { type: "new", text: "🎚️ Mix Final cu volume boost: Vocal 1.2x (+1.6dB), Instrumental 1.0x (0dB)" },
      { type: "new", text: "🔊 Loudness comercial: -10 LUFS (ca Spotify/YouTube), nu -16 LUFS" },
      { type: "new", text: "✨ Stage 3 Clarificare: Fără lowpass/afftdn (prea agresive), doar highpass + deesser + loudnorm" },
      { type: "new", text: "🎤 RVC optimizat pentru SINGING: harvest f0_method, 0.40 index_rate, 0.55 protect" },
      { type: "imp", text: "5 download outputs: Vocals, Instrumental, RVC Raw, Vocal Clarificat, Mix Final" },
      { type: "imp", text: "Stage 3 opțional (default OFF) - ca RVC Tab să fie mai bun" },
    ],
  },
  {
    ver: "v1.9.0", date: "March 2026", type: "old",
    changes: [
      { type: "new", text: "🎛️ Applio Features: Autotune (0.0-1.0), Clean Audio (speech only), Volume Envelope (RMS matching), High-Pass (48Hz)" },
      { type: "new", text: "🎤 RVC Rescue Post-Processing: EQ (-2.5kHz/-5kHz), Reverb (50ms+120ms), Compression (3:1), Limiter" },
      { type: "new", text: "🎯 Default params pentru SINGING: harvest, 0.40 index, 0.55 protect (nu speech params)" },
      { type: "imp", text: "Quality: singing 9/10, speech 9/10 (față de 8/10 înainte)" },
      { type: "imp", text: "RVC v2 support: 768-dim, 48kHz, RMVPE++ F0 extraction" },
    ],
  },
  {
    ver: "v1.8.4", date: "March 2026", type: "old",
    changes: [
      { type: "new", text: "🎚️ RVC Rescue Post-Processing: repară daunele RVC, adaugă reverb pentru spațiu muzical" },
      { type: "new", text: "EQ: Cut harsh 2.5kHz (-6dB), restore warmth 150Hz (+3dB)" },
      { type: "new", text: "Compressor: Smooth dynamics (3:1 ratio), Reverb: 50ms + 120ms echoes" },
      { type: "imp", text: "Quality: 5/10 → 8/10 (+60%) după RVC Rescue" },
      { type: "fix", text: "RVC e antrenat pe SPEECH, nu pe SINGING - RVC Rescue îmbunătățește dar nu poate restaura complet" },
    ],
  },
  {
    ver: "v1.8.3", date: "March 2026", type: "old",
    changes: [
      { type: "new", text: "🔗 RVC Final Mix Integration - Auto Pipeline → Final Mix workflow" },
      { type: "new", text: "💾 Auto Pipeline salvează instrumental, buton 'Go to Final Mix'" },
      { type: "new", text: "🎚️ Final Mix tab: auto-load converted vocals + instrumental, independent volume control (0.1x-2.0x)" },
      { type: "imp", text: "Instrumental saved as 320kbps MP3, 48kHz sample rate" },
      { type: "fix", text: "Final Mix tab showing 'First run Auto Pipeline' even after completion" },
    ],
  },
  {
    ver: "v1.8.2", date: "March 2026", type: "old",
    changes: [
      { type: "new", text: "📺 YouTube Cover Generator - Download audio from YouTube, auto-separate, RVC, mix" },
      { type: "new", text: "🎤 RVC v2 Support - Auto-detect v1/v2, 768-dim, 48kHz, RMVPE++" },
      { type: "new", text: "✨ Enhanced Pipeline - MelBand cleanup, De-reverb, Denoise, Normalize (FFmpeg loudnorm)" },
      { type: "imp", text: "RVC Scripts: pipeline_loader.py, inference_rvc_v2.py, run_pipeline_v2.py" },
      { type: "fix", text: "RVC Separation Endpoint - model_bs_roformer parameter name" },
    ],
  },
  {
    ver: "v1.8.1", date: "March 2026", type: "old",
    changes: [
      { type: "fix", text: "RVC Separation Endpoint - model_bs_roformer_ep_317_sdr_12.9755.ckpt" },
      { type: "fix", text: "Stem Separation - BS-RoFormer now working correctly" },
      { type: "imp", text: "Auto-download model on first use (~300MB)" },
    ],
  },
  {
    ver: "v1.8", date: "March 2026", type: "old",
    changes: [
      { type: "new", text: "✂️ Separate Tab — Upload full song, auto-separate vocals + instrumental with Demucs, one-click 'Use Vocals in Convert'" },
      { type: "new", text: "🎚️ Mix Tab — Mix converted vocal with instrumental, independent volume control, real-time preview, export final mix" },
      { type: "new", text: "💾 Presets Tab — Save all RVC settings (model, pitch, emotion, index rate, formant), apply with one click, import/export presets" },
      { type: "fix", text: "RVC working directory issues — fixed config path loading" },
      { type: "fix", text: "Unicode encoding errors — replaced Unicode characters for Windows compatibility" },
      { type: "fix", text: "RVC argument parsing conflicts — fixed parse_args([]) to ignore uvicorn arguments" },
      { type: "imp", text: "Added RVC Voice API on port 8002 — dedicated service for voice conversion" },
      { type: "imp", text: "Enhanced core/modules/rvc_model.py — better device detection and error handling" },
      { type: "imp", text: "Updated START_ALL.bat — now launches 4 services (Frontend, Backend, ACE-Step, RVC)" },
    ],
  },
  {
    ver: "v1.7.2", date: "February 2026", type: "old",
    changes: [
      { type: "new", text: "Presets by genre (full): single section with JSON genres (Rock, Reggae, Jazz, Drum & Bass) + built-in (Hip-Hop, Romanian, House, Dembow). Each subgenre applies caption, negative prompt, BPM, key, instrumental." },
      { type: "new", text: "BPM and negative prompt added for every built-in subgenre (Hip-Hop, Romanian, House, Dembow) for consistent full presets." },
      { type: "new", text: "Genre tabs no longer prefixed with \"Rapid\" — show as Hip-Hop, Romanian, House, Dembow. Same visual style as Rock/Reggae (unified color)." },
      { type: "rem", text: "Removed old \"Quick Presets\" block (prompt-only buttons above Presets by genre). Only the full Presets by genre section remains." },
      { type: "rem", text: "Removed from preset list: EDM, Hip Hop, Pop, Classical, Afrobeat, Instrumental, Other. Removed Afrobeats from Dembow; removed \"Other\" built-in category." },
      { type: "imp", text: "Seed Library redesigned: integrated in Generation Settings, Library button on same row as Seed input, expandable \"Saved seeds\" list with Close / Use / Delete. Save seed form with Name placeholder and Save/Cancel." },
      { type: "imp", text: "UI translated to English: Presets modal, genre presets, seed library, DemucsTab, AceStepAdvancedTab, ReadmeTab, LyricsTab. Category \"Românesc\" → \"Romanian\"." },
    ],
  },
  {
    ver: "v1.7.1", date: "February 2026", type: "old",
    changes: [
      { type: "fix", text: "Duration slider styling - yellow thumb for Duration and BPM" },
      { type: "fix", text: "Custom CSS classes for: duration-slider, bpm-slider, guidance-slider, steps-slider, strength-slider" },
      { type: "new", text: "Quick preset buttons for Duration (15s/30s/60s/2m/3m/4m)" },
      { type: "new", text: "Seed Library - save and reload favorite seeds" },
      { type: "new", text: "Genre presets improved - multiple categories (Hip-Hop, Romanian, House, Dembow)" },
    ],
  },
  {
    ver: "v1.7", date: "February 2026", type: "old",
    changes: [
      { type: "new", text: "ACE-Step v1.5 full integration with API server on port 8001" },
      { type: "new", text: "Savable presets for ACE-Step settings (cover, generate, custom)" },
      { type: "new", text: "Vocal language selector (EN/RO/ZH/JA/KO/FR/DE/ES/IT/PT/RU/AR)" },
      { type: "new", text: "Audio Cover mode cu source audio upload si strength control" },
      { type: "new", text: "LM advanced controls: temperature, top-k, top-p, CFG scale LM" },
      { type: "new", text: "Expert settings: ADG, CFG interval, CoT metas/caption/language" },
      { type: "fix", text: "504 Gateway Timeout fix — uvicorn timeout_keep_alive=600s" },
      { type: "fix", text: "Audio2audio: source no longer trimmed, duration user-controlled" },
      { type: "fix", text: "VRAM optimization: batch_size=1, tiled_decode adaptiv" },
      { type: "imp", text: "Adaptive chunking BS-RoFormer by VRAM (3s/5.8s/11s)" },
      { type: "imp", text: "Progress polling with ACE-Step status text in real time" },
    ],
  },
  {
    ver: "v1.6", date: "Ianuarie 2026", type: "old",
    changes: [
      { type: "new", text: "BS-RoFormer SDR 12.97 via audio-separator (calitate superioara htdemucs)" },
      { type: "new", text: "Demucs tab cu moduri: Vocals Only, Instrumental Only, All Stems" },
      { type: "new", text: "htdemucs_6s — 6 stems: vocals, drums, bass, other, guitar, piano" },
      { type: "new", text: "Karaoke mode cu vocal reduction slider" },
      { type: "new", text: "Lyrics Cover — TTS + SVC + time-stretch + reverb" },
      { type: "imp", text: "Job tracking SSE stream pentru toate endpoint-urile lungi" },
      { type: "fix", text: "Mel-Band RoFormer: (other) mapped corect ca instrumental" },
    ],
  },
  {
    ver: "v1.5", date: "Decembrie 2025", type: "old",
    changes: [
      { type: "new", text: "so-vits-svc 4.1 voice conversion cu pitch shift" },
      { type: "new", text: "Segment streaming pentru piese lungi" },
      { type: "new", text: "AudioEngine: Morph + Harmony + Mastering modules" },
      { type: "new", text: "BPM & Key detection (Krumhansl-Schmuckler)" },
      { type: "new", text: "Hardware detection: CUDA/CPU, VRAM, mode (light/full/high_end)" },
      { type: "imp", text: "Model cache in memorie — conversii repetate instant" },
    ],
  },
];

const apis = [
  { method: "POST", color: "#06d6a0", path: "/ace_generate", desc: "ACE-Step music generation" },
  { method: "GET",  color: "#00e5ff", path: "/ace_health",   desc: "ACE-Step server status" },
  { method: "POST", color: "#06d6a0", path: "/process_cover", desc: "Full voice cover" },
  { method: "POST", color: "#06d6a0", path: "/preview",       desc: "10s rapid preview" },
  { method: "POST", color: "#06d6a0", path: "/demucs_separate", desc: "Separate stems" },
  { method: "POST", color: "#06d6a0", path: "/karaoke",       desc: "Karaoke (remove vocals)" },
  { method: "POST", color: "#06d6a0", path: "/lyrics_cover",  desc: "TTS + SVC cover" },
  { method: "GET",  color: "#00e5ff", path: "/list_models",   desc: "List SVC models" },
  { method: "POST", color: "#06d6a0", path: "/upload_model",  desc: "Upload model .pth" },
  { method: "DEL",  color: "#e63946", path: "/delete_model/{id}", desc: "Delete model" },
  { method: "GET",  color: "#00e5ff", path: "/hardware",      desc: "Hardware info" },
  { method: "GET",  color: "#00e5ff", path: "/vram_usage",    desc: "Current VRAM" },
  { method: "GET",  color: "#00e5ff", path: "/clear_cache",   desc: "Clear GPU cache" },
  { method: "GET",  color: "#00e5ff", path: "/unload_models", desc: "Unload all models" },
  { method: "GET",  color: "#00e5ff", path: "/job/{id}/progress", desc: "SSE progress stream" },
  { method: "GET",  color: "#00e5ff", path: "/job/{id}/status",   desc: "Job status polling" },
  { method: "GET",  color: "#00e5ff", path: "/tracks/{file}", desc: "Download audio file" },
];

const todos = [
  {
    icon: "🎨", color: "#7209b7", bg: "#7209b720",
    title: "Style Transfer Module",
    desc: "Input Reference Track for style, Style Intensity slider (0-100%), Instant preview on selected segment, Apply per segment or all segments simultaneously, Export cover with style transfer applied",
  },
  {
    icon: "💡", color: "#00e5ff", bg: "#00e5ff20",
    title: "Segment Suggestion Module",
    desc: "AI suggests new segments (pre-chorus, breakdown, build-up) based on structure and genre, Apply Suggestion button to add generated segment, Visualization on combined waveform with highlight for suggested segment",
  },
  {
    icon: "🎶", color: "#06d6a0", bg: "#06d6a020",
    title: "Harmony / Layer Generator",
    desc: "Auto-generate harmonies and instruments per segment: Backing vocals, Synth layers, Bassline. Sliders Harmonic Complexity and Layer Intensity. Instant preview on segment. Export individual per layer or combined to WAV.",
  },
  {
    icon: "🔄", color: "#ffd166", bg: "#ffd16620",
    title: "Auto Remix Module",
    desc: "Generate alternative track versions: Different BPM, Different Key, Varied instrumentation. Each version saved as version for comparison. Instant preview and WAV/JSON export. Remix Intensity slider.",
  },
  {
    icon: "🎛️", color: "#ff6b9d", bg: "#ff6b9d20",
    title: "Dashboard Workflow Integration",
    desc: "Quick selector to combine Style Transfer module with Harmony Generator on same segment. Integrated visual dashboard with combined waveform + highlight for new segments, style transfer and harmonies.",
  },
  {
    icon: "🔊", color: "#e63946", bg: "#e6394620",
    title: "RVC Voice Conversion",
    desc: "RVC voice conversion - transform your voice into other voices using pre-trained models. Supports pitch shifting, emotions and formant preservation.",
  },
  {
    icon: "🎵", color: "#9b2de0", bg: "#9b2de020",
    title: "Audio Understanding",
    desc: "Auto-extract BPM, Key, Time Signature from uploaded audio using ACE-Step audio analysis. Auto-populate in generation settings.",
  },
  {
    icon: "🔧", color: "#444466", bg: "#44446620",
    title: "LoRA Management (Backend)",
    desc: "Implement backend endpoints for /upload_lora, /list_lora, /delete_lora for complete LoRA files management.",
  },
];

const typeColor = { new: "#06d6a0", fix: "#ffd166", imp: "#00e5ff", rem: "#e63946" };
const typeLabel = { new: "NEW", fix: "FIX", imp: "IMP", rem: "REM" };

const TypeIcon = ({ type }) => {
  if (type === "new") return <CheckCircle size={12} color="#06d6a0" style={{ flexShrink: 0, marginTop: 2 }} />;
  if (type === "fix") return <Wrench size={12} color="#ffd166" style={{ flexShrink: 0, marginTop: 2 }} />;
  if (type === "rem") return <Trash2 size={12} color="#e63946" style={{ flexShrink: 0, marginTop: 2 }} />;
  return <Zap size={12} color="#00e5ff" style={{ flexShrink: 0, marginTop: 2 }} />;
};

export default function ReadmeTab() {
  return (
    <div style={s.page}>
      {/* Hero */}
      <div style={s.hero}>
        <div style={s.heroTitle}>VocalForge</div>
        <div style={s.heroSub}>AI Audio Studio — Documentation & Features</div>
        <div style={s.version}>v2.0.0 · Pipeline v2.3 · Beta Ready · Windows 10 · CUDA</div>
        <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 28, flexWrap: "wrap" }}>
          {[
            { Icon: Sliders,   label: "Stem Separation", color: "#00e5ff" },
            { Icon: Sparkles,  label: "AI Music Gen",    color: "#7209b7" },
            { Icon: Mic2,      label: "Voice Mix RVC",   color: "#06d6a0" },
            { Icon: Zap,       label: "Repaint",         color: "#9b5de5" },
            { Icon: Activity,  label: "Audio Analysis",  color: "#f59e0b" },
          ].map(({ Icon, label, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, color, fontSize: 13 }}>
              <Icon size={16} />
              <span style={{ fontWeight: 600 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div style={s.sectionTitle}>
        <ChevronRight size={14} color="#00e5ff" />
        Module & Functionalitati
      </div>
      <div style={s.grid}>
        {features.map(({ Icon, color, bg, title, sub, items }) => (
          <div key={title} style={s.card}>
            <div style={s.cardHeader}>
              <div style={{ ...s.cardIcon, background: bg }}>
                <Icon size={22} color={color} />
              </div>
              <div>
                <div style={s.cardTitle}>{title}</div>
                <div style={s.cardSub}>{sub}</div>
              </div>
            </div>
            <ul style={s.featureList}>
              {items.map((item, i) => (
                <li key={i} style={s.featureItem}>
                  <div style={{ ...s.dot, background: color }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Quick Start */}
      <div style={s.sectionTitle}>
        <ChevronRight size={14} color="#06d6a0" />
        🚀 Quick Start
      </div>
      <div style={{
        background: "linear-gradient(135deg, #0d0d22 0%, #12122a 100%)",
        border: "1px solid #1a1a3a", borderRadius: 16, padding: "24px 28px", marginBottom: 32,
      }}>
        <div style={{ fontSize: 13, color: "#aaaacc", lineHeight: 1.8, fontFamily: "monospace" }}>
          <div style={{ color: "#6666aa", marginBottom: 12 }}>// One-Click Launch</div>
          <div><span style={{ color: "#e63946" }}>git clone</span> <span style={{ color: "#06d6a0" }}>https://github.com/iulicafarafrica/VocalForge.git</span></div>
          <div><span style={{ color: "#e63946" }}>cd</span> VocalForge</div>
          <div style={{ marginTop: 12, color: "#6666aa" }}>// Install everything</div>
          <div><span style={{ color: "#ffd166" }}>setup.bat</span></div>
          <div style={{ marginTop: 12, color: "#6666aa" }}>// Start all services</div>
          <div><span style={{ color: "#00e5ff" }}>START_ALL.bat</span></div>
        </div>
        <div style={{ marginTop: 20, padding: "16px 20px", background: "#06d6a011", border: "1px solid #06d6a033", borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: "#06d6a0", fontWeight: 700, marginBottom: 8 }}>📌 Access Application</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, fontSize: 12 }}>
            <div><span style={{ color: "#6666aa" }}>Frontend:</span> <span style={{ color: "#00e5ff", fontFamily: "monospace" }}>localhost:3000</span></div>
            <div><span style={{ color: "#6666aa" }}>Backend:</span> <span style={{ color: "#00e5ff", fontFamily: "monospace" }}>localhost:8000</span></div>
            <div><span style={{ color: "#6666aa" }}>RVC API:</span> <span style={{ color: "#00e5ff", fontFamily: "monospace" }}>localhost:8002</span></div>
            <div><span style={{ color: "#6666aa" }}>ACE-Step:</span> <span style={{ color: "#00e5ff", fontFamily: "monospace" }}>localhost:8001</span></div>
          </div>
        </div>
      </div>

      {/* Installation */}
      <div style={s.sectionTitle}>
        <ChevronRight size={14} color="#ffd166" />
        📦 Installation
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginBottom: 32 }}>
        {[
          {
            icon: <Terminal size={20} color="#00e5ff" />,
            title: "Prerequisites",
            items: [
              "Python 3.10 or 3.11",
              "Node.js 18+",
              "Git Latest",
              "Windows Terminal (Microsoft Store)",
              "CUDA 11.8/12.1 (optional)",
            ],
          },
          {
            icon: <Download size={20} color="#06d6a0" />,
            title: "Step 1: Clone",
            items: [
              "git clone https://github.com/iulicafarafrica/VocalForge.git",
              "cd VocalForge",
            ],
          },
          {
            icon: <Package size={20} color="#ffd166" />,
            title: "Step 2: Install Python",
            items: [
              "python -m venv venv",
              "venv\\Scripts\\activate",
              "pip install torch --index-url https://download.pytorch.org/whl/cu121",
              "pip install -r requirements.txt",
            ],
          },
          {
            icon: <Terminal size={20} color="#7209b7" />,
            title: "Step 3: Install Node",
            items: [
              "cd frontend",
              "npm install",
              "cd ..",
            ],
          },
          {
            icon: <Terminal size={20} color="#e63946" />,
            title: "Step 4: Install ACE-Step",
            items: [
              "cd ace-step",
              "uv sync",
              "cd ..",
            ],
          },
          {
            icon: <Terminal size={20} color="#00e5ff" />,
            title: "Step 5: Install RVC Models",
            items: [
              "Download .pth models from:",
              "weights.gg/models",
              "huggingface.co/IAHispano/Applio",
              "Place in: RVCWebUI/assets/weights/",
            ],
          },
        ].map((step, i) => (
          <div key={i} style={s.card}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              {step.icon}
              <div style={{ fontSize: 14, fontWeight: 700, color: "#e0e0ff" }}>{step.title}</div>
            </div>
            {step.items.map((item, j) => (
              <div key={j} style={{
                fontSize: 11, color: "#6666aa", padding: "3px 0",
                fontFamily: item.includes("git") || item.includes("cd") || item.includes("pip") || item.includes("npm") || item.includes("uv") ? "monospace" : "inherit",
                borderBottom: "1px solid #0d0d1a",
              }}>
                {item}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Two column: Changelog + API */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>

        {/* Changelog */}
        <div>
          <div style={s.sectionTitle}>
            <ChevronRight size={14} color="#ffd166" />
            Changelog
          </div>
          {changelog.map(v => (
            <div key={v.ver} style={s.changelogCard}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div style={s.changelogVer}>{v.ver}</div>
                {v.type === "current" && (
                  <span style={{ ...s.badge, background: "#06d6a011", border: "1px solid #06d6a033", color: "#06d6a0" }}>
                    CURRENT
                  </span>
                )}
              </div>
              <div style={s.changelogDate}>{v.date}</div>
              {v.changes.map((c, i) => (
                <div key={i} style={s.changelogItem}>
                  <TypeIcon type={c.type} />
                  <span style={{
                    ...s.badge, flexShrink: 0,
                    background: typeColor[c.type] + "15",
                    border: `1px solid ${typeColor[c.type]}33`,
                    color: typeColor[c.type],
                  }}>
                    {typeLabel[c.type]}
                  </span>
                  <span>{c.text}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* API Endpoints */}
        <div>
          <div style={s.sectionTitle}>
            <ChevronRight size={14} color="#7209b7" />
            API Endpoints
            <span style={{ ...s.badge, background: "#7209b715", border: "1px solid #7209b733", color: "#7209b7" }}>
              localhost:8000
            </span>
          </div>
          <div style={{ background: "#0d0d22", border: "1px solid #1a1a3a", borderRadius: 12, padding: "16px 20px" }}>
            {apis.map((a, i) => (
              <div key={i} style={s.apiRow}>
                <span style={{ ...s.method, background: a.color + "15", border: `1px solid ${a.color}33`, color: a.color }}>
                  {a.method}
                </span>
                <span style={s.apiPath}>{a.path}</span>
                <span style={s.apiDesc}>{a.desc}</span>
              </div>
            ))}
          </div>

          {/* File locations */}
          <div style={{ ...s.sectionTitle, marginTop: 24 }}>
            <ChevronRight size={14} color="#06d6a0" />
            File Locations
          </div>
          <div style={{ background: "#0d0d22", border: "1px solid #1a1a3a", borderRadius: 12, padding: "16px 20px" }}>
            {[
              { label: "Generated audio",  path: "backend/output/",       color: "#06d6a0" },
              { label: "SVC models",     path: "backend/models/",       color: "#ffd166" },
              { label: "UVR models",     path: "backend/uvr_models/",   color: "#00e5ff" },
              { label: "ACE-Step cache", path: "ace-step/.cache/",      color: "#7209b7" },
              { label: "Temp files",     path: "backend/temp/",         color: "#444466" },
              { label: "Project backup", path: "D:/VocalForge_backup/", color: "#a8dadc" },
            ].map((f, i) => (
              <div key={i} style={s.shortcutRow}>
                <span style={{ color: "#aaaacc", fontSize: 13 }}>{f.label}</span>
                <code style={{ ...s.kbd, color: f.color, fontSize: 11 }}>{f.path}</code>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hardware Requirements */}
      <div style={s.sectionTitle}>
        <ChevronRight size={14} color="#e63946" />
        💻 Hardware Requirements
      </div>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <div style={s.card}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#ffd166", marginBottom: 12 }}>⚠️ Minimum</div>
            {[
              { label: "GPU", val: "GTX 1060 (4GB)" },
              { label: "RAM", val: "8GB" },
              { label: "Storage", val: "10GB HDD" },
              { label: "OS", val: "Windows 10" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #0d0d1a", fontSize: 12 }}>
                <span style={{ color: "#6666aa" }}>{s.label}</span>
                <span style={{ color: "#aaaacc", fontFamily: "monospace" }}>{s.val}</span>
              </div>
            ))}
          </div>
          <div style={s.card}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#06d6a0", marginBottom: 12 }}>✅ Recommended</div>
            {[
              { label: "GPU", val: "RTX 3070 (8GB)" },
              { label: "RAM", val: "16-32GB" },
              { label: "Storage", val: "20GB+ SSD" },
              { label: "OS", val: "Windows 11" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #0d0d1a", fontSize: 12 }}>
                <span style={{ color: "#6666aa" }}>{s.label}</span>
                <span style={{ color: "#06d6a0", fontFamily: "monospace" }}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: "#0d0d22", border: "1px solid #1a1a3a", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#00e5ff", marginBottom: 12 }}>⏱ Performance Benchmarks</div>
          {[
            { gpu: "RTX 4090 (24GB)", ace: "~30 sec", rvc: "Real-time", demucs: "~10 sec" },
            { gpu: "RTX 3070 (8GB)", ace: "~1-2 min", rvc: "~10 sec", demucs: "~20 sec" },
            { gpu: "RTX 2060 (6GB)", ace: "~3-4 min", rvc: "~20 sec", demucs: "~30 sec" },
            { gpu: "CPU Only", ace: "~10-15 min", rvc: "~1 min", demucs: "~2 min" },
          ].map((b, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12, padding: "8px 0", borderBottom: i < 3 ? "1px solid #0d0d1a" : "none", fontSize: 11 }}>
              <span style={{ color: "#e0e0ff", fontWeight: 600 }}>{b.gpu}</span>
              <span style={{ color: "#6666aa" }}>ACE: {b.ace}</span>
              <span style={{ color: "#6666aa" }}>RVC: {b.rvc}</span>
              <span style={{ color: "#6666aa" }}>Demucs: {b.demucs}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Troubleshooting */}
      <div style={s.sectionTitle}>
        <ChevronRight size={14} color="#ffd166" />
        🐛 Troubleshooting
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 32 }}>
        {[
          {
            title: "Backend won't start",
            solution: [
              "netstat -ano | findstr :8000",
              "taskkill /PID <PID> /F",
              "start_backend.bat",
            ],
          },
          {
            title: "RVC models not showing",
            solution: [
              "Check: RVCWebUI/assets/weights/",
              "Ensure .pth files present",
              "Restart RVC service",
            ],
          },
          {
            title: "ACE-Step not responding",
            solution: [
              "curl http://localhost:8001/health",
              "taskkill /F /IM python.exe",
              "start_acestep.bat",
            ],
          },
          {
            title: "CUDA Out of Memory",
            solution: [
              "Reduce batch size in settings",
              "Use Turbo model (8 steps)",
              "Close other GPU applications",
            ],
          },
          {
            title: "Pitch artifacts",
            solution: [
              "Lower strength (50% vs 100%)",
              "Enable Preserve Formant",
              "Use WAV instead of MP3",
            ],
          },
          {
            title: "Frontend blank page",
            solution: [
              "cd frontend && npm run build",
              "Clear browser cache",
              "Ctrl+Shift+Delete",
            ],
          },
        ].map((t, i) => (
          <div key={i} style={s.card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#ffd166", marginBottom: 10 }}>{t.title}</div>
            {t.solution.map((s, j) => (
              <div key={j} style={{
                fontSize: 11, color: "#6666aa", padding: "3px 0",
                fontFamily: "monospace", borderBottom: "1px solid #0d0d1a",
              }}>
                {s}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* System Requirements */}
      <div style={s.sectionTitle}>
        <ChevronRight size={14} color="#e63946" />
        System Requirements & Ports
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
        {[
          { Icon: Server,    color: "#00e5ff", title: "Backend",              items: ["Python 3.10+", "FastAPI + Uvicorn", "Port: 8000", "CUDA recommended"] },
          { Icon: Sparkles,  color: "#7209b7", title: "ACE-Step",             items: ["Python 3.10+", "PyTorch 2.x", "Port: 8001", "Min 6GB VRAM"] },
          { Icon: Globe,     color: "#06d6a0", title: "Frontend",             items: ["Node.js 18+", "React + Vite", "Port: 5173", "Any modern browser"] },
          { Icon: Cpu,       color: "#ffd166", title: "Hardware Recommended", items: ["GPU: RTX 3060+ (8GB+)", "RAM: 16GB+", "Storage: 20GB+", "Windows 10/11"] },
        ].map(({ Icon, color, title, items }) => (
          <div key={title} style={s.card}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Icon size={20} color={color} />
              <div style={{ fontSize: 14, fontWeight: 700, color: "#e0e0ff" }}>{title}</div>
            </div>
            {items.map((item, i) => (
              <div key={i} style={{ fontSize: 12, color: "#6666aa", padding: "3px 0", borderBottom: "1px solid #0d0d1a" }}>
                {item}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* TODO - Roadmap */}
      <div style={s.sectionTitle}>
        <ChevronRight size={14} color="#ff6b9d" />
        TODO - Future Roadmap
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 16, marginBottom: 32 }}>
        {todos.map((todo, i) => (
          <div key={i} style={{
            ...s.todoItem,
            borderLeft: `3px solid ${todo.color}`,
          }}>
            <div style={{ ...s.todoIcon, background: todo.bg, color: todo.color }}>
              {todo.icon}
            </div>
            <div style={s.todoContent}>
              <div style={{ ...s.todoTitle, color: todo.color }}>{todo.title}</div>
              <div style={s.todoDesc}>{todo.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        textAlign: "center", padding: "24px", borderTop: "1px solid #1a1a3a",
        color: "#333355", fontSize: 12, fontFamily: "monospace",
      }}>
        VocalForge v1.8 · AI Audio Studio · FastAPI + React + ACE-Step + RVC + Demucs
      </div>
    </div>
  );
}
