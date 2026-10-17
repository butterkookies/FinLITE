import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { validateGmail } from '@/lib/utils/validation';
import { resolveAppUrl } from '@/lib/auth/app-url';
import { getAuthMethods, logAuthEvent } from '@/lib/auth/methods';
import { decideForgotPasswordAction } from '@/lib/auth/policy';
import { createRecoveryLink } from '@/lib/auth/registration';
import { sendPasswordResetEmail, sendGoogleOnlyNoticeEmail } from '@/lib/email/auth-mailer';
import { getClientIp, rateLimiter } from '@/lib/security/ratelimit';

// Identical for every outcome so the endpoint cannot be used to discover which
// emails are registered, or how they sign in.
const GENERIC = {
  success: true,
  message: 'If that email is registered, we sent instructions to it.',
};

// POST /api/auth/forgot-password { email }
//
// Policy:
//   - account with a password  -> one-time reset link
//   - Google-only account      -> NO token is created; the email says to use Google
//   - unknown / unverified     -> nothing is sent
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
      // Same shape as success: do not reveal that this address is being throttled.
      return NextResponse.json(GENERIC);
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      console.error('forgot-password: SUPABASE_SERVICE_ROLE_KEY is not configured.');
      return NextResponse.json(GENERIC);
    }

    const methods = await getAuthMethods(adminClient, { email: cleanEmail });
    const action = decideForgotPasswordAction(methods);
    const appUrl = resolveAppUrl(req);

    if (action === 'send_reset') {
      const resetUrl = await createRecoveryLink(adminClient, cleanEmail, appUrl);
      if (resetUrl) {
        await sendPasswordResetEmail({ to: cleanEmail, resetUrl });
      }
    } else if (action === 'send_google_notice') {
      await sendGoogleOnlyNoticeEmail({ to: cleanEmail, signInUrl: `${appUrl}/login` });
      await logAuthEvent(adminClient, {
        action: 'AUTH_RESET_BLOCKED_NO_PASSWORD',
        entityId: methods.user_id,
        details: { email: cleanEmail, reason: 'google_only_account', ip_address: getClientIp(req) },
      });
    }

    return NextResponse.json(GENERIC);
  } catch (err) {
    console.error('forgot-password error:', err);
    return NextResponse.json(GENERIC);
  }
}
