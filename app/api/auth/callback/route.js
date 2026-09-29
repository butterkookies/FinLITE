import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/config/admin';

// GET /api/auth/callback — Supabase OAuth callback handler
// After Google OAuth, check if user is new (needs profile completion) or returning
export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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

    // --- SUPER ADMIN AUTO-SETUP ---
    // If the logging-in user is one of the designated super admins, auto-promote them to admin
    if (isSuperAdminEmail(googleEmail)) {
      const nameParts = (googleName || 'Andrei John Geronimo').trim().split(' ');
      const firstName = nameParts[0] || 'Andrei';
      const lastName = nameParts.slice(1).join(' ') || 'Geronimo';

      try {
        await supabase
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
          }, { onConflict: 'email' });

        await supabase
          .from('registration_requests')
          .update({
            status: 'approved',
            requested_role: 'admin',
            reviewed_at: new Date().toISOString(),
          })
          .eq('email', googleEmail);
      } catch (adminErr) {
        console.warn('Super admin auto-upsert note:', adminErr);
      }

      // Directly route Super Admin into Admin Console
      return NextResponse.redirect(`${appUrl}/admin`);
    }

    // --- Check if already an approved profile (returning user) ---
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, status, username')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (existingProfile) {
      if (existingProfile.status === 'approved') {
        // Approved member — go to dashboard
        return NextResponse.redirect(`${appUrl}/`);
      }
      // Known but still pending
      return NextResponse.redirect(`${appUrl}/pending-approval?email=${encodeURIComponent(googleEmail)}`);
    }

    // --- Check if there's already a pending registration request for this Google account ---
    const { data: existingRequest } = await supabase
      .from('registration_requests')
      .select('id, status')
      .eq('email', googleEmail)
      .maybeSingle();

    if (existingRequest) {
      if (existingRequest.status === 'approved') {
        // Approved but profile not linked — edge case, redirect to dashboard
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
