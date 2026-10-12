'use client';

import { Clock, Smartphone, Wallet, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { formatPHP } from '@/lib/utils/currency';

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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 mb-5 sm:mb-6">

      {/* 1. Physical Cash Box */}
      <div
        onClick={onOpenDenominations}
        className="group bg-white p-3.5 sm:p-4 rounded-2xl border border-black/[0.08] shadow-xs hover:border-black/[0.16] hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between"
      >
        <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1">
          <span className="flex items-center gap-1.5 font-semibold text-gray-700 whitespace-nowrap">
            <Wallet className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="truncate">Physical Cash</span>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 bg-gray-50 border border-black/[0.06] px-1.5 py-0.5 rounded-md shrink-0">
            Cashbox
          </span>
        </div>
        <div className="my-1">
          <p className="text-xl sm:text-2xl font-bold text-gray-950 tracking-tight tabular-nums truncate">
            {formatPHP(cash_on_hand)}
          </p>
        </div>
        <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 sm:mt-1 flex items-center gap-1 group-hover:text-emerald-700 transition-colors truncate">
          Click to count denominations
        </p>
      </div>

      {/* 2. E-Money / GCash */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-black/[0.08] shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1">
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <Smartphone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">GCash Wallet</span>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 bg-gray-50 border border-black/[0.06] px-1.5 py-0.5 rounded-md shrink-0">
            E-Money
          </span>
        </div>
        <div className="my-1">
          <p className="text-xl sm:text-2xl font-bold text-gray-950 tracking-tight tabular-nums truncate">
            {formatPHP(gcash_balance)}
          </p>
        </div>
        <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 sm:mt-1 truncate">
          Tournaments & online fees
        </p>
      </div>

      {/* 3. Monthly Net Cashflow */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-black/[0.08] shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1">
          <span className="flex items-center gap-1.5 whitespace-nowrap min-w-0">
            <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Net Cashflow</span>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded-md shrink-0 tabular-nums">
            {netSign}{formatPHP(Math.abs(netCashflow))}
          </span>
        </div>

        {/* Side-by-side Inflow and Outflow */}
        <div className="grid grid-cols-2 gap-1.5 my-1">
          <div className="bg-gray-50 p-1.5 sm:p-2 rounded-xl border border-black/[0.04]">
            <span className="text-[9px] sm:text-[10px] font-semibold text-gray-500 block">Inflow</span>
            <p className="text-xs sm:text-sm font-bold text-emerald-700 tabular-nums truncate mt-0.5">
              {formatPHP(total_inflows)}
            </p>
          </div>
          <div className="bg-gray-50 p-1.5 sm:p-2 rounded-xl border border-black/[0.04]">
            <span className="text-[9px] sm:text-[10px] font-semibold text-gray-500 block">Outflow</span>
            <p className="text-xs sm:text-sm font-bold text-gray-900 tabular-nums truncate mt-0.5">
              {formatPHP(total_outflows)}
            </p>
          </div>
        </div>

        {/* Liquidity progress */}
        <div className="mt-1">
          <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-emerald-600 rounded-full"
              style={{ width: `${liquidityPct}%` }}
            />
            <div
              className="h-full bg-orange-500 rounded-full"
              style={{ width: `${100 - liquidityPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-gray-400 font-medium mt-1">
            <span>{liquidityPct}% Liquidity</span>
            <span>Coverage {coverageRatio}</span>
          </div>
        </div>
      </div>

      {/* 4. ADVANCES / Abono */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-black/[0.08] shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1">
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">Pending Abono</span>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 bg-gray-50 border border-black/[0.06] px-1.5 py-0.5 rounded-md shrink-0">
            Advances
          </span>
        </div>
        <div className="my-1">
          <p className="text-xl sm:text-2xl font-bold text-amber-700 tracking-tight tabular-nums truncate">
            {formatPHP(pending_reimbursements)}
          </p>
        </div>
        <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 sm:mt-1 truncate">
          Adviser &amp; officer advances
        </p>
      </div>

    </div>
  );
}
