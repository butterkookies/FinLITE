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
  MessageSquare,
  Table,
  LayoutList
} from 'lucide-react';
import { formatPHP } from '@/lib/utils/currency';
import { compressReceiptImage } from '@/lib/utils/compression';
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
  const canViewAudit = ['admin', 'auditor', 'treasurer', 'president', 'adviser'].includes(currentRole);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('auto'); // 'auto' (table on desktop, cards on mobile) | 'table' | 'cards'
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
  const [settleAmount, setSettleAmount] = useState('');
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

    const payoutVal = parseFloat(settleAmount);
    if (isNaN(payoutVal) || payoutVal <= 0) {
      setSettleError('Please enter a valid disbursement amount greater than ₱0.00');
      setIsSubmittingSettle(false);
      return;
    }
    if (payoutVal > Number(settleTx.amount || 0)) {
      setSettleError(`Disbursement amount cannot exceed ${formatPHP(settleTx.amount)}`);
      setIsSubmittingSettle(false);
      return;
    }

    const isGcash = settleMethod === 'GCASH';
    const available = Number(isGcash ? gcashBalance : cashBalance) || 0;
    if (payoutVal > available) {
      const channelLabel = isGcash ? 'GCash Wallet' : 'Physical Cashbox';
      setSettleError(`Insufficient ${channelLabel} balance. Available: ${formatPHP(available)}`);
      setIsSubmittingSettle(false);
      return;
    }

    try {
      if (onSettleReimbursement) {
        const res = await onSettleReimbursement(settleTx.id, { 
          paymentMethod: settleMethod,
          amount: payoutVal 
        });
        if (res && res.error) {
          setSettleError(res.error);
          setIsSubmittingSettle(false);
          return;
        }
      }
      setSettleToast(`Successfully disbursed ${formatPHP(payoutVal)} to ${settleTx.reimbursement_recipient || 'claimant'}.`);
      setTimeout(() => setSettleToast(null), 4000);
      if (selectedTx && selectedTx.id === settleTx.id) {
        const remainingBal = Math.max(0, Number(settleTx.amount || 0) - payoutVal);
        setSelectedTx((prev) => prev ? { 
          ...prev, 
          status: remainingBal === 0 ? 'REIMBURSED' : 'PENDING_REIMBURSEMENT', 
          amount: remainingBal === 0 ? payoutVal : remainingBal,
          payment_method: settleMethod 
        } : null);
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
      <ArrowUp className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
    );
  };

  return (
    <div className="rounded-2xl transition-colors relative overflow-hidden bg-white dark:bg-[#121214] border border-zinc-200/70 dark:border-zinc-800/70 shadow-2xs">
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

        {/* Filter Tabs & View Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          <div className="flex overflow-x-auto scrollbar-none items-center gap-1 p-1 rounded-lg border shrink-0 bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
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

          {/* View Mode Toggle: Spreadsheet vs Slim Cards */}
          <div className="flex items-center gap-0.5 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`h-7 px-2.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table' || (viewMode === 'auto')
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
              title="Dense Spreadsheet Table View"
            >
              <Table className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Spreadsheet</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`h-7 px-2.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
              title="Mobile Slim Cards View"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Slim Cards</span>
            </button>
          </div>
        </div>

      </div>

      {/* Desktop/Tablet Transactions Table */}
      <div className={`${viewMode === 'cards' ? 'hidden' : viewMode === 'table' ? 'block' : 'hidden md:block'} overflow-x-auto lg:overflow-x-visible scrollbar-thin`}>
        <table className="w-full min-w-[960px] 2xl:min-w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="border-b text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 bg-zinc-50/80 dark:bg-zinc-900/60">
              <th className="py-3.5 pl-6 pr-3 w-[30%] text-left whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort('title')}
                  className="group/th inline-flex items-center gap-1.5 hover:text-emerald-500 transition-colors cursor-pointer select-none"
                >
                  <span>Transaction &amp; Event</span>
                  <SortIndicator field="title" />
                </button>
              </th>
              <th className="py-3.5 px-3 w-[9%] text-left whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort('date')}
                  className="group/th inline-flex items-center gap-1.5 hover:text-emerald-500 transition-colors cursor-pointer select-none"
                >
                  <span>Date</span>
                  <SortIndicator field="date" />
                </button>
              </th>
              <th className="py-3.5 px-3 w-[7%] text-left whitespace-nowrap">Channel</th>
              <th className="py-3.5 px-3 w-[20%] text-left whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleSort('category')}
                  className="group/th inline-flex items-center gap-1.5 hover:text-emerald-500 transition-colors cursor-pointer select-none"
                >
                  <span>Category</span>
                  <SortIndicator field="category" />
                </button>
              </th>
              <th className="py-3.5 px-3 w-[11%] text-right whitespace-nowrap">
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
              <th className="py-3.5 px-3 w-[10%] text-left whitespace-nowrap">Recorded By</th>
              <th className="py-3.5 pl-3 pr-6 w-[13%] text-right whitespace-nowrap">Receipts &amp; Actions</th>
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
                  <td className="py-3.5 pl-6 pr-3 min-w-0" title={tx.title}>
                    <div className="font-bold flex items-center gap-1.5 text-zinc-950 dark:text-zinc-100">
                      {tx.type === 'INFLOW' ? (
                        <ArrowDownRight className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      )}
                      <span className="truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" title={tx.title}>{tx.title}</span>
                    </div>
                    {tx.event_name && (
                      <span className="text-[10px] font-medium block mt-0.5 truncate text-zinc-500 dark:text-zinc-400" title={tx.event_name}>
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
                  <td className="py-3.5 px-3 font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    {formatFriendlyDate(tx.transaction_date)}
                  </td>

                  {/* Payment Channel */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tx.payment_method === 'CASH' ? 'bg-emerald-500' : 'bg-sky-500'}`} />
                      <span>{tx.payment_method === 'CASH' ? 'Cash' : 'GCash'}</span>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3.5 px-3 min-w-0" title={tx.category_name || (tx.type === 'INFLOW' ? 'Revenue' : 'Disbursement')}>
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 truncate max-w-full block" title={tx.category_name || (tx.type === 'INFLOW' ? 'Revenue' : 'Disbursement')}>
                      {tx.category_name || (tx.type === 'INFLOW' ? 'Revenue' : 'Disbursement')}
                    </span>
                  </td>

                  {/* Amount */}
                  <td className={`py-3.5 px-3 text-right font-mono font-bold whitespace-nowrap tabular-nums text-[13px] ${
                    tx.type === 'INFLOW' 
                      ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' 
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
                              className="w-5 h-5 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-zinc-700 shadow-2xs" 
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              {(loggerName || 'O').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate max-w-[120px] text-zinc-900 dark:text-zinc-100" title={loggerName || 'Officer'}>
                              {loggerName || 'Officer'}
                            </div>
                            {loggerRole && (
                              <span className="text-[9px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-semibold block leading-none mt-0.5">
                                {loggerRole}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </td>

                  {/* Receipts & Hover Action Dock (Option C: Stripe/Linear Pattern) */}
                  <td className="relative py-3.5 pl-3 pr-6 text-right whitespace-nowrap">
                    {/* Resting State: Calm, perfectly aligned indicators */}
                    <div className="flex items-center justify-end gap-2 transition-opacity duration-150 group-hover:opacity-0 group-focus-within:opacity-0">
                      {(() => {
                        const receipts = getTransactionReceipts(tx);
                        const hasComments = Boolean(commentCounts[tx.id]);
                        const isPendingAbono = tx.is_reimbursement && tx.status === 'PENDING_REIMBURSEMENT';

                        return (
                          <>
                            {isPendingAbono && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                <Clock className="w-3 h-3" />
                                <span>Pending</span>
                              </span>
                            )}

                            {receipts.length > 0 ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <Receipt className="w-3 h-3 shrink-0" />
                                <span>{receipts.length > 1 ? `${receipts.length} Receipts` : '1 Receipt'}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-zinc-400 dark:text-zinc-600 font-medium">—</span>
                            )}

                            {hasComments && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                <MessageSquare className="w-2.5 h-2.5 text-zinc-500" />
                                <span className="tabular-nums">{commentCounts[tx.id]}</span>
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    {/* Action Dock: Smoothly revealed on row hover or keyboard focus */}
                    <div 
                      className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-opacity duration-150 absolute right-6 inset-y-0 flex items-center justify-end gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(() => {
                        const receipts = getTransactionReceipts(tx);
                        return (
                          <>
                            {receipts.length > 0 && (
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
                                <span>{receipts.length > 1 ? `View (${receipts.length})` : 'View'}</span>
                              </Button>
                            )}

                            {isAuthorized && receipts.length < 3 && (
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
                              >
                                <span>Attach</span>
                              </Button>
                            )}

                            {/* Settle Abono Button */}
                            {tx.is_reimbursement && tx.status === 'PENDING_REIMBURSEMENT' && canSettleAbono && (
                              <Button
                                variant="amber-subtle"
                                size="xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSettleTx(tx);
                                  setSettleAmount(Number(tx.amount || 0).toString());
                                  setSettleMethod(tx.payment_method === 'GCASH' ? 'GCASH' : 'CASH');
                                  setSettleError(null);
                                }}
                                leftIcon={<HandCoins className="w-3 h-3" />}
                                title={`Disburse ${formatPHP(tx.amount)} refund to ${tx.reimbursement_recipient || 'claimant'}`}
                              >
                                <span>Settle</span>
                              </Button>
                            )}

                            {/* Comments / Remarks Button */}
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
                          </>
                        );
                      })()}
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
          const hasComments = Boolean(commentCounts[tx.id]);
          const isAbonoPending = tx.is_reimbursement && tx.status === 'PENDING_REIMBURSEMENT';

          return (
            <div
              key={tx.id}
              onClick={() => {
                setSelectedTx(tx);
                setActiveTxPhotoIndex(0);
              }}
              className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer flex items-center justify-between gap-3 transition-all active:scale-[0.99]"
            >
              {/* Left: Icon & Metadata */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    tx.type === 'INFLOW'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : tx.is_reimbursement
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                  }`}
                >
                  {tx.payment_method === 'GCASH' ? (
                    <Smartphone className="w-4 h-4 stroke-[2]" />
                  ) : (
                    <Wallet className="w-4 h-4 stroke-[2]" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-zinc-100 truncate">
                      {tx.title}
                    </span>
                    {hasComments && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 shrink-0">
                        <MessageSquare className="w-3 h-3" />
                        <span>{commentCounts[tx.id]}</span>
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 truncate mt-0.5">
                    <span>{formatFriendlyDate(tx.transaction_date)}</span>
                    <span>•</span>
                    <span className="truncate">{tx.category_name || (tx.type === 'INFLOW' ? 'Revenue' : 'Disbursement')}</span>
                    {tx.is_reimbursement && tx.reimbursement_recipient && (
                      <>
                        <span>•</span>
                        <span className="text-amber-600 dark:text-amber-400 font-medium truncate">{tx.reimbursement_recipient}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Right: Amount & Status */}
              <div className="text-right shrink-0 flex flex-col items-end gap-1">
                <span
                  className={`text-sm sm:text-base font-extrabold tracking-tight tabular-nums block ${
                    tx.type === 'INFLOW'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-zinc-950 dark:text-zinc-100'
                  }`}
                >
                  {tx.type === 'INFLOW' ? '+' : '-'}{formatPHP(tx.amount)}
                </span>

                <div className="flex items-center gap-1.5">
                  {receipts.length > 0 && (
                    <span className="text-[10px] text-zinc-400 flex items-center gap-0.5">
                      <Receipt className="w-3 h-3 text-emerald-500" />
                      <span>{receipts.length}</span>
                    </span>
                  )}

                  {isAbonoPending ? (
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      Pending Abono
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-zinc-400">
                      {tx.payment_method}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        };

        return (
          <div className={`${viewMode === 'cards' ? 'block' : viewMode === 'table' ? 'hidden' : 'md:hidden'} p-3 sm:p-4 space-y-5`}>

            {/* Global Empty State */}
            {/* Global Empty State */}
            {mobileInflows.length === 0 && mobileOutflows.length === 0 && mobileReimbursements.length === 0 && (
              <div className="py-12 text-center font-semibold text-xs rounded-2xl p-6 text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-2xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
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
                    <h3 className="text-xs font-bold uppercase tracking-wider truncate text-zinc-950 dark:text-zinc-100">
                      <span className="sm:hidden">Inflows</span>
                      <span className="hidden sm:inline">Inflows &amp; Revenue</span>
                    </h3>
                    <Badge variant="emerald" size="xs">
                      {mobileInflows.length}
                    </Badge>
                  </div>
                  <span className="text-xs font-black tabular-nums whitespace-nowrap shrink-0 text-right text-emerald-600 dark:text-emerald-400">
                    +{formatPHP(totalInflowsSum)}
                  </span>
                </div>

                {mobileInflows.length === 0 ? (
                  <div className="p-4 text-center text-xs rounded-xl text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
                    No inflow records found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mobileInflows.map((tx) =>
                      renderCard(tx, {
                        label: tx.category_name || 'Revenue',
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
                    <h3 className="text-xs font-bold uppercase tracking-wider truncate text-zinc-950 dark:text-zinc-100">
                      <span className="sm:hidden">Outflows</span>
                      <span className="hidden sm:inline">Outflows &amp; Disbursements</span>
                    </h3>
                    <Badge variant="amber" size="xs">
                      {mobileOutflows.length}
                    </Badge>
                  </div>
                  <span className="text-xs font-black tabular-nums whitespace-nowrap shrink-0 text-right text-zinc-950 dark:text-zinc-100">
                    -{formatPHP(totalOutflowsSum)}
                  </span>
                </div>

                {mobileOutflows.length === 0 ? (
                  <div className="p-4 text-center text-xs rounded-xl text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
                    No outflow records found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mobileOutflows.map((tx) =>
                      renderCard(tx, {
                        label: tx.category_name || 'Disbursement',
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
                    <h3 className="text-xs font-bold uppercase tracking-wider truncate text-zinc-950 dark:text-zinc-100">
                      <span className="sm:hidden">Pending Abono</span>
                      <span className="hidden sm:inline">Pending Abono (Advances)</span>
                    </h3>
                    <Badge variant="amber" size="xs">
                      {mobileReimbursements.length}
                    </Badge>
                  </div>
                  <span className="text-xs font-black tabular-nums whitespace-nowrap shrink-0 text-right text-amber-600 dark:text-amber-400">
                    {formatPHP(totalReimbursementsSum)}
                  </span>
                </div>

                {mobileReimbursements.length === 0 ? (
                  <div className="p-4 text-center text-xs rounded-xl text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
                    No pending abono requests
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mobileReimbursements.map((tx) =>
                      renderCard(tx, {
                        label: 'Pending Abono',
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Settled Abono in REIMBURSEMENT tab */}
            {filterType === 'REIMBURSEMENT' && mobileAllReimbursements.filter((t) => t.status === 'REIMBURSED').length > 0 && (
              <div className="space-y-3 pt-3 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <h3 className="text-xs font-bold uppercase tracking-wider truncate text-zinc-950 dark:text-zinc-100">
                      <span>Settled Abono (Reimbursed)</span>
                    </h3>
                    <Badge variant="emerald" size="xs">
                      {mobileAllReimbursements.filter((t) => t.status === 'REIMBURSED').length}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-3">
                  {mobileAllReimbursements.filter((t) => t.status === 'REIMBURSED').map((tx) =>
                    renderCard(tx, {
                      label: 'Settled Abono',
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
          Showing <span className="font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{filtered.length}</span> {filtered.length === 1 ? 'transaction' : 'transactions'}
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
                        setSettleAmount(Number(tx.amount || 0).toString());
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
            <div className="flex items-center justify-between gap-2.5 pb-3 mb-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                {tx.type === 'INFLOW' ? (
                  <Badge variant="emerald" size="xs">
                    <ArrowDownRight className="w-3 h-3" />
                    Revenue Inflow
                  </Badge>
                ) : isAbono ? (
                  isSettled ? (
                    <Badge variant="emerald" size="xs">
                      <CheckCircle2 className="w-3 h-3" />
                      Settled Abono Advance
                    </Badge>
                  ) : (
                    <Badge variant="amber" size="xs">
                      <Clock className="w-3 h-3" />
                      Pending Abono Advance
                    </Badge>
                  )
                ) : (
                  <Badge variant="rose" size="xs">
                    <ArrowUpRight className="w-3 h-3" />
                    Disbursement Outflow
                  </Badge>
                )}

                {(tx.academic_year || tx.semester) && (
                  <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                    {tx.academic_year || '2025-2026'} · {tx.semester || '2nd Sem'}
                  </span>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setSelectedTx(null)}
                aria-label="Close"
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Scrollable Modal Content: Clean Single-Column Flow */}
            <div className="space-y-5 text-xs">
              
              {/* Deck 0: Borderless Financial Statement Hero Header */}
              <div className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-[10px] font-bold uppercase tracking-wider block text-zinc-400 dark:text-zinc-500">
                  {tx.type === 'INFLOW' ? 'Total Revenue Inflow' : isAbono ? 'Advance Out-of-Pocket Amount' : 'Disbursement Outflow'}
                </span>
                
                <div className={`text-3xl sm:text-4xl font-black font-mono tracking-tight tabular-nums mt-1 ${
                  tx.type === 'INFLOW' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-950 dark:text-zinc-50'
                }`}>
                  {tx.type === 'INFLOW' ? '+' : '-'}{formatPHP(tx.amount)}
                </div>

                <div className="flex items-center gap-2 flex-wrap mt-2.5 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                  {/* Date */}
                  <span className="font-mono tabular-nums">{formatFriendlyDate(tx.transaction_date)}</span>
                  
                  <span className="text-zinc-300 dark:text-zinc-700">·</span>
                  
                  {/* Channel with micro-dot */}
                  <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${tx.payment_method === 'CASH' ? 'bg-emerald-500' : 'bg-sky-500'}`} />
                    <span>{tx.payment_method === 'CASH' ? 'Cashbox' : 'GCash Wallet'}</span>
                  </span>

                  <span className="text-zinc-300 dark:text-zinc-700">·</span>

                  {/* Category */}
                  <span className="text-zinc-700 dark:text-zinc-300 font-semibold">
                    {tx.category_name || (tx.type === 'INFLOW' ? 'Revenue' : 'Disbursement')}
                  </span>
                </div>
              </div>

              {/* Deck 1: Transaction Story (Full-Width) */}
              <div className="space-y-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-zinc-400 dark:text-zinc-500">
                    Transaction Title / Purpose
                  </span>
                  <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug break-words">
                    {tx.title}
                  </h4>
                </div>

                {tx.event_name && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider block mb-0.5 text-zinc-400 dark:text-zinc-500">
                      Linked Event / Activity
                    </span>
                    <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {tx.event_name}
                    </p>
                  </div>
                )}

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block mb-0.5 text-zinc-400 dark:text-zinc-500">
                    Description &amp; Remarks
                  </span>
                  <p className={`leading-relaxed text-xs ${
                    tx.description 
                      ? 'text-zinc-700 dark:text-zinc-300' 
                      : 'text-zinc-400 dark:text-zinc-500 italic'
                  }`}>
                    {tx.description || 'No additional notes recorded for this transaction.'}
                  </p>
                </div>
              </div>

              {/* Deck 2: Accountability & Verification Bar */}
              <div className="space-y-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                {/* Abono Banner if applicable */}
                {isAbono && (
                  <div className={`p-3 rounded-xl border ${
                    isSettled
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
                      : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
                  }`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <HandCoins className="w-3.5 h-3.5" />
                        <span>Personal Advance (Abono) · Advanced by: {tx.reimbursement_recipient || 'Officer'}</span>
                      </div>
                      <Badge variant={isSettled ? 'emerald' : 'amber'} size="xs">
                        {isSettled ? 'Settled / Reimbursed' : 'Awaiting Payout'}
                      </Badge>
                    </div>
                    <p className="text-[11px] mt-1.5 leading-snug opacity-90">
                      {isSettled
                        ? 'Funds have been disbursed to the claimant and recognized as a formal ledger outflow.'
                        : 'Personal funds advanced off-campus. Will be reimbursed once cashbox liquidates.'}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Logged by */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider block mb-1.5 text-zinc-400 dark:text-zinc-500">
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
                          <span className="text-[11px] truncate block text-zinc-400 dark:text-zinc-500">
                            {loggerEmail}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Audit verification & ID */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider block mb-1.5 text-zinc-400 dark:text-zinc-500">
                      Audit Verification
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>Verified Official Ledger Entry</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                      <span>ID:</span>
                      <span className="font-mono text-[10px]">
                        {String(tx.id)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Frameless Receipts Gallery Section */}
              <div className="space-y-3">
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
                  <div className="py-6 px-4 text-center rounded-xl bg-zinc-50/60 dark:bg-zinc-900/40 text-zinc-400 dark:text-zinc-500">
                    <Receipt className="w-7 h-7 mx-auto mb-1.5 opacity-40" />
                    <p className="font-semibold text-xs">No receipt photo attached to this entry.</p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">Physical paper receipt or signed petty cash voucher may be filed offline.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Active Large Preview */}
                    <div className="relative aspect-4/3 max-h-[340px] rounded-xl overflow-hidden bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shadow-xs">
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
                        className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs transition-colors shadow-xs"
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
                  !settleAmount ||
                  parseFloat(settleAmount) <= 0 ||
                  parseFloat(settleAmount) > Number(settleTx.amount) ||
                  (settleMethod === 'CASH' && cashBalance < parseFloat(settleAmount)) ||
                  (settleMethod === 'GCASH' && gcashBalance < parseFloat(settleAmount))
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

              {/* Editable Refund / Disbursement Amount */}
              <div className="pt-2.5 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Disbursement Amount
                  </span>
                  <span className="text-xs text-zinc-500">
                    Total Claim: <strong className="text-zinc-900 dark:text-zinc-100">{formatPHP(settleTx.amount)}</strong>
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={settleTx.amount}
                    value={settleAmount}
                    onChange={(e) => {
                      setSettleAmount(e.target.value);
                      setSettleError(null);
                    }}
                    placeholder="Enter amount to disburse..."
                    className="w-full text-base font-bold pl-7 pr-3 py-2 rounded-xl bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>
                    Remaining after payout:{' '}
                    <strong className="text-zinc-800 dark:text-zinc-200">
                      {formatPHP(Math.max(0, Number(settleTx.amount || 0) - (parseFloat(settleAmount) || 0)))}
                    </strong>
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSettleAmount((Number(settleTx.amount || 0) * 0.5).toFixed(2))}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettleAmount(settleTx.amount.toString())}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 cursor-pointer"
                    >
                      Full
                    </button>
                  </div>
                </div>
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
                    cashBalance < (parseFloat(settleAmount) || 0)
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
                    gcashBalance < (parseFloat(settleAmount) || 0)
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
              const req = parseFloat(settleAmount) || 0;
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
