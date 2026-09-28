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
import { createClient } from '@/lib/supabase/client';

// Initial realistic records matching AY 2025–2026 LITE historical data (used only as fallback if DB offline)
const INITIAL_TRANSACTIONS = [
  {
    id: 'tx-1',
    title: 'Club Week Booth Revenue Day 1',
    description: 'Gross sales from snacks and drinks booth',
    amount: 8500.00,
    type: 'INFLOW',
    payment_method: 'CASH',
    category_name: 'Booth Sales',
    transaction_date: '2026-09-02',
    is_reimbursement: false,
    event_name: 'Club Week 2026',
    status: 'COMPLETED',
  },
  {
    id: 'tx-2',
    title: 'Club Week Booth Revenue Day 2',
    description: 'Snacks and custom LITE stickers sales',
    amount: 6200.00,
    type: 'INFLOW',
    payment_method: 'CASH',
    category_name: 'Booth Sales',
    transaction_date: '2026-09-03',
    is_reimbursement: false,
    event_name: 'Club Week 2026',
    status: 'COMPLETED',
  },
  {
    id: 'tx-3',
    title: 'E-Sports MLBB Tournament Registration',
    description: '16 teams registered @ ₱300 per team',
    amount: 4800.00,
    type: 'INFLOW',
    payment_method: 'GCASH',
    category_name: 'E-Sports Registrations',
    transaction_date: '2026-09-06',
    is_reimbursement: false,
    event_name: 'E-Sports Cup 2026',
    status: 'COMPLETED',
  },
  {
    id: 'tx-4',
    title: 'Booth Setup Tarpaulin & Décor',
    description: 'Official event backdrop printed at Marilao Commercial Center',
    amount: 1450.00,
    type: 'OUTFLOW',
    payment_method: 'CASH',
    category_name: 'Supplies & Materials',
    transaction_date: '2026-09-01',
    is_reimbursement: false,
    event_name: 'Club Week 2026',
    status: 'COMPLETED',
    receipt_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'tx-5',
    title: 'Committee Working Lunch Day 1',
    description: 'Packed meals for volunteer student marshals (Jollibee)',
    amount: 2100.00,
    type: 'OUTFLOW',
    payment_method: 'CASH',
    category_name: 'Food & Refreshments',
    transaction_date: '2026-09-02',
    is_reimbursement: false,
    event_name: 'Club Week 2026',
    status: 'COMPLETED',
  },
  {
    id: 'tx-6',
    title: 'E-Sports Champion Cash Prize',
    description: 'Grand winner 1st place cash prize payout',
    amount: 3000.00,
    type: 'OUTFLOW',
    payment_method: 'CASH',
    category_name: 'Tournament Prizes',
    transaction_date: '2026-09-07',
    is_reimbursement: false,
    event_name: 'E-Sports Cup 2026',
    status: 'COMPLETED',
  },
  {
    id: 'tx-7',
    title: 'Judge Tokens & Certificates (Adviser Advance)',
    description: 'Out-of-pocket advance for guest speaker tokens',
    amount: 1250.00,
    type: 'OUTFLOW',
    payment_method: 'CASH',
    category_name: 'Food & Refreshments',
    transaction_date: '2026-09-09',
    is_reimbursement: true,
    reimbursement_recipient: 'Ms. Kimberly Dawn Jatulan',
    event_name: 'Club Week 2026',
    status: 'PENDING_REIMBURSEMENT',
  },
  {
    id: 'tx-8',
    title: 'Declared Cash Box Shortage',
    description: 'Approved minor discrepancy from loose coins during peak booth rush',
    amount: 161.00,
    type: 'OUTFLOW',
    payment_method: 'CASH',
    category_name: 'Cash Shortage Discrepancy',
    transaction_date: '2026-09-11',
    is_reimbursement: false,
    event_name: 'Club Week 2026',
    status: 'COMPLETED',
  },
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

  const supabase = createClient();

  // Load transactions from Supabase on mount
  useEffect(() => {
    async function loadData() {
      if (!supabase) {
        setTransactions(INITIAL_TRANSACTIONS);
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
          console.warn('Supabase fetch failed, falling back to local demo:', error.message);
          setTransactions(INITIAL_TRANSACTIONS);
        } else {
          setIsDbConnected(true);
          // If clean slate (0 rows in DB), start fresh with empty array
          setTransactions(data || []);
        }
      } catch (err) {
        console.error('Database connection error:', err);
        setTransactions(INITIAL_TRANSACTIONS);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

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

  const summary = calculateSummary(transactions);

  const handleSaveTransaction = async (newTx) => {
    const tempId = `tx-${Date.now()}`;
    const optimisticTx = {
      ...newTx,
      id: tempId,
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
          setTransactions((prev) => prev.map((t) => (t.id === tempId ? data : t)));
        }
      } catch (err) {
        console.error('Failed to save transaction to database:', err);
      }
    }
  };

  const handleDeclareShortage = async ({ amount, notes }) => {
    const shortageTx = {
      title: 'Declared Cash Shortage (Adviser Approved)',
      description: notes || 'Declared minor discrepancy from loose coins during peak booth rush',
      amount: parseFloat(amount),
      type: 'OUTFLOW',
      payment_method: 'CASH',
      category_name: 'Cash Shortage Discrepancy',
      transaction_date: new Date().toISOString().split('T')[0],
      is_reimbursement: false,
      event_name: 'Club Week 2026',
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
    setPreviewData({
      type: 'LIQUIDATION',
      eventName: 'Club Week 2026 & E-Sports Cup',
      activityTitle: 'Club Week 2026 & E-Sports Cup',
      transmittalDate: 'October 14, 2026',
      summary,
      transactions,
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
          transactions={transactions}
          onNewTransaction={() => setIsNewTxOpen(true)}
          onExportReport={handleOpenLiquidationPreview}
          onNewProposal={() => setIsProposalOpen(true)}
          currentRole={currentRole}
          isDbConnected={isDbConnected}
        />

      </main>

      {/* Modals & Slide-overs */}
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
        transactions={transactions}
      />

    </div>
  );
}
