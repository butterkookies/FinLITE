'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, LogIn, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui';

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  const resetParam = searchParams.get('reset');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState(
    errorParam === 'oauth_failed' ? 'Google sign-in failed. Please try again.' :
    errorParam === 'account_suspended' ? 'Your account has been suspended by an administrator. Please contact your adviser or admin.' :
    errorParam === 'server_error' ? 'A server error occurred. Please try again.' : ''
  );

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'pending') {
          router.push(`/pending-approval?email=${encodeURIComponent(data.email)}`);
          return;
        }
        if (data.error === 'suspended') {
          setError(data.message || 'Your account has been suspended by an administrator. Please contact your adviser or admin.');
          return;
        }
        setError(data.error || 'Login failed. Please check your credentials.');
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) {
        // Unconfigured Supabase fallback
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'geronimoandreijohn.pdm@gmail.com', password: 'google_oauth_local' }),
        });
        if (res.ok) {
          window.location.href = '/';
          return;
        }
      }
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (oauthError) setError('Google sign-in failed. Please try again.');
    } catch {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Outer Card Container with obsidian background and zinc hairline border */}
      <div className="w-full max-w-5xl rounded-3xl border border-zinc-800 bg-[#09090B] shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 p-3 sm:p-4 lg:p-4 gap-4 relative">
        
        {/* Left Side: Clean high-contrast brand panel */}
        <div className="lg:col-span-6 relative rounded-2xl sm:rounded-3xl bg-[#121214] border border-zinc-800/80 p-8 sm:p-10 flex flex-col justify-between min-h-[300px] lg:min-h-[540px] select-none">
          {/* Top Branding / Logo Mark */}
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-13 h-13 sm:w-15 sm:h-15 flex items-center justify-center shrink-0">
              <Image 
                src="/assets/lite-logo.png" 
                alt="LITE" 
                width={60} 
                height={60} 
                className="w-full h-full object-contain" 
                priority 
              />
            </div>
            <div>
              <span className="text-white font-black text-xl sm:text-2xl lg:text-[1.65rem] tracking-tight leading-none block">
                FinLITE
              </span>
              <p className="text-xs sm:text-sm text-emerald-400/90 font-medium leading-snug mt-1">
                League of Information Technology Enthusiasts
              </p>
            </div>
          </div>

          {/* Bottom Banner Headline */}
          <div className="mt-auto pt-10">
            <h2 className="text-2xl sm:text-3xl lg:text-[2.1rem] font-black text-white leading-[1.25] tracking-tight">
              Get access to your financial hub for clarity and accountability.
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 font-medium mt-3 leading-relaxed">
              Pambayang Dalubhasaan ng Marilao · College of Computer Studies
            </p>
          </div>
        </div>

        {/* Right Side: High-contrast minimalist form panel */}
        <div className="lg:col-span-6 p-6 sm:p-8 lg:p-10 flex flex-col justify-between relative z-10">
          <div className="max-w-md w-full mx-auto">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Welcome back</h1>
            <p className="text-xs text-zinc-400 mt-1.5 mb-7 leading-relaxed">
              Access your tasks, ledgers, and financial records anytime — keeping everything flowing in one place.
            </p>

            {/* Reset Password Success Banner */}
            {resetParam === 'success' && (
              <div className="flex items-start gap-2.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl px-4 py-3 mb-5 text-xs font-medium animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
                <span>Your password has been reset successfully! Please sign in with your new password.</span>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="flex items-start gap-2.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl px-4 py-3 mb-5 text-xs font-medium animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Google OAuth Button */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || isLoading}
              className="w-full mb-5 bg-[#121214] border-zinc-800 hover:bg-zinc-800/60 text-white font-semibold"
              leftIcon={
                isGoogleLoading ? (
                  <div className="w-4 h-4 border-2 border-emerald-300 border-t-white rounded-full animate-spin" />
                ) : (
                  <GoogleIcon />
                )
              }
            >
              <span>{isGoogleLoading ? 'Redirecting...' : 'Continue to FinLITE with Google'}</span>
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-xs text-zinc-500 font-medium">or sign in with Gmail</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Gmail Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  required
                  autoComplete="email"
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all select-text bg-[#121214]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-zinc-300">Password</label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full h-11 px-3.5 pr-10 rounded-xl border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all select-text bg-[#121214]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer p-1"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isLoading || isGoogleLoading}
                loading={isLoading}
                leftIcon={<LogIn className="w-4 h-4" />}
                className="w-full mt-2"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </div>

          {/* Footer Link */}
          <div className="mt-8 pt-4 border-t border-zinc-800 text-center">
            <p className="text-xs text-zinc-400">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors">
                Request Access
              </Link>
            </p>
            <p className="text-[11px] text-zinc-600 mt-2">
              Pambayang Dalubhasaan ng Marilao — LITE
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
