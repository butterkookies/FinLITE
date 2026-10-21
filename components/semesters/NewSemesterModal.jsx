'use client';
import { useState, useRef } from 'react';
import { ArrowRight, Calendar, AlertCircle } from 'lucide-react';
import { formatPHP } from '@/lib/utils/currency';
import { Modal, Button, Badge, Input, Select } from '@/components/ui';

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
  const academicYearInputRef = useRef(null);
  const [error, setError] = useState(null);
  const [shakeKey, setShakeKey] = useState(0);

  const [rolloverCash, setRolloverCash] = useState(true);

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
          <div className="w-8 h-8 rounded-xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
              Start New Semester &amp; Carry-Over
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
        <div className="bg-zinc-100/60 dark:bg-zinc-850/60 rounded-2xl p-4 space-y-2.5 ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              Ending Balances: {currentSemester?.label}
            </span>
            <Badge variant="neutral" size="xs">
              To Be Archived
            </Badge>
          </div>
          <div className="pt-1">
            <div className="bg-white/80 dark:bg-[#121214] p-3.5 rounded-xl shadow-xs ring-1 ring-black/[0.04] dark:ring-white/[0.06] flex items-center justify-between">
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
            Ang mga transaksyon sa kasalukuyang semester ay mananatiling ligtas at naka-save sa archive.
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
                className={error ? 'ring-2 ring-rose-500/50' : ''}
              />
              {error && (
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1.5 animate-in fade-in duration-150">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{error}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                Semester
              </label>
              <Select
                value={newSemester}
                onChange={setNewSemester}
                options={[
                  { value: '1st Sem', label: '1st Semester' },
                  { value: '2nd Sem', label: '2nd Semester' },
                  { value: 'Summer', label: 'Summer / Mid-Year' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Balance Rollover Options */}
        <div className="space-y-2.5 pt-1">
          <h4 className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
            Carry-Over &amp; Beginning Balance Options
          </h4>

          <label className="flex items-start gap-2.5 p-3 bg-zinc-100/60 dark:bg-zinc-850/60 ring-1 ring-black/[0.04] dark:ring-white/[0.06] rounded-xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors">
            <input
              type="checkbox"
              checked={rolloverCash}
              onChange={(e) => setRolloverCash(e.target.checked)}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500/40 border-0 bg-zinc-200 dark:bg-zinc-700"
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
        <div className="pt-3 pb-safe sm:pb-0 flex items-center justify-end gap-2">
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
