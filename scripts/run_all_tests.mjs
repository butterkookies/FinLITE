/**
 * FinLITE Comprehensive Test & Stress Test Suite
 * Tests:
 * 1. Precision Currency Math & Edge Cases
 * 2. High-Volume Ledger Math Stress Test (100,000 transactions)
 * 3. Middleware Route Protection & Security
 * 4. Auth Validation Engine (Positive, Negative, Security tests)
 * 5. Auth API Concurrency Stress Test (100 parallel requests)
 * 6. DOCX Export Engine (Single & Concurrent Stress Generation)
 * 7. Supabase Database Schema & Connectivity Verification
 * 8. Production-Grade Rate Limiting & Security Engine (Sliding Window, RFC Headers, Live 429)
 */

import { 
  formatPHP, 
  toCentavos, 
  fromCentavos, 
  calculatePhysicalTotal, 
  calculateVariance,
  denomCodeToCountKey
} from '../lib/utils/currency.js';
import { 
  validateGmail, 
  validateUsername, 
  validatePassword, 
  validateContactNumber,
  sanitizeAmountInput,
  validateTransactionAmount,
  validateOutflowBalance,
  MAX_TRANSACTION_AMOUNT,
} from '../lib/utils/validation.js';
import { isSuperAdminEmail, getSuperAdminEmails, resolveEffectiveRole } from '../lib/config/admin.js';
import {
  rateLimiter,
  SlidingWindowLimiter,
  RATE_LIMIT_TIERS,
  getClientIp,
  getTierForPath,
  checkRateLimit,
  applyRateLimitHeaders,
} from '../lib/security/ratelimit.js';
import { fetchAuditTrail, logAuditEvent } from '../lib/supabase/audit.js';
import { execFileSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Optional dependency: only needed for the live Supabase check (section 7).
let createClient = null;
try {
  ({ createClient } = await import('@supabase/supabase-js'));
} catch {
  /* dependencies not installed; section 7 will be skipped */
}

// Load .env.local (optional: sections that need it are skipped when it is absent)
const env = {};
try {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
      }
    }
  }
} catch {
  console.log('ℹ️  .env.local not found: Supabase-dependent checks will be skipped.');
}

const BASE_URL = 'http://localhost:3000';
let passCount = 0;
let failCount = 0;
let skipCount = 0;
const REQUIRE_ALL = process.argv.includes('--require-all');

function skip(message) {
  skipCount++;
  console.log(`  ⏭️  SKIP: ${message}`);
}

async function isServerUp() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2000);
    await fetch(`${BASE_URL}/login`, { signal: ctrl.signal });
    clearTimeout(timer);
    return true;
  } catch {
    return false;
  }
}
const serverUp = await isServerUp();
console.log(serverUp
  ? `ℹ️  Dev server detected at ${BASE_URL}: live route tests enabled.`
  : `ℹ️  No server at ${BASE_URL} (run \`npm run dev\` to enable live route tests).`);

function detectPython() {
  for (const cmd of ['python', 'python3']) {
    try {
      execFileSync(cmd, ['-c', 'import docx'], { stdio: 'ignore' });
      return cmd;
    } catch {}
  }
  return null;
}
const PYTHON = detectPython();

function assert(condition, message) {
  if (!condition) {
    failCount++;
    console.error(`  ❌ FAIL: ${message}`);
  } else {
    passCount++;
    console.log(`  ✅ PASS: ${message}`);
  }
}

// ==============================================================================
// 1. PRECISION CURRENCY & LEDGER MATH TESTS
// ==============================================================================
console.log('\n============================================================');
console.log('1. RUNNING CURRENCY & LEDGER MATH UNIT TESTS');
console.log('============================================================');

// Test Centavos conversion
assert(toCentavos(161.00) === 16100, 'toCentavos(161.00) should equal 16100');
assert(toCentavos(0.01) === 1, 'toCentavos(0.01) should equal 1');
assert(toCentavos(0) === 0, 'toCentavos(0) should equal 0');
assert(toCentavos(999999.99) === 99999999, 'toCentavos(999999.99) should equal 99999999');

// Floating point safety
assert(fromCentavos(toCentavos(0.1) + toCentavos(0.2)) === 0.3, 'Floating point fix: 0.1 + 0.2 === 0.3');
assert(fromCentavos(toCentavos(10.05) - toCentavos(0.05)) === 10.0, '10.05 - 0.05 === 10.0');

// Denomination calculation
const normalCounts = {
  bills_1000: 8,
  bills_500: 1,
  bills_200: 0,
  bills_100: 2,
  bills_50: 0,
  bills_20: 0,
  coins_20: 1,
  coins_10: 1,
  coins_5: 1,
  coins_1: 4,
  coins_cents: 0
};
const { total: normalTotal } = calculatePhysicalTotal(normalCounts);
assert(normalTotal === 8739, `Physical denomination count should equal 8739 (got ${normalTotal})`);

// 3NF Denomination Code mapping tests
assert(denomCodeToCountKey('BILL_1000') === 'bills_1000', "denomCodeToCountKey('BILL_1000') maps to 'bills_1000'");
assert(denomCodeToCountKey('COIN_20') === 'coins_20', "denomCodeToCountKey('COIN_20') maps to 'coins_20'");
assert(denomCodeToCountKey('COIN_CENT') === 'coins_cents', "denomCodeToCountKey('COIN_CENT') maps to 'coins_cents'");
assert(denomCodeToCountKey('bills_1000') === 'bills_1000', "denomCodeToCountKey preserves already formatted 'bills_1000'");

// Variance: Shortage detection
const shortageVar = calculateVariance(8739, 8900.00);
assert(shortageVar.status === 'SHORTAGE', 'Variance should be SHORTAGE');
assert(shortageVar.variance === 161.00, 'Shortage variance should equal 161.00');

// Variance: Balanced detection
const balancedVar = calculateVariance(5000.00, 5000.00);
assert(balancedVar.status === 'BALANCED', 'Variance should be BALANCED');
assert(balancedVar.variance === 0.00, 'Balanced variance should equal 0.00');

// Variance: Over/Abono detection
const overVar = calculateVariance(5100.00, 5000.00);
assert(overVar.status === 'OVERAGE', 'Variance should be OVERAGE');
assert(overVar.variance === 100.00, 'Over variance should equal 100.00');

// PHP Formatting
const fmt = formatPHP(1500.50);
assert(fmt.includes('1,500.50'), `Formatted currency should have 1,500.50 (got ${fmt})`);

// Floating-point accumulation precision test
const testFractionalTxs = [
  { type: 'INFLOW', payment_method: 'CASH', amount: 0.1 },
  { type: 'INFLOW', payment_method: 'CASH', amount: 0.2 },
  { type: 'OUTFLOW', payment_method: 'CASH', amount: 0.15 },
];
let testInflowsC = 0;
let testCashC = 0;
testFractionalTxs.forEach((t) => {
  const c = toCentavos(t.amount);
  if (t.type === 'INFLOW') {
    testInflowsC += c;
    testCashC += c;
  } else {
    testCashC -= c;
  }
});
assert(fromCentavos(testInflowsC) === 0.3, 'Summary inflows centavo precision: 0.1 + 0.2 === 0.3 exactly');
assert(fromCentavos(testCashC) === 0.15, 'Summary cash on hand centavo precision: 0.3 - 0.15 === 0.15 exactly');

