'use client';

import React, { useState, useEffect } from 'react';
import { Archive, AlertTriangle, Loader2 } from 'lucide-react';
import { Modal, Button, Badge } from '@/components/ui';
import { formatPHP } from '@/lib/utils/currency';
import { formatFriendlyDate } from '@/lib/utils/transaction';
import { cn } from '@/lib/utils';

const PRESET_REASONS = [
  'Clerical error',
  'Duplicate entry',
  'Cancelled transaction',
  'Incorrect amount / payee',
  'Replaced by revised entry',
];

export default function VoidTransactionModal({
  isOpen,
  onClose,
  transaction,
  onConfirm,
}) {
  const [reason, setReason] = useState('Clerical error');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('Clerical error');
      setIsSubmitting(false);
      setError('');
    }
  }, [isOpen, transaction]);

  if (!transaction) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Please provide an audited reason for voiding.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onConfirm?.(transaction, trimmed);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to void transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      maxWidth="md"
      showCloseButton={!isSubmitting}
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Archive className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
              Void &amp; Archive Transaction
            </span>
          </div>
        </div>
      }
      description="Deactivate this record from active ledger balances while preserving full audit history."
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={!reason.trim() || isSubmitting}
            onClick={handleSubmit}
            leftIcon={
              isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Archive className="w-3.5 h-3.5" />
              )
            }
            className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white border-transparent focus:ring-amber-500/30"
          >
            {isSubmitting ? 'Archiving...' : 'Confirm Void & Archive'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Transaction Summary Card */}
        <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Transaction</span>
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[220px]">
              {transaction.title}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Amount &amp; Type</span>
            <div className="flex items-center gap-1.5">
              <Badge variant={transaction.type === 'INFLOW' ? 'emerald' : 'rose'} size="xs">
                {transaction.type}
              </Badge>
              <span className="text-xs font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatPHP(transaction.amount || 0)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
            <span>Category · Date</span>
            <span>
              {transaction.category || 'General'} · {formatFriendlyDate(transaction.transaction_date)}
            </span>
          </div>
        </div>

        {/* Impact Warning Notice */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed text-[11px]">
            <p className="font-bold text-amber-900 dark:text-amber-100">Zero Ledger Impact &amp; Preserved Audit History</p>
            <p className="text-amber-700 dark:text-amber-300">
              This entry will be marked as <strong>VOIDED</strong> and immediately excluded from Cash on Hand and financial liquidation reports. It will remain in the audit trail and can be restored at any time.
            </p>
          </div>
        </div>

        {/* Audited Reason Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Audited Reason <span className="text-rose-500">*</span>
            </label>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Required for audit trail</span>
          </div>

          {/* Quick preset chips */}
          <div className="flex flex-wrap gap-1.5">
            {PRESET_REASONS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setReason(preset)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border cursor-pointer',
                  reason === preset
                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                    : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700/60 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                )}
              >
                {preset}
              </button>
            ))}
          </div>

          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please enter an audited reason (e.g. Clerical error, Duplicate entry, Cancelled transaction)..."
            className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
            autoFocus
          />
        </div>
      </form>
    </Modal>
  );
}
