import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClientIp } from '@/lib/security/ratelimit';

// POST /api/auth/logout — Log session end into audit_logs and terminate auth session
export async function POST(req) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: true });
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const email = user.email?.toLowerCase();
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, auth_provider, email')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      const clientIp = getClientIp(req);

      try {
        await supabase.from('audit_logs').insert([{
          action: 'AUTH_LOGOUT',
          entity_type: 'auth_session',
          entity_id: profile?.id || user.id,
          user_id: profile?.id || null,
          details: {
            email: email || profile?.email,
            role: profile?.role || 'member',
            auth_method: profile?.auth_provider === 'google' ? 'Google' : 'Password',
            ip_address: clientIp,
          },
        }]);
      } catch (auditErr) {
        console.warn('Logout audit log warning:', auditErr.message);
      }

      await supabase.auth.signOut();
    }

    return NextResponse.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    console.error('Logout API error:', err);
    return NextResponse.json({ success: true });
  }
}
