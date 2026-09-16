'use client';
import { useState } from 'react';
import { Camera, Check, Upload, X } from 'lucide-react';
import { compressReceiptImage } from '@/lib/utils/compression';

export default function NewTransactionModal({ isOpen, onClose, onSave, categories = [] }) {
  if (!isOpen) return null;

  const [type, setType] = useState('OUTFLOW');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryName, setCategoryName] = useState('Supplies & Materials');
  const [eventName, setEventName] = useState('Club Week 2026');
  const [isReimbursement, setIsReimbursement] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [receiptImage, setReceiptImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [compressing, setCompressing] = useState(false);

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
      receipt_url: previewUrl || null,
      transaction_date: new Date().toISOString().split('T')[0],
      status: isReimbursement ? 'PENDING_REIMBURSEMENT' : 'COMPLETED',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full border border-black/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-950">Record Transaction</h3>
            <p className="text-xs text-gray-500">Log an authorized inflow or disbursement</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Type Toggle: Inflow vs Outflow */}
          <div className="grid grid-cols-2 gap-2 bg-gray-100/80 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setType('INFLOW');
                setCategoryName('Booth Sales');
              }}
              className={`py-2 rounded-xl font-semibold transition-all ${
                type === 'INFLOW' 
                  ? 'bg-emerald-700 text-white shadow-xs' 
                  : 'text-gray-600 hover:text-gray-900'
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
              className={`py-2 rounded-xl font-semibold transition-all ${
                type === 'OUTFLOW' 
                  ? 'bg-amber-600 text-white shadow-xs' 
                  : 'text-gray-600 hover:text-gray-900'
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
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                    paymentMethod === m 
                      ? 'bg-gray-900 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {m === 'CASH' ? 'Cash Lunchbox' : 'GCash Wallet'}
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
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
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
                className="w-full text-sm font-bold pl-7 pr-3 py-2 bg-gray-50 border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
              className="w-full px-3 py-2 bg-gray-50 border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Category & Event in 2 Columns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Category</label>
              <select
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="w-full px-2.5 py-2 bg-gray-50 border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {type === 'INFLOW' ? (
                  <>
                    <option value="Booth Sales">Booth Sales</option>
                    <option value="E-Sports Registrations">E-Sports Registrations</option>
                    <option value="Membership Dues">Membership Dues</option>
                    <option value="Sponsorship">Sponsorship</option>
                  </>
                ) : (
                  <>
                    <option value="Supplies & Materials">Supplies & Materials</option>
                    <option value="Food & Refreshments">Food & Refreshments</option>
                    <option value="Tournament Prizes">Tournament Prizes</option>
                    <option value="Tokens & Honoraria">Tokens & Honoraria</option>
                    <option value="Cash Shortage Discrepancy">Cash Shortage Discrepancy</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Event Tag</label>
              <input
                type="text"
                placeholder="e.g. Club Week 2026"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-black/[0.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Abono / Personal Advance Checkbox (Outflow only) */}
          {type === 'OUTFLOW' && (
            <div className="p-3 bg-amber-50/70 border border-amber-200/50 rounded-xl space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isReimbursement}
                  onChange={(e) => setIsReimbursement(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="font-semibold text-amber-900">
                  This was an out-of-pocket advance (Abono)
                </span>
              </label>

              {isReimbursement && (
                <div className="pt-1">
                  <label className="block text-amber-900 font-medium mb-1">
                    Advance Paid By:
                  </label>
                  <input
                    type="text"
                    required={isReimbursement}
                    placeholder="e.g. Ms. Kimberly Dawn Jatulan"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg focus:outline-none"
                  />
                  <p className="text-[10px] text-amber-700 mt-1">
                    Will be queued under Pending Reimbursements until cash is refunded.
                  </p>
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
              <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-dashed border-gray-300 rounded-xl cursor-pointer transition-colors">
                <Camera className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700 font-medium">
                  {compressing ? 'Compressing photo...' : 'Take or Upload Photo'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>

              {previewUrl && (
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-black/10 bg-gray-100">
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
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-semibold shadow-xs transition-all"
            >
              Save Record
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
