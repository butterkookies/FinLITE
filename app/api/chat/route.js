import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req) {
  try {
    const { messages, context } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    const lastMessage = messages[messages.length - 1]?.content || '';
    const { summary = {}, transactions = [] } = context || {};

    // 1. Compute category breakdown from transactions
    const categoryTotals = {};
    transactions.forEach((t) => {
      const cat = t.category_name || (t.type === 'INFLOW' ? 'General Inflow' : 'General Expense');
      const amt = Number(t.amount) || 0;
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
    });

    const categorySummaryText = Object.entries(categoryTotals)
      .map(([cat, total]) => `- ${cat}: ₱${total.toFixed(2)}`)
      .join('\n');

    // 2. Identify query-relevant transactions based on keywords
    const qLower = lastMessage.toLowerCase();
    const keywords = qLower.split(/\s+/).filter((w) => w.length > 2);

    const matchedTx = transactions.filter((t) => {
      const searchable = `${t.title || ''} ${t.description || ''} ${t.category_name || ''} ${t.reimbursement_recipient || ''} ${t.type || ''}`.toLowerCase();
      return keywords.some((k) => searchable.includes(k));
    });

    // Merge keyword matches with recent transactions (deduplicated, up to 25 items)
    const combinedTxMap = new Map();
    matchedTx.slice(0, 15).forEach((t) => combinedTxMap.set(t.id, t));
    transactions.slice(0, 15).forEach((t) => {
      if (!combinedTxMap.has(t.id) && combinedTxMap.size < 25) {
        combinedTxMap.set(t.id, t);
      }
    });
    const relevantTransactions = Array.from(combinedTxMap.values());

    // Context summary for grounding
    const ledgerContext = `
Current FinLITE System Ledger Status:
- Physical Cash on Hand (in cashbox): ₱${(summary.cash_on_hand || 0).toFixed(2)}
- GCash Account Balance: ₱${(summary.gcash_balance || 0).toFixed(2)}
- Total Semester Inflows: ₱${(summary.total_inflows || 0).toFixed(2)}
- Total Semester Outflows: ₱${(summary.total_outflows || 0).toFixed(2)}
- Net Balance: ₱${((summary.total_inflows || 0) - (summary.total_outflows || 0)).toFixed(2)}
- Pending Reimbursements / Abono: ₱${(summary.pending_reimbursements || 0).toFixed(2)}

Category Breakdown:
${categorySummaryText || '- None recorded'}

Relevant & Recent Transactions (${relevantTransactions.length} items):
${relevantTransactions.map((t) => `- [${t.type}] ${t.title}: ₱${t.amount} (${t.payment_method}) [Status: ${t.status || 'COMPLETED'}] ${t.is_reimbursement ? `[Advance by ${t.reimbursement_recipient}]` : ''} ${t.category_name ? `[Category: ${t.category_name}]` : ''}`).join('\n')}
`;

function cleanAIResponse(text) {
  if (!text) return '';
  return text
    // Replace markdown headers (### Title or ### **Title**) with clean bold title
    .replace(/^#{1,6}\s*\**([^*#\n]+)\**/gm, '**$1**')
    .replace(/^#{1,6}\s+/gm, '')
    // Remove horizontal rule dividers (---, ***, ___)
    .replace(/^[\s]*[-*_]{3,}[\s]*$/gm, '')
    // Convert raw asterisk or dash bullet lines (* Item or - Item) into clean bullet (• Item)
    .replace(/^[\s]*[\*\-]\s+/gm, '• ')
    // Remove technical transaction brackets like [INFLOW] -> Inflow:, [OUTFLOW] -> Outflow:
    .replace(/\[INFLOW\]/gi, 'Inflow:')
    .replace(/\[OUTFLOW\]/gi, 'Outflow:')
    // Clean excessive blank lines (more than 2 consecutive newlines)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

    if (!apiKey) {
      // Deterministic rule-based response when API key is not configured locally
      let reply = 'Ang ating kasalukuyang financial status batay sa database:';
      const q = lastMessage.toLowerCase();

      if (q.includes('jatulan') || q.includes('abono') || q.includes('reimburse')) {
        const reimbursements = transactions.filter((t) => t.is_reimbursement && t.status === 'PENDING_REIMBURSEMENT');
        if (reimbursements.length > 0) {
          const list = reimbursements
            .map((r) => `• **${r.reimbursement_recipient || 'Officer'}**: ₱${Number(r.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })} para sa *${r.title}*`)
            .join('\n');
          reply = `Ayon sa ating verified database records, may mga nakabinbing advance (abono):\n\n${list}\n\nIto ay naghihintay pa ng cash box refund kapag na-liquidate na ang event.`;
        } else {
          reply = 'Ayon sa ating verified database records, walang nakatalang pending reimbursement (abono) sa kasalukuyan.';
        }
      } else if (q.includes('cash') || q.includes('on hand')) {
        reply = `Ang kabuuang **Physical Cash on Hand** sa ating cashbox ay **₱${(summary.cash_on_hand || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**.\nSamantala, ang digital balance sa **GCash** ay **₱${(summary.gcash_balance || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**.`;
      } else if (q.includes('shortage')) {
        const shortages = transactions.filter((t) => (t.category_name && t.category_name.toLowerCase().includes('shortage')) || (t.title && t.title.toLowerCase().includes('shortage')));
        if (shortages.length > 0) {
          const totalShortage = shortages.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
          reply = `Mayroong naitalang kabuuang **₱${totalShortage.toLocaleString('en-PH', { minimumFractionDigits: 2 })} Cash Shortage** sa ating talaan na pormal nang ini-log at inaprubahan ng ating Club Adviser.`;
        } else {
          reply = 'Walang naitalang cash shortage discrepancy sa ating kasalukuyang talaan.';
        }
      } else if (matchedTx.length > 0) {
        const matchedList = matchedTx.slice(0, 3).map((t) => `• **${t.title}**: ₱${Number(t.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`).join('\n');
        reply = `Ayon sa talaan kaugnay ng iyong tanong, natagpuan ang mga sumusunod:\n\n${matchedList}\n\nKabuuang Net Balance: **₱${((summary.total_inflows || 0) - (summary.total_outflows || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**.`;
      } else {
        reply = `Narito ang lagom ng FinLITE ledger ngayong semestre:\n\n• **Total Inflows:** ₱${(summary.total_inflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n• **Total Outflows:** ₱${(summary.total_outflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n• **Net Balance:** ₱${((summary.total_inflows || 0) - (summary.total_outflows || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n• **Physical Cash on Hand:** ₱${(summary.cash_on_hand || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n• **GCash Balance:** ₱${(summary.gcash_balance || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
      }

      return NextResponse.json({ reply: cleanAIResponse(reply) });
    }

    // When GEMINI_API_KEY is available:
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.5-flash-lite',
        systemInstruction: `You are FinLITE Co-Pilot, the smart treasury assistant for the League of Information Technology Enthusiasts (LITE) at Pambayang Dalubhasaan ng Marilao (PDM).
Your answers must be 100% grounded on the provided verified ledger data. Do NOT hallucinate or compute fictional balances.
Support Taglish, Filipino, and English naturally, politely, and professionally.
When citing monetary amounts, always format in Philippine Peso (₱) with two decimal places (e.g., ₱1,500.00).

STRICT FORMATTING AND CLEAN OUTPUT RULES:
- Tailor your responses for a clean, sleek mobile/card chat interface.
- DO NOT use markdown heading hashes (NEVER output '#', '##', or '###').
- DO NOT use horizontal rule lines (NEVER output '---', '___', or '***').
- DO NOT output messy asterisk bullet points like '* **Item:**'. Instead use clean bullet points starting with the bullet character '• ' (e.g., '• Cash on Hand: ₱20,000.00').
- AVOID raw brackets like '[INFLOW]' or '[OUTFLOW]' or '*COMPLETED*'. Write them cleanly and naturally (e.g., '• Inflow: Title — ₱Amount (Cash) • Completed').
- Use bold text sparingly for key figures and section names without extra symbol clutter.
- Maintain clean, pleasant line spacing between topics.

Grounding Data:
${ledgerContext}`,
      });

      const chat = model.startChat();
      const result = await chat.sendMessage(lastMessage);
      const response = await result.response;
      const reply = cleanAIResponse(response.text());

      return NextResponse.json({ reply });
    } catch (apiErr) {
      console.warn('Gemini API call failed, falling back to rule engine:', apiErr?.message);
      // Fallback rule engine on transient Gemini 503 or quota limits
      const q = lastMessage.toLowerCase();
      let fallbackReply = `Ayon sa ating kasalukuyang FinLITE ledger:\n\n• **Physical Cash on Hand:** ₱${(summary.cash_on_hand || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n• **GCash Balance:** ₱${(summary.gcash_balance || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
      if (q.includes('jatulan') || q.includes('abono') || q.includes('reimburse')) {
        const reimbursements = transactions.filter((t) => t.is_reimbursement && t.status === 'PENDING_REIMBURSEMENT');
        if (reimbursements.length > 0) {
          const list = reimbursements
            .map((r) => `• **${r.reimbursement_recipient || 'Officer'}**: ₱${Number(r.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })} para sa *${r.title}*`)
            .join('\n');
          fallbackReply = `May nakabinbing advance (abono):\n\n${list}`;
        } else {
          fallbackReply = 'Walang nakatalang pending reimbursement (abono) sa kasalukuyang ledger.';
        }
      }
      return NextResponse.json({ reply: cleanAIResponse(fallbackReply) });
    }
  } catch (err) {
    console.error('AI Route Error:', err);
    return NextResponse.json(
      { reply: 'Paumanhin, nagkaroon ng error sa pakikipag-ugnayan sa AI co-pilot. Pakisubukang muli.' },
      { status: 500 }
    );
  }
}
