'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  X, 
  MessageSquare, 
  Send, 
  Loader2, 
  Clock, 
  ShieldCheck, 
  AlertCircle,
  FileText,
  User
} from 'lucide-react';
import { formatPHP } from '@/lib/utils/currency';
import { formatFriendlyDate } from '@/components/ledger/TransactionTable';
import { Button, Badge } from '@/components/ui';
import UserAvatar from '@/components/common/UserAvatar';

export default function TransactionCommentsDrawer({
  isOpen,
  onClose,
  transaction,
  onCommentAdded,
}) {
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const commentsEndRef = useRef(null);

  // Fetch comments when drawer opens with a valid transaction
  useEffect(() => {
    if (!isOpen || !transaction?.id) {
      setComments([]);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetch(`/api/transactions/${transaction.id}/comments`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success) {
          setComments(data.comments || []);
        } else {
          setError(data.error || 'Failed to load remarks.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Fetch comments error:', err);
        setError('Could not connect to remarks service.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, transaction?.id]);

  // Scroll to bottom on new comments
  useEffect(() => {
    if (comments.length > 0) {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  const handlePostComment = async (e) => {
    if (e) e.preventDefault();
    if (!newComment.trim() || isSubmitting || !transaction?.id) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/transactions/${transaction.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.comment) {
        setComments((prev) => [...prev, data.comment]);
        setNewComment('');
        if (onCommentAdded) {
          onCommentAdded(transaction.id, (comments.length + 1));
        }
      } else {
        setError(data.error || 'Failed to post remark.');
      }
    } catch (err) {
      console.error('Post comment error:', err);
      setError('Network error while posting remark.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !transaction) return null;

  const getRoleBadgeVariant = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'rose';
      case 'treasurer': return 'emerald';
      case 'auditor': return 'amber';
      case 'president':
      case 'vice_president': return 'sky';
      default: return 'neutral';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md h-full flex flex-col shadow-2xl border-l transition-all animate-in slide-in-from-right duration-200 bg-white dark:bg-[#121214] border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b flex items-start justify-between gap-3 shrink-0 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121214]">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-bold truncate">Audit Remarks &amp; Notes</h3>
            </div>
            
            <div className="mt-2 text-xs">
              <span className="font-semibold block truncate">{transaction.title}</span>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                <span className={`font-bold tabular-nums ${transaction.type === 'INFLOW' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {transaction.type === 'INFLOW' ? '+' : '-'}{formatPHP(transaction.amount)}
                </span>
                <span>•</span>
                <span>{formatFriendlyDate(transaction.transaction_date)}</span>
                <span>•</span>
                <span className="uppercase">{transaction.payment_method}</span>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 shrink-0"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Remarks Thread Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-white dark:bg-[#09090B]">
          {error && (
            <div className="p-3.5 rounded-xl border flex items-start justify-between gap-2.5 text-xs bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300 animate-in fade-in duration-150">
              <div className="flex items-start gap-2.5 min-w-0">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-500" />
                <span className="leading-relaxed select-text">{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-200 shrink-0 p-0.5 transition-colors"
                title="Dismiss error"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
              <span>Loading remarks thread...</span>
            </div>
          ) : comments.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800">
              <MessageSquare className="w-8 h-8 mx-auto mb-2.5 text-zinc-400 dark:text-zinc-600" />
              <h4 className="text-xs font-bold mb-1 text-zinc-900 dark:text-zinc-100">No remarks recorded yet</h4>
              <p className="text-[11px] max-w-xs mx-auto leading-relaxed text-zinc-500 dark:text-zinc-400">
                Auditors, treasurers, and advisers can post instructions, verification notes, or queries here without altering ledger totals.
              </p>
            </div>
          ) : (
            comments.map((c) => (
              <div 
                key={c.id}
                className="p-3.5 rounded-xl border transition-all bg-white dark:bg-[#121214] border-zinc-200 dark:border-zinc-800 shadow-2xs"
              >
                {/* Author Metadata Header */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <UserAvatar
                      src={c.author_avatar}
                      name={c.author_name || 'Officer'}
                      email=""
                      size="xs"
                      rounded="full"
                      alt={c.author_name || 'Officer'}
                      className="border border-zinc-200 dark:border-zinc-700"
                    />
                    <span className="text-xs font-bold truncate text-zinc-900 dark:text-zinc-100">{c.author_name}</span>
                    <Badge variant={getRoleBadgeVariant(c.author_role)} size="xs">
                      {c.author_role || 'Officer'}
                    </Badge>
                  </div>

                  <span className="text-[10px] whitespace-nowrap tabular-nums text-zinc-400 dark:text-zinc-500">
                    {c.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : ''}
                  </span>
                </div>

                {/* Remark Text */}
                <p className="text-xs whitespace-pre-wrap leading-relaxed select-text text-zinc-800 dark:text-zinc-200">
                  {c.comment}
                </p>
              </div>
            ))
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Comment Input Bar */}
        <div className="p-3 sm:p-4 border-t shrink-0 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121214]">
          <form onSubmit={handlePostComment} className="flex items-center gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add an audit remark or note..."
              disabled={isSubmitting}
              className="flex-1 h-10 px-3.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all select-text"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || !newComment.trim()}
              className="h-10 px-4 shrink-0 font-medium active:scale-95 flex items-center justify-center gap-1.5"
              title="Post Remark"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Post</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
