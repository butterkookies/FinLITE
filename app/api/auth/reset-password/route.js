import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { validatePassword } from '@/lib/utils/validation';
import { getAuthMethods, createStatelessClient, logAuthEvent } from '@/lib/auth/methods';
import { sendSecurityChangeEmail } from '@/lib/email/auth-mailer';
import { getClientIp } from '@/lib/security/ratelimit';

// POST /api/auth/reset-password { tokenHash, password }
//
// Redeems the emailed one-time recovery token and sets the new password. This
// only ever CHANGES an existing password: an account with no password cannot
// gain one here (that is only possible from authenticated Account Security).
export async function POST(req) {
  try {
    const { tokenHash, password } = await req.json();

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }
    if (!tokenHash || typeof tokenHash !== 'string') {
      return NextResponse.json({ error: 'This reset link is invalid. Request a new one.' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const stateless = createStatelessClient();
    if (!adminClient || !stateless) {
      return NextResponse.json({ error: 'Password reset is temporarily unavailable.' }, { status: 503 });
    }

    const { data, error } = await stateless.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
    const user = data?.user;
    if (error || !user?.id) {
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired. Request a new one.' },
        { status: 400 }
      );
    }

    const methods = await getAuthMethods(adminClient, { userId: user.id });
    if (!methods.found || !methods.has_password) {
      return NextResponse.json(
        { error: 'This account signs in with Google and has no password to reset. Use "Continue with Google".' },
        { status: 403 }
      );
    }

    const { error: updateErr } = await adminClient.auth.admin.updateUserById(user.id, { password });
    if (updateErr) {
      console.error('reset-password update failed:', updateErr.message);
      return NextResponse.json({ error: 'Could not update your password. Please try again.' }, { status: 500 });
    }

    // Kill every existing session, including any the attacker may hold.
    try {
      if (data.session?.access_token) {
        await adminClient.auth.admin.signOut(data.session.access_token, 'global');
      }
    } catch (e) {
      console.warn('reset-password: global sign-out warning:', e?.message);
    }

    const ip = getClientIp(req);
    await logAuthEvent(adminClient, {
      action: 'AUTH_PASSWORD_RESET',
      entityId: user.id,
      details: { email: user.email, ip_address: ip },
    });
    sendSecurityChangeEmail({ to: user.email, event: 'password_reset', ip }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('reset-password error:', err);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}
