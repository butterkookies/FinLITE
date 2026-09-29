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

const ROLE_OPTIONS = [
  { value: 'treasurer', label: 'Treasurer', desc: 'Disbursements & Collections' },
  { value: 'auditor', label: 'Auditor', desc: 'Audit & Denomination Verification' },
  { value: 'president', label: 'President', desc: 'Budget & Approval Authority' },
  { value: 'adviser', label: 'Adviser', desc: 'Faculty Oversight & Signatory' },
  { value: 'admin', label: 'Admin', desc: 'Full System & Access Control' },
];

export default function AdminPage() {
  const router = useRouter();
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
    const role = selectedRoles[requestId] || 'treasurer';
    setIsSubmittingAction(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'Failed to approve request.' });
        return;
      }

      setFeedback({ type: 'success', text: data.message || 'User approved successfully!' });
      await fetchData();
    } catch {
      setFeedback({ type: 'error', text: 'Network error approving user.' });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Open Rejection Dialog
  const handleOpenReject = (request) => {
    setRejectingRequest(request);
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
          reason: rejectionReason,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'Failed to reject request.' });
        return;
      }

      setFeedback({ type: 'success', text: data.message || 'Registration rejected.' });
      setRejectingRequest(null);
      await fetchData();
    } catch {
      setFeedback({ type: 'error', text: 'Network error rejecting user.' });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Handle Role Change for an existing approved user
  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'Failed to update role.' });
        return;
      }

      setFeedback({ type: 'success', text: data.message || 'User role updated.' });
      await fetchData();
    } catch {
      setFeedback({ type: 'error', text: 'Error updating user role.' });
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
    <div className="min-h-screen bg-[#f8faf9] flex flex-col font-sans">
      
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-black/[0.06] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Left: Branding & Portal Badge */}
          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
              title="Return to Main Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="h-6 w-px bg-gray-200" />

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-gray-950">FinLITE Admin Console</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded-md">
                    Access Control
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  User Registration Verification & Role Management
                </p>
              </div>
            </div>
          </div>

          {/* Right: Identity & Actions */}
          <div className="flex items-center gap-2.5">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200/80 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-800">geronimoandreijohn.pdm@gmail.com</p>
                <p className="text-[10px] text-gray-500 font-medium">Super Administrator</p>
              </div>
            </div>

            <button
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className="p-2 sm:px-3 sm:py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              title="Refresh Records"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              href="/"
              className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
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
            className={`mb-6 p-4 rounded-xl border flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200 ${
              feedback.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <span className="text-sm font-medium">{feedback.text}</span>
            </div>
            <button 
              onClick={() => setFeedback(null)} 
              className="text-xs font-semibold underline hover:opacity-80 ml-4 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Overview Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          
          {/* Pending Approvals Card */}
          <div 
            onClick={() => setActiveTab('pending')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/30 shadow-sm'
                : 'bg-white border-black/[0.06] hover:border-amber-200 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Pending Approval
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-gray-950">
                {stats.pending}
              </span>
              {stats.pending > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 animate-pulse">
                  Action required
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 mt-1 font-medium">
              Applicants awaiting identity review
            </p>
          </div>

          {/* Approved Users Card */}
          <div 
            onClick={() => setActiveTab('users')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-400/30 shadow-sm'
                : 'bg-white border-black/[0.06] hover:border-emerald-200 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Active Officers
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-gray-950">
                {users.length || stats.approved}
              </span>
              <span className="text-xs font-medium text-emerald-700">Verified</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1 font-medium">
              Authorized organizational members
            </p>
          </div>

          {/* Rejected Submissions Card */}
          <div 
            onClick={() => setActiveTab('rejected')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'rejected'
                ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-400/30 shadow-sm'
                : 'bg-white border-black/[0.06] hover:border-rose-200 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
                Declined Requests
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-gray-950">
                {stats.rejected}
              </span>
              <span className="text-xs font-medium text-gray-500">Submissions</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1 font-medium">
              Ineligible or rejected entries
            </p>
          </div>

          {/* Total Submissions Card */}
          <div 
            onClick={() => setActiveTab('approved')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'approved'
                ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-400/30 shadow-sm'
                : 'bg-white border-black/[0.06] hover:border-indigo-200 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-800">
                Approved Log
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-gray-950">
                {stats.approved}
              </span>
              <span className="text-xs font-medium text-gray-500">Approved</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1 font-medium">
              Historical approval record
            </p>
          </div>

        </div>

        {/* Tab Navigation & Search Bar */}
        <div className="bg-white rounded-2xl border border-black/[0.06] p-4 mb-6 shadow-xs">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            {/* Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-xl overflow-x-auto">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'pending'
                    ? 'bg-white text-gray-950 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>Pending Approvals</span>
                {stats.pending > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                    {stats.pending}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('users')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-white text-gray-950 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>Active Officers</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-gray-200 text-gray-700">
                  {users.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('approved')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'approved'
                    ? 'bg-white text-gray-950 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>Approved Requests</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-gray-200 text-gray-700">
                  {stats.approved}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('rejected')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'rejected'
                    ? 'bg-white text-gray-950 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>Declined</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-gray-200 text-gray-700">
                  {stats.rejected}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-medium text-gray-800 bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3.5 py-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-gray-400"
              />
            </div>

          </div>
        </div>

        {/* Tab 1: Pending Approvals View */}
        {activeTab === 'pending' && (
          <div className="space-y-3">
            {isLoading ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-black/[0.06]">
                <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto mb-2" />
                <p className="text-xs text-gray-500 font-medium">Loading pending registration requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-16 text-center bg-white rounded-2xl border border-black/[0.06]">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">Queue is Clear!</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  {searchQuery ? 'No pending requests matched your search query.' : 'There are currently no new registration requests awaiting approval.'}
                </p>
              </div>
            ) : (
              filteredRequests.map((req) => (
                <div 
                  key={req.id}
                  className="bg-white rounded-2xl border border-black/[0.06] p-5 hover:border-black/[0.12] transition-all shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Left: Applicant Identity */}
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-100/80 border border-emerald-200/60 flex items-center justify-center text-emerald-800 font-bold text-base shrink-0">
                      {req.first_name?.[0]?.toUpperCase() || 'U'}
                      {req.last_name?.[0]?.toUpperCase() || ''}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm sm:text-base font-bold text-gray-950">
                          {req.first_name} {req.last_name}
                        </h4>
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-700 rounded-md">
                          {req.auth_provider === 'google' ? 'Google OAuth' : 'Email/Password'}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-md uppercase tracking-wider">
                          Pending Approval
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-gray-800 font-semibold">{req.email}</span>
                        </div>
                        {req.contact_number && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <span>{req.contact_number}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Submitted: {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Role Assignment & Action Controls */}
                  <div className="flex items-center gap-2.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-gray-100 justify-end flex-wrap">
                    
                    {/* Role Dropdown */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider hidden sm:inline">
                        Assign Role:
                      </span>
                      <select
                        value={selectedRoles[req.id] || 'treasurer'}
                        onChange={(e) => setSelectedRoles((prev) => ({ ...prev, [req.id]: e.target.value }))}
                        className="text-xs font-semibold text-gray-800 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Reject Button */}
                    <button
                      onClick={() => handleOpenReject(req)}
                      disabled={isSubmittingAction}
                      className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      Decline
                    </button>

                    {/* Approve Button */}
                    <button
                      onClick={() => handleApprove(req.id)}
                      disabled={isSubmittingAction}
                      className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
          <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden shadow-xs">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Active FinLITE Officers & Board Members</h3>
                <p className="text-xs text-gray-500">Authorized accounts with access to financial operations</p>
              </div>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                {filteredUsers.length} Active Accounts
              </span>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-xs text-gray-500">
                No users found.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0">
                        {user.first_name?.[0] || user.full_name?.[0] || 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-950">
                            {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim()}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-emerald-100 text-emerald-800">
                            {user.role}
                          </span>
                          {user.email === 'geronimoandreijohn.pdm@gmail.com' && (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-purple-100 text-purple-800">
                              Primary Super Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                          {user.email} {user.contact_number ? `• ${user.contact_number}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Change Role Selector */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="text-[11px] font-semibold text-gray-500">Change Role:</span>
                      <select
                        value={user.role}
                        onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                        className="text-xs font-semibold text-gray-800 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
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
              <div className="p-12 text-center bg-white rounded-2xl border border-black/[0.06] text-xs text-gray-500 font-medium">
                No approved request records found.
              </div>
            ) : (
              filteredRequests.map((req) => (
                <div key={req.id} className="bg-white rounded-2xl border border-black/[0.06] p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{req.first_name} {req.last_name}</span>
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-emerald-100 text-emerald-800">
                          {req.requested_role}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 font-medium">{req.email}</p>
                    </div>
                  </div>

                  <span className="text-[11px] text-gray-400 font-medium">
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
              <div className="p-12 text-center bg-white rounded-2xl border border-black/[0.06] text-xs text-gray-500 font-medium">
                No declined requests recorded.
              </div>
            ) : (
              filteredRequests.map((req) => (
                <div key={req.id} className="bg-white rounded-2xl border border-rose-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-sm shrink-0">
                      <XCircle className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-gray-900">{req.first_name} {req.last_name}</span>
                      <p className="text-xs text-gray-500 font-medium">{req.email}</p>
                      {req.rejection_reason && (
                        <p className="text-xs text-rose-700 font-medium mt-1 bg-rose-50 px-2 py-0.5 rounded-md inline-block">
                          Reason: {req.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] text-gray-400 font-medium">
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-black/[0.08] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-950">Decline Registration</h3>
                <p className="text-xs text-gray-500">{rejectingRequest.first_name} {rejectingRequest.last_name} ({rejectingRequest.email})</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 mb-3 font-medium">
              Please specify the reason for declining this applicant. This reason is saved for institutional audit trails.
            </p>

            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Not an active officer, invalid student number..."
              className="w-full text-xs font-medium text-gray-800 bg-gray-50 border border-gray-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 mb-4"
            />

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isSubmittingAction}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
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
