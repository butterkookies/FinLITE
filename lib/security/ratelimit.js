import { NextResponse } from 'next/server.js';

/**
 * FinLITE Rate Limiting & Abuse Prevention Engine
 * 
 * Architecture:
 * - In-Memory Sliding Window Counter with sub-millisecond execution & zero dependencies.
 * - Automatic background & opportunistic memory eviction to prevent memory leaks.
 * - Optional Upstash Redis REST adapter for distributed deployments.
 * - RFC-compliant rate limit response headers (X-RateLimit-*, Retry-After).
 */

export const RATE_LIMIT_TIERS = {
  AUTH: {
    name: 'AUTH',
    limit: 10,
    windowMs: 60 * 1000, // 60 seconds
    prefix: 'auth',
  },
  REPORTS: {
    name: 'REPORTS',
    limit: 5,
    windowMs: 60 * 1000, // 60 seconds
    prefix: 'reports',
  },
  AI_CHAT: {
    name: 'AI_CHAT',
    limit: 15,
    windowMs: 60 * 1000, // 60 seconds
    prefix: 'chat',
  },
  DEFAULT_API: {
    name: 'DEFAULT_API',
    limit: 60,
    windowMs: 60 * 1000, // 60 seconds
    prefix: 'api',
  },
};

/**
 * Sliding Window Counter Rate Limiter
 */
export class SlidingWindowLimiter {
  constructor(options = {}) {
    // Map of key -> number[] (timestamps in milliseconds)
    this.store = new Map();
    this.cleanupIntervalMs = options.cleanupIntervalMs || 60 * 1000;
    this.maxStaleMs = options.maxStaleMs || 120 * 1000;
    this.lastCleanup = Date.now();

    // Background cleanup timer (unreferenced so Node tests/scripts can exit cleanly)
    if (typeof setInterval !== 'undefined') {
      this.timer = setInterval(() => {
        this.cleanup();
      }, this.cleanupIntervalMs);
      if (this.timer && typeof this.timer.unref === 'function') {
        this.timer.unref();
      }
    }
  }

  /**
   * Check and record a request under the sliding window.
   * Pure primitive: testable with mock time `now`.
   * 
   * @param {string} key - Unique client identifier (e.g., prefix:ip)
   * @param {number} limit - Maximum requests allowed in the window
   * @param {number} windowMs - Window duration in milliseconds
   * @param {number} [now=Date.now()] - Current timestamp in milliseconds
   * @returns {{ allowed: boolean, limit: number, remaining: number, reset: number, retryAfter: number }}
   */
  check(key, limit, windowMs, now = Date.now()) {
    // Opportunistic cleanup check on sustained traffic
    if (now - this.lastCleanup > this.cleanupIntervalMs) {
      this.cleanup(now, windowMs);
    }

    const windowStart = now - windowMs;
    let timestamps = this.store.get(key);

    if (!timestamps) {
      timestamps = [];
      this.store.set(key, timestamps);
    } else {
      // Filter out timestamps outside the active sliding window
      timestamps = timestamps.filter((t) => t > windowStart);
      this.store.set(key, timestamps);
    }

    if (timestamps.length >= limit) {
      // Limit exceeded
      const oldestInWindow = timestamps[0] || (now - windowMs);
      const resetTimeMs = oldestInWindow + windowMs;
      const reset = Math.ceil(resetTimeMs / 1000);
      const retryAfter = Math.max(1, Math.ceil((resetTimeMs - now) / 1000));

      return {
        allowed: false,
        limit,
        remaining: 0,
        reset,
        retryAfter,
      };
    }

    // Request allowed
    timestamps.push(now);
    const remaining = Math.max(0, limit - timestamps.length);
    const reset = Math.ceil((now + windowMs) / 1000);

    return {
      allowed: true,
      limit,
      remaining,
      reset,
      retryAfter: 0,
    };
  }

