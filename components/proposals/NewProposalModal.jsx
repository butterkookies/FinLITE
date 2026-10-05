'use client';
import { useState } from 'react';
import { Plus, Trash2, Calculator, ArrowRight, X, AlertCircle } from 'lucide-react';

export default function NewProposalModal({ isOpen, onClose, onOpenPreview }) {
  const [activityTitle, setActivityTitle] = useState('');
  const [proponentCommittee, setProponentCommittee] = useState('League of Information Technology Enthusiasts (LITE)');
  const [targetDate, setTargetDate] = useState('');
  const [venue, setVenue] = useState('');
  const [objectives, setObjectives] = useState('');
  const [items, setItems] = useState([
    { id: '1', name: '', unitCost: 0, sellingPrice: 0, projectedUnits: 0 }
  ]);

  // Validation & Loading state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleAddItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), name: '', unitCost: 0, sellingPrice: 0, projectedUnits: 0 }
    ]);
  };

  const handleUpdateItem = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        return {
          ...item,
          [field]: field === 'name' ? value : Number(value) || 0
        };
      }
      return item;
    }));

    if (hasSubmitted) {
      setTimeout(validateAll, 0);
    }
  };

  const handleRemoveItem = (id) => {
    if (items.length <= 1) return;
    setItems(items.filter(item => item.id !== id));
    if (hasSubmitted) {
      setTimeout(validateAll, 0);
    }
  };

  // Calculations
  const totalCapital = items.reduce((sum, i) => sum + (i.unitCost * i.projectedUnits), 0);
  const totalRevenue = items.reduce((sum, i) => sum + (i.sellingPrice * i.projectedUnits), 0);
  const netProfit = totalRevenue - totalCapital;
  const marginPercent = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

  // Validation logic
  const validateAll = () => {
    const newErrors = {};

    if (!activityTitle || !activityTitle.trim()) {
      newErrors.activityTitle = 'Activity Title is required.';
    }

    if (!proponentCommittee || !proponentCommittee.trim()) {
      newErrors.proponentCommittee = 'Proponent Committee is required.';
    }

    if (!targetDate || !targetDate.trim()) {
      newErrors.targetDate = 'Target Date is required.';
    }

    if (!venue || !venue.trim()) {
      newErrors.venue = 'Target Venue is required.';
    }

    if (!objectives || !objectives.trim()) {
      newErrors.objectives = 'Objectives & Rationale are required.';
    }

    // Validate product items
    const itemErrors = {};
    items.forEach((item, index) => {
      const err = {};
      if (!item.name || !item.name.trim()) {
        err.name = 'Description required';
      }
      if (!item.projectedUnits || item.projectedUnits <= 0) {
        err.units = '> 0 required';
      }
      if (Object.keys(err).length > 0) {
        itemErrors[item.id] = err;
      }
    });

    if (Object.keys(itemErrors).length > 0) {
      newErrors.items = itemErrors;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProceedToPreview = async () => {
    setHasSubmitted(true);
    setSubmitError('');

    if (!validateAll()) {
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const proposalData = {
        type: 'PROPOSAL',
        activityTitle: activityTitle.trim(),
        proponentCommittee: proponentCommittee.trim(),
        targetDate: targetDate.trim(),
        venue: venue.trim(),
        objectives: objectives.trim(),
        items,
        totalCapital,
        totalRevenue,
        netProfit,
        marginPercent,
        datePrepared: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        signatories: {
          preparedBy: 'ANDREI JOHN P. GERONIMO',
          preparedRole: 'LITE Treasurer',
          reviewedBy: 'CHRISTIAN REY C. KASILAG',
          reviewedRole: 'LITE Auditor',
          notedBy: 'EMANUEL MALBAROSA',
          notedRole: 'LITE President',
          adviser1: 'MS. KIMBERLY DAWN JATULAN',
          adviser2: 'MS. KRIZIA MAE GENOVIA',
          adviserRole: 'LITE Club Advisers',
          directorName: 'JOVYLYN ORTIZ-CESAR, MBA, MSIT',
          directorRole: 'Program Director, BSIT',
          deanName: 'DR. EMRAIDA MARIE M. MANUCOM',
          deanRole: 'Dean, College of Computer Studies',
        }
      };

      await onOpenPreview(proposalData);
      onClose();
    } catch (err) {
      console.error('Error proceeding to preview:', err);
      setSubmitError(err?.message || 'Failed to generate proposal preview. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Safe early return after all hooks
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        
        {/* Mobile Pull Handle */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-2.5 -mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 bg-gray-50/70 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
              <Calculator className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight truncate">Create Activity & Business Proposal</h2>
              <p className="text-[11px] sm:text-xs text-gray-500 truncate">Auto-calculates product capital, projected revenue, and formats PDM proposal.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0 ml-2 disabled:opacity-50"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Submit Error Banner */}
        {submitError && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 flex-1 text-sm text-gray-700">
          
          {/* General Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Activity / Project Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                disabled={isSubmitting}
                value={activityTitle}
                onChange={(e) => {
                  setActivityTitle(e.target.value);
                  if (hasSubmitted) setTimeout(validateAll, 0);
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm transition-colors ${
                  errors.activityTitle
                    ? 'border-red-500 ring-2 ring-red-500/20 text-red-950'
                    : 'border-gray-200 focus:ring-2 focus:ring-emerald-500'
                }`}
                placeholder="e.g., Club Week Concession Booth"
              />
              {errors.activityTitle && (
                <p className="text-red-600 text-[11px] mt-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                  <span>{errors.activityTitle}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Proponent Sub-Committee / Club <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                disabled={isSubmitting}
                value={proponentCommittee}
                onChange={(e) => {
                  setProponentCommittee(e.target.value);
                  if (hasSubmitted) setTimeout(validateAll, 0);
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm transition-colors ${
                  errors.proponentCommittee
                    ? 'border-red-500 ring-2 ring-red-500/20 text-red-950'
                    : 'border-gray-200 focus:ring-2 focus:ring-emerald-500'
                }`}
                placeholder="e.g., LITE Executive Board"
              />
              {errors.proponentCommittee && (
                <p className="text-red-600 text-[11px] mt-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                  <span>{errors.proponentCommittee}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Target Date / Implementation Window <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                disabled={isSubmitting}
                value={targetDate}
                onChange={(e) => {
                  setTargetDate(e.target.value);
                  if (hasSubmitted) setTimeout(validateAll, 0);
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm transition-colors ${
                  errors.targetDate
                    ? 'border-red-500 ring-2 ring-red-500/20 text-red-950'
                    : 'border-gray-200 focus:ring-2 focus:ring-emerald-500'
                }`}
                placeholder="e.g., October 14–16, 2026"
              />
              {errors.targetDate && (
                <p className="text-red-600 text-[11px] mt-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                  <span>{errors.targetDate}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Target Venue / Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                disabled={isSubmitting}
                value={venue}
                onChange={(e) => {
                  setVenue(e.target.value);
                  if (hasSubmitted) setTimeout(validateAll, 0);
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm transition-colors ${
                  errors.venue
                    ? 'border-red-500 ring-2 ring-red-500/20 text-red-950'
                    : 'border-gray-200 focus:ring-2 focus:ring-emerald-500'
                }`}
                placeholder="e.g., PDM Quadrangle Booth #3"
              />
              {errors.venue && (
                <p className="text-red-600 text-[11px] mt-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                  <span>{errors.venue}</span>
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
              Activity Objectives & Rationale <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              disabled={isSubmitting}
              value={objectives}
              onChange={(e) => {
                setObjectives(e.target.value);
                if (hasSubmitted) setTimeout(validateAll, 0);
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm transition-colors ${
                errors.objectives
                  ? 'border-red-500 ring-2 ring-red-500/20 text-red-950'
                  : 'border-gray-200 focus:ring-2 focus:ring-emerald-500'
              }`}
              placeholder="State the primary goals and educational / fundraising purpose..."
            />
            {errors.objectives && (
              <p className="text-red-600 text-[11px] mt-1 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                <span>{errors.objectives}</span>
              </p>
            )}
          </div>

          {/* Product Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                <span>Product Concession & Budget Schedule</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] bg-gray-50 text-gray-700 border border-black/[0.08] font-semibold">
                  {items.length} items
                </span>
              </h3>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleAddItem}
                className="h-8 inline-flex items-center gap-1 text-xs font-semibold text-gray-900 bg-white hover:bg-gray-50 active:bg-gray-100 border border-black/[0.08] px-2.5 rounded-lg transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-700" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
              <table className="w-full min-w-[540px] text-left text-xs border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-700">
                  <tr>
                    <th className="py-2.5 px-3">Item Description <span className="text-red-500">*</span></th>
                    <th className="py-2.5 px-3 w-24">Unit Cost (₱)</th>
                    <th className="py-2.5 px-3 w-24">Selling Price (₱)</th>
                    <th className="py-2.5 px-3 w-24">Units <span className="text-red-500">*</span></th>
                    <th className="py-2.5 px-3 w-28 text-right">Est. Profit (₱)</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item) => {
                    const itemProfit = (item.sellingPrice - item.unitCost) * item.projectedUnits;
                    const itemErr = errors.items?.[item.id] || {};

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="p-2 px-3">
                          <input
                            type="text"
                            disabled={isSubmitting}
                            value={item.name}
                            onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                            placeholder="e.g., Cold Brew Coffee"
                            className={`w-full px-2 py-1 border rounded text-xs outline-none transition-colors ${
                              itemErr.name ? 'border-red-500 bg-red-50/40 text-red-950' : 'border-gray-200 focus:ring-1 focus:ring-emerald-500'
                            }`}
                          />
                          {itemErr.name && (
                            <span className="text-[10px] text-red-600 font-medium block mt-0.5">{itemErr.name}</span>
                          )}
                        </td>
                        <td className="p-2 px-3">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            disabled={isSubmitting}
                            value={item.unitCost}
                            onChange={(e) => handleUpdateItem(item.id, 'unitCost', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                        </td>
                        <td className="p-2 px-3">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            disabled={isSubmitting}
                            value={item.sellingPrice}
                            onChange={(e) => handleUpdateItem(item.id, 'sellingPrice', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                        </td>
                        <td className="p-2 px-3">
                          <input
                            type="number"
                            min="0"
                            disabled={isSubmitting}
                            value={item.projectedUnits}
                            onChange={(e) => handleUpdateItem(item.id, 'projectedUnits', e.target.value)}
                            className={`w-full px-2 py-1 border rounded text-xs outline-none transition-colors ${
                              itemErr.units ? 'border-red-500 bg-red-50/40 text-red-950' : 'border-gray-200 focus:ring-1 focus:ring-emerald-500'
                            }`}
                          />
                          {itemErr.units && (
                            <span className="text-[10px] text-red-600 font-medium block mt-0.5">{itemErr.units}</span>
                          )}
                        </td>
                        <td className="p-2 px-3 text-right font-medium text-emerald-700">
                          ₱{itemProfit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={items.length <= 1 || isSubmitting}
                            className="text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-400 p-1"
                            title="Remove line item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Metric Summary Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border border-black/[0.08]">
            <div>
              <span className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Capital Needed (Puhunan)</span>
              <span className="text-base font-bold text-gray-950 mt-0.5 block tabular-nums whitespace-nowrap">
                ₱{totalCapital.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Projected Gross Sales</span>
              <span className="text-base font-bold text-gray-950 mt-0.5 block tabular-nums whitespace-nowrap">
                ₱{totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Estimated Net Profit</span>
              <span className="text-base font-bold text-emerald-700 mt-0.5 block tabular-nums whitespace-nowrap">
                ₱{netProfit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Profit Margin</span>
              <span className="text-base font-bold text-emerald-700 mt-0.5 block tabular-nums whitespace-nowrap">
                {marginPercent}% ROI
              </span>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-black/[0.06] bg-gray-50/60">
          <p className="text-xs text-gray-500">
            Proceeding will generate an interactive 1:1 on-screen paper preview for review and live edits.
          </p>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 px-4 text-xs font-semibold text-gray-700 bg-white border border-black/[0.08] hover:bg-gray-50 active:bg-gray-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleProceedToPreview}
              disabled={isSubmitting}
              className="h-10 flex items-center gap-1.5 px-4 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
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
                <>
                  <span>Preview & Edit Proposal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
