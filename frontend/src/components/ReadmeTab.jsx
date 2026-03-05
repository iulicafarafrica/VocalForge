import {
  Sliders, Sparkles, Mic2, FolderOpen, Monitor, FileText,
  CheckCircle, Wrench, Zap, Trash2, ChevronRight, Server, Globe,
  Cpu, HardDrive, Package, BookOpen
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
      "BS-RoFormer SDR 12.97 — cea mai buna calitate vocale/instrumental",
      "htdemucs / htdemucs_ft / htdemucs_6s — 4 sau 6 stems",
      "Moduri: Vocals Only, Instrumental Only, All Stems",
      "Auto-detect model optim in functie de VRAM disponibil",
      "Chunking adaptiv pentru GPU-uri cu VRAM mic (3s/5.8s/11s chunks)",
      "Fallback automat BS-RoFormer → htdemucs daca audio-separator lipseste",
    ],
  },
  {
    Icon: Sparkles, color: "#7209b7", bg: "#7209b715",
    title: "ACE-Step v1.5", sub: "AI Music Generation",
    items: [
      "Text→Music: generate track from style description + lyrics",
      "Audio Cover: transform an existing track into another style",
      "Repaint: regenerate sections of a track",
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
    title: "Voice Cover (SVC)", sub: "so-vits-svc 4.1",
    items: [
      "Vocal conversion with so-vits-svc 4.1",
      "Pitch shift ±24 semitone",
      "F0 predictors: pm, harvest, crepe, rmvpe",
      "Noise scale, cluster ratio, slice dB configurable",
      "Vocal gain + instrumental gain independent",
      "Job tracking with SSE progress stream",
      "10s quick preview before full processing",
      "Segment streaming for long tracks (1-5 min/segment)",
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
    title: "Models Manager", sub: "so-vits-svc models",
    items: [
      "Upload model .pth + config.json",
      "List available models with size",
      "Delete model with unload from VRAM",
      "Auto-detect speakers from config.json",
      "Model cache in memory for fast conversions",
      "Support pre-existing models without meta.json",
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
];

const changelog = [
  {
    ver: "v1.7.2", date: "February 2026", type: "current",
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
  { method: "POST", color: "#06d6a0", path: "/ace_generate", desc: "Generare muzica ACE-Step" },
  { method: "GET",  color: "#00e5ff", path: "/ace_health",   desc: "Status ACE-Step server" },
  { method: "POST", color: "#06d6a0", path: "/process_cover", desc: "Full voice cover" },
  { method: "POST", color: "#06d6a0", path: "/preview",       desc: "Preview 10s rapid" },
  { method: "POST", color: "#06d6a0", path: "/demucs_separate", desc: "Separare stems" },
  { method: "POST", color: "#06d6a0", path: "/karaoke",       desc: "Karaoke (remove vocals)" },
  { method: "POST", color: "#06d6a0", path: "/lyrics_cover",  desc: "TTS + SVC cover" },
  { method: "GET",  color: "#00e5ff", path: "/list_models",   desc: "Lista modele SVC" },
  { method: "POST", color: "#06d6a0", path: "/upload_model",  desc: "Upload model .pth" },
  { method: "DEL",  color: "#e63946", path: "/delete_model/{id}", desc: "Sterge model" },
  { method: "GET",  color: "#00e5ff", path: "/hardware",      desc: "Info hardware" },
  { method: "GET",  color: "#00e5ff", path: "/vram_usage",    desc: "VRAM curent" },
  { method: "GET",  color: "#00e5ff", path: "/clear_cache",   desc: "Elibereaza VRAM" },
  { method: "GET",  color: "#00e5ff", path: "/unload_models", desc: "Unload all models" },
  { method: "GET",  color: "#00e5ff", path: "/job/{id}/progress", desc: "SSE progress stream" },
  { method: "GET",  color: "#00e5ff", path: "/job/{id}/status",   desc: "Status job polling" },
  { method: "GET",  color: "#00e5ff", path: "/tracks/{file}", desc: "Descarca fisier audio" },
];

const todos = [
  {
    icon: "🎨", color: "#7209b7", bg: "#7209b720",
    title: "Style Transfer Module",
    desc: "Input Reference Track pentru stil, Slider Style Intensity (0-100%), Preview instant pe segment selectat, Aplicare per segment sau pe toate segmentele simultan, Export cover cu stil transfer aplicat",
  },
  {
    icon: "💡", color: "#00e5ff", bg: "#00e5ff20",
    title: "Segment Suggestion Module",
    desc: "AI sugerează segmente noi (pre-chorus, breakdown, build-up) pe baza structurii și genului, Buton Apply Suggestion pentru adăugarea segmentului generat, Vizualizare pe waveform combinat cu highlight pentru segmentul sugerat",
  },
  {
    icon: "🎶", color: "#06d6a0", bg: "#06d6a020",
    title: "Harmony / Layer Generator",
    desc: "Generare automată de armonii și instrumente per segment: Backing vocals, Synth layers, Bassline. Sliders Harmonic Complexity și Layer Intensity. Preview instant pe segment. Export individual per layer sau combinat în WAV.",
  },
  {
    icon: "🔄", color: "#ffd166", bg: "#ffd16620",
    title: "Auto Remix Module",
    desc: "Generare variante alternative ale piesei: BPM diferit, Key diferit, Instrumentație variată. Fiecare variantă salvată ca version pentru comparare. Preview instant și export WAV/JSON. Slider Remix Intensity.",
  },
  {
    icon: "🎛️", color: "#ff6b9d", bg: "#ff6b9d20",
    title: "Dashboard Workflow Integration",
    desc: "Selector rapid pentru combinarea modulului Style Transfer cu Harmony Generator pe același segment. Dashboard vizual integrat cu waveform combinat + highlight pentru segmente noi, style transfer și armonii.",
  },
  {
    icon: "🔊", color: "#e63946", bg: "#e6394620",
    title: "RVC Voice Conversion",
    desc: "Conversie vocală cu RVC - transformă vocea ta în alte voci folosind modele pre-antrenate. Suportă pitch shifting, emoții și formant preservation.",
  },
  {
    icon: "🎵", color: "#9b2de0", bg: "#9b2de020",
    title: "Audio Understanding",
    desc: "Extrage automat BPM, Key, Time Signature din audio uploadat folosind ACE-Step audio analysis. Auto-populate în generation settings.",
  },
  {
    icon: "🔧", color: "#444466", bg: "#44446620",
    title: "LoRA Management (Backend)",
    desc: "Implementare endpoint-uri backend pentru /upload_lora, /list_lora, /delete_lora pentru management complet LoRA files.",
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
        <div style={s.heroSub}>AI Audio Studio — Documentatie & Features</div>
        <div style={s.version}>v1.7.2 · Beta Ready · Windows 10 · CUDA</div>
        <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 28, flexWrap: "wrap" }}>
          {[
            { Icon: Sliders,   label: "Stem Separation", color: "#00e5ff" },
            { Icon: Sparkles,  label: "AI Music Gen",    color: "#7209b7" },
            { Icon: Mic2,      label: "Voice Cover",     color: "#06d6a0" },
            { Icon: BookOpen,  label: "Lyrics Cover",    color: "#ffd166" },
            { Icon: FileText,  label: "Notes",           color: "#e63946" },
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
            Locatii Fisiere
          </div>
          <div style={{ background: "#0d0d22", border: "1px solid #1a1a3a", borderRadius: 12, padding: "16px 20px" }}>
            {[
              { label: "Audio generat",  path: "backend/output/",       color: "#06d6a0" },
              { label: "Modele SVC",     path: "backend/models/",       color: "#ffd166" },
              { label: "Modele UVR",     path: "backend/uvr_models/",   color: "#00e5ff" },
              { label: "ACE-Step cache", path: "ace-step/.cache/",      color: "#7209b7" },
              { label: "Temp files",     path: "backend/temp/",         color: "#444466" },
              { label: "Backup proiect", path: "D:/VocalForge_backup/", color: "#a8dadc" },
            ].map((f, i) => (
              <div key={i} style={s.shortcutRow}>
                <span style={{ color: "#aaaacc", fontSize: 13 }}>{f.label}</span>
                <code style={{ ...s.kbd, color: f.color, fontSize: 11 }}>{f.path}</code>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Requirements */}
      <div style={s.sectionTitle}>
        <ChevronRight size={14} color="#e63946" />
        Cerinte Sistem & Porturi
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
        {[
          { Icon: Server,    color: "#00e5ff", title: "Backend",              items: ["Python 3.10+", "FastAPI + Uvicorn", "Port: 8000", "CUDA recomandat"] },
          { Icon: Sparkles,  color: "#7209b7", title: "ACE-Step",             items: ["Python 3.10+", "PyTorch 2.x", "Port: 8001", "Min 6GB VRAM"] },
          { Icon: Globe,     color: "#06d6a0", title: "Frontend",             items: ["Node.js 18+", "React + Vite", "Port: 5173", "Orice browser modern"] },
          { Icon: Cpu,       color: "#ffd166", title: "Hardware Recomandat",  items: ["GPU: RTX 3060+ (8GB+)", "RAM: 16GB+", "Storage: 20GB+", "Windows 10/11"] },
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
        TODO - Roadmap Viitoare
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
        VocalForge v1.7.2 · AI Audio Studio · FastAPI + React + ACE-Step + so-vits-svc + Demucs
      </div>
    </div>
  );
}
