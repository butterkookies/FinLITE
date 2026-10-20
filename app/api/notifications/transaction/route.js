import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/config/admin';
import { sendTransactionNotificationEmail, sendAuditRequestEmail } from '@/lib/email/mailer';
import { hasPermission, ACTION_KEYS } from '@/lib/auth/permissions';

export async function POST(req) {
  try {
    const userClient = await createClient();
    if (!userClient) {
      return NextResponse.json({ error: 'Database service unavailable.' }, { status: 503 });
    }

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: valid officer session required.' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const db = adminClient || userClient;

    // Verify requesting user is an active approved officer
    let callerProfile = null;
    const { data: profileByAuth } = await db
      .from('profiles')
      .select('id, auth_user_id, email, full_name, first_name, last_name, role, status')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    callerProfile = profileByAuth;

    if (!callerProfile && user.email) {
      const { data: profileByEmail } = await db
        .from('profiles')
        .select('id, auth_user_id, email, full_name, first_name, last_name, role, status')
        .eq('email', user.email.trim().toLowerCase())
        .maybeSingle();

      if (profileByEmail) {
        callerProfile = profileByEmail;
      }
    }

    const isSuperAdmin = isSuperAdminEmail(user.email);
    if (!isSuperAdmin && (!callerProfile || callerProfile.status !== 'approved')) {
      return NextResponse.json({ error: 'Forbidden: only approved officers can trigger notifications.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      transactionId,
      authorId,
      authorEmail,
      authorName,
      actionType = 'Transaction Logged',
      amount = 0,
      title = 'Financial Entry',
      category = null,
      eventName = null,
      reimbursementRecipient = null,
      receiptUrl = null,
      date = null,
    } = body;

    const effectiveAuthorEmail = (callerProfile?.email || user.email || authorEmail || '').trim().toLowerCase();
    const profileFullName = callerProfile?.full_name?.trim() || `${callerProfile?.first_name || ''} ${callerProfile?.last_name || ''}`.trim();
    const effectiveAuthorName = profileFullName || authorName || effectiveAuthorEmail.split('@')[0] || 'Officer';
    const effectiveAuthorId = callerProfile?.id || authorId || user.id;

    // Fetch all active approved officers with their permissions and role
    const { data: officers, error } = await db
      .from('profiles')
      .select('id, auth_user_id, email, status, role, permissions')
      .eq('status', 'approved');

    let officerList = officers || [];

    // Fallback if RLS limited profiles query
    if (officerList.length === 0) {
      const { data: reqOfficers } = await db
        .from('registration_requests')
        .select('id, email, status, role, permissions')
        .eq('status', 'approved');
      if (reqOfficers && reqOfficers.length > 0) {
        officerList = reqOfficers;
      }
    }

    if (officerList.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: 'No other active officers found.' });
    }

    // Filter out author
    const otherOfficers = officerList.filter((u) => {
      if (!u.email) return false;
      const uEmail = u.email.trim().toLowerCase();
      if (effectiveAuthorEmail && uEmail === effectiveAuthorEmail) return false;
      if (effectiveAuthorId && (u.id === effectiveAuthorId || u.auth_user_id === effectiveAuthorId)) return false;
      return true;
    });

    // 1. Separate auditors (officers with audit_approve capability)
    const auditorRecipients = otherOfficers
      .filter((u) => hasPermission(u, ACTION_KEYS.AUDIT_APPROVE, u.email))
      .map((u) => u.email.trim().toLowerCase());

    const uniqueAuditors = Array.from(new Set(auditorRecipients));

    // 2. All other officers for standard ledger broadcast
    const generalRecipients = otherOfficers
      .filter((u) => !uniqueAuditors.includes(u.email.trim().toLowerCase()))
      .map((u) => u.email.trim().toLowerCase());

    const uniqueGeneral = Array.from(new Set(generalRecipients));

    // Dispatch institutional audit request email to Auditors
    if (uniqueAuditors.length > 0 && transactionId) {
      sendAuditRequestEmail({
        transaction: {
          id: transactionId,
          title,
          amount: Number(amount) || 0,
          type: actionType.includes('INFLOW') ? 'INFLOW' : 'OUTFLOW',
          category_name: category,
          event_name: eventName,
          reimbursement_recipient: reimbursementRecipient,
          is_reimbursement: Boolean(reimbursementRecipient),
          receipt_url: receiptUrl,
          transaction_date: date || new Date().toISOString().split('T')[0],
        },
        authorName: effectiveAuthorName,
        authorEmail: effectiveAuthorEmail,
        authorRole: callerProfile?.role || 'Officer',
        recipients: uniqueAuditors,
      }).catch((mailErr) => console.warn('[Audit Request Mailer] Email dispatch error:', mailErr));
    }

    // Dispatch standard notification to other officers
    if (uniqueGeneral.length > 0) {
      sendTransactionNotificationEmail({
        authorName: effectiveAuthorName,
        authorEmail: effectiveAuthorEmail || 'System',
        actionType,
        amount: Number(amount) || 0,
        title,
        category,
        eventName,
        reimbursementRecipient,
        date: date || new Date().toISOString().split('T')[0],
        recipients: uniqueGeneral,
      }).catch((mailErr) => console.warn('[General Ledger Mailer] Email dispatch error:', mailErr));
    }

    return NextResponse.json({
      success: true,
      auditorCount: uniqueAuditors.length,
      generalCount: uniqueGeneral.length,
      message: `Audit notification dispatched to ${uniqueAuditors.length} auditor(s) and broadcast to ${uniqueGeneral.length} officer(s).`,
    });
  } catch (err) {
    console.error('Transaction notification route error:', err);
    return NextResponse.json({ error: 'Server error triggering transaction notification.' }, { status: 500 });
  }
}
