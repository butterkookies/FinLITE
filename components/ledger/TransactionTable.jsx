'use client';
import { useState } from 'react';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  Clock, 
  Download, 
  Filter, 
  Plus, 
  Receipt, 
  Search, 
  Smartphone, 
  Wallet,
  Calculator,
  FileText
} from 'lucide-react';
import { formatPHP } from '@/lib/utils/currency';

export default function TransactionTable({ 
  transactions = [], 
  onNewTransaction, 
  onExportReport,
  onNewProposal,
  currentRole,
  isDbConnected = false
}) {
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const filtered = transactions.filter((tx) => {
    const matchesType = 
      filterType === 'ALL' ? true :
      filterType === 'REIMBURSEMENT' ? tx.is_reimbursement :
      tx.type === filterType;

    const matchesSearch = 
      tx.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.description && tx.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.event_name && tx.event_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.reimbursement_recipient && tx.reimbursement_recipient.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesType && matchesSearch;
  });

  return (
    <div className="rounded-2xl border border-white/30 bg-white/20 backdrop-blur-xl shadow-2xl overflow-hidden">
      
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/10">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-white tracking-tight drop-shadow-xs">
              Financial Ledger &amp; Transactions
            </h2>
            {isDbConnected && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-400/20 text-emerald-200 border border-emerald-400/40 shrink-0">
                Live
              </span>
            )}
          </div>
          <p className="text-xs text-white/80 font-medium mt-0.5 truncate">
            Real-time auditable record of organization inflows and disbursements
          </p>
        </div>

        {/* Action Buttons — 2-col grid on mobile, row on sm+ */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto shrink-0">
          {/* Create Business Proposal Button */}
          <button
            onClick={onNewProposal}
            className="h-9 flex items-center justify-center gap-1.5 px-3 text-xs font-semibold text-white bg-white/15 hover:bg-white/25 active:bg-white/30 border border-white/30 rounded-xl transition-all shadow-xs whitespace-nowrap cursor-pointer backdrop-blur-md"
            title="Create Pre-Activity Business Proposal & Booth Budget"
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span>Create Proposal</span>
          </button>

          {/* Review & Export Report Button */}
          <button
            onClick={onExportReport}
            className="h-9 flex items-center justify-center gap-1.5 px-3 text-xs font-semibold text-white bg-white/15 hover:bg-white/25 active:bg-white/30 border border-white/30 rounded-xl transition-all shadow-xs whitespace-nowrap cursor-pointer backdrop-blur-md"
            title="Preview 1:1 PDM CCS Formal Word Liquidation Report & Live Edit"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span>Preview Report</span>
          </button>

          {/* New Transaction Button (Admin/Treasurer/Auditor) */}
          {(currentRole === 'admin' || currentRole === 'treasurer' || currentRole === 'auditor') && (
            <button
              onClick={onNewTransaction}
              className="col-span-2 sm:col-span-1 h-9 flex items-center justify-center gap-1.5 px-3.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-xl transition-all shadow-md whitespace-nowrap cursor-pointer border border-emerald-400/30"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Record Transaction</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="px-4 sm:px-5 py-3 bg-black/15 border-b border-white/15 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-72 shrink-0">
          <Search className="w-3.5 h-3.5 text-white/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search items, events, recipients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 text-xs bg-white/20 focus:bg-white/30 border border-white/30 rounded-xl pl-8 pr-3 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all select-text shadow-xs"
          />
        </div>

        {/* Filter Pills — Desktop only; mobile renders categories straight downward */}
        <div className="hidden md:flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none flex-nowrap">
          {[
            { id: 'ALL', label: 'All Records' },
            { id: 'INFLOW', label: 'Inflows' },
            { id: 'OUTFLOW', label: 'Outflows' },
            { id: 'REIMBURSEMENT', label: 'Pending Abono' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`h-7 px-3 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                filterType === tab.id
                  ? 'bg-emerald-500 text-white font-bold shadow-md border border-emerald-300/40'
                  : 'text-white/80 hover:bg-white/20 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

      </div>

      {/* Desktop/Tablet Transactions Table (>= md) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[640px] text-left border-collapse">
          <thead>
            <tr className="border-b border-white/15 text-[11px] font-bold text-white/90 bg-black/20 uppercase tracking-wider">
              <th className="py-2.5 px-4 sm:px-5">Transaction &amp; Event</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Channel</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Category</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">Amount</th>
              <th className="py-2.5 px-4 text-center whitespace-nowrap">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-xs">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-12 text-center text-white/70 font-semibold text-sm">
                  No matching transactions found.
                </td>
              </tr>
            ) : (
              filtered.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/15 transition-colors">
                  
                  {/* Title & Event */}
                  <td className="py-3 px-4 sm:px-5 max-w-[260px]">
                    <div className="font-bold text-white flex items-center gap-1.5 drop-shadow-2xs">
                      {tx.type === 'INFLOW' ? (
                        <ArrowDownRight className="w-4 h-4 text-emerald-300 shrink-0" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-amber-300 shrink-0" />
                      )}
                      <span className="truncate">{tx.title}</span>
                    </div>
                    {tx.event_name && (
                      <span className="text-[10px] font-medium text-white/70 block mt-0.5 truncate">
                        {tx.event_name}
                      </span>
                    )}
                    {tx.is_reimbursement && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-amber-200 bg-amber-950/40 border border-amber-400/30 px-1.5 py-0.5 rounded-md">
                        <Clock className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                        <span className="truncate max-w-[160px]">Advance by: {tx.reimbursement_recipient || 'Officer'}</span>
                      </span>
                    )}
                  </td>

                  {/* Date */}
                  <td className="py-3 px-3 text-white/85 font-medium whitespace-nowrap">
                    {tx.transaction_date}
                  </td>

                  {/* Payment Channel */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    {tx.payment_method === 'CASH' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-200 bg-emerald-950/40 border border-emerald-400/30 px-2 py-0.5 rounded-md">
                        <Wallet className="w-3 h-3 text-emerald-300" />
                        Cash
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-200 bg-blue-950/40 border border-blue-400/30 px-2 py-0.5 rounded-md">
                        <Smartphone className="w-3 h-3 text-blue-300" />
                        GCash
                      </span>
                    )}
                  </td>

                  {/* Category */}
                  <td className="py-3 px-3 text-white/90 font-medium whitespace-nowrap">
                    <span className="bg-white/15 border border-white/25 text-white text-[11px] px-2 py-0.5 rounded-md font-semibold">
                      {tx.category_name || (tx.type === 'INFLOW' ? 'Revenue' : 'Disbursement')}
                    </span>
                  </td>

                  {/* Amount */}
                  <td className={`py-3 px-3 text-right font-black whitespace-nowrap tabular-nums text-sm ${
                    tx.type === 'INFLOW' ? 'text-emerald-300 drop-shadow-xs' : 'text-white'
                  }`}>
                    {tx.type === 'INFLOW' ? '+' : '-'}{formatPHP(tx.amount)}
                  </td>

                  {/* Receipt Preview */}
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    {tx.receipt_url ? (
                      <button
                        onClick={() => setSelectedReceipt(tx)}
                        className="h-7 inline-flex items-center gap-1 text-[11px] text-white hover:text-white font-semibold bg-white/20 hover:bg-white/30 border border-white/30 px-2.5 rounded-lg transition-colors shadow-2xs cursor-pointer"
                      >
                        <Receipt className="w-3 h-3 text-emerald-300" />
                        View
                      </button>
                    ) : (
                      <span className="text-[11px] text-white/50 italic">None</span>
                    )}
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Transactions Sectioned Stack (< md) matching Reference UI */}
      {(() => {
        const filterBySearch = (txList) => {
          if (!searchQuery.trim()) return txList;
          const q = searchQuery.toLowerCase();
          return txList.filter((tx) =>
            tx.title?.toLowerCase().includes(q) ||
            (tx.description && tx.description.toLowerCase().includes(q)) ||
            (tx.event_name && tx.event_name.toLowerCase().includes(q)) ||
            (tx.reimbursement_recipient && tx.reimbursement_recipient.toLowerCase().includes(q)) ||
            (tx.category_name && tx.category_name.toLowerCase().includes(q))
          );
        };

        const mobileInflows = filterBySearch(transactions.filter((tx) => tx.type === 'INFLOW'));
        const mobileOutflows = filterBySearch(transactions.filter((tx) => tx.type === 'OUTFLOW' && !tx.is_reimbursement));
        const mobileReimbursements = filterBySearch(transactions.filter((tx) => tx.is_reimbursement));

        const totalInflowsSum = mobileInflows.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
        const totalOutflowsSum = mobileOutflows.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
        const totalReimbursementsSum = mobileReimbursements.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

        const renderCard = (tx, badgeConfig) => (
          <div
            key={tx.id}
            className="bg-white rounded-2xl shadow-xs border border-black/[0.08] p-4 space-y-3 transition-all"
          >
            {/* Top Row: Amount on left & Status pill badge on right */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                  {tx.type === 'INFLOW' ? 'Inflow Amount' : 'Disbursement Amount'}
                </span>
                <span
                  className={`text-xl font-extrabold tracking-tight tabular-nums block whitespace-nowrap ${
                    tx.type === 'INFLOW' ? 'text-emerald-700' : 'text-gray-900'
                  }`}
                >
                  {tx.type === 'INFLOW' ? '+' : '-'}{formatPHP(tx.amount)}
                </span>
              </div>

              {/* Status Badge Pill matching reference */}
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0 border ${badgeConfig.style}`}>
                {badgeConfig.label}
              </span>
            </div>

            {/* Middle Section: Key-Value Details */}
            <div className="space-y-2 pt-2.5 border-t border-gray-100 text-xs">
              <div className="flex items-start justify-between gap-3">
                <span className="text-gray-500 font-medium shrink-0">Transaction</span>
                <span className="text-gray-900 font-bold text-right truncate max-w-[200px]">{tx.title}</span>
              </div>

              {tx.event_name && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500 font-medium shrink-0">Event</span>
                  <span className="text-gray-700 font-medium text-right truncate max-w-[200px]">{tx.event_name}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500 font-medium shrink-0">Date</span>
                <span className="text-gray-700 font-semibold tabular-nums">{tx.transaction_date}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500 font-medium shrink-0">Payment Channel</span>
                <span className="inline-flex items-center gap-1 font-semibold text-gray-800">
                  {tx.payment_method === 'CASH' ? (
                    <>
                      <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Cash</span>
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                      <span>GCash</span>
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500 font-medium shrink-0">Category</span>
                <span className="text-gray-700 font-semibold">{tx.category_name || (tx.type === 'INFLOW' ? 'Revenue' : 'Disbursement')}</span>
              </div>

              {tx.is_reimbursement && tx.reimbursement_recipient && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500 font-medium shrink-0">Advance By</span>
                  <span className="text-amber-800 font-bold">{tx.reimbursement_recipient}</span>
                </div>
              )}
            </div>

            {/* Bottom Full-Width Action Button matching Reference "View Offer Details" */}
            {tx.receipt_url ? (
              <button
                onClick={() => setSelectedReceipt(tx)}
                className="w-full mt-2 h-9 flex items-center justify-center gap-1.5 px-3 text-xs font-bold text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-200/80 rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                <Receipt className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>View Receipt Details</span>
              </button>
            ) : (
              <div className="w-full mt-2 h-8 flex items-center justify-center text-[11px] font-medium text-gray-400 bg-gray-50 border border-gray-150 rounded-xl">
                <span>No Receipt Attached</span>
              </div>
            )}
          </div>
        );

        return (
          <div className="md:hidden p-3.5 sm:p-4 space-y-6">

            {/* Global Empty State */}
            {mobileInflows.length === 0 && mobileOutflows.length === 0 && mobileReimbursements.length === 0 && (
              <div className="py-10 text-center text-white/80 font-semibold text-xs bg-black/10 rounded-2xl border border-white/10 p-6">
                No matching transactions found.
              </div>
            )}

            {/* 1. Inflows Section */}
            {(mobileInflows.length > 0 || !searchQuery) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400/50 shrink-0" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white truncate">
                      <span className="sm:hidden">Inflows</span>
                      <span className="hidden sm:inline">Inflows &amp; Revenue</span>
                    </h3>
                    <span className="text-[10px] font-bold text-emerald-200 bg-emerald-950/60 border border-emerald-400/30 px-2 py-0.5 rounded-full shrink-0">
                      {mobileInflows.length}
                    </span>
                  </div>
                  <span className="text-xs font-black text-emerald-300 tabular-nums whitespace-nowrap shrink-0 text-right">
                    +{formatPHP(totalInflowsSum)}
                  </span>
                </div>

                {mobileInflows.length === 0 ? (
                  <div className="p-4 text-center text-white/60 text-xs bg-black/10 rounded-xl border border-white/5">
                    No inflow records found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mobileInflows.map((tx) =>
                      renderCard(tx, {
                        label: tx.category_name || 'Revenue',
                        style: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 2. Outflows Section */}
            {(mobileOutflows.length > 0 || !searchQuery) && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-xs shadow-amber-400/50 shrink-0" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white truncate">
                      <span className="sm:hidden">Outflows</span>
                      <span className="hidden sm:inline">Outflows &amp; Disbursements</span>
                    </h3>
                    <span className="text-[10px] font-bold text-amber-200 bg-amber-950/60 border border-amber-400/30 px-2 py-0.5 rounded-full shrink-0">
                      {mobileOutflows.length}
                    </span>
                  </div>
                  <span className="text-xs font-black text-white tabular-nums whitespace-nowrap shrink-0 text-right">
                    -{formatPHP(totalOutflowsSum)}
                  </span>
                </div>

                {mobileOutflows.length === 0 ? (
                  <div className="p-4 text-center text-white/60 text-xs bg-black/10 rounded-xl border border-white/5">
                    No outflow records found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mobileOutflows.map((tx) =>
                      renderCard(tx, {
                        label: tx.category_name || 'Disbursement',
                        style: 'bg-rose-50 text-rose-800 border-rose-200/80',
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. Pending Abono / Reimbursements Section */}
            {(mobileReimbursements.length > 0 || !searchQuery) && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-400 shadow-xs shadow-orange-400/50 shrink-0" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white truncate">
                      <span className="sm:hidden">Pending Abono</span>
                      <span className="hidden sm:inline">Pending Abono (Advances)</span>
                    </h3>
                    <span className="text-[10px] font-bold text-amber-200 bg-amber-950/60 border border-amber-400/30 px-2 py-0.5 rounded-full shrink-0">
                      {mobileReimbursements.length}
                    </span>
                  </div>
                  <span className="text-xs font-black text-amber-300 tabular-nums whitespace-nowrap shrink-0 text-right">
                    {formatPHP(totalReimbursementsSum)}
                  </span>
                </div>

                {mobileReimbursements.length === 0 ? (
                  <div className="p-4 text-center text-white/60 text-xs bg-black/10 rounded-xl border border-white/5">
                    No pending abono requests
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mobileReimbursements.map((tx) =>
                      renderCard(tx, {
                        label: 'Pending Abono',
                        style: 'bg-amber-50 text-amber-900 border-amber-300',
                      })
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        );
      })()}

      {/* Receipt Modal Preview */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-t-2xl sm:rounded-2xl max-w-sm w-full p-5 border border-black/[0.08] shadow-xl animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-150">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3 sm:hidden" />
            <h3 className="text-sm font-bold text-gray-950 mb-1">
              Receipt / Disbursement Proof
            </h3>
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-3 min-w-0">
              <span className="truncate">{selectedReceipt.title}</span>
              <span className="text-gray-300 mx-1 shrink-0">/</span>
              <span className="tabular-nums font-semibold text-gray-900 shrink-0 whitespace-nowrap">{formatPHP(selectedReceipt.amount)}</span>
            </div>
            <div className="rounded-xl overflow-hidden bg-gray-100 border border-black/[0.06] aspect-4/3 flex items-center justify-center mb-4">
              <img 
                src={selectedReceipt.receipt_url} 
                alt="Receipt" 
                className="w-full h-full object-contain" 
              />
            </div>
            <button
              onClick={() => setSelectedReceipt(null)}
              className="w-full h-9 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
