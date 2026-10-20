/**
 * Unified User Avatar Utilities
 * 
 * Provides resolution of profile photos according to FinLITE priority:
 * 1. Custom uploaded photo / avatar in Supabase Storage.
 * 2. Google OAuth profile picture (lh3.googleusercontent.com).
 * 3. Deterministic Google-styled colored initial badge.
 */

export const GOOGLE_AVATAR_COLORS = [
  { bg: 'bg-[#1a73e8]', text: 'text-white', hex: '#1a73e8' }, // Google Blue
  { bg: 'bg-[#d93025]', text: 'text-white', hex: '#d93025' }, // Google Red
  { bg: 'bg-[#188038]', text: 'text-white', hex: '#188038' }, // Google Green
  { bg: 'bg-[#e37400]', text: 'text-white', hex: '#e37400' }, // Google Orange/Yellow
  { bg: 'bg-[#8e24aa]', text: 'text-white', hex: '#8e24aa' }, // Google Purple
  { bg: 'bg-[#00897b]', text: 'text-white', hex: '#00897b' }, // Google Teal
  { bg: 'bg-[#d81b60]', text: 'text-white', hex: '#d81b60' }, // Google Pink
  { bg: 'bg-[#0097a7]', text: 'text-white', hex: '#0097a7' }, // Google Cyan
  { bg: 'bg-[#f4511e]', text: 'text-white', hex: '#f4511e' }, // Google Deep Orange
  { bg: 'bg-[#5e35b1]', text: 'text-white', hex: '#5e35b1' }, // Google Deep Purple
];

/**
 * Checks whether an avatar URL was uploaded by the user to FinLITE storage.
 * @param {string|null|undefined} url 
 * @returns {boolean}
 */
export function isCustomUploadedAvatar(url) {
  if (!url || typeof url !== 'string') return false;
  return url.includes('/storage/v1/object/public/avatars/') || 
         url.includes('/storage/v1/object/public/receipts/avatars/');
}

/**
 * Returns a deterministic Google palette color entry for a user based on their name or email.
 * @param {string|null|undefined} identifier 
 * @returns {{ bg: string, text: string, hex: string }}
 */
export function getGoogleAvatarColor(identifier) {
  const str = String(identifier || 'U').trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const index = Math.abs(hash) % GOOGLE_AVATAR_COLORS.length;
  return GOOGLE_AVATAR_COLORS[index];
}

/**
 * Extracts a single uppercase initial from a user's full name or email.
 * @param {string|null|undefined} name 
 * @param {string|null|undefined} email 
 * @returns {string}
 */
export function getAvatarInitial(name, email) {
  const trimmedName = String(name || '').trim();
  if (trimmedName) {
    const char = trimmedName.charAt(0).toUpperCase();
    if (/[A-Z0-9]/i.test(char)) return char;
  }
  const trimmedEmail = String(email || '').trim();
  if (trimmedEmail) {
    const char = trimmedEmail.charAt(0).toUpperCase();
    if (/[A-Z0-9]/i.test(char)) return char;
  }
  return 'U';
}

/**
 * Resolves the primary avatar URL from profile and user metadata.
 * Prioritizes: custom uploaded avatar > profile avatar_url > google auth metadata
 * 
 * @param {{ profile?: object|null, user?: object|null }} options
 * @returns {string|null}
 */
export function resolveAvatarUrl({ profile = null, user = null } = {}) {
  // 1. Profile avatar_url (could be uploaded or saved Google avatar)
  if (profile?.avatar_url) {
    return profile.avatar_url;
  }

  // 2. Google OAuth metadata on authenticated user
  const googleAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  if (googleAvatar) {
    return googleAvatar;
  }

  return null;
}
