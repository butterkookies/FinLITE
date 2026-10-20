import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { resolveAppUrl } from '@/lib/auth/app-url';
import { createStatelessClient, logAuthEvent } from '@/lib/auth/methods';
import { sendAdminRegistrationNotification } from '@/lib/email/mailer';

// GET /api/auth/verify-email?token_hash=...&type=magiclink
//
// Opened from the verification email. Redeems the one-time token server-side
// (no session cookie is created), marks the registration as verified, and only
// then notifies the admins. A page load alone never consumes a token.
export async function GET(req) {
  const url = new URL(req.url);
  const appUrl = resolveAppUrl(req);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');

  const invalid = () => NextResponse.redirect(`${appUrl}/verify-email?status=invalid`);

  if (!tokenHash || !['magiclink', 'signup', 'email'].includes(type || '')) {
    return invalid();
  }

  try {
    const adminClient = createAdminClient();
    const stateless = createStatelessClient();
    if (!adminClient || !stateless) return invalid();

    const { data, error } = await stateless.auth.verifyOtp({ token_hash: tokenHash, type });
    const user = data?.user;
    if (error || !user?.id || !user.email) return invalid();

    // The token proved inbox ownership. Make sure the email is marked confirmed
    // regardless of provider nuances, then record it against the request.
    await adminClient.auth.admin.updateUserById(user.id, { email_confirm: true });

    const now = new Date().toISOString();
    const { data: request } = await adminClient
      .from('registration_requests')
      .update({ email_verified_at: now })
      .eq('google_id', user.id)
      .eq('auth_provider', 'email')
      .is('email_verified_at', null)
      .select('first_name, last_name, email, contact_number')
      .maybeSingle();

    await logAuthEvent(adminClient, {
      action: 'AUTH_EMAIL_VERIFIED',
      entityId: user.id,
      details: { email: user.email, verified_at: now },
    });

    // Admins hear about the request only now that the email is verified.
    if (request) {
      sendAdminRegistrationNotification({
        applicantName: `${request.first_name} ${request.last_name}`.trim(),
        email: request.email,
        contactNumber: request.contact_number,
        authProvider: 'email',
      }).catch((e) => console.warn('Admin notification email warning:', e?.message));
    }

    return NextResponse.redirect(
      `${appUrl}/verify-email?status=success&email=${encodeURIComponent(user.email)}`
    );
  } catch (err) {
    console.error('verify-email error:', err);
    return invalid();
  }
}
