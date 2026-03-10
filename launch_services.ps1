# launch_services.ps1
$ErrorActionPreference = "Stop"

Write-Host "--- Lansare VocalForge v1.9 ---" -ForegroundColor Cyan

# 1. Pornire Frontend
Start-Process "cmd.exe" -ArgumentList "/k cd /d D:\VocalForge\frontend && npm run dev"

# 2. Pornire Backend
Start-Process "cmd.exe" -ArgumentList "/k cd /d D:\VocalForge && call venv\Scripts\activate.bat && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"

# 3. Pornire ACE-Step
Start-Process "cmd.exe" -ArgumentList "/k cd /d D:\VocalForge\ace-step && call .venv\Scripts\activate.bat && python acestep/api_server.py --host 0.0.0.0 --port 8001"

# 4. Pornire RVC Voice
Start-Process "cmd.exe" -ArgumentList "/k cd /d D:\VocalForge && call venv\Scripts\activate.bat && python -m uvicorn backend.app:app --host 0.0.0.0 --port 8002"

Write-Host "Servicii pornite!" -ForegroundColor Green
Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"
