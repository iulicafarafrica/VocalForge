## Qwen Added Memories
- Proiectul meu principal este bazat pe Ace-step v1.5.
- Proiect Principal: VocalForge v1.7 - AI Music Production Application
- Hardware: NVIDIA RTX 3070 8GB VRAM, CUDA 11.8, PyTorch cu suport CUDA
- ACE-Step Models: turbo (8 steps), turbo-shift3 (8 steps), base (50 steps, all features), sft (50 steps, high quality), turbo-rl (8 steps, RL optimized - not released)
- VocalForge Features Active: ACE-Step Music Generation (Text-to-Music, Audio Cover), Repaint/Lego/Complete, Stem Separation (Demucs), BPM/Key Detection, Genre Presets (50+ genuri), Seed Library, Tracks Management, Models Tab (GPU info), Notes Tab, Advanced Settings (LM params, audio format, batch size), Windows Terminal startup (3 tabs colorate)
- VocalForge TODO - Features de adăugat: (1) Audio Understanding - extrage BPM/Key/Time Signature din audio, (2) Vocal2BGM - transformă vocal în piesă completă, (3) Multi-Track Layering - adaugă straturi instrumentale, (4) LRC Generation - versuri cu timestamps, (5) Copy Melody - copiază pattern-uri melodice din reference audio
- VocalForge Languages: Vocal languages (EN, RO, ES, AR, EL, Unknown), UI în Engleză conform cerinței output-language.md
- VocalForge API Integration: Backend pe port 8000 (FastAPI), ACE-Step API pe port 8001, Frontend React pe port 3000, START_ALL.bat pornește toate serviciile în Windows Terminal
