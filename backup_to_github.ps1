# VocalForge Backup Script for GitHub
# Creates a ZIP with only essential code files

$ErrorActionPreference = "Stop"

Write-Host "============================================"
Write-Host "  VocalForge - Backup pentru GitHub"
Write-Host "============================================"
Write-Host ""

$SOURCE_DIR = "D:\VocalForge"
$DATE = Get-Date -Format "yyyyMMdd"
$BACKUP_NAME = "VocalForge_backup_$DATE"
$TEMP_DIR = [System.IO.Path]::GetTempPath() + $BACKUP_NAME
$ZIP_PATH = "$SOURCE_DIR\$BACKUP_NAME.zip"

# Cleanup old temp
if (Test-Path $TEMP_DIR) {
    Remove-Item $TEMP_DIR -Recurse -Force
}
New-Item -ItemType Directory -Path $TEMP_DIR | Out-Null

Write-Host "Copiere fisiere esentiale..."
Write-Host ""

# Helper function
function Copy-Files {
    param($src, $dst, $excludePattern)
    
    if (!(Test-Path $src)) {
        Write-Host "  ! $src nu exista"
        return
    }
    
    Get-ChildItem $src -Recurse -File | Where-Object {
        $_.FullName -notmatch $excludePattern
    } | ForEach-Object {
        $rel = $_.FullName.Substring($src.Length + 1)
        $dir = Split-Path "$dst\$rel" -Parent
        if (!(Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
        Copy-Item $_.FullName -Destination "$dst\$rel" -Force
    }
}

# Root files
Write-Host "[1/6] Root files..."
$excludePattern = 'node_modules|__pycache__|\.env$|\.log$|\.wav$|\.mp3$|\.png$|\.jpg$'
Get-ChildItem $SOURCE_DIR -File | Where-Object {
    $_.Name -notmatch $excludePattern -and $_.Extension -in @('.bat','.md','.json','.txt','.py','.js','.html','.ico','.gitignore')
} | Copy-Item -Destination $TEMP_DIR -Force
Write-Host "  + Root files copiate"

# Frontend
Write-Host "[2/6] frontend/..."
Copy-Files "$SOURCE_DIR\frontend" "$TEMP_DIR\frontend" 'node_modules|__pycache__|\.log$'
Write-Host "  + frontend/ copiat"

# Backend
Write-Host "[3/6] backend/..."
Copy-Files "$SOURCE_DIR\backend" "$TEMP_DIR\backend" 'node_modules|__pycache__|\\models\\|\\output\\|\\temp\\|uvr_models|\.log$|\.pth$|\.bin$|\.pt$|\.onnx$|\.safetensors$|\.ckpt$'
Write-Host "  + backend/ copiat"

# Core
Write-Host "[4/6] core/..."
Copy-Files "$SOURCE_DIR\core" "$TEMP_DIR\core" '__pycache__'
Write-Host "  + core/ copiat"

# Tests
Write-Host "[5/6] tests/..."
Copy-Files "$SOURCE_DIR\tests" "$TEMP_DIR\tests" '__pycache__'
Write-Host "  + tests/ copiat"

# Demo
Write-Host "[6/6] demo/..."
Copy-Files "$SOURCE_DIR\demo" "$TEMP_DIR\demo" '__pycache__'
Write-Host "  + demo/ copiat"

Write-Host ""
Write-Host "Creare ZIP în folderul proiectului..."

# Create ZIP
if (Test-Path $ZIP_PATH) {
    Remove-Item $ZIP_PATH -Force
}
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($TEMP_DIR, $ZIP_PATH)

# Calculate size
$zipSize = (Get-Item $ZIP_PATH).Length
$zipSizeMB = [math]::Round($zipSize / 1MB, 2)

Write-Host "============================================"
Write-Host "  BACKUP COMPLET!"
Write-Host "============================================"
Write-Host ""
Write-Host "  Locatie: $ZIP_PATH"
Write-Host "  Dimensiune: ~$zipSizeMB MB"
Write-Host ""
Write-Host "  Gata de upload pe GitHub!"
Write-Host ""

# Cleanup temp
Remove-Item $TEMP_DIR -Recurse -Force

Write-Host "Apasa orice tasta pentru a iesi..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
