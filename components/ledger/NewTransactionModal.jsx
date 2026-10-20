'use client';
import { useState, useRef, useEffect } from 'react';
import { Camera, Check, ChevronDown, Crop, Upload, X, AlertCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { compressReceiptImage } from '@/lib/utils/compression';

const ReceiptCropModal = dynamic(() => import('@/components/common/ReceiptCropModal'), {
  ssr: false,
  loading: () => null,
});
import {
  sanitizeAmountInput,
  validateTransactionAmount,
  validateOutflowBalance,
} from '@/lib/utils/validation';
import { formatPHP } from '@/lib/utils/currency';
import { 
  OFFICIAL_INFLOW_CATEGORIES, 
  OFFICIAL_OUTFLOW_CATEGORIES 
} from '@/lib/config/categories';
import { Button, Badge, Modal } from '@/components/ui';

export default function NewTransactionModal({
  isOpen,
  onClose,
  onSave,
  categories = [],
  cashBalance = 0,
}) {
  const [type, setType] = useState('OUTFLOW');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [amountTouched, setAmountTouched] = useState(false);
  const [categoryName, setCategoryName] = useState('Supplies & Materials');
  const [categoryId, setCategoryId] = useState(null);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryRef = useRef(null);

  // Field refs & validation state
  const amountInputRef = useRef(null);
  const titleInputRef = useRef(null);
  const recipientInputRef = useRef(null);
  const [formErrors, setFormErrors] = useState({});
  const [shakeKey, setShakeKey] = useState(0);

  const [eventName, setEventName] = useState('');
  const [isReimbursement, setIsReimbursement] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [receiptFiles, setReceiptFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [compressing, setCompressing] = useState(false);
  const [croppingIndex, setCroppingIndex] = useState(null);

  // Amount validation: format/limit first, then physical cashbox balance check
  const amountError = validateTransactionAmount(amount);
  const balanceError = amountError
    ? null
    : validateOutflowBalance({
        type,
        isReimbursement,
        amount,
        cashBalance,
      });
  const fieldError = (amountTouched && amountError) || balanceError;
  const showOutflowBalance = type === 'OUTFLOW' && !isReimbursement;
  const availableBalance = cashBalance;

  // Sync categoryId with categoryName / type whenever categories or type changes
  useEffect(() => {
    if (categories && categories.length > 0) {
      const match = categories.find((c) => c.type === type && c.name.toLowerCase() === categoryName.toLowerCase());
      if (match) {
        setCategoryId(match.id);
        setCategoryName(match.name);
      } else {
        const first = categories.find((c) => c.type === type);
        if (first) {
          setCategoryId(first.id);
          setCategoryName(first.name);
        }
      }
    }
  }, [type, categories]);

  // Reset fields when opening modal
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setAmount('');
      setAmountTouched(false);
      setFormErrors({});
      setShakeKey(0);
      setEventName('');
      setIsReimbursement(false);
      setRecipient('');
      setReceiptFiles([]);
      setPreviewUrls([]);
      setCroppingIndex(null);
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

  const handleConfirmCrop = async (croppedFile) => {
    if (croppingIndex === null || croppingIndex >= receiptFiles.length) return;
    setCompressing(true);
    try {
      const compressed = await compressReceiptImage(croppedFile);
      const newUrl = URL.createObjectURL(compressed);

      setReceiptFiles((prev) => {
        const next = [...prev];
        next[croppingIndex] = compressed;
        return next;
      });

      setPreviewUrls((prev) => {
        const next = [...prev];
        try { URL.revokeObjectURL(next[croppingIndex]); } catch (_) {}
        next[croppingIndex] = newUrl;
        return next;
      });
    } catch (err) {
      console.error('Error compressing cropped receipt:', err);
    } finally {
      setCompressing(false);
      setCroppingIndex(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setAmountTouched(true);

    const nextErrors = {};

    // 1. Amount validation
    if (!amount || parseFloat(amount) <= 0) {
      nextErrors.amount = 'Please enter an amount greater than ₱0.00';
    } else if (amountError) {
      nextErrors.amount = amountError;
    } else if (balanceError) {
      nextErrors.amount = balanceError;
    }

    // 2. Title validation
    if (!title.trim()) {
      nextErrors.title = 'Please enter a transaction title (e.g. Tarpaulin for Booth)';
    }

    // 3. Reimbursement Recipient validation
    if (isReimbursement && !recipient.trim()) {
      nextErrors.recipient = 'Please enter the name of the officer who paid this advance';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      setShakeKey((prev) => prev + 1);

      // Auto-focus first invalid input
      if (nextErrors.amount && amountInputRef.current) {
        amountInputRef.current.focus();
      } else if (nextErrors.title && titleInputRef.current) {
        titleInputRef.current.focus();
      } else if (nextErrors.recipient && recipientInputRef.current) {
        recipientInputRef.current.focus();
      }
      return;
    }

    onSave({
      title,
      amount: parseFloat(amount),
      type,
      payment_method: 'CASH',
      category_id: categoryId,
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
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="md"
        title="Record Transaction"
        description="Log an authorized inflow or disbursement"
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="new-transaction-form"
              variant="primary"
              size="sm"
            >
              Save Record
            </Button>
          </>
        }
      >
        {/* Form Body */}
        <form id="new-transaction-form" onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
          
          {/* Type Toggle: Inflow vs Outflow */}
          <div className="grid grid-cols-2 gap-2 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <Button
              type="button"
              variant={type === 'INFLOW' ? 'primary' : 'ghost'}
              size="md"
              onClick={() => {
                setType('INFLOW');
                setCategoryName('Tournament & E-Sports Registration Fees');
              }}
              className={type === 'INFLOW' ? 'bg-emerald-600 dark:bg-emerald-600 text-white' : 'text-zinc-600 dark:text-zinc-400'}
            >
              + Inflow (Income)
            </Button>
            <Button
              type="button"
              variant={type === 'OUTFLOW' ? 'amber-subtle' : 'ghost'}
              size="md"
              onClick={() => {
                setType('OUTFLOW');
                setCategoryName('Supplies & Materials');
              }}
              className={type === 'OUTFLOW' ? 'bg-amber-600 text-white hover:bg-amber-700' : 'text-zinc-600 dark:text-zinc-400'}
            >
              - Outflow
            </Button>
          </div>

          {/* Amount (₱) — max ₱99,999.99, outflows cannot exceed cashbox balance */}
          <div className={formErrors.amount ? 'animate-field-shake' : ''} key={`amt-${shakeKey}`}>
            <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
              Amount (₱) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400 font-bold text-sm pointer-events-none">
                ₱
              </span>
              <input
                ref={amountInputRef}
                type="text"
                inputMode="decimal"
                maxLength={8}
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(sanitizeAmountInput(e.target.value));
                  if (formErrors.amount) {
                    setFormErrors((prev) => ({ ...prev, amount: null }));
                  }
                }}
                onBlur={() => setAmountTouched(true)}
                aria-invalid={Boolean(formErrors.amount || fieldError)}
                className={`w-full h-10 text-sm font-bold pl-7 pr-3 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 border rounded-xl focus:outline-none transition-all tabular-nums select-text ${
                  (formErrors.amount || fieldError)
                    ? 'border-rose-500 ring-2 ring-rose-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-emerald-500/20'
                }`}
              />
            </div>
            {(formErrors.amount || fieldError) ? (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1.5 animate-in fade-in duration-150">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{formErrors.amount || fieldError}</span>
              </p>
            ) : (
              <p className="text-[11px] text-zinc-400 mt-1">
                Maximum ₱99,999.99
                {showOutflowBalance && (
                  <> · Available in Cashbox: {formatPHP(availableBalance)}</>
                )}
              </p>
            )}
          </div>

          {/* Title / Description */}
          <div className={formErrors.title ? 'animate-field-shake' : ''} key={`ttl-${shakeKey}`}>
            <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
              Item Title <span className="text-rose-500">*</span>
            </label>
            <input
              ref={titleInputRef}
              type="text"
              placeholder="e.g. Tarpaulin for Booth, MLBB Team Registration"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (formErrors.title) {
                  setFormErrors((prev) => ({ ...prev, title: null }));
                }
              }}
              aria-invalid={Boolean(formErrors.title)}
              className={`w-full h-10 px-3 bg-white dark:bg-zinc-900 border rounded-xl focus:outline-none transition-all text-zinc-900 dark:text-zinc-100 select-text ${
                formErrors.title
                  ? 'border-rose-500 ring-2 ring-rose-500/20'
                  : 'border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-emerald-500/20'
              }`}
            />
            {formErrors.title && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1.5 animate-in fade-in duration-150">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{formErrors.title}</span>
              </p>
            )}
          </div>

          {/* Category & Event in 2 Columns */}
          <div className="grid grid-cols-2 gap-3">
            <div className="relative" ref={categoryRef}>
              <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Category</label>
              <button
                type="button"
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="w-full h-10 px-3 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-between text-zinc-900 dark:text-zinc-100 font-medium transition-colors cursor-pointer text-left"
              >
                <span className="truncate">{categoryName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0 ml-1" />
              </button>

              {isCategoryOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-48 overflow-y-auto">
                  {(categories && categories.length > 0
                    ? categories.filter((c) => c.type === type)
                    : (type === 'INFLOW' ? OFFICIAL_INFLOW_CATEGORIES : OFFICIAL_OUTFLOW_CATEGORIES).map((catName) => ({ id: null, name: catName }))
                  ).map((cat) => {
                    const cName = cat.name || cat;
                    const cId = cat.id || null;
                    return (
                      <button
                        key={cId || cName}
                        type="button"
                        onClick={() => {
                          setCategoryId(cId);
                          setCategoryName(cName);
                          setIsCategoryOpen(false);
                        }}
                        className={`w-full h-9 flex items-center justify-between px-3 text-xs text-left cursor-pointer transition-colors ${
                          categoryName === cName 
                            ? 'bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-900 dark:text-zinc-100' 
                            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                        }`}
                      >
                        <span className="truncate">{cName}</span>
                        {categoryName === cName && (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 ml-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Event Tag</label>
              <input
                type="text"
                placeholder="e.g. Club Week 2026"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="w-full h-10 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-zinc-900 dark:text-zinc-100 select-text"
              />
            </div>
          </div>

          {/* Abono / Personal Advance Checkbox (Outflow only) */}
          {type === 'OUTFLOW' && (
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isReimbursement}
                  onChange={(e) => {
                    setIsReimbursement(e.target.checked);
                    if (!e.target.checked && formErrors.recipient) {
                      setFormErrors((prev) => ({ ...prev, recipient: null }));
                    }
                  }}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  This was an out-of-pocket advance (Abono)
                </span>
              </label>

              {isReimbursement && (
                <div className={`pt-1 ${formErrors.recipient ? 'animate-field-shake' : ''}`} key={`rec-${shakeKey}`}>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                    Advance Paid By: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    ref={recipientInputRef}
                    type="text"
                    placeholder="e.g. Ms. Kimberly Dawn Jatulan"
                    value={recipient}
                    onChange={(e) => {
                      setRecipient(e.target.value);
                      if (formErrors.recipient) {
                        setFormErrors((prev) => ({ ...prev, recipient: null }));
                      }
                    }}
                    aria-invalid={Boolean(formErrors.recipient)}
                    className={`w-full h-9 px-3 bg-white dark:bg-zinc-900 border rounded-xl focus:outline-none transition-all text-zinc-900 dark:text-zinc-100 select-text ${
                      formErrors.recipient
                        ? 'border-rose-500 ring-2 ring-rose-500/20'
                        : 'border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-emerald-500/20'
                    }`}
                  />
                  {formErrors.recipient ? (
                    <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1.5 animate-in fade-in duration-150">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                      <span>{formErrors.recipient}</span>
                    </p>
                  ) : (
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Will be queued under Pending Reimbursements until cash is refunded.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Receipt Image Upload with Auto-compression (Up to 3 images) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-zinc-700 dark:text-zinc-300 font-semibold">
                Receipts / Proofs ({receiptFiles.length}/3)
              </label>
              <span className="text-[10px] text-zinc-400">
                Max 3 images (Official Receipt, Petty Cash Slip, Invoice)
              </span>
            </div>

            {/* Thumbnail Previews */}
            {previewUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previewUrls.map((url, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 aspect-square">
                    <img src={url} alt={`Receipt ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setCroppingIndex(idx)}
                      className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/70 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors cursor-pointer"
                      title="Rotate & Crop photo"
                    >
                      <Crop className="w-2.5 h-2.5" />
                    </button>
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
              <label className="h-10 flex items-center justify-center gap-2 px-3 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 active:bg-zinc-100 dark:active:bg-zinc-700 border border-zinc-200 dark:border-zinc-800 rounded-xl cursor-pointer transition-colors shadow-2xs">
                <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">
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

            <p className="text-[10px] text-zinc-400">
              Automatically compressed to &lt;350KB each before cloud storage.
            </p>
          </div>
        </form>
      </Modal>

      {/* Interactive Crop & Rotation Modal */}
      {croppingIndex !== null && receiptFiles[croppingIndex] && (
        <ReceiptCropModal
          isOpen={croppingIndex !== null}
          imageFile={receiptFiles[croppingIndex]}
          onClose={() => setCroppingIndex(null)}
          onConfirm={handleConfirmCrop}
        />
      )}
    </>
  );
}
