'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, User, X, ChevronDown, ChevronUp, RotateCcw, Plus, Layers } from 'lucide-react';

// Component to render clean, beautifully formatted AI messages without raw markdown symbols
function FormattedMessage({ content }) {
  if (!content) return null;

  const lines = content.split('\n');

  // Parses inline **bold** and *italic* cleanly
  const renderInline = (text) => {
    if (!text) return '';
    const parts = [];
    const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      if (match[2]) {
        // **bold**
        parts.push(
          <strong key={match.index} className="font-semibold text-gray-950">
            {match[2]}
          </strong>
        );
      } else if (match[3]) {
        // *italic*
        parts.push(
          <em key={match.index} className="italic opacity-90 text-gray-700">
            {match[3]}
          </em>
        );
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="space-y-1.5 leading-relaxed text-gray-800">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();

        // Empty line
        if (!line) {
          return <div key={idx} className="h-1" />;
        }

        // Horizontal rule divider (---, ***, ___)
        if (/^[-*_]{3,}$/.test(line)) {
          return (
            <div 
              key={idx} 
              className="my-2 border-t border-gray-200" 
            />
          );
        }

        // Markdown Header (#, ##, ###)
        const headerMatch = line.match(/^#{1,6}\s*(.*)$/);
        if (headerMatch) {
          return (
            <div 
              key={idx} 
              className="font-bold text-[13px] sm:text-sm pt-1.5 pb-0.5 tracking-tight text-emerald-950"
            >
              {renderInline(headerMatch[1])}
            </div>
          );
        }

        // Bullet point (•, -, *, or numbered list)
        const bulletMatch = line.match(/^([•\-\*]|\d+\.)\s+(.*)$/);
        if (bulletMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 my-0.5 pl-0.5">
              <span className="text-emerald-500 font-bold shrink-0 mt-0.5 select-none leading-none">
                •
              </span>
              <div className="flex-1 text-gray-800">
                {renderInline(bulletMatch[2])}
              </div>
            </div>
          );
        }

        // Regular paragraph / text line
        return (
          <div key={idx} className="leading-relaxed text-gray-800">
            {renderInline(line)}
          </div>
        );
      })}
    </div>
  );
}

