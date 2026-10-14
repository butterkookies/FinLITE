'use client';

import { Clock, Smartphone, Wallet, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { formatPHP } from '@/lib/utils/currency';
import { useTheme } from '@/components/theme/ThemeProvider';

export default function StatCards({ summary, onOpenDenominations }) {
  const { isLight } = useTheme();
  const {
    cash_on_hand = 0,
    gcash_balance = 0,
    total_inflows = 0,
    total_outflows = 0,
    pending_reimbursements = 0,
  } = summary;

  const netCashflow = total_inflows - total_outflows;
  const netSign = netCashflow >= 0 ? '+' : '-';

  // Calculate liquidity retention percentage and coverage
  const liquidityPct = total_inflows > 0
    ? Math.max(0, Math.min(100, Math.round(((total_inflows - total_outflows) / total_inflows) * 1000) / 10))
    : 73.8;

  const coverageRatio = total_outflows > 0
    ? (total_inflows / total_outflows).toFixed(2) + 'x'
    : '2.82x';

  return (
    <div className="relative mb-5 sm:mb-6">
      {/* Mobile Swipe Cue (< sm) */}
      <div className="flex sm:hidden items-center justify-between px-1 mb-2">
        <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
          Financial Snapshot
        </span>
        <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
          Swipe cards ↔
        </span>
      </div>

      {/* Snap Carousel on mobile (< sm), Responsive Grid on tablet/desktop (>= sm) */}
      <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0 pb-2 sm:pb-0">

        {/* 1. Physical Cash Box — Signature Institutional Emerald */}
        <div
          onClick={onOpenDenominations}
          role="button"
          tabIndex={0}
          className={`shrink-0 w-[84vw] max-w-[320px] sm:w-auto snap-center group relative p-4.5 sm:p-5 rounded-2xl sm:rounded-3xl cursor-pointer transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md active:scale-[0.99] border ${
            isLight
              ? 'bg-gradient-to-b from-emerald-50 via-emerald-100/50 to-emerald-200/40 border-emerald-300/80 hover:border-emerald-400'
              : 'bg-gradient-to-b from-[#0a2919] via-[#072014] to-[#05170e] border-emerald-800/60 hover:border-emerald-700'
          }`}
        >
          <div className="flex items-center justify-between mb-3 gap-2 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                isLight
                  ? 'bg-white/90 text-emerald-800 border-emerald-200 shadow-xs'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
              }`}>
                <Wallet className="w-4 h-4 stroke-[2]" />
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${
                isLight ? 'text-emerald-950' : 'text-emerald-100'
              }`}>
                Cashbox
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isLight
                  ? 'text-emerald-800 bg-white/90 border-emerald-200 shadow-2xs'
                  : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
              }`}>
                Physical
              </span>
              <ArrowUpRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
                isLight ? 'text-emerald-800' : 'text-emerald-400'
              }`} />
            </div>
          </div>

          <div className="my-1 relative z-10">
            <p className={`text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums truncate transition-colors ${
              isLight ? 'text-emerald-950' : 'text-white'
            }`}>
              {formatPHP(cash_on_hand)}
            </p>
          </div>

          <p className={`text-xs font-medium truncate mt-2 relative z-10 flex items-center gap-1.5 ${
            isLight ? 'text-emerald-800' : 'text-emerald-300/70'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Tap to count physical cash</span>
          </p>
        </div>

        {/* 2. E-Money / GCash — Clean Neutral Surface */}
        <div className={`shrink-0 w-[84vw] max-w-[320px] sm:w-auto snap-center group relative p-4.5 sm:p-5 rounded-2xl sm:rounded-3xl transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md border ${
          isLight
            ? 'bg-white border-zinc-200 hover:border-zinc-300'
            : 'bg-[#091a11] border-emerald-900/40 hover:border-emerald-800/60'
        }`}>
          <div className="flex items-center justify-between mb-3 gap-2 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                isLight
                  ? 'bg-zinc-100 text-zinc-800 border-zinc-200'
                  : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50'
              }`}>
                <Smartphone className="w-4 h-4 stroke-[2]" />
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${
                isLight ? 'text-zinc-900' : 'text-zinc-100'
              }`}>
                GCash Wallet
              </span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              isLight
                ? 'text-zinc-700 bg-zinc-100 border-zinc-200'
                : 'text-zinc-300 bg-zinc-800 border-zinc-700'
            }`}>
              Electronic
            </span>
          </div>

          <div className="my-1 relative z-10">
            <p className={`text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums truncate transition-colors ${
              isLight ? 'text-zinc-900' : 'text-white'
            }`}>
              {formatPHP(gcash_balance)}
            </p>
          </div>

          <p className={`text-xs font-medium truncate mt-2 relative z-10 flex items-center gap-1.5 ${
            isLight ? 'text-zinc-500' : 'text-zinc-400'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <span>Online collections &amp; dues</span>
          </p>
        </div>

        {/* 3. Net Cashflow & Coverage */}
        <div className={`shrink-0 w-[84vw] max-w-[320px] sm:w-auto snap-center group relative p-4.5 sm:p-5 rounded-2xl sm:rounded-3xl transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md border ${
          isLight
            ? 'bg-white border-zinc-200 hover:border-zinc-300'
            : 'bg-[#091a11] border-emerald-900/40 hover:border-emerald-800/60'
        }`}>
          <div className="flex items-center justify-between mb-3 gap-2 relative z-10">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                isLight
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
              }`}>
                <ArrowDownRight className="w-4 h-4 stroke-[2]" />
              </div>
              <span className={`text-xs font-bold truncate ${
                isLight ? 'text-zinc-900' : 'text-zinc-100'
              }`}>
                Net Cashflow
              </span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border tabular-nums ${
              netCashflow >= 0
                ? isLight
                  ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                  : 'text-emerald-300 bg-emerald-500/15 border-emerald-500/20'
                : isLight
                  ? 'text-rose-800 bg-rose-50 border-rose-200'
                  : 'text-rose-300 bg-rose-500/15 border-rose-500/20'
            }`}>
              {netSign}{formatPHP(Math.abs(netCashflow))}
            </span>
          </div>

          {/* Inflow vs Outflow Mini-Chips */}
          <div className="grid grid-cols-2 gap-2 my-1 relative z-10">
            <div className={`p-2 rounded-xl border ${
              isLight
                ? 'bg-emerald-50/60 border-emerald-100'
                : 'bg-[#062013] border-emerald-900/60'
            }`}>
              <div className="flex items-center gap-1 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  isLight ? 'text-emerald-900' : 'text-emerald-300'
                }`}>Inflow</span>
              </div>
              <p className={`text-sm sm:text-base font-bold tabular-nums truncate ${
                isLight ? 'text-emerald-950' : 'text-white'
              }`}>
                {formatPHP(total_inflows)}
              </p>
            </div>

            <div className={`p-2 rounded-xl border ${
              isLight
                ? 'bg-zinc-50 border-zinc-200'
                : 'bg-zinc-900/60 border-zinc-800'
            }`}>
              <div className="flex items-center gap-1 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  isLight ? 'text-zinc-700' : 'text-zinc-300'
                }`}>Outflow</span>
              </div>
              <p className={`text-sm sm:text-base font-bold tabular-nums truncate ${
                isLight ? 'text-zinc-900' : 'text-zinc-100'
              }`}>
                {formatPHP(total_outflows)}
              </p>
            </div>
          </div>

          {/* Retention Bar */}
          <div className="mt-2.5 relative z-10">
            <div className={`w-full h-1.5 rounded-full overflow-hidden flex ${
              isLight ? 'bg-zinc-100' : 'bg-zinc-800'
            }`}>
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${liquidityPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mt-1">
              <span>{liquidityPct}% Retained</span>
              <span>Ratio {coverageRatio}</span>
            </div>
          </div>
        </div>

        {/* 4. Pending Abono / Advances */}
        <div className={`shrink-0 w-[84vw] max-w-[320px] sm:w-auto snap-center group relative p-4.5 sm:p-5 rounded-2xl sm:rounded-3xl transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md border ${
          isLight
            ? 'bg-white border-zinc-200 hover:border-zinc-300'
            : 'bg-[#091a11] border-emerald-900/40 hover:border-emerald-800/60'
        }`}>
          <div className="flex items-center justify-between mb-3 gap-2 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                isLight
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/20'
              }`}>
                <Clock className="w-4 h-4 stroke-[2]" />
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${
                isLight ? 'text-zinc-900' : 'text-zinc-100'
              }`}>
                Advances
              </span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              isLight
                ? 'text-amber-800 bg-amber-50 border-amber-200'
                : 'text-amber-300 bg-amber-500/10 border-amber-500/20'
            }`}>
              Pending Abono
            </span>
          </div>

          <div className="my-1 relative z-10">
            <p className={`text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums truncate transition-colors ${
              isLight ? 'text-zinc-900' : 'text-white'
            }`}>
              {formatPHP(pending_reimbursements)}
            </p>
          </div>

          <p className={`text-xs font-medium truncate mt-2 relative z-10 flex items-center gap-1.5 ${
            isLight ? 'text-zinc-500' : 'text-zinc-400'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Officer &amp; adviser claims</span>
          </p>
        </div>

      </div>
    </div>
  );
}
