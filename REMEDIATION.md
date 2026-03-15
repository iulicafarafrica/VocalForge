# 🔧 VocalForge Security Remediation Guide

**Step-by-step fixes for all identified vulnerabilities**

---

## 🔴 Week 1: Critical Fixes

### Fix #1: CORS Configuration (15 minutes)

**File:** `backend/main.py`  
**Lines:** 199-207

#### Step 1: Locate current CORS config
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### Step 2: Replace with restricted config
```python
# Allowed origins (add production URLs when deployed)
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    allow_credentials=True,
)
```

#### Step 3: Test
```bash
# Frontend should still work
cd frontend && npm run dev

# Backend should still work
cd backend && uvicorn main:app --reload

# Check browser console for CORS errors
```

✅ **Done!** CORS is now restricted.

---

### Fix #2: Add Authentication (30 minutes)

**File:** `backend/main.py`

#### Step 1: Add imports at top
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os

# Security scheme
security = HTTPBearer()

# API Token from environment variable (with fallback for development)
API_TOKEN = os.getenv("VOCALFORGE_API_TOKEN", "dev-token-change-in-production")

# Authentication dependency
async def verify_auth(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify Bearer token authentication."""
    if credentials.credentials != API_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )
    return credentials.credentials
```

#### Step 2: Protect critical endpoints

**Example for `/process_cover`:**
```python
# Before (line ~537):
@app.post("/process_cover")
async def process_cover(...):

# After:
@app.post("/process_cover")
async def process_cover(..., auth: str = Depends(verify_auth)):
```

**Endpoints to protect:**
- [ ] `/process_cover` (line ~537)
- [ ] `/upload_model` (line ~780)
- [ ] `/demucs_separate` (line ~1037)
- [ ] `/delete_model/{model_id}` (line ~840)
- [ ] `/preview` (line ~690)
- [ ] `/clean_temp_files` (line ~1265)
- [ ] `/unload_models` (line ~1327)

#### Step 3: Create `.env` file
```bash
# Create file: backend/.env
VOCALFORGE_API_TOKEN=your-secure-random-token-here
```

**Generate secure token:**
```python
import secrets
print(secrets.token_urlsafe(32))
# Example output: xK9fJ2mL5nP8qR3tU6vW9yZ0aB4cD7eF
```

#### Step 4: Update frontend to send auth header

**File:** `frontend/src/App.jsx` (and other components that call API)

```javascript
const API_TOKEN = import.meta.env.VITE_API_TOKEN || "dev-token-change-in-production";

// Add to all fetch calls:
fetch(`${API}/endpoint`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${API_TOKEN}`,
  },
  body: formData
});
```

**Better: Create API utility file**

**File:** `frontend/src/utils/api.js`
```javascript
const API_BASE = "http://localhost:8000";
const API_TOKEN = import.meta.env.VITE_API_TOKEN || "dev-token";

export async function apiCall(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      "Authorization": `Bearer ${API_TOKEN}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Request failed");
  }
  
  return response.json();
}
```

✅ **Done!** Authentication is now required.

---

### Fix #3: File Upload Validation (25 minutes)

**File:** `backend/main.py`

#### Step 1: Add imports
```python
from pathlib import Path
import python_magic  # pip install python-magic
```

#### Step 2: Add constants
```python
# File upload restrictions
ALLOWED_MODEL_EXTENSIONS = {".pth", ".pt", ".bin", ".safetensors"}
ALLOWED_AUDIO_EXTENSIONS = {".wav", ".mp3", ".flac", ".m4a", ".ogg"}
MAX_MODEL_SIZE = 2 * 1024 * 1024 * 1024  # 2GB
MAX_AUDIO_SIZE = 100 * 1024 * 1024  # 100MB
```

#### Step 3: Add validation function
```python
def validate_upload(file: UploadFile, allowed_extensions: set, max_size: int):
    """Validate uploaded file for extension, size, and MIME type."""
    # 1. Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file_ext}' not allowed. Allowed: {allowed_extensions}"
        )
    
    # 2. Check file size
    file.seek(0, 2)  # Seek to end
    file_size = file.tell()
    file.seek(0)  # Reset to beginning
    
    if file_size > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({file_size/1024/1024:.1f}MB). Max: {max_size/1024/1024:.0f}MB"
        )
    
    # 3. Validate MIME type (read first bytes)
    file_bytes = file.read(2048)  # Read first 2KB
    file.seek(0)  # Reset
    
    mime = python_magic.from_buffer(file_bytes, mime=True)
    
    # Allow common safe MIME types
    allowed_mimes = {
        "application/octet-stream",  # Binary files
        "application/zip",  # Compressed
        "audio/wav",
        "audio/mpeg",
        "audio/flac",
        "audio/mp4",
    }
    
    if mime not in allowed_mimes:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type (MIME: {mime})"
        )
    
    return True
```

#### Step 4: Apply validation to endpoints

**Example for `/upload_model`:**
```python
@app.post("/upload_model")
async def upload_model(
    file: UploadFile = File(...),
    auth: str = Depends(verify_auth)  # Add auth
):
    # Validate file
    validate_upload(file, ALLOWED_MODEL_EXTENSIONS, MAX_MODEL_SIZE)
    
    # Continue with existing logic...
```

**Example for `/process_cover`:**
```python
@app.post("/process_cover")
async def process_cover(
    file: UploadFile = File(...),
    auth: str = Depends(verify_auth)  # Add auth
):
    # Validate file
    validate_upload(file, ALLOWED_AUDIO_EXTENSIONS, MAX_AUDIO_SIZE)
    
    # Continue with existing logic...
```

✅ **Done!** File uploads are now validated.

---

## 🟠 Week 2: Medium Priority Fixes

### Fix #4: Path Traversal Prevention (15 minutes)

**File:** `backend/main.py`  
**Lines:** 216-240

#### Step 1: Locate current code
```python
@app.get("/tracks/{filename:path}")
async def serve_track(filename: str, request: Request):
    file_path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)
```

#### Step 2: Replace with secure version
```python
from pathlib import Path

@app.get("/tracks/{filename:path}")
async def serve_track(filename: str, request: Request):
    """Serve audio files with path traversal protection."""
    # 1. Resolve OUTPUT_DIR to absolute path
    output_dir_resolved = Path(OUTPUT_DIR).resolve()
    
    # 2. Construct and resolve requested path
    file_path = (output_dir_resolved / filename).resolve()
    
    # 3. Verify path is within OUTPUT_DIR (prevents ../ attacks)
    try:
        file_path.relative_to(output_dir_resolved)
    except ValueError:
        raise HTTPException(
            status_code=403,
            detail="Access denied: Invalid path"
        )
    
    # 4. Check file exists and is a file (not directory)
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    
    # 5. Serve file
    return FileResponse(str(file_path))
```

✅ **Done!** Path traversal is now prevented.

---

### Fix #5: Add Rate Limiting (20 minutes)

#### Step 1: Install slowapi
```bash
cd backend
pip install slowapi
```

#### Step 2: Add imports to `backend/main.py`
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

# Initialize limiter
limiter = Limiter(key_func=get_remote_address)

# Add to app
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

#### Step 3: Add rate limits to endpoints

**Example:**
```python
@app.post("/process_cover")
@limiter.limit("10/minute")  # Max 10 requests per minute per IP
async def process_cover(
    request: Request,  # Required for rate limiting
    file: UploadFile = File(...),
    auth: str = Depends(verify_auth)
):
```

**Recommended limits:**
| Endpoint | Limit | Reason |
|----------|-------|--------|
| `/process_cover` | 10/minute | GPU intensive |
| `/demucs_separate` | 5/minute | Very GPU intensive |
| `/upload_model` | 20/minute | Large files |
| `/ace_generate` | 5/minute | Very GPU intensive |
| `/tracks/*` | 60/minute | File serving |
| `/health` | 30/minute | Health checks |

✅ **Done!** Rate limiting is now active.

---

### Fix #6: Centralize Authentication (10 minutes)

**Already done in Fix #2!** Just ensure all endpoints use `Depends(verify_auth)`.

---

## 🟢 Week 3: Security Hardening

### Fix #7: Add Security Headers (10 minutes)

**File:** `backend/main.py`

#### Add middleware after CORS:
```python
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses."""
    response = await call_next(request)
    
    # Prevent clickjacking
    response.headers["X-Frame-Options"] = "DENY"
    
    # Prevent MIME type sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"
    
    # XSS protection
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    # Referrer policy
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # Content Security Policy (adjust for your needs)
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; "
        "font-src 'self' data:;"
    )
    
    return response
