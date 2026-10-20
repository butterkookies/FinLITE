import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/config/admin';
import { getClientIp } from '@/lib/security/ratelimit';
import { getAuthMethods } from '@/lib/auth/methods';

// POST /api/auth/login
export async function POST(req) {
  try {
    const { email, username, password } = await req.json();
    const userEmail = (email || username || '').trim().toLowerCase();

    if (!userEmail || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    if (!userEmail.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid Gmail address.' }, { status: 400 });
    }

    const supabase = await createClient();



    // 2. Attempt sign-in with resolved email + password
    const { data, error } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password,
    });

    if (error) {
      if (error.message?.toLowerCase().includes('email not confirmed')) {
        // Supabase only reports this after the password was correct, so it does
        // not reveal anything to someone guessing passwords.
        return NextResponse.json({
          error: 'email_not_verified',
          message: 'Please verify your email first. Check your inbox for the verification link, or request a new one.',
          email: userEmail,
        }, { status: 403 });
      }

      // If the account has no password at all (Google sign-in), say so instead of
      // a misleading "incorrect password". The auth schema is the source of truth;
      // profiles.auth_provider only records how the account was first created.
      const adminClient = createAdminClient();
      if (adminClient) {
        try {
          const methods = await getAuthMethods(adminClient, { email: userEmail });
          if (methods.found && !methods.has_password) {
            return NextResponse.json({
              error: 'google_only_account',
              message: 'This account signs in with Google. Click \"Continue with Google\". If you want a password too, sign in with Google first and add one under Account Security.',
              isGoogleOnly: true,
            }, { status: 401 });
          }
        } catch (lookupErr) {
          console.warn('Login auth-method lookup note:', lookupErr?.message);
        }
      }

      return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
    }

    const userId = data.user?.id;
    const adminClient = createAdminClient();
    const queryClient = adminClient || supabase;

    // Check profile approval status (first by auth_user_id, then fallback to email)
    let { data: profile } = await queryClient
      .from('profiles')
      .select('id, status, role, first_name, last_name, auth_user_id, email')
      .eq('auth_user_id', userId)
      .maybeSingle();

    if (!profile) {
      const { data: profileByEmail } = await queryClient
        .from('profiles')
      .select('id, status, role, first_name, last_name, auth_user_id, email')
        .eq('email', userEmail)
        .maybeSingle();

      if (profileByEmail) {
        profile = profileByEmail;
        // Link auth_user_id to profile for future sub-millisecond lookups
        try {
          await queryClient
            .from('profiles')
            .update({ auth_user_id: userId, updated_at: new Date().toISOString() })
            .eq('id', profileByEmail.id);
        } catch (_) {}
      }
    }

    const isSuperAdmin = isSuperAdminEmail(userEmail);

    if (isSuperAdmin) {
      // Auto-promote super admin profile if it exists or needs status update
      if (profile && (profile.status !== 'approved' || profile.role !== 'admin')) {
        await supabase
          .from('profiles')
          .update({ status: 'approved', role: 'admin' })
          .eq('id', profile.id);
      }

      // Telemetry: Capture AUTH_LOGIN for Super Admin
      try {
        const clientIp = getClientIp(req);
        await supabase.from('audit_logs').insert([{
          action: 'AUTH_LOGIN',
          entity_type: 'auth_session',
          entity_id: profile?.id || userId,
          user_id: profile?.id || null,
          details: {
            auth_method: 'Password',
            email: userEmail,
            role: 'admin',
            is_super_admin: true,
            ip_address: clientIp,
          },
        }]);
      } catch (auditErr) {
        console.warn('Super admin login audit telemetry note:', auditErr.message);
      }

      return NextResponse.json({
        success: true,
        user: {
          id: profile?.id || userId,
          name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Andrei Geronimo',
          email: userEmail,
          role: 'admin',
        },
      });
    }

    if (!profile) {
      // Check if there's a pending registration request
      const { data: request } = await supabase
        .from('registration_requests')
        .select('id, status')
        .eq('email', userEmail)
        .maybeSingle();

      await supabase.auth.signOut();

      if (request?.status === 'pending') {
        return NextResponse.json({
          error: 'pending',
          message: 'Your registration is pending admin approval.',
          email: userEmail,
        }, { status: 403 });
      }

      return NextResponse.json({ error: 'Account not found. Please register first.' }, { status: 404 });
    }

    if (profile.status === 'suspended') {
      await supabase.auth.signOut();
      return NextResponse.json({
        error: 'suspended',
        message: 'Your account has been suspended by an administrator. Please contact your adviser or admin.',
        email: userEmail,
      }, { status: 403 });
    }

    if (profile.status === 'pending') {
      await supabase.auth.signOut();
      return NextResponse.json({
        error: 'pending',
        message: 'Your account is pending admin approval.',
        email: userEmail,
      }, { status: 403 });
    }

    if (profile.status === 'rejected') {
      await supabase.auth.signOut();
      return NextResponse.json({
        error: 'rejected',
        message: 'Your registration request was not approved. Please contact the admin.',
      }, { status: 403 });
    }

    // Telemetry: Capture AUTH_LOGIN for standard user
    try {
      const clientIp = getClientIp(req);
      await supabase.from('audit_logs').insert([{
        action: 'AUTH_LOGIN',
        entity_type: 'auth_session',
        entity_id: profile.id,
        user_id: profile.id,
        details: {
          auth_method: 'Password',
          email: userEmail,
          role: profile.role,
          ip_address: clientIp,
        },
      }]);
    } catch (auditErr) {
      console.warn('Login audit telemetry note:', auditErr.message);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        name: `${profile.first_name} ${profile.last_name}`.trim(),
        email: userEmail,
        role: profile.role,
      },
    });
  } catch (err) {
    console.error('Login API error:', err);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}
