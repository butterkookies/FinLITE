'use client';

import React from 'react';
import { Clock, Smartphone, Wallet, ArrowDownRight, ArrowUpRight, CreditCard, ChevronRight } from 'lucide-react';
import { formatPHP } from '@/lib/utils/currency';
import { Card, Badge } from '@/components/ui';

export default function StatCards({ 
  summary = {}, 
  onOpenDenominations,
  onOpenAdvances,
  onOpenDebts 
}) {
  const {
    cash_on_hand = 0,
    gcash_balance = 0,
    total_inflows = 0,
    total_outflows = 0,
    pending_reimbursements = 0,
    uncollected_debts = 0,
  } = summary;

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

      {/* Snap Carousel on mobile (< sm), Responsive 2x3 Grid on tablet/laptop, Sleek Single-Row on Widescreen (>= xl) */}
      <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-3.5 overflow-x-auto sm:overflow-visible snap-x snap-mandatory scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0 pb-2 sm:pb-0">

        {/* 1. Physical Cash Box */}
        <Card
          onClick={onOpenDenominations}
          role="button"
          tabIndex={0}
          className="shrink-0 w-[82vw] max-w-[280px] sm:w-auto snap-center group relative p-3.5 sm:p-4 cursor-pointer flex flex-col justify-between overflow-hidden bg-emerald-600 dark:bg-emerald-700 text-white dark:text-white border-emerald-500/80 dark:border-emerald-600 shadow-sm hover:bg-emerald-700 dark:hover:bg-emerald-800 active:scale-[0.99] transition-all"
        >
          <div className="flex items-center justify-between mb-1.5 gap-1.5 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/20 text-white backdrop-blur-xs">
                <Wallet className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white">
                Cashbox
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Badge className="bg-white/20 text-white border-white/20 backdrop-blur-xs font-semibold" size="xs">
                Physical
              </Badge>
              <ArrowUpRight className="w-3.5 h-3.5 text-white/80 group-hover:text-white transition-colors" />
            </div>
          </div>

          <div className="my-0.5 relative z-10">
            <p className="text-lg sm:text-xl font-extrabold tracking-tight tabular-nums truncate text-white">
              {formatPHP(cash_on_hand)}
            </p>
          </div>

          <p className="text-[10.5px] sm:text-[11px] font-medium truncate mt-1.5 relative z-10 flex items-center gap-1.5 text-emerald-100/90 dark:text-emerald-100/90">
            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
            <span className="truncate">Tap to count physical cash</span>
          </p>
        </Card>

        {/* 2. E-Money / GCash */}
        <Card className="shrink-0 w-[82vw] max-w-[280px] sm:w-auto snap-center group relative p-3.5 sm:p-4 flex flex-col justify-between overflow-hidden bg-sky-600 dark:bg-sky-700 text-white dark:text-white border-sky-500/80 dark:border-sky-600 shadow-sm hover:bg-sky-700 dark:hover:bg-sky-800 transition-all">
          <div className="flex items-center justify-between mb-1.5 gap-1.5 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/20 text-white backdrop-blur-xs">
                <Smartphone className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white">
                GCash Wallet
              </span>
            </div>
            <Badge className="bg-white/20 text-white border-white/20 backdrop-blur-xs font-semibold" size="xs">
              Electronic
            </Badge>
          </div>

          <div className="my-0.5 relative z-10">
            <p className="text-lg sm:text-xl font-extrabold tracking-tight tabular-nums truncate text-white">
              {formatPHP(gcash_balance)}
            </p>
          </div>

          <p className="text-[10.5px] sm:text-[11px] font-medium truncate mt-1.5 relative z-10 flex items-center gap-1.5 text-sky-100/90 dark:text-sky-100/90">
            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
            <span className="truncate">Online collections &amp; dues</span>
          </p>
        </Card>

        {/* 3. Uncollected Debts (Receivables) */}
        <Card 
          onClick={onOpenDebts}
          role="button"
          tabIndex={0}
          className="shrink-0 w-[82vw] max-w-[280px] sm:w-auto snap-center group relative p-3.5 sm:p-4 cursor-pointer flex flex-col justify-between overflow-hidden bg-rose-600 dark:bg-rose-700 text-white dark:text-white border-rose-500/80 dark:border-rose-600 shadow-sm hover:bg-rose-700 dark:hover:bg-rose-800 active:scale-[0.99] transition-all"
        >
          <div className="flex items-center justify-between mb-1.5 gap-1.5 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/20 text-white backdrop-blur-xs">
                <CreditCard className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white">
                Receivables
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Badge className="bg-white/20 text-white border-white/20 backdrop-blur-xs font-semibold" size="xs">
                Debts
              </Badge>
              <ChevronRight className="w-3.5 h-3.5 text-white/80 group-hover:text-white transition-colors" />
            </div>
          </div>

          <div className="my-0.5 relative z-10">
            <p className="text-lg sm:text-xl font-extrabold tracking-tight tabular-nums truncate text-white">
              {formatPHP(uncollected_debts)}
            </p>
          </div>

          <p className="text-[10.5px] sm:text-[11px] font-medium truncate mt-1.5 relative z-10 flex items-center gap-1.5 text-rose-100/90 dark:text-rose-100/90">
            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
            <span className="truncate">Tap to collect dues &amp; debts</span>
          </p>
        </Card>

        {/* 4. Total Inflows (Separate Card) */}
        <Card className="shrink-0 w-[82vw] max-w-[280px] sm:w-auto snap-center group relative p-3.5 sm:p-4 flex flex-col justify-between overflow-hidden bg-teal-600 dark:bg-teal-700 text-white dark:text-white border-teal-500/80 dark:border-teal-600 shadow-sm hover:bg-teal-700 dark:hover:bg-teal-800 transition-all">
          <div className="flex items-center justify-between mb-1.5 gap-1.5 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/20 text-white backdrop-blur-xs">
                <ArrowDownRight className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white">
                Total Inflow
              </span>
            </div>
            <Badge className="bg-white/20 text-white border-white/20 backdrop-blur-xs font-semibold" size="xs">
              Collections
            </Badge>
          </div>

          <div className="my-0.5 relative z-10">
            <p className="text-lg sm:text-xl font-extrabold tracking-tight tabular-nums truncate text-white">
              +{formatPHP(total_inflows)}
            </p>
          </div>

          <p className="text-[10.5px] sm:text-[11px] font-medium truncate mt-1.5 relative z-10 flex items-center gap-1.5 text-teal-100/90 dark:text-teal-100/90">
            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
            <span className="truncate">Cumulative term collections</span>
          </p>
        </Card>

        {/* 5. Total Outflows (Separate Card) */}
        <Card className="shrink-0 w-[82vw] max-w-[280px] sm:w-auto snap-center group relative p-3.5 sm:p-4 flex flex-col justify-between overflow-hidden bg-orange-600 dark:bg-orange-700 text-white dark:text-white border-orange-500/80 dark:border-orange-600 shadow-sm hover:bg-orange-700 dark:hover:bg-orange-800 transition-all">
          <div className="flex items-center justify-between mb-1.5 gap-1.5 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/20 text-white backdrop-blur-xs">
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white">
                Total Outflow
              </span>
            </div>
            <Badge className="bg-white/20 text-white border-white/20 backdrop-blur-xs font-semibold" size="xs">
              Disbursed
            </Badge>
          </div>

          <div className="my-0.5 relative z-10">
            <p className="text-lg sm:text-xl font-extrabold tracking-tight tabular-nums truncate text-white">
              -{formatPHP(total_outflows)}
            </p>
          </div>

          <p className="text-[10.5px] sm:text-[11px] font-medium truncate mt-1.5 relative z-10 flex items-center gap-1.5 text-orange-100/90 dark:text-orange-100/90">
            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
            <span className="truncate">Activities &amp; expenses</span>
          </p>
        </Card>

        {/* 6. Advances / Pending Abono */}
        <Card 
          onClick={onOpenAdvances}
          role="button"
          tabIndex={0}
          className="shrink-0 w-[82vw] max-w-[280px] sm:w-auto snap-center group relative p-3.5 sm:p-4 cursor-pointer flex flex-col justify-between overflow-hidden bg-amber-600 dark:bg-amber-700 text-white dark:text-white border-amber-500/80 dark:border-amber-600 shadow-sm hover:bg-amber-700 dark:hover:bg-amber-800 active:scale-[0.99] transition-all"
        >
          <div className="flex items-center justify-between mb-1.5 gap-1.5 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/20 text-white backdrop-blur-xs">
                <Clock className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white">
                Advances
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Badge className="bg-white/20 text-white border-white/20 backdrop-blur-xs font-semibold" size="xs">
                Pending Abono
              </Badge>
              <ChevronRight className="w-3.5 h-3.5 text-white/80 group-hover:text-white transition-colors" />
            </div>
          </div>

          <div className="my-0.5 relative z-10">
            <p className="text-lg sm:text-xl font-extrabold tracking-tight tabular-nums truncate text-white">
              {formatPHP(pending_reimbursements)}
            </p>
          </div>

          <p className="text-[10.5px] sm:text-[11px] font-medium truncate mt-1.5 relative z-10 flex items-center gap-1.5 text-amber-100/90 dark:text-amber-100/90">
            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
            <span className="truncate">Tap to view creditors &amp; refund</span>
          </p>
        </Card>

      </div>
    </div>
  );
}
