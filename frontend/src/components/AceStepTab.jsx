import { useState, useEffect, useRef, useCallback } from "react";

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
  { label: "Hip-Hop", cat: "Hip-Hop", prompt: "hip hop, boom bap drums, sampled beats, lyrical rap, classic hip hop production, East Coast flow, punchy kicks, soul or jazz samples, Nas Jay-Z Wu-Tang style: clear articulate delivery, confident baritone flow, wordplay and multisyllabic rhymes, no auto-tune, raw mic presence", bpm: 92, negativePrompt: "orchestral, EDM four-on-the-floor, cheesy pop chorus, country twang, metal distortion" },
  { label: "Trap (general)", cat: "Hip-Hop", prompt: "trap music 2026, booming 808 sub-bass, rapid hi-hat rolls and triplets, dark atmospheric synths, menacing mood, modern trap production, Southern influence, Migos Metro Boomin style: triplet flow, ad-libs and hooks, catchy repetitive phrases, auto-tune on hooks, aggressive delivery", bpm: 140, negativePrompt: "jazz swing, orchestral, acoustic guitar, reggae skank, smooth R&B crooning" },
  { label: "Jersey Club Rap", cat: "Hip-Hop", prompt: "jersey club rap footwork influenced 2026, fast stuttering kicks, high-energy bounce, Jersey club edits meets rap flows, sexwave osamason side-projects style: rapid chopped vocals, groovy percussion, viral TikTok dance/club weapon, aggressive underground bounce", bpm: 140, negativePrompt: "slow melodic trap, deep atmospheric pads, orchestral strings, smooth jazz, chill lo-fi" },
  { label: "Hyperpop Rap / Digicore", cat: "Hip-Hop", prompt: "hyperpop rap digicore glitchcore 2026, chaotic glitchy production, high-pitched auto-tune vocals, emo lyrics over distorted beats, 100 gecs midwxst glaive quinn ericdoa brakence style: pixelated synths, stuttering effects, emotional overstimulated delivery, internet underground viral energy, TikTok-ready hooks", bpm: 140, negativePrompt: "clean trap 808, boom bap drums, orchestral epic, smooth R&B crooning, slow ballad" },
  { label: "Corridos Tumbados", cat: "Hip-Hop", prompt: "corridos tumbados latin trap evolution 2026, narrative corridos with heavy 808 trap beats, street storytelling, Natanael Cano Peso Pluma Fuerza Regida Junior H style: Mexican regional influence, auto-tune melodic hooks, belic romantic or aggressive delivery, viral Latin urban sound", bpm: 130, negativePrompt: "classic reggaeton dembow, orchestral symphony, smooth jazz, pure boom bap, metal distortion" },
  { label: "Atlanta Trap", cat: "Hip-Hop", prompt: "Atlanta trap, classic Southern trap, heavy 808 bass lines, fast hi-hat rolls and triplets, dark minor key, street anthem vibe, punchy snares, synth melodies, trap house energy, T.I. Gucci Mane Young Jeezy style: deep raspy voice, slow menacing flow, street bravado, gruff delivery, ad-libs and growls", bpm: 138, negativePrompt: "bright pop chords, orchestral strings, jazz piano, reggae one-drop" },
  { label: "AI Voice Rap / Synth Rap", cat: "Hip-Hop", prompt: "AI voice synth rap underground 2026, artificial intelligence generated vocals, fake celebrity mimicry, robotic processed flows, fake Travis Scott AI Kanye SoundCloud style: uncanny valley delivery, glitchy synth layers, meme/viral experimental rap, controversial digital sound", bpm: 145, negativePrompt: "human raw vocals, organic production, orchestral epic, smooth jazz, conscious lyrics" },
  { label: "Melodic Trap", cat: "Hip-Hop", prompt: "melodic trap, emotional auto-tune vocals, catchy melodic hooks, smooth 808 bass, atmospheric pads and synths, sing-rap flow, radio-friendly trap, Future Travis Scott style: heavy auto-tune, slurred melodic delivery, sing-song hooks, emotional and hazy tone, crooning over 808s", bpm: 135, negativePrompt: "harsh screaming, metal guitars, orchestral, jazz improvisation, raw boom bap" },
  { label: "Hard / Dark Trap", cat: "Hip-Hop", prompt: "hard trap, dark trap, aggressive distorted 808 bass, menacing atmosphere, heavy hi-hats, dark synths, street and gritty, no melody focus, pure aggression, 21 Savage Metro Boomin style: deadpan monotone delivery, cold sparse flow, minimal melody, menacing low voice, trap ad-libs", bpm: 142, negativePrompt: "uplifting major key, pop chorus, jazz chords, orchestral, reggae" },
  { label: "Distorted Rage Rap", cat: "Hip-Hop", prompt: "distorted rage rap 2026, extreme aggressive 808, noisy chaotic production, high-pitched screams and baby voice, Che Osamason 2slimey Glokk40Spaz style: manic intensity, unhinged flow, noise/hyperpop influence, underground internet rap energy", bpm: 150, negativePrompt: "clean melodic hooks, smooth autotune, orchestral, jazz swing" },
  { label: "Jerk Trap / Hoodtrap", cat: "Hip-Hop", prompt: "jerk trap hoodtrap 2026, fast manic Atlanta underground bounce, quirky unhinged delivery, Glokk40Spaz Tezzus Zukenee style: exaggerated Thugga vibes, high-speed flow, chaotic ad-libs, street energy", bpm: 145, negativePrompt: "slow melodic trap, conscious lyrics, orchestral epic, smooth R&B" },
  { label: "Futuristic Trap", cat: "Hip-Hop", prompt: "futuristic trap 2026, sci-fi synths, heavy distorted 808, modern underground sound, Drippy Shorty Red Pluto style: experimental beats, dark aggressive atmosphere, high-energy trap evolution", bpm: 140, negativePrompt: "classic boom bap, jazz samples, lo-fi chill, orchestral" },
  { label: "UK Underground Rap", cat: "Hip-Hop", prompt: "UK underground rap 2026, creative indie-electro hybrid, witty flows, fakemink EsDeeKid Jim Legxacy style: British accent, experimental production, genre-blending, high-quality underground vibe", bpm: 130, negativePrompt: "mainstream trap hats, rage screaming, orchestral, country" },
  { label: "Indie Trap Hybrid", cat: "Hip-Hop", prompt: "indie trap hybrid 2026, guitar-driven trap, folk-indie meets alternative rap, witty aeter style: bedroom production, emotional introspective, genre-breaking indie-electronic fusion", bpm: 110, negativePrompt: "hard trap 808, rage distortion, metal guitars, pop chorus" },
  { label: "Trap Choirs", cat: "Hip-Hop", prompt: "trap choirs 2026, layered vocal harmonies, choir-like ad-libs peste trap beat, experimental vocal production, modern hip-hop trend style: atmospheric stacked vocals, emotional depth, innovative soundscapes", bpm: 135, negativePrompt: "raw single vocal, boom bap drums, orchestral symphony, smooth jazz" },
  { label: "EDM / Festival Trap", cat: "Hip-Hop", prompt: "EDM trap, festival trap, big room drops, 808 bass with electronic build-ups, energetic festival energy, hybrid trap and EDM, crowd hype, RL Grime Baauer style: aggressive vocal chops, build and drop energy, minimal vocals or chopped samples, festival anthem feel", bpm: 140, negativePrompt: "acoustic folk, jazz trio, lo-fi chill, orchestral waltz" },
  { label: "Drill", cat: "Hip-Hop", prompt: "drill music, dark sliding 808s, aggressive trap drums, menacing atmosphere, UK or Chicago drill, cold and gritty, Chief Keef Pop Smoke style: deep gravelly voice, slow menacing flow, ad-libs and skips, street slang delivery, aggressive tone", bpm: 143, negativePrompt: "bright pop, jazz, reggae groove, uplifting chords, orchestral" },
  { label: "UK Drill", cat: "Hip-Hop", prompt: "UK drill beat, dark and menacing vibe, heavy sliding 808 bass, rapid fire hi-hats with rolls, hard snappy snares, dark synth stabs, aggressive trap-style drums, minor key, gritty and street, instrumental hip hop, Headie One Digga D style: British accent", bpm: 142, negativePrompt: "happy major key, disco funk, reggae skank, smooth jazz, bright pop chords, orchestral" },
  { label: "NY Drill", cat: "Hip-Hop", prompt: "New York drill, dark piano samples, heavy 808 bass, aggressive rap, Brooklyn drill sound, Pop Smoke Fivio Foreign style: deep booming voice, slow heavy flow, Brooklyn accent, ad-libs and grunts, menacing presence", bpm: 145, negativePrompt: "bright pop harmony, liquid DnB, funky disco, reggae skank" },
  { label: "Afro Drill", cat: "Hip-Hop", prompt: "afro drill, afrobeats percussion, dark 808 bass, melodic trap, African rhythms meets drill, Asake Burna Boy style: smooth Afropop vocals, melodic singing mixed with rap, Nigerian inflection, catchy hooks, danceable delivery", bpm: 128, negativePrompt: "metal screaming, orchestral, harsh industrial, dark ambient" },
  { label: "Melodic Rap", cat: "Hip-Hop", prompt: "melodic rap, auto-tune vocals, emotional trap beats, melodic hooks, modern rap production, Lil Uzi Vert Roddy Ricch style: high melodic voice, sing-rap blend, catchy hooks, emotional and catchy, auto-tune melodies", bpm: 132, negativePrompt: "raw boom bap, orchestral, jazz improvisation, harsh screaming" },
  { label: "Emo Rap", cat: "Hip-Hop", prompt: "emo rap, sad melodies, emotional lyrics, lo-fi trap beats, introspective rap, guitar samples, Lil Peep XXXTentacion style: raw emotional vocals, singing and rapping, vulnerable and angsty tone, strained and heartfelt delivery", bpm: 85, negativePrompt: "bright uplifting chords, EDM drop, cheesy pop, reggae skank" },
  { label: "Cloud Rap", cat: "Hip-Hop", prompt: "cloud rap, dreamy atmospheric beats, ethereal synths, slow tempo, hazy production, spacey rap, Yung Lean Bladee style: distant hazy vocals, monotone melodic delivery, abstract lyrics, detached and dreamy tone", bpm: 78, negativePrompt: "aggressive distortion, metal, orchestral epic, bright pop chorus" },
  { label: "Phonk", cat: "Hip-Hop", prompt: "phonk music, dark Memphis rap samples, chopped vocals, heavy 808, cowbell, aggressive drift phonk, DJ Smokey SpaceGhostPurrp style: chopped and pitched vocal samples, lo-fi gritty texture, Memphis drawl, repetitive hooks", bpm: 130, negativePrompt: "clean polished mix, orchestral, jazz swing, bright pop melody" },
  { label: "Drift Phonk", cat: "Hip-Hop", prompt: "drift phonk, aggressive dark phonk, heavy distorted 808, fast tempo, cowbell, adrenaline energy, Kordhell Pharmacist style: distorted vocal chops, aggressive samples, no clear lead vocal, instrumental focus with vocal stabs", bpm: 170, negativePrompt: "smooth jazz, acoustic ballad, orchestral, reggae groove" },
  { label: "Memphis Rap", cat: "Hip-Hop", prompt: "Memphis rap, lo-fi dark beats, chopped samples, Three 6 Mafia style: dark gruff delivery, horrorcore tone, Southern drawl, hypnotic repetitive flow, sinister ad-libs", bpm: 95, negativePrompt: "bright pop, orchestral, smooth R&B, jazz piano" },
  { label: "Boom Bap", cat: "Hip-Hop", prompt: "boom bap hip hop, classic 90s rap, punchy drums, jazz samples, lyrical flow, East Coast hip hop, Nas Pete Rock Wu-Tang style: clear articulate flow, complex rhyme schemes, confident delivery, no auto-tune, storytelling and wordplay", bpm: 90, negativePrompt: "EDM four-on-the-floor, trap hi-hat rolls, dubstep, glossy autotune" },
  { label: "Gangsta Rap", cat: "Hip-Hop", prompt: "gangsta rap, West Coast G-funk, heavy bass, synthesizer, street rap, Compton sound, N.W.A Dr. Dre Ice Cube style: aggressive confrontational delivery, deep voice, storytelling, political and street lyrics, hard delivery", bpm: 95, negativePrompt: "pop hook, R&B singing runs, orchestral, cheerful major key" },
  { label: "G-Funk", cat: "Hip-Hop", prompt: "G-funk, West Coast hip hop, slow groove, synthesizer melody, heavy bass, laid-back rap, Snoop Dogg Dr. Dre Warren G style: smooth laid-back flow, lazy drawl, melodic hooks, relaxed delivery, sing-song cadence", bpm: 95, negativePrompt: "fast punk tempo, metal distortion, orchestral, EDM drop" },
  { label: "Crunk", cat: "Hip-Hop", prompt: "crunk music, energetic Southern rap, heavy bass, call and response, club energy, Lil Jon Ying Yang Twins style: shouted aggressive delivery, call and response chants, hype man energy, screaming ad-libs, party chants", bpm: 108, negativePrompt: "slow ballad, orchestral, jazz trio, ambient drone" },
  { label: "Trap Soul", cat: "Hip-Hop", prompt: "trap soul, R&B meets trap, emotional vocals, 808 bass, atmospheric production, soulful melodies, Bryson Tiller SZA style: smooth R&B singing, emotional and intimate, soft falsetto and lower register, sensual delivery, sing-rap blend", bpm: 118, negativePrompt: "metal screaming, harsh distortion, orchestral epic, fast punk" },
  { label: "Mumble Rap", cat: "Hip-Hop", prompt: "mumble rap, melodic flow, auto-tune, trap beats, catchy hooks, Lil Yachty Lil Pump style: slurred melodic delivery, catchy simple hooks, high auto-tune, playful and carefree tone, ad-libs and repetition", bpm: 138, negativePrompt: "raw articulate flow, orchestral, jazz, aggressive screaming" },
  { label: "Rage Rap", cat: "Hip-Hop", prompt: "rage rap, aggressive distorted 808, high energy trap, screaming ad-libs, Playboi Carti Ken Carson style: high-pitched energetic delivery, baby voice and screams, chaotic ad-libs, repetitive catchy phrases, hype energy", bpm: 145, negativePrompt: "smooth jazz, ballad, orchestral, reggae one-drop" },
  { label: "Pluggnb", cat: "Hip-Hop", prompt: "pluggnb, melodic trap, R&B influences, dreamy production, auto-tune vocals, SoFaygo Destroy Lonely style: soft melodic voice, emotional sing-rap, dreamy auto-tune, laid-back delivery, catchy hooks", bpm: 128, negativePrompt: "harsh screaming, metal, orchestral, raw boom bap" },
  { label: "SoundCloud Rap", cat: "Hip-Hop", prompt: "SoundCloud rap, lo-fi trap, raw underground sound, DIY production, emotional rap, Lil Pump Smokepurpp style: raw unfiltered delivery, aggressive and catchy, simple hooks, ad-libs, rebellious tone", bpm: 135, negativePrompt: "polished pop production, orchestral, jazz, classical" },
  { label: "Hyphy", cat: "Hip-Hop", prompt: "hyphy music, Bay Area rap, energetic, screwed vocals, thizz dance, Oakland sound, E-40 Keak da Sneak style: fast unique flow, slang-heavy delivery, energetic ad-libs, Bay Area accent, rapid cadence", bpm: 105, negativePrompt: "slow ballad, orchestral, ambient, smooth jazz" },
  { label: "Chopped & Screwed", cat: "Hip-Hop", prompt: "chopped and screwed, slowed down hip hop, Houston rap, syrupy tempo, DJ Screw style: slowed pitched-down vocals, chopped repeats, syrupy drawl, hypnotic and heavy", bpm: 65, negativePrompt: "fast tempo, EDM drop, bright pop, orchestral" },
  { label: "Trap Metal", cat: "Hip-Hop", prompt: "trap metal, aggressive metal guitars, heavy 808 bass, screaming vocals, industrial trap, Ghostemane Scarlxrd style: screamed and growled vocals, aggressive rap-scream blend, dark intense delivery, metal and trap fusion", bpm: 140, negativePrompt: "smooth R&B, reggae groove, jazz swing, pop ballad" },
  { label: "Latin Trap", cat: "Hip-Hop", prompt: "latin trap, reggaeton meets trap, Spanish rap, 808 bass, dembow rhythm, urban Latino sound, Bad Bunny Anuel AA style: Spanish flow, melodic rap and singing, Puerto Rican accent, catchy hooks, perreo energy", bpm: 95, negativePrompt: "orchestral symphony, jazz improvisation, metal screaming" },
  { label: "Afrotrap", cat: "Hip-Hop", prompt: "afrotrap, African trap music, afrobeats percussion, French rap, 808 bass, MHD style: French and African flow, melodic rap, Afrobeats vocal style, catchy hooks, Paris street sound", bpm: 118, negativePrompt: "dark ambient, metal distortion, orchestral epic, slow ballad" },
  { label: "Grime", cat: "Hip-Hop", prompt: "grime music, UK urban, aggressive MCing, electronic beats, London underground, Skepta Stormzy Dizzee Rascal style: fast British flow, aggressive delivery, UK accent, rapid bars, clash energy", bpm: 140, negativePrompt: "smooth jazz, reggae skank, orchestral, pop ballad" },
  { label: "Trap EDM", cat: "Hip-Hop", prompt: "trap EDM, festival trap, electronic trap, big room drops, 808 bass, energetic dance trap, RL Grime Flosstradamus style: vocal chops and samples, build-drop format, minimal full vocals, festival anthem", bpm: 150, negativePrompt: "acoustic folk, jazz trio, orchestral waltz, reggae one-drop" },
  { label: "Lo-fi Hip-Hop", cat: "Hip-Hop", prompt: "lo-fi hip hop, chill beats, vinyl crackle, jazz samples, relaxing study music, mellow rap beats, Nujabes J Dilla style: instrumental focus, sampled vocal chops, warm dusty texture, no clear lead vocal", bpm: 72, negativePrompt: "aggressive distortion, EDM drop, metal, bright polished mix" },
  { label: "Jazz Rap", cat: "Hip-Hop", prompt: "jazz rap, jazz samples, hip hop drums, lyrical rap, Tribe Called Quest style: smooth intelligent flow, jazz cadence, laid-back delivery, positive vibes, conversational and clever", bpm: 88, negativePrompt: "EDM four-on-the-floor, trap hi-hat spam, metal, dubstep" },
  { label: "Conscious Rap", cat: "Hip-Hop", prompt: "conscious rap, socially aware lyrics, boom bap beats, lyrical depth, Kendrick Lamar J. Cole style: articulate storytelling, varied flow and tone, emotional range, message-driven, no auto-tune", bpm: 86, negativePrompt: "party EDM, trap ad-lib spam, glossy autotune hook, metal screaming" },
  { label: "Trap Beats", cat: "Hip-Hop", prompt: "trap instrumental, 808 bass drops, hi-hat triplets, dark synths, no vocals, pure trap beat, Metro Boomin Southside style", bpm: 140, negativePrompt: "orchestral, jazz piano solo, acoustic strumming, reggae skank", instrumental: true },
  { label: "Plugg", cat: "Hip-Hop", prompt: "plugg music, melodic trap, dreamy synths, slow tempo, atmospheric, Ethereal Plug style: soft auto-tune, melodic and hazy, minimal lyrics, vibe-focused delivery", bpm: 122, negativePrompt: "aggressive screaming, metal, orchestral, raw boom bap" },
  { label: "Detroit Rap", cat: "Hip-Hop", prompt: "Detroit rap, gritty production, dark samples, aggressive flow, Big Sean Eminem style: fast technical flow, punchlines, double-time verses, confident delivery, Motor City swag", bpm: 98, negativePrompt: "smooth jazz, reggae groove, orchestral, pop ballad" },
  { label: "Trap Flamenco", cat: "Hip-Hop", prompt: "trap flamenco, Spanish guitar meets 808 bass, flamenco percussion, dark trap, fusion sound, Rosalía C. Tangana style: Spanish flamenco vocal runs, melismatic singing, emotional and dramatic delivery, trap flow with traditional ornamentation", bpm: 132, negativePrompt: "metal screaming, harsh industrial, smooth jazz, orchestral waltz" },
