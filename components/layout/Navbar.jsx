'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, Shield, Sparkles, User, Wallet, ShieldCheck, LogOut, ChevronDown, UserCheck, Sun, Moon, Check, Plus, Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { useTheme } from '@/components/theme/ThemeProvider';
import { Button, Badge, Input } from '@/components/ui';

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
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (_) {}
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl border-b transition-colors duration-200 bg-white/95 dark:bg-[#09090b]/95 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
        
        {/* Left: Organization Branding & Desktop Semester Switcher */}
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 shrink-0">
          {/* Logo & Brand Name */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <Image 
                src="/assets/lite-logo.png" 
                alt="LITE Logo" 
                width={32} 
                height={32} 
                className="object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <div className="flex flex-col justify-center shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight leading-tight text-zinc-950 dark:text-zinc-100">
                  FinLITE
                </span>
                <Badge variant="emerald" size="xs">
                  LITE • PDM
                </Badge>
              </div>
            </div>
          </div>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block"></div>

          {/* Desktop Interactive Semester Switcher (Hidden on mobile, shown on sm+) */}
          <div className="hidden sm:flex items-center relative" ref={semesterMenuRef}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsSemesterOpen(!isSemesterOpen)}
              className="max-w-[240px] truncate"
              leftIcon={<Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
              rightIcon={<ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-150 ${isSemesterOpen ? 'rotate-180' : ''}`} />}
              title="Select Academic Year / Semester or Start New Term"
            >
              <span className="truncate">{currentSemester?.label || 'Select Semester'}</span>
            </Button>

            {isSemesterOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-60 rounded-xl shadow-xl border p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 bg-white dark:bg-[#121214] border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100">
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
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer text-left ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 font-bold'
                            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <span className="truncate">{s.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>

                {isOfficer && (
                  <div className="pt-1 mt-1 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSemesterOpen(false);
                        onOpenNewSemester();
                      }}
                      className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer text-left text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
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

        {/* Center: Command Palette / Quick Search Trigger */}
        <div className="hidden lg:flex items-center w-64 xl:w-72">
          <Input 
            size="sm"
            leftIcon={<Search className="w-3.5 h-3.5" />}
            rightElement={
              <kbd className="text-[9px] font-mono px-1 py-0.5 rounded border border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 pointer-events-none">
                ⌘K
              </kbd>
            }
            placeholder="Quick search voucher, payee..." 
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const tableSearch = document.querySelector('input[placeholder*="Search"]');
                if (tableSearch) {
                  tableSearch.value = e.currentTarget.value;
                  tableSearch.dispatchEvent(new Event('input', { bubbles: true }));
                  tableSearch.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }
            }}
          />
        </div>

        {/* Right: Actions, Theme Toggle, AI Co-Pilot & Google Profile */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Theme Toggle Button (Light/Dark Mode) */}
          <ThemeToggle />

          {/* Quick Cash Reconciliation Button (Officer Gated) */}
          {isOfficer && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenDenominations}
              leftIcon={<Wallet className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
              title="Open Cash Box & Denomination Counter"
            >
              <span className="hidden sm:inline">Cash Box</span>
            </Button>
          )}

          {/* AI Co-Pilot Button */}
          <Button
            variant="emerald-subtle"
            size="sm"
            onClick={onOpenAI}
            leftIcon={<Sparkles className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />}
            title="FinLITE Accounting Copilot"
          >
            <span className="hidden sm:inline">Copilot</span>
            <span className="sm:hidden text-[11px] font-bold">AI</span>
          </Button>

          {/* Admin Console Link Button — STRICTLY VISIBLE TO ADMIN ONLY */}
          {isAdmin && (
            <Link href="/admin">
              <Button
                variant="amber-subtle"
                size="sm"
                leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                title="Open Admin Console & Approvals"
              >
                <span className="hidden sm:inline">Admin</span>
              </Button>
            </Link>
          )}

          {/* User Profile Section (Top Right Corner) */}
          <div className="relative pl-1" ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="h-8 flex items-center gap-2 px-2 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500/40 border bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-900/60 dark:hover:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-100"
              title="View Account Profile"
            >
              {avatarUrl ? (
                <div className="w-5 h-5 rounded-full overflow-hidden ring-1 ring-emerald-500/40 relative shrink-0">
                  <img
                    src={avatarUrl}
                    alt={fullName}
                    width={20}
                    height={20}
                    className="object-cover w-full h-full"
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  {initial}
                </div>
              )}

              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold leading-tight truncate max-w-[110px] text-zinc-900 dark:text-zinc-100">
                  {fullName}
                </span>
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 capitalize leading-none">
                  {isAdmin ? 'Admin' : currentRole}
                </span>
              </div>

              <ChevronDown className="w-3 h-3 hidden sm:block opacity-60 ml-0.5" />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-1.5 w-60 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 border bg-white dark:bg-[#121214] border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
                {/* User Header Info */}
                <div className="px-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    {avatarUrl ? (
                      <div className="w-9 h-9 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 relative shrink-0">
                        <img
                          src={avatarUrl}
                          alt={fullName}
                          width={36}
                          height={36}
                          className="object-cover w-full h-full"
                          referrerPolicy="no-referrer"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                        {initial}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate text-zinc-900 dark:text-zinc-100">{fullName}</p>
                      <p className="text-[10px] truncate text-zinc-500 dark:text-zinc-400">{email}</p>
                      <Badge variant="emerald" size="xs" className="mt-0.5 uppercase tracking-wider text-[9px]">
                        {isAdmin ? 'Super Admin' : currentRole}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Appearance Theme Switcher Row */}
                <div className="py-1 border-b border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors cursor-pointer text-left text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                  >
                    <span className="flex items-center gap-2">
                      {isLight ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-emerald-400" />}
                      <span>Theme Appearance</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded capitalize bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                      {theme}
                    </span>
                  </button>
                </div>

                {/* Navigation Links */}
                <div className="py-1">
                  <Link
                    href="/profile"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                  >
                    <User className="w-3.5 h-3.5 text-emerald-500" />
                    <span>My Profile</span>
                  </Link>

                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                      <span>Admin Console</span>
                    </Link>
                  )}
                </div>

                {/* Sign Out */}
                <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors cursor-pointer text-left text-rose-500 hover:bg-rose-500/10"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Mobile Dedicated Semester Switcher Bar */}
      <div 
        ref={mobileSemesterRef}
        className="sm:hidden px-3 pb-2 pt-1 border-t relative border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b]"
      >
        <button
          type="button"
          onClick={() => setIsMobileSemesterOpen(!isMobileSemesterOpen)}
          className="h-8 w-full text-xs font-medium px-2.5 rounded-lg flex items-center justify-between cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500/40 truncate transition-colors border bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-900/60 dark:hover:bg-zinc-900 text-zinc-900 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center gap-2 truncate">
            <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">{currentSemester?.label || 'Select Semester'}</span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-150 shrink-0 ${isMobileSemesterOpen ? 'rotate-180' : ''}`} />
        </button>

        {isMobileSemesterOpen && (
          <div className="mt-1.5 w-full rounded-xl shadow-xl border p-1.5 animate-in fade-in zoom-in-95 duration-100 bg-white dark:bg-[#121214] border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100">
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
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer text-left ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 font-bold'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="truncate">{s.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>

            {isOfficer && (
              <div className="pt-1 mt-1 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileSemesterOpen(false);
                    onOpenNewSemester();
                  }}
                  className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer text-left text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
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
