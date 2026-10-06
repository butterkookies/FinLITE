'use client';
import { ArrowDownRight, ArrowUpRight, Clock, Smartphone, Wallet } from 'lucide-react';
import { formatPHP } from '@/lib/utils/currency';
import BorderGlow from '@/components/ui/BorderGlow';

export default function StatCards({ summary, onOpenDenominations }) {
  const {
    cash_on_hand = 0,
    gcash_balance = 0,
    total_inflows = 0,
    total_outflows = 0,
    pending_reimbursements = 0,
  } = summary;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3.5 mb-5 sm:mb-6">

      {/* 1. Physical Cash Box */}
      <BorderGlow
        className="lg:col-span-1"
        backgroundColor="#ffffff"
        borderRadius={16}
        glowRadius={36}
        glowColor="152 70 50"
        colors={['#10b981', '#34d399', '#6ee7b7']}
        glowIntensity={0.9}
        fillOpacity={0.25}
        edgeSensitivity={20}
      >
        <div
          onClick={onOpenDenominations}
          className="group relative p-4 sm:p-4.5 rounded-2xl cursor-pointer transition-all bg-white shadow-xs hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-2.5 gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4 text-emerald-700" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md shrink-0">
              Cashbox
            </span>
          </div>
          <p className="text-2xl sm:text-2xl font-black text-gray-950 tracking-tight tabular-nums truncate mb-1">
            {formatPHP(cash_on_hand)}
          </p>
          <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1 group-hover:text-emerald-700 transition-colors truncate">
            <span className="truncate font-semibold text-gray-700">Physical Cash</span>
            <span className="text-gray-300 mx-0.5">·</span>
            <span className="truncate text-gray-400 group-hover:text-emerald-700">Click to count</span>
          </p>
        </div>
      </BorderGlow>

      {/* 2. GCash Account */}
      <BorderGlow
        backgroundColor="#ffffff"
        borderRadius={16}
        glowRadius={36}
        glowColor="217 80 50"
        colors={['#3b82f6', '#60a5fa', '#93c5fd']}
        glowIntensity={0.9}
        fillOpacity={0.25}
        edgeSensitivity={20}
      >
        <div
          className="p-4 sm:p-4.5 rounded-2xl transition-all bg-white shadow-xs"
        >
          <div className="flex items-center justify-between mb-2.5 gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4 text-blue-700" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-md shrink-0">
              E-Money
            </span>
          </div>
          <p className="text-2xl sm:text-2xl font-black text-gray-950 tracking-tight tabular-nums truncate mb-1">
            {formatPHP(gcash_balance)}
          </p>
          <p className="text-[11px] text-gray-500 font-medium truncate">
            <span className="font-semibold text-gray-700">GCash Wallet</span> <span className="text-gray-300 mx-0.5">·</span> Tournaments &amp; online fees
          </p>
        </div>
      </BorderGlow>

      {/* 3. Total Inflows */}
      <BorderGlow
        backgroundColor="#ffffff"
        borderRadius={16}
        glowRadius={36}
        glowColor="152 70 50"
        colors={['#10b981', '#34d399', '#6ee7b7']}
        glowIntensity={0.9}
        fillOpacity={0.25}
        edgeSensitivity={20}
      >
        <div
          className="p-4 sm:p-4.5 rounded-2xl transition-all bg-white shadow-xs"
        >
          <div className="flex items-center justify-between mb-2.5 gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-4 h-4 text-emerald-700" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md shrink-0">
              Revenue
            </span>
          </div>
          <p className="text-2xl sm:text-2xl font-black text-emerald-700 tracking-tight tabular-nums truncate mb-1">
            {formatPHP(total_inflows)}
          </p>
          <p className="text-[11px] text-gray-500 font-medium truncate">
            <span className="font-semibold text-gray-700">Total Inflows</span> <span className="text-gray-300 mx-0.5">·</span> Sales, entries, dues
          </p>
        </div>
      </BorderGlow>

      {/* 4. Total Outflows */}
      <BorderGlow
        backgroundColor="#ffffff"
        borderRadius={16}
        glowRadius={36}
        glowColor="38 85 50"
        colors={['#f59e0b', '#fbbf24', '#fcd34d']}
        glowIntensity={0.9}
        fillOpacity={0.25}
        edgeSensitivity={20}
      >
        <div
          className="p-4 sm:p-4.5 rounded-2xl transition-all bg-white shadow-xs"
        >
          <div className="flex items-center justify-between mb-2.5 gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-4 h-4 text-amber-700" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md shrink-0">
              Disbursed
            </span>
          </div>
          <p className="text-2xl sm:text-2xl font-black text-gray-900 tracking-tight tabular-nums truncate mb-1">
            {formatPHP(total_outflows)}
          </p>
          <p className="text-[11px] text-gray-500 font-medium truncate">
            <span className="font-semibold text-gray-700">Total Outflows</span> <span className="text-gray-300 mx-0.5">·</span> Supplies, food, tokens
          </p>
        </div>
      </BorderGlow>

      {/* 5. Pending Reimbursements */}
      <BorderGlow
        className="lg:col-span-1"
        backgroundColor="#ffffff"
        borderRadius={16}
        glowRadius={36}
        glowColor="38 85 50"
        colors={['#f59e0b', '#fbbf24', '#fcd34d']}
        glowIntensity={0.9}
        fillOpacity={0.25}
        edgeSensitivity={20}
      >
        <div
          className="p-4 sm:p-4.5 rounded-2xl transition-all bg-white shadow-xs"
        >
          <div className="flex items-center justify-between mb-2.5 gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-amber-700" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md shrink-0">
              Advances
            </span>
          </div>
          <p className="text-2xl sm:text-2xl font-black text-amber-700 tracking-tight tabular-nums truncate mb-1">
            {formatPHP(pending_reimbursements)}
          </p>
          <p className="text-[11px] text-gray-500 font-medium truncate">
            <span className="font-semibold text-gray-700">Pending Abono</span> <span className="text-gray-300 mx-0.5">·</span> Adviser &amp; officer advances
          </p>
        </div>
      </BorderGlow>

    </div>
  );
}
