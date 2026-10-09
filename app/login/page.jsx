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

  // Interactive Wavy Gradient Panel Tracking
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handlePanelMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setMousePos({ x, y });
  };

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
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Outer Card Container matching dashboard frosted glass layout */}
      <div className="w-full max-w-5xl rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-[#0a2e1d]/90 via-[#072417]/85 to-[#051b11]/90 backdrop-blur-xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 p-3 sm:p-4 lg:p-4 gap-4 relative transition-all">
        {/* Subtle ambient corner light auras */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Left Side: Green Mesh Gradient Visual Panel with Interactive Wavy Animation */}
        <div 
          onMouseMove={handlePanelMouseMove}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => { setIsHovered(false); setMousePos({ x: 50, y: 50 }); }}
          className="lg:col-span-6 relative rounded-2xl sm:rounded-3xl overflow-hidden animate-wave-gradient bg-gradient-to-br from-[#0c3924] via-[#082719] to-[#04160e] border border-emerald-500/20 p-8 sm:p-10 flex flex-col justify-between min-h-[340px] lg:min-h-[580px] shadow-inner select-none transition-all duration-300 group cursor-default"
        >
          {/* Interactive Cursor Spotlight Glow Wave */}
          <div 
            className="absolute inset-0 pointer-events-none transition-all duration-500 ease-out z-[2]"
            style={{
              background: `radial-gradient(circle 380px at ${mousePos.x}% ${mousePos.y}%, rgba(52, 211, 153, ${isHovered ? '0.35' : '0.18'}), rgba(16, 185, 129, 0.12) 45%, transparent 75%)`,
            }}
          />

          {/* Morphing Wavy Fluid Blobs */}
          <div className="absolute top-[-10%] left-[-15%] w-[420px] h-[420px] bg-emerald-400/20 blur-3xl rounded-full animate-wave-blob-1 pointer-events-none z-[1]" />
          <div className="absolute bottom-[-15%] right-[-15%] w-[460px] h-[460px] bg-teal-300/15 blur-3xl rounded-full animate-wave-blob-2 pointer-events-none z-[1]" />
          <div className="absolute top-[35%] left-[20%] w-[320px] h-[320px] bg-emerald-300/12 blur-2xl rounded-full animate-wave-blob-1 pointer-events-none z-[1]" />

          {/* Flowing SVG Sine Wave Mesh Overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 mix-blend-screen z-[1]">
            <svg className="w-[180%] h-full animate-wave-svg" viewBox="0 0 1200 600" fill="none" preserveAspectRatio="none">
              <path d="M0,320 C180,240 360,400 600,300 C840,200 1020,380 1200,310 L1200,600 L0,600 Z" fill="url(#wave-grad-1)" opacity="0.6"/>
              <path d="M0,360 C220,440 420,270 620,370 C820,470 1020,290 1200,380 L1200,600 L0,600 Z" fill="url(#wave-grad-2)" opacity="0.45"/>
              <defs>
                <linearGradient id="wave-grad-1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                  <stop offset="50%" stopColor="#34d399" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.15" />
                </linearGradient>
                <linearGradient id="wave-grad-2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#047857" stopOpacity="0.15" />
                  <stop offset="50%" stopColor="#6ee7b7" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#0d9488" stopOpacity="0.15" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Top Branding / Logo Mark (Enlarged per request) */}
          <div className="relative z-10 flex items-center gap-3.5 sm:gap-4">
            <div className="w-13 h-13 sm:w-15 sm:h-15 flex items-center justify-center shrink-0 drop-shadow-md">
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
              <span className="text-white font-black text-xl sm:text-2xl lg:text-[1.65rem] tracking-tight leading-none block drop-shadow-sm">
                FinLITE
              </span>
              <p className="text-xs sm:text-sm text-emerald-200/90 font-medium leading-snug mt-1">
                League of Information Technology Enthusiasts
              </p>
            </div>
          </div>

          {/* Bottom Banner Headline */}
          <div className="relative z-10 mt-auto pt-10">
            <h2 className="text-2xl sm:text-3xl lg:text-[2.2rem] font-black text-white leading-[1.2] tracking-tight drop-shadow-sm">
              Get access to your financial hub for clarity and accountability.
            </h2>
          </div>
        </div>

        {/* Right Side: Form Panel matching reference layout */}
        <div className="lg:col-span-6 p-6 sm:p-8 lg:p-10 flex flex-col justify-between relative z-10">
          <div className="max-w-md w-full mx-auto">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">Welcome back</h1>
            <p className="text-xs text-white/60 mt-1.5 mb-7 leading-relaxed">
              Access your tasks, ledgers, and financial records anytime — keeping everything flowing in one place.
            </p>

            {/* Error Banner */}
            {error && (
              <div className="flex items-start gap-2.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl px-4 py-3 mb-5 text-xs font-medium animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || isLoading}
              className="w-full h-11 flex items-center justify-center gap-3 px-4 border border-emerald-500/25 rounded-xl text-xs font-semibold text-white bg-[#0a2418] hover:bg-[#0e3120] active:bg-[#123b27] transition-all disabled:opacity-50 mb-5 cursor-pointer shadow-md hover:border-emerald-400/50"
            >
              {isGoogleLoading ? (
                <div className="w-4 h-4 border-2 border-emerald-300 border-t-white rounded-full animate-spin" />
              ) : <GoogleIcon />}
              <span>{isGoogleLoading ? 'Redirecting...' : 'Continue with Google'}</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-emerald-500/20" />
              <span className="text-xs text-white/40 font-medium">or sign in with Gmail</span>
              <div className="flex-1 h-px bg-emerald-500/20" />
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-emerald-100/80 mb-1.5">Gmail Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  required
                  autoComplete="email"
                  className="w-full h-11 px-3.5 rounded-xl border border-emerald-500/25 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all select-text bg-[#061c12]/80"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-100/80 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full h-11 px-3.5 pr-10 rounded-xl border border-emerald-500/25 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all select-text bg-[#061c12]/80"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer p-1"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full h-11 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 via-[#10b981] to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.99] text-black rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 mt-2 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                ) : <LogIn className="w-4 h-4" />}
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>

          {/* Footer Link */}
          <div className="mt-8 pt-4 border-t border-emerald-500/15 text-center">
            <p className="text-xs text-white/50">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors">
                Request Access
              </Link>
            </p>
            <p className="text-[11px] text-white/35 mt-2">
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
