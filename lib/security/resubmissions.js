import fs from 'fs';
import path from 'path';

const RESUBMISSIONS_FILE = path.join(process.cwd(), 'lib', 'security', '.resubmitted_requests.json');

const globalForResubmissions = globalThis;
if (!globalForResubmissions._finliteResubmissions) {
  globalForResubmissions._finliteResubmissions = new Map();
}
const resubmissionsStore = globalForResubmissions._finliteResubmissions;

function saveToDisk() {
  try {
    const obj = {};
    for (const [k, v] of resubmissionsStore.entries()) {
      obj[k] = v;
    }
    const dir = path.dirname(RESUBMISSIONS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(RESUBMISSIONS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (_) {}
}

function loadFromDisk() {
  try {
    if (fs.existsSync(RESUBMISSIONS_FILE)) {
      const raw = fs.readFileSync(RESUBMISSIONS_FILE, 'utf-8');
      const obj = JSON.parse(raw);
      for (const [k, v] of Object.entries(obj)) {
        resubmissionsStore.set(k.toLowerCase(), v);
      }
    }
  } catch (_) {}
}

// Initial sync
loadFromDisk();

export function recordResubmission({ id, email, firstName, lastName, username, contactNumber, authUserId = null, authProvider = 'email' }) {
  if (!email || typeof email !== 'string') return;
  const cleanEmail = email.trim().toLowerCase();
  loadFromDisk();

  const existingInStore = resubmissionsStore.get(cleanEmail);

  const record = {
    id: id || existingInStore?.id || undefined,
    first_name: firstName?.trim() || '',
    last_name: lastName?.trim() || '',
    username: username || cleanEmail.split('@')[0],
    email: cleanEmail,
    contact_number: contactNumber?.trim() || null,
    auth_provider: authProvider,
    google_id: authUserId,
    status: 'pending',
    email_verified: false,
    email_verified_at: null,
    rejection_reason: null,
    resubmitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  resubmissionsStore.set(cleanEmail, record);
  saveToDisk();
  return record;
}

export function getResubmission(email) {
  if (!email || typeof email !== 'string') return null;
  const cleanEmail = email.trim().toLowerCase();
  loadFromDisk();
  return resubmissionsStore.get(cleanEmail) || null;
}

export function markResubmissionVerified(email) {
  if (!email || typeof email !== 'string') return;
  const cleanEmail = email.trim().toLowerCase();
  loadFromDisk();

  const existing = resubmissionsStore.get(cleanEmail);
  if (existing) {
    const now = new Date().toISOString();
    existing.email_verified = true;
    existing.email_verified_at = now;
    existing.updated_at = now;
    resubmissionsStore.set(cleanEmail, existing);
    saveToDisk();
  }
}

export function clearResubmission(email) {
  if (!email || typeof email !== 'string') return;
  const cleanEmail = email.trim().toLowerCase();
  loadFromDisk();

  if (resubmissionsStore.has(cleanEmail)) {
    resubmissionsStore.delete(cleanEmail);
    saveToDisk();
  }
}

export function getAllResubmissions() {
  loadFromDisk();
  const list = [];
  for (const v of resubmissionsStore.values()) {
    list.push({ ...v });
  }
  return list;
}
