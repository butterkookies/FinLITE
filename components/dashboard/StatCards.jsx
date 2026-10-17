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
      {/* Mobile Swipe Cue (< sm) */}
      <div className="flex sm:hidden items-center justify-between px-1 mb-2">
        <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
          Financial Snapshot (6 Core Accounts)
        </span>
        <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
          Swipe cards ↔
        </span>
      </div>

      {/* Responsive Grid:
          - Mobile (< sm): horizontal swipe carousel
          - Tablet/Laptop (sm to xl): 2 to 3 columns so cards never get squished when sidebar is open
          - Ultra-wide (2xl): 6 columns in a single row
      */}
      <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3 sm:gap-3.5 overflow-x-auto sm:overflow-visible snap-x snap-mandatory scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0 pb-2 sm:pb-0">

        {/* 1. Physical Cash Box */}
        <Card
          onClick={onOpenDenominations}
          role="button"
          tabIndex={0}
          className="shrink-0 w-[82vw] max-w-[280px] sm:w-auto snap-center group relative p-3.5 sm:p-4 cursor-pointer flex flex-col justify-between overflow-hidden bg-emerald-600 dark:bg-emerald-700 text-white dark:text-white border-emerald-500/80 dark:border-emerald-600 shadow-sm hover:bg-emerald-700 dark:hover:bg-emerald-800 active:scale-[0.99] transition-all"
        >
          {/* Header with wrapping resilience */}
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1.5 relative z-10">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/20 text-white backdrop-blur-xs">
                <Wallet className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white whitespace-nowrap">
                Cashbox
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              <Badge className="bg-white/20 text-white border-white/20 backdrop-blur-xs font-semibold whitespace-nowrap text-[9.5px] px-1.5 py-0.5 leading-none" size="xs">
                {cashboxVarianceBadge || 'Physical'}
              </Badge>
              <ArrowUpRight className="w-3.5 h-3.5 text-white/80 shrink-0 group-hover:text-white transition-colors" />
            </div>
          </div>

          <div className="my-1 relative z-10">
            <p className="text-base sm:text-lg xl:text-xl font-extrabold tracking-tight tabular-nums text-white">
              {formatPHP(cash_on_hand)}
            </p>
          </div>

          <div className="text-[10.5px] sm:text-[11px] font-medium mt-1.5 relative z-10 flex items-start gap-1.5 text-emerald-100/90 dark:text-emerald-100/90 min-h-[30px]">
            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 mt-1" />
            <span className="line-clamp-2 leading-snug">{cashboxSubtext}</span>
          </div>
        </Card>

        {/* 2. True Net Position (Cash on Hand − Pending Abono) */}
        <Card className="shrink-0 w-[82vw] max-w-[280px] sm:w-auto snap-center group relative p-3.5 sm:p-4 flex flex-col justify-between overflow-hidden bg-indigo-600 dark:bg-indigo-700 text-white dark:text-white border-indigo-500/80 dark:border-indigo-600 shadow-sm hover:bg-indigo-700 dark:hover:bg-indigo-800 transition-all">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1.5 relative z-10">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/20 text-white backdrop-blur-xs">
                <Scale className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white whitespace-nowrap">
                Net Position
              </span>
            </div>
            <div className="shrink-0 ml-auto">
              <Badge className="bg-white/20 text-white border-white/20 backdrop-blur-xs font-semibold whitespace-nowrap text-[9.5px] px-1.5 py-0.5 leading-none" size="xs">
                Liquid
              </Badge>
            </div>
          </div>

          <div className="my-1 relative z-10">
            <p className="text-base sm:text-lg xl:text-xl font-extrabold tracking-tight tabular-nums text-white">
              {formatPHP(netPosition)}
            </p>
          </div>

          <div className="text-[10.5px] sm:text-[11px] font-medium mt-1.5 relative z-10 flex items-start gap-1.5 text-indigo-100/90 dark:text-indigo-100/90 min-h-[30px]">
            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 mt-1" />
            <span className="line-clamp-2 leading-snug">Cash on hand minus pending abono</span>
          </div>
        </Card>

        {/* 3. Uncollected Debts (Receivables) */}
        <Card 
          onClick={onOpenDebts}
          role="button"
          tabIndex={0}
          className="shrink-0 w-[82vw] max-w-[280px] sm:w-auto snap-center group relative p-3.5 sm:p-4 cursor-pointer flex flex-col justify-between overflow-hidden bg-rose-600 dark:bg-rose-700 text-white dark:text-white border-rose-500/80 dark:border-rose-600 shadow-sm hover:bg-rose-700 dark:hover:bg-rose-800 active:scale-[0.99] transition-all"
        >
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1.5 relative z-10">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/20 text-white backdrop-blur-xs">
                <CreditCard className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white whitespace-nowrap">
                Receivables
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              <Badge className="bg-white/20 text-white border-white/20 backdrop-blur-xs font-semibold whitespace-nowrap text-[9.5px] px-1.5 py-0.5 leading-none" size="xs">
                Debts
              </Badge>
              <ChevronRight className="w-3.5 h-3.5 text-white/80 shrink-0 group-hover:text-white transition-colors" />
            </div>
          </div>

          <div className="my-1 relative z-10">
            <p className="text-base sm:text-lg xl:text-xl font-extrabold tracking-tight tabular-nums text-white">
              {formatPHP(uncollected_debts)}
            </p>
          </div>

          <div className="text-[10.5px] sm:text-[11px] font-medium mt-1.5 relative z-10 flex items-start gap-1.5 text-rose-100/90 dark:text-rose-100/90 min-h-[30px]">
            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 mt-1" />
            <span className="line-clamp-2 leading-snug">Tap to collect dues &amp; debts</span>
          </div>
        </Card>

        {/* 4. Total Inflows */}
        <Card className="shrink-0 w-[82vw] max-w-[280px] sm:w-auto snap-center group relative p-3.5 sm:p-4 flex flex-col justify-between overflow-hidden bg-teal-600 dark:bg-teal-700 text-white dark:text-white border-teal-500/80 dark:border-teal-600 shadow-sm hover:bg-teal-700 dark:hover:bg-teal-800 transition-all">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1.5 relative z-10">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/20 text-white backdrop-blur-xs">
                <ArrowDownRight className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white whitespace-nowrap">
                Total Inflow
              </span>
            </div>
            <div className="shrink-0 ml-auto">
              <Badge className="bg-white/20 text-white border-white/20 backdrop-blur-xs font-semibold whitespace-nowrap text-[9.5px] px-1.5 py-0.5 leading-none" size="xs">
                Collections
              </Badge>
            </div>
          </div>

          <div className="my-1 relative z-10">
            <p className="text-base sm:text-lg xl:text-xl font-extrabold tracking-tight tabular-nums text-white">
              +{formatPHP(total_inflows)}
            </p>
          </div>

          <div className="text-[10.5px] sm:text-[11px] font-medium mt-1.5 relative z-10 flex items-start gap-1.5 text-teal-100/90 dark:text-teal-100/90 min-h-[30px]">
            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 mt-1" />
            <span className="line-clamp-2 leading-snug">Cumulative term collections</span>
          </div>
        </Card>

        {/* 5. Total Outflows */}
        <Card className="shrink-0 w-[82vw] max-w-[280px] sm:w-auto snap-center group relative p-3.5 sm:p-4 flex flex-col justify-between overflow-hidden bg-orange-600 dark:bg-orange-700 text-white dark:text-white border-orange-500/80 dark:border-orange-600 shadow-sm hover:bg-orange-700 dark:hover:bg-orange-800 transition-all">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1.5 relative z-10">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/20 text-white backdrop-blur-xs">
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white whitespace-nowrap">
                Total Outflow
              </span>
            </div>
            <div className="shrink-0 ml-auto">
              <Badge className="bg-white/20 text-white border-white/20 backdrop-blur-xs font-semibold whitespace-nowrap text-[9.5px] px-1.5 py-0.5 leading-none" size="xs">
                Disbursed
              </Badge>
            </div>
          </div>

          <div className="my-1 relative z-10">
            <p className="text-base sm:text-lg xl:text-xl font-extrabold tracking-tight tabular-nums text-white">
              -{formatPHP(total_outflows)}
            </p>
          </div>

          <div className="text-[10.5px] sm:text-[11px] font-medium mt-1.5 relative z-10 flex items-start gap-1.5 text-orange-100/90 dark:text-orange-100/90 min-h-[30px]">
            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 mt-1" />
            <span className="line-clamp-2 leading-snug">Activities &amp; expenses</span>
          </div>
        </Card>

        {/* 6. Advances / Pending Abono */}
        <Card 
          onClick={onOpenAdvances}
          role="button"
          tabIndex={0}
          className="shrink-0 w-[82vw] max-w-[280px] sm:w-auto snap-center group relative p-3.5 sm:p-4 cursor-pointer flex flex-col justify-between overflow-hidden bg-amber-600 dark:bg-amber-700 text-white dark:text-white border-amber-500/80 dark:border-amber-600 shadow-sm hover:bg-amber-700 dark:hover:bg-amber-800 active:scale-[0.99] transition-all"
        >
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1.5 relative z-10">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/20 text-white backdrop-blur-xs">
                <Clock className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white whitespace-nowrap">
                Advances
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              <Badge className="bg-white/20 text-white border-white/20 backdrop-blur-xs font-semibold whitespace-nowrap text-[9.5px] px-1.5 py-0.5 leading-none" size="xs">
                Pending Abono
              </Badge>
              <ChevronRight className="w-3.5 h-3.5 text-white/80 shrink-0 group-hover:text-white transition-colors" />
            </div>
          </div>

          <div className="my-1 relative z-10">
            <p className="text-base sm:text-lg xl:text-xl font-extrabold tracking-tight tabular-nums text-white">
              {formatPHP(pending_reimbursements)}
            </p>
          </div>

          <div className="text-[10.5px] sm:text-[11px] font-medium mt-1.5 relative z-10 flex items-start gap-1.5 text-amber-100/90 dark:text-amber-100/90 min-h-[30px]">
            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 mt-1" />
            <span className="line-clamp-2 leading-snug">Tap to view creditors &amp; refund</span>
          </div>
        </Card>

      </div>
    </div>
  );
}
