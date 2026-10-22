import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { validateContactNumber } from '@/lib/utils/validation';
import { sendAdminRegistrationNotification } from '@/lib/email/mailer';
import { isReplaceableRegistration } from '@/lib/auth/policy';
import { discardUnverifiedRegistration } from '@/lib/auth/registration';

// GET /api/auth/google-register
// Returns the verified Google identity of the current (not yet approved)
// session so the registration form can pre-fill it.
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
    const hasGoogle = (user?.identities || []).some((i) => i.provider === 'google');
    if (!user || !hasGoogle || !user.email_confirmed_at) {
      return NextResponse.json({ error: 'Google sign-in required.' }, { status: 401 });
    }
    return NextResponse.json({
      success: true,
      email: user.email?.toLowerCase(),
      name: user.user_metadata?.full_name || user.user_metadata?.name || '',
      avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
    });
  } catch (err) {
    console.error('Google register GET error:', err);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}

// POST /api/auth/google-register
// Called when a new Google OAuth user completes profile setup.
//
// The email, Google user id and avatar come from the verified session, NOT from
// the request body: anyone can POST arbitrary JSON, so body values for identity
// fields are ignored.
export async function POST(req) {
  try {
    const { firstName, lastName, username, contactNumber } = await req.json();

    // Cheap input validation first, then the identity check.
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ error: 'First name and last name are required.' }, { status: 400 });
    }

    const contactError = validateContactNumber(contactNumber);
    if (contactError) {
      return NextResponse.json({ error: contactError }, { status: 400 });
    }

    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

    const hasGoogle = (user?.identities || []).some((i) => i.provider === 'google');
    if (!user || !hasGoogle || !user.email_confirmed_at || !user.email) {
      return NextResponse.json({ error: 'Please sign in with Google first.' }, { status: 401 });
    }

    const cleanEmail = user.email.trim().toLowerCase();
    const googleUid = user.id;
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
    const fallbackUsername = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') + '_' + Math.random().toString(36).substring(2, 6);
    const finalUsername = (username?.trim() || fallbackUsername).toLowerCase();

    const queryClient = adminClient || supabase;

    // Check for duplicate registration request by email
    const { data: dup } = await queryClient
      .from('registration_requests')
      .select('id, email, status, auth_provider, google_id, email_verified_at')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (dup) {
      // A Google-verified owner outranks an unverified email/password squatter.
      let cleared = false;
      if (adminClient && dup.status === 'rejected') {
        const { error: delErr } = await adminClient.from('registration_requests').delete().eq('id', dup.id);
        cleared = !delErr;
      } else if (adminClient && isReplaceableRegistration(dup)) {
        if (dup.google_id === googleUid) {
          const { error: delErr } = await adminClient.from('registration_requests').delete().eq('id', dup.id);
          cleared = !delErr;
        } else {
          cleared = await discardUnverifiedRegistration(adminClient, dup);
        }
      }
      if (!cleared) {
        return NextResponse.json({
          error: 'A registration request with this Gmail already exists. Please wait for admin approval.',
        }, { status: 409 });
      }
    }

    // Insert registration request (Google already verified the mailbox)
    const { data: request, error } = await queryClient
      .from('registration_requests')
      .insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username: finalUsername,
        email: cleanEmail,
        contact_number: contactNumber?.trim() || null,
        auth_provider: 'google',
        google_id: googleUid,
        avatar_url: avatarUrl,
        status: 'pending',
        email_verified_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505' || error.message?.toLowerCase().includes('duplicate') || error.message?.toLowerCase().includes('unique')) {
        return NextResponse.json({
          error: 'A registration request with this Gmail address or username already exists.',
        }, { status: 409 });
      }
      console.error('Google register insert error:', error);
      return NextResponse.json({ error: 'Failed to submit registration. Please try again.' }, { status: 500 });
    }

    // Send email notification to admins asynchronously
    sendAdminRegistrationNotification({
      applicantName: `${firstName.trim()} ${lastName.trim()}`,
      email: cleanEmail,
      username: finalUsername,
      contactNumber: contactNumber?.trim() || null,
      authProvider: 'google',
    }).catch((emailErr) => console.warn('Admin notification email warning:', emailErr));

    // The applicant cannot use the app until approved; end the temporary session.
    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
      message: 'Your profile has been submitted for admin approval.',
      requestId: request.id,
    });
  } catch (err) {
    console.error('Google register API error:', err);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}
