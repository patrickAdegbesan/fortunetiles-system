# Security Guidelines for Fortune Tiles Development
**Version:** 1.0  
**Last Updated:** November 11, 2025

---

## 🔐 Authentication & Authorization

### Password Requirements
- ✅ Minimum 12 characters
- ✅ At least 1 uppercase letter (A-Z)
- ✅ At least 1 lowercase letter (a-z)
- ✅ At least 1 number (0-9)
- ✅ At least 1 special character (@$!%*?&)
- ❌ No dictionary words
- ❌ No user information (email, name)

### JWT Tokens
- ✅ Expiry: 2 hours
- ✅ Secret: Minimum 32 characters, random
- ✅ Stored: HttpOnly cookies or secure storage
- ❌ Never store in localStorage
- ❌ Never log tokens
- ❌ Never hardcode secrets

### Role-Based Access Control (RBAC)
```javascript
// Always check authentication AND authorization
router.get('/admin-data', authenticateToken, requireRole(['owner']), async (req, res) => {
  // Protected endpoint
});
```

**Roles:**
- `owner` - Full system access
- `manager` - Location management access
- `staff` - Limited transaction access

---

## 🛡️ API Security

### CORS Configuration
```javascript
// ✅ CORRECT - Whitelist specific origins
const allowedOrigins = ['https://yourdomain.com', 'https://app.yourdomain.com'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// ❌ WRONG - Allow any origin
app.use(cors());
```

### Input Validation
```javascript
// ✅ CORRECT - Validate all inputs
const { body, validationResult } = require('express-validator');

router.post('/users', [
  body('email').isEmail(),
  body('password').isLength({ min: 12 }),
  body('role').isIn(['owner', 'manager', 'staff'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Process request
});

// ❌ WRONG - No validation
router.post('/users', (req, res) => {
  const { email, password, role } = req.body;
  // Directly use without validation
});
```

### Error Handling
```javascript
// ✅ CORRECT - Generic error in production
if (process.env.NODE_ENV === 'production') {
  res.status(500).json({ message: 'Internal server error' });
} else {
  res.status(500).json({ message: error.message });
}

// ❌ WRONG - Expose error details
res.status(500).json({ 
  message: error.message,
  stack: error.stack,
  query: req.query
});
```

---

## 🔒 Data Protection

### Sensitive Data
Never log or expose:
- ❌ Passwords
- ❌ JWT tokens
- ❌ API keys
- ❌ Database credentials
- ❌ Personal information (SSN, phone, address)
- ❌ Payment information
- ❌ Email addresses (in logs)

### Data in Transit
```javascript
// ✅ CORRECT - Use HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// ✅ CORRECT - Strict SSL in production
dialectOptions: {
  ssl: {
    require: true,
    rejectUnauthorized: true  // Strict in production
  }
}
```

### Data at Rest
- ✅ Hash passwords with bcrypt (salt rounds: 12)
- ✅ Encrypt sensitive fields in database
- ✅ Use environment variables for secrets
- ✅ Rotate credentials regularly

---

## 🚀 Deployment Security

### Environment Variables
```bash
# ✅ CORRECT - Use .env file (never commit)
DATABASE_URL=postgresql://...
JWT_SECRET=<32-char-random-string>
GITHUB_WEBHOOK_SECRET=<random-string>
NODE_ENV=production

# ❌ WRONG - Hardcoded in code
const password = 'admin123';
const apiKey = 'sk_live_...';
```

### Secrets Management
```bash
# Generate secure random strings
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# For production, use:
# - AWS Secrets Manager
# - HashiCorp Vault
# - Azure Key Vault
# - GitHub Secrets (for CI/CD)
```

### HTTPS/SSL
- ✅ Use valid SSL certificate
- ✅ Enable HSTS headers
- ✅ Redirect HTTP to HTTPS
- ✅ Use TLS 1.2 or higher
- ❌ Self-signed certificates in production
- ❌ Expired certificates

---

## 🧪 Security Testing

