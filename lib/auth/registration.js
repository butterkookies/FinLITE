import { isReplaceableRegistration } from '@/lib/auth/policy';
import { getAuthMethods } from '@/lib/auth/methods';

/**
 * Removes an unverified email/password registration (its request row and its
 * never-confirmed auth user) so the rightful owner of the inbox can register.
 *
 * Refuses to touch anything verified, approved, or Google-based.
 *
 * @returns {Promise<boolean>} true if the squatter was discarded
 */
export async function discardUnverifiedRegistration(adminClient, request) {
  if (!isReplaceableRegistration(request)) return false;

  // Never delete an auth user whose email has been confirmed.
  if (request.google_id) {
    const methods = await getAuthMethods(adminClient, { userId: request.google_id });
    if (methods.found && methods.email_confirmed) return false;

    if (methods.found) {
      const { error: delErr } = await adminClient.auth.admin.deleteUser(request.google_id);
      if (delErr) {
        console.warn('Could not delete unverified auth user:', delErr.message);
        return false;
      }
    }
  }

  const { error } = await adminClient
    .from('registration_requests')
    .delete()
    .eq('id', request.id);

  return !error;
}

/**
 * Generates a one-time email-verification token for an existing unconfirmed
 * user and returns the in-app URL to email them. The token is only redeemed
 * when the link is opened via /api/auth/verify-email, never by a page load.
 *
 * @returns {Promise<string|null>}
 */
export async function createVerificationLink(adminClient, email, appUrl) {
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  const hashed = data?.properties?.hashed_token;
  if (error || !hashed) {
    console.error('generateLink (verification) failed:', error?.message);
    return null;
  }
  const params = new URLSearchParams({ token_hash: hashed, type: 'magiclink' });
  return `${appUrl}/api/auth/verify-email?${params.toString()}`;
}

/**
 * Generates a one-time password-recovery link for an account that has a password.
 * @returns {Promise<string|null>}
 */
export async function createRecoveryLink(adminClient, email, appUrl) {
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
  });
  const hashed = data?.properties?.hashed_token;
  if (error || !hashed) {
    console.error('generateLink (recovery) failed:', error?.message);
    return null;
  }
  const params = new URLSearchParams({ token_hash: hashed, type: 'recovery' });
  return `${appUrl}/reset-password?${params.toString()}`;
}