export default function AIChatDrawer({ isOpen, onClose, summary, transactions = [] }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showMorePrompts, setShowMorePrompts] = useState(false);
  const [showTopicsMenu, setShowTopicsMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const primaryPrompts = [
    'Generate Financial Summary',
    'Mayroon bang pending reimbursement (abono)?',
    'What is our current physical cash on hand?',
  ];

  const secondaryPrompts = [
    'Were there any cash shortages declared?',
    'Magkano ang kabuuang inflows at outflows ngayong semestre?',
    'Show breakdown of recent event expenditures',
    'Is the cashbox balanced against the ledger?',
  ];

  const topicsList = [
    {
      label: 'Financial Summary',
      prompt: 'I-generate ang buong financial summary at net balance ng pondo.',
      desc: 'Inflows, outflows, and overall balance',
    },
    {
      label: 'Cash Box & Vault',
      prompt: 'What is our current physical cash on hand and GCash balance?',
      desc: 'Physical count vs digital ledger',
    },
    {
      label: 'Reimbursements (Abono)',
      prompt: 'Mayroon bang mga pending reimbursement (abono) para sa advisers o officers?',
      desc: 'Pending advances waiting for liquidation',
    },
    {
      label: 'Shortages & Audits',
      prompt: 'Were there any cash shortages or audit discrepancies recorded?',
      desc: 'Discrepancy logs approved by advisers',
    },
    {
      label: 'Events & Projects',
      prompt: 'Magkano na ang nagastos sa mga kaganapan at proyekto ngayong semestre?',
      desc: 'Breakdown of project allocations',
    },
  ];

  const handleSend = async (userPrompt) => {
    const text = userPrompt || input;
    if (!text.trim() || loading) return;

    const newMessages = [...messages, { role: 'user', content: text.trim() }];
    setMessages(newMessages);
    setInput('');
    setShowTopicsMenu(false);
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
      // Deterministic rule-based fallback grounded directly on live memory data
      let fallbackReply = 'Nakuha ko ang iyong katanungan. Batay sa kasalukuyang talaan sa ating verified ledger:';
      const lower = text.toLowerCase();

      if (lower.includes('jatulan') || lower.includes('abono') || lower.includes('reimburse') || lower.includes('advance')) {
        const reimbursements = transactions.filter((t) => t.is_reimbursement && t.status === 'PENDING_REIMBURSEMENT');
        if (reimbursements.length > 0) {
          const list = reimbursements
            .map((r) => `• **${r.reimbursement_recipient || 'Officer'}** — ₱${Number(r.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })} para sa *${r.title}*`)
            .join('\n');
          fallbackReply = `Batay sa ating database, may mga sumusunod na pending advance (abono):\n\n${list}\n\nHindi pa ito nailalabas mula sa physical cash box.`;
        } else {
          fallbackReply = 'Batay sa ating database, walang nakatalang pending reimbursement (abono) sa kasalukuyan.';
        }
      } else if (lower.includes('cash') || lower.includes('on hand') || lower.includes('vault') || lower.includes('physical')) {
        fallbackReply = `Ang kasalukuyang verified **Physical Cash on Hand** sa ating cashbox ay **₱${(summary.cash_on_hand || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**, habang may **₱${(summary.gcash_balance || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}** sa GCash.`;
      } else if (lower.includes('shortage') || lower.includes('discrepancy')) {
        const shortages = transactions.filter((t) => (t.category_name && t.category_name.toLowerCase().includes('shortage')) || (t.title && t.title.toLowerCase().includes('shortage')));
        if (shortages.length > 0) {
          const totalShortage = shortages.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
          fallbackReply = `Mayroong naitalang kabuuang **₱${totalShortage.toLocaleString('en-PH', { minimumFractionDigits: 2 })} Cash Shortage** sa ating talaan na pormal nang ini-log at dumaan sa beripikasyon ng Club Adviser.`;
        } else {
          fallbackReply = 'Walang naitalang cash shortage discrepancy sa ating kasalukuyang talaan.';
        }
      } else {
        const net = (summary.total_inflows || 0) - (summary.total_outflows || 0);
        fallbackReply = `Narito ang kasalukuyang pangkalahatang lagom ng ating pondo:\n\n• **Kabuuang Inflows:** ₱${(summary.total_inflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n• **Kabuuang Outflows:** ₱${(summary.total_outflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n• **Net Balance:** ₱${net.toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n• **Physical Cash on Hand:** ₱${(summary.cash_on_hand || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n• **GCash Balance:** ₱${(summary.gcash_balance || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: fallbackReply },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    setInput('');
    setShowTopicsMenu(false);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-ai-backdrop"
      onClick={onClose}
    >
      {/* Main AI Floating Card Container — Pure Gradient White Aesthetic */}
      <div 
        className="w-full max-w-[540px] h-[600px] sm:h-[640px] max-h-[92vh] rounded-[28px] sm:rounded-[32px] flex flex-col relative overflow-hidden transition-all duration-300 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.22)] animate-ai-modal bg-gradient-to-b from-white via-[#f8faf9] to-[#edf4f0] border border-gray-200/90 text-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Soft Ambient Radial Glow Behind Header & Center */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-3xl pointer-events-none bg-emerald-400/20" />

        {/* Seamless Header */}
        <div className="px-5 pt-4 pb-2.5 flex items-center justify-between relative z-20">
          {/* Top Left: Sparkle Icon + "FinLITE" */}
          <div className="flex items-center gap-2">
            <div className="text-emerald-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 stroke-[2.4]" />
            </div>
            <span className="font-bold text-[15px] sm:text-base tracking-tight text-gray-900">
              FinLITE
            </span>
          </div>

          {/* Top Right: Actions (New Chat if active, and Close button) */}
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleResetChat}
                className="p-1.5 rounded-full text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer mr-1 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50"
                title="Start new conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden sm:inline">New</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full transition-all duration-200 cursor-pointer text-gray-400 hover:text-gray-700 hover:bg-gray-100 active:scale-95"
              title="Close"
            >
              <X className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 relative z-10 flex flex-col">
          
          {/* ========================================================= */}
          {/* STATE A: WELCOME / HERO VIEW                              */}
          {/* ========================================================= */}
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col justify-between py-2">
              
              {/* Center 3D Glossy Emerald Orb & Subtitle (3D EFFECTS PRESERVED) */}
              <div className="flex flex-col items-center justify-center pt-2 sm:pt-4">
                
                {/* 3D Glossy Green Orb with Ambient Glow */}
                <div className="relative flex items-center justify-center mb-3">
                  {/* Outer soft glowing aura */}
                  <div className="absolute w-28 h-28 rounded-full bg-emerald-400/30 blur-2xl animate-pulse pointer-events-none" />
                  
                  {/* 3D Photorealistic Glossy Sphere */}
                  <div className="relative w-20 h-20 sm:w-22 sm:h-22 animate-orb-pulse flex items-center justify-center">
                    <div 
                      className="w-full h-full rounded-full relative overflow-hidden"
                      style={{
                        background: 'radial-gradient(circle at 35% 30%, #a7f3d0 0%, #34d399 22%, #10b981 45%, #059669 68%, #04432f 85%, #022319 100%)',
                        boxShadow: 'inset -8px -8px 18px rgba(1, 28, 20, 0.95), inset 6px 6px 14px rgba(255, 255, 255, 0.45), 0 12px 28px rgba(0, 0, 0, 0.5), 0 0 25px rgba(16, 185, 129, 0.55)',
                      }}
                    >
                      {/* Glossy top-left specular highlight shine */}
                      <div 
                        className="absolute top-2 left-3 w-8 h-4 rounded-full pointer-events-none"
                        style={{
                          background: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.4) 40%, rgba(255, 255, 255, 0) 80%)',
                          transform: 'rotate(-25deg)',
                          filter: 'blur(0.5px)',
                        }}
                      />

                      {/* Sharp bright pinpoint glint at apex */}
                      <div 
                        className="absolute top-3.5 left-5 w-2.5 h-1.5 rounded-full pointer-events-none"
                        style={{
                          background: 'radial-gradient(circle, #ffffff 0%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0) 100%)',
                        }}
                      />

                      {/* Bottom-right bounce ambient reflection (Fresnel rim light) */}
                      <div 
                        className="absolute bottom-1 right-2 w-9 h-4 rounded-full pointer-events-none"
                        style={{
                          background: 'radial-gradient(ellipse at center, rgba(52, 211, 153, 0.65) 0%, rgba(52, 211, 153, 0) 75%)',
                          transform: 'rotate(-20deg)',
                          filter: 'blur(1px)',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Subtitle / Question underneath the orb */}
                <p className="text-xs sm:text-[13px] font-medium text-center tracking-tight transition-colors px-4 text-gray-500">
                  What do you want to know about our finances?
                </p>
              </div>

              {/* Vertically Stacked Prompts */}
              <div className="w-full flex flex-col items-end gap-2 sm:gap-2.5 mt-auto pt-4 pb-2">
                {primaryPrompts.map((promptText, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(promptText)}
                    className="text-right text-xs sm:text-[13px] font-medium px-4 py-2 sm:py-2.5 rounded-2xl transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-98 bg-white hover:bg-emerald-50/70 text-gray-800 hover:text-emerald-950 border border-gray-200/90 hover:border-emerald-300"
                  >
                    {promptText}
                  </button>
                ))}

                {/* Secondary Prompts when "Show more" is toggled */}
                {showMorePrompts && secondaryPrompts.map((promptText, idx) => (
                  <button
                    key={`sec-${idx}`}
                    type="button"
                    onClick={() => handleSend(promptText)}
                    className="text-right text-xs sm:text-[13px] font-medium px-4 py-2 sm:py-2.5 rounded-2xl transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-98 animate-ai-message bg-white hover:bg-emerald-50/70 text-gray-800 hover:text-emerald-950 border border-gray-200/90 hover:border-emerald-300"
                  >
                    {promptText}
                  </button>
                ))}

                {/* "Show more / Show less" button */}
                <button
                  type="button"
                  onClick={() => setShowMorePrompts(!showMorePrompts)}
                  className="text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer pt-0.5 pr-1 text-gray-400 hover:text-emerald-700"
                >
                  {showMorePrompts ? (
                    <>
                      <span>Show less</span>
                      <ChevronUp className="w-3 h-3" />
                    </>
                  ) : (
                    <>
                      <span>Show more</span>
                      <ChevronDown className="w-3 h-3" />
                    </>
                  )}
                </button>
              </div>

            </div>
          ) : (
            /* ========================================================= */
            /* STATE B: ACTIVE CHAT CONVERSATION VIEW (ChatGPT-Style)   */
            /* ========================================================= */
            <div className="flex-1 space-y-4 py-2 text-xs sm:text-[13px]">
              {messages.map((m, idx) => (
                <div 
                  key={idx}
                  className={`flex gap-2.5 animate-ai-message ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <Sparkles className="w-3 h-3" />
                    </div>
                  )}

                  <div 
                    className={`max-w-[85%] p-3 sm:p-3.5 rounded-2xl leading-relaxed select-text transition-all ${
                      m.role === 'user' 
                        ? 'bg-emerald-600 text-white rounded-tr-xs shadow-sm font-medium whitespace-pre-line' 
                        : 'bg-white text-gray-800 rounded-tl-xs border border-gray-200/80 shadow-xs'
                    }`}
                  >
                    {m.role === 'assistant' ? (
                      <FormattedMessage content={m.content} />
                    ) : (
                      m.content
                    )}
                  </div>

                  {m.role === 'user' && (
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 shadow-xs bg-gray-200 text-gray-700">
                      <User className="w-3 h-3" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-xs pl-8 py-1 animate-ai-message">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-2xl rounded-tl-xs shadow-2xs border bg-white text-gray-600 border-gray-200/80">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
                    <span className="font-medium text-[11px] sm:text-xs">Checking ledger records</span>
                    <span className="flex gap-1 items-center ml-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

        </div>

        {/* ========================================================= */}
        {/* BOTTOM INPUT CONTAINER & TOPICS MENU                      */}
        {/* ========================================================= */}
        <div className="p-3 sm:p-4 pt-1 relative z-20">
          
          {/* Topics Popover Drawer (when '+ Topics' is clicked) */}
          {showTopicsMenu && (
            <div className="mb-2 p-3 rounded-2xl border shadow-xl animate-ai-message transition-all bg-white border-gray-200 text-gray-800">
              <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-gray-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                  <Layers className="w-3 h-3" /> Quick Topics
                </span>
                <button
                  type="button"
                  onClick={() => setShowTopicsMenu(false)}
                  className="text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-1 max-h-44 overflow-y-auto">
                {topicsList.map((topic, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      handleSend(topic.prompt);
                    }}
                    className="text-left px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex flex-col hover:bg-emerald-50 hover:text-emerald-900"
                  >
                    <span className="text-xs font-semibold text-gray-900">{topic.label}</span>
                    <span className="text-[10px] text-gray-500 line-clamp-1">{topic.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Unified Input Card */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="rounded-2xl sm:rounded-[22px] border transition-all duration-200 p-2.5 sm:p-3 flex flex-col gap-2 bg-white border-gray-200/90 shadow-xs focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20"
          >
            {/* Upper line: Text Input */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className="w-full bg-transparent text-xs sm:text-[13px] outline-none px-1 select-text text-gray-900 placeholder:text-gray-400"
            />

            {/* Lower row: '+ Topics' button on the left, Send button on the right */}
            <div className="flex items-center justify-between pt-1">
              {/* Left: '+ Topics' */}
              <button
                type="button"
                onClick={() => setShowTopicsMenu(!showTopicsMenu)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                  showTopicsMenu
                    ? 'bg-emerald-500 text-white'
                    : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200/70'
                }`}
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
                <span>Topics</span>
              </button>

              {/* Right: Send Button */}
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className={`p-1.5 sm:p-2 rounded-xl transition-all duration-200 flex items-center justify-center cursor-pointer ${
                  input.trim() && !loading
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm hover:scale-105 active:scale-95'
                    : 'text-gray-300 cursor-not-allowed opacity-40'
                }`}
                title="Send message"
              >
                <Send className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
}
