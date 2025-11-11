# Security Audit Report - Fortune Tiles System
**Date:** November 11, 2025  
**Severity Levels:** CRITICAL, HIGH, MEDIUM, LOW

---

## CRITICAL VULNERABILITIES

### 1. **Hardcoded Database Credentials** ⚠️ CRITICAL
**File:** `backend/config/config.json`  
**Issue:** Database credentials hardcoded in development/test configs
```json
"development": {
  "username": "postgres",
  "password": "password",  // ← EXPOSED
  "database": "fortunetiles_db"
}
```
**Risk:** Credentials exposed in version control, accessible to anyone with repo access  
**Fix:** Use environment variables only
```json
"development": {
  "use_env_variable": "DATABASE_URL"
}
```

### 2. **Default Admin Credentials** ⚠️ CRITICAL
**File:** `backend/server.js` (lines 346-356)  
**Issue:** Hardcoded default admin user created with weak password
```javascript
await User.create({
  email: 'admin@fortunetiles.com',
  password: 'admin123',  // ← WEAK & EXPOSED
  role: 'owner'
});
```
**Risk:** Anyone can login with known credentials  
**Fix:** Require environment variable or skip auto-creation in production

### 3. **XSS Vulnerability in Receipt Print** ⚠️ CRITICAL
**File:** `frontend/src/components/Receipt.js` (line 22)  
**Issue:** Direct innerHTML injection without sanitization
```javascript
const content = document.getElementById('receipt-content').innerHTML;
printWindow.document.write(`...${content}...`);  // ← UNSAFE
```
**Risk:** Malicious data in receipt can execute arbitrary JavaScript  
**Fix:** Use textContent or DOMPurify for sanitization

### 4. **Missing CORS Validation** ⚠️ CRITICAL
**File:** `backend/server.js` (line 79)  
**Issue:** CORS enabled without origin restrictions
```javascript
app.use(cors());  // ← ALLOWS ANY ORIGIN
```
**Risk:** Cross-site request forgery, data theft from any domain  
**Fix:** Restrict to known origins

### 5. **Unauthenticated Public API Endpoints** ⚠️ CRITICAL
**File:** `backend/routes/sales.js` (line 9), `products.js` (line 76)  
**Issue:** GET endpoints missing authentication
```javascript
router.get('/', async (req, res) => {  // ← NO AUTH
  // Returns all sales data
});
```
**Risk:** Sensitive business data exposed publicly  
**Fix:** Add `authenticateToken` middleware

### 6. **SQL Injection via pg_dump** ⚠️ CRITICAL
**File:** `backend/routes/backup.js` (line 93)  
**Issue:** DATABASE_URL passed directly to child process
```javascript
const pgDump = spawn('pg_dump', [process.env.DATABASE_URL]);
```
**Risk:** If DATABASE_URL contains special chars, command injection possible  
**Fix:** Parse URL safely and use individual parameters

### 7. **Webhook Command Injection** ⚠️ CRITICAL
**File:** `backend/server.js` (lines 122-140)  
**Issue:** User-Agent check is insufficient webhook validation
```javascript
if (!userAgent.includes('GitHub-Hookshot')) {
  return res.status(401).json({ error: 'Unauthorized' });
}
exec('git submodule update --remote website', ...);  // ← DANGEROUS
```
**Risk:** Weak validation, arbitrary command execution possible  
**Fix:** Use HMAC signature verification (GitHub webhook standard)

---

## HIGH VULNERABILITIES

### 8. **Password Reset Token Enumeration** ⚠️ HIGH
**File:** `backend/routes/passwordReset.js` (lines 79-82)  
**Issue:** Different responses for existing vs non-existing emails
```javascript
if (!user) {
  return res.status(404).json({
    message: 'No account found with this email address'
  });
}
```
**Risk:** Attackers can enumerate valid email addresses  
**Fix:** Return same response for both cases

### 9. **No Rate Limiting** ⚠️ HIGH
**Issue:** No rate limiting on authentication endpoints  
**Risk:** Brute force attacks on login, password reset, forgot-password  
**Fix:** Add express-rate-limit middleware

### 10. **Weak Password Validation** ⚠️ HIGH
**File:** `backend/models/User.js` (line 39)  
**Issue:** Minimum password length only 6 characters
```javascript
len: [6, 255],  // ← TOO WEAK
```
**Risk:** Easily guessable passwords  
**Fix:** Enforce minimum 12 chars, complexity requirements

### 11. **No Input Validation/Sanitization** ⚠️ HIGH
**Issue:** Missing express-validator across all routes  
**Risk:** NoSQL injection, XSS, data corruption  
**Fix:** Add validation middleware to all endpoints

### 12. **Sensitive Data in Error Messages** ⚠️ HIGH
**File:** `backend/server.js` (line 378)  
**Issue:** Error details exposed in production
```javascript
error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
```
**Risk:** Stack traces reveal system architecture  
**Fix:** Never expose error details in production

### 13. **No HTTPS Enforcement** ⚠️ HIGH
**Issue:** No HSTS headers or redirect to HTTPS  
**Risk:** Man-in-the-middle attacks, credential theft  
**Fix:** Add helmet middleware with HSTS

### 14. **Missing Security Headers** ⚠️ HIGH
**Issue:** No X-Frame-Options, X-Content-Type-Options on all responses  
**Risk:** Clickjacking, MIME type sniffing  
**Fix:** Use helmet.js for comprehensive header protection

