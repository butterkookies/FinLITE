'use client';

import React, { useState } from 'react';
import { RotateCcw, AlertCircle, Loader2 } from 'lucide-react';
import { Modal, Button, Badge } from '@/components/ui';
import { formatPHP } from '@/lib/utils/currency';
import { formatFriendlyDate } from '@/lib/utils/transaction';

export default function RestoreTransactionModal({
  isOpen,
  onClose,
  transaction,
  onConfirm,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!transaction) return null;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      setError('');
      await onConfirm?.(transaction);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to restore transaction. Please try again.');
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
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
              Restore Transaction to Active Ledger
            </span>
          </div>
        </div>
      }
      description="Reactivate this record and restore its impact on cash balances and liquidation reports."
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
            disabled={isSubmitting}
            onClick={handleConfirm}
            leftIcon={
              isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )
            }
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border-transparent focus:ring-emerald-500/30"
          >
            {isSubmitting ? 'Restoring...' : 'Confirm Restore to Ledger'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
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
          {transaction.void_reason && (
            <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-start gap-1.5">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Previous Void Reason:</span>
              <span className="italic">"{transaction.void_reason}"</span>
            </div>
          )}
        </div>

        {/* Reinstatement notice */}
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed text-[11px]">
            <p className="font-bold text-emerald-900 dark:text-emerald-100">Active Ledger Reinstatement</p>
            <p className="text-emerald-700 dark:text-emerald-300">
              Restoring this transaction will reinstate its status to <strong>COMPLETED</strong> and recalculate it into current Cash on Hand and financial liquidation reports.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
