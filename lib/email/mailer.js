import nodemailer from 'nodemailer';
import { getSuperAdminEmails } from '@/lib/config/admin';

/**
 * Creates a Nodemailer transporter using environment variables.
 * Falls back to null if SMTP credentials are not configured.
 */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

/**
 * Sends an email notification to admins about a new registration request.
 * 
 * @param {Object} params
 * @param {string} params.applicantName
 * @param {string} params.email
 * @param {string} params.username
 * @param {string} [params.contactNumber]
 * @param {string} [params.authProvider='email']
 * @returns {Promise<{ success: boolean, simulated?: boolean, error?: string }>}
 */
export async function sendAdminRegistrationNotification({
  applicantName,
  email,
  username,
  contactNumber,
  authProvider = 'email',
}) {
  const adminEmails = getSuperAdminEmails();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const adminUrl = `${appUrl}/admin`;

  const subject = `[FinLITE Action Required] New Registration Pending Approval: ${applicantName}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8faf9; margin: 0; padding: 20px; color: #1e293b; }
    .card { max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #064e3b; padding: 24px 32px; color: #ffffff; text-align: left; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
    .header p { margin: 4px 0 0 0; font-size: 13px; color: #a7f3d0; }
    .content { padding: 32px; }
    .alert-box { background: #ecfdf5; border-left: 4px solid #059669; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; }
    .alert-box p { margin: 0; font-size: 13px; color: #065f46; font-weight: 500; }
    .table-details { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .table-details td { padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .table-details .label { color: #64748b; font-weight: 500; width: 35%; }
    .table-details .value { color: #0f172a; font-weight: 600; }
    .cta-btn { display: inline-block; background-color: #047857; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 13px; font-weight: 600; text-align: center; }
    .footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>FinLITE Account Registration</h1>
      <p>Pambayang Dalubhasaan ng Marilao — LITE Financial System</p>
    </div>
    <div class="content">
      <div class="alert-box">
        <p>A new applicant has registered and is waiting for your administrative approval.</p>
      </div>
      <table class="table-details">
        <tr>
          <td class="label">Applicant Name</td>
          <td class="value">${applicantName}</td>
        </tr>
        <tr>
          <td class="label">Gmail Address</td>
          <td class="value">${email}</td>
        </tr>
        <tr>
          <td class="label">Preferred Username</td>
          <td class="value">@${username}</td>
        </tr>
        <tr>
          <td class="label">Contact Number</td>
          <td class="value">${contactNumber || 'Not provided'}</td>
        </tr>
        <tr>
          <td class="label">Registration Method</td>
          <td class="value">${authProvider === 'google' ? 'Google OAuth 2.0' : 'Email & Password'}</td>
        </tr>
        <tr>
          <td class="label">Submitted At</td>
          <td class="value">${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</td>
        </tr>
      </table>
      <div style="text-align: center; margin-top: 28px;">
        <a href="${adminUrl}" class="cta-btn">Open Admin Console to Review & Approve</a>
      </div>
    </div>
    <div class="footer">
      This is an automated system notification from FinLITE. You received this because you are designated as a Super Admin.
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
FinLITE Account Registration Pending Approval

A new applicant has submitted a registration request:
- Applicant: ${applicantName}
- Gmail: ${email}
- Username: @${username}
- Contact: ${contactNumber || 'Not provided'}
- Method: ${authProvider}
- Submitted: ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}

To approve or reject this request, open the Admin Console:
${adminUrl}
  `.trim();

  // 1. Try Resend if configured
  if (process.env.RESEND_API_KEY) {
    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'FinLITE Notifications <onboarding@resend.dev>',
          to: adminEmails,
          subject,
          html: htmlContent,
          text: textContent,
        }),
      });

      if (resendRes.ok) {
        return { success: true };
      }
      const errData = await resendRes.json();
      console.warn('Resend email error:', errData);
    } catch (resendErr) {
      console.warn('Resend request failed:', resendErr);
    }
  }

  // 2. Try SMTP Nodemailer if configured
  const transporter = createTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"FinLITE System" <${process.env.SMTP_USER}>`,
        to: adminEmails.join(', '),
        subject,
        text: textContent,
        html: htmlContent,
      });
      return { success: true };
    } catch (smtpErr) {
      console.warn('Nodemailer SMTP failed:', smtpErr?.message);
    }
  }

  // 3. Fallback / Dev Mode Simulation: Log cleanly without failing
  console.log('---------------------------------------------------------');
  console.log('📧 [FINLITE EMAIL NOTIFICATION DISPATCHED TO ADMINS]');
  console.log(`To: ${adminEmails.join(', ')}`);
  console.log(`Subject: ${subject}`);
  console.log(`Applicant: ${applicantName} (${email}, @${username})`);
  console.log(`Admin Review URL: ${adminUrl}`);
  console.log('---------------------------------------------------------');

  return { success: true, simulated: true };
}