### 15. **JWT Token Expiry Too Long** ⚠️ HIGH
**File:** `backend/routes/auth.js` (line 43)  
**Issue:** 24-hour token expiration
```javascript
{ expiresIn: '24h' }  // ← TOO LONG
```
**Risk:** Compromised tokens valid for extended period  
**Fix:** Use 1-2 hour expiry with refresh tokens

### 16. **No Token Blacklist/Revocation** ⚠️ HIGH
**Issue:** Logged-out tokens still valid until expiry  
**Risk:** Session hijacking, compromised tokens can't be revoked  
**Fix:** Implement token blacklist or use short expiry + refresh tokens

---

## MEDIUM VULNERABILITIES

### 17. **Email Credentials in Environment** ⚠️ MEDIUM
**File:** `backend/routes/passwordReset.js` (lines 26-27)  
**Issue:** Email credentials stored in plain environment variables
```javascript
user: process.env.EMAIL_USER,
pass: process.env.EMAIL_PASSWORD
```
**Risk:** If .env exposed, email account compromised  
**Fix:** Use OAuth2 or app-specific passwords

### 18. **TLS Certificate Validation Disabled** ⚠️ MEDIUM
**File:** `backend/routes/passwordReset.js` (line 30)  
**Issue:** rejectUnauthorized set to false
```javascript
tls: {
  rejectUnauthorized: false  // ← DANGEROUS
}
```
**Risk:** Vulnerable to MITM attacks on email  
**Fix:** Set to true in production

### 19. **No Activity Logging for Sensitive Operations** ⚠️ MEDIUM
**Issue:** Password changes, role changes not fully logged  
**Risk:** Audit trail incomplete for compliance  
**Fix:** Add comprehensive activity logging

### 20. **Insufficient Authorization Checks** ⚠️ MEDIUM
**File:** `backend/routes/users.js` (line 78)  
**Issue:** Users can view other users' data without location check
```javascript
router.get('/:id', authenticateToken, requireRole(['owner']), async (req, res) => {
  // No check if user can access this location's data
});
```
**Risk:** Unauthorized data access across locations  
**Fix:** Add location-based authorization

### 21. **No CSRF Protection** ⚠️ MEDIUM
**Issue:** No CSRF tokens on state-changing operations  
**Risk:** Cross-site request forgery attacks  
**Fix:** Add csrf-sync or similar middleware

### 22. **Verbose Logging in Production** ⚠️ MEDIUM
**File:** `backend/server.js` (lines 82-98)  
**Issue:** Request bodies logged including sensitive data
```javascript
console.log('Request body:', bodyForLog);  // May contain passwords
```
**Risk:** Sensitive data in logs  
**Fix:** Filter passwords, tokens from logs

### 23. **No Database Connection Pooling Limits** ⚠️ MEDIUM
**Issue:** Unlimited connection pool  
**Risk:** Resource exhaustion, DoS vulnerability  
**Fix:** Set max connections in database config

### 24. **Missing Dependency Vulnerabilities** ⚠️ MEDIUM
**Issue:** No npm audit or dependency scanning  
**Risk:** Known vulnerabilities in dependencies  
**Fix:** Run `npm audit` and update packages

---

## LOW VULNERABILITIES

### 25. **Overly Permissive Cache Headers** ⚠️ LOW
**File:** `backend/server.js` (line 190)  
**Issue:** Static assets cached for 1 year
```javascript
res.setHeader('Cache-Control', 'public, max-age=31536000');
```
**Risk:** Security updates take long to propagate  
**Fix:** Use 1-7 day cache with versioning

### 26. **Missing Content Security Policy** ⚠️ LOW
**Issue:** No CSP headers  
**Risk:** XSS attacks not mitigated  
**Fix:** Add CSP headers via helmet

### 27. **No Subresource Integrity** ⚠️ LOW
**Issue:** External resources loaded without SRI  
**Risk:** CDN compromise could inject malicious code  
**Fix:** Add integrity attributes to script/link tags

### 28. **Incomplete Input Type Validation** ⚠️ LOW
**File:** `backend/routes/sales.js` (lines 49-50)  
**Issue:** Query parameters not validated as integers
```javascript
limit: parseInt(limit),  // No validation before parseInt
offset: parseInt(offset)
```
**Risk:** NaN values could cause issues  
**Fix:** Validate with express-validator

---

## SUMMARY

| Severity | Count |
|----------|-------|
| CRITICAL | 7     |
| HIGH     | 9     |
| MEDIUM   | 8     |
| LOW      | 4     |
| **TOTAL** | **28** |

---

## IMMEDIATE ACTION ITEMS (Priority Order)

1. ✅ Remove hardcoded credentials from config.json
2. ✅ Remove default admin user auto-creation
3. ✅ Add CORS origin whitelist
4. ✅ Add authentication to public endpoints
5. ✅ Implement webhook signature verification
6. ✅ Add rate limiting to auth endpoints
7. ✅ Sanitize Receipt component innerHTML
8. ✅ Add helmet.js for security headers
9. ✅ Implement input validation with express-validator
10. ✅ Add CSRF protection

---

## COMPLIANCE NOTES

- **OWASP Top 10 2021:** Covers A01, A02, A03, A04, A05, A06, A07
- **GDPR:** Missing data protection measures
- **PCI DSS:** Credential storage violations
