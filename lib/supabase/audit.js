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
 * @param {string} [category='ALL'] - Filter category ('ALL', 'TRANSACTIONS', 'ABONO', 'RECONCILIATION', 'GOVERNANCE')
 * @returns {Promise<{ data: Array<Object>, error: Error|null }>}
 */
export async function fetchAuditTrail(supabase, limit = 50, category = 'ALL') {
  if (!supabase) {
    return { data: [], error: new Error('Supabase client not initialized') };
  }

  try {
    // 1. Try the optimized stored procedure if category is ALL
    if (category === 'ALL') {
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'get_financial_audit_trail',
          { p_limit: limit }
        );

        if (!rpcError && Array.isArray(rpcData)) {
          return { data: rpcData, error: null };
        }
      } catch (_) {}
    }

    // 2. Standard joined select query with category filtering
    let query = supabase
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

    // Apply server-side category filters so auth sessions never push out real events
    const catUpper = String(category || 'ALL').toUpperCase();
    if (catUpper === 'TRANSACTIONS') {
      query = query.in('entity_type', ['transactions', 'transaction_comments'])
                   .neq('action', 'ABONO_SETTLED');
    } else if (catUpper === 'ABONO') {
      query = query.or('action.eq.ABONO_SETTLED,action.eq.SETTLE_ABONO_REIMBURSEMENT,action.eq.PARTIAL_ABONO_DISBURSEMENT,action.ilike.%abono%,entity_type.eq.advances_payable');
    } else if (catUpper === 'RECONCILIATION') {
      query = query.or('entity_type.eq.cash_reconciliations,action.ilike.%reconcil%,action.ilike.%cashbox%');
    } else if (catUpper === 'GOVERNANCE') {
      query = query.or('entity_type.in.(profiles,semesters,semester_signatories,registration_requests),action.ilike.%roster%,action.ilike.%role%,action.ilike.%account%,action.ilike.%registration%,action.ilike.%governance%');
    }

    const { data: fallbackData, error: fallbackError } = await query;

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
      details: row.details || {},
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
 * Automatically guarantees both root-level fields and nested snapshot structures for diff viewers.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Object} params
 * @param {string} params.action - e.g. 'EXPORT_LIQUIDATION', 'RECEIPT_UPLOADED', 'TRANSACTION_CREATED', 'SETTLE_ABONO_REIMBURSEMENT'
 * @param {string} params.entityType - e.g. 'transactions', 'reports', 'cash_reconciliations', 'advances_payable', 'debts'
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

    const normalizedDetails = { ...details };
    if (!normalizedDetails.snapshot) {
      normalizedDetails.snapshot = {
        title: normalizedDetails.title || normalizedDetails.transaction_title || null,
        amount: normalizedDetails.amount ?? normalizedDetails.disbursed_amount ?? null,
        type: normalizedDetails.type || null,
        payment_method: normalizedDetails.payment_method || 'CASH',
        category_name: normalizedDetails.category_name || null,
        is_reimbursement: Boolean(normalizedDetails.is_reimbursement),
        status: normalizedDetails.status || normalizedDetails.new_status || 'COMPLETED',
      };
    }

    const { error } = await supabase.from('audit_logs').insert([
      {
        action,
        entity_type: entityType,
        entity_id: entityId ? String(entityId) : null,
        details: normalizedDetails,
        user_id: resolvedUserId,
      },
    ]);

    if (error) {
      console.warn('logAuditEvent non-blocking warning:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('logAuditEvent exception caught:', err.message);
    return false;
  }
}
