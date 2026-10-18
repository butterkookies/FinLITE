import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { validateContactNumber } from '@/lib/utils/validation';
import { sendAdminRegistrationNotification } from '@/lib/email/mailer';
import { isEmailVerified, removeEmailFromVerified } from '@/lib/security/otp';
import { recordResubmission, markResubmissionVerified } from '@/lib/security/resubmissions';

// POST /api/auth/google-register
// Called when a new Google OAuth user completes profile setup
export async function POST(req) {
  try {
    const { firstName, lastName, username, email, contactNumber, googleUid, avatarUrl } = await req.json();

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'First name, last name, and email are required.' }, { status: 400 });
    }

    const contactError = validateContactNumber(contactNumber);
    if (contactError) {
      return NextResponse.json({ error: contactError }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const fallbackUsername = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') + '_' + Math.random().toString(36).substring(2, 6);
    const finalUsername = (username?.trim() || fallbackUsername).toLowerCase();

    const adminClient = createAdminClient();
    const supabase = await createClient();
    const queryClient = adminClient || supabase;

    // Check for duplicate registration request by email
    const { data: dup } = await queryClient
      .from('registration_requests')
      .select('id, email, status')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (dup) {
      if (dup.status === 'approved') {
        return NextResponse.json({
          error: 'This Gmail address is already registered and approved. Please log in.',
        }, { status: 409 });
      }

      if (dup.status === 'pending') {
        return NextResponse.json({
          error: 'A registration request with this Gmail already exists and is awaiting administrator review.',
        }, { status: 409 });
      }

      if (dup.status === 'rejected') {
        removeEmailFromVerified(cleanEmail);
      }
    }

    // Check profiles for existing approved account
    const { data: profileExists } = await queryClient
      .from('profiles')
      .select('id, status')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (profileExists && profileExists.status === 'approved') {
      return NextResponse.json({
        error: 'An account with this Gmail address already exists. Please log in.',
      }, { status: 409 });
    }

    let finalRequestId = dup?.id;

    if (dup && dup.status === 'rejected') {
      recordResubmission({
        id: dup.id,
        email: cleanEmail,
        firstName,
        lastName,
        username: finalUsername,
        contactNumber,
        authUserId: googleUid,
        authProvider: 'google',
      });
      markResubmissionVerified(cleanEmail);

      const updateClient = adminClient || supabase;
      const { error: updateError } = await updateClient
        .from('registration_requests')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          username: finalUsername,
          contact_number: contactNumber?.trim() || null,
          auth_provider: 'google',
          google_id: googleUid || null,
          avatar_url: avatarUrl || null,
          status: 'pending',
          email_verified_at: new Date().toISOString(),
          rejection_reason: null,
          reviewed_by: null,
          reviewed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dup.id);

      if (updateError) {
        console.warn('Google register update warning:', updateError);
      }
    } else {
      const insertClient = adminClient || supabase;
      const { data: request, error: insertError } = await insertClient
        .from('registration_requests')
        .insert({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          username: finalUsername,
          email: cleanEmail,
          contact_number: contactNumber?.trim() || null,
          auth_provider: 'google',
          google_id: googleUid || null,
          avatar_url: avatarUrl || null,
          status: 'pending',
          email_verified_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505' || insertError.message?.toLowerCase().includes('duplicate') || insertError.message?.toLowerCase().includes('unique')) {
          return NextResponse.json({
            error: 'A registration request with this Gmail address already exists.',
          }, { status: 409 });
        }
        console.error('Google register insert error:', insertError);
        return NextResponse.json({ error: 'Failed to submit registration. Please try again.' }, { status: 500 });
      }

      finalRequestId = request.id;
    }

    // Send email notification to admins asynchronously
    sendAdminRegistrationNotification({
      applicantName: `${firstName.trim()} ${lastName.trim()}`,
      email: cleanEmail,
      username: finalUsername,
      contactNumber: contactNumber?.trim() || null,
      authProvider: 'google',
    }).catch((emailErr) => console.warn('Admin notification email warning:', emailErr));

    return NextResponse.json({
      success: true,
      message: 'Your profile has been submitted for admin approval.',
      requestId: finalRequestId,
    });
  } catch (err) {
    console.error('Google register API error:', err);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}
