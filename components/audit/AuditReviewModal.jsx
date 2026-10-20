'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Modal, Button, Badge } from '@/components/ui';
import UserAvatar from '@/components/common/UserAvatar';
import { useTheme } from '@/components/theme/ThemeProvider';
import { formatPHP } from '@/lib/utils/currency';

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

  useEffect(() => {
    if (transaction && isOpen) {
      setRemark('');
      setFeedback(null);
      setSelectedCcEmails([]);

      // Fetch transaction comments thread
      setIsLoadingComments(true);
      fetch(`/api/transactions/${transaction.id}/comments`)
        .then((res) => res.json())
        .then((data) => {
          if (data.comments) setComments(data.comments);
        })
        .catch((err) => console.warn('Failed to load comments:', err))
        .finally(() => setIsLoadingComments(false));

      // Fetch officers list for CC selection
      fetch('/api/admin/users')
        .then((res) => res.json())
        .then((data) => {
          if (data.users) {
            const authorEmail = transaction.profiles?.email || '';
            const filtered = data.users.filter(
              (u) => u.email && u.email.toLowerCase() !== authorEmail.toLowerCase()
            );
            setAvailableOfficers(filtered);
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

  const receiptUrls = transaction.transaction_receipts?.map((r) => r.public_url || r.file_url) || 
    (transaction.receipt_url ? [transaction.receipt_url] : []);

  const handleToggleCc = (email) => {
    setSelectedCcEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const handleAuditAction = async (actionType) => {
    if (actionType === 'FLAG' && !remark.trim()) {
      setFeedback({
        type: 'error',
        text: 'Please provide an audit remark or revision note when flagging a transaction.',
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
          comment: remark.trim() || (actionType === 'APPROVE' ? 'Transaction verified and approved by Auditor.' : ''),
          ccEmails: selectedCcEmails,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit audit decision.');
      }

      setFeedback({
        type: 'success',
        text: data.message || `Transaction successfully ${actionType === 'APPROVE' ? 'approved' : 'flagged'}.`,
      });

      if (onAudited) {
        onAudited(data.transaction || { ...transaction, status: data.status });
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Error recording audit decision.',
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
        title={
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              isFlagged
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                : isCompleted
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                  Auditor Transaction Verification
                </h3>
                <span
                  className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                    isCompleted
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : isFlagged
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {transaction.status || 'PENDING_AUDIT'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Inspect proof, add audit remarks, and record official verification
              </p>
            </div>
          </div>
        }
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5 pt-1">
          {/* Transaction Summary Card */}
          <div
            className={`p-4 rounded-2xl border space-y-3 ${
              isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/60 border-zinc-800'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {isAbono ? 'Out-of-Pocket Advance' : (isOutflow ? 'Disbursement' : 'Inflow')}
                </span>
                <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {transaction.title}
                </h4>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] font-semibold text-zinc-500 block">Total Amount</span>
                <span className={`text-xl font-black ${isOutflow ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatPHP(Number(transaction.amount) || 0)}
                </span>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-zinc-500 text-[11px] block">Category</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {transaction.categories?.name || transaction.category_name || 'General'}
                </span>
              </div>

              <div>
                <span className="text-zinc-500 text-[11px] block">Transaction Date</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {transaction.transaction_date || 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-zinc-500 text-[11px] block">Logged By</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate block">
                  {transaction.profiles?.full_name || 'Officer'}
                </span>
              </div>

              {transaction.event_name && (
                <div className="col-span-2">
                  <span className="text-zinc-500 text-[11px] block">Event / Activity</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {transaction.event_name}
                  </span>
                </div>
              )}

              {transaction.reimbursement_recipient && (
                <div>
                  <span className="text-zinc-500 text-[11px] block">Reimbursement Claimant</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {transaction.reimbursement_recipient}
                  </span>
                </div>
              )}
            </div>

            {transaction.description && (
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 text-[11px] block mb-0.5">Author's Notes</span>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 italic">
                  "{transaction.description}"
                </p>
              </div>
            )}
          </div>

          {/* Attached Proof & Receipt Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                <span>Proof / Attached Receipts ({receiptUrls.length})</span>
              </span>
            </div>

            {receiptUrls.length === 0 ? (
              <div className={`p-4 rounded-xl border text-center text-xs text-zinc-500 italic ${
                isLight ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-zinc-800'
              }`}>
                No receipt or invoice was attached to this transaction.
              </div>
            ) : (
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {receiptUrls.map((url, idx) => (
                  <div
                    key={idx}
                    onClick={() => setZoomedReceipt(url)}
                    className="relative group rounded-xl overflow-hidden border border-zinc-300 dark:border-zinc-700 w-24 h-24 shrink-0 cursor-pointer shadow-2xs"
                  >
                    <img
                      src={url}
                      alt={`Receipt ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <ZoomIn className="w-5 h-5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Remarks / Discussion Thread */}
          {comments.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Audit Trail &amp; Prior Remarks ({comments.length})</span>
              </span>

              <div
                className={`max-h-36 overflow-y-auto rounded-xl p-3 border space-y-2.5 text-xs ${
                  isLight ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-zinc-800'
                }`}
              >
                {comments.map((c) => (
                  <div key={c.id} className="border-b border-zinc-100 dark:border-zinc-800 pb-2 last:border-none last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {c.profiles?.full_name || 'Officer'}
                        <span className="text-zinc-400 font-normal ml-1">
                          ({c.profiles?.role || 'Auditor'})
                        </span>
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {new Date(c.created_at).toLocaleDateString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-zinc-700 dark:text-zinc-300 mt-0.5 leading-snug">
                      {c.comment}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Auditor Remarks Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              Audit Remarks / Verification Notes
            </label>
            <textarea
              rows={3}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="e.g. Verified against official receipt #10492. All items accounted for... OR: Please re-upload clearer receipt showing merchant TIN..."
              className={`w-full text-xs rounded-xl p-3 border focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
              }`}
            />
          </div>

          {/* Recipient Selection & CC Bar */}
          <div
            className={`p-3 rounded-xl border text-xs space-y-2 ${
              isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/50 border-zinc-800'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-500" />
                <span>Email Response Notification</span>
              </span>
              <span className="text-[11px] text-zinc-500">
                Author: <strong>{transaction.profiles?.email || 'Author'}</strong> (auto-notified)
              </span>
            </div>

            {availableOfficers.length > 0 && (
              <div>
                <span className="text-[11px] text-zinc-500 block mb-1">
                  Optional: CC other leadership officers on this decision:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {availableOfficers.map((officer) => (
                    <label
                      key={officer.id}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer flex items-center gap-1.5 transition-colors ${
                        selectedCcEmails.includes(officer.email)
                          ? isLight
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                            : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                          : isLight
                          ? 'bg-white border-zinc-200 text-zinc-600'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCcEmails.includes(officer.email)}
                        onChange={() => handleToggleCc(officer.email)}
                        className="w-3 h-3 text-emerald-600 rounded border-zinc-300"
                      />
                      <span>{officer.full_name || officer.email.split('@')[0]}</span>
                      <span className="text-[9px] uppercase opacity-75">({officer.role})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Feedback Display */}
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-900 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-300'
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
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Close
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="danger"
                onClick={() => handleAuditAction('FLAG')}
                disabled={isSubmitting}
                className="flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Flag for Revision</span>
              </Button>

              <Button
                type="button"
                variant="primary"
                onClick={() => handleAuditAction('APPROVE')}
                disabled={isSubmitting}
                className="flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Approve &amp; Verify</span>
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
          title="Inspect High-Resolution Receipt"
          maxWidth="max-w-4xl"
        >
          <div className="p-2 text-center">
            <img
              src={zoomedReceipt}
              alt="High Resolution Proof"
              className="max-h-[80vh] w-auto mx-auto rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800"
            />
            <div className="mt-3 flex justify-end">
              <a
                href={zoomedReceipt}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline"
              >
                <span>Open in full tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
