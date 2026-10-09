'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Wallet, Calculator, Sparkles, ArrowUpRight, ShieldCheck, Home, User, FileText } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import StatCards from '@/components/dashboard/StatCards';
import TransactionTable from '@/components/ledger/TransactionTable';
import NewTransactionModal from '@/components/ledger/NewTransactionModal';
import DenominationCounter from '@/components/reconciliation/DenominationCounter';
import AIChatDrawer from '@/components/ai/AIChatDrawer';
import NewProposalModal from '@/components/proposals/NewProposalModal';
import DocumentPreviewModal from '@/components/reports/DocumentPreviewModal';
import NewSemesterModal from '@/components/semesters/NewSemesterModal';
import ModuleErrorBoundary from '@/components/common/ModuleErrorBoundary';
import { createClient } from '@/lib/supabase/client';
import { isSuperAdminEmail } from '@/lib/config/admin';
import { toCentavos, fromCentavos, formatPHP } from '@/lib/utils/currency';

const DEFAULT_SEMESTERS = [
  { id: 'sem-25-26-2', academicYear: '2025-2026', semester: '2nd Sem', label: 'AY 2025–2026 • 2nd Sem' },
  { id: 'sem-26-27-1', academicYear: '2026-2027', semester: '1st Sem', label: 'AY 2026–2027 • 1st Sem' },
];

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
  const [previewData, setPreviewData] = useState(null);

  // Multi-Semester State Management
  const [semesters, setSemesters] = useState(DEFAULT_SEMESTERS);
  const [currentSemester, setCurrentSemester] = useState(DEFAULT_SEMESTERS[0]);
  const [isNewSemesterOpen, setIsNewSemesterOpen] = useState(false);

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

  // Load user profile & transactions from Supabase on mount
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

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('auth_user_id', user.id)
            .maybeSingle();

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

        // 2. Load Transactions
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .order('transaction_date', { ascending: false });

        if (error) {
          console.warn('Supabase fetch failed:', error.message);
          setTransactions([]);
        } else {
          setIsDbConnected(true);
          setTransactions(data || []);
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

  // Filter transactions strictly for the active semester
  const activeTransactions = transactions.filter((tx) => {
    // If transaction has academic_year / semester, match it
    if (tx.academic_year && tx.academic_year !== currentSemester.academicYear) return false;
    if (tx.semester && tx.semester !== currentSemester.semester) return false;
    return true;
  });

  // Recalculate summary totals atomically with precision centavo math
  const calculateSummary = (txs) => {
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

    return {
      total_inflows: fromCentavos(inflows_c),
      total_outflows: fromCentavos(outflows_c),
      cash_on_hand: fromCentavos(cash_c),
      gcash_balance: fromCentavos(gcash_c),
      pending_reimbursements: fromCentavos(pending_reimbursements_c),
    };
  };

  const summary = calculateSummary(activeTransactions);

  const handleSaveTransaction = async (newTx) => {
    const tempId = `tx-${Date.now()}`;
    const optimisticTx = {
      ...newTx,
      id: tempId,
      academic_year: newTx.academic_year || currentSemester.academicYear,
      semester: newTx.semester || currentSemester.semester,
    };
    setTransactions((prev) => [optimisticTx, ...prev]);

    if (supabase) {
      try {
        let uploadedReceiptUrl = newTx.receipt_url;

        // Try upload receipt file to Supabase storage bucket if available
        if (newTx.receiptFile) {
          try {
            const fileExt = newTx.receiptFile.name ? newTx.receiptFile.name.split('.').pop() : 'jpg';
            const filePath = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
              .from('receipts')
              .upload(filePath, newTx.receiptFile);

            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('receipts')
                .getPublicUrl(filePath);
              uploadedReceiptUrl = publicUrl;
            }
          } catch (storageErr) {
            console.warn('Storage upload note:', storageErr?.message);
          }
        }

        const payload = {
          title: newTx.title,
          description: newTx.description || null,
          amount: parseFloat(newTx.amount),
          type: newTx.type,
          payment_method: newTx.payment_method,
          transaction_date: newTx.transaction_date || new Date().toISOString().split('T')[0],
          is_reimbursement: Boolean(newTx.is_reimbursement),
          reimbursement_recipient: newTx.is_reimbursement ? newTx.reimbursement_recipient : null,
          receipt_url: uploadedReceiptUrl || null,
          status: newTx.status || 'COMPLETED',
          event_name: newTx.event_name || null,
        };

        const { data, error } = await supabase
          .from('transactions')
          .insert([payload])
          .select()
          .single();

        if (error) {
          console.error('Supabase transaction insert failed:', error);
        } else if (data) {
          setTransactions((prev) => prev.map((t) => (t.id === tempId ? { ...data, academic_year: optimisticTx.academic_year, semester: optimisticTx.semester } : t)));
        }
      } catch (err) {
        console.error('Failed to save transaction to database:', err);
      }
    }
  };

  // Handler for starting a new semester with carry-over rollover balance
  const handleStartSemester = async ({ academicYear, semester, label, rolloverCash, rolloverGcash, previousTermLabel }) => {
    const newSemObj = {
      id: `sem-${academicYear.replace(/[^0-9]/g, '')}-${semester.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      academicYear,
      semester,
      label,
    };

    setSemesters((prev) => [...prev.filter((s) => s.id !== newSemObj.id), newSemObj]);
    setCurrentSemester(newSemObj);

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
    const shortageTx = {
      title: 'Declared Cash Shortage (Adviser Approved)',
      description: notes || 'Discrepancy identified during physical cash count audit',
      amount: parseFloat(amount),
      type: 'OUTFLOW',
      payment_method: 'CASH',
      category_name: 'Cash Shortage Discrepancy',
      transaction_date: new Date().toISOString().split('T')[0],
      academic_year: currentSemester.academicYear,
      semester: currentSemester.semester,
      is_reimbursement: false,
      event_name: 'Cash Count Audit',
      status: 'COMPLETED',
    };

    const tempId = `tx-${Date.now()}`;
    setTransactions((prev) => [{ ...shortageTx, id: tempId }, ...prev]);

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .insert([{
            title: shortageTx.title,
            description: shortageTx.description,
            amount: shortageTx.amount,
            type: shortageTx.type,
            payment_method: shortageTx.payment_method,
            transaction_date: shortageTx.transaction_date,
            academic_year: shortageTx.academic_year,
            semester: shortageTx.semester,
            is_reimbursement: false,
            status: 'COMPLETED',
            event_name: shortageTx.event_name,
          }])
          .select()
          .single();

        if (!error && data) {
          setTransactions((prev) => prev.map((t) => (t.id === tempId ? data : t)));
        }
      } catch (err) {
        console.error('Failed to log shortage to database:', err);
      }
    }
  };

  const handleSaveAuditCount = async (audit) => {
    if (!supabase) return;
    try {
      await supabase.from('cash_reconciliations').insert([{
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
      }]);
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
      signatories: {
        preparedBy: 'ANDREI JOHN P. GERONIMO',
        preparedRole: 'LITE Treasurer',
        reviewedBy: 'CHRISTIAN REY C. KASILAG',
        reviewedRole: 'LITE Auditor',
        notedBy: 'EMANUEL MALBAROSA',
        notedRole: 'LITE President',
        adviser1: 'MS. KIMBERLY DAWN JATULAN',
        adviser2: 'MS. KRIZIA MAE GENOVIA',
        adviserRole: 'LITE Club Advisers',
        directorName: 'JOVYLYN ORTIZ-CESAR, MBA, MSIT',
        directorRole: 'Program Director, BSIT',
        deanName: 'DR. EMRAIDA MARIE M. MANUCOM',
        deanRole: 'Dean, College of Computer Studies',
      },
    });
    setIsPreviewOpen(true);
  };

  const handleOpenProposalPreview = (proposalPayload) => {
    setPreviewData(proposalPayload);
    setIsPreviewOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      
      {/* Top Navigation */}
      <ModuleErrorBoundary moduleName="Navigation Bar">
        <Navbar
          currentRole={currentRole}
          userProfile={userProfile}
          currentUser={currentUser}
          onOpenAI={() => setIsAIOpen(true)}
          onOpenDenominations={() => setIsDenomOpen(true)}
          currentSemester={currentSemester}
          semesters={semesters}
          onSelectSemester={(semId) => {
            const found = semesters.find((s) => s.id === semId);
            if (found) setCurrentSemester(found);
          }}
          onOpenNewSemester={() => setIsNewSemesterOpen(true)}
        />
      </ModuleErrorBoundary>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 sm:pb-8 space-y-5 sm:space-y-6">
        
        {/* Modern Minimalist Hero Balance & Action Hub — CONCEPT DESIGN */}
        <section className="relative rounded-3xl bg-[#0a2419]/85 backdrop-blur-xl border border-emerald-500/20 p-5 sm:p-7 shadow-2xl overflow-hidden transition-all">
          {/* Subtle ambient corner light aura */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Left: Dynamic Greetings Hero Header */}
            <div>
              {/* Dynamic Time-of-Day Tag & Role */}
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold tracking-wider uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {currentRole === 'admin' ? 'Administrator Portal' : currentRole === 'treasurer' ? 'LITE Treasury' : 'Officer Portal'}
                </span>
              </div>

              {/* Big Minimalist Greetings (Replacing redundant balance line) */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-sm">
                {greeting}, {userProfile?.first_name || userProfile?.full_name?.split(' ')[0] || currentUser?.user_metadata?.full_name?.split(' ')[0] || 'Officer'}
              </h1>

              {/* Preview Report Pill Button */}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleOpenLiquidationPreview}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold text-emerald-300 bg-[#0d2f20] hover:bg-[#13422d] active:bg-[#185037] border border-emerald-400/40 hover:border-emerald-300/60 shadow-md transition-all cursor-pointer group"
                  title="Preview 1:1 PDM CCS Formal Word Liquidation Report & Live Edit"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span>Preview Formal Report</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400/70 group-hover:text-emerald-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </button>
              </div>
            </div>

            {/* Right: Quick Action Pods Dock (5 Circular Pods matching mockup) */}
            <div className="p-2 sm:p-2.5 rounded-2xl sm:rounded-full bg-[#071c13]/90 backdrop-blur-md border border-emerald-500/25 shadow-inner flex items-center justify-around sm:justify-start sm:gap-4 shrink-0">
              
              {/* Pod 1: Record Transaction */}
              <button
                type="button"
                onClick={() => setIsNewTxOpen(true)}
                className="flex flex-col items-center gap-1.5 p-1 sm:px-2.5 group cursor-pointer"
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0c2e1f] border border-emerald-500/35 flex items-center justify-center text-emerald-400 group-hover:bg-[#10b981] group-hover:text-black group-hover:border-emerald-400 group-hover:scale-105 active:scale-95 transition-all shadow-md">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-white/75 group-hover:text-emerald-300 transition-colors">
                  Record
                </span>
              </button>

              {/* Pod 2: Cash Box Audit */}
              <button
                type="button"
                onClick={() => setIsDenomOpen(true)}
                className="flex flex-col items-center gap-1.5 p-1 sm:px-2.5 group cursor-pointer"
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0c2e1f] border border-emerald-500/35 flex items-center justify-center text-emerald-400 group-hover:bg-[#10b981] group-hover:text-black group-hover:border-emerald-400 group-hover:scale-105 active:scale-95 transition-all shadow-md">
                  <Wallet className="w-5 h-5" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-white/75 group-hover:text-emerald-300 transition-colors">
                  Cash Box
                </span>
              </button>

              {/* Pod 3: Proposal Creator */}
              <button
                type="button"
                onClick={() => setIsProposalOpen(true)}
                className="flex flex-col items-center gap-1.5 p-1 sm:px-2.5 group cursor-pointer"
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0c2e1f] border border-emerald-500/35 flex items-center justify-center text-emerald-400 group-hover:bg-[#10b981] group-hover:text-black group-hover:border-emerald-400 group-hover:scale-105 active:scale-95 transition-all shadow-md">
                  <Calculator className="w-5 h-5" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-white/75 group-hover:text-emerald-300 transition-colors">
                  Proposal
                </span>
              </button>

              {/* Pod 4: Preview Report */}
              <button
                type="button"
                onClick={handleOpenLiquidationPreview}
                className="flex flex-col items-center gap-1.5 p-1 sm:px-2.5 group cursor-pointer"
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0c2e1f] border border-emerald-500/35 flex items-center justify-center text-emerald-400 group-hover:bg-[#10b981] group-hover:text-black group-hover:border-emerald-400 group-hover:scale-105 active:scale-95 transition-all shadow-md">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-white/75 group-hover:text-emerald-300 transition-colors">
                  Report
                </span>
              </button>

              {/* Pod 5: AI Co-Pilot */}
              <button
                type="button"
                onClick={() => setIsAIOpen(true)}
                className="flex flex-col items-center gap-1.5 p-1 sm:px-2.5 group cursor-pointer"
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0c2e1f] border border-emerald-500/35 flex items-center justify-center text-emerald-400 group-hover:bg-[#10b981] group-hover:text-black group-hover:border-emerald-400 group-hover:scale-105 active:scale-95 transition-all shadow-md">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-white/75 group-hover:text-emerald-300 transition-colors">
                  AI Co-Pilot
                </span>
              </button>

            </div>

          </div>
        </section>

        {/* KPI Metric Cards */}
        <ModuleErrorBoundary moduleName="Financial Overview">
          <StatCards
            summary={summary}
            onOpenDenominations={() => setIsDenomOpen(true)}
          />
        </ModuleErrorBoundary>

        {/* Ledger & Transaction Table */}
        <ModuleErrorBoundary moduleName="Financial Ledger">
          <TransactionTable
            transactions={activeTransactions}
            onNewTransaction={() => setIsNewTxOpen(true)}
            onExportReport={handleOpenLiquidationPreview}
            onNewProposal={() => setIsProposalOpen(true)}
            currentRole={currentRole}
            isDbConnected={isDbConnected}
          />
        </ModuleErrorBoundary>

      </main>

      {/* Mobile Floating Action Dock (Matching Mockup Navigation) */}
      <div className="sm:hidden fixed bottom-3 left-3 right-3 z-40 bg-[#07130d]/95 backdrop-blur-xl border border-[#163325] rounded-full p-1.5 px-4 flex items-center justify-between shadow-2xl shadow-black/80">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex flex-col items-center gap-0.5 p-1 text-emerald-400 cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span className="text-[9px] font-bold">Home</span>
        </button>

        <button
          type="button"
          onClick={() => setIsDenomOpen(true)}
          className="flex flex-col items-center gap-0.5 p-1 text-white/50 hover:text-white cursor-pointer"
        >
          <Wallet className="w-4 h-4" />
          <span className="text-[9px] font-bold">Cash Box</span>
        </button>

        {/* Center Floating Action Button (Glowing Emerald Pod) */}
        <button
          type="button"
          onClick={() => setIsNewTxOpen(true)}
          className="-mt-5 w-12 h-12 rounded-full bg-[#10b981] text-black flex items-center justify-center shadow-lg shadow-emerald-500/40 border-2 border-[#07130d] hover:scale-105 active:scale-95 transition-all cursor-pointer"
          title="Record New Transaction"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>

        <button
          type="button"
          onClick={() => setIsAIOpen(true)}
          className="flex flex-col items-center gap-0.5 p-1 text-white/50 hover:text-white cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-[9px] font-bold">AI Co-Pilot</span>
        </button>

        <Link
          href="/profile"
          className="flex flex-col items-center gap-0.5 p-1 text-white/50 hover:text-white cursor-pointer"
        >
          <User className="w-4 h-4" />
          <span className="text-[9px] font-bold">Profile</span>
        </Link>
      </div>

      {/* Dashboard Footer matching reference mockup */}
      <footer className="max-w-7xl w-full mx-auto px-4 py-6 pb-24 sm:pb-6 text-center">
        <p className="text-[11px] text-white/30 font-medium">
          © 2026 FinLITE · Pambayang Dalubhasaan ng Marilao · All rights reserved.
        </p>
      </footer>

      {/* Modals & Slide-overs */}
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
          onSave={handleSaveTransaction}
        />
      </ModuleErrorBoundary>

      <ModuleErrorBoundary moduleName="Proposal Generator">
        <NewProposalModal
          isOpen={isProposalOpen}
          onClose={() => setIsProposalOpen(false)}
          onOpenPreview={handleOpenProposalPreview}
        />
      </ModuleErrorBoundary>

      <ModuleErrorBoundary moduleName="Document Preview">
        {isPreviewOpen && previewData && (
          <DocumentPreviewModal
            isOpen={isPreviewOpen}
            onClose={() => setIsPreviewOpen(false)}
            documentData={previewData}
          />
        )}
      </ModuleErrorBoundary>

      <ModuleErrorBoundary moduleName="Cash Reconciliation">
        <DenominationCounter
          isOpen={isDenomOpen}
          onClose={() => setIsDenomOpen(false)}
          ledgerCashBalance={summary.cash_on_hand}
          onDeclareShortage={handleDeclareShortage}
          onSaveCount={handleSaveAuditCount}
          currentRole={currentRole}
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

    </div>
  );
}
