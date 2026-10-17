import assert from 'assert';
import {
  decideForgotPasswordAction, passwordChangeRequirements, evaluateGoogleIdentity,
  isReplaceableRegistration, REAUTH_WINDOW_MS,
} from '../lib/auth/policy.js';
import { safeNextPath } from '../lib/auth/app-url.js';

let n = 0;
const ok = (c, m) => { assert(c, m); n++; console.log('  PASS:', m); };
const now = Date.now();
const future = new Date(now + 60000).toISOString();

// Forgot password
ok(decideForgotPasswordAction({ found: false }) === 'none', 'unknown email: nothing sent');
ok(decideForgotPasswordAction({ found: true, has_password: true, email_confirmed: false }) === 'none', 'unverified account: nothing sent');
ok(decideForgotPasswordAction({ found: true, has_password: true, email_confirmed: true }) === 'send_reset', 'password account: reset link');
ok(decideForgotPasswordAction({ found: true, has_password: false, email_confirmed: true }) === 'send_google_notice', 'Google-only account: NO reset token, notice only');

// Password add/change
let r = passwordChangeRequirements({ hasPassword: true, lastSignInAt: null, now });
ok(r.mode === 'change' && r.requires === 'current_password', 'existing password: needs current password');
r = passwordChangeRequirements({ hasPassword: false, lastSignInAt: new Date(now - 60000).toISOString(), now });
ok(r.mode === 'add' && r.recentSignIn, 'passwordless + fresh sign-in: may add');
r = passwordChangeRequirements({ hasPassword: false, lastSignInAt: new Date(now - REAUTH_WINDOW_MS - 1000).toISOString(), now });
ok(r.mode === 'add' && !r.recentSignIn, 'passwordless + stale sign-in: re-auth required');
ok(!passwordChangeRequirements({ hasPassword: false, lastSignInAt: null, now }).recentSignIn, 'missing sign-in time: not recent');

// Google identity
const base = { hasGoogleIdentity: true, emailConfirmed: true, now };
ok(evaluateGoogleIdentity({ ...base, hasGoogleIdentity: false, hasPassword: true }) === 'not_google', 'no google identity');
ok(evaluateGoogleIdentity({ ...base, hasPassword: false }) === 'native', 'Google-only account: native');
ok(evaluateGoogleIdentity({ ...base, hasPassword: true }) === 'blocked', 'password account + unconsented Google: BLOCKED');
ok(evaluateGoogleIdentity({ ...base, hasPassword: true, googleLinkedAt: new Date(now).toISOString() }) === 'approved', 'previously linked: approved');
ok(evaluateGoogleIdentity({ ...base, hasPassword: true, googleLinkUntil: future }) === 'link_now', 'open link window: link now');
ok(evaluateGoogleIdentity({ ...base, hasPassword: true, googleLinkUntil: new Date(now - 1000).toISOString() }) === 'blocked', 'expired link window: blocked');
ok(evaluateGoogleIdentity({ ...base, hasPassword: true, emailConfirmed: false, googleLinkUntil: future }) === 'blocked', 'unverified email cannot link');

// Pre-hijack squatter replacement
ok(isReplaceableRegistration({ auth_provider: 'email', status: 'pending', email_verified_at: null }), 'unverified email request is replaceable');
ok(!isReplaceableRegistration({ auth_provider: 'email', status: 'pending', email_verified_at: 'x' }), 'verified request is kept');
ok(!isReplaceableRegistration({ auth_provider: 'email', status: 'approved', email_verified_at: null }), 'approved request is kept');
ok(!isReplaceableRegistration({ auth_provider: 'google', status: 'pending', email_verified_at: null }), 'google request is kept');

// Open redirect
ok(safeNextPath('/profile/security') === '/profile/security', 'relative next allowed');
ok(safeNextPath('//evil.com') === '/', 'protocol-relative blocked');
ok(safeNextPath('https://evil.com') === '/', 'absolute URL blocked');
ok(safeNextPath('/\\evil.com') === '/', 'backslash trick blocked');
ok(safeNextPath(null) === '/', 'null falls back');

console.log(`\n${n} auth hardening checks passed`);
