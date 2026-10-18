/**
 * FinLITE Automated System Update Release Broadcast Script
 * 
 * Usage:
 *   node scripts/broadcast_release.mjs [--force]
 * 
 * Reads the latest release from lib/config/releases.js and broadcasts the release
 * notes to all registered active users via finlite.pdm@gmail.com.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { LATEST_RELEASE } from '../lib/config/releases.js';
import { sendSystemUpdateBroadcastEmail } from '../lib/email/mailer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Load environment variables from .env.local
const env = {};
try {
  const envContent = fs.readFileSync(path.join(projectRoot, '.env.local'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [k, ...v] = trimmed.split('=');
    if (k && v.length) env[k.trim()] = v.join('=').trim();
  }
} catch (err) {
  console.warn('Could not read .env.local:', err.message);
}

// Inject into process.env so mailer can read SMTP credentials
for (const [k, v] of Object.entries(env)) {
  if (!process.env[k]) process.env[k] = v;
}

const isForce = process.argv.includes('--force');

async function main() {
  console.log('============================================================');
  console.log(`🚀 FinLITE Release Broadcast: v${LATEST_RELEASE.version}`);
  console.log(`Title: ${LATEST_RELEASE.title}`);
  console.log('============================================================');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith('your-')
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials missing in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Check if already broadcasted in DB
  try {
    const { data: existing } = await supabase
      .from('app_releases')
      .select('version, broadcasted_at')
      .eq('version', LATEST_RELEASE.version)
      .maybeSingle();

    if (existing && !isForce) {
      console.log(`ℹ️ Version ${LATEST_RELEASE.version} was already broadcasted on ${existing.broadcasted_at}.`);
      console.log('To re-send, run with the --force flag: node scripts/broadcast_release.mjs --force');
      process.exit(0);
    }
  } catch (_) {
    // app_releases table may not exist yet
  }

  // 2. Fetch all approved user emails
  console.log('Fetching active recipient emails from profiles...');
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('email, full_name, role, status')
    .eq('status', 'approved');

  if (profErr) {
    console.error('❌ Error fetching user profiles:', profErr.message);
    process.exit(1);
  }

  let recipients = (profiles || [])
    .map((p) => p.email?.trim().toLowerCase())
    .filter((e) => e && e.includes('@'));

  // Fallback: If RLS blocked anon client from reading profiles, check registration_requests
  if (recipients.length === 0) {
    console.log('Querying approved registration requests as fallback...');
    const { data: regRequests } = await supabase
      .from('registration_requests')
      .select('email, status')
      .eq('status', 'approved');

    if (regRequests && regRequests.length > 0) {
      recipients = regRequests
        .map((r) => r.email?.trim().toLowerCase())
        .filter((e) => e && e.includes('@'));
    }
  }

  const uniqueRecipients = Array.from(new Set(recipients));

  if (uniqueRecipients.length === 0) {
    console.log('⚠️ No approved users found with valid email addresses.');
    process.exit(0);
  }


  console.log(`📬 Found ${uniqueRecipients.length} active recipient(s):`, uniqueRecipients.join(', '));
  console.log('Dispatching release notification via Gmail SMTP (finlite.pdm@gmail.com)...');

  const dispatchResult = await sendSystemUpdateBroadcastEmail({
    version: LATEST_RELEASE.version,
    title: LATEST_RELEASE.title,
    releaseNotes: LATEST_RELEASE.releaseNotes,
    recipients: uniqueRecipients,
  });

  if (dispatchResult.success) {
    console.log(`✅ Broadcast successfully delivered to ${uniqueRecipients.length} recipient(s)!`);

    // Record release in DB
    try {
      await supabase.from('app_releases').insert([{
        version: LATEST_RELEASE.version,
        title: LATEST_RELEASE.title,
        release_notes: LATEST_RELEASE.releaseNotes,
      }]);
    } catch (_) {}
  } else {
    console.error('❌ Failed to dispatch email broadcast:', dispatchResult.error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
