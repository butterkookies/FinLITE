'use client';
import { useState, useRef, useEffect } from 'react';
import { Camera, Check, ChevronDown, Upload, X } from 'lucide-react';
import { compressReceiptImage } from '@/lib/utils/compression';
import { 
  OFFICIAL_INFLOW_CATEGORIES, 
  OFFICIAL_OUTFLOW_CATEGORIES 
} from '@/lib/config/categories';

export default function NewTransactionModal({ isOpen, onClose, onSave, categories = [] }) {
  const [type, setType] = useState('OUTFLOW');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryName, setCategoryName] = useState('Supplies & Materials');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryRef = useRef(null);

  const [eventName, setEventName] = useState('');
  const [isReimbursement, setIsReimbursement] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [receiptFiles, setReceiptFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [compressing, setCompressing] = useState(false);

  // Reset fields when opening modal
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setAmount('');
      setEventName('');
      setIsReimbursement(false);
      setRecipient('');
      setReceiptFiles([]);
      setPreviewUrls([]);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setIsCategoryOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImageChange = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const remainingSlots = 3 - receiptFiles.length;
    if (remainingSlots <= 0) return;

    const filesToProcess = selectedFiles.slice(0, remainingSlots);
    setCompressing(true);

    try {
      const processedFiles = [];
      const newUrls = [];

      for (const file of filesToProcess) {
        try {
          const compressed = await compressReceiptImage(file);
          processedFiles.push(compressed);
          newUrls.push(URL.createObjectURL(compressed));
        } catch (err) {
          console.error(err);
          processedFiles.push(file);
          newUrls.push(URL.createObjectURL(file));
        }
      }

      setReceiptFiles((prev) => [...prev, ...processedFiles]);
      setPreviewUrls((prev) => [...prev, ...newUrls]);
    } finally {
      setCompressing(false);
      e.target.value = '';
    }
  };

  const handleRemoveReceipt = (index) => {
    setReceiptFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => {
      try { URL.revokeObjectURL(prev[index]); } catch (_) {}
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !amount || parseFloat(amount) <= 0) return;

    onSave({
      title,
      amount: parseFloat(amount),
      type,
      payment_method: paymentMethod,
      category_name: categoryName,
      event_name: eventName,
      is_reimbursement: isReimbursement,
      reimbursement_recipient: isReimbursement ? recipient : null,
      receipt_url: previewUrls[0] || null,
      receipt_urls: previewUrls,
      receiptFile: receiptFiles[0] || null,
      receiptFiles: receiptFiles,
      transaction_date: new Date().toISOString().split('T')[0],
      status: isReimbursement ? 'PENDING_REIMBURSEMENT' : 'COMPLETED',
    });

    onClose();
  };

  // Safe early return after all hooks
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full border border-black/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-150">
        
        {/* Mobile Pull Handle */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-2.5 -mb-1 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-black/[0.06] flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-950">Record Transaction</h3>
            <p className="text-xs text-gray-500">Log an authorized inflow or disbursement</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto">
          
          {/* Type Toggle: Inflow vs Outflow */}
          <div className="grid grid-cols-2 gap-2 bg-gray-100/80 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setType('INFLOW');
                setCategoryName('Tournament & E-Sports Registration Fees');
              }}
              className={`h-10 rounded-xl font-semibold transition-all cursor-pointer ${
                type === 'INFLOW' 
                  ? 'bg-emerald-700 text-white shadow-xs' 
                  : 'text-gray-600 hover:text-gray-900 active:bg-gray-200/60'
              }`}
            >
              + Inflow (Income)
            </button>
            <button
              type="button"
              onClick={() => {
                setType('OUTFLOW');
                setCategoryName('Supplies & Materials');
              }}
              className={`h-10 rounded-xl font-semibold transition-all cursor-pointer ${
                type === 'OUTFLOW' 
                  ? 'bg-amber-600 text-white shadow-xs' 
                  : 'text-gray-600 hover:text-gray-900 active:bg-gray-200/60'
              }`}
            >
              - Outflow (Disbursement)
            </button>
          </div>

          {/* Payment Method Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium">Channel:</span>
            <div className="flex gap-2">
              {['CASH', 'GCASH'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`h-8 px-3 rounded-lg font-semibold transition-all cursor-pointer ${
                    paymentMethod === m 
                      ? 'bg-gray-900 text-white' 
                      : 'bg-white hover:bg-gray-50 active:bg-gray-100 border border-black/[0.08] text-gray-700'
                  }`}
                >
                  {m === 'CASH' ? 'Physical Cashbox' : 'GCash Wallet'}
                </button>
              ))}
            </div>
          </div>

          {/* Amount (₱) */}
          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Amount (₱) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm pointer-events-none">
                ₱
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-10 text-sm font-bold pl-7 pr-3 bg-white border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 tabular-nums select-text"
              />
            </div>
          </div>

          {/* Title / Description */}
          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Item Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Tarpaulin for Booth, MLBB Team Registration"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-gray-900 select-text"
            />
          </div>

          {/* Category & Event in 2 Columns */}
          <div className="grid grid-cols-2 gap-3">
            <div className="relative" ref={categoryRef}>
              <label className="block text-gray-700 font-semibold mb-1">Category</label>
              <button
                type="button"
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="w-full h-10 px-3 bg-white hover:bg-gray-50 active:bg-gray-100 border border-black/[0.08] rounded-xl flex items-center justify-between text-gray-900 font-medium transition-colors cursor-pointer text-left"
              >
                <span className="truncate">{categoryName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" />
              </button>

              {isCategoryOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-black/[0.08] rounded-xl shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-48 overflow-y-auto">
                  {(type === 'INFLOW' 
                    ? OFFICIAL_INFLOW_CATEGORIES 
                    : OFFICIAL_OUTFLOW_CATEGORIES
                  ).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setCategoryName(cat);
                        setIsCategoryOpen(false);
                      }}
                      className={`w-full h-9 flex items-center justify-between px-3 text-xs text-left cursor-pointer transition-colors ${
                        categoryName === cat 
                          ? 'bg-gray-50 font-semibold text-gray-950' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="truncate">{cat}</span>
                      {categoryName === cat && (
                        <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0 ml-1" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Event Tag</label>
              <input
                type="text"
                placeholder="e.g. Club Week 2026"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-gray-900 select-text"
              />
            </div>
          </div>

          {/* Abono / Personal Advance Checkbox (Outflow only) */}
          {type === 'OUTFLOW' && (
            <div className="p-3 bg-gray-50 border border-black/[0.08] rounded-xl space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isReimbursement}
                  onChange={(e) => setIsReimbursement(e.target.checked)}
                  className="rounded text-emerald-700 focus:ring-emerald-500"
                />
                <span className="font-semibold text-gray-900">
                  This was an out-of-pocket advance (Abono)
                </span>
              </label>

              {isReimbursement && (
                <div className="pt-1">
                  <label className="block text-gray-700 font-medium mb-1">
                    Advance Paid By:
                  </label>
                  <input
                    type="text"
                    required={isReimbursement}
                    placeholder="e.g. Ms. Kimberly Dawn Jatulan"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-gray-900 select-text"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Will be queued under Pending Reimbursements until cash is refunded.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Receipt Image Upload with Auto-compression (Up to 3 images) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-gray-700 font-semibold">
                Receipts / Proofs ({receiptFiles.length}/3)
              </label>
              <span className="text-[10px] text-gray-400">
                Max 3 images (OR, GCash, delivery/slip)
              </span>
            </div>

            {/* Thumbnail Previews */}
            {previewUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previewUrls.map((url, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-black/[0.08] bg-gray-100 aspect-square">
                    <img src={url} alt={`Receipt ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveReceipt(idx)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-colors cursor-pointer"
                      title="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-[9px] font-semibold text-white">
                      Photo {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Add / Upload Photo Button */}
            {receiptFiles.length < 3 && (
              <label className="h-10 flex items-center justify-center gap-2 px-3 bg-white hover:bg-gray-50 active:bg-gray-100 border border-black/[0.08] rounded-xl cursor-pointer transition-colors shadow-2xs">
                <Camera className="w-4 h-4 text-emerald-700" />
                <span className="text-gray-700 font-medium">
                  {compressing ? 'Compressing photo...' : receiptFiles.length === 0 ? 'Take or Upload Photo (Up to 3)' : `Add Another Photo (${receiptFiles.length}/3)`}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={compressing}
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}

            <p className="text-[10px] text-gray-400">
              Automatically compressed to &lt;350KB each before cloud storage.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-xl font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              Save Record
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
