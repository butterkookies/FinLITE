// Admin Configuration & Super Admin Registry for FinLITE

export const SUPER_ADMIN_EMAILS = [
  'geronimoandreijohn.pdm@gmail.com',
];

/**
 * Checks if a given email belongs to a designated FinLITE Super Admin.
 * Case-insensitive and whitespace-tolerant.
 * @param {string} email 
 * @returns {boolean}
 */
export function isSuperAdminEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  return SUPER_ADMIN_EMAILS.includes(clean);
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
