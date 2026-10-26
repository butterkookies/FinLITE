import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/config/admin';
import { getClientIp } from '@/lib/security/ratelimit';
import { hasPermission, fetchProfileWithPermissions, ACTION_KEYS } from '@/lib/auth/permissions';

// POST /api/transactions — Create a transaction directly in the ledger
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
      return NextResponse.json({ error: 'Authentication required to record transactions.' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const queryClient = adminClient || supabase;

    // Verify caller's profile and approval status
    const email = user.email?.toLowerCase();
    const isSuperAdmin = isSuperAdminEmail(email);

    const profile = await fetchProfileWithPermissions(queryClient, { userId: user.id, email });

    const isApproved = isSuperAdmin || profile?.status === 'approved' || user.app_metadata?.status === 'approved';
    if (!isApproved) {
      return NextResponse.json({ error: 'Your account is pending admin approval.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      description,
      amount,
      type,
      category_id,
      category_name,
      semester_id,
      transaction_date,
      is_reimbursement,
      reimbursement_recipient,
      advanced_by_name,
      status,
      event_name,
      receipt_urls = [],
    } = body;

    // Granular action permission check
    const isTxInflow = type === 'INFLOW';
    const isTxAbono = Boolean(is_reimbursement);

    let requiredAction = ACTION_KEYS.RECORD_OUTFLOW;
    if (isTxInflow) {
      requiredAction = ACTION_KEYS.RECORD_INFLOW;
    } else if (isTxAbono) {
      requiredAction = ACTION_KEYS.RECORD_ABONO;
    }

    if (!isSuperAdmin && !hasPermission(profile, requiredAction, email)) {
      return NextResponse.json({
        error: `Forbidden: You do not have permission to ${isTxInflow ? 'record inflows' : isTxAbono ? 'record abono/reimbursements' : 'record outflows'}.`,
      }, { status: 403 });
    }

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Transaction title is required.' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'A valid positive amount is required.' }, { status: 400 });
    }

    // Resolve category_id if missing
    let resolvedCategoryId = category_id;
    if (!resolvedCategoryId) {
      if (category_name) {
        const { data: cat } = await queryClient
          .from('categories')
          .select('id')
          .ilike('name', category_name.trim())
          .maybeSingle();
        if (cat) resolvedCategoryId = cat.id;
      }
      if (!resolvedCategoryId) {
        const { data: fallbackCat } = await queryClient
          .from('categories')
          .select('id')
          .eq('type', type === 'INFLOW' ? 'INFLOW' : 'OUTFLOW')
          .limit(1)
          .maybeSingle();
        resolvedCategoryId = fallbackCat?.id || null;
      }
    }

    // Resolve semester_id if missing or temporary format
    let resolvedSemesterId = semester_id;
    if (!resolvedSemesterId || (typeof resolvedSemesterId === 'string' && resolvedSemesterId.startsWith('sem-'))) {
      const { data: activeSem } = await queryClient
        .from('semesters')
        .select('id')
        .order('academic_year', { ascending: false })
        .limit(1)
        .maybeSingle();
      resolvedSemesterId = activeSem?.id || null;
    }

    // CASHBOX SOLVENCY GUARD: For direct cash OUTFLOWs (not abono), verify physical cash on hand
    if (type === 'OUTFLOW' && !isTxAbono && resolvedSemesterId) {
      let availableCash = null;
      try {
        const { data: rpcCash, error: rpcErr } = await queryClient.rpc('get_available_cash_on_hand', {
          p_semester_id: resolvedSemesterId,
        });
        if (!rpcErr && rpcCash !== null && rpcCash !== undefined) {
          availableCash = Number(rpcCash);
        }
      } catch (_) {}

      // Fallback calculation if RPC is not yet registered in database
      if (availableCash === null) {
        const { data: txs } = await queryClient
          .from('transactions')
          .select('amount, type')
          .eq('semester_id', resolvedSemesterId)
          .eq('status', 'COMPLETED');
        if (txs) {
          let inf = 0;
          let outf = 0;
          txs.forEach((t) => {
            if (t.type === 'INFLOW') inf += Number(t.amount || 0);
            if (t.type === 'OUTFLOW') outf += Number(t.amount || 0);
          });
          availableCash = inf - outf;
        }
      }

      if (availableCash !== null && parsedAmount > availableCash) {
        return NextResponse.json({
          error: `Insufficient physical cashbox balance. Available: ₱${availableCash.toLocaleString('en-PH', { minimumFractionDigits: 2 })}, Requested: ₱${parsedAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}. Cash outflows cannot exceed cash on hand.`,
        }, { status: 400 });
      }
    }

    const resolvedClaimant = isTxAbono ? (reimbursement_recipient?.trim() || null) : null;
    const resolvedAdvancedBy = isTxAbono ? (advanced_by_name?.trim() || resolvedClaimant) : null;

    const payload = {
      title: title.trim(),
      description: description?.trim() || null,
      amount: parsedAmount,
      type: type === 'INFLOW' ? 'INFLOW' : 'OUTFLOW',
      category_id: resolvedCategoryId,
      semester_id: resolvedSemesterId,
      logged_by: profile?.id || null,
      transaction_date: transaction_date || new Date().toISOString().split('T')[0],
      is_reimbursement: isTxAbono,
      reimbursement_recipient: resolvedClaimant,
      advanced_by_name: resolvedAdvancedBy,
      status: status || 'PENDING_AUDIT',
      event_name: event_name?.trim() || null,
    };

    // Clean payload of undefined keys
    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k];
    });

    let insertRes = await queryClient
      .from('transactions')
      .insert([payload])
      .select(`
        *,
        categories (id, name, type),
        semesters (id, academic_year, semester, label),
        transaction_receipts (id, public_url, sort_order),
        profiles:logged_by (id, full_name, role, email, avatar_url)
      `)
      .single();

    // Fallback if joined select, semester_id, or advanced_by_name has schema deviation
    if (insertRes.error && (insertRes.error.message?.includes('semester_id') || insertRes.error.message?.includes('advanced_by_name') || insertRes.error.code === 'PGRST204')) {
      const fallbackPayload = { ...payload };
      if (insertRes.error.message?.includes('semester_id')) delete fallbackPayload.semester_id;
      if (insertRes.error.message?.includes('advanced_by_name')) delete fallbackPayload.advanced_by_name;
      insertRes = await queryClient
        .from('transactions')
        .insert([fallbackPayload])
        .select()
        .single();
    }

    if (insertRes.error) {
      console.error('Transaction insert error:', insertRes.error);
      return NextResponse.json({ error: insertRes.error.message || 'Failed to record transaction.' }, { status: 500 });
    }

    const createdTx = insertRes.data;

    // Insert receipts if provided
    const receiptList = Array.isArray(receipt_urls) ? receipt_urls : (body.receipt_url ? [body.receipt_url] : []);
    if (receiptList.length > 0 && createdTx?.id) {
      const receiptRows = receiptList.map((url, idx) => ({
        transaction_id: createdTx.id,
        public_url: url,
        file_url: url,
        sort_order: idx,
        uploaded_by: profile?.id || null,
      }));
      try {
        await queryClient.from('transaction_receipts').insert(receiptRows);
      } catch (rErr) {
        console.warn('transaction_receipts insert notice:', rErr?.message);
      }
    }

    // Telemetry: Capture TRANSACTION_CREATED
    try {
      const clientIp = getClientIp(req);
      await queryClient.from('audit_logs').insert([{
        action: 'TRANSACTION_CREATED',
        entity_type: 'transactions',
        entity_id: createdTx.id,
        user_id: profile?.id || user.id,
        details: {
          title: createdTx.title,
          amount: createdTx.amount,
          type: createdTx.type,
          actor_email: email,
          actor_role: profile?.role || 'member',
          ip_address: clientIp,
          reimbursement_recipient: resolvedClaimant,
          advanced_by_name: resolvedAdvancedBy,
        },
      }]);
    } catch (auditErr) {
      console.warn('Transaction audit telemetry warning:', auditErr?.message);
    }

    return NextResponse.json({
      success: true,
      transaction: createdTx,
    });
  } catch (err) {
    console.error('API /api/transactions error:', err);
    return NextResponse.json({ error: 'Server error recording transaction.' }, { status: 500 });
  }
}
