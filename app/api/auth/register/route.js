import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { validateGmail, validatePassword, validateContactNumber } from '@/lib/utils/validation';
import { sendAdminRegistrationNotification, sendVerificationOtpEmail } from '@/lib/email/mailer';
import { createAndStoreOtp, isEmailVerified, removeEmailFromVerified } from '@/lib/security/otp';
import { recordResubmission, getResubmission } from '@/lib/security/resubmissions';

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

    const adminClient = createAdminClient();
    const queryClient = adminClient || (await createClient());

    // --- Check for duplicate email in registration_requests or active resubmissions ---
    const resubmission = getResubmission(cleanEmail);

    const { data: dbExisting } = await queryClient
      .from('registration_requests')
      .select('id, status, email, email_verified_at, first_name, last_name')
      .eq('email', cleanEmail)
      .maybeSingle();

    const existing = resubmission || dbExisting;

    if (existing) {
      if (existing.status === 'approved') {
        return NextResponse.json({
          error: 'This Gmail address is already registered and approved. Please log in.',
        }, { status: 409 });
      }

      if (existing.status === 'pending') {
        const isVerified = Boolean(
          existing.email_verified_at ||
          isEmailVerified(cleanEmail)
        );

        if (isVerified) {
          return NextResponse.json({
            error: 'This Gmail address has already been verified and is awaiting administrator review. It cannot be used to submit a new registration.',
          }, { status: 409 });
        }

        // If pending but not yet email-verified, resend verification OTP so applicant can finish verifying
        const otpRes = createAndStoreOtp({
          email: cleanEmail,
          purpose: 'registration',
          name: `${existing.first_name || firstName} ${existing.last_name || lastName}`.trim(),
        });

        if (otpRes.success) {
          sendVerificationOtpEmail({
            to: cleanEmail,
            applicantName: `${existing.first_name || firstName} ${existing.last_name || lastName}`.trim(),
            code: otpRes.code,
            expiresMinutes: 10,
          }).catch(console.warn);
        }

        return NextResponse.json({
          success: true,
          requireOtp: true,
          email: cleanEmail,
          requestId: existing.id,
          message: 'A verification code was sent to your Gmail address.',
        });
      }

      if (existing.status === 'rejected') {
        // Declined applicants are permitted to register again with the same Gmail address.
        // Purge any stale verified status so they can verify this new registration request afresh.
        removeEmailFromVerified(cleanEmail);
      }
    }

    // --- Also check approved profiles ---
    const { data: profileExists } = await queryClient
      .from('profiles')
      .select('id, status')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (profileExists && profileExists.status === 'approved') {
      return NextResponse.json({ error: 'An account with this Gmail address already exists. Please log in.' }, { status: 409 });
    }

    // --- Provision Supabase Auth User ---
    let authUserId = null;
    const supabase = await createClient();

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
          if (!existing || existing.status !== 'rejected') {
            return NextResponse.json({ error: 'This Gmail address is already registered in the system.' }, { status: 409 });
          }
        } else {
          console.warn('Admin createUser failed, falling back to signUp:', adminErr.message);
        }
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
          if (!existing || existing.status !== 'rejected') {
            return NextResponse.json({ error: 'This Gmail address is already registered in the system.' }, { status: 409 });
          }
        } else {
          console.error('Supabase signUp error:', signUpError);
          return NextResponse.json({ error: signUpError.message }, { status: 400 });
        }
      }

      if (signUpData?.user) {
        authUserId = signUpData.user.id;
      }

      // Guarantee email confirmation, password hash sync, and real auth.users UUID via SECURITY DEFINER RPC
      try {
        const { data: realAuthUid, error: rpcErr } = await supabase.rpc('sync_auth_user_credentials', {
          p_email: cleanEmail,
          p_password: password,
          p_first_name: firstName.trim(),
          p_last_name: lastName.trim(),
          p_username: finalUsername,
        });
        if (!rpcErr && realAuthUid) {
          authUserId = realAuthUid;
        }
      } catch (rpcEx) {
        console.warn('sync_auth_user_credentials RPC notice:', rpcEx?.message);
      }
    }

    // --- Save into registration_requests: update if previously rejected, else insert ---
    let finalRequestId = existing?.id;

    if (existing && existing.status === 'rejected') {
      recordResubmission({
        id: existing.id,
        email: cleanEmail,
        firstName,
        lastName,
        username: finalUsername,
        contactNumber,
        authUserId,
        authProvider: 'email',
      });

      const updateClient = adminClient || supabase;
      const { error: updateError } = await updateClient
        .from('registration_requests')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          username: finalUsername,
          contact_number: contactNumber?.trim() || null,
          auth_provider: 'email',
          google_id: authUserId,
          status: 'pending',
          email_verified_at: null,
          rejection_reason: null,
          reviewed_by: null,
          reviewed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.warn('Update rejected registration request in DB warning:', updateError);
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
          auth_provider: 'email',
          google_id: authUserId, // Store the auth.users UUID for linking on approval
          status: 'pending',
          email_verified_at: null,
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505' || insertError.message?.toLowerCase().includes('duplicate') || insertError.message?.toLowerCase().includes('unique')) {
          return NextResponse.json({
            error: 'This Gmail address already has a registered or pending account.',
          }, { status: 409 });
        }
        console.error('Insert registration request error:', insertError);
        return NextResponse.json({ error: 'Failed to submit registration. Please try again.' }, { status: 500 });
      }

      finalRequestId = request.id;
    }

    // Generate 6-digit OTP code and dispatch via Gmail SMTP
    const otpRes = createAndStoreOtp({
      email: cleanEmail,
      purpose: 'registration',
      name: `${firstName.trim()} ${lastName.trim()}`,
    });

    if (otpRes.success) {
      sendVerificationOtpEmail({
        to: cleanEmail,
        applicantName: `${firstName.trim()} ${lastName.trim()}`,
        code: otpRes.code,
        expiresMinutes: 10,
      }).catch((emailErr) => console.warn('Verification OTP email dispatch warning:', emailErr));
    }

    return NextResponse.json({
      success: true,
      requireOtp: true,
      email: cleanEmail,
      requestId: finalRequestId,
      message: 'Registration submitted. Please check your Gmail for your 6-digit verification code.',
    });
  } catch (err) {
    console.error('Register API error:', err);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}

