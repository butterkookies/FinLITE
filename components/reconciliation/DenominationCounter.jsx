'use client';
import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Wallet, X, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { calculatePhysicalTotal, calculateVariance, formatPHP } from '@/lib/utils/currency';

export default function DenominationCounter({ 
  isOpen, 
  onClose, 
  ledgerCashBalance = 0,
  onDeclareShortage,
  onSaveCount,
  currentRole
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
  const [visible, setVisible] = useState(false);

  // Animate in on open
  useEffect(() => {
    if (isOpen) {
      // Small delay so CSS transition fires after mount
      const t = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [isOpen]);

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

  const bills = [
    { key: 'bills_1000', label: '₱1,000', sublabel: 'Bill', color: 'emerald' },
    { key: 'bills_500',  label: '₱500',   sublabel: 'Bill', color: 'teal' },
    { key: 'bills_200',  label: '₱200',   sublabel: 'Bill', color: 'blue' },
    { key: 'bills_100',  label: '₱100',   sublabel: 'Bill', color: 'violet' },
    { key: 'bills_50',   label: '₱50',    sublabel: 'Bill', color: 'amber' },
    { key: 'bills_20',   label: '₱20',    sublabel: 'Bill', color: 'orange' },
  ];

  const coins = [
    { key: 'coins_20',    label: '₱20',   sublabel: 'Coin',  color: 'amber' },
    { key: 'coins_10',    label: '₱10',   sublabel: 'Coin',  color: 'yellow' },
    { key: 'coins_5',     label: '₱5',    sublabel: 'Coin',  color: 'orange' },
    { key: 'coins_1',     label: '₱1',    sublabel: 'Coin',  color: 'gray' },
    { key: 'coins_cents', label: '₱0.25', sublabel: 'Cents', color: 'gray' },
  ];

  const colorMap = {
    emerald: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/25', text: 'text-emerald-300', ring: 'focus:ring-emerald-500/40', dot: 'bg-emerald-400' },
    teal:    { bg: 'bg-teal-500/15',    border: 'border-teal-500/25',    text: 'text-teal-300',    ring: 'focus:ring-teal-500/40',    dot: 'bg-teal-400' },
    blue:    { bg: 'bg-blue-500/15',    border: 'border-blue-500/25',    text: 'text-blue-300',    ring: 'focus:ring-blue-500/40',    dot: 'bg-blue-400' },
    violet:  { bg: 'bg-violet-500/15',  border: 'border-violet-500/25',  text: 'text-violet-300',  ring: 'focus:ring-violet-500/40',  dot: 'bg-violet-400' },
    amber:   { bg: 'bg-amber-500/15',   border: 'border-amber-500/25',   text: 'text-amber-300',   ring: 'focus:ring-amber-500/40',   dot: 'bg-amber-400' },
    orange:  { bg: 'bg-orange-500/15',  border: 'border-orange-500/25',  text: 'text-orange-300',  ring: 'focus:ring-orange-500/40',  dot: 'bg-orange-400' },
    yellow:  { bg: 'bg-yellow-500/15',  border: 'border-yellow-500/25',  text: 'text-yellow-300',  ring: 'focus:ring-yellow-500/40',  dot: 'bg-yellow-400' },
    gray:    { bg: 'bg-white/[0.06]',   border: 'border-white/[0.10]',   text: 'text-white/50',    ring: 'focus:ring-white/20',       dot: 'bg-white/30' },
  };

  const DenomCard = ({ den }) => {
    const c = colorMap[den.color];
    const subtotal = breakdown[den.key] || 0;
    const qty = counts[den.key] || 0;
    return (
      <div className={`group relative p-3 rounded-2xl border ${c.border} ${c.bg} flex items-center justify-between gap-2 transition-all hover:border-opacity-60`}>
        {/* Color dot */}
        <span className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${c.dot} opacity-60`} />
        <div className="min-w-0">
          <div className="flex items-baseline gap-1">
            <span className={`text-sm font-black ${c.text}`}>{den.label}</span>
            <span className="text-[10px] text-white/30 font-medium">{den.sublabel}</span>
          </div>
          <span className="text-[10px] text-white/35 tabular-nums block">{formatPHP(subtotal)}</span>
        </div>
        <input
          type="number"
          min="0"
          value={qty === 0 ? '' : qty}
          placeholder="0"
          onChange={(e) => handleQtyChange(den.key, e.target.value)}
          className={`w-14 text-center text-sm font-black bg-black/20 border border-white/[0.10] text-white rounded-xl py-1.5 focus:outline-none focus:ring-2 ${c.ring} focus:border-transparent transition-all placeholder:text-white/20 select-text`}
        />
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ transition: 'background 200ms ease', background: visible ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0)' }}
    >
      {/* Backdrop blur layer */}
      <div
        className="absolute inset-0"
        style={{
          backdropFilter: visible ? 'blur(8px)' : 'blur(0px)',
          transition: 'backdrop-filter 250ms ease',
        }}
        onClick={onClose}
      />

      {/* Modal panel */}
      <div
        className="relative rounded-t-3xl sm:rounded-3xl max-w-xl w-full overflow-hidden max-h-[92vh] sm:max-h-[88vh] flex flex-col"
        style={{
          background: 'rgba(10, 24, 16, 0.92)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(16,185,129,0.08) inset',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
          transition: 'opacity 220ms cubic-bezier(0.32,0.72,0,1), transform 280ms cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Mobile Pull Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 -mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-white/[0.07] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white truncate">Cash Box Denomination Counter</h3>
              <p className="text-[11px] text-white/40 font-medium truncate">Physical count audit vs. Book ledger balance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/30 hover:text-white hover:bg-white/[0.08] transition-colors shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">

          {/* Summary Bar */}
          <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <span className="text-[10px] text-white/35 font-medium block mb-0.5">Counted Cash</span>
              <span className="text-sm sm:text-base font-black text-white block tabular-nums">{formatPHP(physicalTotal)}</span>
            </div>
            <div>
              <span className="text-[10px] text-white/35 font-medium block mb-0.5">Book Ledger</span>
              <span className="text-sm sm:text-base font-black text-white block tabular-nums">{formatPHP(ledgerCashBalance)}</span>
            </div>
            <div>
              <span className="text-[10px] text-white/35 font-medium block mb-0.5">Variance</span>
              <span className={`text-sm sm:text-base font-black block tabular-nums ${
                status === 'BALANCED' ? 'text-emerald-400' :
                status === 'SHORTAGE' ? 'text-rose-400' : 'text-blue-400'
              }`}>
                {status === 'SHORTAGE' ? `-${formatPHP(variance)}` :
                 status === 'OVERAGE'  ? `+${formatPHP(variance)}` : '₱0.00'}
              </span>
            </div>
          </div>

          {/* Status Banner */}
          {status === 'BALANCED' && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-medium text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              Cash box perfectly reconciles with ledger records.
            </div>
          )}

          {status === 'SHORTAGE' && (
            <div className="p-4 rounded-2xl border border-rose-500/20 space-y-3" style={{ background: 'rgba(239,68,68,0.06)' }}>
              <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                Physical Shortage Detected (−{formatPHP(variance)})
              </div>
              <p className="text-[11px] text-white/45 leading-relaxed">
                As per LITE AY 2025–2026 governance rules, physical variances from loose coin change or booth rush may be formally declared as a justified expense line item under Adviser approval.
              </p>
              <div>
                <label className="block text-[11px] font-semibold text-white/60 mb-1.5">Adviser Shortage Justification Notes:</label>
                <input
                  type="text"
                  placeholder="e.g. Minor variance during Club Week booth rush (₱161.00 approved)"
                  value={justificationNotes}
                  onChange={(e) => setJustificationNotes(e.target.value)}
                  className="w-full h-9 px-3 bg-white/[0.06] border border-white/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/30 text-xs text-white/80 placeholder:text-white/20 select-text"
                />
              </div>
              <button
                type="button"
                onClick={handleDeclareShortageClick}
                className="h-9 px-4 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
              >
                Log Approved Shortage Expense (−{formatPHP(variance)})
              </button>
            </div>
          )}

          {/* Bills */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Paper Banknotes</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {bills.map((den) => <DenomCard key={den.key} den={den} />)}
            </div>
          </div>

          {/* Coins */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Coins &amp; Small Change</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {coins.map((den) => <DenomCard key={den.key} den={den} />)}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div
          className="px-5 sm:px-6 py-4 border-t border-white/[0.07] flex items-center justify-between shrink-0"
          style={{ background: 'rgba(0,0,0,0.20)' }}
        >
          <div className="text-xs text-white/30">
            Counted by: <span className="font-bold text-white/60">{currentRole.toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="h-10 px-4 text-white/50 hover:text-white hover:bg-white/[0.08] active:bg-white/[0.12] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={() => {
                onSaveCount({ counts, physicalTotal, ledgerCashBalance, variance, status });
                onClose();
              }}
              className="h-10 px-5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              Save Audit Count
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
