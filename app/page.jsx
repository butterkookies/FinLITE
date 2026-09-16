'use client';
import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import StatCards from '@/components/dashboard/StatCards';
import TransactionTable from '@/components/ledger/TransactionTable';
import NewTransactionModal from '@/components/ledger/NewTransactionModal';
import DenominationCounter from '@/components/reconciliation/DenominationCounter';
import AIChatDrawer from '@/components/ai/AIChatDrawer';

// Initial realistic records matching AY 2025–2026 LITE historical data
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
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [isNewTxOpen, setIsNewTxOpen] = useState(false);
  const [isDenomOpen, setIsDenomOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);

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

  const handleSaveTransaction = (newTx) => {
    const created = {
      ...newTx,
      id: `tx-${Date.now()}`,
    };
    setTransactions((prev) => [created, ...prev]);
  };

  const handleDeclareShortage = ({ amount, notes }) => {
    const shortageTx = {
      id: `tx-${Date.now()}`,
      title: 'Declared Cash Shortage (Adviser Approved)',
      description: notes,
      amount: amount,
      type: 'OUTFLOW',
      payment_method: 'CASH',
      category_name: 'Cash Shortage Discrepancy',
      transaction_date: new Date().toISOString().split('T')[0],
      is_reimbursement: false,
      event_name: 'Club Week 2026',
      status: 'COMPLETED',
    };
    setTransactions((prev) => [shortageTx, ...prev]);
  };

  const handleExportReport = async () => {
    try {
      const res = await fetch('/api/reports/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary,
          transactions,
          eventName: 'Club Week 2026 & E-Sports Cup',
        }),
      });

      if (!res.ok) throw new Error('Failed to generate report');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'FinLITE-Liquidation-Club-Week-2026.docx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('Error exporting document report. Please check server logs.');
    }
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* KPI Metric Cards */}
        <StatCards
          summary={summary}
          onOpenDenominations={() => setIsDenomOpen(true)}
        />

        {/* Ledger & Transaction Table */}
        <TransactionTable
          transactions={transactions}
          onNewTransaction={() => setIsNewTxOpen(true)}
          onExportReport={handleExportReport}
          currentRole={currentRole}
        />

      </main>

      {/* Modals & Slide-overs */}
      <NewTransactionModal
        isOpen={isNewTxOpen}
        onClose={() => setIsNewTxOpen(false)}
        onSave={handleSaveTransaction}
      />

      <DenominationCounter
        isOpen={isDenomOpen}
        onClose={() => setIsDenomOpen(false)}
        ledgerCashBalance={summary.cash_on_hand}
        onDeclareShortage={handleDeclareShortage}
        onSaveCount={(audit) => console.log('Audit count saved:', audit)}
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
