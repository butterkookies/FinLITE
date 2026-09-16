'use client';
import { useState } from 'react';
import { AlertCircle, CheckCircle2, ShieldAlert, Wallet, X } from 'lucide-react';
import { calculatePhysicalTotal, calculateVariance, formatPHP } from '@/lib/utils/currency';

export default function DenominationCounter({ 
  isOpen, 
  onClose, 
  ledgerCashBalance = 0,
  onDeclareShortage,
  onSaveCount,
  currentRole
}) {
  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-black/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between shrink-0 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-950">Cash Box Denomination Counter</h3>
              <p className="text-xs text-gray-500 font-medium">
                Physical count audit vs. Book ledger balance
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* Comparison Bar */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50 rounded-2xl border border-black/[0.05]">
            <div>
              <span className="text-gray-500 font-medium text-[11px] block">Counted Cash</span>
              <span className="text-base font-bold text-gray-900 block mt-0.5">
                {formatPHP(physicalTotal)}
              </span>
            </div>
            <div>
              <span className="text-gray-500 font-medium text-[11px] block">Book Ledger</span>
              <span className="text-base font-bold text-gray-900 block mt-0.5">
                {formatPHP(ledgerCashBalance)}
              </span>
            </div>
            <div>
              <span className="text-gray-500 font-medium text-[11px] block">Variance</span>
              <span className={`text-base font-bold block mt-0.5 ${
                status === 'BALANCED' ? 'text-emerald-700' :
                status === 'SHORTAGE' ? 'text-red-600' : 'text-blue-600'
              }`}>
                {status === 'SHORTAGE' ? `-${formatPHP(variance)}` :
                 status === 'OVERAGE' ? `+${formatPHP(variance)}` : '₱0.00'}
              </span>
            </div>
          </div>

          {/* Variance Notice / Shortage Justification Box */}
          {status === 'SHORTAGE' && (
            <div className="p-4 bg-red-50/70 border border-red-200/70 rounded-2xl space-y-2.5">
              <div className="flex items-center gap-2 text-red-900 font-bold">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Physical Shortage Detected (-{formatPHP(variance)})</span>
              </div>
              <p className="text-[11px] text-red-800 leading-relaxed">
                As per LITE AY 2025–2026 governance rules, physical variances from loose coin change or booth rush may be formally declared as a justified expense line item under Adviser approval.
              </p>
              <div>
                <label className="block font-semibold text-red-950 mb-1">
                  Adviser Shortage Justification Notes:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Minor variance incurred during Club Week booth rush (₱161.00 approved)"
                  value={justificationNotes}
                  onChange={(e) => setJustificationNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-red-300 rounded-xl focus:outline-none text-xs"
                />
              </div>
              <button
                type="button"
                onClick={handleDeclareShortageClick}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs"
              >
                Log Approved Shortage Expense (-{formatPHP(variance)})
              </button>
            </div>
          )}

          {status === 'BALANCED' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200/60 rounded-xl flex items-center gap-2 text-emerald-800 font-medium">
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
              className="px-4 py-2 text-gray-600 hover:bg-gray-200/60 rounded-xl font-semibold transition-colors"
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
                });
                onClose();
              }}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-semibold shadow-xs transition-all"
            >
              Save Audit Count
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
