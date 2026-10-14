'use client';
import { useState, useMemo } from 'react';
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
  X,
  CheckCircle2,
  HandCoins,
  Check,
  AlertTriangle
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
  onSettleReimbursement,
  cashBalance = 0,
  gcashBalance = 0,
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

  // Settle abono advance modal states
  const [settleTx, setSettleTx] = useState(null);
  const [settleMethod, setSettleMethod] = useState('CASH');
  const [isSubmittingSettle, setIsSubmittingSettle] = useState(false);
  const [settleError, setSettleError] = useState(null);
  const [settleToast, setSettleToast] = useState(null);

  // Expanded transaction details modal state
  const [selectedTx, setSelectedTx] = useState(null);
  const [activeTxPhotoIndex, setActiveTxPhotoIndex] = useState(0);

  const isAuthorized = currentRole === 'admin' || currentRole === 'treasurer' || currentRole === 'auditor';
  const canSettleAbono = currentRole === 'admin' || currentRole === 'treasurer' || currentRole === 'president' || currentRole === 'adviser';

  const handleConfirmSettle = async () => {
    if (!settleTx) return;
    setIsSubmittingSettle(true);
    setSettleError(null);

    const isGcash = settleMethod === 'GCASH';
    const available = Number(isGcash ? gcashBalance : cashBalance) || 0;
    if (Number(settleTx.amount || 0) > available) {
      const channelLabel = isGcash ? 'GCash Wallet' : 'Physical Cashbox';
      setSettleError(`Insufficient ${channelLabel} balance. Available: ${formatPHP(available)}`);
      setIsSubmittingSettle(false);
      return;
    }

    try {
      if (onSettleReimbursement) {
        const res = await onSettleReimbursement(settleTx.id, { paymentMethod: settleMethod });
        if (res && res.error) {
          setSettleError(res.error);
          setIsSubmittingSettle(false);
          return;
        }
      }
      setSettleToast(`Successfully disbursed ${formatPHP(settleTx.amount)} to ${settleTx.reimbursement_recipient || 'claimant'}.`);
      setTimeout(() => setSettleToast(null), 4000);
      if (selectedTx && selectedTx.id === settleTx.id) {
        setSelectedTx((prev) => prev ? { ...prev, status: 'REIMBURSED', payment_method: settleMethod } : null);
      }
      setSettleTx(null);
    } catch (err) {
      setSettleError(err?.message || 'Failed to settle reimbursement.');
    } finally {
      setIsSubmittingSettle(false);
    }
  };

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

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return transactions.filter((tx) => {
      const matchesType = 
        filterType === 'ALL' ? true :
        filterType === 'REIMBURSEMENT' ? tx.is_reimbursement :
        tx.type === filterType;

      if (!matchesType) return false;
      if (!query) return true;

      return (
        (tx.title || '').toLowerCase().includes(query) ||
        (tx.description && tx.description.toLowerCase().includes(query)) ||
        (tx.event_name && tx.event_name.toLowerCase().includes(query)) ||
        (tx.reimbursement_recipient && tx.reimbursement_recipient.toLowerCase().includes(query))
      );
    });
  }, [transactions, filterType, searchQuery]);

  return (
    <div className={`rounded-2xl sm:rounded-3xl transition-colors relative overflow-hidden border ${
      isLight
        ? 'bg-white border-zinc-200/80 shadow-xs'
        : 'bg-[#0a2419]/90 border-emerald-900/40 shadow-xs'
    }`}>
      {/* Table Header Controls */}
      <div className={`p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        isLight ? 'border-zinc-200/80 bg-zinc-50/50' : 'border-emerald-500/15'
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
              className={`col-span-2 sm:col-span-1 h-10 flex items-center justify-center gap-2 px-4.5 text-xs font-bold rounded-xl transition-all shadow-md whitespace-nowrap cursor-pointer ${
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
      <div className={`px-4 sm:px-6 py-3 border-b flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 ${
        isLight ? 'border-zinc-200/90 bg-zinc-50/50' : 'border-[#142e20] bg-transparent'
      }`}>
        
        {/* Search Input */}
        <div className="relative w-full sm:w-80 shrink-0">
          <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
            isLight ? 'text-zinc-400' : 'text-white/40'
          }`} />
          <input
            type="text"
            placeholder="Search items, events, recipients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full h-9 text-xs rounded-xl pl-8.5 pr-3 transition-all select-text shadow-2xs focus:outline-none focus:ring-2 ${
              isLight
                ? 'bg-white focus:bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-emerald-500/20'
                : 'bg-[#06120c] focus:bg-[#091a11] border border-[#163325] focus:border-emerald-500/50 text-white placeholder:text-white/40 focus:ring-emerald-500/30'
            }`}
          />
        </div>

        {/* Filter Tabs */}
        <div className={`flex overflow-x-auto scrollbar-none items-center gap-1 sm:gap-1.5 p-1 rounded-xl sm:rounded-full border w-full sm:w-auto shrink-0 ${
          isLight ? 'bg-zinc-100/80 border-zinc-200' : 'bg-[#06120c] border-[#163325]'
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
              className={`h-7 sm:h-8 px-3 sm:px-4 text-xs font-semibold whitespace-nowrap transition-all rounded-lg sm:rounded-full text-center flex items-center justify-center cursor-pointer shrink-0 ${
                filterType === tab.id
                  ? isLight
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-[#10b981] text-black shadow-md'
                  : isLight
                    ? 'text-zinc-600 hover:text-zinc-900 hover:bg-white/80'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

      </div>

      {/* Desktop/Tablet Transactions Table (>= md) */}
      <div className="hidden md:block overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[980px] text-left border-collapse table-fixed">
          <thead>
            <tr className={`border-b text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${
              isLight
                ? 'border-zinc-200/80 text-zinc-600 bg-zinc-50/80'
                : 'border-[#142e20] text-white/50 bg-[#071912]/50'
            }`}>
              <th className="py-3.5 pl-6 pr-3 w-[24%] text-left whitespace-nowrap">Transaction &amp; Event</th>
              <th className="py-3.5 px-3 w-[11%] text-left whitespace-nowrap">Date</th>
              <th className="py-3.5 px-3 w-[10%] text-left whitespace-nowrap">Channel</th>
              <th className="py-3.5 px-3 w-[16%] text-left whitespace-nowrap">Category</th>
              <th className="py-3.5 px-3 w-[14%] text-right whitespace-nowrap">Amount</th>
              <th className="py-3.5 px-3 w-[12%] text-left whitespace-nowrap">Recorded By</th>
              <th className="py-3.5 pl-3 pr-6 w-[13%] text-right whitespace-nowrap">Receipt &amp; Action</th>
            </tr>
          </thead>
          <tbody className={`divide-y text-xs ${
            isLight ? 'divide-emerald-900/10' : 'divide-[#142e20]/60'
          }`}>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-16 text-center">
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
                <tr 
                  key={tx.id} 
                  onClick={() => {
                    setSelectedTx(tx);
                    setActiveTxPhotoIndex(0);
                  }}
                  className={`group transition-all cursor-pointer ${
                    isLight 
                      ? 'hover:bg-emerald-500/[0.08] active:bg-emerald-500/[0.12]' 
                      : 'hover:bg-emerald-500/[0.06] active:bg-emerald-500/[0.1]'
                  }`}
                  title="Click anywhere on row to view full transaction details"
                >
                  
                  {/* Title & Event */}
                  <td className="py-3.5 pl-6 pr-3 min-w-0">
                    <div className={`font-bold flex items-center gap-1.5 ${
                      isLight ? 'text-gray-900' : 'text-white'
                    }`}>
                      {tx.type === 'INFLOW' ? (
                        <ArrowDownRight className={`w-4 h-4 shrink-0 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                      ) : (
                        <ArrowUpRight className={`w-4 h-4 shrink-0 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                      )}
                      <span className="truncate group-hover:text-emerald-500 transition-colors">{tx.title}</span>
                    </div>
                    {tx.event_name && (
                      <span className={`text-[10px] font-medium block mt-0.5 truncate ${
                        isLight ? 'text-gray-500' : 'text-white/50'
                      }`}>
                        {tx.event_name}
                      </span>
                    )}
                    {tx.is_reimbursement && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        {tx.status === 'REIMBURSED' ? (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${
                            isLight
                              ? 'text-emerald-800 bg-emerald-100/80 border-emerald-300'
                              : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
                          }`}>
                            <CheckCircle2 className={`w-2.5 h-2.5 shrink-0 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
                            <span className="truncate max-w-[150px]">Settled · {tx.reimbursement_recipient || 'Officer'}</span>
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${
                            isLight
                              ? 'text-amber-800 bg-amber-100/80 border-amber-300'
                              : 'text-amber-300 bg-amber-500/10 border-amber-500/20'
                          }`}>
                            <Clock className={`w-2.5 h-2.5 shrink-0 ${isLight ? 'text-amber-700' : 'text-amber-400'}`} />
                            <span className="truncate max-w-[150px]">Advance by: {tx.reimbursement_recipient || 'Officer'}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Date */}
                  <td className={`py-3.5 px-3 font-medium whitespace-nowrap tabular-nums ${
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
                  <td className="py-3.5 px-3 min-w-0">
                    <span 
                      className={`text-[11px] px-2 py-0.5 rounded-md font-semibold border truncate max-w-full inline-block ${
                        isLight
                          ? 'bg-gray-100 border-gray-200 text-gray-800'
                          : 'bg-[#0c1e16] border-[#1a382b] text-white/90'
                      }`}
                      title={tx.category_name || (tx.type === 'INFLOW' ? 'Revenue' : 'Disbursement')}
                    >
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

                  {/* Recorded By */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    {(() => {
                      const loggerName = tx.logged_by_name || tx.logged_by_profile?.full_name;
                      const loggerRole = tx.logged_by_role || tx.logged_by_profile?.role;
                      const loggerEmail = tx.logged_by_email || tx.logged_by_profile?.email;
                      const loggerAvatar = tx.logged_by_avatar_url || tx.logged_by_profile?.avatar_url;

                      if (!loggerName && !loggerRole && !tx.logged_by) {
                        return (
                          <span className={`text-[11px] font-medium italic ${
                            isLight ? 'text-gray-400' : 'text-white/40'
                          }`}>
                            System
                          </span>
                        );
                      }

                      const roleBadgeStyles = {
                        admin: isLight
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/20',
                        treasurer: isLight
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
                        auditor: isLight
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/20',
                        president: isLight
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-blue-500/15 text-blue-300 border-blue-500/20',
                        adviser: isLight
                          ? 'bg-purple-100 text-purple-800 border-purple-200'
                          : 'bg-purple-500/15 text-purple-300 border-purple-500/20',
                      }[loggerRole?.toLowerCase()] || (isLight ? 'bg-gray-100 text-gray-700 border-gray-200' : 'bg-white/10 text-white/70 border-white/10');

                      return (
                        <div 
                          className="flex items-center gap-2" 
                          title={loggerEmail ? `${loggerName || 'Officer'} (${loggerEmail})` : (loggerName || 'Officer')}
                        >
                          {loggerAvatar ? (
                            <img 
                              src={loggerAvatar} 
                              alt={loggerName || 'Officer'} 
                              className={`w-6 h-6 rounded-full object-cover shrink-0 border ${
                                isLight ? 'border-gray-200 shadow-2xs' : 'border-emerald-500/30'
                              }`} 
                            />
                          ) : (
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 border ${
                              isLight 
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200 shadow-2xs' 
                                : 'bg-emerald-950 text-emerald-300 border-emerald-500/30'
                            }`}>
                              {(loggerName || 'O').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className={`text-xs font-semibold truncate max-w-[110px] ${
                              isLight ? 'text-gray-900' : 'text-white'
                            }`}>
                              {loggerName || 'Officer'}
                            </div>
                            {loggerRole && (
                              <span className={`inline-block text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border leading-none mt-0.5 ${roleBadgeStyles}`}>
                                {loggerRole}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </td>

                  {/* Receipt Preview & Action */}
                  <td className="py-3.5 pl-3 pr-6 text-right whitespace-nowrap">
                    <div 
                      className="inline-flex items-center justify-end gap-1.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(() => {
                        const receipts = getTransactionReceipts(tx);
                        if (receipts.length > 0) {
                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
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
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
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

                      {/* Settle Abono Button */}
                      {tx.is_reimbursement && tx.status === 'PENDING_REIMBURSEMENT' && canSettleAbono && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSettleTx(tx);
                            setSettleMethod(tx.payment_method === 'GCASH' ? 'GCASH' : 'CASH');
                            setSettleError(null);
                          }}
                          className={`h-7 inline-flex items-center gap-1 text-[11px] font-bold px-2 rounded-lg transition-all cursor-pointer border shadow-2xs ${
                            isLight
                              ? 'text-amber-900 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 border-amber-300'
                              : 'text-amber-300 hover:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30'
                          }`}
                          title={`Disburse ${formatPHP(tx.amount)} refund to ${tx.reimbursement_recipient || 'claimant'}`}
                        >
                          <HandCoins className={`w-3 h-3 ${isLight ? 'text-amber-700' : 'text-amber-400'}`} />
                          <span>Settle</span>
                        </button>
                      )}
                    </div>
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
        const mobileOutflows = filterBySearch(transactions.filter((tx) => tx.type === 'OUTFLOW' && (!tx.is_reimbursement || tx.status === 'REIMBURSED')));
        const mobileReimbursements = filterBySearch(transactions.filter((tx) => tx.is_reimbursement && tx.status === 'PENDING_REIMBURSEMENT'));
        const mobileAllReimbursements = filterBySearch(transactions.filter((tx) => tx.is_reimbursement));

        const totalInflowsSum = mobileInflows.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
        const totalOutflowsSum = mobileOutflows.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
        const totalReimbursementsSum = mobileReimbursements.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

        const renderCard = (tx, badgeConfig) => {
          const receipts = getTransactionReceipts(tx);
          return (
            <div
              key={tx.id}
              onClick={() => {
                setSelectedTx(tx);
                setActiveTxPhotoIndex(0);
              }}
              className={`rounded-2xl p-4.5 space-y-3 transition-colors cursor-pointer border ${
                isLight
                  ? 'bg-white border-zinc-200/80 shadow-xs hover:border-emerald-300'
                  : 'bg-[#0a2419] border-emerald-900/40 shadow-xs hover:border-emerald-700'
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
                    className={`text-xl font-extrabold tracking-tight tabular-nums block whitespace-nowrap ${
                      tx.type === 'INFLOW' 
                        ? isLight ? 'text-emerald-600' : 'text-emerald-400' 
                        : isLight ? 'text-zinc-900' : 'text-white'
                    }`}
                  >
                    {tx.type === 'INFLOW' ? '+' : '-'}{formatPHP(tx.amount)}
                  </span>
                </div>

                {/* Status Badge Pill */}
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0 ${badgeConfig.style}`}>
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

                {(() => {
                  const loggerName = tx.logged_by_name || tx.logged_by_profile?.full_name;
                  const loggerRole = tx.logged_by_role || tx.logged_by_profile?.role;
                  const loggerAvatar = tx.logged_by_avatar_url || tx.logged_by_profile?.avatar_url;
                  return (
                    <div className="flex items-center justify-between gap-3">
                      <span className={`font-medium shrink-0 ${isLight ? 'text-gray-500' : 'text-white/50'}`}>Recorded By</span>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-right max-w-[200px]">
                        {loggerAvatar ? (
                          <img src={loggerAvatar} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />
                        ) : (
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                            isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-950 text-emerald-300'
                          }`}>
                            {(loggerName || 'O').charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className={`truncate text-xs ${isLight ? 'text-gray-900' : 'text-white'}`}>
                          {loggerName || (tx.logged_by ? 'Officer' : 'System')}
                        </span>
                        {loggerRole && (
                          <span className={`text-[9px] uppercase tracking-wider font-semibold px-1 rounded ${
                            isLight ? 'text-emerald-800 bg-emerald-100' : 'text-emerald-300 bg-emerald-500/20'
                          }`}>
                            {loggerRole}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Bottom Action Buttons */}
              <div 
                className="space-y-2 mt-2"
                onClick={(e) => e.stopPropagation()}
              >
                {tx.is_reimbursement && tx.status === 'PENDING_REIMBURSEMENT' && canSettleAbono && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSettleTx(tx);
                      setSettleMethod(tx.payment_method === 'GCASH' ? 'GCASH' : 'CASH');
                      setSettleError(null);
                    }}
                    className={`w-full h-9 flex items-center justify-center gap-1.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs ${
                      isLight
                        ? 'text-amber-950 bg-amber-200 hover:bg-amber-300 active:bg-amber-400 border border-amber-300'
                        : 'text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 active:bg-amber-500/40 border border-amber-500/40'
                    }`}
                  >
                    <HandCoins className="w-3.5 h-3.5 shrink-0" />
                    <span>Disburse / Settle Advance ({formatPHP(tx.amount)})</span>
                  </button>
                )}

                {receipts.length > 0 ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedReceipt(tx);
                      setActivePhotoIndex(0);
                    }}
                    className={`w-full h-9 flex items-center justify-center gap-1.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs ${
                      isLight
                        ? 'text-emerald-900 bg-emerald-50 hover:bg-emerald-100'
                        : 'text-emerald-300 bg-[#0d1e16] hover:bg-[#122b20] active:bg-[#163527]'
                    }`}
                  >
                    <Receipt className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                    <span>{receipts.length > 1 ? `View Receipts (${receipts.length})` : 'View Receipt Details'}</span>
                  </button>
                ) : isAuthorized ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAttachTx(tx);
                      setAttachFiles([]);
                      setAttachPreviews([]);
                      setAttachError(null);
                    }}
                    className={`w-full h-9 flex items-center justify-center gap-1.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer border border-dashed ${
                      isLight
                        ? 'text-emerald-700 hover:text-emerald-900 bg-emerald-50/70 hover:bg-emerald-100/80 border-emerald-300'
                        : 'text-emerald-300 hover:text-emerald-200 bg-[#0d1e16]/70 hover:bg-[#122b20] border-emerald-500/40'
                    }`}
                  >
                    <Plus className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                    <span>Attach Receipt / Proof</span>
                  </button>
                ) : (
                  <div className={`w-full h-8 flex items-center justify-center text-[11px] font-medium rounded-xl ${
                    isLight
                      ? 'text-gray-400 bg-gray-50'
                      : 'text-white/30 bg-[#07130e]'
                  }`}>
                    <span>No Receipt Attached</span>
                  </div>
                )}
              </div>
            </div>
          );
        };

        return (
          <div className="md:hidden p-4 space-y-6">

            {/* Global Empty State */}
            {mobileInflows.length === 0 && mobileOutflows.length === 0 && mobileReimbursements.length === 0 && (
              <div className={`py-12 text-center font-semibold text-xs rounded-2xl p-6 ${
                isLight
                  ? 'text-gray-500 bg-white'
                  : 'text-white/50 bg-[#07130e]'
              }`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-inner ${
                  isLight
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-[#064e3b]/30 text-emerald-400'
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
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      isLight
                        ? 'text-emerald-800 bg-emerald-100'
                        : 'text-emerald-300 bg-emerald-500/15'
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
                  <div className={`p-4 text-center text-xs rounded-xl ${
                    isLight ? 'text-gray-400 bg-white' : 'text-white/40 bg-[#07130e]'
                  }`}>
                    No inflow records found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mobileInflows.map((tx) =>
                      renderCard(tx, {
                        label: tx.category_name || 'Revenue',
                        style: isLight
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-emerald-500/15 text-emerald-300',
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
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      isLight
                        ? 'text-amber-800 bg-amber-100'
                        : 'text-amber-300 bg-amber-500/15'
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
                  <div className={`p-4 text-center text-xs rounded-xl ${
                    isLight ? 'text-gray-400 bg-white' : 'text-white/40 bg-[#07130e]'
                  }`}>
                    No outflow records found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mobileOutflows.map((tx) =>
                      renderCard(tx, {
                        label: tx.category_name || 'Disbursement',
                        style: isLight
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-rose-500/15 text-rose-300',
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
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      isLight
                        ? 'text-amber-800 bg-amber-100'
                        : 'text-amber-300 bg-amber-500/15'
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
                  <div className={`p-4 text-center text-xs rounded-xl ${
                    isLight ? 'text-gray-400 bg-white' : 'text-white/40 bg-[#07130e]'
                  }`}>
                    No pending abono requests
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mobileReimbursements.map((tx) =>
                      renderCard(tx, {
                        label: 'Pending Abono',
                        style: isLight
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-amber-500/15 text-amber-300',
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Settled Abono in REIMBURSEMENT tab */}
            {filterType === 'REIMBURSEMENT' && mobileAllReimbursements.filter((t) => t.status === 'REIMBURSED').length > 0 && (
              <div className="space-y-3 pt-3 border-t border-dashed border-emerald-900/10">
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <h3 className={`text-xs font-bold uppercase tracking-wider truncate ${
                      isLight ? 'text-gray-900' : 'text-white'
                    }`}>
                      <span>Settled Abono (Reimbursed)</span>
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      isLight ? 'text-emerald-800 bg-emerald-100' : 'text-emerald-300 bg-emerald-500/15'
                    }`}>
                      {mobileAllReimbursements.filter((t) => t.status === 'REIMBURSED').length}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  {mobileAllReimbursements.filter((t) => t.status === 'REIMBURSED').map((tx) =>
                    renderCard(tx, {
                      label: 'Settled Abono',
                      style: isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/15 text-emerald-300',
                    })
                  )}
                </div>
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
                  {(() => {
                    const loggerName = selectedReceipt.logged_by_name || selectedReceipt.logged_by_profile?.full_name;
                    const loggerRole = selectedReceipt.logged_by_role || selectedReceipt.logged_by_profile?.role;
                    const loggerAvatar = selectedReceipt.logged_by_avatar_url || selectedReceipt.logged_by_profile?.avatar_url;
                    if (!loggerName && !loggerRole && !selectedReceipt.logged_by) return null;
                    return (
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-600 mt-1.5 pt-1.5 border-t border-black/[0.05]">
                        {loggerAvatar ? (
                          <img src={loggerAvatar} alt="" className="w-4 h-4 rounded-full object-cover shrink-0 border border-black/10" />
                        ) : (
                          <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[9px] font-bold shrink-0">
                            {(loggerName || 'O').charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="text-gray-400 font-medium">Recorded by:</span>
                        <span className="font-semibold text-gray-900">{loggerName || 'Officer'}</span>
                        {loggerRole && (
                          <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-black/[0.05]">
                            {loggerRole}
                          </span>
                        )}
                      </div>
                    );
                  })()}
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

      {/* Expanded Transaction Details Modal */}
      {selectedTx && (() => {
        const tx = selectedTx;
        const txReceipts = getTransactionReceipts(tx);
        const currentPhoto = txReceipts[activeTxPhotoIndex] || txReceipts[0] || null;
        const isAbono = Boolean(tx.is_reimbursement);
        const isSettled = tx.status === 'REIMBURSED';
        const isPendingAbono = isAbono && tx.status === 'PENDING_REIMBURSEMENT';
        const loggerName = tx.logged_by_name || tx.logged_by_profile?.full_name;
        const loggerRole = tx.logged_by_role || tx.logged_by_profile?.role;
        const loggerEmail = tx.logged_by_email || tx.logged_by_profile?.email;
        const loggerAvatar = tx.logged_by_avatar_url || tx.logged_by_profile?.avatar_url;

        return (
          <div 
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
            onClick={() => setSelectedTx(null)}
          >
            <div 
              className={`w-full max-w-2xl rounded-3xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-200 my-auto flex flex-col max-h-[92vh] ${
                isLight ? 'bg-white border-black/10' : 'bg-[#0a1e16] border-[#1b3d2c]'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`p-5 sm:p-6 border-b flex items-center justify-between shrink-0 ${
                isLight ? 'bg-gray-50/70 border-black/[0.06]' : 'bg-[#06150f] border-[#163626]'
              }`}>
                <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                  {/* Type Badge */}
                  {tx.type === 'INFLOW' ? (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                      isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                    }`}>
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      Revenue Inflow
                    </span>
                  ) : isAbono ? (
                    isSettled ? (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                        isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Settled Abono Advance
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                        isLight ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>
                        <Clock className="w-3.5 h-3.5" />
                        Pending Abono Advance
                      </span>
                    )
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                      isLight ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-rose-500/15 text-rose-300 border-rose-500/25'
                    }`}>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      Disbursement Outflow
                    </span>
                  )}

                  <span className={`text-xs font-medium tabular-nums ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
                    {tx.transaction_date}
                  </span>

                  {(tx.academic_year || tx.semester) && (
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border ${
                      isLight ? 'bg-gray-100 text-gray-700 border-gray-200' : 'bg-[#0f281e] text-white/70 border-[#1c4230]'
                    }`}>
                      {tx.academic_year || '2025-2026'} · {tx.semester || '2nd Sem'}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTx(null)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                    isLight ? 'text-gray-400 hover:text-gray-700 hover:bg-black/5' : 'text-white/40 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Modal Content */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
                
                {/* Hero Amount Banner */}
                <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isLight 
                    ? 'bg-emerald-50/50 border-emerald-200/80' 
                    : 'bg-[#0a2419] border-emerald-900/50'
                }`}>
                  <div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${
                      isLight ? 'text-gray-500' : 'text-white/50'
                    }`}>
                      {tx.type === 'INFLOW' ? 'Total Inflow Amount' : isAbono ? 'Advance Out-of-Pocket Amount' : 'Disbursement Amount'}
                    </span>
                    <span className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums block ${
                      tx.type === 'INFLOW' 
                        ? isLight ? 'text-emerald-600' : 'text-emerald-400' 
                        : isLight ? 'text-gray-900' : 'text-white'
                    }`}>
                      {tx.type === 'INFLOW' ? '+' : '-'}{formatPHP(tx.amount)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Channel Pill */}
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border ${
                      tx.payment_method === 'CASH'
                        ? isLight ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                        : isLight ? 'bg-sky-100 text-sky-900 border-sky-300' : 'bg-blue-500/15 text-blue-300 border-blue-500/25'
                    }`}>
                      {tx.payment_method === 'CASH' ? (
                        <>
                          <Wallet className="w-3.5 h-3.5" />
                          <span>Cashbox</span>
                        </>
                      ) : (
                        <>
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>GCash Wallet</span>
                        </>
                      )}
                    </span>

                    {/* Category Pill */}
                    <span className={`px-3 py-1.5 rounded-xl font-bold text-xs border ${
                      isLight ? 'bg-gray-100 text-gray-800 border-gray-200' : 'bg-[#122e22] text-white/90 border-[#1e4835]'
                    }`}>
                      {tx.category_name || (tx.type === 'INFLOW' ? 'Revenue' : 'Disbursement')}
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  
                  {/* Left Card: Transaction Info */}
                  <div className={`p-4 rounded-2xl border space-y-3 ${
                    isLight ? 'bg-gray-50/60 border-gray-200/80' : 'bg-[#081811] border-[#153425]'
                  }`}>
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider block mb-0.5 ${
                        isLight ? 'text-gray-500' : 'text-white/40'
                      }`}>
                        Title / Name
                      </span>
                      <p className={`text-sm font-bold break-words ${isLight ? 'text-gray-900' : 'text-white'}`}>
                        {tx.title}
                      </p>
                    </div>

                    {tx.event_name && (
                      <div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider block mb-0.5 ${
                          isLight ? 'text-gray-500' : 'text-white/40'
                        }`}>
                          Event / Activity
                        </span>
                        <p className={`font-semibold ${isLight ? 'text-gray-800' : 'text-white/90'}`}>
                          {tx.event_name}
                        </p>
                      </div>
                    )}

                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider block mb-0.5 ${
                        isLight ? 'text-gray-500' : 'text-white/40'
                      }`}>
                        Description &amp; Notes
                      </span>
                      <p className={`leading-relaxed ${
                        tx.description 
                          ? isLight ? 'text-gray-700 font-medium' : 'text-white/80 font-medium' 
                          : isLight ? 'text-gray-400 italic' : 'text-white/30 italic'
                      }`}>
                        {tx.description || 'No additional notes recorded for this transaction.'}
                      </p>
                    </div>
                  </div>

                  {/* Right Card: Abono / Accountability */}
                  <div className={`p-4 rounded-2xl border space-y-3 ${
                    isLight ? 'bg-gray-50/60 border-gray-200/80' : 'bg-[#081811] border-[#153425]'
                  }`}>
                    {/* Abono Details (if applicable) */}
                    {isAbono && (
                      <div className={`p-3 rounded-xl border ${
                        isSettled
                          ? isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/20'
                          : isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-500/10 border-amber-500/20'
                      }`}>
                        <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${
                          isSettled 
                            ? isLight ? 'text-emerald-800' : 'text-emerald-300' 
                            : isLight ? 'text-amber-800' : 'text-amber-300'
                        }`}>
                          Personal Advance (Abono)
                        </span>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-bold ${
                            isSettled ? isLight ? 'text-emerald-950' : 'text-white' : isLight ? 'text-amber-950' : 'text-white'
                          }`}>
                            Advanced by: {tx.reimbursement_recipient || 'Officer'}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isSettled
                              ? isLight ? 'bg-emerald-200 text-emerald-900' : 'bg-emerald-500/20 text-emerald-300'
                              : isLight ? 'bg-amber-200 text-amber-900' : 'bg-amber-500/25 text-amber-300'
                          }`}>
                            {isSettled ? 'Settled / Reimbursed' : 'Awaiting Payout'}
                          </span>
                        </div>
                        <p className={`text-[11px] mt-1.5 leading-snug ${
                          isSettled ? isLight ? 'text-emerald-800' : 'text-emerald-400' : isLight ? 'text-amber-800' : 'text-amber-400'
                        }`}>
                          {isSettled
                            ? 'Funds have been disbursed to the claimant and recognized as a formal ledger outflow.'
                            : 'Personal funds advanced off-campus. Will be reimbursed once cashbox liquidates.'}
                        </p>
                      </div>
                    )}

                    {/* Accountability: Logged by */}
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1.5 ${
                        isLight ? 'text-gray-500' : 'text-white/40'
                      }`}>
                        Recorded By
                      </span>
                      <div className="flex items-center gap-2.5">
                        {loggerAvatar ? (
                          <img src={loggerAvatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-black/10" />
                        ) : (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-950 text-emerald-300'
                          }`}>
                            {(loggerName || 'O').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold truncate text-xs ${isLight ? 'text-gray-900' : 'text-white'}`}>
                              {loggerName || 'Officer'}
                            </span>
                            {loggerRole && (
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                isLight ? 'bg-gray-200 text-gray-800' : 'bg-white/15 text-white'
                              }`}>
                                {loggerRole}
                              </span>
                            )}
                          </div>
                          {loggerEmail && (
                            <span className={`text-[11px] truncate block ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
                              {loggerEmail}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Record ID / Timestamp */}
                    <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.05] flex items-center justify-between text-[11px]">
                      <span className={isLight ? 'text-gray-500' : 'text-white/40'}>Transaction ID</span>
                      <span className={`font-mono text-[10px] ${isLight ? 'text-gray-600' : 'text-white/60'}`}>
                        {String(tx.id).slice(0, 18)}...
                      </span>
                    </div>

                  </div>
                </div>

                {/* Receipts Gallery Section */}
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  isLight ? 'bg-gray-50/60 border-gray-200/80' : 'bg-[#081811] border-[#153425]'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Receipt className={`w-4 h-4 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
                      <span className={`font-bold text-xs ${isLight ? 'text-gray-900' : 'text-white'}`}>
                        Attached Receipts &amp; Proof ({txReceipts.length})
                      </span>
                    </div>

                    {isAuthorized && txReceipts.length < 3 && (
                      <button
                        type="button"
                        onClick={() => {
                          setAttachTx(tx);
                          setAttachFiles([]);
                          setAttachPreviews([]);
                          setAttachError(null);
                        }}
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-dashed transition-colors cursor-pointer ${
                          isLight 
                            ? 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-300' 
                            : 'text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30'
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Photo</span>
                      </button>
                    )}
                  </div>

                  {txReceipts.length === 0 ? (
                    <div className={`p-6 text-center rounded-xl border border-dashed ${
                      isLight ? 'bg-white border-gray-200 text-gray-400' : 'bg-[#05110c] border-[#153425] text-white/30'
                    }`}>
                      <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="font-semibold text-xs">No receipt photo attached to this entry.</p>
                      <p className="text-[11px] mt-0.5">Physical paper receipt or signed petty cash voucher may be filed offline.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Active Large Preview */}
                      <div className="relative aspect-4/3 max-h-[340px] rounded-xl overflow-hidden bg-black/80 flex items-center justify-center">
                        {currentPhoto && (
                          <img 
                            src={currentPhoto} 
                            alt={`Receipt ${activeTxPhotoIndex + 1}`} 
                            className="w-full h-full object-contain"
                          />
                        )}
                        <a
                          href={currentPhoto}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Full Resolution</span>
                        </a>
                      </div>

                      {/* Thumbnail Selector Strip (if > 1) */}
                      {txReceipts.length > 1 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                          {txReceipts.map((url, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActiveTxPhotoIndex(idx)}
                              className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                                activeTxPhotoIndex === idx 
                                  ? 'border-emerald-500 ring-2 ring-emerald-500/30' 
                                  : 'border-transparent opacity-60 hover:opacity-100'
                              }`}
                            >
                              <img src={url} alt="" className="w-full h-full object-cover" />
                              <span className="absolute bottom-0.5 right-0.5 px-1 bg-black/70 text-[9px] font-bold text-white rounded">
                                #{idx + 1}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* Footer Actions */}
              <div className={`p-4 sm:p-5 border-t flex items-center justify-between gap-3 shrink-0 ${
                isLight ? 'bg-gray-50/80 border-black/[0.06]' : 'bg-[#06150f] border-[#163626]'
              }`}>
                <button
                  type="button"
                  onClick={() => setSelectedTx(null)}
                  className={`h-9.5 px-4 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                    isLight ? 'text-gray-700 hover:bg-gray-200/80' : 'text-white/70 hover:bg-white/10'
                  }`}
                >
                  Close
                </button>

                <div className="flex items-center gap-2">
                  {/* If pending abono and user can settle, offer Settle directly in modal! */}
                  {isPendingAbono && canSettleAbono && (
                    <button
                      type="button"
                      onClick={() => {
                        setSettleTx(tx);
                        setSettleMethod(tx.payment_method === 'GCASH' ? 'GCASH' : 'CASH');
                        setSettleError(null);
                      }}
                      className="h-9.5 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-black font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <HandCoins className="w-3.5 h-3.5" />
                      <span>Disburse Refund ({formatPHP(tx.amount)})</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Settle Abono Reimbursement Modal */}
      {settleTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-3xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-200 ${
            isLight
              ? 'bg-white border-black/10'
              : 'bg-[#091b13] border-[#1a382b]'
          }`}>
            {/* Modal Header */}
            <div className={`p-5 border-b flex items-center justify-between ${
              isLight ? 'bg-amber-50/60 border-black/[0.06]' : 'bg-amber-500/10 border-amber-500/20'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-2xs border ${
                  isLight
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  <HandCoins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    Settle Abono Advance
                  </h3>
                  <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-white/60'}`}>
                    Disburse out-of-pocket reimbursement
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettleTx(null)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                  isLight ? 'text-gray-400 hover:text-gray-700 hover:bg-black/5' : 'text-white/40 hover:text-white hover:bg-white/10'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Advance Summary Card */}
              <div className={`p-4 rounded-2xl border space-y-2.5 ${
                isLight ? 'bg-gray-50 border-gray-200/80' : 'bg-[#06140e] border-[#153224]'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${isLight ? 'text-gray-500' : 'text-white/50'}`}>Claimant / Recipient</span>
                  <span className={`font-bold text-sm ${isLight ? 'text-amber-900' : 'text-amber-300'}`}>
                    {settleTx.reimbursement_recipient || 'Officer'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${isLight ? 'text-gray-500' : 'text-white/50'}`}>Expense Title</span>
                  <span className={`font-semibold text-right truncate max-w-[210px] ${isLight ? 'text-gray-800' : 'text-white/90'}`}>
                    {settleTx.title}
                  </span>
                </div>
                {settleTx.event_name && (
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${isLight ? 'text-gray-500' : 'text-white/50'}`}>Event / Activity</span>
                    <span className={`font-medium ${isLight ? 'text-gray-700' : 'text-white/80'}`}>
                      {settleTx.event_name}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${isLight ? 'text-gray-500' : 'text-white/50'}`}>Advance Date</span>
                  <span className={`font-semibold tabular-nums ${isLight ? 'text-gray-700' : 'text-white/80'}`}>
                    {settleTx.transaction_date}
                  </span>
                </div>
                <div className={`pt-2.5 border-t flex items-center justify-between ${
                  isLight ? 'border-gray-200' : 'border-[#153224]'
                }`}>
                  <span className={`font-bold text-xs uppercase tracking-wider ${isLight ? 'text-gray-700' : 'text-white/70'}`}>
                    Refund Amount
                  </span>
                  <span className={`text-lg font-black tabular-nums ${isLight ? 'text-gray-900' : 'text-emerald-400'}`}>
                    {formatPHP(settleTx.amount)}
                  </span>
                </div>
              </div>

              {/* Payment Channel Selection */}
              <div className="space-y-2">
                <label className={`block font-bold text-xs ${isLight ? 'text-gray-800' : 'text-white/90'}`}>
                  Disburse Payment From Channel:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Cashbox Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setSettleMethod('CASH');
                      setSettleError(null);
                    }}
                    className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                      settleMethod === 'CASH'
                        ? isLight
                          ? 'border-emerald-600 bg-emerald-50/90 ring-2 ring-emerald-500/20'
                          : 'border-emerald-500 bg-emerald-500/20 ring-2 ring-emerald-500/30'
                        : isLight
                          ? 'border-gray-200 bg-white hover:bg-gray-50'
                          : 'border-[#153224] bg-[#0c1f16] hover:bg-[#112a1e]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Wallet className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
                        <span className={isLight ? 'text-gray-900' : 'text-white'}>Cashbox</span>
                      </div>
                      {settleMethod === 'CASH' && (
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                          ✓
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] ${isLight ? 'text-gray-500' : 'text-white/50'}`}>Physical Box</p>
                    <p className={`text-[11px] font-bold mt-1 tabular-nums ${
                      cashBalance < Number(settleTx.amount)
                        ? 'text-rose-600'
                        : isLight ? 'text-emerald-700' : 'text-emerald-400'
                    }`}>
                      Avail: {formatPHP(cashBalance)}
                    </p>
                  </button>

                  {/* GCash Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setSettleMethod('GCASH');
                      setSettleError(null);
                    }}
                    className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                      settleMethod === 'GCASH'
                        ? isLight
                          ? 'border-sky-600 bg-sky-50/90 ring-2 ring-sky-500/20'
                          : 'border-sky-500 bg-sky-500/20 ring-2 ring-sky-500/30'
                        : isLight
                          ? 'border-gray-200 bg-white hover:bg-gray-50'
                          : 'border-[#153224] bg-[#0c1f16] hover:bg-[#112a1e]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Smartphone className={`w-3.5 h-3.5 ${isLight ? 'text-sky-700' : 'text-sky-400'}`} />
                        <span className={isLight ? 'text-gray-900' : 'text-white'}>GCash</span>
                      </div>
                      {settleMethod === 'GCASH' && (
                        <span className="w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-bold">
                          ✓
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] ${isLight ? 'text-gray-500' : 'text-white/50'}`}>Digital Wallet</p>
                    <p className={`text-[11px] font-bold mt-1 tabular-nums ${
                      gcashBalance < Number(settleTx.amount)
                        ? 'text-rose-600'
                        : isLight ? 'text-sky-700' : 'text-sky-400'
                    }`}>
                      Avail: {formatPHP(gcashBalance)}
                    </p>
                  </button>
                </div>
              </div>

              {/* Insufficient balance notice */}
              {(() => {
                const isGcash = settleMethod === 'GCASH';
                const avail = isGcash ? gcashBalance : cashBalance;
                const req = Number(settleTx.amount || 0);
                if (req > avail) {
                  return (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Insufficient {isGcash ? 'GCash' : 'Cashbox'} funds.</span>{' '}
                        Requires {formatPHP(req)} but only {formatPHP(avail)} is available. Please select another channel or replenish funds first.
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Error message from submission */}
              {settleError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{settleError}</span>
                </div>
              )}

              {/* Footer Actions */}
              <div className={`pt-2 flex items-center justify-end gap-2 border-t ${
                isLight ? 'border-black/[0.06]' : 'border-[#153224]'
              }`}>
                <button
                  type="button"
                  disabled={isSubmittingSettle}
                  onClick={() => setSettleTx(null)}
                  className={`h-9.5 px-4 text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50 ${
                    isLight ? 'text-gray-700 hover:bg-gray-100' : 'text-white/70 hover:bg-white/10'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    isSubmittingSettle ||
                    (settleMethod === 'CASH' && cashBalance < Number(settleTx.amount)) ||
                    (settleMethod === 'GCASH' && gcashBalance < Number(settleTx.amount))
                  }
                  onClick={handleConfirmSettle}
                  className="h-9.5 px-5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingSettle ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Disbursing...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm Disbursement</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Success Toast */}
      {settleToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border bg-emerald-600 border-emerald-500 text-white animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
          <span className="text-xs font-bold">{settleToast}</span>
          <button type="button" onClick={() => setSettleToast(null)} className="ml-2 hover:opacity-75 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
}
