import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/admin-check';
import { createAdminClient } from '@/lib/supabase/server';
import { sendAccountStatusChangedEmail } from '@/lib/email/mailer';
import { getClientIp } from '@/lib/security/ratelimit';

// POST /api/admin/reset-request — Resets a declined registration request so the applicant can resubmit
export async function POST(req) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { requestId } = await req.json().catch(() => ({}));

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required.' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const db = adminClient || auth.supabase;

    // 1. Fetch request details
    const { data: request, error: fetchErr } = await db
      .from('registration_requests')
      .select('id, email, first_name, last_name, status, auth_provider, google_id')
      .eq('id', requestId)
      .single();

    if (fetchErr || !request) {
      return NextResponse.json({ error: 'Registration request not found.' }, { status: 404 });
    }

    const targetEmail = (request.email || '').trim().toLowerCase();

    // 2. Remove the registration request so they can submit a fresh request
    const { error: delErr } = await db
      .from('registration_requests')
      .delete()
      .eq('id', requestId);

    if (delErr) {
      console.error('Failed to delete registration request:', delErr);
      return NextResponse.json({ error: 'Failed to reset registration request.' }, { status: 500 });
    }

    // Also clean up any lingering duplicate request records for this email
    if (targetEmail) {
      try {
        await db.from('registration_requests').delete().eq('email', targetEmail);
      } catch (_) {}
    }

    // 3. If there is a rejected profile in `profiles`, clean it up so it does not block re-registration
    let targetProfile = null;
    if (targetEmail) {
      try {
        const { data: prof } = await db
          .from('profiles')
          .select('id, auth_user_id, status')
          .eq('email', targetEmail)
          .maybeSingle();

        targetProfile = prof;
        if (prof && prof.status === 'rejected') {
          await db.from('profiles').delete().eq('id', prof.id);
        }
      } catch (profErr) {
        console.warn('Profile cleanup notice during request reset:', profErr?.message);
      }
    }

    // 4. If an auth user exists (e.g. unverified/rejected auth account), clean it up so createUser won't fail
    if (adminClient && targetEmail) {
      try {
        if (targetProfile?.auth_user_id) {
          await adminClient.auth.admin.deleteUser(targetProfile.auth_user_id);
        } else {
          const { data: userList } = await adminClient.auth.admin.listUsers();
          const authUser = userList?.users?.find((u) => u.email?.toLowerCase() === targetEmail);
          if (authUser) {
            await adminClient.auth.admin.deleteUser(authUser.id);
          }
        }
      } catch (authDeleteErr) {
        console.warn('Auth user cleanup notice during request reset:', authDeleteErr?.message);
      }
    }

    // 5. Audit log telemetry
    try {
      const clientIp = getClientIp(req);
      await db.from('audit_logs').insert([{
        user_id: auth.profile?.id || auth.user.id,
        action: 'REGISTRATION_RESET',
        entity_type: 'registration_requests',
        entity_id: requestId,
        details: {
          applicant_email: targetEmail,
          applicant_name: `${request.first_name || ''} ${request.last_name || ''}`.trim(),
          previous_status: request.status,
          reset_by: auth.user.email,
          ip_address: clientIp,
        },
      }]);
    } catch (auditErr) {
      console.warn('Audit log error for registration reset:', auditErr?.message);
    }

    // 6. Notify applicant via email so they know they are eligible to resubmit
    if (targetEmail) {
      sendAccountStatusChangedEmail({
        to: targetEmail,
        name: `${request.first_name || ''} ${request.last_name || ''}`.trim() || 'Applicant',
        changeType: 'RESET',
      }).catch((emailErr) => console.warn('Reset email notification notice:', emailErr?.message));
    }

    return NextResponse.json({
      success: true,
      message: `Registration request for ${request.first_name} ${request.last_name} (${targetEmail}) has been reset. They may now submit a new registration.`,
    });
  } catch (err) {
    console.error('Reset request API error:', err);
    return NextResponse.json({ error: 'Server error resetting registration request.' }, { status: 500 });
  }
}
