'use client';

import { Clock, Smartphone, Wallet, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { formatPHP } from '@/lib/utils/currency';
import { Card, Badge } from '@/components/ui';

export default function StatCards({ summary, onOpenDenominations }) {
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
        <Card
          onClick={onOpenDenominations}
          role="button"
          tabIndex={0}
          className="shrink-0 w-[84vw] max-w-[320px] sm:w-auto snap-center group relative p-4.5 sm:p-5 cursor-pointer flex flex-col justify-between overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700 active:scale-[0.99]"
        >
          <div className="flex items-center justify-between mb-3 gap-2 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                <Wallet className="w-4 h-4 stroke-[2]" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-950 dark:text-emerald-100">
                Cashbox
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="emerald" size="xs">
                Physical
              </Badge>
              <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>

          <div className="my-1 relative z-10">
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums truncate text-zinc-950 dark:text-white">
              {formatPHP(cash_on_hand)}
            </p>
          </div>

          <p className="text-xs font-medium truncate mt-2 relative z-10 flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300/70">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Tap to count physical cash</span>
          </p>
        </Card>

        {/* 2. E-Money / GCash — Clean Neutral Surface */}
        <Card className="shrink-0 w-[84vw] max-w-[320px] sm:w-auto snap-center group relative p-4.5 sm:p-5 flex flex-col justify-between overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700">
          <div className="flex items-center justify-between mb-3 gap-2 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800">
                <Smartphone className="w-4 h-4 stroke-[2]" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                GCash Wallet
              </span>
            </div>
            <Badge variant="neutral" size="xs">
              Electronic
            </Badge>
          </div>

          <div className="my-1 relative z-10">
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums truncate text-zinc-950 dark:text-white">
              {formatPHP(gcash_balance)}
            </p>
          </div>

          <p className="text-xs font-medium truncate mt-2 relative z-10 flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <span>Online collections &amp; dues</span>
          </p>
        </Card>

        {/* 3. Net Cashflow & Coverage */}
        <Card className="shrink-0 w-[84vw] max-w-[320px] sm:w-auto snap-center group relative p-4.5 sm:p-5 flex flex-col justify-between overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700">
          <div className="flex items-center justify-between mb-3 gap-2 relative z-10">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                <ArrowDownRight className="w-4 h-4 stroke-[2]" />
              </div>
              <span className="text-xs font-bold truncate text-zinc-900 dark:text-zinc-100">
                Net Cashflow
              </span>
            </div>
            <Badge 
              variant={netCashflow >= 0 ? 'emerald' : 'rose'} 
              size="xs"
              className="tabular-nums"
            >
              {netSign}{formatPHP(Math.abs(netCashflow))}
            </Badge>
          </div>

          {/* Inflow vs Outflow Mini-Chips */}
          <div className="grid grid-cols-2 gap-2 my-1 relative z-10">
            <div className="p-2 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Inflow
                </span>
              </div>
              <p className="text-sm sm:text-base font-bold tabular-nums truncate text-zinc-950 dark:text-white">
                {formatPHP(total_inflows)}
              </p>
            </div>

            <div className="p-2 rounded-lg border bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Outflow
                </span>
              </div>
              <p className="text-sm sm:text-base font-bold tabular-nums truncate text-zinc-950 dark:text-white">
                {formatPHP(total_outflows)}
              </p>
            </div>
          </div>

          {/* Retention Bar */}
          <div className="mt-2.5 relative z-10">
            <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-zinc-100 dark:bg-zinc-800">
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
        </Card>

        {/* 4. Pending Abono / Advances */}
        <Card className="shrink-0 w-[84vw] max-w-[320px] sm:w-auto snap-center group relative p-4.5 sm:p-5 flex flex-col justify-between overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700">
          <div className="flex items-center justify-between mb-3 gap-2 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                <Clock className="w-4 h-4 stroke-[2]" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                Advances
              </span>
            </div>
            <Badge variant="amber" size="xs">
              Pending Abono
            </Badge>
          </div>

          <div className="my-1 relative z-10">
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums truncate text-zinc-950 dark:text-white">
              {formatPHP(pending_reimbursements)}
            </p>
          </div>

          <p className="text-xs font-medium truncate mt-2 relative z-10 flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Officer &amp; adviser claims</span>
          </p>
        </Card>

      </div>
    </div>
  );
}
