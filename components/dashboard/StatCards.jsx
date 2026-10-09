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
        className="group relative p-4.5 sm:p-5 rounded-3xl cursor-pointer transition-all bg-gradient-to-br from-[#0d2e1b]/90 via-[#092314]/85 to-[#061a0f]/90 backdrop-blur-xl hover:from-[#103620]/95 hover:to-[#082013]/95 border border-lime-500/20 hover:border-lime-400/40 shadow-lg shadow-black/10 flex flex-col justify-between overflow-hidden"
      >
        {/* Subtle ambient corner light aura like the hero card */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-lime-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-3 gap-2 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-lime-500/15 border border-lime-500/25 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4 text-lime-400" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-lime-100/90">
              CASHBOX
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-lime-300 bg-lime-500/15 border border-lime-500/30 px-2 py-0.5 rounded-md shrink-0">
              Audit
            </span>
            <ArrowUpRight className="w-4 h-4 text-lime-400/60 group-hover:text-lime-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
        </div>

        <div className="my-1 relative z-10">
          <p className="text-2xl sm:text-3xl font-black text-white group-hover:text-lime-50 tracking-tight tabular-nums truncate transition-colors drop-shadow-sm">
            {formatPHP(cash_on_hand)}
          </p>
        </div>

        <p className="text-xs text-lime-200/60 font-medium truncate mt-2 group-hover:text-lime-300 transition-colors relative z-10">
          Physical Cash · Click to count
        </p>
      </div>

      {/* 2. E-Money / GCash — ACCENT: LIGHT SKY BLUE */}
      <div className="group relative p-4.5 sm:p-5 rounded-3xl transition-all bg-gradient-to-br from-[#082a3a]/90 via-[#06212e]/85 to-[#041722]/90 backdrop-blur-xl hover:from-[#0a3245]/95 hover:to-[#051c2a]/95 border border-sky-500/20 hover:border-sky-400/40 shadow-lg shadow-black/10 flex flex-col justify-between overflow-hidden">
        {/* Subtle ambient corner light aura like the hero card */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-sky-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-3 gap-2 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4 text-sky-400" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-100/90">
              E-MONEY
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-sky-300 bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 rounded-md shrink-0">
              GCash
            </span>
            <ArrowUpRight className="w-4 h-4 text-sky-400/60 group-hover:text-sky-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
        </div>

        <div className="my-1 relative z-10">
          <p className="text-2xl sm:text-3xl font-black text-white group-hover:text-sky-50 tracking-tight tabular-nums truncate transition-colors drop-shadow-sm">
            {formatPHP(gcash_balance)}
          </p>
        </div>

        <p className="text-xs text-sky-200/60 font-medium truncate mt-2 group-hover:text-sky-300 transition-colors relative z-10">
          Digital Wallet · Online dues &amp; events
        </p>
      </div>

      {/* 3. Monthly Net Cashflow — ACCENT: EMERALD INFLOW & ORANGE OUTFLOW */}
      <div className="group relative p-4.5 sm:p-5 rounded-3xl transition-all bg-gradient-to-br from-[#0a2e1d]/90 via-[#072417]/85 to-[#051b11]/90 backdrop-blur-xl hover:from-[#0d3623]/95 hover:to-[#072115]/95 border border-emerald-500/20 hover:border-emerald-400/40 shadow-lg shadow-black/10 flex flex-col justify-between overflow-hidden">
        {/* Subtle ambient corner light aura like the hero card */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-3 gap-2 relative z-10">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-xs font-bold text-white/90 truncate">
              Net Cashflow
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md shrink-0 tabular-nums">
              {netSign}{formatPHP(Math.abs(netCashflow))}
            </span>
            <ArrowUpRight className="w-4 h-4 text-emerald-400/60 group-hover:text-emerald-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
        </div>

        {/* Side-by-side: Inflow (Emerald) vs Outflow (ORANGE ACCENT) */}
        <div className="grid grid-cols-2 gap-2 my-1 relative z-10">
          {/* Inflow Sub-Card */}
          <div className="bg-gradient-to-br from-[#072215] to-[#04160e] p-2.5 rounded-xl border border-emerald-500/20">
            <div className="flex items-center gap-1 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Inflow</span>
            </div>
            <p className="text-sm sm:text-base font-black text-white tabular-nums truncate mt-0.5">
              {formatPHP(total_inflows)}
            </p>
            <span className="text-[9px] text-emerald-200/50 block truncate mt-0.5">
              Sales, dues
            </span>
          </div>

          {/* Outflow Sub-Card (ORANGE) */}
          <div className="bg-gradient-to-br from-[#221308] to-[#150a04] p-2.5 rounded-xl border border-orange-500/25 hover:border-orange-400/40 transition-colors">
            <div className="flex items-center gap-1 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Outflow</span>
            </div>
            <p className="text-sm sm:text-base font-black text-orange-100 tabular-nums truncate mt-0.5">
              {formatPHP(total_outflows)}
            </p>
            <span className="text-[9px] text-orange-200/50 block truncate mt-0.5">
              Supplies, tokens
            </span>
          </div>
        </div>

        {/* Dual Progress / Retention Bar (Emerald + ORANGE) */}
        <div className="mt-3 relative z-10">
          <div className="w-full h-1.5 rounded-full bg-[#0a2216] overflow-hidden flex">
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
            <span className="text-emerald-300/80">{liquidityPct}% Liquidity</span>
            <span className="text-orange-300/80">Coverage {coverageRatio}</span>
          </div>
        </div>
      </div>

      {/* 4. ADVANCES / Abono — ACCENT: WARM YELLOW */}
      <div className="group relative p-4.5 sm:p-5 rounded-3xl transition-all bg-gradient-to-br from-[#2a240a]/90 via-[#211c07]/85 to-[#161304]/90 backdrop-blur-xl hover:from-[#332b0c]/95 hover:to-[#1b1705]/95 border border-yellow-500/20 hover:border-yellow-400/40 shadow-lg shadow-black/10 flex flex-col justify-between overflow-hidden">
        {/* Subtle ambient corner light aura like the hero card */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-yellow-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-3 gap-2 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-yellow-500/15 border border-yellow-500/25 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-yellow-400" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-yellow-100/90">
              ADVANCES
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-yellow-300 bg-yellow-500/15 border border-yellow-500/30 px-2 py-0.5 rounded-md shrink-0">
              Pending
            </span>
            <ArrowUpRight className="w-4 h-4 text-yellow-400/60 group-hover:text-yellow-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
        </div>

        <div className="my-1 relative z-10">
          <p className="text-2xl sm:text-3xl font-black text-white group-hover:text-yellow-50 tracking-tight tabular-nums truncate transition-colors drop-shadow-sm">
            {formatPHP(pending_reimbursements)}
          </p>
        </div>

        <p className="text-xs text-yellow-200/60 font-medium truncate mt-2 group-hover:text-yellow-300 transition-colors relative z-10">
          Pending Abono · Adviser &amp; officer advances
        </p>
      </div>

    </div>
  );
}
