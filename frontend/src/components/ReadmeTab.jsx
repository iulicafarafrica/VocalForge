import React, { useState } from "react";

// ── Icons ─────────────────────────────────────────────────────────────────────
const Icons = {
  Music: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  Cpu: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/></svg>,
  Zap: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Mic: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  Layers: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  Activity: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Server: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>,
  Terminal: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
  Check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>,
  Play: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  GitBranch: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>,
  Alert: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Package: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  Book: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  Wrench: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  Target: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  Star: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
};

// ── Cyberpunk Theme ──────────────────────────────────────────────────────────
const theme = {
  colors: {
    bg: { primary: "#030308", secondary: "#0a0a1a", card: "#0d0d22", accent: "#12122a" },
    neon: {
      cyan: { primary: "#00e5ff", glow: "#00e5ff66", bg: "#00e5ff0d" },
      purple: { primary: "#9b2de0", glow: "#9b2de066", bg: "#9b2de00d" },
      pink: { primary: "#ff00ff", glow: "#ff00ff66", bg: "#ff00ff0d" },
      yellow: { primary: "#ffd166", glow: "#ffd16666", bg: "#ffd1660d" },
      green: { primary: "#06d6a0", glow: "#06d6a066", bg: "#06d6a00d" },
      red: { primary: "#e63946", glow: "#e6394666", bg: "#e639460d" },
      blue: { primary: "#4361ee", glow: "#4361ee66", bg: "#4361ee0d" },
      orange: { primary: "#f77f00", glow: "#f77f0066", bg: "#f77f000d" },
    },
    text: { primary: "#e0e0ff", secondary: "#aaaacc", muted: "#6666aa", dark: "#333355" },
  },
  gradients: {
    hero: "linear-gradient(135deg, #030308 0%, #0a0a1a 50%, #12122a 100%)",
    card: "linear-gradient(135deg, #0d0d22 0%, #0a0a1a 100%)",
    text: "linear-gradient(135deg, #00e5ff, #9b2de0, #ff00ff)",
    cyan: "linear-gradient(135deg, #00e5ff, #06d6a0)",
    purple: "linear-gradient(135deg, #9b2de0, #ff00ff)",
  },
  shadows: {
    cyan: "0 0 20px #00e5ff44, 0 0 40px #00e5ff22",
    purple: "0 0 20px #9b2de044, 0 0 40px #9b2de022",
    pink: "0 0 20px #ff00ff44, 0 0 40px #ff00ff22",
  },
};

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  container: {
    maxWidth: 1500,
    margin: "0 auto",
    padding: "40px 32px",
    background: theme.colors.bg.primary,
    minHeight: "100vh",
    position: "relative",
  },
  bgGrid: {
    position: "absolute",
    inset: 0,
    backgroundImage: `linear-gradient(rgba(0, 229, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 229, 255, 0.03) 1px, transparent 1px)`,
    backgroundSize: "60px 60px",
    pointerEvents: "none",
  },
  hero: {
    textAlign: "center",
    marginBottom: 64,
    padding: "72px 48px",
    background: theme.gradients.hero,
    border: `1px solid ${theme.colors.neon.purple.primary}33`,
    borderRadius: 24,
    position: "relative",
    overflow: "hidden",
    boxShadow: `0 0 80px ${theme.colors.neon.purple.glow}22`,
  },
  heroGlow: {
    position: "absolute",
    top: "-50%",
    left: "50%",
    transform: "translateX(-50%)",
    width: "80%",
    height: "200%",
    background: `radial-gradient(ellipse at center, ${theme.colors.neon.purple.glow}11 0%, transparent 70%)`,
    pointerEvents: "none",
  },
  heroTitle: {
    fontSize: 64,
    fontWeight: 900,
    letterSpacing: 6,
    background: theme.gradients.text,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    marginBottom: 16,
    filter: `drop-shadow(0 0 30px ${theme.colors.neon.purple.glow})`,
    position: "relative",
    zIndex: 1,
  },
  heroSubtitle: {
    fontSize: 20,
    color: theme.colors.text.muted,
    letterSpacing: 4,
    textTransform: "uppercase",
    marginBottom: 12,
    position: "relative",
    zIndex: 1,
  },
  heroPowered: {
    fontSize: 14,
    color: theme.colors.neon.cyan.primary,
    letterSpacing: 2,
    marginBottom: 32,
    textShadow: `0 0 10px ${theme.colors.neon.cyan.glow}`,
    position: "relative",
    zIndex: 1,
  },
  badges: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 32,
    position: "relative",
    zIndex: 1,
  },
  badge: {
    background: theme.colors.neon.cyan.bg,
    border: `1px solid ${theme.colors.neon.cyan.primary}44`,
    color: theme.colors.neon.cyan.primary,
    padding: "8px 20px",
    borderRadius: 24,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    boxShadow: `0 0 10px ${theme.colors.neon.cyan.glow}22`,
  },
  section: { marginBottom: 56, position: "relative", zIndex: 1 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: 4,
    textTransform: "uppercase",
    color: theme.colors.neon.cyan.primary,
    marginBottom: 32,
    display: "flex",
    alignItems: "center",
    gap: 14,
    textShadow: `0 0 15px ${theme.colors.neon.cyan.glow}`,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
    gap: 24,
  },
  card: {
    background: theme.gradients.card,
    border: `1px solid ${theme.colors.neon.purple.primary}22`,
    borderRadius: 20,
    padding: 28,
    transition: "all 0.3s ease",
    position: "relative",
    overflow: "hidden",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    background: theme.colors.neon.cyan.bg,
    border: `1px solid ${theme.colors.neon.cyan.primary}33`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: theme.colors.neon.cyan.primary,
    flexShrink: 0,
    boxShadow: `0 0 20px ${theme.colors.neon.cyan.glow}22`,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: 800,
    color: theme.colors.text.primary,
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    fontSize: 12,
    color: theme.colors.text.muted,
    marginTop: 4,
  },
  featureList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  featureItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "10px 0",
    borderBottom: `1px solid ${theme.colors.neon.purple.primary}11`,
    fontSize: 13,
    color: theme.colors.text.secondary,
    lineHeight: 1.6,
  },
  pipeline: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 20,
  },
  pipelineStage: {
    background: theme.gradients.card,
    border: `1px solid ${theme.colors.neon.purple.primary}33`,
    borderRadius: 18,
    padding: 24,
    position: "relative",
    overflow: "hidden",
  },
  pipelineNumber: {
    position: "absolute",
    top: -12,
    right: -12,
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: theme.gradients.purple,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: 16,
    boxShadow: `0 0 25px ${theme.colors.neon.purple.glow}`,
    border: `2px solid ${theme.colors.neon.purple.primary}44`,
  },
  pipelineTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: theme.colors.neon.cyan.primary,
    marginBottom: 14,
    marginTop: 8,
    textShadow: `0 0 10px ${theme.colors.neon.cyan.glow}44`,
  },
  pipelineStats: {
    display: "flex",
    gap: 20,
    marginTop: 16,
    fontSize: 11,
    color: theme.colors.text.muted,
  },
  stat: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: theme.colors.neon.purple.bg,
    padding: "6px 12px",
    borderRadius: 12,
    border: `1px solid ${theme.colors.neon.purple.primary}22`,
  },
  changelogCard: {
    background: theme.gradients.card,
    border: `1px solid ${theme.colors.neon.cyan.primary}22`,
    borderRadius: 18,
    padding: 24,
    marginBottom: 20,
  },
  changelogVersion: {
    fontSize: 18,
    fontWeight: 800,
    color: theme.colors.neon.cyan.primary,
    marginBottom: 8,
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  changelogDate: {
    fontSize: 12,
    color: theme.colors.text.muted,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottom: `1px solid ${theme.colors.neon.cyan.primary}11`,
  },
  changelogItem: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    padding: "8px 0",
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
  },
  codeBlock: {
    background: theme.colors.bg.primary,
    border: `1px solid ${theme.colors.neon.purple.primary}33`,
    borderRadius: 12,
    padding: 20,
    fontFamily: "'Fira Code', 'Consolas', monospace",
    fontSize: 12,
    color: theme.colors.text.primary,
    overflow: "auto",
    marginTop: 12,
    boxShadow: `inset 0 0 20px ${theme.colors.neon.purple.glow}11`,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
  },
  th: {
    background: theme.colors.neon.purple.bg,
    border: `1px solid ${theme.colors.neon.purple.primary}33`,
    padding: "12px 16px",
    textAlign: "left",
    color: theme.colors.neon.cyan.primary,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  td: {
    border: `1px solid ${theme.colors.neon.purple.primary}22`,
    padding: "12px 16px",
    color: theme.colors.text.secondary,
  },
  button: {
    background: theme.gradients.purple,
    color: "#fff",
    border: "none",
    padding: "14px 32px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    boxShadow: `0 0 30px ${theme.colors.neon.purple.glow}44`,
    transition: "all 0.3s ease",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  tabNav: {
    display: "flex",
    gap: 8,
    marginBottom: 40,
    background: theme.colors.bg.secondary,
    padding: 8,
    borderRadius: 16,
    border: `1px solid ${theme.colors.neon.purple.primary}22`,
    flexWrap: "wrap",
  },
  tab: {
    flex: "0 0 auto",
    padding: "12px 24px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 700,
    border: "none",
    cursor: "pointer",
    background: "transparent",
    color: theme.colors.text.muted,
    transition: "all 0.3s ease",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  tabActive: {
    background: theme.gradients.purple,
    color: "#fff",
    boxShadow: `0 0 25px ${theme.colors.neon.purple.glow}44`,
  },
  serviceCard: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 18px",
    background: theme.colors.bg.secondary,
    borderRadius: 12,
    border: `1px solid ${theme.colors.neon.cyan.primary}22`,
  },
  serviceDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    boxShadow: "0 0 15px currentColor",
  },
  subTabNav: {
    display: "flex",
    gap: 8,
    marginBottom: 24,
    background: theme.colors.bg.accent,
    padding: 6,
    borderRadius: 12,
    border: `1px solid ${theme.colors.neon.purple.primary}22`,
  },
  subTab: {
    flex: 1,
    padding: "10px 16px",
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 700,
    border: "none",
    cursor: "pointer",
    background: "transparent",
    color: theme.colors.text.muted,
    transition: "all 0.3s ease",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  subTabActive: {
    background: theme.colors.neon.cyan.bg,
    color: theme.colors.neon.cyan.primary,
    border: `1px solid ${theme.colors.neon.cyan.primary}33`,
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
  },
  infoCard: {
    background: theme.colors.bg.secondary,
    border: `1px solid ${theme.colors.neon.purple.primary}22`,
    borderRadius: 14,
    padding: 20,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: theme.colors.neon.cyan.primary,
    marginBottom: 12,
    letterSpacing: 1,
  },
};

// ── Data ──────────────────────────────────────────────────────────────────────
const modules = [
  { icon: "🎚️", name: "Stem Separation", desc: "BS-RoFormer, Demucs, 4-6 stems" },
  { icon: "🎵", name: "ACE-Step v1.5", desc: "Text→Music, Audio Cover, Repaint" },
  { icon: "🎤", name: "Vocal Pipeline", desc: "Auto Pipeline + Applio Features" },
  { icon: "🎸", name: "Prompt Generator", desc: "164 subgenres, 5 vocal presets" },
  { icon: "🖌️", name: "Repaint", desc: "Regenerate sections (30-60s)" },
  { icon: "📊", name: "Audio Analysis", desc: "BPM, Key, Time Signature detection" },
  { icon: "🎤", name: "Lyrics Manager", desc: "Search Genius.com, save library, genres, favorites" },
  { icon: "🌞", name: "Suno AI", desc: "Generate music with Suno (local cookie)" },
  { icon: "📁", name: "Tracks Manager", desc: "View, play, download tracks" },
  { icon: "💻", name: "Models Manager", desc: "Upload, list RVC models" },
  { icon: "📝", name: "Notes", desc: "Personal notes with auto-save" },
];

const features = [
  {
    Icon: Icons.Layers,
    color: theme.colors.neon.cyan.primary,
    glow: theme.colors.neon.cyan.glow,
    bg: theme.colors.neon.cyan.bg,
    title: "Stem Separation",
    subtitle: "BS-RoFormer SDR 12.97",
    items: [
      "BS-RoFormer (SDR 12.97) — state of the art",
      "htdemucs / htdemucs_ft / htdemucs_6s — 4 or 6 stems",
      "Professional gain staging: -1dB peak, -16 LUFS",
      "Output: vocals.wav + instrumental.wav",
    ],
  },
  {
    Icon: Icons.Music,
    color: theme.colors.neon.purple.primary,
    glow: theme.colors.neon.purple.glow,
    bg: theme.colors.neon.purple.bg,
    title: "ACE-Step v1.5",
    subtitle: "Text → Full Songs",
    items: [
      "Generate complete music from text prompts",
      "164 genre presets including 30 Romanian",
      "Models: turbo (8 steps), sft (50 steps), base (50 steps)",
      "Repaint, Lego, Complete editing modes",
    ],
  },
  {
    Icon: Icons.Mic,
    color: theme.colors.neon.green.primary,
    glow: theme.colors.neon.green.glow,
    bg: theme.colors.neon.green.bg,
    title: "RVC Voice Conversion",
    subtitle: "AI Voice Transformation",
    items: [
      "Transform vocals with RVC v1/v2 models",
      "Applio features: Autotune, Clean Audio, HPF, Volume Envelope",
      "RVC Rescue post-processing chain",
      "Optimized for singing: harvest, 0.40 index, 0.55 protect",
    ],
  },
  {
    Icon: Icons.Zap,
    color: theme.colors.neon.yellow.primary,
    glow: theme.colors.neon.yellow.glow,
    bg: theme.colors.neon.yellow.bg,
    title: "Pipeline v2.3",
    subtitle: "4-Stage Production",
    items: [
      "Stage 1: BS-RoFormer Separation (~30s, 4-5GB VRAM)",
      "Stage 2: RVC Voice Conversion (~15s, 4-6GB VRAM)",
      "Stage 3: Clarification - optional (~30s, 2-3GB VRAM)",
      "Stage 4: Mix Final (~5s, <1GB VRAM)",
    ],
  },
  {
    Icon: Icons.Activity,
    color: theme.colors.neon.pink.primary,
    glow: theme.colors.neon.pink.glow,
    bg: theme.colors.neon.pink.bg,
    title: "Audio Analysis",
    subtitle: "BPM, Key, Time Signature",
    items: [
      "Automatic BPM detection",
      "Musical key extraction",
      "Time signature analysis",
      "AI Chain-of-Thought for intelligent processing",
    ],
  },
  {
    Icon: Icons.Server,
    color: theme.colors.neon.blue.primary,
    glow: theme.colors.neon.blue.glow,
    bg: theme.colors.neon.blue.bg,
    title: "GPU Management",
    subtitle: "RTX 3070 8GB Optimized",
    items: [
      "Real-time VRAM monitoring via /gpu/info",
      "Auto-unload RVC models after conversion",
      "FP16 inference — halves VRAM usage",
      "Tiled decode for long audio generation",
    ],
  },
  {
    Icon: Icons.Book,
    color: theme.colors.neon.pink.primary,
    glow: theme.colors.neon.pink.glow,
    bg: theme.colors.neon.pink.bg,
    title: "Lyrics Manager",
    subtitle: "v2.2.0 - Complete Library",
    items: [
      "Search Genius.com — millions of verified lyrics",
      "Save unlimited lyrics to local library",
      "24 genres: Pop, Rock, Hip-Hop, Romanian, Manele",
      "Favorites system with star indicators",
      "Full text editor for saved lyrics",
      "Import/Export .txt files",
      "Search & filter library (All/Favorites/Genre)",
      "One-click send to ACE-Step",
    ],
  },
];

const pipelineStages = [
  {
    num: 1,
    title: "BS-RoFormer Separation",
    time: "~30s",
    vram: "4-5GB",
    desc: "State-of-the-art stem separation with SDR 12.97",
    details: ["vocals.wav + instrumental.wav", "Normalize to -1dB peak, -16 LUFS"],
  },
  {
    num: 2,
    title: "RVC Voice Conversion",
    time: "~15s",
    vram: "4-6GB",
    desc: "Transform vocals with AI voice models",
    details: ["harvest f0 / 0.40 index / 0.55 protect", "Autotune, HPF, Volume Envelope"],
  },
  {
    num: 3,
    title: "Clarification (Optional)",
    time: "~30s",
    vram: "2-3GB",
    desc: "Reduce RVC artifacts with re-extraction",
    details: ["BS-RoFormer re-extraction", "highpass, deesser, loudnorm"],
  },
  {
    num: 4,
    title: "Mix Final",
    time: "~5s",
    vram: "<1GB",
    desc: "Professional final mix",
    details: ["Vocal 1.2x (+1.6dB)", "Instrumental 1.0x (0dB)", "-14 LUFS commercial loudness"],
  },
];

const aceStepModels = [
  { name: "turbo", steps: 8, time: "~1 min", quality: "Good — fast", color: theme.colors.neon.green.primary },
  { name: "turbo-shift3", steps: 8, time: "~1 min", quality: "Good — shifted", color: theme.colors.neon.green.primary },
  { name: "sft ✅", steps: 50, time: "~3 min", quality: "High — default", color: theme.colors.neon.cyan.primary },
  { name: "base", steps: 50, time: "~3 min", quality: "Best — all features", color: theme.colors.neon.purple.primary },
];

const applioFeatures = [
  { name: "🎵 Autotune", desc: "Snaps F0 to musical notes. Strength 0.0-1.0. Use for singing (0.3-0.5)." },
  { name: "🧹 Clean Audio", desc: "Spectral noise reduction. Strength 0.0-1.0. Use for speech only (0.4-0.6)." },
  { name: "📊 Volume Envelope", desc: "RMS matching — preserves original dynamics. Always 1.0 for natural results." },
  { name: "🔊 High-Pass Filter", desc: "Removes frequencies below 48Hz (rumble). Butterworth order 5. Always ON." },
];

const vocalPresets = [
  { name: "🎙️ Studio Radio", desc: "Clar, compresat — pop/manele" },
  { name: "🎤 Natural", desc: "Minimal procesare — acoustic/folk" },
  { name: "🏟️ Arena", desc: "Mult reverb — concert/live" },
  { name: "📻 Radio", desc: "Foarte compresat — commercial" },
  { name: "🎵 Balanced", desc: "Echilibrat — all-round" },
];

const changelogData = [
  {
    version: "v2.2.0",
    date: "2026-03-16",
    color: theme.colors.neon.pink.primary,
    highlight: true,
    changes: [
      "🎤 COMPLETE LYRICS MANAGER - Full library management system",
      "🔍 Genius.com API Integration - Millions of verified lyrics",
      "💾 Save Library - Unlimited local storage with genres & favorites",
      "⭐ Favorites System - Mark and filter favorite lyrics",
      "🎭 Genre Tagging - 24 genres (Pop, Rock, Hip-Hop, Romanian, Manele)",
      "✏️ Edit Lyrics - Full text editor for saved lyrics",
      "📥 Import/Export - Import from .txt, export to .txt files",
      "🧹 Clean Lyrics - Automatic metadata removal algorithm",
      "📚 Search Library - Search by name, artist, or title",
      "🎯 Filter System - All / Favorites / Genre filtering",
      "🎨 Cyberpunk UI - Neon effects, animations, modal overlays",
      "🎵 ACE-Step Integration - One-click send lyrics to ACE-Step",
      "⚡ Real-time Sync - 1-second polling for instant lyrics load",
    ],
  },
  {
    version: "v2.0.0",
    date: "2026-03-14",
    color: theme.colors.neon.cyan.primary,
    changes: [
      "3-column grid layout for ACE-Step tab",
      "Container width increased 900px → 1600px",
      "AI Chain-of-Thought moved to Advanced Settings",
      "Status badge at top (Online/Offline + Refresh)",
      "Genre presets fix — 150+ subgenres now visible",
      "Session memory with SQLite persistence",
      "CUDA offload fix — 15x faster generation",
    ],
  },
  {
    version: "v2.0.0",
    date: "2026-03-12",
    color: theme.colors.neon.purple.primary,
    changes: [
      "Lyrics Library — save, load, download, delete",
      "House & Electronic: 23 subgenres updated",
      "Afrobeats / Afropop: 12 subgenres updated",
      "ACE-Step official parameters alignment",
      "Default model: turbo → sft (50 steps)",
      "Backup script improved — 90% smaller",
    ],
  },
  {
    version: "v2.0.0",
    date: "2026-03-10",
    color: theme.colors.neon.green.primary,
    changes: [
      "Prompt Generator: 164 subgenres, 13 styles, BPM selector",
      "30 Romanian subgenres: Manele, Folclor, Doină, Hora",
      "5 Vocal Chain Presets: Studio Radio, Natural, Arena, Radio, Balanced",
      "Suno AI Integration (local port 8080, cookie auth)",
      "Pipeline vocal/instrumental mix balance fixed (+3dB vocal)",
      "RVC defaults for singing optimized",
    ],
  },
  {
    version: "v1.9.1",
    date: "2026-03-08",
    color: theme.colors.neon.yellow.primary,
    changes: [
      "GPU Memory Management module",
      "6 API endpoints for GPU info",
      "Real-time VRAM display in frontend",
      "Session auto-save every 30 minutes",
    ],
  },
  {
    version: "v1.9.0",
    date: "2026-03-06",
    color: theme.colors.neon.pink.primary,
    changes: [
      "Autotune: snap F0 to musical notes",
      "Clean Audio: spectral noise reduction",
      "Volume Envelope: RMS matching",
      "High-Pass Filter: Butterworth 48Hz",
      "Singing quality: 8/10 → 9/10",
    ],
  },
  {
    version: "v1.8.4",
    date: "2026-03-06",
    color: theme.colors.neon.red.primary,
    changes: [
      "RVC Rescue post-processing chain",
      "EQ → Compressor → Reverb → Limiter → Loudnorm",
      "Quality improvement: 5/10 → 8/10",
      "Optimized for singing: harvest, 0.40 index, 0.55 protect",
    ],
  },
];

const quickStart = [
  { cmd: "git clone https://github.com/iulicafarafrica/VocalForge.git", desc: "Clone repository" },
  { cmd: "cd VocalForge", desc: "Enter directory" },
  { cmd: "setup.bat", desc: "Install all dependencies" },
  { cmd: "START_ALL.bat", desc: "Launch all services" },
];

const services = [
  { name: "Frontend UI", url: "localhost:3000", port: 3000, color: theme.colors.neon.cyan.primary },
  { name: "Backend API", url: "localhost:8000", port: 8000, color: theme.colors.neon.purple.primary },
  { name: "API Docs", url: "localhost:8000/docs", port: 8000, color: theme.colors.neon.green.primary },
  { name: "ACE-Step API", url: "localhost:8001", port: 8001, color: theme.colors.neon.yellow.primary },
  { name: "RVC API", url: "localhost:8002", port: 8002, color: theme.colors.neon.pink.primary },
];

const hardware = {
  minimum: [
    { comp: "CPU", spec: "Intel i5 / AMD Ryzen 5" },
    { comp: "RAM", spec: "16GB" },
    { comp: "GPU", spec: "GTX 1060 6GB (CUDA 11.8+)" },
    { comp: "Storage", spec: "50GB free" },
  ],
  recommended: [
    { comp: "CPU", spec: "Intel i7 / AMD Ryzen 7" },
    { comp: "RAM", spec: "32GB" },
    { comp: "GPU", spec: "RTX 3070 8GB (CUDA 11.8+)" },
    { comp: "Storage", spec: "100GB SSD" },
  ],
};

const roadmap = {
  phase1: [
    { status: "done", name: "Audio Understanding Engine", desc: "BPM/Key/Time Signature extraction" },
    { status: "planned", name: "Vocal2BGM", desc: "vocal → generate matching BGM with ACE-Step" },
    { status: "todo", name: "Multi-Track Layering", desc: "add instrumental layers" },
    { status: "todo", name: "LRC Generation", desc: "lyrics with timestamps" },
    { status: "todo", name: "Copy Melody", desc: "extract melody patterns from reference audio" },
  ],
  phase2: [
    { status: "todo", name: "RVC Quality Enhancement", desc: "better pitch accuracy, less artifacts" },
    { status: "todo", name: "Batch Processing", desc: "process multiple files simultaneously" },
    { status: "todo", name: "Real-Time RVC Preview", desc: "hear conversion before committing" },
    { status: "todo", name: "AI Mastering", desc: "automatic loudness, EQ, compression" },
    { status: "todo", name: "Cloud Sync", desc: "presets and tracks across devices" },
  ],
  phase3: [
    { status: "todo", name: "Vocal Harmonizer", desc: "generate harmonies from single vocal" },
    { status: "todo", name: "Chord Detection", desc: "extract chord progressions" },
    { status: "todo", name: "Drum Pattern Extraction", desc: "isolate and export patterns" },
    { status: "todo", name: "Formant Shifting", desc: "adjust voice character without pitch" },
  ],
};

const knownIssues = [
  { severity: "design", name: "RVC trained on SPEECH not SINGING", status: "Known — best case 8/10 with Rescue" },
  { severity: "high", name: "No test coverage", status: "Backlog — needs pytest + Jest" },
  { severity: "medium", name: "Hardcoded Windows paths", status: "Backlog — needs env vars" },
  { severity: "medium", name: "Large files >2000 lines", status: "Backlog — needs refactor" },
  { severity: "low", name: "Inconsistent version numbers", status: "Backlog — centralize in VERSION" },
  { severity: "low", name: "Inline styles in React", status: "Backlog — move to CSS modules" },
];

const apiEndpoints = [
  { method: "POST", path: "/demucs_separate", desc: "Separate stems (vocals, drums, bass, other)" },
  { method: "POST", path: "/rvc/convert", desc: "RVC voice conversion" },
  { method: "POST", path: "/rvc/auto_pipeline", desc: "Full auto pipeline (separate → RVC → post-process)" },
  { method: "POST", path: "/pipeline/run", desc: "Complete 4-stage pipeline v2.3" },
  { method: "GET", path: "/pipeline/status/{job_id}", desc: "Poll job status (async)" },
  { method: "GET", path: "/pipeline/download/{job_id}/{file}", desc: "Download output file" },
  { method: "POST", path: "/ace_generate", desc: "ACE-Step music generation" },
  { method: "GET", path: "/ace_health", desc: "ACE-Step health check (port 8001)" },
  { method: "GET", path: "/hardware", desc: "GPU hardware info" },
  { method: "GET", path: "/vram_usage", desc: "Current VRAM usage" },
  { method: "GET", path: "/gpu/info", desc: "Detailed GPU VRAM info" },
  { method: "GET", path: "/gpu/cleanup", desc: "Manual GPU VRAM cleanup" },
  { method: "POST", path: "/gpu/unload/{name}", desc: "Unload specific model from VRAM" },
  { method: "POST", path: "/gpu/unload-all", desc: "Unload all models from VRAM" },
];

const performanceData = [
  { task: "BS-RoFormer Separation", quality: "92%", time: "~30s", vram: "4-5GB" },
  { task: "RVC + Rescue", quality: "80%", time: "~20s", vram: "4-6GB" },
  { task: "Full Pipeline (4 stages)", quality: "90%", time: "~80s", vram: "6-8GB" },
  { task: "ACE-Step Turbo (1 min)", quality: "80%", time: "~60s", vram: "6-7GB" },
  { task: "ACE-Step Base (3 min)", quality: "90%", time: "~180s", vram: "7-8GB" },
];

const qualityMetrics = [
  { metric: "Separation SDR", target: ">12dB", achieved: "12.97dB ✅" },
  { metric: "Voice UTMOS", target: ">4.0", achieved: "4.2 ✅" },
  { metric: "Loudness LUFS", target: "-14 ±1", achieved: "-10 ✅" },
  { metric: "True Peak", target: "<-1 dBTP", achieved: "-1.1 ✅" },
];

// ── Components ────────────────────────────────────────────────────────────────

const Hero = () => (
  <div style={s.hero}>
    <div style={s.heroGlow} />
    <div style={s.heroTitle}>🎵 VOCALFORGE</div>
    <div style={s.heroSubtitle}>AI-Powered Music Production Studio</div>
    <div style={s.heroPowered}>⚡ Powered by ACE-Step v1.5</div>
    <div style={s.badges}>
      <span style={s.badge}>v2.0.0</span>
      <span style={s.badge}>🐍 Python 3.10+</span>
      <span style={s.badge}>🎮 NVIDIA CUDA</span>
      <span style={s.badge}>📄 MIT License</span>
    </div>
    <div style={{ marginTop: 40, position: "relative", zIndex: 1 }}>
      <button style={s.button}>
        <Icons.Play /> Watch Demo
      </button>
    </div>
  </div>
);

const ModulesGrid = () => (
  <div style={{ ...s.grid, marginBottom: 40 }}>
    {modules.map((m, i) => (
      <div key={i} style={s.infoCard}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>{m.icon}</div>
        <div style={{ color: theme.colors.text.primary, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{m.name}</div>
        <div style={{ color: theme.colors.text.muted, fontSize: 11 }}>{m.desc}</div>
      </div>
    ))}
  </div>
);

const FeaturesGrid = () => {
  const [hovered, setHovered] = useState(null);
  
  return (
    <div style={s.grid}>
      {features.map((f, i) => (
        <div
          key={i}
          style={{
            ...s.card,
            borderColor: hovered === i ? f.color : `${theme.colors.neon.purple.primary}22`,
            transform: hovered === i ? "translateY(-4px)" : "none",
            boxShadow: hovered === i ? theme.shadows.cyan : "none",
          }}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
        >
          <div style={s.cardHeader}>
            <div style={{ ...s.cardIcon, background: f.bg, border: `1px solid ${f.color}33`, color: f.color, boxShadow: `0 0 25px ${f.glow}33` }}>
              <f.Icon />
            </div>
            <div>
              <div style={s.cardTitle}>{f.title}</div>
              <div style={s.cardSubtitle}>{f.subtitle}</div>
            </div>
          </div>
          <ul style={s.featureList}>
            {f.items.map((item, j) => (
              <li key={j} style={s.featureItem}>
                <span style={{ color: f.color, marginTop: 4, flexShrink: 0 }}><Icons.Check /></span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

const PipelineSection = () => (
  <div style={s.pipeline}>
    {pipelineStages.map((stage) => (
      <div key={stage.num} style={s.pipelineStage}>
        <div style={s.pipelineNumber}>{stage.num}</div>
        <div style={s.pipelineTitle}>{stage.title}</div>
        <div style={{ fontSize: 12, color: theme.colors.text.muted, marginBottom: 12 }}>{stage.desc}</div>
        <ul style={{ ...s.featureList, margin: 0 }}>
          {stage.details.map((d, i) => (
            <li key={i} style={{ ...s.featureItem, fontSize: 12, color: theme.colors.text.secondary, borderColor: `${theme.colors.neon.cyan.primary}11` }}>
              <span style={{ color: theme.colors.neon.cyan.primary, marginTop: 2, flexShrink: 0 }}><Icons.Check /></span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
        <div style={s.pipelineStats}>
          <div style={s.stat}>⏱ {stage.time}</div>
          <div style={s.stat}>💾 {stage.vram} VRAM</div>
        </div>
      </div>
    ))}
  </div>
);

const QuickStart = () => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
    <div>
      <div style={s.sectionTitle}><Icons.Terminal /> Quick Start</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {quickStart.map((step, i) => (
          <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: theme.gradients.purple, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 12, flexShrink: 0,
              boxShadow: `0 0 15px ${theme.colors.neon.purple.glow}`,
            }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={s.codeBlock}>{step.cmd}</div>
              <div style={{ fontSize: 11, color: theme.colors.text.muted, marginTop: 6 }}>{step.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
    <div>
      <div style={s.sectionTitle}><Icons.Server /> Services</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {services.map((svc, i) => (
          <div key={i} style={s.serviceCard}>
            <div style={{ ...s.serviceDot, background: svc.color, color: svc.color }} />
            <div style={{ flex: 1 }}>
              <div style={{ color: theme.colors.text.primary, fontSize: 13, fontWeight: 700 }}>{svc.name}</div>
              <div style={{ color: theme.colors.text.muted, fontSize: 11 }}>{svc.url}</div>
            </div>
            <div style={{
              background: `${svc.color}11`, color: svc.color,
              padding: "5px 12px", borderRadius: 8,
              fontSize: 11, fontWeight: 700,
              border: `1px solid ${svc.color}33`,
            }}>{svc.port}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const HardwareSection = () => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
    <div>
      <div style={s.sectionTitle}>⚠️ Minimum</div>
      <table style={s.table}>
        <tbody>
          {hardware.minimum.map((h, i) => (
            <tr key={i}>
              <td style={{ ...s.th, width: "30%" }}>{h.comp}</td>
              <td style={s.td}>{h.spec}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div>
      <div style={s.sectionTitle}>✅ Recommended</div>
      <table style={s.table}>
        <tbody>
          {hardware.recommended.map((h, i) => (
            <tr key={i}>
              <td style={{ ...s.th, width: "30%", background: theme.colors.neon.green.bg }}>{h.comp}</td>
              <td style={s.td}>{h.spec}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const RoadmapSection = () => (
  <div>
    <div style={{ marginBottom: 32 }}>
      <div style={{ ...s.sectionTitle, marginBottom: 16 }}>
        <Icons.Target /> Phase 1: Core Features (Q2 2026) — 20% complete
      </div>
      <div style={s.infoGrid}>
        {roadmap.phase1.map((item, i) => (
          <div key={i} style={{ ...s.infoCard, border: `1px solid ${item.status === "done" ? theme.colors.neon.green.primary : theme.colors.neon.purple.primary}22` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>{item.status === "done" ? "✅" : item.status === "planned" ? "🔵" : "⚪"}</span>
              <span style={{ color: theme.colors.text.primary, fontSize: 13, fontWeight: 700 }}>{item.name}</span>
            </div>
            <div style={{ color: theme.colors.text.muted, fontSize: 11 }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
    
    <div style={{ marginBottom: 32 }}>
      <div style={{ ...s.sectionTitle, marginBottom: 16 }}>
        <Icons.Target /> Phase 2: Quality Improvements (Q3 2026) — 0% complete
      </div>
      <div style={s.infoGrid}>
        {roadmap.phase2.map((item, i) => (
          <div key={i} style={s.infoCard}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>⚪</span>
              <span style={{ color: theme.colors.text.primary, fontSize: 13, fontWeight: 700 }}>{item.name}</span>
            </div>
            <div style={{ color: theme.colors.text.muted, fontSize: 11 }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </div>

    <div>
      <div style={{ ...s.sectionTitle, marginBottom: 16 }}>
        <Icons.Target /> Phase 3: Advanced Features (Q4 2026) — 0% complete
      </div>
      <div style={s.infoGrid}>
        {roadmap.phase3.map((item, i) => (
          <div key={i} style={s.infoCard}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>⚪</span>
              <span style={{ color: theme.colors.text.primary, fontSize: 13, fontWeight: 700 }}>{item.name}</span>
            </div>
            <div style={{ color: theme.colors.text.muted, fontSize: 11 }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const Changelog = () => (
  <div>
    {changelogData.map((entry, i) => (
      <div key={i} style={{ ...s.changelogCard, border: `1px solid ${entry.color}22` }}>
        <div style={s.changelogVersion}>
          <span style={{ color: entry.color, textShadow: `0 0 20px ${entry.glow}` }}>{entry.version}</span>
          <span style={{ color: theme.colors.text.muted, fontSize: 12 }}>{entry.date}</span>
        </div>
        <div style={s.changelogDate} />
        <ul style={s.featureList}>
          {entry.changes.map((change, j) => (
            <li key={j} style={s.changelogItem}>
              <span style={{ color: entry.color, marginTop: 2, flexShrink: 0 }}><Icons.Check /></span>
              <span>{change}</span>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

export default function ReadmeTab() {
  const [activeTab, setActiveTab] = useState("overview");
  const [subTab, setSubTab] = useState("features");

  const tabs = [
    { id: "overview", label: "📖 Overview" },
    { id: "pipeline", label: "🔄 Pipeline" },
    { id: "features", label: "⭐ Features" },
    { id: "install", label: "📦 Install" },
    { id: "api", label: "🔌 API" },
    { id: "roadmap", label: "🗺️ Roadmap" },
    { id: "changelog", label: "📝 Changelog" },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <>
            <div style={s.section}>
              <div style={s.sectionTitle}><Icons.Package /> 10 Main Modules</div>
              <ModulesGrid />
            </div>
            <div style={s.section}>
              <div style={s.sectionTitle}><Icons.Zap /> Features</div>
              <FeaturesGrid />
            </div>
          </>
        );
      
      case "pipeline":
        return (
          <div style={s.section}>
            <div style={s.sectionTitle}><Icons.Layers /> Pipeline v2.3 — Complete Flow</div>
            <PipelineSection />
          </div>
        );
      
      case "features":
        return (
          <div>
            <div style={{ ...s.subTabNav, marginBottom: 24 }}>
              {["features", "acestep", "applio", "rvc", "gpu"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSubTab(tab)}
                  style={{ ...s.subTab, ...(subTab === tab ? s.subTabActive : {}) }}
                >
                  {tab === "acestep" ? "ACE-Step" : tab === "rvc" ? "RVC Rescue" : tab === "gpu" ? "GPU Info" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            
            {subTab === "features" && (
              <div style={s.section}>
                <div style={s.sectionTitle}>🎯 Vocal Chain Presets</div>
                <div style={s.infoGrid}>
                  {vocalPresets.map((p, i) => (
                    <div key={i} style={s.infoCard}>
                      <div style={{ color: theme.colors.text.primary, fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{p.name}</div>
                      <div style={{ color: theme.colors.text.muted, fontSize: 11 }}>{p.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {subTab === "acestep" && (
              <div style={s.section}>
                <div style={s.sectionTitle}>🎵 ACE-Step Models</div>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Model</th>
                      <th style={s.th}>Steps</th>
                      <th style={s.th}>Time</th>
                      <th style={s.th}>Quality</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aceStepModels.map((m, i) => (
                      <tr key={i}>
                        <td style={{ ...s.td, color: m.color, fontWeight: 700 }}>{m.name}</td>
                        <td style={s.td}>{m.steps}</td>
                        <td style={s.td}>{m.time}</td>
                        <td style={s.td}>{m.quality}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {subTab === "applio" && (
              <div style={s.section}>
                <div style={s.sectionTitle}>🎤 Applio Features (v1.9.0)</div>
                <div style={s.infoGrid}>
                  {applioFeatures.map((f, i) => (
                    <div key={i} style={s.infoCard}>
                      <div style={{ color: theme.colors.neon.cyan.primary, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{f.name}</div>
                      <div style={{ color: theme.colors.text.muted, fontSize: 11, lineHeight: 1.6 }}>{f.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {subTab === "rvc" && (
              <div style={s.section}>
                <div style={s.sectionTitle}>🏥 RVC Rescue Post-Processing</div>
                <div style={{ ...s.card, marginBottom: 24 }}>
                  <div style={{ color: theme.colors.text.secondary, fontSize: 13, marginBottom: 16, lineHeight: 1.7 }}>
                    <span style={{ color: theme.colors.neon.red.primary, fontWeight: 700 }}>⚠️ RVC models are trained on speech, not singing.</span> Without post-processing: 5/10 quality (robotic, no vibrato, no dynamics).
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, textAlign: "center" }}>
                    <div style={{ background: theme.colors.neon.red.bg, padding: 16, borderRadius: 12, border: `1px solid ${theme.colors.neon.red.primary}33` }}>
                      <div style={{ color: theme.colors.neon.red.primary, fontSize: 24, fontWeight: 900 }}>5/10</div>
                      <div style={{ color: theme.colors.text.muted, fontSize: 11 }}>Raw RVC</div>
                    </div>
                    <div style={{ background: theme.colors.neon.green.bg, padding: 16, borderRadius: 12, border: `1px solid ${theme.colors.neon.green.primary}33` }}>
                      <div style={{ color: theme.colors.neon.green.primary, fontSize: 24, fontWeight: 900 }}>8/10 ✅</div>
                      <div style={{ color: theme.colors.text.muted, fontSize: 11 }}>RVC + Rescue</div>
                    </div>
                  </div>
                </div>
                <div style={s.infoGrid}>
                  {["EQ", "Compressor", "Reverb", "Limiter", "Loudnorm"].map((step, i) => (
                    <div key={i} style={s.infoCard}>
                      <div style={{ color: theme.colors.neon.cyan.primary, fontSize: 13, fontWeight: 700 }}>{i + 1}. {step}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {subTab === "gpu" && (
              <div style={s.section}>
                <div style={s.sectionTitle}>💻 GPU Memory Management</div>
                <div style={{ ...s.card, marginBottom: 24 }}>
                  <div style={{ color: theme.colors.neon.cyan.primary, fontSize: 14, fontWeight: 800, marginBottom: 12 }}>🎮 NVIDIA RTX 3070 8GB optimized</div>
                  <ul style={s.featureList}>
                    {[
                      "Real-time VRAM monitoring via /gpu/info",
                      "Auto-unload RVC models after conversion",
                      "FP16 inference — halves VRAM usage",
                      "Tiled decode for long audio generation",
                      "ACESTEP_INIT_LLM=false saves ~12GB RAM",
                    ].map((item, i) => (
                      <li key={i} style={s.featureItem}>
                        <span style={{ color: theme.colors.neon.cyan.primary, marginTop: 4 }}><Icons.Check /></span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div style={s.sectionTitle}>🧠 LLM Impact (ACE-STEP)</div>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Setting</th>
                      <th style={s.th}>RAM</th>
                      <th style={s.th}>Audio Quality</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ ...s.td, color: theme.colors.neon.red.primary }}>INIT_LLM=true</td>
                      <td style={s.td}>~16GB</td>
                      <td style={{ ...s.td, color: theme.colors.neon.green.primary }}>Identical ✅</td>
                    </tr>
                    <tr>
                      <td style={{ ...s.td, color: theme.colors.neon.green.primary }}>INIT_LLM=false ✅</td>
                      <td style={s.td}>~4GB</td>
                      <td style={{ ...s.td, color: theme.colors.neon.green.primary }}>Identical ✅</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      
      case "install":
        return (
          <div>
            <QuickStart />
            <div style={{ marginTop: 40 }}>
              <HardwareSection />
            </div>
          </div>
        );
      
      case "api":
        return (
          <div style={s.section}>
            <div style={s.sectionTitle}><Icons.Server /> Main Endpoints (Port 8000)</div>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Method</th>
                  <th style={s.th}>Endpoint</th>
                  <th style={s.th}>Description</th>
                </tr>
              </thead>
              <tbody>
                {apiEndpoints.map((ep, i) => (
                  <tr key={i}>
                    <td style={{ ...s.td, fontFamily: "monospace", color: ep.method === "GET" ? theme.colors.neon.green.primary : theme.colors.neon.purple.primary, fontWeight: 700 }}>{ep.method}</td>
                    <td style={{ ...s.td, fontFamily: "monospace", color: theme.colors.neon.cyan.primary }}>{ep.path}</td>
                    <td style={s.td}>{ep.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      
      case "roadmap":
        return <RoadmapSection />;
      
      case "changelog":
        return (
          <div>
            <div style={s.section}>
              <div style={s.sectionTitle}><Icons.GitBranch /> Changelog</div>
              <Changelog />
            </div>
            <div style={s.section}>
              <div style={s.sectionTitle}><Icons.Alert /> Known Issues</div>
              <div style={s.infoGrid}>
                {knownIssues.map((issue, i) => (
                  <div key={i} style={{ ...s.infoCard, border: `1px solid ${issue.severity === "high" ? theme.colors.neon.red.primary : issue.severity === "medium" ? theme.colors.neon.yellow.primary : theme.colors.neon.purple.primary}22` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 14 }}>{issue.severity === "high" ? "🔴" : issue.severity === "medium" ? "🟠" : issue.severity === "design" ? "⚠️" : "🟡"}</span>
                      <span style={{ color: theme.colors.text.primary, fontSize: 12, fontWeight: 700 }}>{issue.name}</span>
                    </div>
                    <div style={{ color: theme.colors.text.muted, fontSize: 11 }}>{issue.status}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={s.section}>
              <div style={s.sectionTitle}><Icons.Activity /> Performance Benchmarks (RTX 3070 8GB)</div>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Task</th>
                    <th style={s.th}>Quality</th>
                    <th style={s.th}>Time</th>
                    <th style={s.th}>VRAM</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceData.map((p, i) => (
                    <tr key={i}>
                      <td style={{ ...s.td, color: theme.colors.text.primary, fontWeight: 700 }}>{p.task}</td>
                      <td style={s.td}>{p.quality}</td>
                      <td style={s.td}>{p.time}</td>
                      <td style={s.td}>{p.vram}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={s.section}>
              <div style={s.sectionTitle}><Icons.Target /> Quality Metrics</div>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Metric</th>
                    <th style={s.th}>Target</th>
                    <th style={s.th}>Achieved</th>
                  </tr>
                </thead>
                <tbody>
                  {qualityMetrics.map((q, i) => (
                    <tr key={i}>
                      <td style={{ ...s.td, color: theme.colors.text.primary, fontWeight: 700 }}>{q.metric}</td>
                      <td style={s.td}>{q.target}</td>
                      <td style={{ ...s.td, color: theme.colors.neon.green.primary, fontWeight: 700 }}>{q.achieved}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div style={s.container}>
      <div style={s.bgGrid} />
      
      <Hero />

      {/* Main Tab Navigation */}
      <div style={s.tabNav}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...s.tab,
              ...(activeTab === tab.id ? s.tabActive : {}),
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {renderContent()}

      {/* Global Styles for Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #0a0a1a;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #9b2de0, #00e5ff);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #00e5ff, #9b2de0);
        }
      `}</style>
    </div>
  );
}
