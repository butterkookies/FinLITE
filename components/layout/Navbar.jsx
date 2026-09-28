'use client';
import { Shield, Sparkles, UserCheck, Wallet } from 'lucide-react';
import Image from 'next/image';

export default function Navbar({ currentRole, onRoleChange, onOpenAI, onOpenDenominations }) {
  const roles = [
    { id: 'treasurer', label: 'Treasurer', name: 'Andrei Geronimo' },
    { id: 'auditor', label: 'Auditor', name: 'Christian Kasilag' },
    { id: 'president', label: 'President', name: 'Emanuel Malbarosa' },
    { id: 'adviser', label: 'Adviser', name: 'Ms. Kimberly Jatulan' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-black/[0.06] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Organization Branding */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center overflow-hidden shrink-0">
              <Image 
                src="/assets/lite-logo.png" 
                alt="LITE Logo" 
                width={32} 
                height={32} 
                className="object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-bold tracking-tight text-gray-950">FinLITE</span>
                <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded-md">
                  v2.0
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium leading-none truncate">
                <span className="md:hidden">LITE • PDM</span>
                <span className="hidden md:inline">LITE • Pambayang Dalubhasaan ng Marilao</span>
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-gray-200">
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
              AY 2025–2026 • 2nd Sem
            </span>
          </div>
        </div>

        {/* Right: Actions & Role Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          
          {/* Quick Cash Reconciliation Button */}
          <button
            onClick={onOpenDenominations}
            className="flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-black/[0.06] rounded-xl transition-all shadow-xs"
            title="Open Cash Box & Denomination Counter"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="hidden sm:inline">Cash Box</span>
          </button>

          {/* AI Co-Pilot Button */}
          <button
            onClick={onOpenAI}
            className="flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-1.5 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 rounded-xl transition-all shadow-xs"
            title="FinLITE Grounded AI Co-Pilot"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">AI Co-Pilot</span>
            <span className="sm:hidden text-[11px]">AI</span>
          </button>

          {/* Role Gating Switcher */}
          <div className="flex items-center gap-1.5 pl-1.5 sm:pl-2 border-l border-gray-200">
            <div className="relative flex items-center">
              <Shield className="w-3.5 h-3.5 text-gray-400 absolute left-2 sm:left-2.5 pointer-events-none" />
              <select
                value={currentRole}
                onChange={(e) => onRoleChange(e.target.value)}
                className="text-[11px] sm:text-xs font-semibold text-gray-800 bg-gray-50 hover:bg-gray-100 border border-black/[0.08] pl-6 sm:pl-7 pr-5 sm:pr-7 py-1.5 rounded-xl appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 max-w-[85px] xs:max-w-[110px] sm:max-w-none"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label} ({r.name.split(' ')[0]})
                  </option>
                ))}
              </select>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
