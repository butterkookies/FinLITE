import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side helpers for reading and recording an account's sign-in methods.
 * All of these require the service-role client; callers must pass one.
 */

/**
 * Looks up an account's sign-in facts from the auth schema (the single source
 * of truth for "has a password" and "email verified").
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} adminClient
 * @param {{ userId?: string, email?: string }} by
 * @returns {Promise<{ found: boolean, user_id?: string, email?: string, has_password?: boolean, email_confirmed?: boolean, providers?: string[] }>}
 */
export async function getAuthMethods(adminClient, { userId, email }) {
  const { data, error } = await adminClient.rpc('finlite_auth_methods', {
    p_user_id: userId || null,
    p_email: email ? email.trim().toLowerCase() : null,
  });
  if (error) {
    throw new Error(`finlite_auth_methods failed: ${error.message}`);
  }
  return data || { found: false };
}

/** @returns {Promise<object|null>} */
export async function getSecurityState(adminClient, userId) {
  const { data } = await adminClient
    .from('auth_security_state')
    .select('*')
    .eq('auth_user_id', userId)
    .maybeSingle();
  return data || null;
}

/** Upserts fields on a user's security state row. */
export async function patchSecurityState(adminClient, userId, fields) {
  const { error } = await adminClient
    .from('auth_security_state')
    .upsert(
      { auth_user_id: userId, ...fields, updated_at: new Date().toISOString() },
      { onConflict: 'auth_user_id' }
    );
  if (error) {
    throw new Error(`auth_security_state update failed: ${error.message}`);
  }
}

/**
 * Verifies a password for an account without creating or touching any session
 * cookie (used for "prove your current password" checks).
 *
 * @returns {Promise<boolean>}
 */
export async function verifyPasswordOnly(email, password) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return false;

  const probe = createSupabaseClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await probe.auth.signInWithPassword({ email, password });
  return !error;
}

/**
 * Creates a stateless anon client (no cookies, no persistence), used to redeem
 * emailed one-time tokens server-side.
 */
export function createStatelessClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createSupabaseClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Best-effort audit trail entry for authentication events. Never throws.
 */
export async function logAuthEvent(client, { action, profileId = null, entityId, details = {} }) {
  try {
    await client.from('audit_logs').insert([
      {
        action,
        entity_type: 'auth_session',
        entity_id: entityId || profileId,
        user_id: profileId,
        details,
      },
    ]);
  } catch (err) {
    console.warn(`Auth audit log warning (${action}):`, err?.message);
  }
}
