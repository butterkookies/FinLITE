'use client';
import { useState } from 'react';
import { Bot, Send, Sparkles, User, X } from 'lucide-react';

function FormattedMessage({ content, isUser }) {
  if (!content) return null;
  if (isUser) {
    return <span className="whitespace-pre-line">{content}</span>;
  }

  const lines = content.split('\n');
  const renderedElements = [];
  let currentList = [];

  const parseInline = (text) => {
    const parts = [];
    const regex = /(\*\*.*?\*\*|\*.*?\*)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const raw = match[0];
      if (raw.startsWith('**') && raw.endsWith('**')) {
        parts.push(
          <strong key={match.index} className="font-bold text-gray-950">
            {raw.slice(2, -2)}
          </strong>
        );
      } else if (raw.startsWith('*') && raw.endsWith('*')) {
        parts.push(
          <em key={match.index} className="italic font-medium text-gray-800">
            {raw.slice(1, -1)}
          </em>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const flushList = (key) => {
    if (currentList.length > 0) {
      renderedElements.push(
        <ul key={`ul-${key}`} className="my-1.5 space-y-1 pl-4 list-disc marker:text-emerald-600">
          {currentList.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {parseInline(item)}
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList(idx);
      renderedElements.push(<div key={`empty-${idx}`} className="h-1.5" />);
      return;
    }

    if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      const itemText = trimmed.replace(/^[\*\-•]\s*/, '');
      currentList.push(itemText);
    } else if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
      flushList(idx);
      const headerText = trimmed.replace(/^#+\s*/, '');
      renderedElements.push(
        <h4 key={`h-${idx}`} className="font-bold text-gray-950 text-xs mt-2 mb-1">
          {parseInline(headerText)}
        </h4>
      );
    } else {
      flushList(idx);
      renderedElements.push(
        <p key={`p-${idx}`} className="leading-relaxed my-0.5">
          {parseInline(trimmed)}
        </p>
      );
    }
  });

  flushList('final');

  return <div className="space-y-0.5 text-xs text-gray-800">{renderedElements}</div>;
}

export default function AIChatDrawer({ isOpen, onClose, summary, transactions = [] }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Kamusta! I am your FinLITE Co-Pilot. I am directly connected to your live financial ledger. You can ask me questions in English or Taglish regarding cash on hand, adviser reimbursements (abono), or event totals.',
    },
  ]);
  const [loading, setLoading] = useState(false);

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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full sm:max-w-md h-full flex flex-col border-l border-black/10 shadow-2xl animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between bg-emerald-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-800 flex items-center justify-center text-emerald-200">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                FinLITE Grounded Co-Pilot
                <span className="text-[10px] bg-emerald-700/60 px-1.5 py-0.5 rounded font-medium text-emerald-100">
                  Zero Hallucination
                </span>
              </h3>
              <p className="text-[11px] text-emerald-200/70">
                Grounded on real-time database records
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
          {messages.map((m, idx) => (
            <div 
              key={idx}
              className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div 
                className={`max-w-[85%] p-3 rounded-2xl leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-emerald-700 text-white rounded-tr-xs' 
                    : 'bg-gray-100/90 text-gray-900 rounded-tl-xs border border-black/[0.04]'
                }`}
              >
                <FormattedMessage content={m.content} isUser={m.role === 'user'} />
              </div>

              {m.role === 'user' && (
                <div className="w-6 h-6 rounded-lg bg-gray-200 text-gray-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-gray-400 text-xs pl-8">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
              <span>Querying verified ledger tables...</span>
            </div>
          )}
        </div>

        {/* Prompt Chips */}
        <div className="p-3 bg-gray-50 border-t border-black/[0.04] flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {promptChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip)}
              className="h-7 text-[11px] px-3 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 border border-black/[0.08] rounded-lg whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-black/[0.06] bg-white">
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
              className="flex-1 h-10 text-xs bg-white border border-black/[0.08] px-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-gray-900 select-text"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="h-10 w-10 flex items-center justify-center bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:opacity-50 text-white rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
