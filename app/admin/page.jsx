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
  Loader2
} from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';

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

  // Filtered users for users tab
  const filteredUsers = users.filter((u) => {
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

  return (
    <div className="min-h-screen flex flex-col font-sans">
      
      {/* Top Header */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-xl transition-colors ${
        isLight
          ? 'bg-white/95 border-zinc-200 text-gray-900 shadow-2xs'
          : 'bg-[#09090b]/95 border-zinc-800 text-zinc-100 shadow-xs'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Left: Branding & Portal Badge */}
          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              className={`flex items-center gap-2 p-1.5 rounded-lg transition-colors ${
                isLight ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-100' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              }`}
              title="Return to Main Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className={`h-6 w-px ${isLight ? 'bg-gray-200' : 'bg-zinc-800'}`} />

            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                isLight 
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-800' 
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold">
                    <span className="hidden sm:inline">FinLITE </span>Admin Console
                  </span>
                  <span className={`hidden sm:inline px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md shrink-0 border ${
                    isLight 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    Access Control
                  </span>
                </div>
                <p className={`hidden sm:block text-xs font-medium truncate ${isLight ? 'text-gray-500' : 'text-zinc-400'}`}>
                  User Access Verification, Account Lifecycle &amp; Telemetry
                </p>
              </div>
            </div>
          </div>

          {/* Right: Identity & Actions */}
          <div className="flex items-center gap-2.5">
            <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 border rounded-lg ${
              isLight ? 'bg-gray-50 border-zinc-200' : 'bg-zinc-900/60 border-zinc-800'
            }`}>
              <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <div className="text-right">
                <p className="text-xs font-semibold">geronimoandreijohn.pdm@gmail.com</p>
                <p className={`text-[10px] font-medium ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>Primary Super Admin</p>
              </div>
            </div>

            <button
              onClick={() => {
                fetchData(true);
                if (activeTab === 'audit') fetchAuditLogs(auditFilter);
              }}
              disabled={isRefreshing}
              className={`h-9 px-3 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
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
              className="px-3.5 py-2 text-xs font-bold text-black bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>Main Ledger</span>
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
            : 'bg-[#081a11] border-white/[0.08]'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Tab Selector Pills */}
            <div className={`flex items-center p-1 rounded-xl gap-1 overflow-x-auto border ${
              isLight ? 'bg-gray-100/80 border-black/[0.06]' : 'bg-[#05140d] border-white/[0.06]'
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

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                isLight ? 'text-gray-400' : 'text-white/40'
              }`} />
              <input
                type="text"
                placeholder={activeTab === 'audit' ? 'Search by user, action, IP...' : 'Search by name, email, phone...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full text-xs rounded-xl pl-9 pr-3.5 py-2 transition-all select-text border focus:outline-none focus:ring-1 ${
                  isLight
                    ? 'bg-gray-50 border-black/[0.08] text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-emerald-600 focus:ring-emerald-500/20'
                    : 'bg-[#05140d] border-white/[0.08] text-white placeholder:text-white/35 focus:border-emerald-400 focus:ring-emerald-500/30'
                }`}
              />
            </div>

          </div>
        </div>

        {/* Tab 1: Pending Approvals View */}
        {activeTab === 'pending' && (
          <div className="space-y-3">
            {isLoading ? (
              <div className={`p-12 text-center rounded-2xl border ${
                isLight ? 'bg-white border-black/[0.08]' : 'bg-[#081a11] border-white/[0.08]'
              }`}>
                <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin mx-auto mb-2" />
                <p className={`text-xs font-medium ${isLight ? 'text-gray-600' : 'text-white/60'}`}>Loading pending registration requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className={`p-12 sm:p-16 text-center rounded-2xl border ${
                isLight ? 'bg-white border-black/[0.08]' : 'bg-[#081a11] border-white/[0.08]'
              }`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${
                  isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold mb-1">Queue is Clear!</h3>
                <p className={`text-xs max-w-sm mx-auto font-medium ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
                  {searchQuery ? 'No pending requests matched your search query.' : 'There are currently no new registration requests awaiting approval.'}
                </p>
              </div>
            ) : (
              filteredRequests.map((req) => (
                <div 
                  key={req.id}
                  className={`rounded-2xl p-5 transition-all border flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    isLight ? 'bg-white border-black/[0.08]' : 'bg-[#081a11] border-white/[0.08]'
                  }`}
                >
                  {/* Left: Applicant Identity */}
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 ${
                      isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {req.first_name?.[0]?.toUpperCase() || 'U'}
                      {req.last_name?.[0]?.toUpperCase() || ''}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm sm:text-base font-bold">
                          {req.first_name} {req.last_name}
                        </h4>
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ${
                          isLight ? 'bg-gray-100 text-gray-700' : 'bg-[#05140d] text-white/80'
                        }`}>
                          {req.auth_provider === 'google' ? 'Google OAuth' : 'Email/Password'}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                          isLight ? 'bg-amber-100 text-amber-900' : 'bg-amber-500/15 text-amber-300'
                        }`}>
                          Pending Approval
                        </span>
                      </div>

                      <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs font-medium ${
                        isLight ? 'text-gray-600' : 'text-white/70'
                      }`}>
                        <div className="flex items-center gap-1.5">
                          <Mail className={`w-3.5 h-3.5 ${isLight ? 'text-gray-400' : 'text-white/40'}`} />
                          <span className="font-semibold">{req.email}</span>
                        </div>
                        {req.contact_number && (
                          <div className="flex items-center gap-1.5">
                            <Phone className={`w-3.5 h-3.5 ${isLight ? 'text-gray-400' : 'text-white/40'}`} />
                            <span>{req.contact_number}</span>
                          </div>
                        )}
                        <div className={`flex items-center gap-1.5 ${isLight ? 'text-gray-400' : 'text-white/45'}`}>
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Submitted: {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Role Assignment & Controls */}
                  <div className={`flex items-center gap-2.5 pt-3 lg:pt-0 border-t lg:border-t-0 justify-end flex-wrap ${
                    isLight ? 'border-gray-100' : 'border-white/[0.06]'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-bold uppercase tracking-wider hidden sm:inline ${
                        isLight ? 'text-gray-500' : 'text-white/60'
                      }`}>
                        Assign Role:
                      </span>
                      <select
                        value={selectedRoles[req.id] || 'treasurer'}
                        onChange={(e) => setSelectedRoles((prev) => ({ ...prev, [req.id]: e.target.value }))}
                        className={`text-xs font-semibold rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:ring-1 border ${
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

                    <button
                      onClick={() => handleOpenReject(req)}
                      disabled={isSubmittingAction}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50 ${
                        isLight ? 'text-rose-700 bg-rose-50 hover:bg-rose-100' : 'text-rose-300 bg-rose-500/15 hover:bg-rose-500/25'
                      }`}
                    >
                      Decline
                    </button>

                    <button
                      onClick={() => handleApprove(req.id)}
                      disabled={isSubmittingAction}
                      className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve Access</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Active Officers / User Access Management */}
        {activeTab === 'users' && (
          <div className={`rounded-2xl overflow-hidden border ${
            isLight ? 'bg-white border-black/[0.08]' : 'bg-[#081a11] border-white/[0.08]'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${
              isLight ? 'border-black/[0.06] bg-gray-50/70' : 'border-white/[0.06] bg-[#05140d]'
            }`}>
              <div>
                <h3 className="text-sm font-bold">Authorized Accounts &amp; Access Controls</h3>
                <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
                  Manage status (Active vs Suspended), role assignments, and safe account lifecycle
                </p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                isLight ? 'text-emerald-900 bg-emerald-100' : 'text-emerald-300 bg-emerald-500/15'
              }`}>
                {filteredUsers.length} Accounts
              </span>
            </div>

            {filteredUsers.length === 0 ? (
              <div className={`p-12 text-center text-xs font-semibold ${isLight ? 'text-gray-400' : 'text-white/40'}`}>
                No user accounts found matching your query.
              </div>
            ) : (
              <div className={`divide-y ${isLight ? 'divide-black/[0.06]' : 'divide-white/[0.06]'}`}>
                {filteredUsers.map((user) => {
                  const isPrimarySuperAdmin = user.email === 'geronimoandreijohn.pdm@gmail.com';
                  const isSuspended = user.status === 'suspended';

                  return (
                    <div 
                      key={user.id} 
                      className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                        isLight ? 'hover:bg-gray-50/80' : 'hover:bg-white/[0.02]'
                      } ${isSuspended ? (isLight ? 'bg-amber-50/30' : 'bg-amber-950/10') : ''}`}
                    >
                      {/* Identity & Status */}
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          isPrimarySuperAdmin
                            ? isLight ? 'bg-purple-100 text-purple-900' : 'bg-purple-500/20 text-purple-300'
                            : isSuspended
                            ? isLight ? 'bg-amber-100 text-amber-900' : 'bg-amber-500/20 text-amber-300'
                            : isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {user.first_name?.[0] || user.full_name?.[0] || 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold">
                              {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim()}
                            </span>

                            {/* Status Badge */}
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md tracking-wider border ${
                              isSuspended
                                ? isLight ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                : isLight ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            }`}>
                              {isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                            </span>

                            {/* Role Badge */}
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${
                              isLight ? 'bg-gray-100 text-gray-800' : 'bg-white/10 text-white/80'
                            }`}>
                              {user.role}
                            </span>

                            {/* Super Admin Lock Badge */}
                            {isPrimarySuperAdmin && (
                              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border flex items-center gap-1 ${
                                isLight ? 'bg-purple-100 text-purple-900 border-purple-200' : 'bg-purple-500/20 text-purple-200 border-purple-500/30'
                              }`}>
                                <Lock className="w-2.5 h-2.5" />
                                <span>Primary Super Admin</span>
                              </span>
                            )}
                          </div>

                          <p className={`text-xs font-medium mt-0.5 ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
                            {user.email} {user.contact_number ? `• ${user.contact_number}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Controls Toolbar */}
                      <div className="flex items-center gap-2.5 self-end md:self-center flex-wrap">
                        
                        {/* Change Role Selector (locked for primary super admin) */}
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[11px] font-semibold ${isLight ? 'text-gray-500' : 'text-white/60'}`}>Role:</span>
                          <select
                            disabled={isPrimarySuperAdmin}
                            value={user.role}
                            onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                            className={`text-xs font-semibold rounded-xl px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-1 border disabled:opacity-50 disabled:cursor-not-allowed ${
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

                        {/* Suspend / Reactivate Toggle Button */}
                        {isPrimarySuperAdmin ? (
                          <div className={`px-2.5 py-1 text-xs font-semibold rounded-xl border flex items-center gap-1 ${
                            isLight ? 'bg-gray-100 border-gray-200 text-gray-500' : 'bg-white/[0.04] border-white/[0.06] text-white/40'
                          }`}>
                            <Lock className="w-3 h-3" />
                            <span>Immutable</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(user)}
                            disabled={isSubmittingAction}
                            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer border flex items-center gap-1.5 ${
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
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Reactivate</span>
                              </>
                            ) : (
                              <>
                                <UserX className="w-3.5 h-3.5" />
                                <span>Suspend</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* Safe Remove Account Button */}
                        {!isPrimarySuperAdmin && (
                          <button
                            type="button"
                            onClick={() => handleOpenRemoveUser(user)}
                            className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer border flex items-center gap-1 ${
                              isLight
                                ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200'
                                : 'text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20'
                            }`}
                            title="Safe account removal with financial dependency check"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Remove</span>
                          </button>
                        )}

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Activity & Access Logs (Telemetry) */}
        {activeTab === 'audit' && (
          <div className={`rounded-2xl overflow-hidden border ${
            isLight ? 'bg-white border-black/[0.08]' : 'bg-[#081a11] border-white/[0.08]'
          }`}>
            {/* Telemetry Filter Sub-Toolbar */}
            <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isLight ? 'border-black/[0.06] bg-gray-50/70' : 'border-white/[0.06] bg-[#05140d]'
            }`}>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold">Telemetry, Access &amp; Governance Trail</h3>
              </div>

              {/* Category Filter Pills */}
              <div className={`flex items-center p-1 rounded-xl gap-1 border ${
                isLight ? 'bg-white border-black/[0.08]' : 'bg-[#092216] border-white/[0.08]'
              }`}>
                {AUDIT_FILTER_OPTIONS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setAuditFilter(f.id);
                      fetchAuditLogs(f.id);
                    }}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-all cursor-pointer ${
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
              <div className={`p-12 text-center text-xs font-semibold ${isLight ? 'text-gray-400' : 'text-white/40'}`}>
                No telemetry activity records found for this filter.
              </div>
            ) : (
              <div className={`divide-y ${isLight ? 'divide-black/[0.06]' : 'divide-white/[0.06]'}`}>
                {filteredAuditLogs.map((log) => {
                  const isAuthEvent = log.action === 'AUTH_LOGIN' || log.action === 'AUTH_LOGOUT';
                  const isGovernance = ['ROLE_UPDATE', 'STATUS_UPDATE', 'ACCOUNT_DELETED', 'USER_APPROVED', 'USER_REJECTED'].includes(log.action);
                  
                  return (
                    <div key={log.id} className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
                      isLight ? 'hover:bg-gray-50/70' : 'hover:bg-white/[0.02]'
                    }`}>
                      {/* Left: Event Type, Actor, Details */}
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
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

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold">{log.actor_name}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                              isLight ? 'bg-gray-100 text-gray-700' : 'bg-white/10 text-white/70'
                            }`}>
                              {log.actor_role}
                            </span>
                            
                            {/* Action Tag */}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                              log.action === 'AUTH_LOGIN'
                                ? isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                : log.action === 'AUTH_LOGOUT'
                                ? isLight ? 'bg-gray-100 border-gray-300 text-gray-700' : 'bg-white/10 border-white/20 text-white/70'
                                : log.action === 'ACCOUNT_DELETED'
                                ? isLight ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                                : log.action === 'STATUS_UPDATE' || log.action === 'ROLE_UPDATE'
                                ? isLight ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                                : isLight ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                            }`}>
                              {log.action}
                            </span>

                            {/* Entity Type */}
                            <span className={`text-[10px] ${isLight ? 'text-gray-400' : 'text-white/40'}`}>
                              on <span className="font-mono">{log.entity_type}</span>
                            </span>
                          </div>

                          {/* Event Metadata: Auth method, IP, details */}
                          <div className="flex items-center gap-3 mt-1 text-[11px] flex-wrap opacity-75">
                            {log.details?.auth_method && (
                              <span className="inline-flex items-center gap-1 font-medium">
                                <span>Method:</span>
                                <strong className="font-bold">{log.details.auth_method}</strong>
                              </span>
                            )}
                            {log.details?.ip_address && (
                              <span className="inline-flex items-center gap-1 font-mono">
                                <Globe className="w-3 h-3" />
                                <span>{log.details.ip_address}</span>
                              </span>
                            )}
                            {log.details?.target_email && (
                              <span>Target: <strong>{log.details.target_email}</strong></span>
                            )}
                            {log.details?.previous_status && log.details?.new_status && (
                              <span>Status: {log.details.previous_status} → <strong>{log.details.new_status}</strong></span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Timestamp */}
                      <div className={`text-[11px] whitespace-nowrap tabular-nums font-medium ${
                        isLight ? 'text-gray-400' : 'text-white/45'
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
            )}
          </div>
        )}

        {/* Tab 4: Approved Requests Log */}
        {activeTab === 'approved' && (
          <div className="space-y-3">
            {filteredRequests.length === 0 ? (
              <div className={`p-12 text-center rounded-2xl text-xs font-semibold border ${
                isLight ? 'bg-white border-black/[0.08] text-gray-400' : 'bg-[#081a11] border-white/[0.08] text-white/45'
              }`}>
                No approved request records found.
              </div>
            ) : (
              filteredRequests.map((req) => (
                <div key={req.id} className={`rounded-2xl p-4 flex items-center justify-between gap-4 border transition-all ${
                  isLight ? 'bg-white border-black/[0.08]' : 'bg-[#081a11] border-white/[0.08]'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{req.first_name} {req.last_name}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${
                          isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/15 text-emerald-300'
                        }`}>
                          {req.requested_role}
                        </span>
                      </div>
                      <p className={`text-xs font-medium ${isLight ? 'text-gray-500' : 'text-white/50'}`}>{req.email}</p>
                    </div>
                  </div>

                  <span className={`text-[11px] font-medium ${isLight ? 'text-gray-400' : 'text-white/45'}`}>
                    Approved: {req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : 'Active'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 5: Declined Requests */}
        {activeTab === 'rejected' && (
          <div className="space-y-3">
            {filteredRequests.length === 0 ? (
              <div className={`p-12 text-center rounded-2xl text-xs font-semibold border ${
                isLight ? 'bg-white border-black/[0.08] text-gray-400' : 'bg-[#081a11] border-white/[0.08] text-white/45'
              }`}>
                No declined requests recorded.
              </div>
            ) : (
              filteredRequests.map((req) => (
                <div key={req.id} className={`rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border transition-all ${
                  isLight ? 'bg-rose-50/40 border-rose-200' : 'bg-rose-950/10 border-rose-500/20'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      isLight ? 'bg-rose-100 text-rose-700' : 'bg-rose-500/15 text-rose-400'
                    }`}>
                      <XCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold">{req.first_name} {req.last_name}</span>
                      <p className={`text-xs font-medium ${isLight ? 'text-gray-500' : 'text-white/50'}`}>{req.email}</p>
                      {req.rejection_reason && (
                        <p className={`text-xs font-medium mt-1 px-2.5 py-1 rounded-md inline-block ${
                          isLight ? 'bg-rose-100 text-rose-900' : 'bg-rose-950/60 text-rose-300'
                        }`}>
                          Reason: {req.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className={`text-[11px] font-medium ${isLight ? 'text-gray-400' : 'text-white/45'}`}>
                    Declined: {req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

      </main>

      {/* Safe Account Deletion Modal (Financial Ledger Dependency Check) */}
      {removingUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`rounded-2xl max-w-md w-full p-6 shadow-2xl border animate-in fade-in zoom-in-95 duration-150 ${
            isLight ? 'bg-white border-black/[0.08]' : 'bg-[#081a11] border-white/[0.08]'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isLight ? 'bg-rose-100 border-rose-200 text-rose-700' : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
              }`}>
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">Safe Account Removal</h3>
                <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
                  {removingUser.full_name || removingUser.email} ({removingUser.email})
                </p>
              </div>
            </div>

            {isCheckingDeps ? (
              <div className="py-6 text-center text-xs opacity-60">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                <span>Checking financial ledger dependencies...</span>
              </div>
            ) : userDeps && userDeps.transactionCount > 0 ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border text-xs ${
                  isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                }`}>
                  <div className="flex items-center gap-2 font-bold mb-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
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
                  <button
                    type="button"
                    onClick={() => setRemovingUser(null)}
                    className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                      isLight ? 'text-gray-600 hover:bg-gray-100' : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleUserStatus(removingUser);
                      setRemovingUser(null);
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-all cursor-pointer"
                  >
                    Suspend Account Instead
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                  isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                }`}>
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>0 Ledger Transactions Recorded</span>
                  </div>
                  <p>
                    This account has no associated transactions or cashbox entries in the ledger. It is safe to remove from <code>profiles</code> and auth credentials.
                  </p>
                  <p className="mt-2 text-rose-600 font-semibold">
                    Warning: This action is permanent.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRemovingUser(null)}
                    disabled={isDeletingUser}
                    className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                      isLight ? 'text-gray-600 hover:bg-gray-100' : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRemoveUser}
                    disabled={isDeletingUser}
                    className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isDeletingUser ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>Confirm Removal</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`rounded-2xl max-w-md w-full p-6 shadow-2xl border animate-in fade-in zoom-in-95 duration-150 ${
            isLight ? 'bg-white border-black/[0.08]' : 'bg-[#081a11] border-white/[0.08]'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isLight ? 'bg-rose-100 border-rose-200 text-rose-700' : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
              }`}>
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">Decline Registration</h3>
                <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
                  {rejectingRequest.first_name} {rejectingRequest.last_name} ({rejectingRequest.email})
                </p>
              </div>
            </div>

            <p className={`text-xs mb-3 font-medium ${isLight ? 'text-gray-600' : 'text-white/60'}`}>
              Please specify the reason for declining this applicant. This reason is saved for institutional audit trails.
            </p>

            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Not an active officer, invalid student number..."
              className={`w-full text-xs font-medium rounded-xl p-3 mb-4 select-text border focus:outline-none focus:ring-1 ${
                isLight
                  ? 'bg-gray-50 border-black/[0.08] text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-rose-500/20 focus:border-rose-500'
                  : 'bg-[#05140d] border-white/[0.08] text-white placeholder:text-white/30 focus:ring-rose-500/30 focus:border-rose-500/50'
              }`}
            />

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  isLight ? 'text-gray-600 hover:bg-gray-100' : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isSubmittingAction}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
