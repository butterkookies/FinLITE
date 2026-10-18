import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { validateGmail } from '@/lib/utils/validation';
import { createAndStoreOtp, getCooldownRemaining } from '@/lib/security/otp';
import { sendPasswordResetOtpEmail } from '@/lib/email/mailer';

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email?.trim()) {
      return NextResponse.json({ error: 'Gmail address is required.' }, { status: 400 });
    }

    const emailErr = validateGmail(email);
    if (emailErr) {
      return NextResponse.json({ error: emailErr }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check resend cooldown
    const cooldown = getCooldownRemaining({ email: cleanEmail, purpose: 'password_reset' });
    if (cooldown > 0) {
      return NextResponse.json({
        error: `Please wait ${cooldown} second${cooldown === 1 ? '' : 's'} before requesting another code.`,
        cooldownSeconds: cooldown,
      }, { status: 429 });
    }

    const adminClient = createAdminClient();
    const supabase = adminClient || (await createClient());

    // Look up user name if profile exists
    let userName = 'Officer';
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, first_name')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (profile?.first_name || profile?.full_name) {
        userName = profile.first_name || profile.full_name;
      }
    } catch (_) {
      // Non-fatal
    }

    // Generate 6-digit OTP code
    const otpRes = createAndStoreOtp({
      email: cleanEmail,
      purpose: 'password_reset',
      name: userName,
    });

    if (!otpRes.success) {
      return NextResponse.json({ error: otpRes.error, cooldownRemaining: otpRes.cooldownRemaining }, { status: 429 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const hybridResetUrl = `${appUrl}/reset-password?code=${otpRes.code}&email=${encodeURIComponent(cleanEmail)}`;

    // Dispatch hybrid email via dedicated Gmail SMTP
    await sendPasswordResetOtpEmail({
      to: cleanEmail,
      name: userName,
      code: otpRes.code,
      resetUrl: hybridResetUrl,
      expiresMinutes: 10,
    });

    // Also trigger Supabase's native recovery in background if configured
    try {
      const client = await createClient();
      if (client?.auth?.resetPasswordForEmail) {
        client.auth.resetPasswordForEmail(cleanEmail, { redirectTo: hybridResetUrl }).catch(() => {});
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: 'Password recovery instructions have been sent to your Gmail inbox.',
      email: cleanEmail,
      cooldownSeconds: 60,
    });
  } catch (err) {
    console.error('Forgot password API error:', err);
    return NextResponse.json({ error: 'Server error processing password recovery. Please try again.' }, { status: 500 });
  }
}
