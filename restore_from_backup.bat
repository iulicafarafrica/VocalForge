@echo off
REM ============================================
REM VocalForge - Restore din Backup
REM ============================================
REM Restauraaza codul si reinstaleaza dependintele
REM ============================================

setlocal

echo ============================================
echo   VocalForge - Restore din Backup
echo ============================================
echo.

echo Verificare fisiere...
echo.

if not exist "frontend" (
    echo [EROARE] Folderul frontend/ nu exista!
    echo Acest script trebuie rulat din folderul extras din backup.
    pause
    exit /b 1
)

if not exist "backend" (
    echo [EROARE] Folderul backend/ nu exista!
    pause
    exit /b 1
)

echo [OK] Fisierele esentiale gasite
echo.

REM Creare venv
echo [1/4] Creare virtual environment Python...
if exist "venv" (
    echo   venv/ deja exista, se sare peste...
) else (
    python -m venv venv
    echo   venv/ creat
)
echo.

REM Install Python deps
echo [2/4] Instalare dependinte Python...
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    if exist "requirements.txt" (
        pip install --upgrade pip -q
        pip install -r requirements.txt -q
        echo   Dependinte Python instalate
    ) else (
        echo   [WARN] requirements.txt nu exista
    )
    deactivate
) else (
    echo   [EROARE] venv nu a fost creat corect
)
echo.

REM Install Node deps
echo [3/4] Instalare dependinte Node.js...
if exist "frontend\package.json" (
    cd frontend
    if exist "node_modules" (
        echo   node_modules/ deja exista, se sare peste...
    ) else (
        call npm install
        echo   Dependinte Node.js instalate
    )
    cd ..
) else (
    echo   [WARN] frontend/package.json nu exista
)
echo.

REM Creare foldere necesare
echo [4/4] Creare foldere pentru modele...
if not exist "models" mkdir models
if not exist "uvr_models" mkdir uvr_models
if not exist "backend\models" mkdir backend\models
if not exist "backend\output" mkdir backend\output
if not exist "backend\temp" mkdir backend\temp
if not exist "output" mkdir output
echo   Foldere create
echo.

echo ============================================
echo   RESTORE COMPLET!
echo ============================================
echo.
echo   Urmatorii pasi:
echo   1. Descarca modelele AI necesare
echo   2. Configureaza .env (vezi .env.example)
echo   3. Ruleaza start_acestep.bat sau START_SERVERS.bat
echo.
echo   Pentru detalii, vezi README.md
echo.

pause
