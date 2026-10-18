import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendTransactionNotificationEmail } from '@/lib/email/mailer';

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      authorId,
      authorEmail,
      authorName,
      actionType = 'Transaction Logged',
      amount = 0,
      title = 'Financial Entry',
      category = null,
      eventName = null,
      reimbursementRecipient = null,
      date = null,
    } = body;

    const adminClient = createAdminClient();
    const supabase = adminClient || (await createClient());

    // Fetch all active approved officers from profiles
    const { data: officers, error } = await supabase
      .from('profiles')
      .select('id, auth_user_id, email, status')
      .eq('status', 'approved');

    let officerList = officers || [];

    // Fallback if RLS limited profiles query
    if (officerList.length === 0) {
      const { data: reqOfficers } = await supabase
        .from('registration_requests')
        .select('id, email, status')
        .eq('status', 'approved');
      if (reqOfficers && reqOfficers.length > 0) {
        officerList = reqOfficers;
      }
    }

    if (officerList.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: 'No other active officers found.' });
    }

    const cleanAuthorEmail = authorEmail ? authorEmail.trim().toLowerCase() : '';

    // Filter: all active officers EXCEPT the author who performed the action
    const recipients = officerList

      .filter((u) => {
        if (!u.email) return false;
        const uEmail = u.email.trim().toLowerCase();
        if (cleanAuthorEmail && uEmail === cleanAuthorEmail) return false;
        if (authorId && (u.id === authorId || u.auth_user_id === authorId)) return false;
        return true;
      })
      .map((u) => u.email.trim().toLowerCase());

    const uniqueRecipients = Array.from(new Set(recipients));

    if (uniqueRecipients.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: 'No other recipients to notify.' });
    }

    // Dispatch notification via Gmail SMTP in background
    sendTransactionNotificationEmail({
      authorName: authorName || cleanAuthorEmail.split('@')[0] || 'Officer',
      authorEmail: cleanAuthorEmail || 'System',
      actionType,
      amount: Number(amount) || 0,
      title,
      category,
      eventName,
      reimbursementRecipient,
      date: date || new Date().toISOString().split('T')[0],
      recipients: uniqueRecipients,
    }).catch((mailErr) => console.warn('[Transaction Notification] Email dispatch error:', mailErr));

    return NextResponse.json({
      success: true,
      count: uniqueRecipients.length,
      message: `Notification queued for ${uniqueRecipients.length} officer(s).`,
    });
  } catch (err) {
    console.error('Transaction notification route error:', err);
    return NextResponse.json({ error: 'Server error triggering transaction notification.' }, { status: 500 });
  }
}
