'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  ArrowLeft,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Calendar,
  ExternalLink,
  Shield,
  Activity,
  Trash2,
  Lock,
  Globe,
  KeyRound,
  FileSpreadsheet,
  AlertOctagon,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/components/theme/ThemeProvider';
import { Modal, Button, Badge, Input } from '@/components/ui';

const ROLE_OPTIONS = [
  { value: 'treasurer', label: 'Treasurer', desc: 'Disbursements & Collections' },
  { value: 'auditor', label: 'Auditor', desc: 'Audit & Denomination Verification' },
  { value: 'president', label: 'President', desc: 'Budget & Approval Authority' },
  { value: 'adviser', label: 'Adviser', desc: 'Faculty Oversight & Signatory' },
  { value: 'admin', label: 'Admin', desc: 'Full System & Access Control' },
];

const AUDIT_FILTER_OPTIONS = [
  { id: 'all', label: 'All Activity' },
  { id: 'sessions', label: 'Logins & Sessions' },
  { id: 'financial', label: 'Financial Operations' },
  { id: 'governance', label: 'Governance Changes' },
];

// Solid fill action tags without border (Pin #4)
const getActionTagClass = (action) => {
  switch (action) {
    case 'AUTH_LOGIN':
      return 'bg-emerald-600 text-white';
    case 'AUTH_LOGOUT':
      return 'bg-zinc-600 text-white';
    case 'ACCOUNT_DELETED':
    case 'USER_REJECTED':
      return 'bg-rose-600 text-white';
    case 'STATUS_UPDATE':
    case 'ROLE_UPDATE':
      return 'bg-amber-600 text-white';
    case 'USER_APPROVED':
      return 'bg-teal-600 text-white';
    case 'TRANSACTION_CREATE':
    case 'TRANSACTION_DELETE':
    case 'TRANSACTION_UPDATE':
      return 'bg-blue-600 text-white';
    default:
      return 'bg-indigo-600 text-white';
  }
};

