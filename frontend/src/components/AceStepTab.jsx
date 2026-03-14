import React, { useState, useEffect, useRef, useCallback } from "react";

const API = "http://localhost:8000";

// ── Seed Library helpers ───────────────────────────────────────────────────────
const SEEDS_KEY = "acestep_seeds_v1";
function loadSeeds() {
  try { const s = localStorage.getItem(SEEDS_KEY); if (s) return JSON.parse(s); } catch {}
  return [];
}
function saveSeedsToStorage(seeds) {
  try { localStorage.setItem(SEEDS_KEY, JSON.stringify(seeds)); } catch {}
}

// ── Lyrics Library helpers ──────────────────────────────────────────────────────
const LYRICS_KEY = "acestep_lyrics_library_v1";
function loadLyricsLibrary() {
  try { const s = localStorage.getItem(LYRICS_KEY); if (s) return JSON.parse(s); } catch {}
  return [];
}
function saveLyricsToStorage(lyrics) {
  try { localStorage.setItem(LYRICS_KEY, JSON.stringify(lyrics)); } catch {}
}

// ── Preset helpers ─────────────────────────────────────────────────────────────
const PRESETS_KEY = "acestep_presets_v1";

const DEFAULT_PRESETS = [
  {
    id: "default_generate",
    name: "🎵 Generate Track",
    icon: "🎵",
    color: "#ffd166",
    builtIn: true,
    settings: {
      taskType: "text2music",
      prompt: "pop music, upbeat, catchy chorus, modern production, radio-friendly",
      lyrics: "",
      duration: 60,
      guidanceScale: 7,
      inferSteps: 20,
      seed: -1,
      bpm: 0,
      keyScale: "",
      negativePrompt: "",
      sourceStrength: 0.5,
    },
  },
  {
    id: "default_cover",
    name: "🎵 Audio Cover",
    icon: "🎤",
    color: "#c77dff",
    builtIn: true,
    settings: {
      taskType: "audio2audio",
      prompt: "pop music, modern production, high quality",
      lyrics: "",
      duration: 60,
      guidanceScale: 7,
      inferSteps: 20,
      seed: -1,
      bpm: 0,
      keyScale: "",
      negativePrompt: "low quality, noise, distortion",
      sourceStrength: 0.5,
    },
  },
  {
    id: "default_turbo",
    name: "⚡ Turbo Fast",
    icon: "⚡",
    color: "#06d6a0",
    builtIn: true,
    settings: {
      taskType: "text2music",
      prompt: "hip hop trap beat, 808 bass, dark atmosphere",
      lyrics: "",
      duration: 30,
      guidanceScale: 5,
      inferSteps: 8,
      seed: -1,
      bpm: 0,
      keyScale: "",
      negativePrompt: "",
      sourceStrength: 0.5,
    },
  },
  {
    id: "default_quality",
    name: "🎯 Max Quality",
    icon: "🎯",
    color: "#00e5ff",
    builtIn: true,
    settings: {
      taskType: "text2music",
      prompt: "orchestral cinematic music, epic strings, piano, emotional, high quality",
      lyrics: "",
      duration: 120,
      guidanceScale: 9,
      inferSteps: 40,
      seed: -1,
      bpm: 0,
      keyScale: "",
      negativePrompt: "low quality, noise, distortion, artifacts",
      sourceStrength: 0.5,
    },
  },
];

