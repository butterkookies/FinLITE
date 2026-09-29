'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { validateGmail, validatePassword, validateContactNumber } from '@/lib/utils/validation';
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

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Google OAuth pre-fill params
  const isGoogleFlow = searchParams.get('google') === '1';
  const googleEmail = searchParams.get('email') || '';
  const googleName = searchParams.get('name') || '';
  const googleUid = searchParams.get('uid') || '';
  const googleAvatar = searchParams.get('avatar') || '';

  // Parse pre-filled first/last name from Google
  const nameParts = googleName.trim().split(' ');
  const preFirstName = nameParts[0] || '';
  const preLastName = nameParts.slice(1).join(' ') || '';

  const [form, setForm] = useState({
    firstName: preFirstName,
    lastName: preLastName,
    email: googleEmail,
    contactNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Live field validation states
  const [emailTouched, setEmailTouched] = useState(false);
  const [contactTouched, setContactTouched] = useState(false);

  const emailValidationError = emailTouched && !isGoogleFlow ? validateGmail(form.email) : null;
  const contactValidationError = contactTouched && form.contactNumber ? validateContactNumber(form.contactNumber) : null;

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const passwordsMatch = form.password && form.confirmPassword && form.password === form.confirmPassword;
  const passwordMismatch = form.confirmPassword && form.password !== form.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // First / Last Name validation
    if (!form.firstName?.trim() || !form.lastName?.trim()) {
      setError('Please provide both your First Name and Last Name.');
      return;
    }

    // Gmail validation with specific error messaging
    const emailErr = validateGmail(form.email);
    if (emailErr) {
      setError(emailErr);
      setEmailTouched(true);
      return;
    }

    // Contact number validation (numbers only check)
    if (form.contactNumber?.trim()) {
      const contactErr = validateContactNumber(form.contactNumber);
      if (contactErr) {
        setError(contactErr);
        setContactTouched(true);
        return;
      }
    }

    if (!isGoogleFlow) {
      const passwordErr = validatePassword(form.password);
      if (passwordErr) {
        setError(passwordErr);
        return;
      }

      if (form.password !== form.confirmPassword) {
        setError('Passwords do not match. Please re-enter your password.');
        return;
      }
    }

    setIsLoading(true);

    try {
      // If Google OAuth flow, call different endpoint (no password needed)
      const endpoint = isGoogleFlow ? '/api/auth/google-register' : '/api/auth/register';
      const payload = isGoogleFlow
        ? { firstName: form.firstName, lastName: form.lastName, email: form.email, contactNumber: form.contactNumber, googleUid, avatarUrl: googleAvatar }
        : { firstName: form.firstName, lastName: form.lastName, email: form.email, contactNumber: form.contactNumber, password: form.password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.');
        return;
      }

      setSuccess(true);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
          queryParams: { access_type: 'offline', prompt: 'consent select_account' },
        },
      });
      if (oauthError) setError('Google sign-in failed. Please try again.');
    } catch {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8faf9] px-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Your registration request has been submitted and is now pending admin approval.
            You will be notified once an administrator reviews your account.
          </p>
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-4 text-sm text-amber-800 text-left mb-6">
            <p className="font-semibold mb-1">What happens next?</p>
            <ul className="space-y-1 list-disc list-inside text-amber-700">
              <li>Your request is reviewed by the LITE admin or adviser</li>
              <li>Once approved, you can sign in to FinLITE</li>
              <li>You may be contacted via your registered Gmail</li>
            </ul>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-all"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8faf9] px-4 py-10">
      <div className="w-full max-w-md">

        {/* Logo & Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 shadow-lg mb-4">
            <Image src="/assets/lite-logo.png" alt="LITE" width={36} height={36} className="rounded-lg" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Request Access</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isGoogleFlow
              ? 'Complete your profile to request access to FinLITE'
              : 'Register to join the LITE Financial System'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-[0_4px_24px_-2px_rgba(0,0,0,0.08)] border border-black/5 p-7">

          {/* Google OAuth pre-fill notice */}
          {isGoogleFlow && (
            <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-xl px-4 py-3 mb-5 text-sm">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <span>You&apos;re registering via Google as <strong>{googleEmail}</strong>. Review your details and submit your request.</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Google button — only show if not already in Google flow */}
          {!isGoogleFlow && (
            <>
              <button
                type="button"
                onClick={handleGoogleRegister}
                disabled={isGoogleLoading || isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 mb-5"
              >
                {isGoogleLoading ? (
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                ) : <GoogleIcon />}
                <span>{isGoogleLoading ? 'Redirecting...' : 'Continue with Google'}</span>
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400 font-medium">or fill in the form</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
            </>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* First Name + Last Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">First Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={set('firstName')}
                  placeholder="Juan"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Last Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={set('lastName')}
                  placeholder="dela Cruz"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Gmail */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Gmail Address <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.email}
                onChange={(e) => {
                  set('email')(e);
                  if (!emailTouched) setEmailTouched(true);
                }}
                onBlur={() => setEmailTouched(true)}
                placeholder="yourname@gmail.com"
                required
                readOnly={isGoogleFlow}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                  isGoogleFlow
                    ? 'bg-gray-50 border-gray-100 text-gray-500 cursor-not-allowed'
                    : emailValidationError
                    ? 'border-red-300 bg-red-50/20 focus:ring-red-400'
                    : emailTouched && form.email
                    ? 'border-emerald-300 focus:ring-emerald-500'
                    : 'border-gray-200 focus:ring-emerald-500 focus:border-transparent'
                }`}
              />
              {!isGoogleFlow && emailValidationError && (
                <div className="flex items-start gap-1.5 text-xs text-red-600 mt-1.5 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{emailValidationError}</span>
                </div>
              )}
              {!isGoogleFlow && !emailValidationError && emailTouched && form.email && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 mt-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Valid Gmail address</span>
                </div>
              )}
              {!isGoogleFlow && !emailTouched && (
                <p className="text-[11px] text-gray-400 mt-1">Only active @gmail.com addresses are accepted</p>
              )}
            </div>

            {/* Contact Number */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Contact Number <span className="text-gray-400 font-normal">(optional, 11 digits)</span>
                </label>
                {form.contactNumber && (
                  <span className={`text-[11px] font-medium ${form.contactNumber.length === 11 ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {form.contactNumber.length} / 11
                  </span>
                )}
              </div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={11}
                value={form.contactNumber}
                onKeyDown={(e) => {
                  const allowedNav = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
                  if (allowedNav.includes(e.key) || e.ctrlKey || e.metaKey) return;
                  // Reject non-numbers
                  if (!/^[0-9]$/.test(e.key)) {
                    e.preventDefault();
                    return;
                  }
                  // Strictly block typing if already 11 digits
                  if (e.target.value.length >= 11 && e.target.selectionStart === e.target.selectionEnd) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  // Strictly strip non-digits and cap at exactly 11 digits
                  const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 11);
                  setForm(prev => ({ ...prev, contactNumber: digitsOnly }));
                  if (!contactTouched) setContactTouched(true);
                }}
                onBlur={() => setContactTouched(true)}
                placeholder="09123456789"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                  contactValidationError
                    ? 'border-red-300 bg-red-50/20 focus:ring-red-400'
                    : contactTouched && form.contactNumber && form.contactNumber.length === 11
                    ? 'border-emerald-300 focus:ring-emerald-500'
                    : 'border-gray-200 focus:ring-emerald-500 focus:border-transparent'
                }`}
              />
              {contactValidationError && (
                <div className="flex items-start gap-1.5 text-xs text-red-600 mt-1.5 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{contactValidationError}</span>
                </div>
              )}
              {!contactValidationError && contactTouched && form.contactNumber && form.contactNumber.length === 11 && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 mt-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Valid 11-digit mobile number</span>
                </div>
              )}
              {!contactValidationError && (!contactTouched || !form.contactNumber) && (
                <p className="text-[11px] text-gray-400 mt-1">Must be exactly 11 digits (e.g. 09123456789)</p>
              )}
            </div>

            {/* Password fields — only for email registration, NOT Google flow */}
            {!isGoogleFlow && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={set('password')}
                      placeholder="Min. 8 characters"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Confirm Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={set('confirmPassword')}
                      placeholder="Re-enter your password"
                      required
                      autoComplete="new-password"
                      className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                        passwordMismatch ? 'border-red-300 focus:ring-red-400' :
                        passwordsMatch ? 'border-emerald-300 focus:ring-emerald-500' :
                        'border-gray-200 focus:ring-emerald-500'
                      }`}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordMismatch && <p className="text-[11px] text-red-500 mt-1">Passwords do not match</p>}
                  {passwordsMatch && <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Passwords match</p>}
                </div>
              </>
            )}

            {/* Notice */}
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-800">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>After submitting, your account will be reviewed by an admin before you can access FinLITE.</span>
            </div>

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : <UserPlus className="w-4 h-4" />}
              {isLoading ? 'Submitting...' : 'Submit Registration Request'}
            </button>
          </form>
        </div>

        {/* Footer Link */}
        <p className="text-center text-sm text-gray-500 mt-5">
          Already have an account?{' '}
          <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-semibold">
            Sign In
          </Link>
        </p>

        <p className="text-center text-xs text-gray-400 mt-6">
          Pambayang Dalubhasaan ng Marilao — LITE
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <RegisterForm />
    </Suspense>
  );
}