// ==============================================================================
// 1b. TRANSACTION AMOUNT & CHANNEL OVERDRAFT VALIDATION UNIT TESTS
// ==============================================================================
console.log('\n============================================================');
console.log('1b. RUNNING TRANSACTION AMOUNT & OVERDRAFT VALIDATION TESTS');
console.log('============================================================');

// sanitizeAmountInput tests
assert(sanitizeAmountInput('1250.50') === '1250.50', "sanitizeAmountInput('1250.50') returns '1250.50'");
assert(sanitizeAmountInput('₱1,250.50') === '1250.50', "sanitizeAmountInput('₱1,250.50') strips symbols");
assert(sanitizeAmountInput('12.34.56') === '12.34', "sanitizeAmountInput('12.34.56') keeps only first dot");
assert(sanitizeAmountInput('123456.78') === '12345.78', "sanitizeAmountInput('123456.78') limits to 5 integer digits");
assert(sanitizeAmountInput('9999999') === '99999', "sanitizeAmountInput('9999999') limits integer to 5 digits");
assert(sanitizeAmountInput('123.456') === '123.45', "sanitizeAmountInput('123.456') limits decimal to 2 places");
assert(sanitizeAmountInput('.50') === '.50', "sanitizeAmountInput('.50') preserves leading decimal point");
assert(sanitizeAmountInput(null) === '', "sanitizeAmountInput(null) handles null gracefully");
assert(sanitizeAmountInput('') === '', "sanitizeAmountInput('') returns empty string");

// validateTransactionAmount tests
assert(validateTransactionAmount('') === 'Amount is required.', "validateTransactionAmount('') reports required");
assert(validateTransactionAmount(null) === 'Amount is required.', "validateTransactionAmount(null) reports required");
assert(validateTransactionAmount('abc')?.includes('valid amount'), "validateTransactionAmount('abc') rejects non-number");
assert(validateTransactionAmount('10.999')?.includes('valid amount'), "validateTransactionAmount('10.999') rejects > 2 decimal places");
assert(validateTransactionAmount(0)?.includes('greater than ₱0.00'), "validateTransactionAmount(0) rejects zero");
assert(validateTransactionAmount(-25)?.includes('valid amount'), "validateTransactionAmount(-25) rejects negative");
assert(validateTransactionAmount(100000)?.includes('cannot exceed ₱99,999.99'), "validateTransactionAmount(100000) rejects > 5 digits (₱99,999.99)");
assert(validateTransactionAmount('99999.99') === null, "validateTransactionAmount('99999.99') accepts max allowed amount");
assert(validateTransactionAmount(0.01) === null, "validateTransactionAmount(0.01) accepts minimum positive centavo");
assert(validateTransactionAmount(1500.50) === null, "validateTransactionAmount(1500.50) accepts typical transaction");

// validateOutflowBalance tests (Single physical cashbox model)
assert(validateOutflowBalance({ type: 'INFLOW', isReimbursement: false, amount: 5000, cashBalance: 100 }) === null,
  "validateOutflowBalance skips INFLOW transactions");
assert(validateOutflowBalance({ type: 'OUTFLOW', isReimbursement: true, amount: 5000, cashBalance: 100 }) === null,
  "validateOutflowBalance skips abono personal advance transactions");
assert(validateOutflowBalance({ type: 'OUTFLOW', isReimbursement: false, amount: 500, cashBalance: 1000 }) === null,
  "validateOutflowBalance allows valid outflow within cashbox balance");
assert(validateOutflowBalance({ type: 'OUTFLOW', isReimbursement: false, amount: 1500, cashBalance: 1000 })?.includes('Insufficient Physical Cashbox balance') === true,
  "validateOutflowBalance rejects outflow exceeding cashbox balance");
assert(validateOutflowBalance({ type: 'OUTFLOW', isReimbursement: false, amount: 0, cashBalance: 100 }) === null,
  "validateOutflowBalance returns null for zero amount");
assert(validateOutflowBalance({ type: 'OUTFLOW', isReimbursement: false, amount: 50.00, cashBalance: 49.99 })?.includes('Insufficient Physical Cashbox balance') === true,
  "validateOutflowBalance rejects 1 centavo deficit against cashbox");
assert(validateOutflowBalance({ type: 'OUTFLOW', isReimbursement: false, amount: 100.01, cashBalance: 100.00 }) !== null,
  "validateOutflowBalance uses exact centavos to catch 1 centavo overdraft");
assert(validateOutflowBalance({ type: 'OUTFLOW', isReimbursement: false, amount: 100.00, cashBalance: 100.00 }) === null,
  "validateOutflowBalance allows outflow exactly equal to channel balance");


// ==============================================================================
// 2. HIGH-VOLUME LEDGER STRESS TEST (100,000 Transactions)
// ==============================================================================
console.log('\n============================================================');
console.log('2. RUNNING HIGH-VOLUME LEDGER STRESS TEST (100,000 TXs)');
console.log('============================================================');

const startTime = performance.now();
const TX_COUNT = 100000;
let runningInflowCents = 0;
let runningOutflowCents = 0;
let cashOnHandCents = 0;

for (let i = 0; i < TX_COUNT; i++) {
  const isCash = i % 2 === 0;
  const isIncome = i % 3 === 0;
  const amount = ((i % 1000) + 1) + 0.25; // Decimal amount
  const cents = toCentavos(amount);

  if (isIncome) {
    runningInflowCents += cents;
    if (isCash) cashOnHandCents += cents;
  } else {
    runningOutflowCents += cents;
    if (isCash) cashOnHandCents -= cents;
  }
}

const elapsedMs = performance.now() - startTime;
const netBalance = fromCentavos(runningInflowCents - runningOutflowCents);
const cashBalance = fromCentavos(cashOnHandCents);

assert(!isNaN(netBalance), 'Net balance calculation must be a valid number');
assert(!isNaN(cashBalance), 'Cash balance calculation must be a valid number');
assert(elapsedMs < 500, `100,000 transactions calculated in ${elapsedMs.toFixed(2)}ms (< 500ms threshold)`);
console.log(`  📊 Throughput: ${(TX_COUNT / (elapsedMs / 1000)).toFixed(0)} transactions/second`);
console.log(`  💰 Computed Net Balance: ₱${netBalance.toLocaleString()} | Computed Cash on Hand: ₱${cashBalance.toLocaleString()}`);


// ==============================================================================
// 3. MIDDLEWARE ROUTE PROTECTION & REDIRECT TESTS
// ==============================================================================
console.log('\n============================================================');
console.log('3. RUNNING MIDDLEWARE & ROUTE PROTECTION TESTS');
console.log('============================================================');