### Before Deployment
```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Check for secrets
npm install -g detect-secrets
detect-secrets scan

# Test CORS
curl -H "Origin: http://evil.com" https://yourdomain.com/api/sales

# Test authentication
curl https://yourdomain.com/api/sales  # Should fail
curl -H "Authorization: Bearer invalid" https://yourdomain.com/api/sales  # Should fail

# Test rate limiting
for i in {1..100}; do curl https://yourdomain.com/api/auth/login; done
```

### Security Headers Check
```bash
# Verify security headers
curl -I https://yourdomain.com

# Should include:
# X-Content-Type-Options: nosniff
# X-Frame-Options: SAMEORIGIN
# X-XSS-Protection: 1; mode=block
# Content-Security-Policy: ...
# Strict-Transport-Security: ...
```

---

## 📝 Code Review Checklist

Before merging any code:

- [ ] No hardcoded credentials
- [ ] No sensitive data in logs
- [ ] All inputs validated
- [ ] All outputs encoded/escaped
- [ ] Authentication required for sensitive endpoints
- [ ] Authorization checked (RBAC)
- [ ] Error messages don't expose details
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] No CSRF vulnerabilities
- [ ] Dependencies are up-to-date
- [ ] No `eval()` or `exec()` with user input
- [ ] Proper error handling
- [ ] Security headers present
- [ ] HTTPS enforced in production

---

## 🚨 Common Vulnerabilities to Avoid

### SQL Injection
```javascript
// ❌ WRONG
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ CORRECT
const user = await User.findOne({ where: { email } });
```

### XSS (Cross-Site Scripting)
```javascript
// ❌ WRONG
document.innerHTML = userInput;
res.send(`<h1>${userInput}</h1>`);

// ✅ CORRECT
document.textContent = userInput;
res.json({ message: userInput });  // JSON is safe
```

### CSRF (Cross-Site Request Forgery)
```javascript
// ✅ CORRECT - Use CSRF tokens
app.use(csrf());
app.post('/action', csrfProtection, (req, res) => {
  // Token validated automatically
});
```

### Insecure Deserialization
```javascript
// ❌ WRONG
const data = JSON.parse(userInput);  // If untrusted

// ✅ CORRECT
const schema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required()
});
const { error, value } = schema.validate(userInput);
```

### Weak Cryptography
```javascript
// ❌ WRONG
const hash = crypto.createHash('md5').update(password).digest('hex');

// ✅ CORRECT
const hash = await bcrypt.hash(password, 12);
```

---

## 🔔 Monitoring & Alerting

### Log Important Events
```javascript
// ✅ Log security events
console.log(`User login: ${user.email} from ${req.ip}`);
console.log(`Failed login attempt: ${email} from ${req.ip}`);
console.log(`Role change: ${user.email} -> ${newRole}`);
console.log(`Data export: ${user.email} exported ${recordCount} records`);

// ❌ Don't log
console.log(`Password: ${password}`);
console.log(`Token: ${token}`);
```

### Alerts to Set Up
- Multiple failed login attempts
- Unauthorized access attempts
- Data export/backup downloads
- Role changes
- Admin user creation
- Database connection failures
- High error rates

---

## 📚 Resources

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE Top 25](https://cwe.mitre.org/top25/)

---

## 🆘 Security Incident Response

If you discover a security vulnerability:

1. **Do NOT** commit or push the code
2. **Do NOT** discuss publicly
3. **DO** notify the security team immediately
4. **DO** document the vulnerability
5. **DO** create a fix in a private branch
6. **DO** test thoroughly before deployment

---

## ✅ Security Checklist for New Features

When adding new features:

- [ ] Identify security requirements
- [ ] Implement authentication/authorization
- [ ] Validate all inputs
- [ ] Sanitize all outputs
- [ ] Use parameterized queries
- [ ] Add rate limiting if needed
- [ ] Log security events
- [ ] Test for vulnerabilities
- [ ] Review with security team
- [ ] Document security measures
- [ ] Update this guide if needed

---

**Questions?** Contact the security team or review the SECURITY_AUDIT_REPORT.md
