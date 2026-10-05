'use client';
import { useState, useRef, useEffect } from 'react';
import { ArrowRight, Calendar, ChevronDown, Check, X, AlertCircle } from 'lucide-react';
import { formatPHP } from '@/lib/utils/currency';

export default function NewSemesterModal({
  isOpen,
  onClose,
  currentSemester,
  currentSummary,
  onStartSemester,
}) {
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
  const [isSemesterOpen, setIsSemesterOpen] = useState(false);
  const semesterRef = useRef(null);

  const [rolloverCash, setRolloverCash] = useState(true);
  const [rolloverGcash, setRolloverGcash] = useState(true);

  // Validation & Form Submission State
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    function handleClickOutside(event) {
      if (semesterRef.current && !semesterRef.current.contains(event.target)) {
        setIsSemesterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const endingCash = currentSummary?.cash_on_hand || 0;
  const endingGcash = currentSummary?.gcash_balance || 0;

  const validateField = (val) => {
    if (!val || !val.trim()) {
      return 'Academic Year is required (e.g. 2026–2027).';
    }
    return '';
  };

  const handleAcademicYearChange = (e) => {
    const val = e.target.value;
    setNewAcademicYear(val);
    if (hasSubmitted) {
      const err = validateField(val);
      setErrors((prev) => ({ ...prev, newAcademicYear: err }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setHasSubmitted(true);
    setSubmitError('');

    const yearErr = validateField(newAcademicYear);
    if (yearErr) {
      setErrors({ newAcademicYear: yearErr });
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onStartSemester({
        academicYear: newAcademicYear.trim(),
        semester: newSemester,
        label: `AY ${newAcademicYear.trim()} • ${newSemester}`,
        rolloverCash: rolloverCash ? endingCash : 0,
        rolloverGcash: rolloverGcash ? endingGcash : 0,
        previousTermLabel: currentSemester?.label || 'Previous Term',
      });
      onClose();
    } catch (err) {
      console.error('Error starting new semester:', err);
      setSubmitError(err?.message || 'Failed to activate new semester. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Unconditional hook execution: safe return only after all hooks are evaluated
  if (!isOpen) return null;

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
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0 ml-2 disabled:opacity-50"
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
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-gray-700" noValidate>
          
          {/* Ending Balance Summary Card */}
          <div className="bg-gray-50 border border-black/[0.08] rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider">
                Ending Balances: {currentSemester?.label}
              </span>
              <span className="text-[10px] bg-white border border-black/[0.08] text-gray-700 px-2 py-0.5 rounded-md font-semibold">
                To Be Archived
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-white p-3 rounded-xl border border-black/[0.06]">
                <span className="text-[10px] text-gray-500 block">Physical Cash in Box</span>
                <span className="text-base font-bold text-gray-950 mt-0.5 block tabular-nums whitespace-nowrap">
                  {formatPHP(endingCash)}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-black/[0.06]">
                <span className="text-[10px] text-gray-500 block">GCash Account</span>
                <span className="text-base font-bold text-gray-950 mt-0.5 block tabular-nums whitespace-nowrap">
                  {formatPHP(endingGcash)}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
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
                <label className="block text-gray-700 font-semibold mb-1">
                  Academic Year <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  disabled={isSubmitting}
                  value={newAcademicYear}
                  onChange={handleAcademicYearChange}
                  onBlur={() => {
                    if (hasSubmitted) {
                      const err = validateField(newAcademicYear);
                      setErrors((prev) => ({ ...prev, newAcademicYear: err }));
                    }
                  }}
                  placeholder="e.g. 2026–2027"
                  className={`w-full h-10 px-3 bg-white rounded-xl text-xs font-semibold focus:outline-none select-text transition-colors ${
                    errors.newAcademicYear
                      ? 'border border-red-500 ring-2 ring-red-500/20 text-red-950'
                      : 'border border-black/[0.08] focus:ring-2 focus:ring-emerald-500/20 text-gray-900'
                  }`}
                />
                {errors.newAcademicYear && (
                  <p className="text-red-600 text-[11px] mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                    <span>{errors.newAcademicYear}</span>
                  </p>
                )}
              </div>

              <div className="relative" ref={semesterRef}>
                <label className="block text-gray-700 font-semibold mb-1">
                  Semester
                </label>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsSemesterOpen(!isSemesterOpen)}
                  className="w-full h-10 px-3 bg-white hover:bg-gray-50 active:bg-gray-100 border border-black/[0.08] rounded-xl flex items-center justify-between text-gray-900 font-semibold text-xs transition-colors cursor-pointer text-left"
                >
                  <span className="truncate">{newSemester}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" />
                </button>

                {isSemesterOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-black/[0.08] rounded-xl shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    {['1st Sem', '2nd Sem', 'Summer'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setNewSemester(s);
                          setIsSemesterOpen(false);
                        }}
                        className={`w-full h-9 flex items-center justify-between px-3 text-xs text-left cursor-pointer transition-colors ${
                          newSemester === s 
                            ? 'bg-gray-50 font-semibold text-gray-950' 
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span>{s === '1st Sem' ? '1st Semester' : s === '2nd Sem' ? '2nd Semester' : 'Summer / Mid-Year'}</span>
                        {newSemester === s && (
                          <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0 ml-1" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
              disabled={isSubmitting}
              className="h-10 px-4 text-xs font-semibold text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 flex items-center gap-1.5 px-5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <span>Activate AY {newAcademicYear}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
