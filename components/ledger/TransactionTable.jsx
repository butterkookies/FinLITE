'use client';
import { useState, useMemo, useEffect } from 'react';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
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
  AlertTriangle,
  ShieldCheck,
  MessageSquare
} from 'lucide-react';
import { formatPHP } from '@/lib/utils/currency';
import { compressReceiptImage } from '@/lib/utils/compression';
import { useTheme } from '@/components/theme/ThemeProvider';
import { Button, Badge, Input, Card, Modal } from '@/components/ui';
import TransactionCommentsDrawer from '@/components/ledger/TransactionCommentsDrawer';

export function formatFriendlyDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const raw = String(dateStr).split('T')[0];
    const parts = raw.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (_) {
    return dateStr;
  }
}

export default function TransactionTable({ 
  transactions = [], 
  onNewTransaction, 
  onExportReport,
  onNewProposal,
  onAttachReceipt,
  onSettleReimbursement,
  onOpenAuditTrail,
  cashBalance = 0,
  gcashBalance = 0,
  currentRole,
  isDbConnected = false
}) {
  const { isLight } = useTheme();
  const canViewAudit = ['admin', 'auditor', 'treasurer', 'president', 'adviser'].includes(currentRole);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Sorting & Pagination states
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

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

  // Transaction Comments & Audit Remarks drawer state
  const [commentTx, setCommentTx] = useState(null);
  const [commentCounts, setCommentCounts] = useState({});

  useEffect(() => {
    let isMounted = true;
    fetch('/api/transactions/comments-count')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.counts) {
          setCommentCounts(data.counts);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [transactions]);

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
        (tx.reimbursement_recipient && tx.reimbursement_recipient.toLowerCase().includes(query)) ||
        (tx.category_name && tx.category_name.toLowerCase().includes(query))
      );
    });
  }, [transactions, filterType, searchQuery]);

  // Reset pagination when search, filter, or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, searchQuery, pageSize]);

  // Multi-column sorting
  const sortedTransactions = useMemo(() => {
    const list = [...filtered];
    return list.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        const dateA = a.transaction_date || '';
        const dateB = b.transaction_date || '';
        comparison = dateA.localeCompare(dateB);
      } else if (sortField === 'amount') {
        const amtA = Number(a.amount) || 0;
        const amtB = Number(b.amount) || 0;
        comparison = amtA - amtB;
      } else if (sortField === 'title') {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        comparison = titleA.localeCompare(titleB);
      } else if (sortField === 'category') {
        const catA = (a.category_name || (a.type === 'INFLOW' ? 'Revenue' : 'Disbursement')).toLowerCase();
        const catB = (b.category_name || (b.type === 'INFLOW' ? 'Revenue' : 'Disbursement')).toLowerCase();
        comparison = catA.localeCompare(catB);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filtered, sortField, sortDirection]);

  // Pagination calculation
  const totalRecords = sortedTransactions.length;
  const isAll = pageSize === 'all';
  const effectivePageSize = isAll ? Math.max(totalRecords, 1) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(totalRecords / effectivePageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedTransactions = useMemo(() => {
    if (isAll) return sortedTransactions;
    const startIndex = (safePage - 1) * effectivePageSize;
    return sortedTransactions.slice(startIndex, startIndex + effectivePageSize);
  }, [sortedTransactions, safePage, effectivePageSize, isAll]);

  const startIndex = totalRecords === 0 ? 0 : (safePage - 1) * effectivePageSize + 1;
  const endIndex = isAll ? totalRecords : Math.min(safePage * effectivePageSize, totalRecords);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'date' || field === 'amount' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  const SortIndicator = ({ field }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 opacity-30 group-hover/th:opacity-80 transition-opacity shrink-0" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
    ) : (
      <ArrowDown className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
    );
  };

  return (
    <div className={`rounded-xl transition-colors relative overflow-hidden border ${
      isLight
        ? 'bg-white border-zinc-200 shadow-xs'
        : 'bg-[#121214] border-zinc-800 shadow-xs'
    }`}>
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#121214]">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-950 dark:text-white">
              Financial Ledger &amp; Transactions
            </h2>
            {isDbConnected && (
              <Badge variant="emerald" size="xs">
                Live
              </Badge>
            )}
          </div>
          <p className="text-xs font-medium mt-1 truncate text-zinc-500 dark:text-zinc-400">
            Real-time auditable record of organization inflows and disbursements
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
          {/* Audit Trail Button (Auditor/Treasurer/President/Adviser/Admin) */}
          {canViewAudit && onOpenAuditTrail && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenAuditTrail}
              leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
              title="View immutable financial audit trail and governance log"
            >
              <span>Audit Trail</span>
            </Button>
          )}

          {/* Review & Export Report Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={onExportReport}
            leftIcon={<FileText className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
            title="Preview 1:1 PDM CCS Formal Word Liquidation Report & Live Edit"
          >
            <span>Preview Report</span>
          </Button>

          {/* New Transaction Button (Admin/Treasurer/Auditor) */}
          {(currentRole === 'admin' || currentRole === 'treasurer' || currentRole === 'auditor') && (
            <Button
              variant="primary"
              size="sm"
              onClick={onNewTransaction}
              leftIcon={<Plus className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />}
            >
              <span>Record Transaction</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="px-4 sm:px-6 py-3 border-b flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121214]">
        
        {/* Search Input */}
        <div className="w-full sm:w-80 shrink-0">
          <Input
            size="sm"
            leftIcon={<Search className="w-3.5 h-3.5" />}
            placeholder="Search items, events, recipients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex overflow-x-auto scrollbar-none items-center gap-1 p-1 rounded-lg border w-full sm:w-auto shrink-0 bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          {[
            { id: 'ALL', label: 'All Records' },
            { id: 'INFLOW', label: 'Inflows' },
            { id: 'OUTFLOW', label: 'Outflows' },
            { id: 'REIMBURSEMENT', label: 'Pending Abono' },
          ].map((tab) => {
            const isActive = filterType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id)}
                className={`h-7 px-3 text-xs font-semibold whitespace-nowrap transition-all rounded-md text-center flex items-center justify-center cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

      </div>

      {/* Desktop/Tablet Transactions Table (>= md) */}
      <div className="hidden md:block overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[980px] text-left border-collapse table-fixed">
          <thead>
            <tr className="border-b text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 bg-zinc-50/80 dark:bg-zinc-900/60">
              <th className="py-3.5 pl-6 pr-3 w-[24%] text-left whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort('title')}
                  className="group/th inline-flex items-center gap-1.5 hover:text-emerald-500 transition-colors cursor-pointer select-none"
                >
                  <span>Transaction &amp; Event</span>
                  <SortIndicator field="title" />
                </button>
              </th>
              <th className="py-3.5 px-3 w-[11%] text-left whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort('date')}
                  className="group/th inline-flex items-center gap-1.5 hover:text-emerald-500 transition-colors cursor-pointer select-none"
                >
                  <span>Date</span>
                  <SortIndicator field="date" />
                </button>
              </th>
              <th className="py-3.5 px-3 w-[10%] text-left whitespace-nowrap">Channel</th>
              <th className="py-3.5 px-3 w-[16%] text-left whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort('category')}
                  className="group/th inline-flex items-center gap-1.5 hover:text-emerald-500 transition-colors cursor-pointer select-none"
                >
                  <span>Category</span>
                  <SortIndicator field="category" />
                </button>
              </th>
              <th className="py-3.5 px-3 w-[14%] text-right whitespace-nowrap">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleSort('amount')}
                    className="group/th inline-flex items-center gap-1.5 hover:text-emerald-500 transition-colors cursor-pointer select-none"
                  >
                    <SortIndicator field="amount" />
                    <span>Amount</span>
                  </button>
                </div>
              </th>
              <th className="py-3.5 px-3 w-[12%] text-left whitespace-nowrap">Recorded By</th>
              <th className="py-3.5 pl-3 pr-6 w-[13%] text-right whitespace-nowrap">Receipt &amp; Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
            {paginatedTransactions.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-16 text-center">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 border bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800">
                    <Folder className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    No matching transactions found.
                  </p>
                </td>
              </tr>
            ) : (
              paginatedTransactions.map((tx) => (
                <tr 
                  key={tx.id} 
                  onClick={() => {
                    setSelectedTx(tx);
                    setActiveTxPhotoIndex(0);
                  }}
                  className="group transition-colors cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/40 active:bg-zinc-100 dark:active:bg-zinc-900/60"
                  title="Click anywhere on row to view full transaction details"
                >
                  
                  {/* Title & Event */}
                  <td className="py-3.5 pl-6 pr-3 min-w-0">
                    <div className="font-bold flex items-center gap-1.5 text-zinc-950 dark:text-zinc-100">
                      {tx.type === 'INFLOW' ? (
                        <ArrowDownRight className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      )}
                      <span className="truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{tx.title}</span>
                    </div>
                    {tx.event_name && (
                      <span className="text-[10px] font-medium block mt-0.5 truncate text-zinc-500 dark:text-zinc-400">
                        {tx.event_name}
                      </span>
                    )}
                    {tx.is_reimbursement && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        <Badge 
                          variant={tx.status === 'REIMBURSED' ? 'emerald' : 'amber'} 
                          size="xs"
                        >
                          {tx.status === 'REIMBURSED' ? (
                            <>
                              <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate max-w-[150px]">Settled · {tx.reimbursement_recipient || 'Officer'}</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate max-w-[150px]">Advance by: {tx.reimbursement_recipient || 'Officer'}</span>
                            </>
                          )}
                        </Badge>
                      </div>
                    )}
                  </td>

                  {/* Date */}
                  <td className="py-3.5 px-3 font-medium whitespace-nowrap tabular-nums text-zinc-600 dark:text-zinc-300">
                    {formatFriendlyDate(tx.transaction_date)}
                  </td>

                  {/* Payment Channel */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <Badge
                      variant={tx.payment_method === 'CASH' ? 'emerald' : 'sky'}
                      size="xs"
                    >
                      {tx.payment_method === 'CASH' ? (
                        <>
                          <Wallet className="w-3 h-3" />
                          <span>Cash</span>
                        </>
                      ) : (
                        <>
                          <Smartphone className="w-3 h-3" />
                          <span>GCash</span>
                        </>
                      )}
                    </Badge>
                  </td>

                  {/* Category */}
                  <td className="py-3.5 px-3 min-w-0">
                    <Badge variant="neutral" size="xs" className="truncate max-w-full inline-block">
                      {tx.category_name || (tx.type === 'INFLOW' ? 'Revenue' : 'Disbursement')}
                    </Badge>
                  </td>

                  {/* Amount */}
                  <td className={`py-3.5 px-3 text-right font-black whitespace-nowrap tabular-nums text-sm ${
                    tx.type === 'INFLOW' 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-zinc-950 dark:text-zinc-100'
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
                          <span className="text-[11px] font-medium italic text-zinc-400 dark:text-zinc-500">
                            System
                          </span>
                        );
                      }

                      return (
                        <div 
                          className="flex items-center gap-2" 
                          title={loggerEmail ? `${loggerName || 'Officer'} (${loggerEmail})` : (loggerName || 'Officer')}
                        >
                          {loggerAvatar ? (
                            <img 
                              src={loggerAvatar} 
                              alt={loggerName || 'Officer'} 
                              className="w-6 h-6 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-zinc-700 shadow-2xs" 
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-2xs">
                              {(loggerName || 'O').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate max-w-[110px] text-zinc-950 dark:text-zinc-100">
                              {loggerName || 'Officer'}
                            </div>
                            {loggerRole && (
                              <Badge variant="neutral" size="xs" className="text-[9px] uppercase tracking-wider py-0 px-1 leading-none mt-0.5">
                                {loggerRole}
                              </Badge>
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
                            <Button
                              variant="emerald-subtle"
                              size="xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedReceipt(tx);
                                setActivePhotoIndex(0);
                              }}
                              leftIcon={<Receipt className="w-3 h-3" />}
                              title={`View ${receipts.length} attached receipt photo${receipts.length > 1 ? 's' : ''}`}
                            >
                              <span>{receipts.length > 1 ? `Receipts (${receipts.length})` : 'Receipt'}</span>
                            </Button>
                          );
                        }
                        if (isAuthorized) {
                          return (
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAttachTx(tx);
                                setAttachFiles([]);
                                setAttachPreviews([]);
                                setAttachError(null);
                              }}
                              leftIcon={<Plus className="w-3 h-3" />}
                              title="Attach receipt or proof for this transaction"
                              className="border-dashed"
                            >
                              <span>Attach</span>
                            </Button>
                          );
                        }
                        return <span className="text-[11px] italic text-zinc-400 dark:text-zinc-500">None</span>;
                      })()}

                      {/* Settle Abono Button */}
                      {tx.is_reimbursement && tx.status === 'PENDING_REIMBURSEMENT' && canSettleAbono && (
                        <Button
                          variant="amber-subtle"
                          size="xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSettleTx(tx);
                            setSettleMethod(tx.payment_method === 'GCASH' ? 'GCASH' : 'CASH');
                            setSettleError(null);
                          }}
                          leftIcon={<HandCoins className="w-3 h-3" />}
                          title={`Disburse ${formatPHP(tx.amount)} refund to ${tx.reimbursement_recipient || 'claimant'}`}
                        >
                          <span>Settle</span>
                        </Button>
                      )}

                      {/* Comments / Remarks Indicator Button */}
                      <Button
                        variant={commentCounts[tx.id] ? "emerald-subtle" : "ghost"}
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCommentTx(tx);
                        }}
                        leftIcon={<MessageSquare className="w-3 h-3 shrink-0" />}
                        title={commentCounts[tx.id] ? `${commentCounts[tx.id]} audit remark${commentCounts[tx.id] > 1 ? 's' : ''}` : 'View / Add audit remarks'}
                      >
                        {commentCounts[tx.id] ? (
                          <span className="tabular-nums font-bold text-[10px]">{commentCounts[tx.id]}</span>
                        ) : null}
                      </Button>
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
            <Card
              key={tx.id}
              onClick={() => {
                setSelectedTx(tx);
                setActiveTxPhotoIndex(0);
              }}
              className="p-4.5 space-y-3 cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700"
            >
              {/* Top Row: Amount on left & Status pill badge on right */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block mb-0.5 text-zinc-500 dark:text-zinc-400">
                    {tx.type === 'INFLOW' ? 'Inflow Amount' : 'Disbursement Amount'}
                  </span>
                  <span
                    className={`text-xl font-extrabold tracking-tight tabular-nums block whitespace-nowrap ${
                      tx.type === 'INFLOW' 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : 'text-zinc-950 dark:text-zinc-100'
                    }`}
                  >
                    {tx.type === 'INFLOW' ? '+' : '-'}{formatPHP(tx.amount)}
                  </span>
                </div>

                {/* Status Badge Pill */}
                <Badge variant={tx.type === 'INFLOW' ? 'emerald' : tx.is_reimbursement ? 'amber' : 'neutral'} size="sm">
                  {badgeConfig.label}
                </Badge>
              </div>

              {/* Middle Section: Key-Value Details */}
              <div className="space-y-2 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium shrink-0 text-zinc-500 dark:text-zinc-400">Transaction</span>
                  <span className="font-bold text-right truncate max-w-[200px] text-zinc-950 dark:text-zinc-100">{tx.title}</span>
                </div>

                {tx.event_name && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium shrink-0 text-zinc-500 dark:text-zinc-400">Event</span>
                    <span className="font-medium text-right truncate max-w-[200px] text-zinc-700 dark:text-zinc-300">{tx.event_name}</span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium shrink-0 text-zinc-500 dark:text-zinc-400">Date</span>
                  <span className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">{formatFriendlyDate(tx.transaction_date)}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium shrink-0 text-zinc-500 dark:text-zinc-400">Payment Channel</span>
                  <Badge variant={tx.payment_method === 'CASH' ? 'emerald' : 'sky'} size="xs">
                    {tx.payment_method === 'CASH' ? (
                      <>
                        <Wallet className="w-3.5 h-3.5" />
                        <span>Cash</span>
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>GCash</span>
                      </>
                    )}
                  </Badge>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium shrink-0 text-zinc-500 dark:text-zinc-400">Category</span>
                  <Badge variant="neutral" size="xs">
                    {tx.category_name || (tx.type === 'INFLOW' ? 'Revenue' : 'Disbursement')}
                  </Badge>
                </div>

                {tx.is_reimbursement && tx.reimbursement_recipient && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium shrink-0 text-zinc-500 dark:text-zinc-400">Advance By</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{tx.reimbursement_recipient}</span>
                  </div>
                )}

                {(() => {
                  const loggerName = tx.logged_by_name || tx.logged_by_profile?.full_name;
                  const loggerRole = tx.logged_by_role || tx.logged_by_profile?.role;
                  const loggerAvatar = tx.logged_by_avatar_url || tx.logged_by_profile?.avatar_url;
                  return (
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium shrink-0 text-zinc-500 dark:text-zinc-400">Recorded By</span>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-right max-w-[200px]">
                        {loggerAvatar ? (
                          <img src={loggerAvatar} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />
                        ) : (
                          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {(loggerName || 'O').charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="truncate text-xs text-zinc-950 dark:text-zinc-100">
                          {loggerName || (tx.logged_by ? 'Officer' : 'System')}
                        </span>
                        {loggerRole && (
                          <Badge variant="neutral" size="xs" className="text-[9px] uppercase tracking-wider py-0 px-1 leading-none">
                            {loggerRole}
                          </Badge>
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
                  <Button
                    variant="amber-subtle"
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSettleTx(tx);
                      setSettleMethod(tx.payment_method === 'GCASH' ? 'GCASH' : 'CASH');
                      setSettleError(null);
                    }}
                    leftIcon={<HandCoins className="w-3.5 h-3.5" />}
                  >
                    <span>Disburse / Settle Advance ({formatPHP(tx.amount)})</span>
                  </Button>
                )}

                {receipts.length > 0 ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedReceipt(tx);
                      setActivePhotoIndex(0);
                    }}
                    leftIcon={<Receipt className="w-3.5 h-3.5 text-emerald-500" />}
                  >
                    <span>{receipts.length > 1 ? `View Receipts (${receipts.length})` : 'View Receipt Details'}</span>
                  </Button>
                ) : isAuthorized ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-dashed"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAttachTx(tx);
                      setAttachFiles([]);
                      setAttachPreviews([]);
                      setAttachError(null);
                    }}
                    leftIcon={<Plus className="w-3.5 h-3.5 text-emerald-500" />}
                  >
                    <span>Attach Receipt / Proof</span>
                  </Button>
                ) : (
                  <div className="w-full h-8 flex items-center justify-center text-[11px] font-medium rounded-lg text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
                    <span>No Receipt Attached</span>
                  </div>
                )}

                {/* Mobile Remarks & Notes Button */}
                <Button
                  variant={commentCounts[tx.id] ? "emerald-subtle" : "secondary"}
                  size="sm"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCommentTx(tx);
                  }}
                  leftIcon={<MessageSquare className="w-3.5 h-3.5 shrink-0" />}
                >
                  <span>
                    {commentCounts[tx.id]
                      ? `Audit Remarks (${commentCounts[tx.id]})`
                      : 'Audit Remarks & Notes'}
                  </span>
                </Button>
              </div>
            </Card>
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

      {/* Desktop Pagination & Ledger Summary Footer */}
      <div className="hidden md:flex px-6 py-3.5 border-t items-center justify-between gap-3 text-xs border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-[#121214] text-zinc-600 dark:text-zinc-400">
        {/* Left: Record Count Summary */}
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {totalRecords === 0 ? (
              'No records to display'
            ) : (
              <>
                Showing <span className="font-bold tabular-nums text-zinc-950 dark:text-white">{startIndex}–{endIndex}</span> of <span className="font-bold tabular-nums text-zinc-950 dark:text-white">{totalRecords}</span> {totalRecords === 1 ? 'transaction' : 'transactions'}
                {totalRecords !== transactions.length && (
                  <span className="text-[11px] ml-1.5 opacity-70">
                    (filtered from {transactions.length} total)
                  </span>
                )}
              </>
            )}
          </span>
        </div>

        {/* Right: Page Size Selector + Prev / Next Controls */}
        <div className="flex items-center gap-3">
          {/* Page Size Pills */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium mr-1 select-none opacity-80">Per page:</span>
            {[10, 25, 50, 'all'].map((size) => {
              const active = pageSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                  className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer select-none ${
                    active
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  {size === 'all' ? 'All' : size}
                </button>
              );
            })}
          </div>

          {/* Page Navigation Buttons */}
          {!isAll && totalPages > 1 && (
            <div className="flex items-center gap-1.5 pl-3 border-l border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-semibold px-2 select-none tabular-nums">
                Page <span className="text-zinc-950 dark:text-white font-bold">{safePage}</span> of {totalPages}
              </span>

              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Ledger Summary Footer */}
      <div className="md:hidden px-4 py-3 border-t flex items-center justify-between text-xs border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-[#121214] text-zinc-600 dark:text-zinc-400">
        <span className="font-medium">
          Showing <span className={`font-bold tabular-nums ${isLight ? 'text-zinc-900' : 'text-white'}`}>{filtered.length}</span> {filtered.length === 1 ? 'transaction' : 'transactions'}
        </span>
        {filtered.length !== transactions.length && (
          <span className="text-[11px] opacity-70">
            Filtered from {transactions.length}
          </span>
        )}
      </div>

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
          <Modal
            isOpen={!!selectedReceipt}
            onClose={() => setSelectedReceipt(null)}
            maxWidth="lg"
            showCloseButton={false}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="emerald" size="xs">
                    Official Receipt
                  </Badge>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    {formatFriendlyDate(selectedReceipt.transaction_date)}
                  </span>
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-1 truncate">
                  {selectedReceipt.title}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                  Amount: <span className="tabular-nums font-bold text-zinc-900 dark:text-zinc-100">{formatPHP(selectedReceipt.amount)}</span>
                  {selectedReceipt.payment_method && (
                    <span className="ml-2 text-zinc-400">· via {selectedReceipt.payment_method}</span>
                  )}
                </p>
                {(() => {
                  const loggerName = selectedReceipt.logged_by_name || selectedReceipt.logged_by_profile?.full_name;
                  const loggerRole = selectedReceipt.logged_by_role || selectedReceipt.logged_by_profile?.role;
                  const loggerAvatar = selectedReceipt.logged_by_avatar_url || selectedReceipt.logged_by_profile?.avatar_url;
                  if (!loggerName && !loggerRole && !selectedReceipt.logged_by) return null;
                  return (
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 mt-1.5 pt-1.5 border-t border-zinc-200 dark:border-zinc-800">
                      {loggerAvatar ? (
                        <img src={loggerAvatar} alt="" className="w-4 h-4 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-zinc-700" />
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center text-[9px] font-bold shrink-0">
                          {(loggerName || 'O').charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="text-zinc-400 font-medium">Recorded by:</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{loggerName || 'Officer'}</span>
                      {loggerRole && (
                        <Badge variant="neutral" size="xs">
                          {loggerRole}
                        </Badge>
                      )}
                    </div>
                  );
                })()}
              </div>

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setSelectedReceipt(null)}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Receipt Image Display with Carousel Controls */}
            <div className="relative rounded-2xl overflow-hidden bg-zinc-950/5 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 flex-1 min-h-[220px] max-h-[48vh] flex items-center justify-center mb-3 group">
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
              <div className="hidden p-6 text-center text-zinc-400 text-xs">
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
                        : 'border-zinc-200 dark:border-zinc-800 opacity-60 hover:opacity-100'
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
            <div className="flex items-center gap-2 shrink-0 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <a
                href={currentPhotoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button variant="outline" size="sm" className="w-full">
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Open Full Image</span>
                </Button>
              </a>

              {/* Add Photo Button if < 3 and authorized */}
              {isAuthorized && viewReceipts.length < 3 && (
                <Button
                  type="button"
                  variant="emerald-subtle"
                  size="sm"
                  onClick={() => {
                    const txToAttach = selectedReceipt;
                    setSelectedReceipt(null);
                    setAttachTx(txToAttach);
                    setAttachFiles([]);
                    setAttachPreviews([]);
                    setAttachError(null);
                  }}
                  title="Add another photo proof (up to 3 max)"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Photo ({viewReceipts.length}/3)</span>
                </Button>
              )}

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedReceipt(null)}
              >
                Close
              </Button>
            </div>
          </Modal>
        );
      })()}

      {/* Attach Receipt Modal (Post-Entry) */}
      {attachTx && (
        <Modal
          isOpen={!!attachTx}
          onClose={() => {
            if (!isSubmittingAttach) setAttachTx(null);
          }}
          maxWidth="md"
          showCloseButton={!isSubmittingAttach}
          title="Attach Receipts & Proofs"
          description={
            <span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">{attachTx.title}</span> · Amount: <span className="font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{formatPHP(attachTx.amount)}</span> · {formatFriendlyDate(attachTx.transaction_date)}
            </span>
          }
          footer={
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isSubmittingAttach}
                onClick={() => setAttachTx(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isSubmittingAttach || attachFiles.length === 0}
                isLoading={isSubmittingAttach}
                onClick={handleConfirmAttach}
              >
                Upload &amp; Attach ({attachFiles.length})
              </Button>
            </>
          }
        >
          {(() => {
            const existing = getTransactionReceipts(attachTx);
            const remaining = Math.max(0, 3 - existing.length - attachFiles.length);

            return (
              <div className="space-y-4 text-xs">
                {existing.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                      Existing Attached Proofs ({existing.length}/3)
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {existing.map((url, idx) => (
                        <div key={idx} className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 aspect-square">
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
                    <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                      Add New Photos (Max {3 - existing.length} more)
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {remaining} slot{remaining === 1 ? '' : 's'} remaining
                    </span>
                  </div>

                  {/* Previews of newly selected files */}
                  {attachPreviews.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {attachPreviews.map((url, idx) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden border border-emerald-300 dark:border-emerald-600/40 bg-zinc-50 dark:bg-zinc-900 aspect-square">
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
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-emerald-600 rounded text-[9px] font-semibold text-white">
                            New #{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pick File Button */}
                  {remaining > 0 && (
                    <label className="h-10 flex items-center justify-center gap-2 px-3 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl cursor-pointer transition-colors shadow-2xs">
                      <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-zinc-700 dark:text-zinc-300 font-medium">
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

                  <p className="text-[10px] text-zinc-400">
                    Images are automatically compressed to &lt;350KB before upload.
                  </p>
                </div>

                {attachError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 text-[11px]">
                    {attachError}
                  </div>
                )}
              </div>
            );
          })()}
        </Modal>
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
          <Modal
            isOpen={!!selectedTx}
            onClose={() => setSelectedTx(null)}
            maxWidth="2xl"
            showCloseButton={false}
            footer={
              <div className="flex items-center justify-between w-full">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTx(null)}
                >
                  Close
                </Button>

                <div className="flex items-center gap-2">
                  {isPendingAbono && canSettleAbono && (
                    <Button
                      type="button"
                      variant="amber-subtle"
                      size="sm"
                      onClick={() => {
                        setSettleTx(tx);
                        setSettleMethod(tx.payment_method === 'GCASH' ? 'GCASH' : 'CASH');
                        setSettleError(null);
                      }}
                    >
                      <HandCoins className="w-3.5 h-3.5" />
                      <span>Disburse Refund ({formatPHP(tx.amount)})</span>
                    </Button>
                  )}
                </div>
              </div>
            }
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2.5 pb-4 mb-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                {tx.type === 'INFLOW' ? (
                  <Badge variant="emerald">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    Revenue Inflow
                  </Badge>
                ) : isAbono ? (
                  isSettled ? (
                    <Badge variant="emerald">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Settled Abono Advance
                    </Badge>
                  ) : (
                    <Badge variant="amber">
                      <Clock className="w-3.5 h-3.5" />
                      Pending Abono Advance
                    </Badge>
                  )
                ) : (
                  <Badge variant="rose">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    Disbursement Outflow
                  </Badge>
                )}

                <span className="text-xs font-medium tabular-nums text-zinc-500 dark:text-zinc-400">
                  {formatFriendlyDate(tx.transaction_date)}
                </span>

                {(tx.academic_year || tx.semester) && (
                  <Badge variant="neutral" size="xs">
                    {tx.academic_year || '2025-2026'} · {tx.semester || '2nd Sem'}
                  </Badge>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setSelectedTx(null)}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="space-y-4 text-xs">
              {/* Hero Amount Banner */}
              <div className="p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-zinc-500 dark:text-zinc-400">
                    {tx.type === 'INFLOW' ? 'Total Inflow Amount' : isAbono ? 'Advance Out-of-Pocket Amount' : 'Disbursement Amount'}
                  </span>
                  <span className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums block ${
                    tx.type === 'INFLOW' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-zinc-100'
                  }`}>
                    {tx.type === 'INFLOW' ? '+' : '-'}{formatPHP(tx.amount)}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={tx.payment_method === 'CASH' ? 'emerald' : 'sky'}>
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
                  </Badge>

                  <Badge variant="neutral">
                    {tx.category_name || (tx.type === 'INFLOW' ? 'Revenue' : 'Disbursement')}
                  </Badge>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Left: Transaction Info */}
                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider block mb-0.5 text-zinc-500 dark:text-zinc-400">
                      Title / Name
                    </span>
                    <p className="text-sm font-bold break-words text-zinc-900 dark:text-zinc-100">
                      {tx.title}
                    </p>
                  </div>

                  {tx.event_name && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider block mb-0.5 text-zinc-500 dark:text-zinc-400">
                        Event / Activity
                      </span>
                      <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {tx.event_name}
                      </p>
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider block mb-0.5 text-zinc-500 dark:text-zinc-400">
                      Description &amp; Notes
                    </span>
                    <p className={`leading-relaxed ${
                      tx.description 
                        ? 'text-zinc-700 dark:text-zinc-300 font-medium' 
                        : 'text-zinc-400 dark:text-zinc-500 italic'
                    }`}>
                      {tx.description || 'No additional notes recorded for this transaction.'}
                    </p>
                  </div>
                </div>

                {/* Right: Abono / Accountability */}
                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3">
                  {isAbono && (
                    <div className={`p-3 rounded-xl border ${
                      isSettled
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                        : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                    }`}>
                      <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${
                        isSettled ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'
                      }`}>
                        Personal Advance (Abono)
                      </span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          Advanced by: {tx.reimbursement_recipient || 'Officer'}
                        </span>
                        <Badge variant={isSettled ? 'emerald' : 'amber'} size="xs">
                          {isSettled ? 'Settled / Reimbursed' : 'Awaiting Payout'}
                        </Badge>
                      </div>
                      <p className={`text-[11px] mt-1.5 leading-snug ${
                        isSettled ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                      }`}>
                        {isSettled
                          ? 'Funds have been disbursed to the claimant and recognized as a formal ledger outflow.'
                          : 'Personal funds advanced off-campus. Will be reimbursed once cashbox liquidates.'}
                      </p>
                    </div>
                  )}

                  {/* Recorded By */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider block mb-1.5 text-zinc-500 dark:text-zinc-400">
                      Recorded By
                    </span>
                    <div className="flex items-center gap-2.5">
                      {loggerAvatar ? (
                        <img src={loggerAvatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-zinc-700" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {(loggerName || 'O').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold truncate text-xs text-zinc-900 dark:text-zinc-100">
                            {loggerName || 'Officer'}
                          </span>
                          {loggerRole && (
                            <Badge variant="neutral" size="xs">
                              {loggerRole}
                            </Badge>
                          )}
                        </div>
                        {loggerEmail && (
                          <span className="text-[11px] truncate block text-zinc-500 dark:text-zinc-400">
                            {loggerEmail}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Record ID */}
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">Transaction ID</span>
                    <span className="font-mono text-[10px] text-zinc-600 dark:text-zinc-400">
                      {String(tx.id).slice(0, 18)}...
                    </span>
                  </div>
                </div>
              </div>

              {/* Receipts Gallery Section */}
              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                      Attached Receipts &amp; Proof ({txReceipts.length})
                    </span>
                  </div>

                  {isAuthorized && txReceipts.length < 3 && (
                    <Button
                      type="button"
                      variant="emerald-subtle"
                      size="xs"
                      onClick={() => {
                        setAttachTx(tx);
                        setAttachFiles([]);
                        setAttachPreviews([]);
                        setAttachError(null);
                      }}
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Photo</span>
                    </Button>
                  )}
                </div>

                {txReceipts.length === 0 ? (
                  <div className="p-6 text-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 text-zinc-400 dark:text-zinc-500">
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

                    {/* Thumbnail Selector Strip */}
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
          </Modal>
        );
      })()}

      {/* Settle Abono Reimbursement Modal */}
      {settleTx && (
        <Modal
          isOpen={!!settleTx}
          onClose={() => setSettleTx(null)}
          maxWidth="md"
          title="Settle Abono Advance"
          description="Disburse out-of-pocket reimbursement"
          footer={
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isSubmittingSettle}
                onClick={() => setSettleTx(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={
                  isSubmittingSettle ||
                  (settleMethod === 'CASH' && cashBalance < Number(settleTx.amount)) ||
                  (settleMethod === 'GCASH' && gcashBalance < Number(settleTx.amount))
                }
                isLoading={isSubmittingSettle}
                onClick={handleConfirmSettle}
              >
                <Check className="w-4 h-4" />
                <span>Confirm Disbursement</span>
              </Button>
            </>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Advance Summary Card */}
            <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-500 dark:text-zinc-400">Claimant / Recipient</span>
                <span className="font-bold text-sm text-amber-700 dark:text-amber-400">
                  {settleTx.reimbursement_recipient || 'Officer'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-500 dark:text-zinc-400">Expense Title</span>
                <span className="font-semibold text-right truncate max-w-[210px] text-zinc-800 dark:text-zinc-200">
                  {settleTx.title}
                </span>
              </div>
              {settleTx.event_name && (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-500 dark:text-zinc-400">Event / Activity</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {settleTx.event_name}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-500 dark:text-zinc-400">Advance Date</span>
                <span className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatFriendlyDate(settleTx.transaction_date)}
                </span>
              </div>
              <div className="pt-2.5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Refund Amount
                </span>
                <span className="text-lg font-black tabular-nums text-zinc-900 dark:text-emerald-400">
                  {formatPHP(settleTx.amount)}
                </span>
              </div>
            </div>

            {/* Payment Channel Selection */}
            <div className="space-y-2">
              <label className="block font-bold text-xs text-zinc-800 dark:text-zinc-200">
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
                      ? 'border-emerald-600 bg-emerald-50/90 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-zinc-900 dark:text-zinc-100">Cashbox</span>
                    </div>
                    {settleMethod === 'CASH' && (
                      <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Physical Box</p>
                  <p className={`text-[11px] font-bold mt-1 tabular-nums ${
                    cashBalance < Number(settleTx.amount)
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
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
                      ? 'border-sky-600 bg-sky-50/90 dark:bg-sky-950/30 ring-2 ring-sky-500/20'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Smartphone className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      <span className="text-zinc-900 dark:text-zinc-100">GCash</span>
                    </div>
                    {settleMethod === 'GCASH' && (
                      <span className="w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Digital Wallet</p>
                  <p className={`text-[11px] font-bold mt-1 tabular-nums ${
                    gcashBalance < Number(settleTx.amount)
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-sky-600 dark:text-sky-400'
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
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2">
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
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{settleError}</span>
              </div>
            )}
          </div>
        </Modal>
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

      {/* Transaction Comments & Audit Remarks Drawer */}
      <TransactionCommentsDrawer
        isOpen={!!commentTx}
        onClose={() => setCommentTx(null)}
        transaction={commentTx}
        onCommentAdded={(txId, count) => setCommentCounts((prev) => ({ ...prev, [txId]: count }))}
      />

    </div>
  );
}
