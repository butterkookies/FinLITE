'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, Shield, Sparkles, User, Wallet, ShieldCheck, LogOut, ChevronDown } from 'lucide-react';
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
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-black/[0.08] text-gray-900 shadow-xs transition-all duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
        
        {/* Left: Organization Branding & Desktop Semester Switcher */}
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          {/* Logo & Brand Name */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center shrink-0">
              <Image 
                src="/assets/lite-logo.png" 
                alt="LITE Logo" 
                width={34} 
                height={34} 
                className="object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <div className="flex flex-col justify-center shrink-0">
              <span className="text-sm sm:text-base font-bold tracking-tight leading-tight text-gray-950">
                FinLITE
              </span>
              <p className="text-[10px] sm:text-[11px] font-medium leading-none hidden sm:block mt-0.5 text-gray-500">
                <span className="md:hidden">LITE <span className="text-gray-300 mx-0.5">/</span> PDM</span>
                <span className="hidden md:inline">LITE <span className="text-gray-300 mx-0.5">/</span> Pambayang Dalubhasaan ng Marilao</span>
              </p>
            </div>
          </div>

          {/* Desktop Interactive Semester Switcher (Hidden on mobile, shown on sm+) */}
          <div className="hidden sm:flex items-center">
            <div className="relative flex items-center">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 absolute left-3 pointer-events-none shrink-0" />
              <select
                value={currentSemester?.id || ''}
                onChange={(e) => {
                  if (e.target.value === 'NEW') {
                    onOpenNewSemester();
                  } else {
                    onSelectSemester(e.target.value);
                  }
                }}
                className="h-9 text-xs font-semibold pl-8 pr-7 rounded-xl appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 max-w-[230px] truncate transition-colors shadow-2xs text-gray-800 bg-white hover:bg-gray-50 border border-black/[0.08]"
                title="Select Academic Year / Semester or Start New Term"
              >
                {semesters.map((s) => (
                  <option key={s.id} value={s.id} className="text-gray-900 bg-white">
                    {s.label}
                  </option>
                ))}
                {isOfficer && (
                  <option value="NEW" className="text-emerald-700 font-bold bg-white">
                    + Start New Semester...
                  </option>
                )}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Right: Actions, AI Co-Pilot & Google Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          
          {/* Quick Cash Reconciliation Button (Officer Gated) */}
          {isOfficer && (
            <button
              onClick={onOpenDenominations}
              className="h-9 w-9 sm:w-auto flex items-center justify-center sm:gap-1.5 sm:px-3 text-xs font-semibold rounded-xl transition-all shadow-2xs cursor-pointer shrink-0 text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 border border-black/[0.08]"
              title="Open Cash Box & Denomination Counter"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="hidden sm:inline">Cash Box</span>
            </button>
          )}

          {/* AI Co-Pilot Button */}
          <button
            onClick={onOpenAI}
            className="h-9 flex items-center justify-center gap-1.5 px-2.5 sm:px-3 text-xs font-semibold rounded-xl transition-all shadow-2xs cursor-pointer shrink-0 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-200"
            title="FinLITE Grounded AI Co-Pilot"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="hidden sm:inline">AI Co-Pilot</span>
            <span className="sm:hidden text-[11px] font-bold">AI</span>
          </button>

          {/* Admin Console Link Button — STRICTLY VISIBLE TO ADMIN ONLY */}
          {isAdmin && (
            <Link
              href="/admin"
              className="h-9 w-9 sm:w-auto flex items-center justify-center sm:gap-1.5 sm:px-3 text-xs font-semibold rounded-xl transition-all shadow-2xs shrink-0 text-amber-800 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 border border-amber-200"
              title="Open Admin Console & Approvals"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}

          {/* User Profile Section (Top Right Corner) */}
          <div className="relative pl-1 sm:pl-1.5" ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-full transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs bg-white hover:bg-gray-50 border border-black/[0.08]"
              title="View Account Profile"
            >
              {avatarUrl ? (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden ring-1 ring-black/[0.08] relative shrink-0">
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
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-100 ring-1 ring-emerald-300 flex items-center justify-center text-emerald-800 text-xs font-black shadow-2xs shrink-0">
                  {initial}
                </div>
              )}

              <div className="hidden md:flex flex-col text-left mr-0.5">
                <span className="text-xs font-bold leading-tight truncate max-w-[100px] text-gray-900">
                  {fullName}
                </span>
                <span className="text-[10px] font-medium text-emerald-700 capitalize leading-none mt-0.5">
                  {isAdmin ? 'Admin' : currentRole}
                </span>
              </div>

              <ChevronDown className="w-3 h-3 hidden sm:block ml-0.5 text-gray-400" />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-black/[0.08] shadow-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                {/* User Header Info */}
                <div className="px-4 py-3 border-b border-black/[0.06]">
                  <div className="flex items-center gap-3">
                    {avatarUrl ? (
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-black/[0.08] relative shrink-0">
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
                      <div className="w-10 h-10 rounded-xl bg-gray-100 border border-black/[0.08] flex items-center justify-center text-gray-800 font-bold text-sm shrink-0">
                        {initial}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate text-gray-950">{fullName}</p>
                      <p className="text-[11px] truncate text-gray-500">{email}</p>
                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700 border border-black/[0.06]">
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

      {/* Mobile Dedicated Semester Switcher Bar (Clean, readable, zero overlap on mobile) */}
      <div className="sm:hidden px-3 pb-2.5 pt-1 border-t border-black/[0.06] bg-gray-50/50">
        <div className="relative flex items-center w-full">
          <Calendar className="w-3.5 h-3.5 text-emerald-600 absolute left-3 pointer-events-none shrink-0" />
          <select
            value={currentSemester?.id || ''}
            onChange={(e) => {
              if (e.target.value === 'NEW') {
                onOpenNewSemester();
              } else {
                onSelectSemester(e.target.value);
              }
            }}
            className="h-9 w-full text-xs font-semibold pl-8.5 pr-8 rounded-xl appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 truncate transition-colors shadow-2xs text-gray-900 bg-white border border-gray-200"
            title="Select Academic Year / Semester or Start New Term"
          >
            {semesters.map((s) => (
              <option key={s.id} value={s.id} className="text-gray-900 bg-white">
                {s.label}
              </option>
            ))}
            {isOfficer && (
              <option value="NEW" className="text-emerald-700 font-bold bg-white">
                + Start New Semester...
              </option>
            )}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 pointer-events-none" />
        </div>
      </div>
    </header>
  );
}
