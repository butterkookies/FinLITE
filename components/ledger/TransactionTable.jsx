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
  Folder,
  X
} from 'lucide-react';
import { formatPHP } from '@/lib/utils/currency';
import { useTheme } from '@/components/theme/ThemeProvider';

export default function TransactionTable({ 
  transactions = [], 
  onNewTransaction, 
  onExportReport,
  onNewProposal,
  currentRole,
  isDbConnected = false
}) {
  const { isLight } = useTheme();
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
    <div className={`rounded-3xl border transition-all relative overflow-hidden shadow-xl ${
      isLight
        ? 'border-emerald-600/15 bg-gradient-to-br from-[#f8fbf9]/95 via-[#f2f7f4]/90 to-[#e6f1ea]/85 backdrop-blur-xl shadow-emerald-950/5'
        : 'border-emerald-500/20 bg-[#082218]/85 backdrop-blur-xl shadow-2xl shadow-black/30'
    }`}>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-400/40 to-emerald-500/0 pointer-events-none" />
      
      {/* Table Header Controls */}
      <div className={`p-5 sm:p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        isLight ? 'border-emerald-900/10 bg-emerald-50/20' : 'border-emerald-500/15'
      }`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${
              isLight ? 'text-gray-900' : 'text-white'
            }`}>
              Financial Ledger &amp; Transactions
            </h2>
            {isDbConnected && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 border ${
                isLight
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}>
                Live
              </span>
            )}
          </div>
          <p className={`text-xs font-medium mt-1 truncate ${
            isLight ? 'text-emerald-900/60' : 'text-white/50'
          }`}>
            Real-time auditable record of organization inflows and disbursements
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 w-full sm:w-auto shrink-0">
          {/* Create Business Proposal Button */}
          <button
            onClick={onNewProposal}
            className={`h-10 flex items-center justify-center gap-2 px-4 text-xs font-semibold rounded-xl transition-all shadow-xs whitespace-nowrap cursor-pointer border ${
              isLight
                ? 'text-emerald-900 bg-emerald-50/80 hover:bg-emerald-100 border-emerald-200 hover:border-emerald-300'
                : 'text-emerald-200 bg-[#0d1e16] hover:bg-[#122b20] active:bg-[#163527] border-[#1a382b] hover:border-emerald-500/40'
            }`}
            title="Create Pre-Activity Business Proposal & Booth Budget"
          >
            <Calculator className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
            <span>Create Proposal</span>
          </button>

          {/* Review & Export Report Button */}
          <button
            onClick={onExportReport}
            className={`h-10 flex items-center justify-center gap-2 px-4 text-xs font-semibold rounded-xl transition-all shadow-xs whitespace-nowrap cursor-pointer border ${
              isLight
                ? 'text-emerald-900 bg-emerald-50/80 hover:bg-emerald-100 border-emerald-200 hover:border-emerald-300'
                : 'text-emerald-200 bg-[#0d1e16] hover:bg-[#122b20] active:bg-[#163527] border-[#1a382b] hover:border-emerald-500/40'
            }`}
            title="Preview 1:1 PDM CCS Formal Word Liquidation Report & Live Edit"
          >
            <FileText className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
            <span>Preview Report</span>
          </button>

          {/* New Transaction Button (Admin/Treasurer/Auditor) */}
          {(currentRole === 'admin' || currentRole === 'treasurer' || currentRole === 'auditor') && (
            <button
              onClick={onNewTransaction}
              className={`col-span-2 sm:col-span-1 h-10 flex items-center justify-center gap-2 px-4.5 text-xs font-black rounded-xl transition-all shadow-lg whitespace-nowrap cursor-pointer ${
                isLight
                  ? 'text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-600/20'
                  : 'text-black bg-[#10b981] hover:bg-[#059669] active:bg-[#047857] shadow-emerald-500/20'
              }`}
            >
              <Plus className="w-4 h-4 shrink-0 stroke-[3]" />
              <span>Record Transaction</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={`px-5 sm:px-6 py-3.5 border-b flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${
        isLight ? 'border-emerald-900/10 bg-gradient-to-r from-emerald-50/50 via-teal-50/40 to-emerald-50/50' : 'border-[#142e20] bg-transparent'
      }`}>
        
        {/* Search Input */}
        <div className="relative w-full sm:w-80 shrink-0">
          <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
            isLight ? 'text-emerald-800/40' : 'text-white/40'
          }`} />
          <input
            type="text"
            placeholder="Search items, events, recipients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full h-9 text-xs rounded-xl pl-8.5 pr-3 transition-all select-text shadow-inner focus:outline-none focus:ring-1 ${
              isLight
                ? 'bg-white/95 focus:bg-white border border-emerald-300/80 text-emerald-950 placeholder:text-gray-400 focus:border-emerald-600 focus:ring-emerald-500/20'
                : 'bg-[#06120c] focus:bg-[#091a11] border border-[#163325] focus:border-emerald-500/50 text-white placeholder:text-white/40 focus:ring-emerald-500/30'
            }`}
          />
        </div>

        {/* Filter Tabs */}
        <div className={`grid grid-cols-2 sm:flex sm:items-center gap-1.5 p-1 rounded-2xl sm:rounded-full border w-full sm:w-auto ${
          isLight ? 'bg-emerald-100/50 border-emerald-200/80' : 'bg-[#06120c] border-[#163325]'
        }`}>
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
                  ? isLight
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-[#10b981] text-black shadow-md'
                  : isLight
                    ? 'text-emerald-900/75 hover:text-emerald-950 hover:bg-white/80'
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
            <tr className={`border-b text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${
              isLight
                ? 'border-emerald-900/10 text-emerald-900/70 bg-gradient-to-r from-emerald-100/40 via-teal-50/40 to-emerald-100/40'
                : 'border-[#142e20] text-white/40 bg-transparent'
            }`}>
              <th className="py-3 px-5 sm:px-6">Transaction &amp; Event</th>
              <th className="py-3 px-3 whitespace-nowrap">Date</th>
              <th className="py-3 px-3 whitespace-nowrap">Channel</th>
              <th className="py-3 px-3 whitespace-nowrap">Category</th>
              <th className="py-3 px-3 text-right whitespace-nowrap">Amount</th>
              <th className="py-3 px-5 text-center whitespace-nowrap">Receipt</th>
            </tr>
          </thead>
          <tbody className={`divide-y text-xs ${
            isLight ? 'divide-emerald-900/10' : 'divide-[#142e20]/60'
          }`}>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-16 text-center">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-inner border ${
                    isLight
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      : 'bg-[#064e3b]/30 text-emerald-400 border-emerald-500/20'
                  }`}>
                    <Folder className="w-6 h-6" />
                  </div>
                  <p className={`text-xs font-medium ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
                    No matching transactions found.
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((tx) => (
                <tr key={tx.id} className={`transition-colors ${
                  isLight ? 'hover:bg-emerald-50/50' : 'hover:bg-white/[0.02]'
                }`}>
                  
                  {/* Title & Event */}
                  <td className="py-3.5 px-5 sm:px-6 max-w-[260px]">
                    <div className={`font-bold flex items-center gap-1.5 ${
                      isLight ? 'text-gray-900' : 'text-white'
                    }`}>
                      {tx.type === 'INFLOW' ? (
                        <ArrowDownRight className={`w-4 h-4 shrink-0 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                      ) : (
                        <ArrowUpRight className={`w-4 h-4 shrink-0 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                      )}
                      <span className="truncate">{tx.title}</span>
                    </div>
                    {tx.event_name && (
                      <span className={`text-[10px] font-medium block mt-0.5 truncate ${
                        isLight ? 'text-gray-500' : 'text-white/50'
                      }`}>
                        {tx.event_name}
                      </span>
                    )}
                    {tx.is_reimbursement && (
                      <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${
                        isLight
                          ? 'text-amber-800 bg-amber-100/80 border-amber-300'
                          : 'text-amber-300 bg-amber-500/10 border-amber-500/20'
                      }`}>
                        <Clock className={`w-2.5 h-2.5 shrink-0 ${isLight ? 'text-amber-700' : 'text-amber-400'}`} />
                        <span className="truncate max-w-[160px]">Advance by: {tx.reimbursement_recipient || 'Officer'}</span>
                      </span>
                    )}
                  </td>

                  {/* Date */}
                  <td className={`py-3.5 px-3 font-medium whitespace-nowrap ${
                    isLight ? 'text-gray-700' : 'text-white/70'
                  }`}>
                    {tx.transaction_date}
                  </td>

                  {/* Payment Channel */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    {tx.payment_method === 'CASH' ? (
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                        isLight
                          ? 'text-emerald-800 bg-emerald-100/90 border-emerald-300'
                          : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
                      }`}>
                        <Wallet className={`w-3 h-3 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
                        Cash
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                        isLight
                          ? 'text-sky-800 bg-sky-100/90 border-sky-300'
                          : 'text-blue-300 bg-blue-500/10 border-blue-500/20'
                      }`}>
                        <Smartphone className={`w-3 h-3 ${isLight ? 'text-sky-700' : 'text-blue-400'}`} />
                        GCash
                      </span>
                    )}
                  </td>

                  {/* Category */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold border ${
                      isLight
                        ? 'bg-gray-100 border-gray-200 text-gray-800'
                        : 'bg-[#0c1e16] border-[#1a382b] text-white/90'
                    }`}>
                      {tx.category_name || (tx.type === 'INFLOW' ? 'Revenue' : 'Disbursement')}
                    </span>
                  </td>

                  {/* Amount */}
                  <td className={`py-3.5 px-3 text-right font-black whitespace-nowrap tabular-nums text-sm ${
                    tx.type === 'INFLOW' 
                      ? isLight ? 'text-emerald-600' : 'text-emerald-400' 
                      : isLight ? 'text-gray-900' : 'text-white'
                  }`}>
                    {tx.type === 'INFLOW' ? '+' : '-'}{formatPHP(tx.amount)}
                  </td>

                  {/* Receipt Preview */}
                  <td className="py-3.5 px-5 text-center whitespace-nowrap">
                    {tx.receipt_url ? (
                      <button
                        onClick={() => setSelectedReceipt(tx)}
                        className={`h-7 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 rounded-lg transition-colors cursor-pointer border ${
                          isLight
                            ? 'text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                            : 'text-emerald-300 hover:text-emerald-200 bg-[#0c1e16] hover:bg-[#122b20] border-[#1a382b]'
                        }`}
                      >
                        <Receipt className={`w-3 h-3 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                        View
                      </button>
                    ) : (
                      <span className={`text-[11px] italic ${isLight ? 'text-gray-400' : 'text-white/40'}`}>None</span>
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
            className={`rounded-2xl border p-4.5 space-y-3 transition-all ${
              isLight
                ? 'bg-gradient-to-br from-white/95 to-[#f3faf6]/90 border-emerald-600/15 shadow-xs'
                : 'bg-[#0c1b14] border-[#163325]'
            }`}
          >
            {/* Top Row: Amount on left & Status pill badge on right */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider block mb-0.5 ${
                  isLight ? 'text-gray-500' : 'text-white/40'
                }`}>
                  {tx.type === 'INFLOW' ? 'Inflow Amount' : 'Disbursement Amount'}
                </span>
                <span
                  className={`text-xl font-black tracking-tight tabular-nums block whitespace-nowrap ${
                    tx.type === 'INFLOW' 
                      ? isLight ? 'text-emerald-600' : 'text-emerald-400' 
                      : isLight ? 'text-gray-900' : 'text-white'
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
            <div className={`space-y-2 pt-2.5 border-t text-xs ${
              isLight ? 'border-gray-100' : 'border-[#142e20]'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <span className={`font-medium shrink-0 ${isLight ? 'text-gray-500' : 'text-white/50'}`}>Transaction</span>
                <span className={`font-bold text-right truncate max-w-[200px] ${isLight ? 'text-gray-900' : 'text-white'}`}>{tx.title}</span>
              </div>

              {tx.event_name && (
                <div className="flex items-center justify-between gap-3">
                  <span className={`font-medium shrink-0 ${isLight ? 'text-gray-500' : 'text-white/50'}`}>Event</span>
                  <span className={`font-medium text-right truncate max-w-[200px] ${isLight ? 'text-gray-700' : 'text-white/80'}`}>{tx.event_name}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <span className={`font-medium shrink-0 ${isLight ? 'text-gray-500' : 'text-white/50'}`}>Date</span>
                <span className={`font-semibold tabular-nums ${isLight ? 'text-gray-700' : 'text-white/80'}`}>{tx.transaction_date}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className={`font-medium shrink-0 ${isLight ? 'text-gray-500' : 'text-white/50'}`}>Payment Channel</span>
                <span className={`inline-flex items-center gap-1 font-semibold ${isLight ? 'text-gray-900' : 'text-white/90'}`}>
                  {tx.payment_method === 'CASH' ? (
                    <>
                      <Wallet className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                      <span>Cash</span>
                    </>
                  ) : (
                    <>
                      <Smartphone className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-blue-400'}`} />
                      <span>GCash</span>
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className={`font-medium shrink-0 ${isLight ? 'text-gray-500' : 'text-white/50'}`}>Category</span>
                <span className={`font-semibold ${isLight ? 'text-gray-700' : 'text-white/80'}`}>{tx.category_name || (tx.type === 'INFLOW' ? 'Revenue' : 'Disbursement')}</span>
              </div>

              {tx.is_reimbursement && tx.reimbursement_recipient && (
                <div className="flex items-center justify-between gap-3">
                  <span className={`font-medium shrink-0 ${isLight ? 'text-gray-500' : 'text-white/50'}`}>Advance By</span>
                  <span className={`font-bold ${isLight ? 'text-amber-800' : 'text-amber-300'}`}>{tx.reimbursement_recipient}</span>
                </div>
              )}
            </div>

            {/* Bottom Full-Width Action Button */}
            {tx.receipt_url ? (
              <button
                onClick={() => setSelectedReceipt(tx)}
                className={`w-full mt-2 h-9 flex items-center justify-center gap-1.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs border ${
                  isLight
                    ? 'text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                    : 'text-emerald-300 bg-[#0d1e16] hover:bg-[#122b20] active:bg-[#163527] border-[#1a382b]'
                }`}
              >
                <Receipt className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                <span>View Receipt Details</span>
              </button>
            ) : (
              <div className={`w-full mt-2 h-8 flex items-center justify-center text-[11px] font-medium rounded-xl border ${
                isLight
                  ? 'text-gray-400 bg-gray-50 border-gray-200'
                  : 'text-white/30 bg-[#07130e] border-[#142e20]'
              }`}>
                <span>No Receipt Attached</span>
              </div>
            )}
          </div>
        );

        return (
          <div className="md:hidden p-4 space-y-6">

            {/* Global Empty State */}
            {mobileInflows.length === 0 && mobileOutflows.length === 0 && mobileReimbursements.length === 0 && (
              <div className={`py-12 text-center font-semibold text-xs rounded-2xl border p-6 ${
                isLight
                  ? 'text-gray-500 bg-white border-emerald-900/10'
                  : 'text-white/50 bg-[#07130e] border-[#142e20]'
              }`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-inner border ${
                  isLight
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : 'bg-[#064e3b]/30 text-emerald-400 border-emerald-500/20'
                }`}>
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
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <h3 className={`text-xs font-bold uppercase tracking-wider truncate ${
                      isLight ? 'text-gray-900' : 'text-white'
                    }`}>
                      <span className="sm:hidden">Inflows</span>
                      <span className="hidden sm:inline">Inflows &amp; Revenue</span>
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                      isLight
                        ? 'text-emerald-800 bg-emerald-100 border-emerald-200'
                        : 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
                    }`}>
                      {mobileInflows.length}
                    </span>
                  </div>
                  <span className={`text-xs font-black tabular-nums whitespace-nowrap shrink-0 text-right ${
                    isLight ? 'text-emerald-700' : 'text-emerald-400'
                  }`}>
                    +{formatPHP(totalInflowsSum)}
                  </span>
                </div>

                {mobileInflows.length === 0 ? (
                  <div className={`p-4 text-center text-xs rounded-xl border ${
                    isLight ? 'text-gray-400 bg-white border-gray-100' : 'text-white/40 bg-[#07130e] border-[#142e20]'
                  }`}>
                    No inflow records found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mobileInflows.map((tx) =>
                      renderCard(tx, {
                        label: tx.category_name || 'Revenue',
                        style: isLight
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
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
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <h3 className={`text-xs font-bold uppercase tracking-wider truncate ${
                      isLight ? 'text-gray-900' : 'text-white'
                    }`}>
                      <span className="sm:hidden">Outflows</span>
                      <span className="hidden sm:inline">Outflows &amp; Disbursements</span>
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                      isLight
                        ? 'text-amber-800 bg-amber-100 border-amber-200'
                        : 'text-amber-300 bg-amber-500/15 border-amber-500/30'
                    }`}>
                      {mobileOutflows.length}
                    </span>
                  </div>
                  <span className={`text-xs font-black tabular-nums whitespace-nowrap shrink-0 text-right ${
                    isLight ? 'text-gray-900' : 'text-white'
                  }`}>
                    -{formatPHP(totalOutflowsSum)}
                  </span>
                </div>

                {mobileOutflows.length === 0 ? (
                  <div className={`p-4 text-center text-xs rounded-xl border ${
                    isLight ? 'text-gray-400 bg-white border-gray-100' : 'text-white/40 bg-[#07130e] border-[#142e20]'
                  }`}>
                    No outflow records found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mobileOutflows.map((tx) =>
                      renderCard(tx, {
                        label: tx.category_name || 'Disbursement',
                        style: isLight
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30',
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
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <h3 className={`text-xs font-bold uppercase tracking-wider truncate ${
                      isLight ? 'text-gray-900' : 'text-white'
                    }`}>
                      <span className="sm:hidden">Pending Abono</span>
                      <span className="hidden sm:inline">Pending Abono (Advances)</span>
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                      isLight
                        ? 'text-amber-800 bg-amber-100 border-amber-200'
                        : 'text-amber-300 bg-amber-500/15 border-amber-500/30'
                    }`}>
                      {mobileReimbursements.length}
                    </span>
                  </div>
                  <span className={`text-xs font-black tabular-nums whitespace-nowrap shrink-0 text-right ${
                    isLight ? 'text-amber-800' : 'text-amber-300'
                  }`}>
                    {formatPHP(totalReimbursementsSum)}
                  </span>
                </div>

                {mobileReimbursements.length === 0 ? (
                  <div className={`p-4 text-center text-xs rounded-xl border ${
                    isLight ? 'text-gray-400 bg-white border-gray-100' : 'text-white/40 bg-[#07130e] border-[#142e20]'
                  }`}>
                    No pending abono requests
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mobileReimbursements.map((tx) =>
                      renderCard(tx, {
                        label: 'Pending Abono',
                        style: isLight
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                      })
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        );
      })()}

      {/* Receipt Modal Preview — Clean White Card with High-Contrast Readable Text */}
      {selectedReceipt && (
        <div 
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedReceipt(null)}
        >
          <div 
            className="rounded-3xl max-w-sm sm:max-w-md w-full p-5 sm:p-6 border border-gray-200/90 shadow-2xl bg-white text-gray-900 animate-in zoom-in-95 duration-150 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile handle indicator */}
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3.5 sm:hidden" />

            {/* Header: Title and Close button */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Receipt className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-950 tracking-tight leading-tight">
                    Receipt / Disbursement Proof
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                title="Close Preview"
              >
                <X className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>

            {/* Subtitle Info Badge */}
            <div className="flex items-center justify-between gap-2 text-xs mb-3.5 bg-gray-50 border border-gray-200/80 rounded-xl px-3 py-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-semibold text-gray-800 truncate" title={selectedReceipt.title}>
                  {selectedReceipt.title}
                </span>
                {selectedReceipt.category_name && (
                  <span className="text-[10px] text-gray-500 hidden sm:inline">
                    • {selectedReceipt.category_name}
                  </span>
                )}
              </div>
              <span className="tabular-nums font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-md border border-emerald-300/60 whitespace-nowrap text-xs shrink-0">
                {formatPHP(selectedReceipt.amount)}
              </span>
            </div>

            {/* Receipt Image Display Box */}
            <div className="rounded-2xl overflow-hidden aspect-4/3 flex items-center justify-center mb-4 bg-gray-100/90 border border-gray-200 shadow-inner relative">
              <img 
                src={selectedReceipt.receipt_url} 
                alt="Receipt Document" 
                className="w-full h-full object-contain p-1" 
              />
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center gap-2">
              {selectedReceipt.receipt_url && (
                <a
                  href={selectedReceipt.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 px-3.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors border border-gray-200 shrink-0"
                  title="Open full size image in new tab"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Full Image</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="flex-1 h-10 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white shadow-sm flex items-center justify-center"
              >
                Close Preview
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
