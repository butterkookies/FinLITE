'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ShieldCheck, 
  X, 
  RotateCw, 
  ArrowDownRight, 
  ArrowUpRight, 
  HandCoins, 
  Calculator, 
  UserCheck, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  FileText,
  Search,
  Filter,
  Lock,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileEdit
} from 'lucide-react';
import { fetchAuditTrail } from '@/lib/supabase/audit';
import { createClient } from '@/lib/supabase/client';
import { formatPHP } from '@/lib/utils/currency';
import { useTheme } from '@/components/theme/ThemeProvider';
import { Button, Badge, Input, Card } from '@/components/ui';
import UserAvatar from '@/components/common/UserAvatar';
import AuditDiffViewer from './AuditDiffViewer';
import { cn } from '@/lib/utils';

function formatEventTimestamp(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return isoString;
  }
}

export default function AuditTrailDrawer({ 
  isOpen, 
  onClose, 
  supabase,
  currentRole = 'auditor' 
}) {
  const { isLight } = useTheme();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);

  // Fallback to client if supabase instance is not provided via props
  const client = useMemo(() => supabase || createClient(), [supabase]);

  const loadLogs = useCallback(async (cat = filterCategory) => {
    if (!client) return;
    setLoading(true);
    try {
      const { data, error } = await fetchAuditTrail(client, 100, cat);
      if (!error && Array.isArray(data)) {
        setLogs(data);
      }
    } catch (err) {
      console.warn('Audit trail loading error:', err);
    } finally {
      setLoading(false);
    }
  }, [client, filterCategory]);

  useEffect(() => {
    if (isOpen) {
      loadLogs(filterCategory);
      setExpandedLogId(null);
    }
  }, [isOpen, filterCategory, loadLogs]);

  // Real-time live updates: listen for new audit records
  useEffect(() => {
    if (!isOpen || !client) return;

    try {
      const channel = client
        .channel('realtime_audit_trail_drawer')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'audit_logs' },
          () => {
            loadLogs(filterCategory);
          }
        )
        .subscribe();

      return () => {
        client.removeChannel(channel);
      };
    } catch (realtimeErr) {
      console.warn('Realtime audit subscription note:', realtimeErr?.message);
    }
  }, [isOpen, client, filterCategory, loadLogs]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Category Filter Chips
  const filterCategories = [
    { id: 'ALL', label: 'All Records' },
    { id: 'TRANSACTIONS', label: 'Transactions' },
    { id: 'ABONO', label: 'Abono Reimbursements' },
    { id: 'RECONCILIATION', label: 'Cash Counts' },
    { id: 'GOVERNANCE', label: 'Governance & Roles' }
  ];

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const details = log.details || {};
      const snapshot = details.snapshot || details.new || details.deleted_snapshot || {};
      const isAbono = log.action === 'ABONO_SETTLED' || 
        log.action === 'SETTLE_ABONO_REIMBURSEMENT' ||
        log.action === 'PARTIAL_ABONO_DISBURSEMENT' ||
        log.entity_type === 'advances_payable' ||
        Boolean(snapshot.is_reimbursement) ||
        Boolean(details.is_reimbursement) ||
        details.changed_fields?.status === 'REIMBURSED';

      // 1. Filter by category
      if (filterCategory === 'TRANSACTIONS') {
        if ((log.entity_type !== 'transactions' && log.entity_type !== 'debts') || isAbono) return false;
      } else if (filterCategory === 'ABONO') {
        if (!isAbono) return false;
      } else if (filterCategory === 'RECONCILIATION') {
        const isRecon = log.entity_type === 'cash_reconciliations' || 
          log.action.includes('CASHBOX') || 
          log.action.includes('RECONCIL');
        if (!isRecon) return false;
      } else if (filterCategory === 'GOVERNANCE') {
        const isGov = log.entity_type === 'profiles' || 
          log.entity_type === 'semesters' || 
          log.entity_type === 'semester_signatories' ||
          log.entity_type === 'registration_requests' ||
          log.action?.includes('ROSTER') ||
          log.action?.includes('ROLE') ||
          log.action?.includes('ACCOUNT') ||
          log.action?.includes('REGISTRATION') ||
          log.action?.includes('GOVERNANCE');
        if (!isGov) return false;
      }

      // 2. Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const actor = (log.actor_name || '').toLowerCase();
        const role = (log.actor_role || '').toLowerCase();
        const action = (log.action || '').toLowerCase();
        const entity = (log.entity_type || '').toLowerCase();
        const title = (snapshot.title || details.title || details.transaction_title || '').toLowerCase();
        const detailsStr = JSON.stringify(details).toLowerCase();

        return (
          actor.includes(query) ||
          role.includes(query) ||
          action.includes(query) ||
          entity.includes(query) ||
          title.includes(query) ||
          detailsStr.includes(query)
        );
      }

      return true;
    });
  }, [logs, filterCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
      />

      {/* Slide-over Drawer Panel */}
      <div className="absolute inset-y-0 right-0 max-w-2xl w-full shadow-2xl flex flex-col z-10 bg-white dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 border-l border-zinc-200 dark:border-zinc-800 transition-transform duration-300">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/70 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-base sm:text-lg tracking-tight">Financial Audit Trail</h2>
                <Badge variant="emerald" size="xs">
                  Immutable
                </Badge>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Automated tamper-evident activity ledger • PDM CCS Council Compliance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => loadLogs(filterCategory)}
              disabled={loading}
              title="Refresh Audit Trail"
            >
              <RotateCw className={cn("w-4 h-4", loading && "animate-spin text-emerald-600 dark:text-emerald-400")} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 space-y-3 shrink-0 bg-zinc-50/30 dark:bg-zinc-900/30">
          {/* Search Bar */}
          <div className="relative">
            <Input
              size="sm"
              leftIcon={<Search className="w-4 h-4" />}
              placeholder="Search by officer, role, action, or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              rightElement={
                searchQuery ? (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-medium cursor-pointer"
                  >
                    Clear
                  </button>
                ) : null
              }
            />
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {filterCategories.map((cat) => {
              const active = filterCategory === cat.id;
              return (
                <Button
                  key={cat.id}
                  variant={active ? 'primary' : 'outline'}
                  size="xs"
                  onClick={() => {
                    setFilterCategory(cat.id);
                    loadLogs(cat.id);
                  }}
                >
                  {cat.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Timeline Log Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 scrollbar-thin">
          {loading && logs.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <RotateCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
              <p className="text-sm font-medium">Verifying and retrieving audit records...</p>
              <p className="text-xs mt-1 text-zinc-400 dark:text-zinc-500">
                Querying PostgreSQL audit engine
              </p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed rounded-2xl p-8 border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
              <ShieldCheck className="w-10 h-10 text-emerald-500/40 mx-auto mb-3" />
              <h3 className="text-sm font-semibold">No audit entries found</h3>
              <p className="text-xs mt-1 max-w-sm mx-auto text-zinc-500 dark:text-zinc-400">
                {searchQuery || filterCategory !== 'ALL'
                  ? 'No activity matches your active search or filter criteria.'
                  : 'Financial actions taken on this ledger will automatically appear here.'}
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const details = log.details || {};
              const snapshot = details.snapshot || details.new || details.deleted_snapshot || {};
              const isAbono = log.action === 'ABONO_SETTLED' || 
                log.action === 'SETTLE_ABONO_REIMBURSEMENT' ||
                log.action === 'PARTIAL_ABONO_DISBURSEMENT' ||
                log.entity_type === 'advances_payable' ||
                Boolean(snapshot.is_reimbursement) ||
                Boolean(details.is_reimbursement) ||
                details.changed_fields?.status === 'REIMBURSED';

              // Resilient detail extraction across both trigger snapshots and flat API payloads
              const title = snapshot.title || details.title || details.transaction_title || 
                (log.entity_type === 'cash_reconciliations' ? 'Cashbox Reconciliation' : 
                (log.entity_type === 'registration_requests' ? (details.applicant_name ? `${details.applicant_name} (${details.applicant_email || ''})` : 'Registration Request') :
                (log.entity_type === 'semester_signatories' ? `Signatories: ${log.entity_id || 'Roster'}` : 
                (log.entity_type === 'profiles' && details.role ? `Officer Role: ${details.role}` : null))));
              const amount = snapshot.amount ?? details.amount ?? details.disbursed_amount ?? details.total_claim;
              const paymentMethod = snapshot.payment_method || details.payment_method || (amount != null ? 'CASH' : null);
              const categoryName = snapshot.category_name || details.category_name || (isAbono ? 'Abono Reimbursement' : null);

              // Action badge variant
              let badgeVariant = 'neutral';
              let actionTitle = log.action;
              let IconComponent = FileText;

              if (log.action === 'ABONO_SETTLED' || log.action === 'SETTLE_ABONO_REIMBURSEMENT') {
                badgeVariant = 'amber';
                actionTitle = 'Abono Reimbursement Settled';
                IconComponent = HandCoins;
              } else if (log.action === 'PARTIAL_ABONO_DISBURSEMENT') {
                badgeVariant = 'amber';
                actionTitle = 'Partial Abono Disbursed';
                IconComponent = HandCoins;
              } else if (log.action === 'DEBT_INSTALLMENT_COLLECTED' || log.action === 'DEBT_FULLY_SETTLED') {
                badgeVariant = 'emerald';
                actionTitle = log.action === 'DEBT_FULLY_SETTLED' ? 'Debt Fully Collected' : '+ Debt Installment Inflow';
                IconComponent = ArrowDownRight;
              } else if (log.action === 'TRANSACTION_FLAGGED') {
                badgeVariant = 'rose';
                actionTitle = 'Transaction Flagged (Audit)';
                IconComponent = AlertCircle;
              } else if (log.action === 'TRANSACTION_AUDITED') {
                badgeVariant = 'emerald';
                actionTitle = 'Transaction Audited & Verified';
                IconComponent = CheckCircle2;
              } else if (log.action === 'TRANSACTION_REVISED') {
                badgeVariant = 'sky';
                actionTitle = 'Transaction Revised & Resubmitted';
                IconComponent = FileEdit;
              } else if (log.action === 'TRANSACTION_VOIDED') {
                badgeVariant = 'rose';
                actionTitle = 'Transaction Voided / Archived';
                IconComponent = AlertCircle;
              } else if (log.action === 'TRANSACTION_RESTORED') {
                badgeVariant = 'emerald';
                actionTitle = 'Transaction Restored to Ledger';
                IconComponent = CheckCircle2;
              } else if (log.entity_type === 'cash_reconciliations' || log.action.includes('CASHBOX') || log.action.includes('RECONCIL')) {
                const varAmt = snapshot.variance ?? snapshot.variance_amount ?? details.variance_amount ?? 0;
                badgeVariant = log.action === 'CASHBOX_SHORTAGE_DECLARED' || varAmt < 0
                  ? 'rose'
                  : log.action === 'CASHBOX_OVERAGE_DECLARED' || varAmt > 0
                    ? 'sky'
                    : 'emerald';
                actionTitle = log.action === 'CASHBOX_SHORTAGE_DECLARED'
                  ? 'Cashbox Shortage Declared'
                  : log.action === 'CASHBOX_OVERAGE_DECLARED'
                    ? 'Cashbox Overage Declared'
                    : log.action === 'RECONCILIATION_APPROVED'
                      ? 'Reconciliation Approved'
                      : log.action === 'RECONCILIATION_REJECTED'
                        ? 'Reconciliation Rejected'
                        : 'Physical Cashbox Reconciled';
                IconComponent = Calculator;
              } else if (log.entity_type === 'transactions') {
                const txType = (snapshot.type || details.type || 'outflow').toLowerCase();
                if (txType === 'inflow') {
                  badgeVariant = 'emerald';
                  actionTitle = (log.action === 'INSERT' || log.action === 'TRANSACTION_CREATED') ? '+ Inflow Logged' : 'Inflow Updated';
                  IconComponent = ArrowDownRight;
                } else {
                  badgeVariant = 'rose';
                  actionTitle = (log.action === 'INSERT' || log.action === 'TRANSACTION_CREATED') ? '- Outflow Disbursed' : 'Outflow Updated';
                  IconComponent = ArrowUpRight;
                }
              } else if (log.action === 'REGISTRATION_APPROVED') {
                badgeVariant = 'emerald';
                actionTitle = 'Registration Approved';
                IconComponent = UserCheck;
              } else if (log.action === 'REGISTRATION_REJECTED') {
                badgeVariant = 'rose';
                actionTitle = 'Registration Declined';
                IconComponent = AlertCircle;
              } else if (log.action === 'REGISTRATION_RESET') {
                badgeVariant = 'amber';
                actionTitle = 'Registration Reset';
                IconComponent = UserCheck;
              } else if (log.action === 'ACCOUNT_DELETED') {
                badgeVariant = 'rose';
                actionTitle = 'Account Deleted';
                IconComponent = AlertCircle;
              } else if (log.action === 'ROSTER_UPDATE') {
                badgeVariant = 'sky';
                actionTitle = 'Signatories Roster Updated';
                IconComponent = Calendar;
              } else if (log.action === 'ROSTER_CLONE') {
                badgeVariant = 'sky';
                actionTitle = 'Signatories Roster Cloned';
                IconComponent = Calendar;
              } else if (log.entity_type === 'profiles') {
                badgeVariant = 'neutral';
                actionTitle = log.action === 'ROLE_CHANGED' ? 'Officer Role Changed' : log.action === 'STATUS_CHANGED' ? 'Account Status Changed' : 'Officer Profile Update';
                IconComponent = UserCheck;
              } else if (log.entity_type === 'semesters' || log.entity_type === 'semester_signatories') {
                badgeVariant = 'neutral';
                actionTitle = 'Semester Configuration Update';
                IconComponent = Calendar;
              } else if (log.entity_type === 'registration_requests') {
                badgeVariant = 'neutral';
                actionTitle = 'Registration Request Event';
                IconComponent = UserCheck;
              }

              return (
                <div
                  key={log.id}
                  className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-zinc-900/50 ring-1 ring-black/[0.04] dark:ring-white/[0.05] shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-all duration-150"
                >
                  {/* Top Row: Action Badge + Timestamp */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={badgeVariant} size="sm">
                        <IconComponent className="w-3 h-3" />
                        {actionTitle}
                      </Badge>
                      {isAbono && log.action !== 'ABONO_SETTLED' && log.action !== 'SETTLE_ABONO_REIMBURSEMENT' && log.action !== 'PARTIAL_ABONO_DISBURSEMENT' && (
                        <Badge variant="amber" size="xs">
                          Abono
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] flex items-center gap-1 text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
                      <Clock className="w-3 h-3" />
                      {formatEventTimestamp(log.created_at)}
                    </span>
                  </div>

                  {/* Summary Details / Amounts */}
                  <div className="mb-2.5 text-xs">
                    {title && (
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {title}
                      </p>
                    )}
                    {amount != null && (
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatPHP(amount)}
                        </span>
                        {paymentMethod && (
                          <Badge variant={paymentMethod === 'CASH' ? 'amber' : 'sky'} size="xs">
                            {paymentMethod}
                          </Badge>
                        )}
                        {categoryName && (
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            • {categoryName}
                          </span>
                        )}
                      </div>
                    )}
                    {(log.entity_type === 'cash_reconciliations' || log.action.includes('CASHBOX') || log.action.includes('RECONCIL')) && (
                      <div className="flex items-center gap-2 mt-1 font-mono text-xs flex-wrap">
                        <span>Physical: <strong>{formatPHP(snapshot.physical_total ?? details.physical_total ?? 0)}</strong></span>
                        <span>•</span>
                        <span>System: <strong>{formatPHP(snapshot.system_total ?? snapshot.ledger_cash_balance ?? details.ledger_cash_balance ?? details.system_total ?? 0)}</strong></span>
                        <span>•</span>
                        {(() => {
                          const v = snapshot.variance ?? snapshot.variance_amount ?? details.variance_amount ?? details.variance ?? 0;
                          return (
                            <span className={v < 0 ? 'text-rose-500 font-bold' : v > 0 ? 'text-sky-500 font-bold' : 'text-emerald-500 font-bold'}>
                              Var: {formatPHP(v)}
                            </span>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Actor Card + Expand Button */}
                  <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                    {/* Actor Identity */}
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        src={log.actor_avatar || log.actor_avatar_url}
                        name={log.actor_name || 'Officer'}
                        email={log.actor_email}
                        size="xs"
                        className="shrink-0"
                      />
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">
                          {log.actor_name || 'System'}
                        </span>
                        {log.actor_role && (
                          <Badge variant="neutral" size="xs">
                            {log.actor_role}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Diff / Changes Toggle */}
                    <Button
                      variant={isExpanded ? "secondary" : "ghost"}
                      size="xs"
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    >
                      {isExpanded ? 'Hide Changes' : 'View Changes'}
                      {isExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                    </Button>
                  </div>

                  {/* Expandable User-Friendly Diff & Audit Payload Viewer */}
                  {isExpanded && (
                    <AuditDiffViewer log={log} isLight={isLight} />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Guarantee */}
        <div className="p-3 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 text-[11px] flex items-center gap-2 bg-zinc-50 dark:bg-[#0c0c0e] text-zinc-500 dark:text-zinc-400">
          <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            <strong>FinLITE Immutability Guarantee:</strong> All entries are append-only. Modification or deletion is cryptographically and procedurally prevented under PDM CCS audit rules.
          </span>
        </div>

      </div>
    </div>
  );
}
