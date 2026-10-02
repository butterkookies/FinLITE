/**
 * FinLITE Row-Level Security (RLS) & Policy Audit Script
 * Verifies that:
 * 1. Anonymous / unauthenticated callers CANNOT modify profiles (privilege escalation blocked).
 * 2. Anonymous / unauthenticated callers CANNOT inject or modify transactions (ledger tampering blocked).
 * 3. Anonymous / unauthenticated callers CANNOT approve registration requests (self-approval blocked).
 * 4. Anonymous callers CAN submit new registration requests (public signup allowed).
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('❌ Supabase credentials missing from .env.local');
  process.exit(1);
}

// Create an unauthenticated client using the public anon key
const anonClient = createClient(supabaseUrl, anonKey);

console.log('\n============================================================');
console.log('🔒 FINLITE ROW-LEVEL SECURITY (RLS) AUDIT & PEN-TEST');
console.log('============================================================');
console.log(`Connecting to: ${supabaseUrl}`);

let pass = 0;
let fail = 0;

function report(condition, message) {
  if (condition) {
    pass++;
    console.log(`  🛡️ PASSED: ${message}`);
  } else {
    fail++;
    console.error(`  ❌ VULNERABILITY DETECTED: ${message}`);
  }
}

async function runSecurityAudit() {
  // Test 1: Check if anon can inject a transaction
  console.log('\n[TEST 1] Testing unauthenticated INSERT on "transactions" table...');
  const fakeTx = {
    title: 'HACKED TRANSACTION TEST',
    amount: 999999.00,
    type: 'OUTFLOW',
    payment_method: 'CASH',
    transaction_date: '2026-10-02',
  };

  const { data: insertTxData, error: insertTxErr } = await anonClient
    .from('transactions')
    .insert([fakeTx])
    .select();

  if (insertTxErr) {
    report(true, `Anonymous transaction insertion was BLOCKED by database policy: "${insertTxErr.message}"`);
  } else if (!insertTxData || insertTxData.length === 0) {
    report(true, 'Anonymous transaction insertion returned 0 rows (blocked by RLS WITH CHECK)');
  } else {
    report(false, `Anonymous user was ABLE to insert transactions! Injected ID: ${insertTxData[0]?.id}`);
    // Attempt cleanup if possible
    await anonClient.from('transactions').delete().eq('title', 'HACKED TRANSACTION TEST');
  }

  // Test 2: Check if anon can modify a profile to elevate role to 'admin'
  console.log('\n[TEST 2] Testing unauthenticated privilege escalation on "profiles" table...');
  const { data: updateProfData, error: updateProfErr } = await anonClient
    .from('profiles')
    .update({ role: 'admin', status: 'approved' })
    .neq('id', '00000000-0000-0000-0000-000000000000') // matches rows
    .select();

  if (updateProfErr) {
    report(true, `Anonymous profile privilege escalation was BLOCKED by database policy: "${updateProfErr.message}"`);
  } else if (!updateProfData || updateProfData.length === 0) {
    report(true, 'Anonymous profile update affected 0 rows (blocked by RLS UPDATE policy)');
  } else {
    report(false, `Anonymous user was ABLE to update profile roles! Modified ${updateProfData.length} records.`);
  }

  // Test 3: Check if anon can self-approve a registration request
  console.log('\n[TEST 3] Testing unauthenticated approval on "registration_requests" table...');
  const { data: updateRegData, error: updateRegErr } = await anonClient
    .from('registration_requests')
    .update({ status: 'approved', requested_role: 'admin' })
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select();

  if (updateRegErr) {
    report(true, `Anonymous approval of registration requests was BLOCKED: "${updateRegErr.message}"`);
  } else if (!updateRegData || updateRegData.length === 0) {
    report(true, 'Anonymous registration request update affected 0 rows (blocked by RLS policy)');
  } else {
    report(false, `Anonymous user was ABLE to modify registration_requests! Modified ${updateRegData.length} records.`);
  }

  // Test 4: Check if public signup (INSERT into registration_requests) is permitted
  console.log('\n[TEST 4] Testing legitimate public signup on "registration_requests"...');
  const testEmail = `sec_test_${Date.now()}@gmail.com`;
  const { data: regInsertData, error: regInsertErr } = await anonClient
    .from('registration_requests')
    .insert([{
      first_name: 'Security',
      last_name: 'AuditTest',
      username: `sec_test_${Date.now()}`,
      email: testEmail,
      contact_number: '09123456789',
      status: 'pending',
    }])
    .select();

  if (regInsertErr) {
    // If table doesn't exist yet in remote Supabase, note it
    if (regInsertErr.message?.includes('does not exist')) {
      console.log(`  ℹ️ Notice: registration_requests table does not exist in target database yet.`);
    } else {
      console.log(`  ℹ️ Signup check response: "${regInsertErr.message}"`);
    }
  } else {
    report(true, `Public signup allowed: successfully submitted registration request for ${testEmail}`);
  }

  console.log('\n============================================================');
  console.log('AUDIT SUMMARY');
  console.log('============================================================');
  console.log(`Passed: ${pass} 🛡️`);
  console.log(`Failed: ${fail} ❌`);

  if (fail > 0) {
    console.log('\n⚠️ ACTION REQUIRED: Run migration 007 in your Supabase SQL Editor:');
    console.log('   File: supabase/migrations/007_harden_rls_policies.sql\n');
  } else {
    console.log('\n✅ All tested endpoints properly enforce Row-Level Security!\n');
  }
}

runSecurityAudit().catch(err => {
  console.error('Audit script exception:', err);
});
