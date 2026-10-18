'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { 
  Plus, 
  Wallet, 
  Calculator, 
  Sparkles, 
  FileText, 
  CreditCard,
  ArrowRight,
  LayoutGrid
} from 'lucide-react';
import FloatingSidebar from '@/components/layout/FloatingSidebar';
import StatCards from '@/components/dashboard/StatCards';
import TransactionTable from '@/components/ledger/TransactionTable';
import ModuleErrorBoundary from '@/components/common/ModuleErrorBoundary';
import { createClient } from '@/lib/supabase/client';
import { isSuperAdminEmail } from '@/lib/config/admin';
import { toCentavos, fromCentavos, denomCodeToCountKey } from '@/lib/utils/currency';
import { validateTransactionAmount, validateOutflowBalance } from '@/lib/utils/validation';
import { Card, Badge, Button } from '@/components/ui';

// Dynamically split heavy modals
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

export default function SidebarMockupDashboard() {
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
  const [isAdvancesOpen, setIsAdvancesOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [latestReconciliation, setLatestReconciliation] = useState(null);
  const [semesterSignatories, setSemesterSignatories] = useState(DEFAULT_LITE_SIGNATORIES_26_27);

  // Multi-Semester State Management
  const [semesters, setSemesters] = useState(DEFAULT_SEMESTERS);
  const [currentSemester, setCurrentSemester] = useState(DEFAULT_SEMESTERS[0]);
  const [isNewSemesterOpen, setIsNewSemesterOpen] = useState(false);

  // Sidebar Layout State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Master Catalog States
  const [categories, setCategories] = useState([]);
  const [denominations, setDenominations] = useState([]);

  // Time-of-Day Greeting
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
        // 1. Current User & Profile
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
          const email = user.email?.toLowerCase();
          const isSuperAdminUser = isSuperAdminEmail(email);

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
            setCurrentRole(isSuperAdminUser ? 'admin' : (profile.role || 'member'));
          } else if (isSuperAdminUser) {
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

        // 2. Categories Reference Table
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

        // 3. Denominations Reference Table
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

        // 4. Semesters Catalog
        let loadedSemesters = [];
        try {
          const { data: dbSemesters, error: semError } = await supabase
            .from('semesters')
            .select('*')
            .order('created_at', { ascending: false });

          if (!semError && dbSemesters && dbSemesters.length > 0) {
            loadedSemesters = dbSemesters.map((s) => ({
              id: s.id,
              academicYear: s.academic_year,
              semester: s.semester,
              label: s.label || `AY ${s.academic_year} • ${s.semester} Sem`,
              isActive: s.is_active,
              startingBalance: s.starting_balance || 0,
            }));
            setSemesters(loadedSemesters);
            const activeDbSem = loadedSemesters.find((s) => s.isActive) || loadedSemesters[0];
            if (activeDbSem) {
              setCurrentSemester(activeDbSem);
            }
          }
        } catch (semErr) {
          console.warn('Semesters load notice:', semErr);
        }

        // 5. Transactions
        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .select(`
            id,
            title,
            description,
            amount,
            type,
            payment_method,
            category_id,
            category_name,
            semester_id,
            logged_by,
            transaction_date,
            is_reimbursement,
            reimbursement_recipient,
            receipt_url,
            receipt_urls,
            status,
            event_name,
            academic_year,
            semester,
            created_at,
            categories (id, name, code, type),
            profiles:logged_by (id, full_name, role, avatar_url),
            transaction_receipts (id, public_url, sort_order)
          `)
          .order('transaction_date', { ascending: false });

        if (!txError && txData) {
          setIsDbConnected(true);
          const normalized = txData.map((t) => {
            const childReceipts = Array.isArray(t.transaction_receipts)
              ? t.transaction_receipts.sort((a, b) => a.sort_order - b.sort_order).map((r) => r.public_url)
              : [];
            const arrayReceipts = Array.isArray(t.receipt_urls) ? t.receipt_urls : [];
            const singleReceipt = t.receipt_url ? [t.receipt_url] : [];
            const combinedReceipts = Array.from(new Set([...childReceipts, ...arrayReceipts, ...singleReceipt])).filter(Boolean);

            return {
              ...t,
              category_name: t.categories?.name || t.category_name || 'General',
              logged_by_name: t.profiles?.full_name || 'Officer',
              logged_by_role: t.profiles?.role || 'treasurer',
              logged_by_avatar_url: t.profiles?.avatar_url || null,
              receipt_urls: combinedReceipts,
              receipt_url: combinedReceipts[0] || null,
            };
          });
          setTransactions(normalized);
        }

        // 6. Debts
        try {
          const { data: debtData, error: debtError } = await supabase
            .from('debts')
            .select('*')
            .order('created_at', { ascending: false });
          if (!debtError && debtData) {
            setDebts(debtData);
          }
        } catch (dErr) {
          console.warn('Debts load notice:', dErr);
        }

        // 7. Latest Reconciliation
        try {
          const { data: reconData, error: reconError } = await supabase
            .from('cash_reconciliations')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (!reconError && reconData) {
            setLatestReconciliation(reconData);
          }
        } catch (rErr) {
          console.warn('Reconciliations load notice:', rErr);
        }

      } catch (err) {
        console.error('Data loading error in sidebar mockup:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Filter transactions to current selected semester
  const activeTransactions = transactions.filter((t) => {
    if (!currentSemester) return true;
    if (t.semester_id && currentSemester.id && !currentSemester.id.startsWith('sem-')) {
      return t.semester_id === currentSemester.id;
    }
    return t.academic_year === currentSemester.academicYear && t.semester === currentSemester.semester;
  });

  // Calculate live summary
  const summary = activeTransactions.reduce(
    (acc, tx) => {
      const centavos = toCentavos(tx.amount || 0);
      const isReimbursementClaim = Boolean(tx.is_reimbursement) && tx.status !== 'REIMBURSED';
      const isSettledReimbursement = Boolean(tx.is_reimbursement) && tx.status === 'REIMBURSED';

      if (tx.type === 'INCOME') {
        acc.total_inflow += centavos;
        acc.cash_on_hand += centavos;
      } else if (tx.type === 'EXPENSE') {
        if (!isReimbursementClaim) {
          acc.total_outflow += centavos;
          acc.cash_on_hand -= centavos;
        } else {
          acc.total_advances += centavos;
        }
        if (isSettledReimbursement) {
          acc.settled_advances += centavos;
        }
      }
      return acc;
    },
    {
      total_inflow: 0,
      total_outflow: 0,
      cash_on_hand: 0,
      total_advances: 0,
      settled_advances: 0,
    }
  );

  summary.cash_on_hand = fromCentavos(summary.cash_on_hand);
  summary.total_inflow = fromCentavos(summary.total_inflow);
  summary.total_outflow = fromCentavos(summary.total_outflow);
  summary.total_advances = fromCentavos(summary.total_advances);
  summary.settled_advances = fromCentavos(summary.settled_advances);
  summary.net_position = summary.cash_on_hand - (summary.total_advances - summary.settled_advances);
  summary.net_balance = summary.total_inflow - summary.total_outflow;

  // Active debts calculation
  const activeDebts = debts.filter((d) => d.status !== 'PAID');
  const totalReceivables = activeDebts.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  summary.total_receivables = totalReceivables;

  // Modals & Save Handlers
  const handleManualSaveTransaction = async (newTx) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticTx = {
      ...newTx,
      id: tempId,
      receipt_urls: newTx.receipt_urls || (newTx.receipt_url ? [newTx.receipt_url] : []),
      academic_year: newTx.academic_year || currentSemester.academicYear,
      semester: newTx.semester || currentSemester.semester,
      logged_by_name: userProfile?.full_name || 'Officer',
      logged_by_role: currentRole || 'treasurer',
    };
    setTransactions((prev) => [optimisticTx, ...prev]);

    if (supabase) {
        const payload = {
          title: newTx.title,
          description: newTx.description || null,
          amount: parseFloat(newTx.amount),
          type: newTx.type,
          payment_method: newTx.payment_method || 'CASH',
          category_id: newTx.category_id || null,
          semester_id: currentSemester?.id?.startsWith('sem-') ? null : (currentSemester?.id || null),
          logged_by: userProfile?.id || null,
          transaction_date: newTx.transaction_date || new Date().toISOString().split('T')[0],
          is_reimbursement: Boolean(newTx.is_reimbursement),
          reimbursement_recipient: newTx.reimbursement_recipient || null,
          status: newTx.status || 'COMPLETED',
          event_name: newTx.event_name || null,
        };

        let insertRes = await supabase
          .from('transactions')
          .insert([payload])
          .select()
          .single();

        if (insertRes.error && insertRes.error.code === 'PGRST204') {
          const fallback = { ...payload };
          delete fallback.semester_id;
          delete fallback.category_id;
          insertRes = await supabase.from('transactions').insert([fallback]).select().single();
        }

        const data = insertRes.data;
        if (data) {
          setTransactions((prev) => prev.map((t) => (t.id === tempId ? { ...t, ...data } : t)));
        }
      } catch (err) {
        console.warn('Sidebar mockup save transaction notice:', err?.message || err);
      }
    }
  };

  const handleAttachReceipt = async (transactionId, newReceiptUrl) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === transactionId) {
          const currentUrls = Array.isArray(t.receipt_urls) ? t.receipt_urls : (t.receipt_url ? [t.receipt_url] : []);
          const updatedUrls = [...currentUrls, newReceiptUrl];
          return {
            ...t,
            receipt_urls: updatedUrls,
            receipt_url: updatedUrls[0] || newReceiptUrl,
          };
        }
        return t;
      })
    );
  };

  const handleSettleReimbursement = async (transactionId) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === transactionId ? { ...t, status: 'REIMBURSED' } : t))
    );
    if (supabase) {
      await supabase
        .from('transactions')
        .update({ status: 'REIMBURSED' })
        .eq('id', transactionId);
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
    <div className="min-h-screen bg-zinc-50/50 dark:bg-[#070709] text-zinc-900 dark:text-zinc-100 flex">
      
      {/* 1. Left Sidebar */}
      <div className="no-print shrink-0">
        <FloatingSidebar
          currentRole={currentRole}
          userProfile={userProfile}
          currentUser={currentUser}
          currentSemester={currentSemester}
          semesters={semesters}
          onSelectSemester={(semId) => {
            const found = semesters.find((s) => s.id === semId || `${s.academicYear}-${s.semester}` === semId);
            if (found) setCurrentSemester(found);
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
      </div>

      {/* 2. Main Content Canvas */}
      <div className="flex-1 flex flex-col transition-all duration-300 ease-in-out min-w-0 p-3 sm:p-6 lg:p-8 pt-16 md:pt-6">
        <main className="max-w-[1500px] w-full mx-auto space-y-6">
          
          {/* Exploration Banner */}
          <div className="p-3 rounded-2xl border border-emerald-500/20 bg-emerald-50/80 dark:bg-emerald-950/20 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-950 dark:text-emerald-200 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-emerald-900 dark:text-emerald-200">
                  Floating Island Sidebar Preview Mode
                </span>
                <span className="hidden sm:inline opacity-80">
                  {' '}— Exploring full-height vertical space with a detached left navigation panel.
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="xs"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="hidden md:inline-flex text-[11px]"
              >
                {isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              </Button>
              <Link 
                href="/"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors shadow-xs text-[11px]"
              >
                <span>Classic Topbar View</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Hero Header & Quick Action Pods */}
          <div className="py-2">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
              
              {/* Greetings Hero Header */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100">
                  {greeting}, {userProfile?.first_name || userProfile?.full_name?.split(' ')[0] || currentUser?.user_metadata?.full_name?.split(' ')[0] || 'Officer'}
                </h1>
                <p className="text-xs mt-1 text-zinc-500 dark:text-zinc-400">
                  Active Term: <strong className="text-zinc-700 dark:text-zinc-300">{currentSemester?.label}</strong> · FinLITE Financial Control Center.
                </p>
              </div>

              {/* Action Pods Dock */}
              <div className="p-1.5 sm:p-2 rounded-xl flex items-center justify-around sm:justify-start sm:gap-3 shrink-0 transition-colors border bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 shadow-xs">
                
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

          {/* 6 KPI Account Containers */}
          <ModuleErrorBoundary moduleName="Financial Overview">
            <StatCards
              summary={summary}
              onOpenDenominations={() => setIsDenomOpen(true)}
              onOpenAdvances={() => setIsAdvancesOpen(true)}
              onOpenDebts={() => setIsDebtsOpen(true)}
            />
          </ModuleErrorBoundary>

          {/* Financial Ledger Section Anchor */}
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
                currentRole={currentRole}
                isDbConnected={isDbConnected}
              />
            </ModuleErrorBoundary>
          </div>

          {/* Footer */}
          <footer className="pt-6 pb-12 text-center">
            <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-600">
              © 2026 FinLITE · Pambayang Dalubhasaan ng Marilao · Sidebar Ergonomics Exploration
            </p>
          </footer>

        </main>
      </div>

      {/* Modals & Slide-overs */}
      <div className="no-print">
        <ModuleErrorBoundary moduleName="Semester Management">
          <NewSemesterModal
            isOpen={isNewSemesterOpen}
            onClose={() => setIsNewSemesterOpen(false)}
            currentSemester={currentSemester}
            currentSummary={summary}
            onStartSemester={(newSem) => {
              setSemesters((prev) => [newSem, ...prev]);
              setCurrentSemester(newSem);
              setIsNewSemesterOpen(false);
            }}
          />
        </ModuleErrorBoundary>

        <ModuleErrorBoundary moduleName="Transaction Entry">
          <NewTransactionModal
            isOpen={isNewTxOpen}
            onClose={() => setIsNewTxOpen(false)}
            onSave={handleManualSaveTransaction}
            categories={categories}
            cashBalance={summary.cash_on_hand}
          />
        </ModuleErrorBoundary>

        <ModuleErrorBoundary moduleName="Proposal Generator">
          <NewProposalModal
            isOpen={isProposalOpen}
            onClose={() => setIsProposalOpen(false)}
            onOpenPreview={handleOpenProposalPreview}
          />
        </ModuleErrorBoundary>

        <ModuleErrorBoundary moduleName="Debts Management">
          <DebtsManagementModal
            isOpen={isDebtsOpen}
            onClose={() => setIsDebtsOpen(false)}
            debts={activeDebts}
            onRecordPayment={() => {}}
            onCreateDebt={() => {}}
            canManage={canManageFinancials}
          />
        </ModuleErrorBoundary>

        <ModuleErrorBoundary moduleName="Advances Management">
          <AdvancesManagementModal
            isOpen={isAdvancesOpen}
            onClose={() => setIsAdvancesOpen(false)}
            transactions={activeTransactions}
            onSettleReimbursement={handleSettleReimbursement}
            canSettle={canManageFinancials}
          />
        </ModuleErrorBoundary>

        <ModuleErrorBoundary moduleName="Document Preview">
          <DocumentPreviewModal
            isOpen={isPreviewOpen}
            onClose={() => setIsPreviewOpen(false)}
            data={previewData}
          />
        </ModuleErrorBoundary>

        <ModuleErrorBoundary moduleName="AI Copilot">
          <AIChatDrawer
            isOpen={isAIOpen}
            onClose={() => setIsAIOpen(false)}
            transactions={activeTransactions}
            summary={summary}
            currentRole={currentRole}
          />
        </ModuleErrorBoundary>

        <ModuleErrorBoundary moduleName="Cash Reconciliation">
          <DenominationCounter
            isOpen={isDenomOpen}
            onClose={() => setIsDenomOpen(false)}
            ledgerCashBalance={summary.cash_on_hand}
            currentSemester={currentSemester}
            latestReconciliation={latestReconciliation}
            denominations={denominations}
            currentRole={currentRole}
            onSaveAuditCount={() => {}}
            onLogShortageExpense={() => {}}
          />
        </ModuleErrorBoundary>

        <ModuleErrorBoundary moduleName="Audit Trail">
          <AuditTrailDrawer
            isOpen={isAuditOpen}
            onClose={() => setIsAuditOpen(false)}
          />
        </ModuleErrorBoundary>
      </div>

    </div>
  );
}
