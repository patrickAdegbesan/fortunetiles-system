function createRateLimiter(options = {}) {
  const {
    windowMs = 60_000,
    max = 60,
    keyGenerator = (req) => req.ip,
    skip = () => false,
    message = 'Too many requests, please try again later.',
    statusCode = 429,
  } = options;

  const hits = new Map(); // key -> { count, resetAt }

  function cleanup(now) {
    // Best-effort cleanup to avoid unbounded memory growth.
    for (const [key, entry] of hits.entries()) {
      if (now > entry.resetAt) hits.delete(key);
    }
  }

  return function rateLimiter(req, res, next) {
    try {
      if (skip(req)) return next();

      const key = keyGenerator(req);
      if (!key) return next();

      const now = Date.now();
      let entry = hits.get(key);
      if (!entry || now > entry.resetAt) {
        entry = { count: 0, resetAt: now + windowMs };
        hits.set(key, entry);
      }

      entry.count += 1;

      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

      if (entry.count > max) {
        const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
        res.setHeader('Retry-After', String(retryAfterSeconds));

        // Occasional cleanup when limit is hit.
        if (hits.size > 5000) cleanup(now);

        return res.status(statusCode).json({
          message,
          retryAfterSeconds,
        });
      }

      if (hits.size > 10000) cleanup(now);
      return next();
    } catch (err) {
      return next();
    }
  };
}

module.exports = { createRateLimiter };

