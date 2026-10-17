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
- Net Position (Cash on Hand minus Pending Abono): ₱${((summary.net_position != null ? summary.net_position : (summary.cash_on_hand || 0) - (summary.pending_reimbursements || 0))).toFixed(2)}
- Total Semester Inflows: ₱${(summary.total_inflows || 0).toFixed(2)}
- Total Semester Outflows: ₱${(summary.total_outflows || 0).toFixed(2)}
- Net Balance: ₱${((summary.total_inflows || 0) - (summary.total_outflows || 0)).toFixed(2)}
- Pending Reimbursements / Abono Advances: ₱${(summary.pending_reimbursements || 0).toFixed(2)}
- Uncollected Debts / Receivables: ₱${(summary.uncollected_debts || 0).toFixed(2)}
(Note: LITE operates strictly on a physical cashbox model in the Program Director's room. There is no official GCash account or digital wallet; personal digital advances like abono are logged as liabilities reimbursed in physical cash.)

Category Breakdown:
${categorySummaryText || '- None recorded'}

Relevant & Recent Transactions (${relevantTransactions.length} items):
${relevantTransactions.map((t) => `- [${t.type}] ${t.title}: ₱${t.amount} [Status: ${t.status || 'COMPLETED'}] ${t.is_reimbursement ? `[Advance by ${t.reimbursement_recipient}]` : ''} ${t.category_name ? `[Category: ${t.category_name}]` : ''}`).join('\n')}
`;

    const CANDIDATE_MODELS = [
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
    ];

    let reply = null;
    let lastApiError = null;

    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);

      for (const modelName of CANDIDATE_MODELS) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: `You are FinLITE Co-Pilot, the senior financial assistant for the League of Information Technology Enthusiasts (LITE) at Pambayang Dalubhasaan ng Marilao (PDM).

Operational Standards:
1. Tone & Language: Professional, courteous, concise, and helpful. Fluently respond in natural Taglish, Filipino, or English matching the user's prompt.
2. Grounding & Accuracy: Answer STRICTLY using the provided FinLITE System Ledger Status and transaction records below. NEVER guess or hallucinate numbers or transactions. If data is not present, say so honestly.
3. Response Structure:
   - Direct Answer: Start with a clear 1-2 sentence direct answer stating the exact verified amounts in Philippine Peso (₱).
   - Breakdown / List: If relevant, provide a clean, readable bullet list using simple hyphens (- ). Keep each point concise.
   - Context / Advisory: If applicable, add a quick 1-sentence reminder (e.g., remind officers that pending reimbursements are abono awaiting post-activity liquidation, or note physical cash box reconciliation).
4. Monetary Format: Always format pesos with ₱ and standard comma grouping (e.g. ₱1,250.00).
5. Clean Formatting: Do NOT output walls of asterisks, raw unclosed markdown tags, or tables. Use simple bold (**text**) for amounts/key terms and clean bullet points.

Grounding Data:
${ledgerContext}`,
          });

          const result = await model.generateContent(lastMessage);
          const response = await result.response;
          const text = response.text();
          if (text) {
            reply = text;
            break;
          }
        } catch (mErr) {
          lastApiError = mErr;
          console.warn(`Model ${modelName} call failed, trying next candidate:`, mErr?.message);
        }
      }
    }

    if (!reply) {
      if (lastApiError) {
        console.warn('Gemini API calls failed, falling back to rule engine:', lastApiError?.message);
      }
      reply = generateRuleEngineReply({
        lastMessage,
        summary,
        transactions,
        matchedTx,
      });
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('AI Route Error:', err);
    return NextResponse.json(
      { reply: 'Paumanhin, nagkaroon ng error sa pakikipag-ugnayan sa AI co-pilot. Pakisubukang muli.' },
      { status: 500 }
    );
  }
}

function generateRuleEngineReply({ lastMessage = '', summary = {}, transactions = [], matchedTx = [] }) {
  const q = lastMessage.toLowerCase();

  // 1. Reimbursements / Abono
  if (q.includes('jatulan') || q.includes('abono') || q.includes('reimburse') || q.includes('advance')) {
    const reimbursements = transactions.filter((t) => t.is_reimbursement && t.status === 'PENDING_REIMBURSEMENT');
    if (reimbursements.length > 0) {
      const list = reimbursements
        .map((r) => `**${r.reimbursement_recipient || 'Officer'}** (₱${Number(r.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })} para sa *${r.title}*)`)
        .join(', ');
      return `Ayon sa ating verified database records, may mga nakabinbing advance (abono): ${list}. Ito ay naghihintay pa ng cash box refund kapag na-liquidate na ang event.`;
    }
    return 'Ayon sa ating verified database records, walang nakatalang pending reimbursement (abono) sa kasalukuyan.';
  }

  // 2. Shortages / Discrepancies
  if (q.includes('shortage') || q.includes('discrepanc') || q.includes('kulang')) {
    const shortages = transactions.filter((t) =>
      (t.category_name && t.category_name.toLowerCase().includes('shortage')) ||
      (t.title && t.title.toLowerCase().includes('shortage')) ||
      (t.description && t.description.toLowerCase().includes('shortage'))
    );
    if (shortages.length > 0) {
      const totalShortage = shortages.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
      const list = shortages.map((s) => `**${s.title}** (₱${Number(s.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })})`).join(', ');
      return `Mayroong naitalang kabuuang **₱${totalShortage.toLocaleString('en-PH', { minimumFractionDigits: 2 })} Cash Shortage** sa ating talaan (${list}) na pormal nang ini-log at dumaan sa beripikasyon.`;
    }
    return 'Walang naitalang cash shortage o discrepancy sa ating kasalukuyang talaan.';
  }

  // 3. Receivables / Debts / Pautang
  if (q.includes('receivable') || q.includes('pautang') || q.includes('utang') || q.includes('debt') || q.includes('collectible')) {
    const receivables = transactions.filter((t) =>
      (t.category_name && (t.category_name.toLowerCase().includes('receivable') || t.category_name.toLowerCase().includes('pautang') || t.category_name.toLowerCase().includes('utang'))) ||
      (t.title && (t.title.toLowerCase().includes('receivable') || t.title.toLowerCase().includes('pautang') || t.title.toLowerCase().includes('utang')))
    );
    if (receivables.length > 0) {
      const totalReceivables = receivables.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const list = receivables.map((r) => `**${r.title}** (₱${Number(r.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })})`).join(', ');
      return `May kabuuang **₱${totalReceivables.toLocaleString('en-PH', { minimumFractionDigits: 2 })}** na receivables / collectibles sa ledger: ${list}. Maaari ring buksan ang **Debts & Receivables** module mula sa sidebar para sa kumpletong breakdown.`;
    }
    return 'Walang naitalang active receivables o pautang sa kasalukuyang talaan. Maaari ring bisitahin ang **Debts & Receivables** module mula sa sidebar para sa buong detalye.';
  }

  // 4. Inflows & Outflows / Totals
  if (q.includes('inflow') || q.includes('outflow') || q.includes('pasok') || q.includes('labas') || q.includes('gastos')) {
    return `Ang ating kabuuang Inflows ngayong semestre ay **₱${(summary.total_inflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}** at ang kabuuang Outflows ay **₱${(summary.total_outflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**. Ang ating Net Semester Balance ay **₱${((summary.total_inflows || 0) - (summary.total_outflows || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**.`;
  }

  // 5. Physical Cash on Hand specifically
  if (q.includes('physical cash') || q.includes('on hand') || q.includes('cashbox') || q.includes('cash box') || q.includes('hawak na pera')) {
    const netPos = summary.net_position != null ? summary.net_position : (summary.cash_on_hand || 0) - (summary.pending_reimbursements || 0);
    return `Ang kasalukuyang verified **Physical Cash on Hand** sa ating cashbox ay **₱${(summary.cash_on_hand || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**, na may Net Position na **₱${netPos.toLocaleString('en-PH', { minimumFractionDigits: 2 })}** matapos ibawas ang pending abono.`;
  }

  // 6. Balance / Remaining / Cashbox
  if (q.includes('balance') || q.includes('remaining') || q.includes('reserve') || q.includes('vault') || q.includes('cash') || q.includes('net position')) {
    const netPos = summary.net_position != null ? summary.net_position : (summary.cash_on_hand || 0) - (summary.pending_reimbursements || 0);
    return `Ang kasalukuyang verified balance sa ating physical cashbox: **Physical Cash on Hand** ay **₱${(summary.cash_on_hand || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**, habang ang ating **Net Position** (matapos ibawas ang pending abono na ₱${(summary.pending_reimbursements || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}) ay **₱${netPos.toLocaleString('en-PH', { minimumFractionDigits: 2 })}**.`;
  }

  // 7. Matched transactions
  if (matchedTx && matchedTx.length > 0) {
    const matchedList = matchedTx.slice(0, 3).map((t) => `**${t.title}** (₱${Number(t.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })})`).join(', ');
    return `Ayon sa talaan kaugnay ng iyong katanungan, natagpuan ang mga sumusunod: ${matchedList}. Kabuuang Net Balance: ₱${((summary.total_inflows || 0) - (summary.total_outflows || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}.`;
  }

  // 8. General fallback overview
  const netPos = summary.net_position != null ? summary.net_position : (summary.cash_on_hand || 0) - (summary.pending_reimbursements || 0);
  return `Batay sa kasalukuyang FinLITE ledger: May verified Physical Cash on Hand na **₱${(summary.cash_on_hand || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}** sa ating cashbox, Net Position na **₱${netPos.toLocaleString('en-PH', { minimumFractionDigits: 2 })}**, kabuuang Inflows na **₱${(summary.total_inflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**, at Outflows na **₱${(summary.total_outflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**.`;
}
