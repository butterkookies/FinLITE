'use client';

import { useState } from 'react';
import { 
  ArrowRight, 
  Code2, 
  Eye, 
  Copy, 
  Check, 
  FileEdit, 
  CheckCircle2, 
  AlertCircle, 
  Calculator, 
  HandCoins, 
  FilePlus, 
  Trash2,
  Info
} from 'lucide-react';
import { formatPHP } from '@/lib/utils/currency';
import { Badge, Button } from '@/components/ui';
import { cn } from '@/lib/utils';

const FIELD_LABELS = {
  amount: 'Financial Amount',
  title: 'Transaction Title',
  description: 'Description / Purpose',
  payment_method: 'Payment Method',
  status: 'Approval Status',
  category_name: 'Category Name',
  category_id: 'Category',
  type: 'Transaction Type',
  date: 'Transaction Date',
  transaction_date: 'Transaction Date',
  is_reimbursement: 'Abono / Personal Advance',
  proof_attachment_url: 'Receipt Attachment',
  notes: 'Auditor Remarks / Notes',
  comment: 'Auditor Remarks / Notes',
  role: 'Assigned Role',
  is_active: 'Account Status',
  physical_total: 'Physical Cashbox Total',
  system_total: 'System Recorded Total',
  variance: 'Cash Discrepancy (Variance)',
  variance_type: 'Reconciliation Result',
  academic_year: 'Academic Year',
  semester: 'Semester',
  void_reason: 'Audited Void Reason',
  archived_at: 'Archived Timestamp',
};

const IGNORED_KEYS = new Set([
  'id',
  'created_at',
  'updated_at',
  'logged_by',
  'counted_by',
  'user_id',
  'semester_id',
  'auth_user_id',
  'operation',
  'snapshot',
  'deleted_snapshot',
  'new',
  'old'
]);

function formatValue(key, val) {
  if (val === null || val === undefined) return 'None';
  if (typeof val === 'boolean') {
    if (key === 'is_reimbursement') {
      return val ? 'Yes (Abono Advance)' : 'No (Direct Disbursement)';
    }
    if (key === 'is_active') {
      return val ? 'Active' : 'Suspended';
    }
    return val ? 'True' : 'False';
  }
  if (key === 'amount' || key === 'physical_total' || key === 'system_total' || key === 'variance' || key === 'disbursed_amount' || key === 'total_claim') {
    return formatPHP(val);
  }
  if (key === 'type') {
    const t = String(val).toLowerCase();
    return t === 'inflow' ? '+ Inflow (Income)' : '- Outflow (Disbursement)';
  }
  if (typeof val === 'object') {
    return JSON.stringify(val);
  }
  return String(val);
}

