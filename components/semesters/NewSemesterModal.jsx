'use client';
import { useState, useRef, useEffect } from 'react';
import { ArrowRight, Calendar, ChevronDown, Check, AlertCircle } from 'lucide-react';
import { formatPHP } from '@/lib/utils/currency';
import { Modal, Button, Badge, Input } from '@/components/ui';

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
  const academicYearInputRef = useRef(null);
  const [error, setError] = useState(null);
  const [shakeKey, setShakeKey] = useState(0);

  const [rolloverCash, setRolloverCash] = useState(true);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newAcademicYear.trim()) {
      setError('Please enter the academic year (e.g. 2026–2027)');
      setShakeKey((prev) => prev + 1);
      if (academicYearInputRef.current) {
        academicYearInputRef.current.focus();
      }
      return;
    }

    onStartSemester({
      academicYear: newAcademicYear.trim(),
      semester: newSemester,
      label: `AY ${newAcademicYear.trim()} • ${newSemester}`,
      rolloverCash: rolloverCash ? endingCash : 0,
      previousTermLabel: currentSemester?.label || 'Previous Term',
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
              Start New Semester & Carry-Over
            </h3>
            <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Archive previous term and roll over verified ending funds
            </p>
          </div>
        </div>
      }
      maxWidth="lg"
    >
      {/* Form Body */}
      <form onSubmit={handleSubmit} noValidate className="p-5 sm:p-6 space-y-5 text-xs text-zinc-700 dark:text-zinc-300">
        
        {/* Ending Balance Summary Card */}
        <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              Ending Balances: {currentSemester?.label}
            </span>
            <Badge variant="neutral" size="xs">
              To Be Archived
            </Badge>
          </div>
          <div className="pt-1">
            <div className="bg-white dark:bg-[#121214] p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-semibold uppercase tracking-wider">Physical Cashbox Balance</span>
                <span className="text-xs text-zinc-400">Locked drawer in Program Director's Room</span>
              </div>
              <span className="text-lg font-bold text-zinc-950 dark:text-zinc-50 tabular-nums whitespace-nowrap">
                {formatPHP(endingCash)}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Ang mga transaksyon sa kasalukuyang semester ay mananatiling naka-save at ligtas sa archive.
          </p>
        </div>

        {/* New Semester Configuration */}
        <div className="space-y-3.5">
          <h4 className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
            Bagong Academic Period
          </h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div className={error ? 'animate-field-shake' : ''} key={`ay-${shakeKey}`}>
              <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                Academic Year <span className="text-rose-500">*</span>
              </label>
              <Input
                ref={academicYearInputRef}
                type="text"
                value={newAcademicYear}
                onChange={(e) => {
                  setNewAcademicYear(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. 2026–2027"
                aria-invalid={Boolean(error)}
                className={error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : ''}
              />
              {error && (
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1.5 animate-in fade-in duration-150">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{error}</span>
                </p>
              )}
            </div>

            <div className="relative" ref={semesterRef}>
              <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                Semester
              </label>
              <button
                type="button"
                onClick={() => setIsSemesterOpen(!isSemesterOpen)}
                className="w-full h-9 px-3 bg-white dark:bg-[#121214] hover:bg-zinc-50 dark:hover:bg-zinc-800/60 active:bg-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-between text-zinc-900 dark:text-zinc-100 font-semibold text-xs transition-colors cursor-pointer text-left"
              >
                <span className="truncate">{newSemester}</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0 ml-1" />
              </button>

              {isSemesterOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
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
                          ? 'bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-950 dark:text-zinc-50' 
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      <span>{s === '1st Sem' ? '1st Semester' : s === '2nd Sem' ? '2nd Semester' : 'Summer / Mid-Year'}</span>
                      {newSemester === s && (
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 ml-1" />
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
          <h4 className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
            Carry-Over & Beginning Balance Options
          </h4>

          <label className="flex items-start gap-2.5 p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl cursor-pointer hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40 transition-colors">
            <input
              type="checkbox"
              checked={rolloverCash}
              onChange={(e) => setRolloverCash(e.target.checked)}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
            />
            <div className="text-xs">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                I-rollover ang Physical Cash ({formatPHP(endingCash)})
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                Awtomatikong magla-log ng Initial Budget Inflow para sa simula ng bagong semester.
              </span>
            </div>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 pb-safe sm:pb-0 flex items-center justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Activate AY {newAcademicYear}
          </Button>
        </div>

      </form>
    </Modal>
  );
}
