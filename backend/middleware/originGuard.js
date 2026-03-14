function normalizeOrigin(origin) {
  if (!origin) return origin;
  return origin.replace(/\/$/, '');
}

function originFromReferer(referer) {
  try {
    if (!referer) return null;
    const url = new URL(referer);
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

function createWriteOriginGuard(allowedOrigins = []) {
  const normalizedAllowed = allowedOrigins
    .map(normalizeOrigin)
    .filter(Boolean);

  const allowAll = normalizedAllowed.includes('*');

  return function writeOriginGuard(req, res, next) {
    const method = (req.method || '').toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();

    const origin = normalizeOrigin(req.get('origin')) || originFromReferer(req.get('referer'));
    if (!origin) return next(); // allow non-browser clients
    if (allowAll || normalizedAllowed.includes(origin)) return next();

    return res.status(403).json({ message: 'Forbidden origin' });
  };
}

module.exports = { createWriteOriginGuard };