export default function AuditDiffViewer({ log, isLight }) {
  const [viewMode, setViewMode] = useState('visual'); // 'visual' | 'raw'
  const [copied, setCopied] = useState(false);

  const details = log.details || {};

  // Resilient operation resolution across all trigger & manual application actions
  let operation = details.operation;
  if (!operation) {
    if (log.action === 'INSERT' || log.action === 'TRANSACTION_CREATED' || log.action.includes('COLLECTED')) {
      operation = 'INSERT';
    } else if (log.action === 'UPDATE' || log.action === 'TRANSACTION_UPDATED' || log.action === 'TRANSACTION_REVISED' || log.action.includes('SETTLED') || log.action.includes('DISBURSEMENT')) {
      operation = 'UPDATE';
    } else if (log.action === 'DELETE' || log.action === 'ACCOUNT_DELETED') {
      operation = 'DELETE';
    } else if (log.action === 'TRANSACTION_VOIDED') {
      operation = 'VOID';
    } else if (log.action === 'TRANSACTION_RESTORED') {
      operation = 'RESTORE';
    } else if (log.action === 'TRANSACTION_FLAGGED' || log.action === 'TRANSACTION_AUDITED') {
      operation = 'AUDIT_REVIEW';
    } else {
      operation = 'ACTION';
    }
  }

  // Synthesized snapshot supporting both nested trigger objects and flat telemetry structures
  const rawSnapshot = details.snapshot || details.new || details.deleted_snapshot || {};
  const snapshot = {
    title: rawSnapshot.title || details.title || details.transaction_title || null,
    amount: rawSnapshot.amount ?? details.amount ?? details.disbursed_amount ?? details.total_claim ?? null,
    type: rawSnapshot.type || details.type || null,
    payment_method: rawSnapshot.payment_method || details.payment_method || (details.amount != null ? 'CASH' : null),
    category_name: rawSnapshot.category_name || details.category_name || null,
    is_reimbursement: rawSnapshot.is_reimbursement ?? details.is_reimbursement ?? null,
    status: rawSnapshot.status || details.status || details.new_status || null,
    notes: rawSnapshot.notes || details.comment || details.notes || null,
    physical_total: rawSnapshot.physical_total ?? details.physical_total ?? null,
    system_total: rawSnapshot.system_total ?? details.system_total ?? null,
    variance: rawSnapshot.variance ?? details.variance ?? null,
    ...rawSnapshot
  };

  const changedFields = { ...(details.changed_fields || {}) };
  const previousFields = { ...(details.previous || {}) };

  // Fallback: if changed_fields is empty but status transitioned, synthesize it
  if (Object.keys(changedFields).length === 0 && details.previous_status && details.new_status && details.previous_status !== details.new_status) {
    changedFields.status = details.new_status;
    previousFields.status = details.previous_status;
  }

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(details, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  // Extract meaningful changed keys
  const meaningfulChangedKeys = Object.keys(changedFields).filter(
    (k) => !IGNORED_KEYS.has(k)
  );

  return (
    <div className="mt-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-black/50 overflow-hidden text-xs">
      {/* Sub-header with Tab Selector */}
      <div className="px-3.5 py-2 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between bg-zinc-100/60 dark:bg-zinc-900/60 gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">Audit Verification</span>
          <span className="text-zinc-400">•</span>
          <span className="text-[11px] text-zinc-500 font-mono">
            {log.entity_type} {log.entity_id ? `(#${String(log.entity_id).slice(0, 8)})` : ''}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <div className="flex items-center bg-zinc-200/70 dark:bg-zinc-800 p-0.5 rounded-lg text-[11px]">
            <button
              type="button"
              onClick={() => setViewMode('visual')}
              className={cn(
                "px-2 py-0.5 rounded-md font-medium transition-all flex items-center gap-1 cursor-pointer",
                viewMode === 'visual'
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              )}
            >
              <Eye className="w-3 h-3" />
              <span>Summary</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('raw')}
              className={cn(
                "px-2 py-0.5 rounded-md font-medium transition-all flex items-center gap-1 cursor-pointer",
                viewMode === 'raw'
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              )}
            >
              <Code2 className="w-3 h-3" />
              <span>Payload</span>
            </button>
          </div>
        </div>
      </div>

      {/* Visual Mode View */}
      {viewMode === 'visual' ? (
        <div className="p-3.5 space-y-3">
          {/* Case 1: Abono Settled / Disbursed */}
          {(log.action === 'ABONO_SETTLED' || log.action === 'SETTLE_ABONO_REIMBURSEMENT' || log.action === 'PARTIAL_ABONO_DISBURSEMENT') ? (
            <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-500/10 text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2 font-semibold">
                <HandCoins className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>
                  {log.action === 'PARTIAL_ABONO_DISBURSEMENT' ? 'Partial Abono Disbursement' : 'Abono Reimbursement Settlement'}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-amber-800/90 dark:text-amber-300/80">
                {snapshot.title ? <strong>{snapshot.title}: </strong> : ''}
                Disbursed and repaid to the officer from the physical cashbox. Status updated to <strong>{snapshot.status || 'REIMBURSED'}</strong>.
              </p>
              {snapshot.amount != null && (
                <div className="mt-2 text-xs font-mono font-bold text-amber-700 dark:text-amber-300">
                  Payout Amount: {formatPHP(snapshot.amount)}
                </div>
              )}
            </div>
          ) : (log.entity_type === 'cash_reconciliations' || log.action.includes('CASHBOX') || log.action.includes('RECONCIL')) ? (
            /* Case 2: Cashbox Reconciliation */
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 font-semibold text-zinc-800 dark:text-zinc-200">
                <Calculator className="w-4 h-4 text-sky-500" />
                <span>Physical Cashbox Count Summary</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70">
                  <span className="text-[10px] text-zinc-500 block uppercase">Physical Count</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                    {formatPHP(snapshot.physical_total ?? details.physical_total ?? 0)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70">
                  <span className="text-[10px] text-zinc-500 block uppercase">System Recorded</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                    {formatPHP(snapshot.system_total ?? snapshot.ledger_cash_balance ?? details.ledger_cash_balance ?? details.system_total ?? 0)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70">
                  <span className="text-[10px] text-zinc-500 block uppercase">Variance (Discrepancy)</span>
                  {(() => {
                    const phys = Number(snapshot.physical_total ?? details.physical_total ?? 0);
                    const sys = Number(snapshot.system_total ?? snapshot.ledger_cash_balance ?? details.ledger_cash_balance ?? details.system_total ?? 0);
                    const v = snapshot.variance ?? snapshot.variance_amount ?? details.variance_amount ?? details.variance ?? (phys - sys);
                    return (
                      <span className={cn(
                        "font-mono font-bold text-sm",
                        v < 0 ? "text-rose-600 dark:text-rose-400" :
                        v > 0 ? "text-sky-600 dark:text-sky-400" : "text-emerald-600 dark:text-emerald-400"
                      )}>
                        {formatPHP(v)}
                      </span>
                    );
                  })()}
                </div>
              </div>
              {(snapshot.notes || details.notes) && (
                <p className="text-[11px] text-zinc-500 italic mt-1">
                  Remark: &ldquo;{snapshot.notes || details.notes}&rdquo;
                </p>
              )}
              {Array.isArray(snapshot.items || details.items) && (snapshot.items || details.items).length > 0 && (
                <div className="mt-2 pt-2 border-t border-zinc-200/80 dark:border-zinc-800">
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mb-1.5">
                    Denomination Breakdown ({(snapshot.items || details.items).length} items)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-mono">
                    {(snapshot.items || details.items).map((it, idx) => (
                      <div key={idx} className="p-1.5 rounded-md bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400 text-[11px]">
                          {it.code || `D-${idx + 1}`}: {it.quantity}x
                        </span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-[11px]">
                          {formatPHP(it.subtotal || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (operation === 'AUDIT_REVIEW' || log.action === 'TRANSACTION_FLAGGED' || log.action === 'TRANSACTION_AUDITED') ? (
            /* Case 2.5: Auditor Review / Flag / Decision */
            <div className="space-y-2.5">
              <div className={cn(
                "p-3 rounded-lg border flex flex-col gap-1.5",
                log.action === 'TRANSACTION_FLAGGED'
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-900 dark:text-rose-200"
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200"
              )}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 font-semibold text-xs">
                    {log.action === 'TRANSACTION_FLAGGED' ? <AlertCircle className="w-4 h-4 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    <span>{log.action === 'TRANSACTION_FLAGGED' ? 'Audit Checkpoint: Transaction Flagged' : 'Audit Checkpoint: Transaction Verified & Cleared'}</span>
                  </div>
                  {(details.previous_status || details.new_status) && (
                    <div className="flex items-center gap-1 font-mono text-[11px]">
                      <Badge variant="neutral" size="xs">{details.previous_status || 'PENDING'}</Badge>
                      <ArrowRight className="w-3 h-3" />
                      <Badge variant={log.action === 'TRANSACTION_FLAGGED' ? 'rose' : 'emerald'} size="xs">{details.new_status || 'AUDITED'}</Badge>
                    </div>
                  )}
                </div>

                {snapshot.title && (
                  <p className="text-xs font-semibold mt-1">
                    {snapshot.title} {snapshot.amount != null ? `(${formatPHP(snapshot.amount)})` : ''}
                  </p>
                )}

                {details.comment && (
                  <p className="text-[11px] italic mt-1 bg-white/50 dark:bg-black/30 p-2 rounded">
                    Auditor Remark: &ldquo;{details.comment}&rdquo;
                  </p>
                )}
              </div>
            </div>
          ) : operation === 'UPDATE' ? (
            /* Case 3: Update with Before vs After Diff */
            <div className="space-y-2.5">
              {/* Status Transition Banner */}
              {(details.previous_status || details.new_status || details.current_status) && 
               (details.previous_status !== (details.new_status || details.current_status)) && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
                    Status Transition
                  </span>
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <Badge variant="neutral" size="xs">
                      {details.previous_status || 'UNKNOWN'}
                    </Badge>
                    <ArrowRight className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <Badge variant="emerald" size="xs">
                      {details.new_status || details.current_status || 'UPDATED'}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Changed Fields List */}
              {meaningfulChangedKeys.length > 0 ? (
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900/60">
                  <div className="px-3 py-1.5 bg-zinc-100/70 dark:bg-zinc-800/50 text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <FileEdit className="w-3 h-3" />
                    <span>Modified Ledger Attributes (Diff)</span>
                  </div>

                  {meaningfulChangedKeys.map((key) => {
                    const label = FIELD_LABELS[key] || key;
                    const oldVal = previousFields[key];
                    const newVal = changedFields[key];
                    const hasBeforeAndAfter = oldVal !== undefined;

                    return (
                      <div key={key} className="p-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300 sm:w-1/3 shrink-0">
                          {label}
                        </span>

                        <div className="sm:w-2/3 flex items-center gap-2 flex-wrap">
                          {hasBeforeAndAfter ? (
                            <>
                              <span className={cn(
                                "text-[11px] text-zinc-400 line-through font-mono",
                                key === 'amount' && "text-rose-500/70"
                              )}>
                                {formatValue(key, oldVal)}
                              </span>
                              <ArrowRight className="w-3 h-3 text-zinc-400 shrink-0" />
                              <span className={cn(
                                "font-mono font-semibold text-zinc-900 dark:text-zinc-100",
                                key === 'amount' && "text-emerald-600 dark:text-emerald-400"
                              )}>
                                {formatValue(key, newVal)}
                              </span>
                            </>
                          ) : (
                            <span className={cn(
                              "font-mono font-semibold text-zinc-900 dark:text-zinc-100",
                              key === 'amount' && "text-emerald-600 dark:text-emerald-400"
                            )}>
                              Updated to: {formatValue(key, newVal)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-[11px] text-zinc-500 space-y-1">
                  <div className="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
                    <Info className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Ledger Update Record</span>
                  </div>
                  {snapshot.title && (
                    <p className="font-medium text-zinc-800 dark:text-zinc-200">
                      Record: {snapshot.title} {snapshot.amount != null ? `(${formatPHP(snapshot.amount)})` : ''}
                    </p>
                  )}
                  <p>System audit recorded modifications for this entry.</p>
                </div>
              )}
            </div>
          ) : operation === 'INSERT' ? (
            /* Case 4: Initial Insert / Creation */
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                <FilePlus className="w-4 h-4" />
                <span>Initial Entry Created in Ledger</span>
              </div>

              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {snapshot.title && (
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Title</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {snapshot.title}
                    </span>
                  </div>
                )}
                {snapshot.amount != null && (
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Amount</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatPHP(snapshot.amount)}
                    </span>
                  </div>
                )}
                {snapshot.payment_method && (
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Method</span>
                    <Badge variant={snapshot.payment_method === 'CASH' ? 'amber' : 'sky'} size="xs">
                      {snapshot.payment_method}
                    </Badge>
                  </div>
                )}
                {snapshot.category_name && (
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Category</span>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {snapshot.category_name}
                    </span>
                  </div>
                )}
                {snapshot.is_reimbursement != null && (
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Disbursement Mode</span>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {snapshot.is_reimbursement ? 'Abono (Personal Advance)' : 'Direct Cash Outflow'}
                    </span>
                  </div>
                )}
                {snapshot.status && (
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Initial Status</span>
                    <Badge variant="neutral" size="xs">
                      {snapshot.status}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          ) : operation === 'DELETE' ? (
            /* Case 5: Deleted / Removed Record */
            <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-500/10 text-rose-900 dark:text-rose-200">
              <div className="flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-300 mb-1">
                <Trash2 className="w-4 h-4" />
                <span>Record Removed from Active Ledger</span>
              </div>
              <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80 mb-2">
                This item was deleted from active operational tables, but its cryptographic snapshot remains permanently sealed in the audit trail.
              </p>
              {snapshot.title && (
                <div className="text-xs font-mono">
                  <strong>Item:</strong> {snapshot.title} {snapshot.amount ? `(${formatPHP(snapshot.amount)})` : ''}
                </div>
              )}
            </div>
          ) : (
            /* Case 6: Generic Action / Governance / Telemetry */
            <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-1">
              <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                Action: {log.action}
              </div>
              {snapshot.title && (
                <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Target Item: <strong>{snapshot.title}</strong>
                </div>
              )}
              {details.auth_method && (
                <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  Auth Method: <strong>{details.auth_method}</strong>
                </div>
              )}
              {details.ip_address && (
                <div className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono">
                  Client IP: <strong>{details.ip_address}</strong>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Raw JSON Mode View */
        <div className="p-3 bg-zinc-900 text-zinc-200 font-mono text-[10px]">
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-zinc-800 text-zinc-400">
            <span>RAW DATABASE PAYLOAD</span>
            <Button
              variant="ghost"
              size="xs"
              onClick={handleCopyJson}
              className="text-[10px] h-6 px-2 text-zinc-400 hover:text-white"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400 mr-1" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  <span>Copy JSON</span>
                </>
              )}
            </Button>
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all text-emerald-400/90 leading-relaxed max-h-80 scrollbar-thin">
            {JSON.stringify(details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
