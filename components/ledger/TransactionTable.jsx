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
  Wallet 
} from 'lucide-react';
import { formatPHP } from '@/lib/utils/currency';

export default function TransactionTable({ 
  transactions = [], 
  onNewTransaction, 
  onExportReport,
  currentRole 
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
    <div className="bg-white rounded-2xl border border-black/[0.06] shadow-xs overflow-hidden">
      
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-950 tracking-tight">
            Financial Ledger & Transactions
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            Real-time auditable record of organization inflows and disbursements
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Report (.docx) Button */}
          <button
            onClick={onExportReport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-black/[0.08] rounded-xl transition-all shadow-xs"
            title="Export 1:1 PDM CCS Formal Word Liquidation Report"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span>Export DOCX</span>
          </button>

          {/* New Transaction Button (Treasurer/Auditor) */}
          {(currentRole === 'treasurer' || currentRole === 'auditor') && (
            <button
              onClick={onNewTransaction}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Transaction</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="px-4 sm:px-5 py-3 bg-gray-50/70 border-b border-black/[0.04] flex flex-col sm:flex-row items-center justify-between gap-2.5">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search items, events, recipients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-white pl-8 pr-3 py-1.5 border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Records' },
            { id: 'INFLOW', label: 'Inflows (Income)' },
            { id: 'OUTFLOW', label: 'Outflows (Expenses)' },
            { id: 'REIMBURSEMENT', label: 'Pending Abono' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                filterType === tab.id
                  ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                  : 'text-gray-600 hover:bg-gray-200/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

      </div>

      {/* Transactions List / Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-black/[0.04] text-[11px] font-semibold text-gray-500 bg-gray-50/50 uppercase tracking-wider">
              <th className="py-2.5 px-4 sm:px-5">Transaction & Event</th>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Channel</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3 text-right">Amount</th>
              <th className="py-2.5 px-4 text-center">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.03] text-xs">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-gray-400 font-medium">
                  No matching transactions found.
                </td>
              </tr>
            ) : (
              filtered.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50/80 transition-colors">
                  
                  {/* Title & Event */}
                  <td className="py-3 px-4 sm:px-5">
                    <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                      {tx.type === 'INFLOW' ? (
                        <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <ArrowUpRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      )}
                      <span>{tx.title}</span>
                    </div>
                    {tx.event_name && (
                      <span className="text-[10px] font-medium text-gray-400 block mt-0.5">
                        {tx.event_name}
                      </span>
                    )}
                    {tx.is_reimbursement && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        <Clock className="w-2.5 h-2.5" />
                        Advance by: {tx.reimbursement_recipient || 'Officer'}
                      </span>
                    )}
                  </td>

                  {/* Date */}
                  <td className="py-3 px-3 text-gray-500 font-medium whitespace-nowrap">
                    {tx.transaction_date}
                  </td>

                  {/* Payment Channel */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    {tx.payment_method === 'CASH' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                        <Wallet className="w-3 h-3 text-emerald-600" />
                        Cash
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md">
                        <Smartphone className="w-3 h-3 text-blue-600" />
                        GCash
                      </span>
                    )}
                  </td>

                  {/* Category */}
                  <td className="py-3 px-3 text-gray-600 font-medium whitespace-nowrap">
                    <span className="bg-gray-100 text-gray-700 text-[11px] px-2 py-0.5 rounded-md">
                      {tx.category_name || (tx.type === 'INFLOW' ? 'Revenue' : 'Disbursement')}
                    </span>
                  </td>

                  {/* Amount */}
                  <td className={`py-3 px-3 text-right font-bold whitespace-nowrap ${
                    tx.type === 'INFLOW' ? 'text-emerald-700' : 'text-gray-900'
                  }`}>
                    {tx.type === 'INFLOW' ? '+' : '-'}{formatPHP(tx.amount)}
                  </td>

                  {/* Receipt Preview */}
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    {tx.receipt_url ? (
                      <button
                        onClick={() => setSelectedReceipt(tx)}
                        className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 font-medium bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md transition-colors"
                      >
                        <Receipt className="w-3 h-3" />
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

      {/* Receipt Modal Preview */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-black/10 shadow-lg">
            <h3 className="text-sm font-bold text-gray-900 mb-1">
              Receipt / Disbursement Proof
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              {selectedReceipt.title} • {formatPHP(selectedReceipt.amount)}
            </p>
            <div className="rounded-xl overflow-hidden bg-gray-100 border border-black/5 aspect-4/3 flex items-center justify-center mb-4">
              <img 
                src={selectedReceipt.receipt_url} 
                alt="Receipt" 
                className="w-full h-full object-contain" 
              />
            </div>
            <button
              onClick={() => setSelectedReceipt(null)}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition-colors"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
