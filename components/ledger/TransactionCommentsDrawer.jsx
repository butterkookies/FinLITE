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
import { useTheme } from '@/components/theme/ThemeProvider';
import { formatPHP } from '@/lib/utils/currency';
import { formatFriendlyDate } from '@/components/ledger/TransactionTable';

export default function TransactionCommentsDrawer({
  isOpen,
  onClose,
  transaction,
  onCommentAdded,
}) {
  const { isLight } = useTheme();
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePostComment();
    }
  };

  if (!isOpen || !transaction) return null;

  const roleBadgeStyles = {
    admin: isLight ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-rose-500/15 text-rose-300 border-rose-500/20',
    treasurer: isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    auditor: isLight ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-amber-500/15 text-amber-300 border-amber-500/20',
    president: isLight ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-blue-500/15 text-blue-300 border-blue-500/20',
    adviser: isLight ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div 
        className={`w-full max-w-md h-full flex flex-col shadow-2xl border-l transition-all animate-in slide-in-from-right duration-200 ${
          isLight
            ? 'bg-white border-black/[0.08] text-gray-900'
            : 'bg-[#081b12] border-white/[0.08] text-white'
        }`}
      >
        {/* Drawer Header */}
        <div className={`p-4 sm:p-5 border-b flex items-start justify-between gap-3 shrink-0 ${
          isLight ? 'border-black/[0.08] bg-gray-50/70' : 'border-white/[0.08] bg-[#05140d]'
        }`}>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                <MessageSquare className="w-4 h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-bold truncate">Audit Remarks &amp; Notes</h3>
            </div>
            
            <div className="mt-2 text-xs">
              <span className="font-semibold block truncate">{transaction.title}</span>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] opacity-70">
                <span className="font-bold tabular-nums">
                  {transaction.type === 'INFLOW' ? '+' : '-'}{formatPHP(transaction.amount)}
                </span>
                <span>•</span>
                <span>{formatFriendlyDate(transaction.transaction_date)}</span>
                <span>•</span>
                <span className="uppercase">{transaction.payment_method}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
              isLight ? 'text-gray-400 hover:text-gray-700 hover:bg-gray-200/60' : 'text-white/40 hover:text-white hover:bg-white/[0.06]'
            }`}
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Remarks Thread Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
          {isLoading ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-xs opacity-60">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
              <span>Loading remarks thread...</span>
            </div>
          ) : error ? (
            <div className={`p-4 rounded-xl border flex items-center gap-2.5 text-xs ${
              isLight ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : comments.length === 0 ? (
            <div className={`p-8 text-center rounded-2xl border ${
              isLight ? 'bg-gray-50 border-black/[0.06]' : 'bg-[#05140d] border-white/[0.06]'
            }`}>
              <MessageSquare className={`w-8 h-8 mx-auto mb-2.5 ${isLight ? 'text-gray-400' : 'text-white/30'}`} />
              <h4 className="text-xs font-bold mb-1">No remarks recorded yet</h4>
              <p className={`text-[11px] max-w-xs mx-auto leading-relaxed ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
                Auditors, treasurers, and advisers can post instructions, verification notes, or queries here without altering ledger totals.
              </p>
            </div>
          ) : (
            comments.map((c) => (
              <div 
                key={c.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isLight 
                    ? 'bg-white border-black/[0.08] shadow-2xs' 
                    : 'bg-[#05140d] border-white/[0.08]'
                }`}
              >
                {/* Author Metadata Header */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {c.author_avatar ? (
                      <img 
                        src={c.author_avatar} 
                        alt={c.author_name} 
                        className="w-5 h-5 rounded-full object-cover shrink-0 border border-black/10" 
                      />
                    ) : (
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                        isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-950 text-emerald-300'
                      }`}>
                        {(c.author_name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs font-bold truncate">{c.author_name}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border leading-none shrink-0 ${
                      roleBadgeStyles[c.author_role?.toLowerCase()] || (isLight ? 'bg-gray-100 text-gray-700 border-gray-200' : 'bg-white/10 text-white/70 border-white/10')
                    }`}>
                      {c.author_role || 'Officer'}
                    </span>
                  </div>

                  <span className={`text-[10px] whitespace-nowrap tabular-nums ${isLight ? 'text-gray-400' : 'text-white/40'}`}>
                    {c.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : ''}
                  </span>
                </div>

                {/* Remark Text */}
                <p className={`text-xs whitespace-pre-wrap leading-relaxed select-text ${isLight ? 'text-gray-800' : 'text-white/90'}`}>
                  {c.comment}
                </p>
              </div>
            ))
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Minimal Remark Input Box */}
        <div className={`p-3 sm:p-4 border-t shrink-0 ${
          isLight ? 'border-black/[0.08] bg-gray-50/80' : 'border-white/[0.08] bg-[#05140d]'
        }`}>
          <form onSubmit={handlePostComment} className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write an auditor remark or instruction... (Enter to post)"
                rows={2}
                disabled={isSubmitting}
                className={`w-full text-xs rounded-xl p-2.5 transition-all resize-none border focus:outline-none focus:ring-1 select-text ${
                  isLight
                    ? 'bg-white border-black/[0.08] text-gray-900 placeholder:text-gray-400 focus:border-emerald-600 focus:ring-emerald-500/20'
                    : 'bg-[#092216] border-white/[0.08] text-white placeholder:text-white/35 focus:border-emerald-400 focus:ring-emerald-500/30'
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              className="h-10 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
              title="Post Remark (Enter)"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Post</span>
            </button>
          </form>
          <p className={`text-[10px] mt-1.5 text-center ${isLight ? 'text-gray-400' : 'text-white/35'}`}>
            Audit remarks are timestamped and preserved for institutional accountability.
          </p>
        </div>
      </div>
    </div>
  );
}
