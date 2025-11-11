# Security Quick Start Guide
**For:** Fortune Tiles Development Team  
**Date:** November 11, 2025

---

## 🚀 What Changed?

13 critical and high-priority security vulnerabilities have been fixed. Your system is now significantly more secure.

---

## ⚡ Quick Setup (5 minutes)

### 1. Update Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
# CRITICAL - Generate these
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=<generate-32-char-random-string>
GITHUB_WEBHOOK_SECRET=<generate-random-string>

# IMPORTANT - Set for your domain
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# EMAIL - Use app-specific password
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password

# PRODUCTION ONLY
NODE_ENV=production
SEED_ADMIN_USER=false
```

**Generate secure random strings:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Test Locally

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Test authentication (should fail without token)
curl http://localhost:5000/api/sales

# Test with valid token
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/sales
```

### 3. Deploy to Production

```bash
# Set all environment variables in production
# Run migrations
npm run migrate

# Start server
npm start

# Verify security headers
curl -I https://yourdomain.com
```

---

## 🔐 What's Protected Now?

| Issue | Before | After |
|-------|--------|-------|
| **Database Credentials** | Hardcoded in config | Environment variables ✅ |
| **Admin User** | Auto-created with weak password | Requires env var to enable ✅ |
| **CORS** | Open to any origin | Whitelist only ✅ |
| **API Access** | Public without auth | Authentication required ✅ |
| **Webhooks** | Weak User-Agent check | HMAC-SHA256 verification ✅ |
| **Receipts** | XSS vulnerable | Content sanitized ✅ |
| **Passwords** | 6+ characters | 12+ with complexity ✅ |
| **JWT Tokens** | 24 hour expiry | 2 hour expiry ✅ |
| **Security Headers** | Missing | Added (CSP, X-Frame, etc.) ✅ |
| **SSL/TLS** | Validation disabled | Strict validation ✅ |

---

## 📋 Deployment Checklist

Before going live:

```
[ ] DATABASE_URL set correctly
[ ] JWT_SECRET generated (32+ chars)
[ ] GITHUB_WEBHOOK_SECRET generated
[ ] ALLOWED_ORIGINS set for your domain
[ ] NODE_ENV=production
[ ] SEED_ADMIN_USER=false
[ ] EMAIL credentials configured
[ ] HTTPS/SSL certificate installed
[ ] npm audit shows no critical issues
[ ] All tests passing
[ ] Security headers verified
[ ] CORS restrictions working
[ ] Webhook signature verification working
```

---

## 🧪 Quick Security Tests

```bash
# Test 1: CORS should reject unknown origins
curl -H "Origin: http://evil.com" https://yourdomain.com/api/sales
# Expected: CORS error

# Test 2: API should require authentication
curl https://yourdomain.com/api/sales
# Expected: 401 Unauthorized

# Test 3: Invalid token should fail
curl -H "Authorization: Bearer invalid" https://yourdomain.com/api/sales
# Expected: 403 Forbidden

# Test 4: Check security headers
curl -I https://yourdomain.com
# Expected: X-Content-Type-Options, X-Frame-Options, etc.

# Test 5: Check for vulnerabilities
npm audit
# Expected: No critical vulnerabilities
```

---

## 📚 Documentation

- **SECURITY_AUDIT_REPORT.md** - Full vulnerability analysis
- **SECURITY_FIXES_APPLIED.md** - Detailed fix explanations
- **SECURITY_GUIDELINES.md** - Development best practices
- **SECURITY_FIXES_SUMMARY.txt** - Quick reference

---

## ⚠️ Important Notes

### Password Requirements
Users must now use strong passwords:
- ✅ Minimum 12 characters
- ✅ At least 1 uppercase letter
- ✅ At least 1 lowercase letter
- ✅ At least 1 number
- ✅ At least 1 special character (@$!%*?&)

### JWT Token Expiry
- Tokens now expire after **2 hours** (was 24 hours)
- Users will need to login again after 2 hours
- This is more secure but requires frontend refresh handling

### CORS Restrictions
- Only whitelisted origins can access the API
- Update `ALLOWED_ORIGINS` for each domain
- Localhost is allowed in development

### Webhook Verification
- GitHub webhooks now require `GITHUB_WEBHOOK_SECRET`
- Configure this in GitHub webhook settings
- Invalid signatures will be rejected

---

## 🆘 Troubleshooting

### "CORS not allowed" error
**Solution:** Add your domain to `ALLOWED_ORIGINS` environment variable

### "Invalid credentials" on login
**Solution:** Ensure password meets requirements (12+ chars, uppercase, lowercase, number, special char)

### "Invalid or expired token" error
**Solution:** Token expires after 2 hours. User needs to login again.

### Webhook not working
**Solution:** Verify `GITHUB_WEBHOOK_SECRET` is set and matches GitHub webhook settings

### Database connection fails
**Solution:** Verify `DATABASE_URL` format: `postgresql://user:pass@host:port/db`

---

## 🔄 Next Steps

**This Week:**
- [ ] Deploy all fixes to production
- [ ] Update environment variables
- [ ] Test all authentication flows
- [ ] Monitor for errors

**Next 2 Weeks:**
- [ ] Implement rate limiting
- [ ] Add input validation
- [ ] Set up CSRF protection

**Next Month:**
- [ ] Add comprehensive logging
- [ ] Set up monitoring/alerting
- [ ] Conduct penetration testing

---

## 📞 Questions?

1. Check **SECURITY_GUIDELINES.md** for best practices
2. Review **SECURITY_AUDIT_REPORT.md** for vulnerability details
3. See **SECURITY_FIXES_APPLIED.md** for implementation details

---

## ✅ Summary

Your Fortune Tiles system is now **significantly more secure**:

- ✅ All 7 critical vulnerabilities fixed
- ✅ 6 high-priority vulnerabilities fixed
- ✅ Security headers implemented
- ✅ Strong password enforcement
- ✅ Proper authentication/authorization
- ✅ CORS protection
- ✅ Webhook signature verification
- ✅ XSS protection

**Status:** Ready for production deployment 🚀
