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
    <div className="rounded-3xl border border-emerald-500/20 bg-[#082218]/85 backdrop-blur-xl shadow-2xl overflow-hidden transition-all relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-400/40 to-emerald-500/0 pointer-events-none" />
      
      {/* Table Header Controls */}
      <div className="p-5 sm:p-6 border-b border-emerald-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Financial Ledger &amp; Transactions
            </h2>
            {isDbConnected && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                Live
              </span>
            )}
          </div>
          <p className="text-xs text-white/50 font-medium mt-1 truncate">
            Real-time auditable record of organization inflows and disbursements
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 w-full sm:w-auto shrink-0">
          {/* Create Business Proposal Button */}
          <button
            onClick={onNewProposal}
            className="h-10 flex items-center justify-center gap-2 px-4 text-xs font-semibold text-emerald-200 bg-[#0d1e16] hover:bg-[#122b20] active:bg-[#163527] border border-[#1a382b] hover:border-emerald-500/40 rounded-xl transition-all shadow-xs whitespace-nowrap cursor-pointer"
            title="Create Pre-Activity Business Proposal & Booth Budget"
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Create Proposal</span>
          </button>

          {/* Review & Export Report Button */}
          <button
            onClick={onExportReport}
            className="h-10 flex items-center justify-center gap-2 px-4 text-xs font-semibold text-emerald-200 bg-[#0d1e16] hover:bg-[#122b20] active:bg-[#163527] border border-[#1a382b] hover:border-emerald-500/40 rounded-xl transition-all shadow-xs whitespace-nowrap cursor-pointer"
            title="Preview 1:1 PDM CCS Formal Word Liquidation Report & Live Edit"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Preview Report</span>
          </button>

          {/* New Transaction Button (Admin/Treasurer/Auditor) */}
          {(currentRole === 'admin' || currentRole === 'treasurer' || currentRole === 'auditor') && (
            <button
              onClick={onNewTransaction}
              className="col-span-2 sm:col-span-1 h-10 flex items-center justify-center gap-2 px-4.5 text-xs font-black text-black bg-[#10b981] hover:bg-[#059669] active:bg-[#047857] rounded-xl transition-all shadow-lg shadow-emerald-500/20 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0 stroke-[3]" />
              <span>Record Transaction</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="px-5 sm:px-6 py-3.5 border-b border-[#142e20] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-80 shrink-0">
          <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search items, events, recipients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 text-xs bg-[#06120c] focus:bg-[#091a11] border border-[#163325] focus:border-emerald-500/50 rounded-xl pl-8.5 pr-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all select-text shadow-inner"
          />
        </div>

        {/* Filter Tabs — 2x2 grid on mobile (no scroll), flex row on sm+ */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 p-1 bg-[#06120c] rounded-2xl sm:rounded-full border border-[#163325] w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Records' },
            { id: 'INFLOW', label: 'Inflows' },
            { id: 'OUTFLOW', label: 'Outflows' },
            { id: 'REIMBURSEMENT', label: 'Pending Abono' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`h-8 px-3.5 sm:px-4 text-xs font-bold transition-all rounded-xl sm:rounded-full text-center flex items-center justify-center cursor-pointer ${
                filterType === tab.id
                  ? 'bg-[#10b981] text-black shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
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
            <tr className="border-b border-[#142e20] text-[10px] sm:text-[11px] font-bold text-white/40 uppercase tracking-wider">
              <th className="py-3 px-5 sm:px-6">Transaction &amp; Event</th>
              <th className="py-3 px-3 whitespace-nowrap">Date</th>
              <th className="py-3 px-3 whitespace-nowrap">Channel</th>
              <th className="py-3 px-3 whitespace-nowrap">Category</th>
              <th className="py-3 px-3 text-right whitespace-nowrap">Amount</th>
              <th className="py-3 px-5 text-center whitespace-nowrap">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#142e20]/60 text-xs">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-16 text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#064e3b]/30 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-3 shadow-inner">
                    <Folder className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-white/50 font-medium">No matching transactions found.</p>
                </td>
              </tr>
            ) : (
              filtered.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                  
                  {/* Title & Event */}
                  <td className="py-3.5 px-5 sm:px-6 max-w-[260px]">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      {tx.type === 'INFLOW' ? (
                        <ArrowDownRight className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                      <span className="truncate">{tx.title}</span>
                    </div>
                    {tx.event_name && (
                      <span className="text-[10px] font-medium text-white/50 block mt-0.5 truncate">
                        {tx.event_name}
                      </span>
                    )}
                    {tx.is_reimbursement && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md">
                        <Clock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                        <span className="truncate max-w-[160px]">Advance by: {tx.reimbursement_recipient || 'Officer'}</span>
                      </span>
                    )}
                  </td>

                  {/* Date */}
                  <td className="py-3.5 px-3 text-white/70 font-medium whitespace-nowrap">
                    {tx.transaction_date}
                  </td>

                  {/* Payment Channel */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    {tx.payment_method === 'CASH' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                        <Wallet className="w-3 h-3 text-emerald-400" />
                        Cash
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
                        <Smartphone className="w-3 h-3 text-blue-400" />
                        GCash
                      </span>
                    )}
                  </td>

                  {/* Category */}
                  <td className="py-3.5 px-3 text-white/80 font-medium whitespace-nowrap">
                    <span className="bg-[#0c1e16] border border-[#1a382b] text-white/90 text-[11px] px-2 py-0.5 rounded-md font-semibold">
                      {tx.category_name || (tx.type === 'INFLOW' ? 'Revenue' : 'Disbursement')}
                    </span>
                  </td>

                  {/* Amount */}
                  <td className={`py-3.5 px-3 text-right font-black whitespace-nowrap tabular-nums text-sm ${
                    tx.type === 'INFLOW' ? 'text-emerald-400' : 'text-white'
                  }`}>
                    {tx.type === 'INFLOW' ? '+' : '-'}{formatPHP(tx.amount)}
                  </td>

                  {/* Receipt Preview */}
                  <td className="py-3.5 px-5 text-center whitespace-nowrap">
                    {tx.receipt_url ? (
                      <button
                        onClick={() => setSelectedReceipt(tx)}
                        className="h-7 inline-flex items-center gap-1 text-[11px] text-emerald-300 hover:text-emerald-200 font-semibold bg-[#0c1e16] hover:bg-[#122b20] border border-[#1a382b] px-2.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <Receipt className="w-3 h-3 text-emerald-400" />
                        View
                      </button>
                    ) : (
                      <span className="text-[11px] text-white/40 italic">None</span>
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
            className="bg-[#0c1b14] rounded-2xl border border-[#163325] p-4.5 space-y-3 transition-all"
          >
            {/* Top Row: Amount on left & Status pill badge on right */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block mb-0.5">
                  {tx.type === 'INFLOW' ? 'Inflow Amount' : 'Disbursement Amount'}
                </span>
                <span
                  className={`text-xl font-black tracking-tight tabular-nums block whitespace-nowrap ${
                    tx.type === 'INFLOW' ? 'text-emerald-400' : 'text-white'
                  }`}
                >
                  {tx.type === 'INFLOW' ? '+' : '-'}{formatPHP(tx.amount)}
                </span>
              </div>

              {/* Status Badge Pill */}
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0 border ${badgeConfig.style}`}>
                {badgeConfig.label}
              </span>
            </div>

            {/* Middle Section: Key-Value Details */}
            <div className="space-y-2 pt-2.5 border-t border-[#142e20] text-xs">
              <div className="flex items-start justify-between gap-3">
                <span className="text-white/50 font-medium shrink-0">Transaction</span>
                <span className="text-white font-bold text-right truncate max-w-[200px]">{tx.title}</span>
              </div>

              {tx.event_name && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/50 font-medium shrink-0">Event</span>
                  <span className="text-white/80 font-medium text-right truncate max-w-[200px]">{tx.event_name}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <span className="text-white/50 font-medium shrink-0">Date</span>
                <span className="text-white/80 font-semibold tabular-nums">{tx.transaction_date}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-white/50 font-medium shrink-0">Payment Channel</span>
                <span className="inline-flex items-center gap-1 font-semibold text-white/90">
                  {tx.payment_method === 'CASH' ? (
                    <>
                      <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Cash</span>
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                      <span>GCash</span>
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-white/50 font-medium shrink-0">Category</span>
                <span className="text-white/80 font-semibold">{tx.category_name || (tx.type === 'INFLOW' ? 'Revenue' : 'Disbursement')}</span>
              </div>

              {tx.is_reimbursement && tx.reimbursement_recipient && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/50 font-medium shrink-0">Advance By</span>
                  <span className="text-amber-300 font-bold">{tx.reimbursement_recipient}</span>
                </div>
              )}
            </div>

            {/* Bottom Full-Width Action Button */}
            {tx.receipt_url ? (
              <button
                onClick={() => setSelectedReceipt(tx)}
                className="w-full mt-2 h-9 flex items-center justify-center gap-1.5 px-3 text-xs font-bold text-emerald-300 bg-[#0d1e16] hover:bg-[#122b20] active:bg-[#163527] border border-[#1a382b] rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                <Receipt className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>View Receipt Details</span>
              </button>
            ) : (
              <div className="w-full mt-2 h-8 flex items-center justify-center text-[11px] font-medium text-white/30 bg-[#07130e] border border-[#142e20] rounded-xl">
                <span>No Receipt Attached</span>
              </div>
            )}
          </div>
        );

        return (
          <div className="md:hidden p-4 space-y-6">

            {/* Global Empty State */}
            {mobileInflows.length === 0 && mobileOutflows.length === 0 && mobileReimbursements.length === 0 && (
              <div className="py-12 text-center text-white/50 font-semibold text-xs bg-[#07130e] rounded-2xl border border-[#142e20] p-6">
                <div className="w-12 h-12 rounded-xl bg-[#064e3b]/30 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-3 shadow-inner">
                  <Folder className="w-6 h-6" />
                </div>
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
                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0">
                      {mobileInflows.length}
                    </span>
                  </div>
                  <span className="text-xs font-black text-emerald-400 tabular-nums whitespace-nowrap shrink-0 text-right">
                    +{formatPHP(totalInflowsSum)}
                  </span>
                </div>

                {mobileInflows.length === 0 ? (
                  <div className="p-4 text-center text-white/40 text-xs bg-[#07130e] rounded-xl border border-[#142e20]">
                    No inflow records found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mobileInflows.map((tx) =>
                      renderCard(tx, {
                        label: tx.category_name || 'Revenue',
                        style: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
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
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full shrink-0">
                      {mobileOutflows.length}
                    </span>
                  </div>
                  <span className="text-xs font-black text-white tabular-nums whitespace-nowrap shrink-0 text-right">
                    -{formatPHP(totalOutflowsSum)}
                  </span>
                </div>

                {mobileOutflows.length === 0 ? (
                  <div className="p-4 text-center text-white/40 text-xs bg-[#07130e] rounded-xl border border-[#142e20]">
                    No outflow records found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mobileOutflows.map((tx) =>
                      renderCard(tx, {
                        label: tx.category_name || 'Disbursement',
                        style: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
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
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full shrink-0">
                      {mobileReimbursements.length}
                    </span>
                  </div>
                  <span className="text-xs font-black text-amber-300 tabular-nums whitespace-nowrap shrink-0 text-right">
                    {formatPHP(totalReimbursementsSum)}
                  </span>
                </div>

                {mobileReimbursements.length === 0 ? (
                  <div className="p-4 text-center text-white/40 text-xs bg-[#07130e] rounded-xl border border-[#142e20]">
                    No pending abono requests
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mobileReimbursements.map((tx) =>
                      renderCard(tx, {
                        label: 'Pending Abono',
                        style: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#0a1811] rounded-t-2xl sm:rounded-2xl max-w-sm w-full p-5 border border-[#163325] shadow-2xl animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-150">
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3 sm:hidden" />
            <h3 className="text-sm font-bold text-white mb-1">
              Receipt / Disbursement Proof
            </h3>
            <div className="flex items-center gap-1 text-xs text-white/50 mb-3 min-w-0">
              <span className="truncate">{selectedReceipt.title}</span>
              <span className="text-white/20 mx-1 shrink-0">/</span>
              <span className="tabular-nums font-semibold text-emerald-400 shrink-0 whitespace-nowrap">{formatPHP(selectedReceipt.amount)}</span>
            </div>
            <div className="rounded-xl overflow-hidden bg-[#07130e] border border-[#163325] aspect-4/3 flex items-center justify-center mb-4">
              <img 
                src={selectedReceipt.receipt_url} 
                alt="Receipt" 
                className="w-full h-full object-contain" 
              />
            </div>
            <button
              onClick={() => setSelectedReceipt(null)}
              className="w-full h-9 bg-[#0c1e16] hover:bg-[#122b20] text-emerald-200 border border-[#1a382b] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
