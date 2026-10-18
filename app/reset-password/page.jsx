'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle, ArrowLeft, KeyRound } from 'lucide-react';
import { validatePassword, validateGmail } from '@/lib/utils/validation';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlEmail = searchParams.get('email') || '';
  const urlCode = searchParams.get('code') || '';

  const [email, setEmail] = useState(urlEmail);
  const [code, setCode] = useState(urlCode);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (urlEmail && !email) setEmail(urlEmail);
    if (urlCode && !code) setCode(urlCode);
  }, [urlEmail, urlCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const emailErr = validateGmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }

    if (!code.trim() || code.trim().length !== 6) {
      setError('Please provide the 6-digit recovery code sent to your Gmail.');
      return;
    }

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
      // 1. Try our dedicated Gmail OTP reset route
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
          newPassword: password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Fallback: If user clicked a direct Supabase magic recovery link, try supabase auth updateUser
        const supabase = createClient();
        const { error: updateErr } = await supabase.auth.updateUser({ password });
        if (updateErr) {
          setError(data.error || updateErr.message || 'Failed to update password. Code may have expired.');
          return;
        }
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login?reset=success');
      }, 2500);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8faf9] px-4 py-10">
      <div className="w-full max-w-md">

        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 mb-3">
            <Image src="/assets/lite-logo.png" alt="LITE" width={48} height={48} className="object-contain" priority />
          </div>
          <h1 className="text-2xl font-bold text-gray-950 tracking-tight">Set new password</h1>
          <p className="text-xs text-gray-500 mt-1">Enter your recovery code and choose a secure new password</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xs border border-black/[0.08] p-7">
          
          {error && (
            <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 mb-5 text-xs font-medium">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-950">Password Updated!</h3>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Your new password is now active. A security confirmation email has been dispatched to your Gmail. Redirecting to sign in...
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/login?reset=success"
                  className="w-full h-10 inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Sign In Now</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Registered Gmail Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.name@gmail.com"
                  required
                  className="w-full h-10 px-3.5 rounded-xl border border-black/[0.08] text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all select-text"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">6-Digit Recovery Code</label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="••••••"
                    required
                    className="w-full h-11 px-3.5 pl-10 rounded-xl border border-black/[0.08] text-sm font-mono font-bold tracking-[4px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all select-text"
                  />
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Check your Gmail inbox for your 6-digit code.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    required
                    autoComplete="new-password"
                    className="w-full h-10 px-3.5 pr-10 rounded-xl border border-black/[0.08] text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all select-text"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    required
                    autoComplete="new-password"
                    className="w-full h-10 px-3.5 pr-10 rounded-xl border border-black/[0.08] text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all select-text"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !email || !code || !password || !confirmPassword}
                className="w-full h-11 flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl text-xs font-semibold transition-all shadow-xs disabled:opacity-50 mt-1 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                <span>{isLoading ? 'Updating Password...' : 'Save New Password'}</span>
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f8faf9]">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
