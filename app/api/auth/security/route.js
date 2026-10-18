import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getAuthMethods, getSecurityState } from '@/lib/auth/methods';
import { passwordChangeRequirements } from '@/lib/auth/policy';

// GET /api/auth/security
// Returns the signed-in user's sign-in methods for the Account Security page.
export async function GET() {
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

    const methods = await getAuthMethods(adminClient, { userId: user.id });
    const state = await getSecurityState(adminClient, user.id);
    const req = passwordChangeRequirements({
      hasPassword: Boolean(methods.has_password),
      lastSignInAt: user.last_sign_in_at,
    });

    return NextResponse.json({
      success: true,
      email: user.email,
      hasPassword: Boolean(methods.has_password),
      googleLinked: (methods.providers || []).includes('google') && Boolean(state?.google_linked_at),
      googleIdentityPresent: (methods.providers || []).includes('google'),
      passwordMode: req.mode,
      recentSignIn: req.recentSignIn,
      passwordSetAt: state?.password_set_at || null,
      googleLinkedAt: state?.google_linked_at || null,
    });
  } catch (err) {
    console.error('GET /api/auth/security error:', err);
    return NextResponse.json({ error: 'Failed to load security settings.' }, { status: 500 });
  }
}
