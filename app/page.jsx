'use client';
import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Plus, Wallet, Calculator, Sparkles, FileText, CreditCard, Bot } from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';
import StatCards from '@/components/dashboard/StatCards';
import TransactionTable from '@/components/ledger/TransactionTable';
import ModuleErrorBoundary from '@/components/common/ModuleErrorBoundary';
import { createClient } from '@/lib/supabase/client';
import { isSuperAdminEmail } from '@/lib/config/admin';
import { DEFAULT_SEMESTERS } from '@/lib/config/semesters';
import { toCentavos, fromCentavos, denomCodeToCountKey, formatPHP } from '@/lib/utils/currency';
import { validateTransactionAmount, validateOutflowBalance } from '@/lib/utils/validation';
import { Card, Badge, Button } from '@/components/ui';
import { resolveUserPermissions, hasPermission, ACTION_KEYS } from '@/lib/auth/permissions';

// Dynamically split heavy modals out of the initial critical client bundle
const NewTransactionModal = dynamic(() => import('@/components/ledger/NewTransactionModal'), {
  ssr: false,
  loading: () => null,
});
const AuditReviewModal = dynamic(() => import('@/components/audit/AuditReviewModal'), {
  ssr: false,
  loading: () => null,
});
const DenominationCounter = dynamic(() => import('@/components/reconciliation/DenominationCounter'), {
  ssr: false,
  loading: () => null,
});
const AIChatDrawer = dynamic(() => import('@/components/ai/AIChatDrawer'), {
  ssr: false,
  loading: () => null,
});
const NewProposalModal = dynamic(() => import('@/components/proposals/NewProposalModal'), {
  ssr: false,
  loading: () => null,
});
const DocumentPreviewModal = dynamic(() => import('@/components/reports/DocumentPreviewModal'), {
  ssr: false,
  loading: () => null,
});
const NewSemesterModal = dynamic(() => import('@/components/semesters/NewSemesterModal'), {
  ssr: false,
  loading: () => null,
});
const AuditTrailDrawer = dynamic(() => import('@/components/audit/AuditTrailDrawer'), {
  ssr: false,
  loading: () => null,
});
const DebtsManagementModal = dynamic(() => import('@/components/debts/DebtsManagementModal'), {
  ssr: false,
  loading: () => null,
});
const AdvancesManagementModal = dynamic(() => import('@/components/debts/AdvancesManagementModal'), {
  ssr: false,
  loading: () => null,
});

const DEFAULT_LITE_SIGNATORIES_26_27 = {
  presidentName: 'GERONIMO, ANDREI JOHN P.',
  presidentRole: 'LITE President',
  vicePresidentName: 'BAJAMUNDE, JHELLIAM T.',
  vicePresidentRole: 'LITE Vice President',
  treasurerName: 'CABANAG, ROSE MARIELLE P.',
  treasurerRole: 'LITE Treasurer',
  auditorName: 'SARA, RISHAME P.',
  auditorRole: 'LITE Auditor',
  preparedBy: 'CABANAG, ROSE MARIELLE P.',
  preparedRole: 'LITE Treasurer',
  reviewedBy: 'SARA, RISHAME P.',
  reviewedRole: 'LITE Auditor',
  notedBy: 'GERONIMO, ANDREI JOHN P.',
  notedRole: 'LITE President',
  adviser1: 'MS. KIMBERLY DAWN JATULAN',
  adviser2: 'MS. KRIZIA MAE GENOVIA',
  adviserName: 'MS. KIMBERLY DAWN JATULAN',
  adviserRole: 'LITE Club Advisers',
};

const DEFAULT_LITE_SIGNATORIES_25_26 = {
  presidentName: 'MALBAROSA, EMANUEL',
  presidentRole: 'LITE President',
  vicePresidentName: '',
  vicePresidentRole: '',
  treasurerName: 'GERONIMO, ANDREI JOHN P.',
  treasurerRole: 'LITE Treasurer',
  auditorName: 'CABANAG, ROSE MARIELLE P.',
  auditorRole: 'LITE Auditor',
  preparedBy: 'GERONIMO, ANDREI JOHN P.',
  preparedRole: 'LITE Treasurer',
  reviewedBy: 'CABANAG, ROSE MARIELLE P.',
  reviewedRole: 'LITE Auditor',
  notedBy: 'MALBAROSA, EMANUEL',
  notedRole: 'LITE President',
  adviser1: 'MS. KIMBERLY DAWN JATULAN',
  adviser2: 'MR. FLORANTE PANGILINAN',
  adviserName: 'MS. KIMBERLY DAWN JATULAN',
  adviserRole: 'LITE Club Advisers',
};

const DEFAULT_LITE_SIGNATORIES = DEFAULT_LITE_SIGNATORIES_26_27;

