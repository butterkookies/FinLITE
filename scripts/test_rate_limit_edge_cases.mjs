/**
 * FinLITE Rate Limiter Dedicated Edge-Case & Exhaustive QA Test Suite
 * 
 * Verifies:
 * 1. Tiered burst tests (AUTH, REPORTS, AI_CHAT, DEFAULT_API) -> 429 with standard JSON
 * 2. RFC Header verification (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After)
 * 3. Cross-client and cross-tier isolation
 * 4. Temporal recovery & explicit reset()
 */

import {
  SlidingWindowLimiter,
  RATE_LIMIT_TIERS,
  getClientIp,
  getTierForPath,
  checkRateLimit,
  applyRateLimitHeaders,
  rateLimiter,
} from '../lib/security/ratelimit.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('============================================================');
console.log('🧪 FINLITE RATE LIMITING EDGE CASES & COMPREHENSIVE QA');
console.log('============================================================\n');

// --------------------------------------------------------------------------
// TEST SUITE 1: Tiered Burst Tests & Correct JSON Error on 429
// --------------------------------------------------------------------------
console.log('--- 1. BURST TESTS ACROSS ALL 4 TIERS ---');

const testTiers = [
  { tier: RATE_LIMIT_TIERS.AUTH, path: '/api/auth/login', sampleIp: '10.0.0.1' },
  { tier: RATE_LIMIT_TIERS.REPORTS, path: '/api/reports/docx', sampleIp: '10.0.0.2' },
  { tier: RATE_LIMIT_TIERS.AI_CHAT, path: '/api/chat', sampleIp: '10.0.0.3' },
  { tier: RATE_LIMIT_TIERS.DEFAULT_API, path: '/api/transactions', sampleIp: '10.0.0.4' },
];

for (const { tier, path, sampleIp } of testTiers) {
  const limiter = new SlidingWindowLimiter();
  const bucketKey = `${tier.prefix}:${sampleIp}`;

  // Exhaust all allowed requests
  for (let i = 0; i < tier.limit; i++) {
    const res = limiter.check(bucketKey, tier.limit, tier.windowMs);
    if (i === 0) {
      assert(res.allowed === true && res.remaining === tier.limit - 1, `[${tier.name}] 1st request allowed with remaining ${tier.limit - 1}`);
    }
  }

  // 1 over the limit: burst overflow
  const burstRes = limiter.check(bucketKey, tier.limit, tier.windowMs);
  assert(burstRes.allowed === false, `[${tier.name}] Request #${tier.limit + 1} blocked (allowed === false)`);
  assert(burstRes.remaining === 0, `[${tier.name}] Blocked request remaining === 0`);
  assert(burstRes.retryAfter > 0 && burstRes.retryAfter <= 60, `[${tier.name}] Retry-After is positive (${burstRes.retryAfter}s)`);

  // Verify checkRateLimit wrapper returning Next.js 429 response
  rateLimiter.reset(bucketKey);
  const mockReq = {
    nextUrl: { pathname: path },
    headers: { 'x-forwarded-for': sampleIp },
  };

  // Burn limit
  for (let i = 0; i < tier.limit; i++) {
    const allowed = checkRateLimit(mockReq);
    if (i === 0) assert(allowed === null, `[${tier.name}] checkRateLimit returns null on allowed request`);
  }

  // Next one triggers 429
  const response429 = checkRateLimit(mockReq);
  assert(response429 !== null && response429.status === 429, `[${tier.name}] Over-limit triggers HTTP 429 status`);
  
  const body = await response429.json();
  assert(body.error === 'Too many requests. Please try again later.', `[${tier.name}] JSON body contains exact error message: "${body.error}"`);
}

// --------------------------------------------------------------------------
// TEST SUITE 2: Header Verification
// --------------------------------------------------------------------------
console.log('\n--- 2. RFC RESPONSE HEADER VERIFICATION ---');

{
  const testIp = '172.16.0.50';
  const path = '/api/reports/docx';
  const tier = RATE_LIMIT_TIERS.REPORTS;
  const bucketKey = `${tier.prefix}:${testIp}`;
  rateLimiter.reset(bucketKey);

  const mockReq = {
    nextUrl: { pathname: path },
    headers: { 'x-real-ip': testIp },
  };

  // Step 1: First request headers
  checkRateLimit(mockReq);
  assert(mockReq._rateLimitHeaders['X-RateLimit-Limit'] === String(tier.limit), `Allowed request sets X-RateLimit-Limit: ${tier.limit}`);
  assert(mockReq._rateLimitHeaders['X-RateLimit-Remaining'] === String(tier.limit - 1), `Allowed request sets X-RateLimit-Remaining: ${tier.limit - 1}`);
  assert(Number(mockReq._rateLimitHeaders['X-RateLimit-Reset']) > Math.floor(Date.now() / 1000), `Allowed request sets valid future X-RateLimit-Reset`);
  assert(mockReq._rateLimitHeaders['Retry-After'] === '0', `Allowed request sets Retry-After: 0`);

  // Burn remaining requests down to 0
  for (let i = 1; i < tier.limit; i++) {
    checkRateLimit(mockReq);
  }
  assert(mockReq._rateLimitHeaders['X-RateLimit-Remaining'] === '0', `Last allowed request sets X-RateLimit-Remaining: 0`);

  // Now trigger 429
  const res429 = checkRateLimit(mockReq);
  assert(res429.headers.get('X-RateLimit-Limit') === String(tier.limit), `429 response contains X-RateLimit-Limit: ${tier.limit}`);
  assert(res429.headers.get('X-RateLimit-Remaining') === '0', `429 response contains X-RateLimit-Remaining: 0`);
  assert(Number(res429.headers.get('X-RateLimit-Reset')) > Math.floor(Date.now() / 1000), `429 response contains future X-RateLimit-Reset`);
  assert(Number(res429.headers.get('Retry-After')) > 0, `429 response contains positive Retry-After`);

  // Test applyRateLimitHeaders onto an arbitrary response
  const fakeResponse = new Response('ok', { status: 200, headers: new Headers() });
  applyRateLimitHeaders(mockReq, fakeResponse);
  assert(fakeResponse.headers.get('X-RateLimit-Limit') === String(tier.limit), 'applyRateLimitHeaders successfully copies headers to Response');
}

