/**
 * Resolves the designated FinLITE Super Admin emails from environment or fallback.
 * @returns {string[]}
 */
export function getSuperAdminEmails() {
  const envEmails = process.env.SUPER_ADMIN_EMAILS || process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || '';
  const parsed = envEmails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (parsed.length > 0) {
    return parsed;
  }

  // Built-in default super admin
  return ['geronimoandreijohn.pdm@gmail.com'];
}

export const SUPER_ADMIN_EMAILS = getSuperAdminEmails();

/**
 * Checks if a given email belongs to a designated FinLITE Super Admin.
 * Case-insensitive and whitespace-tolerant.
 * @param {string} email 
 * @returns {boolean}
 */
export function isSuperAdminEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  return getSuperAdminEmails().includes(clean);
}

/**
 * Normalizes user role, automatically promoting super admin emails.
 * @param {string} email
 * @param {string} currentRole
 * @returns {string}
 */
export function resolveEffectiveRole(email, currentRole) {
  if (isSuperAdminEmail(email)) {
    return 'admin';
  }
  return currentRole || 'treasurer';
}
