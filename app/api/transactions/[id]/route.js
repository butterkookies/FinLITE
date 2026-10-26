import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/config/admin';
import { hasPermission, fetchProfileWithPermissions, resolveUserPermissions, ACTION_KEYS } from '@/lib/auth/permissions';
import { sendRevisionSubmittedEmail } from '@/lib/email/mailer';
import { getClientIp } from '@/lib/security/ratelimit';

// GET /api/transactions/[id] — Fetch single transaction details
export async function GET(req, { params }) {
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

    const adminClient = createAdminClient();
    const db = adminClient || supabase;

    const { data: tx, error } = await db
      .from('transactions')
      .select(`
        *,
        categories (id, name, type),
        semesters (id, academic_year, semester, label),
        transaction_receipts (id, public_url, sort_order),
        profiles:logged_by (id, full_name, role, email, avatar_url)
      `)
      .eq('id', transactionId)
      .maybeSingle();

    if (error || !tx) {
      return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, transaction: tx });
  } catch (err) {
    console.error('Fetch transaction error:', err);
    return NextResponse.json({ error: 'Server error retrieving transaction.' }, { status: 500 });
  }
}

// PATCH /api/transactions/[id] — Edit / Update existing transaction
export async function PATCH(req, { params }) {
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

    // Fetch existing transaction first so we can evaluate FLAGGED revision & receipt-attachment rules
    const { data: existingTx, error: fetchErr } = await db
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .maybeSingle();

    if (fetchErr || !existingTx) {
      return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      title,
      description,
      amount,
      type,
      category_id,
      semester_id,
      transaction_date,
      is_reimbursement,
      reimbursement_recipient,
      advanced_by_name,
      event_name,
      receipt_urls,
    } = body;

    const canEdit = isSuperAdmin || hasPermission(callerProfile, ACTION_KEYS.EDIT_TRANSACTION, email);
    const canRecord =
      isSuperAdmin ||
      hasPermission(callerProfile, ACTION_KEYS.RECORD_INFLOW, email) ||
      hasPermission(callerProfile, ACTION_KEYS.RECORD_OUTFLOW, email) ||
      hasPermission(callerProfile, ACTION_KEYS.RECORD_ABONO, email);

    // Patch 3 (Manuscript Page 8): Full transaction editing—including revising FLAGGED transactions—
    // strictly requires edit_transaction (canEdit: President, Vice President, or Adviser-granted override).
    // Post-entry receipt photo attachment (receipt_urls only, without altering ledger fields) remains allowed for recorders.
    const isReceiptOnlyUpdate =
      Array.isArray(receipt_urls) &&
      title === undefined &&
      description === undefined &&
      amount === undefined &&
      type === undefined &&
      category_id === undefined &&
      semester_id === undefined &&
      transaction_date === undefined &&
      is_reimbursement === undefined &&
      reimbursement_recipient === undefined &&
      advanced_by_name === undefined &&
      event_name === undefined &&
      (canRecord || existingTx.logged_by === callerProfile?.id);

    if (!canEdit && !isReceiptOnlyUpdate) {
      return NextResponse.json(
        {
          error:
            'Forbidden: Editing is locked for your role. Only the President, Vice President, or an officer explicitly granted edit permission by the Club Adviser can edit or revise transactions.',
        },
        { status: 403 }
      );
    }

    const updates = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined && typeof title === 'string') updates.title = title.trim();
    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (amount !== undefined) {
      const parsedAmt = parseFloat(amount);
      if (isNaN(parsedAmt) || parsedAmt <= 0) {
        return NextResponse.json({ error: 'Valid positive amount required.' }, { status: 400 });
      }
      updates.amount = parsedAmt;
    }
    if (type !== undefined) updates.type = type === 'INFLOW' ? 'INFLOW' : 'OUTFLOW';
    if (category_id !== undefined) updates.category_id = category_id;
    if (semester_id !== undefined) updates.semester_id = semester_id;
    if (transaction_date !== undefined) updates.transaction_date = transaction_date;
    if (is_reimbursement !== undefined) updates.is_reimbursement = Boolean(is_reimbursement);
    if (reimbursement_recipient !== undefined) updates.reimbursement_recipient = reimbursement_recipient ? reimbursement_recipient.trim() : null;
    if (advanced_by_name !== undefined) updates.advanced_by_name = advanced_by_name ? advanced_by_name.trim() : null;
    if (event_name !== undefined) updates.event_name = event_name ? event_name.trim() : null;

    // Revision loop: If existing transaction was FLAGGED, editing it resets status to PENDING_AUDIT!
    const wasFlagged = existingTx.status === 'FLAGGED';
    if (wasFlagged) {
      updates.status = 'PENDING_AUDIT';
    }

    // CASHBOX SOLVENCY GUARD (Patch 7): When editing an OUTFLOW (or changing an INFLOW to an OUTFLOW),
    // verify that the new outflow amount does not exceed available physical cash on hand.
    const nextType = updates.type !== undefined ? updates.type : existingTx.type;
    const nextAmount = updates.amount !== undefined ? updates.amount : Number(existingTx.amount || 0);
    const nextIsReimbursement =
      updates.is_reimbursement !== undefined ? updates.is_reimbursement : Boolean(existingTx.is_reimbursement);
    const nextSemesterId = updates.semester_id !== undefined ? updates.semester_id : existingTx.semester_id;

    if (nextType === 'OUTFLOW' && !nextIsReimbursement && nextSemesterId) {
      let availableCash = null;
      try {
        const { data: rpcCash, error: rpcErr } = await db.rpc('get_available_cash_on_hand', {
          p_semester_id: nextSemesterId,
        });
        if (!rpcErr && rpcCash !== null && rpcCash !== undefined) {
          availableCash = Number(rpcCash);
        }
      } catch (_) {}

      if (availableCash === null) {
        const { data: txs } = await db
          .from('transactions')
          .select('id, amount, type')
          .eq('semester_id', nextSemesterId)
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

      if (availableCash !== null) {
        // Adjust availableCash for existingTx's prior contribution if it was already COMPLETED in the same semester
        if (existingTx.semester_id === nextSemesterId && existingTx.status === 'COMPLETED') {
          const prevAmt = Number(existingTx.amount || 0);
          if (existingTx.type === 'OUTFLOW') {
            availableCash += prevAmt;
          } else if (existingTx.type === 'INFLOW') {
            availableCash -= prevAmt;
          }
        }

        if (nextAmount > availableCash) {
          return NextResponse.json(
            {
              error: `Insufficient physical cashbox balance. Available: ₱${availableCash.toLocaleString('en-PH', { minimumFractionDigits: 2 })}, Requested: ₱${nextAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}. Cash outflows cannot exceed cash on hand.`,
            },
            { status: 400 }
          );
        }
      }
    }

    const { data: updatedTx, error: updateErr } = await db
      .from('transactions')
      .update(updates)
      .eq('id', transactionId)
      .select(`
        *,
        categories (id, name, type),
        semesters (id, academic_year, semester, label),
        transaction_receipts (id, public_url, sort_order),
        profiles:logged_by (id, full_name, role, email, avatar_url)
      `)
      .single();

    if (updateErr) {
      console.error('Update transaction error:', updateErr);
      return NextResponse.json({ error: updateErr.message || 'Failed to update transaction.' }, { status: 500 });
    }

    // Update receipts if provided
    if (Array.isArray(receipt_urls)) {
      try {
        await db.from('transaction_receipts').delete().eq('transaction_id', transactionId);
        const validReceiptUrls = receipt_urls.filter(
          (url) => typeof url === 'string' && !url.startsWith('blob:') && url.trim().length > 0
        );
        if (validReceiptUrls.length > 0) {
          const receiptRows = validReceiptUrls.map((url, idx) => ({
            transaction_id: transactionId,
            public_url: url.trim(),
            sort_order: idx,
            uploaded_by: callerProfile?.id || null,
          }));
          await db.from('transaction_receipts').insert(receiptRows);
        }
      } catch (rErr) {
        console.warn('Receipt update notice:', rErr?.message);
      }
    }

    // Telemetry log
    const clientIp = getClientIp(req);
    try {
      await db.from('audit_logs').insert([{
        action: wasFlagged ? 'TRANSACTION_REVISED' : 'TRANSACTION_UPDATED',
        entity_type: 'transactions',
        entity_id: transactionId,
        user_id: callerProfile?.id || user.id,
        details: {
          title: updatedTx.title,
          amount: updatedTx.amount,
          previous_status: existingTx.status,
          new_status: updatedTx.status,
          was_flagged: wasFlagged,
          editor_email: email,
          ip_address: clientIp,
        },
      }]);
    } catch (auditErr) {
      console.warn('Transaction update audit warning:', auditErr?.message);
    }

    // If transaction was previously FLAGGED and is now resubmitted, notify all officers with audit permission
    if (wasFlagged) {
      try {
        let { data: auditors, error: audErr } = await db
          .from('profiles')
          .select('id, email, permissions, role, status')
          .eq('status', 'approved');

        if (audErr && (audErr.code === '42703' || audErr.message?.includes('permissions'))) {
          const fallback = await db
            .from('profiles')
            .select('id, email, role, status')
            .eq('status', 'approved');
          auditors = fallback.data;
        }

        const auditorEmails = (auditors || [])
          .filter((a) => {
            if (!a.email) return false;
            return hasPermission(a, ACTION_KEYS.AUDIT_APPROVE, a.email);
          })
          .map((a) => a.email.trim().toLowerCase());

        const uniqueAuditors = Array.from(new Set(auditorEmails));

        if (uniqueAuditors.length > 0) {
          sendRevisionSubmittedEmail({
            transaction: updatedTx,
            editorName: callerProfile?.full_name || 'Officer',
            editorEmail: email,
            recipients: uniqueAuditors,
          }).catch((mErr) => console.warn('Revision submitted mail warning:', mErr));
        }
      } catch (mailScanErr) {
        console.warn('Scan for auditors warning:', mailScanErr?.message);
      }
    }

    return NextResponse.json({
      success: true,
      transaction: updatedTx,
      message: wasFlagged
        ? 'Transaction revised and resubmitted to Auditor for re-verification.'
        : 'Transaction details updated successfully.',
    });
  } catch (err) {
    console.error('API /api/transactions/[id] PATCH error:', err);
    return NextResponse.json({ error: 'Server error updating transaction.' }, { status: 500 });
  }
}

