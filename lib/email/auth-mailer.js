import { createTransporter } from '@/lib/email/mailer';

/**
 * Transactional account-security emails: verification, password reset,
 * "this account uses Google" notices, and change notifications.
 *
 * Delivery order mirrors the admin notification mailer: Resend, then SMTP.
 * In development with nothing configured the message (including its link) is
 * printed to the server console so flows stay testable. In production nothing
 * is ever printed, because these messages carry live one-time links.
 */

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function renderEmail({ heading, intro, details = [], buttonLabel, buttonUrl, footnote }) {
  const detailRows = details
    .map(
      ([label, value]) => `
        <tr>
          <td class="label">${escapeHtml(label)}</td>
          <td class="value">${escapeHtml(value)}</td>
        </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8faf9; margin: 0; padding: 20px; color: #1e293b; }
    .card { max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; }
    .header { background: #064e3b; padding: 24px 32px; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
    .header p { margin: 4px 0 0 0; font-size: 13px; color: #a7f3d0; }
    .content { padding: 32px; font-size: 14px; line-height: 1.6; }
    .table-details { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .table-details td { padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .table-details .label { color: #64748b; font-weight: 500; width: 35%; }
    .table-details .value { color: #0f172a; font-weight: 600; }
    .cta-btn { display: inline-block; background-color: #047857; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 13px; font-weight: 600; }
    .link-fallback { word-break: break-all; font-size: 12px; color: #64748b; margin-top: 18px; }
    .footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>${escapeHtml(heading)}</h1>
      <p>Pambayang Dalubhasaan ng Marilao · LITE Financial System</p>
    </div>
    <div class="content">
      <p style="margin-top:0">${escapeHtml(intro)}</p>
      ${detailRows ? `<table class="table-details">${detailRows}</table>` : ''}
      ${
        buttonUrl
          ? `<div style="text-align:center;margin:28px 0 8px"><a href="${escapeHtml(buttonUrl)}" class="cta-btn">${escapeHtml(buttonLabel)}</a></div>
             <p class="link-fallback">If the button does not work, copy this link into your browser:<br>${escapeHtml(buttonUrl)}</p>`
          : ''
      }
      ${footnote ? `<p style="font-size:12px;color:#64748b;margin-bottom:0">${escapeHtml(footnote)}</p>` : ''}
    </div>
    <div class="footer">This is an automated security message from FinLITE.</div>
  </div>
</body>
</html>`;

  const text = [
    heading,
    '',
    intro,
    ...details.map(([label, value]) => `${label}: ${value}`),
    buttonUrl ? `\n${buttonLabel}: ${buttonUrl}` : '',
    footnote ? `\n${footnote}` : '',
  ]
    .filter((line) => line !== undefined)
    .join('\n')
    .trim();

  return { html, text };
}

/**
 * Delivers one email. Never throws.
 * @returns {Promise<{ success: boolean, provider?: string, id?: string, error?: any, simulated?: boolean }>}
 */
export async function deliverEmail({ to, subject, html, text }) {
  let resendError = null;
  if (process.env.RESEND_API_KEY) {
    try {
      let from = process.env.EMAIL_FROM || 'FinLITE Security <onboarding@resend.dev>';
      // Resend rejects unverified sender domains like @gmail.com
      if (from.includes('@gmail.com')) {
        from = 'FinLITE Security <onboarding@resend.dev>';
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html,
          text,
        }),
      });

      const resData = await res.json().catch(() => ({}));
      if (res.ok) {
        console.log(`[FinLITE Mailer] Resend sent "${subject}" to ${to} (ID: ${resData?.id})`);
        return { success: true, provider: 'resend', id: resData?.id };
      }

      resendError = resData?.message || `Resend rejected (status ${res.status})`;
      console.error('[FinLITE Mailer] Resend email rejected:', res.status, resData);
      // Fall through to Nodemailer SMTP below for guaranteed delivery
    } catch (err) {
      resendError = err?.message;
      console.error('[FinLITE Mailer] Resend request exception:', err?.message);
    }
  }

  const transporter = createTransporter();
  let smtpError = null;
  if (transporter) {
    try {
      let fromAddress = process.env.SMTP_FROM || `"FinLITE System" <${process.env.SMTP_USER || 'finlite.pdm@gmail.com'}>`;
      if (fromAddress.includes('pdmagmail.com')) {
        fromAddress = fromAddress.replace('pdmagmail.com', 'pdm@gmail.com');
      }

      await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        text,
        html,
      });
      return { success: true, provider: 'smtp' };
    } catch (err) {
      smtpError = err?.message || String(err);
      console.warn('Nodemailer SMTP failed:', err?.message);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('---------------------------------------------------------');
    console.log('[FINLITE DEV EMAIL: no mail provider configured]');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log('---------------------------------------------------------');
    return { success: true, simulated: true };
  }

  const failureDetail = smtpError
    ? `SMTP error: ${smtpError}`
    : resendError
    ? `Resend error: ${resendError}`
    : 'No working mail provider configured.';

  console.error(`[FinLITE] Email "${subject}" could not be delivered: ${failureDetail}`);
  return { success: false, error: failureDetail };
}

