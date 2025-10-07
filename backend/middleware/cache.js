// Simple in-memory cache for small, frequently accessed data
class SimpleCache {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map();
  }

  set(key, value, ttlMs = 300000) { // Default 5 minutes
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttlMs);
    
    // Clean up expired entries periodically
    this.cleanup();
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    
    const expirationTime = this.ttl.get(key);
    if (Date.now() > expirationTime) {
      this.cache.delete(key);
      this.ttl.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }

  delete(key) {
    this.cache.delete(key);
    this.ttl.delete(key);
  }

  clear() {
    this.cache.clear();
    this.ttl.clear();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, expiration] of this.ttl.entries()) {
      if (now > expiration) {
        this.cache.delete(key);
        this.ttl.delete(key);
      }
    }
  }

  // Cache wrapper function
  async getOrSet(key, asyncFn, ttlMs = 300000) {
    let cached = this.get(key);
    if (cached !== null) {
      return cached;
    }
    
    const result = await asyncFn();
    this.set(key, result, ttlMs);
    return result;
  }
}

// Export singleton instance
module.exports = new SimpleCache();