export default function AdminPage() {
  const router = useRouter();
  const { isLight } = useTheme();
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'users' | 'audit' | 'approved' | 'rejected'
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Category Filtering & Limit/Pagination State (Pin #3)
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Pending approvals state: selected role per request
  const [selectedRoles, setSelectedRoles] = useState({});

  // Action status message
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', text: '' }

  // Rejection modal state
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Account Removal modal state (Safe Deletion & Financial Ledger Dependency Check)
  const [removingUser, setRemovingUser] = useState(null);
  const [isCheckingDeps, setIsCheckingDeps] = useState(false);
  const [userDeps, setUserDeps] = useState(null); // { canDelete: boolean, transactionCount: number, breakdown: {} }
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Telemetry: Activity & Access Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditFilter, setAuditFilter] = useState('all');
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Reset pagination on filter or tab change (Pin #3)
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, roleFilter, statusFilter, auditFilter, searchQuery, pageSize]);

  // Fetch Requests & Stats & Users
  const fetchData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    try {
      const res = await fetch('/api/admin/requests');
      if (res.status === 401 || res.status === 403) {
        router.push('/login?error=admin_required');
        return;
      }

      const data = await res.json();
      if (data.success) {
        setRequests(data.requests || []);
        setStats(data.stats || { total: 0, pending: 0, approved: 0, rejected: 0 });

        const roleMap = {};
        (data.requests || []).forEach((r) => {
          roleMap[r.id] = r.requested_role || 'treasurer';
        });
        setSelectedRoles(roleMap);
      }

      // Fetch users
      const usersRes = await fetch('/api/admin/users');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
      setFeedback({ type: 'error', text: 'Could not connect to server. Please check connection.' });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [router]);

  // Fetch telemetry logs
  const fetchAuditLogs = useCallback(async (filterType = 'all') => {
    setIsLoadingAudit(true);
    try {
      const res = await fetch(`/api/admin/audit?filter=${filterType}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAuditLogs(data.logs || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs(auditFilter);
    }
  }, [activeTab, auditFilter, fetchAuditLogs]);

  // Handle Approve Request
  const handleApprove = async (requestId) => {
    const assignedRole = selectedRoles[requestId] || 'treasurer';
    setIsSubmittingAction(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, role: assignedRole, assignedRole }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ 
          type: 'success', 
          text: data.message || `Success: Registration approved and activated as ${assignedRole.toUpperCase()}.` 
        });
        await fetchData();
      } else {
        setFeedback({ type: 'error', text: data.error || 'Failed to approve request.' });
      }
    } catch (err) {
      console.error('Approval failed:', err);
      setFeedback({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Open Reject Modal
  const handleOpenReject = (req) => {
    setRejectingRequest(req);
    setRejectionReason('Does not meet enrollment or officer criteria.');
  };

  // Confirm Reject
  const handleConfirmReject = async () => {
    if (!rejectingRequest) return;
    setIsSubmittingAction(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          requestId: rejectingRequest.id, 
          reason: rejectionReason || 'Information could not be verified by admin' 
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: 'success', text: data.message || 'Applicant declined.' });
        setRejectingRequest(null);
        await fetchData();
      } else {
        setFeedback({ type: 'error', text: data.error || 'Failed to decline request.' });
      }
    } catch (err) {
      console.error('Reject failed:', err);
      setFeedback({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Update existing user role
  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: 'success', text: data.message || `User role successfully updated to ${newRole.toUpperCase()}.` });
        await fetchData();
      } else {
        setFeedback({ type: 'error', text: data.error || 'Failed to update user role.' });
      }
    } catch (err) {
      console.error('Role update failed:', err);
      setFeedback({ type: 'error', text: 'Failed to update user role.' });
    }
  };

  // Toggle user status (ACTIVE vs SUSPENDED)
  const handleToggleUserStatus = async (user) => {
    if (user.email === 'geronimoandreijohn.pdm@gmail.com') {
      setFeedback({ type: 'error', text: 'Primary Super Admin account cannot be suspended.' });
      return;
    }

    const newStatus = (user.status === 'suspended') ? 'ACTIVE' : 'SUSPENDED';
    setIsSubmittingAction(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, status: newStatus }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ 
          type: 'success', 
          text: data.message || `User status changed to ${newStatus}.` 
        });
        await fetchData();
        if (activeTab === 'audit') fetchAuditLogs(auditFilter);
      } else {
        setFeedback({ type: 'error', text: data.error || 'Failed to update status.' });
      }
    } catch (err) {
      console.error('Status update failed:', err);
      setFeedback({ type: 'error', text: 'Error updating user status.' });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Open Safe Removal Modal with ledger dependency check
  const handleOpenRemoveUser = async (user) => {
    if (user.email === 'geronimoandreijohn.pdm@gmail.com') {
      setFeedback({ type: 'error', text: 'Primary Super Admin account is permanently locked and cannot be removed.' });
      return;
    }

    setRemovingUser(user);
    setIsCheckingDeps(true);
    setUserDeps(null);

    try {
      const res = await fetch(`/api/admin/users?checkDeps=true&userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setUserDeps(data);
      } else {
        setUserDeps({ canDelete: false, transactionCount: 0 });
      }
    } catch (err) {
      console.error('Dependency check failed:', err);
      setUserDeps({ canDelete: false, transactionCount: 0 });
    } finally {
      setIsCheckingDeps(false);
    }
  };

  // Confirm safe removal of account
  const handleConfirmRemoveUser = async () => {
    if (!removingUser) return;
    setIsDeletingUser(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: removingUser.id }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: 'success', text: data.message || 'Account safely removed.' });
        setRemovingUser(null);
        await fetchData();
        if (activeTab === 'audit') fetchAuditLogs(auditFilter);
      } else {
        setFeedback({ type: 'error', text: data.error || 'Failed to remove account.' });
      }
    } catch (err) {
      console.error('Account removal failed:', err);
      setFeedback({ type: 'error', text: 'Unexpected network error during account removal.' });
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Filter requests based on active tab and search query
  const filteredRequests = requests.filter((r) => {
    if (activeTab === 'pending' && r.status !== 'pending') return false;
    if (activeTab === 'approved' && r.status !== 'approved') return false;
    if (activeTab === 'rejected' && r.status !== 'rejected') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = `${r.first_name || ''} ${r.last_name || ''}`.toLowerCase().includes(q);
      const matchEmail = (r.email || '').toLowerCase().includes(q);
      const matchPhone = (r.contact_number || '').includes(q);
      return matchName || matchEmail || matchPhone;
    }
    return true;
  });

  // Filtered users for users tab (with role & status filtering)
  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (statusFilter !== 'all' && (u.status || 'active').toLowerCase() !== statusFilter.toLowerCase()) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (u.full_name || `${u.first_name || ''} ${u.last_name || ''}`).toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      const matchRole = (u.role || '').toLowerCase().includes(q);
      const matchStatus = (u.status || '').toLowerCase().includes(q);
      return matchName || matchEmail || matchRole || matchStatus;
    }
    return true;
  });

  // Filtered telemetry logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchActor = (log.actor_name || '').toLowerCase().includes(q) || (log.actor_email || '').toLowerCase().includes(q);
    const matchAction = (log.action || '').toLowerCase().includes(q);
    const matchEntity = (log.entity_type || '').toLowerCase().includes(q);
    const matchIp = (log.details?.ip_address || '').toLowerCase().includes(q);
    return matchActor || matchAction || matchEntity || matchIp;
  });

  // Current active dataset & pagination calculations (Pin #3)
  const currentList = activeTab === 'pending'
    ? filteredRequests
    : activeTab === 'users'
    ? filteredUsers
    : activeTab === 'audit'
    ? filteredAuditLogs
    : filteredRequests;

  const totalItems = currentList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedList = currentList.slice(startIndex, endIndex);

  // Reusable Standardized Pagination Component (Pin #3)
  const renderPagination = () => {
    if (totalItems === 0) return null;
    return (
      <div className={`p-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
        isLight ? 'border-black/[0.06] bg-gray-50/70 text-gray-700' : 'border-zinc-800 bg-zinc-900/60 text-zinc-300'
      }`}>
        <div className="flex items-center gap-3">
          <span className="font-medium">
            Showing <strong className="font-bold">{totalItems === 0 ? 0 : startIndex + 1}</strong> to <strong className="font-bold">{endIndex}</strong> of <strong className="font-bold">{totalItems}</strong> entries
          </span>
          <div className="hidden sm:flex items-center gap-1.5 ml-2 pl-3 border-l border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] opacity-70">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className={`text-xs font-semibold rounded-lg px-2 py-1 cursor-pointer border ${
                isLight ? 'bg-white border-zinc-200 text-gray-900' : 'bg-zinc-900 border-zinc-800 text-zinc-200'
              }`}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1.5 rounded-lg border font-semibold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isLight ? 'bg-white hover:bg-gray-50 border-zinc-200 text-gray-900' : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>
          <span className="px-2 text-xs font-bold whitespace-nowrap">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className={`px-3 py-1.5 rounded-lg border font-semibold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isLight ? 'bg-white hover:bg-gray-50 border-zinc-200 text-gray-900' : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
            }`}
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Top Header */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-xl transition-colors ${
          isLight
            ? 'bg-white/95 border-zinc-200 text-gray-900 shadow-2xs'
            : 'bg-[#09090b]/95 border-zinc-800 text-zinc-100 shadow-xs'
        }`}>
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 min-w-0">
            
            {/* Left: Branding & Return Button */}
            <div className="flex items-center gap-2 sm:gap-3 pl-11 md:pl-0 min-w-0">
              <Link 
                href="/" 
                className={`flex items-center gap-2 p-1.5 rounded-lg transition-colors shrink-0 ${
                  isLight ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-100' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                }`}
                title="Return to Main Dashboard"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>

              <div className={`h-4 sm:h-6 w-px shrink-0 ${isLight ? 'bg-gray-200' : 'bg-zinc-800'}`} />

              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                  isLight 
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-800' 
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}>
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-base font-bold truncate">
                      <span className="hidden sm:inline">FinLITE </span>Admin Console
                    </span>
                  </div>
                  <p className={`hidden sm:block text-xs font-medium truncate ${isLight ? 'text-gray-500' : 'text-zinc-400'}`}>
                    User Access Verification, Account Lifecycle &amp; Telemetry
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">

            <button
              onClick={() => {
                fetchData(true);
                if (activeTab === 'audit') fetchAuditLogs(auditFilter);
              }}
              disabled={isRefreshing}
              className={`h-8 sm:h-9 px-2 sm:px-3 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 ${
                isLight 
                  ? 'bg-white hover:bg-gray-50 text-gray-800 border-zinc-200 shadow-2xs' 
                  : 'bg-zinc-900/60 hover:bg-zinc-900 text-zinc-200 border-zinc-800 hover:border-zinc-700'
              }`}
              title="Refresh Records"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              href="/"
              className="h-8 sm:h-9 px-2.5 sm:px-3.5 text-xs font-bold text-black bg-emerald-500 hover:bg-emerald-400 rounded-lg sm:rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span className="hidden sm:inline">Main Ledger</span>
              <span className="sm:hidden">Ledger</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        
        {/* Feedback Alert */}
        {feedback && (
          <div 
            className={`mb-6 p-4 rounded-xl border flex items-center justify-between duration-200 shadow-md ${
              feedback.type === 'success' 
                ? isLight
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
                : isLight
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
              )}
              <span className="text-xs font-semibold">{feedback.text}</span>
            </div>
            <button 
              onClick={() => setFeedback(null)}
              className="text-xs font-bold hover:underline cursor-pointer ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Navigation & Search Bar */}
        <div className={`p-4 rounded-2xl mb-6 border transition-all ${
          isLight
            ? 'bg-white border-black/[0.08] shadow-2xs'
            : 'bg-[#121214] border-zinc-800'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Tab Selector Pills */}
            <div className={`flex items-center p-1 rounded-xl gap-1 overflow-x-auto border ${
              isLight ? 'bg-gray-100/80 border-black/[0.06]' : 'bg-zinc-900 border-zinc-800'
            }`}>
              {/* Pending Tab */}
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'pending'
                    ? isLight ? 'bg-white text-gray-900 font-bold shadow-2xs' : 'bg-emerald-500 text-black font-bold'
                    : isLight ? 'text-gray-600 hover:text-gray-900 font-medium' : 'text-white/60 hover:text-white font-medium'
                }`}
              >
                <span>Pending Approvals</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'pending'
                    ? isLight ? 'bg-emerald-100 text-emerald-900' : 'bg-black/20 text-black'
                    : isLight ? 'bg-gray-200 text-gray-700' : 'bg-white/10 text-white/70'
                }`}>
                  {stats.pending || 0}
                </span>
              </button>

              {/* Users Tab */}
              <button
                onClick={() => setActiveTab('users')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'users'
                    ? isLight ? 'bg-white text-gray-900 font-bold shadow-2xs' : 'bg-emerald-500 text-black font-bold'
                    : isLight ? 'text-gray-600 hover:text-gray-900 font-medium' : 'text-white/60 hover:text-white font-medium'
                }`}
              >
                <span>Active Officers</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'users'
                    ? isLight ? 'bg-emerald-100 text-emerald-900' : 'bg-black/20 text-black'
                    : isLight ? 'bg-gray-200 text-gray-700' : 'bg-white/10 text-white/70'
                }`}>
                  {users.length}
                </span>
              </button>

              {/* Activity & Access Logs Tab */}
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'audit'
                    ? isLight ? 'bg-white text-gray-900 font-bold shadow-2xs' : 'bg-emerald-500 text-black font-bold'
                    : isLight ? 'text-gray-600 hover:text-gray-900 font-medium' : 'text-white/60 hover:text-white font-medium'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Activity &amp; Access Logs</span>
              </button>

              {/* Approved Log Tab */}
              <button
                onClick={() => setActiveTab('approved')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'approved'
                    ? isLight ? 'bg-white text-gray-900 font-bold shadow-2xs' : 'bg-emerald-500 text-black font-bold'
                    : isLight ? 'text-gray-600 hover:text-gray-900 font-medium' : 'text-white/60 hover:text-white font-medium'
                }`}
              >
                <span>Approved</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'approved'
                    ? isLight ? 'bg-emerald-100 text-emerald-900' : 'bg-black/20 text-black'
                    : isLight ? 'bg-gray-200 text-gray-700' : 'bg-white/10 text-white/70'
                }`}>
                  {stats.approved}
                </span>
              </button>

              {/* Declined Log Tab */}
              <button
                onClick={() => setActiveTab('rejected')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'rejected'
                    ? isLight ? 'bg-white text-gray-900 font-bold shadow-2xs' : 'bg-emerald-500 text-black font-bold'
                    : isLight ? 'text-gray-600 hover:text-gray-900 font-medium' : 'text-white/60 hover:text-white font-medium'
                }`}
              >
                <span>Declined</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'rejected'
                    ? isLight ? 'bg-emerald-100 text-emerald-900' : 'bg-black/20 text-black'
                    : isLight ? 'bg-gray-200 text-gray-700' : 'bg-white/10 text-white/70'
                }`}>
                  {stats.rejected}
                </span>
              </button>
            </div>

            {/* Controls: Filtering, Limit & Search (Pin #3) */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Category-specific filters for Users tab */}
              {activeTab === 'users' && (
                <>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className={`text-xs font-semibold rounded-xl px-2.5 py-2 cursor-pointer border ${
                      isLight
                        ? 'bg-gray-50 border-black/[0.08] text-gray-800'
                        : 'bg-[#121214] border-zinc-800 text-zinc-200'
                    }`}
                    title="Filter by Role"
                  >
                    <option value="all">All Roles</option>
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className={isLight ? 'bg-white text-gray-900' : 'bg-[#121214] text-zinc-100'}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={`text-xs font-semibold rounded-xl px-2.5 py-2 cursor-pointer border ${
                      isLight
                        ? 'bg-gray-50 border-black/[0.08] text-gray-800'
                        : 'bg-[#121214] border-zinc-800 text-zinc-200'
                    }`}
                    title="Filter by Account Status"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active Only</option>
                    <option value="suspended">Suspended Only</option>
                  </select>
                </>
              )}

              {/* Rows per page selector */}
              <div className="flex items-center gap-1.5">
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className={`text-xs font-semibold rounded-xl px-2.5 py-2 cursor-pointer border ${
                    isLight
                      ? 'bg-gray-50 border-black/[0.08] text-gray-800'
                      : 'bg-[#121214] border-zinc-800 text-zinc-200'
                  }`}
                  title="Rows per page limit"
                >
                  <option value={10}>10 rows</option>
                  <option value={25}>25 rows</option>
                  <option value={50}>50 rows</option>
                  <option value={100}>100 rows</option>
                </select>
              </div>

              {/* Search Input */}
              <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                  isLight ? 'text-gray-400' : 'text-zinc-500'
                }`} />
                <input
                  type="text"
                  placeholder={activeTab === 'audit' ? 'Search by user, action, IP...' : 'Search by name, email, phone...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full text-xs rounded-xl pl-9 pr-3.5 py-2 transition-all select-text border focus:outline-none focus:ring-1 ${
                    isLight
                      ? 'bg-gray-50 border-black/[0.08] text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-emerald-600 focus:ring-emerald-500/20'
                      : 'bg-[#121214] border-zinc-800 text-white placeholder:text-zinc-500 focus:border-emerald-400 focus:ring-emerald-500/30'
                  }`}
                />
              </div>
            </div>

          </div>
        </div>

        {/* Tab 1: Pending Approvals View */}
        {activeTab === 'pending' && (
          <div className={`rounded-2xl overflow-hidden border ${
            isLight ? 'bg-white border-black/[0.08]' : 'bg-[#121214] border-zinc-800'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${
              isLight ? 'border-black/[0.06] bg-gray-50/70' : 'border-zinc-800 bg-zinc-900/60'
            }`}>
              <div>
                <h3 className="text-sm font-bold">Pending Registration Approvals</h3>
                <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-zinc-400'}`}>
                  Review applicant details, assign officer roles, and approve or decline access
                </p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                isLight ? 'text-amber-900 bg-amber-100' : 'text-amber-300 bg-amber-500/15'
              }`}>
                {filteredRequests.length} Pending
              </span>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-xs opacity-60">
                <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin mx-auto mb-2" />
                <p className={`font-medium ${isLight ? 'text-gray-600' : 'text-zinc-400'}`}>Loading pending registration requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-12 sm:p-16 text-center">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${
                  isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold mb-1">Queue is Clear!</h3>
                <p className={`text-xs max-w-sm mx-auto font-medium ${isLight ? 'text-gray-500' : 'text-zinc-400'}`}>
                  {searchQuery ? 'No pending requests matched your search query.' : 'There are currently no new registration requests awaiting approval.'}
                </p>
              </div>
            ) : (
              <>
                <div className="hidden lg:grid grid-cols-12 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 bg-zinc-50/70 dark:bg-zinc-900/40 border-b border-black/[0.06] dark:border-zinc-800">
                  <div className="col-span-5">Applicant & Submission</div>
                  <div className="col-span-4">Assign Role</div>
                  <div className="col-span-3 text-right">Approval Decision</div>
                </div>

                <div className={`divide-y ${isLight ? 'divide-black/[0.06]' : 'divide-white/[0.06]'}`}>
                  {paginatedList.map((req) => (
                    <div 
                      key={req.id}
                      className={`p-4 lg:px-5 lg:py-4 transition-all flex flex-col lg:grid lg:grid-cols-12 items-start lg:items-center gap-3 lg:gap-4 ${
                        isLight ? 'hover:bg-gray-50/80' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      {/* Left: Applicant Identity (col-span-5) */}
                      <div className="col-span-5 flex items-start gap-3.5 min-w-0 w-full">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {req.first_name?.[0]?.toUpperCase() || 'U'}
                          {req.last_name?.[0]?.toUpperCase() || ''}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold truncate">
                              {req.first_name} {req.last_name}
                            </h4>
                            <span className={`px-2 py-0.5 text-[9px] font-semibold rounded-md ${
                              isLight ? 'bg-gray-100 text-gray-700' : 'bg-zinc-800 text-zinc-300'
                            }`}>
                              {req.auth_provider === 'google' ? 'Google OAuth' : 'Email/Password'}
                            </span>
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wider bg-amber-600 text-white">
                              Pending
                            </span>
                            <span
                              title={req.email_verified_at ? 'The applicant confirmed ownership of this inbox.' : 'The applicant has not opened the verification link yet.'}
                              className={`px-2 py-0.5 text-[9px] font-semibold rounded-md whitespace-nowrap border ${
                                isLight ? 'bg-white border-black/[0.08]' : 'bg-transparent border-white/[0.1]'
                              } ${
                                req.email_verified_at
                                  ? (isLight ? 'text-emerald-700' : 'text-emerald-300')
                                  : (isLight ? 'text-rose-700' : 'text-rose-300')
                              }`}
                            >
                              {req.email_verified_at ? 'Email verified' : 'Email not verified'}
                            </span>
                          </div>

                          <div className={`flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs font-medium ${
                            isLight ? 'text-gray-600' : 'text-zinc-400'
                          }`}>
                            <span className="font-semibold">{req.email}</span>
                            {req.contact_number && <span>• {req.contact_number}</span>}
                          </div>
                          <div className={`flex items-center gap-1.5 mt-0.5 text-[11px] ${isLight ? 'text-gray-400' : 'text-zinc-500'}`}>
                            <Calendar className="w-3 h-3" />
                            <span>Submitted: {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Role Assignment (col-span-4) */}
                      <div className="col-span-4 flex items-center gap-2 w-full">
                        <span className={`text-[11px] font-bold uppercase tracking-wider hidden sm:inline ${
                          isLight ? 'text-gray-500' : 'text-zinc-400'
                        }`}>
                          Assign:
                        </span>
                        <select
                          value={selectedRoles[req.id] || 'treasurer'}
                          onChange={(e) => setSelectedRoles((prev) => ({ ...prev, [req.id]: e.target.value }))}
                          className={`text-xs font-semibold rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:ring-1 border w-full max-w-[200px] ${
                            isLight
                              ? 'bg-white border-black/[0.08] text-gray-900 focus:ring-emerald-500/20'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-100 focus:ring-emerald-500/30'
                          }`}
                        >
                          {ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value} className={isLight ? 'bg-white text-gray-900' : 'bg-[#121214] text-zinc-100'}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Right: Decision Controls (col-span-3 text-right) */}
                      <div className="col-span-3 flex items-center justify-start lg:justify-end gap-2 w-full">
                        <button
                          onClick={() => handleOpenReject(req)}
                          disabled={isSubmittingAction}
                          className={`flex-1 sm:flex-initial justify-center px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50 text-center active:scale-95 ${
                            isLight ? 'text-rose-700 bg-rose-50 hover:bg-rose-100' : 'text-rose-300 bg-rose-500/15 hover:bg-rose-500/25'
                          }`}
                        >
                          Decline
                        </button>

                        <button
                          onClick={() => handleApprove(req.id)}
                          disabled={isSubmittingAction || !req.email_verified_at}
                          title={!req.email_verified_at ? 'Approval is available once the applicant verifies their email.' : undefined}
                          className="flex-1 sm:flex-initial justify-center px-3.5 sm:px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-center active:scale-95"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="whitespace-nowrap">Approve Access</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {renderPagination()}
              </>
            )}
          </div>
        )}

        {/* Tab 2: Active Officers / User Access Management */}
        {activeTab === 'users' && (
          <div className={`rounded-2xl overflow-hidden border ${
            isLight ? 'bg-white border-black/[0.08]' : 'bg-[#121214] border-zinc-800'
          }`}>
            <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isLight ? 'border-black/[0.06] bg-gray-50/70' : 'border-zinc-800 bg-zinc-900/60'
            }`}>
              <div>
                <h3 className="text-sm font-bold">Authorized Accounts &amp; Access Controls</h3>
                <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-zinc-400'}`}>
                  Manage status (Active vs Suspended), role assignments, and safe account lifecycle
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                  isLight ? 'text-emerald-900 bg-emerald-100' : 'text-emerald-300 bg-emerald-500/15'
                }`}>
                  {filteredUsers.length} Accounts Found
                </span>
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className={`p-12 text-center text-xs font-semibold ${isLight ? 'text-gray-400' : 'text-zinc-500'}`}>
                No user accounts found matching your query or filter.
              </div>
            ) : (
              <>
                <div className="hidden lg:grid grid-cols-12 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 bg-zinc-50/70 dark:bg-zinc-900/40 border-b border-black/[0.06] dark:border-zinc-800">
                  <div className="col-span-5">Officer / Account Details</div>
                  <div className="col-span-3">Assigned Role</div>
                  <div className="col-span-2 text-center">Status</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>

                <div className={`divide-y ${isLight ? 'divide-black/[0.06]' : 'divide-white/[0.06]'}`}>
                  {paginatedList.map((user) => {
                    const isPrimarySuperAdmin = user.email === 'geronimoandreijohn.pdm@gmail.com';
                    const isSuspended = user.status === 'suspended';

                    return (
                      <div 
                        key={user.id} 
                        className={`p-4 lg:px-5 lg:py-3.5 flex flex-col lg:grid lg:grid-cols-12 items-start lg:items-center gap-3 lg:gap-4 transition-colors ${
                          isLight ? 'hover:bg-gray-50/80' : 'hover:bg-white/[0.02]'
                        } ${isSuspended ? (isLight ? 'bg-amber-50/30' : 'bg-amber-950/10') : ''}`}
                      >
                        {/* Column 1: Identity (col-span-5) */}
                        <div className="col-span-5 flex items-center gap-3 min-w-0 w-full">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                            isPrimarySuperAdmin
                              ? isLight ? 'bg-purple-100 text-purple-900' : 'bg-purple-500/20 text-purple-300'
                              : isSuspended
                              ? isLight ? 'bg-amber-100 text-amber-900' : 'bg-amber-500/20 text-amber-300'
                              : isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {user.first_name?.[0] || user.full_name?.[0] || 'U'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold truncate">
                                {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim()}
                              </span>

                              {/* Super Admin Lock Badge */}
                              {isPrimarySuperAdmin && (
                                <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded flex items-center gap-1 ${
                                  isLight ? 'bg-purple-100 text-purple-900' : 'bg-purple-500/20 text-purple-200'
                                }`}>
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>Super Admin</span>
                                </span>
                              )}
                            </div>

                            <p className={`text-xs font-medium truncate mt-0.5 ${isLight ? 'text-gray-500' : 'text-zinc-400'}`}>
                              {user.email} {user.contact_number ? `• ${user.contact_number}` : ''}
                            </p>
                          </div>
                        </div>

                        {/* Column 2: Role Assignment (col-span-3) */}
                        <div className="col-span-3 flex items-center gap-2 w-full">
                          <select
                            disabled={isPrimarySuperAdmin}
                            value={user.role}
                            onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                            className={`text-xs font-semibold rounded-xl px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-1 border disabled:opacity-50 disabled:cursor-not-allowed w-full max-w-[170px] ${
                              isLight
                                ? 'bg-white border-zinc-200 text-gray-900 focus:ring-emerald-500/20'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-100 focus:ring-emerald-500/30'
                            }`}
                          >
                            {ROLE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value} className={isLight ? 'bg-white text-gray-900' : 'bg-[#121214] text-zinc-100'}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Column 3: Status Badge (col-span-2 text-center) */}
                        <div className="col-span-2 flex lg:justify-center w-full lg:w-auto">
                          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md tracking-wider ${
                            isSuspended
                              ? 'bg-amber-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}>
                            {isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                          </span>
                        </div>

                        {/* Column 4: Controls & Lifecycle Actions (col-span-2 text-right) */}
                        <div className="col-span-2 flex items-center justify-start lg:justify-end gap-2 w-full">
                          {isPrimarySuperAdmin ? (
                            <div className={`px-2.5 py-1 text-xs font-semibold rounded-xl border flex items-center gap-1 ${
                              isLight ? 'bg-gray-100 border-gray-200 text-gray-500' : 'bg-white/[0.04] border-white/[0.06] text-white/40'
                            }`}>
                              <Lock className="w-3 h-3" />
                              <span>Immutable</span>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleUserStatus(user)}
                                disabled={isSubmittingAction}
                                className={`flex-1 sm:flex-initial justify-center px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer border flex items-center gap-1.5 active:scale-95 ${
                                  isSuspended
                                    ? isLight
                                      ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-300'
                                      : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border-emerald-500/30'
                                    : isLight
                                      ? 'bg-amber-50 text-amber-900 hover:bg-amber-100 border-amber-300'
                                      : 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border-amber-500/30'
                                }`}
                                title={isSuspended ? 'Reactivate account access' : 'Suspend account to block login'}
                              >
                                {isSuspended ? (
                                  <>
                                    <UserCheck className="w-3.5 h-3.5 shrink-0" />
                                    <span>Reactivate</span>
                                  </>
                                ) : (
                                  <>
                                    <UserX className="w-3.5 h-3.5 shrink-0" />
                                    <span>Suspend</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenRemoveUser(user)}
                                className={`flex-1 sm:flex-initial justify-center px-2.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer border flex items-center gap-1 active:scale-95 ${
                                  isLight
                                    ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200'
                                    : 'text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20'
                                }`}
                                title="Safe account removal with financial dependency check"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <span className="hidden sm:inline">Remove</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {renderPagination()}
              </>
            )}
          </div>
        )}

        {/* Tab 3: Activity & Access Logs (Telemetry) */}
        {activeTab === 'audit' && (
          <div className={`rounded-2xl overflow-hidden border ${
            isLight ? 'bg-white border-black/[0.08]' : 'bg-[#121214] border-zinc-800'
          }`}>
            {/* Telemetry Filter Sub-Toolbar */}
            <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isLight ? 'border-black/[0.06] bg-gray-50/70' : 'border-zinc-800 bg-zinc-900/60'
            }`}>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold">Telemetry, Access &amp; Governance Trail</h3>
              </div>

              {/* Category Filter Pills */}
              <div className={`flex items-center p-1 rounded-xl gap-1 border overflow-x-auto ${
                isLight ? 'bg-white border-black/[0.08]' : 'bg-zinc-900 border-zinc-800'
              }`}>
                {AUDIT_FILTER_OPTIONS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setAuditFilter(f.id);
                      fetchAuditLogs(f.id);
                    }}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      auditFilter === f.id
                        ? isLight
                          ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                          : 'bg-emerald-500 text-black font-bold'
                        : isLight
                          ? 'text-gray-600 hover:text-gray-900 font-medium'
                          : 'text-white/60 hover:text-white font-medium'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Logs List Stream */}
            {isLoadingAudit ? (
              <div className="p-12 text-center text-xs opacity-60">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                <span>Loading activity trail records...</span>
              </div>
            ) : filteredAuditLogs.length === 0 ? (
              <div className={`p-12 text-center text-xs font-semibold ${isLight ? 'text-gray-400' : 'text-zinc-500'}`}>
                No telemetry activity records found for this filter.
              </div>
            ) : (
              <>
                <div className="hidden lg:grid grid-cols-12 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 bg-zinc-50/70 dark:bg-zinc-900/40 border-b border-black/[0.06] dark:border-zinc-800">
                  <div className="col-span-4">Actor & Identity</div>
                  <div className="col-span-3">Action & Entity</div>
                  <div className="col-span-3">Event Telemetry / Details</div>
                  <div className="col-span-2 text-right">Timestamp</div>
                </div>

                <div className={`divide-y ${isLight ? 'divide-black/[0.06]' : 'divide-white/[0.06]'}`}>
                  {paginatedList.map((log) => {
                    const isAuthEvent = log.action === 'AUTH_LOGIN' || log.action === 'AUTH_LOGOUT';
                    const isGovernance = ['ROLE_UPDATE', 'STATUS_UPDATE', 'ACCOUNT_DELETED', 'USER_APPROVED', 'USER_REJECTED'].includes(log.action);
                    
                    return (
                      <div 
                        key={log.id} 
                        className={`p-4 lg:px-5 lg:py-3.5 flex flex-col lg:grid lg:grid-cols-12 items-start lg:items-center gap-3 lg:gap-4 transition-colors text-xs ${
                          isLight ? 'hover:bg-gray-50/70' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        {/* Column 1: Actor & Identity (col-span-4) */}
                        <div className="col-span-4 flex items-center gap-3 min-w-0 w-full">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isAuthEvent
                              ? log.action === 'AUTH_LOGIN'
                                ? isLight ? 'bg-blue-100 text-blue-800' : 'bg-blue-500/20 text-blue-300'
                                : isLight ? 'bg-purple-100 text-purple-800' : 'bg-purple-500/20 text-purple-300'
                              : isGovernance
                              ? isLight ? 'bg-amber-100 text-amber-900' : 'bg-amber-500/20 text-amber-300'
                              : isLight ? 'bg-emerald-100 text-emerald-900' : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {isAuthEvent ? <KeyRound className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold truncate">{log.actor_name || 'System User'}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                                isLight ? 'bg-gray-100 text-gray-700' : 'bg-white/10 text-white/70'
                              }`}>
                                {log.actor_role}
                              </span>
                            </div>
                            {log.actor_email && (
                              <p className={`text-[11px] truncate mt-0.5 ${isLight ? 'text-gray-500' : 'text-zinc-400'}`}>
                                {log.actor_email}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Column 2: Action & Entity (col-span-3) - Pin #4 Solid fill without border! */}
                        <div className="col-span-3 flex items-center gap-2 flex-wrap w-full">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getActionTagClass(log.action)}`}>
                            {log.action}
                          </span>
                          <span className={`text-[10px] ${isLight ? 'text-gray-400' : 'text-zinc-500'}`}>
                            on <span className="font-mono font-medium">{log.entity_type}</span>
                          </span>
                        </div>

                        {/* Column 3: Event Telemetry / Details (col-span-3) */}
                        <div className="col-span-3 flex flex-wrap items-center gap-2 text-[11px] opacity-80 w-full">
                          {log.details?.auth_method && (
                            <span className="inline-flex items-center gap-1 font-medium">
                              <span className="opacity-70">Method:</span>
                              <strong className="font-bold">{log.details.auth_method}</strong>
                            </span>
                          )}
                          {log.details?.ip_address && (
                            <span className="inline-flex items-center gap-1 font-mono">
                              <Globe className="w-3 h-3 opacity-60" />
                              <span>{log.details.ip_address}</span>
                            </span>
                          )}
                          {log.details?.target_email && (
                            <span className="truncate">Target: <strong>{log.details.target_email}</strong></span>
                          )}
                          {log.details?.previous_status && log.details?.new_status && (
                            <span>{log.details.previous_status} → <strong>{log.details.new_status}</strong></span>
                          )}
                        </div>

                        {/* Column 4: Timestamp (col-span-2 text-right) */}
                        <div className={`col-span-2 text-left lg:text-right text-[11px] whitespace-nowrap tabular-nums font-medium ${
                          isLight ? 'text-gray-400' : 'text-zinc-400'
                        }`}>
                          {log.created_at ? new Date(log.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          }) : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {renderPagination()}
              </>
            )}
          </div>
        )}

        {/* Tab 4: Approved Requests Log */}
        {activeTab === 'approved' && (
          <div className={`rounded-2xl overflow-hidden border ${
            isLight ? 'bg-white border-black/[0.08]' : 'bg-[#121214] border-zinc-800'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${
              isLight ? 'border-black/[0.06] bg-gray-50/70' : 'border-zinc-800 bg-zinc-900/60'
            }`}>
              <div>
                <h3 className="text-sm font-bold">Approved Officer Records</h3>
                <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-zinc-400'}`}>
                  Historical log of successfully verified and granted access requests
                </p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                isLight ? 'text-emerald-900 bg-emerald-100' : 'text-emerald-300 bg-emerald-500/15'
              }`}>
                {filteredRequests.length} Approved
              </span>
            </div>

            {filteredRequests.length === 0 ? (
              <div className={`p-12 text-center text-xs font-semibold ${
                isLight ? 'text-gray-400' : 'text-zinc-500'
              }`}>
                No approved request records found.
              </div>
            ) : (
              <>
                <div className="hidden lg:grid grid-cols-12 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 bg-zinc-50/70 dark:bg-zinc-900/40 border-b border-black/[0.06] dark:border-zinc-800">
                  <div className="col-span-5">Officer / Email</div>
                  <div className="col-span-4">Granted Role</div>
                  <div className="col-span-3 text-right">Approval Date</div>
                </div>

                <div className={`divide-y ${isLight ? 'divide-black/[0.06]' : 'divide-white/[0.06]'}`}>
                  {paginatedList.map((req) => (
                    <div 
                      key={req.id} 
                      className={`p-4 lg:px-5 lg:py-3.5 flex flex-col lg:grid lg:grid-cols-12 items-start lg:items-center gap-3 lg:gap-4 transition-colors ${
                        isLight ? 'hover:bg-gray-50/80' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="col-span-5 flex items-center gap-3 min-w-0 w-full">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-bold truncate block">{req.first_name} {req.last_name}</span>
                          <p className={`text-xs font-medium truncate ${isLight ? 'text-gray-500' : 'text-zinc-400'}`}>{req.email}</p>
                        </div>
                      </div>

                      <div className="col-span-4 flex items-center w-full">
                        <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-md bg-emerald-600 text-white">
                          {req.requested_role}
                        </span>
                      </div>

                      <div className={`col-span-3 text-left lg:text-right text-[11px] font-medium ${isLight ? 'text-gray-400' : 'text-zinc-500'} w-full`}>
                        Approved: {req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : 'Active'}
                      </div>
                    </div>
                  ))}
                </div>

                {renderPagination()}
              </>
            )}
          </div>
        )}

        {/* Tab 5: Declined Requests */}
        {activeTab === 'rejected' && (
          <div className={`rounded-2xl overflow-hidden border ${
            isLight ? 'bg-white border-black/[0.08]' : 'bg-[#121214] border-zinc-800'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${
              isLight ? 'border-black/[0.06] bg-gray-50/70' : 'border-zinc-800 bg-zinc-900/60'
            }`}>
              <div>
                <h3 className="text-sm font-bold">Declined Registration Requests</h3>
                <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-zinc-400'}`}>
                  Record of applicants that did not meet verification criteria
                </p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                isLight ? 'text-rose-900 bg-rose-100' : 'text-rose-300 bg-rose-500/15'
              }`}>
                {filteredRequests.length} Declined
              </span>
            </div>

            {filteredRequests.length === 0 ? (
              <div className={`p-12 text-center text-xs font-semibold ${
                isLight ? 'text-gray-400' : 'text-zinc-500'
              }`}>
                No declined requests recorded.
              </div>
            ) : (
              <>
                <div className="hidden lg:grid grid-cols-12 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 bg-zinc-50/70 dark:bg-zinc-900/40 border-b border-black/[0.06] dark:border-zinc-800">
                  <div className="col-span-4">Applicant / Email</div>
                  <div className="col-span-5">Reason For Rejection</div>
                  <div className="col-span-3 text-right">Reviewed Date</div>
                </div>

                <div className={`divide-y ${isLight ? 'divide-black/[0.06]' : 'divide-white/[0.06]'}`}>
                  {paginatedList.map((req) => (
                    <div 
                      key={req.id} 
                      className={`p-4 lg:px-5 lg:py-3.5 flex flex-col lg:grid lg:grid-cols-12 items-start lg:items-center gap-3 lg:gap-4 transition-colors ${
                        isLight ? 'hover:bg-gray-50/80' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="col-span-4 flex items-center gap-3 min-w-0 w-full">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          isLight ? 'bg-rose-100 text-rose-700' : 'bg-rose-500/15 text-rose-400'
                        }`}>
                          <XCircle className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-bold truncate block">{req.first_name} {req.last_name}</span>
                          <p className={`text-xs font-medium truncate ${isLight ? 'text-gray-500' : 'text-zinc-400'}`}>{req.email}</p>
                        </div>
                      </div>

                      <div className="col-span-5 w-full">
                        {req.rejection_reason ? (
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-md inline-block ${
                            isLight ? 'bg-rose-100 text-rose-900' : 'bg-rose-950/60 text-rose-300'
                          }`}>
                            {req.rejection_reason}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400 italic">No specific reason provided</span>
                        )}
                      </div>

                      <div className={`col-span-3 text-left lg:text-right text-[11px] font-medium ${isLight ? 'text-gray-400' : 'text-zinc-500'} w-full`}>
                        Declined: {req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>

                {renderPagination()}
              </>
            )}
          </div>
        )}

      </main>

      {/* Safe Account Deletion Modal (Financial Ledger Dependency Check) */}
      <Modal
        isOpen={Boolean(removingUser)}
        onClose={() => setRemovingUser(null)}
        title={
          removingUser ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">Safe Account Removal</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {removingUser.full_name || removingUser.email} ({removingUser.email})
                </p>
              </div>
            </div>
          ) : null
        }
        maxWidth="md"
      >
        {removingUser && (
          <div className="p-6">
            {isCheckingDeps ? (
              <div className="py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                <span>Checking financial ledger dependencies...</span>
              </div>
            ) : userDeps && userDeps.transactionCount > 0 ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border text-xs bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-200">
                  <div className="flex items-center gap-2 font-bold mb-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Hard Deletion Disallowed: Ledger History Detected</span>
                  </div>
                  <p className="leading-relaxed">
                    This user has recorded <strong>{userDeps.transactionCount} financial transaction(s) or reconciliation items</strong> in the official ledger.
                  </p>
                  <p className="mt-2 leading-relaxed">
                    Under PDM CCS Institutional Audit Standards, accounts with financial history cannot be purged to preserve ledger audit trails.
                  </p>
                  <div className="mt-3 font-semibold">
                    Recommended Action: <strong>Suspend Account</strong> to immediately revoke login access while maintaining complete financial records.
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setRemovingUser(null)}
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    variant="warning"
                    onClick={() => {
                      handleToggleUserStatus(removingUser);
                      setRemovingUser(null);
                    }}
                  >
                    Suspend Account Instead
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border text-xs leading-relaxed bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-200">
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>0 Ledger Transactions Recorded</span>
                  </div>
                  <p>
                    This account has no associated transactions or cashbox entries in the ledger. It is safe to remove from <code>profiles</code> and auth credentials.
                  </p>
                  <p className="mt-2 text-rose-600 dark:text-rose-400 font-semibold">
                    Warning: This action is permanent.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setRemovingUser(null)}
                    disabled={isDeletingUser}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={handleConfirmRemoveUser}
                    loading={isDeletingUser}
                    disabled={isDeletingUser}
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  >
                    Confirm Removal
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Rejection Reason Modal */}
      <Modal
        isOpen={Boolean(rejectingRequest)}
        onClose={() => setRejectingRequest(null)}
        title={
          rejectingRequest ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">Decline Registration</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {rejectingRequest.first_name} {rejectingRequest.last_name} ({rejectingRequest.email})
                </p>
              </div>
            </div>
          ) : null
        }
        maxWidth="md"
      >
        {rejectingRequest && (
          <div className="p-6">
            <p className="text-xs mb-3 font-medium text-zinc-600 dark:text-zinc-400">
              Please specify the reason for declining this applicant. This reason is saved for institutional audit trails.
            </p>

            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Not an active officer, invalid student number..."
              className="w-full text-xs font-medium rounded-xl p-3 mb-4 select-text border focus:outline-none focus:ring-1 bg-white dark:bg-[#121214] border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:ring-rose-500/20 focus:border-rose-500"
            />

            <div className="flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRejectingRequest(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleConfirmReject}
                loading={isSubmittingAction}
                disabled={isSubmittingAction}
              >
                Confirm Decline
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </>
  );
}
