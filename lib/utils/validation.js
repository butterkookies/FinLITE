import { toCentavos, formatPHP } from './currency.js';

/**
 * Input validation utilities for FinLITE authentication
 */

/**
 * Validates whether an email string is a properly formatted Gmail address.
 * Returns null if valid, or a descriptive error message explaining the exact mistake.
 *
 * @param {string} email
 * @returns {string | null}
 */
export function validateGmail(email) {
  if (!email || !email.trim()) {
    return 'Gmail address is required.';
  }

  const trimmed = email.trim().toLowerCase();

  // Case 1: Missing @ symbol (e.g. "example.gmail", "usergmail.com")
  if (!trimmed.includes('@')) {
    return "Missing '@' symbol. Please enter a valid address (e.g. yourname@gmail.com).";
  }

  const parts = trimmed.split('@');

  // Case 2: Incomplete local part or multiple @ symbols
  if (parts.length !== 2 || !parts[0]) {
    return 'Please enter a valid email name before the @ symbol (e.g. yourname@gmail.com).';
  }

  const [username, domain] = parts;

  // Case 3: Incomplete domain (e.g. "user@gmail", "user@gmail.")
  if (domain === 'gmail' || domain === 'gmail.') {
    return "Incomplete domain '@gmail'. Did you forget '.com'? (e.g. yourname@gmail.com)";
  }

  // Case 4: Typo in gmail.com (e.g. "user@gmail.con", "user@gmai.com", "user@gmail.co")
  if (domain.startsWith('gmail') && domain !== 'gmail.com') {
    return `Invalid domain '@${domain}'. Did you mean '@gmail.com'?`;
  }

  if (domain === 'gmai.com' || domain === 'gamil.com' || domain === 'gmial.com') {
    return `Typo detected in '@${domain}'. Did you mean '@gmail.com'?`;
  }

  // Case 5: Non-Gmail domains (e.g. "@yahoo.com", "@outlook.com", "@pdm.edu.ph")
  if (domain !== 'gmail.com') {
    return `Only Gmail addresses (@gmail.com) are accepted. '@${domain}' is not allowed.`;
  }

  // Case 6: Invalid characters in local part
  const validPattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  if (!validPattern.test(trimmed)) {
    return 'Email address contains invalid characters.';
  }

  return null; // Valid!
}

/**
 * Validates a username string.
 * @param {string} username
 * @returns {string | null}
 */
export function validateUsername(username) {
  if (!username || !username.trim()) {
    return 'Username is required.';
  }
  const trimmed = username.trim();
  if (trimmed.length < 3 || trimmed.length > 20) {
    return 'Username must be between 3 and 20 characters.';
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return 'Username can only contain letters, numbers, and underscores (no spaces or special symbols).';
  }
  return null;
}

/**
 * Validates a password string.
 * @param {string} password
 * @returns {string | null}
 */
export function validatePassword(password) {
  if (!password) {
    return 'Password is required.';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  return null;
}

/**
 * Validates a contact/phone number.
 * If provided: must contain only digits (no letters, spaces, or symbols).
 * @param {string} phone
 * @returns {string | null}
 */
export function validateContactNumber(phone) {
  if (!phone || !phone.toString().trim()) {
    return null; // Optional field
  }
  const trimmed = phone.toString().trim();
  if (!/^\d+$/.test(trimmed)) {
    return 'Contact number must contain numbers only (no letters or special characters).';
  }
  if (trimmed.length !== 11) {
    return `Contact number must be exactly 11 digits (currently ${trimmed.length} digits).`;
  }
  return null;
}

/** Maximum single-transaction amount: 5 integer digits + 2 decimals (₱99,999.99). */
export const MAX_TRANSACTION_AMOUNT = 99999.99;
export const MAX_TRANSACTION_INTEGER_DIGITS = 5;

/**
 * Strips an amount input down to digits and at most one decimal point,
 * limited to 5 integer digits and 2 decimal places (e.g. "123456.789" -> "12345.78").
 * @param {string} raw
 * @returns {string}
 */
export function sanitizeAmountInput(raw) {
  let v = String(raw ?? '').replace(/[^\d.]/g, '');
  const firstDot = v.indexOf('.');
  if (firstDot !== -1) {
    v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
  }
  let [intPart, decPart] = v.split('.');
  intPart = intPart.slice(0, MAX_TRANSACTION_INTEGER_DIGITS);
  return decPart !== undefined ? `${intPart}.${decPart.slice(0, 2)}` : intPart;
}

/**
 * Validates a transaction amount: positive, max 2 decimals, at most ₱99,999.99.
 * Returns null if valid, or an error message.
 * @param {string | number} amount
 * @returns {string | null}
 */
export function validateTransactionAmount(amount) {
  const str = String(amount ?? '').trim();
  if (!str) return 'Amount is required.';
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    return 'Enter a valid amount with up to 2 decimal places (e.g. 1250.50).';
  }
  const num = Number(str);
  if (num <= 0) return 'Amount must be greater than ₱0.00.';
  if (num > MAX_TRANSACTION_AMOUNT) {
    return 'Amount cannot exceed ₱99,999.99 (5 digits).';
  }
  return null;
}

/**
 * Prevents an outflow from overdrawing the channel it is paid from.
 * Each channel is checked separately: a ₱3,000 CASH outflow is rejected when the
 * cashbox has ₱1,000 even if the GCash wallet holds ₱2,000.
 * Abono (out-of-pocket advance) entries are skipped because they don't leave
 * the cashbox/wallet until reimbursed.
 * Returns null if allowed, or an error message.
 */
export function validateOutflowBalance({ type, paymentMethod, isReimbursement, amount, cashBalance, gcashBalance }) {
  if (type !== 'OUTFLOW' || isReimbursement) return null;
  const isGcash = paymentMethod === 'GCASH';
  const available = Number(isGcash ? gcashBalance : cashBalance) || 0;
  if (toCentavos(Number(amount) || 0) > toCentavos(available)) {
    const label = isGcash ? 'GCash Wallet' : 'Physical Cashbox';
    return `Insufficient ${label} balance. Available: ${formatPHP(available)}.`;
  }
  return null;
}