// --------------------------------------------------------------------------
// TEST SUITE 3: Cross-Client & Cross-Tier Isolation
// --------------------------------------------------------------------------
console.log('\n--- 3. CROSS-CLIENT & CROSS-TIER ISOLATION ---');

{
  const limiter = new SlidingWindowLimiter();
  const clientA = 'auth:192.168.1.100';
  const clientB = 'auth:192.168.1.200';
  const limit = 10;
  const windowMs = 60000;

  // Fully exhaust Client A
  for (let i = 0; i < limit; i++) {
    limiter.check(clientA, limit, windowMs);
  }
  const blockA = limiter.check(clientA, limit, windowMs);
  assert(blockA.allowed === false, 'Client A is blocked after exhausting quota');

  // Verify Client B is completely unblocked and unaffected
  const testB = limiter.check(clientB, limit, windowMs);
  assert(testB.allowed === true, 'Client B is allowed despite Client A being exhausted');
  assert(testB.remaining === limit - 1, `Client B retains full remaining capacity (${limit - 1})`);

  // Verify Cross-Tier Isolation for Client A on another endpoint
  const clientAReports = 'reports:192.168.1.100';
  const reportsCheck = limiter.check(clientAReports, RATE_LIMIT_TIERS.REPORTS.limit, RATE_LIMIT_TIERS.REPORTS.windowMs);
  assert(reportsCheck.allowed === true, 'Client A can still access REPORTS tier even when AUTH tier is exhausted');
  assert(reportsCheck.remaining === RATE_LIMIT_TIERS.REPORTS.limit - 1, 'Client A REPORTS tier counter is completely isolated');

  const clientAChat = 'chat:192.168.1.100';
  const chatCheck = limiter.check(clientAChat, RATE_LIMIT_TIERS.AI_CHAT.limit, RATE_LIMIT_TIERS.AI_CHAT.windowMs);
  assert(chatCheck.allowed === true, 'Client A can still access AI_CHAT tier even when AUTH tier is exhausted');
}

// --------------------------------------------------------------------------
// TEST SUITE 4: Recovery (Simulated Expiry & .reset())
// --------------------------------------------------------------------------
console.log('\n--- 4. RECOVERY (EXPIRY & EXPLICIT RESET) ---');

{
  const limiter = new SlidingWindowLimiter();
  const key = 'recovery-test-key';
  const limit = 3;
  const windowMs = 10000; // 10 seconds
  const t0 = 500000;

  // Fill up quota at t0
  limiter.check(key, limit, windowMs, t0);
  limiter.check(key, limit, windowMs, t0 + 1000);
  limiter.check(key, limit, windowMs, t0 + 2000);

  // Exceeded at t0 + 3000
  const blocked = limiter.check(key, limit, windowMs, t0 + 3000);
  assert(blocked.allowed === false, 'Quota exhausted before window expiry');

  // Time travels past window: t0 + 10001 (oldest request at t0 expires from window)
  const recovered1 = limiter.check(key, limit, windowMs, t0 + 10001);
  assert(recovered1.allowed === true, 'Request allowed again after oldest timestamp slides out of window');

  // Time travels completely past window: t0 + 25000 (all previous requests expired)
  const fullRecover = limiter.check(key, limit, windowMs, t0 + 25000);
  assert(fullRecover.allowed === true && fullRecover.remaining === limit - 1, 'Full quota restored after all requests expire past window');

  // Explicit reset() method testing
  limiter.check(key, limit, windowMs, t0 + 25000);
  limiter.check(key, limit, windowMs, t0 + 25000);
  assert(limiter.check(key, limit, windowMs, t0 + 25000).allowed === false, 'Exhausted before reset');

  limiter.reset(key);
  const afterReset = limiter.check(key, limit, windowMs, t0 + 25000);
  assert(afterReset.allowed === true && afterReset.remaining === limit - 1, 'Explicit limiter.reset(key) immediately unblocks client with fresh quota');

  // Limiter .clear() testing
  limiter.check('key-x', 5, 5000);
  limiter.check('key-y', 5, 5000);
  assert(limiter.size() >= 2, 'Limiter stores multiple active client keys');
  limiter.clear();
  assert(limiter.size() === 0, 'Limiter .clear() evicts all active keys');

  // Memory leak prevention via .cleanup()
  const cleanLimiter = new SlidingWindowLimiter();
  cleanLimiter.check('stale-1', 5, 5000, 1000);
  cleanLimiter.check('stale-2', 5, 5000, 2000);
  assert(cleanLimiter.size() === 2, 'Tracking 2 clients before cleanup');
  cleanLimiter.cleanup(20000, 5000); // 20s later, maxAge 5s
  assert(cleanLimiter.size() === 0, 'cleanup() swept expired timestamps and freed memory');
}

console.log('\n============================================================');
console.log(`EDGE CASE TEST RESULTS: ${passed} Passed, ${failed} Failed`);
console.log('============================================================\n');

process.exit(failed === 0 ? 0 : 1);
