import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/config/admin';
import { hasPermission, fetchProfileWithPermissions, ACTION_KEYS } from '@/lib/auth/permissions';
import { sendAuditDecisionEmail, sendTransactionNotificationEmail, getActiveOfficerEmails } from '@/lib/email/mailer';
import { getClientIp } from '@/lib/security/ratelimit';

// POST /api/transactions/[id]/audit — Auditor Approve or Flag transaction
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

    // Fetch caller profile and permissions
    const email = user.email?.toLowerCase();
    const isSuperAdmin = isSuperAdminEmail(email);

    const callerProfile = await fetchProfileWithPermissions(db, { userId: user.id, email });

    const canAudit = isSuperAdmin || hasPermission(callerProfile, ACTION_KEYS.AUDIT_APPROVE, email);
    if (!canAudit) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to audit or verify transactions.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { action, comment, ccEmails = [] } = body;

    const normalizedAction = String(action || '').toUpperCase();
    if (normalizedAction !== 'APPROVE' && normalizedAction !== 'FLAG') {
      return NextResponse.json(
        { error: 'Invalid action. Must be either "APPROVE" or "FLAG".' },
        { status: 400 }
      );
    }

    if (normalizedAction === 'FLAG' && (!comment || !comment.trim())) {
      return NextResponse.json(
        { error: 'A remark or reason is required when flagging a transaction for revision.' },
        { status: 400 }
      );
    }

    // Fetch existing transaction
    const { data: tx, error: txError } = await db
      .from('transactions')
      .select(`
        *,
        categories (id, name, type),
        profiles (id, full_name, first_name, last_name, role, email),
        transaction_receipts (id, public_url, sort_order)
      `)
      .eq('id', transactionId)
      .maybeSingle();

    if (txError || !tx) {
      return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 });
    }

    // Determine target status
    let newStatus;
    if (normalizedAction === 'APPROVE') {
      newStatus = tx.is_reimbursement ? 'PENDING_REIMBURSEMENT' : 'COMPLETED';
    } else {
      newStatus = 'FLAGGED';
    }

    // Update transaction status
    const { data: updatedTx, error: updateErr } = await db
      .from('transactions')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId)
      .select(`
        *,
        categories (id, name, type),
        profiles (id, full_name, first_name, last_name, role, email),
        transaction_receipts (id, public_url, sort_order)
      `)
      .single();

    if (updateErr) {
      console.error('Failed to update transaction status:', updateErr);
      return NextResponse.json({ error: 'Failed to update transaction status.' }, { status: 500 });
    }

    // Insert comment if provided
    let createdComment = null;
    if (comment && comment.trim()) {
      const trimmedComment = comment.trim();
      const { data: commentRow, error: commentErr } = await db
        .from('transaction_comments')
        .insert([{
          transaction_id: transactionId,
          user_id: callerProfile?.id || null,
          comment: trimmedComment,
        }])
        .select()
        .single();

      if (commentErr) {
        console.warn('Audit comment insert notice:', commentErr.message);
      } else {
        createdComment = commentRow;
      }
    }

    // Telemetry: Log governance / financial audit trail
    const clientIp = getClientIp(req);
    try {
      await db.from('audit_logs').insert([{
        action: normalizedAction === 'APPROVE' ? 'TRANSACTION_AUDITED' : 'TRANSACTION_FLAGGED',
        entity_type: 'transactions',
        entity_id: transactionId,
        user_id: callerProfile?.id || user.id,
        details: {
          transaction_title: tx.title,
          amount: tx.amount,
          previous_status: tx.status,
          new_status: newStatus,
          action: normalizedAction,
          comment: comment?.trim() || null,
          auditor_email: email,
          ip_address: clientIp,
        },
      }]);
    } catch (auditLogErr) {
      console.warn('Audit log telemetry warning:', auditLogErr?.message);
    }

    // Resolve author email & details for email dispatch
    const authorEmail = tx.profiles?.email || null;
    const authorName = tx.profiles?.full_name || 'Officer';
    const auditorName = callerProfile?.full_name || email.split('@')[0] || 'Auditor';

    // Resolve dynamic reviewer title based on role and superadmin status
    let reviewerTitle = 'Auditor';
    if (isSuperAdmin) {
      reviewerTitle = 'Super Administrator';
    } else if (callerProfile?.role === 'admin') {
      reviewerTitle = 'Administrator';
    } else if (callerProfile?.role === 'president') {
      reviewerTitle = 'President';
    } else if (callerProfile?.role === 'treasurer') {
      reviewerTitle = 'Treasurer';
    } else if (callerProfile?.role === 'adviser') {
      reviewerTitle = 'Club Adviser';
    }

    if (authorEmail) {
      sendAuditDecisionEmail({
        transaction: updatedTx || tx,
        decision: normalizedAction,
        auditorName,
        auditorEmail: email,
        reviewerTitle,
        comment: comment?.trim() || null,
        authorEmail,
        authorName,
        ccEmails,
      }).catch((mailErr) => console.warn('[Audit Email] Dispatch warning:', mailErr));
    }

    // When transaction is approved & confirmed by Admin/Auditor, broadcast to ALL active approved officers
    if (normalizedAction === 'APPROVE') {
      try {
        const officerEmails = await getActiveOfficerEmails(db);
        if (officerEmails.length > 0) {
          const targetTx = updatedTx || tx;
          const txAmount = typeof targetTx.amount === 'number' ? targetTx.amount : parseFloat(targetTx.amount || 0);
          sendTransactionNotificationEmail({
            authorName,
            authorEmail: authorEmail || 'Officer',
            authorRole: targetTx.profiles?.role || 'Officer',
            actionType: targetTx.type === 'INFLOW' ? 'Inflow (Income)' : 'Outflow (Disbursement)',
            type: targetTx.type,
            amount: txAmount,
            title: targetTx.title,
            category: targetTx.category_name || targetTx.categories?.name || null,
            eventName: targetTx.event_name || null,
            reimbursementRecipient: targetTx.reimbursement_recipient || null,
            receiptUrl: targetTx.receipt_url || (targetTx.transaction_receipts && targetTx.transaction_receipts[0]?.public_url) || null,
            receiptUrls: Array.isArray(targetTx.receipt_urls) ? targetTx.receipt_urls : [],
            verifiedBy: `${auditorName} (${reviewerTitle})`,
            date: targetTx.transaction_date,
            recipients: officerEmails,
          }).catch((mailErr) => console.warn('[Confirmed Ledger Mailer] Dispatch error:', mailErr));
        }
      } catch (officerErr) {
        console.warn('[Audit Approval Broadcast] Error fetching officers:', officerErr?.message);
      }
    }

    return NextResponse.json({
      success: true,
      transaction: updatedTx || tx,
      status: newStatus,
      comment: createdComment,
      message: normalizedAction === 'APPROVE'
        ? 'Transaction successfully approved and audited.'
        : 'Transaction flagged for revision. Author has been notified via email.',
    });
  } catch (err) {
    console.error('Audit transaction API error:', err);
    return NextResponse.json({ error: 'Server error processing audit action.' }, { status: 500 });
  }
}
