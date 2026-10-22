import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/config/admin';
import { sendDebtNotificationEmail, getActiveOfficerEmails } from '@/lib/email/mailer';

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
      action = 'DEBT_CREATED', // 'DEBT_CREATED' | 'DEBT_PAYMENT_COLLECTED'
      debtorName,
      debtorContact,
      title,
      totalAmount,
      collectedAmount,
      amountPaidSoFar,
      remainingBalance,
      isFull = false,
      dueDate,
      notes,
    } = body;

    if (!debtorName || !title) {
      return NextResponse.json({ error: 'Debtor name and title are required.' }, { status: 400 });
    }

    const officerEmails = await getActiveOfficerEmails(db);
    if (officerEmails.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: 'No other active officers found.' });
    }

    const loggedByName = callerProfile?.full_name || user.email?.split('@')[0] || 'Officer';
    const loggedByRole = callerProfile?.role ? callerProfile.role.toUpperCase() : 'OFFICER';

    await sendDebtNotificationEmail({
      action,
      debtorName,
      debtorContact,
      title,
      totalAmount: Number(totalAmount) || 0,
      collectedAmount: collectedAmount !== null && collectedAmount !== undefined ? Number(collectedAmount) : null,
      amountPaidSoFar: amountPaidSoFar !== null && amountPaidSoFar !== undefined ? Number(amountPaidSoFar) : null,
      remainingBalance: remainingBalance !== null && remainingBalance !== undefined ? Number(remainingBalance) : null,
      isFull: Boolean(isFull),
      dueDate,
      notes,
      loggedByName,
      loggedByRole,
      recipients: officerEmails,
    });

    return NextResponse.json({
      success: true,
      recipientCount: officerEmails.length,
      message: `Debt notification broadcast to ${officerEmails.length} active officer(s).`,
    });
  } catch (err) {
    console.error('Debt notification error:', err);
    return NextResponse.json({ error: 'Server error triggering debt notification.' }, { status: 500 });
  }
}