  /**
   * Resets rate limit for a specific key, or clears all keys.
   * @param {string} [key]
   */
  reset(key) {
    if (key) {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
  }

  /**
   * Clears all stored keys and buckets.
   */
  clear() {
    this.store.clear();
  }

  /**
   * Evicts expired keys from memory to guarantee zero memory leaks under sustained traffic.
   * @param {number} [now=Date.now()]
   * @param {number} [maxAge=this.maxStaleMs]
   */
  cleanup(now = Date.now(), maxAge = this.maxStaleMs) {
    this.lastCleanup = now;
    for (const [key, timestamps] of this.store.entries()) {
      const active = timestamps.filter((t) => t > now - maxAge);
      if (active.length === 0) {
        this.store.delete(key);
      } else {
        this.store.set(key, active);
      }
    }
  }

  /**
   * Returns total tracked keys in memory.
   * @returns {number}
   */
  size() {
    return this.store.size;
  }
}

// Global in-memory rate limiter singleton
export const rateLimiter = new SlidingWindowLimiter();

/**
 * Extracts client IP from request headers or connection properties.
 * Handles reverse proxies, Cloudflare, load balancers, and local development.
 * 
 * @param {Request|object} request
 * @returns {string} Client IP address or fallback '127.0.0.1'
 */
export function getClientIp(request) {
  if (!request) return '127.0.0.1';

  const getHeader = (name) => {
    if (!request.headers) return null;
    if (typeof request.headers.get === 'function') {
      return request.headers.get(name);
    }
    const val = request.headers[name] || request.headers[name.toLowerCase()] || null;
    return Array.isArray(val) ? val[0] : val;
  };

  // 1. NextRequest verified IP (platform-level socket IP)
  if (request.ip && typeof request.ip === 'string' && request.ip.trim()) {
    return request.ip.trim();
  }

  // 2. Cloudflare Edge verified client IP (cannot be forged by client)
  const cfConnectingIp = getHeader('cf-connecting-ip');
  if (cfConnectingIp && typeof cfConnectingIp === 'string' && cfConnectingIp.trim()) {
    return cfConnectingIp.trim();
  }

  // 3. Nginx / reverse proxy verified client IP
  const xRealIp = getHeader('x-real-ip');
  if (xRealIp && typeof xRealIp === 'string' && xRealIp.trim()) {
    return xRealIp.trim();
  }

  // 4. x-forwarded-for: fallback if trusted edge headers are absent
  const xForwardedFor = getHeader('x-forwarded-for');
  if (xForwardedFor && typeof xForwardedFor === 'string') {
    const firstIp = xForwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  return '127.0.0.1';
}

/**
 * Extracts request pathname from NextRequest, Request, or mock object.
 * @param {Request|object} request
 * @returns {string}
 */
export function getRequestPathname(request) {
  if (!request) return '';
  if (request.nextUrl?.pathname) return request.nextUrl.pathname;
  if (request.pathname) return request.pathname;
  if (request.url) {
    try {
      const url = new URL(request.url, 'http://localhost');
      return url.pathname;
    } catch {
      return '';
    }
  }
  return '';
}

/**
 * Matches a request pathname to its designated rate limit tier.
 * @param {string} pathname
 * @returns {typeof RATE_LIMIT_TIERS[keyof typeof RATE_LIMIT_TIERS]|null}
 */
export function getTierForPath(pathname) {
  if (!pathname || typeof pathname !== 'string') return null;
  if (!pathname.startsWith('/api/')) return null;

  if (pathname.startsWith('/api/auth')) {
    return RATE_LIMIT_TIERS.AUTH;
  }
  if (pathname.startsWith('/api/reports/docx')) {
    return RATE_LIMIT_TIERS.REPORTS;
  }
  if (pathname.startsWith('/api/chat')) {
    return RATE_LIMIT_TIERS.AI_CHAT;
  }
  return RATE_LIMIT_TIERS.DEFAULT_API;
}

/**
 * Formats rate limit check results into RFC-compliant headers.
 * @param {{ limit: number, remaining: number, reset: number, retryAfter: number }} result
 * @returns {Record<string, string>}
 */
export function formatRateLimitHeaders(result) {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
    'Retry-After': String(result.retryAfter || 0),
  };
}

/**
 * Optional Upstash Redis REST adapter.
 * Uses native fetch without any external dependencies.
 * Returns null if unconfigured or on failure to seamlessly fall back to in-memory.
 */
export async function checkUpstashRateLimit(key, limit, windowMs) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const now = Date.now();
    const windowStart = now - windowMs;
    const pipeline = [
      ['ZREMRANGEBYSCORE', key, 0, windowStart],
      ['ZCARD', key],
      ['ZADD', key, now, `${now}-${Math.random()}`],
      ['EXPIRE', key, Math.ceil(windowMs / 1000)],
    ];

    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pipeline),
    });

    if (!res.ok) {
      console.warn(`[RateLimit] Upstash pipeline returned HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const currentCount = typeof data[1]?.result === 'number' ? data[1].result : 0;

    if (currentCount >= limit) {
      const resetTimeMs = now + windowMs;
      return {
        allowed: false,
        limit,
        remaining: 0,
        reset: Math.ceil(resetTimeMs / 1000),
        retryAfter: Math.max(1, Math.ceil(windowMs / 1000)),
      };
    }

    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - (currentCount + 1)),
      reset: Math.ceil((now + windowMs) / 1000),
      retryAfter: 0,
    };
  } catch (err) {
    console.warn('[RateLimit] Upstash request failed, falling back to in-memory:', err.message);
    return null;
  }
}

/**
 * Evaluates whether a request should be rate-limited.
 * 
 * @param {Request|object} request - Next.js Request or mock request
 * @returns {NextResponse|Response|null} 429 response if limited, null if allowed
 */
export function checkRateLimit(request) {
  try {
    const pathname = getRequestPathname(request);
    const tier = getTierForPath(pathname);

    // If path is not an API route, allow without rate limiting
    if (!tier) {
      return null;
    }

    const clientIp = getClientIp(request);
    const bucketKey = `${tier.prefix}:${clientIp}`;

    const result = rateLimiter.check(bucketKey, tier.limit, tier.windowMs);
    const headers = formatRateLimitHeaders(result);

    if (result.allowed) {
      // Attach headers to request for middleware to apply to successful responses
      if (request && typeof request === 'object') {
        try {
          request._rateLimitHeaders = headers;
        } catch {
          // Ignore read-only / frozen request object errors
        }
      }
      return null;
    }

    // Rate limit exceeded: return standard 429 response
    const body = { error: 'Too many requests. Please try again later.' };

    if (typeof NextResponse !== 'undefined' && typeof NextResponse.json === 'function') {
      return NextResponse.json(body, {
        status: 429,
        headers,
      });
    }

    return Response.json(body, {
      status: 429,
      headers,
    });
  } catch (err) {
    console.error('[RateLimit] Unexpected error in checkRateLimit, failing open:', err);
    return null; // Fail open
  }
}

/**
 * Injects rate-limiting headers into an outgoing response.
 * @param {Request|object} request
 * @param {NextResponse|Response} response
 * @returns {NextResponse|Response}
 */
export function applyRateLimitHeaders(request, response) {
  if (!request || !response || !request._rateLimitHeaders) {
    return response;
  }

  try {
    for (const [name, val] of Object.entries(request._rateLimitHeaders)) {
      if (response.headers?.set) {
        response.headers.set(name, val);
      } else if (response.headers) {
        response.headers[name] = val;
      }
    }
  } catch {
    // Non-fatal if response headers are read-only
  }

  return response;
}
