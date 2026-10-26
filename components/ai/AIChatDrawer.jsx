'use client';
import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, User, X } from 'lucide-react';

const QUICK_QUESTIONS = [
  'Mayroon bang pending reimbursement (abono)?',
  'What is our current physical cash on hand?',
  'Magkano ang kabuuang inflows at outflows ngayong semestre?',
  'Were there any cash shortages or discrepancies declared?',
  'What is our current Net Position (Cash on Hand less Abono)?',
  'Sino ang mga may outstanding receivables o pautang?',
];

export default function AIChatDrawer({
  isOpen,
  onClose,
  summary = {},
  transactions = [],
  debts = [],
  advances = [],
}) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Kamusta! I am your FinLITE Co-Pilot. I am directly connected to your live financial ledger. You can ask me questions in English or Taglish regarding cash on hand, adviser reimbursements (abono), or event totals.',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isOpen]);

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
          context: { summary, transactions, debts, advances },
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
      // Fallback deterministic response based strictly on live client data
      const q = text.trim().toLowerCase();
      let fallbackReply = '';

      if (
        q === 'hello' ||
        q === 'hi' ||
        q === 'hey' ||
        q.startsWith('kamusta') ||
        q.startsWith('kumusta') ||
        q.startsWith('magandang') ||
        q.startsWith('good morning') ||
        q.startsWith('good afternoon') ||
        q.startsWith('good evening') ||
        q.startsWith('good day') ||
        q === 'sup'
      ) {
        fallbackReply = 'Kamusta! Ako ang iyong FinLITE Co-Pilot. Paano kita matutulungan sa ating physical cashbox o financial ledger ngayon? Maaari kang magtanong ukol sa ating physical cash on hand, pending abono, uncollected receivables, o mga nakaraang transaksyon.\n\n💡 *Tip: Tandaan na ang ating cashbox ay nananatili sa loob ng Program Director\'s Office at hindi inilalabas ng campus.*';
      } else if (q.startsWith('salamat') || q.startsWith('thank') || q.startsWith('maraming salamat')) {
        fallbackReply = 'Walang anuman! Laging handang maglingkod ang FinLITE Co-Pilot upang mapanatiling tumpak, transparent, at maayos ang pondo ng LITE. Mayroon ka pa bang ibang gustong i-check?';
      } else if (q.includes('jatulan') || q.includes('abono') || q.includes('reimburse') || q.includes('advance')) {
        const pendingAdv = advances.filter((a) => a.status !== 'SETTLED' && a.status !== 'CANCELLED');
        const settledAdv = advances.filter((a) => a.status === 'SETTLED');
        if (pendingAdv.length > 0) {
          const list = pendingAdv
            .map((a) => {
              const rem = Math.max(0, Number(a.total_amount || 0) - Number(a.amount_reimbursed || 0));
              return `**${a.claimant_name || 'Officer'}** (₱${rem.toLocaleString('en-PH', { minimumFractionDigits: 2 })} para sa *${a.title}*)`;
            })
            .join(', ');
          fallbackReply = `Batay sa ating verified database, may mga sumusunod na pending advance (abono): ${list}. Hindi pa ito nailalabas mula sa physical cash box.\n\n💡 *Tip: Siguraduhing may kalakip na Official Receipt (OR) o valid proof of purchase ang liquidation.*`;
        } else if (settledAdv.length > 0) {
          fallbackReply = 'Ayon sa ating verified database records, **walang nakabinbing reimbursement (abono)** sa kasalukuyan (₱0.00 pending). Ang lahat ng nakaraang advance ay na-liquidate at pormal nang na-reimburse mula sa cashbox.\n\n💡 *Tip: Dahil walang pending abono, ang ating Net Position ay katumbas mismo ng buong Physical Cash on Hand.*';
        } else {
          fallbackReply = 'Batay sa ating database, walang nakatalang pending reimbursement (abono) sa kasalukuyan.';
        }
      } else if (q.includes('shortage') || q.includes('discrepanc') || q.includes('kulang')) {
        const shortages = transactions.filter((t) => (t.category_name && t.category_name.toLowerCase().includes('shortage')) || (t.title && t.title.toLowerCase().includes('shortage')) || (t.description && t.description.toLowerCase().includes('shortage')));
        if (shortages.length > 0) {
          const totalShortage = shortages.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
          const list = shortages.map((s) => `**${s.title}** (₱${Number(s.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })})`).join(', ');
          fallbackReply = `Mayroong naitalang kabuuang **₱${totalShortage.toLocaleString('en-PH', { minimumFractionDigits: 2 })} Cash Shortage** sa ating talaan (${list}) na pormal nang ini-log at dumaan sa beripikasyon.\n\n💡 *Tip: Ang bawat shortage discrepancy ay nangangailangan ng pormal na justification note mula sa Club Adviser.*`;
        } else {
          fallbackReply = 'Walang naitalang cash shortage o discrepancy sa ating kasalukuyang talaan.';
        }
      } else if (
        q.includes('receivable') ||
        q.includes('pautang') ||
        q.includes('utang') ||
        q.includes('debt') ||
        q.includes('collectible') ||
        debts.some((d) => d.debtor_name && q.includes(d.debtor_name.toLowerCase()))
      ) {
        const uncollected = debts.filter((d) => d.status !== 'SETTLED' && d.status !== 'CANCELLED');
        const settled = debts.filter((d) => d.status === 'SETTLED');
        const specific = uncollected.filter((d) => d.debtor_name && q.includes(d.debtor_name.toLowerCase()));
        const targetList = specific.length > 0 ? specific : uncollected;

        if (targetList.length > 0) {
          const list = targetList
            .map((d) => {
              const rem = Math.max(0, Number(d.total_amount || 0) - Number(d.amount_paid || 0));
              return `**${d.debtor_name}** (₱${rem.toLocaleString('en-PH', { minimumFractionDigits: 2 })} para sa *${d.title}*)`;
            })
            .join(', ');
          const totalRem = targetList.reduce((sum, d) => sum + Math.max(0, Number(d.total_amount || 0) - Number(d.amount_paid || 0)), 0);
          fallbackReply = `Mayroong naitalang kabuuang **₱${totalRem.toLocaleString('en-PH', { minimumFractionDigits: 2 })}** sa Uncollected Receivables: ${list}. Maaari ring buksan ang **Debts & Receivables** module mula sa sidebar para sa buong detalye.\n\n💡 *Tip: Ang bawat payment collection ay dapat agad i-remit sa physical cashbox upang magtugma ang periodic reconciliation.*`;
        } else if (settled.length > 0) {
          const settledList = settled.map((d) => `**${d.debtor_name}** (₱${Number(d.total_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })} para sa *${d.title}*)`).join(', ');
          fallbackReply = `Batay sa FinLITE System Ledger, kasalukuyang **walang outstanding receivables o uncollected debts (₱0.00)** ang LITE. Ang mga naitalang pautang noon ay pormal nang **SETTLED** o bayad na: ${settledList}.\n\n💡 *Tip: Mananatiling transparent ang ledger dahil nakatala pa rin ang completed records sa Debts & Receivables module.*`;
        } else {
          fallbackReply = 'Walang naitalang active receivables o pautang sa kasalukuyang talaan.';
        }
      } else if (q.includes('inflow') || q.includes('outflow') || q.includes('pasok') || q.includes('labas') || q.includes('gastos')) {
        fallbackReply = `Ang ating kabuuang Inflows ngayong semestre ay **₱${(summary.total_inflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}** at ang kabuuang Outflows ay **₱${(summary.total_outflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**. Ang ating Net Semester Balance ay **₱${((summary.total_inflows || 0) - (summary.total_outflows || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**.\n\n💡 *Tip: Ang lahat ng outflows ay dapat suportado ng resibo bago pumasok sa pinal na semester financial statement.*`;
      } else if (q.includes('physical cash') || q.includes('on hand') || q.includes('cashbox') || q.includes('cash box') || q.includes('hawak na pera')) {
        const netPos = summary.net_position != null ? summary.net_position : (summary.cash_on_hand || 0) - (summary.pending_reimbursements || 0);
        fallbackReply = `Ang kasalukuyang verified **Physical Cash on Hand** sa ating cashbox ay **₱${(summary.cash_on_hand || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**, na may Net Position na **₱${netPos.toLocaleString('en-PH', { minimumFractionDigits: 2 })}** matapos ibawas ang pending abono.\n\n💡 *Tip: Nananatili ang physical cashbox sa opisina ng Program Director at binibilang gamit ang 11 Philippine currency denominations tuwing reconciliation.*`;
      } else if (q.includes('balance') || q.includes('remaining') || q.includes('reserve') || q.includes('vault') || q.includes('cash') || q.includes('net position')) {
        const netPos = summary.net_position != null ? summary.net_position : (summary.cash_on_hand || 0) - (summary.pending_reimbursements || 0);
        fallbackReply = `Ang kasalukuyang verified balance sa ating physical cashbox: **Physical Cash on Hand** ay **₱${(summary.cash_on_hand || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**, habang ang ating **Net Position** (matapos ibawas ang pending abono na ₱${(summary.pending_reimbursements || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}) ay **₱${netPos.toLocaleString('en-PH', { minimumFractionDigits: 2 })}**.`;
      } else {
        const netPos = summary.net_position != null ? summary.net_position : (summary.cash_on_hand || 0) - (summary.pending_reimbursements || 0);
        fallbackReply = `Batay sa ating FinLITE ledger: May verified Physical Cash on Hand na **₱${(summary.cash_on_hand || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}** sa ating cashbox, Net Position na **₱${netPos.toLocaleString('en-PH', { minimumFractionDigits: 2 })}**, Inflows na **₱${(summary.total_inflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**, at Outflows na **₱${(summary.total_outflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**.\n\n💡 *Tip: Maaari kang magtanong tungkol sa partikular na gastusin, abono, o receivables para sa mas detalyadong pagsusuri.*`;
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: fallbackReply },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full sm:max-w-md h-full flex flex-col relative overflow-hidden transition-all duration-300
          bg-white dark:bg-[#0c0d0e] 
          border-l border-zinc-200 dark:border-zinc-800/80 
          text-zinc-900 dark:text-zinc-100 shadow-2xl"
      >
        {/* Discreet Floating Close Button (Header removed totally) */}
        <button 
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
          title="Close Co-Pilot"
          aria-label="Close Co-Pilot"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Chat Messages Stream */}
        <div className="flex-1 overflow-y-auto px-5 pt-12 pb-4 space-y-4 text-xs no-scrollbar">
          {messages.map((m, idx) => (
            <div key={idx} className="space-y-3">
              <div 
                className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div 
                  className={`max-w-[85%] p-3.5 rounded-2xl leading-relaxed text-xs ${
                    m.role === 'user' 
                      ? 'bg-emerald-600 text-white rounded-tr-xs shadow-xs font-normal whitespace-pre-line' 
                      : 'bg-zinc-50 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100 rounded-tl-xs border border-zinc-200/80 dark:border-zinc-800/80'
                  }`}
                >
                  {m.role === 'user' ? (
                    m.content
                  ) : (
                    <FormattedMessage content={m.content} />
                  )}
                </div>

                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              {/* Quick Questions Vertical Stack (Pure text, no rectangle or pill containers) */}
              {idx === 0 && (
                <div className="pt-2 pb-1 pl-10 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">
                    Quick Questions
                  </p>
                  <div className="flex flex-col space-y-1.5">
                    {QUICK_QUESTIONS.map((q, qIdx) => (
                      <button
                        key={qIdx}
                        type="button"
                        onClick={() => handleSend(q)}
                        className="text-left text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-0.5 cursor-pointer flex items-start gap-2 group"
                      >
                        <span className="text-emerald-600/60 dark:text-emerald-400/60 group-hover:text-emerald-600 font-bold shrink-0">
                          ›
                        </span>
                        <span className="group-hover:underline decoration-emerald-500/30 underline-offset-2">
                          {q}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3 pl-10 py-1 text-xs text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span className="font-medium text-zinc-600 dark:text-zinc-400">
                Checking verified ledger records...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#0c0d0e]">
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
              className="flex-1 h-11 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 select-text transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="h-11 w-11 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl transition-all shrink-0 cursor-pointer shadow-xs"
              title="Send message"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

function getContextFromText(str) {
  const s = (str || '').toLowerCase();
  if (s.includes('shortage') || s.includes('discrepanc') || s.includes('outflow') || s.includes('expense') || s.includes('kulang')) {
    return 'rose';
  }
  if (s.includes('abono') || s.includes('reimburse') || s.includes('pending') || s.includes('advance')) {
    return 'amber';
  }
  if (s.includes('receivable') || s.includes('pautang') || s.includes('utang') || s.includes('debt') || s.includes('collectible')) {
    return 'purple';
  }
  if (s.includes('net position')) {
    return 'blue';
  }
  if (s.includes('verified') || s.includes('approved') || s.includes('completed')) {
    return 'teal';
  }
  if (s.includes('inflow') || s.includes('net balance') || s.includes('cash on hand') || s.includes('physical cash') || s.includes('vault') || s.includes('cashbox') || s.includes('reserve')) {
    return 'emerald';
  }
  return null;
}

function getColorClasses(context) {
  switch (context) {
    case 'rose':
      return 'text-rose-600 dark:text-rose-400 font-semibold';
    case 'amber':
      return 'text-amber-600 dark:text-amber-400 font-semibold';
    case 'purple':
      return 'text-purple-600 dark:text-purple-400 font-semibold';
    case 'blue':
      return 'text-blue-600 dark:text-blue-400 font-semibold';
    case 'teal':
      return 'text-teal-600 dark:text-teal-400 font-semibold';
    case 'emerald':
      return 'text-emerald-600 dark:text-emerald-400 font-semibold';
    default:
      return null;
  }
}

function FormattedMessage({ content = '' }) {
  if (!content) return null;

  const lines = content.split('\n');

  const renderInlineTokens = (textLine, defaultContext) => {
    const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|₱\s*[\d,]+(?:\.\d{2})?|\b(?:Physical Cash on Hand|Cash on Hand|Net Position|Net Balance|Inflows?|Cashbox|Vault|Outflows?|Cash Shortage|Shortages?|Discrepanc(?:y|ies)|Expenses?|Pending Reimbursements?|Pending Advances?|Abono|Receivables?|Collectibles?|Pautang|Utang|Debts?|Verified|Approved)\b)/gi;

    const elements = [];
    let lastIdx = 0;
    let match;
    let runningContext = defaultContext || 'emerald';

    while ((match = tokenRegex.exec(textLine)) !== null) {
      if (match.index > lastIdx) {
        elements.push(textLine.slice(lastIdx, match.index));
      }

      const raw = match[0];
      const key = `${match.index}-${raw}`;

      if (raw.startsWith('**') && raw.endsWith('**')) {
        const inner = raw.slice(2, -2);
        const ctx = getContextFromText(inner);
        if (ctx) runningContext = ctx;

        const isAmount = /^₱\s*[\d,]+(?:\.\d{2})?$/.test(inner.trim());
        const activeColor = getColorClasses(ctx || (isAmount ? runningContext : null));

        elements.push(
          <strong key={key} className={activeColor || 'font-semibold text-zinc-900 dark:text-zinc-100'}>
            {inner}
          </strong>
        );
      } else if (raw.startsWith('*') && raw.endsWith('*')) {
        const inner = raw.slice(1, -1);
        const ctx = getContextFromText(inner);
        if (ctx) runningContext = ctx;

        const isAmount = /^₱\s*[\d,]+(?:\.\d{2})?$/.test(inner.trim());
        const activeColor = getColorClasses(ctx || (isAmount ? runningContext : null));

        elements.push(
          <em key={key} className={activeColor || 'italic text-zinc-800 dark:text-zinc-200'}>
            {inner}
          </em>
        );
      } else if (raw.startsWith('₱')) {
        const activeColor = getColorClasses(runningContext) || 'text-emerald-600 dark:text-emerald-400 font-bold';
        elements.push(
          <span key={key} className={activeColor}>
            {raw}
          </span>
        );
      } else {
        const ctx = getContextFromText(raw);
        if (ctx) {
          runningContext = ctx;
          elements.push(
            <span key={key} className={getColorClasses(ctx)}>
              {raw}
            </span>
          );
        } else {
          elements.push(raw);
        }
      }

      lastIdx = tokenRegex.lastIndex;
    }

    if (lastIdx < textLine.length) {
      elements.push(textLine.slice(lastIdx));
    }

    return elements;
  };

  return (
    <div className="space-y-1.5 leading-relaxed text-xs">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        const isBullet = /^[\s]*[-*•]\s+/.test(line);
        const cleanText = isBullet ? line.replace(/^[\s]*[-*•]\s+/, '') : line;
        const lineCtx = getContextFromText(cleanText);

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2.5 my-1 pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 dark:bg-emerald-400 shrink-0 mt-1.5" />
              <div className="flex-1 leading-relaxed">
                {renderInlineTokens(cleanText, lineCtx)}
              </div>
            </div>
          );
        }

        return (
          <p key={idx} className="m-0 leading-relaxed">
            {renderInlineTokens(cleanText, lineCtx)}
          </p>
        );
      })}
    </div>
  );
}
