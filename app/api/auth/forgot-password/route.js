import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { validateGmail } from '@/lib/utils/validation';
import { resolveAppUrl } from '@/lib/auth/app-url';
import { getAuthMethods, logAuthEvent } from '@/lib/auth/methods';
import { decideForgotPasswordAction } from '@/lib/auth/policy';
import { createRecoveryLink } from '@/lib/auth/registration';
import { sendPasswordResetEmail, sendGoogleOnlyNoticeEmail } from '@/lib/email/auth-mailer';
import { getClientIp, rateLimiter } from '@/lib/security/ratelimit';

// POST /api/auth/forgot-password { email }
//
// Policy:
//   - Account exists in database with password -> one-time reset link
//   - Account exists as Google-only -> notify to sign in with Google
//   - Account does not exist in user database -> return 404 "Email does not exist."
export async function POST(req) {
  try {
    const { email } = await req.json();

    const emailError = validateGmail(email);
    if (emailError) {
      return NextResponse.json({ error: emailError }, { status: 400 });
    }
    const cleanEmail = email.trim().toLowerCase();

    // Per-address throttle on top of the per-IP limit: 3 emails / 15 minutes.
    const gate = rateLimiter.check(`forgot:${cleanEmail}`, 3, 15 * 60 * 1000);
    if (!gate.allowed) {
      return NextResponse.json(
        { error: 'Too many recovery attempts. Please wait a few minutes before trying again.' },
        { status: 429 }
      );
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      console.error('forgot-password: SUPABASE_SERVICE_ROLE_KEY is not configured.');
      return NextResponse.json(
        { error: 'Server configuration error. Please try again later.' },
        { status: 500 }
      );
    }

    // 1. Verify if user exists in the actual user database (profiles)
    const { data: profile } = await adminClient
      .from('profiles')
      .select('id, email, status, auth_user_id')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (!profile) {
      // Check if there is an unapproved / pending registration request
      const { data: request } = await adminClient
        .from('registration_requests')
        .select('id, status')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (request?.status === 'pending') {
        return NextResponse.json(
          { error: 'Your account registration is still pending administrator approval.' },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: 'Email does not exist.' },
        { status: 404 }
      );
    }

    // 2. Check profile status
    if (profile.status === 'suspended') {
      return NextResponse.json(
        { error: 'This account has been suspended by an administrator. Please contact your adviser or admin.' },
        { status: 403 }
      );
    }

    if (profile.status === 'pending') {
      return NextResponse.json(
        { error: 'Your account registration is still pending administrator approval.' },
        { status: 403 }
      );
    }

    if (profile.status === 'rejected') {
      return NextResponse.json(
        { error: 'Your registration request was not approved. Please contact the admin.' },
        { status: 403 }
      );
    }

    // 3. Lookup auth methods
    const methods = await getAuthMethods(adminClient, {
      userId: profile.auth_user_id,
      email: cleanEmail,
    });

    if (!methods?.found) {
      return NextResponse.json(
        { error: 'Email does not exist.' },
        { status: 404 }
      );
    }

    if (!methods.email_confirmed) {
      return NextResponse.json(
        { error: 'Please verify your email address first before resetting your password.' },
        { status: 403 }
      );
    }

    const action = decideForgotPasswordAction(methods);
    const appUrl = resolveAppUrl(req);

    if (action === 'send_reset') {
      const resetUrl = await createRecoveryLink(adminClient, cleanEmail, appUrl);
      if (!resetUrl) {
        return NextResponse.json(
          { error: 'Failed to generate password recovery link. Please try again.' },
          { status: 500 }
        );
      }
      await sendPasswordResetEmail({ to: cleanEmail, resetUrl });
    } else if (action === 'send_google_notice') {
      await sendGoogleOnlyNoticeEmail({ to: cleanEmail, signInUrl: `${appUrl}/login` });
      await logAuthEvent(adminClient, {
        action: 'AUTH_RESET_BLOCKED_NO_PASSWORD',
        entityId: methods.user_id,
        details: { email: cleanEmail, reason: 'google_only_account', ip_address: getClientIp(req) },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Password recovery instructions have been sent to your email.',
    });
  } catch (err) {
    console.error('forgot-password error:', err);
    return NextResponse.json(
      { error: 'Failed to process your request. Please try again later.' },
      { status: 500 }
    );
  }
}
