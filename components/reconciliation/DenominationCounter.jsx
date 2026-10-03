'use client';
import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, ShieldAlert, Wallet, X, RotateCcw } from 'lucide-react';
import { calculatePhysicalTotal, calculateVariance, formatPHP } from '@/lib/utils/currency';

export default function DenominationCounter({ 
  isOpen, 
  onClose, 
  ledgerCashBalance = 0,
  onDeclareShortage,
  onSaveCount,
  currentRole,
  latestReconciliation = null,
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
      setCounts({
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
      });
      if (latestReconciliation.notes) {
        setJustificationNotes(latestReconciliation.notes);
      }
    }
  }, [isOpen, latestReconciliation]);

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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-xl w-full border border-black/10 shadow-2xl overflow-hidden max-h-[92vh] sm:max-h-[90vh] flex flex-col animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-150">
        
        {/* Mobile Pull Handle */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-2.5 -mb-1 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-black/[0.06] flex items-center justify-between shrink-0 bg-gray-50/50">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-gray-950 truncate">Cash Box Denomination Counter</h3>
              <p className="text-[11px] sm:text-xs text-gray-500 font-medium truncate">
                Physical count audit vs. Book ledger balance
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 text-xs">
          
          {/* Saved Audit Active Banner */}
          {latestReconciliation && (
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-emerald-50 border border-emerald-200/90 rounded-2xl text-[11px] text-emerald-950">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate font-medium">
                  Saved audit active {latestReconciliation.created_at ? `(${new Date(latestReconciliation.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })})` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 bg-white/80 hover:bg-white px-2 py-1 rounded-lg border border-emerald-200 shrink-0 ml-2 transition-colors cursor-pointer"
                title="Reset all denomination counts to 0 for a new physical count"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to 0</span>
              </button>
            </div>
          )}

          {/* Comparison Bar */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 rounded-2xl border border-black/[0.08]">
            <div>
              <span className="text-gray-500 font-medium text-[10px] sm:text-[11px] block truncate">Counted Cash</span>
              <span className="text-sm sm:text-base font-bold text-gray-900 block mt-0.5 truncate tabular-nums">
                {formatPHP(physicalTotal)}
              </span>
            </div>
            <div>
              <span className="text-gray-500 font-medium text-[10px] sm:text-[11px] block truncate">Book Ledger</span>
              <span className="text-sm sm:text-base font-bold text-gray-900 block mt-0.5 truncate tabular-nums">
                {formatPHP(ledgerCashBalance)}
              </span>
            </div>
            <div>
              <span className="text-gray-500 font-medium text-[10px] sm:text-[11px] block truncate">Variance</span>
              <span className={`text-sm sm:text-base font-bold block mt-0.5 truncate tabular-nums ${
                status === 'BALANCED' ? 'text-emerald-700' :
                status === 'SHORTAGE' ? 'text-rose-700' : 'text-blue-700'
              }`}>
                {status === 'SHORTAGE' ? `-${formatPHP(variance)}` :
                 status === 'OVERAGE' ? `+${formatPHP(variance)}` : '₱0.00'}
              </span>
            </div>
          </div>

          {/* Variance Notice / Shortage Justification Box */}
          {status === 'SHORTAGE' && (
            <div className="p-4 bg-gray-50 border border-black/[0.08] rounded-2xl space-y-2.5">
              <div className="flex items-center gap-2 text-rose-900 font-bold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Physical Shortage Detected (-{formatPHP(variance)})</span>
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                As per LITE AY 2025–2026 governance rules, physical variances from loose coin change or booth rush may be formally declared as a justified expense line item under Adviser approval.
              </p>
              <div>
                <label className="block font-semibold text-gray-800 mb-1">
                  Adviser Shortage Justification Notes:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Minor variance incurred during Club Week booth rush (₱161.00 approved)"
                  value={justificationNotes}
                  onChange={(e) => setJustificationNotes(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs text-gray-900 select-text"
                />
              </div>
              <button
                type="button"
                onClick={handleDeclareShortageClick}
                className="h-9 px-3.5 bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
              >
                Log Approved Shortage Expense (-{formatPHP(variance)})
              </button>
            </div>
          )}

          {status === 'BALANCED' && (
            <div className="p-3 bg-gray-50 border border-black/[0.08] rounded-xl flex items-center gap-2 text-emerald-800 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Cash box perfectly reconciles with ledger records.</span>
            </div>
          )}

          {/* Denominations Input Tables */}
          <div className="space-y-4">
            
            {/* Paper Bills Section */}
            <div>
              <h4 className="font-bold text-gray-900 mb-2 uppercase tracking-wider text-[10px]">
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
                  <div key={den.key} className="p-2.5 bg-gray-50 border border-black/[0.05] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-gray-900 block">{den.label}</span>
                      <span className="text-[10px] text-gray-400">
                        {formatPHP(breakdown[den.key] || 0)}
                      </span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={counts[den.key] || ''}
                      placeholder="0"
                      onChange={(e) => handleQtyChange(den.key, e.target.value)}
                      className="w-14 text-center font-bold bg-white border border-black/[0.08] rounded-lg py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Coins Section */}
            <div>
              <h4 className="font-bold text-gray-900 mb-2 uppercase tracking-wider text-[10px]">
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
                  <div key={den.key} className="p-2.5 bg-gray-50 border border-black/[0.05] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-gray-900 block">{den.label}</span>
                      <span className="text-[10px] text-gray-400">
                        {formatPHP(breakdown[den.key] || 0)}
                      </span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={counts[den.key] || ''}
                      placeholder="0"
                      onChange={(e) => handleQtyChange(den.key, e.target.value)}
                      className="w-14 text-center font-bold bg-white border border-black/[0.08] rounded-lg py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-black/[0.06] bg-gray-50/50 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-500">
            Counted by: <span className="font-semibold text-gray-800">{currentRole.toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="h-10 px-4 text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
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
              className="h-10 px-5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            >
              {isSaved && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              <span>{isSaved ? 'Saved!' : 'Save Audit Count'}</span>
            </button>
          </div>
        </div>

        {/* Reset Confirmation Dialog Overlay */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-black/10 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-amber-600">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-950">Reset Denomination Counts?</h4>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    This will clear all physical quantities back to 0. Are you sure you want to start a fresh audit count?
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="h-9 px-3.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleResetCounts();
                    setShowResetConfirm(false);
                  }}
                  className="h-9 px-4 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Yes, Reset to 0
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
