import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { fetchProfileWithPermissions, hasPermission, ACTION_KEYS } from '@/lib/auth/permissions';
import { isSuperAdminEmail } from '@/lib/config/admin';

function getClientIp(req) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

// POST /api/transactions/[id]/restore — Restore a voided/archived transaction
export async function POST(req, { params }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const transactionId = resolvedParams?.id;

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required.' }, { status: 400 });
    }

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

    const email = user.email?.toLowerCase();
    const isSuperAdmin = isSuperAdminEmail(email);

    const callerProfile = await fetchProfileWithPermissions(db, { userId: user.id, email });

    const canRestore = isSuperAdmin || hasPermission(callerProfile, ACTION_KEYS.DELETE_TRANSACTION, email);
    if (!canRestore) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to restore voided transactions.' },
        { status: 403 }
      );
    }

    const { data: existingTx } = await db
      .from('transactions')
      .select('*, profiles:logged_by (id, full_name, role, email, avatar_url), transaction_receipts (id, public_url, sort_order)')
      .eq('id', transactionId)
      .maybeSingle();

    if (!existingTx) {
      return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 });
    }

    const isArchived = existingTx.status === 'VOIDED' || existingTx.status === 'ARCHIVED' || (typeof existingTx.notes === 'string' && existingTx.notes.includes('[ARCHIVED]'));
    if (!isArchived) {
      return NextResponse.json(
        { error: 'Transaction is not voided or archived.' },
        { status: 400 }
      );
    }

    // Determine target status
    const targetStatus = existingTx.is_reimbursement && !existingTx.audited_at
      ? 'PENDING_REIMBURSEMENT'
      : 'COMPLETED';

    const cleanedNotes = typeof existingTx.notes === 'string'
      ? existingTx.notes.replace(/\s*\|\s*\[ARCHIVED\][^|]*/g, '').replace(/\[ARCHIVED\][^|]*\s*\|\s*/g, '').replace(/\[ARCHIVED\][^|]*/g, '').trim() || null
      : null;

    const restorePayload = {
      status: targetStatus,
      void_reason: null,
      archived_at: null,
      archived_by: null,
      notes: cleanedNotes,
    };

    let restoredTx = null;
    let restoreErr = null;

    const res = await db
      .from('transactions')
      .update(restorePayload)
      .eq('id', transactionId)
      .select(`
        *,
        categories (id, name, type),
        semesters (id, academic_year, semester, label),
        transaction_receipts (id, public_url, sort_order),
        profiles:logged_by (id, full_name, role, email, avatar_url)
      `)
      .single();

    restoredTx = res.data;
    restoreErr = res.error;

    // Graceful fallback if void_reason or archived_at columns don't exist
    if (restoreErr && (restoreErr.code === '42703' || restoreErr.code === 'PGRST204' || restoreErr.message?.includes('void_reason') || restoreErr.message?.includes('archived_at') || restoreErr.message?.includes('schema cache'))) {
      const fallbackRes = await db
        .from('transactions')
        .update({ status: targetStatus, notes: cleanedNotes })
        .eq('id', transactionId)
        .select(`
          *,
          categories (id, name, type),
          semesters (id, academic_year, semester, label),
          transaction_receipts (id, public_url, sort_order),
          profiles:logged_by (id, full_name, role, email, avatar_url)
        `)
        .single();
      restoredTx = fallbackRes.data;
      restoreErr = fallbackRes.error;
    }

    if (restoreErr) {
      console.error('Restore transaction error:', restoreErr);
      return NextResponse.json({ error: restoreErr.message || 'Failed to restore transaction.' }, { status: 500 });
    }

    const clientIp = getClientIp(req);
    try {
      const auditPayload = {
        action: 'TRANSACTION_RESTORED',
        entity_type: 'transactions',
        entity_id: transactionId,
        user_id: callerProfile?.id || null,
        details: {
          title: existingTx.title,
          amount: existingTx.amount,
          type: existingTx.type,
          restored_status: targetStatus,
          restored_by: email,
          ip_address: clientIp,
        },
      };
      const { error: insErr } = await db.from('audit_logs').insert([auditPayload]);
      if (insErr && insErr.code === '23503') {
        await db.from('audit_logs').insert([{ ...auditPayload, user_id: null }]);
      }
    } catch (auditErr) {
      console.warn('Restore audit log warning:', auditErr?.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Transaction successfully restored to the active ledger.',
      transaction: restoredTx || { ...existingTx, status: targetStatus, void_reason: null },
    });
  } catch (err) {
    console.error('API /api/transactions/[id]/restore error:', err);
    return NextResponse.json({ error: 'Server error restoring transaction.' }, { status: 500 });
  }
}
