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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-5 sm:mb-6">

      {/* 1. Physical Cash Box — ACCENT: LIME GREEN */}
      <div
        onClick={onOpenDenominations}
        className="group relative p-4.5 sm:p-5 rounded-3xl cursor-pointer transition-all bg-[#0b2414]/85 backdrop-blur-xl hover:bg-[#0e2c19]/90 border border-lime-500/30 hover:border-lime-400/60 shadow-xl shadow-lime-950/20 flex flex-col justify-between overflow-hidden"
      >
        {/* Subtle top ambient glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-lime-500/0 via-lime-400/40 to-lime-500/0" />

        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-lime-500/15 border border-lime-500/30 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4 text-lime-400" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-lime-100">
              CASHBOX
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-lime-300 bg-lime-500/15 border border-lime-500/35 px-2 py-0.5 rounded-md shrink-0">
              Audit
            </span>
            <ArrowUpRight className="w-4 h-4 text-lime-400/50 group-hover:text-lime-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
        </div>

        <div className="my-1">
          <p className="text-2xl sm:text-3xl font-black text-white group-hover:text-lime-50 tracking-tight tabular-nums truncate transition-colors">
            {formatPHP(cash_on_hand)}
          </p>
        </div>

        <p className="text-xs text-lime-200/50 font-medium truncate mt-2 group-hover:text-lime-300 transition-colors">
          Physical Cash · Click to count
        </p>
      </div>

      {/* 2. E-Money / GCash — ACCENT: LIGHT SKY BLUE */}
      <div className="group relative p-4.5 sm:p-5 rounded-3xl transition-all bg-[#07202b]/85 backdrop-blur-xl hover:bg-[#0a2736]/90 border border-sky-500/30 hover:border-sky-400/60 shadow-xl shadow-sky-950/20 flex flex-col justify-between overflow-hidden">
        {/* Subtle top ambient glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500/0 via-sky-400/40 to-sky-500/0" />

        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4 text-sky-400" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-100">
              E-MONEY
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-sky-300 bg-sky-500/15 border border-sky-500/35 px-2 py-0.5 rounded-md shrink-0">
              GCash
            </span>
            <ArrowUpRight className="w-4 h-4 text-sky-400/50 group-hover:text-sky-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
        </div>

        <div className="my-1">
          <p className="text-2xl sm:text-3xl font-black text-white group-hover:text-sky-50 tracking-tight tabular-nums truncate transition-colors">
            {formatPHP(gcash_balance)}
          </p>
        </div>

        <p className="text-xs text-sky-200/50 font-medium truncate mt-2 group-hover:text-sky-300 transition-colors">
          Digital Wallet · Online dues &amp; events
        </p>
      </div>

      {/* 3. Monthly Net Cashflow — ACCENT: EMERALD INFLOW & ORANGE OUTFLOW */}
      <div className="group relative p-4.5 sm:p-5 rounded-3xl transition-all bg-[#082418]/85 backdrop-blur-xl hover:bg-[#0b2b1d]/90 border border-emerald-500/30 hover:border-emerald-400/50 shadow-xl flex flex-col justify-between overflow-hidden">
        {/* Subtle top ambient glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-400/30 to-emerald-500/0" />

        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-xs font-bold text-white/90 truncate">
              Net Cashflow
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md shrink-0 tabular-nums">
              {netSign}{formatPHP(Math.abs(netCashflow))}
            </span>
            <ArrowUpRight className="w-4 h-4 text-emerald-400/50 group-hover:text-emerald-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
        </div>

        {/* Side-by-side: Inflow (Emerald) vs Outflow (ORANGE ACCENT) */}
        <div className="grid grid-cols-2 gap-2 my-1">
          {/* Inflow Sub-Card */}
          <div className="bg-[#061c12] p-2.5 rounded-xl border border-emerald-500/30">
            <div className="flex items-center gap-1 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Inflow</span>
            </div>
            <p className="text-sm sm:text-base font-black text-white tabular-nums truncate mt-0.5">
              {formatPHP(total_inflows)}
            </p>
            <span className="text-[9px] text-emerald-200/45 block truncate mt-0.5">
              Sales, dues
            </span>
          </div>

          {/* Outflow Sub-Card (ORANGE) */}
          <div className="bg-[#1e1107] p-2.5 rounded-xl border border-orange-500/35 hover:border-orange-400/50 transition-colors">
            <div className="flex items-center gap-1 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Outflow</span>
            </div>
            <p className="text-sm sm:text-base font-black text-orange-100 tabular-nums truncate mt-0.5">
              {formatPHP(total_outflows)}
            </p>
            <span className="text-[9px] text-orange-200/45 block truncate mt-0.5">
              Supplies, tokens
            </span>
          </div>
        </div>

        {/* Dual Progress / Retention Bar (Emerald + ORANGE) */}
        <div className="mt-3">
          <div className="w-full h-1.5 rounded-full bg-[#163325] overflow-hidden flex">
            <div 
              className="h-full bg-emerald-400 rounded-full transition-all duration-500" 
              style={{ width: `${liquidityPct}%` }} 
            />
            <div 
              className="h-full bg-orange-500 rounded-full transition-all duration-500" 
              style={{ width: `${100 - liquidityPct}%` }} 
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-medium mt-1.5">
            <span className="text-emerald-300/70">{liquidityPct}% Liquidity</span>
            <span className="text-orange-300/70">Coverage {coverageRatio}</span>
          </div>
        </div>
      </div>

      {/* 4. ADVANCES / Abono — ACCENT: WARM YELLOW */}
      <div className="group relative p-4.5 sm:p-5 rounded-3xl transition-all bg-[#201d0a]/85 backdrop-blur-xl hover:bg-[#28240d]/90 border border-yellow-500/30 hover:border-yellow-400/60 shadow-xl shadow-yellow-950/20 flex flex-col justify-between overflow-hidden">
        {/* Subtle top ambient glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500/0 via-yellow-400/40 to-yellow-500/0" />

        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-yellow-400" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-yellow-100">
              ADVANCES
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-yellow-300 bg-yellow-500/15 border border-yellow-500/35 px-2 py-0.5 rounded-md shrink-0">
              Pending
            </span>
            <ArrowUpRight className="w-4 h-4 text-yellow-400/50 group-hover:text-yellow-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
        </div>

        <div className="my-1">
          <p className="text-2xl sm:text-3xl font-black text-white group-hover:text-yellow-50 tracking-tight tabular-nums truncate transition-colors">
            {formatPHP(pending_reimbursements)}
          </p>
        </div>

        <p className="text-xs text-yellow-200/50 font-medium truncate mt-2 group-hover:text-yellow-300 transition-colors">
          Pending Abono · Adviser &amp; officer advances
        </p>
      </div>

    </div>
  );
}
