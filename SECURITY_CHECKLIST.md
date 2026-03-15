# ✅ VocalForge Security Checklist

**Use this checklist to track security improvements**

---

## 🔴 Critical (Week 1)

### CORS Configuration
- [ ] Replace `allow_origins=["*"]` with specific domains
- [ ] Test frontend still works after change
- [ ] Document allowed origins for deployment
- **File:** `backend/main.py`
- **Time:** 15 minutes
- **Status:** ⬜ Pending

### Authentication
- [ ] Add `HTTPBearer` and `verify_auth` dependency
- [ ] Create `backend/.env` with `VOCALFORGE_API_TOKEN`
- [ ] Protect `/process_cover` endpoint
- [ ] Protect `/upload_model` endpoint
- [ ] Protect `/demucs_separate` endpoint
- [ ] Protect `/delete_model/{model_id}` endpoint
- [ ] Protect `/preview` endpoint
- [ ] Protect `/clean_temp_files` endpoint
- [ ] Protect `/unload_models` endpoint
- [ ] Update frontend to send `Authorization` header
- **Files:** `backend/main.py`, `frontend/src/utils/api.js`
- **Time:** 30 minutes
- **Status:** ⬜ Pending

### File Upload Validation
- [ ] Install `python-magic` package
- [ ] Add `ALLOWED_EXTENSIONS` constants
- [ ] Add `MAX_FILE_SIZE` constants
- [ ] Create `validate_upload()` function
- [ ] Apply validation to `/upload_model`
- [ ] Apply validation to `/process_cover`
- [ ] Test with valid file types
- [ ] Test with invalid file types
- **Files:** `backend/main.py`
- **Time:** 25 minutes
- **Status:** ⬜ Pending

---

## 🟠 Medium (Week 2)

### Path Traversal Prevention
- [ ] Import `pathlib.Path`
- [ ] Update `/tracks/{filename:path}` endpoint
- [ ] Add path validation with `relative_to()`
- [ ] Test with `../` attacks
- [ ] Test with valid paths
- **File:** `backend/main.py`
- **Time:** 15 minutes
- **Status:** ⬜ Pending

### Rate Limiting
- [ ] Install `slowapi` package
- [ ] Add `Limiter` initialization
- [ ] Add `SlowAPIMiddleware`
- [ ] Add rate limit to `/process_cover` (10/minute)
- [ ] Add rate limit to `/demucs_separate` (5/minute)
- [ ] Add rate limit to `/ace_generate` (5/minute)
- [ ] Add rate limit to `/upload_model` (20/minute)
- [ ] Test rate limiting works
- **File:** `backend/main.py`
- **Time:** 20 minutes
- **Status:** ⬜ Pending

### Centralized Authentication
- [ ] Already done in Week 1! ✅
- [ ] Verify all endpoints use `Depends(verify_auth)`
- **Status:** ⬜ Pending

---

## 🟢 Hardening (Week 3)

### Security Headers
- [ ] Add `X-Frame-Options` header
- [ ] Add `X-Content-Type-Options` header
- [ ] Add `X-XSS-Protection` header
- [ ] Add `Referrer-Policy` header
- [ ] Add `Content-Security-Policy` header
- [ ] Test headers with browser dev tools
- **File:** `backend/main.py`
- **Time:** 10 minutes
- **Status:** ⬜ Pending

### Environment Variables
- [ ] Create `backend/.env` with all config
- [ ] Create `frontend/.env` with all config
- [ ] Add `.env` to `.gitignore`
- [ ] Update backend to use `os.getenv()`
- [ ] Update frontend to use `import.meta.env`
- [ ] Create `.env.example` for documentation
- **Files:** `backend/.env`, `frontend/.env`
- **Time:** 10 minutes
- **Status:** ⬜ Pending

### Input Validation
- [ ] Add validation to all text inputs
- [ ] Add max length checks
- [ ] Add sanitization for file paths
- [ ] Add validation to BPM/key parameters
- [ ] Test with malicious inputs
- **Time:** 30 minutes
- **Status:** ⬜ Pending

### Logging & Monitoring
- [ ] Add logging for failed auth attempts
- [ ] Add logging for file uploads
- [ ] Add logging for rate limit hits
- [ ] Create security log file
- [ ] Set up log rotation
- **Time:** 20 minutes
- **Status:** ⬜ Pending

---

## 📋 Ongoing Security Tasks

### Monthly
- [ ] Run `pip audit` for Python vulnerabilities
- [ ] Run `npm audit` for NPM vulnerabilities
- [ ] Review security logs
- [ ] Update dependencies
- **Time:** 30 minutes/month

### Quarterly
- [ ] Review and update allowed CORS origins
- [ ] Rotate API tokens
- [ ] Review user access patterns
- [ ] Update security documentation
- **Time:** 2 hours/quarter

### Yearly
- [ ] External penetration testing
- [ ] Full security audit
- [ ] Update all dependencies to latest stable
- [ ] Review and update security policies
- **Time:** 1-2 days/year

---

## 🧪 Testing Checklist

After each fix, verify:

### CORS Test
```bash
# From allowed origin (should work)
curl -H "Origin: http://localhost:3000" http://localhost:8000/health

# From blocked origin (should fail)
curl -H "Origin: http://evil.com" http://localhost:8000/health
```
- [ ] Tested and working

### Authentication Test
```bash
# Without auth (should fail with 401)
curl -X POST http://localhost:8000/process_cover -F "file=@test.wav"

# With auth (should work)
curl -X POST http://localhost:8000/process_cover \
  -H "Authorization: Bearer your-token" \
  -F "file=@test.wav"
```
- [ ] Tested and working

### File Upload Test
```bash
# Valid file (should work)
curl -X POST http://localhost:8000/upload_model \
  -H "Authorization: Bearer your-token" \
  -F "file=@model.pth"

# Invalid extension (should fail with 400)
curl -X POST http://localhost:8000/upload_model \
  -H "Authorization: Bearer your-token" \
  -F "file=@malicious.txt"
```
- [ ] Tested and working

### Path Traversal Test
```bash
# Attack attempt (should fail with 403)
curl "http://localhost:8000/tracks/../../backend/main.py"

# Valid path (should work)
curl "http://localhost:8000/tracks/valid-file.wav"
```
- [ ] Tested and working

### Rate Limit Test
```bash
# Make 15 rapid requests (11th should fail with 429)
for i in {1..15}; do
  curl -H "Authorization: Bearer your-token" http://localhost:8000/health
done
```
- [ ] Tested and working

---

## 📊 Progress Tracker

| Week | Tasks | Completed | Percentage |
|------|-------|-----------|------------|
| Week 1 (Critical) | 11 | ⬜ 0 | 0% |
| Week 2 (Medium) | 6 | ⬜ 0 | 0% |
| Week 3 (Hardening) | 12 | ⬜ 0 | 0% |
| **Total** | **29** | **⬜ 0** | **0%** |

---

## 🏆 Security Certification

Once all items are checked:

- [ ] All critical vulnerabilities fixed
- [ ] All medium vulnerabilities fixed
- [ ] All tests passing
- [ ] Security documentation complete
- [ ] Team trained on security best practices

**Security Score Target:** 9/10 (from current 4.5/10)

---

*Last Updated: 2026-03-15*  
*Next Review: 2026-04-15*
