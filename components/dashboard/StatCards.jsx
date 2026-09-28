'use client';
import { ArrowDownRight, ArrowUpRight, Clock, Smartphone, Wallet } from 'lucide-react';
import { formatPHP } from '@/lib/utils/currency';

export default function StatCards({ summary, onOpenDenominations }) {
  const {
    cash_on_hand = 0,
    gcash_balance = 0,
    total_inflows = 0,
    total_outflows = 0,
    pending_reimbursements = 0,
  } = summary;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3.5 mb-5 sm:mb-6">
      
      {/* 1. Physical Cash Box (spans full width on mobile for rapid cashier access) */}
      <div 
        onClick={onOpenDenominations}
        className="col-span-2 sm:col-span-1 group relative bg-white p-3.5 sm:p-4 rounded-2xl border border-black/[0.06] shadow-xs hover:border-emerald-200 hover:shadow-sm cursor-pointer transition-all"
      >
        <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1">
          <span className="flex items-center gap-1.5 font-semibold text-gray-700">
            <Wallet className="w-3.5 h-3.5 text-emerald-700" />
            Physical Cash
          </span>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.5 rounded">
            Cashbox
          </span>
        </div>
        <p className="text-xl sm:text-xl font-bold text-gray-950 tracking-tight">
          {formatPHP(cash_on_hand)}
        </p>
        <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 sm:mt-1 flex items-center gap-1 group-hover:text-emerald-700 transition-colors">
          Click to count denominations →
        </p>
      </div>

      {/* 2. GCash Account */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-black/[0.06] shadow-xs">
        <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1">
          <span className="flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">GCash Wallet</span>
          </span>
          <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-1.5 py-0.5 rounded shrink-0">
            E-Money
          </span>
        </div>
        <p className="text-lg sm:text-xl font-bold text-gray-950 tracking-tight">
          {formatPHP(gcash_balance)}
        </p>
        <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 sm:mt-1 truncate">
          Tournaments & online fees
        </p>
      </div>

      {/* 3. Total Inflows */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-black/[0.06] shadow-xs">
        <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1">
          <span className="flex items-center gap-1.5">
            <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Total Inflows</span>
          </span>
          <span className="text-[10px] bg-gray-100 text-gray-600 font-semibold px-1.5 py-0.5 rounded shrink-0">
            Revenue
          </span>
        </div>
        <p className="text-lg sm:text-xl font-bold text-emerald-700 tracking-tight">
          {formatPHP(total_inflows)}
        </p>
        <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 sm:mt-1 truncate">
          Sales, entries, dues
        </p>
      </div>

      {/* 4. Total Outflows */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-black/[0.06] shadow-xs">
        <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1">
          <span className="flex items-center gap-1.5">
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate">Total Outflows</span>
          </span>
          <span className="text-[10px] bg-gray-100 text-gray-600 font-semibold px-1.5 py-0.5 rounded shrink-0">
            Disbursed
          </span>
        </div>
        <p className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
          {formatPHP(total_outflows)}
        </p>
        <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 sm:mt-1 truncate">
          Supplies, food, tokens
        </p>
      </div>

      {/* 5. Pending Reimbursements */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-black/[0.06] shadow-xs col-span-2 sm:col-span-1">
        <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">Pending Abono</span>
          </span>
          <span className="text-[10px] bg-amber-50 text-amber-700 font-semibold px-1.5 py-0.5 rounded shrink-0">
            Advances
          </span>
        </div>
        <p className="text-lg sm:text-xl font-bold text-amber-700 tracking-tight">
          {formatPHP(pending_reimbursements)}
        </p>
        <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 sm:mt-1 truncate">
          Adviser & officer advances
        </p>
      </div>

    </div>
  );
}
