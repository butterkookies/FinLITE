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
  Clock
} from 'lucide-react';
import { fetchAuditTrail } from '@/lib/supabase/audit';
import { formatPHP } from '@/lib/utils/currency';
import { useTheme } from '@/components/theme/ThemeProvider';
import { Button, Badge, Input, Card } from '@/components/ui';
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

  const loadLogs = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await fetchAuditTrail(supabase, 80);
      if (!error && Array.isArray(data)) {
        setLogs(data);
      }
    } catch (err) {
      console.warn('Audit trail loading error:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (isOpen) {
      loadLogs();
      setExpandedLogId(null);
    }
  }, [isOpen, loadLogs]);

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
      // 1. Filter by category
      if (filterCategory === 'TRANSACTIONS') {
        if (log.entity_type !== 'transactions' || log.action === 'ABONO_SETTLED') return false;
      } else if (filterCategory === 'ABONO') {
        const isAbono = log.action === 'ABONO_SETTLED' || 
          (log.details?.snapshot?.is_reimbursement) ||
          (log.details?.changed_fields?.status === 'REIMBURSED');
        if (!isAbono) return false;
      } else if (filterCategory === 'RECONCILIATION') {
        if (log.entity_type !== 'cash_reconciliations') return false;
      } else if (filterCategory === 'GOVERNANCE') {
        if (log.entity_type !== 'profiles' && log.entity_type !== 'semesters') return false;
      }

      // 2. Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const actor = (log.actor_name || '').toLowerCase();
        const role = (log.actor_role || '').toLowerCase();
        const action = (log.action || '').toLowerCase();
        const entity = (log.entity_type || '').toLowerCase();
        const detailsStr = JSON.stringify(log.details || {}).toLowerCase();

        return (
          actor.includes(query) ||
          role.includes(query) ||
          action.includes(query) ||
          entity.includes(query) ||
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
              onClick={loadLogs}
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
                  onClick={() => setFilterCategory(cat.id)}
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
              const isAbono = log.action === 'ABONO_SETTLED' || snapshot.is_reimbursement;

              // Action badge variant
              let badgeVariant = 'neutral';
              let actionTitle = log.action;
              let IconComponent = FileText;

              if (log.action === 'ABONO_SETTLED') {
                badgeVariant = 'amber';
                actionTitle = 'Abono Reimbursement Settled';
                IconComponent = HandCoins;
              } else if (log.entity_type === 'cash_reconciliations') {
                badgeVariant = 'sky';
                actionTitle = 'Physical Cashbox Reconciled';
                IconComponent = Calculator;
              } else if (log.entity_type === 'transactions') {
                const txType = snapshot.type || details.type || 'TRANSACTION';
                if (txType === 'inflow') {
                  badgeVariant = 'emerald';
                  actionTitle = log.action === 'INSERT' ? '+ Inflow Logged' : 'Inflow Updated';
                  IconComponent = ArrowDownRight;
                } else {
                  badgeVariant = 'rose';
                  actionTitle = log.action === 'INSERT' ? '- Outflow Disbursed' : 'Outflow Updated';
                  IconComponent = ArrowUpRight;
                }
              } else if (log.entity_type === 'profiles') {
                badgeVariant = 'neutral';
                actionTitle = 'Officer Role / Profile Update';
                IconComponent = UserCheck;
              } else if (log.entity_type === 'semesters') {
                badgeVariant = 'neutral';
                actionTitle = 'Semester Configuration Update';
                IconComponent = Calendar;
              }

              return (
                <div
                  key={log.id}
                  className="p-3.5 sm:p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-150"
                >
                  {/* Top Row: Action Badge + Timestamp */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={badgeVariant} size="sm">
                        <IconComponent className="w-3 h-3" />
                        {actionTitle}
                      </Badge>
                      {isAbono && log.action !== 'ABONO_SETTLED' && (
                        <Badge variant="amber" size="xs">
                          Abono
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] flex items-center gap-1 text-zinc-400 dark:text-zinc-500">
                      <Clock className="w-3 h-3" />
                      {formatEventTimestamp(log.created_at)}
                    </span>
                  </div>

                  {/* Summary Details / Amounts */}
                  <div className="mb-2.5 text-xs">
                    {snapshot.title && (
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {snapshot.title}
                      </p>
                    )}
                    {snapshot.amount != null && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatPHP(snapshot.amount)}
                        </span>
                        {snapshot.payment_method && (
                          <Badge variant={snapshot.payment_method === 'CASH' ? 'amber' : 'sky'} size="xs">
                            {snapshot.payment_method}
                          </Badge>
                        )}
                        {snapshot.category_name && (
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            • {snapshot.category_name}
                          </span>
                        )}
                      </div>
                    )}
                    {log.entity_type === 'cash_reconciliations' && snapshot.physical_total != null && (
                      <div className="flex items-center gap-2 mt-1 font-mono text-xs">
                        <span>Physical: <strong>{formatPHP(snapshot.physical_total)}</strong></span>
                        <span>•</span>
                        <span>System: <strong>{formatPHP(snapshot.system_total)}</strong></span>
                        <span>•</span>
                        <span className={snapshot.variance < 0 ? 'text-rose-500 font-bold' : snapshot.variance > 0 ? 'text-sky-500 font-bold' : 'text-emerald-500 font-bold'}>
                          Var: {formatPHP(snapshot.variance)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actor Card + Expand Button */}
                  <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                    {/* Actor Identity */}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                        {log.actor_name ? log.actor_name.charAt(0).toUpperCase() : 'S'}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">
                          {log.actor_name}
                        </span>
                        {log.actor_role && (
                          <Badge variant="neutral" size="xs">
                            {log.actor_role}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Diff / JSON Snapshot Toggle */}
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    >
                      {isExpanded ? 'Hide Payload' : 'Audit Data'}
                      {isExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                    </Button>
                  </div>

                  {/* Expandable Technical Audit Payload */}
                  {isExpanded && (
                    <div className="mt-3 p-3 rounded-lg border font-mono text-[10px] overflow-x-auto bg-zinc-50 dark:bg-black/60 text-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800">
                      <div className="flex items-center justify-between text-zinc-400 pb-1 mb-2 border-b border-zinc-200/50 dark:border-zinc-800">
                        <span>ENTITY ID: {log.entity_id || 'N/A'}</span>
                        <span>OPERATION: {log.action}</span>
                      </div>
                      <pre className="whitespace-pre-wrap break-all">
                        {JSON.stringify(details, null, 2)}
                      </pre>
                    </div>
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
