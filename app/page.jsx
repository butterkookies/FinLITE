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
import { createClient } from '@/lib/supabase/client';

const DEFAULT_SEMESTERS = [
  { id: 'sem-25-26-2', academicYear: '2025-2026', semester: '2nd Sem', label: 'AY 2025–2026 • 2nd Sem' },
  { id: 'sem-26-27-1', academicYear: '2026-2027', semester: '1st Sem', label: 'AY 2026–2027 • 1st Sem' },
];

export default function Dashboard() {
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

  // Load transactions from Supabase on mount
  useEffect(() => {
    async function loadData() {
      if (!supabase) {
        setTransactions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
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

  // Recalculate summary totals atomically
  const calculateSummary = (txs) => {
    let total_inflows = 0;
    let total_outflows = 0;
    let cash_on_hand = 0;
    let gcash_balance = 0;
    let pending_reimbursements = 0;

    txs.forEach((tx) => {
      const amt = Number(tx.amount) || 0;

      if (tx.type === 'INFLOW') {
        total_inflows += amt;
        if (tx.payment_method === 'CASH') cash_on_hand += amt;
        if (tx.payment_method === 'GCASH') gcash_balance += amt;
      } else if (tx.type === 'OUTFLOW') {
        // Pending reimbursements do not deduct cash yet until disbursed
        if (tx.is_reimbursement && tx.status === 'PENDING_REIMBURSEMENT') {
          pending_reimbursements += amt;
        } else {
          total_outflows += amt;
          if (tx.payment_method === 'CASH') cash_on_hand -= amt;
          if (tx.payment_method === 'GCASH') gcash_balance -= amt;
        }
      }
    });

    return {
      total_inflows,
      total_outflows,
      cash_on_hand,
      gcash_balance,
      pending_reimbursements,
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
    <div className="min-h-screen flex flex-col bg-[#f8faf9]">
      
      {/* Top Navigation */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
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

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        
        {/* KPI Metric Cards */}
        <StatCards
          summary={summary}
          onOpenDenominations={() => setIsDenomOpen(true)}
        />

        {/* Ledger & Transaction Table */}
        <TransactionTable
          transactions={activeTransactions}
          onNewTransaction={() => setIsNewTxOpen(true)}
          onExportReport={handleOpenLiquidationPreview}
          onNewProposal={() => setIsProposalOpen(true)}
          currentRole={currentRole}
          isDbConnected={isDbConnected}
        />

      </main>

      {/* Modals & Slide-overs */}
      <NewSemesterModal
        isOpen={isNewSemesterOpen}
        onClose={() => setIsNewSemesterOpen(false)}
        currentSemester={currentSemester}
        currentSummary={summary}
        onStartSemester={handleStartSemester}
      />

      <NewTransactionModal
        isOpen={isNewTxOpen}
        onClose={() => setIsNewTxOpen(false)}
        onSave={handleSaveTransaction}
      />

      <NewProposalModal
        isOpen={isProposalOpen}
        onClose={() => setIsProposalOpen(false)}
        onOpenPreview={handleOpenProposalPreview}
      />

      {isPreviewOpen && previewData && (
        <DocumentPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          documentData={previewData}
        />
      )}

      <DenominationCounter
        isOpen={isDenomOpen}
        onClose={() => setIsDenomOpen(false)}
        ledgerCashBalance={summary.cash_on_hand}
        onDeclareShortage={handleDeclareShortage}
        onSaveCount={handleSaveAuditCount}
        currentRole={currentRole}
      />

      <AIChatDrawer
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        summary={summary}
        transactions={activeTransactions}
      />

    </div>
  );
}