export function sendVerificationEmail({ to, name, verifyUrl }) {
  const { html, text } = renderEmail({
    heading: 'Verify your email address',
    intro: `Hi ${name || 'there'}, confirm that this Gmail address belongs to you to continue your FinLITE registration. An administrator reviews your request after this step.`,
    buttonLabel: 'Verify my email',
    buttonUrl: verifyUrl,
    footnote:
      'This link works once and expires soon. If you did not request a FinLITE account, you can ignore this email and nothing will be created.',
  });
  return deliverEmail({ to, subject: 'Verify your FinLITE email address', html, text });
}

export function sendPasswordResetEmail({ to, resetUrl }) {
  const { html, text } = renderEmail({
    heading: 'Reset your password',
    intro: 'We received a request to reset the password for your FinLITE account.',
    buttonLabel: 'Choose a new password',
    buttonUrl: resetUrl,
    footnote:
      'This link works once and expires soon. If you did not ask for this, ignore this email; your password stays the same.',
  });
  return deliverEmail({ to, subject: 'Reset your FinLITE password', html, text });
}

export function sendGoogleOnlyNoticeEmail({ to, signInUrl }) {
  const { html, text } = renderEmail({
    heading: 'This account uses Google sign-in',
    intro:
      'Someone asked to reset the password for this email address. This FinLITE account signs in with Google and has no password, so there is nothing to reset. Use "Continue with Google" to sign in. If you want a password as well, sign in first and add one under Account Security.',
    buttonLabel: 'Go to sign in',
    buttonUrl: signInUrl,
    footnote: 'If you did not make this request, you can ignore this email.',
  });
  return deliverEmail({ to, subject: 'FinLITE sign-in help', html, text });
}

/**
 * @param {{ to: string, event: 'password_set'|'password_changed'|'password_reset'|'google_linked', ip?: string }} p
 */
export function sendSecurityChangeEmail({ to, event, ip }) {
  const copy = {
    password_set: ['A password was added', 'A password was added to your FinLITE account. You can now sign in with either Google or your password.'],
    password_changed: ['Your password was changed', 'The password for your FinLITE account was changed from Account Security.'],
    password_reset: ['Your password was reset', 'The password for your FinLITE account was reset using an emailed link. All other sessions were signed out.'],
    google_linked: ['Google sign-in was connected', 'Google sign-in was connected to your FinLITE account after you confirmed your password.'],
  }[event];

  const { html, text } = renderEmail({
    heading: copy[0],
    intro: copy[1],
    details: [
      ['When', new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })],
      ...(ip ? [['From IP', ip]] : []),
    ],
    footnote:
      'If this was not you, contact your LITE adviser or administrator immediately and reset your password.',
  });
  return deliverEmail({ to, subject: `FinLITE security notice: ${copy[0]}`, html, text });
}
