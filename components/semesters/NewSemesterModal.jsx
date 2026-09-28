'use client';
import { useState } from 'react';
import { ArrowRight, Calendar, CheckCircle2, DollarSign, Wallet, X } from 'lucide-react';
import { formatPHP } from '@/lib/utils/currency';

export default function NewSemesterModal({
  isOpen,
  onClose,
  currentSemester,
  currentSummary,
  onStartSemester,
}) {
  if (!isOpen) return null;

  const currentYearParts = (currentSemester?.academicYear || '2025-2026').split('-');
  const nextStartYear = parseInt(currentYearParts[0], 10) + 1;
  const nextEndYear = parseInt(currentYearParts[1], 10) + 1;
  const defaultNextYear = `${nextStartYear}-${nextEndYear}`;

  const [newAcademicYear, setNewAcademicYear] = useState(
    currentSemester?.semester === '2nd Sem' ? defaultNextYear : (currentSemester?.academicYear || '2026-2027')
  );
  const [newSemester, setNewSemester] = useState(
    currentSemester?.semester === '2nd Sem' ? '1st Sem' : '2nd Sem'
  );
  const [rolloverCash, setRolloverCash] = useState(true);
  const [rolloverGcash, setRolloverGcash] = useState(true);

  const endingCash = currentSummary?.cash_on_hand || 0;
  const endingGcash = currentSummary?.gcash_balance || 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newAcademicYear.trim()) return;

    onStartSemester({
      academicYear: newAcademicYear.trim(),
      semester: newSemester,
      label: `AY ${newAcademicYear.trim()} • ${newSemester}`,
      rolloverCash: rolloverCash ? endingCash : 0,
      rolloverGcash: rolloverGcash ? endingGcash : 0,
      previousTermLabel: currentSemester?.label || 'Previous Term',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full border border-black/10 shadow-2xl overflow-hidden max-h-[92vh] sm:max-h-[90vh] flex flex-col animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-150">
        
        {/* Mobile Pull Handle */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-2.5 -mb-1 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-black/[0.06] flex items-center justify-between shrink-0 bg-gray-50/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-gray-950 truncate">
                Start New Semester & Carry-Over
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-500 font-medium truncate">
                Archive previous term and roll over verified ending funds
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-gray-700">
          
          {/* Ending Balance Summary Card */}
          <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                Ending Balances: {currentSemester?.label}
              </span>
              <span className="text-[10px] bg-emerald-200/60 text-emerald-800 px-2 py-0.5 rounded-md font-semibold">
                To Be Archived
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-gray-500 block">Physical Cash in Box</span>
                <span className="text-base font-bold text-gray-950 mt-0.5 block">
                  {formatPHP(endingCash)}
                </span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-gray-500 block">GCash Account</span>
                <span className="text-base font-bold text-gray-950 mt-0.5 block">
                  {formatPHP(endingGcash)}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-emerald-800/80 leading-relaxed">
              Ang mga transaksyon sa kasalukuyang semester ay mananatiling naka-save at ligtas sa archive.
            </p>
          </div>

          {/* New Semester Configuration */}
          <div className="space-y-3.5">
            <h4 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
              Bagong Academic Period
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-600 font-semibold mb-1">
                  Academic Year
                </label>
                <input
                  type="text"
                  value={newAcademicYear}
                  onChange={(e) => setNewAcademicYear(e.target.value)}
                  placeholder="e.g. 2026–2027"
                  className="w-full px-3 py-2 bg-gray-50 border border-black/[0.08] rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-600 font-semibold mb-1">
                  Semester
                </label>
                <select
                  value={newSemester}
                  onChange={(e) => setNewSemester(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-black/[0.08] rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="1st Sem">1st Semester</option>
                  <option value="2nd Sem">2nd Semester</option>
                  <option value="Summer">Summer / Mid-Year</option>
                </select>
              </div>
            </div>
          </div>

          {/* Balance Rollover Checkboxes */}
          <div className="space-y-2.5 pt-1">
            <h4 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
              Carry-Over & Beginning Balance Options
            </h4>

            <label className="flex items-start gap-2.5 p-3 bg-gray-50 border border-black/[0.05] rounded-xl cursor-pointer hover:bg-gray-100/70 transition-colors">
              <input
                type="checkbox"
                checked={rolloverCash}
                onChange={(e) => setRolloverCash(e.target.checked)}
                className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-gray-900 block">
                  I-rollover ang Physical Cash ({formatPHP(endingCash)})
                </span>
                <span className="text-[11px] text-gray-500 block mt-0.5">
                  Awtomatikong magla-log ng Initial Budget Inflow para sa simula ng bagong semester.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 bg-gray-50 border border-black/[0.05] rounded-xl cursor-pointer hover:bg-gray-100/70 transition-colors">
              <input
                type="checkbox"
                checked={rolloverGcash}
                onChange={(e) => setRolloverGcash(e.target.checked)}
                className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-gray-900 block">
                  I-rollover ang GCash Balance ({formatPHP(endingGcash)})
                </span>
                <span className="text-[11px] text-gray-500 block mt-0.5">
                  Ililipat ang kasalukuyang digital balance sa panibagong cycle.
                </span>
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-black/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-semibold shadow-xs transition-all"
            >
              <span>Activate AY {newAcademicYear}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
