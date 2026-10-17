'use client';

import React, { useState } from 'react';
import { 
  CreditCard, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  Wallet, 
  X, 
  User, 
  Phone, 
  Calendar,
  Check
} from 'lucide-react';
import { formatPHP } from '@/lib/utils/currency';
import { Modal, Button, Badge, Input } from '@/components/ui';

export default function DebtsManagementModal({
  isOpen,
  onClose,
  debts = [],
  onRecordPayment,
  onCreateDebt,
  canManage = true,
}) {
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'UNPAID' | 'PARTIALLY_PAID' | 'SETTLED'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState(null);
  const [isNewDebtOpen, setIsNewDebtOpen] = useState(false);

  // Payment dialog state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // New Debt form state
  const [newDebtorName, setNewDebtorName] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmittingDebt, setIsSubmittingDebt] = useState(false);
  const [debtFormError, setDebtFormError] = useState('');

  // Compute aggregated totals
  const totalReceivable = debts.reduce((sum, d) => sum + Number(d.total_amount || 0), 0);
  const totalCollected = debts.reduce((sum, d) => sum + Number(d.amount_paid || 0), 0);
  const totalRemaining = Math.max(0, totalReceivable - totalCollected);

  // Filter debts
  const filteredDebts = debts.filter((d) => {
    const matchesSearch = 
      (d.debtor_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.debtor_contact || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeTab === 'ALL') return true;
    return d.status === activeTab;
  });

  const handleOpenPayment = (debt) => {
    setSelectedDebtForPayment(debt);
    const remaining = Math.max(0, Number(debt.total_amount || 0) - Number(debt.amount_paid || 0));
    setPaymentAmount(remaining.toString());
    setPaymentNotes('');
    setPaymentError('');
  };

  const handleConfirmPayment = async (e) => {
    e?.preventDefault();
    if (!selectedDebtForPayment) return;

    const remaining = Math.max(0, Number(selectedDebtForPayment.total_amount || 0) - Number(selectedDebtForPayment.amount_paid || 0));
    const amountVal = parseFloat(paymentAmount);

    if (isNaN(amountVal) || amountVal <= 0) {
      setPaymentError('Please enter a valid payment amount greater than ₱0.00');
      return;
    }

    setIsSubmittingPayment(true);
    setPaymentError('');

    try {
      // If user paid more than remaining, we cap the logged debt settlement at remaining
      const effectivePayment = Math.min(amountVal, remaining);
      const res = await onRecordPayment(selectedDebtForPayment.id, {
        amount: effectivePayment,
        tendered: amountVal,
        notes: paymentNotes,
      });

      if (res && res.error) {
        setPaymentError(res.error);
      } else {
        setSelectedDebtForPayment(null);
      }
    } catch (err) {
      setPaymentError(err?.message || 'Failed to record debt payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleCreateNewDebt = async (e) => {
    e?.preventDefault();
    if (!newDebtorName.trim() || !newTitle.trim()) {
      setDebtFormError('Please provide both the debtor name and title/purpose.');
      return;
    }

    const amt = parseFloat(newAmount);
    if (isNaN(amt) || amt <= 0) {
      setDebtFormError('Total amount must be greater than ₱0.00.');
      return;
    }

    setIsSubmittingDebt(true);
    setDebtFormError('');

    try {
      const res = await onCreateDebt({
        debtor_name: newDebtorName.trim(),
        title: newTitle.trim(),
        debtor_contact: newContact.trim() || null,
        total_amount: amt,
        due_date: newDueDate || null,
        notes: newNotes.trim() || null,
      });

      if (res && res.error) {
        setDebtFormError(res.error);
      } else {
        setIsNewDebtOpen(false);
        setNewDebtorName('');
        setNewTitle('');
        setNewContact('');
        setNewAmount('');
        setNewDueDate('');
        setNewNotes('');
      }
    } catch (err) {
      setDebtFormError(err?.message || 'Failed to create debt record');
    } finally {
      setIsSubmittingDebt(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Accounts Receivable & Debts"
      description="Track and collect uncollected dues, pre-orders, and member debts"
      size="xl"
    >
      <div className="space-y-4">
        {/* Top Metric Strip — Clean Borderless Surface */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40">
          <div>
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Total Receivables</p>
            <p className="text-sm sm:text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
              {formatPHP(totalReceivable)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Total Collected</p>
            <p className="text-sm sm:text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatPHP(totalCollected)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Uncollected Balance</p>
            <p className="text-sm sm:text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {formatPHP(totalRemaining)}
            </p>
          </div>
        </div>

        {/* Action Header & Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'UNPAID', label: 'Unpaid' },
              { id: 'PARTIALLY_PAID', label: 'Partial' },
              { id: 'SETTLED', label: 'Settled' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer select-none ${
                  activeTab === tab.id
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search debtor..."
                className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            {canManage && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsNewDebtOpen(true)}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                New Debt
              </Button>
            )}
          </div>
        </div>

        {/* Debts List */}
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {filteredDebts.length === 0 ? (
            <div className="py-12 text-center text-zinc-400">
              <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No debt or receivable records found</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {activeTab !== 'ALL' ? 'Try switching filter tabs' : 'All accounts are settled!'}
              </p>
            </div>
          ) : (
            filteredDebts.map((debt) => {
              const total = Number(debt.total_amount || 0);
              const paid = Number(debt.amount_paid || 0);
              const remaining = Math.max(0, total - paid);
              const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 100;
              const isSettled = debt.status === 'SETTLED' || remaining === 0;

              return (
                <div
                  key={debt.id}
                  className="p-3.5 rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:border-zinc-300 dark:hover:border-zinc-700"
                >
                  {/* Left: Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-bold text-zinc-950 dark:text-zinc-100 truncate">
                        {debt.debtor_name}
                      </span>
                      {debt.status === 'SETTLED' && (
                        <Badge variant="emerald" size="xs">Settled</Badge>
                      )}
                      {debt.status === 'PARTIALLY_PAID' && (
                        <Badge variant="amber" size="xs">{pct}% Paid</Badge>
                      )}
                      {debt.status === 'UNPAID' && (
                        <Badge variant="rose" size="xs">Unpaid</Badge>
                      )}
                      {debt.due_date && (
                        <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Due {debt.due_date}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                      {debt.title} {debt.debtor_contact && `• ${debt.debtor_contact}`}
                    </p>

                    {/* Progress Bar */}
                    <div className="mt-2 flex items-center gap-2 max-w-xs">
                      <div className="flex-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isSettled ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] tabular-nums font-medium text-zinc-400 shrink-0">
                        {formatPHP(paid)} / {formatPHP(total)}
                      </span>
                    </div>
                  </div>

                  {/* Right: Balances & Settle Action */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                    <div className="text-right sm:text-right">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Remaining</p>
                      <p className={`text-sm sm:text-base font-extrabold tabular-nums ${
                        isSettled ? 'text-zinc-400 line-through' : 'text-zinc-950 dark:text-white'
                      }`}>
                        {formatPHP(remaining)}
                      </p>
                    </div>

                    {canManage && !isSettled && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenPayment(debt)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        Collect
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Collect / Partial Payment Dialog */}
      {selectedDebtForPayment && (
        <Modal
          isOpen={Boolean(selectedDebtForPayment)}
          onClose={() => setSelectedDebtForPayment(null)}
          title={`Collect Payment — ${selectedDebtForPayment.debtor_name}`}
          description={`Purpose: ${selectedDebtForPayment.title}`}
          size="md"
        >
          <form onSubmit={handleConfirmPayment} className="space-y-4">
            {paymentError && (
              <div className="p-2.5 rounded-lg text-xs bg-rose-500/10 border border-rose-500/20 text-rose-500">
                {paymentError}
              </div>
            )}

            {/* Balances Context */}
            {(() => {
              const remaining = Math.max(0, Number(selectedDebtForPayment.total_amount || 0) - Number(selectedDebtForPayment.amount_paid || 0));
              const entered = parseFloat(paymentAmount) || 0;
              const sukli = entered > remaining ? entered - remaining : 0;

              return (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-zinc-400">Total Outstanding Balance</p>
                      <p className="text-lg font-bold tabular-nums text-zinc-950 dark:text-white">
                        {formatPHP(remaining)}
                      </p>
                    </div>
                    {sukli > 0 && (
                      <div className="text-right">
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">Change to Return (Sukli)</p>
                        <p className="text-lg font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {formatPHP(sukli)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Input: Amount Received */}
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                      Amount Tendered / Received (₱)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="e.g. 500.00"
                      required
                    />
                    {/* Quick percentage buttons */}
                    <div className="flex items-center gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(remaining.toString())}
                        className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 cursor-pointer font-medium"
                      >
                        Full (100%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentAmount((remaining / 2).toFixed(2))}
                        className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 cursor-pointer font-medium"
                      >
                        50% (₱{(remaining / 2).toFixed(2)})
                      </button>
                    </div>
                  </div>

                  {/* Destination Method */}
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                      Deposit Collected Money To
                    </label>
                    <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-950/20 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Physical Cashbox</p>
                          <p className="text-[10px] text-zinc-500">Immediate cash on hand in PD's Room</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Notes */}
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                      Payment Notes / Reference (Optional)
                    </label>
                    <Input
                      type="text"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="e.g. 1st installment cash handover"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedDebtForPayment(null)}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={isSubmittingPayment}
                    >
                      Record Inflow &amp; Settle
                    </Button>
                  </div>
                </div>
              );
            })()}
          </form>
        </Modal>
      )}

      {/* New Debt Modal */}
      {isNewDebtOpen && (
        <Modal
          isOpen={isNewDebtOpen}
          onClose={() => setIsNewDebtOpen(false)}
          title="Create New Debt / Receivable"
          description="Record an uncollected fee, batch merchandise order, or member balance"
          size="md"
        >
          <form onSubmit={handleCreateNewDebt} className="space-y-3">
            {debtFormError && (
              <div className="p-2.5 rounded-lg text-xs bg-rose-500/10 border border-rose-500/20 text-rose-500">
                {debtFormError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                Debtor Name *
              </label>
              <Input
                type="text"
                value={newDebtorName}
                onChange={(e) => setNewDebtorName(e.target.value)}
                placeholder="e.g. John Doe / 3rd Year Section A"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                Purpose / Title *
              </label>
              <Input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. LITE Batch 2026 T-Shirt Pre-Order"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                  Total Amount (₱) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="e.g. 750.00"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                  Contact / Student ID
                </label>
                <Input
                  type="text"
                  value={newContact}
                  onChange={(e) => setNewContact(e.target.value)}
                  placeholder="e.g. 09123456789"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                Due Date (Optional)
              </label>
              <Input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                Notes
              </label>
              <Input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="e.g. Size XL, ordered during General Assembly"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button variant="ghost" size="sm" onClick={() => setIsNewDebtOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmittingDebt}
              >
                Create Debt Record
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </Modal>
  );
}
