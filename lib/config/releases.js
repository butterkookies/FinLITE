/**
 * FinLITE Application Releases & Changelog Configuration
 * When version is bumped and release notes are updated, the automated release
 * broadcast engine notifies all registered users via Gmail SMTP.
 */
export const LATEST_RELEASE = {
  version: '0.1.0',
  title: 'Single Cashbox Model, Abono Advances & Dedicated Gmail Notifications',
  releaseNotes: [
    'Direct Gmail SMTP engine (finlite.pdm@gmail.com) replacing default shared mailers for high inbox deliverability.',
    '6-digit numeric OTP email verification codes for new officer and applicant registrations.',
    'Hybrid 1-click magic link and 6-digit OTP password reset recovery flow.',
    'Real-time financial activity alerts notifying officers when transactions, abono advances, or debt collections are recorded.',
    'Automated governance email alerts on account approval, rejection with reason, role change, and suspension.',
    'Transition to strict single physical cashbox model with denomination reconciliation in the Program Director room.'
  ],
};
