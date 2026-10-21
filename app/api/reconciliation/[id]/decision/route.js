import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/config/admin';
import { fetchProfileWithPermissions } from '@/lib/auth/permissions';
import { getClientIp } from '@/lib/security/ratelimit';

// POST /api/reconciliation/[id]/decision — Faculty Adviser Approve / Reject Cash Variance
export async function POST(req, { params }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const reconciliationId = resolvedParams?.id;

    if (!reconciliationId) {
      return NextResponse.json({ error: 'Reconciliation ID is required.' }, { status: 400 });
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

    // Only advisers and super admins can authorize cash count discrepancies
    const isAdviserOrAdmin = isSuperAdmin || callerProfile?.role === 'adviser' || callerProfile?.role === 'admin';
    if (!isAdviserOrAdmin) {
      return NextResponse.json({
        error: 'Forbidden: Only Faculty Club Advisers or Administrators may authorize cash count discrepancies.',
      }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, notes } = body;

    const normalizedAction = String(action || '').toUpperCase();
    if (normalizedAction !== 'APPROVE' && normalizedAction !== 'REJECT') {
      return NextResponse.json({
        error: 'Invalid action. Must be either "APPROVE" or "REJECT".',
      }, { status: 400 });
    }

    // Fetch target reconciliation session
    const { data: recon, error: reconErr } = await db
      .from('cash_reconciliations')
      .select('*')
      .eq('id', reconciliationId)
      .maybeSingle();

    if (reconErr || !recon) {
      return NextResponse.json({ error: 'Cash reconciliation record not found.' }, { status: 404 });
    }

    const varianceAmt = parseFloat(recon.variance_amount || 0);

    if (normalizedAction === 'APPROVE') {
      // 1. Update reconciliation record
      const updatePayload = {
        approval_status: 'APPROVED',
        adviser_decision_by: callerProfile?.id || null,
        adviser_decision_at: new Date().toISOString(),
        adviser_notes: notes?.trim() || null,
        verified_by: callerProfile?.id || null,
      };

      const { data: updatedRecon, error: upErr } = await db
        .from('cash_reconciliations')
        .update(updatePayload)
        .eq('id', reconciliationId)
        .select()
        .single();

      if (upErr) {
        console.warn('Reconciliation update note:', upErr.message);
      }

      // 2. If there is a material variance, commit the corresponding adjustment transaction
      let adjustingTx = null;
      if (Math.abs(varianceAmt) > 0) {
        const isShortage = varianceAmt < 0;
        const absVariance = Math.abs(varianceAmt);

        // Find appropriate category
        let categoryId = null;
        const targetType = isShortage ? 'OUTFLOW' : 'INFLOW';
        const { data: catList } = await db
          .from('categories')
          .select('id, name')
          .eq('type', targetType);

        if (catList && catList.length > 0) {
          const matchedCat = catList.find((c) =>
            isShortage
              ? c.name.toLowerCase().includes('shortage')
              : c.name.toLowerCase().includes('overage') || c.name.toLowerCase().includes('other')
          );
          categoryId = matchedCat?.id || catList[0].id;
        }

        const txPayload = {
          title: isShortage
            ? 'Declared Cash Shortage (Adviser Approved)'
            : 'Declared Cash Overage (Adviser Approved)',
          description: notes?.trim() || (isShortage
            ? `Discrepancy identified during physical count and verified by Adviser ${callerProfile?.full_name || email}`
            : `Surplus cash identified during physical count and recorded into ledger by Adviser ${callerProfile?.full_name || email}`),
          amount: absVariance,
          type: targetType,
          category_id: categoryId,
          semester_id: recon.semester_id,
          logged_by: callerProfile?.id || null,
          transaction_date: new Date().toISOString().split('T')[0],
          is_reimbursement: false,
          status: 'COMPLETED',
          event_name: 'Cash Count Audit',
        };

        const { data: createdTx, error: txErr } = await db
          .from('transactions')
          .insert([txPayload])
          .select()
          .single();

        if (txErr) {
          console.error('Failed to create variance adjusting transaction:', txErr);
        } else {
          adjustingTx = createdTx;
        }
      }

      // 3. Telemetry audit log
      try {
        const clientIp = getClientIp(req);
        await db.from('audit_logs').insert([{
          action: 'RECONCILIATION_APPROVED',
          entity_type: 'cash_reconciliations',
          entity_id: reconciliationId,
          user_id: callerProfile?.id || user.id,
          details: {
            adviser_email: email,
            variance_amount: varianceAmt,
            adjusting_transaction_id: adjustingTx?.id || null,
            notes: notes?.trim() || null,
            ip_address: clientIp,
          },
        }]);
      } catch (_) {}

      return NextResponse.json({
        success: true,
        message: 'Reconciliation approved and ledger adjusted successfully.',
        reconciliation: updatedRecon || recon,
        adjusting_transaction: adjustingTx,
      });
    } else {
      // REJECT action
      const { data: updatedRecon } = await db
        .from('cash_reconciliations')
        .update({
          approval_status: 'REJECTED',
          adviser_decision_by: callerProfile?.id || null,
          adviser_decision_at: new Date().toISOString(),
          adviser_notes: notes?.trim() || 'Recount requested by Faculty Adviser.',
        })
        .eq('id', reconciliationId)
        .select()
        .single();

      try {
        const clientIp = getClientIp(req);
        await db.from('audit_logs').insert([{
          action: 'RECONCILIATION_REJECTED',
          entity_type: 'cash_reconciliations',
          entity_id: reconciliationId,
          user_id: callerProfile?.id || user.id,
          details: {
            adviser_email: email,
            variance_amount: varianceAmt,
            notes: notes?.trim() || null,
            ip_address: clientIp,
          },
        }]);
      } catch (_) {}

      return NextResponse.json({
        success: true,
        message: 'Reconciliation rejected. Recount requested.',
        reconciliation: updatedRecon || recon,
      });
    }
  } catch (err) {
    console.error('API /api/reconciliation/[id]/decision error:', err);
    return NextResponse.json({ error: 'Server error processing reconciliation decision.' }, { status: 500 });
  }
}
