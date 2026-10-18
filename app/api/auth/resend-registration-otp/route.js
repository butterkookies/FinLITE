import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createAndStoreOtp, getCooldownRemaining, isEmailVerified } from '@/lib/security/otp';
import { sendVerificationOtpEmail } from '@/lib/email/mailer';
import { getResubmission } from '@/lib/security/resubmissions';

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if already verified in persistent cache
    if (isEmailVerified(cleanEmail)) {
      return NextResponse.json({
        error: 'This Gmail address has already been verified and is awaiting administrator review.',
      }, { status: 409 });
    }

    const adminClient = createAdminClient();
    const supabase = adminClient || (await createClient());

    // Fetch applicant record and check verification status
    const { data: request } = await supabase
      .from('registration_requests')
      .select('first_name, last_name, email_verified_at, status')
      .eq('email', cleanEmail)
      .maybeSingle();

    const resubmission = getResubmission(cleanEmail);
    const existing = resubmission || request;

    if (existing) {
      if (existing.status === 'approved') {
        return NextResponse.json({
          error: 'This Gmail address is already registered and approved. Please log in.',
        }, { status: 409 });
      }

      const isVerified = Boolean(
        existing.email_verified_at ||
        existing.email_verified ||
        isEmailVerified(cleanEmail)
      );

      if (isVerified) {
        return NextResponse.json({
          error: 'This Gmail address has already been verified and is awaiting administrator review.',
        }, { status: 409 });
      }

      if (existing.status === 'rejected' && !resubmission) {
        return NextResponse.json({
          error: 'This registration request was previously rejected. Please submit a new registration.',
        }, { status: 409 });
      }
    }

    // Check cooldown
    const cooldown = getCooldownRemaining({ email: cleanEmail, purpose: 'registration' });
    if (cooldown > 0) {
      return NextResponse.json({
        error: `Please wait ${cooldown} second${cooldown === 1 ? '' : 's'} before requesting another code.`,
        cooldownSeconds: cooldown,
      }, { status: 429 });
    }

    const applicantName = (existing?.first_name && existing?.last_name)
      ? `${existing.first_name} ${existing.last_name}`.trim()
      : (request ? `${request.first_name || ''} ${request.last_name || ''}`.trim() : 'Applicant');

    // Generate new OTP
    const otpRes = createAndStoreOtp({
      email: cleanEmail,
      purpose: 'registration',
      name: applicantName,
    });

    if (!otpRes.success) {
      return NextResponse.json({ error: otpRes.error, cooldownRemaining: otpRes.cooldownRemaining }, { status: 429 });
    }

    // Send email
    await sendVerificationOtpEmail({
      to: cleanEmail,
      applicantName,
      code: otpRes.code,
      expiresMinutes: 10,
    });

    return NextResponse.json({
      success: true,
      message: 'A fresh verification code has been dispatched to your Gmail.',
      cooldownSeconds: 60,
    });
  } catch (err) {
    console.error('Resend registration OTP error:', err);
    return NextResponse.json({ error: 'Server error resending code. Please try again.' }, { status: 500 });
  }
}
