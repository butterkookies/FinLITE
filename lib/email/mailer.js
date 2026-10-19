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
  actionType = 'Transaction Logged',
  amount,
  title,
  category = null,
  eventName = null,
  reimbursementRecipient = null,
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

  const subject = `[FinLITE Ledger] ${authorName || authorEmail} logged: ${title} (${formattedAmount})`;

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
