'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Plus, Wallet, Calculator, Sparkles, FileText, CreditCard } from 'lucide-react';
import FloatingSidebar from '@/components/layout/FloatingSidebar';
import BottomNav from '@/components/layout/BottomNav';
import StatCards from '@/components/dashboard/StatCards';
import TransactionTable from '@/components/ledger/TransactionTable';
import ModuleErrorBoundary from '@/components/common/ModuleErrorBoundary';
import { createClient } from '@/lib/supabase/client';
import { isSuperAdminEmail } from '@/lib/config/admin';
import { toCentavos, fromCentavos, denomCodeToCountKey } from '@/lib/utils/currency';
import { validateTransactionAmount, validateOutflowBalance } from '@/lib/utils/validation';
import { Card, Badge, Button } from '@/components/ui';

// Dynamically split heavy modals out of the initial critical client bundle
const NewTransactionModal = dynamic(() => import('@/components/ledger/NewTransactionModal'), {
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

const DEFAULT_SEMESTERS = [
  { id: 'sem-26-27-1', academicYear: '2026-2027', semester: '1st Sem', label: 'AY 2026–2027 • 1st Sem', isActive: true },
  { id: 'sem-25-26-2', academicYear: '2025-2026', semester: '2nd Sem', label: 'AY 2025–2026 • 2nd Sem', isActive: false },
];

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

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [currentRole, setCurrentRole] = useState('treasurer');
  const [transactions, setTransactions] = useState([]);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewTxOpen, setIsNewTxOpen] = useState(false);
  const [isDenomOpen, setIsDenomOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isProposalOpen, setIsProposalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [debts, setDebts] = useState([]);
  const [isDebtsOpen, setIsDebtsOpen] = useState(false);
  const [advances, setAdvances] = useState([]);
  const [isAdvancesOpen, setIsAdvancesOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [latestReconciliation, setLatestReconciliation] = useState(null);
  const [semesterSignatories, setSemesterSignatories] = useState(DEFAULT_LITE_SIGNATORIES);

  // Multi-Semester State Management
  const [semesters, setSemesters] = useState(DEFAULT_SEMESTERS);
  const [currentSemester, setCurrentSemester] = useState(DEFAULT_SEMESTERS[0]);
  const [isNewSemesterOpen, setIsNewSemesterOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // 3NF Master Catalog States
  const [categories, setCategories] = useState([]);
  const [denominations, setDenominations] = useState([]);

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

  const supabase = createClient();
  const isSuperAdmin = isSuperAdminEmail(currentUser?.email || userProfile?.email);
  const canManageFinancials = currentRole === 'treasurer' || currentRole === 'president' || currentRole === 'admin' || isSuperAdmin;

  // Load user profile, semesters, categories, denominations & transactions from Supabase on mount
  useEffect(() => {
    async function loadData() {
      if (!supabase) {
        setTransactions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // 1. Load Current User & Profile
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
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

          if (profile) {
            setUserProfile(profile);
            setCurrentRole(isSuperAdmin ? 'admin' : (profile.role || 'member'));
          } else if (isSuperAdmin) {
            setUserProfile({
              email,
              full_name: user.user_metadata?.full_name || 'Andrei John Geronimo',
              role: 'admin',
              status: 'approved',
              avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            });
            setCurrentRole('admin');
          }
        }

        // 2. Load Categories Reference Table
        try {
          const { data: catData, error: catError } = await supabase
            .from('categories')
            .select('*')
            .order('name');
          if (!catError && catData) {
            setCategories(catData);
          }
        } catch (catErr) {
          console.warn('Categories reference load notice:', catErr);
        }

        // 3. Load Denominations Reference Table
        try {
          const { data: denomData, error: denomError } = await supabase
            .from('denominations')
            .select('*')
            .order('display_order');
          if (!denomError && denomData) {
            setDenominations(denomData);
          }
        } catch (denomErr) {
          console.warn('Denominations reference load notice:', denomErr);
        }

        // 4. Load Semesters from Supabase
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
            setSemesters(activeSemestersList);
          }
        } catch (semErr) {
          console.warn('Semesters load notice:', semErr);
        }

        // Determine active semester: localStorage first, then active in DB, then fallback to first entry
        const savedSemId = typeof window !== 'undefined' ? localStorage.getItem('finlite_active_semester_id') : null;
        const matchedSemester = activeSemestersList.find((s) => s.id === savedSemId || `${s.academicYear}-${s.semester}` === savedSemId)
          || activeSemestersList.find((s) => s.isActive)
          || activeSemestersList[0];

        if (matchedSemester) {
          setCurrentSemester(matchedSemester);
        }

        // 5. Load Transactions with 3NF Normalized Joins (with creator profile details)
        try {
          const { data, error } = await supabase
            .from('transactions')
            .select(`
              *,
              categories (id, name, type),
              semesters (id, academic_year, semester, label),
              transaction_receipts (id, public_url, sort_order),
              profiles (id, full_name, role, email, avatar_url)
            `)
            .order('transaction_date', { ascending: false });

          let rawData = null;
          if (error) {
            console.warn('3NF relational select fallback to base select:', error.message);
            const { data: flatData, error: flatError } = await supabase
              .from('transactions')
              .select('*')
              .order('transaction_date', { ascending: false });

            if (flatError) {
              console.warn('Supabase transactions fetch failed:', flatError.message);
              setTransactions([]);
            } else {
              setIsDbConnected(true);
              rawData = flatData || [];
            }
          } else if (data) {
            setIsDbConnected(true);
            rawData = data;
          }

          if (rawData) {
            let normalized = rawData.map((t) => ({
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
        } catch (txFetchErr) {
          console.warn('Transaction fetch exception:', txFetchErr);
          setTransactions([]);
        }

        // 6. Load Latest Cash Reconciliation from Supabase (with 3NF items join)
        try {
          const { data: reconData, error: reconError } = await supabase
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

          if (!reconError && reconData) {
            // Map child items to denomination keys for backwards compatible UI counters
            if (Array.isArray(reconData.cash_reconciliation_items) && reconData.cash_reconciliation_items.length > 0) {
              reconData.cash_reconciliation_items.forEach((item) => {
                const code = item.denominations?.code;
                if (code) {
                  const countKey = denomCodeToCountKey(code);
                  reconData[countKey] = item.quantity;
                  reconData[code.toLowerCase()] = item.quantity;
                }
              });
            }
            setLatestReconciliation(reconData);
            if (typeof window !== 'undefined') {
              try { localStorage.setItem('finlite_latest_reconciliation', JSON.stringify(reconData)); } catch (_) {}
            }
          } else {
            const { data: flatRecon } = await supabase
              .from('cash_reconciliations')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (flatRecon) {
              setLatestReconciliation(flatRecon);
            } else {
              const cached = typeof window !== 'undefined' ? localStorage.getItem('finlite_latest_reconciliation') : null;
              if (cached) {
                try { setLatestReconciliation(JSON.parse(cached)); } catch (_) {}
              }
            }
          }
        } catch (reconErr) {
          console.warn('Reconciliation fetch note:', reconErr);
        }

        // 7. Load Debts & Receivables (with payment installments join)
        try {
          const { data: debtsData, error: debtsError } = await supabase
            .from('debts_receivables')
            .select(`
              *,
              debt_payments (*)
            `)
            .order('created_at', { ascending: false });

          if (!debtsError && debtsData && debtsData.length > 0) {
            setDebts(debtsData);
            if (typeof window !== 'undefined') {
              try { localStorage.setItem('finlite_debts', JSON.stringify(debtsData)); } catch (_) {}
            }
          } else {
            const cachedDebts = typeof window !== 'undefined' ? localStorage.getItem('finlite_debts') : null;
            if (cachedDebts) {
              try { setDebts(JSON.parse(cachedDebts)); } catch (_) {}
            }
          }
        } catch (debtsErr) {
          console.warn('Debts fetch note:', debtsErr);
          const cachedDebts = typeof window !== 'undefined' ? localStorage.getItem('finlite_debts') : null;
          if (cachedDebts) {
            try { setDebts(JSON.parse(cachedDebts)); } catch (_) {}
          }
        }

        // 8. Load Advances & Payables (with installment disbursements join)
        try {
          const { data: advData, error: advError } = await supabase
            .from('advances_payable')
            .select(`
              *,
              advance_disbursements (*)
            `)
            .order('created_at', { ascending: false });

          if (!advError && advData && advData.length > 0) {
            setAdvances(advData);
            if (typeof window !== 'undefined') {
              try { localStorage.setItem('finlite_advances', JSON.stringify(advData)); } catch (_) {}
            }
          } else {
            const cachedAdv = typeof window !== 'undefined' ? localStorage.getItem('finlite_advances') : null;
            if (cachedAdv) {
              try { setAdvances(JSON.parse(cachedAdv)); } catch (_) {}
            } else if (normalized && normalized.length > 0) {
              const mappedFromTx = normalized
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
              setAdvances(mappedFromTx);
            }
          }
        } catch (advErr) {
          console.warn('Advances fetch note:', advErr);
          const cachedAdv = typeof window !== 'undefined' ? localStorage.getItem('finlite_advances') : null;
          if (cachedAdv) {
            try { setAdvances(JSON.parse(cachedAdv)); } catch (_) {}
          }
        }
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
  }, [currentSemester?.academicYear, currentSemester?.semester, supabase]);

  // Filter transactions strictly for the active semester
  const activeTransactions = transactions.filter((tx) => {
    const txAY = tx.academic_year || '2025-2026';
    const txSem = tx.semester || '2nd Sem';
    return txAY === currentSemester.academicYear && txSem === currentSemester.semester;
  });

  // Filter active debts for the current semester
  const activeDebts = debts.filter((d) => {
    if (!d.semester_id) return true;
    return d.semester_id === currentSemester?.id || d.semester_id === `${currentSemester?.academicYear}-${currentSemester?.semester}`;
  });

  // Filter active advances for the current semester
  const activeAdvances = advances.filter((a) => {
    if (!a.semester_id) return true;
    return a.semester_id === currentSemester?.id || a.semester_id === `${currentSemester?.academicYear}-${currentSemester?.semester}`;
  });

  // Recalculate summary totals atomically with precision centavo math
  const calculateSummary = (txs, debtsList = [], advancesList = []) => {
    let inflows_c = 0;
    let outflows_c = 0;
    let cash_c = 0;
    let gcash_c = 0;
    let pending_reimbursements_c = 0;

    txs.forEach((tx) => {
      const amt_c = toCentavos(Number(tx.amount) || 0);

      if (tx.type === 'INFLOW') {
        inflows_c += amt_c;
        if (tx.payment_method === 'CASH') cash_c += amt_c;
        if (tx.payment_method === 'GCASH') gcash_c += amt_c;
      } else if (tx.type === 'OUTFLOW') {
        // Pending reimbursements do not deduct cash yet until disbursed
        if (tx.is_reimbursement && tx.status === 'PENDING_REIMBURSEMENT') {
          pending_reimbursements_c += amt_c;
        } else {
          outflows_c += amt_c;
          if (tx.payment_method === 'CASH') cash_c -= amt_c;
          if (tx.payment_method === 'GCASH') gcash_c -= amt_c;
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

    return {
      total_inflows: fromCentavos(inflows_c),
      total_outflows: fromCentavos(outflows_c),
      cash_on_hand: fromCentavos(cash_c),
      gcash_balance: fromCentavos(gcash_c),
      pending_reimbursements: pending_advances,
      uncollected_debts,
    };
  };

  const summary = calculateSummary(activeTransactions, activeDebts, activeAdvances);

  // Manual entry from the New Transaction form: enforce ₱99,999.99 cap and channel balance check.
  const handleManualSaveTransaction = async (newTx) => {
    if (validateTransactionAmount(newTx.amount)) return;
    if (validateOutflowBalance({
      type: newTx.type,
      paymentMethod: newTx.payment_method,
      isReimbursement: newTx.is_reimbursement,
      amount: newTx.amount,
      cashBalance: summary.cash_on_hand,
      gcashBalance: summary.gcash_balance,
    })) return;
    return handleSaveTransaction(newTx);
  };

  const handleSaveTransaction = async (newTx) => {
    const tempId = `tx-${Date.now()}`;
    const optimisticReceiptUrls = Array.isArray(newTx.receipt_urls) && newTx.receipt_urls.length > 0
      ? newTx.receipt_urls
      : (newTx.receipt_url ? [newTx.receipt_url] : []);

    const optimisticTx = {
      ...newTx,
      id: tempId,
      receipt_urls: optimisticReceiptUrls,
      receipt_url: optimisticReceiptUrls[0] || null,
      academic_year: newTx.academic_year || currentSemester.academicYear,
      semester: newTx.semester || currentSemester.semester,
      logged_by: userProfile?.id || currentUser?.id || null,
      logged_by_name: userProfile?.full_name || currentUser?.user_metadata?.full_name || 'Officer',
      logged_by_role: currentRole || userProfile?.role || 'treasurer',
      logged_by_avatar_url: userProfile?.avatar_url || currentUser?.user_metadata?.avatar_url || null,
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

        // Resolve 3NF foreign keys
        let resolvedCategoryId = newTx.category_id || null;
        if (!resolvedCategoryId && categories && categories.length > 0) {
          const matchedCategory = categories.find((c) =>
            c.name.toLowerCase() === (newTx.category_name || '').toLowerCase()
          );
          if (matchedCategory) resolvedCategoryId = matchedCategory.id;
        }

        let resolvedSemesterId = currentSemester?.id;
        if (resolvedSemesterId && resolvedSemesterId.startsWith('sem-')) {
          const matchedDbSem = semesters.find((s) => s.id && !s.id.startsWith('sem-') && s.academicYear === currentSemester.academicYear && s.semester === currentSemester.semester);
          resolvedSemesterId = matchedDbSem ? matchedDbSem.id : null;
        }

        const payload = {
          title: newTx.title,
          description: newTx.description || null,
          amount: parseFloat(newTx.amount),
          type: newTx.type,
          payment_method: newTx.payment_method,
          category_id: resolvedCategoryId,
          category_name: newTx.category_name || null,
          semester_id: resolvedSemesterId,
          logged_by: userProfile?.id || null,
          transaction_date: newTx.transaction_date || new Date().toISOString().split('T')[0],
          is_reimbursement: Boolean(newTx.is_reimbursement),
          reimbursement_recipient: newTx.is_reimbursement ? newTx.reimbursement_recipient : null,
          receipt_url: uploadedReceiptUrls[0] || null,
          receipt_urls: uploadedReceiptUrls,
          status: newTx.status || 'COMPLETED',
          event_name: newTx.event_name || null,
          academic_year: optimisticTx.academic_year,
          semester: optimisticTx.semester,
        };

        let insertRes = await supabase
          .from('transactions')
          .insert([payload])
          .select()
          .single();

        // Graceful fallback if semester_id column is missing in remote DB
        if (insertRes.error && (insertRes.error.message?.includes('semester_id') || insertRes.error.code === 'PGRST204')) {
          const fallbackPayload = { ...payload };
          delete fallbackPayload.semester_id;
          insertRes = await supabase
            .from('transactions')
            .insert([fallbackPayload])
            .select()
            .single();
        }

        const data = insertRes.data;
        const error = insertRes.error;

        if (error) {
          console.error('Supabase transaction insert failed:', error);
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
              logged_by_avatar_url: userProfile?.avatar_url || null,
              category_id: data.category_id || resolvedCategoryId,
              category_name: data.category_name || newTx.category_name,
              semester_id: data.semester_id || resolvedSemesterId,
              receipt_url: data.receipt_url || uploadedReceiptUrls[0] || null,
              receipt_urls: (Array.isArray(data.receipt_urls) && data.receipt_urls.length > 0) ? data.receipt_urls : uploadedReceiptUrls,
              academic_year: optimisticTx.academic_year,
              semester: optimisticTx.semester
            } : t))
          );
        }
      } catch (err) {
        console.error('Failed to save transaction to database:', err);
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
            console.error('Storage upload error:', uploadError.message);
          }
        } catch (storageErr) {
          console.warn('Storage upload error:', storageErr);
        }
      }
    } else {
      // Local fallback
      for (const file of filesToUpload) {
        uploadedUrls.push(URL.createObjectURL(file));
      }
    }

    const combinedUrls = [...existingUrls, ...uploadedUrls].slice(0, 3);

    // Update DB if Supabase is connected (Normalized transaction_receipts + legacy columns)
    if (supabase && typeof transactionId === 'string' && !transactionId.startsWith('tx-')) {
      try {
        if (uploadedUrls.length > 0) {
          const receiptRecords = uploadedUrls.map((url, idx) => ({
            transaction_id: transactionId,
            public_url: url,
            sort_order: existingUrls.length + idx,
            uploaded_by: userProfile?.id || null,
          }));
          try {
            await supabase.from('transaction_receipts').insert(receiptRecords);
          } catch (childErr) {
            console.warn('transaction_receipts child insert notice:', childErr?.message);
          }
        }

        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            receipt_urls: combinedUrls,
            receipt_url: combinedUrls[0] || null,
          })
          .eq('id', transactionId);

        if (updateError) {
          console.error('Failed to update transaction receipts in Supabase:', updateError);
          return { success: false, error: updateError.message };
        }
      } catch (err) {
        console.error('Attach receipt error:', err);
        return { success: false, error: err.message };
      }
    }

    // Optimistically update local state
    setTransactions((prev) =>
      prev.map((t) => (t.id === transactionId ? {
        ...t,
        receipt_urls: combinedUrls,
        receipt_url: combinedUrls[0] || null,
      } : t))
    );

    return { success: true, urls: combinedUrls };
  };

  // Handler for settling an out-of-pocket advance (abono)
  const handleSettleReimbursement = async (transactionId, { paymentMethod = 'CASH', amount = null } = {}) => {
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

    // Validate channel balance: ensure disbursing vault has sufficient liquid balance
    const balanceError = validateOutflowBalance({
      type: 'OUTFLOW',
      paymentMethod,
      isReimbursement: false,
      amount: payoutAmount,
      cashBalance: summary.cash_on_hand,
      gcashBalance: summary.gcash_balance,
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
              payment_method: paymentMethod,
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
              payment_method: paymentMethod,
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
              payment_method: targetTx.payment_method || 'CASH',
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
              payment_method: paymentMethod,
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
          payment_method: paymentMethod,
        } : t))
      );
    } else {
      const remainingTx = {
        ...targetTx,
        id: `tx-${Date.now()}`,
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
          payment_method: paymentMethod,
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
            payment_method: paymentMethod,
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

  // Handler for disbursing partial or full reimbursement payouts directly from AdvancesManagementModal
  const handleRecordAdvanceDisbursement = async (advanceId, { amount, paymentMethod = 'CASH', notes = '' }) => {
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

      // Validate vault liquidity balance
      const balanceError = validateOutflowBalance({
        type: 'OUTFLOW',
        paymentMethod,
        isReimbursement: false,
        amount: payoutAmount,
        cashBalance: summary.cash_on_hand,
        gcashBalance: summary.gcash_balance,
      });

      if (balanceError) {
        return { error: balanceError };
      }

      // 1. Immediately create a completed OUTFLOW in the general ledger
      const disbursementTx = {
        title: `Abono Reimbursement: ${targetAdvance.title} (${targetAdvance.claimant_name})`,
        description: notes || `Reimbursement payout of ₱${payoutAmount.toFixed(2)} to ${targetAdvance.claimant_name}`,
        amount: payoutAmount,
        type: 'OUTFLOW',
        payment_method: paymentMethod,
        category_name: targetAdvance.category_name || 'Food & Refreshments',
        event_name: targetAdvance.event_name || null,
        transaction_date: new Date().toISOString().split('T')[0],
        is_reimbursement: false,
        status: 'COMPLETED',
      };
      await handleSaveTransaction(disbursementTx);

      // 2. Update local advances state
      const updatedReimbursed = Number(targetAdvance.amount_reimbursed || 0) + payoutAmount;
      const isSettled = updatedReimbursed >= Number(targetAdvance.total_amount);
      const updatedStatus = isSettled ? 'SETTLED' : 'PARTIALLY_REIMBURSED';
      const newDisbursement = {
        id: `disb-${Date.now()}`,
        advance_id: advanceId,
        amount: payoutAmount,
        payment_method: paymentMethod,
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

      // 3. Best-effort persistence to Supabase
      if (supabase && typeof advanceId === 'string' && !advanceId.startsWith('adv-')) {
        try {
          await supabase
            .from('advances_payable')
            .update({
              amount_reimbursed: updatedReimbursed,
              status: updatedStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', advanceId);

          await supabase.from('advance_disbursements').insert([{
            advance_id: advanceId,
            amount: payoutAmount,
            payment_method: paymentMethod,
            notes,
            disbursed_by: userProfile?.id || null,
          }]);

          // Audit log
          await supabase.from('audit_logs').insert([{
            user_id: userProfile?.id || currentUser?.id || null,
            action: 'DISBURSE_ABONO_PAYOUT',
            entity_type: 'advances_payable',
            entity_id: String(advanceId),
            details: {
              title: targetAdvance.title,
              amount: payoutAmount,
              claimant: targetAdvance.claimant_name,
              payment_method: paymentMethod,
              disbursed_by: userProfile?.full_name || currentUser?.email || 'Officer',
            },
          }]);
        } catch (dbErr) {
          console.warn('Persisting advance disbursement to Supabase skipped:', dbErr);
        }
      }

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
          const { data, error } = await supabase.from('advances_payable').insert([{
            semester_id: newAdv.semester_id,
            claimant_name: newAdv.claimant_name,
            claimant_contact: newAdv.claimant_contact,
            title: newAdv.title,
            category_name: newAdv.category_name,
            event_name: newAdv.event_name,
            total_amount: newAdv.total_amount,
            amount_reimbursed: 0,
            status: 'UNPAID',
            advance_date: newAdv.advance_date,
            notes: newAdv.notes,
            created_by: userProfile?.id || null,
          }]).select().single();

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
  const handleRecordDebtPayment = async (debtId, { amount, tendered, paymentMethod = 'CASH', notes = '' }) => {
    try {
      const targetDebt = debts.find((d) => d.id === debtId);
      if (!targetDebt) return { error: 'Debt record not found.' };

      // 1. Immediately create a linked INFLOW in the general ledger
      const paymentTx = {
        title: `Debt Settlement: ${targetDebt.title} (${targetDebt.debtor_name})`,
        description: notes || `Installment collection of ₱${Number(amount).toFixed(2)} from ${targetDebt.debtor_name}`,
        amount,
        type: 'INFLOW',
        payment_method: paymentMethod,
        category_name: 'Other Verified Inflow',
        transaction_date: new Date().toISOString().split('T')[0],
        is_reimbursement: false,
        status: 'COMPLETED',
      };
      await handleSaveTransaction(paymentTx);

      // 2. Update local debts state
      const updatedPaid = Number(targetDebt.amount_paid || 0) + Number(amount);
      const isSettled = updatedPaid >= Number(targetDebt.total_amount);
      const updatedStatus = isSettled ? 'SETTLED' : 'PARTIALLY_PAID';

      setDebts((prev) =>
        prev.map((d) =>
          d.id === debtId
            ? { ...d, amount_paid: updatedPaid, status: updatedStatus }
            : d
        )
      );

      // 3. Best-effort persistence to Supabase
      if (supabase) {
        try {
          await supabase
            .from('debts_receivables')
            .update({
              amount_paid: updatedPaid,
              status: updatedStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', debtId);

          await supabase.from('debt_payments').insert([{
            debt_id: debtId,
            amount,
            payment_method: paymentMethod,
            notes,
            received_by: userProfile?.id || null,
          }]);
        } catch (dbErr) {
          console.warn('Persisting debt settlement to Supabase skipped:', dbErr);
        }
      }

      return { success: true };
    } catch (err) {
      console.error('Record debt payment error:', err);
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
            semester_id: newDebt.semester_id,
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
  const handleStartSemester = async ({ academicYear, semester, label, rolloverCash, rolloverGcash, previousTermLabel }) => {
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
          starting_gcash_balance: parseFloat(rolloverGcash) || 0,
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
        payment_method: 'CASH',
        category_name: 'Initial Budget Rollover',
        transaction_date: new Date().toISOString().split('T')[0],
        academic_year: academicYear,
        semester: semester,
        event_name: 'Semester Opening Turnover',
        status: 'COMPLETED',
      });
    }

    if (rolloverGcash > 0) {
      await handleSaveTransaction({
        title: `Beginning GCash Balance (Forwarded from ${previousTermLabel})`,
        description: `Starting electronic funds forwarded from ${previousTermLabel}`,
        amount: rolloverGcash,
        type: 'INFLOW',
        payment_method: 'GCASH',
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
    let shortageCatId = null;
    if (categories && categories.length > 0) {
      const match = categories.find((c) => c.name.toLowerCase().includes('shortage'));
      if (match) shortageCatId = match.id;
    }
    let resolvedSemesterId = currentSemester?.id;
    if (resolvedSemesterId && resolvedSemesterId.startsWith('sem-')) {
      const matchedDbSem = semesters.find((s) => s.id && !s.id.startsWith('sem-') && s.academicYear === currentSemester.academicYear && s.semester === currentSemester.semester);
      resolvedSemesterId = matchedDbSem ? matchedDbSem.id : null;
    }

    const shortageTx = {
      title: 'Declared Cash Shortage (Adviser Approved)',
      description: notes || 'Discrepancy identified during physical cash count audit',
      amount: parseFloat(amount),
      type: 'OUTFLOW',
      payment_method: 'CASH',
      category_id: shortageCatId,
      category_name: 'Cash Shortage Discrepancy',
      transaction_date: new Date().toISOString().split('T')[0],
      academic_year: currentSemester.academicYear,
      semester: currentSemester.semester,
      semester_id: resolvedSemesterId,
      logged_by: userProfile?.id || null,
      logged_by_name: userProfile?.full_name || 'Officer',
      logged_by_role: currentRole || userProfile?.role || 'treasurer',
      logged_by_avatar_url: userProfile?.avatar_url || null,
      is_reimbursement: false,
      event_name: 'Cash Count Audit',
      status: 'COMPLETED',
    };

    const tempId = `tx-${Date.now()}`;
    setTransactions((prev) => [{ ...shortageTx, id: tempId }, ...prev]);

    if (supabase) {
      try {
        let insertRes = await supabase
          .from('transactions')
          .insert([{
            title: shortageTx.title,
            description: shortageTx.description,
            amount: shortageTx.amount,
            type: shortageTx.type,
            payment_method: shortageTx.payment_method,
            category_id: shortageTx.category_id,
            category_name: shortageTx.category_name,
            semester_id: shortageTx.semester_id,
            logged_by: shortageTx.logged_by,
            transaction_date: shortageTx.transaction_date,
            academic_year: shortageTx.academic_year,
            semester: shortageTx.semester,
            is_reimbursement: false,
            status: 'COMPLETED',
            event_name: shortageTx.event_name,
          }])
          .select()
          .single();

        if (insertRes.error && (insertRes.error.message?.includes('semester_id') || insertRes.error.code === 'PGRST204')) {
          insertRes = await supabase
            .from('transactions')
            .insert([{
              title: shortageTx.title,
              description: shortageTx.description,
              amount: shortageTx.amount,
              type: shortageTx.type,
              payment_method: shortageTx.payment_method,
              category_id: shortageTx.category_id,
              category_name: shortageTx.category_name,
              logged_by: shortageTx.logged_by,
              transaction_date: shortageTx.transaction_date,
              academic_year: shortageTx.academic_year,
              semester: shortageTx.semester,
              is_reimbursement: false,
              status: 'COMPLETED',
              event_name: shortageTx.event_name,
            }])
            .select()
            .single();
        }

        const data = insertRes.data;
        const error = insertRes.error;

        if (!error && data) {
          setTransactions((prev) => prev.map((t) => (t.id === tempId ? {
            ...data,
            logged_by_name: userProfile?.full_name || null,
            logged_by_role: currentRole || userProfile?.role || null,
            logged_by_avatar_url: userProfile?.avatar_url || null,
            category_id: data.category_id || shortageCatId,
            category_name: data.category_name || shortageTx.category_name,
            semester_id: data.semester_id || resolvedSemesterId,
          } : t)));
        }
      } catch (err) {
        console.error('Failed to log shortage to database:', err);
      }
    }
  };

  const handleSaveAuditCount = async (audit) => {
    let resolvedSemesterId = currentSemester?.id;
    if (resolvedSemesterId && resolvedSemesterId.startsWith('sem-')) {
      const matchedDbSem = semesters.find((s) => s.id && !s.id.startsWith('sem-') && s.academicYear === currentSemester.academicYear && s.semester === currentSemester.semester);
      resolvedSemesterId = matchedDbSem ? matchedDbSem.id : null;
    }

    const payload = {
      bills_1000: audit.counts.bills_1000 || 0,
      bills_500: audit.counts.bills_500 || 0,
      bills_200: audit.counts.bills_200 || 0,
      bills_100: audit.counts.bills_100 || 0,
      bills_50: audit.counts.bills_50 || 0,
      bills_20: audit.counts.bills_20 || 0,
      coins_20: audit.counts.coins_20 || 0,
      coins_10: audit.counts.coins_10 || 0,
      coins_5: audit.counts.coins_5 || 0,
      coins_1: audit.counts.coins_1 || 0,
      coins_cents: audit.counts.coins_cents || 0,
      physical_total: audit.physicalTotal,
      ledger_cash_balance: audit.ledgerCashBalance,
      variance_amount: audit.variance,
      variance_status: audit.status,
      notes: audit.notes || null,
      academic_year: currentSemester?.academicYear || '2025-2026',
      semester: currentSemester?.semester || '1st',
      semester_id: resolvedSemesterId || null,
      counted_by: userProfile?.id || currentUser?.id || null,
      created_at: new Date().toISOString(),
    };

    // 1. Instant optimistic state update
    setLatestReconciliation(payload);

    // 2. Persist to localStorage for immediate resilience on reload
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('finlite_latest_reconciliation', JSON.stringify(payload));
      } catch (_) {}
    }

    // 3. Persist to Supabase Database
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('cash_reconciliations')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('Failed to save audit count to Supabase:', error.message);
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

        setLatestReconciliation(data);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('finlite_latest_reconciliation', JSON.stringify(data));
          } catch (_) {}
        }
      }
    } catch (err) {
      console.error('Failed to save audit count to database:', err);
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
    <div className="min-h-screen flex">
      
      {/* 1. Floating Island Left Sidebar (Desktop fixed island + Mobile slide-over drawer) */}
      <div className="no-print">
        <ModuleErrorBoundary moduleName="Navigation Sidebar">
          <FloatingSidebar
            currentRole={currentRole}
            userProfile={userProfile}
            currentUser={currentUser}
            currentSemester={currentSemester}
            semesters={semesters}
            onSelectSemester={(semId) => {
              const found = semesters.find((s) => s.id === semId || `${s.academicYear}-${s.semester}` === semId);
              if (found) {
                setCurrentSemester(found);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('finlite_active_semester_id', found.id);
                }
              }
            }}
            onOpenNewSemester={() => setIsNewSemesterOpen(true)}
            onOpenNewTx={() => setIsNewTxOpen(true)}
            onOpenDenominations={() => setIsDenomOpen(true)}
            onOpenAdvances={() => setIsAdvancesOpen(true)}
            onOpenDebts={() => setIsDebtsOpen(true)}
            onOpenAI={() => setIsAIOpen(true)}
            onOpenAuditTrail={() => setIsAuditOpen(true)}
            onExportReport={handleOpenLiquidationPreview}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={setIsSidebarCollapsed}
          />
        </ModuleErrorBoundary>
      </div>

      {/* 2. Main Content Canvas with dynamic left padding on desktop */}
      <div 
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out min-w-0
          ${isSidebarCollapsed ? 'md:pl-[88px]' : 'md:pl-[280px]'}
          p-3 sm:p-6 lg:p-8 pt-16 md:pt-6
        `}
      >
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
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-all shadow-xs bg-emerald-600 text-white group-hover:bg-emerald-500 active:scale-95">
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
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-all border bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 group-hover:border-emerald-500/40 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 active:scale-95">
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
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-all border bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 group-hover:border-emerald-500/40 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 active:scale-95">
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
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-all border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 group-hover:bg-emerald-500/20 active:scale-95">
                    <Sparkles className="w-4 h-4 stroke-[2]" />
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
                onNewTransaction={() => setIsNewTxOpen(true)}
                onExportReport={handleOpenLiquidationPreview}
                onNewProposal={() => setIsProposalOpen(true)}
                onAttachReceipt={handleAttachReceipt}
                onSettleReimbursement={handleSettleReimbursement}
                onOpenAuditTrail={() => setIsAuditOpen(true)}
                cashBalance={summary.cash_on_hand}
                gcashBalance={summary.gcash_balance}
                currentRole={currentRole}
                isDbConnected={isDbConnected}
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

      {/* Modals & Slide-overs */}
      <div className="no-print">
        <ModuleErrorBoundary moduleName="Semester Management">
          <NewSemesterModal
            isOpen={isNewSemesterOpen}
            onClose={() => setIsNewSemesterOpen(false)}
            currentSemester={currentSemester}
            currentSummary={summary}
            onStartSemester={handleStartSemester}
          />
        </ModuleErrorBoundary>

        <ModuleErrorBoundary moduleName="Transaction Entry">
          <NewTransactionModal
            isOpen={isNewTxOpen}
            onClose={() => setIsNewTxOpen(false)}
            onSave={handleManualSaveTransaction}
            categories={categories}
            cashBalance={summary.cash_on_hand}
            gcashBalance={summary.gcash_balance}
          />
        </ModuleErrorBoundary>

        <ModuleErrorBoundary moduleName="Proposal Generator">
          <NewProposalModal
            isOpen={isProposalOpen}
            onClose={() => setIsProposalOpen(false)}
            onOpenPreview={handleOpenProposalPreview}
          />
        </ModuleErrorBoundary>

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

        <ModuleErrorBoundary moduleName="Advances Abono Settlement">
          <AdvancesManagementModal
            isOpen={isAdvancesOpen}
            onClose={() => setIsAdvancesOpen(false)}
            advances={activeAdvances}
            onRecordDisbursement={handleRecordAdvanceDisbursement}
            onCreateAdvance={handleCreateAdvance}
            cashBalance={summary.cash_on_hand}
            gcashBalance={summary.gcash_balance}
            canManage={canManageFinancials}
          />
        </ModuleErrorBoundary>
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

        <ModuleErrorBoundary moduleName="AI Co-Pilot">
          <AIChatDrawer
            isOpen={isAIOpen}
            onClose={() => setIsAIOpen(false)}
            summary={summary}
            transactions={activeTransactions}
          />
        </ModuleErrorBoundary>

        <ModuleErrorBoundary moduleName="Financial Audit Trail">
          <AuditTrailDrawer
            isOpen={isAuditOpen}
            onClose={() => setIsAuditOpen(false)}
            supabase={supabase}
            currentRole={currentRole}
          />
        </ModuleErrorBoundary>
      </div>

    </div>
  );
}
