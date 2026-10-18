import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { verifyOtp, markEmailAsVerified, isEmailVerified } from '@/lib/security/otp';
import { sendAdminRegistrationNotification } from '@/lib/email/mailer';
import { markResubmissionVerified } from '@/lib/security/resubmissions';

export async function POST(req) {
  try {
    const { email, code } = await req.json();

    if (!email?.trim() || !code?.trim()) {
      return NextResponse.json({ error: 'Email and verification code are required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // If already verified, succeed gracefully
    if (isEmailVerified(cleanEmail)) {
      return NextResponse.json({
        success: true,
        verified: true,
        alreadyVerified: true,
        message: 'This Gmail address has already been verified and is awaiting admin approval.',
      });
    }

    // Verify OTP code
    const verification = verifyOtp({
      email: cleanEmail,
      purpose: 'registration',
      code: code.trim(),
    });

    if (!verification.valid) {
      return NextResponse.json({ error: verification.error }, { status: 400 });
    }

    // Mark verified in persistent cache immediately
    markEmailAsVerified(cleanEmail);
    markResubmissionVerified(cleanEmail);

    const adminClient = createAdminClient();
    const supabase = adminClient || (await createClient());

    const now = new Date().toISOString();

    // 1. Try RPC if available (SECURITY DEFINER bypasses RLS)
    try {
      await supabase.rpc('verify_registration_email', { p_email: cleanEmail });
    } catch (_) {}

    // 2. Try direct table update on verified_at timestamp
    try {
      await supabase
        .from('registration_requests')
        .update({
          email_verified_at: now,
          updated_at: now,
        })
        .eq('email', cleanEmail);
    } catch (updateErr) {
      console.warn('Direct update notice (persisted via verified store):', updateErr?.message);
    }

    // 3. Resolve applicant details for Super Admin notification
    let applicantName = verification.name || 'Applicant';
    let reqUsername = cleanEmail.split('@')[0];
    let reqContact = null;
    let reqAuth = 'email';

    try {
      const { data: reqData } = await supabase
        .from('registration_requests')
        .select('first_name, last_name, username, contact_number, auth_provider')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (reqData) {
        applicantName = `${reqData.first_name || ''} ${reqData.last_name || ''}`.trim() || applicantName;
        reqUsername = reqData.username || reqUsername;
        reqContact = reqData.contact_number || null;
        reqAuth = reqData.auth_provider || reqAuth;
      }
    } catch (_) {}

    // Notify Super Admins that a verified registration is pending review
    sendAdminRegistrationNotification({
      applicantName,
      email: cleanEmail,
      username: reqUsername,
      contactNumber: reqContact,
      authProvider: reqAuth,
    }).catch((emailErr) => console.warn('Admin notification warning:', emailErr));

    return NextResponse.json({
      success: true,
      verified: true,
      message: 'Email address successfully verified. Your application is now in the admin approval queue.',
    });
  } catch (err) {
    console.error('Verify registration OTP error:', err);
    return NextResponse.json({ error: 'Server error verifying code. Please try again.' }, { status: 500 });
  }
}
