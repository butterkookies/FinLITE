import { NextResponse } from 'next/server';
import { deliverEmail } from '@/lib/email/auth-mailer';

// GET /api/test-email?to=your_email@gmail.com
// Diagnostic endpoint to verify Resend and SMTP deliverability on Render
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const to = searchParams.get('to');

  const resendKeyPresent = Boolean(process.env.RESEND_API_KEY);
  const resendKeyPrefix = process.env.RESEND_API_KEY
    ? `${process.env.RESEND_API_KEY.trim().substring(0, 6)}...`
    : null;

  if (!to) {
    return NextResponse.json({
      message: 'FinLITE Email Diagnostic Endpoint',
      usage: 'Pass ?to=your_email@gmail.com to test sending a real email',
      environment: {
        hasResendApiKey: resendKeyPresent,
        resendKeyPrefix,
        emailFromConfigured: process.env.EMAIL_FROM || '(using default FinLITE Security <onboarding@resend.dev>)',
        smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
        smtpPort: process.env.SMTP_PORT || '465',
        hasSmtpPass: Boolean(process.env.SMTP_PASS),
        appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        nodeEnv: process.env.NODE_ENV,
      },
    });
  }

  const result = await deliverEmail({
    to,
    subject: 'FinLITE Email Delivery Test',
    html: `
      <div style="font-family:sans-serif;padding:20px;border:1px solid #e2e8f0;border-radius:12px;max-width:500px;">
        <h2 style="color:#047857;margin-top:0;">FinLITE Email Test Successful</h2>
        <p>If you are seeing this message, your mail configuration is operational!</p>
        <p style="font-size:12px;color:#64748b;">Sent at ${new Date().toISOString()} via ${result?.provider || 'unknown'}</p>
      </div>
    `,
    text: `FinLITE Email Test: successfully delivered to ${to} at ${new Date().toISOString()}.`,
  });

  return NextResponse.json({
    diagnostics: {
      hasResendApiKey: resendKeyPresent,
      resendKeyPrefix,
      emailFrom: process.env.EMAIL_FROM || 'FinLITE Security <onboarding@resend.dev>',
      targetRecipient: to,
    },
    deliveryResult: result,
  });
}
