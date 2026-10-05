'use client';
import { useState, useRef, useEffect } from 'react';
import { Camera, Check, ChevronDown, Upload, X, AlertCircle } from 'lucide-react';
import { compressReceiptImage } from '@/lib/utils/compression';

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
  const [receiptImage, setReceiptImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [compressing, setCompressing] = useState(false);

  // Validation & Form Submission State
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    function handleClickOutside(event) {
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setIsCategoryOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Instant inline validation helper
  const validateField = (fieldName, value, currentType = type, currentReimb = isReimbursement, currentRecipient = recipient) => {
    let err = '';
    if (fieldName === 'amount') {
      const num = parseFloat(value);
      if (!value || isNaN(num) || num <= 0) {
        err = 'Please enter a valid amount greater than ₱0.00';
      }
    } else if (fieldName === 'title') {
      if (!value || !value.trim()) {
        err = 'Item title is required.';
      }
    } else if (fieldName === 'recipient') {
      if (currentType === 'OUTFLOW' && currentReimb && (!currentRecipient || !currentRecipient.trim())) {
        err = 'Recipient name is required for advances.';
      }
    }
    return err;
  };

  const validateAll = () => {
    const newErrors = {};
    const amountErr = validateField('amount', amount);
    if (amountErr) newErrors.amount = amountErr;

    const titleErr = validateField('title', title);
    if (titleErr) newErrors.title = titleErr;

    if (type === 'OUTFLOW' && isReimbursement) {
      const recipientErr = validateField('recipient', recipient);
      if (recipientErr) newErrors.recipient = recipientErr;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAmountChange = (e) => {
    const val = e.target.value;
    setAmount(val);
    if (hasSubmitted) {
      const err = validateField('amount', val);
      setErrors((prev) => ({ ...prev, amount: err }));
    }
  };

  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);
    if (hasSubmitted) {
      const err = validateField('title', val);
      setErrors((prev) => ({ ...prev, title: err }));
    }
  };

  const handleRecipientChange = (e) => {
    const val = e.target.value;
    setRecipient(val);
    if (hasSubmitted) {
      const err = validateField('recipient', val, type, isReimbursement, val);
      setErrors((prev) => ({ ...prev, recipient: err }));
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressing(true);
    try {
      const compressed = await compressReceiptImage(file);
      setReceiptImage(compressed);
      setPreviewUrl(URL.createObjectURL(compressed));
    } catch (err) {
      console.error(err);
      setReceiptImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setHasSubmitted(true);
    setSubmitError('');

    if (!validateAll()) {
      return;
    }

    if (isSubmitting || compressing) return;

    setIsSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        amount: parseFloat(amount),
        type,
        payment_method: paymentMethod,
        category_name: categoryName,
        event_name: eventName?.trim() || '',
        is_reimbursement: isReimbursement,
        reimbursement_recipient: isReimbursement ? recipient.trim() : null,
        receipt_url: previewUrl || null,
        receiptFile: receiptImage || null,
        transaction_date: new Date().toISOString().split('T')[0],
        status: isReimbursement ? 'PENDING_REIMBURSEMENT' : 'COMPLETED',
      });
      onClose();
    } catch (err) {
      console.error('Transaction save error:', err);
      setSubmitError(err?.message || 'Failed to save transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Submit Error Banner */}
        {submitError && (
          <div className="mx-5 sm:mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto" noValidate>
          
          {/* Type Toggle: Inflow vs Outflow */}
          <div className="grid grid-cols-2 gap-2 bg-gray-100/80 p-1 rounded-2xl">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setType('INFLOW');
                setCategoryName('Booth Sales');
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
              disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                disabled={isSubmitting}
                placeholder="0.00"
                value={amount}
                onChange={handleAmountChange}
                onBlur={() => {
                  if (hasSubmitted) {
                    const err = validateField('amount', amount);
                    setErrors((prev) => ({ ...prev, amount: err }));
                  }
                }}
                className={`w-full h-10 text-sm font-bold pl-7 pr-3 bg-white rounded-xl focus:outline-none tabular-nums select-text transition-colors ${
                  errors.amount
                    ? 'border border-red-500 ring-2 ring-red-500/20 text-red-950'
                    : 'border border-black/[0.08] focus:ring-2 focus:ring-emerald-500/20 text-gray-900'
                }`}
              />
            </div>
            {errors.amount && (
              <p className="text-red-600 text-[11px] mt-1 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                <span>{errors.amount}</span>
              </p>
            )}
          </div>

          {/* Title / Description */}
          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Item Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              disabled={isSubmitting}
              placeholder="e.g. Tarpaulin for Booth, MLBB Team Registration"
              value={title}
              onChange={handleTitleChange}
              onBlur={() => {
                if (hasSubmitted) {
                  const err = validateField('title', title);
                  setErrors((prev) => ({ ...prev, title: err }));
                }
              }}
              className={`w-full h-10 px-3 bg-white rounded-xl focus:outline-none select-text transition-colors ${
                errors.title
                  ? 'border border-red-500 ring-2 ring-red-500/20 text-red-950'
                  : 'border border-black/[0.08] focus:ring-2 focus:ring-emerald-500/20 text-gray-900'
              }`}
            />
            {errors.title && (
              <p className="text-red-600 text-[11px] mt-1 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                <span>{errors.title}</span>
              </p>
            )}
          </div>

          {/* Category & Event in 2 Columns */}
          <div className="grid grid-cols-2 gap-3">
            <div className="relative" ref={categoryRef}>
              <label className="block text-gray-700 font-semibold mb-1">Category</label>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="w-full h-10 px-3 bg-white hover:bg-gray-50 active:bg-gray-100 border border-black/[0.08] rounded-xl flex items-center justify-between text-gray-900 font-medium transition-colors cursor-pointer text-left"
              >
                <span className="truncate">{categoryName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" />
              </button>

              {isCategoryOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-black/[0.08] rounded-xl shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-48 overflow-y-auto">
                  {(type === 'INFLOW' 
                    ? ['Booth Sales', 'E-Sports Registrations', 'Membership Dues', 'Sponsorship']
                    : ['Supplies & Materials', 'Food & Refreshments', 'Tournament Prizes', 'Tokens & Honoraria', 'Cash Shortage Discrepancy']
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
                disabled={isSubmitting}
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
                  disabled={isSubmitting}
                  checked={isReimbursement}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsReimbursement(checked);
                    if (!checked) {
                      setErrors((prev) => ({ ...prev, recipient: '' }));
                    }
                  }}
                  className="rounded text-emerald-700 focus:ring-emerald-500"
                />
                <span className="font-semibold text-gray-900">
                  This was an out-of-pocket advance (Abono)
                </span>
              </label>

              {isReimbursement && (
                <div className="pt-1">
                  <label className="block text-gray-700 font-medium mb-1">
                    Advance Paid By: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={isSubmitting}
                    placeholder="e.g. Ms. Kimberly Dawn Jatulan"
                    value={recipient}
                    onChange={handleRecipientChange}
                    className={`w-full h-9 px-3 bg-white rounded-xl focus:outline-none select-text transition-colors ${
                      errors.recipient
                        ? 'border border-red-500 ring-2 ring-red-500/20 text-red-950'
                        : 'border border-black/[0.08] focus:ring-2 focus:ring-emerald-500/20 text-gray-900'
                    }`}
                  />
                  {errors.recipient ? (
                    <p className="text-red-600 text-[11px] mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                      <span>{errors.recipient}</span>
                    </p>
                  ) : (
                    <p className="text-[10px] text-gray-500 mt-1">
                      Will be queued under Pending Reimbursements until cash is refunded.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Receipt Image Upload with Auto-compression */}
          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Receipt / Disbursement Proof
            </label>
            <div className="flex items-center gap-3">
              <label className="h-10 flex items-center gap-2 px-3 bg-white hover:bg-gray-50 active:bg-gray-100 border border-black/[0.08] rounded-xl cursor-pointer transition-colors shadow-2xs">
                <Camera className="w-4 h-4 text-emerald-700" />
                <span className="text-gray-700 font-medium">
                  {compressing ? 'Compressing photo...' : 'Take or Upload Photo'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={compressing || isSubmitting}
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>

              {previewUrl && (
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-black/[0.08] bg-gray-100">
                  <img src={previewUrl} alt="Receipt preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Automatically compressed to &lt;350KB before cloud storage.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 px-4 text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-xl font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || compressing}
              className="h-10 px-5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                'Save Record'
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
