import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { validateGmail, validatePassword, validateContactNumber } from '@/lib/utils/validation';

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

    const supabase = await createClient();

    // --- Check for duplicate email in registration_requests ---
    const { data: existing } = await supabase
      .from('registration_requests')
      .select('id, status, email')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        error: 'This Gmail address already has a pending or approved registration.',
      }, { status: 409 });
    }

    // --- Also check approved profiles ---
    const { data: profileExists } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (profileExists) {
      return NextResponse.json({ error: 'An account with this Gmail address already exists.' }, { status: 409 });
    }

    // --- Provision Supabase Auth User ---
    let authUserId = null;
    const adminClient = createAdminClient();

    if (adminClient) {
      const { data: adminUser, error: adminErr } = await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password: password,
        email_confirm: true,
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
      });

      if (adminErr) {
        if (adminErr.message?.toLowerCase().includes('already registered')) {
          return NextResponse.json({ error: 'This Gmail address is already registered in the system.' }, { status: 409 });
        }
        console.warn('Admin createUser failed, falling back to signUp:', adminErr.message);
      } else if (adminUser?.user) {
        authUserId = adminUser.user.id;
      }
    }

    if (!authUserId) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: `${firstName.trim()} ${lastName.trim()}`,
            username: finalUsername,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message?.toLowerCase().includes('already registered')) {
          return NextResponse.json({ error: 'This Gmail address is already registered in the system.' }, { status: 409 });
        }
        console.error('Supabase signUp error:', signUpError);
        return NextResponse.json({ error: signUpError.message }, { status: 400 });
      }

      if (signUpData?.user) {
        authUserId = signUpData.user.id;
      }
    }

    // --- Insert into registration_requests ---
    const { data: request, error: insertError } = await supabase
      .from('registration_requests')
      .insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username: finalUsername,
        email: cleanEmail,
        contact_number: contactNumber?.trim() || null,
        auth_provider: 'email',
        google_id: authUserId, // Store the auth.users UUID for linking on approval
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert registration request error:', insertError);
      return NextResponse.json({ error: 'Failed to submit registration. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Registration submitted. Please wait for admin approval.',
      requestId: request.id,
    });
  } catch (err) {
    console.error('Register API error:', err);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}
