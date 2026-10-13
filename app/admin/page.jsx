'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
  Mail,
  Phone,
  Calendar,
  ChevronDown,
  ExternalLink,
  Shield,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';

const ROLE_OPTIONS = [
  { value: 'treasurer', label: 'Treasurer', desc: 'Disbursements & Collections' },
  { value: 'auditor', label: 'Auditor', desc: 'Audit & Denomination Verification' },
  { value: 'president', label: 'President', desc: 'Budget & Approval Authority' },
  { value: 'adviser', label: 'Adviser', desc: 'Faculty Oversight & Signatory' },
  { value: 'admin', label: 'Admin', desc: 'Full System & Access Control' },
];

export default function AdminPage() {
  const router = useRouter();
  const { isLight } = useTheme();
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'users'
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

  // Fetch Requests & Stats
  const fetchData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    try {
      const res = await fetch('/api/admin/requests');
      if (res.status === 401 || res.status === 403) {
        // Not authorized as admin
        router.push('/login?error=admin_required');
        return;
      }

      const data = await res.json();
      if (data.success) {
        setRequests(data.requests || []);
        setStats(data.stats || { total: 0, pending: 0, approved: 0, rejected: 0 });

        // Default role selection mapping
        const roleMap = {};
        (data.requests || []).forEach((r) => {
          roleMap[r.id] = r.requested_role || 'treasurer';
        });
        setSelectedRoles(roleMap);
      }

      // Also fetch users
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Approve
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
      return matchName || matchEmail || matchRole;
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col font-sans">
      
      {/* Top Header — Consistent Deep Forest Emerald */}
      <header className="sticky top-0 z-30 bg-[#082217]/85 backdrop-blur-xl border-b border-emerald-500/15 text-white shadow-md transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Left: Branding & Portal Badge */}
          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-emerald-500/15 transition-colors text-white/60 hover:text-white"
              title="Return to Main Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="h-6 w-px bg-emerald-500/20" />

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shadow-xs shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white">
                    <span className="hidden sm:inline">FinLITE </span>Admin Console
                  </span>
                  <span className="hidden sm:inline px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md shrink-0">
                    Access Control
                  </span>
                </div>
                <p className="hidden sm:block text-xs text-emerald-400 font-medium truncate">
                  User Registration Verification &amp; Role Management
                </p>
              </div>
            </div>
          </div>

          {/* Right: Identity & Actions */}
          <div className="flex items-center gap-2.5">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#0c1e16] border border-[#1a382b] rounded-xl">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div className="text-right">
                <p className="text-xs font-semibold text-white/90">geronimoandreijohn.pdm@gmail.com</p>
                <p className="text-[10px] text-emerald-400/80 font-medium">Super Administrator</p>
              </div>
            </div>

            <button
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className="h-9 px-3 text-xs font-semibold text-emerald-100 bg-[#0c1e16] hover:bg-[#122b20] active:bg-[#163527] border border-[#1a382b] rounded-xl transition-all shadow-2xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              title="Refresh Records"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              href="/"
              className="px-3.5 py-2 text-xs font-black text-black bg-[#10b981] hover:bg-[#059669] rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
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
            className={`mb-6 p-4 rounded-xl border flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200 shadow-xl ${
              feedback.type === 'success' 
                ? isLight
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
                : isLight
                  ? 'bg-rose-100 border-rose-300 text-rose-900'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className={`w-5 h-5 shrink-0 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
              ) : (
                <AlertTriangle className={`w-5 h-5 shrink-0 ${isLight ? 'text-rose-700' : 'text-rose-400'}`} />
              )}
              <span className="text-sm font-semibold">{feedback.text}</span>
            </div>
            <button 
              onClick={() => setFeedback(null)} 
              className="text-xs font-semibold underline hover:opacity-80 ml-4 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Overview Metric Cards with Distinct Pastel & Dark Theme Colors */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-8">
          
          {/* 1. Pending Approvals Card — ACCENT: WARM AMBER */}
          <div 
            onClick={() => setActiveTab('pending')}
            className={`p-5 rounded-2xl transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between shadow-lg ${
              isLight
                ? activeTab === 'pending'
                  ? 'bg-gradient-to-br from-[#fff7d6] via-[#feecaa] to-[#fde078] ring-2 ring-amber-400/40 shadow-amber-900/15'
                  : 'bg-gradient-to-br from-[#fffdf5] via-[#fef7df] to-[#fdedbe] hover:shadow-md'
                : activeTab === 'pending'
                  ? 'bg-[#221c0b] ring-2 ring-amber-400/30 shadow-xl shadow-amber-950/40'
                  : 'bg-[#181408] hover:bg-[#1d180a] shadow-lg shadow-amber-950/20'
            }`}
          >
            <div className="flex items-center justify-between mb-3 gap-2">
              <span className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-amber-950' : 'text-amber-300'}`}>
                Pending Approval
              </span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                isLight ? 'bg-amber-300/80 text-amber-950' : 'bg-amber-500/15 text-amber-400'
              }`}>
                <Clock className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <span className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${isLight ? 'text-amber-950' : 'text-white'}`}>
                {stats.pending}
              </span>
              {stats.pending > 0 && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse ${
                  isLight
                    ? 'bg-amber-300/90 text-amber-950'
                    : 'bg-amber-500/20 text-amber-300'
                }`}>
                  Action required
                </span>
              )}
            </div>
            <p className={`text-[11px] mt-1 font-bold truncate ${isLight ? 'text-amber-900/80' : 'text-amber-200/50'}`}>
              Applicants awaiting identity review
            </p>
          </div>

          {/* 2. Active Officers Card — ACCENT: VIBRANT EMERALD */}
          <div 
            onClick={() => setActiveTab('users')}
            className={`p-5 rounded-2xl transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between shadow-lg ${
              isLight
                ? activeTab === 'users'
                  ? 'bg-gradient-to-br from-[#d9f9e6] via-[#bbf2d2] to-[#99e8b9] ring-2 ring-emerald-400/40 shadow-emerald-900/15'
                  : 'bg-gradient-to-br from-[#f2fdf6] via-[#e1faec] to-[#c6f4d8] hover:shadow-md'
                : activeTab === 'users'
                  ? 'bg-[#0e2418] ring-2 ring-emerald-400/30 shadow-xl shadow-emerald-950/40'
                  : 'bg-[#0a1b12] hover:bg-[#0c2015] shadow-lg shadow-emerald-950/20'
            }`}
          >
            <div className="flex items-center justify-between mb-3 gap-2">
              <span className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-emerald-950' : 'text-emerald-300'}`}>
                Active Officers
              </span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                isLight ? 'bg-emerald-300/80 text-emerald-950' : 'bg-emerald-500/15 text-emerald-400'
              }`}>
                <UserCheck className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <span className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${isLight ? 'text-emerald-950' : 'text-white'}`}>
                {users.length || stats.approved}
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                isLight
                  ? 'bg-emerald-300/90 text-emerald-950'
                  : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                Verified
              </span>
            </div>
            <p className={`text-[11px] mt-1 font-bold truncate ${isLight ? 'text-emerald-900/80' : 'text-emerald-200/50'}`}>
              Authorized organizational members
            </p>
          </div>

          {/* 3. Declined Requests Card — ACCENT: VIBRANT ROSE */}
          <div 
            onClick={() => setActiveTab('rejected')}
            className={`p-5 rounded-2xl transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between shadow-lg ${
              isLight
                ? activeTab === 'rejected'
                  ? 'bg-gradient-to-br from-[#ffe4e6] via-[#fecdd3] to-[#fda4af] ring-2 ring-rose-400/40 shadow-rose-900/15'
                  : 'bg-gradient-to-br from-[#fff1f2] via-[#ffe4e6] to-[#fec5cc] hover:shadow-md'
                : activeTab === 'rejected'
                  ? 'bg-[#240f16] ring-2 ring-rose-400/30 shadow-xl shadow-rose-950/40'
                  : 'bg-[#1a0c10] hover:bg-[#200e14] shadow-lg shadow-rose-950/20'
            }`}
          >
            <div className="flex items-center justify-between mb-3 gap-2">
              <span className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-rose-950' : 'text-rose-300'}`}>
                Declined Requests
              </span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                isLight ? 'bg-rose-300/80 text-rose-950' : 'bg-rose-500/15 text-rose-400'
              }`}>
                <XCircle className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <span className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${isLight ? 'text-rose-950' : 'text-white'}`}>
                {stats.rejected}
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                isLight
                  ? 'bg-rose-300/90 text-rose-950'
                  : 'bg-rose-500/20 text-rose-300'
              }`}>
                Submissions
              </span>
            </div>
            <p className={`text-[11px] mt-1 font-bold truncate ${isLight ? 'text-rose-900/80' : 'text-rose-200/50'}`}>
              Ineligible or rejected entries
            </p>
          </div>

          {/* 4. Approved Log Card — ACCENT: ELECTRIC SKY BLUE */}
          <div 
            onClick={() => setActiveTab('approved')}
            className={`p-5 rounded-2xl transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between shadow-lg ${
              isLight
                ? activeTab === 'approved'
                  ? 'bg-gradient-to-br from-[#e0f2fe] via-[#bae6fd] to-[#7dd3fc] ring-2 ring-sky-400/40 shadow-sky-900/15'
                  : 'bg-gradient-to-br from-[#f0f9ff] via-[#e0f2fe] to-[#b9e6fe] hover:shadow-md'
                : activeTab === 'approved'
                  ? 'bg-[#0e1c33] ring-2 ring-sky-400/30 shadow-xl shadow-sky-950/40'
                  : 'bg-[#0a1424] hover:bg-[#0c182c] shadow-lg shadow-sky-950/20'
            }`}
          >
            <div className="flex items-center justify-between mb-3 gap-2">
              <span className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-sky-950' : 'text-sky-300'}`}>
                Approved Log
              </span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                isLight ? 'bg-sky-300/80 text-sky-950' : 'bg-sky-500/15 text-sky-400'
              }`}>
                <Users className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <span className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${isLight ? 'text-sky-950' : 'text-white'}`}>
                {stats.approved}
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                isLight
                  ? 'bg-sky-300/90 text-sky-950'
                  : 'bg-sky-500/20 text-sky-300'
              }`}>
                Approved
              </span>
            </div>
            <p className={`text-[11px] mt-1 font-bold truncate ${isLight ? 'text-sky-900/80' : 'text-sky-200/50'}`}>
              Historical approval record
            </p>
          </div>

        </div>

        {/* Tab Navigation & Search Bar */}
        <div className={`rounded-2xl sm:rounded-3xl p-3 sm:p-4 mb-6 shadow-xl transition-all ${
          isLight
            ? 'bg-gradient-to-br from-[#f8fbf9]/95 via-[#f2f7f4]/90 to-[#e6f1ea]/85 shadow-emerald-950/5'
            : 'bg-[#0a1811] shadow-2xl'
        }`}>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            {/* Tabs */}
            <div className={`grid grid-cols-2 sm:flex sm:items-center gap-1.5 p-1 rounded-2xl w-full sm:w-auto ${
              isLight ? 'bg-emerald-100/50' : 'bg-[#06120c]'
            }`}>
              <button
                onClick={() => setActiveTab('pending')}
                className={`w-full sm:w-auto px-3.5 py-2 sm:py-1.5 text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-center ${
                  activeTab === 'pending'
                    ? isLight
                      ? 'bg-emerald-600 text-white font-black shadow-sm'
                      : 'bg-[#10b981] text-black font-black shadow-md'
                    : isLight
                      ? 'text-emerald-900/75 hover:text-emerald-950 hover:bg-white/80 font-semibold'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.04] font-semibold'
                }`}
              >
                <span className="truncate">Pending</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  activeTab === 'pending'
                    ? isLight ? 'bg-white/30 text-white' : 'bg-black/20 text-black'
                    : isLight ? 'bg-white text-emerald-950' : 'bg-[#0c1e16] text-white/70'
                }`}>
                  {stats.pending || 0}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('users')}
                className={`w-full sm:w-auto px-3.5 py-2 sm:py-1.5 text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-center ${
                  activeTab === 'users'
                    ? isLight
                      ? 'bg-emerald-600 text-white font-black shadow-sm'
                      : 'bg-[#10b981] text-black font-black shadow-md'
                    : isLight
                      ? 'text-emerald-900/75 hover:text-emerald-950 hover:bg-white/80 font-semibold'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.04] font-semibold'
                }`}
              >
                <span className="truncate">Active Officers</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  activeTab === 'users'
                    ? isLight ? 'bg-white/30 text-white' : 'bg-black/20 text-black'
                    : isLight ? 'bg-white text-emerald-950' : 'bg-[#0c1e16] text-white/70'
                }`}>
                  {users.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('approved')}
                className={`w-full sm:w-auto px-3.5 py-2 sm:py-1.5 text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-center ${
                  activeTab === 'approved'
                    ? isLight
                      ? 'bg-emerald-600 text-white font-black shadow-sm'
                      : 'bg-[#10b981] text-black font-black shadow-md'
                    : isLight
                      ? 'text-emerald-900/75 hover:text-emerald-950 hover:bg-white/80 font-semibold'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.04] font-semibold'
                }`}
              >
                <span className="truncate">Approved</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  activeTab === 'approved'
                    ? isLight ? 'bg-white/30 text-white' : 'bg-black/20 text-black'
                    : isLight ? 'bg-white text-emerald-950' : 'bg-[#0c1e16] text-white/70'
                }`}>
                  {stats.approved}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('rejected')}
                className={`w-full sm:w-auto px-3.5 py-2 sm:py-1.5 text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-center ${
                  activeTab === 'rejected'
                    ? isLight
                      ? 'bg-emerald-600 text-white font-black shadow-sm'
                      : 'bg-[#10b981] text-black font-black shadow-md'
                    : isLight
                      ? 'text-emerald-900/75 hover:text-emerald-950 hover:bg-white/80 font-semibold'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.04] font-semibold'
                }`}
              >
                <span className="truncate">Declined</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  activeTab === 'rejected'
                    ? isLight ? 'bg-white/30 text-white' : 'bg-black/20 text-black'
                    : isLight ? 'bg-white text-emerald-950' : 'bg-[#0c1e16] text-white/70'
                }`}>
                  {stats.rejected}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                isLight ? 'text-emerald-800/50' : 'text-emerald-400/60'
              }`} />
              <input
                type="text"
                placeholder="Search by name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full text-xs rounded-xl pl-9 pr-3.5 py-2 transition-all select-text shadow-inner focus:outline-none focus:ring-1 ${
                  isLight
                    ? 'bg-white/95 focus:bg-white border border-emerald-300/80 text-emerald-950 placeholder:text-gray-400 focus:border-emerald-600 focus:ring-emerald-500/20'
                    : 'bg-[#06120c] focus:bg-[#091a11] border border-[#163325] focus:border-emerald-500/50 text-white placeholder:text-white/40 focus:ring-emerald-500/30'
                }`}
              />
            </div>

          </div>
        </div>

        {/* Tab 1: Pending Approvals View */}
        {activeTab === 'pending' && (
          <div className="space-y-3">
            {isLoading ? (
              <div className={`p-12 text-center rounded-2xl shadow-xl ${
                isLight ? 'bg-white/90' : 'bg-[#07130e]'
              }`}>
                <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin mx-auto mb-2" />
                <p className={`text-xs font-medium ${isLight ? 'text-gray-600' : 'text-white/60'}`}>Loading pending registration requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className={`p-12 sm:p-16 text-center rounded-2xl shadow-xl ${
                isLight ? 'bg-white/90' : 'bg-[#07130e]'
              }`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-inner ${
                  isLight
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-[#064e3b]/30 text-emerald-400'
                }`}>
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className={`text-base font-bold mb-1 ${isLight ? 'text-gray-900' : 'text-white'}`}>Queue is Clear!</h3>
                <p className={`text-xs max-w-sm mx-auto font-medium ${isLight ? 'text-gray-500' : 'text-white/45'}`}>
                  {searchQuery ? 'No pending requests matched your search query.' : 'There are currently no new registration requests awaiting approval.'}
                </p>
              </div>
            ) : (
              filteredRequests.map((req) => (
                <div 
                  key={req.id}
                  className={`rounded-2xl p-5 transition-all shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    isLight
                      ? 'bg-white/95'
                      : 'bg-[#0c1b14]'
                  }`}
                >
                  {/* Left: Applicant Identity */}
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 shadow-inner ${
                      isLight
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-[#064e3b]/40 text-emerald-300'
                    }`}>
                      {req.first_name?.[0]?.toUpperCase() || 'U'}
                      {req.last_name?.[0]?.toUpperCase() || ''}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`text-sm sm:text-base font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                          {req.first_name} {req.last_name}
                        </h4>
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ${
                          isLight
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-[#06120c] text-white/80'
                        }`}>
                          {req.auth_provider === 'google' ? 'Google OAuth' : 'Email/Password'}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                          isLight
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-amber-500/15 text-amber-300'
                        }`}>
                          Pending Approval
                        </span>
                      </div>

                      <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs font-medium ${
                        isLight ? 'text-gray-600' : 'text-white/70'
                      }`}>
                        <div className="flex items-center gap-1.5">
                          <Mail className={`w-3.5 h-3.5 ${isLight ? 'text-gray-400' : 'text-white/40'}`} />
                          <span className={`font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>{req.email}</span>
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

                  {/* Right: Role Assignment & Action Controls */}
                  <div className={`flex items-center gap-2.5 pt-3 lg:pt-0 border-t lg:border-t-0 justify-end flex-wrap ${
                    isLight ? 'border-gray-100' : 'border-[#163325]'
                  }`}>
                    
                    {/* Role Dropdown */}
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-bold uppercase tracking-wider hidden sm:inline ${
                        isLight ? 'text-gray-500' : 'text-white/60'
                      }`}>
                        Assign Role:
                      </span>
                      <select
                        value={selectedRoles[req.id] || 'treasurer'}
                        onChange={(e) => setSelectedRoles((prev) => ({ ...prev, [req.id]: e.target.value }))}
                        className={`text-xs font-semibold rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:ring-1 border shadow-inner ${
                          isLight
                            ? 'bg-white border-gray-200 text-gray-900 focus:ring-emerald-500/20'
                            : 'bg-[#06120c] border-[#163325] text-white focus:ring-emerald-500/30'
                        }`}
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value} className={isLight ? 'bg-white text-gray-900' : 'bg-[#0c1e16] text-white'}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Reject Button */}
                    <button
                      onClick={() => handleOpenReject(req)}
                      disabled={isSubmittingAction}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50 ${
                        isLight
                          ? 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                          : 'text-rose-300 bg-rose-500/15 hover:bg-rose-500/25'
                      }`}
                    >
                      Decline
                    </button>

                    {/* Approve Button */}
                    <button
                      onClick={() => handleApprove(req.id)}
                      disabled={isSubmittingAction}
                      className="px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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

        {/* Tab 2: Active Officers / Users View */}
        {activeTab === 'users' && (
          <div className={`rounded-2xl overflow-hidden shadow-2xl ${
            isLight
              ? 'bg-white/95'
              : 'bg-[#0a1811]'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${
              isLight ? 'border-gray-100 bg-emerald-50/40' : 'border-[#142e20] bg-[#07130e]'
            }`}>
              <div>
                <h3 className={`text-sm font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>Active FinLITE Officers &amp; Board Members</h3>
                <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-white/50'}`}>Authorized accounts with access to financial operations</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                isLight
                  ? 'text-emerald-900 bg-emerald-100'
                  : 'text-emerald-300 bg-emerald-500/15'
              }`}>
                {filteredUsers.length} Active Accounts
              </span>
            </div>

            {filteredUsers.length === 0 ? (
              <div className={`p-12 text-center text-xs font-semibold ${isLight ? 'text-gray-400' : 'text-white/40'}`}>
                No users found.
              </div>
            ) : (
              <div className={`divide-y ${isLight ? 'divide-gray-100' : 'divide-[#142e20]'}`}>
                {filteredUsers.map((user) => (
                  <div key={user.id} className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isLight ? 'hover:bg-emerald-50/40' : 'hover:bg-white/[0.02]'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-inner ${
                        isLight
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-[#064e3b]/40 text-emerald-300'
                      }`}>
                        {user.first_name?.[0] || user.full_name?.[0] || 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                            {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim()}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${
                            isLight
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-emerald-500/15 text-emerald-300'
                          }`}>
                            {user.role}
                          </span>
                          {user.email === 'geronimoandreijohn.pdm@gmail.com' && (
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${
                              isLight
                                ? 'bg-purple-100 text-purple-900'
                                : 'bg-purple-500/20 text-purple-200'
                            }`}>
                              Primary Super Admin
                            </span>
                          )}
                        </div>
                        <p className={`text-xs font-medium mt-0.5 ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
                          {user.email} {user.contact_number ? `• ${user.contact_number}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Change Role Selector */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className={`text-[11px] font-semibold ${isLight ? 'text-gray-500' : 'text-white/60'}`}>Change Role:</span>
                      <select
                        value={user.role}
                        onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                        className={`text-xs font-semibold rounded-xl px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-1 border shadow-inner ${
                          isLight
                            ? 'bg-white border-gray-200 text-gray-900 focus:ring-emerald-500/20'
                            : 'bg-[#06120c] border-[#163325] text-white focus:ring-emerald-500/30'
                        }`}
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value} className={isLight ? 'bg-white text-gray-900' : 'bg-[#0c1e16] text-white'}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Approved Requests Log */}
        {activeTab === 'approved' && (
          <div className="space-y-3">
            {filteredRequests.length === 0 ? (
              <div className={`p-12 text-center rounded-2xl text-xs font-semibold shadow-xl ${
                isLight ? 'bg-white/90 text-gray-400' : 'bg-[#07130e] text-white/45'
              }`}>
                No approved request records found.
              </div>
            ) : (
              filteredRequests.map((req) => (
                <div key={req.id} className={`rounded-2xl p-4 flex items-center justify-between gap-4 shadow-xl transition-all ${
                  isLight
                    ? 'bg-white/95'
                    : 'bg-[#0c1b14]'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-inner ${
                      isLight
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-[#064e3b]/30 text-emerald-400'
                    }`}>
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{req.first_name} {req.last_name}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${
                          isLight
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-emerald-500/15 text-emerald-300'
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

        {/* Tab 4: Declined Requests */}
        {activeTab === 'rejected' && (
          <div className="space-y-3">
            {filteredRequests.length === 0 ? (
              <div className={`p-12 text-center rounded-2xl text-xs font-semibold shadow-xl ${
                isLight ? 'bg-white/90 text-gray-400' : 'bg-[#07130e] text-white/45'
              }`}>
                No declined requests recorded.
              </div>
            ) : (
              filteredRequests.map((req) => (
                <div key={req.id} className={`rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl transition-all ${
                  isLight
                    ? 'bg-rose-50/50'
                    : 'bg-[#140a0e]'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-inner ${
                      isLight
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-rose-500/15 text-rose-400'
                    }`}>
                      <XCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <span className={`text-sm font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{req.first_name} {req.last_name}</span>
                      <p className={`text-xs font-medium ${isLight ? 'text-gray-500' : 'text-white/50'}`}>{req.email}</p>
                      {req.rejection_reason && (
                        <p className={`text-xs font-medium mt-1 px-2.5 py-1 rounded-md inline-block ${
                          isLight
                            ? 'bg-rose-100 text-rose-900'
                            : 'bg-rose-950/60 text-rose-300'
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

      {/* Rejection Reason Modal */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-2xl max-w-md w-full p-6 shadow-2xl border animate-in fade-in zoom-in-95 duration-150 ${
            isLight
              ? 'bg-white border-emerald-600/15'
              : 'bg-[#0a1811] border-[#163325]'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner border ${
                isLight ? 'bg-rose-100 border-rose-200 text-rose-700' : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
              }`}>
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-base font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>Decline Registration</h3>
                <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-white/50'}`}>{rejectingRequest.first_name} {rejectingRequest.last_name} ({rejectingRequest.email})</p>
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
              className={`w-full text-xs font-medium rounded-xl p-3 mb-4 select-text shadow-inner border focus:outline-none focus:ring-1 ${
                isLight
                  ? 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-rose-500/20 focus:border-rose-500'
                  : 'bg-[#06120c] border-[#163325] text-white placeholder:text-white/30 focus:bg-[#091a11] focus:ring-rose-500/30 focus:border-rose-500/50'
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
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
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
