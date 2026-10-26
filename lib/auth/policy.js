/**
 * FinLITE authentication policy: pure decision functions.
 *
 * Kept free of I/O so the rules that matter most for account safety can be unit
 * tested without a database. API routes gather the facts and call these.
 */

export const REAUTH_WINDOW_MS = 10 * 60 * 1000; // a "recent" sign-in
export const ENROLL_WINDOW_MS = 2 * 60 * 1000; // password enrollment window
export const LINK_WINDOW_MS = 5 * 60 * 1000; // Google link window

/**
 * What the forgot-password endpoint should do for a given account.
 * The HTTP response is identical in every case (no enumeration); only the
 * email that is sent differs.
 *
 * @param {{ found: boolean, has_password?: boolean, email_confirmed?: boolean }} methods
 * @returns {'none' | 'send_reset' | 'send_google_notice'}
 */
export function decideForgotPasswordAction(methods) {
  if (!methods?.found) return 'none';
  if (!methods.email_confirmed) return 'none';
  return methods.has_password ? 'send_reset' : 'send_google_notice';
}

/**
 * Whether a password may be added to or changed on an account, and what proof
 * the caller must supply.
 *
 * @param {{ hasPassword: boolean, lastSignInAt?: string|null, now?: number }} p
 * @returns {{ mode: 'change'|'add', requires: 'current_password'|'recent_sign_in', recentSignIn: boolean }}
 */
export function passwordChangeRequirements({ hasPassword, lastSignInAt, now = Date.now() }) {
  const signedInAt = lastSignInAt ? new Date(lastSignInAt).getTime() : 0;
  const recentSignIn = Number.isFinite(signedInAt) && now - signedInAt <= REAUTH_WINDOW_MS;

  if (hasPassword) {
    return { mode: 'change', requires: 'current_password', recentSignIn };
  }
  return { mode: 'add', requires: 'recent_sign_in', recentSignIn };
}

/**
 * Decides whether a Google identity on a signed-in session is an approved link.
 *
 * - Account without a password: Google is the account's native method. Trust it.
 * - Account with a password: Google must have been linked deliberately, either
 *   earlier (google_linked_at) or right now (an open link window).
 *
 * @param {{
 *   hasGoogleIdentity: boolean,
 *   hasPassword: boolean,
 *   emailConfirmed: boolean,
 *   googleLinkedAt?: string|null,
 *   googleLinkUntil?: string|null,
 *   now?: number
 * }} p
 * @returns {'not_google' | 'native' | 'approved' | 'link_now' | 'blocked'}
 */
export function evaluateGoogleIdentity({
  hasGoogleIdentity,
  hasPassword,
  emailConfirmed,
  googleLinkedAt,
  googleLinkUntil,
  now = Date.now(),
}) {
  if (!hasGoogleIdentity) return 'not_google';
  if (!hasPassword) return 'native';
  if (googleLinkedAt) return 'approved';

  const windowOpen = googleLinkUntil && new Date(googleLinkUntil).getTime() > now;
  if (windowOpen && emailConfirmed) return 'link_now';

  // Automatic seamless linking for Google-verified accounts
  if (emailConfirmed) return 'approved';

  return 'blocked';
}

/**
 * Whether an existing registration request may be discarded to make room for a
 * new registrant of the same email. Only unverified email/password requests
 * qualify: whoever proves they own the inbox (verification link or Google
 * sign-in) wins over a squatter who never did.
 *
 * @param {{ auth_provider?: string, status?: string, email_verified_at?: string|null }} request
 * @returns {boolean}
 */
export function isReplaceableRegistration(request) {
  return Boolean(
    request &&
      request.auth_provider === 'email' &&
      request.status === 'pending' &&
      !request.email_verified_at
  );
}
