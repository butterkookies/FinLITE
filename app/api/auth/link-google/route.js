import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getAuthMethods, patchSecurityState, verifyPasswordOnly, logAuthEvent } from '@/lib/auth/methods';
import { LINK_WINDOW_MS } from '@/lib/auth/policy';
import { sendSecurityChangeEmail } from '@/lib/email/auth-mailer';
import { getClientIp } from '@/lib/security/ratelimit';

// POST /api/auth/link-google { password }
//
// Step 1 of connecting Google to an account that has a password. The user must
// be signed in AND re-enter their password. On success a short link window is
// opened; the browser then calls supabase.auth.linkIdentity({ provider: 'google' }).
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

    const { password } = await req.json();

    const methods = await getAuthMethods(adminClient, { userId: user.id });
    if (!methods.found || !methods.email_confirmed) {
      return NextResponse.json({ error: 'Your email must be verified first.' }, { status: 403 });
    }
    if (!methods.has_password) {
      return NextResponse.json({ error: 'This account already signs in with Google.' }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: 'Enter your password to continue.' }, { status: 400 });
    }

    const ok = await verifyPasswordOnly(user.email, password);
    if (!ok) {
      return NextResponse.json({ error: 'Your password is incorrect.' }, { status: 403 });
    }

    // A Google identity can already exist (it was attached before this guard
    // shipped). The password proof just given is the missing consent.
    if ((methods.providers || []).includes('google')) {
      await patchSecurityState(adminClient, user.id, {
        google_linked_at: new Date().toISOString(),
      });
      const ip = getClientIp(req);
      await logAuthEvent(adminClient, {
        action: 'AUTH_GOOGLE_LINKED',
        entityId: user.id,
        details: { email: user.email, ip_address: ip, via: 'password_proof_existing_identity' },
      });
      sendSecurityChangeEmail({ to: user.email, event: 'google_linked', ip }).catch(() => {});
      return NextResponse.json({ success: true, alreadyPresent: true });
    }

    await patchSecurityState(adminClient, user.id, {
      google_link_until: new Date(Date.now() + LINK_WINDOW_MS).toISOString(),
    });

    return NextResponse.json({ success: true, alreadyPresent: false });
  } catch (err) {
    console.error('POST /api/auth/link-google error:', err);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}
