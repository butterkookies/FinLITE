'use client';

import { useState, useEffect } from 'react';
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
import { toCentavos, fromCentavos } from '@/lib/utils/currency';

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
            .eq('id', user.id)
            .single();

          if (profile) {
            setUserProfile(profile);
            setCurrentRole(isSuperAdmin ? 'admin' : (profile.role || 'member'));
          } else if (isSuperAdmin) {
            setCurrentRole('admin');
          }
        }

        // 2. Load Academic Semesters
        const { data: semData, error: semError } = await supabase
          .from('semesters')
          .select('*')
          .order('created_at', { ascending: false });

        if (!semError && semData && semData.length > 0) {
          const mappedSemesters = semData.map((s) => ({
            id: s.id,
            academicYear: s.academic_year,
            semester: s.semester_type,
            label: s.label || `AY ${s.academic_year} • ${s.semester_type}`,
            isCurrent: s.is_current,
          }));
          setSemesters(mappedSemesters);
          const active = mappedSemesters.find((s) => s.isCurrent) || mappedSemesters[0];
          setCurrentSemester(active);
        }

        // 3. Load Transactions
        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .order('transaction_date', { ascending: false });

        if (!txError && txData) {
          setTransactions(txData);
          setIsDbConnected(true);
        } else {
          setTransactions([]);
        }
      } catch (err) {
        console.error('Failed to load Supabase ledger:', err);
        setTransactions([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Filter transactions strictly for the active semester
  const activeTransactions = transactions.filter((tx) => {
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

        const txPayload = {
          title: newTx.title,
          description: newTx.description || null,
          amount: newTx.amount,
          type: newTx.type,
          payment_method: newTx.payment_method,
          category_name: newTx.category_name,
          transaction_date: newTx.transaction_date,
          academic_year: optimisticTx.academic_year,
          semester: optimisticTx.semester,
          is_reimbursement: newTx.is_reimbursement || false,
          disbursed_to: newTx.disbursed_to || null,
          status: newTx.is_reimbursement ? 'PENDING_REIMBURSEMENT' : 'COMPLETED',
          receipt_url: uploadedReceiptUrl || null,
          created_by: currentUser?.id || null,
          event_name: newTx.event_name || 'Regular Operations',
        };

        const { data, error } = await supabase
          .from('transactions')
          .insert([txPayload])
          .select()
          .single();

        if (!error && data) {
          setTransactions((prev) => prev.map((t) => (t.id === tempId ? data : t)));
        }
      } catch (err) {
        console.error('Failed to save transaction to database:', err);
      }
    }
  };

  const handleStartSemester = async ({ academicYear, semester, rolloverCash, rolloverGcash, previousTermLabel }) => {
    const newSem = {
      id: `sem-${academicYear.replace(/[^0-9]/g, '')}-${semester.startsWith('1') ? '1' : '2'}`,
      academicYear,
      semester,
      label: `AY ${academicYear} • ${semester}`,
    };

    setSemesters((prev) => [newSem, ...prev]);
    setCurrentSemester(newSem);

    if (supabase) {
      try {
        await supabase
          .from('semesters')
          .update({ is_current: false })
          .neq('id', 'placeholder');

        await supabase.from('semesters').insert([{
          academic_year: academicYear,
          semester_type: semester,
          label: newSem.label,
          is_current: true,
        }]);
      } catch (err) {
        console.error('Failed to create semester in database:', err);
      }
    }

    if (rolloverCash > 0) {
      await handleSaveTransaction({
        title: `Beginning Physical Cash (Forwarded from ${previousTermLabel})`,
        description: `Starting cash box float forwarded from ${previousTermLabel}`,
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
    <div className="min-h-screen flex flex-col bg-[#f8faf9]">
      
      {/* Top Navigation */}
      <div className="no-print">
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
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6 no-print">
        
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

    </div>
  );
}
