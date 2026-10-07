'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

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

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState(
    errorParam === 'oauth_failed' ? 'Google sign-in failed. Please try again.' :
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
        setError(data.error || 'Login failed. Please check your credentials.');
        return;
      }

      window.location.href = '/';
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
        // Unconfigured Supabase: sign in and open UI directly
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
    <div className="min-h-screen flex items-center justify-center bg-[#f3f6f4] p-4 sm:p-6 lg:p-8">
      {/* Outer Card Container matching reference layout */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-[0_25px_70px_-15px_rgba(4,120,87,0.22),0_10px_30px_-10px_rgba(0,0,0,0.1)] border border-black/[0.08] overflow-hidden grid grid-cols-1 lg:grid-cols-12 p-3 sm:p-4 lg:p-4 gap-4">
        
        {/* Left Side: Green Mesh Gradient Visual Panel */}
        <div className="lg:col-span-6 relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-900 p-8 sm:p-10 flex flex-col justify-between min-h-[320px] lg:min-h-[580px] shadow-inner">
          {/* Mesh Gradient Aura Blobs */}
          <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-400/20 rounded-full filter blur-3xl pointer-events-none -ml-20 -mt-20" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-300/20 rounded-full filter blur-3xl pointer-events-none -mr-20 -mb-20" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-emerald-300/15 rounded-full filter blur-2xl pointer-events-none" />

          {/* Top Branding / Logo Mark */}
          <div className="relative z-10 flex items-center gap-3">
            <Image src="/assets/lite-logo.png" alt="LITE" width={48} height={48} className="w-12 h-12 object-contain shrink-0" priority />
            <div>
              <span className="text-white font-bold text-base tracking-wide">FinLITE</span>
              <p className="text-[11px] text-emerald-200/80 font-medium leading-none">League of Information Technology Enthusiasts</p>
            </div>
          </div>

          {/* Bottom Banner Content matching reference card */}
          <div className="relative z-10 mt-auto pt-10">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight tracking-tight">
              Get access to your financial hub for clarity and accountability.
            </h2>
          </div>
        </div>

        {/* Right Side: Form Panel matching reference layout */}
        <div className="lg:col-span-6 p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
          <div className="max-w-md w-full mx-auto">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Welcome back</h1>
            <p className="text-xs text-gray-500 mt-1.5 mb-7 leading-relaxed">
              Access your tasks, ledgers, and financial records anytime — keeping everything flowing in one place.
            </p>

            {/* Error Banner */}
            {error && (
              <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 mb-5 text-xs font-medium animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || isLoading}
              className="w-full h-11 flex items-center justify-center gap-3 px-4 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 bg-white hover:bg-gray-50/80 active:bg-gray-100 transition-all disabled:opacity-50 mb-5 cursor-pointer shadow-2xs hover:shadow-xs hover:border-gray-300"
            >
              {isGoogleLoading ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              ) : <GoogleIcon />}
              <span>{isGoogleLoading ? 'Redirecting...' : 'Continue with Google'}</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400 font-medium">or sign in with Gmail</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Gmail Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  required
                  autoComplete="email"
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all select-text bg-gray-50/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full h-11 px-3.5 pr-10 rounded-xl border border-gray-200 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all select-text bg-gray-50/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-1"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full h-11 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-emerald-700/20 disabled:opacity-50 mt-2 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : <LogIn className="w-4 h-4" />}
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>

          {/* Footer Link */}
          <div className="mt-8 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors">
                Request Access
              </Link>
            </p>
            <p className="text-[11px] text-gray-400 mt-2">
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
