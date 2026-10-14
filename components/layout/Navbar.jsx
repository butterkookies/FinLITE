'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, Shield, Sparkles, User, Wallet, ShieldCheck, LogOut, ChevronDown, UserCheck, Sun, Moon, Check, Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { useTheme } from '@/components/theme/ThemeProvider';

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
  const { isLight, theme, toggleTheme } = useTheme();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSemesterOpen, setIsSemesterOpen] = useState(false);
  const [isMobileSemesterOpen, setIsMobileSemesterOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const semesterMenuRef = useRef(null);
  const mobileSemesterRef = useRef(null);

  // Check admin privileges
  const email = userProfile?.email || currentUser?.email || '';
  const isAdmin = currentRole === 'admin' || email.toLowerCase() === 'geronimoandreijohn.pdm@gmail.com';
  const isOfficer = isAdmin || ['treasurer', 'president', 'auditor', 'adviser'].includes(currentRole);

  const fullName = userProfile?.full_name || currentUser?.user_metadata?.full_name || 'FinLITE Member';
  const avatarUrl = userProfile?.avatar_url || currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture || null;
  const initial = fullName?.[0]?.toUpperCase() || 'U';

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (semesterMenuRef.current && !semesterMenuRef.current.contains(event.target)) {
        setIsSemesterOpen(false);
      }
      if (mobileSemesterRef.current && !mobileSemesterRef.current.contains(event.target)) {
        setIsMobileSemesterOpen(false);
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
    <header className={`sticky top-0 z-30 backdrop-blur-xl border-b transition-all duration-200 ${
      isLight
        ? 'bg-white/95 border-zinc-200 text-zinc-900 shadow-xs'
        : 'bg-[#082217]/90 border-emerald-500/15 text-white shadow-md'
    }`}>
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
              <span className={`text-sm sm:text-base font-bold tracking-tight leading-tight ${
                isLight ? 'text-zinc-950' : 'text-white'
              }`}>
                FinLITE
              </span>
              <p className={`text-[10px] sm:text-[11px] font-medium leading-none hidden sm:block mt-0.5 ${
                isLight ? 'text-zinc-500' : 'text-white/50'
              }`}>
                <span className="md:hidden">LITE <span className="opacity-40 mx-0.5">/</span> PDM</span>
                <span className="hidden md:inline">LITE <span className="opacity-40 mx-0.5">/</span> Pambayang Dalubhasaan ng Marilao</span>
              </p>
            </div>
          </div>

          {/* Desktop Interactive Semester Switcher (Hidden on mobile, shown on sm+) */}
          <div className="hidden sm:flex items-center relative" ref={semesterMenuRef}>
            <button
              type="button"
              onClick={() => setIsSemesterOpen(!isSemesterOpen)}
              className={`h-9 text-xs font-semibold px-3 rounded-xl flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/30 max-w-[240px] truncate transition-colors shadow-2xs border ${
                isLight
                  ? 'bg-zinc-100 hover:bg-zinc-200/80 text-zinc-900 border-zinc-200'
                  : 'bg-[#0c1e16] hover:bg-[#122b20] text-emerald-100 border-[#1a382b]'
              }`}
              title="Select Academic Year / Semester or Start New Term"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">{currentSemester?.label || 'Select Semester'}</span>
              <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-150 shrink-0 ${isSemesterOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSemesterOpen && (
              <div className={`absolute left-0 top-full mt-1.5 w-60 rounded-2xl shadow-xl border p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 ${
                isLight
                  ? 'bg-white border-zinc-200 text-zinc-800'
                  : 'bg-[#0a2419] border-emerald-900/60 text-zinc-100'
              }`}>
                <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Academic Term
                </div>
                <div className="space-y-0.5">
                  {semesters.map((s) => {
                    const isSelected = s.id === currentSemester?.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          onSelectSemester(s.id);
                          setIsSemesterOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-colors cursor-pointer text-left ${
                          isSelected
                            ? isLight
                              ? 'bg-emerald-50 text-emerald-900 font-bold'
                              : 'bg-emerald-950/60 text-emerald-300 font-bold'
                            : isLight
                              ? 'text-zinc-700 hover:bg-zinc-100'
                              : 'text-zinc-300 hover:bg-emerald-900/30'
                        }`}
                      >
                        <span className="truncate">{s.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>

                {isOfficer && (
                  <div className={`pt-1 mt-1 border-t ${isLight ? 'border-zinc-100' : 'border-emerald-900/40'}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSemesterOpen(false);
                        onOpenNewSemester();
                      }}
                      className={`w-full flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer text-left ${
                        isLight
                          ? 'text-emerald-700 hover:bg-emerald-50'
                          : 'text-emerald-400 hover:bg-emerald-950/50'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Start New Semester...</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions, Theme Toggle, AI Co-Pilot & Google Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          
          {/* Theme Toggle Button (Light/Dark Mode) */}
          <ThemeToggle />

          {/* Quick Cash Reconciliation Button (Officer Gated) */}
          {isOfficer && (
            <button
              onClick={onOpenDenominations}
              className={`h-9 w-9 sm:w-auto flex items-center justify-center sm:gap-1.5 sm:px-3 text-xs font-semibold rounded-xl transition-all shadow-2xs cursor-pointer shrink-0 border ${
                isLight
                  ? 'text-zinc-800 bg-zinc-100 hover:bg-zinc-200 border-zinc-200'
                  : 'text-emerald-100 bg-[#0c1e16] hover:bg-[#122b20] active:bg-[#163527] border-[#1a382b]'
              }`}
              title="Open Cash Box & Denomination Counter"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="hidden sm:inline">Cash Box</span>
            </button>
          )}

          {/* AI Co-Pilot Button */}
          <button
            onClick={onOpenAI}
            className={`h-9 flex items-center justify-center gap-1.5 px-2.5 sm:px-3 text-xs font-semibold rounded-xl transition-all shadow-2xs cursor-pointer shrink-0 border ${
              isLight
                ? 'text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                : 'text-emerald-100 bg-[#0c1e16] hover:bg-[#122b20] active:bg-[#163527] border-[#1a382b]'
            }`}
            title="FinLITE Grounded AI Co-Pilot"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="hidden sm:inline">AI Co-Pilot</span>
            <span className="sm:hidden text-[11px] font-bold">AI</span>
          </button>

          {/* Admin Console Link Button — STRICTLY VISIBLE TO ADMIN ONLY */}
          {isAdmin && (
            <Link
              href="/admin"
              className={`h-9 w-9 sm:w-auto flex items-center justify-center sm:gap-1.5 sm:px-3 text-xs font-semibold rounded-xl transition-all shadow-2xs shrink-0 border ${
                isLight
                  ? 'text-amber-900 bg-amber-50 hover:bg-amber-100 border-amber-200'
                  : 'text-amber-200 bg-[#0c1e16] hover:bg-[#122b20] active:bg-[#163527] border border-[#1a382b]'
              }`}
              title="Open Admin Console & Approvals"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}

          {/* User Profile Section (Top Right Corner) */}
          <div className="relative pl-1 sm:pl-1.5" ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={`flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-full transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/30 shadow-2xs border ${
                isLight
                  ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-800'
                  : 'bg-[#0c1e16] hover:bg-[#122b20] border-[#1a382b] text-white'
              }`}
              title="View Account Profile"
            >
              {avatarUrl ? (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden ring-2 ring-emerald-500/50 relative shrink-0">
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
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-600 ring-2 ring-emerald-400/50 flex items-center justify-center text-white text-xs font-bold shadow-2xs shrink-0">
                  {initial}
                </div>
              )}

              <div className="hidden md:flex flex-col text-left mr-0.5">
                <span className={`text-xs font-bold leading-tight truncate max-w-[100px] ${
                  isLight ? 'text-zinc-900' : 'text-white'
                }`}>
                  FinLITE
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 capitalize leading-none mt-0.5">
                  {isAdmin ? 'Admin' : currentRole}
                </span>
              </div>

              <ChevronDown className="w-3 h-3 hidden sm:block ml-0.5 opacity-60" />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileOpen && (
              <div className={`absolute right-0 mt-2 w-64 backdrop-blur-2xl rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100 border ${
                isLight
                  ? 'bg-white/98 border-zinc-200 text-zinc-900 shadow-zinc-900/10'
                  : 'bg-[#0d2416]/98 border-emerald-500/30 text-white shadow-black/60'
              }`}>
                {/* User Header Info */}
                <div className={`px-4 py-3 border-b ${
                  isLight ? 'border-zinc-100' : 'border-white/[0.08]'
                }`}>
                  <div className="flex items-center gap-3">
                    {avatarUrl ? (
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-emerald-500/30 relative shrink-0">
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
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300">
                        {initial}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${isLight ? 'text-zinc-900' : 'text-white'}`}>{fullName}</p>
                      <p className={`text-[11px] truncate ${isLight ? 'text-zinc-500' : 'text-white/60'}`}>{email}</p>
                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        {isAdmin ? 'Super Admin' : currentRole}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Appearance Theme Switcher Row */}
                <div className={`py-1 border-b ${isLight ? 'border-zinc-100' : 'border-white/[0.08]'}`}>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer text-left ${
                      isLight ? 'text-zinc-800 hover:bg-zinc-100' : 'text-white/85 hover:bg-white/[0.08]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      {isLight ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-emerald-400" />}
                      <span>Appearance</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded capitalize bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      {theme} mode
                    </span>
                  </button>
                </div>

                {/* Navigation Links */}
                <div className="py-1">
                  <Link
                    href="/profile"
                    onClick={() => setIsProfileOpen(false)}
                    className={`flex items-center gap-2.5 px-4 py-2 text-xs font-semibold transition-colors ${
                      isLight ? 'text-zinc-800 hover:bg-zinc-100' : 'text-white/85 hover:bg-white/[0.08]'
                    }`}
                  >
                    <User className="w-4 h-4 text-emerald-500" />
                    <span>My Profile</span>
                  </Link>

                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setIsProfileOpen(false)}
                      className={`flex items-center gap-2.5 px-4 py-2 text-xs font-semibold transition-colors ${
                        isLight ? 'text-amber-800 hover:bg-amber-50' : 'text-amber-300/90 hover:bg-amber-500/10'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4 text-amber-500" />
                      <span>Admin Console</span>
                    </Link>
                  )}
                </div>

                {/* Sign Out */}
                <div className={`pt-1 border-t ${isLight ? 'border-zinc-100' : 'border-white/[0.08]'}`}>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold transition-colors cursor-pointer text-left text-rose-500 hover:bg-rose-500/10"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Mobile Dedicated Semester Switcher Bar (Clean, readable, zero overlap on mobile) */}
      <div 
        ref={mobileSemesterRef}
        className={`sm:hidden px-3 pb-2.5 pt-1 border-t relative ${
          isLight ? 'border-zinc-200/80 bg-white/60' : 'border-[#142e20]/80'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsMobileSemesterOpen(!isMobileSemesterOpen)}
          className={`h-9 w-full text-xs font-semibold px-3 rounded-xl flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/30 truncate transition-colors shadow-2xs border ${
            isLight
              ? 'bg-zinc-100 hover:bg-zinc-200/80 text-zinc-900 border-zinc-200'
              : 'bg-[#0c1e16] hover:bg-[#122b20] text-emerald-100 border-[#1a382b]'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">{currentSemester?.label || 'Select Semester'}</span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-150 shrink-0 ${isMobileSemesterOpen ? 'rotate-180' : ''}`} />
        </button>

        {isMobileSemesterOpen && (
          <div className={`mt-1.5 w-full rounded-2xl shadow-xl border p-1.5 animate-in fade-in zoom-in-95 duration-100 ${
            isLight
              ? 'bg-white border-zinc-200 text-zinc-800'
              : 'bg-[#0a2419] border-emerald-900/60 text-zinc-100'
          }`}>
            <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Academic Term
            </div>
            <div className="space-y-0.5">
              {semesters.map((s) => {
                const isSelected = s.id === currentSemester?.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onSelectSemester(s.id);
                      setIsMobileSemesterOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-colors cursor-pointer text-left ${
                      isSelected
                        ? isLight
                          ? 'bg-emerald-50 text-emerald-900 font-bold'
                          : 'bg-emerald-950/60 text-emerald-300 font-bold'
                        : isLight
                          ? 'text-zinc-700 hover:bg-zinc-100'
                          : 'text-zinc-300 hover:bg-emerald-900/30'
                    }`}
                  >
                    <span className="truncate">{s.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>

            {isOfficer && (
              <div className={`pt-1 mt-1 border-t ${isLight ? 'border-zinc-100' : 'border-emerald-900/40'}`}>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileSemesterOpen(false);
                    onOpenNewSemester();
                  }}
                  className={`w-full flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer text-left ${
                    isLight
                      ? 'text-emerald-700 hover:bg-emerald-50'
                      : 'text-emerald-400 hover:bg-emerald-950/50'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Start New Semester...</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
