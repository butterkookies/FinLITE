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
      <div className={`absolute inset-y-0 right-0 max-w-2xl w-full shadow-2xl flex flex-col z-10 transition-transform duration-300 ${
        isLight ? 'bg-white text-gray-900 border-l border-gray-200' : 'bg-gray-900 text-gray-100 border-l border-gray-800'
      }`}>
        
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${
          isLight ? 'bg-gray-50/90 border-gray-200' : 'bg-gray-950/80 border-gray-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-base sm:text-lg tracking-tight">Financial Audit Trail</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Immutable
                </span>
              </div>
              <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                Automated tamper-evident activity ledger • PDM CCS Council Compliance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadLogs}
              disabled={loading}
              title="Refresh Audit Trail"
              className={`p-2 rounded-lg border transition-all active:scale-95 cursor-pointer ${
                isLight 
                  ? 'bg-white border-gray-200 text-gray-600 hover:text-emerald-600 hover:border-emerald-300' 
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:text-emerald-400 hover:border-emerald-500/40'
              }`}
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-500' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg border transition-all active:scale-95 cursor-pointer ${
                isLight 
                  ? 'bg-white border-gray-200 text-gray-500 hover:text-gray-800' 
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-100'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Category Filter Controls */}
        <div className={`p-4 border-b space-y-3 shrink-0 ${
          isLight ? 'bg-gray-50/50 border-gray-100' : 'bg-gray-900/60 border-gray-800/80'
        }`}>
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by officer, role, action, or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all ${
                isLight 
                  ? 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500' 
                  : 'bg-gray-950 border-gray-800 text-gray-100 placeholder:text-gray-500 focus:border-emerald-500/60'
              }`}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {filterCategories.map((cat) => {
              const active = filterCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setFilterCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all duration-150 cursor-pointer text-xs ${
                    active
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isLight
                        ? 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        : 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-750 hover:text-gray-100'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Timeline Log Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 scrollbar-thin">
          {loading && logs.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <RotateCw className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
              <p className="text-sm font-medium">Verifying and retrieving audit records...</p>
              <p className={`text-xs mt-1 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                Querying PostgreSQL audit engine
              </p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className={`py-16 text-center border-2 border-dashed rounded-2xl p-8 ${
              isLight ? 'border-gray-200 bg-gray-50/50' : 'border-gray-800 bg-gray-950/40'
            }`}>
              <ShieldCheck className="w-10 h-10 text-emerald-500/40 mx-auto mb-3" />
              <h3 className="text-sm font-semibold">No audit entries found</h3>
              <p className={`text-xs mt-1 max-w-sm mx-auto ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
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

              // Render action badge styling
              let badgeColor = isLight 
                ? 'bg-gray-100 text-gray-700 border-gray-200' 
                : 'bg-gray-800 text-gray-300 border-gray-700';
              let actionTitle = log.action;
              let IconComponent = FileText;

              if (log.action === 'ABONO_SETTLED') {
                badgeColor = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
                actionTitle = 'Abono Reimbursement Settled';
                IconComponent = HandCoins;
              } else if (log.entity_type === 'cash_reconciliations') {
                badgeColor = 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
                actionTitle = 'Physical Cashbox Reconciled';
                IconComponent = Calculator;
              } else if (log.entity_type === 'transactions') {
                const txType = snapshot.type || details.type || 'TRANSACTION';
                if (txType === 'inflow') {
                  badgeColor = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
                  actionTitle = log.action === 'INSERT' ? '+ Inflow Logged' : 'Inflow Updated';
                  IconComponent = ArrowDownRight;
                } else {
                  badgeColor = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
                  actionTitle = log.action === 'INSERT' ? '- Outflow Disbursed' : 'Outflow Updated';
                  IconComponent = ArrowUpRight;
                }
              } else if (log.entity_type === 'profiles') {
                badgeColor = 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
                actionTitle = 'Officer Role / Profile Update';
                IconComponent = UserCheck;
              } else if (log.entity_type === 'semesters') {
                badgeColor = 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
                actionTitle = 'Semester Configuration Update';
                IconComponent = Calendar;
              }

              return (
                <div
                  key={log.id}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all duration-150 ${
                    isLight 
                      ? 'bg-white border-gray-200/90 shadow-2xs hover:border-gray-300' 
                      : 'bg-gray-950/60 border-gray-800 shadow-2xs hover:border-gray-700/80'
                  }`}
                >
                  {/* Top Row: Action Badge + Timestamp */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badgeColor}`}>
                        <IconComponent className="w-3 h-3" />
                        {actionTitle}
                      </span>
                      {isAbono && log.action !== 'ABONO_SETTLED' && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          Abono
                        </span>
                      )}
                    </div>
                    <span className={`text-[11px] flex items-center gap-1 ${
                      isLight ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      <Clock className="w-3 h-3" />
                      {formatEventTimestamp(log.created_at)}
                    </span>
                  </div>

                  {/* Summary Details / Amounts */}
                  <div className="mb-2.5 text-xs">
                    {snapshot.title && (
                      <p className={`font-semibold ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
                        {snapshot.title}
                      </p>
                    )}
                    {snapshot.amount != null && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatPHP(snapshot.amount)}
                        </span>
                        {snapshot.payment_method && (
                          <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${
                            snapshot.payment_method === 'CASH'
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                              : 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                          }`}>
                            {snapshot.payment_method}
                          </span>
                        )}
                        {snapshot.category_name && (
                          <span className={`text-[11px] ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
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
                        <span className={snapshot.variance < 0 ? 'text-rose-500 font-bold' : snapshot.variance > 0 ? 'text-blue-500 font-bold' : 'text-emerald-500 font-bold'}>
                          Var: {formatPHP(snapshot.variance)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actor Card + Expand Button */}
                  <div className={`pt-2.5 border-t flex items-center justify-between text-xs ${
                    isLight ? 'border-gray-100' : 'border-gray-850'
                  }`}>
                    {/* Actor Identity */}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                        {log.actor_name ? log.actor_name.charAt(0).toUpperCase() : 'S'}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-medium ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
                          {log.actor_name}
                        </span>
                        {log.actor_role && (
                          <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.2 rounded bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            {log.actor_role}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Diff / JSON Snapshot Toggle */}
                    <button
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className={`flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer ${
                        isLight ? 'text-gray-500 hover:text-emerald-600' : 'text-gray-400 hover:text-emerald-400'
                      }`}
                    >
                      {isExpanded ? 'Hide Payload' : 'Audit Data'}
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Expandable Technical Audit Payload */}
                  {isExpanded && (
                    <div className={`mt-3 p-3 rounded-lg border font-mono text-[10px] overflow-x-auto ${
                      isLight ? 'bg-gray-50 text-gray-800 border-gray-200' : 'bg-black/60 text-gray-300 border-gray-800'
                    }`}>
                      <div className="flex items-center justify-between text-gray-400 pb-1 mb-2 border-b border-gray-200/50 dark:border-gray-800">
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
        <div className={`p-3 sm:p-4 border-t text-[11px] flex items-center gap-2 ${
          isLight ? 'bg-gray-50 text-gray-500 border-gray-200' : 'bg-gray-950 text-gray-400 border-gray-800'
        }`}>
          <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>
            <strong>FinLITE Immutability Guarantee:</strong> All entries are append-only. Modification or deletion is cryptographically and procedurally prevented under PDM CCS audit rules.
          </span>
        </div>

      </div>
    </div>
  );
}
