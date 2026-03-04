# VocalForge - GitHub Backup Guide

## Ce conține backup-ul

Backup-ul include **doar codul sursă** (~130 MB):
- `frontend/` - Interfața web
- `backend/` - Codul Python (fără modele)
- `core/` - Modulele principale
- `tests/` - Teste
- `*.bat` - Scripturi de pornire
- `requirements.txt`, `package.json` - Dependențe
- `.gitignore` - Configurare Git

## Ce NU conține backup-ul

Următoarele se descarcă/instalează separat:
- `ace-step/` - Se clonează de pe GitHub
- `models/`, `uvr_models/` - Modele AI downloadabile
- `venv/` - Se creează cu `python -m venv venv`
- `node_modules/` - Se instalează cu `npm install`
- `.env` - Configurație locală (secrete)

---

## Metoda 1: Backup cu scriptul (Recomandat)

### Creare backup:
```bash
# Rulează din folderul VocalForge
backup_to_github.bat
```

Acesta va crea un ZIP pe **Desktop** cu toate fișierele esențiale.

### Restore din backup:
1. Extrage ZIP-ul pe noul calculator
2. Rulează `restore_from_backup.bat`
3. Descarcă modelele AI necesare
4. Configurează `.env` (copiază `.env.example` în `.env`)

---

## Metoda 2: Direct pe GitHub

### Inițializare repository:

```bash
cd D:\VocalForge

# Inițializează Git
git init

# Adaugă toate fișierele (automat exclude ce e în .gitignore)
git add .

# Creează primul commit
git commit -m "Initial commit - VocalForge backup"

# Pe GitHub.com: creează un repository nou (gol)

# Conectează și fă push
git remote add origin https://github.com/USERNAME/VocalForge.git
git branch -M main
git push -u origin main
```

### Update ulterior:
```bash
git add .
git commit -m "Descriere modificări"
git push
```

### Restore de pe GitHub:
```bash
# Pe noul calculator
git clone https://github.com/USERNAME/VocalForge.git
cd VocalForge

# Instalează dependențele
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

cd frontend
npm install
cd ..

# Descarcă modelele necesare (vezi README.md)
```

---

## Scripturi disponibile

| Script | Descriere |
|--------|-----------|
| `backup_to_github.bat` | Creează ZIP cu fișierele esențiale |
| `restore_from_backup.bat` | Restauraază și instalează dependențele |
| `fix_acestep_deps.bat` | Repară dependențele ace-step |
| `start_acestep.bat` | Pornește aplicația |

---

## Dimensiuni estimate

| Componentă | Dimensiune |
|------------|------------|
| Backup cod | ~130 MB |
| Cu dependențe instalate | ~2.5 GB |
| Cu modele AI | ~30+ GB |

---

## Notă importantă

**Nu uita să:**
1. ❌ Nu commit-ui `.env` cu secrete pe GitHub
2. ✅ Folosește `.env.example` ca șablon
3. ✅ Descarcă modelele AI după restore
4. ✅ Verifică `README.md` pentru instrucțiuni specifice
