'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Link2,
  Fingerprint,
  Check,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { validatePassword } from '@/lib/utils/validation';

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function Banner({ tone, children }) {
  const isError = tone === 'error';
  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-xs font-medium transition-colors ${
        isError
          ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 ring-1 ring-rose-500/20'
          : 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500/20'
      }`}
    >
      {isError ? (
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-500" strokeWidth={2} />
      ) : (
        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
      )}
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}

function PasswordField({ label, value, onChange, placeholder, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full h-11 px-3.5 pr-10 rounded-xl bg-zinc-100/70 dark:bg-zinc-900/90 text-xs font-medium text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 ring-1 ring-black/[0.05] dark:ring-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-zinc-950 transition-all select-text"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer p-1 rounded-lg transition-colors"
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
        </button>
      </div>
    </div>
  );
}

export default function AccountSecurityPage() {
  const router = useRouter();
  const [state, setState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');

  // Connect Google form
  const [linkPassword, setLinkPassword] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [linkNotice, setLinkNotice] = useState('');

  // Google re-auth
  const [isReauthing, setIsReauthing] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/auth/security');
      if (res.status === 401) {
        router.replace('/login');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError(data.error || 'Failed to load security status.');
        return;
      }
      setState(data);
    } catch {
      setLoadError('Network error. Could not check security status.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const rememberDestination = () => {
    try {
      sessionStorage.setItem('auth_redirect_after_link', '/profile/security');
    } catch {
      // sessionStorage unavailable
    }
  };

  const handleReauthWithGoogle = async () => {
    setIsReauthing(true);
    setPasswordError('');
    try {
      const supabase = createClient();
      rememberDestination();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) {
        setPasswordError('Could not start Google confirmation. Please try again.');
        setIsReauthing(false);
      }
    } catch {
      setPasswordError('Network error. Could not reach Google.');
      setIsReauthing(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordNotice('');

    if (hasPassword && !currentPassword) {
      return setPasswordError('Please enter your current password.');
    }
    const valErr = validatePassword(newPassword);
    if (valErr) {
      return setPasswordError(valErr);
    }
    if (newPassword !== confirmPassword) {
      return setPasswordError('New passwords do not match.');
    }

    setIsSavingPassword(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword,
          ...(hasPassword ? { currentPassword } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.code === 'reauth_required') {
          setPasswordError('Your Google session expired. Please confirm with Google again.');
          await load();
          return;
        }
        setPasswordError(data.error || 'Could not update password.');
        return;
      }

      setPasswordNotice(
        hasPassword
          ? 'Password updated successfully. Other sessions have been signed out.'
          : 'Password set successfully. You can now sign in with your email and password.'
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await load();
    } catch {
      setPasswordError('Network error. Please check your connection.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleConnectGoogle = async (e) => {
    e.preventDefault();
    setLinkError('');
    setLinkNotice('');
    if (!linkPassword) return setLinkError('Enter your password to continue.');

    setIsLinking(true);
    try {
      const res = await fetch('/api/auth/link-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: linkPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLinkError(data.error || 'Could not start linking.');
        return;
      }
      setLinkPassword('');

      if (data.alreadyPresent) {
        setLinkNotice('Google sign-in is now connected to this account.');
        await load();
        return;
      }

      const supabase = createClient();
      rememberDestination();
      const { error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/api/auth/callback` },
      });
      if (error) {
        setLinkError(
          /manual linking/i.test(error.message || '')
            ? 'Connecting Google is not enabled for this project yet. Ask the administrator to enable manual linking in Supabase Auth settings.'
            : 'Could not connect Google. Please try again.'
        );
      }
    } catch {
      setLinkError('Network error. Please check your connection.');
    } finally {
      setIsLinking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50/50 dark:bg-[#09090b] flex items-center justify-center p-4">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const hasPassword = Boolean(state?.hasPassword);
  const isGoogleLinked = Boolean(state?.googleLinked || state?.googleIdentityPresent);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-zinc-50/50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors duration-200 select-none">

      {/* Top Header: matches Account Profile */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="flex items-center gap-2 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Return to Account Profile"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={1.75} />
            </Link>
            <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-800" />
            <div>
              <h1 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-zinc-100">Account Security</h1>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Sign-in methods and password credentials</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full flex-1 space-y-6">

        {loadError && <Banner tone="error">{loadError}</Banner>}

        {/* Card 1: Active Sign-in Methods */}
        <div className="rounded-2xl bg-white dark:bg-[#121214] ring-1 ring-black/[0.04] dark:ring-white/[0.06] shadow-sm shadow-zinc-950/5 p-5 sm:p-6 transition-all">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Fingerprint className="w-4.5 h-4.5" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-zinc-950 dark:text-zinc-100">Sign-in Methods</h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate" title={state?.email}>
                Connected authentication channels for <span className="font-semibold text-zinc-700 dark:text-zinc-300">{state?.email}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Google Channel */}
            <div className="p-4 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/60 ring-1 ring-black/[0.03] dark:ring-zinc-800/60 flex items-center justify-between gap-3 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <GoogleIcon />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Google Workspace</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">One-tap institutional SSO</p>
                </div>
              </div>
              <Badge variant={isGoogleLinked ? 'emerald' : 'neutral'} size="xs">
                {isGoogleLinked ? 'Connected' : 'Not linked'}
              </Badge>
            </div>

            {/* Password Channel */}
            <div className="p-4 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/60 ring-1 ring-black/[0.03] dark:ring-zinc-800/60 flex items-center justify-between gap-3 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Password</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">Email and password access</p>
                </div>
              </div>
              <Badge variant={hasPassword ? 'emerald' : 'amber'} size="xs">
                {hasPassword ? 'Configured' : 'Not set'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Card 2: Password Management (Credentials) */}
        {state && (
          <div className="rounded-2xl bg-white dark:bg-[#121214] ring-1 ring-black/[0.04] dark:ring-white/[0.06] shadow-sm shadow-zinc-950/5 p-5 sm:p-6 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Lock className="w-4.5 h-4.5" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-950 dark:text-zinc-100">
                  {hasPassword ? 'Change Password' : 'Add Password Credentials'}
                </h2>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {hasPassword
                    ? 'Update your password credentials. Active sessions on other devices will be signed out.'
                    : 'Add a secure password to sign in without requiring Google authentication.'}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4 max-w-md">
              {passwordError && <Banner tone="error">{passwordError}</Banner>}
              {passwordNotice && <Banner tone="success">{passwordNotice}</Banner>}

              {!hasPassword && !state.recentSignIn ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-3">
                  <p className="leading-relaxed">
                    To add password credentials to a Google-linked account, confirm your Google identity first.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleReauthWithGoogle}
                    loading={isReauthing}
                    leftIcon={<GoogleIcon />}
                    className="w-full bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 font-semibold"
                  >
                    <span>{isReauthing ? 'Redirecting to Google...' : 'Confirm with Google to continue'}</span>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSavePassword} className="space-y-4">
                  {hasPassword && (
                    <PasswordField
                      label="Current password"
                      value={currentPassword}
                      onChange={setCurrentPassword}
                      placeholder="Enter your current password"
                      autoComplete="current-password"
                    />
                  )}
                  <PasswordField
                    label="New password"
                    value={newPassword}
                    onChange={setNewPassword}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                  />
                  <PasswordField
                    label="Confirm new password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="Re-type new password"
                    autoComplete="new-password"
                  />

                  {/* Live Criteria Checklist */}
                  {newPassword.length > 0 && (
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 ring-1 ring-black/[0.04] dark:ring-white/[0.05] space-y-1.5 text-[11px]">
                      <div className={`flex items-center gap-1.5 ${newPassword.length >= 8 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-zinc-400 dark:text-zinc-500'}`}>
                        <Check className="w-3.5 h-3.5" />
                        <span>At least 8 characters long</span>
                      </div>
                      {confirmPassword.length > 0 && (
                        <div className={`flex items-center gap-1.5 ${newPassword === confirmPassword ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-500 font-medium'}`}>
                          {newPassword === confirmPassword ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                          <span>{newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={isSavingPassword}
                    disabled={newPassword.length < 8 || newPassword !== confirmPassword || (hasPassword && !currentPassword)}
                    leftIcon={<ShieldCheck className="w-4 h-4" strokeWidth={2} />}
                    className="w-full h-11 whitespace-nowrap"
                  >
                    {isSavingPassword ? 'Saving Changes...' : hasPassword ? 'Update Password' : 'Save Password'}
                  </Button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Card 3: Connect Google (for password accounts without linked Google) */}
        {state && hasPassword && !isGoogleLinked && (
          <div className="rounded-2xl bg-white dark:bg-[#121214] ring-1 ring-black/[0.04] dark:ring-white/[0.06] shadow-sm shadow-zinc-950/5 p-5 sm:p-6 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Link2 className="w-4.5 h-4.5" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-950 dark:text-zinc-100">Connect Google Account</h2>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Link institutional Google Sign-In to this password account.
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-5 leading-relaxed">
              Confirm your password first to authorize connecting the Google account that shares this email address.
            </p>

            <form onSubmit={handleConnectGoogle} className="space-y-4 max-w-md">
              {linkError && <Banner tone="error">{linkError}</Banner>}
              {linkNotice && <Banner tone="success">{linkNotice}</Banner>}
              <PasswordField
                label="Account password"
                value={linkPassword}
                onChange={setLinkPassword}
                placeholder="Confirm your password to link"
                autoComplete="current-password"
              />
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isLinking}
                disabled={!linkPassword}
                leftIcon={<Link2 className="w-4 h-4" strokeWidth={2} />}
                className="w-full h-11 whitespace-nowrap"
              >
                {isLinking ? 'Connecting...' : 'Authorize Google Linking'}
              </Button>
            </form>
          </div>
        )}

        <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-600 font-medium">
          Pambayang Dalubhasaan ng Marilao · LITE
        </p>
      </main>
    </div>
  );
}