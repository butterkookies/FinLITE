/**
 * FinLITE Financial Audit Trail Service
 * Provides helpers for querying immutable audit logs and recording client-side financial milestones.
 */

/**
 * Fetches recent audit trail events with actor profile metadata.
 * Uses get_financial_audit_trail RPC if available, otherwise falls back to joined query.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {number} [limit=50]
 * @returns {Promise<{ data: Array<Object>, error: Error|null }>}
 */
export async function fetchAuditTrail(supabase, limit = 50) {
  if (!supabase) {
    return { data: [], error: new Error('Supabase client not initialized') };
  }

  try {
    // 1. Try the optimized stored procedure
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_financial_audit_trail',
      { p_limit: limit }
    );

    if (!rpcError && Array.isArray(rpcData)) {
      return { data: rpcData, error: null };
    }

    // 2. Fallback to standard joined select query
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        entity_type,
        entity_id,
        details,
        created_at,
        profiles:user_id (
          full_name,
          email,
          role,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (fallbackError) {
      console.warn('Fallback audit log query warning:', fallbackError.message);
      return { data: [], error: fallbackError };
    }

    // Normalize fallback data to match RPC signature
    const normalized = (fallbackData || []).map((row) => ({
      id: row.id,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      details: row.details,
      created_at: row.created_at,
      actor_name: row.profiles?.full_name || 'System / Unassigned',
      actor_email: row.profiles?.email || null,
      actor_role: row.profiles?.role || 'member',
      actor_avatar: row.profiles?.avatar_url || null,
    }));

    return { data: normalized, error: null };
  } catch (err) {
    console.error('Failed to fetch audit trail:', err);
    return { data: [], error: err };
  }
}

/**
 * Non-blocking client-side helper to record explicit financial milestones.
 * e.g., formal liquidation export, manual receipt attach, or abono reimbursement payout.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Object} params
 * @param {string} params.action - e.g. 'EXPORT_LIQUIDATION', 'RECEIPT_UPLOADED', 'MANUAL_AUDIT_ENTRY'
 * @param {string} params.entityType - e.g. 'transactions', 'reports', 'cash_reconciliations'
 * @param {string|number} [params.entityId]
 * @param {Object} [params.details]
 * @param {string} [params.userId]
 * @returns {Promise<boolean>}
 */
export async function logAuditEvent(supabase, {
  action,
  entityType = 'transactions',
  entityId = null,
  details = {},
  userId = null,
}) {
  if (!supabase) return false;

  try {
    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      resolvedUserId = user?.id || null;
    }

    const { error } = await supabase.from('audit_logs').insert([
      {
        action,
        entity_type: entityType,
        entity_id: entityId ? String(entityId) : null,
        details,
        user_id: resolvedUserId,
      },
    ]);

    if (error) {
      // Non-blocking warning so user operation never breaks
      console.warn('logAuditEvent non-blocking warning:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('logAuditEvent exception caught:', err.message);
    return false;
  }
}
