'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, CheckCircle2, AlertCircle, Mail, Send, Clock } from 'lucide-react';
import { validateGmail } from '@/lib/utils/validation';

const RESEND_COOLDOWN_SECONDS = 60;

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status') || 'sent'; // sent | success | invalid
  const emailParam = (searchParams.get('email') || '').trim().toLowerCase();
  const sendFailed = searchParams.get('sendfailed') === '1';

  const [email, setEmail] = useState(emailParam);
  const [isSending, setIsSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async (e) => {
    e?.preventDefault();
    setError('');
    setNotice('');

    const emailError = validateGmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not send the email. Please try again shortly.');
        return;
      }
      setNotice(data.message || 'We sent a new verification link.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError('An unexpected network error occurred. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const resendDisabled = isSending || cooldown > 0 || !email.trim();

  const resendButtonLabel = isSending
    ? 'Sending...'
    : cooldown > 0
    ? `Resend available in ${cooldown}s`
    : 'Resend verification email';

  const headings = {
    sent: ['Check your inbox', 'Open the link we emailed you to verify your Gmail address'],
    success: ['Email verified', 'Your address is confirmed'],
    invalid: ['Link not valid', 'This verification link cannot be used'],
  };
  const [title, subtitle] = headings[status] || headings.sent;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8faf9] dark:bg-[#09090b] px-4 py-10 select-none">
      <div className="w-full max-w-md">

        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 mb-3">
            <Image src="/assets/lite-logo.png" alt="LITE" width={48} height={48} className="object-contain" priority />
          </div>
          <h1 className="text-2xl font-bold text-gray-950 dark:text-zinc-100 tracking-tight">{title}</h1>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">{subtitle}</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#121214] rounded-2xl shadow-xs border border-black/[0.08] dark:border-zinc-800 p-7">

          {error && (
            <div className="flex items-start gap-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 rounded-xl px-4 py-3 mb-5 text-xs font-medium">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" strokeWidth={1.75} />
              <span>{error}</span>
            </div>
          )}

          {/* ---- Registration saved, waiting for the user to open the link ---- */}
          {status === 'sent' && (
            <div className="space-y-5">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <Mail className="w-6 h-6" strokeWidth={1.75} />
                </div>
                <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
                  {emailParam ? (
                    <>
                      We sent a verification link to <strong className="text-gray-900 dark:text-zinc-200">{emailParam}</strong>.
                    </>
                  ) : (
                    <>We sent a verification link to the Gmail address you registered with.</>
                  )}{' '}
                  Open it to confirm the address. After that, a LITE administrator reviews your request.
                </p>
              </div>

              {sendFailed && (
                <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 rounded-xl px-4 py-3 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" strokeWidth={1.75} />
                  <span>Your request was saved, but the first email could not be sent. Use the button below to send it again.</span>
                </div>
              )}

              <div className="flex items-start gap-2.5 bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/60 text-gray-700 dark:text-zinc-300 rounded-xl px-4 py-3 text-xs">
                <Clock className="w-4 h-4 mt-0.5 shrink-0 text-gray-500 dark:text-zinc-400" strokeWidth={1.75} />
                <span>The link works once and expires soon. Check your spam folder if you do not see it.</span>
              </div>

              {notice && (
                <div className="flex items-start gap-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-xl px-4 py-3 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                  <span>{notice}</span>
                </div>
              )}

              {!emailParam && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">Registered Gmail Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
                    autoComplete="email"
                    className="w-full h-10 px-3.5 rounded-xl border border-black/[0.08] dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-xs text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/20 transition-all select-text"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleResend}
                disabled={resendDisabled}
                className="w-full h-11 flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 active:scale-[0.98] text-white rounded-xl text-xs font-semibold transition-all shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/20 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
              >
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />
                ) : (
                  <Send className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                )}
                <span>{resendButtonLabel}</span>
              </button>
            </div>
          )}

          {/* ---- Verified ---- */}
          {status === 'success' && (
            <div className="text-center py-2 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-950 dark:text-zinc-100">Thank you, your email is confirmed</h3>
                <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  {emailParam && (
                    <>
                      <strong className="text-gray-900 dark:text-zinc-200">{emailParam}</strong> is verified.{' '}
                    </>
                  )}
                  Your request is now with a LITE administrator for review. You can sign in as soon as it is approved.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="w-full h-11 inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 active:scale-[0.98] text-white rounded-xl text-xs font-semibold transition-all shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/20 whitespace-nowrap"
                >
                  <ArrowLeft className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                  <span>Go to Sign In</span>
                </Link>
              </div>
            </div>
          )}

          {/* ---- Expired / used / malformed link ---- */}
          {status === 'invalid' && (
            <div className="space-y-5">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" strokeWidth={1.75} />
                </div>
                <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
                  The link may have expired or already been used. Enter your registered Gmail and we will send a new one.
                </p>
              </div>

              {notice && (
                <div className="flex items-start gap-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-xl px-4 py-3 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                  <span>{notice}</span>
                </div>
              )}

              <form onSubmit={handleResend} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">Registered Gmail Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="yourname@gmail.com"
                      required
                      autoComplete="email"
                      className="w-full h-10 px-3.5 pl-10 rounded-xl border border-black/[0.08] dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-xs text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/20 transition-all select-text"
                    />
                    <Mail className="w-4 h-4 text-gray-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" strokeWidth={1.75} />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resendDisabled}
                  className="w-full h-11 flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 active:scale-[0.98] text-white rounded-xl text-xs font-semibold transition-all shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/20 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                >
                  {isSending ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />
                  ) : (
                    <Send className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                  )}
                  <span>{resendButtonLabel}</span>
                </button>
              </form>
            </div>
          )}

          {status !== 'success' && (
            <div className="pt-5 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                <span>Back to Sign In</span>
              </Link>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-zinc-600 mt-6">
          Pambayang Dalubhasaan ng Marilao · LITE
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
