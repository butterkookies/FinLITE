import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/config/admin';
import { getClientIp } from '@/lib/security/ratelimit';
import { isCustomUploadedAvatar } from '@/lib/utils/avatar';
import { patchSecurityState } from '@/lib/auth/methods';

// POST /api/auth/google-session
// Called after client-side signInWithIdToken to finalize profile routing,
// super-admin provisioning, and security audit telemetry.
export async function POST(req) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'No authenticated session found.' },
        { status: 401 }
      );
    }

    const googleEmail = user.email?.toLowerCase();
    const googleName = user.user_metadata?.full_name || user.user_metadata?.name || '';
    const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
    const clientIp = getClientIp(req);

    const adminClient = createAdminClient();
    const queryClient = adminClient || supabase;

    // 1. Super Admin Auto-Setup
    if (isSuperAdminEmail(googleEmail)) {
      const nameParts = (googleName || 'Andrei John Geronimo').trim().split(' ');
      const firstName = nameParts[0] || 'Andrei';
      const lastName = nameParts.slice(1).join(' ') || 'Geronimo';

      try {
        const { data: existingAdmin } = await queryClient
          .from('profiles')
          .select('avatar_url')
          .eq('email', googleEmail)
          .maybeSingle();

        const adminAvatar = isCustomUploadedAvatar(existingAdmin?.avatar_url)
          ? existingAdmin.avatar_url
          : (googleAvatar || existingAdmin?.avatar_url || null);

        const { data: adminProf } = await queryClient
          .from('profiles')
          .upsert(
            {
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
            },
            { onConflict: 'email' }
          )
          .select('id')
          .maybeSingle();

        await queryClient
          .from('registration_requests')
          .update({
            status: 'approved',
            requested_role: 'admin',
            reviewed_at: new Date().toISOString(),
          })
          .eq('email', googleEmail);

        // Audit Log
        await queryClient.from('audit_logs').insert([
          {
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
          },
        ]);
      } catch (adminErr) {
        console.warn('Super admin auto-upsert note in google-session:', adminErr);
      }

      return NextResponse.json({ success: true, redirect: '/admin' });
    }

    // 2. Existing Profile Lookup (by auth_user_id first, then email)
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
          console.warn('Google session avatar sync note:', syncErr?.message);
        }
      }
    } else if (googleEmail) {
      const { data: profByEmail } = await queryClient
        .from('profiles')
        .select('id, status, role, auth_user_id, email')
        .eq('email', googleEmail)
        .maybeSingle();

      if (profByEmail) {
        if (profByEmail.auth_user_id && profByEmail.auth_user_id !== user.id) {
          await supabase.auth.signOut();
          return NextResponse.json(
            { error: 'account_conflict', message: 'This Gmail is already tied to a different sign-in.' },
            { status: 409 }
          );
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
          console.warn('Google session profile claim warning:', linkErr?.message);
        }
      }
    }

    if (existingProfile) {
      if (existingProfile.status === 'suspended') {
        await supabase.auth.signOut();
        return NextResponse.json(
          { error: 'suspended', message: 'Your account has been suspended by an administrator. Please contact your adviser or admin.' },
          { status: 403 }
        );
      }

      if (existingProfile.status === 'approved') {
        try {
          await queryClient.from('audit_logs').insert([
            {
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
            },
          ]);
        } catch (auditErr) {
          console.warn('OAuth login audit telemetry note:', auditErr?.message);
        }

        if (adminClient) {
          try {
            await patchSecurityState(adminClient, user.id, {
              google_linked_at: new Date().toISOString(),
            });
          } catch (secErr) {
            console.warn('Google session security state sync note:', secErr?.message);
          }
        }

        return NextResponse.json({ success: true, redirect: '/' });
      }

      // Pending: sign out
      await supabase.auth.signOut();
      return NextResponse.json({
        success: true,
        redirect: `/pending-approval?email=${encodeURIComponent(googleEmail)}`,
      });
    }

    // 3. Existing Registration Request Lookup
    const { data: existingRequest } = await queryClient
      .from('registration_requests')
      .select('id, status, auth_provider, google_id')
      .eq('email', googleEmail)
      .maybeSingle();

    if (existingRequest) {
      if (existingRequest.status === 'rejected') {
        await supabase.auth.signOut();
        return NextResponse.json(
          { error: 'rejected', message: 'Your registration request was not approved. Please contact the admin.' },
          { status: 403 }
        );
      }
      if (existingRequest.status === 'approved') {
        return NextResponse.json({
          success: true,
          redirect: '/',
        });
      }
      await supabase.auth.signOut();
      return NextResponse.json({
        success: true,
        redirect: `/pending-approval?email=${encodeURIComponent(googleEmail)}`,
      });
    }

    // 4. New Google user -> redirect to finish profile setup
    return NextResponse.json({
      success: true,
      redirect: '/register?google=1',
    });
  } catch (err) {
    console.error('Google session route error:', err);
    return NextResponse.json(
      { error: 'server_error', message: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
