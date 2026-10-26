import { isSuperAdminEmail } from '../config/admin.js';

/**
 * Canonical action permission keys in FinLITE.
 */
export const ACTION_KEYS = {
  RECORD_INFLOW: 'record_inflow',
  RECORD_OUTFLOW: 'record_outflow',
  RECORD_ABONO: 'record_abono',
  EDIT_TRANSACTION: 'edit_transaction',
  DELETE_TRANSACTION: 'delete_transaction',
  AUDIT_APPROVE: 'audit_approve',
  CASH_RECONCILIATION: 'cash_reconciliation',
  EXPORT_REPORTS: 'export_reports',
};

/**
 * Human-readable action definitions and UI metadata.
 */
export const ACTION_DEFINITIONS = [
  {
    key: ACTION_KEYS.RECORD_INFLOW,
    label: 'Record Inflow',
    description: 'Log membership dues, collection events, and cash inflows.',
    category: 'ledger',
    badgeVariant: 'emerald',
  },
  {
    key: ACTION_KEYS.RECORD_OUTFLOW,
    label: 'Record Outflow',
    description: 'Log official organizational disbursements, procurements, and expenses.',
    category: 'ledger',
    badgeVariant: 'rose',
  },
  {
    key: ACTION_KEYS.RECORD_ABONO,
    label: 'Record Abono / Reimbursement',
    description: 'Record personal out-of-pocket advances awaiting reimbursement.',
    category: 'ledger',
    badgeVariant: 'amber',
  },
  {
    key: ACTION_KEYS.EDIT_TRANSACTION,
    label: 'Edit Transactions',
    description: 'Update transaction titles, amounts, categories, and attached receipts.',
    category: 'ledger',
    badgeVariant: 'blue',
  },
  {
    key: ACTION_KEYS.DELETE_TRANSACTION,
    label: 'Delete / Void Transactions',
    description: 'Void or permanently remove invalid financial records from the ledger.',
    category: 'ledger',
    badgeVariant: 'rose',
  },
  {
    key: ACTION_KEYS.AUDIT_APPROVE,
    label: 'Audit & Approve / Flag',
    description: 'Review submitted entries, verify receipts, add audit remarks, approve or flag for changes.',
    category: 'audit',
    badgeVariant: 'teal',
  },
  {
    key: ACTION_KEYS.CASH_RECONCILIATION,
    label: 'Cash Reconciliation',
    description: 'Count physical vault bills/coins and verify denomination variance.',
    category: 'cashbox',
    badgeVariant: 'indigo',
  },
  {
    key: ACTION_KEYS.EXPORT_REPORTS,
    label: 'Generate & Export Reports',
    description: 'Generate institutional DOCX, Excel, and PDF financial reports.',
    category: 'governance',
    badgeVariant: 'purple',
  },
];

/**
 * Canonical valid system roles and human-readable labels.
 */
export const VALID_ROLES = [
  'treasurer',
  'auditor',
  'president',
  'vice_president',
  'adviser',
  'admin',
];

export const ROLE_LABELS = {
  treasurer: 'Treasurer',
  auditor: 'Auditor',
  president: 'President',
  vice_president: 'Vice President',
  adviser: 'Adviser',
  admin: 'Admin',
};

/**
 * Default action templates per officer position.
 */
export const ROLE_DEFAULT_PERMISSIONS = {
  admin: {
    [ACTION_KEYS.RECORD_INFLOW]: true,
    [ACTION_KEYS.RECORD_OUTFLOW]: true,
    [ACTION_KEYS.RECORD_ABONO]: true,
    [ACTION_KEYS.EDIT_TRANSACTION]: true,
    [ACTION_KEYS.DELETE_TRANSACTION]: true,
    [ACTION_KEYS.AUDIT_APPROVE]: true,
    [ACTION_KEYS.CASH_RECONCILIATION]: true,
    [ACTION_KEYS.EXPORT_REPORTS]: true,
  },
  president: {
    [ACTION_KEYS.RECORD_INFLOW]: true,
    [ACTION_KEYS.RECORD_OUTFLOW]: true,
    [ACTION_KEYS.RECORD_ABONO]: true,
    [ACTION_KEYS.EDIT_TRANSACTION]: true,
    [ACTION_KEYS.DELETE_TRANSACTION]: false,
    [ACTION_KEYS.AUDIT_APPROVE]: false,
    [ACTION_KEYS.CASH_RECONCILIATION]: false,
    [ACTION_KEYS.EXPORT_REPORTS]: true,
  },
  vice_president: {
    [ACTION_KEYS.RECORD_INFLOW]: true,
    [ACTION_KEYS.RECORD_OUTFLOW]: true,
    [ACTION_KEYS.RECORD_ABONO]: true,
    [ACTION_KEYS.EDIT_TRANSACTION]: true,
    [ACTION_KEYS.DELETE_TRANSACTION]: false,
    [ACTION_KEYS.AUDIT_APPROVE]: false,
    [ACTION_KEYS.CASH_RECONCILIATION]: false,
    [ACTION_KEYS.EXPORT_REPORTS]: true,
  },
  treasurer: {
    [ACTION_KEYS.RECORD_INFLOW]: true,
    [ACTION_KEYS.RECORD_OUTFLOW]: true,
    [ACTION_KEYS.RECORD_ABONO]: true,
    [ACTION_KEYS.EDIT_TRANSACTION]: false,
    [ACTION_KEYS.DELETE_TRANSACTION]: false,
    [ACTION_KEYS.AUDIT_APPROVE]: false,
    [ACTION_KEYS.CASH_RECONCILIATION]: true,
    [ACTION_KEYS.EXPORT_REPORTS]: true,
  },
  auditor: {
    [ACTION_KEYS.RECORD_INFLOW]: false,
    [ACTION_KEYS.RECORD_OUTFLOW]: false,
    [ACTION_KEYS.RECORD_ABONO]: false,
    [ACTION_KEYS.EDIT_TRANSACTION]: false,
    [ACTION_KEYS.DELETE_TRANSACTION]: false,
    [ACTION_KEYS.AUDIT_APPROVE]: true,
    [ACTION_KEYS.CASH_RECONCILIATION]: true,
    [ACTION_KEYS.EXPORT_REPORTS]: true,
  },
  adviser: {
    [ACTION_KEYS.RECORD_INFLOW]: false,
    [ACTION_KEYS.RECORD_OUTFLOW]: false,
    [ACTION_KEYS.RECORD_ABONO]: false,
    [ACTION_KEYS.EDIT_TRANSACTION]: false,
    [ACTION_KEYS.DELETE_TRANSACTION]: false,
    [ACTION_KEYS.AUDIT_APPROVE]: false,
    [ACTION_KEYS.CASH_RECONCILIATION]: false,
    [ACTION_KEYS.EXPORT_REPORTS]: true,
  },
};

