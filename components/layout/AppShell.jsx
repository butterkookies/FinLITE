'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import FloatingSidebar from '@/components/layout/FloatingSidebar';
import ModuleErrorBoundary from '@/components/common/ModuleErrorBoundary';
import { createClient } from '@/lib/supabase/client';
import { isSuperAdminEmail, resolveEffectiveRole } from '@/lib/config/admin';
import { DEFAULT_SEMESTERS } from '@/lib/config/semesters';

const AUTH_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/pending-approval',
  '/verify-email',
  '/sidebar-mockup'
];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(route + '/')
  );

  // Persistent Sidebar Collapse State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Authenticated User & Profile
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [currentRole, setCurrentRole] = useState('treasurer');

  // Multi-Semester State
  const [semesters, setSemesters] = useState(DEFAULT_SEMESTERS);
  const [currentSemester, setCurrentSemester] = useState(DEFAULT_SEMESTERS[0]);

  // Read initial collapse state from localStorage
  useEffect(() => {
    try {
      const savedCollapse = localStorage.getItem('finlite_sidebar_collapsed');
      if (savedCollapse !== null) {
        setIsSidebarCollapsed(savedCollapse === 'true');
      }
    } catch (_) {}
  }, []);

  // Pre-warm key application routes for zero-lag client-side navigation
  useEffect(() => {
    if (!isAuthRoute && router?.prefetch) {
      router.prefetch('/');
      router.prefetch('/admin');
      router.prefetch('/profile');
    }
  }, [router, isAuthRoute]);

  const handleToggleCollapse = (val) => {
    setIsSidebarCollapsed(val);
    try {
      localStorage.setItem('finlite_sidebar_collapsed', val ? 'true' : 'false');
    } catch (_) {}
  };

  // Load Auth User, Profile & Role once at AppShell level
  useEffect(() => {
    if (isAuthRoute) return;

    let mounted = true;
    async function loadAuth() {
      const supabase = createClient();
      if (!supabase) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!mounted || !user) return;

        setCurrentUser(user);
        const email = user.email?.toLowerCase();

        let profile = null;
        const { data: profileByAuth } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (profileByAuth) {
          profile = profileByAuth;
        } else if (email) {
          const { data: profileByEmail } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .maybeSingle();
          if (profileByEmail) profile = profileByEmail;
        }

        const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
        if (mounted && profile) {
          // Auto-sync Google photo into profile if user has no avatar set
          if (!profile.avatar_url && googleAvatar) {
            profile.avatar_url = googleAvatar;
            supabase
              .from('profiles')
              .update({ avatar_url: googleAvatar, updated_at: new Date().toISOString() })
              .eq('id', profile.id)
              .then(() => {})
              .catch(() => {});
          }
          setUserProfile(profile);
          const rawRole = profile.role || user.user_metadata?.role || 'member';
          const effectiveRole = resolveEffectiveRole(email, rawRole);
          setCurrentRole(effectiveRole);
        } else if (mounted && email && isSuperAdminEmail(email)) {
          setCurrentRole('admin');
        }
      } catch (err) {
        console.warn('AppShell auth load notice:', err);
      }
    }

    loadAuth();
    return () => { mounted = false; };
  }, [isAuthRoute]);

  // Load Semesters once at AppShell level
  useEffect(() => {
    if (isAuthRoute) return;

    let mounted = true;
    async function loadSemesters() {
      const supabase = createClient();
      if (!supabase) return;

      let activeSemestersList = DEFAULT_SEMESTERS;
      try {
        const { data: semData, error: semError } = await supabase
          .from('semesters')
          .select('*')
          .order('academic_year', { ascending: false });

        if (!semError && semData && semData.length > 0) {
          activeSemestersList = semData.map((s) => ({
            id: s.id,
            academicYear: s.academic_year,
            semester: s.semester,
            label: s.label,
            isActive: s.is_active,
          }));
          if (mounted) setSemesters(activeSemestersList);
        }
      } catch (semErr) {
        console.warn('AppShell semesters load notice:', semErr);
      }

      if (mounted) {
        let savedSemId = null;
        try {
          savedSemId = localStorage.getItem('finlite_active_semester_id');
        } catch (_) {}

        const matched = activeSemestersList.find(
          (s) => s.id === savedSemId || `${s.academicYear}-${s.semester}` === savedSemId
        ) || activeSemestersList.find((s) => s.isActive) || activeSemestersList[0];

        if (matched) setCurrentSemester(matched);
      }
    }

    loadSemesters();
    return () => { mounted = false; };
  }, [isAuthRoute]);

  const handleSelectSemester = (semId) => {
    const found = semesters.find(
      (s) => s.id === semId || `${s.academicYear}-${s.semester}` === semId
    );
    if (found) {
      setCurrentSemester(found);
      try {
        localStorage.setItem('finlite_active_semester_id', found.id);
      } catch (_) {}
      window.dispatchEvent(new CustomEvent('finlite:semester-changed', { detail: found }));
    }
  };

  // Action dispatcher: if on home dashboard, trigger modal directly; otherwise navigate to dashboard with query param
  const handleAction = useCallback((actionName) => {
    if (pathname === '/') {
      window.dispatchEvent(new CustomEvent('finlite:open-modal', { detail: actionName }));
    } else {
      router.push(`/?modal=${actionName}`);
    }
  }, [pathname, router]);

  // Active Tab determination based on current URL
  const activeTab = pathname?.startsWith('/admin')
    ? 'admin'
    : pathname?.startsWith('/profile')
      ? 'profile'
      : 'dashboard';

  // For public / auth pages, render children with zero sidebar overhead
  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex">
      {/* 1. Persistent Shared Sidebar (Desktop In-Flow Sticky + Mobile Slide-Over) */}
      <div className="no-print shrink-0">
        <ModuleErrorBoundary moduleName="Navigation Sidebar">
          <FloatingSidebar
            currentRole={currentRole}
            userProfile={userProfile}
            currentUser={currentUser}
            currentSemester={currentSemester}
            semesters={semesters}
            onSelectSemester={handleSelectSemester}
            onOpenNewSemester={() => handleAction('new_semester')}
            onOpenNewTx={() => handleAction('record')}
            onOpenDenominations={() => handleAction('cashbox')}
            onOpenAdvances={() => handleAction('advances')}
            onOpenDebts={() => handleAction('debts')}
            onOpenAI={() => handleAction('ai')}
            onOpenAuditTrail={() => handleAction('audit')}
            onExportReport={() => handleAction('export')}
            activeTab={activeTab}
            onSelectTab={(tab) => {
              if (tab === 'admin') router.push('/admin');
              else if (tab === 'dashboard') router.push('/');
              else if (tab === 'ledger') router.push('/#financial-ledger');
            }}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleCollapse}
          />
        </ModuleErrorBoundary>
      </div>

      {/* 2. Main Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  );
}
