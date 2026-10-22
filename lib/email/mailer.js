import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { getSuperAdminEmails } from '../config/admin.js';

/**
 * Creates a Nodemailer transporter using environment variables.
 * Defaults to smtp.gmail.com:465 with SSL when configured.
 */
export function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const user = process.env.SMTP_USER || 'finlite.pdm@gmail.com';
  const pass = process.env.SMTP_PASS;

  if (!pass) {
    return null;
  }

  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE !== 'false' && (port === 465 || process.env.SMTP_SECURE === 'true');

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

const DEFAULT_SENDER = process.env.SMTP_FROM || '"FinLITE System" <finlite.pdm@gmail.com>';

/**
 * Resolves optimized CID inline attachments for institutional logos.
 * Uses lightweight optimized images (quality/resolution reduced by 20-25%) for high-speed delivery.
 */
function getEmailAttachments() {
  const assetsDir = path.join(process.cwd(), 'public', 'assets');
  const liteOpt = path.join(assetsDir, 'lite-logo-opt.png');
  const pdmOpt = path.join(assetsDir, 'pdm-logo-opt.jpg');
  const liteOrig = path.join(assetsDir, 'lite-logo.png');
  const pdmOrig = path.join(assetsDir, 'pdm-logo.jpg');

  const litePath = fs.existsSync(liteOpt) ? liteOpt : (fs.existsSync(liteOrig) ? liteOrig : null);
  const pdmPath = fs.existsSync(pdmOpt) ? pdmOpt : (fs.existsSync(pdmOrig) ? pdmOrig : null);

  const attachments = [];
  if (litePath) {
    attachments.push({
      filename: 'lite-logo.png',
      path: litePath,
      cid: 'finlite-logo',
    });
  }
  if (pdmPath) {
    attachments.push({
      filename: 'pdm-logo.jpg',
      path: pdmPath,
      cid: 'finlite-pdm-logo',
    });
  }
  return attachments;
}

/**
 * Generic internal mail dispatcher that handles Nodemailer delivery and clean fallback logging.
 */
async function dispatchMail({ to, bcc, subject, text, html, attachments = null }) {
  if (process.env.RESEND_API_KEY) {
    try {
      let from = process.env.EMAIL_FROM || 'FinLITE System <onboarding@resend.dev>';
      if (from.includes('@gmail.com')) {
        from = 'FinLITE System <onboarding@resend.dev>';
      }

      const resendPayload = {
        from,
        subject,
        html,
        text,
      };

      if (to) {
        resendPayload.to = Array.isArray(to) ? to : [to];
        if (bcc) {
          resendPayload.bcc = Array.isArray(bcc) ? bcc : [bcc];
        }
      } else if (bcc) {
        const bccList = Array.isArray(bcc) ? bcc : [bcc];
        if (bccList.length > 0) {
          resendPayload.to = [from];
          resendPayload.bcc = bccList;
        }
      }

      if (resendPayload.to && resendPayload.to.length > 0) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(resendPayload),
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          return { success: true, messageId: data?.id, provider: 'resend' };
        }
        console.error('[FinLITE Mailer] Resend dispatch error:', res.status, data);
      }
    } catch (err) {
      console.warn('[FinLITE Mailer] Resend fetch error:', err?.message);
    }
  }
  const transporter = createTransporter();
  const emailAttachments = attachments || getEmailAttachments();

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: DEFAULT_SENDER,
        to: to || undefined,
        bcc: bcc || undefined,
        subject,
        text,
        html,
        attachments: emailAttachments,
      });
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.warn(`[FinLITE Mailer] SMTP delivery to "${to || bcc}" failed:`, err?.message);
      return { success: false, error: err?.message };
    }
  }

  // Simulated fallback in case SMTP credentials are not yet set
  console.log('---------------------------------------------------------');
  console.log(`📧 [FINLITE EMAIL SIMULATION]`);
  console.log(`To: ${to || '(BCC broadcast)'}`);
  if (bcc) console.log(`BCC: ${Array.isArray(bcc) ? bcc.join(', ') : bcc}`);
  console.log(`Subject: ${subject}`);
  console.log(`Text summary: ${text?.slice(0, 160)}...`);
  console.log('---------------------------------------------------------');
  return { success: true, simulated: true };
}

/**
 * Core HTML Email Wrapper reflecting PDM CCS / FinLITE institutional branding.
 */
