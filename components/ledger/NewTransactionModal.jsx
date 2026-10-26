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
  transactionToEdit = null,
  userPermissions = null,
}) {
  const canInflow = userPermissions ? Boolean(userPermissions.record_inflow) : true;
  const canOutflow = userPermissions ? Boolean(userPermissions.record_outflow) : true;
  const canAbono = userPermissions ? Boolean(userPermissions.record_abono) : true;

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
  const [advancedByName, setAdvancedByName] = useState('');
  const [isProxyClaimant, setIsProxyClaimant] = useState(false);
  const [receiptFiles, setReceiptFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [compressing, setCompressing] = useState(false);
  const [croppingIndex, setCroppingIndex] = useState(null);
  const [auditorRemarks, setAuditorRemarks] = useState([]);
  const [loadingAuditorRemarks, setLoadingAuditorRemarks] = useState(false);

  // Amount validation: format/limit first, then physical cashbox balance check
  // When editing an existing transaction, reverse its prior contribution to cashBalance so we don't double-count it
  const effectiveCashBalance = (() => {
    const baseCash = Number(cashBalance) || 0;
    if (!transactionToEdit) return baseCash;
    const prevAmt = Number(transactionToEdit.amount) || 0;
    if (transactionToEdit.type === 'OUTFLOW') {
      const wasPendingAbono =
        transactionToEdit.is_reimbursement && transactionToEdit.status === 'PENDING_REIMBURSEMENT';
      return wasPendingAbono ? baseCash : baseCash + prevAmt;
    }
    if (transactionToEdit.type === 'INFLOW') {
      return Math.max(0, baseCash - prevAmt);
    }
    return baseCash;
  })();

  const amountError = validateTransactionAmount(amount);
  const balanceError = amountError
    ? null
    : validateOutflowBalance({
        type,
        isReimbursement,
        amount,
        cashBalance: effectiveCashBalance,
      });
  const fieldError = (amountTouched && amountError) || balanceError;
  const showOutflowBalance = type === 'OUTFLOW' && !isReimbursement;
  const availableBalance = effectiveCashBalance;

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

  // Populate fields when opening modal (either blank or pre-filled for editing)
  useEffect(() => {
    let isCancelled = false;
    if (isOpen) {
      if (transactionToEdit) {
        setTitle(transactionToEdit.title || '');
        setAmount(transactionToEdit.amount !== undefined ? transactionToEdit.amount.toString() : '');
        setType(transactionToEdit.type || (canOutflow ? 'OUTFLOW' : 'INFLOW'));
        setCategoryName(transactionToEdit.category_name || transactionToEdit.categories?.name || 'Supplies & Materials');
        setCategoryId(transactionToEdit.category_id || null);
        setEventName(transactionToEdit.event_name || '');
        setIsReimbursement(Boolean(transactionToEdit.is_reimbursement));
        const rec = transactionToEdit.reimbursement_recipient || '';
        const advBy = transactionToEdit.advanced_by_name || rec;
        setRecipient(rec);
        setAdvancedByName(advBy);
        setIsProxyClaimant(Boolean(advBy && rec && advBy !== rec));
        const existingReceipts = transactionToEdit.transaction_receipts?.map((r) => r.public_url || r.file_url) ||
          (transactionToEdit.receipt_url ? [transactionToEdit.receipt_url] : []);
        setPreviewUrls(existingReceipts);
        setReceiptFiles([]);
        if (transactionToEdit.id) {
          setLoadingAuditorRemarks(true);
          fetch(`/api/transactions/${transactionToEdit.id}/comments`)
            .then((r) => r.json())
            .then((data) => {
              if (!isCancelled) {
                setAuditorRemarks(Array.isArray(data?.comments) ? data.comments : []);
              }
            })
            .catch(() => {
              if (!isCancelled) setAuditorRemarks([]);
            })
            .finally(() => {
              if (!isCancelled) setLoadingAuditorRemarks(false);
            });
        } else {
          setAuditorRemarks([]);
        }
      } else {
        setType(canOutflow ? 'OUTFLOW' : 'INFLOW');
        setTitle('');
        setAmount('');
        setEventName('');
        setIsReimbursement(false);
        setRecipient('');
        setAdvancedByName('');
        setIsProxyClaimant(false);
        setReceiptFiles([]);
        setPreviewUrls([]);
        setAuditorRemarks([]);
        setLoadingAuditorRemarks(false);
      }
      setAmountTouched(false);
      setFormErrors({});
      setShakeKey(0);
      setCroppingIndex(null);
    }
    return () => {
      isCancelled = true;
    };
  }, [isOpen, transactionToEdit, canOutflow]);

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
      ...(transactionToEdit ? { id: transactionToEdit.id } : {}),
      title: title.trim(),
      amount: parseFloat(amount),
      type,
      payment_method: 'CASH',
      category_id: categoryId,
      category_name: categoryName,
      event_name: eventName ? eventName.trim() : null,
      is_reimbursement: isReimbursement,
      reimbursement_recipient: isReimbursement ? recipient.trim() : null,
      advanced_by_name: isReimbursement ? (isProxyClaimant ? (advancedByName.trim() || recipient.trim()) : recipient.trim()) : null,
      receipt_url: previewUrls[0] || null,
      receipt_urls: previewUrls,
      receiptFile: receiptFiles[0] || null,
      receiptFiles: receiptFiles,
      transaction_date: transactionToEdit?.transaction_date || new Date().toISOString().split('T')[0],
      status: transactionToEdit?.status === 'FLAGGED' ? 'PENDING_AUDIT' : (transactionToEdit?.status || 'PENDING_AUDIT'),
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
        title={
          transactionToEdit
            ? (transactionToEdit.status === 'FLAGGED' ? 'Revise Flagged Transaction' : 'Edit Transaction Details')
            : 'Record Transaction'
        }
        description={
          transactionToEdit
            ? 'Update transaction details and replace or attach proof'
            : 'Log an authorized inflow or disbursement'
        }
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
              {transactionToEdit
                ? (transactionToEdit.status === 'FLAGGED' ? 'Resubmit for Audit' : 'Update Record')
                : 'Save Record'}
            </Button>
          </>
        }
      >
        {/* Form Body */}
        <form id="new-transaction-form" onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
          {transactionToEdit && (transactionToEdit.status === 'FLAGGED' || auditorRemarks.length > 0) && (
            <div className="rounded-xl p-3 bg-rose-50/70 dark:bg-rose-950/30 ring-1 ring-rose-500/25 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-2xs uppercase tracking-wider font-bold text-rose-700 dark:text-rose-400">
                  Auditor Revision Remarks
                </span>
                <span className="text-2xs font-semibold text-rose-600 dark:text-rose-400">
                  Resubmits to Pending Audit
                </span>
              </div>
              {loadingAuditorRemarks ? (
                <p className="text-2xs text-zinc-500 dark:text-zinc-400">Loading auditor remarks...</p>
              ) : auditorRemarks.length === 0 ? (
                <p className="text-2xs text-zinc-600 dark:text-zinc-400">
                  Please review the transaction details and attached receipt proof before resubmitting.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {auditorRemarks.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-lg bg-white/90 dark:bg-zinc-900/80 p-2 ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
                    >
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-2xs font-bold text-zinc-900 dark:text-zinc-100">
                          {c.author_name || 'Auditor'}{' '}
                          <span className="font-normal text-zinc-500">({c.author_role || 'Auditor'})</span>
                        </span>
                      </div>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                        {c.comment_text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Type Toggle: Inflow vs Outflow */}
          <div className="grid grid-cols-2 gap-2 bg-zinc-100/80 dark:bg-zinc-900/90 p-1 rounded-2xl ring-1 ring-black/[0.04] dark:ring-white/[0.08]">
            <Button
              type="button"
              disabled={!canInflow && !transactionToEdit}
              variant={type === 'INFLOW' ? 'primary' : 'ghost'}
              size="md"
              onClick={() => {
                setType('INFLOW');
                setCategoryName('Tournament & E-Sports Registration Fees');
              }}
              className={`${type === 'INFLOW' ? 'bg-emerald-600 dark:bg-emerald-600 text-white' : 'text-zinc-600 dark:text-zinc-400'} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              + Inflow (Income)
            </Button>
            <Button
              type="button"
              disabled={!canOutflow && !transactionToEdit}
              variant={type === 'OUTFLOW' ? 'amber-subtle' : 'ghost'}
              size="md"
              onClick={() => {
                setType('OUTFLOW');
                setCategoryName('Supplies & Materials');
              }}
              className={`${type === 'OUTFLOW' ? 'bg-amber-600 text-white hover:bg-amber-700' : 'text-zinc-600 dark:text-zinc-400'} disabled:opacity-40 disabled:cursor-not-allowed`}
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
                className={`w-full h-10 text-sm font-bold pl-7 pr-3 bg-zinc-100/70 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 rounded-xl ring-1 ring-black/[0.04] dark:ring-white/[0.08] focus:outline-none focus:bg-white dark:focus:bg-zinc-800 transition-all tabular-nums select-text ${
                  (formErrors.amount || fieldError)
                    ? 'ring-2 ring-rose-500/50'
                    : 'focus:ring-2 focus:ring-emerald-500/40'
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
              className={`w-full h-10 px-3 bg-zinc-100/70 dark:bg-zinc-800 rounded-xl ring-1 ring-black/[0.04] dark:ring-white/[0.08] focus:outline-none focus:bg-white dark:focus:bg-zinc-800 transition-all text-zinc-900 dark:text-zinc-100 select-text ${
                formErrors.title
                  ? 'ring-2 ring-rose-500/50'
                  : 'focus:ring-2 focus:ring-emerald-500/40'
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
                className="w-full h-10 px-3 bg-zinc-100/70 dark:bg-zinc-800 hover:bg-zinc-200/60 dark:hover:bg-zinc-700 ring-1 ring-black/[0.04] dark:ring-white/[0.08] rounded-xl flex items-center justify-between text-zinc-900 dark:text-zinc-100 font-medium transition-colors cursor-pointer text-left"
              >
                <span className="truncate">{categoryName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0 ml-1" />
              </button>

              {isCategoryOpen && (
                <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-[#18181b] rounded-xl shadow-xl ring-1 ring-black/[0.06] dark:ring-white/[0.08] py-1 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-48 overflow-y-auto">
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
                className="w-full h-10 px-3 bg-zinc-100/70 dark:bg-zinc-800 rounded-xl ring-1 ring-black/[0.04] dark:ring-white/[0.08] focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:bg-white dark:focus:bg-zinc-800 text-zinc-900 dark:text-zinc-100 select-text transition-all"
              />
            </div>
          </div>

          {/* Abono / Personal Advance Checkbox (Outflow only) */}
          {type === 'OUTFLOW' && (
            <div className="py-2.5 space-y-2.5">
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
                <div className="space-y-3 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-600 dark:text-zinc-400">
                    <input
                      type="checkbox"
                      checked={isProxyClaimant}
                      onChange={(e) => setIsProxyClaimant(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Authorized proxy is collecting payout on behalf of original payer</span>
                  </label>

                  {isProxyClaimant ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                          Originally Paid By (Creditor): <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Ms. Kimberly Dawn Jatulan"
                          value={advancedByName}
                          onChange={(e) => setAdvancedByName(e.target.value)}
                          className="w-full h-9 px-3 bg-zinc-100/70 dark:bg-zinc-800 rounded-xl ring-1 ring-black/[0.04] dark:ring-white/[0.08] focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-zinc-900 dark:text-zinc-100 text-xs"
                        />
                      </div>
                      <div className={formErrors.recipient ? 'animate-field-shake' : ''} key={`rec-${shakeKey}`}>
                        <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                          Authorized Cash Claimant (Proxy): <span className="text-rose-500">*</span>
                        </label>
                        <input
                          ref={recipientInputRef}
                          type="text"
                          placeholder="e.g. Andrei Geronimo"
                          value={recipient}
                          onChange={(e) => {
                            setRecipient(e.target.value);
                            if (formErrors.recipient) setFormErrors((prev) => ({ ...prev, recipient: null }));
                          }}
                          className={`w-full h-9 px-3 bg-zinc-100/70 dark:bg-zinc-800 rounded-xl ring-1 ring-black/[0.04] dark:ring-white/[0.08] focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-zinc-900 dark:text-zinc-100 text-xs ${formErrors.recipient ? 'ring-2 ring-rose-500/50' : ''}`}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className={formErrors.recipient ? 'animate-field-shake' : ''} key={`rec-${shakeKey}`}>
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
                        className={`w-full h-9 px-3 bg-zinc-100/70 dark:bg-zinc-800 rounded-xl ring-1 ring-black/[0.04] dark:ring-white/[0.08] focus:outline-none focus:bg-white dark:focus:bg-zinc-800 transition-all text-zinc-900 dark:text-zinc-100 select-text ${
                          formErrors.recipient
                            ? 'ring-2 ring-rose-500/50'
                            : 'focus:ring-2 focus:ring-emerald-500/40'
                        }`}
                      />
                    </div>
                  )}

                  {formErrors.recipient && (
                    <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1.5 animate-in fade-in duration-150">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                      <span>{formErrors.recipient}</span>
                    </p>
                  )}
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Will be queued under Pending Reimbursements until cash is refunded.
                  </p>
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
                  <div key={idx} className="relative group rounded-xl overflow-hidden ring-1 ring-black/[0.05] dark:ring-white/[0.08] bg-zinc-100 dark:bg-zinc-900 aspect-square">
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
              <label className="h-10 flex items-center justify-center gap-2 px-3 bg-zinc-100/70 dark:bg-zinc-800 hover:bg-zinc-200/60 dark:hover:bg-zinc-700 rounded-xl ring-1 ring-black/[0.04] dark:ring-white/[0.08] cursor-pointer transition-colors shadow-xs">
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
