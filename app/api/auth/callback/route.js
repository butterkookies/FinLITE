import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/config/admin';
import { getClientIp } from '@/lib/security/ratelimit';
import { resolveAppUrl, safeNextPath } from '@/lib/auth/app-url';
import { getAuthMethods, getSecurityState, patchSecurityState, logAuthEvent } from '@/lib/auth/methods';
import { evaluateGoogleIdentity, isReplaceableRegistration } from '@/lib/auth/policy';
import { discardUnverifiedRegistration } from '@/lib/auth/registration';
import { sendSecurityChangeEmail } from '@/lib/email/auth-mailer';
import { isCustomUploadedAvatar } from '@/lib/utils/avatar';

// GET /api/auth/callback — Supabase OAuth callback handler
//
// Identity rules enforced here:
//   - An account is matched on its Supabase user id (the Google "sub" behind it),
//     never on email alone.
//   - A Google identity on an account that has a password is only accepted if
//     the owner linked it deliberately (see /api/auth/link-google).
//   - A profile that is already bound to a different auth user is never re-bound.
export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  // Destination after sign-in: explicit ?next=, else the short-lived cookie the
  // Account Security page sets before an OAuth round trip. Same-site paths only.
  const cookieNext = req.cookies?.get?.('finlite_next')?.value;
  const next = safeNextPath(url.searchParams.get('next') || cookieNext, '/');

  const appUrl = resolveAppUrl(req);

  // Every redirect clears the one-shot destination cookie.
  const redirectTo = (target) => {
    const res = NextResponse.redirect(target);
    if (cookieNext) res.cookies.set('finlite_next', '', { path: '/', maxAge: 0 });
    return res;
  };

  // Supabase redirects here with ?error=... when the auth layer refuses the
  // sign-in (for example the database guard that blocks silently attaching
  // Google to a password account).
  if (!code) {
    return redirectTo(`${appUrl}/login?error=oauth_failed`);
  }

  try {
    const supabase = await createClient();

    // Exchange code for session
    const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError || !sessionData?.user) {
      console.error('OAuth code exchange error:', sessionError);
      return redirectTo(`${appUrl}/login?error=oauth_failed`);
    }

    const user = sessionData.user;
    const googleEmail = user.email?.toLowerCase();
    const googleName = user.user_metadata?.full_name || user.user_metadata?.name || '';
    const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
    const clientIp = getClientIp(req);

    const adminClient = createAdminClient();
    const queryClient = adminClient || supabase;

    // --- GOOGLE IDENTITY GUARD ---
    // Decide whether the Google identity on this session is legitimate before
    // anything else happens.
    const hasGoogleIdentity = (user.identities || []).some((i) => i.provider === 'google');
    if (hasGoogleIdentity && adminClient) {
      const methods = await getAuthMethods(adminClient, { userId: user.id });
      const state = await getSecurityState(adminClient, user.id);

      const verdict = evaluateGoogleIdentity({
        hasGoogleIdentity,
        hasPassword: Boolean(methods.has_password),
        emailConfirmed: Boolean(methods.email_confirmed),
        googleLinkedAt: state?.google_linked_at,
        googleLinkUntil: state?.google_link_until,
      });

      if (verdict === 'blocked') {
        await logAuthEvent(adminClient, {
          action: 'AUTH_GOOGLE_LINK_BLOCKED',
          entityId: user.id,
          details: { email: googleEmail, ip_address: clientIp },
        });
        await supabase.auth.signOut();
        return redirectTo(`${appUrl}/login?error=link_requires_password`);
      }

      if (verdict === 'native' && !state?.google_linked_at) {
        // First sign-in on a passwordless account: Google is its own method.
        await patchSecurityState(adminClient, user.id, { google_linked_at: new Date().toISOString() });
      }

      if (verdict === 'link_now') {
        await patchSecurityState(adminClient, user.id, {
          google_linked_at: new Date().toISOString(),
          google_link_until: null,
        });
        await logAuthEvent(adminClient, {
          action: 'AUTH_GOOGLE_LINKED',
          entityId: user.id,
          details: { email: googleEmail, ip_address: clientIp, via: 'password_proof' },
        });
        sendSecurityChangeEmail({ to: googleEmail, event: 'google_linked', ip: clientIp }).catch(() => {});
      }
    }

    // --- SUPER ADMIN AUTO-SETUP ---
    // If the logging-in user is one of the designated super admins, auto-promote them to admin
    if (isSuperAdminEmail(googleEmail)) {
      const nameParts = (googleName || 'Andrei John Geronimo').trim().split(' ');
      const firstName = nameParts[0] || 'Andrei';
      const lastName = nameParts.slice(1).join(' ') || 'Geronimo';

      try {
        const { data: existingAdmin } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('email', googleEmail)
          .maybeSingle();

        const adminAvatar = isCustomUploadedAvatar(existingAdmin?.avatar_url)
          ? existingAdmin.avatar_url
          : (googleAvatar || existingAdmin?.avatar_url || null);

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
            avatar_url: adminAvatar,
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

      // Route Super Admin into the Admin Console unless a safe destination was requested
      return redirectTo(`${appUrl}${next !== '/' ? next : '/admin'}`);
    }

    // --- Match an existing profile: by auth user id first ---
    let existingProfile = null;
    const { data: profByAuth } = await queryClient
      .from('profiles')
      .select('id, status, role, auth_user_id, email, avatar_url')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (profByAuth) {
      existingProfile = profByAuth;
      // Auto-sync Google photo into profile if user has not uploaded a custom avatar
      if (googleAvatar && !isCustomUploadedAvatar(existingProfile.avatar_url) && existingProfile.avatar_url !== googleAvatar) {
        try {
          await queryClient
            .from('profiles')
            .update({
              avatar_url: googleAvatar,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingProfile.id);
          existingProfile.avatar_url = googleAvatar;
        } catch (syncErr) {
          console.warn('Google avatar sync note:', syncErr?.message);
        }
      }
    } else if (googleEmail) {
      // Email is only a hint. A profile can be claimed by email solely when it
      // is not bound to any auth user yet (e.g. seed data) and the email is
      // verified. A profile bound to a different auth user is never re-bound.
      const { data: profByEmail } = await queryClient
        .from('profiles')
        .select('id, status, role, auth_user_id, email')
        .eq('email', googleEmail)
        .maybeSingle();

      if (profByEmail) {
        if (profByEmail.auth_user_id && profByEmail.auth_user_id !== user.id) {
          await logAuthEvent(queryClient, {
            action: 'AUTH_ACCOUNT_CONFLICT',
            profileId: profByEmail.id,
            entityId: profByEmail.id,
            details: { email: googleEmail, ip_address: clientIp },
          });
          await supabase.auth.signOut();
          return redirectTo(`${appUrl}/login?error=account_conflict`);
        }

        if (!user.email_confirmed_at) {
          await supabase.auth.signOut();
          return redirectTo(`${appUrl}/login?error=oauth_failed`);
        }

        existingProfile = profByEmail;
        try {
          await queryClient
            .from('profiles')
            .update({
              auth_user_id: user.id,
              auth_provider: 'google',
              avatar_url: googleAvatar || undefined,
              updated_at: new Date().toISOString(),
            })
            .eq('id', profByEmail.id)
            .is('auth_user_id', null);
        } catch (linkErr) {
          console.warn('OAuth profile claim warning:', linkErr?.message);
        }
      }
    }

    if (existingProfile) {
      if (existingProfile.status === 'suspended') {
        await supabase.auth.signOut();
        return redirectTo(`${appUrl}/login?error=account_suspended`);
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

        // Approved member: go to the requested page (or the dashboard)
        return redirectTo(`${appUrl}${next}`);
      }
      // Known but still pending: sign out so no unauthorized session is left active
      await supabase.auth.signOut();
      return redirectTo(`${appUrl}/pending-approval?email=${encodeURIComponent(googleEmail)}`);
    }

    // --- Is there already a registration request for this Google account's email? ---
    let { data: existingRequest } = await queryClient
      .from('registration_requests')
      .select('id, status, auth_provider, google_id, email_verified_at')
      .eq('email', googleEmail)
      .maybeSingle();

    // An unverified email/password request never proved it owns this inbox.
    // The person who just signed in with Google did, so they win.
    if (existingRequest && isReplaceableRegistration(existingRequest) && adminClient) {
      if (existingRequest.google_id === user.id) {
        // Supabase merged the stale signup into this Google user: keep the auth
        // user, drop only the squatter's request data.
        await adminClient.from('registration_requests').delete().eq('id', existingRequest.id);
        existingRequest = null;
      } else if (await discardUnverifiedRegistration(adminClient, existingRequest)) {
        existingRequest = null;
      }
    }

    if (existingRequest) {
      if (existingRequest.status === 'rejected') {
        await supabase.auth.signOut();
        return redirectTo(`${appUrl}/login?error=account_rejected`);
      }
      if (existingRequest.status === 'approved') {
        return redirectTo(`${appUrl}${next}`);
      }
      // Pending: sign out so no unauthorized session is left active
      await supabase.auth.signOut();
      return redirectTo(`${appUrl}/pending-approval?email=${encodeURIComponent(googleEmail)}`);
    }

    // --- New Google user: finish the profile on /register ---
    // The session is kept (not signed out) so /api/auth/google-register can
    // read the verified Google identity from it instead of trusting form input.
    // Without an approved profile the middleware still blocks every app route.
    return redirectTo(`${appUrl}/register?google=1`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    return redirectTo(`${appUrl}/login?error=server_error`);
  }
}