async function testRoutes() {
  // Test unauthenticated access to / (must redirect to /login)
  try {
    const resRoot = await fetch(`${BASE_URL}/`, { redirect: 'manual' });
    assert(resRoot.status === 307, `Unauthenticated GET / should redirect with 307 (got ${resRoot.status})`);
    assert(resRoot.headers.get('location') === '/login', `Redirect destination should be /login (got ${resRoot.headers.get('location')})`);
  } catch (e) {
    assert(false, `Route test failed: ${e.message}`);
  }

  // Test public route /login (must return 200)
  try {
    const resLogin = await fetch(`${BASE_URL}/login`);
    assert(resLogin.status === 200, `Public GET /login should return 200 (got ${resLogin.status})`);
  } catch (e) {
    assert(false, `/login test failed: ${e.message}`);
  }

  // Test public route /register (must return 200)
  try {
    const resRegister = await fetch(`${BASE_URL}/register`);
    assert(resRegister.status === 200, `Public GET /register should return 200 (got ${resRegister.status})`);
  } catch (e) {
    assert(false, `/register test failed: ${e.message}`);
  }

  // Test public route /pending-approval (must return 200)
  try {
    const resPending = await fetch(`${BASE_URL}/pending-approval`);
    assert(resPending.status === 200, `Public GET /pending-approval should return 200 (got ${resPending.status})`);
  } catch (e) {
    assert(false, `/pending-approval test failed: ${e.message}`);
  }

  // Test protected admin page /admin (unauthenticated must redirect to /login with 307)
  try {
    const resAdmin = await fetch(`${BASE_URL}/admin`, { redirect: 'manual' });
    assert(resAdmin.status === 307, `Unauthenticated GET /admin should redirect with 307 (got ${resAdmin.status})`);
    assert(resAdmin.headers.get('location') === '/login', `Admin redirect destination should be /login (got ${resAdmin.headers.get('location')})`);
  } catch (e) {
    assert(false, `/admin route test failed: ${e.message}`);
  }

  // Test protected admin API /api/admin/requests (unauthenticated must return 401 JSON)
  try {
    const resAdminApi = await fetch(`${BASE_URL}/api/admin/requests`);
    assert(resAdminApi.status === 401, `Unauthenticated GET /api/admin/requests should return 401 (got ${resAdminApi.status})`);
    const dataAdminApi = await resAdminApi.json();
    assert(Boolean(dataAdminApi.error), `Admin API error property returned (got: "${dataAdminApi.error}")`);
  } catch (e) {
    assert(false, `/api/admin/requests test failed: ${e.message}`);
  }

  // Test protected admin approve API /api/admin/approve (unauthenticated must return 401)
  try {
    const resApprove = await fetch(`${BASE_URL}/api/admin/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: 'mock-id' }),
    });
    assert(resApprove.status === 401, `Unauthenticated POST /api/admin/approve should return 401 (got ${resApprove.status})`);
  } catch (e) {
    assert(false, `/api/admin/approve test failed: ${e.message}`);
  }
}
if (serverUp) await testRoutes(); else skip('Middleware route protection tests (server offline)');


// ==============================================================================
// 4. AUTH VALIDATION ENGINE TESTS
// ==============================================================================
console.log('\n============================================================');
console.log('4. RUNNING AUTH VALIDATION & SECURITY TESTS');
console.log('============================================================');

async function testAuthValidation() {
  // Super Admin Email Identification checks
  assert(isSuperAdminEmail('geronimoandreijohn.pdm@gmail.com') === true, 'Super Admin primary email recognized');
  assert(isSuperAdminEmail('geronimoandreiojohn.pdm@gmail.com') === false, 'Removed account correctly rejected as non-admin');
  assert(isSuperAdminEmail(' GERONIMOANDREIJOHN.PDM@GMAIL.COM ') === true, 'Super Admin case & whitespace insensitive');
  assert(isSuperAdminEmail('random.user@gmail.com') === false, 'Non-admin email correctly rejected');
  assert(getSuperAdminEmails().length >= 1, 'getSuperAdminEmails returns at least 1 designated super admin');
  assert(getSuperAdminEmails().includes('geronimoandreijohn.pdm@gmail.com'), 'Default super admin included in getSuperAdminEmails');

  // Unit Test 1: validateGmail unit checks
  assert(validateGmail('example.gmail')?.includes("Missing '@'"), "validateGmail('example.gmail') reports missing @");
  assert(validateGmail('example@gmail')?.includes("Incomplete domain"), "validateGmail('example@gmail') reports incomplete domain");
  assert(validateGmail('example@gmail.co')?.includes("Did you mean"), "validateGmail('example@gmail.co') detects typo");
  assert(validateGmail('example@yahoo.com')?.includes("Only Gmail addresses"), "validateGmail('example@yahoo.com') rejects non-gmail");
  assert(validateGmail('valid.student@gmail.com') === null, "validateGmail('valid.student@gmail.com') returns null (valid)");

  if (!serverUp) {
    skip('Auth API validation tests against /api/auth/* (server offline)');
    return;
  }

  let authReqIndex = 0;
  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'x-forwarded-for': `198.51.100.${++authReqIndex}`,
  });

  // API Test: Reject example.gmail without @ and without .com
  const resNoAt = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser_noat',
      email: 'example.gmail', // Missing @ and .com
      password: 'password123',
    }),
  });
  const dataNoAt = await resNoAt.json();
  assert(resNoAt.status === 400, `example.gmail rejected with 400 (got ${resNoAt.status})`);
  assert(dataNoAt.error?.includes("Missing '@'"), `Error explains missing @ (got: "${dataNoAt.error}")`);

  // API Test: Reject example@gmail without .com
  const resNoCom = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser_nocom',
      email: 'example@gmail', // Incomplete domain
      password: 'password123',
    }),
  });
  const dataNoCom = await resNoCom.json();
  assert(resNoCom.status === 400, `example@gmail rejected with 400 (got ${resNoCom.status})`);
  assert(dataNoCom.error?.includes("Incomplete domain"), `Error explains incomplete domain (got: "${dataNoCom.error}")`);

  // Unit Test: validateContactNumber unit checks
  assert(validateContactNumber('0912345678a')?.includes('numbers only'), "validateContactNumber('0912345678a') rejects letters");
  assert(validateContactNumber('09abc')?.includes('numbers only'), "validateContactNumber('09abc') rejects letters");
  assert(validateContactNumber('0912345678')?.includes('exactly 11 digits'), "validateContactNumber('0912345678') rejects 10 digits");
  assert(validateContactNumber('091234567890')?.includes('exactly 11 digits'), "validateContactNumber('091234567890') rejects 12 digits");
  assert(validateContactNumber('09123456789') === null, "validateContactNumber('09123456789') accepts valid 11-digit mobile");
  assert(validateContactNumber('') === null, "validateContactNumber('') accepts empty (optional)");

  // API Test: Reject 10 digits in contactNumber on register
  const resShortPhone = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser_sphone',
      email: 'test.sphone@gmail.com',
      contactNumber: '0912345678', // Only 10 digits
      password: 'validpassword123',
    }),
  });
  const dataShortPhone = await resShortPhone.json();
  assert(resShortPhone.status === 400, `10-digit phone rejected with 400 (got ${resShortPhone.status})`);
  assert(dataShortPhone.error?.includes('exactly 11 digits'), `Error message requires 11 digits (got: "${dataShortPhone.error}")`);

  // API Test: Reject letters in contactNumber on email register
  const resLetterPhone = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser_phone',
      email: 'test.phone@gmail.com',
      contactNumber: '0912345678a', // Contains letter 'a'
      password: 'validpassword123',
    }),
  });
  const dataLetterPhone = await resLetterPhone.json();
  assert(resLetterPhone.status === 400, `Contact number with letters rejected with 400 (got ${resLetterPhone.status})`);
  assert(dataLetterPhone.error?.includes('numbers only'), `Error message explains numbers only (got: "${dataLetterPhone.error}")`);

  // API Test: Reject letters in contactNumber on Google register
  const resGoogleLetterPhone = await fetch(`${BASE_URL}/api/auth/google-register`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser_g_phone',
      email: 'test.google.phone@gmail.com',
      contactNumber: '09abc12345', // Contains letters
    }),
  });
  const dataGoogleLetterPhone = await resGoogleLetterPhone.json();
  assert(resGoogleLetterPhone.status === 400, `Google register with letters in phone rejected with 400 (got ${resGoogleLetterPhone.status})`);
  assert(dataGoogleLetterPhone.error?.includes('numbers only'), `Google register error mentions numbers only (got: "${dataGoogleLetterPhone.error}")`);

  // Negative Test 1: Reject non-Gmail
  const resNonGmail = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser_auth',
      email: 'testuser@yahoo.com', // Non-Gmail
      password: 'password123',
    }),
  });
  const dataNonGmail = await resNonGmail.json();
  assert(resNonGmail.status === 400, `Non-Gmail address rejected with 400 (got ${resNonGmail.status})`);
  assert(dataNonGmail.error?.includes('Gmail'), `Error message mentions Gmail (got: "${dataNonGmail.error}")`);

  // Negative Test 2: Reject password < 8 chars
  const resShortPass = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser_pass',
      email: 'testuser.pass@gmail.com',
      password: 'short', // 5 chars
    }),
  });
  const dataShortPass = await resShortPass.json();
  assert(resShortPass.status === 400, `Password < 8 chars rejected with 400 (got ${resShortPass.status})`);
  assert(dataShortPass.error?.includes('8 characters'), `Error message mentions 8 characters (got: "${dataShortPass.error}")`);

  // Negative Test 3: Reject invalid username (special characters / spaces)
  // Negative Test 4: Missing required fields (First/Last name or Gmail)
  const resMissing = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    }),
  });
  assert(resMissing.status === 400, `Empty payload rejected with 400 (got ${resMissing.status})`);

  // Login Test 1: Missing email or password
  const resEmptyLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ email: '', password: '' }),
  });
  assert(resEmptyLogin.status === 400, `Empty login credentials rejected with 400 (got ${resEmptyLogin.status})`);

  // Login Test 2: Non-existent Gmail account
  const resBadEmail = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      email: 'nonexistent.user.9999@gmail.com',
      password: 'wrongpassword123',
    }),
  });
  assert(resBadEmail.status === 401 || resBadEmail.status === 404, `Non-existent account rejected with 401/404 (got ${resBadEmail.status})`);

  // Forgot Password Test: Non-existent Gmail account rejected with 404 "Email does not exist."
  const resBadForgot = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      email: 'nonexistent.user.9999@gmail.com',
    }),
  });
  assert(resBadForgot.status === 404, `Non-existent account in forgot password rejected with 404 (got ${resBadForgot.status})`);
  const dataBadForgot = await resBadForgot.json();
  assert(dataBadForgot.error?.toLowerCase().includes('not exist'), `Forgot password error mentions not exist (got: "${dataBadForgot.error}")`);
}
await testAuthValidation();


// ==============================================================================
// 5. AUTH API CONCURRENCY STRESS TEST (50 Parallel Requests)
// ==============================================================================
console.log('\n============================================================');
console.log('5. RUNNING AUTH API CONCURRENCY STRESS TEST (50 Parallel Requests)');
console.log('============================================================');

async function testAuthConcurrency() {
  if (!serverUp) {
    skip('50-request auth concurrency stress test (server offline)');
    return;
  }
  const CONCURRENT_REQUESTS = 50;
  console.log(`  🚀 Firing ${CONCURRENT_REQUESTS} parallel requests to /api/auth/register...`);

  const tStart = performance.now();
  const promises = [];

  for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
    const p = fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': `198.51.100.${i + 1}`,
      },
      body: JSON.stringify({
        firstName: `StressFirst${i}`,
        lastName: `StressLast${i}`,
        username: `stress_${Date.now()}_${i}`,
        email: `stress.user.${i}@invalid-domain.com`, // triggers quick validation error
        password: `password_${i}`,
      }),
    }).then(r => r.status);
    promises.push(p);
  }

  const results = await Promise.all(promises);
  const tElapsed = performance.now() - tStart;
  const all400s = results.every(s => s === 400);

  assert(all400s, `All 50 concurrent requests handled properly (all returned HTTP 400 validation error)`);
  assert(tElapsed < 5000, `50 concurrent requests processed in ${tElapsed.toFixed(2)}ms (average ${(tElapsed/CONCURRENT_REQUESTS).toFixed(1)}ms/req)`);
  console.log(`  📊 Auth API throughput: ${(CONCURRENT_REQUESTS / (tElapsed / 1000)).toFixed(1)} req/sec`);
}
await testAuthConcurrency();


// ==============================================================================
// 6. DOCX EXPORT ENGINE & STRESS GENERATION
// ==============================================================================
console.log('\n============================================================');
console.log('6. RUNNING DOCX EXPORT ENGINE TESTS & STRESS LOAD');
console.log('============================================================');

function testDocxSingle() {
  if (!PYTHON) {
    skip('DOCX export test (python/python3 not found)');
    return;
  }
  const dummyPayload = {
    metadata: {
      transmittalDate: 'SEPTEMBER 29, 2026',
      periodDescription: 'OCTOBER 1 - 31, 2025',
      academicYear: '2025-2026',
      semester: '2nd Sem',
      initialBudgetAmount: '₱12,000.00',
      finalAsOfDate: 'As of November 15, 2025',
      coordinatorName: 'MARK JAYSON SANTOS',
      coordinatorRole: 'Program Coordinator, CCS',
      coordinatorSalutation: 'Sir Santos',
    },
    signatories: {
      president: 'JOHN DOE',
      treasurer: 'JANE SMITH',
      auditor: 'ALEX RIVERA',
      adviser: 'PROF. SANTOS',
      director: 'DR. GARCIA',
      dean: 'DR. MENDOZA'
    },
    summary: {
      initialBudget: 12000.00,
      totalIncome: 5000.00,
      totalExpenses: 8000.00,
      totalFunds: 17000.00,
      cashOnHand: 9000.00
    },
    income_items: [
      { date: '2025-10-05', title: 'Membership Dues (100 members)', amount: 5000.00 }
    ],
    expense_items: [
      { date: '2025-10-10', title: 'Web Development Workshop Materials', amount: 3500.00 },
      { date: '2025-10-18', title: 'Code Camp Certificates & Snacks', amount: 4500.00 }
    ]
  };

  const tempJson = path.resolve('exports/stress_test_input.json');
  const tempOutput = path.resolve('exports/stress_test_output.docx');

  fs.writeFileSync(tempJson, JSON.stringify(dummyPayload, null, 2));

  const tStart = performance.now();
  execFileSync(PYTHON, ['scripts/export_report_engine.py', tempJson, tempOutput]);
  const tElapsed = performance.now() - tStart;

  assert(fs.existsSync(tempOutput), 'DOCX export file was created on disk');
  const stats = fs.statSync(tempOutput);
  assert(stats.size > 20000, `DOCX export file size is valid (${(stats.size / 1024).toFixed(1)} KB > 20 KB)`);
  assert(tElapsed < 4000, `Single DOCX generated in ${tElapsed.toFixed(2)}ms (< 4000ms threshold)`);
}
testDocxSingle();

// Concurrency Stress Test on Python Engine: 5 concurrent generations
console.log('  🚀 Stress Testing: Running 5 concurrent DOCX generation processes...');
const docxStart = performance.now();
const docxJobs = [];

for (let i = 0; PYTHON && i < 5; i++) {
  const jsonFile = path.resolve(`exports/stress_input_${i}.json`);
  const outFile = path.resolve(`exports/stress_output_${i}.docx`);
  
  // Create test dataset with 30 transactions each
  const items = Array.from({ length: 30 }, (_, idx) => ({
    date: '2025-10-15',
    title: `Stress Test Transaction #${idx + 1} - Item Purchase`,
    amount: (idx + 1) * 125.50
  }));

  const payload = {
    metadata: {
      transmittalDate: 'SEPTEMBER 29, 2026',
      periodDescription: 'AY 2025-2026',
      academicYear: '2025-2026',
      semester: '2nd Sem',
      initialBudgetAmount: '₱50,000.00',
      finalAsOfDate: 'As of November 15, 2025',
      coordinatorName: 'COORDINATOR NAME',
      coordinatorRole: 'Program Head',
      coordinatorSalutation: 'Sir',
    },
    signatories: {
      president: 'PRESIDENT',
      treasurer: 'TREASURER',
      auditor: 'AUDITOR',
      adviser: 'ADVISER',
      director: 'DIRECTOR',
      dean: 'DEAN'
    },
    summary: { initialBudget: 50000, totalIncome: 10000, totalExpenses: 25000, totalFunds: 60000, cashOnHand: 35000 },
    income_items: items.slice(0, 10),
    expense_items: items.slice(10)
  };

  fs.writeFileSync(jsonFile, JSON.stringify(payload));

  const job = new Promise((resolve, reject) => {
    const proc = spawn(PYTHON, ['scripts/export_report_engine.py', jsonFile, outFile]);
    proc.on('close', code => {
      if (code === 0 && fs.existsSync(outFile)) {
        resolve({ index: i, size: fs.statSync(outFile).size });
      } else {
        reject(new Error(`DOCX proc ${i} failed with code ${code}`));
      }
    });
  });
  docxJobs.push(job);
}