// ── Romanian (Românesc) ────────────────────────────────────────────────────
  // ... (păstrezi toate cele ~30 originale din fișierul tău)
  // + cele 10 adăugiri noi propuse anterior (manele etno/house/viral, pop dance etc.)
  { label: "Manele", cat: "Romanian", prompt: "Romanian manele, accordion, oriental synth, Balkan rhythm, party music, Turkish hicaz scale, čoček rhythm, Adrian Minune Florin Salam style: strong expressive voice, singing with passion and power, oriental ornamentation, emotional delivery, shouts and catchy refrains", bpm: 112, negativePrompt: "trap 808 dominance, metal distortion, EDM drop, dubstep, harsh industrial" },
  { label: "Manele Clasice", cat: "Romanian", prompt: "classic manele, traditional lăutărească, accordion, violin, clarinet, Turkish influences, traditional lăutari style: natural voice no autotune, authentic lăutari singing, traditional phrasing, vibrato and trills, virtuoso violin accompaniment", bpm: 100, negativePrompt: "electronic synth lead, trap hats, EDM, autotune, modern pop production" },
  { label: "Manele Moderne", cat: "Romanian", prompt: "modern manele, electronic synth, oriental accordion, current Balkan rhythm, 2020 production, Connect-R Guță style: clear modern voice, polished production singing, melodic hooks, confident delivery, pop and urban influences", bpm: 118, negativePrompt: "metal screaming, dark ambient, orchestral epic, harsh distortion" },
  { label: "Manele Etno Fusion", cat: "Romanian", prompt: "manele etno fusion 2026, oriental-folcloric modern, acordeon tradițional peste beat club, petrecere virală TikTok, Nelu Popa Florin Salam Subcarpați mix style: voce pasională puternică, refren exploziv catchy, influențe lăutărești cu synth și bass heavy", bpm: 122, negativePrompt: "trap pur fără etno, autotune robotic, metal distortion, slow doina melancolică" },
  { label: "Manele House Club", cat: "Romanian", prompt: "manele house club 2026, remix electronic petrecere, voce manea peste bass drop și four-on-the-floor, Sorinel Pustiu Vali Vijelie Connect-R club style: energie maximă club/wedding after, synth lead catchy, vibe festival românesc non-stop", bpm: 128, negativePrompt: "folclor acustic lent, ballad romantică, orchestral epic, jazz smooth" },
  { label: "Manele Viral TikTok", cat: "Romanian", prompt: "manele viral TikTok 2026, hituri scurte explozive, refrene pentru dans challenge, manele moderne cu beat rapid, Florin Salam Denis Spaniolu Misha Miller style: voce puternică hook addictiv, producție glossy scurtă, energie dans viral Reels/TikTok", bpm: 130, negativePrompt: "balade lungi introspective, folclor tradițional pur, metal screaming, ambient drone" },
  { label: "Pop Dance Românesc 2026", cat: "Romanian", prompt: "pop dance românesc 2026, hituri radio internaționale, synth upbeat catchy, female/male vocal strong & glossy, Inna Alexandra Stan Misha Miller Andra style: producție high-end export, refren viral dancefloor, vibe global radio-friendly", bpm: 124, negativePrompt: "manele oriental dominant, hard trap românesc, metal guitars, dark ambient" },
  { label: "Urban Pop RO Modern", cat: "Romanian", prompt: "urban pop românesc 2026, R&B trap light fusion, melodic hooks emoționale, voce smooth & auto-tune subtil, Andra Alina Eremia Killa Fonic Theo Rose style: vibe city romantic-urban, producție curată modernă, refrene catchy pentru streaming", bpm: 105, negativePrompt: "shout manele petrecere, folclor tradițional, orchestral symphony, rage rap" },
  { label: "Trap Pop Românesc", cat: "Romanian", prompt: "trap pop românesc 2026, melodic trap cu influențe pop, 808 bass + synth catchy, rap-singing blend, Nane Rava Rels B Killa Fonic style: flow românesc melodic, auto-tune pe hook, vibe stradal dar radio-friendly", bpm: 135, negativePrompt: "boom bap old school, manele accordion dominant, orchestral epic, smooth jazz" },
  { label: "Retro Manele Remix 90s-2000s", cat: "Romanian", prompt: "retro manele remix 2026, revival 90s-2000s manele clasice cu producție modernă, Nicolae Guță Adrian Copilul Minune remix style: voce nostalgică pasională, beat updatat club, refrene iconice reluate viral", bpm: 110, negativePrompt: "trap 808 agresiv, metal distortion, EDM big room drop, lo-fi chill" },
  { label: "Manele Drill Fusion", cat: "Romanian", prompt: "manele drill fusion 2026, sliding 808 + acordeon oriental, flow agresiv românesc peste drill beat, Rares Eazy Nane drill-manele style: mix rap dur + refren manea catchy, vibe stradal urban românesc dark", bpm: 142, negativePrompt: "pop glossy curat, folclor lent, orchestral strings, smooth R&B" },
  { label: "Etno Electronic RO", cat: "Romanian", prompt: "etno electronic românesc 2026, folclor reinterpretat electronic, cobză/violin peste synth și beat modern, Subcarpați Zdob și Zdub Damian Drăghici style: voce puternică etno, producție hybrid dance-electronic, energie alternativă festival", bpm: 125, negativePrompt: "manele synth pur, trap hi-hat spam, metal screaming, cheesy pop" },
  { label: "Melodic Rap Românesc", cat: "Romanian", prompt: "melodic rap românesc 2026, auto-tune melodic peste trap/pop beat, flow emoțional catchy, Killa Fonic Rava Ian style: voce înaltă melodică, refrene virale streaming, vibe urban tânăr românesc", bpm: 140, negativePrompt: "raw boom bap old school, manele shouts, orchestral epic, dark ambient" },
  { label: "Manele de Dragoste", cat: "Romanian", prompt: "manele love ballads, oriental ballad, slow tempo, romantic synth, sentimental lyrics, Nicolae Guță style: warm emotional voice, slow melancholic singing, long melodic phrases, intimate and romantic tone", bpm: 92, negativePrompt: "aggressive trap, metal, EDM drop, harsh screaming" },
  { label: "Manele Trap", cat: "Romanian", prompt: "manele trap, 808 bass, hi-hat rolls, oriental accordion, trap beats, Romanian urban, Rares Eazy style: mixed rap and singing, Romanian trap flow, auto-tune on hooks, urban delivery, manele verses and refrain", bpm: 135, negativePrompt: "orchestral symphony, smooth jazz, classical, reggae one-drop" },
  { label: "Manele de Petrecere", cat: "Romanian", prompt: "party manele, fast rhythm, high energy, accordion, drums, wedding or club, Florin Salam style: strong projected voice, energetic powerful singing, party shouts and refrains, festive delivery", bpm: 120, negativePrompt: "slow ballad, ambient drone, metal, dark trap" },
  { label: "Manele Orientale", cat: "Romanian", prompt: "oriental manele, Turkish Arabic influences, oriental synth, dance rhythm, exotic melody, Adrian Minune style: warm voice with oriental ornamentation, melisma and trills, expressive singing, oriental atmosphere", bpm: 110, negativePrompt: "trap 808 rolls, dubstep, EDM supersaw, metal distortion" },
  { label: "Muzică Populară", cat: "Romanian", prompt: "Romanian popular music, flute, violin, accordion, traditional rhythm, Romanian folk, Maria Tănase style: warm deep voice, traditional emotional singing, clear phrasing, nostalgic and authentic tone", bpm: 95, negativePrompt: "trap beats, EDM, metal, autotune, electronic drop" },
  { label: "Folclor", cat: "Romanian", prompt: "authentic Romanian folk, doina, violin, cobza, traditional rhythm, rural music, traditional Romanian taraf style: traditional instrumental and vocal, unprocessed voice, singing and virtuoso lăutari performance", bpm: 88, negativePrompt: "electronic production, trap 808, EDM, autotune, modern pop" },
  { label: "Doină", cat: "Romanian", prompt: "Romanian doina, violin, traditional music, sadness and longing, authentic folk, Maria Tănase Gică Petre style: melancholic voice, free rubato singing, ornamentation and glissando, emotion and longing", bpm: 72, negativePrompt: "four-on-the-floor kick, trap hats, EDM, metal, upbeat dance" },
  { label: "Muzică Lăutărească", cat: "Romanian", prompt: "Romanian lăutărească music, virtuoso violin, accordion, fast rhythm, party music, Gypsy style, traditional taraf style: singing and violin in dialogue, expressive voice, fast phrasing, party energy", bpm: 128, negativePrompt: "trap 808, dubstep, EDM drop, metal, autotune pop" },
  { label: "Taraf", cat: "Romanian", prompt: "Romanian taraf, lăutari orchestra, violin cobza accordion, wedding and party music, Romania and Moldova, traditional lăutari ensemble style: vocal-instrumental ensemble, voice and instruments intertwined, energetic collective performance", bpm: 125, negativePrompt: "electronic bass drop, trap, EDM, metal distortion" },
  { label: "Sârbă", cat: "Romanian", prompt: "Romanian sârbă, traditional dance, violin, accordion, fast rhythm, wedding music, lăutari style: fast rhythmic singing, voice and instruments for dance, shouts and refrain", bpm: 132, negativePrompt: "slow ballad, ambient, metal, trap 808" },
  { label: "Hora", cat: "Romanian", prompt: "Romanian hora, circle dance, violin, accordion, traditional rhythm, folk dance style: repetitive circular singing, clear voice for dance, short catchy phrases", bpm: 120, negativePrompt: "trap, dubstep, metal, EDM drop, dark ambient" },
  { label: "Brâu", cat: "Romanian", prompt: "Romanian brâu, traditional dance, characteristic rhythm, folk ensemble style: ensemble vocal, unison or choir singing, dance rhythm", bpm: 118, negativePrompt: "electronic drop, trap hats, metal, EDM supersaw" },
  { label: "Manele Etno Fusion", cat: "Romanian", prompt: "manele etno fusion 2026, oriental-folcloric modern, acordeon tradițional peste beat club, petrecere virală TikTok, Nelu Popa Florin Salam Subcarpați mix style: voce pasională puternică, refren exploziv catchy, influențe lăutărești cu synth și bass heavy", bpm: 122, negativePrompt: "trap pur fără etno, autotune robotic, metal distortion, slow doina melancolică" },
  { label: "Manele House Club", cat: "Romanian", prompt: "manele house club 2026, remix electronic petrecere, voce manea peste bass drop și four-on-the-floor, Sorinel Pustiu Vali Vijelie Connect-R club style: energie maximă club/wedding after, synth lead catchy, vibe festival românesc non-stop", bpm: 128, negativePrompt: "folclor acustic lent, ballad romantică, orchestral epic, jazz smooth" },
  { label: "Manele Viral TikTok", cat: "Romanian", prompt: "manele viral TikTok 2026, hituri scurte explozive, refrene pentru dans challenge, manele moderne cu beat rapid, Florin Salam Denis Spaniolu Misha Miller style: voce puternică hook addictiv, producție glossy scurtă, energie dans viral Reels/TikTok", bpm: 130, negativePrompt: "balade lungi introspective, folclor tradițional pur, metal screaming, ambient drone" },
  { label: "Pop Dance Românesc 2026", cat: "Romanian", prompt: "pop dance românesc 2026, hituri radio internaționale, synth upbeat catchy, female/male vocal strong & glossy, Inna Alexandra Stan Misha Miller Andra style: producție high-end export, refren viral dancefloor, vibe global radio-friendly", bpm: 124, negativePrompt: "manele oriental dominant, hard trap românesc, metal guitars, dark ambient" },
  { label: "Urban Pop RO Modern", cat: "Romanian", prompt: "urban pop românesc 2026, R&B trap light fusion, melodic hooks emoționale, voce smooth & auto-tune subtil, Andra Alina Eremia Killa Fonic Theo Rose style: vibe city romantic-urban, producție curată modernă, refrene catchy pentru streaming", bpm: 105, negativePrompt: "shout manele petrecere, folclor tradițional, orchestral symphony, rage rap" },
  { label: "Trap Pop Românesc", cat: "Romanian", prompt: "trap pop românesc 2026, melodic trap cu influențe pop, 808 bass + synth catchy, rap-singing blend, Nane Rava Rels B Killa Fonic style: flow românesc melodic, auto-tune pe hook, vibe stradal dar radio-friendly", bpm: 135, negativePrompt: "boom bap old school, manele accordion dominant, orchestral epic, smooth jazz" },
  { label: "Retro Manele Remix 90s-2000s", cat: "Romanian", prompt: "retro manele remix 2026, revival 90s-2000s manele clasice cu producție modernă, Nicolae Guță Adrian Copilul Minune remix style: voce nostalgică pasională, beat updatat club, refrene iconice reluate viral", bpm: 110, negativePrompt: "trap 808 agresiv, metal distortion, EDM big room drop, lo-fi chill" },
  { label: "Manele Drill Fusion", cat: "Romanian", prompt: "manele drill fusion 2026, sliding 808 + acordeon oriental, flow agresiv românesc peste drill beat, Rares Eazy Nane drill-manele style: mix rap dur + refren manea catchy, vibe stradal urban românesc dark", bpm: 142, negativePrompt: "pop glossy curat, folclor lent, orchestral strings, smooth R&B" },
  { label: "Etno Electronic RO", cat: "Romanian", prompt: "etno electronic românesc 2026, folclor reinterpretat electronic, cobză/violin peste synth și beat modern, Subcarpați Zdob și Zdub Damian Drăghici style: voce puternică etno, producție hybrid dance-electronic, energie alternativă festival", bpm: 125, negativePrompt: "manele synth pur, trap hi-hat spam, metal screaming, cheesy pop" },
  { label: "Melodic Rap Românesc", cat: "Romanian", prompt: "melodic rap românesc 2026, auto-tune melodic peste trap/pop beat, flow emoțional catchy, Killa Fonic Rava Ian style: voce înaltă melodică, refrene virale streaming, vibe urban tânăr românesc", bpm: 140, negativePrompt: "raw boom bap old school, manele shouts, orchestral epic, dark ambient" },
  { label: "Bătătură", cat: "Romanian", prompt: "Romanian bătătură, traditional dance, strong rhythm, folk, popular music style: strong rhythmic voice, singing for bătătură dance, energetic delivery", bpm: 130, negativePrompt: "trap 808, dubstep, smooth jazz, orchestral waltz" },
  { label: "Muzică de Nuntă", cat: "Romanian", prompt: "Romanian wedding music, lăutari, violin, accordion, party, dance, good vibes, taraf style: voice and orchestra for wedding, festive singing, shouts and greetings, party energy", bpm: 122, negativePrompt: "metal screaming, dark ambient, EDM drop, harsh industrial" },
  { label: "Muzică de Restaurant", cat: "Romanian", prompt: "Romanian restaurant music, light orchestra, violin accordion, well-known melodies, elegant atmosphere, easy listening style: warm pleasant voice, refined singing, elegant background tone", bpm: 95, negativePrompt: "trap, dubstep, metal, aggressive rap, EDM" },
  { label: "Muzică Ușoară Românească", cat: "Romanian", prompt: "Romanian easy listening, beautiful melody, orchestra, 70s 80s 90s, romanticism, Angela Similea Dan Spătaru style: warm romantic voice, melodious singing, clear phrasing, emotion and tenderness", bpm: 98, negativePrompt: "trap 808, metal, EDM drop, harsh screaming, dubstep" },
  { label: "Cântec Bătrânesc", cat: "Romanian", prompt: "Romanian old song, old Romanian music, nostalgia, violin accordion, traditional ballad, Maria Lătărețu style: mature emotional voice, storytelling singing, nostalgic tone, simple sincere delivery", bpm: 82, negativePrompt: "trap beats, EDM, metal, autotune, electronic" },
  { label: "Etno Românesc", cat: "Romanian", prompt: "Romanian etno, folk reinterpreted, traditional instruments with modern production, etno fusion, Subcarpați Zdob și Zdub style: strong modern voice, rock-etno energy singing, catchy refrains, alternative delivery", bpm: 128, negativePrompt: "smooth jazz, orchestral waltz, trap 808 spam, glossy pop" },
  { label: "Pop Românesc", cat: "Romanian", prompt: "Romanian pop modern, contemporary production, catchy melody, radio Romania, Inna Alexandra Stan style: clear radio-friendly voice, modern production singing, clear hooks, confident catchy delivery", bpm: 120, negativePrompt: "metal screaming, dark trap, orchestral epic, harsh distortion" },
  { label: "Rock Românesc", cat: "Romanian", prompt: "Romanian rock, electric guitar, Romanian lyrics, alternative rock, Phoenix Iris style: strong rock voice, emotional powerful singing, alternative delivery, introspective or energetic tone", bpm: 125, negativePrompt: "trap 808, reggae skank, smooth jazz, orchestral strings as lead" },
  { label: "Hip-Hop Românesc", cat: "Romanian", prompt: "Romanian hip hop, rap in Romanian, urban beat, street lyrics, BUG Mafia Paraziții style: clear flow in Romanian, confrontational or lyrical delivery, rhyme and wordplay, projected voice", bpm: 92, negativePrompt: "orchestral, EDM four-on-the-floor, smooth jazz, country" },
  { label: "Trap Românesc", cat: "Romanian", prompt: "Romanian trap, 808 bass, hi-hat rolls, rap in Romanian, Romanian urban, Nane Rava Rels B style: Romanian trap flow, auto-tune on melodies, cold or melodic delivery, hooks in Romanian", bpm: 138, negativePrompt: "orchestral symphony, jazz improvisation, reggae one-drop" },
  { label: "Muzică Balcanică", cat: "Romanian", prompt: "Balkan music, energetic rhythm, accordion, trumpet, Turkish and Greek influences, Balkan party, Goran Bregović style: strong Balkan voice, energetic festive singing, shouts and choirs, party delivery", bpm: 128, negativePrompt: "trap 808, dubstep, smooth jazz, dark ambient" },
  { label: "Muzică Orientală", cat: "Romanian", prompt: "Romanian oriental music, oriental synth, dance rhythm, Turkish influences, Adrian Minune style: warm voice with ornamentation, expressive oriental singing, melisma, dance atmosphere", bpm: 115, negativePrompt: "metal screaming, EDM drop, harsh industrial, dark trap" },
  { label: "Colinde", cat: "Romanian", prompt: "Romanian carols, Christmas music, choir, tradition, holiday atmosphere, carolers style: clean voice or choir, traditional carol singing, warm solemn tone", bpm: 88, negativePrompt: "trap beats, EDM, metal, aggressive rap, dubstep" },
  { label: "Cântec Patriotic", cat: "Romanian", prompt: "Romanian patriotic song, march, choir, orchestra, solemn, military fanfare style: choir or strong martial voice, solemn unified singing, grave delivery", bpm: 100, negativePrompt: "trap 808, EDM drop, reggae groove, autotune pop" },
  { label: "Indie / Alternativă România", cat: "Romanian", prompt: "Romanian alternative music, Romanian indie, guitar, modern production, Romanian lyrics, Coma The Mono style: introspective or experimental voice, alternative singing, personal delivery, contemplative tone", bpm: 108, negativePrompt: "trap hi-hat spam, EDM drop, metal screaming, cheesy pop chorus" },
    // ── House & Electronic ─────────────────────────────────────────────────────
  // Actualizat Martie 2026: prompturi revizuite + adăugiri noi bazate pe trenduri reale
  // (Afro House dominant, UKG/Speed Garage revival, Jazz fusion, Big Room comeback, Afro Tech etc.)
  // Sursa: Splice Sounds 2026, IMS Report, Beatport, Stereofox

  { label: "House", cat: "House & Electronic", prompt: "classic house 2026, four-on-the-floor kick, deep groovy bass, soulful synth stabs, Chicago roots meets modern polish, Frankie Knuckles Larry Heard influence: warm uplifting vibe, chopped vocal phrases or diva hooks, dancefloor essential timeless energy", bpm: 124, negativePrompt: "trap 808 slides, metal guitars, orchestral epic outside context, reggae one-drop, lo-fi cassette hiss" },

  { label: "Deep House", cat: "House & Electronic", prompt: "deep house 2026, warm sub bass, smooth hypnotic groove, atmospheric pads and chords, underground late-night feel, Kerri Chandler Moodymann modern style: soulful filtered vocals or instrumental layers, delayed effects, intimate club journey", bpm: 122, negativePrompt: "aggressive festival drops, trap hi-hat rolls, big room supersaw, harsh distortion, speed garage bounce" },

  { label: "Tech House", cat: "House & Electronic", prompt: "tech house 2026, driving bassline, minimal percussive groove, hypnotic loops, Fisher John Summit Fisher 2026 style: punchy tech rhythm, subtle vocal chops or talk-singing, repetitive hooks, club weapon focus, less melody more groove", bpm: 126, negativePrompt: "orchestral strings lead, smooth jazz piano, melodic emotional builds, reggae skank, country twang" },

  { label: "Dark Afro House", cat: "House & Electronic", prompt: "dark afro house 2026, massive deep sub-bass, four-on-the-floor kick, hypnotic tribal percussion shakers congas, dark atmospheric pads, minimal melody for lead space, warehouse ritual groove, mysterious underground vibe", bpm: 124, negativePrompt: "metal distortion, trap 808 dominance, EDM supersaw festival drop, harsh industrial noise" },

  { label: "Melodic House", cat: "House & Electronic", prompt: "melodic house 2026, emotional arpeggiated synths, progressive builds, atmospheric layers, euphoric cinematic drops, Tale Of Us Stephan Bodzin Afterlife style: ethereal vocal pads or soft processed vocals, emotional journey, no harsh leads", bpm: 122, negativePrompt: "harsh screaming, trap 808 spam, aggressive dubstep wobble, dark industrial, big room cheese" },

  { label: "Progressive House", cat: "House & Electronic", prompt: "progressive house 2026, long epic builds, layered melodic synths, anthemic breakdowns, festival mainstage energy, Deadmau5 Eric Prydz modern style: soaring leads, vocal chops in builds, emotional cinematic feel", bpm: 126, negativePrompt: "trap hi-hat triplets, reggae one-drop, smooth jazz chords, lo-fi bedroom chill, country" },

  { label: "Electro House", cat: "House & Electronic", prompt: "electro house 2026, heavy distorted bass drops, energetic synths, festival crowd hype, Dimitri Vegas Martin Garrix vintage-modern style: aggressive vocal chops, build-drop structure, high-energy shout-along", bpm: 128, negativePrompt: "smooth jazz pads, orchestral waltz, reggae groove, acoustic ballad, deep minimal" },

  { label: "Future House", cat: "House & Electronic", prompt: "future house 2026, metallic funky bass, groovy modern production, Don Diablo Tchami style: clean punchy drops, catchy vocal hooks, sing-along melodies, radio-friendly festival bounce", bpm: 126, negativePrompt: "classical orchestra, smooth jazz piano, country twang, dark ambient drone" },

  { label: "Tropical House", cat: "House & Electronic", prompt: "tropical house 2026, steel drums marimba vibes, laid-back sunny groove, Kygo Lost Frequencies style: soft relaxed vocals, melodic catchy hooks, summer chill-dance feel, no aggression", bpm: 110, negativePrompt: "aggressive trap, metal screaming, dubstep wobble, harsh industrial, dark ambient" },

  { label: "Slap House", cat: "House & Electronic", prompt: "slap house 2026, punchy slap bass, emotional vocal-driven drops, Imanbek Ofenbach style: powerful melodic vocals often female, sad-euphoric chorus, Portuguese house influence, club radio crossover", bpm: 122, negativePrompt: "metal distortion, harsh screaming, trap 808 spam, orchestral epic" },

  { label: "Bass House", cat: "House & Electronic", prompt: "bass house 2026, heavy distorted bass, aggressive club drops, DJ Snake Joyryde Jauz style: vocal growls and chops, impact-focused, minimal singing, raw energy", bpm: 128, negativePrompt: "smooth jazz, orchestral ballad, reggae one-drop, acoustic folk" },

  { label: "Funky House", cat: "House & Electronic", prompt: "funky house 2026, disco-funk samples, groovy bassline, retro-modern dancefloor, Daft Punk Basement Jaxx Jamiroquai influence: pitched filtered vocals, talk-box robotic feel, catchy groovy percussion", bpm: 124, negativePrompt: "metal screaming, dark trap, orchestral epic, harsh distortion" },

  { label: "UK Garage", cat: "House & Electronic", prompt: "UK garage 2026, 2-step shuffled rhythm, bass-heavy groove, soulful R&B vocals, Craig David Artful Dodger MJ Cole revival style: skippy beats, melodic hooks, British accent vibe, underground club energy", bpm: 132, negativePrompt: "metal distortion, orchestral epic, country twang, reggae one-drop" },

  { label: "Acid House", cat: "House & Electronic", prompt: "acid house 2026, squelchy Roland TB-303 basslines, psychedelic underground Chicago vibe, Phuture Larry Heard modern style: repetitive hypnotic loops, minimal sampled vocals, raw energy", bpm: 125, negativePrompt: "orchestral strings, smooth jazz, ballad, country, glossy pop chorus" },

  { label: "Minimal House", cat: "House & Electronic", prompt: "minimal house 2026, stripped-back hypnotic repetition, subtle groove focus, underground Berlin sound, Ricardo Villalobos Rhadoo style: sparse textures, no big drops, whispered chopped phrases", bpm: 124, negativePrompt: "big room festival drop, trap 808 dominance, orchestral epic, cheesy pop" },

  { label: "Organic House", cat: "House & Electronic", prompt: "organic house 2026, acoustic ethnic percussion bongos congas violin kalimba, deep meditative groove, WhoMadeWho Jan Blomqvist &ME style: soft breathy male vocals, indie-electronic intimate feel, organic textures", bpm: 120, negativePrompt: "harsh distortion, trap 808 spam, metal screaming, big room EDM drop" },

  { label: "Soulful House", cat: "House & Electronic", prompt: "soulful house 2026, gospel diva vocals, warm piano chords, emotional uplifting groove, Frankie Knuckles Masters at Work modern revival style: powerful soulful performance, feel-good dancefloor energy", bpm: 122, negativePrompt: "trap 808 dominance, metal guitars, EDM big room drop, harsh industrial" },

  { label: "Chicago House", cat: "House & Electronic", prompt: "classic Chicago house 2026, 808 drums organ stabs, raw warm original sound, Frankie Knuckles Ron Hardy influence: soulful diva vocals, piano stabs, vocal hooks timeless", bpm: 122, negativePrompt: "EDM supersaw drop, trap hi-hat spam, metal distortion, orchestral epic" },

  { label: "Afro House", cat: "House & Electronic", prompt: "afro house 2026, massive global surge, kwaito-influenced deep groove, tribal percussion log drum, soulful vocals, Black Coffee Keinemusik &Me Thandi Draai style: hypnotic rhythms, warm sub bass, dancefloor ritual energy, Splice Sound of the Year vibe", bpm: 120, negativePrompt: "big room supersaw drops, trap hats spam, harsh industrial, orchestral epic" },

  { label: "UK Garage Revival", cat: "House & Electronic", prompt: "UK garage revival 2026, phoenix rising, 2-step shuffled beats, heavy bass groove, soulful vocal chops, PinkPantheress salute MPH Holy Goof style: skippy rhythm, London underground energy, catchy melodic hooks, viral club weapon", bpm: 130, negativePrompt: "strict four-on-the-floor, trap 808 dominance, orchestral epic, dark ambient drone" },

  { label: "Speed Garage", cat: "House & Electronic", prompt: "speed garage 2026, fast rowdy UKG variant, aggressive basslines, hype vocal stabs, Bassline/Speed Garage style: pounding shuffled beats, club momentum, underground peak energy, viral TikTok/club weapon", bpm: 135, negativePrompt: "slow deep pads, melodic emotional builds, smooth jazz, acoustic folk" },

  { label: "Jazz House", cat: "House & Electronic", prompt: "jazz house 2026, melodic jazz fusion groove, rich chords live feel, no heavy drops, Kerri Chandler Moodymann Thandi Draai style: soulful piano/sax samples, warm sub bass, musical groove priority, late-night intimate vibe", bpm: 122, negativePrompt: "festival big room drops, trap hi-hats, aggressive bass, metal distortion" },

  { label: "Afro Tech", cat: "House & Electronic", prompt: "afro tech 2026, afro house meets tech, tribal percussion log drum, deep driving groove, Black Coffee &Me Keinemusik style: hypnotic rhythms, soulful vocals, global dancefloor energy, minimal leads", bpm: 124, negativePrompt: "pure four-on-the-floor, big room supersaw, orchestral strings, chill lo-fi" },

  { label: "Big Room House Revival", cat: "House & Electronic", prompt: "big room house revival 2026, massive festival drops, heavy bass, anthemic builds, Dimitri Vegas Martin Garrix vintage-modern style: crowd hype vocal chops, explosive energy, mainstage comeback roar", bpm: 128, negativePrompt: "minimal stripped loops, deep atmospheric pads, jazz improvisation, slow ballad" },

  { label: "Jersey Club House", cat: "House & Electronic", prompt: "jersey club house fusion 2026, stuttering kick patterns, bed squeak samples, high-energy bounce, Jersey/Berlin revival style: fast chopped vocals, groovy percussion, viral TikTok/club weapon hybrid", bpm: 140, negativePrompt: "smooth melodic pads, orchestral epic, trap 808 slides, ambient drone" },

  { label: "Desert House", cat: "House & Electronic", prompt: "desert house 2026, Middle Eastern exotic melodies, deep groovy house, Arodes Bedouin style: atmospheric ethnic percussion, warm synths, hypnotic cinematic desert vibe", bpm: 120, negativePrompt: "hard festival drops, trap hats spam, metal guitars, fast techno" },

  { label: "Melodic Techno", cat: "House & Electronic", prompt: "melodic techno 2026, emotional driving beats, atmospheric synths, progressive builds, Tale Of Us Afterlife Anyma style: cinematic layers, hypnotic groove, festival/underground crossover, soaring leads", bpm: 124, negativePrompt: "big room cheese, trap influence, harsh distortion, smooth jazz" },

  { label: "Hardgroove", cat: "House & Electronic", prompt: "hardgroove 2026, aggressive tech house variant, pounding basslines, raw club energy, European underground style: minimal yet forceful groove, industrial edge, warehouse weapon sound", bpm: 130, negativePrompt: "melodic emotional pads, jazz fusion, slow organic house, chill lo-fi" },
  // ── Rock & Metal ───────────────────────────────────────────────────────────
  // Creată Martie 2026 | Include revival-uri, modern metalcore, nu-metal, post-hardcore etc.
  { label: "Classic Rock", cat: "Rock & Metal", prompt: "classic rock, 70s-80s guitar-driven, powerful riffs, anthemic choruses, Led Zeppelin AC/DC Guns N' Roses style: raw energetic vocals, crunchy guitar tones, driving drums, timeless rock energy", bpm: 120, negativePrompt: "autotune, trap 808, EDM drop, orchestral strings, lo-fi chill" },
  { label: "Hard Rock", cat: "Rock & Metal", prompt: "hard rock, heavy distorted guitars, powerful vocals, arena energy, Van Halen Aerosmith Deep Purple style: high-energy guitar solos, raspy shouting vocals, pounding drums, classic hard rock attitude", bpm: 130, negativePrompt: "clean pop vocals, trap hats, reggae skank, ambient pads" },
  { label: "Alternative Rock", cat: "Rock & Metal", prompt: "alternative rock, 90s-2000s vibe, gritty guitars, introspective lyrics, Nirvana Radiohead Foo Fighters style: raw emotional delivery, dynamic quiet-loud shifts, melodic yet angsty", bpm: 110, negativePrompt: "polished autotune, trap beats, orchestral epic, smooth jazz" },
  { label: "Grunge", cat: "Rock & Metal", prompt: "grunge, dirty distorted guitars, raw emotional vocals, Seattle sound, Nirvana Alice in Chains Soundgarden style: sludgy riffs, anguished singing, flannel-era attitude, heavy yet melodic", bpm: 105, negativePrompt: "clean production, synth leads, EDM four-on-the-floor, cheerful pop" },
  { label: "Post-Grunge", cat: "Rock & Metal", prompt: "post-grunge, early 2000s radio rock, melodic choruses, heavy guitars, Nickelback Creed Staind style: emotional mid-tempo rock, powerful belted choruses, introspective verses", bpm: 100, negativePrompt: "aggressive screaming, trap 808, orchestral, lo-fi chill" },
  { label: "Nu-Metal", cat: "Rock & Metal", prompt: "nu-metal, 90s-2000s rap-rock fusion, downtuned guitars, aggressive rapping, Linkin Park Limp Bizkit Korn style: mix of rapping and screaming, heavy groovy riffs, angsty lyrics", bpm: 105, negativePrompt: "clean singing only, orchestral, smooth jazz, reggae groove" },
  { label: "Metalcore", cat: "Rock & Metal", prompt: "metalcore, breakdown-heavy, screamed verses clean choruses, melodic riffs, Bring Me the Horizon Architects Killswitch Engage style: intense breakdowns, dual vocals, modern production, emotional hooks", bpm: 140, negativePrompt: "trap hats, autotune pop, orchestral symphony, chill lo-fi" },
  { label: "Modern Metalcore", cat: "Rock & Metal", prompt: "modern metalcore 2025-2026, djent-influenced, electronic elements, clean-scream dynamics, Bad Omens Sleep Token Spiritbox style: atmospheric synths, heavy djent riffs, ethereal cleans, intense screams", bpm: 150, negativePrompt: "classic rock guitar solo, trap 808 dominance, smooth R&B" },
  { label: "Deathcore", cat: "Rock & Metal", prompt: "deathcore, brutal breakdowns, pig squeals, guttural vocals, heavy blast beats, Lorna Shore Slaughter to Prevail style: crushing low-tuned guitars, extreme aggression, symphonic elements", bpm: 160, negativePrompt: "melodic singing, pop hooks, jazz improvisation, chill vibes" },
  { label: "Progressive Metal", cat: "Rock & Metal", prompt: "progressive metal, complex riffs, odd time signatures, virtuosic solos, Dream Theater Opeth Tool style: technical instrumentation, long compositions, atmospheric shifts, intricate vocals", bpm: 110, negativePrompt: "simple 4/4 beats, trap hi-hats, autotune, EDM drop" },
  { label: "Heavy Metal", cat: "Rock & Metal", prompt: "classic heavy metal, galloping riffs, powerful high-pitched vocals, Iron Maiden Judas Priest Black Sabbath style: twin guitar harmonies, epic storytelling, leather-and-studs energy", bpm: 140, negativePrompt: "screamo, rap verses, synthwave, lo-fi chill" },
  { label: "Thrash Metal", cat: "Rock & Metal", prompt: "thrash metal, fast aggressive riffs, rapid drumming, angry vocals, Metallica Slayer Megadeth style: high-speed palm-muted riffs, raw thrash energy, anti-establishment lyrics", bpm: 180, negativePrompt: "slow ballad, clean vocals, orchestral, reggae skank" },
  { label: "Power Metal", cat: "Rock & Metal", prompt: "power metal, epic fantasy themes, soaring vocals, fast galloping drums, DragonForce Sabaton Helloween style: symphonic elements, uplifting choruses, heroic high-pitched singing", bpm: 160, negativePrompt: "downtuned brutality, trap beats, autotune, dark ambient" },
  { label: "Black Metal", cat: "Rock & Metal", prompt: "black metal, tremolo picking, shrieking vocals, atmospheric cold sound, Emperor Mayhem Darkthrone style: raw lo-fi production, icy atmosphere, anti-religious themes", bpm: 170, negativePrompt: "clean production, melodic hooks, pop chorus, smooth jazz" },
  { label: "Death Metal", cat: "Rock & Metal", prompt: "death metal, guttural growls, technical riffs, blast beats, Cannibal Corpse Morbid Angel Death style: brutal low-tuned aggression, complex drumming, horror-themed lyrics", bpm: 200, negativePrompt: "melodic singing, trap influence, orchestral epic, chill vibes" },
  { label: "Doom Metal", cat: "Rock & Metal", prompt: "doom metal, slow heavy riffs, melancholic atmosphere, Candlemass Electric Wizard Sleep style: crushing slow tempos, deep growls or clean haunting vocals, stoner-doom vibes", bpm: 70, negativePrompt: "fast thrash, high-energy pop, EDM drop, autotune" },
  { label: "Stoner Rock", cat: "Rock & Metal", prompt: "stoner rock, fuzzy heavy riffs, groovy desert rock, Kyuss Queens of the Stone Age Fu Manchu style: laid-back yet heavy groove, psychedelic vibes, fuzzy guitar tones", bpm: 100, negativePrompt: "screaming vocals, blast beats, trap 808, orchestral" },
  { label: "Post-Hardcore", cat: "Rock & Metal", prompt: "post-hardcore, emotional screams, melodic choruses, dynamic shifts, Refused At the Drive-In Thrice style: intense energy, poetic lyrics, mix of aggression and melody", bpm: 140, negativePrompt: "clean pop production, trap beats, smooth jazz, ambient drone" },
  { label: "Emo / Pop-Punk Revival", cat: "Rock & Metal", prompt: "emo pop-punk revival 2025-2026, emotional lyrics, catchy choruses, My Chemical Romance Fall Out Boy Paramore style: nostalgic 2000s energy, heartfelt singing, driving guitars", bpm: 160, negativePrompt: "brutal metal growls, trap hi-hats, orchestral symphony" },
  { label: "Industrial Metal", cat: "Rock & Metal", prompt: "industrial metal, mechanical beats, distorted guitars, aggressive electronics, Rammstein Nine Inch Nails Ministry style: heavy synths, pounding rhythms, confrontational vocals", bpm: 130, negativePrompt: "clean acoustic, smooth R&B, jazz improvisation, chill lo-fi" },
  // ── Reggae / Reggaeton / Dembow / Latin Urbano ─────────────────────────────
  // Redenumit din Dembow → Reggae (Martie 2026) | 21 subgenuri
  { label: "Dembow", cat: "Reggae", prompt: "dembow, Dominican urban music, syncopated rhythm, reggaeton influence, Caribbean bass, street sound, El Alfa style: strong Dominican voice, fast energetic flow, shouts and ad-libs, festive delivery, mixed singing and rap", bpm: 108, negativePrompt: "orchestral symphony, smooth jazz, metal distortion, EDM four-on-the-floor" },
  { label: "Reggaeton", cat: "Reggae", prompt: "reggaeton, dembow rhythm, perreo, urban Latino, 808 bass, Spanish rap, Puerto Rico sound, Daddy Yankee Don Omar style: strong baritone voice, classic reggaeton flow, melodic hooks, confident delivery, perreo energy", bpm: 92, negativePrompt: "metal screaming, orchestral epic, smooth jazz, country, EDM drop" },
  { label: "Perreo", cat: "Reggae", prompt: "perreo, sensual reggaeton, dembow beat, slow grinding rhythm, urban Latino, club dance, Bad Bunny J Balvin style: relaxed or melodic voice, sensual singing, perreo flow, auto-tune on hooks, club delivery", bpm: 92, negativePrompt: "metal distortion, aggressive screaming, orchestral, dark ambient" },
  { label: "Hyper-Fast Dembow 150+", cat: "Reggae", prompt: "hyper-fast dembow 150+ BPM 2026, turbo speed rhythm, aggressive rapid-fire percussion, El Alfa late era Chimbala Shadow Blow style: high-energy shouts, fast Dominican flow, viral TikTok dance challenge, non-stop club adrenaline, heavy bass drops", bpm: 152, negativePrompt: "slow perreo, romantic ballad, orchestral strings, smooth jazz, chill lo-fi" },
  
  { label: "Nu-Metalcore / Trap-Metal 2.0", cat: "Rock & Metal", prompt: "nu-metalcore trap-metal 2.0 2026, heavy riffs meets trap/R&B/pop influence, sultry cleans + crushing breakdowns, Spiritbox Bad Omens Sleep Token style: emotional melodic choruses, aggressive verses, modern production glossy yet heavy, baddiecore crossover vibe", bpm: 140, negativePrompt: "pure old-school nu-metal, raw thrash, orchestral epic, slow doom" },

  { label: "Djent / Prog Metalcore", cat: "Rock & Metal", prompt: "djent prog metalcore 2026, polyrhythmic low-tuned riffs, complex grooves, technical breakdowns, Periphery Meshuggah modern influence style: progressive structures, soaring cleans + heavy djent chugs, atmospheric layers, genre-pushing virtuosity", bpm: 130, negativePrompt: "simple 4/4 rock, melodic pop hooks, trap 808 dominance, smooth jazz" },

  { label: "Hyperpop Metal / Glitch Metal", cat: "Rock & Metal", prompt: "hyperpop metal glitch metal 2026, chaotic glitchy production meets heavy riffs, high-pitched distorted vocals, 100 gecs metal hybrid style: noisy electronic layers, stuttering effects, emo/aggressive delivery, underground viral internet fusion", bpm: 145, negativePrompt: "clean melodic singing, orchestral symphony, slow atmospheric, traditional thrash" },

  { label: "Post-Black Metal / Atmospheric Black", cat: "Rock & Metal", prompt: "post-black metal atmospheric black 2026, shoegaze-infused black metal, dreamy walls of sound, emotional intensity, Deafheaven Alcest modern style: reverb-heavy guitars, soaring cleans + shrieks, cinematic atmosphere, accessible yet raw post-black vibe", bpm: 150, negativePrompt: "brutal raw black metal, fast thrash blasts, trap influence, pop chorus" },
  { label: "Rkt 2026 / Turra Agresiva", cat: "Reggae", prompt: "rkt 2026 turra agresiva, fast Argentine dembow evolution, heavy bass aggressive bounce, La Joaqui Callejero Fino L-Gante remix style: provocative energetic female/male flow, party chants raw, TikTok viral street energy, trap-influenced hooks", bpm: 105, negativePrompt: "slow romantic reggaeton, melodic autotune heavy, orchestral epic, smooth R&B crooning" },
  { label: "Afro-Dembow / Afro-Perreo", cat: "Reggae", prompt: "afro-dembow afro-perreo 2026, afrobeats percussion meets dembow rhythm, log drum tribal groove, Burna Boy Rema MHD fusion style: melodic African-Latin singing mixed with rap, danceable global crossover, catchy hooks, sensual yet energetic perreo vibe", bpm: 110, negativePrompt: "pure trap 808 dominance, metal screaming, orchestral symphony, slow emo rap" },
  { label: "Afro-Latin Fusion", cat: "Reggae", prompt: "afro-latin fusion 2026, African rhythms + reggaeton/dembow hybrid, heavy percussion log drum, global dance vibe, Peso Pluma Burna Boy Feid influence: melodic hooks, percussive groove, crossover energy, festival/street party sound", bpm: 105, negativePrompt: "dark trap metal, orchestral epic, boom bap raw, ambient drone" },
  { label: "Dembow Dominicano", cat: "Reggae", prompt: "Dominican dembow, Dominican Republic urban, fast dembow rhythm, street rap, Caribbean energy, El Alfa Tokischa style: strong expressive voice, fast Dominican flow, shouts and ad-libs, provocative delivery", bpm: 108, negativePrompt: "smooth jazz, orchestral waltz, EDM supersaw, country" },
  { label: "Mambo Urbano", cat: "Reggae", prompt: "mambo urbano, mambo meets reggaeton, brass section, dembow rhythm, Latin urban fusion, Marc Anthony style: strong salsa voice, powerful singing with trillo, romantic Latin delivery, belting and melisma", bpm: 100, negativePrompt: "trap 808 spam, metal screaming, dark ambient, EDM drop" },
  { label: "Dancehall", cat: "Reggae", prompt: "dancehall, Jamaican rhythm, reggae influence, digital riddim, Caribbean energy, Vybz Kartel Popcaan style: toasting and sing-jay, Jamaican accent, fast rhythmic flow, ad-libs and patois, aggressive or melodic delivery", bpm: 95, negativePrompt: "orchestral symphony, smooth jazz ballad, metal screaming, EDM drop" },
  { label: "Reggaeton Romántico", cat: "Reggae", prompt: "reggaeton romántico, romantic Spanish lyrics, smooth dembow, sensual vibes, Bad Bunny style: warm romantic voice, melodic singing, slow intimate flow, light auto-tune, emotional delivery", bpm: 88, negativePrompt: "aggressive metal, harsh screaming, EDM drop, dark industrial" },
  { label: "Trap Latino", cat: "Reggae", prompt: "trap latino, Spanish trap, 808 bass, dembow influence, urban Latin, Anuel AA style: deep or auto-tune voice, trap flow in Spanish, cold street delivery, melodic hooks", bpm: 140, negativePrompt: "orchestral, smooth jazz, reggae one-drop, country" },
  { label: "Cumbia Urbana", cat: "Reggae", prompt: "cumbia urbana, cumbia meets reggaeton, Colombian urban, accordion, dembow rhythm, Silvestre Dangond style: warm Colombian voice, vallenato-cumbia singing, romantic or festive delivery, clear melody", bpm: 95, negativePrompt: "metal distortion, EDM drop, harsh industrial, orchestral epic" },
  { label: "Reggaeton Chileno", cat: "Reggae", prompt: "reggaeton chileno 2025-2026, Chilean urban reggaeton, street flow, viral perreo, FloyyMenor Cris MJ Julianno Sosa style: Chilean accent, catchy hooks, modern crisp production, high energy party vibe", bpm: 94, negativePrompt: "slow ballad, orchestral, trap metal, smooth jazz" },
  { label: "Reggaeton Mexa", cat: "Reggae", prompt: "reggaeton mexa, Mexican reggaeton wave 2025, urban Mexicano sound, heavy bass, El Malilla Santa Fe Klan Alemán style: Mexican slang flow, street bravado, trap-reggaeton fusion, confident delivery", bpm: 100, negativePrompt: "classic 2000s dembow, bachata guitar, orchestral epic, dark ambient" },
  { label: "Neoperreo", cat: "Reggae", prompt: "neoperreo 2026, dark experimental reggaeton, atmospheric perreo, stripped dembow, Tomasa del Real Kelman Duran style: distorted futuristic vocals, underground club aesthetic, gender-fluid rebellious vibe", bpm: 88, negativePrompt: "bright pop reggaeton, upbeat festival, orchestral, cheesy hooks" },
  { label: "Rkt", cat: "Reggae", prompt: "rkt argentino, cumbia 420 meets reggaeton, fast dembow, party remix energy, L-Gante Homer el Mero Mero style: Argentine slang, street party flow, repetitive catchy hooks, high energy delivery", bpm: 100, negativePrompt: "slow perreo, romantic bachata, trap 808 dominance, metal" },
  { label: "Turra", cat: "Reggae", prompt: "turra rkt, aggressive fast Argentine dembow, heavy bass, street party, La Joaqui Callejero Fino style: fast Argentine female flow, provocative energetic delivery, party chants, raw street vibe", bpm: 102, negativePrompt: "slow romantic reggaeton, orchestral strings, smooth R&B, jazz" },
  { label: "Reggaeton Old School", cat: "Reggae", prompt: "old school reggaeton 2000s revival 2026, classic dembow riddim, raw underground, Daddy Yankee early style: classic flow, raw vocals, party energy, minimal autotune", bpm: 95, negativePrompt: "modern trap reggaeton, heavy 808 slides, heavy autotune, edm drop" },
  { label: "Afro-Reggaeton", cat: "Reggae", prompt: "afro reggaeton 2026, afrobeats meets reggaeton, African percussion, dancehall fusion, Burna Boy Rema Feid style: melodic singing, global African-Latin rhythm, catchy hooks, danceable crossover vibe", bpm: 100, negativePrompt: "dark trap metal, orchestral epic, slow emo rap, ambient drone" },
  { label: "Sandungueo", cat: "Reggae", prompt: "sandungueo, sensual perreo intenso, classic reggaeton groove, heavy dembow, Ivy Queen Tego Calderón style: sensual confident vocals, grinding rhythm, club perreo energy, powerful delivery", bpm: 90, negativePrompt: "fast 2026 dembow, trap influence, metal guitars, orchestral" },
  { label: "Electro-Reggaeton", cat: "Reggae", prompt: "electro reggaeton 2026, Latin electronic fusion, synth drops, festival reggaeton, Alok Deorro Latin electronic style: vocal chops, build-drop energy, electronic-Latin hybrid, party anthem feel", bpm: 110, negativePrompt: "acoustic bachata, slow romantic, jazz swing, dark trap" },
  { label: "Dembow Hard", cat: "Reggae", prompt: "hard dembow 2026, fast aggressive rhythm, heavy dembow kick, street dembow, Tokischa Rochy RD style: raw energetic shouting, fast Dominican flow, provocative lyrics, club street energy", bpm: 110, negativePrompt: "slow reggaeton, romantic bachata, smooth salsa, trap 808" },
  { label: "Dembow Moderno 2026", cat: "Reggae", prompt: "modern dembow 2025-2026, crisp production, heavy bass, viral hooks, El Alfa Chimbala Shadow Blow style: high energy Dominican vocals, fast flow, party shouts, current urban Dominican sound", bpm: 115, negativePrompt: "old school 2000s reggaeton, slow perreo, bachata guitar, trap hats" },
  
  // ── Afrobeats / Afropop ────────────────────────────────────────────────────────
