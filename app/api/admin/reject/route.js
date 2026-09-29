import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/admin-check';

// POST /api/admin/reject
export async function POST(req) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { requestId, reason } = await req.json();

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required.' }, { status: 400 });
    }

    const supabase = auth.supabase;
    const now = new Date().toISOString();
    const rejectionReason = reason?.trim() || 'Registration declined by Administrator.';

    // 1. Fetch request to find email
    const { data: request, error: fetchErr } = await supabase
      .from('registration_requests')
      .select('id, email, first_name, last_name')
      .eq('id', requestId)
      .single();

    if (fetchErr || !request) {
      return NextResponse.json({ error: 'Registration request not found.' }, { status: 404 });
    }

    // 2. Update registration_requests
    const { error: updateErr } = await supabase
      .from('registration_requests')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        reviewed_at: now,
        reviewed_by: auth.profile?.id || null,
      })
      .eq('id', requestId);

    if (updateErr) {
      console.error('Failed to update rejection in registration_requests:', updateErr);
      return NextResponse.json({ error: 'Failed to record rejection.' }, { status: 500 });
    }

    // 3. If profile exists, set status to rejected
    await supabase
      .from('profiles')
      .update({ status: 'rejected' })
      .eq('email', request.email);

    return NextResponse.json({
      success: true,
      message: `Registration request for ${request.first_name} ${request.last_name} was rejected.`,
    });
  } catch (err) {
    console.error('Reject API error:', err);
    return NextResponse.json({ error: 'Server error processing rejection.' }, { status: 500 });
  }
}
