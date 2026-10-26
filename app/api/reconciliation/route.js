import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/config/admin';
import { hasPermission, fetchProfileWithPermissions, ACTION_KEYS } from '@/lib/auth/permissions';
import { getClientIp } from '@/lib/security/ratelimit';

// GET /api/reconciliation — Retrieve recent or latest cash reconciliation sessions
export async function GET(req) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database service unavailable.' }, { status: 503 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const db = adminClient || supabase;

    const { searchParams } = new URL(req.url);
    const semesterId = searchParams.get('semester_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);

    let query = db
      .from('cash_reconciliations')
      .select(`
        *,
        counted_by_profile:counted_by (id, full_name, role),
        verified_by_profile:verified_by (id, full_name, role),
        cash_reconciliation_items (
          id, quantity, subtotal, denomination_id,
          denominations (id, code, name, face_value, type)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (semesterId) {
      query = query.eq('semester_id', semesterId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Failed to fetch cash reconciliations:', error);
      return NextResponse.json({ error: error.message || 'Failed to fetch reconciliations.' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] }, { status: 200 });
  } catch (err) {
    console.error('Reconciliation GET error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/reconciliation — Record a new cash count audit reconciliation session
export async function POST(req) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database service unavailable.' }, { status: 503 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required to save reconciliation.' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const db = adminClient || supabase;

    const email = user.email?.toLowerCase();
    const isSuperAdmin = isSuperAdminEmail(email);

    const callerProfile = await fetchProfileWithPermissions(db, { userId: user.id, email });

    const isApproved = isSuperAdmin || callerProfile?.status === 'approved' || user.app_metadata?.status === 'approved';
    if (!isApproved) {
      return NextResponse.json({ error: 'Your account is pending admin approval.' }, { status: 403 });
    }

    // Strict action permission validation
    if (!isSuperAdmin && !hasPermission(callerProfile, ACTION_KEYS.CASH_RECONCILIATION, email)) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to perform cash reconciliation.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      physical_total,
      ledger_cash_balance,
      variance_amount,
      variance_status,
      approval_status,
      notes,
      semester_id,
      items = [],
    } = body;

    const countedBy = callerProfile?.id || user.id;
    const isVarianceZero = Number(variance_amount || 0) === 0 || variance_status === 'BALANCED';

    const reconPayload = {
      physical_total: Number(physical_total) || 0,
      ledger_cash_balance: Number(ledger_cash_balance) || 0,
      variance_amount: Number(variance_amount) || 0,
      variance_status: variance_status || 'BALANCED',
      approval_status: approval_status || (isVarianceZero ? 'BALANCED' : 'PENDING_APPROVAL'),
      notes: notes || null,
      semester_id: semester_id || null,
      counted_by: countedBy,
      created_at: new Date().toISOString(),
    };

    let { data, error } = await db
      .from('cash_reconciliations')
      .insert([reconPayload])
      .select()
      .single();

    // Fallback if approval_status column does not exist in older migration state
    if (error && error.message?.includes('approval_status')) {
      const fallbackRecon = { ...reconPayload };
      delete fallbackRecon.approval_status;
      const res2 = await db
        .from('cash_reconciliations')
        .insert([fallbackRecon])
        .select()
        .single();
      if (res2.data) {
        data = res2.data;
        error = null;
      } else {
        error = res2.error;
      }
    }

    if (error) {
      console.error('Failed to insert cash reconciliation:', error);
      return NextResponse.json({ error: error.message || 'Failed to save cash reconciliation.' }, { status: 500 });
    }

    // Persist normalized child items if provided
    if (Array.isArray(items) && items.length > 0 && data?.id) {
      const reconItems = items.map((item) => ({
        reconciliation_id: data.id,
        denomination_id: item.denomination_id,
        quantity: item.quantity || 0,
        subtotal: item.subtotal || 0,
      }));

      try {
        await db
          .from('cash_reconciliation_items')
          .upsert(reconItems, { onConflict: 'reconciliation_id,denomination_id' });
      } catch (itemErr) {
        console.warn('cash_reconciliation_items upsert note in API:', itemErr?.message);
      }
    }

    // Telemetry immutable audit log
    try {
      const clientIp = getClientIp(req);
      const isShortage = Number(variance_amount || 0) < 0 || variance_status === 'SHORTAGE';
      const isOverage = Number(variance_amount || 0) > 0 || variance_status === 'OVERAGE';
      const actionName = isShortage 
        ? 'CASHBOX_SHORTAGE_DECLARED' 
        : isOverage 
          ? 'CASHBOX_OVERAGE_DECLARED' 
          : 'CASHBOX_RECONCILED';

      const auditPayload = {
        action: actionName,
        entity_type: 'cash_reconciliations',
        entity_id: data.id,
        user_id: callerProfile?.id || null,
        created_at: data.created_at || new Date().toISOString(),
        details: {
          ip_address: clientIp,
          physical_total: Number(physical_total) || 0,
          system_total: Number(ledger_cash_balance) || 0,
          ledger_cash_balance: Number(ledger_cash_balance) || 0,
          variance: Number(variance_amount) || 0,
          variance_amount: Number(variance_amount) || 0,
          variance_status: variance_status || (isShortage ? 'SHORTAGE' : isOverage ? 'OVERAGE' : 'BALANCED'),
          approval_status: approval_status || (isVarianceZero ? 'BALANCED' : 'PENDING_APPROVAL'),
          notes: notes || null,
          items: Array.isArray(items) ? items : [],
          snapshot: {
            title: `Physical Cashbox Count (${variance_status || (isShortage ? 'SHORTAGE' : isOverage ? 'OVERAGE' : 'BALANCED')})`,
            physical_total: Number(physical_total) || 0,
            system_total: Number(ledger_cash_balance) || 0,
            ledger_cash_balance: Number(ledger_cash_balance) || 0,
            variance: Number(variance_amount) || 0,
            variance_amount: Number(variance_amount) || 0,
            variance_status: variance_status || (isShortage ? 'SHORTAGE' : isOverage ? 'OVERAGE' : 'BALANCED'),
            approval_status: approval_status || (isVarianceZero ? 'BALANCED' : 'PENDING_APPROVAL'),
            notes: notes || null,
            items: Array.isArray(items) ? items : [],
          },
        },
      };

      const { error: auditInsertErr } = await db.from('audit_logs').insert([auditPayload]);
      if (auditInsertErr && auditInsertErr.code === '23503') {
        // Fallback: foreign key violation on profiles(id)
        await db.from('audit_logs').insert([{ ...auditPayload, user_id: null }]);
      }
    } catch (auditErr) {
      console.warn('Reconciliation audit logging notice:', auditErr?.message);
    }

    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (err) {
    console.error('Cash reconciliation POST error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