function buildFinLiteEmailHtml({
  badgeText = 'FINLITE NOTIFICATION',
  badgeColor = '#065f46',
  badgeBg = '#ecfdf5',
  title,
  subtitle = 'League of Information Technology Enthusiasts • Pambayang Dalubhasaan ng Marilao',
  bodyHtml,
  ctaText = null,
  ctaUrl = null,
  footerNote = 'This is an automated system notification from FinLITE.',
}) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8faf9; margin: 0; padding: 24px 12px; color: #1e293b; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 12px -2px rgba(0,0,0,0.06); }
    .header { background: #064e3b; padding: 28px 32px; color: #ffffff; text-align: left; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.25; }
    .header p { margin: 6px 0 0 0; font-size: 13px; color: #a7f3d0; opacity: 0.95; line-height: 1.4; }
    .content { padding: 32px; }
    .badge { display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; padding: 5px 12px; border-radius: 9999px; margin-bottom: 20px; color: ${badgeColor}; background-color: ${badgeBg}; }
    .lead-text { font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0; }
    .detail-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .otp-code-box { background: #ecfdf5; border: 2px dashed #059669; border-radius: 12px; padding: 18px 24px; text-align: center; margin: 24px 0; }
    .otp-digits { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #064e3b; margin: 0; }
    .cta-container { text-align: center; margin: 28px 0 10px 0; }
    .cta-button { display: inline-block; background-color: #047857; color: #ffffff !important; text-decoration: none; padding: 13px 28px; border-radius: 10px; font-size: 14px; font-weight: 600; text-align: center; box-shadow: 0 2px 4px rgba(4,120,87,0.2); }
    .table-details { width: 100%; border-collapse: collapse; }
    .table-details td { padding: 9px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .table-details tr:last-child td { border-bottom: none; }
    .table-details .label { color: #64748b; font-weight: 500; width: 38%; }
    .table-details .value { color: #0f172a; font-weight: 600; }
    .footer { padding: 24px 32px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5; }
    .footer-logos { text-align: center; margin-bottom: 14px; }
    .footer-logos img { display: inline-block; vertical-align: middle; margin: 0 8px; border: 0; }
    .footer-logos .pdm-seal { border-radius: 50%; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
        <tr>
          <td style="vertical-align: middle; padding-right: 14px; width: 44px;">
            <div style="width: 44px; height: 44px; background: #ffffff; border-radius: 12px; text-align: center; line-height: 44px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.18);">
              <img src="cid:finlite-logo" alt="LITE" width="34" height="34" style="vertical-align: middle; display: inline-block; margin-top: 5px; border: 0;" />
            </div>
          </td>
          <td style="vertical-align: middle;">
            <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #a7f3d0; line-height: 1.3;">FINLITE TREASURY</div>
            <div style="font-size: 13px; font-weight: 600; color: #ffffff; line-height: 1.3; margin-top: 2px;">League of Information Technology Enthusiasts</div>
          </td>
        </tr>
      </table>
      <h1>${title}</h1>
      <p>${subtitle}</p>
    </div>
    <div class="content">
      <div class="badge">${badgeText}</div>
      ${bodyHtml}
      ${ctaText && ctaUrl ? `
      <div class="cta-container">
        <a href="${ctaUrl}" class="cta-button">${ctaText}</a>
      </div>` : ''}
    </div>
    <div class="footer">
      <div class="footer-logos">
        <img src="cid:finlite-logo" alt="LITE Logo" width="36" height="36" />
        <img src="cid:finlite-pdm-logo" alt="PDM Seal" width="36" height="36" class="pdm-seal" />
      </div>
      <div>
        ${footerNote}<br/>
        © 2026 FinLITE · League of Information Technology Enthusiasts · Pambayang Dalubhasaan ng Marilao
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * 1. Sends a 6-digit email verification OTP to a newly registered user.
 */
export async function sendVerificationOtpEmail({ to, applicantName, code, expiresMinutes = 10 }) {
  const subject = `[FinLITE] ${code} is your account verification code`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const verifyUrl = `${appUrl}/register?verify=true&email=${encodeURIComponent(to)}&code=${code}`;

  const bodyHtml = `
    <p class="lead-text">Hello <strong>${applicantName || 'Officer'}</strong>,</p>
    <p class="lead-text">
      Thank you for registering with <strong>FinLITE</strong>. To verify that you own this Gmail address and advance your application to administrative review, please enter the 6-digit verification code below:
    </p>
    <div class="otp-code-box">
      <div class="otp-digits">${code}</div>
      <p style="margin: 8px 0 0 0; font-size: 12px; color: #047857; font-weight: 500;">
        Valid for ${expiresMinutes} minutes • Do not share this code with anyone
      </p>
    </div>

    <div style="text-align: center; margin: 18px 0 12px 0;">
      <a href="${verifyUrl}" class="cta-button">
        Verify Email Automatically
      </a>
    </div>

    <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 16px 0 0 0;">
      If you accidentally closed the registration tab, simply click the button above to reopen your verification screen automatically. Once verified, your application will enter the Admin Approval Queue.
    </p>
  `;

  const text = `
Hello ${applicantName || 'Officer'},

Your FinLITE account verification code is: ${code}

This code expires in ${expiresMinutes} minutes.

If you closed the registration tab, you can click this link to verify automatically:
${verifyUrl}

If you did not request this registration, you can safely ignore this email.

— FinLITE System (Pambayang Dalubhasaan ng Marilao)
  `.trim();

  const html = buildFinLiteEmailHtml({
    badgeText: 'Email Verification',
    title: 'Verify Your Gmail Address',
    bodyHtml,
    footerNote: 'This verification request was initiated from the FinLITE registration portal.',
  });

  return dispatchMail({ to, subject, text, html });
}

/**
 * 2. Sends a Password Reset Hybrid Email (1-Click Link + 6-Digit Code).
 */
export async function sendPasswordResetOtpEmail({ to, name, code, resetUrl, expiresMinutes = 10 }) {
  const subject = `[FinLITE Security] ${code} is your password reset code`;

  const bodyHtml = `
    <p class="lead-text">Hello <strong>${name || 'Officer'}</strong>,</p>
    <p class="lead-text">
      We received a request to reset the password for your FinLITE account (<strong>${to}</strong>). You can reset your password using either method below:
    </p>

    <div class="otp-code-box">
      <div style="font-size: 12px; text-transform: uppercase; font-weight: 700; color: #065f46; margin-bottom: 6px;">
        Option 1: Enter 6-Digit Code
      </div>
      <div class="otp-digits">${code}</div>
      <p style="margin: 8px 0 0 0; font-size: 12px; color: #047857;">
        Valid for ${expiresMinutes} minutes on the reset password screen
      </p>
    </div>

    <div style="text-align: center; margin: 20px 0; font-size: 13px; font-weight: 600; color: #94a3b8;">
      — OR —
    </div>

    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${resetUrl}" class="cta-button">
        Option 2: 1-Click Password Reset
      </a>
    </div>

    <div class="detail-card" style="margin-top: 16px;">
      <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
        🔒 <strong>Security Warning:</strong> If you did not request a password reset, someone may have entered your email by mistake. Your account remains secure and no changes have been made.
      </p>
    </div>
  `;

  const text = `
Hello ${name || 'Officer'},

We received a request to reset your password for FinLITE (${to}).

Option 1: Use your 6-digit reset code:
${code} (expires in ${expiresMinutes} minutes)

Option 2: Click the reset link directly:
${resetUrl}

If you did not request this, please disregard this email.

— FinLITE System (Pambayang Dalubhasaan ng Marilao)
  `.trim();

  const html = buildFinLiteEmailHtml({
    badgeText: 'Password Recovery',
    badgeColor: '#b45309',
    badgeBg: '#fef3c7',
    title: 'Reset Your FinLITE Password',
    bodyHtml,
    footerNote: 'You received this email because a password recovery was requested for your account.',
  });

  return dispatchMail({ to, subject, text, html });
}

/**
 * 3. Security alert dispatched when user's password was changed.
 */
export async function sendPasswordChangedSecurityEmail({ to, name }) {
  const subject = `[FinLITE Security Alert] Your account password was updated`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const loginUrl = `${appUrl}/login`;

  const bodyHtml = `
    <p class="lead-text">Hello <strong>${name || 'Officer'}</strong>,</p>
    <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 14px 18px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 13px; color: #065f46; font-weight: 600;">
        ✅ Your FinLITE account password was successfully updated.
      </p>
    </div>
    <p class="lead-text">
      This change occurred on <strong>${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</strong> (Philippine Standard Time).
    </p>
    <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
      If you performed this action, no further steps are needed. If you did NOT change your password, please contact an Administrator or reset your password immediately.
    </p>
  `;

  const text = `
Hello ${name || 'Officer'},

Your FinLITE account password was successfully updated on ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}.

If you made this change, you can safely disregard this email. If not, contact your admin immediately.

Sign in: ${loginUrl}

— FinLITE System
  `.trim();

  const html = buildFinLiteEmailHtml({
    badgeText: 'Security Notice',
    badgeColor: '#0369a1',
    badgeBg: '#e0f2fe',
    title: 'Password Updated Successfully',
    bodyHtml,
    ctaText: 'Sign In to FinLITE',
    ctaUrl: loginUrl,
  });

  return dispatchMail({ to, subject, text, html });
}

/**
 * 4. Real-time notification dispatched to all other officers when a transaction or financial event is logged.
 */
export async function sendTransactionNotificationEmail({
  authorName,
  authorEmail,
  authorRole = 'Officer',
  actionType = 'Transaction Logged',
  type = 'INFLOW',
  amount,
  title,
  category = null,
  eventName = null,
  reimbursementRecipient = null,
  receiptUrl = null,
  receiptUrls = [],
  verifiedBy = null,
  date,
  recipients = [],
}) {
  if (!recipients || recipients.length === 0) {
    return { success: true, count: 0 };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const formattedAmount = typeof amount === 'number'
    ? `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `₱${amount}`;

  const isConfirmed = Boolean(verifiedBy);
  const isInflow = type === 'INFLOW' || actionType.toUpperCase().includes('INFLOW');
  const typeBadgeLabel = isInflow ? '+ Inflow (Income)' : '- Outflow (Disbursement)';

  const subject = isConfirmed
    ? `[FinLITE Verified] ${title} (${formattedAmount})`
    : `[FinLITE Ledger] ${authorName || authorEmail} logged: ${title} (${formattedAmount})`;

  const bodyHtml = `
    <p class="lead-text">
      An officer has recorded a new financial entry in the <strong>FinLITE System Ledger</strong>:
    </p>

    <div class="detail-card">
      <table class="table-details">
        <tr>
          <td class="label">Entry Title</td>
          <td class="value">${title}</td>
        </tr>
        <tr>
          <td class="label">Amount</td>
          <td class="value" style="color: #047857; font-size: 16px; font-weight: 700;">${formattedAmount}</td>
        </tr>
        <tr>
          <td class="label">Activity / Type</td>
          <td class="value">${actionType}</td>
        </tr>
        ${category ? `<tr><td class="label">Category</td><td class="value">${category}</td></tr>` : ''}
        ${eventName ? `<tr><td class="label">Event Tag</td><td class="value">${eventName}</td></tr>` : ''}
        ${reimbursementRecipient ? `<tr><td class="label">Abono Claimant</td><td class="value">${reimbursementRecipient}</td></tr>` : ''}
        <tr>
          <td class="label">Recorded By</td>
          <td class="value">${authorName || 'Officer'} <span style="color: #64748b; font-size: 11px;">(${authorEmail})</span></td>
        </tr>
        <tr>
          <td class="label">Date Recorded</td>
          <td class="value">${date || new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
      This record is now reflected on the active semester dashboard and available for Auditor verification.
    </p>
  `;

  const text = `
FinLITE Financial Ledger Update:

${authorName} (${authorEmail}) recorded a new financial entry:
- Title: ${title}
- Amount: ${formattedAmount}
- Type: ${actionType}
${category ? `- Category: ${category}\n` : ''}${eventName ? `- Event: ${eventName}\n` : ''}${reimbursementRecipient ? `- Claimant: ${reimbursementRecipient}\n` : ''}- Date: ${date || new Date().toLocaleDateString('en-PH')}

View dashboard: ${appUrl}

— FinLITE System
  `.trim();

  const html = buildFinLiteEmailHtml({
    badgeText: actionType.toUpperCase(),
    badgeColor: '#047857',
    badgeBg: '#ecfdf5',
    title: 'New Financial Entry Recorded',
    bodyHtml,
    ctaText: 'Open Ledger & Review',
    ctaUrl: appUrl,
    footerNote: 'You received this notification because you are an active officer in FinLITE.',
  });

  // Use BCC so individual officer emails are kept private
  return dispatchMail({
    bcc: recipients,
    subject,
    text,
    html,
  });
}

/**
 * 5. Dispatches an account lifecycle change notification to the affected user.
 */
export async function sendAccountStatusChangedEmail({
  to,
  name,
  changeType, // 'APPROVED' | 'REJECTED' | 'ROLE_CHANGED' | 'STATUS_CHANGED'
  details = {},
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const loginUrl = `${appUrl}/login`;

  let subject = '';
  let badgeText = 'Account Notice';
  let badgeColor = '#065f46';
  let badgeBg = '#ecfdf5';
  let bodyHtml = '';
  let ctaText = null;
  let ctaUrl = null;

  if (changeType === 'APPROVED') {
    subject = `[FinLITE Welcome] Your account registration has been approved!`;
    badgeText = 'Account Approved';
    ctaText = 'Sign In to FinLITE';
    ctaUrl = loginUrl;
    bodyHtml = `
      <p class="lead-text">Hello <strong>${name || 'Officer'}</strong>,</p>
      <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 14px 18px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 14px; color: #065f46; font-weight: 700;">
          🎉 Congratulations! Your FinLITE account has been approved.
        </p>
      </div>
      <p class="lead-text">
        An administrator has reviewed your registration and granted you access to the financial system.
      </p>
      <div class="detail-card">
        <table class="table-details">
          <tr>
            <td class="label">Assigned Role</td>
            <td class="value" style="color: #047857; text-transform: uppercase;">${details.role || 'Officer'}</td>
          </tr>
          <tr>
            <td class="label">Registered Email</td>
            <td class="value">${to}</td>
          </tr>
          <tr>
            <td class="label">Approval Date</td>
            <td class="value">${new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}</td>
          </tr>
        </table>
      </div>
      <p style="font-size: 13px; color: #64748b;">
        You can now sign in using your registered credentials to access your dashboard, record operations, or inspect reports.
      </p>
    `;
  } else if (changeType === 'REJECTED') {
    subject = `[FinLITE Update] Your registration request was not approved`;
    badgeText = 'Registration Rejected';
    badgeColor = '#be123c';
    badgeBg = '#ffe4e6';
    bodyHtml = `
      <p class="lead-text">Hello <strong>${name || 'Applicant'}</strong>,</p>
      <p class="lead-text">
        Thank you for your interest in FinLITE. Your registration request for <strong>${to}</strong> was reviewed by the administration, but could not be approved at this time.
      </p>
      <div class="detail-card" style="border-left: 4px solid #e11d48;">
        <div style="font-size: 11px; font-weight: 700; color: #9f1239; text-transform: uppercase; margin-bottom: 6px;">
          Reason Provided by Reviewer:
        </div>
        <p style="margin: 0; font-size: 13px; color: #1e293b; line-height: 1.5; font-style: italic;">
          "${details.reason || 'Account details could not be verified against the official LITE officer roster.'}"
        </p>
      </div>
      <p style="font-size: 13px; color: #64748b; margin-top: 16px;">
        If you believe this decision was made in error, please coordinate with your LITE Executive Board or Faculty Adviser.
      </p>
    `;
  } else if (changeType === 'ROLE_CHANGED') {
    subject = `[FinLITE Notice] Your organizational role has been updated`;
    badgeText = 'Role Updated';
    badgeColor = '#6d28d9';
    badgeBg = '#f5f3ff';
    ctaText = 'View Dashboard';
    ctaUrl = appUrl;
    bodyHtml = `
      <p class="lead-text">Hello <strong>${name || 'Officer'}</strong>,</p>
      <p class="lead-text">
        An administrator has updated your designated organizational role in FinLITE:
      </p>
      <div class="detail-card">
        <table class="table-details">
          <tr>
            <td class="label">Previous Role</td>
            <td class="value" style="color: #64748b; text-transform: uppercase;">${details.previousRole || 'N/A'}</td>
          </tr>
          <tr>
            <td class="label">New Assigned Role</td>
            <td class="value" style="color: #6d28d9; text-transform: uppercase; font-size: 15px;">${details.newRole || 'Officer'}</td>
          </tr>
          <tr>
            <td class="label">Effective Date</td>
            <td class="value">${new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}</td>
          </tr>
        </table>
      </div>
      <p style="font-size: 13px; color: #64748b;">
        Your system permissions and segregation of duties access have been automatically adjusted to reflect your new role.
      </p>
    `;
  } else if (changeType === 'STATUS_CHANGED') {
    const isSuspended = details.newStatus === 'suspended';
    subject = isSuspended
      ? `[FinLITE Notice] Your account has been suspended`
      : `[FinLITE Notice] Your account has been reactivated`;
    badgeText = isSuspended ? 'Account Suspended' : 'Account Reactivated';
    badgeColor = isSuspended ? '#b45309' : '#047857';
    badgeBg = isSuspended ? '#fef3c7' : '#ecfdf5';
    bodyHtml = `
      <p class="lead-text">Hello <strong>${name || 'Officer'}</strong>,</p>
      <p class="lead-text">
        ${isSuspended
          ? 'Your access to the FinLITE platform has been temporarily <strong>suspended</strong> by an administrator.'
          : 'Your FinLITE account has been <strong>reactivated</strong>. You can now log back into the system.'
        }
      </p>
      <div class="detail-card">
        <table class="table-details">
          <tr>
            <td class="label">Status</td>
            <td class="value" style="color: ${isSuspended ? '#b45309' : '#047857'}; text-transform: uppercase;">
              ${details.newStatus || 'UPDATED'}
            </td>
          </tr>
          <tr>
            <td class="label">Date</td>
            <td class="value">${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</td>
          </tr>
        </table>
      </div>
      <p style="font-size: 13px; color: #64748b;">
        ${isSuspended
          ? 'If you have questions regarding this suspension, please reach out to your Super Admin or Faculty Adviser.'
          : 'Your previous role and permissions remain in effect.'
        }
      </p>
    `;
    if (!isSuspended) {
      ctaText = 'Sign In to FinLITE';
      ctaUrl = loginUrl;
    }
  } else if (changeType === 'RESET' || changeType === 'REGISTRATION_RESET') {
    subject = `[FinLITE Update] Your registration request has been reset — You may resubmit`;
    badgeText = 'Registration Reset';
    badgeColor = '#0284c7';
    badgeBg = '#f0f9ff';
    ctaText = 'Submit New Registration';
    ctaUrl = `${appUrl}/register`;
    bodyHtml = `
      <p class="lead-text">Hello <strong>${name || 'Applicant'}</strong>,</p>
      <p class="lead-text">
        An administrator has reset your previously declined registration request for <strong>${to}</strong> in <strong>FinLITE</strong>.
      </p>
      <div style="background: #f0f9ff; border-left: 4px solid #0284c7; padding: 14px 18px; border-radius: 8px; margin: 18px 0;">
        <p style="margin: 0; font-size: 13px; color: #0369a1; font-weight: 600;">
          You are now eligible to submit a fresh registration application with updated details or identity verification.
        </p>
      </div>
      <p style="font-size: 13px; color: #64748b;">
        Please click the button below to register your account again.
      </p>
    `;
  }

  const text = `
Hello ${name || 'User'},

FinLITE Account Update: ${badgeText}
${subject}

Date: ${new Date().toLocaleString('en-PH')}
App: ${appUrl}

— FinLITE System
  `.trim();

  const html = buildFinLiteEmailHtml({
    badgeText,
    badgeColor,
    badgeBg,
    title: 'Account Status Update',
    bodyHtml,
    ctaText,
    ctaUrl,
  });

  return dispatchMail({ to, subject, text, html });
}

/**
 * 6. Dispatches an automated system update broadcast to all registered users.
 */
export async function sendSystemUpdateBroadcastEmail({
  version,
  title,
  releaseNotes = [],
  recipients = [],
}) {
  if (!recipients || recipients.length === 0) {
    return { success: true, count: 0 };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const subject = `[FinLITE Update] What's New in Version ${version}: ${title}`;

  const notesListHtml = Array.isArray(releaseNotes)
    ? releaseNotes.map((note) => `<li style="margin-bottom: 8px; color: #334155; font-size: 13px;">${note}</li>`).join('')
    : `<p style="font-size: 13px; color: #334155;">${releaseNotes}</p>`;

  const bodyHtml = `
    <p class="lead-text">
      A new system update (<strong>v${version}</strong>) has been deployed to the <strong>FinLITE Platform</strong>:
    </p>

    <div class="detail-card" style="background: #ffffff; border-left: 4px solid #059669;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 700; color: #064e3b;">
        ${title}
      </h3>
      <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">
        Key Highlights & Release Notes:
      </div>
      <ul style="margin: 0; padding-left: 20px;">
        ${notesListHtml}
      </ul>
    </div>

    <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
      These enhancements are live across the web application. You can explore the updated capabilities immediately.
    </p>
  `;

  const text = `
FinLITE System Update v${version}: ${title}

Key Highlights:
${Array.isArray(releaseNotes) ? releaseNotes.map((n) => `• ${n}`).join('\n') : releaseNotes}

Explore the update: ${appUrl}

— FinLITE System
  `.trim();

  const html = buildFinLiteEmailHtml({
    badgeText: `System Release v${version}`,
    badgeColor: '#047857',
    badgeBg: '#ecfdf5',
    title: 'New FinLITE Update Released',
    bodyHtml,
    ctaText: 'Open FinLITE & Explore',
    ctaUrl: appUrl,
    footerNote: 'You received this release notification as a registered member of the FinLITE platform.',
  });

  return dispatchMail({
    bcc: recipients,
    subject,
    text,
    html,
  });
}

/**
 * 7. Existing Admin notification for new registration requests.
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

  const bodyHtml = `
    <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 13px; color: #065f46; font-weight: 600;">
        A new applicant has verified their Gmail address and is waiting for your administrative review.
      </p>
    </div>
    <div class="detail-card">
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
    </div>
  `;

  const text = `
FinLITE Account Registration Pending Approval

A new applicant has submitted a verified registration request:
- Applicant: ${applicantName}
- Gmail: ${email}
- Contact: ${contactNumber || 'Not provided'}
- Method: ${authProvider}
- Submitted: ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}

Review and approve in Admin Console:
${adminUrl}
  `.trim();

  const html = buildFinLiteEmailHtml({
    badgeText: 'Action Required',
    badgeColor: '#b45309',
    badgeBg: '#fef3c7',
    title: 'New Account Pending Approval',
    bodyHtml,
    ctaText: 'Open Admin Console to Review',
    ctaUrl: adminUrl,
    footerNote: 'You received this notification because you are designated as a Super Admin.',
  });

  return dispatchMail({
    to: adminEmails.join(', '),
    subject,
    text,
    html,
  });
}

/**
 * 8. Dispatches an audit verification request to all designated auditors when a new transaction is logged.
 */
export async function sendAuditRequestEmail({
  transaction,
  authorName,
  authorEmail,
  authorRole = 'Officer',
  recipients = [],
}) {
  if (!recipients || recipients.length === 0) {
    return { success: true, count: 0 };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const auditUrl = `${appUrl}/?auditTx=${transaction.id}`;

  const formattedAmount = typeof transaction.amount === 'number'
    ? `₱${transaction.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `₱${transaction.amount}`;

  const isOutflow = transaction.type === 'OUTFLOW';
  const isAbono = transaction.is_reimbursement;
  const entryTypeLabel = isAbono ? 'Out-of-Pocket Advance (Abono)' : (isOutflow ? 'Disbursement / Outflow' : 'Cash Inflow / Collection');

  const subject = `[FinLITE Audit Required] ${entryTypeLabel}: ${transaction.title} (${formattedAmount})`;

  const receiptUrl = transaction.receipt_url || (transaction.transaction_receipts && transaction.transaction_receipts[0]?.public_url);

  const bodyHtml = `
    <p class="lead-text">
      An entry has been logged in the <strong>FinLITE Ledger</strong> and requires your formal audit review and verification:
    </p>

    <div class="detail-card">
      <table class="table-details">
        <tr>
          <td class="label">Entry Title</td>
          <td class="value"><strong>${transaction.title}</strong></td>
        </tr>
        <tr>
          <td class="label">Amount</td>
          <td class="value" style="color: ${isOutflow ? '#be123c' : '#047857'}; font-size: 18px; font-weight: 800;">
            ${formattedAmount}
          </td>
        </tr>
        <tr>
          <td class="label">Classification</td>
          <td class="value">${entryTypeLabel}</td>
        </tr>
        ${transaction.category_name || transaction.categories?.name ? `<tr><td class="label">Category</td><td class="value">${transaction.category_name || transaction.categories?.name}</td></tr>` : ''}
        ${transaction.event_name ? `<tr><td class="label">Event / Activity</td><td class="value">${transaction.event_name}</td></tr>` : ''}
        ${transaction.reimbursement_recipient ? `<tr><td class="label">Reimbursement Claimant</td><td class="value">${transaction.reimbursement_recipient}</td></tr>` : ''}
        <tr>
          <td class="label">Logged By</td>
          <td class="value">${authorName} <span style="color: #64748b; font-size: 11px;">(${authorRole} • ${authorEmail})</span></td>
        </tr>
        <tr>
          <td class="label">Transaction Date</td>
          <td class="value">${transaction.transaction_date || new Date().toISOString().split('T')[0]}</td>
        </tr>
        ${transaction.description ? `<tr><td class="label">Description / Remarks</td><td class="value" style="font-style: italic;">${transaction.description}</td></tr>` : ''}
      </table>
    </div>

    ${receiptUrl ? `
    <div style="margin: 20px 0; padding: 14px; background: #f1f5f9; border-radius: 12px; text-align: center;">
      <p style="font-size: 12px; font-weight: 700; color: #475569; margin: 0 0 10px 0; text-transform: uppercase;">Attached Proof / Receipt</p>
      <a href="${receiptUrl}" target="_blank" style="display: inline-block;">
        <img src="${receiptUrl}" alt="Proof of Transaction" style="max-width: 100%; max-height: 260px; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 2px 6px rgba(0,0,0,0.08);" />
      </a>
      <p style="font-size: 11px; color: #64748b; margin: 6px 0 0 0;">Click image or open FinLITE to inspect high-resolution receipt</p>
    </div>` : `
    <p style="font-size: 12px; color: #94a3b8; font-style: italic; margin: 10px 0 20px 0;">
      No physical receipt was attached to this transaction.
    </p>`}

    <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
      Please inspect this record and choose to <strong>Approve &amp; Verify</strong> or <strong>Flag for Revision</strong> with audit remarks.
    </p>
  `;

  const text = `
FinLITE Transaction Pending Audit:

Title: ${transaction.title}
Amount: ${formattedAmount}
Type: ${entryTypeLabel}
Logged By: ${authorName} (${authorRole} - ${authorEmail})
Date: ${transaction.transaction_date || new Date().toISOString().split('T')[0]}
${receiptUrl ? `Receipt: ${receiptUrl}\n` : ''}
Review and verify in FinLITE:
${auditUrl}
  `.trim();

  const html = buildFinLiteEmailHtml({
    badgeText: 'Audit Review Required',
    badgeColor: '#b45309',
    badgeBg: '#fef3c7',
    title: 'New Transaction Awaiting Audit',
    bodyHtml,
    ctaText: 'Review & Verify in FinLITE',
    ctaUrl: auditUrl,
    footerNote: 'You received this notification because your account has Audit & Verification privileges.',
  });

  return dispatchMail({
    bcc: recipients,
    subject,
    text,
    html,
  });
}

/**
 * 9. Dispatches audit decision notification to transaction author (and CC'd officers).
 */
export async function sendAuditDecisionEmail({
  transaction,
  decision, // 'APPROVE' | 'FLAG'
  auditorName,
  auditorEmail,
  reviewerTitle = 'Auditor',
  comment = null,
  authorEmail,
  authorName = 'Officer',
  ccEmails = [],
}) {
  if (!authorEmail) return { success: false, error: 'No author email provided.' };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const isApproved = decision === 'APPROVE';
  const editUrl = `${appUrl}/?editTx=${transaction.id}`;
  const viewUrl = `${appUrl}/?auditTx=${transaction.id}`;

  const formattedAmount = typeof transaction.amount === 'number'
    ? `₱${transaction.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `₱${transaction.amount}`;

  const subject = isApproved
    ? `[FinLITE Verified] Audit Approved: ${transaction.title} (${formattedAmount})`
    : `[FinLITE Revision Required] Action Needed on: ${transaction.title} (${formattedAmount})`;

  const bodyHtml = `
    <p class="lead-text">
      ${isApproved 
        ? `${reviewerTitle} <strong>${auditorName}</strong> has reviewed and <strong style="color: #047857;">APPROVED</strong> your transaction:`
        : `${reviewerTitle} <strong>${auditorName}</strong> has reviewed your transaction and <strong style="color: #be123c;">REQUESTED REVISIONS</strong> before it can be verified:`}
    </p>

    <div class="detail-card">
      <table class="table-details">
        <tr>
          <td class="label">Entry Title</td>
          <td class="value">${transaction.title}</td>
        </tr>
        <tr>
          <td class="label">Amount</td>
          <td class="value" style="font-weight: 700; color: ${isApproved ? '#047857' : '#be123c'};">${formattedAmount}</td>
        </tr>
        <tr>
          <td class="label">Audit Status</td>
          <td class="value">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; background: ${isApproved ? '#dcfce7; color: #166534;' : '#ffe4e6; color: #9f1239;'}">
              ${isApproved ? 'VERIFIED & AUDITED' : 'FLAGGED FOR REVISION'}
            </span>
          </td>
        </tr>
        <tr>
          <td class="label">${reviewerTitle}</td>
          <td class="value">${auditorName} <span style="color: #64748b; font-size: 11px;">(${auditorEmail})</span></td>
        </tr>
      </table>
    </div>

    ${comment ? `
    <div style="background: ${isApproved ? '#f0fdf4' : '#fff1f2'}; border-left: 4px solid ${isApproved ? '#10b981' : '#f43f5e'}; padding: 14px 18px; border-radius: 0 10px 10px 0; margin: 20px 0;">
      <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: ${isApproved ? '#065f46' : '#9f1239'}; margin: 0 0 4px 0;">Auditor Remarks &amp; Notes</p>
      <p style="font-size: 13px; color: #1e293b; margin: 0; line-height: 1.5; font-style: italic;">"${comment}"</p>
    </div>` : ''}

    ${isApproved ? `
    <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
      ${transaction.is_reimbursement 
        ? 'This reimbursement entry is now queued for physical cash disbursement and payout.'
        : 'This entry is now permanently recorded and reflected in official organization financial statements.'}
    </p>` : `
    <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
      Please open FinLITE to update the transaction details, replace or re-upload the receipt, and resubmit for Auditor sign-off.
    </p>`}
  `;

  const text = `
FinLITE Audit Decision Notification:

${isApproved ? 'APPROVED' : 'CHANGES REQUESTED'}: ${transaction.title} (${formattedAmount})
${reviewerTitle}: ${auditorName} (${auditorEmail})
${comment ? `Remarks: "${comment}"\n` : ''}
${isApproved ? `View in ledger: ${viewUrl}` : `Edit and resubmit: ${editUrl}`}
  `.trim();

  const html = buildFinLiteEmailHtml({
    badgeText: isApproved ? `Verified by ${reviewerTitle}` : 'Action Required',
    badgeColor: isApproved ? '#047857' : '#9f1239',
    badgeBg: isApproved ? '#dcfce7' : '#ffe4e6',
    title: isApproved ? 'Transaction Approved & Audited' : 'Revisions Requested on Transaction',
    bodyHtml,
    ctaText: isApproved ? 'View Transaction in Ledger' : 'Edit & Resubmit Transaction',
    ctaUrl: isApproved ? viewUrl : editUrl,
    footerNote: 'You received this notification because you created or were CC\'d on this transaction.',
  });

  const validRecipients = [authorEmail, ...(Array.isArray(ccEmails) ? ccEmails : [])]
    .map((e) => e?.trim().toLowerCase())
    .filter(Boolean);

  const uniqueRecipients = Array.from(new Set(validRecipients));

  return dispatchMail({
    to: uniqueRecipients[0],
    bcc: uniqueRecipients.slice(1).length > 0 ? uniqueRecipients.slice(1) : undefined,
    subject,
    text,
    html,
  });
}

/**
 * 10. Dispatches notification to auditors when an author edits a flagged transaction.
 */
export async function sendRevisionSubmittedEmail({
  transaction,
  editorName,
  editorEmail,
  recipients = [],
}) {
  if (!recipients || recipients.length === 0) return { success: true, count: 0 };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const auditUrl = `${appUrl}/?auditTx=${transaction.id}`;

  const formattedAmount = typeof transaction.amount === 'number'
    ? `₱${transaction.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `₱${transaction.amount}`;

  const subject = `[FinLITE Revisions Ready] Re-Audit: ${transaction.title} (${formattedAmount})`;

  const bodyHtml = `
    <p class="lead-text">
      Officer <strong>${editorName}</strong> has updated the previously flagged transaction and resubmitted it for your re-audit:
    </p>

    <div class="detail-card">
      <table class="table-details">
        <tr>
          <td class="label">Entry Title</td>
          <td class="value"><strong>${transaction.title}</strong></td>
        </tr>
        <tr>
          <td class="label">Updated Amount</td>
          <td class="value" style="font-weight: 700; color: #047857;">${formattedAmount}</td>
        </tr>
        <tr>
          <td class="label">Resubmitted By</td>
          <td class="value">${editorName} <span style="color: #64748b; font-size: 11px;">(${editorEmail})</span></td>
        </tr>
      </table>
    </div>

    <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
      Please inspect the revised details and complete the audit review.
    </p>
  `;

  const text = `
FinLITE Revised Transaction Submitted for Re-Audit:

Title: ${transaction.title}
Amount: ${formattedAmount}
Resubmitted by: ${editorName} (${editorEmail})

Re-audit in FinLITE:
${auditUrl}
  `.trim();

  const html = buildFinLiteEmailHtml({
    badgeText: 'Re-Audit Ready',
    badgeColor: '#4338ca',
    badgeBg: '#e0e7ff',
    title: 'Revised Transaction Submitted',
    bodyHtml,
    ctaText: 'Re-Audit Transaction Now',
    ctaUrl: auditUrl,
    footerNote: 'You received this notification because your account has Audit privileges.',
  });

  return dispatchMail({
    bcc: recipients,
    subject,
    text,
    html,
  });
}

/**
 * 11. Dispatches an email notification when a debt receivable is recorded or an installment is collected.
 */
export async function sendDebtNotificationEmail({
  action = 'DEBT_CREATED', // 'DEBT_CREATED' | 'DEBT_PAYMENT_COLLECTED'
  debtorName,
  debtorContact = null,
  title,
  totalAmount,
  collectedAmount = null,
  amountPaidSoFar = null,
  remainingBalance = null,
  isFull = false,
  dueDate = null,
  notes = null,
  loggedByName = 'Officer',
  loggedByRole = 'Officer',
  recipients = [],
}) {
  if (!recipients || recipients.length === 0) {
    return { success: true, count: 0 };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const formatPHP = (val) =>
    typeof val === 'number'
      ? `₱${val.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `₱${val || '0.00'}`;

  const isCollection = action === 'DEBT_PAYMENT_COLLECTED';
  const paymentTypeLabel = isFull ? 'Full Settlement (100% Paid)' : 'Partial Payment / Fraction';

  const subject = isCollection
    ? `[FinLITE Collection] Debt Payment: ${debtorName} (${isFull ? 'FULL SETTLEMENT' : `PARTIAL: ${formatPHP(collectedAmount)}`})`
    : `[FinLITE Receivable] New Debt Recorded: ${debtorName} — ${title} (${formatPHP(totalAmount)})`;

  const bodyHtml = `
    <p class="lead-text">
      ${isCollection
        ? `A debt collection payment has been received and logged in the <strong>FinLITE Receivables Ledger</strong>:`
        : `A new member receivable / debt obligation has been recorded in <strong>FinLITE</strong>:`}
    </p>

    <div class="detail-card">
      <table class="table-details">
        <tr>
          <td class="label">Debtor / Member</td>
          <td class="value"><strong>${debtorName}</strong> ${debtorContact ? `<span style="color: #64748b; font-size: 11px;">(${debtorContact})</span>` : ''}</td>
        </tr>
        <tr>
          <td class="label">Obligation / Item</td>
          <td class="value">${title}</td>
        </tr>
        ${isCollection ? `
        <tr>
          <td class="label">Collection Status</td>
          <td class="value" style="font-weight: 700; color: ${isFull ? '#047857' : '#b45309'};">
            ${paymentTypeLabel}
          </td>
        </tr>
        <tr>
          <td class="label">Amount Collected Now</td>
          <td class="value" style="color: #047857; font-size: 18px; font-weight: 800;">+${formatPHP(collectedAmount)}</td>
        </tr>
        <tr>
          <td class="label">Total Paid So Far</td>
          <td class="value">${formatPHP(amountPaidSoFar)} of ${formatPHP(totalAmount)}</td>
        </tr>
        <tr>
          <td class="label">Remaining Balance</td>
          <td class="value" style="font-weight: 700; color: ${remainingBalance <= 0 ? '#047857' : '#be123c'};">${formatPHP(remainingBalance)}</td>
        </tr>
        ` : `
        <tr>
          <td class="label">Total Amount Due</td>
          <td class="value" style="color: #0f172a; font-size: 18px; font-weight: 800;">${formatPHP(totalAmount)}</td>
        </tr>
        ${dueDate ? `<tr><td class="label">Due Date</td><td class="value">${dueDate}</td></tr>` : ''}
        `}
        ${notes ? `<tr><td class="label">Notes / Remarks</td><td class="value" style="font-style: italic;">${notes}</td></tr>` : ''}
        <tr>
          <td class="label">Recorded By</td>
          <td class="value">${loggedByName} <span style="color: #64748b; font-size: 11px;">(${loggedByRole})</span></td>
        </tr>
        <tr>
          <td class="label">Date Recorded</td>
          <td class="value">${new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}</td>
        </tr>
      </table>
    </div>
  `;

  const text = isCollection
    ? `FinLITE Debt Collection:
Debtor: ${debtorName}
Item: ${title}
Status: ${paymentTypeLabel}
Collected: +${formatPHP(collectedAmount)}
Total Paid: ${formatPHP(amountPaidSoFar)} / ${formatPHP(totalAmount)}
Remaining Balance: ${formatPHP(remainingBalance)}
Recorded By: ${loggedByName} (${loggedByRole})
View ledger: ${appUrl}`
    : `FinLITE New Debt / Receivable:
Debtor: ${debtorName}
Item: ${title}
Amount: ${formatPHP(totalAmount)}
${dueDate ? `Due Date: ${dueDate}\n` : ''}${notes ? `Notes: ${notes}\n` : ''}Recorded By: ${loggedByName} (${loggedByRole})
View ledger: ${appUrl}`;

  const html = buildFinLiteEmailHtml({
    badgeText: isCollection ? (isFull ? 'DEBT FULLY SETTLED' : 'PARTIAL DEBT PAYMENT') : 'NEW RECEIVABLE DEBT',
    badgeColor: isCollection ? (isFull ? '#047857' : '#b45309') : '#0284c7',
    badgeBg: isCollection ? (isFull ? '#ecfdf5' : '#fef3c7') : '#f0f9ff',
    title: isCollection ? (isFull ? 'Debt Settled in Full' : 'Debt Payment Collected') : 'New Receivable Recorded',
    bodyHtml,
    ctaText: 'Open Receivables Ledger',
    ctaUrl: `${appUrl}/?act=debts`,
    footerNote: 'You received this notification because you are an active officer in FinLITE.',
  });

  return dispatchMail({
    bcc: recipients,
    subject,
    text,
    html,
  });
}

/**
 * 12. Dispatches an email notification when an out-of-pocket advance (abono) is recorded or reimbursement disbursed.
 */
export async function sendAdvanceNotificationEmail({
  action = 'ADVANCE_CREATED', // 'ADVANCE_CREATED' | 'ADVANCE_DISBURSEMENT'
  claimantName,
  advancedByName = null,
  title,
  category = null,
  eventName = null,
  totalAmount,
  disbursedAmount = null,
  reimbursedSoFar = null,
  remainingBalance = null,
  isFull = false,
  notes = null,
  loggedByName = 'Officer',
  loggedByRole = 'Officer',
  recipients = [],
}) {
  if (!recipients || recipients.length === 0) {
    return { success: true, count: 0 };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const formatPHP = (val) =>
    typeof val === 'number'
      ? `₱${val.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `₱${val || '0.00'}`;

  const isDisbursement = action === 'ADVANCE_DISBURSEMENT';
  const disbTypeLabel = isFull ? 'Full Reimbursement (100% Settled)' : 'Partial Reimbursement / Fraction';

  const subject = isDisbursement
    ? `[FinLITE Reimbursement] Payout Disbursed: ${claimantName} (${isFull ? 'FULL REIMBURSEMENT' : `PARTIAL: ${formatPHP(disbursedAmount)}`})`
    : `[FinLITE Abono] New Out-of-Pocket Advance: ${claimantName} — ${title} (${formatPHP(totalAmount)})`;

  const isProxy = advancedByName && advancedByName.trim() && advancedByName.trim() !== claimantName.trim();

  const bodyHtml = `
    <p class="lead-text">
      ${isDisbursement
        ? `A reimbursement payout has been disbursed from the physical cashbox and recorded in <strong>FinLITE</strong>:`
        : `A new out-of-pocket personal expense (Abono) claim has been filed in <strong>FinLITE</strong>:`}
    </p>

    <div class="detail-card">
      <table class="table-details">
        <tr>
          <td class="label">Claimant / Recipient</td>
          <td class="value">
            <strong>${claimantName}</strong>
            ${isProxy ? `<br/><span style="color: #64748b; font-size: 11px;">(Paid by original creditor: <strong>${advancedByName}</strong>)</span>` : ''}
          </td>
        </tr>
        <tr>
          <td class="label">Expense Title</td>
          <td class="value">${title}</td>
        </tr>
        ${category ? `<tr><td class="label">Category</td><td class="value">${category}</td></tr>` : ''}
        ${eventName ? `<tr><td class="label">Event / Activity</td><td class="value">${eventName}</td></tr>` : ''}
        ${isDisbursement ? `
        <tr>
          <td class="label">Disbursement Status</td>
          <td class="value" style="font-weight: 700; color: ${isFull ? '#047857' : '#b45309'};">
            ${disbTypeLabel}
          </td>
        </tr>
        <tr>
          <td class="label">Amount Disbursed Now</td>
          <td class="value" style="color: #be123c; font-size: 18px; font-weight: 800;">-${formatPHP(disbursedAmount)}</td>
        </tr>
        <tr>
          <td class="label">Total Reimbursed So Far</td>
          <td class="value">${formatPHP(reimbursedSoFar)} of ${formatPHP(totalAmount)}</td>
        </tr>
        <tr>
          <td class="label">Remaining Unreimbursed</td>
          <td class="value" style="font-weight: 700; color: ${remainingBalance <= 0 ? '#047857' : '#b45309'};">${formatPHP(remainingBalance)}</td>
        </tr>
        ` : `
        <tr>
          <td class="label">Advance Claim Amount</td>
          <td class="value" style="color: #0f172a; font-size: 18px; font-weight: 800;">${formatPHP(totalAmount)}</td>
        </tr>
        <tr>
          <td class="label">Status</td>
          <td class="value" style="color: #b45309; font-weight: 700;">Pending Reimbursement</td>
        </tr>
        `}
        ${notes ? `<tr><td class="label">Notes / Remarks</td><td class="value" style="font-style: italic;">${notes}</td></tr>` : ''}
        <tr>
          <td class="label">Processed By</td>
          <td class="value">${loggedByName} <span style="color: #64748b; font-size: 11px;">(${loggedByRole})</span></td>
        </tr>
        <tr>
          <td class="label">Date Recorded</td>
          <td class="value">${new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}</td>
        </tr>
      </table>
    </div>
  `;

  const text = isDisbursement
    ? `FinLITE Reimbursement Payout:
Claimant: ${claimantName}
Item: ${title}
Status: ${disbTypeLabel}
Disbursed Now: -${formatPHP(disbursedAmount)}
Total Reimbursed: ${formatPHP(reimbursedSoFar)} / ${formatPHP(totalAmount)}
Remaining Claim: ${formatPHP(remainingBalance)}
Processed By: ${loggedByName} (${loggedByRole})
View ledger: ${appUrl}`
    : `FinLITE New Out-of-Pocket Advance:
Claimant: ${claimantName}${isProxy ? ` (Original: ${advancedByName})` : ''}
Item: ${title}
Amount: ${formatPHP(totalAmount)}
Status: Pending Reimbursement
Processed By: ${loggedByName} (${loggedByRole})
View ledger: ${appUrl}`;

  const html = buildFinLiteEmailHtml({
    badgeText: isDisbursement ? (isFull ? 'REIMBURSEMENT SETTLED' : 'PARTIAL REIMBURSEMENT') : 'OUT-OF-POCKET ADVANCE',
    badgeColor: isDisbursement ? (isFull ? '#047857' : '#b45309') : '#b45309',
    badgeBg: isDisbursement ? (isFull ? '#ecfdf5' : '#fef3c7') : '#fef3c7',
    title: isDisbursement ? (isFull ? 'Reimbursement Settled in Full' : 'Partial Reimbursement Disbursed') : 'New Abono Advance Recorded',
    bodyHtml,
    ctaText: 'Open Advances & Payables',
    ctaUrl: `${appUrl}/?act=advances`,
    footerNote: 'You received this notification because you are an active officer in FinLITE.',
  });

  return dispatchMail({
    bcc: recipients,
    subject,
    text,
    html,
  });
}

/**
 * Helper to fetch all active approved officer emails from database.
 */
export async function getActiveOfficerEmails(db, excludeEmail = null) {
  if (!db) return [];
  try {
    let { data: officers, error } = await db
      .from('profiles')
      .select('id, auth_user_id, email, status, role')
      .eq('status', 'approved');

    if (error || !officers || officers.length === 0) {
      const { data: reqOfficers } = await db
        .from('registration_requests')
        .select('id, email, status')
        .eq('status', 'approved');
      officers = reqOfficers || [];
    }

    const emails = (officers || [])
      .map((o) => (o.email || '').trim().toLowerCase())
      .filter((e) => e && (!excludeEmail || e !== excludeEmail.trim().toLowerCase()));

    return Array.from(new Set(emails));
  } catch (err) {
    console.warn('getActiveOfficerEmails error:', err?.message || err);
    return [];
  }
}


/**
 * 13. Dispatches an email notification when a cash box count audit is saved or variance decided by adviser.
 */
export async function sendReconciliationNotificationEmail({
  action = 'CASHBOX_COUNTED', // 'CASHBOX_COUNTED' | 'VARIANCE_SUBMITTED' | 'VARIANCE_DECISION'
  physicalTotal = 0,
  ledgerCashBalance = 0,
  varianceAmount = 0,
  varianceStatus = 'BALANCED', // 'BALANCED' | 'SHORTAGE' | 'OVERAGE'
  approvalStatus = 'BALANCED', // 'BALANCED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'
  notes = null,
  countedByName = 'Officer',
  countedByRole = 'Officer',
  countedByEmail = null,
  adviserName = null,
  adviserRole = 'Club Adviser',
  adviserDecision = null, // 'APPROVED' | 'REJECTED'
  adviserNotes = null,
  date = null,
  recipients = [],
}) {
  if (!recipients || recipients.length === 0) {
    return { success: true, count: 0 };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const formatPHP = (val) =>
    typeof val === 'number'
      ? `₱${val.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `₱${val || '0.00'}`;

  const numPhysical = typeof physicalTotal === 'number' ? physicalTotal : parseFloat(physicalTotal || 0);
  const numLedger = typeof ledgerCashBalance === 'number' ? ledgerCashBalance : parseFloat(ledgerCashBalance || 0);
  const numVariance = typeof varianceAmount === 'number' ? varianceAmount : parseFloat(varianceAmount || 0);

  const physicalFormatted = formatPHP(numPhysical);
  const ledgerFormatted = formatPHP(numLedger);

  const isDecision = action === 'VARIANCE_DECISION';
  const isBalanced = varianceStatus === 'BALANCED' || numVariance === 0;
  const isShortage = varianceStatus === 'SHORTAGE' || numVariance < 0;

  let varianceFormatted = '₱0.00 (Balanced)';
  let varianceColor = '#047857';

  if (!isBalanced) {
    if (isShortage) {
      varianceFormatted = `-${formatPHP(Math.abs(numVariance))} (Cash Shortage / Deficit)`;
      varianceColor = '#be123c';
    } else {
      varianceFormatted = `+${formatPHP(Math.abs(numVariance))} (Cash Overage / Surplus)`;
      varianceColor = '#b45309';
    }
  }

  let badgeText = 'CASH BOX BALANCED';
  let badgeColor = '#047857';
  let badgeBg = '#ecfdf5';
  let title = 'Physical Cash Count Balanced';
  let subject = `[FinLITE Cash Box] Physical Audit Count Balanced (${physicalFormatted})`;
  let leadText = 'A physical denomination count of the physical cashbox has been completed and verified against the book ledger balance:';
  let statusDisplayLabel = 'BALANCED (₱0.00)';

  if (isDecision) {
    const isApproved = adviserDecision === 'APPROVED';
    badgeText = isApproved ? 'VARIANCE APPROVED' : 'RECOUNT REQUIRED (REJECTED)';
    badgeColor = isApproved ? '#047857' : '#be123c';
    badgeBg = isApproved ? '#ecfdf5' : '#ffe4e6';
    title = isApproved ? 'Cash Box Variance Approved' : 'Cash Variance Recount Requested';
    subject = isApproved
      ? `[FinLITE Cash Box] Adviser Approved Variance: ${varianceStatus} (${varianceFormatted})`
      : `[FinLITE Cash Box Alert] Adviser Rejected Variance: Physical Recount Required`;
    leadText = isApproved
      ? `Faculty Club Adviser <strong>${adviserName || 'Club Adviser'}</strong> has officially <strong style="color: #047857;">APPROVED</strong> the declared physical cash variance discrepancy:`
      : `Faculty Club Adviser <strong>${adviserName || 'Club Adviser'}</strong> has reviewed the cash audit count and <strong style="color: #be123c;">REJECTED</strong> the discrepancy. A physical recount of the cashbox is requested:`;
    statusDisplayLabel = isApproved ? `APPROVED (${varianceStatus})` : `REJECTED (${varianceStatus})`;
  } else if (!isBalanced) {
    badgeText = isShortage ? 'CASH SHORTAGE PENDING REVIEW' : 'CASH OVERAGE PENDING REVIEW';
    badgeColor = isShortage ? '#be123c' : '#b45309';
    badgeBg = isShortage ? '#ffe4e6' : '#fef3c7';
    title = `Cash Box Discrepancy Declared (${varianceStatus})`;
    subject = `[FinLITE Cash Box Alert] Discrepancy Declared: ${varianceStatus} of ${varianceFormatted} (Pending Sign-off)`;
    leadText = `A cash count audit was performed on the physical Cash Box and a <strong>${varianceStatus}</strong> discrepancy was declared for Faculty Club Adviser review and sign-off:`;
    statusDisplayLabel = `PENDING ADVISER APPROVAL (${varianceStatus})`;
  }

  const currentDateStr = date || new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' });

  const bodyHtml = `
    <p class="lead-text">
      ${leadText}
    </p>

    <div class="detail-card">
      <table class="table-details">
        <tr>
          <td class="label">Physical Cash Count Total</td>
          <td class="value" style="color: #0f172a; font-size: 17px; font-weight: 800;">${physicalFormatted}</td>
        </tr>
        <tr>
          <td class="label">Book Ledger Cash Balance</td>
          <td class="value">${ledgerFormatted}</td>
        </tr>
        <tr>
          <td class="label">Discrepancy / Variance</td>
          <td class="value" style="font-weight: 800; font-size: 15px; color: ${varianceColor};">${varianceFormatted}</td>
        </tr>
        <tr>
          <td class="label">Audit Status</td>
          <td class="value">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; background: ${badgeBg}; color: ${badgeColor};">
              ${statusDisplayLabel}
            </span>
          </td>
        </tr>
        ${notes ? `<tr><td class="label">Justification / Notes</td><td class="value" style="font-style: italic;">${notes}</td></tr>` : ''}
        ${isDecision && adviserNotes ? `<tr><td class="label">Adviser Remarks</td><td class="value" style="font-style: italic; color: #0f172a;">${adviserNotes}</td></tr>` : ''}
        ${isDecision ? `
        <tr>
          <td class="label">Adviser Decision By</td>
          <td class="value"><strong>${adviserName || 'Club Adviser'}</strong> <span style="color: #64748b; font-size: 11px;">(${adviserRole})</span></td>
        </tr>
        ` : `
        <tr>
          <td class="label">Counted By</td>
          <td class="value"><strong>${countedByName}</strong> <span style="color: #64748b; font-size: 11px;">(${countedByRole}${countedByEmail ? ` • ${countedByEmail}` : ''})</span></td>
        </tr>
        `}
        <tr>
          <td class="label">Audit Date</td>
          <td class="value">${currentDateStr}</td>
        </tr>
      </table>
    </div>

    ${!isBalanced && !isDecision ? `
    <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 18px 0;">
      <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #b45309; margin: 0 0 4px 0;">Adviser Authorization Gate</p>
      <p style="font-size: 12px; color: #78350f; margin: 0; line-height: 1.4;">
        In accordance with institutional financial bylaws, discrepancies cannot alter the ledger until reviewed and authorized by a Faculty Club Adviser.
      </p>
    </div>
    ` : ''}
  `;

  const text = isDecision
    ? `FinLITE Cash Box Variance Decision:
Decision: ${adviserDecision}
Physical Total: ${physicalFormatted}
Ledger Balance: ${ledgerFormatted}
Variance: ${varianceFormatted}
Adviser: ${adviserName} (${adviserRole})
${adviserNotes ? `Remarks: ${adviserNotes}\n` : ''}Date: ${currentDateStr}
View Cash Box: ${appUrl}/?act=cashbox`
    : `FinLITE Cash Box Denomination Count:
Status: ${statusDisplayLabel}
Physical Cash: ${physicalFormatted}
Book Ledger: ${ledgerFormatted}
Variance: ${varianceFormatted}
Counted By: ${countedByName} (${countedByRole})
${notes ? `Notes: ${notes}\n` : ''}Date: ${currentDateStr}
View Cash Box: ${appUrl}/?act=cashbox`;

  const html = buildFinLiteEmailHtml({
    badgeText,
    badgeColor,
    badgeBg,
    title,
    bodyHtml,
    ctaText: 'Open Cash Box & Reconciliation',
    ctaUrl: `${appUrl}/?act=cashbox`,
    footerNote: 'You received this notification because you are an active officer in FinLITE.',
  });

  return dispatchMail({
    bcc: recipients,
    subject,
    text,
    html,
  });
}
