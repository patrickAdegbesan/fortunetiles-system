function buildHstsValue({ maxAge, includeSubDomains, preload }) {
  const parts = [`max-age=${maxAge}`];
  if (includeSubDomains) parts.push('includeSubDomains');
  if (preload) parts.push('preload');
  return parts.join('; ');
}

function securityHeaders() {
  const csp =
    process.env.CSP_HEADER ||
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'";

  const permissionsPolicy =
    process.env.PERMISSIONS_POLICY_HEADER ||
    'geolocation=(), microphone=(), camera=(), payment=()';

  const enableHsts =
    process.env.ENABLE_HSTS === 'true' ||
    (process.env.NODE_ENV === 'production' && process.env.ENABLE_HSTS !== 'false');

  const hstsMaxAge = Number.isFinite(Number(process.env.HSTS_MAX_AGE))
    ? Number(process.env.HSTS_MAX_AGE)
    : 31536000;

  const hstsIncludeSubDomains = process.env.HSTS_INCLUDE_SUBDOMAINS !== 'false';
  const hstsPreload = process.env.HSTS_PRELOAD === 'true';

  const hstsValue = buildHstsValue({
    maxAge: hstsMaxAge,
    includeSubDomains: hstsIncludeSubDomains,
    preload: hstsPreload,
  });

  return function securityHeadersMiddleware(req, res, next) {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // Modern browsers ignore this header; keep for legacy defense-in-depth
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Prevent referrer leakage
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Disable MIME type sniffing in IE for downloads
    res.setHeader('X-Download-Options', 'noopen');

    // Prevent Adobe Flash/Acrobat cross-domain data loading
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // Content Security Policy (best-effort; can be overridden via env)
    res.setHeader('Content-Security-Policy', csp);

    // Permissions Policy
    res.setHeader('Permissions-Policy', permissionsPolicy);

    // HSTS only on secure requests
    if (enableHsts) {
      const forwardedProto = req.get('x-forwarded-proto');
      const isSecure = req.secure || forwardedProto === 'https';
      if (isSecure) {
        res.setHeader('Strict-Transport-Security', hstsValue);
      }
    }

    return next();
  };
}

module.exports = { securityHeaders };

