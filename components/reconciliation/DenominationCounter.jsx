'use client';
import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, ShieldAlert, Wallet, X, RotateCcw } from 'lucide-react';
import { calculatePhysicalTotal, calculateVariance, formatPHP, denomCodeToCountKey } from '@/lib/utils/currency';
import { Button, Badge, Modal } from '@/components/ui';

export default function DenominationCounter({ 
  isOpen, 
  onClose, 
  ledgerCashBalance = 0,
  onDeclareShortage,
  onSaveCount,
  currentRole,
  latestReconciliation = null,
  denominations = [],
}) {
  const [counts, setCounts] = useState({
    bills_1000: 0,
    bills_500: 0,
    bills_200: 0,
    bills_100: 0,
    bills_50: 0,
    bills_20: 0,
    coins_20: 0,
    coins_10: 0,
    coins_5: 0,
    coins_1: 0,
    coins_cents: 0,
  });

  const [justificationNotes, setJustificationNotes] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync state whenever latestReconciliation loads or when modal opens
  useEffect(() => {
    if (latestReconciliation) {
      const initialCounts = {
        bills_1000: Number(latestReconciliation.bills_1000) || 0,
        bills_500: Number(latestReconciliation.bills_500) || 0,
        bills_200: Number(latestReconciliation.bills_200) || 0,
        bills_100: Number(latestReconciliation.bills_100) || 0,
        bills_50: Number(latestReconciliation.bills_50) || 0,
        bills_20: Number(latestReconciliation.bills_20) || 0,
        coins_20: Number(latestReconciliation.coins_20) || 0,
        coins_10: Number(latestReconciliation.coins_10) || 0,
        coins_5: Number(latestReconciliation.coins_5) || 0,
        coins_1: Number(latestReconciliation.coins_1) || 0,
        coins_cents: Number(latestReconciliation.coins_cents) || 0,
      };

      // If normalized child items are present, override with relational counts
      if (Array.isArray(latestReconciliation.cash_reconciliation_items) && latestReconciliation.cash_reconciliation_items.length > 0) {
        latestReconciliation.cash_reconciliation_items.forEach((item) => {
          const code = item.denominations?.code || denominations.find((d) => d.id === item.denomination_id)?.code;
          if (code) {
            const countKey = denomCodeToCountKey(code);
            initialCounts[countKey] = Number(item.quantity) || 0;
            initialCounts[code.toLowerCase()] = Number(item.quantity) || 0;
          }
        });
      }

      setCounts(initialCounts);
      if (latestReconciliation.notes) {
        setJustificationNotes(latestReconciliation.notes);
      }
    }
  }, [isOpen, latestReconciliation, denominations]);

  const handleResetCounts = () => {
    setCounts({
      bills_1000: 0,
      bills_500: 0,
      bills_200: 0,
      bills_100: 0,
      bills_50: 0,
      bills_20: 0,
      coins_20: 0,
      coins_10: 0,
      coins_5: 0,
      coins_1: 0,
      coins_cents: 0,
    });
  };

  const handleQtyChange = (field, value) => {
    const val = parseInt(value, 10);
    setCounts((prev) => ({
      ...prev,
      [field]: isNaN(val) || val < 0 ? 0 : val,
    }));
  };

  const { total: physicalTotal, breakdown } = calculatePhysicalTotal(counts);
  const { variance, status } = calculateVariance(physicalTotal, ledgerCashBalance);

  const handleDeclareShortageClick = () => {
    if (variance <= 0) return;
    onDeclareShortage({
      amount: variance,
      notes: justificationNotes || 'Declared minor shortage from loose coins during peak booth sales.',
    });
    onClose();
  };

  // Safe early return after all hooks
  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="xl"
        title={
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Cash Box Denomination Counter</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
                Physical count audit vs. Book ledger balance
              </p>
            </div>
          </div>
        }
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Counted by: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{currentRole.toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onSaveCount({
                    counts,
                    physicalTotal,
                    ledgerCashBalance,
                    variance,
                    status,
                    notes: justificationNotes,
                  });
                  setIsSaved(true);
                  setTimeout(() => {
                    setIsSaved(false);
                    onClose();
                  }, 400);
                }}
              >
                {isSaved && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                <span>{isSaved ? 'Saved!' : 'Save Audit Count'}</span>
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 sm:space-y-5 text-xs">
          {/* Saved Audit Active Banner */}
          {latestReconciliation && (
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/90 dark:border-emerald-800/40 rounded-2xl text-[11px] text-emerald-950 dark:text-emerald-200">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate font-medium">
                  Saved audit active {latestReconciliation.created_at ? `(${new Date(latestReconciliation.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })})` : ''}
                </span>
              </div>
              <Button
                type="button"
                variant="emerald-subtle"
                size="xs"
                onClick={() => setShowResetConfirm(true)}
                title="Reset all denomination counts to 0 for a new physical count"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to 0</span>
              </Button>
            </div>
          )}

          {/* Comparison Bar */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3 sm:p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div>
              <span className="text-zinc-500 dark:text-zinc-400 font-medium text-[10px] sm:text-[11px] block truncate">Counted Cash</span>
              <span className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 block mt-0.5 truncate tabular-nums">
                {formatPHP(physicalTotal)}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 dark:text-zinc-400 font-medium text-[10px] sm:text-[11px] block truncate">Book Ledger</span>
              <span className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 block mt-0.5 truncate tabular-nums">
                {formatPHP(ledgerCashBalance)}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 dark:text-zinc-400 font-medium text-[10px] sm:text-[11px] block truncate">Variance</span>
              <span className={`text-sm sm:text-base font-bold block mt-0.5 truncate tabular-nums ${
                status === 'BALANCED' ? 'text-emerald-600 dark:text-emerald-400' :
                status === 'SHORTAGE' ? 'text-rose-600 dark:text-rose-400' : 'text-sky-600 dark:text-sky-400'
              }`}>
                {status === 'SHORTAGE' ? `-${formatPHP(variance)}` :
                 status === 'OVERAGE' ? `+${formatPHP(variance)}` : '₱0.00'}
              </span>
            </div>
          </div>

          {/* Variance Notice / Shortage Justification Box */}
          {status === 'SHORTAGE' && (
            <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl space-y-2.5">
              <div className="flex items-center gap-2 text-rose-900 dark:text-rose-300 font-bold">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>Physical Shortage Detected (-{formatPHP(variance)})</span>
              </div>
              <div>
                <label className="block font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                  Adviser Shortage Justification Notes:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Minor variance incurred during Club Week booth rush (₱161.00 approved)"
                  value={justificationNotes}
                  onChange={(e) => setJustificationNotes(e.target.value)}
                  className="w-full h-9 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-zinc-900 dark:text-zinc-100 select-text"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDeclareShortageClick}
              >
                Log Approved Shortage Expense (-{formatPHP(variance)})
              </Button>
            </div>
          )}

          {status === 'BALANCED' && (
            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Cash box perfectly reconciles with ledger records.</span>
            </div>
          )}

          {/* Denominations Input Tables */}
          <div className="space-y-4">
            
            {/* Paper Bills Section */}
            <div>
              <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-2 uppercase tracking-wider text-[10px]">
                Paper Banknotes
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { key: 'bills_1000', label: '₱1,000 Bill', value: 1000 },
                  { key: 'bills_500', label: '₱500 Bill', value: 500 },
                  { key: 'bills_200', label: '₱200 Bill', value: 200 },
                  { key: 'bills_100', label: '₱100 Bill', value: 100 },
                  { key: 'bills_50', label: '₱50 Bill', value: 50 },
                  { key: 'bills_20', label: '₱20 Bill', value: 20 },
                ].map((den) => (
                  <div key={den.key} className="p-2.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 block">{den.label}</span>
                      <span className="text-[10px] text-zinc-400">
                        {formatPHP(breakdown[den.key] || 0)}
                      </span>
                    </div>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={counts[den.key] || ''}
                      placeholder="0"
                      onChange={(e) => handleQtyChange(den.key, e.target.value)}
                      className="w-14 text-center font-bold bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-lg py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Coins Section */}
            <div>
              <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-2 uppercase tracking-wider text-[10px]">
                Coins & Small Change
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { key: 'coins_20', label: '₱20 Coin', value: 20 },
                  { key: 'coins_10', label: '₱10 Coin', value: 10 },
                  { key: 'coins_5', label: '₱5 Coin', value: 5 },
                  { key: 'coins_1', label: '₱1 Coin', value: 1 },
                  { key: 'coins_cents', label: '₱0.25 Cents', value: 0.25 },
                ].map((den) => (
                  <div key={den.key} className="p-2.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 block">{den.label}</span>
                      <span className="text-[10px] text-zinc-400">
                        {formatPHP(breakdown[den.key] || 0)}
                      </span>
                    </div>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={counts[den.key] || ''}
                      placeholder="0"
                      onChange={(e) => handleQtyChange(den.key, e.target.value)}
                      className="w-14 text-center font-bold bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-lg py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </Modal>

      {/* Reset Confirmation Dialog Overlay */}
      {showResetConfirm && (
        <Modal
          isOpen={showResetConfirm}
          onClose={() => setShowResetConfirm(false)}
          maxWidth="sm"
          title="Reset Denomination Counts?"
          description="This will clear all physical quantities back to 0. Are you sure you want to start a fresh audit count?"
          footer={
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResetConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  handleResetCounts();
                  setShowResetConfirm(false);
                }}
              >
                Yes, Reset to 0
              </Button>
            </>
          }
        />
      )}
    </>
  );
}
