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
} from 'lucide-react';
import { Button } from '@/components/ui';
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

const CARD =
  'rounded-3xl bg-gradient-to-br from-[#0a2e1d]/90 via-[#072417]/85 to-[#051b11]/90 backdrop-blur-xl p-5 sm:p-6 shadow-xl relative overflow-hidden transition-all';
const INPUT =
  'w-full h-11 px-3.5 pr-10 rounded-xl border border-zinc-800 bg-[#121214] text-xs text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-all select-text';
const LABEL = 'block text-xs font-semibold text-zinc-300 mb-1.5';

function Banner({ tone, children }) {
  const isError = tone === 'error';
  return (
    <div
      className={`flex items-start gap-2.5 bg-black/30 border border-white/[0.1] rounded-xl px-4 py-3 text-xs font-medium ${
        isError ? 'text-rose-300' : 'text-emerald-300'
      }`}
    >
      {isError ? (
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" strokeWidth={1.75} />
      ) : (
        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" strokeWidth={1.75} />
      )}
      <span>{children}</span>
    </div>
  );
}

function PasswordField({ label, value, onChange, placeholder, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={INPUT}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer p-1"
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

  const [isReauthing, setIsReauthing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/security');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load.');
      setState(data);
      setLoadError('');
    } catch (err) {
      setLoadError(err.message || 'Failed to load security settings.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  // Return to this page after an OAuth round trip.
  const rememberDestination = () => {
    document.cookie = 'finlite_next=/profile/security; path=/; max-age=600; SameSite=Lax';
  };

  const handleReauthWithGoogle = async () => {
    setPasswordError('');
    setIsReauthing(true);
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
      if (error) setPasswordError('Google confirmation failed. Please try again.');
    } catch {
      setPasswordError('Google confirmation failed. Please try again.');
    } finally {
      setIsReauthing(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordNotice('');

    const err = validatePassword(newPassword);
    if (err) return setPasswordError(err);
    if (newPassword !== confirmPassword) return setPasswordError('Passwords do not match. Please re-enter.');
    if (state.hasPassword && !currentPassword) return setPasswordError('Enter your current password.');

    setIsSavingPassword(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword, currentPassword: state.hasPassword ? currentPassword : undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPasswordError(data.error || 'Could not update your password.');
        if (data.code === 'reauth_required') await load();
        return;
      }
      setPasswordNotice(data.message || 'Password updated.');
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
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  const hasPassword = Boolean(state?.hasPassword);
  const googleLinked = Boolean(state?.googleLinked);

  return (
    <div className="min-h-screen flex flex-col font-sans select-none">

      {/* Top Header: matches the Account Profile header */}
      <header className="sticky top-0 z-30 bg-[#09090b]/95 backdrop-blur-xl border-b border-zinc-800 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-100"
              title="Return to Account Profile"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={1.75} />
            </Link>
            <div className="h-5 w-px bg-zinc-800" />
            <div>
              <h1 className="text-sm sm:text-base font-bold text-zinc-100">Account Security</h1>
              <p className="text-[10px] text-zinc-400 font-medium">Sign-in methods and password</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full flex-1 space-y-6">

        {loadError && <Banner tone="error">{loadError}</Banner>}

        {/* Sign-in methods */}
        <div className={CARD}>
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-2.5 mb-4 relative z-10">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
              <Fingerprint className="w-4 h-4 text-emerald-400" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white">Sign-in methods</h2>
              <p className="text-[11px] text-white/50 truncate" title={state?.email}>{state?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0b2f1e]/90 to-[#061d12]/90 flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3 min-w-0">
                <GoogleIcon />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white">Google</p>
                  <p className="text-[11px] text-white/50 truncate">Sign in with your Google account</p>
                </div>
              </div>
              <span className={`text-xs font-bold whitespace-nowrap ${googleLinked ? 'text-emerald-300' : 'text-white/40'}`}>
                {googleLinked ? 'Connected' : 'Not connected'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0b2f1e]/90 to-[#061d12]/90 flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3 min-w-0">
                <KeyRound className="w-5 h-5 text-emerald-400 shrink-0" strokeWidth={1.75} />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white">Password</p>
                  <p className="text-[11px] text-white/50 truncate">Sign in with email and password</p>
                </div>
              </div>
              <span className={`text-xs font-bold whitespace-nowrap ${hasPassword ? 'text-emerald-300' : 'text-white/40'}`}>
                {hasPassword ? 'Set' : 'Not set'}
              </span>
            </div>
          </div>
        </div>

        {/* Password: add or change */}
        {state && (
          <div className={CARD}>
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2.5 mb-1 relative z-10">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-emerald-400" strokeWidth={1.75} />
              </div>
              <h2 className="text-sm font-bold text-white">{hasPassword ? 'Change password' : 'Add a password'}</h2>
            </div>
            <p className="text-xs text-white/60 mb-5 relative z-10 leading-relaxed">
              {hasPassword
                ? 'Enter your current password to choose a new one. Your other sessions are signed out when it changes.'
                : 'Your account signs in with Google. You can add a password as a second way in. This is the only place a password can be added, and it needs a fresh Google confirmation.'}
            </p>

            <div className="relative z-10 space-y-4 max-w-md">
              {passwordError && <Banner tone="error">{passwordError}</Banner>}
              {passwordNotice && <Banner tone="success">{passwordNotice}</Banner>}

              {!hasPassword && !state.recentSignIn ? (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handleReauthWithGoogle}
                  loading={isReauthing}
                  leftIcon={<GoogleIcon />}
                  className="w-full bg-[#121214] border-zinc-800 hover:bg-zinc-800/60 text-white font-semibold h-11 whitespace-nowrap"
                >
                  <span>{isReauthing ? 'Redirecting...' : 'Confirm with Google to continue'}</span>
                </Button>
              ) : (
                <form onSubmit={handleSavePassword} className="space-y-4">
                  {hasPassword && (
                    <PasswordField
                      label="Current password"
                      value={currentPassword}
                      onChange={setCurrentPassword}
                      placeholder="Your current password"
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
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={isSavingPassword}
                    disabled={!newPassword || !confirmPassword || (hasPassword && !currentPassword)}
                    leftIcon={<ShieldCheck className="w-4 h-4" strokeWidth={1.75} />}
                    className="w-full h-11 whitespace-nowrap"
                  >
                    {isSavingPassword ? 'Saving...' : hasPassword ? 'Change password' : 'Add password'}
                  </Button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Connect Google: only for password accounts without an approved Google link */}
        {state && hasPassword && !googleLinked && (
          <div className={CARD}>
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2.5 mb-1 relative z-10">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                <Link2 className="w-4 h-4 text-emerald-400" strokeWidth={1.75} />
              </div>
              <h2 className="text-sm font-bold text-white">Connect Google</h2>
            </div>
            <p className="text-xs text-white/60 mb-5 relative z-10 leading-relaxed">
              Signing in with Google is never linked to a password account automatically. Confirm your password here first, then choose the Google account that uses this same Gmail address.
            </p>

            <form onSubmit={handleConnectGoogle} className="relative z-10 space-y-4 max-w-md">
              {linkError && <Banner tone="error">{linkError}</Banner>}
              {linkNotice && <Banner tone="success">{linkNotice}</Banner>}
              <PasswordField
                label="Your password"
                value={linkPassword}
                onChange={setLinkPassword}
                placeholder="Confirm it is you"
                autoComplete="current-password"
              />
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isLinking}
                disabled={!linkPassword}
                leftIcon={<Link2 className="w-4 h-4" strokeWidth={1.75} />}
                className="w-full h-11 whitespace-nowrap"
              >
                {isLinking ? 'Connecting...' : 'Connect Google'}
              </Button>
            </form>
          </div>
        )}

        <p className="text-center text-[11px] text-zinc-600">Pambayang Dalubhasaan ng Marilao · LITE</p>
      </main>
    </div>
  );
}
