'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  Calendar,
  Tag,
  Paperclip,
  Send,
  MessageSquare,
  ZoomIn,
  Loader2,
  Mail,
  ExternalLink,
  Plus,
  X,
  Search,
} from 'lucide-react';
import { Modal, Button, Badge } from '@/components/ui';
import UserAvatar from '@/components/common/UserAvatar';
import { useTheme } from '@/components/theme/ThemeProvider';
import { formatPHP } from '@/lib/utils/currency';
import { getReceiptUrls } from '@/lib/utils/receipts';

export default function AuditReviewModal({
  isOpen,
  onClose,
  transaction,
  currentOfficer = null,
  onAudited = null,
}) {
  const { isLight } = useTheme();
  const [remark, setRemark] = useState('');
  const [comments, setComments] = useState([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [availableOfficers, setAvailableOfficers] = useState([]);
  const [selectedCcEmails, setSelectedCcEmails] = useState([]);
  const [zoomedReceipt, setZoomedReceipt] = useState(null);

  // CC Combobox state
  const [isCcPickerOpen, setIsCcPickerOpen] = useState(false);
  const [ccSearchQuery, setCcSearchQuery] = useState('');
  const ccPickerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ccPickerRef.current && !ccPickerRef.current.contains(e.target)) {
        setIsCcPickerOpen(false);
      }
    }
    if (isCcPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCcPickerOpen]);

  useEffect(() => {
    if (transaction && isOpen) {
      setRemark('');
      setFeedback(null);
      setSelectedCcEmails([]);
      setIsCcPickerOpen(false);
      setCcSearchQuery('');

      // Fetch transaction comments thread
      setIsLoadingComments(true);
      fetch(`/api/transactions/${transaction.id}/comments`)
        .then((res) => res.json())
        .then((data) => {
          if (data.comments) setComments(data.comments);
        })
        .catch((err) => console.warn('Failed to load comments:', err))
        .finally(() => setIsLoadingComments(false));

      // Fetch officers list for CC selection & pre-warm avatars for instant stutter-free display
      fetch('/api/admin/users')
        .then((res) => res.json())
        .then((data) => {
          if (data.users) {
            const authorEmail = transaction.profiles?.email || '';
            const filtered = data.users.filter(
              (u) => u.email && u.email.toLowerCase() !== authorEmail.toLowerCase()
            );
            setAvailableOfficers(filtered);

            // Pre-load avatar images in memory so popover list displays without any lag or stutters
            if (typeof window !== 'undefined') {
              filtered.forEach((u) => {
                if (u.avatar_url) {
                  const img = new Image();
                  img.decoding = 'async';
                  img.src = u.avatar_url;
                }
              });
            }
          }
        })
        .catch((err) => console.warn('Failed to load officers for CC:', err));
    }
  }, [transaction, isOpen]);

  if (!transaction) return null;

  const isOutflow = transaction.type === 'OUTFLOW';
  const isAbono = transaction.is_reimbursement;
  const isPending = transaction.status === 'PENDING_AUDIT';
  const isFlagged = transaction.status === 'FLAGGED';
  const isCompleted = transaction.status === 'COMPLETED' || transaction.status === 'REIMBURSED';

  const receiptUrls = getReceiptUrls(transaction);

  const handleAddCc = (email) => {
    if (!selectedCcEmails.includes(email)) {
      setSelectedCcEmails((prev) => [...prev, email]);
    }
    setIsCcPickerOpen(false);
    setCcSearchQuery('');
  };

  const handleRemoveCc = (email) => {
    setSelectedCcEmails((prev) => prev.filter((e) => e !== email));
  };

  const filteredOfficers = availableOfficers.filter((o) => {
    const q = ccSearchQuery.toLowerCase();
    const nameMatch = (o.full_name || '').toLowerCase().includes(q);
    const emailMatch = (o.email || '').toLowerCase().includes(q);
    const roleMatch = (o.role || '').toLowerCase().includes(q);
    return nameMatch || emailMatch || roleMatch;
  });

  const handleAuditAction = async (actionType) => {
    if (actionType === 'FLAG' && !remark.trim()) {
      setFeedback({
        type: 'error',
        text: 'Please write a remark explaining why revisions are requested.',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/transactions/${transaction.id}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          comment: remark.trim() || null,
          ccEmails: selectedCcEmails,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process audit action.');
      }

      setFeedback({
        type: 'success',
        text: data.message || 'Audit action completed successfully.',
      });

      if (typeof onAudited === 'function') {
        onAudited(data.transaction || { ...transaction, status: data.status });
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Error communicating with audit verification service.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="lg"
        title="Transaction Audit & Verification"
        description="Inspect attached receipts, review entries, and verify financial authenticity."
      >
        <div className="space-y-6 pt-1">
          {/* Header Summary Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                {isOutflow ? 'Disbursement' : 'Inflow / Collection'}
              </span>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 truncate mt-0.5">
                {transaction.title}
              </h3>
            </div>
            <div className="text-left sm:text-right shrink-0">
              <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 block">
                Recorded Amount
              </span>
              <span className={`text-xl font-mono font-bold tracking-tight ${
                isOutflow ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {isOutflow ? '-' : '+'}{formatPHP(transaction.amount)}
              </span>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-zinc-600 dark:text-zinc-400 text-[11px] block font-medium">Logged By</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 block truncate">
                {transaction.profiles?.full_name || 'Officer'}
              </span>
            </div>
            <div>
              <span className="text-zinc-600 dark:text-zinc-400 text-[11px] block font-medium">Transaction Date</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 block">
                {transaction.transaction_date || '—'}
              </span>
            </div>
            <div>
              <span className="text-zinc-600 dark:text-zinc-400 text-[11px] block font-medium">Category</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 block truncate">
                {transaction.categories?.name || transaction.category_name || 'General'}
              </span>
            </div>
            <div>
              <span className="text-zinc-600 dark:text-zinc-400 text-[11px] block font-medium">Current Status</span>
              <div className="mt-0.5">
                {isPending && <Badge variant="amber" size="xs">Pending Audit</Badge>}
                {isFlagged && <Badge variant="rose" size="xs">Flagged for Revisions</Badge>}
                {isCompleted && <Badge variant="emerald" size="xs">Verified &amp; Completed</Badge>}
                {!isPending && !isFlagged && !isCompleted && (
                  <Badge variant="zinc" size="xs">{transaction.status}</Badge>
                )}
              </div>
            </div>
          </div>

          {(transaction.reimbursement_recipient || transaction.advanced_by_name) && (
            <div className="text-xs bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-amber-800 dark:text-amber-300 font-bold block uppercase tracking-wider text-[10px]">
                  Out-of-Pocket Advance (Abono) Metadata
                </span>
                {transaction.advanced_by_name && transaction.reimbursement_recipient && transaction.advanced_by_name !== transaction.reimbursement_recipient ? (
                  <Badge variant="amber" size="xs">Proxy Payout</Badge>
                ) : (
                  <Badge variant="neutral" size="xs">Direct Reimbursement</Badge>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400 block text-[11px]">Originally Paid By (Creditor):</span>
                  <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {transaction.advanced_by_name || transaction.reimbursement_recipient || 'Officer'}
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400 block text-[11px]">Authorized Cash Claimant:</span>
                  <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {transaction.reimbursement_recipient || transaction.advanced_by_name || 'Officer'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {transaction.description && (
            <div className="text-xs">
              <span className="text-zinc-600 dark:text-zinc-400 text-[11px] font-medium block mb-1">
                Author's Note / Context
              </span>
              <p className="text-zinc-800 dark:text-zinc-200 italic leading-relaxed bg-zinc-100/60 dark:bg-zinc-800/60 p-3 rounded-xl">
                "{transaction.description}"
              </p>
            </div>
          )}

          {/* Attached Proof & Receipt Lightbox Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-zinc-500" />
                <span>Proof &amp; Attached Receipts ({receiptUrls.length})</span>
              </span>
            </div>

            {receiptUrls.length === 0 ? (
              <div className="p-4 rounded-xl bg-zinc-100/60 dark:bg-zinc-800/60 text-center text-xs text-zinc-500 italic">
                No receipt or invoice was attached to this transaction.
              </div>
            ) : (
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {receiptUrls.map((url, idx) => (
                  <div
                    key={idx}
                    onClick={() => setZoomedReceipt(url)}
                    className="relative group rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 w-24 h-24 shrink-0 cursor-pointer shadow-xs"
                  >
                    <img
                      src={url}
                      alt={`Receipt ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <ZoomIn className="w-5 h-5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prior Audit Discussion Thread */}
          {comments.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
                <span>Audit History &amp; Remarks ({comments.length})</span>
              </span>

              <div className="max-h-40 overflow-y-auto rounded-xl bg-zinc-100/60 dark:bg-zinc-800/60 p-3 space-y-2.5 text-xs">
                {comments.map((c) => (
                  <div key={c.id} className="pb-2 border-b border-zinc-200/50 dark:border-zinc-700/50 last:border-none last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {c.profiles?.full_name || 'Officer'}
                        <span className="text-zinc-400 font-normal ml-1 text-[11px]">
                          ({c.profiles?.role || 'Auditor'})
                        </span>
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {new Date(c.created_at).toLocaleDateString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-zinc-700 dark:text-zinc-300 mt-1 leading-snug">
                      {c.comment}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Auditor Remarks Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
              <span>Audit Remarks &amp; Verification Notes</span>
              <span className="text-[10px] text-zinc-400 font-normal lowercase">(required when flagging)</span>
            </label>
            <textarea
              rows={3}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="e.g. Verified against official merchant receipt #10492... OR: Please upload a clearer copy showing merchant TIN and date."
              className="w-full text-xs rounded-xl p-3 bg-zinc-100/80 dark:bg-zinc-800/60 focus:bg-white dark:focus:bg-zinc-800 ring-1 ring-black/[0.04] dark:ring-white/[0.06] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-zinc-900 dark:text-zinc-100 transition-all select-text resize-none"
            />
          </div>

          {/* Modern Searchable Combobox CC Selector */}
          <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-500" />
                <span>Email CC Notifications</span>
              </span>
              <span className="text-[11px] text-zinc-400 truncate max-w-[200px]">
                Author ({transaction.profiles?.email || 'Author'}) auto-notified
              </span>
            </div>

            {/* Selected Chips & Trigger */}
            <div className="relative" ref={ccPickerRef}>
              <div className="flex items-center flex-wrap gap-1.5 p-2 rounded-xl bg-zinc-100/60 dark:bg-zinc-800/60 min-h-[40px]">
                {selectedCcEmails.map((email) => {
                  const officer = availableOfficers.find((o) => o.email === email);
                  const label = officer?.full_name || email.split('@')[0];
                  return (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 shadow-2xs"
                    >
                      <UserAvatar src={officer?.avatar_url} name={label} email={email} size="xs" />
                      <span className="truncate max-w-[120px]">{label}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCc(email)}
                        className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-100 p-0.5 rounded cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setIsCcPickerOpen(!isCcPickerOpen)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{selectedCcEmails.length === 0 ? 'CC Officer...' : 'Add another'}</span>
                </button>
              </div>

              {/* Floating Searchable Popover */}
              {isCcPickerOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 p-2 rounded-2xl bg-white dark:bg-[#18181b] shadow-2xl ring-1 ring-black/[0.06] dark:ring-white/[0.08] z-50 text-xs space-y-2 animate-in fade-in zoom-in-95 duration-100">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search officer name or role..."
                      value={ccSearchQuery}
                      onChange={(e) => setCcSearchQuery(e.target.value)}
                      autoFocus
                      className="w-full h-8 pl-8 pr-3 text-xs bg-zinc-100/80 dark:bg-zinc-800/80 rounded-xl ring-1 ring-black/[0.04] dark:ring-white/[0.06] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  <div className="max-h-44 overflow-y-auto space-y-0.5">
                    {filteredOfficers.length === 0 ? (
                      <p className="p-3 text-center text-zinc-400 text-xs italic">
                        No matching officers found.
                      </p>
                    ) : (
                      filteredOfficers.map((o) => {
                        const isSelected = selectedCcEmails.includes(o.email);
                        return (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => (isSelected ? handleRemoveCc(o.email) : handleAddCc(o.email))}
                            className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <UserAvatar
                                src={o.avatar_url}
                                name={o.full_name || o.email}
                                email={o.email}
                                size="sm"
                              />
                              <div className="truncate">
                                <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 block truncate">
                                  {o.full_name || o.email}
                                </span>
                                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-medium">
                                  {o.role}
                                </span>
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Feedback Display */}
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-900 dark:bg-rose-500/10 dark:text-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Decision Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="rose"
                size="sm"
                onClick={() => handleAuditAction('FLAG')}
                disabled={isSubmitting}
                leftIcon={isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              >
                Flag for Revision
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => handleAuditAction('APPROVE')}
                disabled={isSubmitting}
                leftIcon={isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              >
                Approve &amp; Sign Off
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Lightbox / Zoomed Receipt Modal */}
      {zoomedReceipt && (
        <Modal
          isOpen={Boolean(zoomedReceipt)}
          onClose={() => setZoomedReceipt(null)}
          maxWidth="2xl"
          title="Inspect High-Resolution Receipt"
        >
          <div className="space-y-4">
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center rounded-2xl bg-zinc-950 p-2">
              <img
                src={zoomedReceipt}
                alt="Zoomed Receipt"
                className="max-h-[70vh] w-auto object-contain rounded-xl"
              />
            </div>
            <div className="flex justify-end">
              <a
                href={zoomedReceipt}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open original in new tab</span>
              </a>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
