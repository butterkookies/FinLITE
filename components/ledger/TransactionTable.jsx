'use client';

import { useState } from 'react';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  Clock, 
  Plus, 
  Receipt, 
  Search, 
  Smartphone, 
  Wallet,
  Calculator,
  FileText,
  Folder
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
    <div className="bg-white rounded-2xl border border-black/[0.08] shadow-xs relative overflow-hidden">
      
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-gray-950">
              Financial Ledger &amp; Transactions
            </h2>
            {isDbConnected && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 bg-emerald-50 text-emerald-800 border border-emerald-200">
                Live
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 font-medium mt-0.5 truncate">
            Real-time auditable record of organization inflows and disbursements
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto shrink-0">
          {/* Create Business Proposal Button */}
          <button
            onClick={onNewProposal}
            className="h-9 flex items-center justify-center gap-1.5 px-3 text-xs font-semibold rounded-xl transition-all shadow-2xs whitespace-nowrap cursor-pointer text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 border border-black/[0.08]"
            title="Create Pre-Activity Business Proposal & Booth Budget"
          >
            <Calculator className="w-3.5 h-3.5 text-gray-600 shrink-0" />
            <span>Create Proposal</span>
          </button>

          {/* Review & Export Report Button */}
          <button
            onClick={onExportReport}
            className="h-9 flex items-center justify-center gap-1.5 px-3 text-xs font-semibold rounded-xl transition-all shadow-2xs whitespace-nowrap cursor-pointer text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 border border-black/[0.08]"
            title="Preview 1:1 PDM CCS Formal Word Liquidation Report & Live Edit"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>Preview Report</span>
          </button>

          {/* New Transaction Button (Admin/Treasurer/Auditor) */}
          {(currentRole === 'admin' || currentRole === 'treasurer' || currentRole === 'auditor') && (
            <button
              onClick={onNewTransaction}
              className="col-span-2 sm:col-span-1 h-9 flex items-center justify-center gap-1.5 px-3.5 text-xs font-bold rounded-xl transition-all shadow-xs whitespace-nowrap cursor-pointer text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900"
            >
              <Plus className="w-4 h-4 shrink-0 stroke-[2.5]" />
              <span>Record Transaction</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="px-4 sm:px-5 py-3 border-b border-black/[0.06] bg-gray-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-72 shrink-0">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search items, events, recipients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8.5 text-xs rounded-xl pl-8.5 pr-3 transition-all select-text bg-white border border-black/[0.08] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {/* Filter Tabs — 2x2 grid on mobile, inline on desktop */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-1 p-1 rounded-xl sm:rounded-full bg-gray-100 border border-black/[0.04] w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Records' },
            { id: 'INFLOW', label: 'Inflows' },
            { id: 'OUTFLOW', label: 'Outflows' },
            { id: 'REIMBURSEMENT', label: 'Pending Abono' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`h-7.5 px-3 sm:px-3.5 text-xs font-semibold transition-all rounded-lg sm:rounded-full text-center flex items-center justify-center cursor-pointer ${
                filterType === tab.id
                  ? 'bg-white text-gray-950 font-bold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
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
            <tr className="border-b border-black/[0.06] text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-500 bg-gray-50/75">
              <th className="py-2.5 px-4 sm:px-5">Transaction &amp; Event</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Channel</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Category</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">Amount</th>
              <th className="py-2.5 px-4 text-center whitespace-nowrap">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.06] text-xs">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-14 text-center">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-2">
                    <Folder className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium text-gray-500">
                    No matching transactions found.
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50/60 transition-colors">
                  
                  {/* Title & Event */}
                  <td className="py-3 px-4 sm:px-5 max-w-[260px]">
                    <div className="font-bold text-gray-950 flex items-center gap-1.5">
                      {tx.type === 'INFLOW' ? (
                        <ArrowDownRight className="w-4 h-4 shrink-0 text-emerald-600" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 shrink-0 text-amber-600" />
                      )}
                      <span className="truncate">{tx.title}</span>
                    </div>
                    {tx.event_name && (
                      <span className="text-[10px] font-medium text-gray-500 block mt-0.5 truncate">
                        {tx.event_name}
                      </span>
                    )}
                    {tx.is_reimbursement && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border text-amber-800 bg-amber-50 border-amber-200">
                        <Clock className="w-2.5 h-2.5 shrink-0 text-amber-600" />
                        <span className="truncate max-w-[160px]">Advance by: {tx.reimbursement_recipient || 'Officer'}</span>
                      </span>
                    )}
                  </td>

                  {/* Date */}
                  <td className="py-3 px-3 font-medium text-gray-600 whitespace-nowrap">
                    {tx.transaction_date}
                  </td>

                  {/* Payment Channel */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    {tx.payment_method === 'CASH' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border text-emerald-800 bg-emerald-50 border-emerald-200">
                        <Wallet className="w-3 h-3 text-emerald-700" />
                        Cash
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border text-blue-800 bg-blue-50 border-blue-200">
                        <Smartphone className="w-3 h-3 text-blue-600" />
                        GCash
                      </span>
                    )}
                  </td>

                  {/* Category */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold border bg-gray-50 border-black/[0.06] text-gray-700">
                      {tx.category_name || (tx.type === 'INFLOW' ? 'Revenue' : 'Disbursement')}
                    </span>
                  </td>

                  {/* Amount */}
                  <td className={`py-3 px-3 text-right font-bold whitespace-nowrap tabular-nums text-sm ${
                    tx.type === 'INFLOW' ? 'text-emerald-700' : 'text-gray-900'
                  }`}>
                    {tx.type === 'INFLOW' ? '+' : '-'}{formatPHP(tx.amount)}
                  </td>

                  {/* Receipt Preview */}
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    {tx.receipt_url ? (
                      <button
                        onClick={() => setSelectedReceipt(tx)}
                        className="h-7 inline-flex items-center gap-1 text-[11px] font-semibold px-2 rounded-lg transition-colors cursor-pointer border text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                      >
                        <Receipt className="w-3 h-3 text-emerald-700" />
                        View
                      </button>
                    ) : (
                      <span className="text-[11px] text-gray-400 italic">None</span>
                    )}
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Transactions Sectioned Stack (< md) */}
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
            className="bg-white rounded-2xl border border-black/[0.08] p-4 space-y-3 shadow-2xs"
          >
            {/* Top Row: Amount on left & Status pill badge on right */}
            <div className="flex items-start justify-between gap-2.5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-0.5">
                  {tx.type === 'INFLOW' ? 'Inflow Amount' : 'Disbursement Amount'}
                </span>
                <span
                  className={`text-lg font-bold tracking-tight tabular-nums block whitespace-nowrap ${
                    tx.type === 'INFLOW' ? 'text-emerald-700' : 'text-gray-950'
                  }`}
                >
                  {tx.type === 'INFLOW' ? '+' : '-'}{formatPHP(tx.amount)}
                </span>
              </div>

              {/* Status Badge Pill */}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 border ${badgeConfig.style}`}>
                {badgeConfig.label}
              </span>
            </div>

            {/* Middle Section: Key-Value Details */}
            <div className="space-y-1.5 pt-2 border-t border-black/[0.06] text-xs">
              <div className="flex items-start justify-between gap-2.5">
                <span className="font-medium text-gray-500 shrink-0">Transaction</span>
                <span className="font-bold text-gray-900 text-right truncate max-w-[200px]">{tx.title}</span>
              </div>

              {tx.event_name && (
                <div className="flex items-center justify-between gap-2.5">
                  <span className="font-medium text-gray-500 shrink-0">Event</span>
                  <span className="font-medium text-gray-700 text-right truncate max-w-[200px]">{tx.event_name}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2.5">
                <span className="font-medium text-gray-500 shrink-0">Date</span>
                <span className="font-semibold text-gray-700 tabular-nums">{tx.transaction_date}</span>
              </div>

              <div className="flex items-center justify-between gap-2.5">
                <span className="font-medium text-gray-500 shrink-0">Payment Channel</span>
                <span className="inline-flex items-center gap-1 font-semibold text-gray-900">
                  {tx.payment_method === 'CASH' ? (
                    <>
                      <Wallet className="w-3.5 h-3.5 text-emerald-700" />
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

              <div className="flex items-center justify-between gap-2.5">
                <span className="font-medium text-gray-500 shrink-0">Category</span>
                <span className="font-semibold text-gray-700">{tx.category_name || (tx.type === 'INFLOW' ? 'Revenue' : 'Disbursement')}</span>
              </div>

              {tx.is_reimbursement && tx.reimbursement_recipient && (
                <div className="flex items-center justify-between gap-2.5">
                  <span className="font-medium text-gray-500 shrink-0">Advance By</span>
                  <span className="font-bold text-amber-800">{tx.reimbursement_recipient}</span>
                </div>
              )}
            </div>

            {/* Bottom Full-Width Action Button */}
            {tx.receipt_url ? (
              <button
                onClick={() => setSelectedReceipt(tx)}
                className="w-full mt-2 h-8 flex items-center justify-center gap-1.5 px-3 text-xs font-semibold rounded-xl transition-all cursor-pointer border text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
              >
                <Receipt className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>View Receipt Details</span>
              </button>
            ) : (
              <div className="w-full mt-2 h-7.5 flex items-center justify-center text-[11px] font-medium text-gray-400 bg-gray-50 rounded-xl border border-black/[0.04]">
                <span>No Receipt Attached</span>
              </div>
            )}
          </div>
        );

        return (
          <div className="md:hidden p-3.5 space-y-5">

            {/* Global Empty State */}
            {mobileInflows.length === 0 && mobileOutflows.length === 0 && mobileReimbursements.length === 0 && (
              <div className="py-10 text-center font-medium text-xs text-gray-500 rounded-xl border border-black/[0.06] p-4 bg-gray-50/50">
                <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-2">
                  <Folder className="w-5 h-5" />
                </div>
                No matching transactions found.
              </div>
            )}

            {/* 1. Inflows Section */}
            {(mobileInflows.length > 0 || !searchQuery) && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 truncate">
                      <span className="sm:hidden">Inflows</span>
                      <span className="hidden sm:inline">Inflows &amp; Revenue</span>
                    </h3>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 border text-emerald-800 bg-emerald-50 border-emerald-200">
                      {mobileInflows.length}
                    </span>
                  </div>
                  <span className="text-xs font-bold tabular-nums whitespace-nowrap shrink-0 text-right text-emerald-700">
                    +{formatPHP(totalInflowsSum)}
                  </span>
                </div>

                {mobileInflows.length === 0 ? (
                  <div className="p-3 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-black/[0.04]">
                    No inflow records found
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {mobileInflows.map((tx) =>
                      renderCard(tx, {
                        label: tx.category_name || 'Revenue',
                        style: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 2. Outflows Section */}
            {(mobileOutflows.length > 0 || !searchQuery) && (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 truncate">
                      <span className="sm:hidden">Outflows</span>
                      <span className="hidden sm:inline">Outflows &amp; Disbursements</span>
                    </h3>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 border text-amber-800 bg-amber-50 border-amber-200">
                      {mobileOutflows.length}
                    </span>
                  </div>
                  <span className="text-xs font-bold tabular-nums whitespace-nowrap shrink-0 text-right text-gray-900">
                    -{formatPHP(totalOutflowsSum)}
                  </span>
                </div>

                {mobileOutflows.length === 0 ? (
                  <div className="p-3 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-black/[0.04]">
                    No outflow records found
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {mobileOutflows.map((tx) =>
                      renderCard(tx, {
                        label: tx.category_name || 'Disbursement',
                        style: 'bg-rose-50 text-rose-800 border-rose-200',
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. Pending Abono / Reimbursements Section */}
            {(mobileReimbursements.length > 0 || !searchQuery) && (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 truncate">
                      <span className="sm:hidden">Pending Abono</span>
                      <span className="hidden sm:inline">Pending Abono (Advances)</span>
                    </h3>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 border text-amber-800 bg-amber-50 border-amber-200">
                      {mobileReimbursements.length}
                    </span>
                  </div>
                  <span className="text-xs font-bold tabular-nums whitespace-nowrap shrink-0 text-right text-amber-700">
                    {formatPHP(totalReimbursementsSum)}
                  </span>
                </div>

                {mobileReimbursements.length === 0 ? (
                  <div className="p-3 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-black/[0.04]">
                    No pending abono requests
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {mobileReimbursements.map((tx) =>
                      renderCard(tx, {
                        label: 'Pending Abono',
                        style: 'bg-amber-50 text-amber-800 border-amber-200',
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
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-sm w-full p-5 border border-black/[0.08] shadow-lg animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-150">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3 sm:hidden" />
            <h3 className="text-sm font-bold text-gray-900 mb-1">
              Receipt / Disbursement Proof
            </h3>
            <div className="flex items-center gap-1 text-xs mb-3 min-w-0 text-gray-500">
              <span className="truncate">{selectedReceipt.title}</span>
              <span className="text-gray-300 mx-1 shrink-0">/</span>
              <span className="tabular-nums font-semibold text-gray-900 shrink-0 whitespace-nowrap">
                {formatPHP(selectedReceipt.amount)}
              </span>
            </div>
            <div className="rounded-xl overflow-hidden aspect-4/3 flex items-center justify-center mb-4 border border-black/[0.06] bg-gray-50">
              <img 
                src={selectedReceipt.receipt_url} 
                alt="Receipt" 
                className="w-full h-full object-contain" 
              />
            </div>
            <button
              onClick={() => setSelectedReceipt(null)}
              className="w-full h-9 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
