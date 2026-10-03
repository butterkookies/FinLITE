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
  FileText,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Camera,
  Loader2,
  X
} from 'lucide-react';
import { formatPHP } from '@/lib/utils/currency';
import { compressReceiptImage } from '@/lib/utils/compression';

export default function TransactionTable({ 
  transactions = [], 
  onNewTransaction, 
  onExportReport,
  onNewProposal,
  onAttachReceipt,
  currentRole,
  isDbConnected = false
}) {
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
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-950 tracking-tight">
              Financial Ledger & Transactions
            </h2>
            {isDbConnected && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-gray-50 text-gray-700 border border-black/[0.08]">
                Live
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 font-medium">
            Real-time auditable record of organization inflows and disbursements
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Review & Export Report Button */}
          <button
            onClick={onExportReport}
            className="flex-1 sm:flex-initial h-9 flex items-center justify-center gap-1.5 px-3 text-xs font-semibold text-gray-900 bg-white hover:bg-gray-50 active:bg-gray-100 border border-black/[0.08] rounded-xl transition-all shadow-xs whitespace-nowrap cursor-pointer"
            title="Preview 1:1 PDM CCS Formal Word Liquidation Report & Live Edit"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>Preview Report</span>
          </button>

          {/* New Transaction Button (Admin/Treasurer/Auditor) */}
          {(currentRole === 'admin' || currentRole === 'treasurer' || currentRole === 'auditor') && (
            <button
              onClick={onNewTransaction}
              className="col-span-2 sm:col-span-1 h-9 flex items-center justify-center gap-1.5 px-3.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 rounded-xl transition-all shadow-xs whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
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
            className="w-full h-9 text-xs bg-white pl-8 pr-3 border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-gray-900 select-text"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'All Records' },
            { id: 'INFLOW', label: 'Inflows' },
            { id: 'OUTFLOW', label: 'Outflows' },
            { id: 'REIMBURSEMENT', label: 'Pending Abono' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`h-7 px-2.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
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

      {/* Desktop/Tablet Transactions Table (>= md) */}
      <div className="hidden md:block overflow-x-auto">
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
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-gray-700 bg-gray-50 border border-black/[0.06] px-1.5 py-0.5 rounded-md">
                        <Clock className="w-2.5 h-2.5 text-amber-600" />
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
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-700 bg-gray-50 border border-black/[0.06] px-2 py-0.5 rounded-md">
                        <Wallet className="w-3 h-3 text-emerald-700" />
                        Cash
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-700 bg-gray-50 border border-black/[0.06] px-2 py-0.5 rounded-md">
                        <Smartphone className="w-3 h-3 text-blue-600" />
                        GCash
                      </span>
                    )}
                  </td>

                  {/* Category */}
                  <td className="py-3 px-3 text-gray-600 font-medium whitespace-nowrap">
                    <span className="bg-gray-50 border border-black/[0.06] text-gray-700 text-[11px] px-2 py-0.5 rounded-md">
                      {tx.category_name || (tx.type === 'INFLOW' ? 'Revenue' : 'Disbursement')}
                    </span>
                  </td>

                  {/* Amount */}
                  <td className={`py-3 px-3 text-right font-bold whitespace-nowrap tabular-nums ${
                    tx.type === 'INFLOW' ? 'text-emerald-700' : 'text-gray-900'
                  }`}>
                    {tx.type === 'INFLOW' ? '+' : '-'}{formatPHP(tx.amount)}
                  </td>

                  {/* Receipt Preview & Action */}
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    {(() => {
                      const receipts = getTransactionReceipts(tx);
                      if (receipts.length > 0) {
                        return (
                          <button
                            onClick={() => {
                              setSelectedReceipt(tx);
                              setActivePhotoIndex(0);
                            }}
                            className="h-7 inline-flex items-center gap-1.5 text-[11px] text-gray-700 hover:text-emerald-950 font-medium bg-white hover:bg-emerald-50 active:bg-emerald-100 border border-emerald-200/80 px-2.5 rounded-lg transition-colors shadow-2xs cursor-pointer"
                            title={`View ${receipts.length} attached receipt photo${receipts.length > 1 ? 's' : ''}`}
                          >
                            <Receipt className="w-3 h-3 text-emerald-700" />
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
                            className="h-7 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-900 bg-emerald-50/70 hover:bg-emerald-100/80 border border-dashed border-emerald-300 px-2 rounded-lg transition-colors cursor-pointer"
                            title="Attach receipt or proof for this transaction"
                          >
                            <Plus className="w-3 h-3 text-emerald-600" />
                            <span>Attach</span>
                          </button>
                        );
                      }
                      return <span className="text-[11px] text-gray-400 italic">None</span>;
                    })()}
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Transactions Card Feed (< md) */}
      <div className="md:hidden divide-y divide-black/[0.04]">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-gray-400 font-medium text-xs">
            No matching transactions found.
          </div>
        ) : (
          filtered.map((tx) => (
            <div key={tx.id} className="p-3.5 space-y-2 hover:bg-gray-50/80 transition-colors">
              {/* Top Row: Title, Type icon & Amount */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {tx.type === 'INFLOW' ? (
                    <ArrowDownRight className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <span className="font-semibold text-gray-900 text-xs truncate">{tx.title}</span>
                </div>
                <span className={`font-bold text-xs shrink-0 whitespace-nowrap tabular-nums ${
                  tx.type === 'INFLOW' ? 'text-emerald-700' : 'text-gray-900'
                }`}>
                  {tx.type === 'INFLOW' ? '+' : '-'}{formatPHP(tx.amount)}
                </span>
              </div>

              {/* Middle Row: Date, Channel & Category */}
              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                <span className="text-gray-400 font-medium text-[10px]">{tx.transaction_date}</span>
                <span className="text-gray-300 mx-0.5">/</span>
                {tx.payment_method === 'CASH' ? (
                  <span className="inline-flex items-center gap-1 font-medium text-gray-700 bg-gray-50 border border-black/[0.06] px-1.5 py-0.5 rounded text-[10px]">
                    <Wallet className="w-3 h-3 text-emerald-700" />
                    Cash
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-medium text-gray-700 bg-gray-50 border border-black/[0.06] px-1.5 py-0.5 rounded text-[10px]">
                    <Smartphone className="w-3 h-3 text-blue-600" />
                    GCash
                  </span>
                )}
                <span className="bg-gray-50 border border-black/[0.06] text-gray-700 px-1.5 py-0.5 rounded text-[10px] truncate max-w-[140px]">
                  {tx.category_name || (tx.type === 'INFLOW' ? 'Revenue' : 'Disbursement')}
                </span>
              </div>

              {/* Bottom Row: Event, Advance note & Receipt Action */}
              {(tx.event_name || tx.is_reimbursement || tx.receipt_url || (Array.isArray(tx.receipt_urls) && tx.receipt_urls.length > 0) || isAuthorized) && (
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    {tx.event_name && (
                      <span className="text-[10px] text-gray-400 font-medium truncate">
                        {tx.event_name}
                      </span>
                    )}
                    {tx.is_reimbursement && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-700 bg-gray-50 border border-black/[0.06] px-1.5 py-0.5 rounded-md">
                        <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                        Advance: {tx.reimbursement_recipient || 'Officer'}
                      </span>
                    )}
                  </div>
                  {(() => {
                    const receipts = getTransactionReceipts(tx);
                    if (receipts.length > 0) {
                      return (
                        <button
                          onClick={() => {
                            setSelectedReceipt(tx);
                            setActivePhotoIndex(0);
                          }}
                          className="h-7 inline-flex items-center gap-1 text-[11px] text-gray-700 hover:text-emerald-950 font-medium bg-white hover:bg-emerald-50 active:bg-emerald-100 border border-emerald-200/80 px-2.5 rounded-lg transition-colors shrink-0 ml-auto cursor-pointer"
                        >
                          <Receipt className="w-3 h-3 text-emerald-700" />
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
                          className="h-7 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-900 bg-emerald-50 border border-dashed border-emerald-300 px-2 rounded-lg transition-colors shrink-0 ml-auto cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-emerald-600" />
                          <span>Attach</span>
                        </button>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Receipt Modal Preview */}
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
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
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
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
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
                  Attach Receipts & Proofs
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
                        <span>Upload & Attach ({attachFiles.length})</span>
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
