'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Clock, Mail, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

function PendingContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8faf9] px-4 py-10">
      <div className="w-full max-w-md text-center">

        {/* Logo */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 shadow-lg mb-6">
          <Image src="/assets/lite-logo.png" alt="LITE" width={36} height={36} className="rounded-lg" />
        </div>

        {/* Pending Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 mb-5 mx-auto">
          <Clock className="w-10 h-10 text-amber-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Pending Approval</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Your registration request has been received and is currently under review by a FinLITE administrator.
          {email && (
            <> We&apos;ll reach you at <span className="font-semibold text-gray-700">{email}</span>.</>
          )}
        </p>

        {/* Steps */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.06)] p-6 text-left mb-6 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">What happens next</p>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Admin Review</p>
              <p className="text-xs text-gray-500 mt-0.5">A LITE adviser or admin will review your registration details.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
              <Mail className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Email Notification</p>
              <p className="text-xs text-gray-500 mt-0.5">You&apos;ll receive an email once your account is approved or if more info is needed.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Processing Time</p>
              <p className="text-xs text-gray-500 mt-0.5">Approval typically takes 1–2 school days. Check back if you haven&apos;t heard.</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-6">
          If you think this is taking too long, please contact your LITE Club Adviser directly.
        </p>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-all"
        >
          Back to Login
        </Link>

        <p className="text-center text-xs text-gray-400 mt-8">
          Pambayang Dalubhasaan ng Marilao — LITE
        </p>
      </div>
    </div>
  );
}

export default function PendingApprovalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>}>
      <PendingContent />
    </Suspense>
  );
}
