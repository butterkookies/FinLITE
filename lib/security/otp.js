import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * In-memory sliding OTP store with automatic TTL expiration.
 * Stored on globalThis to survive Next.js hot-reloads during development.
 * Key format: `${purpose}:${cleanEmail}`
 */
const globalForOtp = globalThis;
if (!globalForOtp._finliteOtpStore) {
  globalForOtp._finliteOtpStore = new Map();
}
const otpStore = globalForOtp._finliteOtpStore;

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_ATTEMPTS = 5;

// Persistent verified email registry that survives client sessions & server reloads
const VERIFIED_CACHE_FILE = path.join(process.cwd(), 'lib', 'security', '.verified_emails.json');

function loadVerifiedCache() {
  const set = new Set();
  try {
    if (fs.existsSync(VERIFIED_CACHE_FILE)) {
      const raw = fs.readFileSync(VERIFIED_CACHE_FILE, 'utf-8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.forEach((e) => {
          if (typeof e === 'string' && e.trim()) set.add(e.trim().toLowerCase());
        });
      }
    }
  } catch (_) {}
  return set;
}

if (!globalForOtp._finliteVerifiedEmails) {
  globalForOtp._finliteVerifiedEmails = loadVerifiedCache();
}
const verifiedEmails = globalForOtp._finliteVerifiedEmails;

export function markEmailAsVerified(email) {
  if (!email || typeof email !== 'string') return;
  const clean = email.trim().toLowerCase();
  verifiedEmails.add(clean);
  try {
    const dir = path.dirname(VERIFIED_CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(VERIFIED_CACHE_FILE, JSON.stringify(Array.from(verifiedEmails)), 'utf-8');
  } catch (_) {}
}

export function removeEmailFromVerified(email) {
  if (!email || typeof email !== 'string') return;
  const clean = email.trim().toLowerCase();
  verifiedEmails.delete(clean);
  try {
    const dir = path.dirname(VERIFIED_CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(VERIFIED_CACHE_FILE, JSON.stringify(Array.from(verifiedEmails)), 'utf-8');
  } catch (_) {}
}

export function isEmailVerified(email) {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  if (verifiedEmails.has(clean)) return true;
  try {
    if (fs.existsSync(VERIFIED_CACHE_FILE)) {
      const raw = fs.readFileSync(VERIFIED_CACHE_FILE, 'utf-8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.forEach((e) => {
          if (typeof e === 'string' && e.trim()) verifiedEmails.add(e.trim().toLowerCase());
        });
      }
    }
  } catch (_) {}
  return verifiedEmails.has(clean);
}

// Periodic cleanup of expired OTPs every 3 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, item] of otpStore.entries()) {
      if (now > item.expiresAt) {
        otpStore.delete(key);
      }
    }
  }, 3 * 60 * 1000).unref?.();
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP code.
 */
export function generateNumericOtp(length = 6) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return crypto.randomInt(min, max + 1).toString();
}

/**
 * Creates and stores a new OTP for an email address and purpose.
 * Enforces a 60-second resend cooldown.
 */
export function createAndStoreOtp({ email, purpose = 'registration', name = '' }) {
  const cleanEmail = email.trim().toLowerCase();
  const key = `${purpose}:${cleanEmail}`;
  const now = Date.now();

  const existing = otpStore.get(key);

  if (existing) {
    const elapsed = now - existing.createdAt;
    if (elapsed < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return {
        success: false,
        cooldownRemaining: waitSeconds,
        error: `Please wait ${waitSeconds} second${waitSeconds === 1 ? '' : 's'} before requesting another code.`,
      };
    }
  }

  const code = generateNumericOtp(6);
  const expiresAt = now + OTP_TTL_MS;

  otpStore.set(key, {
    code,
    email: cleanEmail,
    purpose,
    name: name || '',
    expiresAt,
    createdAt: now,
    attempts: 0,
  });

  return {
    success: true,
    code,
    expiresAt,
    expiresMinutes: 10,
    cooldownSeconds: 60,
  };
}

/**
 * Verifies an entered OTP code against the store.
 */
export function verifyOtp({ email, purpose = 'registration', code }) {
  const cleanEmail = email.trim().toLowerCase();
  const key = `${purpose}:${cleanEmail}`;

  const item = otpStore.get(key);

  if (!item) {
    return {
      valid: false,
      error: 'No active verification code found for this email. Please request a new code.',
    };
  }

  if (Date.now() > item.expiresAt) {
    otpStore.delete(key);
    return {
      valid: false,
      error: 'Verification code has expired. Please request a new code.',
    };
  }

  if (item.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(key);
    return {
      valid: false,
      error: 'Too many incorrect attempts. This code is invalidated. Please request a new code.',
    };
  }

  const cleanInputCode = String(code).trim();
  if (item.code !== cleanInputCode) {
    item.attempts += 1;
    const remaining = MAX_ATTEMPTS - item.attempts;
    return {
      valid: false,
      error: remaining > 0
        ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        : 'Too many incorrect attempts. Please request a new code.',
    };
  }

  // Code matches! Clear from store, mark as verified, and return success
  otpStore.delete(key);
  markEmailAsVerified(cleanEmail);

  return {
    valid: true,
    email: cleanEmail,
    name: item.name,
  };
}

/**
 * Checks remaining cooldown seconds for an email without issuing a new OTP.
 */
export function getCooldownRemaining({ email, purpose = 'registration' }) {
  const cleanEmail = email.trim().toLowerCase();
  const key = `${purpose}:${cleanEmail}`;
  const existing = otpStore.get(key);
  if (!existing) return 0;

  const elapsed = Date.now() - existing.createdAt;
  if (elapsed >= RESEND_COOLDOWN_MS) return 0;

  return Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
}
