"""
Test ACE-Step generation with turbo settings.
Run this to verify the model is working correctly.
"""

import httpx
import json
import time

ACE_STEP_API = "http://localhost:8001"

def test_turbo_generation():
    """Test generation with turbo settings (27 steps, 30 seconds)."""
    
    print("\n" + "="*60)
    print("ACE-Step Turbo Generation Test (27 steps)")
    print("="*60)
    
    # Check health first
    print("\n[1/4] Checking ACE-Step health...")
    try:
        r = httpx.get(f"{ACE_STEP_API}/health", timeout=5.0)
        health = r.json()
        print(f"✅ Health: {health.get('data', {}).get('status', 'unknown')}")
        print(f"   Model: {health.get('data', {}).get('loaded_model', 'unknown')}")
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        print("   → Make sure ACE-Step API is running on port 8001")
        return
    
    # Submit task
    print("\n[2/4] Submitting generation task...")
    task_payload = {
        "prompt": "hip hop trap beat, 808 bass, dark atmosphere",
        "lyrics": "",
        "audio_duration": 30,
        "inference_steps": 27,  # Turbo optimal (official default)
        "guidance_scale": 7,
        "use_random_seed": True,
        "seed": -1,
        "audio_format": "wav",
        "task_type": "text2music",
        "infer_method": "ode",
        "shift": 3.0,
        "lm_temperature": 1.0,
        "lm_cfg_scale": 2.2,
        "lm_top_k": 0,
        "lm_top_p": 0.92,
        "use_adg": False,
        "cfg_interval_start": 0.0,
        "cfg_interval_end": 1.0,
        "use_cot_metas": True,
        "use_cot_caption": True,
        "use_cot_language": True,
        "allow_lm_batch": True,
        "batch_size": 1,
        "use_tiled_decode": True,
    }
    
    try:
        r = httpx.post(f"{ACE_STEP_API}/release_task", json=task_payload, timeout=30.0)
        if r.status_code != 200:
            print(f"❌ Task submission failed: HTTP {r.status_code}")
            print(f"   Response: {r.text[:200]}")
            return
        
        task_data = r.json()
        task_id = task_data.get('data', {}).get('task_id') or task_data.get('task_id')
        
        if not task_id:
            print(f"❌ No task_id in response: {task_data}")
            return
        
        print(f"✅ Task submitted: {task_id}")
    except Exception as e:
        print(f"❌ Task submission failed: {e}")
        return
    
    # Poll for result
    print("\n[3/4] Polling for result...")
    start_time = time.time()
    max_wait = 120  # 2 minutes max for turbo
    
    while time.time() - start_time < max_wait:
        time.sleep(2)
        elapsed = int(time.time() - start_time)
        
        try:
            r = httpx.post(
                f"{ACE_STEP_API}/query_result",
                json={"task_id_list": [task_id]},
                timeout=10.0
            )
            
            if r.status_code != 200:
                print(f"   ⏳ HTTP {r.status_code}, retrying... ({elapsed}s)")
                continue
            
            resp_data = r.json()
            data_list = resp_data.get('data', [])
            
            if not data_list:
                print(f"   ⏳ No data yet... ({elapsed}s)")
                continue
            
            item = data_list[0]
            status = item.get('status', 0)
            progress = item.get('progress_text', '')
            
            # Extract meaningful progress
            if ' | ' in progress:
                progress = progress.split(' | ')[-1].strip()
            
            if status == 0:  # Running
                print(f"   ⏳ Status: running | {progress} ({elapsed}s)")
            elif status == 1:  # Succeeded
                print(f"   ✅ Status: succeeded | {progress} ({elapsed}s)")
                
                # Get audio file
                result = item.get('result', '[]')
                try:
                    result_arr = json.loads(result) if isinstance(result, str) else result
                    if result_arr:
                        audio_file = result_arr[0].get('file', 'unknown')
                        print(f"   📁 Audio file: {audio_file}")
                except:
                    pass
                break
            elif status == 2:  # Failed
                print(f"   ❌ Status: failed")
                result = item.get('result', '[]')
                print(f"   Error: {result}")
                break
                
        except Exception as e:
            print(f"   ⏳ Polling error: {e} ({elapsed}s)")
            continue
    
    # Final status
    print("\n[4/4] Test complete!")
    elapsed = int(time.time() - start_time)
    print(f"   Total time: {elapsed}s")
    
    if elapsed < 60:
        print(f"   ✅ EXCELLENT - Turbo working correctly!")
    elif elapsed < 120:
        print(f"   ✅ GOOD - Generation completed in expected time")
    else:
        print(f"   ⚠️ SLOW - May need optimization")
    
    print("\n" + "="*60)
    print("Official ACE-Step Turbo Settings (27 steps, guidance=7)")
    print("For 8GB VRAM: CPU offload ENABLED (required)")
    print("="*60 + "\n")

if __name__ == "__main__":
    test_turbo_generation()
    print("\n" + "="*60 + "\n")
