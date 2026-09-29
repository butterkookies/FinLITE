'use client';
import { useState } from 'react';
import { Plus, Trash2, FileText, Sparkles, X, Calculator, ArrowRight } from 'lucide-react';

export default function NewProposalModal({ isOpen, onClose, onOpenPreview }) {
  const [activityTitle, setActivityTitle] = useState('');
  const [proponentCommittee, setProponentCommittee] = useState('League of Information Technology Enthusiasts (LITE)');
  const [targetDate, setTargetDate] = useState('');
  const [venue, setVenue] = useState('');
  const [objectives, setObjectives] = useState('');
  const [items, setItems] = useState([
    { id: '1', name: '', unitCost: 0, sellingPrice: 0, projectedUnits: 0 }
  ]);

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
  };

  const handleRemoveItem = (id) => {
    if (items.length <= 1) return;
    setItems(items.filter(item => item.id !== id));
  };

  // Calculations
  const totalCapital = items.reduce((sum, i) => sum + (i.unitCost * i.projectedUnits), 0);
  const totalRevenue = items.reduce((sum, i) => sum + (i.sellingPrice * i.projectedUnits), 0);
  const netProfit = totalRevenue - totalCapital;
  const marginPercent = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

  const handleProceedToPreview = () => {
    const proposalData = {
      type: 'PROPOSAL',
      activityTitle,
      proponentCommittee,
      targetDate,
      venue,
      objectives,
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
    onOpenPreview(proposalData);
    onClose();
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
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0 ml-2"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 flex-1 text-sm text-gray-700">
          
          {/* General Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Activity / Project Title
              </label>
              <input
                type="text"
                value={activityTitle}
                onChange={(e) => setActivityTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                placeholder="e.g., Club Week Concession Booth"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Proponent Sub-Committee / Club
              </label>
              <input
                type="text"
                value={proponentCommittee}
                onChange={(e) => setProponentCommittee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                placeholder="e.g., LITE Executive Board"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Target Date / Implementation Window
              </label>
              <input
                type="text"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                placeholder="e.g., October 14–16, 2026"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Target Venue / Location
              </label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                placeholder="e.g., PDM Quadrangle Booth #3"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
              Activity Objectives & Rationale
            </label>
            <textarea
              rows={2}
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              placeholder="State the primary goals and educational / fundraising purpose..."
            />
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
                onClick={handleAddItem}
                className="h-8 inline-flex items-center gap-1 text-xs font-semibold text-gray-900 bg-white hover:bg-gray-50 active:bg-gray-100 border border-black/[0.08] px-2.5 rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-700" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
              <table className="w-full min-w-[540px] text-left text-xs border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-700">
                  <tr>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 w-24">Unit Cost (₱)</th>
                    <th className="py-2.5 px-3 w-24">Selling Price (₱)</th>
                    <th className="py-2.5 px-3 w-20">Units</th>
                    <th className="py-2.5 px-3 w-28 text-right">Est. Profit (₱)</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item) => {
                    const itemProfit = (item.sellingPrice - item.unitCost) * item.projectedUnits;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="p-2 px-3">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                            placeholder="e.g., Cold Brew Coffee"
                            className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                        </td>
                        <td className="p-2 px-3">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
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
                            value={item.sellingPrice}
                            onChange={(e) => handleUpdateItem(item.id, 'sellingPrice', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                        </td>
                        <td className="p-2 px-3">
                          <input
                            type="number"
                            min="0"
                            value={item.projectedUnits}
                            onChange={(e) => handleUpdateItem(item.id, 'projectedUnits', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                        </td>
                        <td className="p-2 px-3 text-right font-medium text-emerald-700">
                          ₱{itemProfit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={items.length <= 1}
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
              className="h-10 px-4 text-xs font-semibold text-gray-700 bg-white border border-black/[0.08] hover:bg-gray-50 active:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleProceedToPreview}
              className="h-10 flex items-center gap-1.5 px-4 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <span>Preview & Edit Proposal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
