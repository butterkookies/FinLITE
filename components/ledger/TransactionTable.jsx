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

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none flex-nowrap">
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

      {/* Mobile Transactions Card Feed (< md) */}
      <div className="md:hidden divide-y divide-white/10">
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-white/70 font-semibold text-xs">
            No matching transactions found.
          </div>
        ) : (
          filtered.map((tx) => (
            <div key={tx.id} className="p-3.5 space-y-2 hover:bg-white/10 transition-colors">
              {/* Top Row: Title, Type icon & Amount */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {tx.type === 'INFLOW' ? (
                    <ArrowDownRight className="w-4 h-4 text-emerald-300 shrink-0" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-amber-300 shrink-0" />
                  )}
                  <span className="font-bold text-white text-xs truncate">{tx.title}</span>
                </div>
                <span className={`font-black text-xs shrink-0 whitespace-nowrap tabular-nums ${
                  tx.type === 'INFLOW' ? 'text-emerald-300' : 'text-white'
                }`}>
                  {tx.type === 'INFLOW' ? '+' : '-'}{formatPHP(tx.amount)}
                </span>
              </div>

              {/* Middle Row: Date, Channel & Category */}
              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                <span className="text-white/70 font-medium text-[10px] shrink-0">{tx.transaction_date}</span>
                <span className="text-white/30 mx-0.5 shrink-0">/</span>
                {tx.payment_method === 'CASH' ? (
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-200 bg-emerald-950/40 border border-emerald-400/30 px-1.5 py-0.5 rounded text-[10px] shrink-0">
                    <Wallet className="w-3 h-3 text-emerald-300" />
                    Cash
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-medium text-blue-200 bg-blue-950/40 border border-blue-400/30 px-1.5 py-0.5 rounded text-[10px] shrink-0">
                    <Smartphone className="w-3 h-3 text-blue-300" />
                    GCash
                  </span>
                )}
                <span className="bg-white/15 border border-white/25 text-white px-1.5 py-0.5 rounded text-[10px] truncate max-w-[110px] sm:max-w-[160px]">
                  {tx.category_name || (tx.type === 'INFLOW' ? 'Revenue' : 'Disbursement')}
                </span>
              </div>

              {/* Bottom Row: Event, Advance note & Receipt Action */}
              {(tx.event_name || tx.is_reimbursement || tx.receipt_url) && (
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    {tx.event_name && (
                      <span className="text-[10px] text-white/70 font-medium truncate max-w-[140px] sm:max-w-[200px]">
                        {tx.event_name}
                      </span>
                    )}
                    {tx.is_reimbursement && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-200 bg-amber-950/40 border border-amber-400/30 px-1.5 py-0.5 rounded-md">
                        <Clock className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                        <span className="truncate max-w-[100px] sm:max-w-[160px]">Advance: {tx.reimbursement_recipient || 'Officer'}</span>
                      </span>
                    )}
                  </div>
                  {tx.receipt_url && (
                    <button
                      onClick={() => setSelectedReceipt(tx)}
                      className="h-7 inline-flex items-center gap-1 text-[11px] text-white hover:text-white font-medium bg-white/20 hover:bg-white/30 border border-white/30 px-2.5 rounded-lg transition-colors shrink-0 ml-auto cursor-pointer"
                    >
                      <Receipt className="w-3 h-3 text-emerald-300" />
                      Receipt
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

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
