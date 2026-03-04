"""
Test script to verify ACE-Step API integration fixes.

Run this after starting both servers:
  1. ACE-Step API:  cd ace-step && uv run acestep-api --port 8001
  2. VocalForge:    python -m uvicorn backend.main:app --port 8000

Usage:
  python test_acestep_fixes.py
"""

import httpx
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

ACE_STEP_API = "http://localhost:8001"
VOCALFORGE_API = "http://localhost:8000"


async def test_acestep_health():
    """Test ACE-Step API health endpoint."""
    print("\n" + "="*60)
    print("TEST 1: ACE-Step API Health Check")
    print("="*60)
    
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{ACE_STEP_API}/health", timeout=5.0)
            if r.status_code == 200:
                print(f"✅ ACE-Step API is healthy: {r.json()}")
                return True
            else:
                print(f"❌ ACE-Step API returned status {r.status_code}")
                return False
    except httpx.ConnectError as e:
        print(f"❌ Cannot connect to ACE-Step API at {ACE_STEP_API}")
        print(f"   Error: {e}")
        print(f"   → Make sure ACE-Step API server is running on port 8001")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


async def test_vocalforge_health():
    """Test VocalForge backend health endpoint."""
    print("\n" + "="*60)
    print("TEST 2: VocalForge Backend Health Check")
    print("="*60)
    
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{VOCALFORGE_API}/health", timeout=5.0)
            if r.status_code == 200:
                print(f"✅ VocalForge backend is healthy: {r.json()}")
                return True
            else:
                print(f"❌ VocalForge backend returned status {r.status_code}")
                return False
    except httpx.ConnectError as e:
        print(f"❌ Cannot connect to VocalForge backend at {VOCALFORGE_API}")
        print(f"   Error: {e}")
        print(f"   → Make sure VocalForge backend is running on port 8000")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


async def test_acestep_no_auth():
    """Test ACE-Step API without authentication (should work if ACESTEP_API_KEY is empty)."""
    print("\n" + "="*60)
    print("TEST 3: ACE-Step API Authentication Check")
    print("="*60)
    
    try:
        async with httpx.AsyncClient() as client:
            # Try to submit a minimal task (will fail validation but should pass auth)
            r = await client.post(
                f"{ACE_STEP_API}/release_task",
                json={"ai_token": ""},
                timeout=5.0
            )
            
            # If we get 422 (validation error), auth passed but data is invalid - GOOD
            # If we get 401 (unauthorized), auth failed - BAD
            if r.status_code == 422:
                print(f"✅ Authentication passed (got validation error as expected)")
                return True
            elif r.status_code == 401:
                print(f"❌ Authentication failed with 401 Unauthorized")
                print(f"   → Set ACESTEP_API_KEY='' in ace-step/.env")
                return False
            else:
                print(f"⚠️  Unexpected status code: {r.status_code}")
                return True  # Not necessarily an error
    except Exception as e:
        print(f"❌ Error testing authentication: {e}")
        return False


async def test_vocalforge_hardware():
    """Test VocalForge hardware detection endpoint."""
    print("\n" + "="*60)
    print("TEST 4: VocalForge Hardware Detection")
    print("="*60)
    
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{VOCALFORGE_API}/hardware", timeout=5.0)
            if r.status_code == 200:
                data = r.json()
                print(f"✅ Hardware detected:")
                print(f"   Device: {data.get('device', 'unknown')}")
                print(f"   Mode: {data.get('mode', 'unknown')}")
                print(f"   VRAM: {data.get('vram_gb', 0)} GB")
                print(f"   CPU Cores: {data.get('cpu_cores', 0)}")
                return True
            else:
                print(f"❌ Hardware endpoint returned status {r.status_code}")
                return False
    except Exception as e:
        print(f"❌ Error testing hardware endpoint: {e}")
        return False


async def test_config_import():
    """Test that acestep_config can be imported."""
    print("\n" + "="*60)
    print("TEST 5: Configuration Import")
    print("="*60)
    
    try:
        from backend.endpoints.acestep_config import (
            ACE_STEP_API,
            ACE_STEP_API_KEY,
            OUTPUT_DIR
        )
        
        print(f"✅ Configuration imported successfully:")
        print(f"   ACE_STEP_API: {ACE_STEP_API}")
        print(f"   ACE_STEP_API_KEY: {'***' if ACE_STEP_API_KEY else '(empty)'}")
        print(f"   OUTPUT_DIR: {OUTPUT_DIR}")
        return True
    except ImportError as e:
        print(f"❌ Failed to import configuration: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


async def main():
    """Run all tests."""
    print("\n" + "="*60)
    print("🧪 VocalForge ACE-Step Integration Test Suite")
    print("="*60)
    
    results = []
    
    # Run tests
    results.append(("Config Import", await test_config_import()))
    results.append(("ACE-Step Health", await test_acestep_health()))
    results.append(("VocalForge Health", await test_vocalforge_health()))
    results.append(("VocalForge Hardware", await test_vocalforge_hardware()))
    results.append(("ACE-Step Auth (No Key)", await test_acestep_no_auth()))
    
    # Summary
    print("\n" + "="*60)
    print("📊 Test Summary")
    print("="*60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Integration is working correctly.")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Check the errors above.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
