import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { validatePassword } from '@/lib/utils/validation';
import {
  getAuthMethods,
  patchSecurityState,
  verifyPasswordOnly,
  logAuthEvent,
} from '@/lib/auth/methods';
import { passwordChangeRequirements, ENROLL_WINDOW_MS } from '@/lib/auth/policy';
import { sendSecurityChangeEmail } from '@/lib/email/auth-mailer';
import { getClientIp } from '@/lib/security/ratelimit';

// POST /api/auth/password { newPassword, currentPassword? }
//
// The ONLY place a password can be added to a Google-only account, and the
// place a signed-in user changes theirs. Requires a live session plus proof:
//   - account has a password -> the current password
//   - account has no password -> a recent sign-in (Google re-authentication)
export async function POST(req) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    if (!supabase || !adminClient) {
      return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { newPassword, currentPassword } = await req.json();

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const methods = await getAuthMethods(adminClient, { userId: user.id });
    if (!methods.found || !methods.email_confirmed) {
      return NextResponse.json({ error: 'Your email must be verified first.' }, { status: 403 });
    }

    const requirement = passwordChangeRequirements({
      hasPassword: Boolean(methods.has_password),
      lastSignInAt: user.last_sign_in_at,
    });

    if (requirement.mode === 'change') {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Enter your current password.' }, { status: 400 });
      }
      const ok = await verifyPasswordOnly(user.email, currentPassword);
      if (!ok) {
        return NextResponse.json({ error: 'Your current password is incorrect.' }, { status: 403 });
      }
      if (currentPassword === newPassword) {
        return NextResponse.json({ error: 'Choose a password different from your current one.' }, { status: 400 });
      }
    } else if (!requirement.recentSignIn) {
      // Adding a password to a passwordless account needs fresh proof of identity.
      return NextResponse.json(
        {
          error: 'Please confirm it is you by signing in with Google again, then retry.',
          code: 'reauth_required',
        },
        { status: 403 }
      );
    }

    // Open a short enrollment window for this user only; the database guard
    // refuses any passwordless -> password change outside of it.
    if (requirement.mode === 'add') {
      await patchSecurityState(adminClient, user.id, {
        password_enroll_until: new Date(Date.now() + ENROLL_WINDOW_MS).toISOString(),
      });
    }

    const { error: updateErr } = await adminClient.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    // Always close the window, success or not.
    if (requirement.mode === 'add') {
      await patchSecurityState(adminClient, user.id, {
        password_enroll_until: null,
        ...(updateErr
          ? {}
          : {
              password_set_at: new Date().toISOString(),
              // The Google identity on this account was its original method.
              google_linked_at: new Date().toISOString(),
            }),
      }).catch(() => {});
    }

    if (updateErr) {
      console.error('Password update failed:', updateErr.message);
      return NextResponse.json({ error: 'Could not update your password. Please try again.' }, { status: 500 });
    }

    // Sign out every other session; the current one stays.
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await adminClient.auth.admin.signOut(session.access_token, 'others');
      }
    } catch (e) {
      console.warn('Password change: other-session sign-out warning:', e?.message);
    }

    const ip = getClientIp(req);
    const event = requirement.mode === 'add' ? 'password_set' : 'password_changed';
    await logAuthEvent(adminClient, {
      action: requirement.mode === 'add' ? 'AUTH_PASSWORD_SET' : 'AUTH_PASSWORD_CHANGED',
      entityId: user.id,
      details: { email: user.email, ip_address: ip },
    });
    sendSecurityChangeEmail({ to: user.email, event, ip }).catch(() => {});

    return NextResponse.json({
      success: true,
      mode: requirement.mode,
      message:
        requirement.mode === 'add'
          ? 'Password added. You can now sign in with Google or your password.'
          : 'Password changed. Your other sessions were signed out.',
    });
  } catch (err) {
    console.error('POST /api/auth/password error:', err);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}
