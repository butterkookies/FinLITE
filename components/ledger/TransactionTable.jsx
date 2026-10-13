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
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Camera,
  Loader2,
  X
} from 'lucide-react';
import { formatPHP } from '@/lib/utils/currency';
import { compressReceiptImage } from '@/lib/utils/compression';
import { useTheme } from '@/components/theme/ThemeProvider';

export default function TransactionTable({ 
  transactions = [], 
  onNewTransaction, 
  onExportReport,
  onNewProposal,
  onAttachReceipt,
  currentRole,
  isDbConnected = false
}) {
  const { isLight } = useTheme();
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Post-entry attachment modal states
  const [attachTx, setAttachTx] = useState(null);
  const [attachFiles, setAttachFiles] = useState([]);
  const [attachPreviews, setAttachPreviews] = useState([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmittingAttach, setIsSubmittingAttach] = useState(false);
  const [attachError, setAttachError] = useState(null);

  const isAuthorized = currentRole === 'admin' || currentRole === 'treasurer' || currentRole === 'auditor';

  const getTransactionReceipts = (tx) => {
    if (!tx) return [];
    if (Array.isArray(tx.receipt_urls) && tx.receipt_urls.length > 0) {
      return tx.receipt_urls.filter(Boolean);
    }
    if (tx.receipt_url) {
      return [tx.receipt_url];
    }
    return [];
  };

  const handleAttachFilesChange = async (e) => {
    if (!attachTx) return;
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    const existingReceipts = getTransactionReceipts(attachTx);
    const availableSlots = 3 - (existingReceipts.length + attachFiles.length);
    if (availableSlots <= 0) {
      setAttachError('Maximum limit of 3 receipts reached for this transaction.');
      return;
    }

    setAttachError(null);
    setIsCompressing(true);

    const filesToProcess = selected.slice(0, availableSlots);
    const newFiles = [];
    const newUrls = [];

    try {
      for (const file of filesToProcess) {
        try {
          const compressed = await compressReceiptImage(file);
          newFiles.push(compressed);
          newUrls.push(URL.createObjectURL(compressed));
        } catch (err) {
          console.error(err);
          newFiles.push(file);
          newUrls.push(URL.createObjectURL(file));
        }
      }

      setAttachFiles((prev) => [...prev, ...newFiles]);
      setAttachPreviews((prev) => [...prev, ...newUrls]);
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachFile = (index) => {
    setAttachFiles((prev) => prev.filter((_, i) => i !== index));
    setAttachPreviews((prev) => {
      try { URL.revokeObjectURL(prev[index]); } catch (_) {}
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleConfirmAttach = async () => {
    if (!attachTx || attachFiles.length === 0) return;
    setIsSubmittingAttach(true);
    setAttachError(null);

    try {
      if (onAttachReceipt) {
        const res = await onAttachReceipt(attachTx.id, attachFiles);
        if (res && res.error) {
          setAttachError(res.error);
          setIsSubmittingAttach(false);
          return;
        }
      }
      // Clean up previews
      attachPreviews.forEach((url) => {
        try { URL.revokeObjectURL(url); } catch (_) {}
      });
      setAttachFiles([]);
      setAttachPreviews([]);
      setAttachTx(null);
    } catch (err) {
      setAttachError(err?.message || 'Failed to attach receipt.');
    } finally {
      setIsSubmittingAttach(false);
    }
  };

  const filtered = transactions.filter((tx) => {
    const matchesType = 
      filterType === 'ALL' ? true :
      filterType === 'REIMBURSEMENT' ? tx.is_reimbursement :
      tx.type === filterType;

    const matchesSearch = 
      (tx.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
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
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      {tx.is_reimbursement && (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${
                          isLight
                            ? 'text-amber-800 bg-amber-100/80 border-amber-300'
                            : 'text-amber-300 bg-amber-500/10 border-amber-500/20'
                        }`}>
                          <Clock className={`w-2.5 h-2.5 shrink-0 ${isLight ? 'text-amber-700' : 'text-amber-400'}`} />
                          <span className="truncate max-w-[160px]">Advance by: {tx.reimbursement_recipient || 'Officer'}</span>
                        </span>
                      )}
                      {(() => {
                        const loggerName = tx.logged_by_name || tx.logged_by_profile?.full_name;
                        const loggerRole = tx.logged_by_role || tx.logged_by_profile?.role;
                        if (!loggerName && !loggerRole) return null;
                        return (
                          <span 
                            className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border ${
                              isLight
                                ? 'text-gray-600 bg-gray-100 border-gray-200'
                                : 'text-white/60 bg-[#0c1e16] border-[#1a382b]'
                            }`}
                            title={`Recorded by: ${loggerName || ''} (${loggerRole || ''})`}
                          >
                            <span className={isLight ? 'text-gray-400' : 'text-white/40'}>By:</span>
                            <span className={`font-medium ${isLight ? 'text-gray-800' : 'text-white/80'}`}>{loggerName || 'Officer'}</span>
                            {loggerRole && (
                              <span className={`text-[9px] uppercase tracking-wider font-medium ${isLight ? 'text-gray-400' : 'text-white/40'}`}>({loggerRole})</span>
                            )}
                          </span>
                        );
                      })()}
                    </div>
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

                  {/* Receipt Preview & Action */}
                  <td className="py-3.5 px-5 text-center whitespace-nowrap">
                    {(() => {
                      const receipts = getTransactionReceipts(tx);
                      if (receipts.length > 0) {
                        return (
                          <button
                            onClick={() => {
                              setSelectedReceipt(tx);
                              setActivePhotoIndex(0);
                            }}
                            className={`h-7 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 rounded-lg transition-colors cursor-pointer border ${
                              isLight
                                ? 'text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                                : 'text-emerald-300 hover:text-emerald-200 bg-[#0c1e16] hover:bg-[#122b20] border-[#1a382b]'
                            }`}
                            title={`View ${receipts.length} attached receipt photo${receipts.length > 1 ? 's' : ''}`}
                          >
                            <Receipt className={`w-3 h-3 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                            <span>{receipts.length > 1 ? `Receipts (${receipts.length})` : 'Receipt'}</span>
                          </button>
                        );
                      }
                      if (isAuthorized) {
                        return (
                          <button
                            onClick={() => {
                              setAttachTx(tx);
                              setAttachFiles([]);
                              setAttachPreviews([]);
                              setAttachError(null);
                            }}
                            className={`h-7 inline-flex items-center gap-1 text-[11px] font-semibold px-2 rounded-lg transition-colors cursor-pointer border border-dashed ${
                              isLight
                                ? 'text-emerald-700 hover:text-emerald-900 bg-emerald-50/70 hover:bg-emerald-100/80 border-emerald-300'
                                : 'text-emerald-300 hover:text-emerald-200 bg-[#0c1e16]/70 hover:bg-[#122b20] border-emerald-500/40'
                            }`}
                            title="Attach receipt or proof for this transaction"
                          >
                            <Plus className={`w-3 h-3 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                            <span>Attach</span>
                          </button>
                        );
                      }
                      return <span className={`text-[11px] italic ${isLight ? 'text-gray-400' : 'text-white/40'}`}>None</span>;
                    })()}
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

        const renderCard = (tx, badgeConfig) => {
          const receipts = getTransactionReceipts(tx);
          return (
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
              {receipts.length > 0 ? (
                <button
                  onClick={() => {
                    setSelectedReceipt(tx);
                    setActivePhotoIndex(0);
                  }}
                  className={`w-full mt-2 h-9 flex items-center justify-center gap-1.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs border ${
                    isLight
                      ? 'text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                      : 'text-emerald-300 bg-[#0d1e16] hover:bg-[#122b20] active:bg-[#163527] border-[#1a382b]'
                  }`}
                >
                  <Receipt className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                  <span>{receipts.length > 1 ? `View Receipts (${receipts.length})` : 'View Receipt Details'}</span>
                </button>
              ) : isAuthorized ? (
                <button
                  onClick={() => {
                    setAttachTx(tx);
                    setAttachFiles([]);
                    setAttachPreviews([]);
                    setAttachError(null);
                  }}
                  className={`w-full mt-2 h-9 flex items-center justify-center gap-1.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer border border-dashed ${
                    isLight
                      ? 'text-emerald-700 hover:text-emerald-900 bg-emerald-50/70 hover:bg-emerald-100/80 border-emerald-300'
                      : 'text-emerald-300 hover:text-emerald-200 bg-[#0d1e16]/70 hover:bg-[#122b20] border-emerald-500/40'
                  }`}
                >
                  <Plus className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                  <span>Attach Receipt / Proof</span>
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
        };

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
            {(filterType === 'ALL' || filterType === 'INFLOW') && (mobileInflows.length > 0 || !searchQuery) && (
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
            {(filterType === 'ALL' || filterType === 'OUTFLOW') && (mobileOutflows.length > 0 || !searchQuery) && (
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
            {(filterType === 'ALL' || filterType === 'REIMBURSEMENT') && (mobileReimbursements.length > 0 || !searchQuery) && (
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

      {/* Receipt Modal Preview (Multi-Receipt Carousel) */}
      {selectedReceipt && (() => {
        const viewReceipts = getTransactionReceipts(selectedReceipt);
        const currentPhotoUrl = viewReceipts[activePhotoIndex] || viewReceipts[0] || selectedReceipt.receipt_url;

        const handlePrevPhoto = (e) => {
          e.stopPropagation();
          setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : viewReceipts.length - 1));
        };

        const handleNextPhoto = (e) => {
          e.stopPropagation();
          setActivePhotoIndex((prev) => (prev < viewReceipts.length - 1 ? prev + 1 : 0));
        };

        return (
          <div 
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setSelectedReceipt(null)}
          >
            <div 
              className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 border border-black/[0.08] shadow-2xl animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3 sm:hidden shrink-0" />
              
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3 shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Official Receipt
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                      {selectedReceipt.transaction_date}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-gray-950 mt-1 truncate">
                    {selectedReceipt.title}
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Amount: <span className="tabular-nums font-bold text-gray-950">{formatPHP(selectedReceipt.amount)}</span>
                    {selectedReceipt.payment_method && (
                      <span className="ml-2 text-gray-400">· via {selectedReceipt.payment_method}</span>
                    )}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Receipt Image Display with Carousel Controls */}
              <div className="relative rounded-2xl overflow-hidden bg-gray-950/5 border border-black/[0.08] flex-1 min-h-[220px] max-h-[48vh] flex items-center justify-center mb-3 group">
                <img 
                  key={currentPhotoUrl}
                  src={currentPhotoUrl} 
                  alt={`Official Disbursement Receipt ${activePhotoIndex + 1}`} 
                  className="w-full h-full object-contain max-h-[48vh]" 
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden p-6 text-center text-gray-500 text-xs">
                  Unable to preview receipt image.
                </div>

                {viewReceipts.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevPhoto}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                      title="Previous photo"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextPhoto}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                      title="Next photo"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-semibold tracking-wide backdrop-blur-xs">
                      {activePhotoIndex + 1} / {viewReceipts.length}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnail Strip (if multiple photos) */}
              {viewReceipts.length > 1 && (
                <div className="flex items-center justify-center gap-2 mb-3 shrink-0">
                  {viewReceipts.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActivePhotoIndex(idx)}
                      className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        idx === activePhotoIndex
                          ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-black/10 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] font-bold text-white text-center py-0.5">
                        #{idx + 1}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={currentPhotoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 h-9 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-800 border border-black/[0.08] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Open Full Image</span>
                </a>

                {/* Add Photo Button if < 3 and authorized */}
                {isAuthorized && viewReceipts.length < 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      const txToAttach = selectedReceipt;
                      setSelectedReceipt(null);
                      setAttachTx(txToAttach);
                      setAttachFiles([]);
                      setAttachPreviews([]);
                      setAttachError(null);
                    }}
                    className="h-9 px-3 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Add another photo proof (up to 3 max)"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-700" />
                    <span>+ Add Photo ({viewReceipts.length}/3)</span>
                  </button>
                )}

                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="px-4 h-9 bg-gray-900 hover:bg-gray-800 active:bg-black text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Attach Receipt Modal (Post-Entry) */}
      {attachTx && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => {
            if (!isSubmittingAttach) setAttachTx(null);
          }}
        >
          <div 
            className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 border border-black/[0.08] shadow-2xl animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Pull Handle */}
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3 sm:hidden shrink-0" />

            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4 shrink-0">
              <div className="min-w-0">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Attach Receipts &amp; Proofs
                </span>
                <h3 className="text-base font-bold text-gray-950 mt-1 truncate">
                  {attachTx.title}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Amount: <span className="font-bold text-gray-900 tabular-nums">{formatPHP(attachTx.amount)}</span> · {attachTx.transaction_date}
                </p>
              </div>

              <button
                disabled={isSubmittingAttach}
                onClick={() => setAttachTx(null)}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Existing Receipts Display (if any) */}
            {(() => {
              const existing = getTransactionReceipts(attachTx);
              const remaining = Math.max(0, 3 - existing.length - attachFiles.length);

              return (
                <div className="space-y-4 text-xs overflow-y-auto">
                  {existing.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-gray-700">
                        Existing Attached Proofs ({existing.length}/3)
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {existing.map((url, idx) => (
                          <div key={idx} className="relative rounded-xl overflow-hidden border border-black/[0.08] bg-gray-100 aspect-square">
                            <img src={url} alt={`Existing ${idx + 1}`} className="w-full h-full object-cover" />
                            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-[9px] font-semibold text-white">
                              Saved #{idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New Photo Upload Area */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-gray-700">
                        Add New Photos (Max {3 - existing.length} more)
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {remaining} slot{remaining === 1 ? '' : 's'} remaining
                      </span>
                    </div>

                    {/* Previews of newly selected files */}
                    {attachPreviews.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {attachPreviews.map((url, idx) => (
                          <div key={idx} className="relative group rounded-xl overflow-hidden border border-emerald-300 bg-gray-50 aspect-square">
                            <img src={url} alt={`New upload ${idx + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachFile(idx)}
                              disabled={isSubmittingAttach}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-colors cursor-pointer"
                              title="Remove photo"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-emerald-700 rounded text-[9px] font-semibold text-white">
                              New #{idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pick File Button */}
                    {remaining > 0 && (
                      <label className="h-10 flex items-center justify-center gap-2 px-3 bg-white hover:bg-gray-50 active:bg-gray-100 border border-dashed border-gray-300 rounded-xl cursor-pointer transition-colors shadow-2xs">
                        <Camera className="w-4 h-4 text-emerald-700" />
                        <span className="text-gray-700 font-medium">
                          {isCompressing ? 'Compressing photo...' : attachFiles.length === 0 ? 'Select or Take Photo' : `Add Another (${remaining} left)`}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={isCompressing || isSubmittingAttach}
                          onChange={handleAttachFilesChange}
                          className="hidden"
                        />
                      </label>
                    )}

                    <p className="text-[10px] text-gray-400">
                      Images are automatically compressed to &lt;350KB before upload.
                    </p>
                  </div>

                  {attachError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                      {attachError}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-black/[0.06]">
                    <button
                      type="button"
                      disabled={isSubmittingAttach}
                      onClick={() => setAttachTx(null)}
                      className="h-9 px-4 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingAttach || attachFiles.length === 0}
                      onClick={handleConfirmAttach}
                      className="h-9 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmittingAttach ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <span>Upload &amp; Attach ({attachFiles.length})</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      )}

    </div>
  );
}
