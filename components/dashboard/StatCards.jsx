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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3.5 sm:gap-4 mb-5 sm:mb-6">

      {/* 1. Physical Cash Box */}
      <div
        onClick={onOpenDenominations}
        className="col-span-1 md:col-span-1 lg:col-span-3 group relative p-4.5 sm:p-5 rounded-2xl cursor-pointer transition-all bg-[#0c1b14] hover:bg-[#0e2118] border border-[#163325] hover:border-emerald-500/40 shadow-xl flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-white/90">
              CASHBOX
            </span>
          </div>
          <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md shrink-0">
            +0.0%
          </span>
        </div>

        <div className="my-1">
          <p className="text-2xl sm:text-3xl font-black text-white tracking-tight tabular-nums truncate">
            {formatPHP(cash_on_hand)}
          </p>
        </div>

        <p className="text-xs text-white/40 font-medium truncate mt-2 group-hover:text-emerald-300 transition-colors">
          Physical Cash · Click to count
        </p>
      </div>

      {/* 2. E-Money / GCash */}
      <div className="col-span-1 md:col-span-1 lg:col-span-3 relative p-4.5 sm:p-5 rounded-2xl transition-all bg-[#0c1b14] hover:bg-[#0e2118] border border-[#163325] hover:border-emerald-500/40 shadow-xl flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-white/90">
              E-MONEY
            </span>
          </div>
          <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md shrink-0">
            +0.0%
          </span>
        </div>

        <div className="my-1">
          <p className="text-2xl sm:text-3xl font-black text-white tracking-tight tabular-nums truncate">
            {formatPHP(gcash_balance)}
          </p>
        </div>

        <p className="text-xs text-white/40 font-medium truncate mt-2">
          GCash Wallet · Tournaments &amp; onlin...
        </p>
      </div>

      {/* 3. Monthly Net Cashflow (Double Column Card) */}
      <div className="col-span-1 md:col-span-2 lg:col-span-4 relative p-4.5 sm:p-5 rounded-2xl transition-all bg-[#0c1b14] border border-[#163325] shadow-xl flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-xs font-bold text-white/90">
              Monthly Net Cashflow
            </span>
          </div>
          <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md shrink-0 tabular-nums">
            {netSign}{formatPHP(Math.abs(netCashflow))} Net
          </span>
        </div>

        {/* Side-by-side Inflow and Outflow blocks */}
        <div className="grid grid-cols-2 gap-2.5 my-1">
          <div className="bg-[#07130e] p-2.5 sm:p-3 rounded-xl border border-[#142d21]">
            <span className="text-[11px] font-semibold text-white/60 block">Inflow</span>
            <p className="text-base sm:text-lg font-black text-white tabular-nums truncate mt-0.5">
              {formatPHP(total_inflows)}
            </p>
            <span className="text-[10px] text-white/40 block truncate mt-0.5">
              Sales, entries, dues
            </span>
          </div>

          <div className="bg-[#07130e] p-2.5 sm:p-3 rounded-xl border border-[#142d21]">
            <span className="text-[11px] font-semibold text-white/60 block">Outflow</span>
            <p className="text-base sm:text-lg font-black text-white tabular-nums truncate mt-0.5">
              {formatPHP(total_outflows)}
            </p>
            <span className="text-[10px] text-white/40 block truncate mt-0.5">
              Supplies, food, tokens
            </span>
          </div>
        </div>

        {/* Dual Progress / Retention Bar */}
        <div className="mt-3">
          <div className="w-full h-1.5 rounded-full bg-[#163325] overflow-hidden flex">
            <div 
              className="h-full bg-emerald-400 rounded-full transition-all duration-500" 
              style={{ width: `${liquidityPct}%` }} 
            />
            <div 
              className="h-full bg-rose-500/60 rounded-full transition-all duration-500" 
              style={{ width: `${100 - liquidityPct}%` }} 
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-white/45 font-medium mt-1.5">
            <span>{liquidityPct}% Liquidity Retained</span>
            <span>Coverage {coverageRatio}</span>
          </div>
        </div>
      </div>

      {/* 4. ADVANCES / Abono */}
      <div className="col-span-1 md:col-span-2 lg:col-span-2 relative p-4.5 sm:p-5 rounded-2xl transition-all bg-[#0c1b14] hover:bg-[#0e2118] border border-[#163325] hover:border-amber-500/40 shadow-xl flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-200/90 truncate">
              ADVANCES
            </span>
          </div>
          <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md shrink-0">
            Pending
          </span>
        </div>

        <div className="my-1">
          <p className="text-2xl sm:text-3xl font-black text-white tracking-tight tabular-nums truncate">
            {formatPHP(pending_reimbursements)}
          </p>
        </div>

        <p className="text-xs text-white/40 font-medium truncate mt-2">
          Pending Abono - Adviser &amp; officer advances
        </p>
      </div>

    </div>
  );
}
