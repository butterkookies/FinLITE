import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req) {
  try {
    const { messages, context } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    const lastMessage = messages[messages.length - 1]?.content || '';
    const { summary = {}, transactions = [] } = context || {};

    // Context summary for grounding
    const ledgerContext = `
Current FinLITE System Ledger Status:
- Physical Cash on Hand (in cashbox): ₱${(summary.cash_on_hand || 0).toFixed(2)}
- GCash Account Balance: ₱${(summary.gcash_balance || 0).toFixed(2)}
- Total Semester Inflows: ₱${(summary.total_inflows || 0).toFixed(2)}
- Total Semester Outflows: ₱${(summary.total_outflows || 0).toFixed(2)}
- Pending Reimbursements / Abono: ₱${(summary.pending_reimbursements || 0).toFixed(2)}

Recent Transactions:
${transactions.slice(0, 10).map(t => `- [${t.type}] ${t.title}: ₱${t.amount} (${t.payment_method}) ${t.is_reimbursement ? `[Advance by ${t.reimbursement_recipient}]` : ''}`).join('\n')}
`;

    if (!apiKey) {
      // Deterministic rule-based response when API key is not configured locally
      let reply = 'Ang ating kasalukuyang financial status batay sa database:';
      const q = lastMessage.toLowerCase();

      if (q.includes('jatulan') || q.includes('abono') || q.includes('reimburse')) {
        const reimbursements = transactions.filter((t) => t.is_reimbursement && t.status === 'PENDING_REIMBURSEMENT');
        if (reimbursements.length > 0) {
          const list = reimbursements
            .map((r) => `**${r.reimbursement_recipient || 'Officer'}** (₱${Number(r.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })} para sa *${r.title}*)`)
            .join(', ');
          reply = `Ayon sa ating verified database records, may mga nakabinbing advance (abono): ${list}. Ito ay naghihintay pa ng cash box refund kapag na-liquidate na ang event.`;
        } else {
          reply = 'Ayon sa ating verified database records, walang nakatalang pending reimbursement (abono) sa kasalukuyan.';
        }
      } else if (q.includes('cash') || q.includes('on hand')) {
        reply = `Ang kabuuang **Physical Cash on Hand** sa ating cashbox ay **₱${(summary.cash_on_hand || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**. Samantala, ang digital balance sa **GCash** ay **₱${(summary.gcash_balance || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**.`;
      } else if (q.includes('shortage')) {
        const shortages = transactions.filter((t) => (t.category_name && t.category_name.toLowerCase().includes('shortage')) || (t.title && t.title.toLowerCase().includes('shortage')));
        if (shortages.length > 0) {
          const totalShortage = shortages.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
          reply = `Mayroong naitalang kabuuang **₱${totalShortage.toLocaleString('en-PH', { minimumFractionDigits: 2 })} Cash Shortage** sa ating talaan na pormal nang ini-log at inaprubahan ng ating Club Adviser.`;
        } else {
          reply = 'Walang naitalang cash shortage discrepancy sa ating kasalukuyang talaan.';
        }
      } else {
        reply = `Ang FinLITE ledger ay nagpapakita ng kabuuang Inflows na **₱${(summary.total_inflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}** at Outflows na **₱${(summary.total_outflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**, na may net balance na **₱${((summary.total_inflows || 0) - (summary.total_outflows || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**.`;
      }

      return NextResponse.json({ reply });
    }

    // When GEMINI_API_KEY is available:
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.5-flash-lite',
        systemInstruction: `You are FinLITE Co-Pilot, the financial assistant for the League of Information Technology Enthusiasts (LITE) at Pambayang Dalubhasaan ng Marilao (PDM).
Your answers must be 100% grounded on the provided verified ledger data. Do NOT hallucinate or compute fictional balances.
Support Taglish, Filipino, and English naturally and professionally.
When citing monetary amounts, always format in Philippine Peso (₱).
Grounding Data:
${ledgerContext}`,
      });

      const chat = model.startChat();
      const result = await chat.sendMessage(lastMessage);
      const response = await result.response;
      const reply = response.text();

      return NextResponse.json({ reply });
    } catch (apiErr) {
      console.warn('Gemini API call failed, falling back to rule engine:', apiErr?.message);
      // Fallback rule engine on transient Gemini 503 or quota limits
      const q = lastMessage.toLowerCase();
      let fallbackReply = `Ayon sa ating kasalukuyang FinLITE ledger: May kabuuang Physical Cash on Hand na ₱${(summary.cash_on_hand || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })} at GCash na ₱${(summary.gcash_balance || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}.`;
      if (q.includes('jatulan') || q.includes('abono') || q.includes('reimburse')) {
        const reimbursements = transactions.filter((t) => t.is_reimbursement && t.status === 'PENDING_REIMBURSEMENT');
        if (reimbursements.length > 0) {
          const list = reimbursements
            .map((r) => `**${r.reimbursement_recipient || 'Officer'}** (₱${Number(r.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })} para sa *${r.title}*)`)
            .join(', ');
          fallbackReply = `May nakabinbing advance (abono): ${list}.`;
        } else {
          fallbackReply = 'Walang nakatalang pending reimbursement (abono) sa kasalukuyang ledger.';
        }
      }
      return NextResponse.json({ reply: fallbackReply });
    }
  } catch (err) {
    console.error('AI Route Error:', err);
    return NextResponse.json(
      { reply: 'Paumanhin, nagkaroon ng error sa pakikipag-ugnayan sa AI co-pilot. Pakisubukang muli.' },
      { status: 500 }
    );
  }
}