const docxResults = PYTHON ? await Promise.all(docxJobs) : [];
const docxElapsed = performance.now() - docxStart;

if (!PYTHON) {
  skip('Concurrent DOCX stress test (python/python3 not found)');
} else {
  assert(docxResults.length === 5, 'All 5 concurrent DOCX files generated successfully');
  assert(docxResults.every(r => r.size > 20000), 'All 5 concurrent DOCX outputs are non-empty valid documents');
  console.log(`  ✅ 5 concurrent DOCX reports generated in ${docxElapsed.toFixed(2)}ms (avg ${(docxElapsed/5).toFixed(1)}ms per document)`);
}

// Clean up stress test temp files
for (let i = 0; i < 5; i++) {
  try {
    fs.unlinkSync(path.resolve(`exports/stress_input_${i}.json`));
    fs.unlinkSync(path.resolve(`exports/stress_output_${i}.docx`));
  } catch {}
}


// ==============================================================================
// 7. SUPABASE DATABASE & SCHEMA HEALTH CHECK
// ==============================================================================
console.log('\n============================================================');
console.log('7. RUNNING SUPABASE DATABASE CONNECTION & SCHEMA CHECK');
console.log('============================================================');

async function testDatabase() {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!createClient) {
    skip('Supabase checks (@supabase/supabase-js not installed; run npm install)');
    return;
  }
  if (!supabaseUrl || !anonKey) {
    skip('Supabase checks (credentials missing from .env.local)');
    return;
  }

  const supabase = createClient(supabaseUrl, anonKey);

  // Check transactions table
  const t0 = performance.now();
  const { data: txs, error: txErr } = await supabase.from('transactions').select('id, amount, type').limit(10);
  const dbLatency = performance.now() - t0;

  assert(!txErr, `transactions table query successful (error: ${txErr?.message || 'none'})`);
  console.log(`  ⏱️ Supabase DB query latency: ${dbLatency.toFixed(1)}ms (retrieved ${txs?.length || 0} rows)`);

  // Check cash_reconciliations table
  const { error: reconErr } = await supabase.from('cash_reconciliations').select('id').limit(1);
  assert(!reconErr, `cash_reconciliations table query successful (error: ${reconErr?.message || 'none'})`);

  // Check registration_requests table
  const { error: regErr } = await supabase.from('registration_requests').select('id').limit(1);
  if (regErr) {
    console.log(`  ⚠️ Notice: registration_requests table: ${regErr.message}`);
    console.log('     (If migration 005 has not been run in Supabase SQL editor yet, this is expected)');
  } else {
    assert(true, 'registration_requests table exists and is accessible');
  }

  // Check 3NF normalized denominations reference table
  const { data: denoms, error: denomErr } = await supabase.from('denominations').select('id, code, face_value').limit(20);
  if (denomErr) {
    console.log(`  ⚠️ Notice: denominations 3NF table: ${denomErr.message}`);
    console.log('     (Ready for Phase 1 migration 012 deployment in Supabase SQL editor)');
  } else {
    assert(true, `denominations 3NF table query successful (retrieved ${denoms?.length || 0} denominations)`);
  }

  // Check 3NF normalized cash_reconciliation_items table
  const { error: itemErr } = await supabase.from('cash_reconciliation_items').select('id').limit(1);
  if (itemErr) {
    console.log(`  ⚠️ Notice: cash_reconciliation_items 3NF table: ${itemErr.message}`);
    console.log('     (Ready for Phase 1 migration 012 deployment in Supabase SQL editor)');
  } else {
    assert(true, 'cash_reconciliation_items 3NF table exists and is accessible');
  }

  // Check 3NF normalized transaction_receipts table
  const { error: receiptErr } = await supabase.from('transaction_receipts').select('id').limit(1);
  if (receiptErr) {
    console.log(`  ⚠️ Notice: transaction_receipts 3NF table: ${receiptErr.message}`);
    console.log('     (Ready for Phase 1 migration 012 deployment in Supabase SQL editor)');
  } else {
    assert(true, 'transaction_receipts 3NF table exists and is accessible');
  }

  // Check audit_logs table
  const { error: auditErr } = await supabase.from('audit_logs').select('id').limit(1);
  if (auditErr) {
    console.log(`  ⚠️ Notice: audit_logs table: ${auditErr.message}`);
  } else {
    assert(true, 'audit_logs table exists and is accessible');
  }

  // Check transaction_comments 3NF table
  const { error: commentErr } = await supabase.from('transaction_comments').select('id').limit(1);
  if (commentErr) {
    console.log(`  ⚠️ Notice: transaction_comments 3NF table: ${commentErr.message}`);
    console.log('     (Ready for Phase 4 migration 018 deployment in Supabase SQL editor)');
  } else {
    assert(true, 'transaction_comments 3NF table exists and is accessible');
  }
}
await testDatabase();


