'use client';

import { useState, useRef, useEffect, startTransition } from 'react';
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
  Bot,
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
  ExternalLink,
  Lock,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/components/theme/ThemeProvider';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { Badge } from '@/components/ui';
import UserAvatar from '@/components/common/UserAvatar';
import { isSuperAdminEmail } from '@/lib/config/admin';
import { resolveUserPermissions, ACTION_KEYS } from '@/lib/auth/permissions';

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
  onExportReport = () => {},
  activeTab: controlledActiveTab,
  onSelectTab: controlledOnSelectTab,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const [internalActiveTab, setInternalActiveTab] = useState('dashboard');
  const [optimisticTab, setOptimisticTab] = useState(null);

  useEffect(() => {
    setOptimisticTab(null);
  }, [pathname, controlledActiveTab]);
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;

  const handleSelectTab = (tabId) => {
    setInternalActiveTab(tabId);
    if (typeof controlledOnSelectTab === 'function') {
      controlledOnSelectTab(tabId);
    }
  };
  
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
  const isSuperAdmin = isSuperAdminEmail(email);
  const isAdmin = currentRole === 'admin' || isSuperAdmin;
  const isOfficer = isAdmin || ['treasurer', 'president', 'vice_president', 'auditor', 'adviser'].includes(currentRole);

  const userPermissions = resolveUserPermissions(userProfile, email);
  const canReconcileCash = Boolean(userPermissions[ACTION_KEYS.CASH_RECONCILIATION]);
  const canExportReports = Boolean(userPermissions[ACTION_KEYS.EXPORT_REPORTS]);

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
        handleSelectTab('dashboard');
        if (pathname !== '/') {
          startTransition(() => {
            router.push('/');
          });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      },
    },
    {
      id: 'ledger',
      label: 'Financial Ledger',
      icon: FileText,
      action: () => {
        handleSelectTab('ledger');
        if (pathname !== '/') {
          startTransition(() => {
            router.push('/#financial-ledger');
          });
        } else {
          const el = document.getElementById('financial-ledger');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      },
    },
    {
      id: 'cashbox',
      label: 'Cash Box & Audit',
      icon: Wallet,
      disabled: !canReconcileCash,
      tooltip: !canReconcileCash ? 'Cash reconciliation restricted by Administrator' : undefined,
      action: () => {
        if (!canReconcileCash) return;
        if (typeof onOpenDenominations === 'function') onOpenDenominations();
      },
    },
    {
      id: 'advances',
      label: 'Personal Advances',
      badge: 'Abono',
      icon: HandCoins,
      action: () => {
        if (typeof onOpenAdvances === 'function') onOpenAdvances();
      },
    },
    {
      id: 'debts',
      label: 'Debts & Receivables',
      icon: CreditCard,
      action: () => {
        if (typeof onOpenDebts === 'function') onOpenDebts();
      },
    },
    {
      id: 'reports',
      label: 'Financial Report',
      icon: FileSpreadsheet,
      disabled: !canExportReports,
      tooltip: !canExportReports ? 'Report generation restricted by Administrator' : undefined,
      action: () => {
        if (!canExportReports) return;
        if (typeof onExportReport === 'function') onExportReport();
      },
    },
  ];

  const utilityItems = [
    {
      id: 'copilot',
      label: 'AI Copilot',
      icon: Bot,
      highlight: true,
      action: () => {
        if (typeof onOpenAI === 'function') onOpenAI();
      },
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      icon: ShieldCheck,
      action: () => {
        if (typeof onOpenAuditTrail === 'function') onOpenAuditTrail();
      },
    },
    ...(isAdmin ? [
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
      {/* Mobile Floating Menu Button: Three lines icon only, borderless, hidden when sidebar is open */}
      {!isMobileOpen && (
        <div className="md:hidden fixed top-3 left-3 z-30">
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-800 dark:text-zinc-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 active:scale-95 transition-[background-color,color,transform] duration-150 cursor-pointer focus:outline-none"
            aria-label="Open Navigation Sidebar"
          >
            <Menu className="w-5 h-5 text-zinc-800 dark:text-zinc-200" />
          </button>
        </div>
      )}

      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
        />
      )}

      {/* Modern SaaS Full-Height Sidebar Column */}
      <aside
        className={`select-none flex flex-col transition-[width,transform] duration-300 ease-in-out
          border-r border-zinc-200/90 dark:border-zinc-800/90 
          bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-xl
          ${/* Mobile: fixed off-canvas slide-over drawer */ ''}
          fixed md:sticky top-0 bottom-0 inset-y-0 left-0 z-50 md:z-30 h-[100dvh] max-h-[100dvh] shrink-0
          ${isMobileOpen ? 'translate-x-0 shadow-2xl w-[270px]' : 'max-md:-translate-x-full md:translate-x-0'}
          ${/* Desktop In-Flow Column Width */ ''}
          ${isCollapsed ? 'md:w-[72px]' : 'md:w-[260px]'}
        `}
      >
        {/* 1. TOP HEADER: Organization Brand, Desktop Collapse & Mobile Close */}
        <div className={`p-3 pb-2 flex items-center border-b border-zinc-100 dark:border-zinc-900/80 ${isCollapsed && !isMobileOpen ? 'flex-col gap-2 justify-center' : 'justify-between'}`}>
          <Link 
            href="/"
            className="flex items-center gap-2.5 min-w-0 group"
            title="FinLITE Homepage"
          >
            {/* Pure Logo without boxy border (Pin #2) */}
            <div className="w-8 h-8 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Image 
                src="/assets/lite-logo.png" 
                alt="LITE Logo" 
                width={30} 
                height={30} 
                className="object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>

            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col truncate">
                <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  FinLITE
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                  Financial Assistant
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse / Expand Toggle Button - Relocated to Top (Pin #3) */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden md:flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>

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
              className="w-9 h-9 rounded-xl flex items-center justify-center border bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title={`Term: ${currentSemester?.label || 'AY 2026–2027'} (Click to expand sidebar)`}
              onClick={toggleCollapse}
            >
              SEM
            </div>
          </div>
        )}

        {/* 3. MIDDLE SCROLLABLE NAVIGATION LIST */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2.5 py-3 space-y-4 no-scrollbar">
          
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
                const isActive = (optimisticTab || activeTab) === item.id;
                const isDisabled = Boolean(item.disabled);
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      if (isDisabled) return;
                      setOptimisticTab(item.id);
                      item.action();
                      setIsMobileOpen(false);
                    }}
                    onMouseEnter={() => {
                      if (!isDisabled && pathname !== '/' && (item.id === 'dashboard' || item.id === 'ledger') && router?.prefetch) {
                        router.prefetch('/');
                      }
                    }}
                    title={isDisabled ? (item.tooltip || 'Restricted by Administrator') : (isCollapsed && !isMobileOpen ? item.label : undefined)}
                    className={`w-full flex items-center gap-2.5 rounded-xl transition-colors duration-150 text-xs font-medium
                      ${isDisabled ? 'opacity-50 cursor-not-allowed select-none' : 'cursor-pointer group'}
                      ${isCollapsed && !isMobileOpen ? 'justify-center p-2.5' : 'px-3 py-2'}
                      ${isActive 
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs' 
                        : isDisabled
                          ? 'text-zinc-400 dark:text-zinc-500'
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 hover:text-zinc-900 dark:hover:text-zinc-100'}
                    `}
                  >
                    <div className="relative">
                      <Icon className={`w-4 h-4 shrink-0 transition-transform duration-150 ${!isDisabled ? 'group-hover:scale-110' : ''} ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-600 dark:text-zinc-400'}`} />
                      {isDisabled && (
                        <span className="absolute -top-1 -right-1 p-0.5 rounded-full bg-zinc-900 text-amber-400 shadow-xs" title="Restricted by Administrator">
                          <Lock className="w-2 h-2" />
                        </span>
                      )}
                    </div>
                    {(!isCollapsed || isMobileOpen) && (
                      <span className="truncate flex-1 text-left flex items-center gap-1">
                        {item.label}
                        {isDisabled && <Lock className="w-2.5 h-2.5 text-zinc-400 shrink-0" />}
                      </span>
                    )}
                    {(!isCollapsed || isMobileOpen) && item.badge && !isDisabled && (
                      <Badge variant="amber" size="xs">
                        {item.badge}
                      </Badge>
                    )}
                    {(!isCollapsed || isMobileOpen) && isDisabled && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-500 font-normal">
                        Locked
                      </span>
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
                  const isLinkActive = (optimisticTab || (pathname === item.href ? item.id : null)) === item.id;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setOptimisticTab(item.id)}
                      title={isCollapsed && !isMobileOpen ? item.label : undefined}
                      className={`w-full flex items-center gap-2.5 rounded-xl transition-colors duration-150 cursor-pointer group text-xs font-medium
                        ${isCollapsed && !isMobileOpen ? 'justify-center p-2.5' : 'px-3 py-2'}
                        ${isLinkActive
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs'
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 hover:text-zinc-900 dark:hover:text-zinc-100'}
                      `}
                    >
                      <Icon className={`w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-110 ${isLinkActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-600 dark:text-zinc-400'}`} />
                      {(!isCollapsed || isMobileOpen) && (
                        <div className="flex items-center justify-between flex-1 min-w-0">
                          <span className="truncate">{item.label}</span>
                          {!isLinkActive && <ExternalLink className="w-3 h-3 text-zinc-400 opacity-60" />}
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
                    className={`w-full flex items-center gap-2.5 rounded-xl transition-colors duration-150 cursor-pointer group text-xs font-medium
                      ${isCollapsed && !isMobileOpen ? 'justify-center p-2.5' : 'px-3 py-2'}
                      ${item.highlight
                        ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 hover:text-zinc-900 dark:hover:text-zinc-100'}
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
        <div className="p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-zinc-100 dark:border-zinc-900 space-y-2 relative shrink-0" ref={profileMenuRef}>
          
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
              <UserAvatar
                src={avatarUrl}
                name={fullName}
                email={email}
                size="base"
                rounded="lg"
                alt={fullName}
                className="ring-1 ring-zinc-200 dark:ring-zinc-800"
              />
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
          </Link>

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
              className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>

      </aside>
    </>
  );
}
