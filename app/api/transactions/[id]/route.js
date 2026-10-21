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
        profiles (id, full_name, role, email, avatar_url)
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

    const canEdit = isSuperAdmin || hasPermission(callerProfile, ACTION_KEYS.EDIT_TRANSACTION, email);
    if (!canEdit) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to edit transactions.' },
        { status: 403 }
      );
    }

    // Fetch existing transaction
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

    const { data: updatedTx, error: updateErr } = await db
      .from('transactions')
      .update(updates)
      .eq('id', transactionId)
      .select(`
        *,
        categories (id, name, type),
        semesters (id, academic_year, semester, label),
        transaction_receipts (id, public_url, sort_order),
        profiles (id, full_name, role, email, avatar_url)
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
        if (receipt_urls.length > 0) {
          const receiptRows = receipt_urls.map((url, idx) => ({
            transaction_id: transactionId,
            public_url: url,
            file_url: url,
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
      .select('id, title, amount')
      .eq('id', transactionId)
      .maybeSingle();

    if (!existingTx) {
      return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 });
    }

    const { error: delErr } = await db
      .from('transactions')
      .delete()
      .eq('id', transactionId);

    if (delErr) {
      console.error('Delete transaction error:', delErr);
      return NextResponse.json({ error: 'Failed to delete transaction.' }, { status: 500 });
    }

    const clientIp = getClientIp(req);
    try {
      await db.from('audit_logs').insert([{
        action: 'TRANSACTION_DELETED',
        entity_type: 'transactions',
        entity_id: transactionId,
        user_id: callerProfile?.id || user.id,
        details: {
          title: existingTx.title,
          amount: existingTx.amount,
          deleted_by: email,
          ip_address: clientIp,
        },
      }]);
    } catch (auditErr) {
      console.warn('Delete audit log warning:', auditErr?.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Transaction successfully removed from the ledger.',
    });
  } catch (err) {
    console.error('API /api/transactions/[id] DELETE error:', err);
    return NextResponse.json({ error: 'Server error deleting transaction.' }, { status: 500 });
  }
}
