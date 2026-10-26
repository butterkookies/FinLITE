'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { validatePassword } from '@/lib/utils/validation';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // One-time token from the emailed link. It is only redeemed when the form is
  // submitted, so opening the page (or an email scanner prefetching it) never uses it up.
  const tokenHash = searchParams.get('token_hash') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const passErr = validatePassword(password);
    if (passErr) {
      setError(passErr);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenHash, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'Failed to update password. Your reset link may have expired.');
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login?reset=success');
        }, 2000);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8faf9] dark:bg-[#09090b] px-4 py-10">
      <div className="w-full max-w-md">

        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 mb-3">
            <Image src="/assets/lite-logo.png" alt="LITE" width={48} height={48} className="object-contain" priority />
          </div>
          <h1 className="text-2xl font-bold text-gray-950 dark:text-zinc-100 tracking-tight">Set new password</h1>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Please enter and confirm your new secure password</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#121214] rounded-2xl shadow-xs border border-black/[0.08] dark:border-zinc-800 p-7">
          
          {error && (
            <div className="flex items-start gap-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 rounded-xl px-4 py-3 mb-5 text-xs font-medium">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {!tokenHash && !success ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-950 dark:text-zinc-100">This reset link is not valid</h3>
                <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  The link is missing or incomplete. Request a new password reset email to continue.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/forgot-password"
                  className="w-full h-10 inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
                >
                  <span>Request a new link</span>
                </Link>
              </div>
            </div>
          ) : success ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-950 dark:text-zinc-100">Password Updated!</h3>
                <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  Your new password is now active. Redirecting to sign in...
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/login?reset=success"
                  className="w-full h-10 inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Sign In Now</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    required
                    autoComplete="new-password"
                    className="w-full h-10 px-3.5 pr-10 rounded-xl border border-black/[0.08] dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-xs text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all select-text"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    required
                    autoComplete="new-password"
                    className="w-full h-10 px-3.5 pr-10 rounded-xl border border-black/[0.08] dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-xs text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all select-text"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !password || !confirmPassword}
                className="w-full h-11 flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 active:bg-emerald-900 text-white rounded-xl text-xs font-semibold transition-all shadow-xs disabled:opacity-50 mt-1 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                <span>{isLoading ? 'Updating Password...' : 'Save New Password'}</span>
              </button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}

        </div>

        <p className="text-center text-xs text-gray-400 dark:text-zinc-600 mt-6">
          Pambayang Dalubhasaan ng Marilao — LITE
        </p>

      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
