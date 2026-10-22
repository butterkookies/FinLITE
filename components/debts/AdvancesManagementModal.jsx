'use client';

import React, { useState } from 'react';
import { 
  Clock, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Wallet, 
  Smartphone, 
  X, 
  User, 
  Calendar, 
  ChevronDown, 
  ChevronUp,
  Receipt,
  Tag
} from 'lucide-react';
import { formatPHP } from '@/lib/utils/currency';
import { sanitizeAmountInput } from '@/lib/utils/validation';
import { Modal, Button, Badge, Input } from '@/components/ui';

export default function AdvancesManagementModal({
  isOpen,
  onClose,
  advances = [],
  onRecordDisbursement,
  onCreateAdvance,
  cashBalance = 0,
  canManage = true,
}) {
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'UNPAID' | 'PARTIALLY_REIMBURSED' | 'SETTLED'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAdvanceForPayout, setSelectedAdvanceForPayout] = useState(null);
  const [isNewAdvanceOpen, setIsNewAdvanceOpen] = useState(false);
  const [expandedAdvanceId, setExpandedAdvanceId] = useState(null);

  // Disbursement dialog state
  const [disbursementAmount, setDisbursementAmount] = useState('');
  const [disbursementNotes, setDisbursementNotes] = useState('');
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);
  const [payoutError, setPayoutError] = useState('');

  // New Advance form state
  const [newClaimantName, setNewClaimantName] = useState('');
  const [newAdvancedByName, setNewAdvancedByName] = useState('');
  const [isProxyClaimant, setIsProxyClaimant] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newEventName, setNewEventName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('Food & Refreshments');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmittingAdvance, setIsSubmittingAdvance] = useState(false);
  const [advanceFormError, setAdvanceFormError] = useState('');

  // Aggregate totals
  const totalAdvances = advances.reduce((sum, a) => sum + Number(a.total_amount || 0), 0);
  const totalReimbursed = advances.reduce((sum, a) => sum + Number(a.amount_reimbursed || 0), 0);
  const totalRemaining = Math.max(0, totalAdvances - totalReimbursed);

  // Filter advances
  const filteredAdvances = advances.filter((a) => {
    const matchesSearch = 
      (a.claimant_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.event_name || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeTab === 'ALL') return true;
    if (activeTab === 'UNPAID') return a.status === 'UNPAID' || a.status === 'PENDING';
    return a.status === activeTab;
  });

  const handleOpenPayout = (advance) => {
    setSelectedAdvanceForPayout(advance);
    const remaining = Math.max(0, Number(advance.total_amount || 0) - Number(advance.amount_reimbursed || 0));
    setDisbursementAmount(remaining.toString());
    setDisbursementNotes('');
    setPayoutError('');
  };

  const handleConfirmPayout = async (e) => {
    e?.preventDefault();
    if (!selectedAdvanceForPayout) return;

    const remaining = Math.max(0, Number(selectedAdvanceForPayout.total_amount || 0) - Number(selectedAdvanceForPayout.amount_reimbursed || 0));
    const amountVal = parseFloat(disbursementAmount);

    if (isNaN(amountVal) || amountVal <= 0) {
      setPayoutError('Please enter a valid disbursement amount greater than ₱0.00');
      return;
    }

    if (amountVal > remaining) {
      setPayoutError(`Amount cannot exceed the remaining balance of ${formatPHP(remaining)}`);
      return;
    }

    // Cashbox liquidity validation
    const available = Number(cashBalance) || 0;
    if (amountVal > available) {
      setPayoutError(`Insufficient Physical Cashbox funds. Available: ${formatPHP(available)}`);
      return;
    }

    setIsSubmittingPayout(true);
    setPayoutError('');

    try {
      const res = await onRecordDisbursement(selectedAdvanceForPayout.id, {
        amount: amountVal,
        notes: disbursementNotes.trim(),
      });

      if (res && res.error) {
        setPayoutError(res.error);
      } else {
        setSelectedAdvanceForPayout(null);
      }
    } catch (err) {
      setPayoutError(err?.message || 'Failed to disburse reimbursement payout');
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  const handleCreateAdvanceSubmit = async (e) => {
    e?.preventDefault();
    setAdvanceFormError('');

    if (!newClaimantName.trim()) {
      setAdvanceFormError('Please enter the name of the claimant / officer who paid this advance.');
      return;
    }
    if (!newTitle.trim()) {
      setAdvanceFormError('Please enter an expense title (e.g., Judges Lunch Tokens).');
      return;
    }
    const parsedAmt = parseFloat(newAmount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      setAdvanceFormError('Please enter a valid advance amount greater than ₱0.00.');
      return;
    }

    setIsSubmittingAdvance(true);

    try {
      const res = await onCreateAdvance({
        claimant_name: newClaimantName.trim(),
        advanced_by_name: isProxyClaimant ? (newAdvancedByName.trim() || newClaimantName.trim()) : newClaimantName.trim(),
        title: newTitle.trim(),
        total_amount: parsedAmt,
        event_name: newEventName.trim() || null,
        category_name: newCategoryName.trim() || null,
        notes: newNotes.trim() || null,
      });

      if (res && res.error) {
        setAdvanceFormError(res.error);
      } else {
        setIsNewAdvanceOpen(false);
        setNewClaimantName('');
        setNewAdvancedByName('');
        setIsProxyClaimant(false);
        setNewTitle('');
        setNewAmount('');
        setNewEventName('');
        setNewNotes('');
      }
    } catch (err) {
      setAdvanceFormError(err?.message || 'Failed to record new advance');
    } finally {
      setIsSubmittingAdvance(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Out-of-Pocket Advances (Accounts Payable)"
      description="Track personal advances by officers/advisers and disburse full or partial reimbursements"
      size="xl"
    >
      <div className="space-y-4">
        {/* Top Metric Strip */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40">
          <div>
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Total Advances</p>
            <p className="text-sm sm:text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
              {formatPHP(totalAdvances)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Total Reimbursed</p>
            <p className="text-sm sm:text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatPHP(totalReimbursed)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Pending Liabilities</p>
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
              { id: 'UNPAID', label: 'Pending' },
              { id: 'PARTIALLY_REIMBURSED', label: 'Partial' },
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
                placeholder="Search claimant or title..."
                className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            {canManage && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsNewAdvanceOpen(true)}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                New Advance
              </Button>
            )}
          </div>
        </div>

        {/* Advances List */}
        <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
          {filteredAdvances.length === 0 ? (
            <div className="py-12 text-center text-zinc-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No advance records found</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {activeTab !== 'ALL' ? 'Try switching filter tabs' : 'All personal advances are fully settled!'}
              </p>
            </div>
          ) : (
            filteredAdvances.map((adv) => {
              const total = Number(adv.total_amount || 0);
              const paid = Number(adv.amount_reimbursed || 0);
              const remaining = Math.max(0, total - paid);
              const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 100;
              const isSettled = adv.status === 'SETTLED' || remaining === 0;
              const isExpanded = expandedAdvanceId === adv.id;
              const disbursements = adv.advance_disbursements || [];

              return (
                <div
                  key={adv.id}
                  className="p-3.5 rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/80 flex flex-col gap-2.5 transition-colors hover:border-zinc-300 dark:hover:border-zinc-700"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-bold text-zinc-950 dark:text-zinc-100 truncate" title={adv.advanced_by_name && adv.advanced_by_name !== adv.claimant_name ? `Originally paid by ${adv.advanced_by_name}` : undefined}>
                          {adv.advanced_by_name && adv.advanced_by_name !== adv.claimant_name
                            ? `${adv.advanced_by_name} → ${adv.claimant_name}`
                            : adv.claimant_name}
                        </span>
                        {isSettled ? (
                          <Badge variant="emerald" size="xs">Settled</Badge>
                        ) : adv.status === 'PARTIALLY_REIMBURSED' || paid > 0 ? (
                          <Badge variant="amber" size="xs">{pct}% Reimbursed</Badge>
                        ) : (
                          <Badge variant="rose" size="xs">Pending Claim</Badge>
                        )}
                        <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {adv.advance_date || adv.created_at?.slice(0, 10)}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                        {adv.title} {adv.event_name && `• Event: ${adv.event_name}`}
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

                    {/* Right: Balances & Payout Action */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                      <div className="text-right">
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
                          onClick={() => handleOpenPayout(adv)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                          Disburse
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Past Disbursements Expand Toggle */}
                  {disbursements.length > 0 && (
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                      <button
                        type="button"
                        onClick={() => setExpandedAdvanceId(isExpanded ? null : adv.id)}
                        className="text-[11px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        <span>{disbursements.length} disbursement {disbursements.length === 1 ? 'record' : 'records'}</span>
                      </button>

                      {isExpanded && (
                        <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-emerald-500/30">
                          {disbursements.map((d, idx) => (
                            <div key={d.id || idx} className="text-xs flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Cashbox • {d.disbursement_date?.slice(0, 10) || 'Recent'}
                                {d.notes && <span className="text-zinc-400 italic">({d.notes})</span>}
                              </span>
                              <span className="font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                                {formatPHP(d.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Partial Disbursement Modal */}
      {selectedAdvanceForPayout && (
        <Modal
          isOpen={Boolean(selectedAdvanceForPayout)}
          onClose={() => setSelectedAdvanceForPayout(null)}
          title="Disburse Reimbursement"
          description={`Refund advance to ${selectedAdvanceForPayout.claimant_name}`}
          size="sm"
        >
          <form onSubmit={handleConfirmPayout} className="space-y-4">
            {payoutError && (
              <div className="p-2.5 rounded-lg text-xs bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{payoutError}</span>
              </div>
            )}

            {/* Advance Summary */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">Expense Title:</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[180px]">
                  {selectedAdvanceForPayout.title}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Total Advance Claim:</span>
                <span className="font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {formatPHP(selectedAdvanceForPayout.total_amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Remaining Balance:</span>
                <span className="font-extrabold tabular-nums text-amber-600 dark:text-amber-400">
                  {formatPHP(Math.max(0, Number(selectedAdvanceForPayout.total_amount || 0) - Number(selectedAdvanceForPayout.amount_reimbursed || 0)))}
                </span>
              </div>
            </div>

            {/* Payout Amount Input */}
            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                Amount to Disburse (₱)
              </label>
              <Input
                type="text"
                inputMode="decimal"
                value={disbursementAmount}
                onKeyDown={(e) => {
                  if (['-', '+', 'e', 'E'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => setDisbursementAmount(sanitizeAmountInput(e.target.value))}
                placeholder="Enter payout amount (max 99,999)..."
                autoFocus
                required
              />
              <div className="flex items-center justify-between mt-1.5 text-[11px] text-zinc-500">
                <span>
                  Remaining after payout:{' '}
                  <strong className="text-zinc-800 dark:text-zinc-200">
                    {formatPHP(
                      Math.max(
                        0,
                        Number(selectedAdvanceForPayout.total_amount || 0) -
                          Number(selectedAdvanceForPayout.amount_reimbursed || 0) -
                          (parseFloat(disbursementAmount) || 0)
                      )
                    )}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const remaining = Math.max(0, Number(selectedAdvanceForPayout.total_amount || 0) - Number(selectedAdvanceForPayout.amount_reimbursed || 0));
                    setDisbursementAmount(remaining.toString());
                  }}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer font-medium"
                >
                  Pay Remaining Full
                </button>
              </div>
            </div>

            {/* Vault Channel Info */}
            <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-950/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Physical Cashbox Payout</p>
                  <p className="text-[10px] text-zinc-500">Program Director's Room Vault</p>
                </div>
              </div>
              <p className={`text-xs font-bold tabular-nums ${
                cashBalance < parseFloat(disbursementAmount || 0)
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                Avail: {formatPHP(cashBalance)}
              </p>
            </div>

            {/* Optional Notes */}
            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                Disbursement Remarks / Notes (Optional)
              </label>
              <input
                type="text"
                value={disbursementNotes}
                onChange={(e) => setDisbursementNotes(e.target.value)}
                placeholder="e.g. Tranche 1 of 2 via cash handover"
                className="w-full text-xs px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button variant="ghost" size="sm" onClick={() => setSelectedAdvanceForPayout(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmittingPayout}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Confirm Disbursement
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* New Advance Record Modal */}
      {isNewAdvanceOpen && (
        <Modal
          isOpen={isNewAdvanceOpen}
          onClose={() => setIsNewAdvanceOpen(false)}
          title="Record Out-of-Pocket Advance"
          description="Log personal funds advanced by an officer or adviser"
          size="sm"
        >
          <form onSubmit={handleCreateAdvanceSubmit} className="space-y-3.5">
            {advanceFormError && (
              <div className="p-2.5 rounded-lg text-xs bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{advanceFormError}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={isProxyClaimant}
                  onChange={(e) => setIsProxyClaimant(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Authorized proxy is collecting payout on behalf of original payer</span>
              </label>

              {isProxyClaimant ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                      Originally Paid By (Creditor) *
                    </label>
                    <Input
                      type="text"
                      value={newAdvancedByName}
                      onChange={(e) => setNewAdvancedByName(e.target.value)}
                      placeholder="e.g. Ms. Kimberly Dawn Jatulan"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                      Authorized Claimant (Proxy) *
                    </label>
                    <Input
                      type="text"
                      value={newClaimantName}
                      onChange={(e) => setNewClaimantName(e.target.value)}
                      placeholder="e.g. Andrei Geronimo"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                    Claimant / Advanced By *
                  </label>
                  <Input
                    type="text"
                    value={newClaimantName}
                    onChange={(e) => setNewClaimantName(e.target.value)}
                    placeholder="e.g. Sir Harvey or Andrei Geronimo"
                    required
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                Expense Title / Purpose *
              </label>
              <Input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Lunch for Seminar Judges"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                  Total Amount (₱) *
                </label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={newAmount}
                  onChange={(e) => setNewAmount(sanitizeAmountInput(e.target.value))}
                  placeholder="e.g. 1000.00 (max 99,999)"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                  Event Name (Optional)
                </label>
                <Input
                  type="text"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  placeholder="e.g. Tech Summit 2026"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                Notes &amp; Details (Optional)
              </label>
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows={2}
                placeholder="Add receipt notes or commercial invoice remarks..."
                className="w-full text-xs p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button variant="ghost" size="sm" onClick={() => setIsNewAdvanceOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmittingAdvance}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Record Advance
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </Modal>
  );
}