/**
 * Returns a fully normalized permissions dictionary for any profile.
 * - Super admin always gets all actions = true.
 * - Admin role always gets all actions = true.
 * - If profile has explicit permissions stored, they override the role defaults.
 * - Otherwise falls back to role default template.
 *
 * @param {object|null} profile
 * @param {string|null} userEmail
 * @returns {Record<string, boolean>}
 */
export function resolveUserPermissions(profile, userEmail = null) {
  const email = (userEmail || profile?.email || '').trim().toLowerCase();

  // 1. Super Admin bypass (always unrestricted wildcard)
  if (isSuperAdminEmail(email)) {
    return Object.values(ACTION_KEYS).reduce((acc, k) => {
      acc[k] = true;
      return acc;
    }, {});
  }

  const role = (profile?.role || '').toLowerCase();

  // 2. Admin role defaults to full access
  if (role === 'admin') {
    return Object.values(ACTION_KEYS).reduce((acc, k) => {
      acc[k] = true;
      return acc;
    }, {});
  }

  const roleDefaults = ROLE_DEFAULT_PERMISSIONS[role] || {};
  const customPerms = profile?.permissions && typeof profile.permissions === 'object'
    ? profile.permissions
    : {};

  // Build resolved permissions object with explicit booleans
  const resolved = {};
  Object.values(ACTION_KEYS).forEach((k) => {
    if (typeof customPerms[k] === 'boolean') {
      resolved[k] = customPerms[k];
    } else {
      resolved[k] = Boolean(roleDefaults[k]);
    }
  });

  return resolved;
}

/**
 * Quick permission tester helper.
 *
 * @param {object|Record<string, boolean>} profileOrPermissions
 * @param {string} actionKey
 * @param {string|null} userEmail
 * @returns {boolean}
 */
export function hasPermission(profileOrPermissions, actionKey, userEmail = null) {
  const email = (userEmail || profileOrPermissions?.email || '').trim().toLowerCase();
  if (isSuperAdminEmail(email)) return true;

  if (!profileOrPermissions) return false;

  // If already a resolved permissions map
  if (typeof profileOrPermissions[actionKey] === 'boolean' && !profileOrPermissions.role) {
    return profileOrPermissions[actionKey];
  }

  const permissions = resolveUserPermissions(profileOrPermissions, email);
  return Boolean(permissions[actionKey]);
}

/**
 * Safely fetches a profile by auth_user_id or email, gracefully handling
 * environments where migration 031 (the permissions column) has not yet been applied.
 *
 * @param {object} supabaseClient
 * @param {{ userId?: string, email?: string }} criteria
 * @returns {Promise<object|null>}
 */
export async function fetchProfileWithPermissions(supabaseClient, { userId, email } = {}) {
  if (!supabaseClient || (!userId && !email)) return null;

  const tryLookup = async (selectClause) => {
    let query = supabaseClient.from('profiles').select(selectClause);
    if (userId) {
      query = query.eq('auth_user_id', userId);
    } else if (email) {
      query = query.eq('email', email);
    }
    return await query.maybeSingle();
  };

  // 1. Try with permissions column
  let res = await tryLookup('id, auth_user_id, role, permissions, status, full_name, email');

  // 2. Graceful fallback if column doesn't exist yet
  if (res?.error && (res.error.code === '42703' || res.error.message?.includes('permissions'))) {
    res = await tryLookup('id, auth_user_id, role, status, full_name, email');
  }

  // 3. Fallback: if queried by auth_user_id and found nothing, check by email if available
  if (!res?.data && userId && email) {
    let byEmail = await supabaseClient
      .from('profiles')
      .select('id, auth_user_id, role, permissions, status, full_name, email')
      .eq('email', email)
      .maybeSingle();

    if (byEmail?.error && (byEmail.error.code === '42703' || byEmail.error.message?.includes('permissions'))) {
      byEmail = await supabaseClient
        .from('profiles')
        .select('id, auth_user_id, role, status, full_name, email')
        .eq('email', email)
        .maybeSingle();
    }
    if (byEmail?.data) {
      res = byEmail;
    }
  }

  if (!res?.data) return null;

  return {
    ...res.data,
    permissions: resolveUserPermissions(res.data, res.data.email || email),
  };
}


