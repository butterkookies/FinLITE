'use client';

import React, { useState } from 'react';
import { Clock, CheckCircle2, User, Wallet, Smartphone, ExternalLink, Calendar } from 'lucide-react';
import { formatPHP } from '@/lib/utils/currency';
import { Modal, Button, Badge } from '@/components/ui';

export default function AdvancesManagementModal({
  isOpen,
  onClose,
  transactions = [],
  onSettleReimbursement,
  canSettle = true,
}) {
  const [activeFilter, setActiveFilter] = useState('PENDING'); // 'PENDING' | 'SETTLED' | 'ALL'
  const [settlingTx, setSettlingTx] = useState(null);
  const [settleMethod, setSettleMethod] = useState('CASH');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Extract all abono reimbursement transactions
  const abonoTransactions = transactions.filter((t) => Boolean(t.is_reimbursement));
  const pendingAbono = abonoTransactions.filter((t) => t.status === 'PENDING_REIMBURSEMENT');
  const settledAbono = abonoTransactions.filter((t) => t.status === 'REIMBURSED');

  const totalPending = pendingAbono.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalSettled = settledAbono.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // Group pending by creditor/recipient
  const pendingByCreditor = pendingAbono.reduce((acc, t) => {
    const creditor = t.reimbursement_recipient || 'Club Officer';
    if (!acc[creditor]) acc[creditor] = { total: 0, items: [] };
    acc[creditor].total += Number(t.amount || 0);
    acc[creditor].items.push(t);
    return acc;
  }, {});

  const displayedList = activeFilter === 'PENDING' 
    ? pendingAbono 
    : activeFilter === 'SETTLED' 
    ? settledAbono 
    : abonoTransactions;

  const handleConfirmSettle = async (e) => {
    e?.preventDefault();
    if (!settlingTx) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await onSettleReimbursement(settlingTx.id, { paymentMethod: settleMethod });
      if (res && res.error) {
        setErrorMessage(res.error);
      } else {
        setSettlingTx(null);
      }
    } catch (err) {
      setErrorMessage(err?.message || 'Failed to settle advance');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Out-of-Pocket Advances (Abono)"
      description="Track personal advances by officers and advisers awaiting cashbox/GCash refund"
      size="xl"
    >
      <div className="space-y-4">
        {/* Metric summary strip */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40">
          <div>
            <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Total Pending Claims</p>
            <p className="text-base sm:text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {formatPHP(totalPending)}
            </p>
            <p className="text-[10px] text-zinc-500">{pendingAbono.length} pending reimbursement vouchers</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Total Reimbursed</p>
            <p className="text-base sm:text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatPHP(totalSettled)}
            </p>
            <p className="text-[10px] text-zinc-500">{settledAbono.length} settled payouts this term</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5">
          {[
            { id: 'PENDING', label: `Pending (${pendingAbono.length})` },
            { id: 'SETTLED', label: `Settled (${settledAbono.length})` },
            { id: 'ALL', label: 'All History' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer select-none ${
                activeFilter === tab.id
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Creditors Overview (if pending) */}
        {activeFilter === 'PENDING' && Object.keys(pendingByCreditor).length > 0 && (
          <div className="p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/60">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Who FinLITE Currently Owes
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(pendingByCreditor).map(([creditor, data]) => (
                <div key={creditor} className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 text-xs">
                  <div className="flex items-center gap-1.5 truncate">
                    <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{creditor}</span>
                  </div>
                  <span className="font-bold tabular-nums text-amber-600 dark:text-amber-400 shrink-0 ml-2">
                    {formatPHP(data.total)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Advances List */}
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {displayedList.length === 0 ? (
            <div className="py-12 text-center text-zinc-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No advance records found</p>
            </div>
          ) : (
            displayedList.map((tx) => {
              const isPending = tx.status === 'PENDING_REIMBURSEMENT';
              return (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-bold text-zinc-950 dark:text-zinc-100 truncate">
                        {tx.title}
                      </span>
                      {isPending ? (
                        <Badge variant="amber" size="xs">Pending Reimbursement</Badge>
                      ) : (
                        <Badge variant="emerald" size="xs">Reimbursed</Badge>
                      )}
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Advanced by <strong className="text-zinc-900 dark:text-zinc-200">{tx.reimbursement_recipient || 'Officer'}</strong> • {tx.transaction_date || tx.created_at?.slice(0, 10)}
                    </p>
                    {tx.description && (
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{tx.description}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                    <span className="text-sm sm:text-base font-extrabold tabular-nums text-zinc-950 dark:text-white">
                      {formatPHP(tx.amount)}
                    </span>

                    {canSettle && isPending && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSettlingTx(tx);
                          setSettleMethod('CASH');
                          setErrorMessage('');
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        Settle Advance
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Settle Modal */}
      {settlingTx && (
        <Modal
          isOpen={Boolean(settlingTx)}
          onClose={() => setSettlingTx(null)}
          title={`Settle Abono Advance — ${formatPHP(settlingTx.amount)}`}
          description={`Recipient: ${settlingTx.reimbursement_recipient || 'Officer'}`}
          size="sm"
        >
          <form onSubmit={handleConfirmSettle} className="space-y-4">
            {errorMessage && (
              <div className="p-2.5 rounded-lg text-xs bg-rose-500/10 border border-rose-500/20 text-rose-500">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                Disburse Reimbursement From
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSettleMethod('CASH')}
                  className={`p-2.5 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-all ${
                    settleMethod === 'CASH'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                      : 'border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="text-xs font-bold">Physical Cashbox</p>
                    <p className="text-[10px] text-zinc-500">Cash on hand</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSettleMethod('GCASH')}
                  className={`p-2.5 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-all ${
                    settleMethod === 'GCASH'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                      : 'border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="text-xs font-bold">GCash Wallet</p>
                    <p className="text-[10px] text-zinc-500">E-money transfer</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button variant="ghost" size="sm" onClick={() => setSettlingTx(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
              >
                Confirm Payout
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </Modal>
  );
}
