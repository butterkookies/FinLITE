import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/config/admin';
import { getClientIp } from '@/lib/security/ratelimit';
import { hasPermission, ACTION_KEYS } from '@/lib/auth/permissions';

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

    let profile = null;
    const { data: profByAuth } = await queryClient
      .from('profiles')
      .select('id, status, role, full_name, email, permissions')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (profByAuth) {
      profile = profByAuth;
    } else if (email) {
      const { data: profByEmail } = await queryClient
        .from('profiles')
        .select('id, status, role, full_name, email, permissions')
        .eq('email', email)
        .maybeSingle();
      profile = profByEmail;
    }

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

    const payload = {
      title: title.trim(),
      description: description?.trim() || null,
      amount: parsedAmount,
      type: type === 'INFLOW' ? 'INFLOW' : 'OUTFLOW',
      category_id: resolvedCategoryId,
      semester_id: resolvedSemesterId,
      logged_by: profile?.id || null,
      transaction_date: transaction_date || new Date().toISOString().split('T')[0],
      is_reimbursement: Boolean(is_reimbursement),
      reimbursement_recipient: is_reimbursement ? (reimbursement_recipient?.trim() || null) : null,
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
        profiles (id, full_name, role, email, avatar_url)
      `)
      .single();

    // Fallback if joined select or semester_id has schema deviation
    if (insertRes.error && (insertRes.error.message?.includes('semester_id') || insertRes.error.code === 'PGRST204')) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.semester_id;
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
