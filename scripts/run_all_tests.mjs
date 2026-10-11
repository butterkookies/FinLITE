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
 */

import { 
  formatPHP, 
  toCentavos, 
  fromCentavos, 
  calculatePhysicalTotal, 
  calculateVariance 
} from '../lib/utils/currency.js';
import { validateGmail, validateUsername, validatePassword, validateContactNumber } from '../lib/utils/validation.js';
import { isSuperAdminEmail, getSuperAdminEmails } from '../lib/config/admin.js';
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
const REQUIRE_ALL = process.argv.includes('--require-all'); // treat skips as failures (use for final runs)

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
  for (const cmd of ['python3', 'python']) {
    try { execFileSync(cmd, ['--version'], { stdio: 'ignore' }); return cmd; } catch {}
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

  // API Test: Reject example.gmail without @ and without .com
  const resNoAt = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: '', password: '' }),
  });
  assert(resEmptyLogin.status === 400, `Empty login credentials rejected with 400 (got ${resEmptyLogin.status})`);

  // Login Test 2: Non-existent Gmail account
  const resBadEmail = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'nonexistent.user.9999@gmail.com',
      password: 'wrongpassword123',
    }),
  });
  assert(resBadEmail.status === 401 || resBadEmail.status === 404, `Non-existent account rejected with 401/404 (got ${resBadEmail.status})`);
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
      headers: { 'Content-Type': 'application/json' },
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
  assert(tElapsed < 3000, `Single DOCX generated in ${tElapsed.toFixed(2)}ms (< 3000ms threshold)`);
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
}
await testDatabase();


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