// Actualizat Martie 2026: dominant global, Amapiano fusion masiv, log drum mai subtil în mainstream, artiști noi + crossover cu Afro-house / pop
{ label: "Afrobeats", cat: "Afrobeats / Afropop", prompt: "afrobeats 2026, infectious groovy percussion, log drum tuned bass, upbeat danceable rhythms, soulful melodic vocals, global party energy, Wizkid Burna Boy Rema Asake Tyla Davido style: catchy multilingual hooks, high-life guitar licks or shimmering synths, celebratory uplifting vibe, streaming radio crossover shine", bpm: 108, negativePrompt: "dark trap 808 slides, aggressive rage screams, orchestral epic without groove, boom bap raw drums, metal distortion" },
{ label: "Amapiano Fusion", cat: "Afrobeats / Afropop", prompt: "amapiano afrobeats fusion 2026, deep rolling log drums, warm piano chords, hypnotic South African-Nigerian groove, soulful vocal chops, Kabza De Small DJ Maphorisa Asake Davido Tyla style: laid-back yet infectious bounce, atmospheric pads, jazzy subtle elements, township-to-global dancefloor ritual", bpm: 113, negativePrompt: "fast trap hi-hat triplets, hyperpop glitch chaos, heavy metal guitars, slow ambient drone, pure reggaeton dembow" },
{ label: "Afro-fusion Pop", cat: "Afrobeats / Afropop", prompt: "afro-fusion pop 2026, afrobeats meets mainstream pop/R&B, polished glossy production, emotional or party melodic hooks, Tyla Ayra Starr Qing Madi Seyi Vibez Rema style: smooth auto-tune touches, tropical percussion layers, major key uplift, viral TikTok/Reels ready crossover sound", bpm: 105, negativePrompt: "dark phonk cowbell, drill sliding 808 aggression, lo-fi vinyl crackle, orchestral symphony heavy" },
{ label: "Afro House Crossover", cat: "Afrobeats / Afropop", prompt: "afro house 2026, four-on-the-floor kick meets afrobeats percussion, deep sub bass, hypnotic tribal grooves, soulful vocals or chants, Black Coffee Keinemusik &Me Tyla Burna Boy influence: warm organic textures, congas shakers log drum hybrid, uplifting yet deep warehouse / festival energy", bpm: 120, negativePrompt: "trap hi-hat spam, big room supersaw drops, harsh industrial noise, pure trap 808 dominance" },
{ label: "Alté / Soulful Afrobeats", cat: "Afrobeats / Afropop", prompt: "alté soulful afrobeats 2026, slower mid-tempo groove, introspective emotional vocals, R&B funk lo-fi influences, Odunsi Cruel Santino Lady Donli Fireboy DML Omah Lay style: minimalist production, nostalgic textures, conversational delivery, heartfelt storytelling over groovy bass", bpm: 100, negativePrompt: "high-energy festival drops, aggressive rage elements, hyperpop maximalism, fast jungle breaks" },
{ label: "Naija Street Afrobeats", cat: "Afrobeats / Afropop", prompt: "naija street afrobeats 2026, raw energetic Lagos street vibe, punchy percussion, catchy slang-heavy hooks, Shoday Ayo Maff Zerry DL Famous Pluto style: youthful confident delivery, viral challenge energy, gritty yet melodic, club and TikTok weapon", bpm: 110, negativePrompt: "smooth orchestral pads, deep ambient chill, metal distortion, slow doina melancholy" },
];

