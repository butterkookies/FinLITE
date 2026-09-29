'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, Shield, Sparkles, User, Wallet, ShieldCheck, LogOut, ChevronDown, UserCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Navbar({ 
  currentRole = 'member',
  userProfile = null,
  currentUser = null,
  onOpenAI, 
  onOpenDenominations,
  currentSemester,
  semesters = [],
  onSelectSemester,
  onOpenNewSemester
}) {
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileMenuRef = useRef(null);

  // Check admin privileges
  const email = userProfile?.email || currentUser?.email || '';
  const isAdmin = currentRole === 'admin' || email.toLowerCase() === 'geronimoandreijohn.pdm@gmail.com';
  const isOfficer = isAdmin || ['treasurer', 'president', 'auditor', 'adviser'].includes(currentRole);

  const fullName = userProfile?.full_name || currentUser?.user_metadata?.full_name || 'FinLITE Member';
  const avatarUrl = userProfile?.avatar_url || currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture || null;
  const initial = fullName?.[0]?.toUpperCase() || 'U';

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-black/[0.06] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Organization Branding & Semester Switcher */}
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
              </div>
              <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium leading-none truncate">
                <span className="md:hidden">LITE • PDM</span>
                <span className="hidden md:inline">LITE • Pambayang Dalubhasaan ng Marilao</span>
              </p>
            </div>
          </div>

          {/* Interactive Semester Switcher */}
          <div className="flex items-center pl-2 sm:pl-3 border-l border-gray-200">
            <div className="relative flex items-center">
              <Calendar className="w-3.5 h-3.5 text-emerald-700 absolute left-2 sm:left-2.5 pointer-events-none" />
              <select
                value={currentSemester?.id || ''}
                onChange={(e) => {
                  if (e.target.value === 'NEW') {
                    onOpenNewSemester();
                  } else {
                    onSelectSemester(e.target.value);
                  }
                }}
                className="text-[11px] sm:text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-black/[0.08] pl-6 sm:pl-7 pr-5 sm:pr-7 py-1.5 rounded-xl appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 max-w-[105px] xs:max-w-[140px] sm:max-w-none truncate"
                title="Select Academic Year / Semester or Start New Term"
              >
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
                {isOfficer && (
                  <option value="NEW" className="text-emerald-700 font-bold">
                    + Start New Semester...
                  </option>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Right: Actions, AI Co-Pilot & Google Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          
          {/* Quick Cash Reconciliation Button (Officer Gated) */}
          {isOfficer && (
            <button
              onClick={onOpenDenominations}
              className="flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-black/[0.06] rounded-xl transition-all shadow-xs cursor-pointer"
              title="Open Cash Box & Denomination Counter"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="hidden sm:inline">Cash Box</span>
            </button>
          )}

          {/* AI Co-Pilot Button */}
          <button
            onClick={onOpenAI}
            className="flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-1.5 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 rounded-xl transition-all shadow-xs cursor-pointer"
            title="FinLITE Grounded AI Co-Pilot"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">AI Co-Pilot</span>
            <span className="sm:hidden text-[11px]">AI</span>
          </button>

          {/* Admin Console Link Button — STRICTLY VISIBLE TO ADMIN ONLY */}
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 rounded-xl transition-all shadow-xs"
              title="Open Admin Console & Approvals"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}

          {/* User Profile Section (Top Right Corner) */}
          <div className="relative pl-1.5 sm:pl-2 border-l border-gray-200" ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-gray-100 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              title="View Account Profile"
            >
              {avatarUrl ? (
                <div className="w-8 h-8 rounded-xl overflow-hidden border border-emerald-300 shadow-2xs relative">
                  <img
                    src={avatarUrl}
                    alt={fullName}
                    width={32}
                    height={32}
                    className="object-cover w-full h-full"
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 text-xs font-bold shadow-2xs">
                  {initial}
                </div>
              )}

              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-gray-900 leading-tight truncate max-w-[110px]">
                  {fullName.split(' ')[0]}
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 capitalize leading-none">
                  {isAdmin ? 'Admin' : currentRole}
                </span>
              </div>

              <ChevronDown className="w-3 h-3 text-gray-400 hidden sm:block" />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-black/[0.08] shadow-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                {/* User Header Info */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    {avatarUrl ? (
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-emerald-200 relative shrink-0">
                        <img
                          src={avatarUrl}
                          alt={fullName}
                          width={40}
                          height={40}
                          className="object-cover w-full h-full"
                          referrerPolicy="no-referrer"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold text-sm shrink-0">
                        {initial}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-950 truncate">{fullName}</p>
                      <p className="text-[11px] text-gray-500 truncate">{email}</p>
                      <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                        {isAdmin ? 'Super Admin' : currentRole}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Navigation Links */}
                <div className="py-1">
                  <Link
                    href="/profile"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-4 h-4 text-emerald-700" />
                    <span>My Profile</span>
                  </Link>

                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-50/60 transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4 text-amber-700" />
                      <span>Admin Console</span>
                    </Link>
                  )}
                </div>

                {/* Sign Out */}
                <div className="pt-1 border-t border-gray-100">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
