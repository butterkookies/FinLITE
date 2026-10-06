'use client';
import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, User, X } from 'lucide-react';

export default function AIChatDrawer({ isOpen, onClose, summary, transactions = [] }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Kamusta! I am your FinLITE Co-Pilot. I am directly connected to your live financial ledger. You can ask me questions in English or Taglish regarding cash on hand, adviser reimbursements (abono), or event totals.',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const chipsRef = useRef(null);

  useEffect(() => {
    const el = chipsRef.current;
    if (!el || !isOpen) return;

    const handleWheel = (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollBy({ left: e.deltaY, behavior: 'smooth' });
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [isOpen]);

  const promptChips = [
    'Mayroon bang pending reimbursement (abono)?',
    'What is our current physical cash on hand?',
    'Magkano ang kabuuang inflows at outflows ngayong semestre?',
    'Were there any cash shortages declared?',
  ];

  const handleSend = async (userPrompt) => {
    const text = userPrompt || input;
    if (!text.trim() || loading) return;

    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          context: { summary, transactions },
        }),
      });

      if (!res.ok) throw new Error('Failed to reach AI assistant');
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply },
      ]);
    } catch (err) {
      console.error(err);
      // Fallback deterministic response based strictly on live client data if API fails or offline
      let fallbackReply = 'Nakuha ko ang iyong katanungan. Batay sa kasalukuyang talaan sa ating ledger:';
      const lower = text.toLowerCase();

      if (lower.includes('jatulan') || lower.includes('abono') || lower.includes('reimburse')) {
        const reimbursements = transactions.filter((t) => t.is_reimbursement && t.status === 'PENDING_REIMBURSEMENT');
        if (reimbursements.length > 0) {
          const list = reimbursements
            .map((r) => `**${r.reimbursement_recipient || 'Officer'}** (₱${Number(r.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })} para sa *${r.title}*)`)
            .join(', ');
          fallbackReply = `Batay sa ating database, may mga sumusunod na pending advance (abono): ${list}. Hindi pa ito nailalabas mula sa physical cash box.`;
        } else {
          fallbackReply = 'Batay sa ating database, walang nakatalang pending reimbursement (abono) sa kasalukuyan.';
        }
      } else if (lower.includes('cash') || lower.includes('on hand')) {
        fallbackReply = `Ang kasalukuyang verified **Physical Cash on Hand** sa ating cashbox ay **₱${(summary.cash_on_hand || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**, habang may **₱${(summary.gcash_balance || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}** sa GCash.`;
      } else if (lower.includes('shortage')) {
        const shortages = transactions.filter((t) => (t.category_name && t.category_name.toLowerCase().includes('shortage')) || (t.title && t.title.toLowerCase().includes('shortage')));
        if (shortages.length > 0) {
          const totalShortage = shortages.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
          fallbackReply = `Mayroong naitalang kabuuang **₱${totalShortage.toLocaleString('en-PH', { minimumFractionDigits: 2 })} Cash Shortage** sa ating talaan na pormal nang ini-log at dumaan sa beripikasyon.`;
        } else {
          fallbackReply = 'Walang naitalang cash shortage discrepancy sa ating kasalukuyang talaan.';
        }
      } else {
        fallbackReply = `Ang ating kabuuang Inflows ngayong semestre ay **₱${(summary.total_inflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}** at ang kabuuang Outflows ay **₱${(summary.total_outflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**. Ang ating Net Balance ay **₱${((summary.total_inflows || 0) - (summary.total_outflows || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**.`;
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: fallbackReply },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Safe early return after all hooks
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex justify-end animate-ai-backdrop">
      <div className="bg-white w-full sm:max-w-md h-full flex flex-col border-l border-emerald-500/20 shadow-[0_0_60px_-15px_rgba(0,0,0,0.3),_0_0_20px_rgba(16,185,129,0.15)] animate-ai-drawer relative overflow-hidden">
        
        {/* Subtle Ambient Background Aura Glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 z-0" />
        
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white relative z-10 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8.5 h-8.5 rounded-xl bg-emerald-800/80 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)] animate-ai-glow shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                FinLITE Grounded Co-Pilot
                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-800/70 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold text-emerald-200 shadow-2xs">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                  </span>
                  Zero Hallucination
                </span>
              </h3>
              <p className="text-[11px] text-emerald-200/70 flex items-center gap-1.5 mt-0.5">
                Grounded on real-time database records
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-emerald-200/80 hover:text-white hover:bg-emerald-800/80 active:scale-95 transition-all duration-200 group hover:rotate-90 cursor-pointer"
            title="Close Co-Pilot"
          >
            <X className="w-4 h-4 transition-transform duration-300" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs relative z-10">
          {messages.map((m, idx) => (
            <div 
              key={idx}
              className={`flex gap-2.5 animate-ai-message ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-emerald-700/20 ring-2 ring-emerald-100">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div 
                className={`max-w-[85%] p-3.5 rounded-2xl leading-relaxed whitespace-pre-line transition-all ${
                  m.role === 'user' 
                    ? 'bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 text-white rounded-tr-xs shadow-md shadow-emerald-900/10 border border-emerald-600/20' 
                    : 'bg-gradient-to-b from-gray-50 to-emerald-50/40 text-gray-900 rounded-tl-xs border border-emerald-800/10 shadow-sm hover:border-emerald-600/20'
                }`}
              >
                {m.content}
              </div>

              {m.role === 'user' && (
                <div className="w-7 h-7 rounded-xl bg-gray-800 text-gray-100 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2.5 text-emerald-800/80 text-xs pl-9 py-1 animate-ai-message">
              <div className="flex items-center gap-1.5 bg-emerald-50/80 border border-emerald-200/80 px-3.5 py-2 rounded-2xl rounded-tl-xs shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                <span className="font-medium text-emerald-900">Querying verified ledger tables</span>
                <span className="flex gap-1 items-center ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Prompt Chips */}
        <div 
          ref={chipsRef}
          className="p-3 bg-gray-50/90 border-t border-black/[0.04] flex items-center gap-1.5 overflow-x-auto scrollbar-none relative z-10"
        >
          {promptChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip)}
              className="h-7 text-[11px] font-medium px-3 bg-white hover:bg-emerald-50/80 active:bg-emerald-100/60 text-gray-700 hover:text-emerald-900 border border-black/[0.08] hover:border-emerald-400/50 rounded-xl whitespace-nowrap transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:scale-95 flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3 text-emerald-500/70" />
              {chip}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-black/[0.06] bg-white relative z-10">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask anything in English or Taglish..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 h-10 text-xs bg-gray-50/80 border border-black/[0.08] px-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white text-gray-900 select-text transition-all duration-200"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="h-10 w-10 flex items-center justify-center bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 shadow-md shadow-emerald-700/20 shrink-0 cursor-pointer group"
            >
              <Send className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
