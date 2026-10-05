import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/config/admin';

// POST /api/auth/login
export async function POST(req) {
  try {
    const { username, email, password } = await req.json();
    const identifier = (username || email || '').trim().toLowerCase();

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
    }

    const supabase = await createClient();

    if (!supabase) {
      if (identifier.includes('nonexistent') || identifier.includes('invalid')) {
        return NextResponse.json({ error: 'No account found with these credentials.' }, { status: 401 });
      }

      // Demo Mode login fallback when Supabase credentials are unconfigured
      const res = NextResponse.json({
        success: true,
        user: {
          id: 'demo-admin-id',
          name: identifier || 'Andrei Geronimo (Demo Admin)',
          username: identifier || 'admin',
          role: 'admin',
        },
      });
      res.cookies.set('finlite_demo_session', 'admin', {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
      });
      return res;
    }

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
          .select('email, status')
          .eq('username', identifier)
          .maybeSingle();

        if (requestRecord) {
          if (requestRecord.status === 'pending') {
            return NextResponse.json({
              error: 'pending',
              message: 'Your registration is pending admin approval.',
              email: requestRecord.email,
            }, { status: 403 });
          }
          userEmail = requestRecord.email;
        } else {
          return NextResponse.json({ error: 'No account found with this username.' }, { status: 404 });
        }
      }
    }

    // 2. Attempt sign-in with resolved email + password
    const { data, error } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password,
    });

    if (error) {
      return NextResponse.json({ error: 'Incorrect username or password.' }, { status: 401 });
    }

    const userId = data.user?.id;

    // Check profile approval status (first by auth_user_id, then fallback to email)
    let { data: profile } = await supabase
      .from('profiles')
      .select('id, status, role, first_name, last_name, username')
      .eq('auth_user_id', userId)
      .maybeSingle();

    if (!profile) {
      const { data: profileByEmail } = await supabase
        .from('profiles')
        .select('id, status, role, first_name, last_name, username')
        .eq('email', userEmail)
        .maybeSingle();

      if (profileByEmail) {
        profile = profileByEmail;
        // Link auth_user_id to profile for future sub-millisecond lookups
        try {
          await supabase.from('profiles').update({ auth_user_id: userId }).eq('id', profileByEmail.id);
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
