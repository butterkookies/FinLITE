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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-5 sm:mb-6">

      {/* 1. Physical Cash Box — ACCENT: LIME GREEN */}
      <div
        onClick={onOpenDenominations}
        className={`group relative p-4.5 sm:p-5 rounded-3xl cursor-pointer transition-all flex flex-col justify-between overflow-hidden shadow-lg ${
          isLight
            ? 'bg-gradient-to-br from-[#ebfae5] via-[#d7f5cc] to-[#bbf0aa] hover:from-[#e3f8dc] hover:to-[#aee999] shadow-lime-900/10'
            : 'bg-gradient-to-br from-[#0d2e1b]/90 via-[#092314]/85 to-[#061a0f]/90 backdrop-blur-xl hover:from-[#103620]/95 hover:to-[#082013]/95 shadow-black/10'
        }`}
      >
        <div className={`absolute -top-12 -right-12 w-36 h-36 rounded-full blur-2xl pointer-events-none ${
          isLight ? 'bg-lime-400/30' : 'bg-lime-400/10'
        }`} />

        <div className="flex items-center justify-between mb-3 gap-2 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
              isLight ? 'bg-lime-300/80 text-lime-950' : 'bg-lime-500/15 text-lime-400'
            }`}>
              <Wallet className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className={`text-xs font-black uppercase tracking-wider ${
              isLight ? 'text-lime-950' : 'text-lime-100/90'
            }`}>
              CASHBOX
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${
              isLight
                ? 'text-lime-950 bg-lime-300/90 shadow-2xs'
                : 'text-lime-300 bg-lime-500/15'
            }`}>
              Audit
            </span>
            <ArrowUpRight className={`w-4 h-4 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
              isLight ? 'text-lime-900 group-hover:text-black stroke-[2.5]' : 'text-lime-400/60 group-hover:text-lime-300'
            }`} />
          </div>
        </div>

        <div className="my-1 relative z-10">
          <p className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums truncate transition-colors drop-shadow-xs ${
            isLight ? 'text-lime-950' : 'text-white group-hover:text-lime-50'
          }`}>
            {formatPHP(cash_on_hand)}
          </p>
        </div>

        <p className={`text-xs font-bold truncate mt-2 transition-colors relative z-10 ${
          isLight ? 'text-lime-900/90' : 'text-lime-200/60 group-hover:text-lime-300'
        }`}>
          Physical Cash · Click to count
        </p>
      </div>

      {/* 2. E-Money / GCash — ACCENT: LIGHT SKY BLUE */}
      <div className={`group relative p-4.5 sm:p-5 rounded-3xl transition-all flex flex-col justify-between overflow-hidden shadow-lg ${
        isLight
          ? 'bg-gradient-to-br from-[#e0f3fe] via-[#bae6fd] to-[#90d6fc] hover:from-[#d5edfd] hover:to-[#7dcffc] shadow-sky-900/10'
          : 'bg-gradient-to-br from-[#082a3a]/90 via-[#06212e]/85 to-[#041722]/90 backdrop-blur-xl hover:from-[#0a3245]/95 hover:to-[#051c2a]/95 shadow-black/10'
      }`}>
        <div className={`absolute -top-12 -right-12 w-36 h-36 rounded-full blur-2xl pointer-events-none ${
          isLight ? 'bg-sky-400/30' : 'bg-sky-400/10'
        }`} />

        <div className="flex items-center justify-between mb-3 gap-2 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
              isLight ? 'bg-sky-300/80 text-sky-950' : 'bg-sky-500/15 text-sky-400'
            }`}>
              <Smartphone className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className={`text-xs font-black uppercase tracking-wider ${
              isLight ? 'text-sky-950' : 'text-sky-100/90'
            }`}>
              E-MONEY
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${
              isLight
                ? 'text-sky-950 bg-sky-300/90 shadow-2xs'
                : 'text-sky-300 bg-sky-500/15'
            }`}>
              GCash
            </span>
            <ArrowUpRight className={`w-4 h-4 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
              isLight ? 'text-sky-900 group-hover:text-black stroke-[2.5]' : 'text-sky-400/60 group-hover:text-sky-300'
            }`} />
          </div>
        </div>

        <div className="my-1 relative z-10">
          <p className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums truncate transition-colors drop-shadow-xs ${
            isLight ? 'text-sky-950' : 'text-white group-hover:text-sky-50'
          }`}>
            {formatPHP(gcash_balance)}
          </p>
        </div>

        <p className={`text-xs font-bold truncate mt-2 transition-colors relative z-10 ${
          isLight ? 'text-sky-900/90' : 'text-sky-200/60 group-hover:text-sky-300'
        }`}>
          Digital Wallet · Online dues &amp; events
        </p>
      </div>

      {/* 3. Monthly Net Cashflow — ACCENT: EMERALD INFLOW & ORANGE OUTFLOW */}
      <div className={`group relative p-4.5 sm:p-5 rounded-3xl transition-all flex flex-col justify-between overflow-hidden shadow-lg ${
        isLight
          ? 'bg-gradient-to-br from-[#d9f9e6] via-[#bbf2d2] to-[#99e8b9] hover:from-[#cdf6dd] hover:to-[#86e2ab] shadow-emerald-900/10'
          : 'bg-gradient-to-br from-[#0a2e1d]/90 via-[#072417]/85 to-[#051b11]/90 backdrop-blur-xl hover:from-[#0d3623]/95 hover:to-[#072115]/95 shadow-black/10'
      }`}>
        <div className={`absolute -top-12 -right-12 w-36 h-36 rounded-full blur-2xl pointer-events-none ${
          isLight ? 'bg-emerald-400/30' : 'bg-emerald-400/10'
        }`} />

        <div className="flex items-center justify-between mb-3 gap-2 relative z-10">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
              isLight ? 'bg-emerald-300/80 text-emerald-950' : 'bg-emerald-500/15 text-emerald-400'
            }`}>
              <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className={`text-xs font-black truncate ${
              isLight ? 'text-emerald-950' : 'text-white/90'
            }`}>
              Net Cashflow
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 tabular-nums ${
              isLight
                ? 'text-emerald-950 bg-emerald-300/90 shadow-2xs'
                : 'text-emerald-300 bg-emerald-500/15'
            }`}>
              {netSign}{formatPHP(Math.abs(netCashflow))}
            </span>
            <ArrowUpRight className={`w-4 h-4 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
              isLight ? 'text-emerald-900 group-hover:text-black stroke-[2.5]' : 'text-emerald-400/60 group-hover:text-emerald-300'
            }`} />
          </div>
        </div>

        {/* Side-by-side: Inflow (Emerald) vs Outflow (ORANGE ACCENT) */}
        <div className="grid grid-cols-2 gap-2 my-1 relative z-10">
          {/* Inflow Sub-Card */}
          <div className={`p-2.5 rounded-xl transition-colors shadow-2xs ${
            isLight
              ? 'bg-gradient-to-br from-white/95 to-[#c9f6d7]'
              : 'bg-gradient-to-br from-[#072215] to-[#04160e]'
          }`}>
            <div className="flex items-center gap-1 mb-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-emerald-700' : 'bg-emerald-400'}`} />
              <span className={`text-[10px] font-black uppercase tracking-wider ${
                isLight ? 'text-emerald-950' : 'text-emerald-400'
              }`}>Inflow</span>
            </div>
            <p className={`text-sm sm:text-base font-black tabular-nums truncate mt-0.5 ${
              isLight ? 'text-emerald-950' : 'text-white'
            }`}>
              {formatPHP(total_inflows)}
            </p>
            <span className={`text-[9px] block truncate mt-0.5 font-bold ${
              isLight ? 'text-emerald-900/80' : 'text-emerald-200/50'
            }`}>
              Sales, dues
            </span>
          </div>

          {/* Outflow Sub-Card (ORANGE) */}
          <div className={`p-2.5 rounded-xl transition-colors shadow-2xs ${
            isLight
              ? 'bg-gradient-to-br from-white/95 to-[#fed8b8]'
              : 'bg-gradient-to-br from-[#221308] to-[#150a04]'
          }`}>
            <div className="flex items-center gap-1 mb-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-orange-600' : 'bg-orange-400'}`} />
              <span className={`text-[10px] font-black uppercase tracking-wider ${
                isLight ? 'text-orange-950' : 'text-orange-400'
              }`}>Outflow</span>
            </div>
            <p className={`text-sm sm:text-base font-black tabular-nums truncate mt-0.5 ${
              isLight ? 'text-orange-950' : 'text-orange-100'
            }`}>
              {formatPHP(total_outflows)}
            </p>
            <span className={`text-[9px] block truncate mt-0.5 font-bold ${
              isLight ? 'text-orange-900/80' : 'text-orange-200/50'
            }`}>
              Supplies, tokens
            </span>
          </div>
        </div>

        {/* Dual Progress / Retention Bar */}
        <div className="mt-3 relative z-10">
          <div className={`w-full h-1.5 rounded-full overflow-hidden flex ${
            isLight ? 'bg-emerald-900/20' : 'bg-[#0a2216]'
          }`}>
            <div 
              className={`h-full rounded-full transition-all duration-500 ${isLight ? 'bg-emerald-700' : 'bg-emerald-400'}`} 
              style={{ width: `${liquidityPct}%` }} 
            />
            <div 
              className={`h-full rounded-full transition-all duration-500 ${isLight ? 'bg-orange-600' : 'bg-orange-500'}`} 
              style={{ width: `${100 - liquidityPct}%` }} 
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold mt-1.5">
            <span className={isLight ? 'text-emerald-950' : 'text-emerald-300/80'}>{liquidityPct}% Liquidity</span>
            <span className={isLight ? 'text-orange-950' : 'text-orange-300/80'}>Coverage {coverageRatio}</span>
          </div>
        </div>
      </div>

      {/* 4. ADVANCES / Abono — ACCENT: WARM YELLOW */}
      <div className={`group relative p-4.5 sm:p-5 rounded-3xl transition-all flex flex-col justify-between overflow-hidden shadow-lg ${
        isLight
          ? 'bg-gradient-to-br from-[#fff7d6] via-[#feecaa] to-[#fde078] hover:from-[#fef3c7] hover:to-[#fcd34d] shadow-amber-900/10'
          : 'bg-gradient-to-br from-[#2a240a]/90 via-[#211c07]/85 to-[#161304]/90 backdrop-blur-xl hover:from-[#332b0c]/95 hover:to-[#1b1705]/95 shadow-black/10'
      }`}>
        <div className={`absolute -top-12 -right-12 w-36 h-36 rounded-full blur-2xl pointer-events-none ${
          isLight ? 'bg-amber-400/30' : 'bg-yellow-400/10'
        }`} />

        <div className="flex items-center justify-between mb-3 gap-2 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
              isLight ? 'bg-amber-300/80 text-amber-950' : 'bg-yellow-500/15 text-yellow-400'
            }`}>
              <Clock className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className={`text-xs font-black uppercase tracking-wider ${
              isLight ? 'text-amber-950' : 'text-yellow-100/90'
            }`}>
              ADVANCES
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${
              isLight
                ? 'text-amber-950 bg-amber-300/90 shadow-2xs'
                : 'text-yellow-300 bg-yellow-500/15'
            }`}>
              Pending
            </span>
            <ArrowUpRight className={`w-4 h-4 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
              isLight ? 'text-amber-900 group-hover:text-black stroke-[2.5]' : 'text-yellow-400/60 group-hover:text-yellow-300'
            }`} />
          </div>
        </div>

        <div className="my-1 relative z-10">
          <p className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums truncate transition-colors drop-shadow-xs ${
            isLight ? 'text-amber-950' : 'text-white group-hover:text-yellow-50'
          }`}>
            {formatPHP(pending_reimbursements)}
          </p>
        </div>

        <p className={`text-xs font-bold truncate mt-2 transition-colors relative z-10 ${
          isLight ? 'text-amber-900/90' : 'text-yellow-200/60 group-hover:text-yellow-300'
        }`}>
          Pending Abono · Adviser &amp; officer advances
        </p>
      </div>

    </div>
  );
}
