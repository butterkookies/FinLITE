import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { validateGmail, validatePassword, validateContactNumber } from '@/lib/utils/validation';
import { resolveAppUrl } from '@/lib/auth/app-url';
import { getAuthMethods } from '@/lib/auth/methods';
import { discardUnverifiedRegistration, createVerificationLink } from '@/lib/auth/registration';
import { sendVerificationEmail } from '@/lib/email/auth-mailer';

// POST /api/auth/register
//
// Creates an UNVERIFIED account and emails a verification link. The admin is
// only notified (and the request only becomes approvable) once the applicant
// proves they own the inbox by opening that link.
export async function POST(req) {
  try {
    const { firstName, lastName, username, email, contactNumber, password } = await req.json();

    // --- Validation ---
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ error: 'First name and last name are required.' }, { status: 400 });
    }

    const emailError = validateGmail(email);
    if (emailError) {
      return NextResponse.json({ error: emailError }, { status: 400 });
    }

    const contactError = validateContactNumber(contactNumber);
    if (contactError) {
      return NextResponse.json({ error: contactError }, { status: 400 });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const fallbackUsername = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') + '_' + Math.random().toString(36).substring(2, 6);
    const finalUsername = (username?.trim() || fallbackUsername).toLowerCase();

    // Email verification needs the service-role client (to mint the one-time
    // link). There is deliberately no unverified fallback.
    const adminClient = createAdminClient();
    if (!adminClient) {
      console.error('Registration unavailable: SUPABASE_SERVICE_ROLE_KEY is not configured.');
      return NextResponse.json(
        { error: 'Registration is temporarily unavailable. Please contact the administrator.' },
        { status: 503 }
      );
    }

    // --- Existing registration request for this email? ---
    const { data: existing } = await adminClient
      .from('registration_requests')
      .select('id, status, email, auth_provider, google_id, email_verified_at')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'rejected') {
        // Declined applicant is re-registering: clean up the old rejected record so they can submit fresh
        await adminClient.from('registration_requests').delete().eq('id', existing.id);
      } else {
        // An unverified email registration never proved it owns the inbox, so it
        // must not lock the real owner out. Anything verified or approved stays.
        const discarded = await discardUnverifiedRegistration(adminClient, existing);
        if (!discarded) {
          return NextResponse.json({
            error: 'This Gmail address already has a pending or approved registration.',
          }, { status: 409 });
        }
      }
    }

    // --- Also check approved profiles ---
    const { data: profileExists } = await adminClient
      .from('profiles')
      .select('id, status')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (profileExists && profileExists.status !== 'rejected') {
      return NextResponse.json({ error: 'An account with this Gmail address already exists.' }, { status: 409 });
    }

    // --- Provision the auth user, email NOT confirmed ---
    const createPayload = {
      email: cleanEmail,
      password,
      email_confirm: false,
      user_metadata: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: `${firstName.trim()} ${lastName.trim()}`,
        username: finalUsername,
      },
      app_metadata: {
        status: 'pending',
        role: 'treasurer',
      },
    };

    let { data: adminUser, error: adminErr } = await adminClient.auth.admin.createUser(createPayload);

    if (adminErr?.message?.toLowerCase().includes('already')) {
      // A leftover unverified or previously rejected auth user may exist.
      // Clear it if it is unverified or was rejected.
      const leftover = await getAuthMethods(adminClient, { email: cleanEmail });
      if (leftover.found) {
        const { data: oldProfile } = await adminClient.from('profiles').select('status').eq('id', leftover.user_id).maybeSingle();
        if (!leftover.email_confirmed || oldProfile?.status === 'rejected') {
          if (oldProfile?.status === 'rejected') {
            await adminClient.from('profiles').delete().eq('id', leftover.user_id);
          }
          await adminClient.auth.admin.deleteUser(leftover.user_id);
          ({ data: adminUser, error: adminErr } = await adminClient.auth.admin.createUser(createPayload));
        }
      }
    }

    if (adminErr || !adminUser?.user) {
      if (adminErr?.message?.toLowerCase().includes('already')) {
        return NextResponse.json({ error: 'This Gmail address is already registered in the system.' }, { status: 409 });
      }
      console.error('Admin createUser failed:', adminErr?.message);
      return NextResponse.json({ error: 'Failed to create your account. Please try again.' }, { status: 500 });
    }

    const authUserId = adminUser.user.id;

    // --- Insert into registration_requests (verification pending) ---
    const { data: request, error: insertError } = await adminClient
      .from('registration_requests')
      .insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username: finalUsername,
        email: cleanEmail,
        contact_number: contactNumber?.trim() || null,
        auth_provider: 'email',
        google_id: authUserId, // auth.users UUID, used to link the profile on approval
        status: 'pending',
        email_verified_at: null,
      })
      .select()
      .single();

    if (insertError) {
      // Do not leave an orphaned unverified auth user behind.
      await adminClient.auth.admin.deleteUser(authUserId).catch(() => {});
      if (insertError.code === '23505' || insertError.message?.toLowerCase().includes('duplicate') || insertError.message?.toLowerCase().includes('unique')) {
        return NextResponse.json({
          error: 'This Gmail address or username already has a registered or pending account.',
        }, { status: 409 });
      }
      console.error('Insert registration request error:', insertError);
      return NextResponse.json({ error: 'Failed to submit registration. Please try again.' }, { status: 500 });
    }

    // --- Send the verification email ---
    const verifyUrl = await createVerificationLink(adminClient, cleanEmail, resolveAppUrl(req));
    let emailSent = false;
    if (verifyUrl) {
      const result = await sendVerificationEmail({
        to: cleanEmail,
        name: firstName.trim(),
        verifyUrl,
      });
      emailSent = result.success;
    }

    return NextResponse.json({
      success: true,
      requiresVerification: true,
      emailSent,
      email: cleanEmail,
      message: emailSent
        ? 'Check your inbox to verify your email. An administrator reviews your request after that.'
        : 'Your request was saved, but we could not send the verification email. Use "Resend verification email" on the next page.',
      requestId: request.id,
    });
  } catch (err) {
    console.error('Register API error:', err);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}
