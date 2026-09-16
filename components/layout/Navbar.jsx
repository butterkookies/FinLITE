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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center overflow-hidden">
              <Image 
                src="/assets/lite-logo.png" 
                alt="LITE Logo" 
                width={32} 
                height={32} 
                className="object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-gray-950">FinLITE</span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded-md">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium leading-none">
                LITE • Pambayang Dalubhasaan ng Marilao
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-gray-200">
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
              AY 2025–2026 • 2nd Sem
            </span>
          </div>
        </div>

        {/* Right: Actions & Role Switcher */}
        <div className="flex items-center gap-2.5">
          
          {/* Quick Cash Reconciliation Button */}
          <button
            onClick={onOpenDenominations}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-black/[0.06] rounded-xl transition-all"
            title="Open Cash Box & Denomination Counter"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-700" />
            <span className="hidden sm:inline">Cash Box</span>
          </button>

          {/* AI Co-Pilot Button */}
          <button
            onClick={onOpenAI}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 rounded-xl transition-all shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>AI Co-Pilot</span>
          </button>

          {/* Role Gating Switcher */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-gray-200">
            <div className="relative flex items-center">
              <Shield className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 pointer-events-none" />
              <select
                value={currentRole}
                onChange={(e) => onRoleChange(e.target.value)}
                className="text-xs font-semibold text-gray-800 bg-gray-50 hover:bg-gray-100 border border-black/[0.08] pl-7 pr-7 py-1.5 rounded-xl appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
