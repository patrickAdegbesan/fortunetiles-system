// Enhanced cache with Redis-like features for better performance
class EnhancedCache {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map();
    this.hitCount = new Map();
    this.accessTime = new Map();
  }

  set(key, value, ttlMs = 300000) { // Default 5 minutes
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttlMs);
    this.hitCount.set(key, 0);
    this.accessTime.set(key, Date.now());
    
    // Auto-cleanup every 10 minutes
    this.scheduleCleanup();
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    
    const expirationTime = this.ttl.get(key);
    if (Date.now() > expirationTime) {
      this.delete(key);
      return null;
    }
    
    // Update hit count and access time
    this.hitCount.set(key, (this.hitCount.get(key) || 0) + 1);
    this.accessTime.set(key, Date.now());
    
    return this.cache.get(key);
  }

  delete(key) {
    this.cache.delete(key);
    this.ttl.delete(key);
    this.hitCount.delete(key);
    this.accessTime.delete(key);
  }

  // Intelligent cache with longer TTL for frequently accessed data
  async getOrSetSmart(key, asyncFn, baseTtlMs = 300000) {
    let cached = this.get(key);
    if (cached !== null) {
      return cached;
    }
    
    const result = await asyncFn();
    
    // Extend TTL for database queries (they change less frequently)
    const smartTtl = key.includes('product-types') || key.includes('locations') 
      ? baseTtlMs * 2  // 10 minutes for relatively static data
      : baseTtlMs;     // 5 minutes for dynamic data
    
    this.set(key, result, smartTtl);
    return result;
  }

  // Pre-warm critical cache entries
  async preWarmCache(criticalQueries) {
    console.log('🔥 Pre-warming cache with critical queries...');
    for (const { key, queryFn, ttl } of criticalQueries) {
      try {
        const result = await queryFn();
        this.set(key, result, ttl);
        console.log(`✅ Pre-warmed: ${key}`);
      } catch (error) {
        console.error(`❌ Failed to pre-warm: ${key}`, error.message);
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      hitCounts: Object.fromEntries(this.hitCount),
      memoryUsage: process.memoryUsage()
    };
  }

  scheduleCleanup() {
    if (!this.cleanupTimer) {
      this.cleanupTimer = setInterval(() => {
        this.cleanup();
      }, 600000); // Every 10 minutes
    }
  }

  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, expiration] of this.ttl.entries()) {
      if (now > expiration) {
        this.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
    }
  }
}

// Export singleton instance
module.exports = new EnhancedCache();