// Module-level in-memory cache for instant client-side route transitions
let dashboardCache = null;

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState(dashboardCache?.currentUser || null);
  const [userProfile, setUserProfile] = useState(dashboardCache?.userProfile || null);
  const [currentRole, setCurrentRole] = useState(dashboardCache?.currentRole || 'treasurer');
  const [transactions, setTransactions] = useState(dashboardCache?.transactions || []);
  const [isDbConnected, setIsDbConnected] = useState(Boolean(dashboardCache));
  const [isLoading, setIsLoading] = useState(!dashboardCache);
  const [isNewTxOpen, setIsNewTxOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [auditModalTx, setAuditModalTx] = useState(null);
  const [isDenomOpen, setIsDenomOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isProposalOpen, setIsProposalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [debts, setDebts] = useState(dashboardCache?.debts || []);
  const [isDebtsOpen, setIsDebtsOpen] = useState(false);
  const [advances, setAdvances] = useState(dashboardCache?.advances || []);
  const [isAdvancesOpen, setIsAdvancesOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [latestReconciliation, setLatestReconciliation] = useState(dashboardCache?.latestReconciliation || null);
  const [semesterSignatories, setSemesterSignatories] = useState(DEFAULT_LITE_SIGNATORIES);

  // Multi-Semester State Management
  const [semesters, setSemesters] = useState(dashboardCache?.semesters || DEFAULT_SEMESTERS);
  const [currentSemester, setCurrentSemester] = useState(dashboardCache?.currentSemester || DEFAULT_SEMESTERS[0]);
  const [isNewSemesterOpen, setIsNewSemesterOpen] = useState(false);

  // 3NF Master Catalog States
  const [categories, setCategories] = useState(dashboardCache?.categories || []);
  const [denominations, setDenominations] = useState(dashboardCache?.denominations || []);

  // Dynamic Time-of-Day Greeting (Good morning / Good afternoon / Good evening)
  const [greeting, setGreeting] = useState('Good day');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('Good morning');
    } else if (hour >= 12 && hour < 18) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }
  }, []);

  // Listen to modal open triggers dispatched from AppShell or URL
  useEffect(() => {
    const handleOpenModal = (e) => {
      const act = e.detail;
      if (act === 'record') setIsNewTxOpen(true);
      else if (act === 'cashbox') setIsDenomOpen(true);
      else if (act === 'advances') setIsAdvancesOpen(true);
      else if (act === 'debts') setIsDebtsOpen(true);
      else if (act === 'ai') setIsAIOpen(true);
      else if (act === 'audit') setIsAuditOpen(true);
      else if (act === 'export') handleOpenLiquidationPreview();
      else if (act === 'new_semester') setIsNewSemesterOpen(true);
    };

    const handleSemesterChanged = (e) => {
      if (e.detail) setCurrentSemester(e.detail);
    };

    window.addEventListener('finlite:open-modal', handleOpenModal);
    window.addEventListener('finlite:semester-changed', handleSemesterChanged);

    // Check URL query param on load
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const modalParam = params.get('modal') || params.get('action');
      if (modalParam) {
        handleOpenModal({ detail: modalParam });
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }

    return () => {
      window.removeEventListener('finlite:open-modal', handleOpenModal);
      window.removeEventListener('finlite:semester-changed', handleSemesterChanged);
    };
  }, []);

  // Handle Deep-Links from Audit & Revision Emails (?auditTx=id, ?editTx=id)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const auditTxId = params.get('auditTx');
      const editTxId = params.get('editTx');

      if (auditTxId) {
        const found = transactions.find((t) => t.id === auditTxId);
        if (found) {
          setAuditModalTx(found);
        } else {
          fetch(`/api/transactions/${auditTxId}`)
            .then((r) => r.json())
            .then((d) => {
              if (d.transaction) setAuditModalTx(d.transaction);
            })
            .catch(() => {});
        }
      } else if (editTxId) {
        const found = transactions.find((t) => t.id === editTxId);
        if (found) {
          setEditingTx(found);
          setIsNewTxOpen(true);
        } else {
          fetch(`/api/transactions/${editTxId}`)
            .then((r) => r.json())
            .then((d) => {
              if (d.transaction) {
                setEditingTx(d.transaction);
                setIsNewTxOpen(true);
              }
            })
            .catch(() => {});
        }
      }
    }
  }, [transactions]);

  const supabase = createClient();
  const isSuperAdmin = isSuperAdminEmail(currentUser?.email || userProfile?.email);

  const userPermissions = useMemo(() => {
    return resolveUserPermissions(userProfile, currentUser?.email);
  }, [userProfile, currentUser]);

  const canManageFinancials = isSuperAdmin ||
    Boolean(userPermissions[ACTION_KEYS.RECORD_INFLOW]) ||
    Boolean(userPermissions[ACTION_KEYS.RECORD_OUTFLOW]) ||
    Boolean(userPermissions[ACTION_KEYS.AUDIT_APPROVE]) ||
    currentRole === 'treasurer' || currentRole === 'president' || currentRole === 'admin';

  // Load user profile, semesters, categories, denominations & transactions from Supabase on mount
  useEffect(() => {
    async function loadData() {
      if (!supabase) {
        setTransactions([]);
        setIsLoading(false);
        return;
      }

      if (!dashboardCache) {
        setIsLoading(true);
      }

      try {
        // 1. Auth & Profile Promise
        const authPromise = (async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return null;
          const email = user.email?.toLowerCase();
          const isSuperAdmin = isSuperAdminEmail(email);

          let { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('auth_user_id', user.id)
            .maybeSingle();

          if (!profile && email) {
            const { data: profileByEmail } = await supabase
              .from('profiles')
              .select('*')
              .eq('email', email)
              .maybeSingle();
            profile = profileByEmail;
          }

          return { user, profile, isSuperAdmin, email };
        })();

        // 2. Categories Reference Promise
        const catPromise = supabase
          .from('categories')
          .select('*')
          .order('name');

        // 3. Denominations Reference Promise
        const denomPromise = supabase
          .from('denominations')
          .select('*')
          .order('display_order');

        // 4. Semesters Reference Promise
        const semPromise = supabase
          .from('semesters')
          .select('*')
          .order('academic_year', { ascending: false });

        // 5. Transactions with 3NF Joins Promise
        const txPromise = supabase
          .from('transactions')
          .select(`
            *,
            categories (id, name, type),
            semesters (id, academic_year, semester, label),
            transaction_receipts (id, public_url, sort_order),
            profiles (id, full_name, role, email, avatar_url)
          `)
          .order('transaction_date', { ascending: false })
          .order('created_at', { ascending: false });

        // 6. Latest Cash Reconciliation Promise
        const reconPromise = supabase
          .from('cash_reconciliations')
          .select(`
            *,
            cash_reconciliation_items (
              id,
              denomination_id,
              quantity,
              subtotal,
              denominations (id, code, label, face_value)
            )
          `)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // 7. Debts & Receivables Promise
        const debtsPromise = supabase
          .from('debts_receivables')
          .select(`
            *,
            debt_payments (*)
          `)
          .order('created_at', { ascending: false });

        // 8. Advances & Payables Promise
        const advPromise = supabase
          .from('advances_payable')
          .select(`
            *,
            advance_disbursements (*),
            advance_receipts (*)
          `)
          .order('created_at', { ascending: false });

        // Execute all 8 database queries simultaneously in parallel
        const [
          authRes,
          catRes,
          denomRes,
          semRes,
          txRes,
          reconRes,
          debtsRes,
          advRes,
        ] = await Promise.allSettled([
          authPromise,
          catPromise,
          denomPromise,
          semPromise,
          txPromise,
          reconPromise,
          debtsPromise,
          advPromise,
        ]);

        // Process Auth
        let activeUser = currentUser;
        let activeProfile = userProfile;
        let activeRole = currentRole;
        if (authRes.status === 'fulfilled' && authRes.value) {
          const { user, profile, isSuperAdmin, email } = authRes.value;
          activeUser = user;
          setCurrentUser(user);

          if (profile) {
            const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
            if (!profile.avatar_url && googleAvatar) {
              profile.avatar_url = googleAvatar;
            }
            activeProfile = profile;
            activeRole = isSuperAdmin ? 'admin' : (profile.role || 'member');
            setUserProfile(profile);
            setCurrentRole(activeRole);
          } else if (isSuperAdmin) {
            activeProfile = {
              email,
              full_name: user.user_metadata?.full_name || 'Andrei John Geronimo',
              role: 'admin',
              status: 'approved',
              avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            };
            activeRole = 'admin';
            setUserProfile(activeProfile);
            setCurrentRole(activeRole);
          }
        }

        // Process Categories
        let activeCategories = categories;
        if (catRes.status === 'fulfilled' && !catRes.value.error && catRes.value.data) {
          activeCategories = catRes.value.data;
          setCategories(activeCategories);
        }

        // Process Denominations
        let activeDenominations = denominations;
        if (denomRes.status === 'fulfilled' && !denomRes.value.error && denomRes.value.data) {
          activeDenominations = denomRes.value.data;
          setDenominations(activeDenominations);
        }

        // Process Semesters
        let activeSemestersList = semesters || DEFAULT_SEMESTERS;
        if (semRes.status === 'fulfilled' && !semRes.value.error && semRes.value.data && semRes.value.data.length > 0) {
          activeSemestersList = semRes.value.data.map((s) => ({
            id: s.id,
            academicYear: s.academic_year,
            semester: s.semester,
            label: s.label,
            isActive: s.is_active,
          }));
          setSemesters(activeSemestersList);
        }

        const savedSemId = typeof window !== 'undefined' ? localStorage.getItem('finlite_active_semester_id') : null;
        const matchedSemester = activeSemestersList.find((s) => s.id === savedSemId || `${s.academicYear}-${s.semester}` === savedSemId)
          || activeSemestersList.find((s) => s.isActive)
          || activeSemestersList[0];

        if (matchedSemester) {
          setCurrentSemester(matchedSemester);
        }

        // Process Transactions
        let normalized = null;
        if (txRes.status === 'fulfilled') {
          let rawData = null;
          if (txRes.value.error) {
            console.warn('3NF relational select fallback to base select:', txRes.value.error.message);
            const { data: flatData, error: flatError } = await supabase
              .from('transactions')
              .select('*')
              .order('transaction_date', { ascending: false })
              .order('created_at', { ascending: false });

            if (flatError) {
              console.warn('Supabase transactions fetch failed:', flatError.message);
              setTransactions([]);
            } else {
              setIsDbConnected(true);
              rawData = flatData || [];
            }
          } else if (txRes.value.data) {
            setIsDbConnected(true);
            rawData = txRes.value.data;
          }

          if (rawData) {
            normalized = rawData.map((t) => ({
              ...t,
              category_name: t.categories?.name || t.category_name,
              category_id: t.category_id || t.categories?.id,
              academic_year: t.semesters?.academic_year || t.academic_year,
              semester: t.semesters?.semester || t.semester,
              logged_by_name: t.profiles?.full_name || t.logged_by_name || null,
              logged_by_role: t.profiles?.role || t.logged_by_role || null,
              logged_by_email: t.profiles?.email || t.logged_by_email || null,
              logged_by_avatar_url: t.profiles?.avatar_url || t.logged_by_avatar_url || null,
              receipt_urls: (Array.isArray(t.transaction_receipts) && t.transaction_receipts.length > 0)
                ? t.transaction_receipts.sort((a, b) => a.sort_order - b.sort_order).map((r) => r.public_url)
                : (Array.isArray(t.receipt_urls) && t.receipt_urls.length > 0 ? t.receipt_urls : (t.receipt_url ? [t.receipt_url] : [])),
              receipt_url: (Array.isArray(t.transaction_receipts) && t.transaction_receipts.length > 0)
                ? (t.transaction_receipts.find((r) => r.sort_order === 0)?.public_url || t.transaction_receipts[0]?.public_url)
                : (t.receipt_url || (Array.isArray(t.receipt_urls) && t.receipt_urls[0]) || null),
            }));

            // Secondary enrichment: Resolve names for any transactions with missing profile joins
            const missingProfileIds = [...new Set(
              normalized
                .filter((t) => t.logged_by && !t.logged_by_name)
                .map((t) => t.logged_by)
            )];

            if (missingProfileIds.length > 0) {
              try {
                const { data: profs } = await supabase
                  .from('profiles')
                  .select('id, full_name, email, role, avatar_url, auth_user_id')
                  .or(`id.in.(${missingProfileIds.join(',')}),auth_user_id.in.(${missingProfileIds.join(',')})`);

                if (profs && profs.length > 0) {
                  const idMap = new Map();
                  profs.forEach((p) => {
                    if (p.id) idMap.set(p.id, p);
                    if (p.auth_user_id) idMap.set(p.auth_user_id, p);
                  });

                  normalized = normalized.map((t) => {
                    const matchedProfile = t.logged_by ? idMap.get(t.logged_by) : null;
                    if (!matchedProfile) return t;
                    return {
                      ...t,
                      logged_by_name: t.logged_by_name || matchedProfile.full_name,
                      logged_by_role: t.logged_by_role || matchedProfile.role,
                      logged_by_email: t.logged_by_email || matchedProfile.email,
                      logged_by_avatar_url: t.logged_by_avatar_url || matchedProfile.avatar_url,
                    };
                  });
                }
              } catch (enrichErr) {
                console.warn('Profile creator enrichment notice:', enrichErr?.message);
              }
            }

            setTransactions(normalized);
          }
        }

        // Process Cash Reconciliation
        let activeRecon = latestReconciliation;
        if (reconRes.status === 'fulfilled' && !reconRes.value.error && reconRes.value.data) {
          activeRecon = reconRes.value.data;
          if (Array.isArray(activeRecon.cash_reconciliation_items) && activeRecon.cash_reconciliation_items.length > 0) {
            activeRecon.cash_reconciliation_items.forEach((item) => {
              const code = item.denominations?.code;
              if (code) {
                const countKey = denomCodeToCountKey(code);
                activeRecon[countKey] = item.quantity;
                activeRecon[code.toLowerCase()] = item.quantity;
              }
            });
          }
          setLatestReconciliation(activeRecon);
          if (typeof window !== 'undefined') {
            try { localStorage.setItem('finlite_latest_reconciliation', JSON.stringify(activeRecon)); } catch (_) {}
          }
        } else {
          const cached = typeof window !== 'undefined' ? localStorage.getItem('finlite_latest_reconciliation') : null;
          if (cached) {
            try {
              activeRecon = JSON.parse(cached);
              setLatestReconciliation(activeRecon);
            } catch (_) {}
          }
        }

        // Process Debts & Receivables
        let activeDebtsList = debts;
        if (debtsRes.status === 'fulfilled' && !debtsRes.value.error && debtsRes.value.data && debtsRes.value.data.length > 0) {
          activeDebtsList = debtsRes.value.data;
          setDebts(activeDebtsList);
          if (typeof window !== 'undefined') {
            try { localStorage.setItem('finlite_debts', JSON.stringify(activeDebtsList)); } catch (_) {}
          }
        } else {
          const cachedDebts = typeof window !== 'undefined' ? localStorage.getItem('finlite_debts') : null;
          if (cachedDebts) {
            try {
              activeDebtsList = JSON.parse(cachedDebts);
              setDebts(activeDebtsList);
            } catch (_) {}
          }
        }

        // Process Advances & Payables
        let activeAdvList = advances;
        if (advRes.status === 'fulfilled' && !advRes.value.error && advRes.value.data && advRes.value.data.length > 0) {
          activeAdvList = advRes.value.data;
          setAdvances(activeAdvList);
          if (typeof window !== 'undefined') {
            try { localStorage.setItem('finlite_advances', JSON.stringify(activeAdvList)); } catch (_) {}
          }
        } else {
          const cachedAdv = typeof window !== 'undefined' ? localStorage.getItem('finlite_advances') : null;
          if (cachedAdv) {
            try {
              activeAdvList = JSON.parse(cachedAdv);
              setAdvances(activeAdvList);
            } catch (_) {}
          } else if (normalized && normalized.length > 0) {
            activeAdvList = normalized
              .filter((t) => t.is_reimbursement)
              .map((t) => ({
                id: t.id,
                semester_id: t.semester_id || 'sem-26-27-1',
                claimant_name: t.reimbursement_recipient || 'Club Officer',
                title: t.title,
                category_name: t.category_name,
                event_name: t.event_name,
                total_amount: Number(t.amount || 0),
                amount_reimbursed: t.status === 'REIMBURSED' ? Number(t.amount || 0) : 0,
                status: t.status === 'REIMBURSED' ? 'SETTLED' : 'UNPAID',
                advance_date: t.transaction_date,
                receipt_url: t.receipt_url,
                receipt_urls: t.receipt_urls || [],
                notes: t.description,
                advance_disbursements: t.status === 'REIMBURSED' ? [{
                  id: `disb-${t.id}`,
                  advance_id: t.id,
                  amount: Number(t.amount || 0),
                  payment_method: t.payment_method || 'CASH',
                  disbursement_date: t.transaction_date || new Date().toISOString(),
                }] : [],
              }));
            setAdvances(activeAdvList);
          }
        }

        // Populate in-memory cache for instant route transitions
        dashboardCache = {
          currentUser: activeUser,
          userProfile: activeProfile,
          currentRole: activeRole,
          categories: activeCategories,
          denominations: activeDenominations,
          semesters: activeSemestersList,
          currentSemester: matchedSemester,
          transactions: normalized || transactions,
          latestReconciliation: activeRecon,
          debts: activeDebtsList,
          advances: activeAdvList,
        };
      } catch (err) {
        console.error('Database connection error:', err);
        setTransactions([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Persist debts state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && debts && debts.length > 0) {
      try {
        localStorage.setItem('finlite_debts', JSON.stringify(debts));
      } catch (_) {}
    }
  }, [debts]);

  // Persist advances state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && advances && advances.length > 0) {
      try {
        localStorage.setItem('finlite_advances', JSON.stringify(advances));
      } catch (_) {}
    }
  }, [advances]);

  // Load official semester signatories from Supabase whenever active semester changes
  useEffect(() => {
    async function loadSignatories() {
      if (!supabase || !currentSemester?.academicYear || !currentSemester?.semester) return;
      try {
        const { data, error } = await supabase
          .from('semester_signatories')
          .select('*')
          .eq('academic_year', currentSemester.academicYear)
          .eq('semester', currentSemester.semester)
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        const termDefault = currentSemester.academicYear === '2025-2026' 
          ? DEFAULT_LITE_SIGNATORIES_25_26 
          : DEFAULT_LITE_SIGNATORIES_26_27;

        if (!error && data && data.length > 0) {
          const sigMap = { ...termDefault };
          data.forEach((row) => {
            if (row.role_key === 'president') {
              sigMap.notedBy = row.name;
              sigMap.notedRole = row.position_title;
              sigMap.presidentName = row.name;
              sigMap.presidentRole = row.position_title;
            } else if (row.role_key === 'vice_president' || row.role_key === 'vp') {
              sigMap.vicePresidentName = row.name;
              sigMap.vicePresidentRole = row.position_title;
            } else if (row.role_key === 'treasurer') {
              sigMap.preparedBy = row.name;
              sigMap.preparedRole = row.position_title;
              sigMap.treasurerName = row.name;
              sigMap.treasurerRole = row.position_title;
            } else if (row.role_key === 'auditor') {
              sigMap.reviewedBy = row.name;
              sigMap.reviewedRole = row.position_title;
              sigMap.auditorName = row.name;
              sigMap.auditorRole = row.position_title;
            } else if (row.role_key === 'adviser1' || row.role_key === 'adviser') {
              sigMap.adviser1 = row.name;
              sigMap.adviserName = row.name;
              sigMap.adviserRole = row.position_title;
            } else if (row.role_key === 'adviser2') {
              sigMap.adviser2 = row.name;
            } else if (row.role_key === 'director') {
              sigMap.directorName = row.name;
              sigMap.directorRole = row.position_title;
            } else if (row.role_key === 'dean') {
              sigMap.deanName = row.name;
              sigMap.deanRole = row.position_title;
            }
          });
          setSemesterSignatories(sigMap);
        } else {
          setSemesterSignatories(termDefault);
        }
      } catch (err) {
        console.warn('semester_signatories query notice:', err);
        const termDefault = currentSemester?.academicYear === '2025-2026' 
          ? DEFAULT_LITE_SIGNATORIES_25_26 
          : DEFAULT_LITE_SIGNATORIES_26_27;
        setSemesterSignatories(termDefault);
      }
    }

    loadSignatories();
  }, [currentSemester?.academicYear, currentSemester?.semester]);

  // Filter transactions strictly for the active semester (memoized to prevent cascading re-renders)
  const activeTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const txAY = tx.academic_year || '2025-2026';
      const txSem = tx.semester || '2nd Sem';
      return txAY === currentSemester?.academicYear && txSem === currentSemester?.semester;
    });
  }, [transactions, currentSemester?.academicYear, currentSemester?.semester]);

  // Filter active debts: Open/unsettled receivables persist across terms until collected (Balance Sheet)
  const activeDebts = useMemo(() => {
    return debts.filter((d) => {
      const isUnsettled = d.status === 'UNPAID' || d.status === 'PARTIALLY_PAID';
      if (isUnsettled) return true; // Open receivables maintain multi-semester continuity
      if (!d.semester_id) return true;
      return d.semester_id === currentSemester?.id || d.semester_id === `${currentSemester?.academicYear}-${currentSemester?.semester}`;
    });
  }, [debts, currentSemester?.id, currentSemester?.academicYear, currentSemester?.semester]);

  // Filter active advances: Open/unsettled abono liabilities persist across terms until reimbursed (Balance Sheet)
  const activeAdvances = useMemo(() => {
    return advances.filter((a) => {
      const isUnsettled = a.status === 'UNPAID' || a.status === 'PARTIALLY_REIMBURSED' || a.status === 'PENDING';
      if (isUnsettled) return true; // Open abono liabilities maintain multi-semester continuity
      if (!a.semester_id) return true;
      return a.semester_id === currentSemester?.id || a.semester_id === `${currentSemester?.academicYear}-${currentSemester?.semester}`;
    });
  }, [advances, currentSemester?.id, currentSemester?.academicYear, currentSemester?.semester]);

  // Recalculate summary totals atomically with precision centavo math
  const calculateSummary = (txs, debtsList = [], advancesList = []) => {
    let inflows_c = 0;
    let outflows_c = 0;
    let cash_c = 0;
    let pending_reimbursements_c = 0;

    txs.forEach((tx) => {
      const amt_c = toCentavos(Number(tx.amount) || 0);

      if (tx.type === 'INFLOW') {
        inflows_c += amt_c;
        cash_c += amt_c;
      } else if (tx.type === 'OUTFLOW') {
        // Pending reimbursements do not deduct cash yet until disbursed
        if (tx.is_reimbursement && tx.status === 'PENDING_REIMBURSEMENT') {
          pending_reimbursements_c += amt_c;
        } else {
          outflows_c += amt_c;
          cash_c -= amt_c;
        }
      }
    });

    const uncollected_debts = debtsList.reduce((acc, d) => {
      if (d.status === 'CANCELLED' || d.status === 'SETTLED') return acc;
      const total = Number(d.total_amount || 0);
      const paid = Number(d.amount_paid || 0);
      return acc + Math.max(0, total - paid);
    }, 0);

    const pending_advances = advancesList.length > 0
      ? advancesList.reduce((acc, a) => {
          if (a.status === 'CANCELLED' || a.status === 'SETTLED') return acc;
          const total = Number(a.total_amount || 0);
          const reimbursed = Number(a.amount_reimbursed || 0);
          return acc + Math.max(0, total - reimbursed);
        }, 0)
      : fromCentavos(pending_reimbursements_c);

    const cash_on_hand = fromCentavos(cash_c);
    const net_position = cash_on_hand - pending_advances;

    return {
      total_inflows: fromCentavos(inflows_c),
      total_outflows: fromCentavos(outflows_c),
      cash_on_hand,
      net_position,
      pending_reimbursements: pending_advances,
      uncollected_debts,
    };
  };

  const summary = useMemo(() => {
    return calculateSummary(activeTransactions, activeDebts, activeAdvances);
  }, [activeTransactions, activeDebts, activeAdvances]);

  // Idle preloader for dynamic modals so they open instantly on click
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const preloadModals = () => {
      import('@/components/ledger/NewTransactionModal');
      import('@/components/reconciliation/DenominationCounter');
      import('@/components/debts/DebtsManagementModal');
      import('@/components/debts/AdvancesManagementModal');
      import('@/components/ai/AIChatDrawer');
      import('@/components/audit/AuditTrailDrawer');
      import('@/components/audit/AuditReviewModal');
    };
    if ('requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(preloadModals, { timeout: 3000 });
      return () => window.cancelIdleCallback(handle);
    } else {
      const timer = setTimeout(preloadModals, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Manual entry from the New Transaction form: enforce ₱99,999.99 cap and cashbox balance check.
  const handleManualSaveTransaction = async (newTx) => {
    if (validateTransactionAmount(newTx.amount)) return;
    if (validateOutflowBalance({
      type: newTx.type,
      isReimbursement: newTx.is_reimbursement,
      amount: newTx.amount,
      cashBalance: summary.cash_on_hand,
    })) return;
    return handleSaveTransaction(newTx);
  };

  const handleSaveTransaction = async (newTx) => {
    // 1. Edit existing transaction branch
    if (newTx.id) {
      try {
        const res = await fetch(`/api/transactions/${newTx.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newTx.title,
            description: newTx.description,
            amount: newTx.amount,
            type: newTx.type,
            category_id: newTx.category_id,
            semester_id: newTx.semester_id,
            transaction_date: newTx.transaction_date,
            is_reimbursement: newTx.is_reimbursement,
            reimbursement_recipient: newTx.reimbursement_recipient,
            advanced_by_name: newTx.advanced_by_name,
            event_name: newTx.event_name,
            receipt_urls: newTx.receipt_urls,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success && data.transaction) {
          setTransactions((prev) =>
            prev.map((t) => (t.id === newTx.id ? { ...t, ...data.transaction } : t))
          );
        } else {
          alert(`Failed to update transaction: ${data.error || 'Server error'}`);
        }
      } catch (err) {
        console.error('Update transaction error:', err);
      }
      setEditingTx(null);
      return;
    }

    // 2. Create new transaction branch
    const tempId = `tx-${Date.now()}`;
    const optimisticReceiptUrls = Array.isArray(newTx.receipt_urls) && newTx.receipt_urls.length > 0
      ? newTx.receipt_urls
      : (newTx.receipt_url ? [newTx.receipt_url] : []);

    const optimisticTx = {
      ...newTx,
      id: tempId,
      advanced_by_name: newTx.advanced_by_name || newTx.reimbursement_recipient || null,
      created_at: new Date().toISOString(),
      receipt_urls: optimisticReceiptUrls,
      receipt_url: optimisticReceiptUrls[0] || null,
      academic_year: newTx.academic_year || currentSemester.academicYear,
      semester: newTx.semester || currentSemester.semester,
      logged_by: userProfile?.id || currentUser?.id || null,
      logged_by_name: userProfile?.full_name || currentUser?.user_metadata?.full_name || 'Officer',
      logged_by_role: currentRole || userProfile?.role || 'treasurer',
      logged_by_avatar_url: userProfile?.avatar_url || currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture || null,
    };
    setTransactions((prev) => [optimisticTx, ...prev]);

    if (supabase) {
      try {
        const uploadedReceiptUrls = [];

        // Upload any files passed in newTx.receiptFiles (up to 3)
        if (Array.isArray(newTx.receiptFiles) && newTx.receiptFiles.length > 0) {
          for (const file of newTx.receiptFiles.slice(0, 3)) {
            try {
              const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
              const filePath = `receipt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
              const { error: uploadError } = await supabase.storage
                .from('receipts')
                .upload(filePath, file, {
                  cacheControl: '3600',
                  upsert: false,
                });

              if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage
                  .from('receipts')
                  .getPublicUrl(filePath);
                uploadedReceiptUrls.push(publicUrl);
              } else {
                console.error('Storage upload error:', uploadError.message);
              }
            } catch (storageErr) {
              console.warn('Storage upload note:', storageErr?.message);
            }
          }
        } else if (newTx.receiptFile) {
          try {
            const fileExt = newTx.receiptFile.name ? newTx.receiptFile.name.split('.').pop() : 'jpg';
            const filePath = `receipt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
              .from('receipts')
              .upload(filePath, newTx.receiptFile, {
                cacheControl: '3600',
                upsert: false,
              });

            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('receipts')
                .getPublicUrl(filePath);
              uploadedReceiptUrls.push(publicUrl);
            } else {
              console.error('Storage upload error:', uploadError.message);
            }
          } catch (storageErr) {
            console.warn('Storage upload note:', storageErr?.message);
          }
        } else if (Array.isArray(newTx.receipt_urls) && newTx.receipt_urls.length > 0) {
          uploadedReceiptUrls.push(...newTx.receipt_urls.filter((u) => !u.startsWith('blob:')));
        } else if (newTx.receipt_url && !newTx.receipt_url.startsWith('blob:')) {
          uploadedReceiptUrls.push(newTx.receipt_url);
        }

        // Resolve 3NF foreign keys (guarantee non-null for 3NF constraints)
        let resolvedCategoryId = newTx.category_id || null;
        if (!resolvedCategoryId && categories && categories.length > 0) {
          const matchedCategory = categories.find((c) =>
            c.name.toLowerCase() === (newTx.category_name || '').toLowerCase()
          );
          if (matchedCategory) resolvedCategoryId = matchedCategory.id;
          if (!resolvedCategoryId) {
            const fallbackCat = categories.find((c) => c.type === newTx.type) || categories[0];
            resolvedCategoryId = fallbackCat?.id || null;
          }
        }

        let resolvedSemesterId = currentSemester?.id;
        if (resolvedSemesterId && resolvedSemesterId.startsWith('sem-')) {
          const matchedDbSem = semesters.find((s) => s.id && !s.id.startsWith('sem-') && s.academicYear === currentSemester.academicYear && s.semester === currentSemester.semester);
          resolvedSemesterId = matchedDbSem ? matchedDbSem.id : (semesters.find((s) => s.id && !s.id.startsWith('sem-'))?.id || null);
        }

        // Pure 3NF relational payload (compatible with pre-017 and post-017 database schemas)
        const payload = {
          title: newTx.title,
          description: newTx.description || null,
          amount: parseFloat(newTx.amount),
          type: newTx.type,
          category_id: resolvedCategoryId,
          semester_id: resolvedSemesterId,
          logged_by: userProfile?.id || null,
          transaction_date: newTx.transaction_date || new Date().toISOString().split('T')[0],
          is_reimbursement: Boolean(newTx.is_reimbursement),
          reimbursement_recipient: newTx.is_reimbursement ? newTx.reimbursement_recipient : null,
          advanced_by_name: newTx.is_reimbursement ? (newTx.advanced_by_name || newTx.reimbursement_recipient) : null,
          status: newTx.status || 'COMPLETED',
          event_name: newTx.event_name || null,
        };

        // Remove any undefined keys so PostgREST doesn't inject null or corrupt columns query param
        Object.keys(payload).forEach((key) => {
          if (payload[key] === undefined) {
            delete payload[key];
          }
        });

        let data = null;
        let error = null;

        // 1. Primary: Use server-side API route /api/transactions (bypasses role RLS for all approved officers)
        try {
          const apiRes = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...payload,
              advanced_by_name: payload.advanced_by_name,
              category_name: newTx.category_name,
              receipt_urls: uploadedReceiptUrls,
              receipt_url: uploadedReceiptUrls[0] || null,
            }),
          });
          const apiResult = await apiRes.json();
          if (apiRes.ok && apiResult.success && apiResult.transaction) {
            data = apiResult.transaction;
          } else if (apiResult.error) {
            error = { message: apiResult.error };
            alert(`Transaction rejected: ${apiResult.error}`);
            setTransactions((prev) => prev.filter((t) => t.id !== tempId));
            return;
          }
        } catch (apiErr) {
          console.warn('/api/transactions request error, trying direct fallback:', apiErr?.message);
        }

        // 2. Fallback: Direct client insert if API was not reached
        if (!data) {
          let insertRes = await supabase
            .from('transactions')
            .insert([payload])
            .select()
            .single();

          // Graceful fallback if semester_id column is missing in legacy remote DB
          if (insertRes.error && (insertRes.error.message?.includes('semester_id') || insertRes.error.code === 'PGRST204')) {
            const fallbackPayload = { ...payload };
            delete fallbackPayload.semester_id;
            insertRes = await supabase
              .from('transactions')
              .insert([fallbackPayload])
              .select()
              .single();
          }

          // Graceful fallback if payment_method column was dropped in remote DB (migration 023 single-cashbox)
          if (insertRes.error && (insertRes.error.message?.includes('payment_method') || insertRes.error.code === 'PGRST204')) {
            const fallbackPayload = { ...payload };
            delete fallbackPayload.payment_method;
            if (insertRes.error.message?.includes('semester_id')) {
              delete fallbackPayload.semester_id;
            }
            insertRes = await supabase
              .from('transactions')
              .insert([fallbackPayload])
              .select()
              .single();
          }

          if (insertRes.data) {
            data = insertRes.data;
            error = null;
          } else if (insertRes.error) {
            error = insertRes.error;
          }
        }

        if (error) {
          console.error('Supabase transaction insert notice:', error?.message || error?.details || JSON.stringify(error) || error);
          // Roll back optimistic transaction so the user doesn't see a transaction that vanishes on refresh
          setTransactions((prev) => prev.filter((t) => t.id !== tempId));
          alert(`Failed to save transaction: ${error.message || 'Permission denied or network issue'}. Please try again.`);
        } else if (data) {
          // If receipts were uploaded, insert normalized child records in transaction_receipts
          if (uploadedReceiptUrls.length > 0) {
            const receiptItems = uploadedReceiptUrls.map((url, idx) => ({
              transaction_id: data.id,
              public_url: url,
              file_url: url,
              sort_order: idx,
              uploaded_by: userProfile?.id || null,
            }));
            try {
              await supabase.from('transaction_receipts').insert(receiptItems);
            } catch (rErr) {
              console.warn('transaction_receipts insert notice:', rErr?.message);
            }
          }

          setTransactions((prev) =>
            prev.map((t) => (t.id === tempId ? {
              ...data,
              logged_by_name: userProfile?.full_name || null,
              logged_by_role: currentRole || userProfile?.role || null,
              logged_by_avatar_url: userProfile?.avatar_url || currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture || null,
              category_id: data.category_id || resolvedCategoryId,
              category_name: data.category_name || newTx.category_name,
              semester_id: data.semester_id || resolvedSemesterId,
              receipt_url: data.receipt_url || uploadedReceiptUrls[0] || null,
              receipt_urls: (Array.isArray(data.receipt_urls) && data.receipt_urls.length > 0) ? data.receipt_urls : uploadedReceiptUrls,
              academic_year: optimisticTx.academic_year,
              semester: optimisticTx.semester
            } : t))
          );

          // Dispatch audit request notification to Auditor(s)
          fetch('/api/notifications/transaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transactionId: data.id,
              authorId: userProfile?.id || currentUser?.id,
              authorName: userProfile?.full_name || currentUser?.user_metadata?.full_name || 'Officer',
              authorEmail: currentUser?.email || userProfile?.email,
              actionType: newTx.type === 'INFLOW' ? 'INFLOW' : 'OUTFLOW',
              amount: newTx.amount,
              title: newTx.title,
              category: newTx.category_name,
              eventName: newTx.event_name,
              reimbursementRecipient: newTx.reimbursement_recipient,
              receiptUrl: uploadedReceiptUrls[0] || null,
              date: newTx.transaction_date,
            }),
          }).catch((nErr) => console.warn('Transaction notification trigger notice:', nErr?.message));
        }
      } catch (err) {
        console.warn('Failed to save transaction to database notice:', err?.message || err);
      }
    }
  };

  // Handler for attaching additional receipts to an existing transaction (Post-Entry)
  const handleAttachReceipt = async (transactionId, newReceiptFiles) => {
    if (!newReceiptFiles || newReceiptFiles.length === 0) {
      return { success: false, error: 'No files provided.' };
    }

    const targetTx = transactions.find((t) => t.id === transactionId);
    if (!targetTx) {
      return { success: false, error: 'Transaction not found.' };
    }

    const existingUrls = Array.isArray(targetTx.receipt_urls) && targetTx.receipt_urls.length > 0
      ? targetTx.receipt_urls
      : (targetTx.receipt_url ? [targetTx.receipt_url] : []);

    const remainingSlots = Math.max(0, 3 - existingUrls.length);
    const filesToUpload = newReceiptFiles.slice(0, remainingSlots);

    if (filesToUpload.length === 0) {
      return { success: false, error: 'Maximum limit of 3 receipts already reached.' };
    }

    const uploadedUrls = [];
    let lastUploadError = null;
    if (supabase) {
      for (const file of filesToUpload) {
        try {
          const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
          const filePath = `receipt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(filePath, file, { cacheControl: '3600', upsert: false });

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('receipts')
              .getPublicUrl(filePath);
            uploadedUrls.push(publicUrl);
          } else {
            lastUploadError = uploadError.message;
            console.error('Storage upload error:', uploadError.message);
          }
        } catch (storageErr) {
          lastUploadError = storageErr?.message;
          console.warn('Storage upload error:', storageErr);
        }
      }
    } else {
      // Local fallback
      for (const file of filesToUpload) {
        uploadedUrls.push(URL.createObjectURL(file));
      }
    }

    if (filesToUpload.length > 0 && uploadedUrls.length === 0) {
      return {
        success: false,
        error: lastUploadError || 'Failed to upload receipt to Supabase Storage. Please ensure the receipts bucket exists and is accessible.',
      };
    }

    const combinedUrls = [...existingUrls, ...uploadedUrls].slice(0, 3);

    // Update DB via server-side API (bypasses client RLS issues and synchronizes 3NF child table)
    if (typeof transactionId === 'string' && !transactionId.startsWith('tx-')) {
      try {
        const patchRes = await fetch(`/api/transactions/${transactionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ receipt_urls: combinedUrls }),
        });
        const patchData = await patchRes.json();
        if (!patchRes.ok || !patchData.success) {
          console.warn('API PATCH receipt_urls notice:', patchData?.error);
        }
      } catch (patchErr) {
        console.warn('API PATCH receipt error:', patchErr?.message);
      }
    }

    const normalizedReceipts = combinedUrls.map((url, idx) => ({
      id: `receipt-${Date.now()}-${idx}`,
      public_url: url,
      sort_order: idx,
    }));

    // Optimistically update local state for all transaction listings and modals
    setTransactions((prev) =>
      prev.map((t) => (t.id === transactionId ? {
        ...t,
        receipt_urls: combinedUrls,
        receipt_url: combinedUrls[0] || null,
        transaction_receipts: normalizedReceipts,
      } : t))
    );

    setAuditModalTx((prev) => (prev && prev.id === transactionId ? {
      ...prev,
      receipt_urls: combinedUrls,
      receipt_url: combinedUrls[0] || null,
      transaction_receipts: normalizedReceipts,
    } : prev));

    return { success: true, urls: combinedUrls };
  };

  // Handler for settling an out-of-pocket advance (abono)
  const handleSettleReimbursement = async (transactionId, { amount = null } = {}) => {
    const isAuthorized = currentRole === 'admin' || currentRole === 'treasurer' || currentRole === 'president' || currentRole === 'adviser';
    if (!isAuthorized) {
      return { success: false, error: 'Unauthorized. Only club officers and advisers can settle abono advances.' };
    }

    const targetTx = transactions.find((t) => t.id === transactionId);
    if (!targetTx) {
      return { success: false, error: 'Transaction not found.' };
    }

    const totalClaim = Number(targetTx.amount || 0);
    const payoutAmount = amount !== null ? Math.min(Number(amount), totalClaim) : totalClaim;

    if (payoutAmount <= 0) {
      return { success: false, error: 'Disbursement amount must be greater than ₱0.00' };
    }

    // Validate cashbox balance: ensure cashbox has sufficient liquid balance
    const balanceError = validateOutflowBalance({
      type: 'OUTFLOW',
      isReimbursement: false,
      amount: payoutAmount,
      cashBalance: summary.cash_on_hand,
    });

    if (balanceError) {
      return { success: false, error: balanceError };
    }

    const remainingBal = Math.max(0, totalClaim - payoutAmount);
    const isFullSettlement = remainingBal === 0;

    // Update in Supabase if connected
    if (supabase && typeof transactionId === 'string' && !transactionId.startsWith('tx-')) {
      try {
        if (isFullSettlement) {
          const { error: updateError } = await supabase
            .from('transactions')
            .update({
              status: 'REIMBURSED',
              updated_at: new Date().toISOString(),
            })
            .eq('id', transactionId);

          if (updateError) {
            console.error('Failed to update abono reimbursement status in Supabase:', updateError);
            return { success: false, error: updateError.message };
          }
        } else {
          // Partial Settlement:
          // 1. Current transaction becomes the settled partial outflow
          await supabase
            .from('transactions')
            .update({
              amount: payoutAmount,
              status: 'REIMBURSED',
              updated_at: new Date().toISOString(),
            })
            .eq('id', transactionId);

          // 2. Spawn remaining tranche transaction so ledger remains accurate
          await supabase
            .from('transactions')
            .insert([{
              title: targetTx.title,
              description: `Remaining balance of ${formatPHP(totalClaim)} advance by ${targetTx.reimbursement_recipient || 'Officer'}`,
              amount: remainingBal,
              type: 'OUTFLOW',
              category_id: targetTx.category_id || null,
              category_name: targetTx.category_name || null,
              semester_id: targetTx.semester_id || null,
              logged_by: userProfile?.id || null,
              transaction_date: targetTx.transaction_date || new Date().toISOString().split('T')[0],
              is_reimbursement: true,
              reimbursement_recipient: targetTx.reimbursement_recipient,
              receipt_url: targetTx.receipt_url || null,
              receipt_urls: targetTx.receipt_urls || [],
              status: 'PENDING_REIMBURSEMENT',
              event_name: targetTx.event_name || null,
              academic_year: targetTx.academic_year || currentSemester.academicYear,
              semester: targetTx.semester || currentSemester.semester,
            }]);
        }

        // Best-effort immutable audit log entry
        try {
          await supabase.from('audit_logs').insert([{
            user_id: userProfile?.id || currentUser?.id || null,
            action: isFullSettlement ? 'SETTLE_ABONO_REIMBURSEMENT' : 'PARTIAL_ABONO_DISBURSEMENT',
            entity_type: 'transactions',
            entity_id: String(transactionId),
            details: {
              title: targetTx.title,
              total_claim: totalClaim,
              disbursed_amount: payoutAmount,
              remaining_balance: remainingBal,
              recipient: targetTx.reimbursement_recipient,
              disbursement_source: 'CASHBOX',
              settled_by: userProfile?.full_name || currentUser?.email || 'Officer',
            },
          }]);
        } catch (_) {}
      } catch (err) {
        console.error('Settle reimbursement exception:', err);
        return { success: false, error: err.message };
      }
    }

    // Optimistically update local transactions state
    if (isFullSettlement) {
      setTransactions((prev) =>
        prev.map((t) => (t.id === transactionId ? {
          ...t,
          status: 'REIMBURSED',
        } : t))
      );
    } else {
      const remainingTx = {
        ...targetTx,
        id: `tx-${Date.now()}`,
        created_at: new Date().toISOString(),
        amount: remainingBal,
        description: `Remaining balance of ${formatPHP(totalClaim)} advance by ${targetTx.reimbursement_recipient || 'Officer'}`,
        status: 'PENDING_REIMBURSEMENT',
      };
      setTransactions((prev) => [
        remainingTx,
        ...prev.map((t) => (t.id === transactionId ? {
          ...t,
          amount: payoutAmount,
          status: 'REIMBURSED',
        } : t))
      ]);
    }

    // Sync advances_payable state if matching record exists
    setAdvances((prev) =>
      prev.map((a) => {
        if (a.id === transactionId || a.title === targetTx.title) {
          const newReimbursed = Math.min(Number(a.total_amount || totalClaim), Number(a.amount_reimbursed || 0) + payoutAmount);
          const newStatus = newReimbursed >= Number(a.total_amount || totalClaim) ? 'SETTLED' : 'PARTIALLY_REIMBURSED';
          const newDisb = {
            id: `disb-${Date.now()}`,
            advance_id: a.id,
            amount: payoutAmount,
            disbursement_date: new Date().toISOString(),
          };
          return {
            ...a,
            amount_reimbursed: newReimbursed,
            status: newStatus,
            advance_disbursements: [newDisb, ...(a.advance_disbursements || [])],
          };
        }
        return a;
      })
    );

    return { success: true };
  };

  // --- Helpers for server-side (RPC) payables/receivables flows -------------------
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isPersistedId = (id) => typeof id === 'string' && UUID_RE.test(id);

  // debts_receivables / advances_payable.semester_id is a UUID FK to semesters (migration 025).
  // Map the client-side 'sem-..' slug to the matching DB semester UUID.
  const resolveDbSemesterId = () => {
    const id = currentSemester?.id;
    if (isPersistedId(id)) return id;
    const match = semesters.find((s) =>
      isPersistedId(s.id) &&
      s.academicYear === currentSemester?.academicYear &&
      s.semester === currentSemester?.semester
    );
    return match?.id || semesters.find((s) => isPersistedId(s.id) && s.isActive)?.id || null;
  };

  // Fetch the newest installment row (debt_payments / advance_disbursements) and its linked ledger transaction.
  const fetchLatestInstallmentWithTx = async (table, parentKey, parentId) => {
    try {
      const { data: row, error } = await supabase
        .from(table)
        .select('*')
        .eq(parentKey, parentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !row) return null;
      let tx = null;
      if (row.transaction_id) {
        const { data } = await supabase.from('transactions').select('*').eq('id', row.transaction_id).maybeSingle();
        tx = data || null;
      }
      return { row, tx };
    } catch (err) {
      console.warn(`Fetching latest ${table} row notice:`, err?.message || err);
      return null;
    }
  };

  const addServerTransactionToState = (tx) => {
    const category = categories.find((c) => c.id === tx.category_id);
    setTransactions((prev) => [
      {
        ...tx,
        created_at: tx.created_at || new Date().toISOString(),
        category_name: category?.name || tx.category_name,
        receipt_urls: [],
        receipt_url: null,
        academic_year: currentSemester?.academicYear,
        semester: currentSemester?.semester,
        logged_by_name: userProfile?.full_name || null,
        logged_by_role: currentRole || userProfile?.role || null,
        logged_by_avatar_url: userProfile?.avatar_url || currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture || null,
      },
      ...prev.filter((t) => t.id !== tx.id),
    ]);
  };

  // Handler for disbursing partial or full reimbursement payouts directly from AdvancesManagementModal
  const handleRecordAdvanceDisbursement = async (advanceId, { amount, notes = '' }) => {
    try {
      const isAuthorized = currentRole === 'admin' || currentRole === 'treasurer' || currentRole === 'president' || currentRole === 'adviser';
      if (!isAuthorized) {
        return { error: 'Unauthorized. Only club officers and advisers can disburse reimbursements.' };
      }

      const targetAdvance = advances.find((a) => a.id === advanceId);
      if (!targetAdvance) return { error: 'Advance record not found.' };

      const remaining = Math.max(0, Number(targetAdvance.total_amount || 0) - Number(targetAdvance.amount_reimbursed || 0));
      const payoutAmount = Math.min(Number(amount), remaining);

      if (payoutAmount <= 0) {
        return { error: 'Disbursement amount must be greater than ₱0.00' };
      }

      // Validate cashbox liquidity balance
      const balanceError = validateOutflowBalance({
        type: 'OUTFLOW',
        isReimbursement: false,
        amount: payoutAmount,
        cashBalance: summary.cash_on_hand,
      });

      if (balanceError) {
        return { error: balanceError };
      }

      // Persisted record: atomic server-side RPC (ledger OUTFLOW + installment + balance).
      // Auditing is handled by the trg_audit_advance_disbursements trigger.
      if (supabase && isPersistedId(advanceId)) {
        let updatedAdvance = null;
        const { data: rpcAdv, error: rpcError } = await supabase.rpc('record_advance_disbursement', {
          p_advance_id: advanceId,
          p_amount: payoutAmount,
          p_notes: notes || null,
        });

        if (!rpcError && rpcAdv) {
          updatedAdvance = rpcAdv;
        } else {
          const isSchemaCacheError = rpcError?.code === 'PGRST202' ||
            rpcError?.message?.includes('schema cache') ||
            rpcError?.message?.includes('record_advance_disbursement');

          if (!isSchemaCacheError) {
            return { error: rpcError?.message || 'Failed to record advance disbursement' };
          }

          console.warn('record_advance_disbursement RPC missing in schema cache; executing resilient fallback:', rpcError?.message);

          const outflowCategory = (targetAdvance.category_id && categories.find((c) => c.id === targetAdvance.category_id)) ||
            categories.find((c) => c.type === 'OUTFLOW' && c.name?.toLowerCase().includes('abono')) ||
            categories.find((c) => c.type === 'OUTFLOW') || null;

          const { data: newTx, error: txError } = await supabase
            .from('transactions')
            .insert({
              title: `Abono Reimbursement: ${targetAdvance.title} (${targetAdvance.claimant_name})`,
              description: notes || `Reimbursement payout of ₱${payoutAmount.toFixed(2)} to ${targetAdvance.claimant_name}`,
              amount: payoutAmount,
              type: 'OUTFLOW',
              category_id: outflowCategory?.id || null,
              semester_id: targetAdvance.semester_id || currentSemester?.id || null,
              logged_by: userProfile?.id || null,
              transaction_date: new Date().toISOString().split('T')[0],
              status: 'COMPLETED',
              event_name: targetAdvance.event_name || null,
            })
            .select()
            .single();

          if (txError) {
            return { error: txError.message || 'Failed to record transaction' };
          }

          await supabase
            .from('advance_disbursements')
            .insert({
              advance_id: advanceId,
              transaction_id: newTx?.id || null,
              amount: payoutAmount,
              disbursed_by: userProfile?.id || null,
              notes: notes || null,
            });

          const updatedReimbursed = Number(targetAdvance.amount_reimbursed || 0) + payoutAmount;
          const updatedStatus = updatedReimbursed >= Number(targetAdvance.total_amount) ? 'SETTLED' : 'PARTIALLY_REIMBURSED';

          const { data: advRow, error: advUpdateError } = await supabase
            .from('advances_payable')
            .update({
              amount_reimbursed: updatedReimbursed,
              status: updatedStatus,
            })
            .eq('id', advanceId)
            .select()
            .single();

          if (advUpdateError) {
            return { error: advUpdateError.message || 'Failed to update advance record' };
          }

          updatedAdvance = advRow || { ...targetAdvance, amount_reimbursed: updatedReimbursed, status: updatedStatus };
          if (newTx) addServerTransactionToState(newTx);
        }

        const disbursement = await fetchLatestInstallmentWithTx('advance_disbursements', 'advance_id', advanceId);
        if (disbursement?.tx) addServerTransactionToState(disbursement.tx);

        setAdvances((prev) =>
          prev.map((a) =>
            a.id === advanceId
              ? {
                  ...a,
                  ...updatedAdvance,
                  advance_disbursements: disbursement?.row
                    ? [disbursement.row, ...(a.advance_disbursements || [])]
                    : a.advance_disbursements,
                }
              : a
          )
        );
        return { success: true };
      }

      // Offline / unsaved record fallback: local-only bookkeeping
      await handleSaveTransaction({
        title: `Abono Reimbursement: ${targetAdvance.title} (${targetAdvance.claimant_name})`,
        description: notes || `Reimbursement payout of ₱${payoutAmount.toFixed(2)} to ${targetAdvance.claimant_name}`,
        amount: payoutAmount,
        type: 'OUTFLOW',
        category_name: targetAdvance.category_name || 'Food & Refreshments',
        event_name: targetAdvance.event_name || null,
        transaction_date: new Date().toISOString().split('T')[0],
        is_reimbursement: false,
        status: 'COMPLETED',
      });

      const updatedReimbursed = Number(targetAdvance.amount_reimbursed || 0) + payoutAmount;
      const updatedStatus = updatedReimbursed >= Number(targetAdvance.total_amount) ? 'SETTLED' : 'PARTIALLY_REIMBURSED';
      const newDisbursement = {
        id: `disb-${Date.now()}`,
        advance_id: advanceId,
        amount: payoutAmount,
        disbursement_date: new Date().toISOString(),
        notes,
      };

      setAdvances((prev) =>
        prev.map((a) =>
          a.id === advanceId
            ? {
                ...a,
                amount_reimbursed: updatedReimbursed,
                status: updatedStatus,
                advance_disbursements: [newDisbursement, ...(a.advance_disbursements || [])],
              }
            : a
        )
      );

      return { success: true };
    } catch (err) {
      console.error('Record advance disbursement error:', err);
      return { error: err?.message || 'Failed to record advance disbursement' };
    }
  };

  // Handler for creating a new advance record directly
  const handleCreateAdvance = async (advanceData) => {
    try {
      const tempId = `adv-${Date.now()}`;
      const newAdv = {
        id: tempId,
        semester_id: currentSemester?.id || 'sem-26-27-1',
        claimant_name: advanceData.claimant_name,
        claimant_contact: advanceData.claimant_contact || null,
        title: advanceData.title,
        category_name: advanceData.category_name || 'Food & Refreshments',
        event_name: advanceData.event_name || null,
        total_amount: Number(advanceData.total_amount),
        amount_reimbursed: 0,
        status: 'UNPAID',
        advance_date: new Date().toISOString().split('T')[0],
        notes: advanceData.notes || null,
        advance_disbursements: [],
        created_at: new Date().toISOString(),
      };

      setAdvances((prev) => [newAdv, ...prev]);

      if (supabase) {
        try {
          const matchedCategory = categories.find(
            (c) => c.id === newAdv.category_id || (newAdv.category_name && c.name?.toLowerCase() === newAdv.category_name.toLowerCase())
          ) || categories.find((c) => c.type === 'OUTFLOW') || categories[0];

          const { data, error } = await supabase.from('advances_payable').insert([{
            semester_id: resolveDbSemesterId(),
            claimant_name: newAdv.claimant_name,
            claimant_contact: newAdv.claimant_contact,
            title: newAdv.title,
            category_id: matchedCategory?.id || null,
            event_name: newAdv.event_name,
            total_amount: newAdv.total_amount,
            amount_reimbursed: 0,
            status: 'UNPAID',
            advance_date: newAdv.advance_date,
            notes: newAdv.notes,
            created_by: userProfile?.id || null,
          }]).select(`
            *,
            advance_disbursements (*),
            advance_receipts (*)
          `).single();

          if (!error && data) {
            setAdvances((prev) => prev.map((a) => (a.id === tempId ? { ...data, advance_disbursements: [] } : a)));
          }
        } catch (dbErr) {
          console.warn('Persisting advance to Supabase skipped:', dbErr);
        }
      }

      return { success: true };
    } catch (err) {
      console.error('Create advance error:', err);
      return { error: err?.message || 'Failed to create advance record' };
    }
  };

  // Handler for collecting payments on uncollected member debts and pre-orders
  const handleRecordDebtPayment = async (debtId, { amount, tendered, notes = '' }) => {
    try {
      const targetDebt = debts.find((d) => d.id === debtId);
      if (!targetDebt) return { error: 'Debt record not found.' };

      // Persisted record: atomic server-side RPC (ledger INFLOW + installment + balance)
      if (supabase && isPersistedId(debtId)) {
        let updatedDebt = null;
        const { data: rpcDebt, error: rpcError } = await supabase.rpc('record_debt_payment', {
          p_debt_id: debtId,
          p_amount: Number(amount),
          p_notes: notes || null,
        });

        if (!rpcError && rpcDebt) {
          updatedDebt = rpcDebt;
        } else {
          const isSchemaCacheError = rpcError?.code === 'PGRST202' ||
            rpcError?.message?.includes('schema cache') ||
            rpcError?.message?.includes('record_debt_payment');

          if (!isSchemaCacheError) {
            return { error: rpcError?.message || 'Failed to record debt payment' };
          }

          console.warn('record_debt_payment RPC missing in schema cache; executing resilient fallback:', rpcError?.message);

          const inflowCategory = categories.find((c) => c.type === 'INFLOW' && c.name?.toLowerCase().includes('inflow')) ||
            categories.find((c) => c.type === 'INFLOW') || null;

          const { data: newTx, error: txError } = await supabase
            .from('transactions')
            .insert({
              title: `Debt Settlement: ${targetDebt.title} (${targetDebt.debtor_name})`,
              description: notes || `Installment collection of ₱${Number(amount).toFixed(2)} from ${targetDebt.debtor_name}`,
              amount: Number(amount),
              type: 'INFLOW',
              category_id: inflowCategory?.id || null,
              semester_id: targetDebt.semester_id || currentSemester?.id || null,
              logged_by: userProfile?.id || null,
              transaction_date: new Date().toISOString().split('T')[0],
              status: 'COMPLETED',
            })
            .select()
            .single();

          if (txError) {
            return { error: txError.message || 'Failed to record transaction' };
          }

          await supabase
            .from('debt_payments')
            .insert({
              debt_id: debtId,
              transaction_id: newTx?.id || null,
              amount: Number(amount),
              received_by: userProfile?.id || null,
              notes: notes || null,
            });

          const updatedPaid = Number(targetDebt.amount_paid || 0) + Number(amount);
          const updatedStatus = updatedPaid >= Number(targetDebt.total_amount) ? 'SETTLED' : 'PARTIALLY_PAID';

          const { data: debtRow, error: debtUpdateError } = await supabase
            .from('debts_receivables')
            .update({
              amount_paid: updatedPaid,
              status: updatedStatus,
            })
            .eq('id', debtId)
            .select()
            .single();

          if (debtUpdateError) {
            return { error: debtUpdateError.message || 'Failed to update debt record' };
          }

          updatedDebt = debtRow || { ...targetDebt, amount_paid: updatedPaid, status: updatedStatus };
          if (newTx) addServerTransactionToState(newTx);
        }

        const payment = await fetchLatestInstallmentWithTx('debt_payments', 'debt_id', debtId);
        if (payment?.tx) addServerTransactionToState(payment.tx);

        setDebts((prev) =>
          prev.map((d) =>
            d.id === debtId
              ? {
                  ...d,
                  ...updatedDebt,
                  debt_payments: payment?.row ? [payment.row, ...(d.debt_payments || [])] : d.debt_payments,
                }
              : d
          )
        );
        return { success: true };
      }

      // Offline / unsaved record fallback: local-only bookkeeping
      await handleSaveTransaction({
        title: `Debt Settlement: ${targetDebt.title} (${targetDebt.debtor_name})`,
        description: notes || `Installment collection of ₱${Number(amount).toFixed(2)} from ${targetDebt.debtor_name}`,
        amount,
        type: 'INFLOW',
        category_name: 'Other Verified Inflow',
        transaction_date: new Date().toISOString().split('T')[0],
        is_reimbursement: false,
        status: 'COMPLETED',
      });

      const updatedPaid = Number(targetDebt.amount_paid || 0) + Number(amount);
      const updatedStatus = updatedPaid >= Number(targetDebt.total_amount) ? 'SETTLED' : 'PARTIALLY_PAID';
      setDebts((prev) =>
        prev.map((d) => (d.id === debtId ? { ...d, amount_paid: updatedPaid, status: updatedStatus } : d))
      );

      return { success: true };
    } catch (err) {
      console.warn('Record debt payment notice:', err?.message || err);
      return { error: err?.message || 'Failed to record debt payment' };
    }
  };

  // Handler for creating a new debt / receivable record
  const handleCreateDebt = async (debtData) => {
    try {
      const tempId = `debt-${Date.now()}`;
      const newDebt = {
        id: tempId,
        semester_id: currentSemester?.id || 'sem-26-27-1',
        debtor_name: debtData.debtor_name,
        debtor_contact: debtData.debtor_contact || null,
        title: debtData.title,
        total_amount: Number(debtData.total_amount),
        amount_paid: 0,
        status: 'UNPAID',
        due_date: debtData.due_date || null,
        notes: debtData.notes || null,
        created_at: new Date().toISOString(),
      };

      setDebts((prev) => [newDebt, ...prev]);

      if (supabase) {
        try {
          const { data, error } = await supabase.from('debts_receivables').insert([{
            semester_id: resolveDbSemesterId(),
            debtor_name: newDebt.debtor_name,
            debtor_contact: newDebt.debtor_contact,
            title: newDebt.title,
            total_amount: newDebt.total_amount,
            amount_paid: 0,
            status: 'UNPAID',
            due_date: newDebt.due_date,
            notes: newDebt.notes,
            created_by: userProfile?.id || null,
          }]).select().single();

          if (!error && data) {
            setDebts((prev) => prev.map((d) => d.id === tempId ? data : d));
          }
        } catch (dbErr) {
          console.warn('Persisting new debt to Supabase skipped:', dbErr);
        }
      }

      return { success: true };
    } catch (err) {
      console.error('Create debt error:', err);
      return { error: err?.message || 'Failed to create debt record' };
    }
  };

  // Handler for starting a new semester with carry-over rollover balance
  const handleStartSemester = async ({ academicYear, semester, label, rolloverCash, previousTermLabel }) => {
    const newSemObj = {
      id: `sem-${academicYear.replace(/[^0-9]/g, '')}-${semester.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      academicYear,
      semester,
      label,
      isActive: true,
    };

    setSemesters((prev) => [newSemObj, ...prev.filter((s) => s.academicYear !== academicYear || s.semester !== semester)]);
    setCurrentSemester(newSemObj);
    if (typeof window !== 'undefined') {
      localStorage.setItem('finlite_active_semester_id', newSemObj.id);
    }

    if (supabase) {
      try {
        await supabase.from('semesters').update({ is_active: false }).neq('academic_year', 'none');
        await supabase.from('semesters').upsert([{
          academic_year: academicYear,
          semester: semester,
          label: label,
          is_active: true,
          starting_cash_on_hand: parseFloat(rolloverCash) || 0,
        }], { onConflict: 'academic_year,semester' });
      } catch (semErr) {
        console.warn('Failed to persist semester to Supabase:', semErr);
      }
    }

    // If rollover cash is requested, record an official Beginning Balance Inflow
    if (rolloverCash > 0) {
      await handleSaveTransaction({
        title: `Beginning Cash on Hand (Rolled over from ${previousTermLabel})`,
        description: `Official starting balance forwarded from the verified ending cashbox of ${previousTermLabel}`,
        amount: rolloverCash,
        type: 'INFLOW',
        category_name: 'Initial Budget Rollover',
        transaction_date: new Date().toISOString().split('T')[0],
        academic_year: academicYear,
        semester: semester,
        event_name: 'Semester Opening Turnover',
        status: 'COMPLETED',
      });
    }
  };

  const handleDeclareShortage = async ({ amount, notes }) => {
    // Gated workflow: Discrepancies must be verified by an Adviser before committing to ledger
    return handleSaveAuditCount({
      physicalTotal: (currentSummary?.cash_on_hand || 0) - parseFloat(amount),
      ledgerCashBalance: currentSummary?.cash_on_hand || 0,
      variance: -Math.abs(parseFloat(amount)),
      status: 'SHORTAGE',
      approval_status: 'PENDING_APPROVAL',
      notes: notes || 'Physical cash shortage declared for adviser audit review.',
      counts: latestReconciliation?.counts || {},
    });
  };

  const handleSaveAuditCount = async (audit) => {
    let resolvedSemesterId = currentSemester?.id;
    if (resolvedSemesterId && resolvedSemesterId.startsWith('sem-')) {
      const matchedDbSem = semesters.find((s) => s.id && !s.id.startsWith('sem-') && s.academicYear === currentSemester.academicYear && s.semester === currentSemester.semester);
      resolvedSemesterId = matchedDbSem ? matchedDbSem.id : (semesters.find((s) => s.id && !s.id.startsWith('sem-'))?.id || null);
    }

    const isVarianceZero = audit.variance === 0 || audit.status === 'BALANCED';

    // Pure 3NF relational payload for cash_reconciliations
    const reconPayload = {
      physical_total: audit.physicalTotal,
      ledger_cash_balance: audit.ledgerCashBalance,
      variance_amount: audit.variance,
      variance_status: audit.status,
      approval_status: audit.approval_status || (isVarianceZero ? 'BALANCED' : 'PENDING_APPROVAL'),
      notes: audit.notes || null,
      semester_id: resolvedSemesterId || null,
      counted_by: userProfile?.id || currentUser?.id || null,
      created_at: new Date().toISOString(),
    };

    // Full optimistic representation for immediate UI reactivity
    const optimisticRecon = {
      ...reconPayload,
      ...audit.counts,
      academic_year: currentSemester?.academicYear || '2025-2026',
      semester: currentSemester?.semester || '1st',
    };

    // 1. Instant optimistic state update
    setLatestReconciliation(optimisticRecon);

    // 2. Persist to localStorage for immediate resilience on reload
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('finlite_latest_reconciliation', JSON.stringify(optimisticRecon));
      } catch (_) {}
    }

    // 3. Persist to Supabase Database
    if (!supabase) return;
    try {
      let { data, error } = await supabase
        .from('cash_reconciliations')
        .insert([reconPayload])
        .select()
        .single();

      if (error && error.message?.includes('approval_status')) {
        const fallbackRecon = { ...reconPayload };
        delete fallbackRecon.approval_status;
        const res2 = await supabase
          .from('cash_reconciliations')
          .insert([fallbackRecon])
          .select()
          .single();
        if (res2.data) {
          data = res2.data;
          error = null;
        }
      }

      if (error) {
        console.warn('Supabase cash_reconciliations insert notice:', error?.message || error);
      } else if (data) {
        // 4. Upsert normalized cash_reconciliation_items
        if (denominations && denominations.length > 0) {
          const reconItems = denominations.map((d) => {
            const countKey = denomCodeToCountKey(d.code);
            const qty = audit.counts[countKey] ?? audit.counts[d.code.toLowerCase()] ?? 0;
            return {
              reconciliation_id: data.id,
              denomination_id: d.id,
              quantity: qty,
              subtotal: qty * parseFloat(d.face_value),
            };
          });
          try {
            await supabase
              .from('cash_reconciliation_items')
              .upsert(reconItems, { onConflict: 'reconciliation_id,denomination_id' });
          } catch (itemErr) {
            console.warn('cash_reconciliation_items upsert note:', itemErr?.message);
          }
        }

        const reconciledRecord = {
          ...data,
          ...audit.counts,
        };
        setLatestReconciliation(reconciledRecord);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('finlite_latest_reconciliation', JSON.stringify(reconciledRecord));
          } catch (_) {}
        }
      }
    } catch (err) {
      console.warn('Save audit count exception notice:', err?.message || err);
    }
  };

  const handleOpenLiquidationPreview = () => {
    const formattedDate = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    setPreviewData({
      type: 'LIQUIDATION',
      eventName: `${currentSemester.label} Financial Operations`,
      activityTitle: `${currentSemester.label} Financial Operations`,
      transmittalDate: formattedDate,
      academicYear: currentSemester.academicYear,
      semester: currentSemester.semester,
      summary,
      transactions: activeTransactions,
      remarks: 'All transactions recorded conform with the 7-day receipt submission policy and dual club adviser audit verification.',
      signatories: semesterSignatories,
    });
    setIsPreviewOpen(true);
  };

  const handleOpenProposalPreview = (proposalPayload) => {
    setPreviewData(proposalPayload);
    setIsPreviewOpen(true);
  };

  return (
    <>
      {/* Main Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0 p-3 sm:p-6 lg:p-8 pt-16 md:pt-6">
        <main className="max-w-[1550px] w-full mx-auto space-y-5 sm:space-y-6 pb-24 md:pb-8 no-print">
          
          {/* Modern Minimalist Hero Balance & Action Hub (De-cluttered borderless canvas) */}
          <div className="py-2 mb-2 sm:mb-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
              
              {/* Left: Dynamic Greetings Hero Header */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100">
                  {greeting}, {userProfile?.first_name || userProfile?.full_name?.split(' ')[0] || currentUser?.user_metadata?.full_name?.split(' ')[0] || 'Officer'}
                </h1>
                <p className="text-xs mt-1 text-zinc-500 dark:text-zinc-400">
                  Active Term: <strong className="text-zinc-700 dark:text-zinc-300">{currentSemester?.label}</strong> · Review cash flow, reconcile vault reserves, and generate reports.
                </p>
              </div>

              {/* Right: Quick Action Pods Dock (Borderless floating buttons) */}
              <div className="flex items-center justify-around sm:justify-start gap-2 sm:gap-3 shrink-0">
                
                {/* Pod 1: Record Transaction */}
                <button
                  type="button"
                  onClick={() => setIsNewTxOpen(true)}
                  className="flex flex-col items-center gap-1 p-1 sm:px-2 group cursor-pointer"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-[background-color,transform] duration-150 shadow-xs bg-emerald-600 text-white group-hover:bg-emerald-500 active:scale-95">
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-medium transition-colors text-zinc-600 dark:text-zinc-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    Record
                  </span>
                </button>

                {/* Pod 2: Cash Box Audit */}
                <button
                  type="button"
                  onClick={() => setIsDenomOpen(true)}
                  className="flex flex-col items-center gap-1 p-1 sm:px-2 group cursor-pointer"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-[background-color,border-color,color,transform] duration-150 border bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 group-hover:border-emerald-500/40 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 active:scale-95">
                    <Wallet className="w-4 h-4 stroke-[2]" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-medium transition-colors text-zinc-600 dark:text-zinc-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    Cash Box
                  </span>
                </button>

                {/* Pod 3: Preview Report */}
                <button
                  type="button"
                  onClick={handleOpenLiquidationPreview}
                  className="flex flex-col items-center gap-1 p-1 sm:px-2 group cursor-pointer"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-[background-color,border-color,color,transform] duration-150 border bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 group-hover:border-emerald-500/40 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 active:scale-95">
                    <FileText className="w-4 h-4 stroke-[2]" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-medium transition-colors text-zinc-600 dark:text-zinc-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    Report
                  </span>
                </button>

                {/* Pod 4: AI Co-Pilot */}
                <button
                  type="button"
                  onClick={() => setIsAIOpen(true)}
                  className="flex flex-col items-center gap-1 p-1 sm:px-2 group cursor-pointer"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-[background-color,border-color,color,transform] duration-150 border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 group-hover:bg-emerald-500/20 active:scale-95">
                    <Bot className="w-4 h-4 stroke-[2]" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-medium transition-colors text-zinc-600 dark:text-zinc-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    Copilot
                  </span>
                </button>

              </div>

            </div>
          </div>

          {/* KPI Metric Cards (6 Preserved Account Containers) */}
          <ModuleErrorBoundary moduleName="Financial Overview">
            <StatCards
              summary={summary}
              latestReconciliation={latestReconciliation}
              onOpenDenominations={() => setIsDenomOpen(true)}
              onOpenAdvances={() => setIsAdvancesOpen(true)}
              onOpenDebts={() => setIsDebtsOpen(true)}
            />
          </ModuleErrorBoundary>

          {/* Ledger & Transaction Table */}
          <div id="financial-ledger">
            <ModuleErrorBoundary moduleName="Financial Ledger">
              <TransactionTable
                transactions={activeTransactions}
                debts={activeDebts}
                onOpenDebts={() => setIsDebtsOpen(true)}
                onNewTransaction={() => {
                  setEditingTx(null);
                  setIsNewTxOpen(true);
                }}
                onExportReport={handleOpenLiquidationPreview}
                onNewProposal={() => setIsProposalOpen(true)}
                onAttachReceipt={handleAttachReceipt}
                onSettleReimbursement={handleSettleReimbursement}
                onOpenAuditTrail={() => setIsAuditOpen(true)}
                cashBalance={summary.cash_on_hand}
                currentRole={currentRole}
                isDbConnected={isDbConnected}
                userPermissions={userPermissions}
                onAuditTransaction={(tx) => setAuditModalTx(tx)}
                onEditTransaction={(tx) => {
                  setEditingTx(tx);
                  setIsNewTxOpen(true);
                }}
              />
            </ModuleErrorBoundary>
          </div>

        </main>

        {/* Dashboard Footer */}
        <footer className="max-w-[1550px] w-full mx-auto px-4 py-6 pb-24 md:pb-6 text-center no-print">
          <p className="text-[11px] font-medium transition-colors text-zinc-400 dark:text-zinc-600">
            © 2026 FinLITE · Pambayang Dalubhasaan ng Marilao · All rights reserved.
          </p>
        </footer>

      </div>

      {/* Native Mobile Bottom Navigation Bar (Option 1: Quick thumb access for daily events) */}
      <BottomNav
        onOpenNewTx={() => setIsNewTxOpen(true)}
        onOpenDenominations={() => setIsDenomOpen(true)}
        onOpenAI={() => setIsAIOpen(true)}
        onScrollToLedger={() => {
          const el = document.getElementById('financial-ledger');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      />

      {/* Modals & Slide-overs (Conditionally mounted to eliminate reconciliation of inactive DOM trees) */}
      <div className="no-print">
        {isNewSemesterOpen && (
          <ModuleErrorBoundary moduleName="Semester Management">
            <NewSemesterModal
              isOpen={isNewSemesterOpen}
              onClose={() => setIsNewSemesterOpen(false)}
              currentSemester={currentSemester}
              currentSummary={summary}
              onStartSemester={handleStartSemester}
            />
          </ModuleErrorBoundary>
        )}

        {isNewTxOpen && (
          <ModuleErrorBoundary moduleName="Transaction Entry">
            <NewTransactionModal
              isOpen={isNewTxOpen}
              onClose={() => {
                setIsNewTxOpen(false);
                setEditingTx(null);
              }}
              onSave={handleManualSaveTransaction}
              categories={categories}
              cashBalance={summary.cash_on_hand}
              transactionToEdit={editingTx}
              userPermissions={userPermissions}
            />
          </ModuleErrorBoundary>
        )}

        {auditModalTx && (
          <ModuleErrorBoundary moduleName="Transaction Audit Verification">
            <AuditReviewModal
              isOpen={Boolean(auditModalTx)}
              onClose={() => setAuditModalTx(null)}
              transaction={auditModalTx}
              currentOfficer={userProfile}
              onAudited={(updatedTx) => {
                setTransactions((prev) =>
                  prev.map((t) => (t.id === updatedTx.id ? { ...t, ...updatedTx } : t))
                );
              }}
            />
          </ModuleErrorBoundary>
        )}

        {isProposalOpen && (
          <ModuleErrorBoundary moduleName="Proposal Generator">
            <NewProposalModal
              isOpen={isProposalOpen}
              onClose={() => setIsProposalOpen(false)}
              onOpenPreview={handleOpenProposalPreview}
            />
          </ModuleErrorBoundary>
        )}

        {isDebtsOpen && (
          <ModuleErrorBoundary moduleName="Debts & Receivables Management">
            <DebtsManagementModal
              isOpen={isDebtsOpen}
              onClose={() => setIsDebtsOpen(false)}
              debts={activeDebts}
              onRecordPayment={handleRecordDebtPayment}
              onCreateDebt={handleCreateDebt}
              canManage={canManageFinancials}
            />
          </ModuleErrorBoundary>
        )}

        {isAdvancesOpen && (
          <ModuleErrorBoundary moduleName="Advances Abono Settlement">
            <AdvancesManagementModal
              isOpen={isAdvancesOpen}
              onClose={() => setIsAdvancesOpen(false)}
              advances={activeAdvances}
              onRecordDisbursement={handleRecordAdvanceDisbursement}
              onCreateAdvance={handleCreateAdvance}
              cashBalance={summary.cash_on_hand}
              canManage={canManageFinancials}
            />
          </ModuleErrorBoundary>
        )}
      </div>

      <ModuleErrorBoundary moduleName="Document Preview">
        {isPreviewOpen && previewData && (
          <DocumentPreviewModal
            isOpen={isPreviewOpen}
            onClose={() => setIsPreviewOpen(false)}
            documentData={previewData}
          />
        )}
      </ModuleErrorBoundary>

      <div className="no-print">
        {isDenomOpen && (
          <ModuleErrorBoundary moduleName="Cash Reconciliation">
            <DenominationCounter
              isOpen={isDenomOpen}
              onClose={() => setIsDenomOpen(false)}
              ledgerCashBalance={summary.cash_on_hand}
              onDeclareShortage={handleDeclareShortage}
              onSaveCount={handleSaveAuditCount}
              currentRole={currentRole}
              latestReconciliation={latestReconciliation}
              denominations={denominations}
            />
          </ModuleErrorBoundary>
        )}

        {isAIOpen && (
          <ModuleErrorBoundary moduleName="AI Co-Pilot">
            <AIChatDrawer
              isOpen={isAIOpen}
              onClose={() => setIsAIOpen(false)}
              summary={summary}
              transactions={activeTransactions}
              debts={activeDebts}
              advances={activeAdvances}
            />
          </ModuleErrorBoundary>
        )}

        {isAuditOpen && (
          <ModuleErrorBoundary moduleName="Financial Audit Trail">
            <AuditTrailDrawer
              isOpen={isAuditOpen}
              onClose={() => setIsAuditOpen(false)}
              supabase={supabase}
              currentRole={currentRole}
            />
          </ModuleErrorBoundary>
        )}
      </div>
    </>
  );
}
