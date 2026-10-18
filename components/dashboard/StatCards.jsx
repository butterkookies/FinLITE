'use client';

import React from 'react';
import { Clock, Wallet, ArrowDownRight, ArrowUpRight, CreditCard, ChevronRight, Scale } from 'lucide-react';
import { formatPHP } from '@/lib/utils/currency';
import { Card, Badge } from '@/components/ui';

export default function StatCards({ 
  summary = {}, 
  latestReconciliation = null,
  onOpenDenominations,
  onOpenAdvances,
  onOpenDebts 
}) {
  const {
    cash_on_hand = 0,
    total_inflows = 0,
    total_outflows = 0,
    pending_reimbursements = 0,
    uncollected_debts = 0,
    net_position: explicitNetPosition,
  } = summary;

  // True Net Position: Cash on Hand minus active Accounts Payable liabilities (Pending Abono)
  const netPosition = typeof explicitNetPosition === 'number'
    ? explicitNetPosition 
    : (Number(cash_on_hand || 0) - Number(pending_reimbursements || 0));

  // Build Cashbox variance / count status subtext
  let cashboxSubtext = 'Tap to count physical cash';
  let cashboxVarianceBadge = null;
  if (latestReconciliation) {
    const disc = Number(latestReconciliation.discrepancy || 0);
    if (disc === 0) {
      cashboxSubtext = 'Counted · Balanced (₱0.00)';
    } else if (disc < 0) {
      cashboxSubtext = `Counted · Shortage: ${formatPHP(disc)}`;
      cashboxVarianceBadge = `Short ${formatPHP(Math.abs(disc))}`;
    } else {
      cashboxSubtext = `Counted · Overage: +${formatPHP(disc)}`;
      cashboxVarianceBadge = `+${formatPHP(disc)}`;
    }
  }

  return (
    <div className="relative mb-5 sm:mb-6">
      {/* 6 Core Accounts in Exactly ONE SINGLE ROW on Desktop (lg+), adapting smoothly on mobile/tablet */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 w-full">

        {/* 1. Physical Cash Box */}
        <Card
          onClick={onOpenDenominations}
          role="button"
          tabIndex={0}
          className="group relative p-3 sm:p-3.5 cursor-pointer flex flex-col justify-between overflow-hidden bg-emerald-600 dark:bg-emerald-700 text-white border-emerald-500/80 dark:border-emerald-600 shadow-xs hover:bg-emerald-700 dark:hover:bg-emerald-800 active:scale-[0.99] transition-all rounded-xl sm:rounded-2xl min-h-[110px] sm:min-h-[118px]"
        >
          <div className="flex items-center justify-between gap-1 mb-1 relative z-10">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-white/20 text-white backdrop-blur-xs">
                <Wallet className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-white truncate">
                Cashbox
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              <Badge className="bg-white/20 text-white border-white/20 backdrop-blur-xs font-semibold whitespace-nowrap text-[9px] px-1.5 py-0.5 leading-none" size="xs">
                {cashboxVarianceBadge || 'Physical'}
              </Badge>
              <ArrowUpRight className="w-3 h-3 text-white/80 shrink-0 group-hover:text-white transition-colors" />
            </div>
          </div>

          <div className="my-0.5 relative z-10 min-w-0">
            <p className="text-sm sm:text-base xl:text-lg font-black tracking-tight tabular-nums text-white truncate" title={formatPHP(cash_on_hand)}>
              {formatPHP(cash_on_hand)}
            </p>
          </div>

          <div className="text-[10px] sm:text-[10.5px] font-medium mt-1 relative z-10 flex items-center gap-1 text-emerald-100/90 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
            <span className="truncate">{cashboxSubtext}</span>
          </div>
        </Card>

        {/* 2. True Net Position (Cash on Hand − Pending Abono) */}
        <Card className="group relative p-3 sm:p-3.5 flex flex-col justify-between overflow-hidden bg-indigo-600 dark:bg-indigo-700 text-white border-indigo-500/80 dark:border-indigo-600 shadow-xs hover:bg-indigo-700 dark:hover:bg-indigo-800 transition-all rounded-xl sm:rounded-2xl min-h-[110px] sm:min-h-[118px]">
          <div className="flex items-center justify-between gap-1 mb-1 relative z-10">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-white/20 text-white backdrop-blur-xs">
                <Scale className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-white truncate">
                Net Position
              </span>
            </div>
            <div className="shrink-0 ml-auto">
              <Badge className="bg-white/20 text-white border-white/20 backdrop-blur-xs font-semibold whitespace-nowrap text-[9px] px-1.5 py-0.5 leading-none" size="xs">
                Liquid
              </Badge>
            </div>
          </div>

          <div className="my-0.5 relative z-10 min-w-0">
            <p className="text-sm sm:text-base xl:text-lg font-black tracking-tight tabular-nums text-white truncate" title={formatPHP(netPosition)}>
              {formatPHP(netPosition)}
            </p>
          </div>

          <div className="text-[10px] sm:text-[10.5px] font-medium mt-1 relative z-10 flex items-center gap-1 text-indigo-100/90 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
            <span className="truncate">Cash minus abono</span>
          </div>
        </Card>

        {/* 3. Uncollected Debts (Receivables) */}
        <Card 
          onClick={onOpenDebts}
          role="button"
          tabIndex={0}
          className="group relative p-3 sm:p-3.5 cursor-pointer flex flex-col justify-between overflow-hidden bg-rose-600 dark:bg-rose-700 text-white border-rose-500/80 dark:border-rose-600 shadow-xs hover:bg-rose-700 dark:hover:bg-rose-800 active:scale-[0.99] transition-all rounded-xl sm:rounded-2xl min-h-[110px] sm:min-h-[118px]"
        >
          <div className="flex items-center justify-between gap-1 mb-1 relative z-10">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-white/20 text-white backdrop-blur-xs">
                <CreditCard className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-white truncate">
                Receivables
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              <Badge className="bg-white/20 text-white border-white/20 backdrop-blur-xs font-semibold whitespace-nowrap text-[9px] px-1.5 py-0.5 leading-none" size="xs">
                Debts
              </Badge>
              <ChevronRight className="w-3 h-3 text-white/80 shrink-0 group-hover:text-white transition-colors" />
            </div>
          </div>

          <div className="my-0.5 relative z-10 min-w-0">
            <p className="text-sm sm:text-base xl:text-lg font-black tracking-tight tabular-nums text-white truncate" title={formatPHP(uncollected_debts)}>
              {formatPHP(uncollected_debts)}
            </p>
          </div>

          <div className="text-[10px] sm:text-[10.5px] font-medium mt-1 relative z-10 flex items-center gap-1 text-rose-100/90 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
            <span className="truncate">Collect dues &amp; debts</span>
          </div>
        </Card>

        {/* 4. Total Inflows */}
        <Card className="group relative p-3 sm:p-3.5 flex flex-col justify-between overflow-hidden bg-teal-600 dark:bg-teal-700 text-white border-teal-500/80 dark:border-teal-600 shadow-xs hover:bg-teal-700 dark:hover:bg-teal-800 transition-all rounded-xl sm:rounded-2xl min-h-[110px] sm:min-h-[118px]">
          <div className="flex items-center justify-between gap-1 mb-1 relative z-10">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-white/20 text-white backdrop-blur-xs">
                <ArrowDownRight className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-white truncate">
                Total Inflow
              </span>
            </div>
            <div className="shrink-0 ml-auto">
              <Badge className="bg-white/20 text-white border-white/20 backdrop-blur-xs font-semibold whitespace-nowrap text-[9px] px-1.5 py-0.5 leading-none" size="xs">
                Collections
              </Badge>
            </div>
          </div>

          <div className="my-0.5 relative z-10 min-w-0">
            <p className="text-sm sm:text-base xl:text-lg font-black tracking-tight tabular-nums text-white truncate" title={`+${formatPHP(total_inflows)}`}>
              +{formatPHP(total_inflows)}
            </p>
          </div>

          <div className="text-[10px] sm:text-[10.5px] font-medium mt-1 relative z-10 flex items-center gap-1 text-teal-100/90 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
            <span className="truncate">Cumulative collections</span>
          </div>
        </Card>

        {/* 5. Total Outflows */}
        <Card className="group relative p-3 sm:p-3.5 flex flex-col justify-between overflow-hidden bg-orange-600 dark:bg-orange-700 text-white border-orange-500/80 dark:border-orange-600 shadow-xs hover:bg-orange-700 dark:hover:bg-orange-800 transition-all rounded-xl sm:rounded-2xl min-h-[110px] sm:min-h-[118px]">
          <div className="flex items-center justify-between gap-1 mb-1 relative z-10">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-white/20 text-white backdrop-blur-xs">
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-white truncate">
                Total Outflow
              </span>
            </div>
            <div className="shrink-0 ml-auto">
              <Badge className="bg-white/20 text-white border-white/20 backdrop-blur-xs font-semibold whitespace-nowrap text-[9px] px-1.5 py-0.5 leading-none" size="xs">
                Disbursed
              </Badge>
            </div>
          </div>

          <div className="my-0.5 relative z-10 min-w-0">
            <p className="text-sm sm:text-base xl:text-lg font-black tracking-tight tabular-nums text-white truncate" title={`-${formatPHP(total_outflows)}`}>
              -{formatPHP(total_outflows)}
            </p>
          </div>

          <div className="text-[10px] sm:text-[10.5px] font-medium mt-1 relative z-10 flex items-center gap-1 text-orange-100/90 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
            <span className="truncate">Activities &amp; expenses</span>
          </div>
        </Card>

        {/* 6. Advances / Pending Abono */}
        <Card 
          onClick={onOpenAdvances}
          role="button"
          tabIndex={0}
          className="group relative p-3 sm:p-3.5 cursor-pointer flex flex-col justify-between overflow-hidden bg-amber-600 dark:bg-amber-700 text-white border-amber-500/80 dark:border-amber-600 shadow-xs hover:bg-amber-700 dark:hover:bg-amber-800 active:scale-[0.99] transition-all rounded-xl sm:rounded-2xl min-h-[110px] sm:min-h-[118px]"
        >
          <div className="flex items-center justify-between gap-1 mb-1 relative z-10">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-white/20 text-white backdrop-blur-xs">
                <Clock className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-white truncate">
                Advances
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              <Badge className="bg-white/20 text-white border-white/20 backdrop-blur-xs font-semibold whitespace-nowrap text-[9px] px-1.5 py-0.5 leading-none" size="xs">
                Abono
              </Badge>
              <ChevronRight className="w-3 h-3 text-white/80 shrink-0 group-hover:text-white transition-colors" />
            </div>
          </div>

          <div className="my-0.5 relative z-10 min-w-0">
            <p className="text-sm sm:text-base xl:text-lg font-black tracking-tight tabular-nums text-white truncate" title={formatPHP(pending_reimbursements)}>
              {formatPHP(pending_reimbursements)}
            </p>
          </div>

          <div className="text-[10px] sm:text-[10.5px] font-medium mt-1 relative z-10 flex items-center gap-1 text-amber-100/90 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
            <span className="truncate">View creditors &amp; refund</span>
          </div>
        </Card>

      </div>
    </div>
  );
}
