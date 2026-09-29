'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function GlobalErrorPage({ error, reset }) {
  useEffect(() => {
    console.error('Next.js Page Error Caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-black/[0.08] shadow-xs p-6 sm:p-7 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 border border-black/[0.06] flex items-center justify-center mx-auto text-amber-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-950 tracking-tight">
            Unexpected Session Error
          </h2>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            FinLITE encountered a temporary interface interruption. Your financial ledger data is preserved safely in the database.
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-2">
          <button
            onClick={() => reset()}
            className="h-10 px-5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}
