import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/config/admin';
import { getClientIp } from '@/lib/security/ratelimit';
import { isEmailVerified } from '@/lib/security/otp';
import { getResubmission } from '@/lib/security/resubmissions';

// POST /api/auth/login
export async function POST(req) {
  try {
    const { username, email, password } = await req.json();
    const identifier = (username || email || '').trim().toLowerCase();

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Gmail address and password are required.' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Resolve email from username if identifier is not an email
    let userEmail = identifier;

    if (!identifier.includes('@')) {
      // Find email by username from profiles first
      const { data: profileRecord } = await supabase
        .from('profiles')
        .select('email, status')
        .eq('username', identifier)
        .maybeSingle();

      if (profileRecord?.email) {
        userEmail = profileRecord.email;
      } else {
        // Also check pending registration_requests
        const { data: requestRecord } = await supabase
          .from('registration_requests')
          .select('email, status, email_verified_at')
          .eq('username', identifier)
          .maybeSingle();

        if (requestRecord) {
          if (requestRecord.status === 'pending') {
            const isVerified = Boolean(
              requestRecord.email_verified_at ||
              isEmailVerified(requestRecord.email)
            );

            if (!isVerified) {
              return NextResponse.json({
                error: 'unverified_email',
                message: 'Your Gmail address has not been verified yet. Please enter the 6-digit verification code sent to your inbox.',
                email: requestRecord.email,
                verifyUrl: `/register?verify=true&email=${encodeURIComponent(requestRecord.email)}`,
              }, { status: 403 });
            }
            return NextResponse.json({
              error: 'pending',
              message: 'Your registration is pending admin approval.',
              email: requestRecord.email,
            }, { status: 403 });
          }
          userEmail = requestRecord.email;
        } else {
          return NextResponse.json({ error: 'No account found with this Gmail address.' }, { status: 404 });
        }
      }
    }

    // 2. Attempt sign-in with resolved email + password
    const { data, error } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password,
    });

    if (error) {
      const adminClient = createAdminClient();
      const queryClient = adminClient || supabase;

      // Check if this email belongs to a resubmitted request or registration request
      const resub = getResubmission(userEmail);
      if (resub) {
        if (resub.email_verified) {
          return NextResponse.json({
            error: 'pending',
            message: 'Your registration is pending admin approval.',
            email: userEmail,
          }, { status: 403 });
        }
        return NextResponse.json({
          error: 'unverified_email',
          message: 'Your Gmail address has not been verified yet. Please enter the 6-digit verification code sent to your inbox.',
          email: userEmail,
          verifyUrl: `/register?verify=true&email=${encodeURIComponent(userEmail)}`,
        }, { status: 403 });
      }

      const { data: regReq } = await queryClient
        .from('registration_requests')
        .select('id, email, email_verified_at, status')
        .eq('email', userEmail)
        .maybeSingle();

      if (regReq && regReq.status === 'pending') {
        const isVerified = Boolean(
          regReq.email_verified_at ||
          isEmailVerified(userEmail)
        );

        if (!isVerified) {
          return NextResponse.json({
            error: 'unverified_email',
            message: 'Your Gmail address has not been verified yet. Please enter the 6-digit verification code sent to your inbox.',
            email: userEmail,
            verifyUrl: `/register?verify=true&email=${encodeURIComponent(userEmail)}`,
          }, { status: 403 });
        }

        return NextResponse.json({
          error: 'pending',
          message: 'Your registration is pending admin approval.',
          email: userEmail,
        }, { status: 403 });
      }

      if (regReq && regReq.status === 'rejected') {
        return NextResponse.json({
          error: 'rejected',
          message: 'Your registration request was not approved. Please contact an administrator.',
        }, { status: 403 });
      }

      if (error.message?.toLowerCase().includes('email not confirmed')) {
        if (isEmailVerified(userEmail)) {
          return NextResponse.json({
            error: 'pending',
            message: 'Your registration is pending admin approval.',
            email: userEmail,
          }, { status: 403 });
        }
        return NextResponse.json({
          error: 'unverified_email',
          message: 'Your Gmail address has not been verified yet. Please enter the 6-digit verification code sent to your inbox.',
          email: userEmail,
          verifyUrl: `/register?verify=true&email=${encodeURIComponent(userEmail)}`,
        }, { status: 403 });
      }

      // Check if user was registered via Google OAuth to provide helpful UX guidance
      const { data: profileCheck } = await queryClient
        .from('profiles')
        .select('auth_provider, email')
        .eq('email', userEmail)
        .maybeSingle();

      if (profileCheck?.auth_provider === 'google') {
        return NextResponse.json({
          error: 'google_only_account',
          message: 'This account was registered using Google. Please click "Continue with Google" to sign in, or use "Forgot Password" to set a password for email login.',
          isGoogleOnly: true,
        }, { status: 401 });
      }

      return NextResponse.json({ error: 'Incorrect Gmail address or password.' }, { status: 401 });
    }

    const userId = data.user?.id;
    const adminClient = createAdminClient();
    const queryClient = adminClient || supabase;

    // Check profile approval status (first by auth_user_id, then fallback to email)
    let { data: profile } = await queryClient
      .from('profiles')
      .select('id, status, role, first_name, last_name, username, auth_user_id')
      .eq('auth_user_id', userId)
      .maybeSingle();

    if (!profile) {
      const { data: profileByEmail } = await queryClient
        .from('profiles')
        .select('id, status, role, first_name, last_name, username, auth_user_id')
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
          username: profile?.username || 'andrei_admin',
          role: 'admin',
        },
      });
    }

    if (!profile) {
      const resub = getResubmission(userEmail);
      if (resub) {
        await supabase.auth.signOut();
        if (resub.email_verified) {
          return NextResponse.json({
            error: 'pending',
            message: 'Your registration is pending admin approval.',
            email: userEmail,
          }, { status: 403 });
        }
        return NextResponse.json({
          error: 'unverified_email',
          message: 'Your Gmail address has not been verified yet. Please enter the 6-digit verification code sent to your inbox.',
          email: userEmail,
          verifyUrl: `/register?verify=true&email=${encodeURIComponent(userEmail)}`,
        }, { status: 403 });
      }

      // Check if there's a pending registration request
      const { data: request } = await supabase
        .from('registration_requests')
        .select('id, status, email_verified_at')
        .eq('email', userEmail)
        .maybeSingle();

      await supabase.auth.signOut();

      if (request?.status === 'pending') {
        const isVerified = Boolean(
          request.email_verified_at ||
          isEmailVerified(userEmail)
        );

        if (!isVerified) {
          return NextResponse.json({
            error: 'unverified_email',
            message: 'Your Gmail address has not been verified yet. Please enter the 6-digit verification code sent to your inbox.',
            email: userEmail,
            verifyUrl: `/register?verify=true&email=${encodeURIComponent(userEmail)}`,
          }, { status: 403 });
        }

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
      const resub = getResubmission(userEmail);
      if (resub) {
        await supabase.auth.signOut();
        if (resub.email_verified) {
          return NextResponse.json({
            error: 'pending',
            message: 'Your registration is pending admin approval.',
            email: userEmail,
          }, { status: 403 });
        }
        return NextResponse.json({
          error: 'unverified_email',
          message: 'Your Gmail address has not been verified yet. Please enter the 6-digit verification code sent to your inbox.',
          email: userEmail,
          verifyUrl: `/register?verify=true&email=${encodeURIComponent(userEmail)}`,
        }, { status: 403 });
      }

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
        username: profile.username,
        role: profile.role,
      },
    });
  } catch (err) {
    console.error('Login API error:', err);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}
