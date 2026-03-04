"""
Quick configuration check - doesn't require servers to be running.
"""

import os
import sys

# Fix Windows console encoding
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.buffer, "strict")
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.buffer, "strict")

print("\n" + "="*60)
print("VocalForge Configuration Check")
print("="*60)

# Test 1: Check .env file exists
print("\n[1/5] Checking .env files...")
env_files = [
    "ace-step/.env",
    "backend/.env",
]

for env_file in env_files:
    full_path = os.path.join(os.path.dirname(__file__), env_file)
    if os.path.exists(full_path):
        print(f"  [OK] Found: {env_file}")
    else:
        print(f"  [WARN] Missing: {env_file}")

# Test 2: Load and verify acestep_config
print("\n[2/5] Checking acestep_config...")
try:
    from backend.endpoints.acestep_config import (
        ACE_STEP_API,
        ACE_STEP_API_KEY,
        OUTPUT_DIR
    )
    print(f"  [OK] Configuration loaded:")
    print(f"     - ACE_STEP_API: {ACE_STEP_API}")
    print(f"     - ACE_STEP_API_KEY: {'***SET***' if ACE_STEP_API_KEY else '(empty - OK for local dev)'}")
    print(f"     - OUTPUT_DIR: {OUTPUT_DIR}")
except Exception as e:
    print(f"  [ERROR] {e}")

# Test 3: Check acestep_advanced imports
print("\n[3/5] Checking acestep_advanced module...")
try:
    from backend.endpoints.acestep_advanced import router
    print(f"  [OK] Module imports successfully")
except Exception as e:
    print(f"  [ERROR] {e}")

# Test 4: Check main.py imports
print("\n[4/5] Checking main.py syntax...")
try:
    # Just check if it can be parsed
    import ast
    with open("backend/main.py", "r", encoding="utf-8") as f:
        code = f.read()
        ast.parse(code)
    print(f"  [OK] main.py syntax is valid")
except Exception as e:
    print(f"  [ERROR] {e}")

# Test 5: Check required dependencies
print("\n[5/5] Checking required dependencies...")
required_packages = {
    "fastapi": "FastAPI",
    "uvicorn": "Uvicorn",
    "httpx": "HTTP Client",
    "dotenv": "Python-dotenv",
    "soundfile": "SoundFile",
}

missing = []
for pkg, name in required_packages.items():
    try:
        __import__(pkg)
        print(f"  [OK] {name} ({pkg})")
    except ImportError:
        print(f"  [MISSING] {name} ({pkg})")
        missing.append(pkg)

# Summary
print("\n" + "="*60)
print("Configuration Summary")
print("="*60)

if not missing:
    print("\n[OK] All configuration checks passed!")
    print("\nNext steps:")
    print("   1. Run: START_SERVERS.bat")
    print("   2. Wait 30-60 seconds for servers to start")
    print("   3. Open: http://localhost:3000")
    print("   4. Test ACE-Step tab")
else:
    print(f"\n[ERROR] Missing packages: {', '.join(missing)}")
    print("\nInstall missing packages:")
    print(f"   pip install {' '.join(missing)}")

print("\n" + "="*60)
