import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/config/admin';
import { getClientIp } from '@/lib/security/ratelimit';

// GET /api/auth/callback — Supabase OAuth callback handler
// After Google OAuth, check if user is new (needs profile completion) or returning
export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/';

  // Dynamically resolve application origin from request headers to avoid cross-domain redirect issues (e.g., Render vs Vercel)
  const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const forwardedProto = req.headers.get('x-forwarded-proto') || (url.protocol.replace(':', '') || 'https');
  const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : url.origin;
  const appUrl = origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!code) {
    return NextResponse.redirect(`${appUrl}/login?error=oauth_failed`);
  }

  try {
    const supabase = await createClient();

    // Exchange code for session
    const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError || !sessionData?.user) {
      console.error('OAuth code exchange error:', sessionError);
      return NextResponse.redirect(`${appUrl}/login?error=oauth_failed`);
    }

    const user = sessionData.user;
    const googleEmail = user.email?.toLowerCase();
    const googleName = user.user_metadata?.full_name || user.user_metadata?.name || '';
    const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
    const clientIp = getClientIp(req);

    // --- SUPER ADMIN AUTO-SETUP ---
    // If the logging-in user is one of the designated super admins, auto-promote them to admin
    if (isSuperAdminEmail(googleEmail)) {
      const nameParts = (googleName || 'Andrei John Geronimo').trim().split(' ');
      const firstName = nameParts[0] || 'Andrei';
      const lastName = nameParts.slice(1).join(' ') || 'Geronimo';

      try {
        const { data: adminProf } = await supabase
          .from('profiles')
          .upsert({
            auth_user_id: user.id,
            email: googleEmail,
            full_name: googleName || 'Andrei John Geronimo',
            first_name: firstName,
            last_name: lastName,
            role: 'admin',
            status: 'approved',
            auth_provider: 'google',
            approved_at: new Date().toISOString(),
          }, { onConflict: 'email' })
          .select('id')
          .maybeSingle();

        await supabase
          .from('registration_requests')
          .update({
            status: 'approved',
            requested_role: 'admin',
            reviewed_at: new Date().toISOString(),
          })
          .eq('email', googleEmail);

        // Telemetry: Capture AUTH_LOGIN for Super Admin via Google
        await supabase.from('audit_logs').insert([{
          action: 'AUTH_LOGIN',
          entity_type: 'auth_session',
          entity_id: adminProf?.id || user.id,
          user_id: adminProf?.id || null,
          details: {
            auth_method: 'Google',
            email: googleEmail,
            role: 'admin',
            is_super_admin: true,
            ip_address: clientIp,
          },
        }]);
      } catch (adminErr) {
        console.warn('Super admin auto-upsert note:', adminErr);
      }

      // Directly route Super Admin into Admin Console
      return NextResponse.redirect(`${appUrl}/admin`);
    }

    // --- Check if already an approved profile (returning user by auth_user_id or email) ---
    const adminClient = createAdminClient();
    const queryClient = adminClient || supabase;

    let existingProfile = null;
    const { data: profByAuth } = await queryClient
      .from('profiles')
      .select('id, status, role, username, auth_user_id, email')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (profByAuth) {
      existingProfile = profByAuth;
    } else if (googleEmail) {
      // Check fallback by email to detect existing profiles (e.g. from seed data or email signup)
      const { data: profByEmail } = await queryClient
        .from('profiles')
        .select('id, status, role, username, auth_user_id, email')
        .eq('email', googleEmail)
        .maybeSingle();

      if (profByEmail) {
        existingProfile = profByEmail;
        // Auto-link Google OAuth UID to existing profile row
        try {
          await queryClient
            .from('profiles')
            .update({ 
              auth_user_id: user.id,
              auth_provider: 'google',
              avatar_url: googleAvatar || undefined,
              updated_at: new Date().toISOString()
            })
            .eq('id', profByEmail.id);
        } catch (linkErr) {
          console.warn('OAuth profile link auto-update warning:', linkErr?.message);
        }
      }
    }

    if (existingProfile) {
      if (existingProfile.status === 'suspended') {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${appUrl}/login?error=account_suspended`);
      }
      if (existingProfile.status === 'approved') {
        // Telemetry: Capture AUTH_LOGIN for Google OAuth user
        try {
          await queryClient.from('audit_logs').insert([{
            action: 'AUTH_LOGIN',
            entity_type: 'auth_session',
            entity_id: existingProfile.id,
            user_id: existingProfile.id,
            details: {
              auth_method: 'Google',
              email: googleEmail,
              role: existingProfile.role || 'member',
              ip_address: clientIp,
            },
          }]);
        } catch (auditErr) {
          console.warn('OAuth login audit telemetry note:', auditErr.message);
        }

        // Approved member — go to dashboard
        return NextResponse.redirect(`${appUrl}/`);
      }
      // Known but still pending
      return NextResponse.redirect(`${appUrl}/pending-approval?email=${encodeURIComponent(googleEmail)}`);
    }

    // --- Check if there's already a pending registration request for this Google account ---
    const { data: existingRequest } = await queryClient
      .from('registration_requests')
      .select('id, status')
      .eq('email', googleEmail)
      .maybeSingle();

    if (existingRequest) {
      if (existingRequest.status === 'approved') {
        // Approved but profile linking check
        try {
          await queryClient
            .from('profiles')
            .update({ auth_user_id: user.id })
            .eq('email', googleEmail);
        } catch (_) {}
        return NextResponse.redirect(`${appUrl}/`);
      }
      // Still pending — redirect to pending page
      return NextResponse.redirect(`${appUrl}/pending-approval?email=${encodeURIComponent(googleEmail)}`);
    }

    // --- New Google user — redirect to complete profile (username required) ---
    // Pass google user info via query params for pre-filling the form
    const params = new URLSearchParams({
      google: '1',
      email: googleEmail || '',
      name: googleName || '',
      avatar: googleAvatar || '',
      uid: user.id,
    });

    // Sign out first so they can't access the app until approved
    await supabase.auth.signOut();

    return NextResponse.redirect(`${appUrl}/register?${params.toString()}`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(`${appUrl}/login?error=server_error`);
  }
}