// DELETE /api/transactions/[id] — Delete or void transaction
export async function DELETE(req, { params }) {
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

    const canDelete = isSuperAdmin || hasPermission(callerProfile, ACTION_KEYS.DELETE_TRANSACTION, email);
    if (!canDelete) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to delete or void transactions.' },
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

    // Extract void reason from JSON payload or query params
    let voidReason = null;
    try {
      const body = await req.json().catch(() => ({}));
      voidReason = body?.reason?.trim() || null;
    } catch (_) {}
    if (!voidReason) {
      const { searchParams } = new URL(req.url);
      voidReason = searchParams.get('reason')?.trim() || 'Voided by Administrator';
    }

    const nowIso = new Date().toISOString();
    let voidedTx = null;
    let voidErr = null;

    // 1. Soft-Delete / Void: Mark status as VOIDED with archival metadata
    const voidPayload = {
      status: 'VOIDED',
      void_reason: voidReason,
      archived_at: nowIso,
      archived_by: callerProfile?.id || null,
    };

    const res = await db
      .from('transactions')
      .update(voidPayload)
      .eq('id', transactionId)
      .select(`
        *,
        categories (id, name, type),
        semesters (id, academic_year, semester, label),
        transaction_receipts (id, public_url, sort_order),
        profiles:logged_by (id, full_name, role, email, avatar_url)
      `)
      .single();

    voidedTx = res.data;
    voidErr = res.error;

    // Graceful fallback 1: if void_reason or archived_at columns are not yet present in schema
    if (voidErr && (voidErr.code === '42703' || voidErr.code === 'PGRST204' || voidErr.message?.includes('void_reason') || voidErr.message?.includes('archived_at') || voidErr.message?.includes('schema cache'))) {
      const fallbackPayload = {
        status: 'VOIDED',
        notes: existingTx.notes
          ? `${existingTx.notes} | [ARCHIVED] | REASON: ${voidReason} | ARCHIVED_AT: ${nowIso}`
          : `[ARCHIVED] | REASON: ${voidReason} | ARCHIVED_AT: ${nowIso}`,
      };
      const fallbackRes = await db
        .from('transactions')
        .update(fallbackPayload)
        .eq('id', transactionId)
        .select(`
          *,
          categories (id, name, type),
          semesters (id, academic_year, semester, label),
          transaction_receipts (id, public_url, sort_order),
          profiles:logged_by (id, full_name, role, email, avatar_url)
        `)
        .single();
      voidedTx = fallbackRes.data;
      voidErr = fallbackRes.error;
    }

    // Graceful fallback 2: if transaction_status enum does not yet contain 'VOIDED' (code 22P02)
    if (voidErr && (voidErr.code === '22P02' || voidErr.message?.includes('enum') || voidErr.message?.includes('VOIDED'))) {
      const notesPayload = {
        notes: existingTx.notes
          ? `${existingTx.notes} | [ARCHIVED] | REASON: ${voidReason} | ARCHIVED_AT: ${nowIso}`
          : `[ARCHIVED] | REASON: ${voidReason} | ARCHIVED_AT: ${nowIso}`,
      };
      const notesRes = await db
        .from('transactions')
        .update(notesPayload)
        .eq('id', transactionId)
        .select(`
          *,
          categories (id, name, type),
          semesters (id, academic_year, semester, label),
          transaction_receipts (id, public_url, sort_order),
          profiles:logged_by (id, full_name, role, email, avatar_url)
        `)
        .single();
      if (!notesRes.error) {
        voidedTx = {
          ...notesRes.data,
          status: 'VOIDED',
          void_reason: voidReason,
          archived_at: nowIso,
          archived_by: callerProfile?.id || null,
        };
        voidErr = null;
      } else {
        voidErr = notesRes.error;
      }
    }

    if (voidErr) {
      console.error('Void transaction error:', voidErr);
      return NextResponse.json({ error: voidErr.message || 'Failed to void transaction.' }, { status: 500 });
    }

    const clientIp = getClientIp(req);
    try {
      const auditPayload = {
        action: 'TRANSACTION_VOIDED',
        entity_type: 'transactions',
        entity_id: transactionId,
        user_id: callerProfile?.id || null,
        details: {
          title: existingTx.title,
          amount: existingTx.amount,
          type: existingTx.type,
          previous_status: existingTx.status,
          void_reason: voidReason,
          voided_by: email,
          ip_address: clientIp,
        },
      };
      const { error: insErr } = await db.from('audit_logs').insert([auditPayload]);
      if (insErr && insErr.code === '23503') {
        await db.from('audit_logs').insert([{ ...auditPayload, user_id: null }]);
      }
    } catch (auditErr) {
      console.warn('Void audit log warning:', auditErr?.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Transaction successfully voided and archived from the active ledger.',
      transaction: voidedTx || { ...existingTx, status: 'VOIDED', void_reason: voidReason },
    });
  } catch (err) {
    console.error('API /api/transactions/[id] DELETE error:', err);
    return NextResponse.json({ error: 'Server error deleting transaction.' }, { status: 500 });
  }
}