// ── Default Category Metadata ──────────────────────────────────────────────────
// Folosit pentru UI: iconițe, culori tematice, descrieri scurte, ordine în dropdown etc.
// Extins Martie 2026 cu trenduri reale (rock/metal revival, indie surge, pop dominant etc.)
const DEFAULT_CAT_META = {
  "Hip-Hop": {
    lm_negative_prompt: "orchestral symphony, smooth jazz, four-on-the-floor EDM, cheesy pop chorus, country twang",
    bpm: 0,
    instrumental: false,
    // Visual metadata
    icon: "🎤🔥",
    color: "#c77dff",          // mov energic, urban/rap vibe
    description: "De la boom bap clasic la trap rage, melodic, drill, phonk și jerk – 808 heavy, flows agresive sau emoționale, underground la mainstream.",
    featuredArtists: "Playboi Carti, Travis Scott, 21 Savage, Glokk40Spaz, Osamason, Killa Fonic, Rava",
    order: 1,
  },
  "Romanian": {
    lm_negative_prompt: "trap 808 dominance, dubstep, metal distortion, EDM drops, autotune pop",
    bpm: 0,
    instrumental: false,
    // Visual metadata
    icon: "🇷🇴🎶",
    color: "#ff4757",          // roșu pasional românesc
    description: "Manele etno/house/viral, trap pop RO, melodic rap românesc, folclor modern, muzică de petrecere/nuntă – de la stradal la radio-friendly.",
    featuredArtists: "Florin Salam, Killa Fonic, Rava, Ian, Andra, Inna, Connect-R",
    order: 2,
  },
  "Rock & Metal": {
    lm_negative_prompt: "trap 808 dominance, autotune pop, EDM drops, smooth jazz ballad, lo-fi chill, orchestral waltz outside symphonic metal",
    bpm: 0,
    instrumental: false,
    // Visual metadata
    icon: "🎸🤘",
    color: "#e63946",          // roșu intens rock/metal
    description: "Revival masiv 2026: alternative rock, nu-metal nostalgia, post-hardcore, industrial metal, shoegaze, hybrid cu electronic/hip-hop.",
    featuredArtists: "Bring Me The Horizon, Sleep Token, Spiritbox, Bad Omens, Gojira, Korn revival wave",
    order: 3,
  },
  "House & Electronic": {
    lm_negative_prompt: "metal guitars, trap hats, rap vocals, orchestral, reggae one-drop, lo-fi cassette",
    bpm: 0,
    instrumental: false,
    // Visual metadata
    icon: "🔊🎧",
    color: "#06d6a0",          // verde fresh, dance/electronic energy
    description: "Four-on-the-floor grooves, deep house, tech house, afro house, melodic techno, UKG revival, bass house – festival la underground.",
    featuredArtists: "Black Coffee, Fisher, Tale Of Us, Keinemusik, &ME, salute, Kordhell",
    order: 4,
  },
  "Reggae": {
    lm_negative_prompt: "metal, rock distortion, orchestral symphony, jazz swing, ambient drone",
    bpm: 0,
    instrumental: false,
    // Visual metadata
    icon: "🇯🇲",
    color: "#118ab2",
    description: "Reggaeton, dembow, dancehall",
    featuredArtists: "Daddy Yankee, El Alfa, Vybz Kartel",
    order: 5,
  },
  "default": {
    icon: "🎵",
    color: "#8888aa",
    description: "Gen variat – alege un preset sau explorează!",
    featuredArtists: "",
    order: 999,
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
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ── Clean Temp Files ──────────────────────────────────────────────────────
  const [cleaningTemp, setCleaningTemp] = useState(false);
  const [cleanResult, setCleanResult] = useState(null);

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
  ];

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
      if (data?.genres && typeof data.genres === "object" && Object.keys(data.genres).length > 0) {
        setGenrePresetsData(data);
        setGenreCatFull((prev) => prev || Object.keys(data.genres)[0]);
      } else {
        setGenrePresetsData({ version: 1, genres: {} });
      }
    };

    fetch(`${API}/acestep_genre_presets`, { signal: controller.signal })
      .then((r) => r.json())
      .then(applyData)
      .catch(() => {
        // Fallback: încarcă din fișierul static (frontend/public/presetmanager.json)
        fetch("/presetmanager.json")
          .then((r) => (r.ok ? r.json() : Promise.reject()))
          .then(applyData)
          .catch(() => {
            clearTimeout(timeoutId);
            setGenrePresetsLoading(false);
            setGenrePresetsData({ version: 1, genres: {} });
          });
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

  const S = {
    card: { background: "linear-gradient(135deg,#0d0d22,#0a0a1a)", border: "1px solid #1e1e3a", borderRadius: 12, padding: 18, marginBottom: 14 },
    label: { color: "#6666aa", fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, display: "block" },
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Preset Manager Modal */}
      <PresetManager
        open={showPresets}
        onClose={() => setShowPresets(false)}
        currentSettings={currentSettings}
        onLoad={handleLoadPreset}
      />

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 6 }}>🎵</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#e0e0ff", marginBottom: 4, letterSpacing: 1 }}>ACE-Step v1.5</div>
        <div style={{ color: "#444466", fontSize: 13 }}>Generate complete songs from text — beats SUNO in quality</div>

        {/* Status badge */}
        <div style={{ marginTop: 10, display: "flex", justifyContent: "center", gap: 8, alignItems: "center" }}>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* LEFT */}
        <div>

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
                  🎚 PRESETS BY GENRE (FULL) — caption + negative prompt + BPM (JSON genres + built-in)
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
                <div style={{ color: "#6666aa", fontSize: 11 }}>Loading presets from backend...</div>
              )}
              {!genrePresetsLoading && genrePresetsData && (!genrePresetsData.genres || Object.keys(genrePresetsData.genres).length === 0) && (
                <div style={{ color: "#8888aa", fontSize: 11 }}>
                  Full genres (BPM etc.) could not be loaded. Start the backend or click Reload. Built-in presets are available below.
                </div>
              )}
              {(() => {
                const EXCLUDED_GENRE_KEYS = ["EDM", "Hip Hop", "Hip-Hop", "Pop", "Classical", "Afrobeat", "Instrumental", "Other"];
const apiGenres = genrePresetsData?.genres || {};
const filteredApiGenres = Object.fromEntries(
  Object.entries(apiGenres).filter(([k]) => !EXCLUDED_GENRE_KEYS.includes(k))
);
const allGenres = { ...filteredApiGenres, ...QUICK_GENRES };
                const genreKeys = Object.keys(allGenres);
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
                    
                    {/* Category Info Card with metadata */}
                    {(() => {
                      const meta = getCategoryMeta(currentGenre);
                      return (
                        <div style={{
                          marginTop: 12,
                          padding: 12,
                          background: `${meta.color}22`,
                          border: `1px solid ${meta.color}44`,
                          borderRadius: 8,
                          marginBottom: 12,
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 24 }}>{meta.icon}</span>
                            <div>
                              <div style={{ color: meta.color, fontSize: 14, fontWeight: 700 }}>
                                {currentGenre}
                              </div>
                              <div style={{ color: "#6666aa", fontSize: 12 }}>
                                {meta.description}
                              </div>
                            </div>
                          </div>
                          {meta.featuredArtists && (
                            <div style={{ color: "#444466", fontSize: 11, fontFamily: "monospace" }}>
                              🎧 Ex: {meta.featuredArtists}
                            </div>
                          )}
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


            {/* CoT Controls */}
            {taskType !== "custom" && (
              <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 8, background: "#07071a", border: "1px solid #1a1a3a" }}>
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
            </div>
          </div>

        </div>

        {/* RIGHT */}
        <div>

          {/* Generation Settings */}
          <div style={S.card}>
            <span style={S.label}>⚙ Generation Settings</span>

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
                  max="20" 
                  step="0.5"
                  value={guidanceScale} 
                  onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
                  style={{ flex: 1 }} 
                />
                <input 
                  type="number" 
                  min="1" 
                  max="20" 
                  step="0.5"
                  value={guidanceScale} 
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= 1 && val <= 20) {
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
                {[3, 5, 7, 9, 12].map(v => (
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
              {processing ? `⚙ ${progressLabel || "Generating..."}` : "🎵 Generate with ACE-Step"}
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
      </div>

      {/* ════════════════════���══════════════════════════════════════════════
          Advanced Settings Panel
          Based on ACE-Step v1.5 API documentation
      ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ marginTop: 20 }}>
        <button
          onClick={() => setShowAdvanced(v => !v)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(135deg, #0d0d22, #0a0a1a)",
            border: "1px solid #2a2a4a",
            borderRadius: showAdvanced ? "12px 12px 0 0" : 12,
            padding: "14px 18px",
            cursor: "pointer",
            color: "#8888aa",
            transition: "all 0.2s",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 10 }}>
            <span>⚙️</span> Advanced Settings
          </span>
          <span style={{ fontSize: 14, transition: "transform 0.2s", transform: showAdvanced ? "rotate(180deg)" : "none" }}>▼</span>
        </button>

        {showAdvanced && (
          <div style={{
            background: "linear-gradient(180deg, #0a0a1a, #080812)",
            border: "1px solid #2a2a4a",
            borderTop: "none",
            borderRadius: "0 0 12px 12px",
            padding: 20,
          }}>
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
        )}
      </div>

    </div>
  );
}