function loadPresets() {
  try {
    const saved = localStorage.getItem(PRESETS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

function savePresetsToStorage(presets) {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  } catch {}
}

const GENRE_PRESETS = [
  // ── Hip-Hop & Rap ──────────────────────────────────────────────────────────
  // Actualizat 2026: mici ajustări + 6 subgenuri noi (distorted rage, jerk trap etc.)

{ label: "Hip-Hop", cat: "Hip-Hop", prompt: "classic boom-bap 2026, authentic sample-based production, East Coast articulate delivery, punchy analog drum transients, soulful jazz/funk chops, Nas & Wu-Tang style: confident baritone flow, complex wordplay, no auto-tune, raw mic presence, high-fidelity boom-bap master", bpm: 92, negativePrompt: "orchestral, EDM four-on-the-floor, cheesy pop chorus, country twang, metal distortion, modern trap 808" },
{ label: "Trap (general)", cat: "Hip-Hop", prompt: "modern trap 2026, booming 808 sub-bass, rapid hi-hat rolls, dark atmospheric synths, crisp transient-focused drum mix, Southern influence, Metro Boomin & Migos style: triplet flows, ad-libs, catchy hooks, aggressive delivery, radio-ready punchy mix", bpm: 140, negativePrompt: "jazz swing, orchestral, acoustic guitar, reggae skank, smooth R&B crooning, lo-fi grit" },
{ label: "Jersey Club Rap", cat: "Hip-Hop", prompt: "jersey club rap 2026, heavy stuttering kicks, high-energy bounce, viral club-ready production, Osamason style: rapid chopped vocal samples, aggressive underground bounce, dynamic club master, rhythmic percussion focus", bpm: 140, negativePrompt: "slow melodic trap, deep atmospheric pads, orchestral strings, smooth jazz, chill lo-fi, acoustic ballad" },
{ label: "Hyperpop Rap / Digicore", cat: "Hip-Hop", prompt: "hyperpop rap digicore 2026, chaotic glitchy production, high-pitched auto-tune vocals, distorted beats, 100 gecs & brakence style: pixelated synth layers, rhythmic vocal gating, overstimulated emotional delivery, viral underground energy, saturated digital mix", bpm: 140, negativePrompt: "clean trap 808, boom bap drums, orchestral epic, smooth R&B crooning, slow ballad, analog vintage" },
{ label: "Corridos Tumbados", cat: "Hip-Hop", prompt: "corridos tumbados latin trap evolution 2026, regional mexican strings fused with heavy 808 trap, street storytelling, Peso Pluma style: auto-tune melodic hooks, belic aggressive delivery, punchy dynamic mix, authentic street urban sound", bpm: 130, negativePrompt: "classic reggaeton dembow, orchestral symphony, smooth jazz, pure boom bap, metal distortion, club house" },
{ label: "Atlanta Trap", cat: "Hip-Hop", prompt: "Atlanta trap 2026, heavy 808 sub-bass, menacing synth stabs, classic Southern triplet flow, Gucci Mane & Young Jeezy style: gruff delivery, iconic ad-libs, street bravado, punchy club-ready mix, high-impact snare patterns", bpm: 138, negativePrompt: "bright pop chords, orchestral strings, jazz piano, reggae one-drop, indie folk" },
{ label: "AI Voice Rap / Synth Rap", cat: "Hip-Hop", prompt: "experimental AI-generated rap 2026, robotic processed flows, uncanny valley vocal synthesis, glitchy synth textures, SoundCloud underground style: experimental hyper-digital sound, meme-ready viral energy, crisp artificial production", bpm: 145, negativePrompt: "human raw vocals, organic production, orchestral epic, smooth jazz, conscious lyrical storytelling" },
{ label: "Melodic Trap", cat: "Hip-Hop", prompt: "melodic trap 2026, smooth emotive auto-tune crooning, hazy atmospheric pads, sing-rap flow, Future & Travis Scott style: layered melodic hooks, slurred rhythmic delivery, high-fidelity polished master, airy spatial textures", bpm: 135, negativePrompt: "harsh screaming, metal guitars, orchestral, jazz improvisation, raw boom bap, aggressive distortion" },
{ label: "Hard / Dark Trap", cat: "Hip-Hop", prompt: "hard dark trap 2026, distorted 808 bass, menacing horror-inspired atmosphere, minimal melody focus, 21 Savage style: deadpan cold delivery, sparse rhythmic flow, aggressive punchy mix, high-impact percussion", bpm: 142, negativePrompt: "uplifting major key, pop chorus, jazz chords, orchestral, reggae, ambient soft" },
{ label: "Distorted Rage Rap", cat: "Hip-Hop", prompt: "distorted rage rap 2026, extreme aggressive 808, noisy chaotic synth loops, manic intensity, Osamason style: unhinged flow, noise-influenced textures, raw underground internet energy, saturated impact-focused mix", bpm: 150, negativePrompt: "clean melodic hooks, smooth autotune, orchestral, jazz swing, chill lo-fi" },
{ label: "Jerk Trap / Hoodtrap", cat: "Hip-Hop", prompt: "jerk trap hoodtrap 2026, fast manic Atlanta underground bounce, quirky unhinged delivery, Glokk40Spaz style: exaggerated rhythmic flows, chaotic ad-libs, raw street energy, punchy transient mix", bpm: 145, negativePrompt: "slow melodic trap, conscious lyrics, orchestral epic, smooth R&B, polished pop" },
{ label: "Futuristic Trap", cat: "Hip-Hop", prompt: "futuristic trap 2026, sci-fi metallic synths, heavy distorted 808, Drippy Shorty style: experimental sound design, dark aggressive atmosphere, high-energy modern trap, precise digital mix", bpm: 140, negativePrompt: "classic boom bap, jazz samples, lo-fi chill, orchestral, folk acoustic" },
{ label: "UK Underground Rap", cat: "Hip-Hop", prompt: "UK underground rap 2026, indie-electro hybrid production, witty flows, Jim Legxacy style: experimental genre-blending, British accent, high-quality underground aesthetic, crisp clean mix", bpm: 130, negativePrompt: "mainstream trap hats, rage screaming, orchestral, country, aggressive EDM" },
{ label: "Indie Trap Hybrid", cat: "Hip-Hop", prompt: "indie trap hybrid 2026, guitar-driven trap beats, alternative rap, bedroom production aesthetic, introspective emotional vibe, Aeter style: genre-breaking indie-electronic fusion, natural organic master", bpm: 110, negativePrompt: "hard trap 808, rage distortion, metal guitars, pop chorus, cinematic orchestral" },
{ label: "Trap Choirs", cat: "Hip-Hop", prompt: "trap choirs 2026, layered choral vocal harmonies, experimental trap production, stacked ad-libs, innovative soundscapes, modern hip-hop trend: emotional depth, cinematic vocal master, crisp rhythmic base", bpm: 135, negativePrompt: "raw single vocal, boom bap drums, orchestral symphony, smooth jazz, minimalist rap" },
{ label: "EDM / Festival Trap", cat: "Hip-Hop", prompt: "festival trap 2026, big room EDM drops, 808 bass with massive electronic build-ups, RL Grime style: aggressive vocal chops, festival-ready dynamic master, high-energy anthem vibe", bpm: 140, negativePrompt: "acoustic folk, jazz trio, lo-fi chill, orchestral waltz, soft ballad" },
{ label: "Drill", cat: "Hip-Hop", prompt: "drill 2026, dark sliding 808 sub-bass, aggressive triplet trap drums, menacing atmosphere, Pop Smoke style: deep gravelly vocals, cold gritty flow, punchy modern drill master, street-focused delivery", bpm: 143, negativePrompt: "bright pop, jazz, reggae groove, uplifting chords, orchestral, soft R&B" },
{ label: "UK Drill", cat: "Hip-Hop", prompt: "UK drill 2026, dark menacing vibe, heavy sliding 808 bass, rapid fire drill hi-hats, hard snappy snares, dark synth stabs, Digga D style: British accent, cold street energy, precise aggressive mix", bpm: 142, negativePrompt: "happy major key, disco funk, reggae skank, smooth jazz, bright pop, orchestral" },
{ label: "NY Drill", cat: "Hip-Hop", prompt: "NY drill 2026, dark eerie piano samples, heavy 808 bass, Brooklyn drill sound, Fivio Foreign style: deep booming presence, slow heavy flow, ad-libs, aggressive gritty master", bpm: 145, negativePrompt: "bright pop harmony, liquid DnB, funky disco, reggae skank, lo-fi chill" },
{ label: "Afro Drill", cat: "Hip-Hop", prompt: "afro drill 2026, afrobeats-inspired percussion, dark 808 bass, Burna Boy style: melodic Afro-infused vocals, rhythmic cadence, catchy hooks, danceable street energy, clean balanced master", bpm: 128, negativePrompt: "metal screaming, orchestral, harsh industrial, dark ambient, extreme distortion" },
{ label: "Melodic Rap", cat: "Hip-Hop", prompt: "melodic rap 2026, auto-tune vocal focus, emotional trap rhythm, modern rap production, Roddy Ricch style: catchy hooks, sing-rap blend, radio-ready polished master, clear vocal presence", bpm: 132, negativePrompt: "raw boom bap, orchestral, jazz improvisation, harsh screaming, dark aggressive trap" },
{ label: "Emo Rap", cat: "Hip-Hop", prompt: "emo rap 2026, sad guitar melodies, emotional lyrical depth, lo-fi trap rhythm, Lil Peep style: raw vulnerable vocals, heart-felt delivery, atmospheric mix, indie-trap fusion", bpm: 85, negativePrompt: "bright uplifting chords, EDM drop, cheesy pop, reggae skank, aggressive club banger" },
{ label: "Cloud Rap", cat: "Hip-Hop", prompt: "cloud rap 2026, ethereal atmospheric synths, dreamy hazy production, Bladee style: distant reverb-heavy vocals, monotone melodic delivery, abstract lyrical tone, spacious spatial master", bpm: 78, negativePrompt: "aggressive distortion, metal, orchestral epic, bright pop chorus, high-impact trap" },
{ label: "Phonk", cat: "Hip-Hop", prompt: "phonk 2026, Memphis rap samples, chopped vocal stabs, heavy 808, gritty cowbell textures, DJ Smokey style: lo-fi gritty master, hypnotic flow, sinister repetitive hooks", bpm: 130, negativePrompt: "clean polished pop mix, orchestral, jazz swing, bright melody" },
{ label: "Drift Phonk", cat: "Hip-Hop", prompt: "drift phonk 2026, aggressive distorted 808, fast-paced adrenaline, cowbell-driven, Kordhell style: extreme distortion, instrumental-focused vocal stabs, high-energy impact master", bpm: 170, negativePrompt: "smooth jazz, acoustic ballad, orchestral, reggae groove, soft ambient" },
{ label: "Memphis Rap", cat: "Hip-Hop", prompt: "Memphis rap 2026, dark lo-fi beats, chopped sinister samples, Three 6 Mafia style: gruff delivery, horrorcore aesthetic, Southern drawl, hypnotic repetitive flow, raw lo-fi master", bpm: 95, negativePrompt: "bright pop, orchestral, smooth R&B, jazz piano, futuristic EDM" },
{ label: "Boom Bap", cat: "Hip-Hop", prompt: "boom bap 2026, classic 90s aesthetic, punchy acoustic drums, jazz-infused samples, lyrical rap flow, Pete Rock style: articulate storytelling, wordplay, warm organic vinyl master", bpm: 90, negativePrompt: "EDM four-on-the-floor, trap hi-hat spam, dubstep, glossy autotune, hyper-digital" },
{ label: "Gangsta Rap", cat: "Hip-Hop", prompt: "gangsta rap 2026, West Coast G-funk groove, heavy bass, iconic synth leads, street-focused storytelling, N.W.A style: aggressive confrontational delivery, deep voice, hard-hitting rhythmic master", bpm: 95, negativePrompt: "pop hook, R&B singing runs, orchestral, cheerful major key, fast trap triplets" },
{ label: "G-Funk", cat: "Hip-Hop", prompt: "G-funk 2026, West Coast slow groove, iconic synth melody, heavy melodic bass, laid-back rap flow, Snoop Dogg & Dr. Dre style: relaxed lazy drawl, melodic hooks, smooth polished master", bpm: 95, negativePrompt: "fast punk tempo, metal distortion, orchestral, EDM drop, aggressive trap" },
{ label: "Crunk", cat: "Hip-Hop", prompt: "crunk 2026, high-energy Southern rap, heavy bass, call-and-response chants, Lil Jon style: aggressive shouting, hype-man energy, party anthems, impactful club master", bpm: 108, negativePrompt: "slow ballad, orchestral, jazz trio, ambient drone, lo-fi chill" },
{ label: "Trap Soul", cat: "Hip-Hop", prompt: "trap soul 2026, R&B-infused trap, emotional intimate vocals, 808 bass, soulful melodic textures, Bryson Tiller style: smooth singing, vulnerable delivery, polished radio-ready master", bpm: 118, negativePrompt: "metal screaming, harsh distortion, orchestral epic, fast punk, industrial" },
{ label: "Mumble Rap", cat: "Hip-Hop", prompt: "mumble rap 2026, slurred melodic auto-tune flow, trap-heavy beats, catchy simple hooks, Lil Yachty style: playful carefree delivery, ad-lib heavy, bright polished digital master", bpm: 138, negativePrompt: "raw articulate flow, orchestral, jazz, aggressive screaming, traditional boom bap" },
{ label: "Rage Rap", cat: "Hip-Hop", prompt: "rage rap 2026, high-energy distorted 808, screaming ad-libs, Playboi Carti style: chaotic baby voice, high-pitched energy, repetitive catchy phrases, impact-heavy mix", bpm: 145, negativePrompt: "smooth jazz, ballad, orchestral, reggae one-drop, soft acoustic" },
{ label: "Pluggnb", cat: "Hip-Hop", prompt: "pluggnb 2026, melodic trap fusion, R&B chords, dreamy synth pads, SoFaygo style: soft melodic sing-rap, laid-back dreamy delivery, high-fidelity polished master", bpm: 128, negativePrompt: "harsh screaming, metal, orchestral, raw boom bap, aggressive drill" },
{ label: "SoundCloud Rap", cat: "Hip-Hop", prompt: "SoundCloud rap 2026, raw underground trap, DIY lo-fi production, rebellious energy, Lil Pump style: unfiltered delivery, aggressive simple hooks, raw impact-heavy mix", bpm: 135, negativePrompt: "polished pop production, orchestral, jazz, classical, high-end studio polish" },
{ label: "Hyphy", cat: "Hip-Hop", prompt: "hyphy 2026, Bay Area energy, screwed-up vocal nuances, thizz-focused rhythm, E-40 style: rapid cadence, slang-heavy delivery, unique Bay Area flow, energetic punchy mix", bpm: 105, negativePrompt: "slow ballad, orchestral, ambient, smooth jazz, chill lo-fi" },
{ label: "Chopped & Screwed", cat: "Hip-Hop", prompt: "chopped and screwed 2026, syrupy slowed Houston rhythm, pitched-down vocals, DJ Screw style: hypnotic heavy drag, rhythmic chops, dark spacious master", bpm: 65, negativePrompt: "fast tempo, EDM drop, bright pop, orchestral, energetic trap" },
{ label: "Trap Metal", cat: "Hip-Hop", prompt: "trap metal 2026, aggressive metal guitar riffs, heavy 808 bass, screaming distorted vocals, Scarlxrd style: intense growled delivery, dark industrial energy, high-compression wall-of-sound master", bpm: 140, negativePrompt: "smooth R&B, reggae groove, jazz swing, pop ballad, soft ambient" },
{ label: "Latin Trap", cat: "Hip-Hop", prompt: "latin trap 2026, Spanish-language urban trap, 808 bass, dembow-infused rhythm, Bad Bunny style: melodic rap/singing, Puerto Rican flow, catchy hook-focused production, polished club master", bpm: 95, negativePrompt: "orchestral symphony, jazz improvisation, metal screaming, slow ballad" },
{ label: "Afrotrap", cat: "Hip-Hop", prompt: "afrotrap 2026, African percussion fused with French trap flow, 808 bass, MHD style: rhythmic melodic rap, catchy Afro-urban hooks, street-focused dynamic master", bpm: 118, negativePrompt: "dark ambient, metal distortion, orchestral epic, slow ballad, pure EDM" },
{ label: "Grime", cat: "Hip-Hop", prompt: "grime 2026, London underground electronic-infused rap, aggressive MCing, Skepta style: fast British flow, rapid bars, dark electronic textures, high-energy punchy mix", bpm: 140, negativePrompt: "smooth jazz, reggae skank, orchestral, pop ballad, soft R&B" },
{ label: "Trap EDM", cat: "Hip-Hop", prompt: "trap EDM 2026, festival anthem, big room drops, heavy 808, Flosstradamus style: vocal chops, massive build-drop format, high-energy impact master", bpm: 150, negativePrompt: "acoustic folk, jazz trio, orchestral waltz, reggae one-drop, lofi chill" },
{ label: "Lo-fi Hip-Hop", cat: "Hip-Hop", prompt: "lo-fi hip hop 2026, chill study beats, warm vinyl crackle, jazz-sampled piano, instrumental-focused, Nujabes style: mellow groove, dusty texture, warm organic master", bpm: 72, negativePrompt: "aggressive distortion, EDM drop, metal, bright polished mix, hard trap" },
{ label: "Jazz Rap", cat: "Hip-Hop", prompt: "jazz rap 2026, complex jazz samples, hip hop rhythm, Tribe Called Quest style: smooth intelligent flow, conversational delivery, positive vibe, warm natural mix", bpm: 88, negativePrompt: "EDM four-on-the-floor, trap hi-hat spam, metal, dubstep, hyperpop" },
{ label: "Conscious Rap", cat: "Hip-Hop", prompt: "conscious rap 2026, socially aware narrative, boom bap foundation, Kendrick Lamar style: articulate storytelling, varied flow, emotional range, message-driven, high-fidelity clear mix", bpm: 86, negativePrompt: "party EDM, trap ad-lib spam, glossy autotune hook, metal screaming, party-only vibe" },
{ label: "Trap Beats", cat: "Hip-Hop", prompt: "trap instrumental 2026, 808 sub-bass heavy, hi-hat triplets, dark synth textures, Metro Boomin style: no vocals, pure beat-focused production, punchy dynamic master", bpm: 140, negativePrompt: "orchestral, jazz piano solo, acoustic strumming, reggae skank, vocal-focused", instrumental: true },
{ label: "Plugg", cat: "Hip-Hop", prompt: "plugg 2026, melodic trap, dreamy synth pads, slow atmospheric tempo, ethereal vibe, minimal lyrical content, dreamy auto-tune master", bpm: 122, negativePrompt: "aggressive screaming, metal, orchestral, raw boom bap, hard drill" },
{ label: "Detroit Rap", cat: "Hip-Hop", prompt: "Detroit rap 2026, gritty production, dark samples, high-tempo punchlines, Big Sean style: technical flow, double-time verses, confident delivery, crisp punchy master", bpm: 98, negativePrompt: "smooth jazz, reggae groove, orchestral, pop ballad, lo-fi chill" },
{ label: "Trap Flamenco", cat: "Hip-Hop", prompt: "trap flamenco 2026, Spanish acoustic guitar fused with 808 bass, Rosalía style: melismatic vocal runs, flamenco rhythmic patterns, trap flow, emotional dramatic master", bpm: 132, negativePrompt: "metal screaming, harsh industrial, smooth jazz, orchestral waltz, pure club EDM" },

  // ── Romanian (Românesc) ────────────────────────────────────────────────────

{ label: "Manele", cat: "Romanian", prompt: "modern manele 2026, accordion, oriental synth, Balkan rhythm, party music, Turkish hicaz scale, Adrian Minune & Florin Salam style: strong expressive voice, passionate singing, oriental ornamentation, emotional delivery, shouts, catchy refrains, high-fidelity club master, crisp transient-controlled mix", bpm: 112, negativePrompt: "trap 808 dominance, metal distortion, EDM drop, dubstep, harsh industrial, amateur recording" },
{ label: "Manele Clasice", cat: "Romanian", prompt: "classic manele, traditional lăutărească, accordion, violin, clarinet, traditional lăutari style: natural voice, authentic singing, traditional phrasing, vibrato, virtuoso violin accompaniment, organic high-fidelity mix, spacious soundstage", bpm: 100, negativePrompt: "electronic synth lead, trap hats, EDM, autotune, modern pop production, metallic sound" },
{ label: "Manele Moderne", cat: "Romanian", prompt: "modern manele 2026, electronic synth, oriental accordion, current Balkan rhythm, Guță & Connect-R style: clear modern voice, polished production, melodic hooks, confident delivery, pop-urban influences, crisp modern club master, streaming-ready mix", bpm: 118, negativePrompt: "metal screaming, dark ambient, orchestral epic, harsh distortion, lo-fi grit" },
{ label: "Manele Etno Fusion", cat: "Romanian", prompt: "manele etno fusion 2026, oriental-folcloric modern, accordion, club beat, TikTok viral energy, Florin Salam & Subcarpați style: powerful vocals, catchy explosive chorus, lautari influences, synth, heavy bass, high-fidelity dynamic mix, balanced frequency spectrum", bpm: 122, negativePrompt: "trap without etno, robotic autotune, metal distortion, slow melancholic doina, flat production" },
{ label: "Manele House Club", cat: "Romanian", prompt: "manele house club 2026, electronic remix, manea vocal over heavy bass drop, four-on-the-floor, Sorinel Pustiu & Vali Vijelie style: high-energy wedding after-party, catchy synth lead, non-stop festival vibe, professional club master, wide stereo image", bpm: 128, negativePrompt: "folclor acustic lent, ballad romantică, orchestral epic, jazz smooth, lo-fi" },
{ label: "Manele Viral TikTok", cat: "Romanian", prompt: "manele viral TikTok 2026, explosive short hits, dance challenge refrains, modern manele with fast beat, Florin Salam & Misha Miller style: powerful hook-addictive vocals, glossy production, viral energy, high-impact mix, radio-ready master", bpm: 130, negativePrompt: "balade lungi introspective, folclor tradițional pur, metal screaming, ambient drone, slow tempo" },
{ label: "Pop Dance Românesc 2026", cat: "Romanian", prompt: "pop dance românesc 2026, international radio hit, upbeat catchy synth, strong glossy vocals, Inna & Alexandra Stan style: high-end export production, viral dancefloor hook, global radio-friendly master, crisp high-end definition", bpm: 124, negativePrompt: "manele oriental dominant, hard trap românesc, metal guitars, dark ambient, lo-fi" },
{ label: "Urban Pop RO Modern", cat: "Romanian", prompt: "urban pop românesc 2026, R&B trap-light fusion, emotional melodic hooks, smooth vocal with subtle auto-tune, Andra & Killa Fonic style: romantic-urban city vibe, clean modern production, catchy streaming-ready master, clear vocal presence", bpm: 105, negativePrompt: "shout manele petrecere, folclor tradițional, orchestral symphony, rage rap, aggressive distortion" },
{ label: "Trap Pop Românesc", cat: "Romanian", prompt: "trap pop românesc 2026, melodic trap cu influențe pop, 808 bass + synth catchy, rap-singing blend, Nane & Rava style: flow românesc melodic, auto-tune pe hook, vibe stradal dar radio-friendly, punchy streaming master, tight low-end", bpm: 135, negativePrompt: "boom bap old school, manele accordion dominant, orchestral epic, smooth jazz" },
{ label: "Retro Manele Remix 90s-2000s", cat: "Romanian", prompt: "retro manele remix 2026, 90s-2000s revival, classic manele cu producție modernă, Nicolae Guță & Adrian Copilul Minune style: voce nostalgică pasională, beat updatat club, refrene iconice reluate viral, punchy club master, analog-warmth texture", bpm: 110, negativePrompt: "trap 808 agresiv, metal distortion, EDM big room drop, lo-fi chill" },
{ label: "Manele Drill Fusion", cat: "Romanian", prompt: "manele drill fusion 2026, sliding 808 + acordeon oriental, flow agresiv românesc peste drill beat, Rares & Nane style: mix rap dur + refren manea catchy, vibe stradal urban românesc dark, crisp drill master, aggressive transient control", bpm: 142, negativePrompt: "pop glossy curat, folclor lent, orchestral strings, smooth R&B" },
{ label: "Etno Electronic RO", cat: "Romanian", prompt: "etno electronic românesc 2026, folclor reinterpretat electronic, cobză/violin peste synth și beat modern, Subcarpați & Zdob și Zdub style: voce puternică etno, producție hybrid dance-electronic, energie alternativă festival, spacious dynamic mix, high-fidelity production", bpm: 125, negativePrompt: "manele synth pur, trap hi-hat spam, metal screaming, cheesy pop" },
{ label: "Melodic Rap Românesc", cat: "Romanian", prompt: "melodic rap românesc 2026, auto-tune melodic peste trap/pop beat, flow emoțional catchy, Killa Fonic & Ian style: voce înaltă melodică, refrene virale streaming, vibe urban tânăr românesc, polished clear master, airy spatial textures", bpm: 140, negativePrompt: "raw boom bap old school, manele shouts, orchestral epic, dark ambient" },
{ label: "Bătătură", cat: "Romanian", prompt: "Romanian bătătură, traditional dance, strong rhythm, folk, popular music style: strong rhythmic voice, singing for bătătură dance, energetic delivery, organic natural master, high-fidelity folk production, balanced mid-range", bpm: 130, negativePrompt: "trap 808, dubstep, smooth jazz, orchestral waltz" },
{ label: "Muzică de Nuntă", cat: "Romanian", prompt: "Romanian wedding music, lăutari, violin, accordion, party, dance, good vibes, taraf style: voice and orchestra for wedding, festive singing, shouts and greetings, party energy, high-energy impact master, live event acoustics", bpm: 122, negativePrompt: "metal screaming, dark ambient, EDM drop, harsh industrial" },
{ label: "Muzică de Restaurant", cat: "Romanian", prompt: "Romanian restaurant music, light orchestra, violin accordion, well-known melodies, elegant atmosphere, easy listening style: warm pleasant voice, refined singing, elegant background tone, high-fidelity natural mix, soft dynamic range", bpm: 95, negativePrompt: "trap, dubstep, metal, aggressive rap, EDM" },
{ label: "Muzică Ușoară Românească", cat: "Romanian", prompt: "Romanian easy listening, beautiful melody, 70s-90s, romanticism, Angela Similea & Dan Spătaru style: warm romantic voice, melodious singing, clear phrasing, emotion and tenderness, high-fidelity master, vintage warmth", bpm: 98, negativePrompt: "trap 808, metal, EDM drop, harsh screaming, dubstep" },
{ label: "Cântec Bătrânesc", cat: "Romanian", prompt: "Romanian old song, old Romanian music, nostalgia, violin accordion, traditional ballad, Maria Lătărețu style: mature emotional voice, storytelling singing, nostalgic tone, simple sincere delivery, organic master, intimate acoustic space", bpm: 82, negativePrompt: "trap beats, EDM, metal, autotune, electronic" },
{ label: "Etno Românesc", cat: "Romanian", prompt: "Romanian etno, folk reinterpreted, traditional instruments with modern production, etno fusion, Subcarpați & Zdob și Zdub style: strong modern voice, rock-etno energy singing, catchy refrains, alternative delivery, dynamic master, high-impact presence", bpm: 128, negativePrompt: "smooth jazz, orchestral waltz, trap 808 spam, glossy pop" },
{ label: "Pop Românesc", cat: "Romanian", prompt: "Romanian pop modern, contemporary production, catchy melody, radio Romania, Inna & Alexandra Stan style: clear radio-friendly voice, modern production singing, clear hooks, confident catchy delivery, polished master, broadcast-ready clarity", bpm: 120, negativePrompt: "metal screaming, dark trap, orchestral epic, harsh distortion" },
{ label: "Rock Românesc", cat: "Romanian", prompt: "Romanian rock, electric guitar, Romanian lyrics, alternative rock, Phoenix & Iris style: strong rock voice, emotional powerful singing, alternative delivery, introspective or energetic tone, punchy rock master, dynamic range", bpm: 125, negativePrompt: "trap 808, reggae skank, smooth jazz, orchestral strings as lead" },
{ label: "Hip-Hop Românesc", cat: "Romanian", prompt: "Romanian hip hop, rap in Romanian, urban beat, street lyrics, BUG Mafia & Paraziții style: clear flow in Romanian, confrontational or lyrical delivery, rhyme and wordplay, projected voice, punchy dynamic master, clean vocal chain", bpm: 92, negativePrompt: "orchestral, EDM four-on-the-floor, smooth jazz, country" },
{ label: "Trap Românesc", cat: "Romanian", prompt: "Romanian trap, 808 bass, hi-hat rolls, rap in Romanian, Romanian urban, Nane & Rava style: Romanian trap flow, auto-tune on melodies, cold or melodic delivery, hooks in Romanian, punchy club master, high-fidelity impact", bpm: 138, negativePrompt: "orchestral symphony, jazz improvisation, reggae one-drop" },
{ label: "Muzică Balcanică", cat: "Romanian", prompt: "Balkan music, energetic rhythm, accordion, trumpet, Turkish and Greek influences, Balkan party, Goran Bregović style: strong Balkan voice, energetic festive singing, shouts and choirs, party delivery, impactful master, high-energy festival mix", bpm: 128, negativePrompt: "trap 808, dubstep, smooth jazz, dark ambient" },
{ label: "Muzică Orientală", cat: "Romanian", prompt: "Romanian oriental music, oriental synth, dance rhythm, Turkish influences, Adrian Minune style: warm voice with ornamentation, expressive oriental singing, melisma and trills, dance atmosphere, professional master, rhythmic precision", bpm: 115, negativePrompt: "metal screaming, EDM drop, harsh industrial, dark trap" },
{ label: "Colinde", cat: "Romanian", prompt: "Romanian carols, Christmas music, choir, tradition, holiday atmosphere, carolers style: clean voice or choir, traditional carol singing, warm solemn tone, authentic organic master, ambient church acoustics", bpm: 88, negativePrompt: "trap beats, EDM, metal, aggressive rap, dubstep" },
{ label: "Cântec Patriotic", cat: "Romanian", prompt: "Romanian patriotic song, march, choir, orchestra, solemn, military fanfare style: choir or strong martial voice, solemn unified singing, grave delivery, powerful master, grand soundstage", bpm: 100, negativePrompt: "trap 808, EDM drop, reggae groove, autotune pop" },
{ label: "Indie / Alternativă România", cat: "Romanian", prompt: "Romanian alternative music, Romanian indie, guitar, modern production, Romanian lyrics, Coma & The Mono style: introspective or experimental voice, alternative singing, personal delivery, contemplative tone, clean balanced master, high-fidelity organic production", bpm: 108, negativePrompt: "trap hi-hat spam, EDM drop, metal screaming, cheesy pop chorus" },

 // ── House & Electronic ─────────────────────────────────────────────────────────
// Actualizat Martie 2026: Afro House dominant global (Splice Sound of the Year continuă), UKG/Speed Garage revival puternic, melodic/deep house stabil, jazz house creștere, baile funk viral cross-phonk, hardgroove nișă
// Sursa: Splice Sounds of 2026, IMS Report, Beatport, Stereofox
{ label: "Afro House", cat: "House & Electronic", prompt: "afro house 2026, deep hypnotic grooves, kwaito log drum influences, soulful tribal percussion, atmospheric pads & chants, Black Coffee &Me Keinemusik style: organic warm textures, uplifting ritual energy, global festival late-night dancefloor, crisp transient-controlled mix, wide stereo image", bpm: 123, negativePrompt: "trap hi-hat triplets spam, big room supersaw drops, rage distorted 808, phonk cowbell heavy, harsh digital noise" },
{ label: "Deep House", cat: "House & Electronic", prompt: "deep house 2026, soulful groovy basslines, warm chords pads, vocal chops melodic journeys, Adriatique Bedouin &ME style: emotional immersive club vibe, organic textures, progressive builds without aggression, high-fidelity spatial imaging, clean low-end", bpm: 124, negativePrompt: "hard techno kicks, trap 808 slides, neurofunk razor bass, hyperpop glitch, orchestral epic, tinny percussion" },
{ label: "Tech House", cat: "House & Electronic", prompt: "tech house 2026, driving bassline, minimal percussive groove, hypnotic loops, Fisher John Summit Mau P style: punchy tech rhythm, subtle vocal chops, repetitive hooks, club weapon focus, crystal clear transients, groove-heavy master", bpm: 126, negativePrompt: "orchestral strings lead, smooth jazz piano, melodic emotional builds, reggae skank, country twang" },
{ label: "Melodic Afro-Tech", cat: "House & Electronic", prompt: "sophisticated melodic afro house 2026, Maz & Antdot style, lush analog synth plucks, driving organic percussion, deep melodic bass progression, emotive melodic breakdowns, high-fidelity spatial textures, professional club master, wide dynamic range", bpm: 123, negativePrompt: "aggressive industrial techno, distorted vocals, chaotic noise, cheap casio sounds, trap hi-hat triplets" },
{ label: "Ancestral / Dark Afro", cat: "House & Electronic", prompt: "raw ancestral soul 2026, Boddhi Satva & Shimza style, heavy djembe patterns, deep sub-bass drones, spiritual african chanting, polyrhythmic complexity, dark warehouse afro energy, driving floor-focused rhythm, ritualistic atmosphere, punchy club-ready mix", bpm: 122, negativePrompt: "bright cheesy pop chords, electric guitar solos, thin drum samples, jazz scatting, EDM risers" },
{ label: "Organic Sunset Afro", cat: "House & Electronic", prompt: "organic afro house 2026, Keinemusik &Me Adam Port style: soft percussive layers, warm rhodes chords, soulful vocal whispers, atmospheric bird sounds, sunset beach club vibe, elegant minimalist groove, wooden percussion textures, high-fidelity production", bpm: 120, negativePrompt: "distorted 808, heavy metal, aggressive stabs, neurofunk bass, plastic digital sounds" },
{ label: "Ethno / Desert House", cat: "House & Electronic", prompt: "ethno afro house 2026, Bedouin & Sabo style, middle-eastern instrumentation, oud and ney flute melodies, hypnotic slow-burn afro groove, spiritual ritual percussion, organic foley, sunset festival atmosphere, deep mystical journey, spatial soundstage", bpm: 118, negativePrompt: "heavy metal guitars, hyperpop vocals, jump-up dnb bass, glitchy digital artifacts, radio pop" },
{ label: "Amapiano Hybrid", cat: "House & Electronic", prompt: "afro house amapiano fusion 2026, deep soulful house, log drum bass accents, shaker loops, jazzy piano chords, South African house energy, smooth transition between afro-tech and amapiano, warm sub-bass, log drum texture, clean streaming master", bpm: 115, negativePrompt: "aggressive saw leads, industrial noise, trance arpeggios, high-pitched screeching, rock drums" },
{ label: "Melodic House", cat: "House & Electronic", prompt: "melodic house 2026, emotional progressive synths, lush pads & driving bass, Anyma Tale Of Us CamelPhat Afterlife style: cinematic festival journeys, atmospheric melodic drops, uplifting yet introspective energy, airy spatial textures", bpm: 122, negativePrompt: "hard techno aggression, trap 808 dominance, big room supersaw, rage screaming, phonk cowbell" },
{ label: "Progressive House", cat: "House & Electronic", prompt: "progressive house 2026, long epic builds, layered melodic synths, anthemic breakdowns, festival mainstage energy, Deadmau5 Eric Prydz modern style: soaring leads, vocal chops in builds, emotional cinematic feel, balanced frequency spectrum", bpm: 126, negativePrompt: "trap hi-hat triplets, reggae one-drop, smooth jazz chords, lo-fi bedroom chill, country" },
{ label: "Electro House", cat: "House & Electronic", prompt: "electro house 2026, heavy distorted bass drops, energetic synths, festival crowd hype, Dimitri Vegas Martin Garrix vintage-modern style: aggressive vocal chops, build-drop structure, high-energy shout-along, impact-focused master", bpm: 128, negativePrompt: "smooth jazz pads, orchestral waltz, reggae groove, acoustic ballad, deep minimal" },
{ label: "Future House", cat: "House & Electronic", prompt: "future house 2026, metallic funky bass, groovy modern production, Don Diablo Tchami style: clean punchy drops, catchy vocal hooks, sing-along melodies, radio-friendly festival bounce, tight transient control", bpm: 126, negativePrompt: "classical orchestra, smooth jazz piano, country twang, dark ambient drone" },
{ label: "Tropical House", cat: "House & Electronic", prompt: "tropical house 2026, steel drums marimba vibes, laid-back sunny groove, Kygo Lost Frequencies style: soft relaxed vocals, melodic catchy hooks, summer chill-dance feel, no aggression, clean balanced master", bpm: 110, negativePrompt: "aggressive trap, metal screaming, dubstep wobble, harsh industrial, dark ambient" },
{ label: "Slap House", cat: "House & Electronic", prompt: "slap house 2026, punchy slap bass, emotional vocal-driven drops, Imanbek Ofenbach style: powerful melodic vocals, sad-euphoric chorus, club radio crossover, radio-ready polished master", bpm: 122, negativePrompt: "metal distortion, harsh screaming, trap 808 spam, orchestral epic" },
{ label: "Bass House", cat: "House & Electronic", prompt: "bass house 2026, heavy distorted bass, aggressive club drops, DJ Snake Joyryde Jauz style: vocal growls and chops, impact-focused, minimal singing, raw energy, aggressive transient control", bpm: 128, negativePrompt: "smooth jazz, orchestral ballad, reggae one-drop, acoustic folk" },
{ label: "Funky House", cat: "House & Electronic", prompt: "funky house 2026, disco-funk samples, groovy bassline, retro-modern dancefloor, Daft Punk Basement Jaxx Jamiroquai influence: pitched filtered vocals, talk-box robotic feel, catchy groovy percussion, analog-warmth master", bpm: 124, negativePrompt: "metal screaming, dark trap, orchestral epic, harsh distortion" },
{ label: "UK Garage Revival", cat: "House & Electronic", prompt: "uk garage revival 2026, 2-step shuffled rhythms, bass-heavy energy, vocal chops & bassline, PinkPantheress salute MPH Conducta Holy Goof style: bouncy underground club weapon, nostalgic modern UK sound, high-tempo groove, crisp drum transients", bpm: 130, negativePrompt: "four-on-the-floor straight kick, trap triplet hats, melodic techno pads, phonk distortion, chill lo-fi" },
{ label: "Acid House Revival", cat: "House & Electronic", prompt: "acid house revival 2026, squelchy Roland TB-303 basslines, psychedelic underground Chicago vibe, Phuture Larry Heard modern reinterpretation style: repetitive hypnotic loops, minimal sampled vocals, raw trippy energy, analog-warmth master", bpm: 125, negativePrompt: "orchestral strings, smooth jazz pads, ballad structures, country twang, glossy pop chorus" },
{ label: "Minimal House", cat: "House & Electronic", prompt: "minimal micro house 2026, stripped-back hypnotic repetition, subtle groove focus, underground Berlin sound, Ricardo Villalobos Rhadoo Petre Inspirescu style: sparse textures, no big drops, whispered chopped phrases, deep headphone/club immersion, spectral clarity", bpm: 124, negativePrompt: "big room festival drop, trap 808 dominance, orchestral epic, cheesy pop hooks" },
{ label: "Organic House", cat: "House & Electronic", prompt: "organic house 2026, acoustic ethnic percussion bongos congas violin kalimba, deep meditative groove, WhoMadeWho Jan Blomqvist &ME style: soft breathy male vocals, indie-electronic intimate feel, organic textures, high-fidelity natural master", bpm: 120, negativePrompt: "harsh distortion, trap 808 spam, metal screaming, big room EDM drop" },
{ label: "Soulful House Revival", cat: "House & Electronic", prompt: "soulful house 2026, gospel diva vocals, warm piano chords, emotional uplifting groove, Frankie Knuckles Masters at Work Kerri Chandler revival style: powerful soulful performance, feel-good dancefloor energy, classic house spirit modern polish, spacious soundstage", bpm: 122, negativePrompt: "trap 808 dominance, metal guitars, big room EDM drop, harsh industrial, dark ambient" },
{ label: "Afro Tech", cat: "House & Electronic", prompt: "afro tech 2026, afro house meets tech, tribal percussion log drum, deep driving groove, Black Coffee &Me Keinemusik style: hypnotic rhythms, soulful vocals, global dancefloor energy, minimal leads, professional club master", bpm: 124, negativePrompt: "pure four-on-the-floor, big room supersaw, orchestral strings, chill lo-fi" },
{ label: "Big Room House Revival", cat: "House & Electronic", prompt: "big room house revival 2026, massive festival drops, heavy bass, anthemic builds, Dimitri Vegas Martin Garrix vintage-modern style: crowd hype vocal chops, explosive energy, mainstage comeback roar, high-impact master", bpm: 128, negativePrompt: "minimal stripped loops, deep atmospheric pads, jazz improvisation, slow ballad" },
{ label: "Jersey Club House", cat: "House & Electronic", prompt: "jersey club house fusion 2026, stuttering kick patterns, bed squeak samples, high-energy bounce, Jersey/Berlin revival style: fast chopped vocals, groovy percussion, viral TikTok/club weapon hybrid, impact-focused mix", bpm: 140, negativePrompt: "smooth melodic pads, orchestral epic, trap 808 slides, ambient drone" },
{ label: "Desert House", cat: "House & Electronic", prompt: "desert house 2026, Middle Eastern exotic melodies, deep groovy house, Arodes Bedouin style: atmospheric ethnic percussion, warm synths, hypnotic cinematic desert vibe, professional wide-stereo mix", bpm: 120, negativePrompt: "hard festival drops, trap hats spam, metal guitars, fast techno" },
{ label: "Melodic Techno", cat: "House & Electronic", prompt: "melodic techno 2026, emotional driving beats, atmospheric synths, progressive builds, Tale Of Us Afterlife Anyma style: cinematic layers, hypnotic groove, festival/underground crossover, soaring leads, professional master", bpm: 124, negativePrompt: "big room cheese, trap influence, harsh distortion, smooth jazz" },
{ label: "Hardgroove", cat: "House & Electronic", prompt: "hardgroove 2026, aggressive tech house variant, pounding basslines, raw club energy, European underground style: minimal yet forceful groove, industrial edge, warehouse weapon sound, crisp punchy mix", bpm: 130, negativePrompt: "melodic emotional pads, jazz fusion, slow organic house, chill lo-fi" },
{ label: "Baile Funk 150+", cat: "House & Electronic", prompt: "baile funk 2026, fast montagem rhythms, heavy percussion kicks, viral TikTok dance challenge energy, Brazilian funk phonk hybrid, MC Tuto DJ GBR Ratão ORUAN style: aggressive chopped vocal samples, party shouts, high-BPM club weapon, explosive groove, dynamic impact master", bpm: 150, negativePrompt: "slow melodic house, orchestral pads, chill ambient, liquid dnb breaks, smooth jazz dominant" },
  
  // ── Oriental Traditional ───────────────────────────────────────────────────────
// Stiluri autentice tradiționale arabe / orientale / turcești (maqam, tarab, folk regional, dans clasic, türk sanat müziği, arabesk clasic etc.) – live, acustic, nunți, concerte, spiritual – valabil istoric și în 2026
{ label: "Arabic Tarab / Classical", cat: "Oriental Traditional", prompt: "arabic tarab classical traditional, maqam improvisation emotional peak, vocal melisma long taqsim, oud qanun ney violin ensemble, Umm Kulthum Abdel Halim Hafez Fairuz Mohammad Abdel Wahab style: deep storytelling tarab ecstasy, natural acoustic resonance, concert hall intimacy, pure emotional soul, authentic maqam microtonal phrasing", bpm: 70, negativePrompt: "electronic synths, trap 808, autotune heavy, modern beats, drops, distortion, digital artifacts" },
{ label: "Türk Sanat Müziği / Classical Turkish", cat: "Oriental Traditional", prompt: "türk sanat müziği classical traditional, makam-based refined composition, elegant vocal ornamentation melisma, tanbur oud kanun violin, Zeki Müren Bülent Ersoy Münir Nurettin Selçuk Müzeyyen Senar style: poetic emotional phrasing, slow rubato to rhythmic usul, sophisticated salon concert atmosphere, acoustic purity, natural room acoustics", bpm: 80, negativePrompt: "electronic beats, trap 808, autotune heavy, modern pop drops, distortion, synthetic reverb" },
{ label: "Arabesk Classic Turkish", cat: "Oriental Traditional", prompt: "arabesk classic traditional turkish, emotional pain suffering lyrics, slow melancholic melodies, Orhan Gencebay Müslüm Gürses Ferdi Tayfur Ibrahim Tatlıses style: dramatic vocal cries, oud violin kanun leads, acoustic ensemble, heartbroken telenovela soundtrack vibe, raw emotional depth, high-fidelity acoustic mix", bpm: 85, negativePrompt: "upbeat dance rhythms, synth heavy, trap hi-hats, hyperpop glitch, bright major key, artificial compression" },
{ label: "Fasıl Ensemble Turkish", cat: "Oriental Traditional", prompt: "fasıl traditional ensemble turkish, suite of makam pieces, instrumental prelude peşrev saz semai, vocal şarkı bölümü, taksim improvisation, classic meyhane style: lively to emotional flow, clarinet kanun violin accordion, festive yet dramatic party atmosphere, acoustic group performance, natural dynamic range", bpm: 90, negativePrompt: "modern electronic fusion, trap 808 dominance, deep house pads, orchestral epic without makam, slow ambient, digital quantization" },
{ label: "Anadolu Halk Müziği Turkish", cat: "Oriental Traditional", prompt: "anadolu halk müziği traditional folk turkish, bağlama saz lead, aşık storytelling songs, uzun hava kırık hava, Aşık Veysel Neşet Ertaş Selda Bağcan style: rural emotional narratives, microtonal melodies, acoustic simplicity, telenovela village/drama scenes vibe, natural folk resonance", bpm: 95, negativePrompt: "arabesk heavy drama, modern pop polish, electronic synths, trap beats, urban mahraganat, studio processing" },
{ label: "Raqs Sharqi Classical", cat: "Oriental Traditional", prompt: "raqs sharqi belly dance classical traditional, egyptian oriental dance music, baladi saidi rhythms, darbuka riq sagat heavy, Hossam Ramzy Mohamed Abdel Wahab style: seductive expressive percussion, melodic violin ney qanun, live show wedding energy, high-fidelity acoustic percussion, crisp transient response", bpm: 110, negativePrompt: "slow ambient, trap 808, modern deep house, orchestral dominant, chill lounge, synthetic percussion" },
{ label: "Levantine Dabke Traditional", cat: "Oriental Traditional", prompt: "levantine dabke traditional, palestinian lebanese syrian jordanian group dance, mijwiz accordion violin percussion, folk style: powerful communal chants, celebratory wedding energy, high-tempo drive acoustic, natural outdoor folk acoustics", bpm: 120, negativePrompt: "deep house groove, trap triplet hats, neurofunk, hyperpop, slow ballad, digital pitch shifting" },
{ label: "Gnawa Traditional Spiritual", cat: "Oriental Traditional", prompt: "gnawa moroccan traditional spiritual, sufi trance rhythms, guembri sintir qraqeb hypnotic, call-response chants, Mahmoud Guinea Maleem Hamid style: deep ritualistic trance, healing energy, acoustic roots mysticism, ceremonial group, natural raw spatial textures", bpm: 90, negativePrompt: "electronic fusion heavy, trap beats, autotune, orchestral epic, bright pop, quantized rhythm" },

// ── Oriental Modern / Fusion ───────────────────────────────────────────────────
// Variante contemporane 2026: oriental deep house viral, mahraganat, khaleeji pop, arabic mainstream, turkish arabesk pop, turkish trap/pop fusion, diziler OST moderne – club, TikTok, streaming, crossover
{ label: "Oriental Deep House", cat: "Oriental Modern / Fusion", prompt: "oriental deep house 2026, hypnotic desert vibes, ethnic maqam tribal percussion, deep sub bass groove, Cafe De Anatolia Hypnotic Desert MT MUSIC style: atmospheric pads, darbuka congas, warm vocal chants, late-night lounge ritual energy, high-fidelity spatial imaging, crisp transient-controlled mix", bpm: 120, negativePrompt: "aggressive trap rage, big room drops, phonk distortion, pure classical acoustic, metal guitars, harsh digital artifacts" },
{ label: "Turkish Oriental Deep House", cat: "Oriental Modern / Fusion", prompt: "turkish oriental deep house 2026, hypnotic makam synths, ethnic percussion darbuka ney fusion, deep groove sub bass, Cafe De Anatolia turkish mix influence style: atmospheric pads, warm vocal chops, late-night lounge/club ritual, diziler romantic scene energy, balanced frequency spectrum, professional master", bpm: 122, negativePrompt: "aggressive trap rage, big room drops, phonk cowbell heavy, pure acoustic tarab, harsh industrial, flat acoustic sound" },
{ label: "Modern Arabesk / Arabesk Pop Turkish", cat: "Oriental Modern / Fusion", prompt: "modern arabesk pop turkish 2026, emotional dramatic lyrics, arabesk roots meets glossy production, auto-tune subtle, Ibrahim Tatlıses Orhan Gencebay legacy + Serdar Ortaç Mabel Matiz style: melancholic hooks, violin oud synth fusion, telenovela heartbreak OST vibe, radio/streaming crossover, clean modern mix", bpm: 90, negativePrompt: "pure classical makam purity, trap heavy 808, deep house hypnotic, hyperpop chaos, metal distortion, raw field recording" },
{ label: "Turkish Pop Oriental Fusion", cat: "Oriental Modern / Fusion", prompt: "turkish pop oriental fusion 2026, catchy radio hooks, makam melodies in modern pop, synth violin kanun hybrid, Tarkan Sezen Aksu Hande Yener Mabel Matiz style: emotional upbeat/dramatic, glossy production, telenovela soundtrack viral hits, streaming shine, high-fidelity punchy master", bpm: 100, negativePrompt: "dark arabesk melancholy heavy, trap 808 dominance, deep neurofunk, lo-fi chill, orchestral epic, muddy low-end" },
{ label: "Turkish Trap / Urban Oriental", cat: "Oriental Modern / Fusion", prompt: "turkish trap urban oriental 2026, 808 bass meets makam scales, darbuka hybrid percussion, auto-tune melodic flows, Ezhel Ben Fero Lvbel C5 style: street swagger dark atmosphere, telenovela intense drama scenes, viral club/TikTok weapon, crisp punchy transient-focused mix", bpm: 140, negativePrompt: "clean boom bap, smooth jazz piano, liquid dnb breaks, bright pop chorus, classical purity, low-energy mix" },
{ label: "Diziler OST Oriental Dramatic", cat: "Oriental Modern / Fusion", prompt: "turkish diziler OST oriental dramatic 2026, emotional soundtrack melodies, violin oud kanun synth fusion, slow build to intense chorus, telenovela style: heartbreak longing passion, cinematic strings pads, modern turkish pop/oriental drama vibe, professional cinematic master", bpm: 85, negativePrompt: "upbeat dance energy, trap hi-hat spam, hyperpop maximalism, pure acoustic fasıl, chill lounge, aggressive synthetic distortion" },
{ label: "Mahraganat / Electro Shaabi", cat: "Oriental Modern / Fusion", prompt: "mahraganat electro shaabi 2026, egyptian street festival music, auto-tune heavy rap vocals, synth tabla hybrid beats, Hassan Shakosh Omar Kamal Wegz Eslam Kabonga style: chaotic high-energy anthems, viral TikTok street vibe, raw urban youth rebellion, high-impact club weapon, extreme compression master", bpm: 105, negativePrompt: "pure classical tarab, orchestral purity, slow rubato, chill lounge, traditional acoustic only, low-energy arrangement" },
{ label: "Khaleeji Pop Modern", cat: "Oriental Modern / Fusion", prompt: "khaleeji pop modern 2026, gulf glossy pop fusion, catchy oriental synths, traditional percussion light, Hussain Al Jassmi Rashed Al Majed Nawal El Kuwaiti style: radio-friendly shine, emotional/upbeat hooks, multilingual, streaming viral crossover, clear modern polished sound", bpm: 100, negativePrompt: "dark mahraganat street, trap heavy, deep neurofunk, phonk cowbell, metal distortion, distorted vocals" },
  // ── Rock & Metal ───────────────────────────────────────────────────────────
  // Creată Martie 2026 | Include revival-uri, modern metalcore, nu-metal, post-hardcore etc.
 { label: "Classic Rock", cat: "Rock & Metal", prompt: "classic rock, 70s-80s guitar-driven, powerful riffs, anthemic choruses, Led Zeppelin AC/DC Guns N' Roses style: raw energetic vocals, crunchy tube-saturated guitar tones, driving natural drums, high-fidelity classic rock mix, punchy dynamic range", bpm: 120, negativePrompt: "autotune, trap 808, EDM drop, orchestral strings, lo-fi chill, digital quantization" },
{ label: "Hard Rock", cat: "Rock & Metal", prompt: "hard rock, heavy distorted guitars, powerful vocals, arena energy, Van Halen Aerosmith Deep Purple style: high-energy guitar solos, raspy shouting vocals, pounding drums, classic hard rock attitude, wide stereo guitar image, professional studio master", bpm: 130, negativePrompt: "clean pop vocals, trap hats, reggae skank, ambient pads, brittle synthetic sound" },

{ label: "Nu-Metalcore / Trap-Metal 2.0", cat: "Rock & Metal", prompt: "nu-metalcore trap-metal 2.0 2026, heavy riffs meets trap/R&B/pop influence, sultry cleans + crushing breakdowns, Spiritbox Bad Omens Sleep Token style: emotional melodic choruses, aggressive verses, modern production glossy yet heavy, baddiecore crossover vibe", bpm: 140, negativePrompt: "pure old-school nu-metal, raw thrash, orchestral epic, slow doom" },

  { label: "Djent / Prog Metalcore", cat: "Rock & Metal", prompt: "djent prog metalcore 2026, polyrhythmic low-tuned riffs, complex grooves, technical breakdowns, Periphery Meshuggah modern influence style: progressive structures, soaring cleans + heavy djent chugs, atmospheric layers, genre-pushing virtuosity", bpm: 130, negativePrompt: "simple 4/4 rock, melodic pop hooks, trap 808 dominance, smooth jazz" },

  { label: "Hyperpop Metal / Glitch Metal", cat: "Rock & Metal", prompt: "hyperpop metal glitch metal 2026, chaotic glitchy production meets heavy riffs, high-pitched distorted vocals, 100 gecs metal hybrid style: noisy electronic layers, stuttering effects, emo/aggressive delivery, underground viral internet fusion", bpm: 145, negativePrompt: "clean melodic singing, orchestral symphony, slow atmospheric, traditional thrash" },

  { label: "Post-Black Metal / Atmospheric Black", cat: "Rock & Metal", prompt: "post-black metal atmospheric black 2026, shoegaze-infused black metal, dreamy walls of sound, emotional intensity, Deafheaven Alcest modern style: reverb-heavy guitars, soaring cleans + shrieks, cinematic atmosphere, accessible yet raw post-black vibe", bpm: 150, negativePrompt: "brutal raw black metal, fast thrash blasts, trap influence, pop chorus" },
{ label: "Alternative Rock", cat: "Rock & Metal", prompt: "alternative rock, 90s-2000s vibe, gritty guitars, introspective lyrics, Nirvana Radiohead Foo Fighters style: raw emotional delivery, dynamic quiet-loud shifts, melodic yet angsty, balanced organic mix, clean vocal chain", bpm: 110, negativePrompt: "polished autotune, trap beats, orchestral epic, smooth jazz, stadium-EDM production" },
{ label: "Grunge", cat: "Rock & Metal", prompt: "grunge, dirty distorted guitars, raw emotional vocals, Seattle sound, Nirvana Alice in Chains Soundgarden style: sludgy riffs, anguished singing, flannel-era attitude, heavy yet melodic, raw uncompressed grit, authentic analog texture", bpm: 105, negativePrompt: "clean production, synth leads, EDM four-on-the-floor, cheerful pop, digital polish" },
{ label: "Post-Grunge", cat: "Rock & Metal", prompt: "post-grunge, early 2000s radio rock, melodic choruses, heavy guitars, Nickelback Creed Staind style: emotional mid-tempo rock, powerful belted choruses, introspective verses, high-fidelity radio-ready master", bpm: 100, negativePrompt: "aggressive screaming, trap 808, orchestral, lo-fi chill, raw lo-fi grit" },
{ label: "Nu-Metal", cat: "Rock & Metal", prompt: "nu-metal, 90s-2000s rap-rock fusion, downtuned guitars, aggressive rapping, Linkin Park Limp Bizkit Korn style: mix of rapping and screaming, heavy groovy riffs, angsty lyrics, punchy transient-focused mix, wide soundstage", bpm: 105, negativePrompt: "clean singing only, orchestral, smooth jazz, reggae groove, soft folk" },
{ label: "Metalcore", cat: "Rock & Metal", prompt: "metalcore, breakdown-heavy, screamed verses clean choruses, melodic riffs, Bring Me the Horizon Architects Killswitch Engage style: intense breakdowns, dual vocals, modern production, emotional hooks, crystal-clear high-gain tone", bpm: 140, negativePrompt: "trap hats, autotune pop, orchestral symphony, chill lo-fi, vintage garage" },
{ label: "Modern Metalcore", cat: "Rock & Metal", prompt: "modern metalcore 2025-2026, djent-influenced, electronic elements, clean-scream dynamics, Bad Omens Sleep Token Spiritbox style: atmospheric synths, heavy djent riffs, ethereal cleans, intense screams, professional layered production, wide stereo image", bpm: 150, negativePrompt: "classic rock guitar solo, trap 808 dominance, smooth R&B, low-quality distorted master" },
{ label: "Deathcore", cat: "Rock & Metal", prompt: "deathcore, brutal breakdowns, pig squeals, guttural vocals, heavy blast beats, Lorna Shore Slaughter to Prevail style: crushing low-tuned guitars, extreme aggression, symphonic elements, massive wall-of-sound production, high-impact master", bpm: 160, negativePrompt: "melodic singing, pop hooks, jazz improvisation, chill vibes, thin tinny sound" },
{ label: "Progressive Metal", cat: "Rock & Metal", prompt: "progressive metal, complex riffs, odd time signatures, virtuosic solos, Dream Theater Opeth Tool style: technical instrumentation, long compositions, atmospheric shifts, intricate vocals, precise studio-grade mix", bpm: 110, negativePrompt: "simple 4/4 beats, trap hi-hats, autotune, EDM drop, repetitive minimal loops" },
{ label: "Heavy Metal", cat: "Rock & Metal", prompt: "classic heavy metal, galloping riffs, powerful high-pitched vocals, Iron Maiden Judas Priest Black Sabbath style: twin guitar harmonies, epic storytelling, leather-and-studs energy, clear soaring leads, balanced dynamic range", bpm: 140, negativePrompt: "screamo, rap verses, synthwave, lo-fi chill, muddy low-end" },
{ label: "Thrash Metal", cat: "Rock & Metal", prompt: "thrash metal, fast aggressive riffs, rapid drumming, angry vocals, Metallica Slayer Megadeth style: high-speed palm-muted riffs, raw thrash energy, anti-establishment lyrics, crisp aggressive mix, punchy snare", bpm: 180, negativePrompt: "slow ballad, clean vocals, orchestral, reggae skank, ambient synth" },
{ label: "Power Metal", cat: "Rock & Metal", prompt: "power metal, epic fantasy themes, soaring vocals, fast galloping drums, DragonForce Sabaton Helloween style: symphonic elements, uplifting choruses, heroic high-pitched singing, bright polished high-fidelity master", bpm: 160, negativePrompt: "downtuned brutality, trap beats, autotune, dark ambient, lo-fi grit" },
{ label: "Black Metal", cat: "Rock & Metal", prompt: "black metal, tremolo picking, shrieking vocals, atmospheric cold sound, Emperor Mayhem Darkthrone style: raw atmospheric production, icy soundstage, anti-religious themes, lo-fi aesthetic with clarity", bpm: 170, negativePrompt: "clean production, melodic hooks, pop chorus, smooth jazz, high-gloss pop master" },
{ label: "Death Metal", cat: "Rock & Metal", prompt: "death metal, guttural growls, technical riffs, blast beats, Cannibal Corpse Morbid Angel Death style: brutal low-tuned aggression, complex drumming, horror-themed lyrics, deep impactful low-end, professional extreme master", bpm: 200, negativePrompt: "melodic singing, trap influence, orchestral epic, chill vibes, over-compressed master" },
{ label: "Doom Metal", cat: "Rock & Metal", prompt: "doom metal, slow heavy riffs, melancholic atmosphere, Candlemass Electric Wizard Sleep style: crushing slow tempos, deep growls or clean haunting vocals, stoner-doom vibes, massive low-frequency resonance", bpm: 70, negativePrompt: "fast thrash, high-energy pop, EDM drop, autotune, clinical digital sound" },
{ label: "Stoner Rock", cat: "Rock & Metal", prompt: "stoner rock, fuzzy heavy riffs, groovy desert rock, Kyuss Queens of the Stone Age Fu Manchu style: laid-back yet heavy groove, psychedelic vibes, fuzzy guitar tones, warm analog-like master", bpm: 100, negativePrompt: "screaming vocals, blast beats, trap 808, orchestral, clean hyper-polished sound" },
{ label: "Post-Hardcore", cat: "Rock & Metal", prompt: "post-hardcore, emotional screams, melodic choruses, dynamic shifts, Refused At the Drive-In Thrice style: intense energy, poetic lyrics, mix of aggression and melody, wide dynamic production, punchy mix", bpm: 140, negativePrompt: "clean pop production, trap beats, smooth jazz, ambient drone, static electronic vibe" },
{ label: "Emo / Pop-Punk Revival", cat: "Rock & Metal", prompt: "emo pop-punk revival 2025-2026, emotional lyrics, catchy choruses, My Chemical Romance Fall Out Boy Paramore style: nostalgic 2000s energy, heartfelt singing, driving guitars, bright radio-ready polish, crisp drum mix", bpm: 160, negativePrompt: "brutal metal growls, trap hi-hats, orchestral symphony, experimental industrial" },
{ label: "Industrial Metal", cat: "Rock & Metal", prompt: "industrial metal, mechanical beats, distorted guitars, aggressive electronics, Rammstein Nine Inch Nails Ministry style: heavy synths, pounding rhythms, confrontational vocals, aggressive impact-focused master, tight industrial precision", bpm: 130, negativePrompt: "clean acoustic, smooth R&B, jazz improvisation, chill lo-fi, organic folk" },
  // ── Reggae / Reggaeton / Dembow / Latin Urbano ─────────────────────────────
  // Redenumit din Dembow → Reggae (Martie 2026) | 21 subgenuri
{ label: "Dembow", cat: "Reggae", prompt: "dembow 2026, Dominican urban music, syncopated rhythm, reggaeton influence, Caribbean bass, street sound, El Alfa style: strong Dominican voice, fast energetic flow, shouts and ad-libs, festive delivery, high-fidelity crisp percussion, professional club master", bpm: 108, negativePrompt: "orchestral symphony, smooth jazz, metal distortion, EDM four-on-the-floor, muddy low-end" },
{ label: "Perreo", cat: "Reggae", prompt: "perreo 2026, sensual reggaeton, dembow beat, slow grinding rhythm, urban Latino, club dance, Bad Bunny J Balvin style: relaxed or melodic voice, sensual singing, perreo flow, auto-tune on hooks, club delivery, punchy sub-bass, clean vocal chain", bpm: 92, negativePrompt: "metal distortion, aggressive screaming, orchestral, dark ambient, extreme compression" },
{ label: "Hyper-Fast Dembow 150+", cat: "Reggae", prompt: "hyper-fast dembow 150+ BPM 2026, turbo speed rhythm, aggressive rapid-fire percussion, El Alfa late era Chimbala Shadow Blow style: high-energy shouts, fast Dominican flow, viral TikTok dance challenge, non-stop club adrenaline, heavy bass drops, ultra-tight transients", bpm: 152, negativePrompt: "slow perreo, romantic ballad, orchestral strings, smooth jazz, chill lo-fi, lack of punch" },
{ label: "Reggaeton", cat: "Reggae", prompt: "reggaeton 2026, classic dembow rhythm revival, heavy perreo bass, catchy Spanish melodic hooks, sensual urban party energy, Karol G Feid Bad Bunny Ryan Castro Blessd style: auto-tune flows, infectious chants, street-to-radio crossover, roots 2011-2013 structure meets modern polish, viral TikTok dancefloor weapon, high-fidelity streaming master", bpm: 95, negativePrompt: "four-on-the-floor house, trap 808 slides dominant, orchestral epic, boom bap raw, hyperpop glitch" },
{ label: "Latin Pop Crossover", cat: "Reggae", prompt: "latin pop 2026, glossy radio-friendly hits, upbeat tropical beats, powerful bilingual vocals, Karol G Shakira Rauw Alejandro Kenia Os Jombriel style: emotional or party hooks, polished production, global streaming shine, reggaeton-pop fusion light, major key uplift, crisp transient-focused mix", bpm: 100, negativePrompt: "dark phonk cowbell, drill aggression, lo-fi hiss, heavy neurofunk bass, metal distortion" },
{ label: "Reggaeton Trap / Urbano", cat: "Reggae", prompt: "reggaeton trap urbano 2026, dembow meets heavy 808s, melodic auto-tune rap-singing, street swagger energy, Feid Anuel AA Ozuna DFZM Clarent style: catchy hooks over trap-influenced bass, perreo-trap hybrid, Latin urban dark vibe, viral club weapon, wide stereo imaging, punchy impact-focused master", bpm: 140, negativePrompt: "pure orchestral pads, smooth jazz chords, liquid dnb breaks, aggressive rage screaming, chill ambient drone" },
{ label: "Afro-Latin Dembow Fusion", cat: "Reggae", prompt: "afro-latin dembow 2026, reggaeton meets afrobeats percussion, groovy log drum hybrid, soulful chants, Jombriel Kapo Hamilton Beele style: danceable global fusion, rhythmic layers, uplifting yet urban, honoring African diaspora roots, high-fidelity spatial mix", bpm: 105, negativePrompt: "minimal house groove, trap hi-hat spam, orchestral symphony, pure phonk cowbell" },
{ label: "Rkt 2026 / Turra Agresiva", cat: "Reggae", prompt: "rkt 2026 turra agresiva, fast Argentine dembow evolution, heavy bass aggressive bounce, La Joaqui Callejero Fino L-Gante remix style: provocative energetic female/male flow, party chants raw, TikTok viral street energy, trap-influenced hooks, punchy club-ready mix", bpm: 105, negativePrompt: "slow romantic reggaeton, melodic autotune heavy, orchestral epic, smooth R&B crooning" },
{ label: "Afro-Dembow / Afro-Perreo", cat: "Reggae", prompt: "afro-dembow afro-perreo 2026, afrobeats percussion meets dembow rhythm, log drum tribal groove, Burna Boy Rema MHD fusion style: melodic African-Latin singing mixed with rap, danceable global crossover, catchy hooks, sensual yet energetic perreo vibe, balanced frequency master", bpm: 110, negativePrompt: "pure trap 808 dominance, metal screaming, orchestral symphony, slow emo rap" },
{ label: "Afro-Latin Fusion", cat: "Reggae", prompt: "afro-latin fusion 2026, African rhythms + reggaeton/dembow hybrid, heavy percussion log drum, global dance vibe, Peso Pluma Burna Boy Feid influence: melodic hooks, percussive groove, crossover energy, festival/street party sound, professional streaming master", bpm: 105, negativePrompt: "dark trap metal, orchestral epic, boom bap raw, ambient drone" },
{ label: "Dembow Dominicano", cat: "Reggae", prompt: "Dominican dembow 2026, Dominican Republic urban, fast dembow rhythm, street rap, Caribbean energy, El Alfa Tokischa style: strong expressive voice, fast Dominican flow, shouts and ad-libs, provocative delivery, crisp transient-focused percussion", bpm: 108, negativePrompt: "smooth jazz, orchestral waltz, EDM supersaw, country" },
{ label: "Mambo Urbano", cat: "Reggae", prompt: "mambo urbano 2026, mambo meets reggaeton, brass section, dembow rhythm, Latin urban fusion, Marc Anthony style: strong salsa voice, powerful singing with trillo, romantic Latin delivery, belting and melisma, wide stereo brass, polished master", bpm: 100, negativePrompt: "trap 808 spam, metal screaming, dark ambient, EDM drop" },
{ label: "Dancehall", cat: "Reggae", prompt: "dancehall 2026, Jamaican rhythm, reggae influence, digital riddim, Caribbean energy, Vybz Kartel Popcaan style: toasting and sing-jay, Jamaican accent, fast rhythmic flow, ad-libs and patois, aggressive or melodic delivery, club-ready punchy mix", bpm: 95, negativePrompt: "orchestral symphony, smooth jazz ballad, metal screaming, EDM drop" },
{ label: "Reggaeton Romántico", cat: "Reggae", prompt: "reggaeton romántico 2026, romantic Spanish lyrics, smooth dembow, sensual vibes, Bad Bunny style: warm romantic voice, melodic singing, slow intimate flow, light auto-tune, emotional delivery, high-fidelity vocal polish", bpm: 88, negativePrompt: "aggressive metal, harsh screaming, EDM drop, dark industrial" },
{ label: "Trap Latino", cat: "Reggae", prompt: "trap latino 2026, Spanish trap, heavy 808 bass, dembow influence, urban Latin, Anuel AA style: deep or auto-tune voice, trap flow in Spanish, cold street delivery, melodic hooks, punchy sub-bass focus", bpm: 140, negativePrompt: "orchestral, smooth jazz, reggae one-drop, country" },
{ label: "Cumbia Urbana", cat: "Reggae", prompt: "cumbia urbana 2026, cumbia meets reggaeton, Colombian urban, accordion, dembow rhythm, Silvestre Dangond style: warm Colombian voice, vallenato-cumbia singing, romantic or festive delivery, clear melody, modern polished mix", bpm: 95, negativePrompt: "metal distortion, EDM drop, harsh industrial, orchestral epic" },
{ label: "Reggaeton Chileno", cat: "Reggae", prompt: "reggaeton chileno 2026, Chilean urban reggaeton, street flow, viral perreo, FloyyMenor Cris MJ Julianno Sosa style: Chilean accent, catchy hooks, modern crisp production, high energy party vibe, streaming-ready master", bpm: 94, negativePrompt: "slow ballad, orchestral, trap metal, smooth jazz" },
{ label: "Reggaeton Mexa", cat: "Reggae", prompt: "reggaeton mexa 2026, Mexican reggaeton wave, urban Mexicano sound, heavy bass, El Malilla Santa Fe Klan Alemán style: Mexican slang flow, street bravado, trap-reggaeton fusion, confident delivery, punchy master", bpm: 100, negativePrompt: "classic 2000s dembow, bachata guitar, orchestral epic, dark ambient" },
{ label: "Neoperreo", cat: "Reggae", prompt: "neoperreo 2026, dark experimental reggaeton, atmospheric perreo, stripped dembow, Tomasa del Real Kelman Duran style: distorted futuristic vocals, underground club aesthetic, gender-fluid rebellious vibe, wide dark spatial mix", bpm: 88, negativePrompt: "bright pop reggaeton, upbeat festival, orchestral, cheesy hooks" },
{ label: "Rkt", cat: "Reggae", prompt: "rkt argentino 2026, cumbia 420 meets reggaeton, fast dembow, party remix energy, L-Gante Homer el Mero Mero style: Argentine slang, street party flow, repetitive catchy hooks, high energy delivery, impactful master", bpm: 100, negativePrompt: "slow perreo, romantic bachata, trap 808 dominance, metal" },
{ label: "Turra", cat: "Reggae", prompt: "turra rkt 2026, aggressive fast Argentine dembow, heavy bass, street party, La Joaqui Callejero Fino style: fast Argentine female flow, provocative energetic delivery, party chants, raw street vibe, high-impact club master", bpm: 102, negativePrompt: "slow romantic reggaeton, orchestral strings, smooth R&B, jazz" },
{ label: "Reggaeton Old School", cat: "Reggae", prompt: "old school reggaeton 2000s revival 2026, classic dembow riddim, raw underground, Daddy Yankee early style: classic flow, raw vocals, party energy, minimal autotune, analog-warmth master", bpm: 95, negativePrompt: "modern trap reggaeton, heavy 808 slides, heavy autotune, edm drop" },
{ label: "Afro-Reggaeton", cat: "Reggae", prompt: "afro reggaeton 2026, afrobeats meets reggaeton, African percussion, dancehall fusion, Burna Boy Rema Feid style: melodic singing, global African-Latin rhythm, catchy hooks, danceable crossover vibe, professional polished mix", bpm: 100, negativePrompt: "dark trap metal, orchestral epic, slow emo rap, ambient drone" },
{ label: "Sandungueo", cat: "Reggae", prompt: "sandungueo 2026, sensual perreo intenso, classic reggaeton groove, heavy dembow, Ivy Queen Tego Calderón style: sensual confident vocals, grinding rhythm, club perreo energy, powerful delivery, punchy impact-focused master", bpm: 90, negativePrompt: "fast 2026 dembow, trap influence, metal guitars, orchestral" },
{ label: "Electro-Reggaeton", cat: "Reggae", prompt: "electro reggaeton 2026, Latin electronic fusion, synth drops, festival reggaeton, Alok Deorro Latin electronic style: vocal chops, build-drop energy, electronic-Latin hybrid, party anthem feel, festival-ready master", bpm: 110, negativePrompt: "acoustic bachata, slow romantic, jazz swing, dark trap" },
{ label: "Dembow Hard", cat: "Reggae", prompt: "hard dembow 2026, fast aggressive rhythm, heavy dembow kick, street dembow, Tokischa Rochy RD style: raw energetic shouting, fast Dominican flow, provocative lyrics, club street energy, extreme-impact master", bpm: 110, negativePrompt: "slow reggaeton, romantic bachata, smooth salsa, trap 808" },
{ label: "Dembow Moderno 2026", cat: "Reggae", prompt: "modern dembow 2026, crisp production, heavy bass, viral hooks, El Alfa Chimbala Shadow Blow style: high energy Dominican vocals, fast flow, party shouts, current urban Dominican sound, professional streaming master", bpm: 115, negativePrompt: "old school 2000s reggaeton, slow perreo, bachata guitar, trap hats" },
  // ──Drum & Bass   ───────────────────────────────────────────────────────
// Actualizat Martie 2026: D&B global renaissance, pop-leaning anthems + crossover vocals, evolved liquid rollers (mature/soulful), new-school neurofunk (dark/techy/futuristic), jungle revival cu modern twists, festival/high-tempo dominance
{ label: "Drum & Bass", cat: "Drum & Bass / Jungle", prompt: "drum and bass 2026, fast rolling 170-175 bpm breaks, heavy sub bass, high-energy festival anthems, Metrik Sub Focus Grafix Andromedik Kanine Dimension style: pop-leaning melodic hooks, crossover vocals, dancefloor drops, global mainstream crossover energy, Gen Z high-tempo vibe, professional punchy club master, crisp snare transients", bpm: 174, negativePrompt: "slow trap groove, orchestral pads dominant, phonk cowbell heavy, reggaeton dembow, chill ambient drone, muddy low-end" },
{ label: "Liquid DnB", cat: "Drum & Bass / Jungle", prompt: "liquid drum and bass 2026, soulful melodic rolling breaks, atmospheric pads, warm jazzy chords, mature understated vocals, High Contrast Netsky Pola & Bryson Calibre Monrroe style: emotional immersive journey, evolved rollers, smooth driving energy, late-night headphone/festival feel, less overpowering pop toplines, airy spatial mix", bpm: 172, negativePrompt: "aggressive neuro reese wobble, heavy metal guitars, trap hi-hat spam, dark phonk distortion, big room supersaw drops, overly harsh clipping" },
{ label: "Neurofunk", cat: "Drum & Bass / Jungle", prompt: "neurofunk 2026, dark rolling neuro basslines, razor-sharp techy leads, dystopian futuristic sound design, Black Sun Empire Noisia Mefjus A.M.C style: relentless aggression, industrial grit, new-school neuro elements, warehouse/headphone intensity, cybernetic heavy pressure, clean spectral clarity, ultra-tight transients", bpm: 174, negativePrompt: "uplifting liquid pads, orchestral epic melodies, bright pop hooks, chill phonk cowbell, slow reggaeton groove, soft attack" },
{ label: "Modern Jungle", cat: "Drum & Bass / Jungle", prompt: "modern jungle 2026, breakbeat revival roots, gritty raw energy, atmospheric deep cuts, Tim Reaper illesta Peshay Nookie influence style: old-school jungle grooves meets fresh production, chopped samples, club/underground weapon, high-tempo bouncy vibe, raw organic punch", bpm: 170, negativePrompt: "clean melodic trap, orchestral cinematic, smooth liquid soulful, hyperpop glitch, big room festival drops, overly digital compression" },
{ label: "Jump Up DnB", cat: "Drum & Bass / Jungle", prompt: "jump up drum and bass 2026, heavy ragga-influenced basslines, energetic festival rollers, filthy dancefloor bangers, T-Lex Kanine Nu Elementz style: high-octane aggression, vocal chops, crowd hype energy, underground to mainstage crossover, high-impact club master", bpm: 175, negativePrompt: "chill atmospheric pads, orchestral strings, slow melodic liquid, phonk distortion heavy, ambient drone, lack of bass-kick punch" },
{ label: "Melodic Neurofunk", cat: "Drum & Bass / Jungle", prompt: "melodic neurofunk 2026, dark neuro bass meets atmospheric melodic layers, cinematic rainy night vibes, hybrid neuro-liquid fusion, Bruffness MUZZ Sub Focus style: haunting ethereal pads, intricate stereoscopic drums, deep immersive energy, late-night drive soundtrack, professional balanced master", bpm: 172, negativePrompt: "pure aggressive reese spam, trap 808 dominance, bright uplifting chords, chill lo-fi, orchestral symphony, flat mix" },
{ label: "Techstep / Darkstep", cat: "Drum & Bass / Jungle", prompt: "techstep darkstep 2026, ultra-technical dark neurofunk, industrial dystopian textures, heavy reese + razor leads, Ed Rush Magnetude Zardonic style: futuristic aggression, minimal growls/vocals, relentless pressure, warehouse dark energy, sterile high-fidelity crunch", bpm: 175, negativePrompt: "soulful liquid melodies, pop crossover hooks, orchestral epic, bright major key, reggae skank, muddy transients" },
{ label: "Hybrid Jungle / DnB", cat: "Drum & Bass / Jungle", prompt: "hybrid jungle dnb 2026, jungle roots meets modern dnb experimentation, breakbeat + neuro/liquid fusion, global underground revival, Tim Reaper + new-school influence style: raw grimy grooves, evolved atmospheric elements, club-ready high-energy, boundary-pushing future classics, crisp rhythmic clarity", bpm: 173, negativePrompt: "clean polished mix, trap hi-hat triplets, orchestral pads without breaks, hyperpop maximalism, slow ambient, lack of groove" },
  
  // ── Phonk variants 2026 ────────────────────────────────────────────────────────
// Actualizat Martie 2026: Brazilian phonk/funk montagem ultra-viral (TikTok gym/drift edits), aggressive drift heavy, slowed + reverb dominant, krushfunk/military testosterone boost, underground car/night drive weapon
{ label: "Brazilian Phonk", cat: "Phonk variants 2026", prompt: "brazilian phonk 2026, baile funk hybrid heavy cowbell, distorted 808 bass, viral TikTok drift/gym edits, ALLSOUND SOCIETY OXEN Infraction kells style: fast-paced funk rhythm, chopped Brazilian vocal samples, dark aggressive atmosphere, high-energy underground motivation, slowed reverb layers for night drives", bpm: 140, negativePrompt: "clean melodic trap, orchestral strings, smooth jazz pads, liquid dnb breaks, bright pop hooks" },
{ label: "Aggressive Drift Phonk", cat: "Phonk variants 2026", prompt: "aggressive drift phonk 2026, extreme distorted 808 reese bass, fast cowbell rolls, adrenaline gym/drift energy, Kordhell INTERWORLD DXRK PlayaPhonk influence: minimal chopped screams or growls, heavy distortion grit, racing cinematic intensity, testosterone boost beast mode for car edits", bpm: 160, negativePrompt: "laid-back dreamy plugg, soft hyperpop glitch, acoustic elements, chilled ambient, uplifting liquid pads" },
{ label: "Funk Brasil Montagem", cat: "Phonk variants 2026", prompt: "funk brasil montagem 2026, rapid percussion heavy kicks, viral dance challenge beats, 150+ BPM montagem energy, ALLSOUND SOCIETY RCm TheGoodVibe style: aggressive vocal chops/samples, party shouts, TikTok/Reels explosion, dark slowed vibes for gym/night drives, baile funk phonk hybrid", bpm: 150, negativePrompt: "slow trap groove, orchestral epic, chill lo-fi hiss, metal guitars dominant, neurofunk razor leads" },
{ label: "Slowed Brazilian Phonk", cat: "Phonk variants 2026", prompt: "slowed brazilian phonk 2026, deep slowed + reverb funk, heavy bass syrupy tempo, viral TikTok aura/sigma edits, ALLSOUND SOCIETY Infraction Overtaker style: chopped nostalgic samples, dreamy dark atmosphere, late-night drive motivation, gym cooldown heavy vibes", bpm: 110, negativePrompt: "fast aggressive cowbell spam, bright major key, hyperpop maximalism, liquid dnb rolling breaks, clean polished mix" },
{ label: "Krushfunk / Krush Phonk", cat: "Phonk variants 2026", prompt: "krushfunk 2026, aggressive krush bass distortion, fast phonk-funk hybrid, gym/workout testosterone energy, ZMAJOR SEKIMANE zxnc style: heavy reese/krush layers, chopped aggressive vocals, viral underground rave/phonk mix, dark futuristic grit", bpm: 145, negativePrompt: "smooth melodic hooks, orchestral cinematic, chill ambient pads, slow cloud rap, bright pop chorus" },
{ label: "Military / Hard Phonk", cat: "Phonk variants 2026", prompt: "military hard phonk 2026, ultra-aggressive distorted 808, military march rhythm fused phonk, dark heavy testosterone boost, DashGo Platinum Sound style: intense gym/motivation weapon, minimal vocals or growls, dystopian aggressive energy, car edit/night drive dominance", bpm: 155, negativePrompt: "soft dreamy textures, liquid soulful pads, orchestral epic, reggaeton dembow, bright uplifting chords" },
{ label: "Viral TikTok Phonk 2026", cat: "Phonk variants 2026", prompt: "viral tiktok phonk 2026, short explosive hooks, aggressive brazilian funk/phonk edits, aura farming sigma vibes, JMilton Rugada Sayfalse Sekimane style: fast chopped samples, heavy bass drops for Reels/Shorts, gym drift viral challenge energy, underground to trending crossover", bpm: 145, negativePrompt: "long ambient drone, smooth r&b crooning, orchestral symphony, slow ballad, jazz improvisation" },
{ label: "Deep Dark Phonk", cat: "Phonk variants 2026", prompt: "deep dark phonk 2026, atmospheric heavy bass, slowed gritty cowbell, night drive cinematic vibes, underground phonk drift edit style: minimal chopped Memphis samples, eerie reverb layers, motivational dark energy, gym focus late-night aesthetic", bpm: 130, negativePrompt: "bright festival drops, hyperpop glitch chaos, upbeat major key, liquid dnb soulful, clean pop production" },
  
  // ── Afrobeats / Afropop ────────────────────────────────────────────────────────
// Actualizat Martie 2026: dominant global, Amapiano fusion masiv, log drum mai subtil în mainstream, artiști noi + crossover cu Afro-house / pop
{ label: "Afro-Latin Tech Pop", cat: "Afrobeats / Afropop", prompt: "high-energy afro-latin fusion 2026, Aaron Sevilla & Mijangos style, driving club bassline, organic congas & bongos, rhythmic spanish vocal fragments, tribal pop energy, techy synth stabs, peak-time global groove, rhythmic tension", bpm: 124, negativePrompt: "eurodance synths, melancholic violin, ambient wash, lo-fi grit, dubstep growls, pop piano" },

{ label: "Melodic Afro-Pop", cat: "Afrobeats / Afropop", prompt: "sophisticated melodic afropop 2026, Maz & Antdot style, lush analog synth plucks, driving organic percussion, deep melodic bass progression, emotive vocal breakdowns, brazilian-influenced rhythms, high-fidelity spatial textures, radio-ready club master", bpm: 123, negativePrompt: "aggressive industrial techno, distorted vocals, chaotic noise, cheap casio sounds, trap hi-hat triplets" },

{ label: "Ancestral Pop Soul", cat: "Afrobeats / Afropop", prompt: "raw ancestral afrobeats 2026, Boddhi Satva & Shimza style, heavy djembe patterns, deep sub-bass drones, spiritual african chanting, polyrhythmic complexity, dark club energy, driving rhythm, ritualistic atmosphere with pop appeal", bpm: 122, negativePrompt: "bright cheesy pop chords, electric guitar solos, thin drum samples, jazz scatting, EDM risers" },

{ label: "Organic Sunset Pop", cat: "Afrobeats / Afropop", prompt: "organic afropop 2026, Keinemusik &Me Adam Port style: soft percussive layers, warm rhodes chords, soulful vocal whispers, atmospheric textures, sunset beach club vibe, elegant minimalist groove, wooden percussion, global pop crossover", bpm: 120, negativePrompt: "distorted 808, heavy metal, aggressive stabs, neurofunk bass, plastic digital sounds" },

{ label: "Ethno / Desert Pop", cat: "Afrobeats / Afropop", prompt: "ethno afropop 2026, Bedouin & Sabo style, middle-eastern instrumentation, oud and ney flute melodies, hypnotic slow-burn groove, spiritual ritual percussion, organic foley, sunset festival atmosphere, deep mystical pop journey", bpm: 118, negativePrompt: "heavy metal guitars, hyperpop vocals, jump-up dnb bass, glitchy digital artifacts, radio pop" },

{ label: "Amapiano Pop Hybrid", cat: "Afrobeats / Afropop", prompt: "afropop amapiano fusion 2026, deep soulful afrobeats, log drum bass accents, shaker loops, jazzy piano chords, South African pop energy, smooth transition between tech and amapiano, warm sub-bass, log drum texture", bpm: 115, negativePrompt: "aggressive saw leads, industrial noise, trance arpeggios, high-pitched screeching, rock drums" },

{ label: "Stutter / Liquid Pop", cat: "Afrobeats / Afropop", prompt: "stutter house 2026, PinkPantheress style, chopped soulful vocals, fast breakbeat influenced percussion, liquid synth textures, nostalgic 2000s aesthetic, dreamy atmosphere, rhythmic vocal gating, high-speed rhythmic energy", bpm: 135, negativePrompt: "heavy distorted bass, slow ambient drone, aggressive metal vocals, cinematic brass, acoustic folk guitar" },

{ label: "Baile Funk Evolution", cat: "Afrobeats / Afropop", prompt: "modern baile funk fusion 2026, brazilian phonk elements, aggressive rhythmic percussion, heavy sub-bass 808, vocal funk chants, gritty urban textures, global club energy, high-intensity dancefloor rhythm, sharp metallic snares", bpm: 130, negativePrompt: "trance pads, orchestral strings, slow tempo, country music, soft acoustic piano" },

];

// ── Default Category Metadata ──────────────────────────────────────────────────
// Metadata compact pentru UI: iconițe, culori, descrieri scurte
const DEFAULT_CAT_META = {
  "Hip-Hop": {
    lm_negative_prompt: "orchestral symphony, smooth jazz, four-on-the-floor EDM, cheesy pop chorus, country twang",
    bpm: 0,
    instrumental: false,
    icon: "🎤",
    color: "#c77dff",
    description: "Trap, drill, phonk, boom bap",
    order: 1,
  },
  "Romanian": {
    lm_negative_prompt: "trap 808 dominance, dubstep, metal distortion, EDM drops, autotune pop",
    bpm: 0,
    instrumental: false,
    icon: "🇷🇴",
    color: "#ff4757",
    description: "Manele, trap RO, folclor",
    order: 2,
  },
  "Rock & Metal": {
    lm_negative_prompt: "trap 808 dominance, autotune pop, EDM drops, smooth jazz ballad, lo-fi chill, orchestral waltz outside symphonic metal",
    bpm: 0,
    instrumental: false,
    icon: "🎸",
    color: "#e63946",
    description: "Rock, metalcore, nu-metal",
    order: 3,
  },
  "House & Electronic": {
    lm_negative_prompt: "metal guitars, trap hats, rap vocals, orchestral, reggae one-drop, lo-fi cassette",
    bpm: 0,
    instrumental: false,
    icon: "🎧",
    color: "#06d6a0",
    description: "House, techno, EDM, afro house, melodic, progressive, ethno, desert",
    order: 4,
  },
  "Reggae": {
    lm_negative_prompt: "metal, rock distortion, orchestral symphony, jazz swing, ambient drone",
    bpm: 0,
    instrumental: false,
    icon: "🇯🇲",
    color: "#118ab2",
    description: "Reggaeton, dembow, dancehall",
    order: 5,
  },
  "Afrobeats / Afropop": {
    lm_negative_prompt: "metal distortion, orchestral epic, smooth jazz ballad, trap 808 dominance",
    bpm: 0,
    instrumental: false,
    icon: "🌍",
    color: "#ffd166",
    description: "Afrobeats, amapiano, afro-fusion, alté, naija street, Afro-Latin",
    order: 6,
  },
  "Oriental Traditional": {
    lm_negative_prompt: "trap 808, EDM drop, metal distortion, autotune pop, lo-fi chill",
    bpm: 0,
    instrumental: false,
    icon: "🎼",
    color: "#ff9f1c",
    description: "Arabic classical, tarab, maqam",
    order: 7,
  },
  "Oriental Modern / Fusion": {
    lm_negative_prompt: "orchestral symphony, smooth jazz, metal guitars, lo-fi chill",
    bpm: 0,
    instrumental: false,
    icon: "🎹",
    color: "#e63946",
    description: "Arabic pop, mahraganat, fusion",
    order: 8,
  },
  "Phonk variants 2026": {
    lm_negative_prompt: "orchestral symphony, smooth jazz ballad, clean pop vocals, acoustic guitar, lo-fi chill",
    bpm: 0,
    instrumental: false,
    icon: "🚗",
    color: "#9b2de0",
    description: "Drift phonk, Brazilian phonk",
    order: 9,
  },
  "Drum & Bass / Jungle": {
    lm_negative_prompt: "slow ballad, orchestral strings, smooth R&B, reggae skank, acoustic folk",
    bpm: 0,
    instrumental: false,
    icon: "🥁",
    color: "#4ecdc4",
    description: "170+ BPM, liquid, neurofunk",
    order: 10,
  },
  "default": {
    icon: "🎵",
    color: "#8888aa",
    description: "Alege un gen",
    order: 99,
  },
};

// Sorted categories by 'order' property
const SORTED_CATEGORIES = Object.keys(DEFAULT_CAT_META)
  .filter(k => k !== "default")
  .sort((a, b) => DEFAULT_CAT_META[a].order - DEFAULT_CAT_META[b].order);

// Helper to get category metadata
function getCategoryMeta(category) {
  return DEFAULT_CAT_META[category] || DEFAULT_CAT_META.default;
}

// Sub-presete rapide ca preset-uri COMPLETE (caption + negative + BPM etc.), ca cele din JSON
function buildQuickGenres() {
  const byCat = {};
  GENRE_PRESETS.forEach((p) => {
    // Skip categories that are not in DEFAULT_CAT_META (avoid empty categories in UI)
    if (!DEFAULT_CAT_META[p.cat]) return;
    
    if (!byCat[p.cat]) byCat[p.cat] = {};
    const meta = DEFAULT_CAT_META[p.cat] || { lm_negative_prompt: "", bpm: 0, instrumental: false };
    byCat[p.cat][p.label] = {
      caption: p.prompt,
      lm_negative_prompt: p.negativePrompt ?? p.lm_negative_prompt ?? meta.lm_negative_prompt,
      negatives: p.negatives ?? p.negativePrompt ?? p.lm_negative_prompt ?? meta.lm_negative_prompt,
      bpm: p.bpm != null ? p.bpm : meta.bpm,
      key_scale: p.key_scale ?? p.keyScale ?? "",
      keyscale: p.keyscale ?? p.key_scale ?? p.keyScale ?? "",
      instrumental: p.instrumental != null ? p.instrumental : meta.instrumental,
    };
  });
  const result = {};
  Object.keys(byCat).forEach((cat) => {
    result[cat] = { subgenres: byCat[cat] };
  });
  return result;
}
const QUICK_GENRES = buildQuickGenres();

// ── Preset Manager Modal ───────────────────────────────────────────────────────
function PresetManager({
  open, onClose,
  currentSettings,
  onLoad,
}) {
  const [userPresets, setUserPresets] = useState(loadPresets);
  const [saveName, setSaveName] = useState("");
  const [saveIcon, setSaveIcon] = useState("⭐");
  const [saveColor, setSaveColor] = useState("#ffd166");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [activeTab, setActiveTab] = useState("load"); // "load" | "save"
  const [notification, setNotification] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && activeTab === "save" && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, activeTab]);

  const showNotif = (msg, color = "#06d6a0") => {
    setNotification({ msg, color });
    setTimeout(() => setNotification(null), 2500);
  };

  const handleSave = () => {
    const name = saveName.trim();
    if (!name) return;
    const newPreset = {
      id: `user_${Date.now()}`,
      name: `${saveIcon} ${name}`,
      icon: saveIcon,
      color: saveColor,
      builtIn: false,
      createdAt: new Date().toLocaleString("ro-RO"),
      settings: { ...currentSettings },
    };
    const updated = [newPreset, ...userPresets];
    setUserPresets(updated);
    savePresetsToStorage(updated);
    setSaveName("");
    showNotif(`✅ Preset "${newPreset.name}" saved!`);
    setActiveTab("load");
  };

  const handleDelete = (id) => {
    const updated = userPresets.filter(p => p.id !== id);
    setUserPresets(updated);
    savePresetsToStorage(updated);
    setConfirmDelete(null);
    showNotif("🗑 Preset deleted", "#e63946");
  };

  const handleLoad = (preset) => {
    onLoad(preset.settings);
    showNotif(`✅ Preset "${preset.name}" loaded!`);
    setTimeout(() => onClose(), 800);
  };

  const allPresets = [...DEFAULT_PRESETS, ...userPresets];

  if (!open) return null;

  const S = {
    overlay: {
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(4px)",
    },
    modal: {
      background: "linear-gradient(135deg,#0d0d22,#0a0a1a)",
      border: "1px solid #2a2a4a", borderRadius: 16,
      width: "min(560px, 95vw)", maxHeight: "85vh",
      display: "flex", flexDirection: "column",
      boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
    },
    header: {
      padding: "18px 20px 14px",
      borderBottom: "1px solid #1a1a2e",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    },
    tab: (active, color) => ({
      flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 700,
      background: active ? color + "22" : "#0a0a1a",
      border: `1px solid ${active ? color : "#2a2a4a"}`,
      color: active ? color : "#444466", cursor: "pointer",
    }),
    presetCard: (color) => ({
      background: "#0d0d22", border: `1px solid ${color}33`,
      borderRadius: 10, padding: "12px 14px", marginBottom: 8,
      display: "flex", alignItems: "center", gap: 12,
      transition: "border-color 0.2s",
    }),
    input: {
      width: "100%", background: "#080812", border: "1px solid #2a2a4a",
      color: "#e0e0ff", borderRadius: 8, padding: "10px 12px",
      fontSize: 13, outline: "none", boxSizing: "border-box",
    },
    btn: (bg, color, border) => ({
      background: bg, color, border: `1px solid ${border}`,
      borderRadius: 7, padding: "8px 14px", fontSize: 12,
      fontWeight: 700, cursor: "pointer",
    }),
  };

  const ICONS = ["⭐", "🎵", "🎤", "🎸", "🎹", "🎺", "🥁", "🎼", "🎧", "🔥", "⚡", "🌙", "🌊", "🎯", "💎", "🚀"];
  const COLORS = ["#ffd166", "#c77dff", "#06d6a0", "#00e5ff", "#e63946", "#ff9f1c", "#9b2de0", "#4cc9f0"];

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <div style={{ color: "#e0e0ff", fontSize: 16, fontWeight: 900 }}>💾 Preset Settings</div>
            <div style={{ color: "#444466", fontSize: 11, marginTop: 2 }}>Save and load ACE-Step configurations</div>
          </div>
          <button onClick={onClose} style={{ background: "#e6394611", color: "#e63946", border: "1px solid #e6394633", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>✕</button>
        </div>

        {/* Notification */}
        {notification && (
          <div style={{ margin: "10px 20px 0", padding: "8px 14px", background: notification.color + "22", border: `1px solid ${notification.color}44`, borderRadius: 8, color: notification.color, fontSize: 12, fontWeight: 700, textAlign: "center" }}>
            {notification.msg}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, padding: "14px 20px 0" }}>
          <button style={S.tab(activeTab === "load", "#ffd166")} onClick={() => setActiveTab("load")}>
            📂 Load Preset ({allPresets.length})
          </button>
          <button style={S.tab(activeTab === "save", "#06d6a0")} onClick={() => setActiveTab("save")}>
            💾 Save Current
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 20px" }}>

          {/* LOAD TAB */}
          {activeTab === "load" && (
            <div>
              {/* Built-in presets */}
              <div style={{ color: "#444466", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
                📦 Built-in Presets
              </div>
              {DEFAULT_PRESETS.map(preset => (
                <div key={preset.id} style={S.presetCard(preset.color)}>
                  <div style={{ fontSize: 22, flexShrink: 0 }}>{preset.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: preset.color, fontSize: 13, fontWeight: 700 }}>{preset.name}</div>
                    <div style={{ color: "#444466", fontSize: 10, marginTop: 2 }}>
                      {preset.settings.taskType === "audio2audio" ? "🎤 Audio Cover" : "✍️ Text → Music"} ·
                      {" "}{preset.settings.duration}s · {preset.settings.inferSteps} steps · CFG {preset.settings.guidanceScale}
                    </div>
                    <div style={{ color: "#333355", fontSize: 10, marginTop: 1, fontFamily: "monospace" }}>
                      "{preset.settings.prompt.slice(0, 50)}..."
                    </div>
                  </div>
                  <button onClick={() => handleLoad(preset)} style={S.btn(preset.color + "22", preset.color, preset.color + "44")}>
                    ▶ Load
                  </button>
                </div>
              ))}

              {/* User presets */}
              {userPresets.length > 0 && (
                <>
                  <div style={{ color: "#444466", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", margin: "16px 0 8px" }}>
                    ⭐ My Presets ({userPresets.length})
                  </div>
                  {userPresets.map(preset => (
                    <div key={preset.id} style={S.presetCard(preset.color)}>
                      <div style={{ fontSize: 22, flexShrink: 0 }}>{preset.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: preset.color, fontSize: 13, fontWeight: 700 }}>{preset.name}</div>
                        <div style={{ color: "#444466", fontSize: 10, marginTop: 2 }}>
                          {preset.settings.taskType === "audio2audio" ? "🎤 Audio Cover" : "✍️ Text → Music"} ·
                          {" "}{preset.settings.duration}s · {preset.settings.inferSteps} steps · CFG {preset.settings.guidanceScale}
                        </div>
                        {preset.createdAt && (
                          <div style={{ color: "#333355", fontSize: 10, marginTop: 1 }}>📅 {preset.createdAt}</div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => handleLoad(preset)} style={S.btn(preset.color + "22", preset.color, preset.color + "44")}>
                          ▶ Load
                        </button>
                        {confirmDelete === preset.id ? (
                          <div style={{ display: "flex", gap: 4 }}>
                            <button onClick={() => handleDelete(preset.id)} style={S.btn("#e6394622", "#e63946", "#e6394644")}>✓ Yes</button>
                            <button onClick={() => setConfirmDelete(null)} style={S.btn("#1a1a2e", "#6666aa", "#2a2a4a")}>✕</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDelete(preset.id)} style={S.btn("#e6394611", "#e63946", "#e6394633")}>🗑</button>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {userPresets.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px 0", color: "#333355", fontSize: 12 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                  <div>You have no saved presets yet.</div>
                  <div style={{ marginTop: 4 }}>Configure settings and click "Save Current".</div>
                </div>
              )}
            </div>
          )}

          {/* SAVE TAB */}
          {activeTab === "save" && (
            <div>
              <div style={{ color: "#444466", fontSize: 11, marginBottom: 14, padding: "10px 12px", background: "#0d0d22", borderRadius: 8, border: "1px solid #1a1a2e" }}>
                💡 Current settings will be saved: task type, prompt, lyrics, duration, CFG, steps, seed, BPM, key, negative prompt.
              </div>

              {/* Current settings preview */}
              <div style={{ background: "#080812", border: "1px solid #1a1a2e", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
                <div style={{ color: "#6666aa", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>📋 Current Settings</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
                  {[
                    ["Task", currentSettings.taskType === "audio2audio" ? "🎤 Audio Cover" : "✍️ Text→Music"],
                    ["Duration", `${currentSettings.duration}s`],
                    ["CFG Scale", currentSettings.guidanceScale],
                    ["Steps", currentSettings.inferSteps],
                    ["Seed", currentSettings.seed === -1 ? "Random" : currentSettings.seed],
                    ["BPM", currentSettings.bpm === 0 ? "Auto" : currentSettings.bpm],
                    ["Key", currentSettings.keyScale || "Auto"],
                    ["Source Strength", currentSettings.sourceStrength],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#444466", fontSize: 11 }}>{k}:</span>
                      <span style={{ color: "#aaaacc", fontSize: 11, fontFamily: "monospace" }}>{v}</span>
                    </div>
                  ))}
                </div>
                {currentSettings.prompt && (
                  <div style={{ marginTop: 6, color: "#333355", fontSize: 10, fontFamily: "monospace", borderTop: "1px solid #1a1a2e", paddingTop: 6 }}>
                    Prompt: "{currentSettings.prompt.slice(0, 80)}{currentSettings.prompt.length > 80 ? "..." : ""}"
                  </div>
                )}
              </div>

              {/* Name input */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: "#6666aa", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>📝 Preset Name</div>
                <input
                  ref={inputRef}
                  type="text"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveName.trim() && handleSave()}
                  placeholder="e.g. Trap Beat, Slow Cover, etc."
                  style={S.input}
                />
              </div>

              {/* Icon picker */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: "#6666aa", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>🎨 Icon</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {ICONS.map(ic => (
                    <button key={ic} onClick={() => setSaveIcon(ic)} style={{
                      width: 36, height: 36, borderRadius: 8, fontSize: 18,
                      background: saveIcon === ic ? "#ffd16622" : "#0a0a1a",
                      border: `1px solid ${saveIcon === ic ? "#ffd166" : "#2a2a4a"}`,
                      cursor: "pointer",
                    }}>{ic}</button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: "#6666aa", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>🎨 Color</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setSaveColor(c)} style={{
                      width: 32, height: 32, borderRadius: "50%", background: c,
                      border: `3px solid ${saveColor === c ? "#fff" : "transparent"}`,
                      cursor: "pointer", flexShrink: 0,
                    }} />
                  ))}
                </div>
              </div>

              {/* Preview */}
              {saveName.trim() && (
                <div style={{ ...S.presetCard(saveColor), marginBottom: 14 }}>
                  <div style={{ fontSize: 22 }}>{saveIcon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: saveColor, fontSize: 13, fontWeight: 700 }}>{saveIcon} {saveName}</div>
                    <div style={{ color: "#444466", fontSize: 10, marginTop: 2 }}>
                      {currentSettings.taskType === "audio2audio" ? "🎤 Audio Cover" : "✍️ Text → Music"} ·
                      {" "}{currentSettings.duration}s · {currentSettings.inferSteps} steps
                    </div>
                  </div>
                  <span style={{ color: saveColor, fontSize: 11 }}>Preview</span>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={!saveName.trim()}
                style={{
                  width: "100%", padding: "12px 0", borderRadius: 10,
                  background: saveName.trim() ? "linear-gradient(135deg, #06d6a0, #00b4d8)" : "#1a1a2e",
                  color: saveName.trim() ? "#000" : "#333355",
                  fontWeight: 900, fontSize: 14, border: "none",
                  cursor: saveName.trim() ? "pointer" : "not-allowed",
                  letterSpacing: 1,
                }}>
                💾 Save Preset
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AceStepTab({
  addLog, tracks, setTracks,
  // Persistent state from App.jsx (survives tab switches)
  prompt, setPrompt,
  lyrics, setLyrics,
  duration, setDuration,
  guidanceScale, setGuidanceScale,
  inferSteps, setInferSteps,
  seed, setSeed,
  genreCat, setGenreCat,
  result, setResult,
}) {
  const [aceOnline, setAceOnline] = useState(null);
  const [showPresets, setShowPresets] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [bpm, setBpm] = useState(0);
  const [keyScale, setKeyScale] = useState("");
  const [resultBpm, setResultBpm] = useState(null);
  const [resultKey, setResultKey] = useState(null);
  const [seedLibrary, setSeedLibrary] = useState(loadSeeds);
  const [showSeedLib, setShowSeedLib] = useState(false);
  const [seedSaveName, setSeedSaveName] = useState("");
  const [seedSaveInput, setSeedSaveInput] = useState(false);

  // ── Audio Cover (audio2audio) ──────────────────────────────────────────────
  const [taskType, setTaskType] = useState("text2music");  // "text2music" | "audio2audio" | "custom"
  const [sourceAudio, setSourceAudio] = useState(null);   // File object
  const [sourceAudioUrl, setSourceAudioUrl] = useState(null);
  const [sourceStrength, setSourceStrength] = useState(0.5); // 0=ignore src, 1=copy src
  const [sourceBpm, setSourceBpm] = useState(null);
  const [sourceKey, setSourceKey] = useState(null);
  const [detectingSource, setDetectingSource] = useState(false);

  // ── Custom Mode (reference audio) ─────────────────────────────────────────
  const [customReferenceAudio, setCustomReferenceAudio] = useState(null);
  const [customReferenceUrl, setCustomReferenceUrl] = useState(null);
  const [customRefStrength, setCustomRefStrength] = useState(0.7); // 0.0-1.0
  const [customTags, setCustomTags] = useState("");
  const [detectingCustom, setDetectingCustom] = useState(false);
  const [customBpm, setCustomBpm] = useState(null);
  const [customKey, setCustomKey] = useState(null);

  // ── Extra generation params ────────────────────────────────────────────────
  const [negativePrompt, setNegativePrompt] = useState("");
  const [lmTemperature, setLmTemperature] = useState(0.85);
  const [lmCfgScale, setLmCfgScale] = useState(2.5);
  const [lmTopK, setLmTopK] = useState(0);
  const [lmTopP, setLmTopP] = useState(0.9);
  const [instrumental, setInstrumental] = useState(false);
  const [vocalLanguage, setVocalLanguage] = useState("en");  // Default: English
  const [audioFormat, setAudioFormat] = useState("wav");  // Default: WAV (uncompressed)
  const [inferMethod, setInferMethod] = useState("ode");
  const [shift, setShift] = useState(3.0);
  const [useTiledDecode, setUseTiledDecode] = useState(true);
  const [batchSize, setBatchSize] = useState(1);
  const [thinking, setThinking] = useState(false);
  const [useCotMetas, setUseCotMetas] = useState(false);     // OFF = respect user BPM/Key
  const [useCotCaption, setUseCotCaption] = useState(false);  // OFF = use exact user prompt
  const [useCotLanguage, setUseCotLanguage] = useState(false); // OFF = use vocal_language param
  // Advanced settings are always visible in the 3rd column

  // ── Clean Temp Files ──────────────────────────────────────────────────────
  const [cleaningTemp, setCleaningTemp] = useState(false);
  const [cleanResult, setCleanResult] = useState(null);

  // ── Lyrics Library ────────────────────────────────────────────────────────
  const [lyricsLibrary, setLyricsLibrary] = useState(loadLyricsLibrary);
  const [showLyricsLibrary, setShowLyricsLibrary] = useState(false);
  const [lyricsSaveName, setLyricsSaveName] = useState("");
  const [showLyricsSaveInput, setShowLyricsSaveInput] = useState(false);

  // ── Styles ────────────────────────────────────────────────────────────────
  const S = {
    card: { background: "linear-gradient(135deg,#0d0d22,#0a0a1a)", border: "1px solid #1e1e3a", borderRadius: 12, padding: 18, marginBottom: 14 },
    label: { color: "#6666aa", fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, display: "block" },
    overlay: {
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(4px)",
    },
    modal: {
      background: "linear-gradient(135deg,#0d0d22,#0a0a1a)",
      border: "1px solid #2a2a4a", borderRadius: 16,
      width: "min(800px, 95vw)", maxHeight: "85vh",
      display: "flex", flexDirection: "column",
      boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
    },
    header: {
      padding: "18px 20px 14px",
      borderBottom: "1px solid #1a1a2e",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    },
  };

  const TENSOR_MODELS = [
    { 
      id: "acestep-v15-turbo", 
      name: "⚡ Turbo", 
      desc: "8 steps │ ~1 min │ Fast", 
      color: "#06d6a0", 
      steps: 8, 
      cfg: false,  // ❌ No CFG support
      features: "Text2Music, Cover, Repaint",
      vram: "~4-5GB",
      quality: "Very High",
      diversity: "Medium",
      hasExtract: false,
      hasLego: false,
      hasComplete: false
    },
    { 
      id: "acestep-v15-sft-turbo_0.5", 
      name: "⚡ SFT-Turbo 0.5", 
      desc: "Hybrid │ ~2 min │ Balanced", 
      color: "#ffd166", 
      steps: 32,  // Hybrid steps (between turbo 8 and sft 50)
      cfg: true,  // ✅ CFG support
      features: "Text2Music, Cover, Repaint",
      vram: "~5-6GB",
      quality: "High",
      diversity: "Medium",
      hasExtract: false,
      hasLego: false,
      hasComplete: false
    },
    { 
      id: "acestep-v15-sft", 
      name: "🎵 SFT", 
      desc: "50 steps │ ~3 min │ Quality", 
      color: "#c77dff", 
      steps: 50, 
      cfg: true,  // ✅ CFG support
      features: "Text2Music, Cover, Repaint",
      vram: "~6-7GB",
      quality: "High",
      diversity: "Medium",
      hasExtract: false,
      hasLego: false,
      hasComplete: false
    },
    { 
      id: "acestep-v15-base-sft", 
      name: "🎯 Base-SFT", 
      desc: "50 steps │ ~3 min │ Enhanced", 
      color: "#00e5ff", 
      steps: 50,  // Same as base
      cfg: true,  // ✅ CFG support
      features: "Text2Music, Cover, Repaint",
      vram: "~7-8GB",
      quality: "High",
      diversity: "Medium",
      hasExtract: false,
      hasLego: false,
      hasComplete: false
    },
    { 
      id: "acestep-v15-base", 
      name: "🎯 Base", 
      desc: "50 steps │ ~4 min │ All Features", 
      color: "#118ab2", 
      steps: 50, 
      cfg: true,  // ✅ CFG support
      features: "All Features + Extract/Lego/Complete",
      vram: "~7-8GB",
      quality: "Medium",
      diversity: "High",
      hasExtract: true,
      hasLego: true,
      hasComplete: true
    },
  ];

  // Default DIT Model (user can select from dropdown)
  const [tensorModel, setTensorModel] = useState("acestep-v15-turbo");

  // Current model info (computed from selected model)
  const modelInfo = TENSOR_MODELS.find(m => m.id === tensorModel) || TENSOR_MODELS[0];

  // Auto-adjust inferSteps when model changes
  useEffect(() => {
    const currentModel = TENSOR_MODELS.find(m => m.id === tensorModel);
    if (currentModel && currentModel.steps) {
      setInferSteps(currentModel.steps);
    }
  }, [tensorModel]);

  // Auto-adjust guidanceScale when model changes (CFG)
  // Turbo models: CFG 1.0 (forced/disabled), Base/SFT models: CFG 7.0
  useEffect(() => {
    const currentModel = TENSOR_MODELS.find(m => m.id === tensorModel);
    if (currentModel) {
      // Set default guidance scale based on model type
      // Turbo (no CFG): 1.0 (forced) | SFT/Base (with CFG): 7.0
      setGuidanceScale(currentModel.cfg ? 7.0 : 1.0);
    }
  }, [tensorModel]);

  // Task type model compatibility
  const taskTypeModelSupport = {
    text2music: {
      'acestep-v15-turbo': { supported: true, note: '✅ Fast (8 steps), No CFG' },
      'acestep-v15-sft-turbo_0.5': { supported: true, note: '✅ Balanced (20 steps)' },
      'acestep-v15-sft': { supported: true, note: '✅ High quality (50 steps)' },
      'acestep-v15-base-sft': { supported: true, note: '✅ Enhanced (50 steps)' },
      'acestep-v15-base': { supported: true, note: '✅ All features (50 steps)' },
    },
    audio2audio: {
      'acestep-v15-turbo': { supported: true, note: '✅ Fast (8 steps), No CFG' },
      'acestep-v15-sft-turbo_0.5': { supported: true, note: '✅ Balanced (20 steps)' },
      'acestep-v15-sft': { supported: true, note: '✅ High quality (50 steps)' },
      'acestep-v15-base-sft': { supported: true, note: '✅ Enhanced (50 steps)' },
      'acestep-v15-base': { supported: true, note: '✅ All features (50 steps)' },
    },
    repaint: {
      'acestep-v15-turbo': { supported: true, note: '✅ Fast (8 steps)' },
      'acestep-v15-sft-turbo_0.5': { supported: true, note: '✅ Balanced (20 steps)' },
      'acestep-v15-sft': { supported: true, note: '✅ High quality (50 steps)' },
      'acestep-v15-base-sft': { supported: true, note: '✅ Enhanced (50 steps)' },
      'acestep-v15-base': { supported: true, note: '✅ All features (50 steps)' },
    },
    lego: {
      'acestep-v15-turbo': { supported: false, note: '❌ Base model only' },
      'acestep-v15-sft-turbo_0.5': { supported: false, note: '❌ Base model only' },
      'acestep-v15-sft': { supported: false, note: '❌ Base model only' },
      'acestep-v15-base-sft': { supported: false, note: '❌ Base model only' },
      'acestep-v15-base': { supported: true, note: '✅ Exclusive feature' },
    },
    complete: {
      'acestep-v15-turbo': { supported: false, note: '❌ Base model only' },
      'acestep-v15-sft-turbo_0.5': { supported: false, note: '❌ Base model only' },
      'acestep-v15-sft': { supported: false, note: '❌ Base model only' },
      'acestep-v15-base-sft': { supported: false, note: '❌ Base model only' },
      'acestep-v15-base': { supported: true, note: '✅ Exclusive feature' },
    },
    extract: {
      'acestep-v15-turbo': { supported: false, note: '❌ Base model only' },
      'acestep-v15-sft-turbo_0.5': { supported: false, note: '❌ Base model only' },
      'acestep-v15-sft': { supported: false, note: '❌ Base model only' },
      'acestep-v15-base-sft': { supported: false, note: '❌ Base model only' },
      'acestep-v15-base': { supported: true, note: '✅ Exclusive feature' },
    },
  };

  // ── Vocal Language Options ────────────────────────────────────────────────
  const VOCAL_LANGUAGES = [
    { code: "unknown", name: "🎵 Instrumental / Auto", native: "Auto-detect" },
    { code: "ro", name: "Romanian", native: "Română" },
    { code: "en", name: "English", native: "English" },
    { code: "es", name: "Spanish", native: "Español" },
    { code: "ar", name: "Arabic", native: "العربية" },
    { code: "el", name: "Greek", native: "Ελληνικά" },
    { code: "tr", name: "Turkish", native: "Türkçe" },
  ];

  // ── Prompt Helper ──────────────────────────────────────────────────────────
  const PROMPT_INJECTS = [
    // Identitate
    { category: "Identitate", label: "Female", tags: "female voice", desc: "Definește spectrul de frecvențe de bază (bariton vs. sopran)." },
    { category: "Identitate", label: "Male", tags: "male voice", desc: "Definește spectrul de frecvențe de bază (bariton vs. sopran)." },
    // Calitate
    { category: "Calitate", label: "Studio Clean", tags: "studio-clean, silent background", desc: "Elimină zgomotul de fundal; voce clară de studio." },
    { category: "Calitate", label: "High Fidelity", tags: "high-fidelity, 48kHz", desc: "Crește claritatea frecvențelor înalte; detaliu maxim." },
    { category: "Calitate", label: "No Artifacts", tags: "no digital artifacts", desc: "Elimină sunetele metalice/robotizate; sunet natural." },
    // Performanță
    { category: "Performanță", label: "Master-Class", tags: "master-class vocals, expressive, balanced", desc: "Comprimare profesională; voce ca într-o înregistrare scumpă." },
    { category: "Performanță", label: "Expressive", tags: "expressive, balanced", desc: "Mixaj echilibrat între voce și instrumente; emoție pură." },
    // Dark Minimal Afro
    { category: "Dark Minimal", label: "Afro Minimal", tags: "afro-minimal-bass, eerie-atmospheric-pads, sparse-percussion, shadowy-vibe, driving-steady-groove", desc: "Bas subțire, dar profund (sub-bass) care domină mixul." },
    // Sevilla Style
    { category: "Sevilla Style", label: "Tribal Afro", tags: "tribal-percussion-layering, deep-afro-groove, syncopated-drums, driving-afro-bassline, spatial-club-mix", desc: "Multi-stratificare de tobe organice și conga." },
    // Dragoste
    { category: "Dragoste", label: "Intimate", tags: "intimate-vocal-warmth, emotional-breathiness, heartfelt-delivery, romantic-vocal-texture", desc: "Accent pe frecvențele joase; voce 'la urechea' ascultătorului." },
    // Soul
    { category: "Soul", label: "Soulful", tags: "soulful-delivery, organic-resonance, authentic-phrasing", desc: "Voce 'caldă', fără să pară artificială sau procesată." },
    // Energic
    { category: "Energic", label: "Energic", tags: "rhythmic-precision, high-energy-delivery, punchy-articulation", desc: "Consonante clare; perfect pentru ritmuri rapide și dansabile." },
    // Chill
    { category: "Chill", label: "Chill", tags: "laid-back-flow, spacious-mix, relaxed-tonal-balance", desc: "Voce plasată într-un spațiu mare; oferă relaxare auditivă." },
    // Power
    { category: "Power", label: "Power", tags: "raw-vocal-intensity, high-dynamic-range, power-delivery", desc: "Trecere intensă de la șoaptă la strigăt; impact dramatic." },
    // Sharp
    { category: "Sharp", label: "Sharp", tags: "sharp-articulation, aggressive-flow, polished-presence", desc: "Atașament rapid pe beat; vocea 'taie' prin instrumente." },
    // Lyric
    { category: "Lyric", label: "Lyric", tags: "lyrical-clarity, steady-pacing, intimate-texture", desc: "Accent pe dicție; înțelegi fiecare cuvânt clar." },
    // Hypnotic
    { category: "Hypnotic", label: "Hypnotic", tags: "hypnotic-cadence, lush-vocal-layering, fluid-delivery", desc: "Voce dublată (harmony); efect de 'trance' sau visare." },
    // Oriental
    { category: "Oriental", label: "Oriental", tags: "microtonal-accuracy, emotional-ornamentation, resonant-depth", desc: "Permite note 'între clape' (sferturi de ton) specifice Orientului." },
    // Hybrid
    { category: "Hybrid", label: "Hybrid", tags: "hybrid-vocal-processing, polished-integration, modern-polish", desc: "Voce combinată cu synth-uri; sunet de 'top chart' actual." },
    // Dark/LoFi
    { category: "Dark/LoFi", label: "Dark LoFi", tags: "distorted-lofi-aesthetic, dark-moody-phrasing, heavy-compression", desc: "Sunet 'dens', înfundat; specific stilului underground." },
    // Bright
    { category: "Bright", label: "Bright", tags: "bouncy-vocal-rhythm, bright-melodic-presence, sunny-delivery", desc: "Accent pe frecvențe medii-înalte; sunet vesel și luminos." },
    // Breath/Intimate
    { category: "Breath/Intimate", label: "Close-Mic", tags: "close-mic-placement, soft-breath-control, whisper-vocal-texture", desc: "Perfect pentru momentele în care vocea trebuie să fie 'la urechea' ascultătorului." },
    // Vocal-Chop
    { category: "Vocal-Chop", label: "Stutter", tags: "stutter-vocal-edits, rhythmic-sampling, glitchy-vocal-texture", desc: "Ideal pentru stilul House sau Phonk, pentru a face vocea să sune ca un instrument." },
    // Grand-Reverb
    { category: "Grand-Reverb", label: "Ethereal", tags: "ethereal-hall-reverb, cavernous-space, long-vocal-tail", desc: "Pentru piese dramatice, unde vocea trebuie să plutească într-un spațiu imens." },
    // Dynamic-Grit
    { category: "Dynamic-Grit", label: "Saturate", tags: "saturate-vocal-harmonic, grit-edge, tube-preamp-warmth", desc: "Adaugă acea 'murdărie' caldă (ca la discurile de vinil) care elimină sunetul 'prea digital'." },
    // Wide-Stereo
    { category: "Wide-Stereo", label: "Wide", tags: "stereo-width-expansion, double-tracked-vocal, immersive-pan", desc: "Face vocea să sune 'mai mare' decât viața, umplând tot câmpul sonor." },
  ];

  // Function to inject tags into prompt
  const injectPrompt = (tags) => {
    const currentPrompt = prompt.trim();
    if (!currentPrompt) {
      setPrompt(tags);
    } else {
      const separator = currentPrompt.endsWith(',') ? ' ' : ', ';
      setPrompt(currentPrompt + separator + tags);
    }
  };

  // ── Genre presets (full) from presetmanager.json ───────────────────────────
  const [genrePresetsData, setGenrePresetsData] = useState(null);
  const [genreCatFull, setGenreCatFull] = useState("");
  const [selectedGenreSubgenre, setSelectedGenreSubgenre] = useState(""); // "GenreName|SubgenreName"
  const [genrePresetsLoading, setGenrePresetsLoading] = useState(true);

  const loadGenrePresets = useCallback(() => {
    setGenrePresetsLoading(true);
    setGenrePresetsData(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const applyData = (data) => {
      clearTimeout(timeoutId);
      setGenrePresetsLoading(false);
      // Use API data if it has genres, otherwise use built-in QUICK_GENRES
      if (data?.genres && typeof data.genres === "object" && Object.keys(data.genres).length > 0) {
        setGenrePresetsData(data);
        setGenreCatFull((prev) => prev || Object.keys(data.genres)[0]);
      } else {
        // Fallback to built-in QUICK_GENRES (from GENRE_PRESETS in code)
        setGenrePresetsData({ version: 1, genres: QUICK_GENRES });
        setGenreCatFull((prev) => prev || Object.keys(QUICK_GENRES)[0]);
      }
    };

    fetch(`${API}/acestep_genre_presets`, { signal: controller.signal })
      .then((r) => r.json())
      .then(applyData)
      .catch(() => {
        // Fallback: use built-in QUICK_GENRES
        clearTimeout(timeoutId);
        setGenrePresetsLoading(false);
        setGenrePresetsData({ version: 1, genres: QUICK_GENRES });
        setGenreCatFull((prev) => prev || Object.keys(QUICK_GENRES)[0]);
      });
  }, []);

  useEffect(() => {
    loadGenrePresets();
  }, [loadGenrePresets]);

  const applyGenrePreset = (preset) => {
    if (!preset) return;
    // Don't switch task type - respect current mode
    // setTaskType("text2music"); // REMOVED - was forcing switch to text2music
    const caption = preset.caption || preset.prompt || "";
    const neg = preset.lm_negative_prompt ?? preset.negatives ?? "";
    const bpmVal = preset.bpm != null ? Number(preset.bpm) : 0;
    const keyVal = preset.key_scale ?? preset.keyscale ?? "";
    setPrompt(caption);
    setNegativePrompt(typeof neg === "string" ? neg : "");
    setBpm(bpmVal > 0 && bpmVal <= 300 ? bpmVal : 0);
    setKeyScale(typeof keyVal === "string" && keyVal !== "auto" ? keyVal : "");
    setInstrumental(!!preset.instrumental);
  };

  // ── Preset load handler ────────────────────────────────────────────────────
  const handleLoadPreset = (settings) => {
    if (settings.taskType !== undefined) setTaskType(settings.taskType);
    if (settings.prompt !== undefined) setPrompt(settings.prompt);
    if (settings.lyrics !== undefined) setLyrics(settings.lyrics);
    if (settings.duration !== undefined) setDuration(settings.duration);
    if (settings.guidanceScale !== undefined) setGuidanceScale(settings.guidanceScale);
    if (settings.inferSteps !== undefined) setInferSteps(settings.inferSteps);
    if (settings.seed !== undefined) setSeed(settings.seed);
    if (settings.bpm !== undefined) setBpm(settings.bpm);
    if (settings.keyScale !== undefined) setKeyScale(settings.keyScale);
    if (settings.negativePrompt !== undefined) setNegativePrompt(settings.negativePrompt);
    if (settings.sourceStrength !== undefined) setSourceStrength(settings.sourceStrength);
  };

  // ── Lyrics Library functions ───────────────────────────────────────────────
  const saveLyricsToLibrary = () => {
    if (!lyrics.trim() || !lyricsSaveName.trim()) return;
    
    const newEntry = {
      id: Date.now(),
      name: lyricsSaveName.trim(),
      lyrics: lyrics.trim(),
      createdAt: new Date().toLocaleString("ro-RO"),
    };
    
    const updated = [newEntry, ...lyricsLibrary];
    setLyricsLibrary(updated);
    saveLyricsToStorage(updated);
    setLyricsSaveName("");
    setShowLyricsSaveInput(false);
    addLog(`📚 Lyrics saved: ${lyricsSaveName}`);
  };

  const loadLyricsFromLibrary = (entry) => {
    setLyrics(entry.lyrics);
    setShowLyricsLibrary(false);
    addLog(`📚 Lyrics loaded: ${entry.name}`);
  };

  const deleteLyricsFromLibrary = (id) => {
    const updated = lyricsLibrary.filter(l => l.id !== id);
    setLyricsLibrary(updated);
    saveLyricsToStorage(updated);
    addLog(`📚 Lyrics deleted`);
  };

  const downloadLyrics = (entry) => {
    const blob = new Blob([entry.lyrics], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entry.name.replace(/[^a-z0-9]/gi, "_")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Current settings snapshot (for saving) ────────────────────────────────
  const currentSettings = {
    taskType, prompt, lyrics, duration, guidanceScale,
    inferSteps, seed, bpm, keyScale, negativePrompt, sourceStrength,
  };

  // Check ACE-Step health
  const checkHealth = async () => {
    setAceOnline(null);
    try {
      const r = await fetch(`${API}/ace_health`);
      const data = await r.json();
      setAceOnline(data.online);
      if (data.online) addLog("[OK] ACE-Step v1.5 API is online");
      else addLog("[WARN] ACE-Step API offline — run start_acestep.bat");
    } catch {
      setAceOnline(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { checkHealth(); }, []);

  const wordCount = lyrics.trim() ? lyrics.trim().split(/\s+/).length : 0;

  const handleGenerate = async () => {
    if (!prompt.trim() && taskType !== "custom") { addLog("[ERR] Enter a music prompt"); return; }
    if (!aceOnline) { addLog("[ERR] ACE-Step API is offline. Run start_acestep.bat first."); return; }
    
    // Custom mode validation
    if (taskType === "custom") {
      if (!customReferenceAudio) { addLog("[ERR] Upload reference audio for Custom mode"); return; }
      if (!customTags.trim() && !prompt.trim()) { addLog("[ERR] Enter tags or prompt for Custom mode"); return; }
    }

    // ── OPTIMIZATIONS FOR CUSTOM MODE ──────────────────────────────────────
    // Custom mode doesn't need LLM Chain-of-Thought (we have reference audio)
    const isCustom = taskType === "custom";
    const isText2Music = taskType === "text2music";
    const effectiveThinking = isCustom ? false : thinking;
    const isAudio2Audio = taskType === "audio2audio";
    const effectiveUseCotMetas = isCustom ? false : useCotMetas;
    // CRITICAL: Disable CoT caption for text2music to respect user BPM/prompt
    const effectiveUseCotCaption = (isCustom || isText2Music) ? false : useCotCaption;
    const effectiveUseCotLanguage = isCustom ? false : useCotLanguage;

    // Custom mode: limit duration to 60s max (avoid timeout)
    const effectiveDuration = isCustom ? Math.min(duration, 60) : duration;

    // Auto-adjust steps based on selected model
    const modelInfo = TENSOR_MODELS.find(m => m.id === tensorModel);
    const modelSteps = modelInfo?.steps || inferSteps;
    const effectiveSteps = modelSteps;  // Use model-specific steps

    setProcessing(true);
    setProgress(5);
    setProgressLabel("Submitting to ACE-Step...");
    setResult(null);

    // Log generation parameters to console AND app logs
    const modelName = modelInfo?.name || 'Unknown';

    console.log(`[ACE-Step] === GENERATION START ===`);
    console.log(`[ACE-Step] Model: ${tensorModel} (${modelName})`);
    console.log(`[ACE-Step] Steps: ${effectiveSteps} | CFG: ${guidanceScale} | Duration: ${effectiveDuration}s`);
    console.log(`[ACE-Step] Task Type: ${taskType} | Prompt: "${prompt.slice(0, 50)}..."`);
    console.log(`[ACE-Step] Thinking (LLM): ${effectiveThinking}`);
    console.log(`[ACE-Step] use_cot_caption: ${effectiveUseCotCaption}`);
    console.log(`[ACE-Step] =========================`);

    // Also show in app Logs Panel
    addLog(`🎵 Model: ${modelName} (${effectiveSteps} steps)`);
    addLog(`🎛 CFG: ${guidanceScale} | Duration: ${effectiveDuration}s | Lang: ${vocalLanguage}`);
    if (isCustom) addLog(`🎨 Custom Mode: LLM disabled (using reference audio)`);
    if (isText2Music) addLog(`📝 Text-to-Music: CoT caption disabled (respecting BPM/prompt)`);
    if (bpm > 0) addLog(`🥁 BPM: ${bpm}`);
    if (keyScale) addLog(`🎹 Key: ${keyScale}`);

    addLog(`[OK] ACE-Step: generating ${effectiveDuration}s | "${prompt.slice(0, 50)}..."`);

    const fd = new FormData();
    fd.append("prompt", prompt);
    fd.append("lyrics", lyrics);
    fd.append("duration", effectiveDuration);  // Use optimized duration
    fd.append("guidance_scale", guidanceScale);
    fd.append("seed", seed);
    fd.append("infer_steps", effectiveSteps);  // Use optimized steps
    fd.append("dit_model", tensorModel);  // DiT model selection
    fd.append("vocal_language", vocalLanguage);  // Vocal language
    fd.append("instrumental", lyrics.trim() === "" || vocalLanguage === "unknown");

    // BPM: always send if set in main UI (but NOT for custom mode - use auto-detected)
    if (bpm && bpm > 0 && taskType !== "custom") {
      fd.append("bpm", bpm);
    }
    // Key scale: always send if set in main UI (but NOT for custom mode - use auto-detected)
    if (keyScale && keyScale.trim() && taskType !== "custom") {
      fd.append("key_scale", keyScale);
    }
    // Time signature (optional)
    fd.append("time_signature", "");

    // New params
    fd.append("task_type", taskType);
    if (negativePrompt) {
      fd.append("negative_prompt", negativePrompt);
    }
    if (taskType === "audio2audio" && sourceAudio) {
      fd.append("source_audio", sourceAudio);
      fd.append("source_audio_strength", sourceStrength);
    }
    // Custom mode (reference audio)
    if (taskType === "custom" && customReferenceAudio) {
      fd.append("mode", "custom");
      fd.append("source_audio", customReferenceAudio);  // Use source_audio (same as audio2audio)
      fd.append("ref_audio_strength", customRefStrength);
      if (customTags) {
        // tags param doesn't exist in ACE-Step API - merge into prompt
        const currentPrompt = fd.get("prompt") || "";
        fd.set("prompt", customTags + (currentPrompt ? ", " + currentPrompt : ""));
      }
      // Auto-detect BPM/Key from reference and send if available
      if (customBpm && customBpm > 0) {
        fd.append("bpm", customBpm);
      }
      if (customKey && customKey.trim()) {
        fd.append("key_scale", customKey);
      }
    }

    // Debug: Log FormData entries
    console.log("[FormData] Entries:");
    for (let [key, value] of fd.entries()) {
      console.log(`  ${key}: ${value instanceof File ? value.name : value}`);
    }

    // Advanced ACE-Step parameters
    fd.append("lm_model", "acestep-5Hz-lm-0.6B");
    fd.append("lm_backend", "pt");
    fd.append("lm_temperature", lmTemperature);
    fd.append("lm_cfg_scale", lmCfgScale);
    if (lmTopK > 0) {
      fd.append("lm_top_k", lmTopK);
    }
    if (lmTopP < 1.0) {
      fd.append("lm_top_p", lmTopP);
    }
    fd.append("lm_negative_prompt", "");
    fd.append("thinking", effectiveThinking);  // Disable LLM for custom mode
    fd.append("infer_method", inferMethod);
    if (tensorModel.includes("base") || tensorModel.includes("sft")) {
      fd.append("shift", shift);
    }
    fd.append("batch_size", batchSize);

    // Audio format
    fd.append("audio_format", audioFormat);

    // Tiled decode (always enabled by default for VRAM optimization)
    fd.append("use_tiled_decode", useTiledDecode);

    // Expert/advanced params (disable CoT for custom mode)
    fd.append("use_adg", false);
    fd.append("cfg_interval_start", 0.0);
    fd.append("cfg_interval_end", 1.0);
    fd.append("use_cot_caption", effectiveUseCotCaption);  // Disable for custom/text2music
    fd.append("use_cot_language", effectiveUseCotLanguage);  // Disable for custom/text2music
    fd.append("constrained_decoding", true);  // ACE-Step default
    fd.append("allow_lm_batch", true);
    fd.append("get_lrc", false);

    // Fake progress animation
    const progressSteps = [
      { pct: 15, label: "🎵 Loading ACE-Step model...", delay: 2000 },
      { pct: 30, label: "🎼 Encoding music prompt...", delay: 5000 },
      { pct: 50, label: "🎹 Generating melody (diffusion)...", delay: 10000 },
      { pct: 70, label: "🎤 Adding vocals from lyrics...", delay: 15000 },
      { pct: 85, label: "🎛 Finalizing audio...", delay: 20000 },
    ];
    const timers = progressSteps.map(s =>
      setTimeout(() => { setProgress(s.pct); setProgressLabel(s.label); }, s.delay)
    );

    try {
      const res = await fetch(`${API}/ace_generate`, { method: "POST", body: fd });
      timers.forEach(clearTimeout);

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const usedSeed = data.metadata?.seed ?? data.seed;
      const t = {
        id: Date.now(),
        filename: data.filename,
        url: `${API}${data.url}`,
        duration: data.duration_sec,
        created: new Date().toLocaleTimeString(),
        isAce: true,
        prompt: prompt.slice(0, 60),
        metadata: data.metadata || {},
        seed: usedSeed,
      };
      setTracks(prev => [t, ...prev]);
      setResult(t);
      setProgress(100);
      setProgressLabel("✅ Done!");
      addLog(`[OK] ACE-Step done: ${data.filename} (${data.duration_sec}s, ${data.processing_time_sec}s)`);

      // Auto-detect BPM/Key of generated track
      setResultBpm(null); setResultKey(null);
      try {
        const audioBlob = await fetch(`${API}${data.url}`).then(r => r.blob());
        const bkFd = new FormData();
        bkFd.append("file", audioBlob, data.filename);
        const bkRes = await fetch(`${API}/detect_bpm_key`, { method: "POST", body: bkFd });
        const bkData = await bkRes.json();
        if (bkData.bpm) { setResultBpm(bkData.bpm); setResultKey(bkData.key); addLog(`[OK] Detected: ${bkData.bpm} BPM · ${bkData.key}`); }
      } catch {}

    } catch (err) {
      timers.forEach(clearTimeout);
      addLog(`[ERR] ACE-Step failed: ${err.message}`);
      setProgress(0);
    } finally {
      setTimeout(() => { setProcessing(false); setProgress(0); setProgressLabel(""); }, 2000);
    }
  };

  const handleCleanTemp = async () => {
    if (!confirm("Clean all temporary output files?\n\nThis will delete:\n• D:\\VocalForge\\ace-step\\.cache\\acestep\\tmp\\api_audio\n• D:\\VocalForge\\backend\\output\n\nContinue?")) {
      return;
    }

    setCleaningTemp(true);
    setCleanResult(null);

    try {
      const res = await fetch(`${API}/clean_temp_files`);
      const data = await res.json();
      
      if (data.status === "ok") {
        setCleanResult(data);
        addLog(`🧹 Cleaned ${data.total_cleaned} temp files`);
        if (data.results) {
          data.results.forEach(r => {
            if (r.status === "cleaned") {
              addLog(`  ✓ ${r.folder}: ${r.files_removed} files (${r.size_freed_mb} MB)`);
            }
          });
        }
      } else {
        throw new Error(data.message || "Unknown error");
      }
    } catch (err) {
      addLog(`[ERR] Clean temp failed: ${err.message}`);
      setCleanResult({ status: "error", message: err.message });
    } finally {
      setCleaningTemp(false);
    }
  };

  return (
    <div style={{ maxWidth: 1600, margin: "0 auto" }}>
      {/* Preset Manager Modal */}
      <PresetManager
        open={showPresets}
        onClose={() => setShowPresets(false)}
        currentSettings={currentSettings}
        onLoad={handleLoadPreset}
      />

      {/* Lyrics Save Input Modal */}
      {showLyricsSaveInput && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setShowLyricsSaveInput(false)}>
          <div style={S.modal}>
            <div style={S.header}>
              <div>
                <div style={{ color: "#e0e0ff", fontSize: 16, fontWeight: 900 }}>💾 Save Lyrics</div>
                <div style={{ color: "#444466", fontSize: 11, marginTop: 2 }}>Save to your lyrics library</div>
              </div>
              <button onClick={() => setShowLyricsSaveInput(false)} style={{ background: "#e6394611", color: "#e63946", border: "1px solid #e6394633", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>✕</button>
            </div>

            <div style={{ padding: "20px" }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: "#6666aa", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>📝 Lyrics Name</div>
                <input
                  type="text"
                  value={lyricsSaveName}
                  onChange={e => setLyricsSaveName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveLyricsToLibrary()}
                  placeholder="e.g. Love Song, Party Anthem, etc."
                  autoFocus
                  style={{
                    width: "100%",
                    background: "#080812",
                    border: "1px solid #2a2a4a",
                    color: "#e0e0ff",
                    borderRadius: 8,
                    padding: "10px 12px",
                    fontSize: 13,
                    outline: "none",
                  }}
                  onFocus={e => e.target.style.borderColor = "#06d6a0"}
                  onBlur={e => e.target.style.borderColor = "#2a2a4a"}
                />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setShowLyricsSaveInput(false)} style={{ flex: 1, background: "#0a0a1a", color: "#6666aa", border: "1px solid #2a2a4a", borderRadius: 8, padding: "10px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button onClick={saveLyricsToLibrary} disabled={!lyricsSaveName.trim()} style={{ flex: 1, background: lyricsSaveName.trim() ? "#06d6a022" : "#1a1a2e", color: lyricsSaveName.trim() ? "#06d6a0" : "#444466", border: `1px solid ${lyricsSaveName.trim() ? "#06d6a044" : "#2a2a4a"}`, borderRadius: 8, padding: "10px", fontSize: 13, cursor: lyricsSaveName.trim() ? "pointer" : "not-allowed", fontWeight: 700 }}>💾 Save Lyrics</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lyrics Library Modal */}
      {showLyricsLibrary && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setShowLyricsLibrary(false)}>
          <div style={{...S.modal, maxHeight: "min(85vh, 600px)"}}>
            <div style={S.header}>
              <div>
                <div style={{ color: "#e0e0ff", fontSize: 16, fontWeight: 900 }}>📚 Lyrics Library</div>
                <div style={{ color: "#444466", fontSize: 11, marginTop: 2 }}>{lyricsLibrary.length} saved lyrics</div>
              </div>
              <button onClick={() => setShowLyricsLibrary(false)} style={{ background: "#e6394611", color: "#e63946", border: "1px solid #e6394633", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>✕</button>
            </div>

            <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
              {lyricsLibrary.length === 0 ? (
                <div style={{ textAlign: "center", color: "#444466", fontSize: 13, padding: "40px 20px" }}>
                  📭 No saved lyrics yet
                  <div style={{ fontSize: 11, marginTop: 4, color: "#6666aa" }}>Click "💾 Save" to add lyrics to your library</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {lyricsLibrary.map(entry => (
                    <div key={entry.id} style={{
                      background: "#0a0a1a",
                      border: "1px solid #2a2a4a",
                      borderRadius: 8,
                      padding: "12px",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ color: "#ffd166", fontSize: 13, fontWeight: 700 }}>💾 {entry.name}</div>
                        <div style={{ color: "#444466", fontSize: 10 }}>{entry.createdAt}</div>
                      </div>
                      <div style={{ color: "#6666aa", fontSize: 11, fontFamily: "monospace", marginBottom: 8, maxHeight: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "pre-wrap" }}>
                        {entry.lyrics.slice(0, 150)}{entry.lyrics.length > 150 ? "..." : ""}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => loadLyricsFromLibrary(entry)} style={{ flex: 1, background: "#06d6a022", color: "#06d6a0", border: "1px solid #06d6a044", borderRadius: 6, padding: "6px", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>▶ Load</button>
                        <button onClick={() => downloadLyrics(entry)} style={{ background: "#ffd16622", color: "#ffd166", border: "1px solid #ffd16644", borderRadius: 6, padding: "6px 10px", fontSize: 11, cursor: "pointer" }}>📥</button>
                        <button onClick={() => deleteLyricsFromLibrary(entry.id)} style={{ background: "#e6394622", color: "#e63946", border: "1px solid #e6394644", borderRadius: 6, padding: "6px 10px", fontSize: 11, cursor: "pointer" }}>🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status bar */}
      <div style={{ marginBottom: 16 }}>
        {/* Status badge */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, alignItems: "center" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: aceOnline === true ? "#06d6a011" : aceOnline === false ? "#e6394611" : "#ffd16611",
            border: `1px solid ${aceOnline === true ? "#06d6a044" : aceOnline === false ? "#e6394644" : "#ffd16644"}`,
            borderRadius: 20, padding: "4px 12px", fontSize: 12,
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: aceOnline === true ? "#06d6a0" : aceOnline === false ? "#e63946" : "#ffd166",
              animation: aceOnline === null ? "pulse 1s infinite" : "none",
            }} />
            <span style={{ color: aceOnline === true ? "#06d6a0" : aceOnline === false ? "#e63946" : "#ffd166", fontWeight: 600 }}>
              {aceOnline === null ? "Checking..." : aceOnline ? "ACE-Step Online" : "ACE-Step Offline"}
            </span>
          </div>
          <button onClick={checkHealth} style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", color: "#6666aa", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>↻ Refresh</button>
          <button
            onClick={() => setShowPresets(true)}
            style={{
              background: "#ffd16622", border: "1px solid #ffd16644",
              color: "#ffd166", borderRadius: 6, padding: "4px 12px",
              fontSize: 11, cursor: "pointer", fontWeight: 700,
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            💾 Presets
          </button>
        </div>
      </div>

      {/* Offline warning */}
      {aceOnline === false && (
        <div style={{ ...S.card, background: "#e6394611", border: "1px solid #e6394644", marginBottom: 16 }}>
          <div style={{ color: "#e63946", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>⚠ ACE-Step API Server is Offline</div>
          <div style={{ color: "#8888aa", fontSize: 12, lineHeight: 1.8 }}>
            <div>1. Open a new terminal window</div>
            <div>2. Run: <code style={{ color: "#ffd166", background: "#1a1a2e", padding: "2px 6px", borderRadius: 4 }}>d:\VocalForge\start_acestep.bat</code></div>
            <div>3. Wait for models to download (~10GB first time)</div>
            <div>4. Click ↻ Refresh above when ready</div>
          </div>
          <div style={{ marginTop: 10, color: "#444466", fontSize: 11 }}>
            💡 With 8GB VRAM: uses <strong style={{ color: "#ffd166" }}>acestep-5Hz-lm-0.6B</strong> model automatically
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>

        {/* LEFT COLUMN */}
        <div>

          {/* ── Task Type: text2music vs audio2audio vs custom ── */}
          <div style={S.card}>
            <span style={S.label}>🎯 Task Type</span>
            <div style={{ display: "flex", gap: 8, marginBottom: (taskType === "audio2audio" || taskType === "custom") ? 12 : 0 }}>
              {[
                { id: "text2music", icon: "✍️", label: "Text → Music" },
                { id: "audio2audio", icon: "🎵", label: "Audio Cover" },
                { id: "custom", icon: "🎨", label: "Custom" },
              ].map(t => (
                <button key={t.id} onClick={() => {
                  setTaskType(t.id);
                }} style={{
                  flex: 1, padding: "10px 8px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                  background: taskType === t.id ? "#7209b722" : "#0a0a1a",
                  border: `1px solid ${taskType === t.id ? "#9b2de0" : "#2a2a4a"}`,
                  color: taskType === t.id ? "#c77dff" : "#444466", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                  <span>{t.icon}</span><span>{t.label}</span>
                </button>
              ))}
            </div>


            {/* Audio source upload (only for audio2audio) */}
            {taskType === "audio2audio" && (
              <div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{
                    display: "block", border: "2px dashed #2a2a4a", borderRadius: 8,
                    padding: "16px", textAlign: "center", cursor: "pointer",
                    background: sourceAudio ? "#7209b711" : "#080812",
                    borderColor: sourceAudio ? "#9b2de0" : "#2a2a4a",
                  }}>
                    <input type="file" accept="audio/*" style={{ display: "none" }}
                    onChange={async e => {
                        const f = e.target.files[0];
                        if (f) {
                          setSourceAudio(f);
                          setSourceAudioUrl(URL.createObjectURL(f));
                          setSourceBpm(null);
                          setSourceKey(null);
                          // Auto-detect BPM/Key
                          setDetectingSource(true);
                          try {
                            const bkFd = new FormData();
                            bkFd.append("file", f, f.name);
                            const bkRes = await fetch(`${API}/detect_bpm_key`, { method: "POST", body: bkFd });
                            const bkData = await bkRes.json();
                            if (bkData.bpm) { setSourceBpm(bkData.bpm); setSourceKey(bkData.key); }
                          } catch {}
                          setDetectingSource(false);
                        }
                      }} />
                    {sourceAudio ? (
                      <div>
                        <div style={{ color: "#c77dff", fontSize: 13, fontWeight: 700 }}>🎵 {sourceAudio.name}</div>
                        <div style={{ color: "#444466", fontSize: 11 }}>{(sourceAudio.size / 1024 / 1024).toFixed(1)} MB</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>🎵</div>
                        <div style={{ color: "#6666aa", fontSize: 12 }}>Drop source audio here or click to browse</div>
                        <div style={{ color: "#333355", fontSize: 11, marginTop: 4 }}>WAV, MP3, FLAC supported</div>
                      </div>
                    )}
                  </label>
                </div>
                {sourceAudioUrl && (
                  <div style={{ marginBottom: 8 }}>
                    <audio controls src={sourceAudioUrl} style={{ width: "100%", marginBottom: 6 }} />
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      {detectingSource && (
                        <span style={{ color: "#444466", fontSize: 11, fontFamily: "monospace" }}>⏳ Detecting BPM & Key...</span>
                      )}
                      {sourceBpm && (
                        <span style={{ background: "#c77dff22", color: "#c77dff", border: "1px solid #c77dff44", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontFamily: "monospace" }}>♩ {sourceBpm} BPM</span>
                      )}
                      {sourceKey && (
                        <span style={{ background: "#c77dff22", color: "#c77dff", border: "1px solid #c77dff44", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontFamily: "monospace" }}>🎵 {sourceKey}</span>
                      )}
                      {sourceBpm && (
                        <button
                          onClick={() => { setBpm(sourceBpm); setKeyScale(sourceKey || ""); }}
                          style={{ background: "#9b2de022", color: "#c77dff", border: "1px solid #9b2de044", borderRadius: 6, padding: "3px 10px", fontSize: 11, cursor: "pointer", fontWeight: 700 }}
                          title="Copy BPM and Key to generation settings"
                        >
                          ↗ Copy to settings
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {/* Source strength slider */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#8888aa", fontSize: 12 }}>💪 Source Audio Strength</span>
                    <span style={{ color: "#c77dff", fontSize: 12, fontFamily: "monospace", fontWeight: 700 }}>{sourceStrength.toFixed(2)}</span>
                  </div>
                  <input type="range" min={0} max={1} step={0.05} value={sourceStrength}
                    onChange={e => setSourceStrength(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#9b2de0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                    <span style={{ color: "#333355", fontSize: 10 }}>0 = ignore source</span>
                    <span style={{ color: "#333355", fontSize: 10 }}>1 = copy source</span>
                  </div>
                  <div style={{ color: "#444466", fontSize: 11, marginTop: 4 }}>
                    💡 0.5 = balanced cover · 0.8 = close to original · 0.3 = creative reinterpretation
                  </div>
                </div>
              </div>
            )}

            {/* Custom Mode UI (reference audio) */}
            {taskType === "custom" && (
              <div>
                {/* Reference audio upload */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{
                    display: "block", border: "2px dashed #2a2a4a", borderRadius: 8,
                    padding: "16px", textAlign: "center", cursor: "pointer",
                    background: customReferenceAudio ? "#7209b711" : "#080812",
                    borderColor: customReferenceAudio ? "#9b2de0" : "#2a2a4a",
                  }}>
                    <input type="file" accept="audio/*" style={{ display: "none" }}
                      onChange={async e => {
                        const f = e.target.files[0];
                        if (f) {
                          setCustomReferenceAudio(f);
                          setCustomReferenceUrl(URL.createObjectURL(f));
                          setCustomBpm(null);
                          setCustomKey(null);
                          setDetectingCustom(true);
                          try {
                            const bkFd = new FormData();
                            bkFd.append("file", f, f.name);
                            const bkRes = await fetch(`${API}/detect_bpm_key`, { method: "POST", body: bkFd });
                            const bkData = await bkRes.json();
                            if (bkData.bpm) { setCustomBpm(bkData.bpm); setCustomKey(bkData.key); }
                          } catch {}
                          setDetectingCustom(false);
                        }
                      }} />
                    {customReferenceAudio ? (
                      <div>
                        <div style={{ color: "#c77dff", fontSize: 13, fontWeight: 700 }}>🎨 {customReferenceAudio.name}</div>
                        <div style={{ color: "#444466", fontSize: 11 }}>{(customReferenceAudio.size / 1024 / 1024).toFixed(1)} MB</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>🎨</div>
                        <div style={{ color: "#6666aa", fontSize: 12 }}>Drop reference audio here or click to browse</div>
                        <div style={{ color: "#333355", fontSize: 11, marginTop: 4 }}>WAV, MP3, FLAC supported</div>
                      </div>
                    )}
                  </label>
                </div>

                {customReferenceUrl && (
                  <div style={{ marginBottom: 12 }}>
                    <audio controls src={customReferenceUrl} style={{ width: "100%", marginBottom: 6 }} />
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      {detectingCustom && (
                        <span style={{ color: "#444466", fontSize: 11, fontFamily: "monospace" }}>⏳ Detecting BPM & Key...</span>
                      )}
                      {customBpm && (
                        <span style={{ background: "#c77dff22", color: "#c77dff", border: "1px solid #c77dff44", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontFamily: "monospace" }}>♩ {customBpm} BPM</span>
                      )}
                      {customKey && (
                        <span style={{ background: "#c77dff22", color: "#c77dff", border: "1px solid #c77dff44", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontFamily: "monospace" }}>🎵 {customKey}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Tags input */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ color: "#8888aa", fontSize: 12, display: "block", marginBottom: 4 }}>🏷️ Genre/Style Tags</label>
                  <input type="text" value={customTags} onChange={e => setCustomTags(e.target.value)}
                    placeholder="e.g., hip-hop, trap, 140bpm, minor key, aggressive"
                    style={{
                      width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #2a2a4a",
                      background: "#0a0a1a", color: "#e0e0e0", fontSize: 13,
                    }} />
                </div>

                {/* Reference strength slider */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#8888aa", fontSize: 12 }}>💪 Reference Audio Strength</span>
                    <span style={{ color: "#c77dff", fontSize: 12, fontFamily: "monospace", fontWeight: 700 }}>{customRefStrength.toFixed(2)}</span>
                  </div>
                  <input type="range" min={0} max={1} step={0.05} value={customRefStrength}
                    onChange={e => setCustomRefStrength(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#9b2de0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                    <span style={{ color: "#333355", fontSize: 10 }}>0 = ignore reference</span>
                    <span style={{ color: "#333355", fontSize: 10 }}>1 = strict adherence</span>
                  </div>
                  <div style={{ color: "#444466", fontSize: 11, marginTop: 4 }}>
                    💡 0.7 = balanced (recommended) · 0.5 = creative freedom · 0.9 = strict structure match
                  </div>
                </div>

                {/* Info box */}
                <div style={{
                  background: "#7209b711", border: "1px solid #9b2de044", borderRadius: 8,
                  padding: "12px", marginBottom: 8,
                }}>
                  <div style={{ color: "#c77dff", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>🎨 How Custom Mode Works:</div>
                  <div style={{ color: "#8888aa", fontSize: 11, lineHeight: 1.5 }}>
                    1. Upload a reference audio (demo, sketch, or any track)<br/>
                    2. ACE-Step extracts rhythm, tempo, and structure<br/>
                    3. Enter tags/prompt for the NEW music style you want<br/>
                    4. Generate a completely NEW track following the reference's feel
                  </div>
                </div>

                {/* Difference from Audio Cover */}
                <div style={{
                  background: "#06d6a011", border: "1px solid #06d6a044", borderRadius: 8,
                  padding: "12px", marginBottom: 8,
                }}>
                  <div style={{ color: "#06d6a0", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>🆚 Custom vs Audio Cover:</div>
                  <div style={{ color: "#8888aa", fontSize: 11, lineHeight: 1.5 }}>
                    <strong>Custom:</strong> NEW composition with reference's rhythm/structure<br/>
                    <strong>Audio Cover:</strong> SAME song transformed to different style
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 🎯 Prompt Helper */}
          <div style={{ marginBottom: 14, padding: "10px 0", borderTop: "1px solid #2a2a4a" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ color: "#06d6a0", fontSize: 11, fontWeight: 700 }}>🎯 Prompt Helper</span>
              <span style={{ color: "#6666aa", fontSize: 10 }}>Click to inject tags</span>
            </div>

            {/* Exemplu de utilizare */}
            <div style={{ marginBottom: 10, padding: "8px", background: "#0a0a1a", borderRadius: 6, border: "1px solid #1a1a2e" }}>
              <div style={{ color: "#ffd166", fontSize: 8, fontWeight: 700, marginBottom: 4 }}>💡 Exemplu:</div>
              <div style={{ color: "#6666aa", fontSize: 7, lineHeight: 1.5 }}>
                <span style={{ color: "#8888aa" }}>Vrei o piesă Dark Minimal Afro cu voce de tip „Whisper" și „Grand Reverb"?</span><br/>
                <span style={{ color: "#555577" }}>Comanda ta: </span>
                <span style={{ color: "#06d6a0", fontFamily: "monospace" }}>Titlu: Umbre, Female, Studio Clean, Superb Vocals, Dark Minimal Afro, Breath/Intimate, Grand-Reverb</span>
              </div>
            </div>

            {/* 3-column layout: Categorie > Tag-uri > Descriere */}
            <div style={{ display: "grid", gridTemplateColumns: "100px 180px 1fr", gap: 6, alignItems: "start" }}>
              {/* Header row */}
              <div style={{ color: "#8888aa", fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px" }}>Categorie</div>
              <div style={{ color: "#8888aa", fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px" }}>Tag-uri</div>
              <div style={{ color: "#8888aa", fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px" }}>Efect Audio</div>

              {/* Data rows */}
              {PROMPT_INJECTS.map((item, idx) => (
                <React.Fragment key={idx}>
                  <div style={{ color: "#6666aa", fontSize: 8, paddingTop: 2 }}>{item.category}</div>
                  <button
                    onClick={() => injectPrompt(item.tags)}
                    title={item.tags}
                    style={{
                      background: "#0a0a1a", border: "1px solid #2a2a4a", borderRadius: 3,
                      color: "#06d6a0", padding: "3px 6px", fontSize: 8, fontWeight: 600,
                      cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap", textAlign: "left",
                    }}
                    onMouseEnter={e => { e.target.style.borderColor = "#06d6a0"; e.target.style.background = "#06d6a011"; }}
                    onMouseLeave={e => { e.target.style.borderColor = "#2a2a4a"; e.target.style.color = "#e0e0ff"; e.target.style.background = "#0a0a1a"; }}
                  >
                    {item.label}
                  </button>
                  <div style={{ color: "#555577", fontSize: 7, lineHeight: 1.4, fontStyle: "italic" }}>{item.desc}</div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Music Prompt */}
          <div style={S.card}>
            <span style={S.label}>🎼 Music Style / Prompt</span>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={"Describe the music you want...\n\nExamples:\n• pop music, upbeat, catchy chorus, modern production\n• hip hop trap beat, 808 bass, dark atmosphere\n• romantic Romanian ballad, piano, emotional"}
              style={{
                width: "100%", minHeight: 100, background: "#080812",
                border: "1px solid #2a2a4a", borderRadius: 8,
                color: "#e0e0ff", fontSize: 13, fontFamily: "monospace",
                padding: "12px", resize: "vertical", outline: "none", lineHeight: 1.6,
                boxSizing: "border-box",
              }}
              onFocus={e => e.target.style.borderColor = "#ffd166"}
              onBlur={e => e.target.style.borderColor = "#2a2a4a"}
            />

            {/* Presets după gen (complet): JSON (BPM+caption+negative) + Hip-Hop, Românesc, House, Dembow */}
            <div style={{ marginTop: 14, padding: "10px 0", borderTop: "1px solid #2a2a4a" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ color: "#9b2de0", fontSize: 11, fontWeight: 700 }}>
                  🎚 Genres and Subgenres
                </span>
                <button
                  type="button"
                  onClick={loadGenrePresets}
                  disabled={genrePresetsLoading}
                  style={{
                    background: "#9b2de022", border: "1px solid #9b2de044", color: "#c77dff",
                    borderRadius: 6, padding: "2px 8px", fontSize: 10, cursor: genrePresetsLoading ? "wait" : "pointer", fontWeight: 600,
                  }}
                >
                  {genrePresetsLoading ? "Loading..." : "↻ Reload"}
                </button>
              </div>
              {genrePresetsLoading && genrePresetsData === null && (
                <div style={{ color: "#6666aa", fontSize: 11 }}>Loading genre presets...</div>
              )}
              {(() => {
                const EXCLUDED_GENRE_KEYS = ["EDM", "Hip Hop", "Hip-Hop", "Pop", "Classical", "Afrobeat", "Instrumental", "Other"];
const apiGenres = genrePresetsData?.genres || {};
const filteredApiGenres = Object.fromEntries(
  Object.entries(apiGenres).filter(([k]) => !EXCLUDED_GENRE_KEYS.includes(k))
);
const allGenres = { ...filteredApiGenres, ...QUICK_GENRES };
                const genreKeys = Object.keys(allGenres).filter(gKey => {
                  const g = allGenres[gKey];
                  const subgenres = g?.subgenres ? Object.keys(g.subgenres) : [];
                  return subgenres.length > 0;  // Only show genres with subgenres
                });
                const currentGenre = genreKeys.length && (genreKeys.includes(genreCatFull) ? genreCatFull : genreKeys[0]);
                if (genreKeys.length === 0) return null;
                return (
                  <>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                      {genreKeys.map((gKey) => {
                        const g = allGenres[gKey];
                        const subgenres = g?.subgenres ? Object.keys(g.subgenres) : [];
                        const active = currentGenre === gKey;
                        const isRapid = Object.prototype.hasOwnProperty.call(QUICK_GENRES, gKey);
                        return (
                          <button
                            key={gKey}
                            onClick={() => setGenreCatFull(gKey)}
                            style={{
                              background: active ? "#9b2de022" : "#0a0a1a",
                              border: `1px solid ${active ? "#9b2de0" : "#2a2a4a"}`,
                              color: active ? "#c77dff" : "#444466",
                              borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700,
                              cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                            }}
                            title={isRapid ? "Full preset (caption + default negative per category)" : "Preset from JSON (BPM + caption + negative)"}
                          >
                            {gKey}
                            <span style={{
                              background: active ? "#9b2de033" : "#1a1a2e",
                              color: active ? "#c77dff" : "#333355",
                              borderRadius: 10, padding: "1px 5px", fontSize: 10, fontWeight: 800,
                            }}>{subgenres.length}</span>
                          </button>
                        );
                      })}
                    </div>
                    
                    {/* Category Info Card - Compact */}
                    {(() => {
                      const meta = getCategoryMeta(currentGenre);
                      return (
                        <div style={{
                          marginTop: 12,
                          padding: "8px 12px",
                          background: `${meta.color}22`,
                          border: `1px solid ${meta.color}44`,
                          borderRadius: 6,
                          marginBottom: 12,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}>
                          <span style={{ fontSize: 20 }}>{meta.icon}</span>
                          <div>
                            <div style={{ color: meta.color, fontSize: 13, fontWeight: 700 }}>
                              {currentGenre}
                            </div>
                            <div style={{ color: "#6666aa", fontSize: 11 }}>
                              {meta.description}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, maxHeight: 160, overflowY: "auto", paddingRight: 2 }}>
                      {Object.entries(allGenres[currentGenre]?.subgenres || {}).map(([subName, preset]) => {
                        const key = `${currentGenre}|${subName}`;
                        const isSelected = selectedGenreSubgenre === key;
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              applyGenrePreset(preset);
                              setSelectedGenreSubgenre(key);
                            }}
                            style={{
                              background: isSelected ? "#9b2de022" : "#0a0a1a",
                              border: `1px solid ${isSelected ? "#9b2de0" : "#2a2a4a"}`,
                              color: isSelected ? "#c77dff" : "#6666aa",
                              borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                            title={preset.caption ? String(preset.caption).slice(0, 120) + "…" : subName}
                          >
                            {subName}
                            {preset.bpm > 0 && <span style={{ marginLeft: 4, opacity: 0.8 }}>♩{preset.bpm}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>

          </div>

          {/* Lyrics */}
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={S.label}>📝 Lyrics (Optional)</span>
              <span style={{ color: "#333355", fontSize: 10, fontFamily: "monospace" }}>{wordCount} words</span>
            </div>
            
            {/* Vocal Language Selector */}
            <div style={{ marginBottom: 10 }}>
              <span style={{ color: "#6666aa", fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6, display: "block" }}>
                🌐 Vocal Language
              </span>
              <select
                value={vocalLanguage}
                onChange={e => setVocalLanguage(e.target.value)}
                style={{
                  width: "100%",
                  background: "#080812",
                  border: "1px solid #2a2a4a",
                  color: "#e0e0ff",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 13,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  outline: "none",
                }}
                onFocus={e => e.target.style.borderColor = "#00e5ff"}
                onBlur={e => e.target.style.borderColor = "#2a2a4a"}
              >
                {VOCAL_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} {lang.native !== lang.name ? `(${lang.native})` : ""}
                  </option>
                ))}
              </select>
              <div style={{ color: "#444466", fontSize: 10, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <span>💡</span>
                <span>
                  {vocalLanguage === "unknown" 
                    ? "Instrumental or auto-detect language from lyrics" 
                    : (() => {
                        const selectedLang = VOCAL_LANGUAGES.find(l => l.code === vocalLanguage);
                        return `Vocals will be generated in ${selectedLang?.name || vocalLanguage}`;
                      })()}
                </span>
              </div>
            </div>

            <textarea
              value={lyrics}
              onChange={e => setLyrics(e.target.value)}
              placeholder={"Leave empty for instrumental, or add lyrics:\n\n[verse]\nYour lyrics here...\n\n[chorus]\nChorus lyrics..."}
              style={{
                width: "100%", minHeight: 140, background: "#080812",
                border: "1px solid #2a2a4a", borderRadius: 8,
                color: "#e0e0ff", fontSize: 13, fontFamily: "monospace",
                padding: "12px", resize: "vertical", outline: "none", lineHeight: 1.7,
                boxSizing: "border-box",
              }}
              onFocus={e => e.target.style.borderColor = "#00e5ff"}
              onBlur={e => e.target.style.borderColor = "#2a2a4a"}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <button onClick={() => setLyrics("")} style={{ background: "#e6394611", color: "#e63946", border: "1px solid #e6394633", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>🗑 Clear</button>
              <button onClick={() => setLyrics("[verse]\n\n[chorus]\n\n[verse]\n\n[chorus]\n\n[bridge]\n\n[chorus]")} style={{ background: "#7209b711", color: "#9b2de0", border: "1px solid #7209b733", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>📋 Template</button>
              <button onClick={() => setShowLyricsSaveInput(true)} style={{ background: "#06d6a011", color: "#06d6a0", border: "1px solid #06d6a033", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>💾 Save Lyrics</button>
              <button onClick={() => setShowLyricsLibrary(true)} style={{ background: "#ffd16611", color: "#ffd166", border: "1px solid #ffd16633", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>📂 Lyrics Library ({lyricsLibrary.length})</button>
            </div>
          </div>

        </div>

        {/* CENTER */}
        <div>

          {/* Lyrics */}
          <div style={S.card}>
            <span style={S.label}>📝 Lyrics (Optional)</span>

            {/* Duration */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ color: "#8888aa", fontSize: 12 }}>⏱ Duration</span>
                <span style={{ color: "#ffd166", fontSize: 13, fontFamily: "monospace", fontWeight: 700 }}>{duration}s ({Math.floor(duration/60)}:{String(duration%60).padStart(2,'0')})</span>
              </div>
              
              {/* Slider + Input pentru Duration */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <input 
                  type="range" 
                  className="duration-slider"
                  min="15" 
                  max="240" 
                  value={duration} 
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setDuration(val);
                  }}
                  style={{ 
                    flex: 1, 
                  }} 
                />
                <input 
                  type="number" 
                  min="15" 
                  max="240" 
                  value={duration} 
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val >= 15 && val <= 240) {
                      setDuration(val);
                    }
                  }}
                  style={{ 
                    width: 60, 
                    background: "#080812", 
                    border: "1px solid #2a2a4a", 
                    color: "#e0e0ff", 
                    borderRadius: 6, 
                    padding: "4px 8px", 
                    fontSize: 12,
                    fontFamily: "monospace",
                    textAlign: "center"
                  }} 
                />
              </div>
              
              {/* Quick preset buttons */}
              <div style={{ display: "flex", gap: 5 }}>
                {[15, 30, 60, 120, 180, 240].map(d => (
                  <button key={d} onClick={() => setDuration(d)} style={{
                    flex: 1, padding: "7px 2px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                    background: duration === d ? "#ffd16622" : "#0a0a1a",
                    border: `1px solid ${duration === d ? "#ffd166" : "#2a2a4a"}`,
                    color: duration === d ? "#ffd166" : "#444466", cursor: "pointer",
                  }}>{d < 60 ? `${d}s` : `${d/60}m`}</button>
                ))}
              </div>
            </div>

            {/* Guidance Scale */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ color: "#8888aa", fontSize: 12 }}>🎯 Guidance Scale (CFG)</span>
                <span style={{ color: "#00e5ff", fontSize: 13, fontFamily: "monospace", fontWeight: 700 }}>{guidanceScale.toFixed(1)}</span>
              </div>
              {/* Slider + Input pentru Guidance Scale */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <input
                  type="range"
                  className="guidance-slider"
                  min="1"
                  max="25"
                  step="0.5"
                  value={guidanceScale}
                  onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  min="1"
                  max="25"
                  step="0.5"
                  value={guidanceScale}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= 1 && val <= 25) {
                      setGuidanceScale(val);
                    }
                  }}
                  style={{
                    width: 60,
                    background: "#080812",
                    border: "1px solid #2a2a4a",
                    color: "#e0e0ff",
                    borderRadius: 6,
                    padding: "4px 8px",
                    fontSize: 12,
                    fontFamily: "monospace",
                    textAlign: "center"
                  }}
                />
              </div>
              {/* Quick preset buttons */}
              <div style={{ display: "flex", gap: 5 }}>
                {[3, 5, 7, 9, 12, 15, 20, 25].map(v => (
                  <button key={v} onClick={() => setGuidanceScale(v)} style={{
                    flex: 1, padding: "7px 2px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                    background: guidanceScale === v ? "#00e5ff22" : "#0a0a1a",
                    border: `1px solid ${guidanceScale === v ? "#00e5ff" : "#2a2a4a"}`,
                    color: guidanceScale === v ? "#00e5ff" : "#444466", cursor: "pointer",
                  }}>{v}</button>
                ))}
              </div>
            </div>

            {/* Infer Steps */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ color: "#8888aa", fontSize: 12 }}>🔢 Diffusion Steps</span>
                <span style={{ color: "#06d6a0", fontSize: 13, fontFamily: "monospace", fontWeight: 700 }}>
                  {inferSteps}
                  {inferSteps <= 12 && <span style={{ color: "#ffd166", fontSize: 10, marginLeft: 6 }}>⚡ Turbo</span>}
                  {inferSteps >= 40 && <span style={{ color: "#9b2de0", fontSize: 10, marginLeft: 6 }}>🎯 Quality</span>}
                </span>
              </div>
              {/* Slider + Input pentru Infer Steps */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <input 
                  type="range" 
                  className="steps-slider"
                  min="4" 
                  max="50" 
                  step="1"
                  value={inferSteps} 
                  onChange={(e) => setInferSteps(parseInt(e.target.value, 10))}
                  style={{ flex: 1 }} 
                />
                <input 
                  type="number" 
                  min="4" 
                  max="50" 
                  step="1"
                  value={inferSteps} 
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 4 && val <= 50) {
                      setInferSteps(val);
                    }
                  }}
                  style={{ 
                    width: 60, 
                    background: "#080812", 
                    border: "1px solid #2a2a4a", 
                    color: "#e0e0ff", 
                    borderRadius: 6, 
                    padding: "4px 8px", 
                    fontSize: 12,
                    fontFamily: "monospace",
                    textAlign: "center"
                  }} 
                />
              </div>
              {/* Quick preset buttons */}
              <div style={{ display: "flex", gap: 4 }}>
                {[
                  { v: 8,  label: "8 ⚡", tip: "Turbo" },
                  { v: 12, label: "12 🚀", tip: "Fast" },
                  { v: 20, label: "20 ✅", tip: "Balanced" },
                  { v: 32, label: "32 🎨", tip: "High Quality" },
                  { v: 40, label: "40 🎯", tip: "Quality" },
                ].map(s => (
                  <button key={s.v} onClick={() => setInferSteps(s.v)} title={s.tip} style={{
                    flex: 1, padding: "7px 2px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                    background: inferSteps === s.v ? "#06d6a022" : "#0a0a1a",
                    border: `1px solid ${inferSteps === s.v ? "#06d6a0" : "#2a2a4a"}`,
                    color: inferSteps === s.v ? "#06d6a0" : "#444466", cursor: "pointer",
                  }}>{s.label}</button>
                ))}
              </div>
            </div>

            {/* BPM + Key */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ color: "#8888aa", fontSize: 12 }}>♩ BPM</span>
                    <span style={{ color: "#ffd166", fontSize: 12, fontFamily: "monospace", fontWeight: 700 }}>{bpm === 0 ? "Auto" : bpm}</span>
                  </div>
                  
                  {/* Slider + Input pentru BPM manual */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <input 
                      type="range" 
                      className="bpm-slider"
                      min="0" 
                      max="200" 
                      value={bpm === 0 ? 0 : bpm} 
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setBpm(val);
                      }}
                      style={{ 
                        flex: 1, 
                      }} 
                    />
                    <input 
                      type="number" 
                      min="0" 
                      max="200" 
                      value={bpm === 0 ? "" : bpm} 
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val >= 0 && val <= 200) {
                          setBpm(val);
                        } else if (e.target.value === "") {
                          setBpm(0); // Auto
                        }
                      }}
                      onFocus={(e) => {
                        if (bpm === 0) {
                          setBpm(120); // Setează 120 când focus pe input
                          e.target.value = 120;
                        }
                      }}
                      placeholder="Auto"
                      style={{ 
                        width: 60, 
                        background: "#080812", 
                        border: "1px solid #2a2a4a", 
                        color: "#e0e0ff", 
                        borderRadius: 6, 
                        padding: "4px 8px", 
                        fontSize: 12,
                        fontFamily: "monospace",
                        textAlign: "center"
                      }} 
                    />
                  </div>
                  
                  {/* Quick preset buttons */}
                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    <button onClick={() => setBpm(0)} style={{
                      padding: "5px 10px", borderRadius: 5, fontSize: 10, fontWeight: 700,
                      background: bpm === 0 ? "#ffd16622" : "#0a0a1a",
                      border: `1px solid ${bpm === 0 ? "#ffd166" : "#2a2a4a"}`,
                      color: bpm === 0 ? "#ffd166" : "#444466", cursor: "pointer",
                    }}>Auto</button>
                    {[80, 90, 100, 120, 140, 160].map(b => (
                      <button key={b} onClick={() => setBpm(b)} style={{
                        padding: "5px 7px", borderRadius: 5, fontSize: 10, fontWeight: 700,
                        background: bpm === b ? "#ffd16622" : "#0a0a1a",
                        border: `1px solid ${bpm === b ? "#ffd166" : "#2a2a4a"}`,
                        color: bpm === b ? "#ffd166" : "#444466", cursor: "pointer",
                      }}>{b}</button>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ color: "#8888aa", fontSize: 12 }}>🎵 Key</span>
                  </div>
                  <select value={keyScale} onChange={e => setKeyScale(e.target.value)}
                    style={{ width: "100%", background: "#080812", border: "1px solid #2a2a4a", color: keyScale ? "#e0e0ff" : "#444466", borderRadius: 6, padding: "6px 8px", fontSize: 12 }}>
                    <option value="">Auto</option>
                    {["C major","C# major","D major","D# major","E major","F major","F# major","G major","G# major","A major","A# major","B major",
                      "C minor","C# minor","D minor","D# minor","E minor","F minor","F# minor","G minor","G# minor","A minor","A# minor","B minor"
                    ].map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Seed + Librărie */}
            <div>
              <span style={{ color: "#6666aa", fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6, display: "block" }}>🎲 Seed</span>
              <div style={{ display: "flex", gap: 6, alignItems: "stretch", flexWrap: "wrap" }}>
                <input type="number" value={seed} onChange={e => setSeed(Number(e.target.value))}
                  style={{ flex: "1 1 80px", minWidth: 0, background: "#080812", border: "1px solid #2a2a4a", color: "#e0e0ff", borderRadius: 8, padding: "8px 12px", fontSize: 12 }} />
                <button onClick={() => setSeed(-1)} style={{ background: "#0a0a1a", color: "#8888aa", border: "1px solid #2a2a4a", borderRadius: 8, padding: "8px 12px", fontSize: 11, cursor: "pointer", fontWeight: 600 }} title="Random seed">🎲 Random</button>
                <button onClick={() => setSeed(Math.floor(Math.random() * 999999))} style={{ background: "#0a0a1a", color: "#6666aa", border: "1px solid #2a2a4a", borderRadius: 8, padding: "8px 10px", fontSize: 11, cursor: "pointer" }} title="Random numeric">🔀</button>
                <button onClick={() => setShowSeedLib(v => !v)} style={{
                  background: showSeedLib ? "rgba(123,31,162,0.2)" : "#0a0a1a",
                  color: showSeedLib ? "#c77dff" : "#6666aa",
                  border: `1px solid ${showSeedLib ? "#9b2de044" : "#2a2a4a"}`,
                  borderRadius: 8, padding: "8px 12px", fontSize: 11, cursor: "pointer", fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 6,
                }} title="Saved seeds">
                  <span style={{ opacity: 0.9 }}>📚</span>
                  <span>Library</span>
                  {seedLibrary.length > 0 && (
                    <span style={{ background: "#9b2de033", color: "#c77dff", borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>{seedLibrary.length}</span>
                  )}
                </button>
              </div>

              {/* Save current seed — compact, only when seed is set */}
              {seed !== -1 && (
                <div style={{ marginTop: 8 }}>
                  {!seedSaveInput ? (
                    <button onClick={() => { setSeedSaveName(""); setSeedSaveInput(true); }}
                      style={{ width: "100%", background: "#1a1a2e", color: "#8888aa", border: "1px dashed #2a2a4a", borderRadius: 8, padding: "6px 10px", fontSize: 11, cursor: "pointer" }}>
                      💾 Save seed <strong style={{ color: "#c77dff", fontFamily: "monospace" }}>#{seed}</strong> to library
                    </button>
                  ) : (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input autoFocus type="text" value={seedSaveName} onChange={e => setSeedSaveName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter" && seedSaveName.trim()) {
                            const entry = { id: Date.now(), name: seedSaveName.trim(), seed, prompt: prompt.slice(0, 60), bpm: resultBpm, key: resultKey, createdAt: new Date().toLocaleString("ro-RO") };
                            const updated = [entry, ...seedLibrary]; setSeedLibrary(updated); saveSeedsToStorage(updated);
                            setSeedSaveInput(false); setSeedSaveName("");
                          }
                          if (e.key === "Escape") setSeedSaveInput(false);
                        }}
                        placeholder="Name (e.g. Good Trap Beat)"
                        style={{ flex: 1, background: "#080812", border: "1px solid #9b2de044", color: "#e0e0ff", borderRadius: 8, padding: "6px 10px", fontSize: 11, outline: "none" }} />
                      <button onClick={() => {
                        if (!seedSaveName.trim()) return;
                        const entry = { id: Date.now(), name: seedSaveName.trim(), seed, prompt: prompt.slice(0, 60), bpm: resultBpm, key: resultKey, createdAt: new Date().toLocaleString("ro-RO") };
                        const updated = [entry, ...seedLibrary]; setSeedLibrary(updated); saveSeedsToStorage(updated);
                        setSeedSaveInput(false); setSeedSaveName("");
                      }} style={{ background: "#9b2de0", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>Save</button>
                      <button onClick={() => setSeedSaveInput(false)} style={{ background: "transparent", color: "#6666aa", border: "1px solid #2a2a4a", borderRadius: 8, padding: "6px 10px", fontSize: 11, cursor: "pointer" }}>Cancel</button>
                    </div>
                  )}
                </div>
              )}

              {/* Librărie — expandable list */}
              {showSeedLib && (
                <div style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: "1px solid #1e1e3a",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: "#6666aa", fontSize: 10, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase" }}>📚 Saved seeds</span>
                    <button onClick={() => setShowSeedLib(false)} style={{ background: "transparent", color: "#555577", border: "none", fontSize: 11, cursor: "pointer", padding: "2px 4px" }}>✕ Close</button>
                  </div>
                  <div style={{ maxHeight: 200, overflowY: "auto", paddingRight: 4 }}>
                    {seedLibrary.length === 0 ? (
                      <div style={{ color: "#444466", fontSize: 12, textAlign: "center", padding: "16px 8px", background: "#080812", borderRadius: 8, border: "1px solid #1a1a2e" }}>
                        No seeds saved. Generate a track, then save the seed above.
                      </div>
                    ) : (
                      seedLibrary.map(entry => (
                        <div key={entry.id} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 12px",
                          background: "#080812",
                          borderRadius: 8,
                          marginBottom: 6,
                          border: "1px solid #1a1a2e",
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: "#e0e0ff", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entry.name}</div>
                            <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
                              <span style={{ color: "#9b2de0", fontSize: 10, fontFamily: "monospace" }}>#{entry.seed}</span>
                              {entry.bpm != null && entry.bpm !== 0 && <span style={{ color: "#555577", fontSize: 10 }}>♩ {entry.bpm}</span>}
                              {entry.key && <span style={{ color: "#555577", fontSize: 10 }}>{entry.key}</span>}
                            </div>
                            {entry.prompt && (
                              <div style={{ color: "#444466", fontSize: 10, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>"{entry.prompt}"</div>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                            <button onClick={() => { setSeed(entry.seed); setShowSeedLib(false); }}
                              style={{ background: "#9b2de022", color: "#c77dff", border: "1px solid #9b2de044", borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Use</button>
                            <button onClick={() => { const u = seedLibrary.filter(s => s.id !== entry.id); setSeedLibrary(u); saveSeedsToStorage(u); }}
                              style={{ background: "transparent", color: "#555577", border: "1px solid #2a2a4a", borderRadius: 6, padding: "5px 8px", fontSize: 11, cursor: "pointer" }} title="Delete">🗑</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Negative Prompt */}
          <div style={S.card}>
            <span style={S.label}>🚫 Negative Prompt (Optional)</span>
            <textarea
              value={negativePrompt}
              onChange={e => setNegativePrompt(e.target.value)}
              placeholder={"What to avoid in the generated music...\n\nExamples:\n• low quality, distorted, noise\n• vocals, singing (for instrumental)\n• slow, boring, repetitive"}
              style={{
                width: "100%", minHeight: 70, background: "#080812",
                border: "1px solid #2a2a4a", borderRadius: 8,
                color: "#e0e0ff", fontSize: 12, fontFamily: "monospace",
                padding: "10px", resize: "vertical", outline: "none", lineHeight: 1.6,
                boxSizing: "border-box",
              }}
              onFocus={e => e.target.style.borderColor = "#e63946"}
              onBlur={e => e.target.style.borderColor = "#2a2a4a"}
            />
            <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
              {[
                { label: "No vocals", val: "vocals, singing, voice" },
                { label: "No noise", val: "low quality, noise, distortion, artifacts" },
                { label: "No slow", val: "slow, boring, repetitive, monotone" },
              ].map(p => (
                <button key={p.label} onClick={() => setNegativePrompt(p.val)} style={{
                  background: negativePrompt === p.val ? "#e6394622" : "#0a0a1a",
                  border: `1px solid ${negativePrompt === p.val ? "#e63946" : "#2a2a4a"}`,
                  color: negativePrompt === p.val ? "#e63946" : "#444466",
                  borderRadius: 5, padding: "3px 8px", fontSize: 10, cursor: "pointer",
                }}>{p.label}</button>
              ))}
              {negativePrompt && (
                <button onClick={() => setNegativePrompt("")} style={{ background: "#e6394611", color: "#e63946", border: "1px solid #e6394633", borderRadius: 5, padding: "3px 8px", fontSize: 10, cursor: "pointer" }}>🗑 Clear</button>
              )}
            </div>
          </div>

          {/* Generate Button */}
          <div style={S.card}>
            <button
              onClick={handleGenerate}
              disabled={processing || !aceOnline || !prompt.trim()}
              style={{
                width: "100%", padding: "18px 0", borderRadius: 10,
                background: processing ? "#1a1a2e" : (aceOnline && prompt.trim()
                  ? "linear-gradient(135deg, #ffd166, #ff9f1c)"
                  : "#1a1a2e"),
                color: "#000", fontWeight: 900, fontSize: 17, border: "none",
                cursor: (processing || !aceOnline || !prompt.trim()) ? "not-allowed" : "pointer",
                opacity: (!aceOnline || !prompt.trim()) ? 0.5 : 1,
                letterSpacing: 1,
                boxShadow: aceOnline && prompt.trim() && !processing ? "0 0 20px #ffd16644" : "none",
              }}>
              {processing ? `⚙ ${progressLabel || "Generating..."}` : "🎵 Generate Music"}
            </button>

            {processing && (
              <div style={{ marginTop: 10 }}>
                <div style={{ height: 6, background: "#1a1a2e", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: 6, background: "linear-gradient(90deg, #ffd166, #ff9f1c)", width: `${progress}%`, transition: "width 1s", borderRadius: 3 }} />
                </div>
                <div style={{ color: "#6666aa", fontSize: 11, marginTop: 6, textAlign: "center" }}>{progressLabel}</div>
              </div>
            )}

            {/* Info */}
            <div style={{ marginTop: 12, padding: "10px 12px", background: "#0a0a1a", borderRadius: 8, border: "1px solid #1a1a2e" }}>
              <div style={{ color: "#ffd166", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>💡 ACE-Step v1.5 Info</div>
              <div style={{ color: "#444466", fontSize: 11, lineHeight: 1.8 }}>
                <div>• Generate full music from text (beats SUNO)</div>
                <div>• 8GB VRAM → model 0.6B (bun) · 12GB+ → 1.7B (mai bun)</div>
                <div>• Prima rulare descarcă ~10GB modele automat</div>
                <div>• Timp generare: ~30-120s pentru 30s de muzică</div>
              </div>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div style={{ ...S.card, border: "1px solid #ffd16644", background: "#ffd16611" }}>
              <span style={{ ...S.label, color: "#ffd166" }}>✅ Generated!</span>
              <div style={{ color: "#ffd166", fontSize: 11, fontFamily: "monospace", marginBottom: 4 }}>🎵 {result.filename}</div>
              <div style={{ color: "#444466", fontSize: 10, marginBottom: 6 }}>"{result.prompt}"</div>
              {(resultBpm || resultKey || result.seed !== undefined) && (
                <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                  {resultBpm && <span style={{ background: "#ffd16622", color: "#ffd166", border: "1px solid #ffd16644", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontFamily: "monospace" }}>♩ {resultBpm} BPM</span>}
                  {resultKey && <span style={{ background: "#ffd16622", color: "#ffd166", border: "1px solid #ffd16644", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontFamily: "monospace" }}>🎵 {resultKey}</span>}
                  {result.seed !== undefined && result.seed !== null && (
                    <span
                      title="Click to reuse this seed"
                      onClick={() => setSeed(result.seed)}
                      style={{
                        background: "#7209b722", color: "#c77dff", border: "1px solid #7209b744",
                        borderRadius: 6, padding: "3px 10px", fontSize: 12, fontFamily: "monospace",
                        cursor: "pointer", userSelect: "none",
                      }}
                    >
                      🎲 {result.seed === -1 ? "Random" : `#${result.seed}`}
                    </span>
                  )}
                </div>
              )}
              {!resultBpm && result && (
                <div style={{ color: "#333355", fontSize: 10, marginBottom: 6, fontFamily: "monospace" }}>⏳ Detecting BPM & Key...</div>
              )}
              
              {/* Audio Player */}
              <audio controls src={result.url} preload="metadata" style={{ width: "100%", marginBottom: 8 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={async () => {
                    try {
                      const resp = await fetch(result.url);
                      const blob = await resp.blob();
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = result.filename;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(a.href);
                    } catch (e) {
                      alert("Download failed: " + e.message);
                    }
                  }}
                  style={{ flex: 1, textAlign: "center", background: "#ffd16622", color: "#ffd166", border: "1px solid #ffd16644", padding: "8px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >⬇ Download</button>
                <button onClick={() => setResult(null)} style={{ background: "#e6394611", color: "#e63946", border: "1px solid #e6394633", padding: "8px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>✕</button>
              </div>
            </div>
          )}

          {/* Recent ACE tracks */}
          {tracks.filter(t => t.isAce).length > 0 && !result && (
            <div style={S.card}>
              <span style={S.label}>📁 Recent ACE-Step Tracks</span>
              {tracks.filter(t => t.isAce).slice(0, 3).map(track => (
                <div key={track.id} style={{ background: "#0a0a1a", borderRadius: 8, padding: "8px 10px", marginBottom: 6, border: "1px solid #1a1a2e" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#ffd166", fontSize: 11, fontFamily: "monospace" }}>🎵 {track.filename}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={async () => {
                        try {
                          const resp = await fetch(track.url);
                          const blob = await resp.blob();
                          const a = document.createElement("a");
                          a.href = URL.createObjectURL(blob);
                          a.download = track.filename;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(a.href);
                        } catch {}
                      }} style={{ background: "#ffd16622", color: "#ffd166", border: "1px solid #ffd16644", padding: "2px 7px", borderRadius: 4, fontSize: 10, cursor: "pointer" }}>↓</button>
                      <button onClick={() => setTracks(prev => prev.filter(t => t.id !== track.id))} style={{ background: "#e6394611", color: "#e63946", border: "1px solid #e6394633", padding: "2px 7px", borderRadius: 4, fontSize: 10, cursor: "pointer" }}>✕</button>
                    </div>
                  </div>
                  <audio controls src={track.url} style={{ width: "100%", height: 26 }} />
                </div>
              ))}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN — Advanced Settings */}
        <div>
          <div style={{
            background: "linear-gradient(180deg, #0a0a1a, #080812)",
            border: "1px solid #2a2a4a",
            borderRadius: 12,
            padding: 20,
          }}>
            <div style={{ color: "#8888aa", fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span>⚙️</span> Advanced Settings
            </div>
            {/* Model Selection */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: "#ffd166", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
                🦁 ACE-Step Model Selection
              </div>
              <select
                value={tensorModel}
                onChange={e => setTensorModel(e.target.value)}
                style={{
                  width: "100%",
                  background: "#080812",
                  border: "1px solid #2a2a4a",
                  color: "#e0e0ff",
                  borderRadius: 8,
                  padding: "12px 16px",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {TENSOR_MODELS.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} — {model.desc}
                  </option>
                ))}
              </select>
              
              {/* Model Info */}
              {modelInfo && (
                <div style={{
                  marginTop: 12,
                  padding: 12,
                  background: `linear-gradient(135deg, ${modelInfo.color}22, ${modelInfo.color}11)`,
                  border: `1px solid ${modelInfo.color}44`,
                  borderRadius: 8,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr",
                  gap: 8,
                }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: modelInfo.color, fontSize: 16, fontWeight: 900 }}>{modelInfo.steps}</div>
                    <div style={{ color: "#6666aa", fontSize: 10 }}>Steps</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: modelInfo.cfg ? modelInfo.color : "#6666aa", fontSize: 16, fontWeight: 900 }}>
                      {modelInfo.cfg ? '✅' : '❌'}
                    </div>
                    <div style={{ color: "#6666aa", fontSize: 10 }}>
                      {modelInfo.cfg ? 'CFG Support' : 'No CFG'}
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: modelInfo.color, fontSize: 16, fontWeight: 900 }}>{modelInfo.vram}</div>
                    <div style={{ color: "#6666aa", fontSize: 10 }}>VRAM</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: modelInfo.color, fontSize: 16, fontWeight: 900 }}>{modelInfo.quality}</div>
                    <div style={{ color: "#6666aa", fontSize: 10 }}>Quality</div>
                  </div>
                </div>
              )}
            </div>

            {/* Model Loading Status */}
            <div style={{
              marginTop: 12,
              padding: 10,
              background: "#080812",
              border: "1px solid #2a2a4a",
              borderRadius: 6,
              fontSize: 11,
              fontFamily: "monospace",
              color: "#444466",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#ffd166" }}>📋</span>
                <span>Selected Model: <strong style={{ color: modelInfo.color }}>{modelInfo.name}</strong></span>
                <span style={{ color: "#6666aa" }}>│</span>
                <span>Steps: <strong style={{ color: "#06d6a0" }}>{modelInfo.steps}</strong></span>
                <span style={{ color: "#6666aa" }}>│</span>
                <span>CFG: <strong style={{ color: modelInfo.cfg ? "#06d6a0" : "#6666aa" }}>{modelInfo.cfg ? '✅' : '❌'}</strong></span>
              </div>
              <div style={{ marginTop: 6, color: "#6666aa" }}>
                💡 Model will be loaded automatically when you click Generate
              </div>
            </div>

            {/* LM Parameters */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: "#00e5ff", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
                🧠 Language Model Parameters
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ color: "#6666aa", fontSize: 11, display: "block", marginBottom: 6 }}>LM Temperature: {lmTemperature.toFixed(2)}</label>
                  <input
                    type="range" min="0.5" max="2.0" step="0.01"
                    value={lmTemperature}
                    onChange={e => setLmTemperature(parseFloat(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </div>
                <div>
                  <label style={{ color: "#6666aa", fontSize: 11, display: "block", marginBottom: 6 }}>LM CFG Scale: {lmCfgScale.toFixed(1)}</label>
                  <input
                    type="range" min="1.0" max="5.0" step="0.1"
                    value={lmCfgScale}
                    onChange={e => setLmCfgScale(parseFloat(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </div>
                <div>
                  <label style={{ color: "#6666aa", fontSize: 11, display: "block", marginBottom: 6 }}>Top-K: {lmTopK}</label>
                  <input
                    type="number" min="0" max="100"
                    value={lmTopK}
                    onChange={e => setLmTopK(parseInt(e.target.value) || 0)}
                    style={{ width: "100%", background: "#080812", border: "1px solid #2a2a4a", color: "#e0e0ff", borderRadius: 6, padding: "8px 12px", fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ color: "#6666aa", fontSize: 11, display: "block", marginBottom: 6 }}>Top-P: {lmTopP.toFixed(2)}</label>
                  <input
                    type="range" min="0.8" max="1.0" step="0.01"
                    value={lmTopP}
                    onChange={e => setLmTopP(parseFloat(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
            </div>

            {/* Generation Control */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: "#06d6a0", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
                ⚙ Generation Control
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ color: "#6666aa", fontSize: 11, display: "block", marginBottom: 6 }}>Infer Method</label>
                  <select
                    value={inferMethod}
                    onChange={e => setInferMethod(e.target.value)}
                    style={{ width: "100%", background: "#080812", border: "1px solid #2a2a4a", color: "#e0e0ff", borderRadius: 6, padding: "8px 12px", fontSize: 12 }}
                  >
                    <option value="ode">ODE (Fast)</option>
                    <option value="sde">SDE (Stochastic)</option>
                  </select>
                </div>
                <div>
                  <label style={{ color: "#6666aa", fontSize: 11, display: "block", marginBottom: 6 }}>Timestep Shift: {shift.toFixed(1)}</label>
                  <input
                    type="range" min="1.0" max="5.0" step="0.1"
                    value={shift}
                    onChange={e => setShift(parseFloat(e.target.value))}
                    style={{ width: "100%" }}
                    disabled={!tensorModel.includes("base") && !tensorModel.includes("sft")}
                  />
                </div>
                <div>
                  <label style={{ color: "#6666aa", fontSize: 11, display: "block", marginBottom: 6 }}>Batch Size: {batchSize}</label>
                  <input
                    type="number" min="1" max="8"
                    value={batchSize}
                    onChange={e => setBatchSize(parseInt(e.target.value) || 1)}
                    style={{ width: "100%", background: "#080812", border: "1px solid #2a2a4a", color: "#e0e0ff", borderRadius: 6, padding: "8px 12px", fontSize: 12 }}
                  />
                </div>
              </div>
            </div>

            {/* Audio & VRAM */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: "#c77dff", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
                🔊 Audio & VRAM
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ color: "#6666aa", fontSize: 11, display: "block", marginBottom: 6 }}>Output Format</label>
                  <select
                    value={audioFormat}
                    onChange={e => setAudioFormat(e.target.value)}
                    style={{ width: "100%", background: "#080812", border: "1px solid #2a2a4a", color: "#e0e0ff", borderRadius: 6, padding: "8px 12px", fontSize: 12 }}
                  >
                    <option value="wav">WAV (Uncompressed - Highest Quality)</option>
                    <option value="mp3">MP3 (320 kbps - High Quality)</option>
                    <option value="flac">FLAC (Lossless)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#6666aa", fontSize: 11, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={useTiledDecode}
                      onChange={e => setUseTiledDecode(e.target.checked)}
                    />
                    Tiled Decode (VRAM optimization)
                  </label>
                </div>
              </div>
            </div>

            {/* CoT Controls */}
            {taskType !== "custom" && (
              <div style={{ marginBottom: 20, padding: "12px 14px", borderRadius: 8, background: "#07071a", border: "1px solid #1a1a3a" }}>
                <div style={{ fontSize: 11, color: "#444466", fontWeight: 700, marginBottom: 10, letterSpacing: 1, textTransform: "uppercase" }}>
                  🧠 AI Chain-of-Thought
                </div>
                {[
                  { key: "cotMetas", state: useCotMetas, setter: setUseCotMetas, label: "CoT Metas", icon: "🥁", desc: "AI detects and overwrites BPM, Key, Time Signature. OFF = respects your settings." },
                  { key: "cotCaption", state: useCotCaption, setter: setUseCotCaption, label: "CoT Caption", icon: "🎨", desc: "AI rewrites and expands your style prompt. OFF = uses your exact text." },
                  { key: "cotLanguage", state: useCotLanguage, setter: setUseCotLanguage, label: "CoT Language", icon: "🌐", desc: "AI detects language from lyrics. OFF = uses your Vocal Language setting." },
                ].map(({ key, state, setter, label, icon, desc }) => (
                  <div key={key} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8, paddingBottom: 8, borderBottom: key !== "cotLanguage" ? "1px solid #12122a" : "none" }}>
                    <div onClick={() => setter(v => !v)} style={{ width: 36, height: 20, borderRadius: 999, flexShrink: 0, marginTop: 2, background: state ? "#9b2de0" : "#1a1a3a", position: "relative", cursor: "pointer", transition: "background 0.2s" }}>
                      <div style={{ position: "absolute", top: 2, left: state ? 18 : 2, width: 14, height: 14, borderRadius: "50%", background: state ? "#fff" : "#444466", transition: "left 0.2s" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 13 }}>{icon}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: state ? "#c77dff" : "#444466" }}>{label}</span>
                        <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 999, fontWeight: 700, background: state ? "#9b2de022" : "#12122a", color: state ? "#c77dff" : "#333355", border: `1px solid ${state ? "#9b2de044" : "#1a1a3a"}` }}>{state ? "ON" : "OFF"}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#333355", lineHeight: 1.4 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Thinking Mode */}
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 10, color: "#ffd166", fontSize: 12, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={thinking}
                  onChange={e => setThinking(e.target.checked)}
                />
                💭 Thinking Mode (Use 5Hz LM for audio codes - slower but better quality)
              </label>
            </div>

            {/* Clean Temp Files */}
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #2a2a4a" }}>
              <div style={{ color: "#e63946", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
                🧹 Cleanup
              </div>
              <button
                onClick={handleCleanTemp}
                disabled={cleaningTemp}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background: cleaningTemp ? "#1a1a2e" : "linear-gradient(135deg, #e6394622, #e6394644)",
                  border: "1px solid #e6394666",
                  color: cleaningTemp ? "#666688" : "#e63946",
                  borderRadius: 8,
                  padding: "12px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: cleaningTemp ? "not-allowed" : "pointer",
                  opacity: cleaningTemp ? 0.6 : 1,
                }}
              >
                {cleaningTemp ? "⏳ Cleaning..." : "🧹 Clean Temp Files"}
              </button>
              {cleanResult && (
                <div style={{
                  marginTop: 10,
                  padding: 10,
                  background: cleanResult.status === "ok" ? "#06d6a011" : "#e6394611",
                  border: `1px solid ${cleanResult.status === "ok" ? "#06d6a044" : "#e6394644"}`,
                  borderRadius: 6,
                  fontSize: 11,
                  color: cleanResult.status === "ok" ? "#06d6a0" : "#e63946",
                }}>
                  {cleanResult.message}
                  {cleanResult.results && cleanResult.results.map((r, i) => (
                    <div key={i} style={{ marginTop: 4, fontFamily: "monospace" }}>
                      {r.status === "cleaned" && `✓ ${r.folder.split('\\').pop()}: ${r.files_removed} files (${r.size_freed_mb} MB)`}
                      {r.status === "not_found" && `⚠ ${r.folder.split('\\').pop()}: not found`}
                      {r.status === "error" && `✗ ${r.folder.split('\\').pop()}: ${r.message}`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