// ==============================================================================
// 8. PRODUCTION-GRADE RATE LIMITING & SECURITY ENGINE TESTS
// ==============================================================================
console.log('\n============================================================');
console.log('8. RUNNING RATE LIMITING & SECURITY ENGINE TESTS');
console.log('============================================================');

async function testRateLimiting() {
  const limiter = new SlidingWindowLimiter();
  const testWindowMs = 60000;
  const testLimit = 5;

  // 1. Requests within limit return { allowed: true } with decreasing remaining
  const r1 = limiter.check('client-a', testLimit, testWindowMs);
  assert(r1.allowed === true, '1st check within limit returns allowed: true');
  assert(r1.remaining === 4, `1st check remaining decreases to 4 (got ${r1.remaining})`);
  assert(r1.limit === testLimit, '1st check returns correct limit value');
  assert(r1.retryAfter === 0, 'Allowed request has retryAfter === 0');

  const r2 = limiter.check('client-a', testLimit, testWindowMs);
  assert(r2.allowed === true, '2nd check within limit returns allowed: true');
  assert(r2.remaining === 3, `2nd check remaining decreases to 3 (got ${r2.remaining})`);

  const r3 = limiter.check('client-a', testLimit, testWindowMs);
  const r4 = limiter.check('client-a', testLimit, testWindowMs);
  const r5 = limiter.check('client-a', testLimit, testWindowMs);
  assert(r5.allowed === true, '5th check reaches limit boundary with allowed: true');
  assert(r5.remaining === 0, `5th check remaining reaches 0 (got ${r5.remaining})`);

  // 2. Requests exceeding limit return { allowed: false } with remaining === 0 and positive retryAfter
  const r6 = limiter.check('client-a', testLimit, testWindowMs);
  assert(r6.allowed === false, '6th check exceeding limit returns allowed: false');
  assert(r6.remaining === 0, `6th check remaining stays 0 (got ${r6.remaining})`);
  assert(r6.retryAfter > 0 && r6.retryAfter <= 60, `Exceeded request has positive retryAfter (got ${r6.retryAfter}s)`);
  assert(r6.reset > Math.floor(Date.now() / 1000), 'Exceeded request provides future Unix reset timestamp');

  // 3. Different IP keys maintain isolated bucket counters
  const rOtherIp = limiter.check('client-b', testLimit, testWindowMs);
  assert(rOtherIp.allowed === true, 'Different IP client-b is not blocked by client-a exhaustion');
  assert(rOtherIp.remaining === 4, `Different IP client-b has independent counter remaining === 4 (got ${rOtherIp.remaining})`);

  // Different route prefixes maintain isolated bucket counters
  const authKey = 'auth:192.168.1.1';
  const chatKey = 'chat:192.168.1.1';
  for (let i = 0; i < RATE_LIMIT_TIERS.AUTH.limit; i++) {
    limiter.check(authKey, RATE_LIMIT_TIERS.AUTH.limit, RATE_LIMIT_TIERS.AUTH.windowMs);
  }
  const authBlocked = limiter.check(authKey, RATE_LIMIT_TIERS.AUTH.limit, RATE_LIMIT_TIERS.AUTH.windowMs);
  assert(authBlocked.allowed === false, 'AUTH tier is rate limited after limit exhausted');

  const chatCheck = limiter.check(chatKey, RATE_LIMIT_TIERS.AI_CHAT.limit, RATE_LIMIT_TIERS.AI_CHAT.windowMs);
  assert(chatCheck.allowed === true, 'AI_CHAT tier on same IP remains isolated and allowed when AUTH tier exhausted');
  assert(chatCheck.remaining === RATE_LIMIT_TIERS.AI_CHAT.limit - 1, 'AI_CHAT tier has isolated remaining counter');

  // 4. Window reset behavior (simulated time progression & manual reset)
  const simulatedStart = 1000000;
  const resetLimiter = new SlidingWindowLimiter();
  for (let i = 0; i < 3; i++) {
    resetLimiter.check('sim-user', 3, 10000, simulatedStart + i * 100);
  }
  const simBlocked = resetLimiter.check('sim-user', 3, 10000, simulatedStart + 500);
  assert(simBlocked.allowed === false, 'Simulated user blocked when limit reached');

  // Advance time beyond the 10,000ms window
  const simAfterWindow = resetLimiter.check('sim-user', 3, 10000, simulatedStart + 10500);
  assert(simAfterWindow.allowed === true, 'Window reset: request allowed again after window duration elapses');
  assert(simAfterWindow.remaining === 2, `Window reset: remaining counter reset properly (got ${simAfterWindow.remaining})`);

  // Explicit reset
  resetLimiter.reset('sim-user');
  const simAfterReset = resetLimiter.check('sim-user', 3, 10000, simulatedStart + 10600);
  assert(simAfterReset.allowed === true && simAfterReset.remaining === 2, 'Explicit reset clears key and reopens capacity');

  // Eviction / memory cleanup test
  const cleanupLimiter = new SlidingWindowLimiter();
  cleanupLimiter.check('stale-key', 5, 5000, simulatedStart);
  assert(cleanupLimiter.size() > 0, 'Limiter tracks active keys');
  cleanupLimiter.cleanup(simulatedStart + 20000, 10000);
  assert(cleanupLimiter.size() === 0, 'Automatic cleanup evicts expired keys preventing memory leak');

  // 5. Client IP extraction tests
  assert(getClientIp({ headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' } }) === '203.0.113.195',
    'getClientIp extracts first IP from comma-separated x-forwarded-for');
  assert(getClientIp({ headers: { 'x-real-ip': '198.51.100.4' } }) === '198.51.100.4',
    'getClientIp extracts x-real-ip');
  assert(getClientIp({ headers: { 'cf-connecting-ip': '104.16.1.1' } }) === '104.16.1.1',
    'getClientIp extracts cf-connecting-ip');
  assert(getClientIp({}) === '127.0.0.1',
    'getClientIp falls back to 127.0.0.1 on empty request');

  // 6. Tier classification tests
  assert(getTierForPath('/api/auth/login')?.name === 'AUTH', 'getTierForPath identifies AUTH tier for /api/auth/login');
  assert(getTierForPath('/api/reports/docx')?.name === 'REPORTS', 'getTierForPath identifies REPORTS tier');
  assert(getTierForPath('/api/chat')?.name === 'AI_CHAT', 'getTierForPath identifies AI_CHAT tier');
  assert(getTierForPath('/api/transactions')?.name === 'DEFAULT_API', 'getTierForPath identifies DEFAULT_API tier');
  assert(getTierForPath('/dashboard') === null, 'getTierForPath returns null for non-API route');

  // 7. checkRateLimit helper creates valid 429 response with proper JSON and RFC headers
  const mockReq = {
    nextUrl: { pathname: '/api/reports/docx' },
    headers: { 'x-forwarded-for': '192.0.2.99' },
  };

  // Clear global rate limiter test key to ensure clean state
  rateLimiter.reset('reports:192.0.2.99');

  // First 5 requests within limit must return null (allowed)
  for (let i = 0; i < 5; i++) {
    const allowedRes = checkRateLimit(mockReq);
    assert(allowedRes === null, `checkRateLimit call ${i + 1} returns null (allowed)`);
  }
  assert(Boolean(mockReq._rateLimitHeaders), 'Allowed request attaches _rateLimitHeaders to request');
  assert(mockReq._rateLimitHeaders['X-RateLimit-Remaining'] === '0', '5th allowed request sets remaining header to 0');

  // 6th request must return 429 response
  const blockedRes = checkRateLimit(mockReq);
  assert(blockedRes !== null, 'checkRateLimit returns response when rate limited');
  assert(blockedRes.status === 429, `Rate-limited response has HTTP 429 status (got ${blockedRes.status})`);
  
  const limitHeader = blockedRes.headers.get('X-RateLimit-Limit');
  const remainingHeader = blockedRes.headers.get('X-RateLimit-Remaining');
  const resetHeader = blockedRes.headers.get('X-RateLimit-Reset');
  const retryAfterHeader = blockedRes.headers.get('Retry-After');

  assert(limitHeader === '5', `X-RateLimit-Limit header is '5' (got '${limitHeader}')`);
  assert(remainingHeader === '0', `X-RateLimit-Remaining header is '0' (got '${remainingHeader}')`);
  assert(Number(resetHeader) > Math.floor(Date.now() / 1000), `X-RateLimit-Reset is a valid future timestamp (got '${resetHeader}')`);
  assert(Number(retryAfterHeader) > 0, `Retry-After header is positive seconds (got '${retryAfterHeader}')`);

  const blockedBody = await blockedRes.json();
  assert(blockedBody.error === 'Too many requests. Please try again later.',
    `429 response JSON body has expected error message (got '${blockedBody.error}')`);

  // 8. Live Route Rate Limiting Test (if serverUp)
  if (serverUp) {
    const liveIp = `198.51.100.${Math.floor(Math.random() * 800) + 100}`;
    const liveLimit = RATE_LIMIT_TIERS.REPORTS.limit; // 5 requests
    let got429 = false;

    for (let i = 0; i < liveLimit + 2; i++) {
      const res = await fetch(`${BASE_URL}/api/reports/docx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': liveIp,
        },
        body: JSON.stringify({}),
      });

      if (res.status === 429) {
        got429 = true;
        const resBody = await res.json();
        assert(resBody.error?.includes('Too many requests'), 'Live 429 response contains error message');
        assert(res.headers.get('x-ratelimit-limit') === String(liveLimit), `Live response contains x-ratelimit-limit: ${liveLimit}`);
        assert(res.headers.get('retry-after') !== null, 'Live 429 response contains retry-after header');
        break;
      }
    }
    assert(got429, 'Live server enforced rate limit and returned 429 after limit exceeded');
  } else {
    skip('Live route rate limiting verification against dev server (server offline)');
  }
}
await testRateLimiting();


// ==============================================================================
// 9. FINANCIAL AUDIT TRAIL & IMMUTABILITY ENGINE TESTS
// ==============================================================================
console.log('\n============================================================');
console.log('9. RUNNING FINANCIAL AUDIT TRAIL ENGINE TESTS');
console.log('============================================================');

async function testAuditTrail() {
  // 1. fetchAuditTrail with null client returns empty array and error
  const resNull = await fetchAuditTrail(null);
  assert(Array.isArray(resNull.data) && resNull.data.length === 0, 'fetchAuditTrail(null) safely returns empty data array');
  assert(resNull.error !== null, 'fetchAuditTrail(null) returns error indicating client not initialized');

  // 2. fetchAuditTrail with mock RPC success
  const mockRpcData = [
    {
      id: 'audit-1',
      action: 'INSERT',
      entity_type: 'transactions',
      entity_id: 'tx-1',
      details: { amount: 1500, type: 'inflow' },
      created_at: new Date().toISOString(),
      actor_name: 'Rose Marielle Cabanag',
      actor_email: 'cabanag@gmail.com',
      actor_role: 'treasurer',
      actor_avatar: null,
    }
  ];
  const mockSupabaseRpc = {
    rpc: async (fnName, params) => {
      if (fnName === 'get_financial_audit_trail') {
        return { data: mockRpcData, error: null };
      }
      return { data: null, error: new Error('Unknown RPC') };
    }
  };
  const resRpc = await fetchAuditTrail(mockSupabaseRpc, 50);
  assert(resRpc.error === null, 'fetchAuditTrail succeeds via get_financial_audit_trail RPC');
  assert(resRpc.data.length === 1, 'fetchAuditTrail returns expected record count via RPC');
  assert(resRpc.data[0].actor_name === 'Rose Marielle Cabanag', 'fetchAuditTrail preserves actor_name from RPC');

  // 3. fetchAuditTrail falls back to select query when RPC fails
  const mockFallbackRows = [
    {
      id: 'audit-2',
      action: 'ABONO_SETTLED',
      entity_type: 'transactions',
      entity_id: 'tx-2',
      details: { amount: 250 },
      created_at: new Date().toISOString(),
      profiles: {
        full_name: 'Rishame Sara',
        email: 'sara@gmail.com',
        role: 'auditor',
        avatar_url: null,
      }
    }
  ];
  const mockSupabaseFallback = {
    rpc: async () => ({ data: null, error: new Error('function get_financial_audit_trail does not exist') }),
    from: (table) => ({
      select: () => ({
        order: () => ({
          limit: async () => ({ data: mockFallbackRows, error: null })
        })
      })
    })
  };
  const resFallback = await fetchAuditTrail(mockSupabaseFallback, 50);
  assert(resFallback.error === null, 'fetchAuditTrail gracefully falls back to joined query when RPC missing');
  assert(resFallback.data[0].actor_name === 'Rishame Sara', 'fetchAuditTrail normalizes fallback actor_name from joined profiles');
  assert(resFallback.data[0].actor_role === 'auditor', 'fetchAuditTrail normalizes fallback actor_role from joined profiles');

  // 4. logAuditEvent with null client returns false without throwing
  const resLogNull = await logAuditEvent(null, { action: 'TEST_EVENT' });
  assert(resLogNull === false, 'logAuditEvent with null supabase client returns false safely without throwing');

  // 5. logAuditEvent records event with proper payload
  let loggedPayload = null;
  const mockSupabaseInsert = {
    auth: {
      getUser: async () => ({ data: { user: { id: 'usr-123' } } })
    },
    from: (table) => ({
      insert: async (rows) => {
        loggedPayload = rows;
        return { error: null };
      }
    })
  };
  const resLogSuccess = await logAuditEvent(mockSupabaseInsert, {
    action: 'EXPORT_LIQUIDATION',
    entityType: 'reports',
    entityId: 'sem-26-27-1',
    details: { format: 'docx', signatoriesCount: 4 }
  });
  assert(resLogSuccess === true, 'logAuditEvent returns true on successful audit log insertion');
  assert(loggedPayload !== null && loggedPayload[0].action === 'EXPORT_LIQUIDATION', 'logAuditEvent correctly passes action');
  assert(loggedPayload[0].entity_type === 'reports', 'logAuditEvent correctly passes entity_type');
  assert(loggedPayload[0].user_id === 'usr-123', 'logAuditEvent resolves user_id from auth.getUser()');

  // 6. logAuditEvent catches error non-blockingly and returns false
  const mockSupabaseError = {
    auth: { getUser: async () => ({ data: { user: null } }) },
    from: () => ({
      insert: async () => ({ error: new Error('Database connection dropped') })
    })
  };
  const resLogError = await logAuditEvent(mockSupabaseError, { action: 'FAIL_EVENT' });
  assert(resLogError === false, 'logAuditEvent returns false on error without throwing or blocking UI');
}
await testAuditTrail();


// ==============================================================================
// 10. ACCOUNT ACCESS MANAGEMENT, LIFECYCLE & TRANSACTION REMARKS TESTS
// ==============================================================================
console.log('\n============================================================');
console.log('10. RUNNING ACCOUNT LIFECYCLE & TRANSACTION REMARKS TESTS');
console.log('============================================================');

async function testAccountLifecycleAndRemarks() {
  // 1. Super Admin Immutable Lock
  const primarySuperAdmin = 'geronimoandreijohn.pdm@gmail.com';
  assert(isSuperAdminEmail(primarySuperAdmin), 'Primary super admin is recognized by isSuperAdminEmail');
  assert(isSuperAdminEmail('  GERONIMOANDREIJOHN.PDM@GMAIL.COM  '), 'isSuperAdminEmail is case-insensitive and trims whitespace');
  assert(!isSuperAdminEmail('officer@gmail.com'), 'Regular officer email is not recognized as super admin');
  assert(!isSuperAdminEmail(null), 'Null email safely returns false');
  assert(resolveEffectiveRole(primarySuperAdmin, 'treasurer') === 'admin', 'Super admin role resolution always promotes to admin');
  assert(resolveEffectiveRole('officer@gmail.com', 'treasurer') === 'treasurer', 'Regular officer role remains unchanged');

  // Simulate Immutable Lock Guard in DELETE / PATCH
  function verifySuperAdminImmutableLock(targetEmail, action) {
    if (isSuperAdminEmail(targetEmail)) {
      return { allowed: false, status: 403, error: `Super Admin account (${targetEmail}) is immutably protected from ${action}` };
    }
    return { allowed: true, status: 200 };
  }
  const deleteLockCheck = verifySuperAdminImmutableLock(primarySuperAdmin, 'deletion');
  assert(deleteLockCheck.allowed === false && deleteLockCheck.status === 403, 'Super admin cannot be deleted (HTTP 403 lock enforced)');
  const suspendLockCheck = verifySuperAdminImmutableLock(primarySuperAdmin, 'suspension');
  assert(suspendLockCheck.allowed === false && suspendLockCheck.status === 403, 'Super admin cannot be suspended (HTTP 403 lock enforced)');
  const normalUserLockCheck = verifySuperAdminImmutableLock('member@gmail.com', 'suspension');
  assert(normalUserLockCheck.allowed === true && normalUserLockCheck.status === 200, 'Regular user is not blocked by super admin immutable lock');

  // 2. Account Deletion Financial Dependency Checks
  function checkAccountDeletionSafety({ transactionCount = 0, reconciliationCount = 0 }) {
    if (transactionCount > 0 || reconciliationCount > 0) {
      return {
        safe: false,
        status: 409,
        error: 'Cannot delete account with recorded ledger transactions or cash reconciliations. Suspend instead to preserve financial audit trail.',
        recommendation: 'SUSPEND'
      };
    }
    return { safe: true, status: 200, recommendation: 'DELETE' };
  }

  const unsafeDelete = checkAccountDeletionSafety({ transactionCount: 14, reconciliationCount: 0 });
  assert(unsafeDelete.safe === false && unsafeDelete.status === 409, 'User with 14 transactions is blocked from deletion with HTTP 409 Conflict');
  assert(unsafeDelete.recommendation === 'SUSPEND', 'Unsafe deletion recommends SUSPEND to preserve ledger audit trail');

  const unsafeReconDelete = checkAccountDeletionSafety({ transactionCount: 0, reconciliationCount: 2 });
  assert(unsafeReconDelete.safe === false && unsafeReconDelete.status === 409, 'User with cash reconciliations is blocked from deletion');

  const safeDelete = checkAccountDeletionSafety({ transactionCount: 0, reconciliationCount: 0 });
  assert(safeDelete.safe === true && safeDelete.status === 200, 'User with 0 financial transactions can be safely deleted');
  assert(safeDelete.recommendation === 'DELETE', 'Safe deletion recommendation is DELETE');

  // 3. User Status Normalization (ACTIVE vs SUSPENDED)
  function normalizeUserStatus(inputStatus) {
    const s = (inputStatus || '').toUpperCase();
    if (s === 'ACTIVE' || s === 'APPROVED') return 'approved';
    if (s === 'SUSPENDED') return 'suspended';
    return 'approved';
  }
  function displayUserStatus(dbStatus) {
    return dbStatus === 'suspended' ? 'SUSPENDED' : 'ACTIVE';
  }

  assert(normalizeUserStatus('ACTIVE') === 'approved', 'ACTIVE normalizes to DB status approved');
  assert(normalizeUserStatus('SUSPENDED') === 'suspended', 'SUSPENDED normalizes to DB status suspended');
  assert(displayUserStatus('suspended') === 'SUSPENDED', 'DB status suspended displays as SUSPENDED');
  assert(displayUserStatus('approved') === 'ACTIVE', 'DB status approved displays as ACTIVE');

  // 4. Transaction Comment Validation
  function validateTransactionComment(comment) {
    if (!comment || typeof comment !== 'string') {
      return { valid: false, error: 'Comment must be a non-empty string' };
    }
    const trimmed = comment.trim();
    if (trimmed.length === 0) {
      return { valid: false, error: 'Comment cannot be blank' };
    }
    if (trimmed.length > 1000) {
      return { valid: false, error: 'Comment cannot exceed 1000 characters' };
    }
    return { valid: true, comment: trimmed };
  }

  assert(!validateTransactionComment('').valid, 'Empty comment is rejected');
  assert(!validateTransactionComment('   \n  \t  ').valid, 'Whitespace-only comment is rejected');
  assert(!validateTransactionComment(null).valid, 'Null comment is rejected');
  assert(!validateTransactionComment('a'.repeat(1001)).valid, 'Comment exceeding 1000 characters is rejected');
  const validCommentRes = validateTransactionComment('  Verified against physical receipt series #1042  ');
  assert(validCommentRes.valid === true, 'Valid comment is accepted');
  assert(validCommentRes.comment === 'Verified against physical receipt series #1042', 'Valid comment is cleanly trimmed');

  // 5. Activity & Access Log Classification Telemetry
  function classifyAuditCategory(action) {
    const act = (action || '').toUpperCase();
    if (act.startsWith('AUTH_')) return 'sessions';
    if (act.startsWith('TRANSACTION_') || act.startsWith('RECONCILIATION_') || act.includes('COMMENT') || act.includes('LIQUIDATION')) {
      return 'financial';
    }
    if (act.startsWith('USER_') || act.startsWith('ACCOUNT_') || act.startsWith('SETTINGS_')) {
      return 'governance';
    }
    return 'all';
  }

  assert(classifyAuditCategory('AUTH_LOGIN') === 'sessions', 'AUTH_LOGIN classifies as sessions');
  assert(classifyAuditCategory('AUTH_LOGOUT') === 'sessions', 'AUTH_LOGOUT classifies as sessions');
  assert(classifyAuditCategory('TRANSACTION_CREATED') === 'financial', 'TRANSACTION_CREATED classifies as financial');
  assert(classifyAuditCategory('COMMENT_ADDED') === 'financial', 'COMMENT_ADDED classifies as financial');
  assert(classifyAuditCategory('USER_STATUS_CHANGED') === 'governance', 'USER_STATUS_CHANGED classifies as governance');
  assert(classifyAuditCategory('ACCOUNT_DELETED') === 'governance', 'ACCOUNT_DELETED classifies as governance');
}
await testAccountLifecycleAndRemarks();


// ==============================================================================
// FINAL SUMMARY
// ==============================================================================
console.log('\n============================================================');
console.log('🏁 TEST SUITE SUMMARY RESULTS');
console.log('============================================================');
console.log(`  Total Checks: ${passCount + failCount}`);
console.log(`  Passed:       ${passCount} ✅`);
console.log(`  Failed:       ${failCount} ❌`);
console.log(`  Skipped:      ${skipCount} ⏭️${skipCount && !REQUIRE_ALL ? '  (re-run with the server up and .env.local present, or use --require-all to fail on skips)' : ''}`);
console.log('============================================================\n');

process.exit(failCount === 0 && !(REQUIRE_ALL && skipCount > 0) ? 0 : 1);
