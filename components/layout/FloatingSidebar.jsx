'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Home, 
  FileText, 
  Wallet, 
  HandCoins, 
  CreditCard, 
  FileSpreadsheet, 
  Sparkles, 
  ShieldCheck, 
  Shield, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  Check, 
  Plus, 
  User, 
  Settings,
  Menu,
  X,
  ExternalLink
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/components/theme/ThemeProvider';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { Badge } from '@/components/ui';

export default function FloatingSidebar({
  currentRole = 'member',
  userProfile = null,
  currentUser = null,
  currentSemester = null,
  semesters = [],
  onSelectSemester = () => {},
  onOpenNewSemester = () => {},
  onOpenNewTx = () => {},
  onOpenDenominations = () => {},
  onOpenAdvances = () => {},
  onOpenDebts = () => {},
  onOpenAI = () => {},
  onOpenAuditTrail = () => {},
  onOpenEditProfile = () => {},
  activeTab = 'dashboard',
  onSelectTab = () => {},
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  
  const toggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse(!isCollapsed);
    } else {
      setInternalCollapsed(!isCollapsed);
    }
  };

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSemesterMenuOpen, setIsSemesterMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const semesterMenuRef = useRef(null);
  const profileMenuRef = useRef(null);

  // Privileges
  const email = userProfile?.email || currentUser?.email || '';
  const isAdmin = currentRole === 'admin' || email.toLowerCase() === 'geronimoandreijohn.pdm@gmail.com';
  const isOfficer = isAdmin || ['treasurer', 'president', 'auditor', 'adviser'].includes(currentRole);

  const fullName = userProfile?.full_name || currentUser?.user_metadata?.full_name || 'FinLITE Member';
  const avatarUrl = userProfile?.avatar_url || currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture || null;
  const initial = fullName?.[0]?.toUpperCase() || 'U';

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (semesterMenuRef.current && !semesterMenuRef.current.contains(event.target)) {
        setIsSemesterMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
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

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      action: () => {
        onSelectTab('dashboard');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    },
    {
      id: 'ledger',
      label: 'Financial Ledger',
      icon: FileText,
      action: () => {
        onSelectTab('ledger');
        const el = document.getElementById('financial-ledger');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
    },
    {
      id: 'cashbox',
      label: 'Cash Box & Audit',
      icon: Wallet,
      action: () => onOpenDenominations(),
    },
    {
      id: 'advances',
      label: 'Personal Advances',
      badge: 'Abono',
      icon: HandCoins,
      action: () => onOpenAdvances(),
    },
    {
      id: 'debts',
      label: 'Debts & Receivables',
      icon: CreditCard,
      action: () => onOpenDebts(),
    },
    {
      id: 'reports',
      label: 'Liquidation Reports',
      icon: FileSpreadsheet,
      action: () => onExportReport(),
    },
  ];

  const utilityItems = [
    {
      id: 'copilot',
      label: 'AI Copilot',
      icon: Sparkles,
      highlight: true,
      action: () => onOpenAI(),
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      icon: ShieldCheck,
      action: () => onOpenAuditTrail(),
    },
    ...(isOfficer ? [
      {
        id: 'admin',
        label: 'Admin Console',
        icon: Shield,
        href: '/admin',
        isLink: true,
      }
    ] : []),
  ];

  return (
    <>
      {/* Mobile Floating Menu Button (Top Left Pill) */}
      <div className="md:hidden fixed top-3 left-3 z-50">
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="h-10 px-3 rounded-xl flex items-center gap-2 border bg-white/90 dark:bg-zinc-900/90 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-md backdrop-blur-md cursor-pointer active:scale-95"
          aria-label="Open Navigation Sidebar"
        >
          <Menu className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-bold">FinLITE</span>
        </button>
      </div>

      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
        />
      )}

      {/* The Floating Island Sidebar Container */}
      <aside
        className={`fixed z-50 flex flex-col transition-all duration-300 ease-in-out select-none
          border border-zinc-200/90 dark:border-zinc-800/90 
          bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-xl 
          shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.45)]
          rounded-2xl
          ${/* Mobile Layout: off-screen slide-over drawer */ ''}
          ${isMobileOpen 
            ? 'top-3 left-3 bottom-3 w-[270px] translate-x-0' 
            : 'max-md:-translate-x-[110%] md:translate-x-0 top-3 left-3 bottom-3'}
          ${/* Desktop Collapsible Width */ ''}
          ${isCollapsed ? 'md:w-[72px]' : 'md:w-[260px]'}
        `}
      >
        {/* 1. TOP HEADER: Organization Brand & Mobile Close */}
        <div className="p-3.5 pb-2 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900/80">
          <Link 
            href="/"
            className="flex items-center gap-2.5 min-w-0 group"
            title="FinLITE Homepage"
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/10 border border-emerald-500/20 group-hover:scale-105 transition-transform">
              <Image 
                src="/assets/lite-logo.png" 
                alt="LITE Logo" 
                width={24} 
                height={24} 
                className="object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>

            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col truncate">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    FinLITE
                  </span>
                  <Badge variant="emerald" size="xs">
                    LITE
                  </Badge>
                </div>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                  Financial Assistant
                </span>
              </div>
            )}
          </Link>

          {/* Mobile Close Button */}
          {isMobileOpen && (
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 2. SEMESTER SWITCHER CARD */}
        {(!isCollapsed || isMobileOpen) ? (
          <div className="px-3 pt-2 pb-1 relative" ref={semesterMenuRef}>
            <button
              type="button"
              onClick={() => setIsSemesterMenuOpen(!isSemesterMenuOpen)}
              className="w-full p-2 rounded-xl flex items-center justify-between gap-2 border bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80 transition-colors cursor-pointer text-left group"
              title="Change Academic Semester"
            >
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  Active Term
                </span>
                <span className="text-xs font-semibold truncate text-zinc-800 dark:text-zinc-200">
                  {currentSemester?.label || 'AY 2026–2027 • 1st Sem'}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 shrink-0 ${isSemesterMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Semester Dropdown */}
            {isSemesterMenuOpen && (
              <div className="absolute top-full left-3 right-3 mt-1.5 p-1.5 rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-xl z-50 text-xs space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  Select Semester
                </div>
                {semesters.map((sem) => {
                  const isSelected = currentSemester?.id === sem.id || `${currentSemester?.academicYear}-${currentSemester?.semester}` === `${sem.academicYear}-${sem.semester}`;
                  return (
                    <button
                      key={sem.id || sem.label}
                      type="button"
                      onClick={() => {
                        onSelectSemester(sem.id);
                        setIsSemesterMenuOpen(false);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold' 
                          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <span className="truncate">{sem.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}

                {isAdmin && (
                  <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSemesterMenuOpen(false);
                        onOpenNewSemester();
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-medium cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Start New Semester</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Collapsed Mini Term Badge */
          <div className="pt-2 px-2 flex justify-center">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center border bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer"
              title={`Term: ${currentSemester?.label || 'AY 2026–2027'}`}
              onClick={() => setIsCollapsed(false)}
            >
              SEM
            </div>
          </div>
        )}

        {/* 3. MIDDLE SCROLLABLE NAVIGATION LIST */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3 space-y-4 no-scrollbar">
          
          {/* Group 1: Core Navigation */}
          <div>
            {(!isCollapsed || isMobileOpen) && (
              <span className="px-2 pb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Core Modules
              </span>
            )}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      item.action();
                      setIsMobileOpen(false);
                    }}
                    title={isCollapsed && !isMobileOpen ? item.label : undefined}
                    className={`w-full flex items-center gap-2.5 rounded-xl transition-all cursor-pointer group text-xs font-medium
                      ${isCollapsed && !isMobileOpen ? 'justify-center p-2.5' : 'px-3 py-2'}
                      ${isActive 
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs' 
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100'}
                    `}
                  >
                    <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-600 dark:text-zinc-400'}`} />
                    {(!isCollapsed || isMobileOpen) && (
                      <span className="truncate flex-1 text-left">{item.label}</span>
                    )}
                    {(!isCollapsed || isMobileOpen) && item.badge && (
                      <Badge variant="amber" size="xs">
                        {item.badge}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Group 2: Utilities & Intelligence */}
          <div>
            {(!isCollapsed || isMobileOpen) && (
              <span className="px-2 pb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Intelligence & Tools
              </span>
            )}
            <nav className="space-y-1">
              {utilityItems.map((item) => {
                const Icon = item.icon;
                if (item.isLink) {
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      title={isCollapsed && !isMobileOpen ? item.label : undefined}
                      className={`w-full flex items-center gap-2.5 rounded-xl transition-all cursor-pointer group text-xs font-medium
                        ${isCollapsed && !isMobileOpen ? 'justify-center p-2.5' : 'px-3 py-2'}
                        text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100
                      `}
                    >
                      <Icon className="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-400 transition-transform group-hover:scale-110" />
                      {(!isCollapsed || isMobileOpen) && (
                        <div className="flex items-center justify-between flex-1 min-w-0">
                          <span className="truncate">{item.label}</span>
                          <ExternalLink className="w-3 h-3 text-zinc-400 opacity-60" />
                        </div>
                      )}
                    </Link>
                  );
                }

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      item.action();
                      setIsMobileOpen(false);
                    }}
                    title={isCollapsed && !isMobileOpen ? item.label : undefined}
                    className={`w-full flex items-center gap-2.5 rounded-xl transition-all cursor-pointer group text-xs font-medium
                      ${isCollapsed && !isMobileOpen ? 'justify-center p-2.5' : 'px-3 py-2'}
                      ${item.highlight
                        ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100'}
                    `}
                  >
                    <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${item.highlight ? 'text-amber-500 dark:text-amber-400' : 'text-zinc-600 dark:text-zinc-400'}`} />
                    {(!isCollapsed || isMobileOpen) && (
                      <span className="truncate flex-1 text-left">{item.label}</span>
                    )}
                    {(!isCollapsed || isMobileOpen) && item.highlight && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

        </div>

        {/* 4. BOTTOM SECTION: Account Settings, Profile, Theme Toggle & Sign Out */}
        <div className="p-2 border-t border-zinc-100 dark:border-zinc-900 space-y-2 relative" ref={profileMenuRef}>
          
          {/* User Profile Mini-Bar */}
          <Link 
            href="/profile"
            onClick={(e) => {
              if (onOpenEditProfile && onOpenEditProfile !== (() => {})) {
                // If special handler provided, prevent navigation
                // e.preventDefault();
              }
            }}
            className={`p-1.5 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 group
              ${isCollapsed && !isMobileOpen ? 'justify-center' : ''}
            `}
            title="Edit Profile & Account Settings"
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={fullName} 
                  className="w-8 h-8 rounded-lg object-cover ring-1 ring-zinc-200 dark:ring-zinc-800"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                  {initial}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-zinc-950 rounded-full" />
            </div>

            {/* User Meta */}
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold truncate text-zinc-800 dark:text-zinc-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                  {fullName}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 capitalize truncate">
                    {currentRole}
                  </span>
                  {isAdmin && (
                    <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  )}
                  {isAdmin && (
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                      ADMIN
                    </span>
                  )}
                </div>
              </div>
            )}

            {(!isCollapsed || isMobileOpen) && (
              <Settings className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-colors shrink-0" />
            )}
          </div>

          {/* Footer Controls: Theme Toggle, Sign Out, Collapse Button */}
          <div className={`flex items-center pt-1 border-t border-zinc-100 dark:border-zinc-900/60
            ${isCollapsed && !isMobileOpen ? 'flex-col gap-2' : 'justify-between px-1'}
          `}>
            {/* Theme Toggle */}
            <ThemeToggle className="hover:scale-105 active:scale-95" />

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={handleSignOut}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Desktop Collapse / Expand Toggle Button */}
            <button
              type="button"
              onClick={toggleCollapse}
              className="hidden md:flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

        </div>

      </aside>
    </>
  );
}