```

✅ **Done!** Security headers added.

---

### Fix #8: Environment Variables (10 minutes)

#### Backend `.env` file
```bash
# backend/.env
VOCALFORGE_API_TOKEN=your-secure-token-here
OUTPUT_DIR=D:\\VocalForge\\backend\\output
DEBUG=False
```

#### Frontend `.env` file
```bash
# frontend/.env
VITE_API_URL=http://localhost:8000
VITE_API_TOKEN=your-secure-token-here
```

#### Update frontend code
```javascript
// frontend/src/utils/api.js
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_TOKEN = import.meta.env.VITE_API_TOKEN || "dev-token";
```

✅ **Done!** Configuration is now externalized.

---

## ✅ Security Checklist

After completing all fixes:

- [ ] CORS restricted to specific origins
- [ ] Authentication on all sensitive endpoints
- [ ] File upload validation (extension, size, MIME)
- [ ] Path traversal protection
- [ ] Rate limiting enabled
- [ ] Security headers added
- [ ] Environment variables configured
- [ ] No hardcoded secrets in code
- [ ] All dependencies updated

---

## 🧪 Testing Security Fixes

### Test CORS
```bash
# Should fail from different origin
curl -H "Origin: http://evil.com" http://localhost:8000/health

# Should succeed from allowed origin
curl -H "Origin: http://localhost:3000" http://localhost:8000/health
```

### Test Authentication
```bash
# Should fail without auth
curl -X POST http://localhost:8000/process_cover

# Should succeed with auth
curl -X POST http://localhost:8000/process_cover \
  -H "Authorization: Bearer your-token" \
  -F "file=@test.wav"
```

### Test File Upload Validation
```bash
# Should fail with .txt file
curl -X POST http://localhost:8000/upload_model \
  -H "Authorization: Bearer your-token" \
  -F "file=@malicious.txt"

# Should succeed with .pth file
curl -X POST http://localhost:8000/upload_model \
  -H "Authorization: Bearer your-token" \
  -F "file=@model.pth"
```

### Test Path Traversal
```bash
# Should fail (403)
curl "http://localhost:8000/tracks/../../backend/main.py"

# Should succeed (200)
curl "http://localhost:8000/tracks/valid-file.wav"
```

---

*Remediation Guide v1.0 - VocalForge Security Audit*
