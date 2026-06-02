// RateLimiter.gs — Sprint 2: Lead Layer
// Uses CacheService (GAS built-in). No external dependencies.
// Limits: EXTERNAL = 60 messages/lead/hr | INTERNAL = 300 requests/staff/hr

var RateLimiter = (function () {

  var LIMITS = {
    EXTERNAL: 60,   // per lead per hour
    INTERNAL: 300   // per staff member per hour
  };

  var WINDOW_SECONDS = 3600; // 1 hour

  // ── Private helpers ───────────────────────────────────────────────────────

  function _cacheKey(type, identifier) {
    return 'RL_' + type + '_' + identifier;
  }

  function _getCache() {
    return CacheService.getScriptCache();
  }

  function _getLimit(type) {
    var t = type.toUpperCase();
    if (!LIMITS.hasOwnProperty(t)) {
      throw new Error('Unknown rate limit type: ' + type + '. Use EXTERNAL or INTERNAL.');
    }
    return LIMITS[t];
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * checkRateLimit(type, identifier)
   * type:       'EXTERNAL' | 'INTERNAL'
   * identifier: lead_id (EXTERNAL) or staff user id (INTERNAL)
   * Returns: { allowed: bool, current: int, limit: int, remaining: int, resetAt: ISO string }
   */
  function checkRateLimit(type, identifier) {
    if (!identifier) throw new Error('identifier is required for rate limit check.');

    var limit   = _getLimit(type);
    var key     = _cacheKey(type, identifier);
    var cache   = _getCache();
    var stored  = cache.get(key);
    var current = stored ? parseInt(stored, 10) : 0;
    var allowed = current < limit;

    // Approximate reset time — CacheService doesn't expose TTL, so we approximate
    // by noting the window is always WINDOW_SECONDS from first increment.
    var resetAt = new Date(new Date().getTime() + WINDOW_SECONDS * 1000).toISOString();

    return {
      allowed:   allowed,
      current:   current,
      limit:     limit,
      remaining: Math.max(0, limit - current),
      resetAt:   resetAt
    };
  }

  /**
   * incrementCounter(type, identifier)
   * Bumps the counter by 1. Sets TTL to WINDOW_SECONDS on first call.
   * Returns updated check result (same shape as checkRateLimit).
   */
  function incrementCounter(type, identifier) {
    if (!identifier) throw new Error('identifier is required to increment rate limit counter.');

    var limit   = _getLimit(type);
    var key     = _cacheKey(type, identifier);
    var cache   = _getCache();
    var stored  = cache.get(key);
    var current = stored ? parseInt(stored, 10) : 0;

    var next = current + 1;
    // CacheService.put resets TTL each call, so we always store with full window.
    // This is a sliding window — acceptable for GAS where atomic counters aren't available.
    cache.put(key, String(next), WINDOW_SECONDS);

    var resetAt = new Date(new Date().getTime() + WINDOW_SECONDS * 1000).toISOString();

    return {
      allowed:   next <= limit,
      current:   next,
      limit:     limit,
      remaining: Math.max(0, limit - next),
      resetAt:   resetAt
    };
  }

  /**
   * resetCounter(type, identifier)
   * Clears the counter. Used for testing or manual staff resets.
   */
  function resetCounter(type, identifier) {
    if (!identifier) throw new Error('identifier is required to reset rate limit counter.');

    _getLimit(type); // validates type
    var key = _cacheKey(type, identifier);
    _getCache().remove(key);

    return { reset: true, type: type, identifier: identifier };
  }

  // ── Exports ───────────────────────────────────────────────────────────────
  return {
    checkRateLimit:   checkRateLimit,
    incrementCounter: incrementCounter,
    resetCounter:     resetCounter,
    LIMITS:           LIMITS
  };

})();
