import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { validateGmail } from '@/lib/utils/validation';
import { resolveAppUrl } from '@/lib/auth/app-url';
import { getAuthMethods } from '@/lib/auth/methods';
import { createVerificationLink } from '@/lib/auth/registration';
import { sendVerificationEmail } from '@/lib/email/auth-mailer';
import { rateLimiter } from '@/lib/security/ratelimit';

const GENERIC = {
  success: true,
  message: 'If a registration is waiting for verification for that address, we sent a new link.',
};

// POST /api/auth/resend-verification { email }
// Same response whether or not the address exists (no account enumeration).
export async function POST(req) {
  try {
    const { email } = await req.json();
    const emailError = validateGmail(email);
    if (emailError) {
      return NextResponse.json({ error: emailError }, { status: 400 });
    }
    const cleanEmail = email.trim().toLowerCase();

    // Per-address throttle on top of the per-IP limit: 3 emails / 15 minutes.
    const gate = rateLimiter.check(`resend-verify:${cleanEmail}`, 3, 15 * 60 * 1000);
    if (!gate.allowed) {
      return NextResponse.json(
        { error: 'Too many verification emails requested. Please wait a few minutes.' },
        { status: 429 }
      );
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      console.error('resend-verification: SUPABASE_SERVICE_ROLE_KEY is not configured.');
      return NextResponse.json(GENERIC);
    }

    const { data: request } = await adminClient
      .from('registration_requests')
      .select('first_name, status, auth_provider, google_id, email_verified_at')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (
      request &&
      request.auth_provider === 'email' &&
      request.status === 'pending' &&
      !request.email_verified_at &&
      request.google_id
    ) {
      const methods = await getAuthMethods(adminClient, { userId: request.google_id });
      if (methods.found && !methods.email_confirmed) {
        const verifyUrl = await createVerificationLink(adminClient, cleanEmail, resolveAppUrl(req));
        if (verifyUrl) {
          await sendVerificationEmail({ to: cleanEmail, name: request.first_name, verifyUrl });
        }
      }
    }

    return NextResponse.json(GENERIC);
  } catch (err) {
    console.error('resend-verification error:', err);
    return NextResponse.json(GENERIC);
  }
}
