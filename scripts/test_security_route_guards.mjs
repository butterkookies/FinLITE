/**
 * Targeted Verification Suite for Post-Merge Security Hardening
 * Tests:
 * 1. Transaction route code guard audit (verifies session auth check and officer status check)
 * 2. System release route code guard audit (verifies verifyAdmin check, safe GET handler, and FK integrity)
 * 3. Migration 027 AST/SQL checks (zero public RLS policies, restricted RPC, hardened app_releases)
 * 4. Migration 028 AST/SQL checks (signature requires code, restricted RPC, NOT FOUND check)
 * 5. File cleanup assertions (resubmissions.js deleted, otp.js has no ACTIVE_OTPS_FILE)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

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
console.log('TESTING SECURITY HARDENING ROUTE GUARDS & MIGRATION INTEGRITY');
console.log('============================================================\n');

// --- 1. Transaction Notification Session Guard Verification ---
console.log('1. Auditing app/api/notifications/transaction/route.js Guard:');
const txRouteContent = fs.readFileSync(path.join(projectRoot, 'app/api/notifications/transaction/route.js'), 'utf-8');
assert(txRouteContent.includes('auth.getUser()'), 'Transaction route verifies user session via auth.getUser()');
assert(txRouteContent.includes('callerProfile.status !== \'approved\''), 'Transaction route enforces approved officer check');
assert(txRouteContent.includes('isSuperAdminEmail'), 'Transaction route recognizes Super Admin bypass');
assert(txRouteContent.includes('profileByEmail'), 'Transaction route supports fallback profile resolution by email');
assert(txRouteContent.includes('profileFullName'), 'Transaction route prioritizes profile first/last name over untrusted client body');
assert(txRouteContent.includes('401'), 'Transaction route returns 401 on missing/invalid session');
assert(txRouteContent.includes('403'), 'Transaction route returns 403 on unapproved caller');
assert(txRouteContent.includes('effectiveAuthorEmail'), 'Transaction route anchors author identity to authenticated session profile');

// --- 2. System Release Broadcast Admin Guard Verification ---
console.log('\n2. Auditing app/api/system/check-release/route.js Guards:');
const releaseRouteContent = fs.readFileSync(path.join(projectRoot, 'app/api/system/check-release/route.js'), 'utf-8');
assert(releaseRouteContent.includes('verifyAdmin()'), 'Check-release POST route calls verifyAdmin()');
assert(releaseRouteContent.includes('if (!auth.authorized)'), 'Check-release POST route blocks unauthorized callers');
assert(releaseRouteContent.includes('broadcasterProfileId'), 'Check-release POST resolves profiles.id for foreign key safety');
assert(releaseRouteContent.includes('upsert'), 'Check-release POST uses upsert with onConflict to handle duplicate/forced broadcasts safely');
assert(releaseRouteContent.includes('export async function GET()'), 'Check-release route provides safe GET endpoint');
assert(releaseRouteContent.includes('release: {'), 'Check-release GET returns structured release metadata');

// --- 3. Migration 027 Integrity Checks ---
console.log('\n3. Verifying Migration 027 Hardening:');
const mig027Content = fs.readFileSync(path.join(projectRoot, 'supabase/migrations/027_email_verification_and_releases.sql'), 'utf-8');
assert(!mig027Content.includes('CREATE POLICY "Allow public select'), 'Migration 027 has no public select policy on email_verification_otps');
assert(!mig027Content.includes('CREATE POLICY "Allow public insert'), 'Migration 027 has no public insert policy on email_verification_otps');
assert(!mig027Content.includes('CREATE POLICY "Allow public update'), 'Migration 027 has no public update policy on email_verification_otps');
assert(mig027Content.includes('CREATE POLICY "Allow admin insert app_releases"'), 'Migration 027 restricts app_releases INSERT strictly to administrators');
assert(!mig027Content.includes('CREATE POLICY "Allow insert app_releases"\n  ON public.app_releases FOR INSERT\n  TO authenticated, anon'), 'Migration 027 does not allow anonymous clients to insert app_releases');
assert(mig027Content.includes('GRANT EXECUTE ON FUNCTION public.reset_user_password_with_otp(TEXT, TEXT, TEXT) TO service_role'), 'Migration 027 grants reset_user_password_with_otp strictly to service_role');
assert(mig027Content.includes('REVOKE EXECUTE ON FUNCTION public.reset_user_password_with_otp(TEXT, TEXT, TEXT) FROM PUBLIC'), 'Migration 027 revokes execution from PUBLIC');

// --- 4. Migration 028 Integrity Checks ---
console.log('\n4. Verifying Migration 028 Hardening:');
const mig028Content = fs.readFileSync(path.join(projectRoot, 'supabase/migrations/028_verify_registration_email.sql'), 'utf-8');
assert(mig028Content.includes('verify_registration_email(\n  p_email TEXT,\n  p_code TEXT\n)') || (mig028Content.includes('p_email TEXT,') && mig028Content.includes('p_code TEXT')), 'Migration 028 requires both email and code parameters');
assert(mig028Content.includes('GRANT EXECUTE ON FUNCTION public.verify_registration_email(TEXT, TEXT) TO service_role'), 'Migration 028 grants execution strictly to service_role');
assert(mig028Content.includes('REVOKE EXECUTE ON FUNCTION public.verify_registration_email(TEXT, TEXT) FROM PUBLIC'), 'Migration 028 revokes execution from PUBLIC');
assert(mig028Content.includes('UPDATE public.email_verification_otps'), 'Migration 028 marks OTP as used');
assert(mig028Content.includes('IF NOT FOUND THEN'), 'Migration 028 validates that a matching registration request exists before claiming success');

// --- 5. Security Module Cleanup Checks ---
console.log('\n5. Verifying Module Cleanup & Ephemeral Storage:');
const resubmissionsExists = fs.existsSync(path.join(projectRoot, 'lib/security/resubmissions.js'));
assert(!resubmissionsExists, 'lib/security/resubmissions.js has been deleted');

const otpContent = fs.readFileSync(path.join(projectRoot, 'lib/security/otp.js'), 'utf-8');
assert(!otpContent.includes('ACTIVE_OTPS_FILE'), 'lib/security/otp.js contains no ACTIVE_OTPS_FILE');
assert(!otpContent.includes('saveActiveOtpsToDisk'), 'lib/security/otp.js contains no saveActiveOtpsToDisk');
assert(!otpContent.includes('loadActiveOtpsFromDisk'), 'lib/security/otp.js contains no loadActiveOtpsFromDisk');
assert(otpContent.includes('_finliteVerifiedEmails'), 'lib/security/otp.js attaches verified emails cache to globalThis');

// --- Summary ---
console.log('\n============================================================');
console.log(`RESULTS: Passed: ${passed} | Failed: ${failed}`);
console.log('============================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🛡️ All Security Hardening Checks Passed Successfully!');
}
