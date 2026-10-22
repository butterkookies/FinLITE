import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/config/admin';
import { sendReconciliationNotificationEmail, getActiveOfficerEmails } from '@/lib/email/mailer';

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
    const { data: callerProfile } = await db
      .from('profiles')
      .select('id, auth_user_id, email, full_name, role, status')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    const isSuperAdmin = isSuperAdminEmail(user.email);
    if (!isSuperAdmin && (!callerProfile || callerProfile.status !== 'approved')) {
      return NextResponse.json({ error: 'Forbidden: only approved officers can trigger notifications.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      action = 'CASHBOX_COUNTED', // 'CASHBOX_COUNTED' | 'VARIANCE_SUBMITTED' | 'VARIANCE_DECISION'
      physicalTotal = 0,
      ledgerCashBalance = 0,
      varianceAmount = 0,
      varianceStatus,
      approvalStatus,
      notes,
      adviserName,
      adviserRole,
      adviserDecision,
      adviserNotes,
    } = body;

    const officerEmails = await getActiveOfficerEmails(db);
    if (officerEmails.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: 'No other active officers found.' });
    }

    const countedByName = callerProfile?.full_name || user.email?.split('@')[0] || 'Officer';
    const countedByRole = callerProfile?.role ? callerProfile.role.toUpperCase() : 'OFFICER';
    const countedByEmail = user.email;

    const numVariance = Number(varianceAmount) || 0;
    const resolvedVarianceStatus = varianceStatus || (numVariance === 0 ? 'BALANCED' : (numVariance < 0 ? 'SHORTAGE' : 'OVERAGE'));
    const resolvedApprovalStatus = approvalStatus || (numVariance === 0 ? 'BALANCED' : 'PENDING_APPROVAL');

    await sendReconciliationNotificationEmail({
      action,
      physicalTotal: Number(physicalTotal) || 0,
      ledgerCashBalance: Number(ledgerCashBalance) || 0,
      varianceAmount: numVariance,
      varianceStatus: resolvedVarianceStatus,
      approvalStatus: resolvedApprovalStatus,
      notes,
      countedByName,
      countedByRole,
      countedByEmail,
      adviserName,
      adviserRole,
      adviserDecision,
      adviserNotes,
      recipients: officerEmails,
    });

    return NextResponse.json({
      success: true,
      recipientCount: officerEmails.length,
      message: `Cash box audit notification broadcast to ${officerEmails.length} active officer(s).`,
    });
  } catch (err) {
    console.error('Cash box reconciliation notification error:', err);
    return NextResponse.json({ error: 'Server error triggering reconciliation notification.' }, { status: 500 });
  }
}
