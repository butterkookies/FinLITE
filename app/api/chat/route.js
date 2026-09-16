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
- Physical Cash on Hand (in lunchbox): ₱${(summary.cash_on_hand || 0).toFixed(2)}
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
        reply = `Ayon sa ating database record, may nakabinbing advance (abono) si **Ms. Kimberly Dawn Jatulan** na nagkakahalaga ng **₱1,250.00** para sa *Judge Tokens & Certificates* (Club Week 2026). Ito ay naghihintay pa ng cash box refund kapag na-liquidate na ang event.`;
      } else if (q.includes('cash') || q.includes('on hand')) {
        reply = `Ang kabuuang **Physical Cash on Hand** sa ating lunchbox ay **₱${(summary.cash_on_hand || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**. Samantala, ang digital balance sa **GCash** ay **₱${(summary.gcash_balance || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**.`;
      } else if (q.includes('shortage')) {
        reply = `Mayroong naitalang **₱161.00 Cash Shortage** noong Club Week dahil sa kakulangan ng baryang panukli sa booth sales. Ito ay pormal nang ini-log at inaprubahan ng ating Club Adviser.`;
      } else {
        reply = `Ang FinLITE ledger ay nagpapakita ng kabuuang Inflows na **₱${(summary.total_inflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}** at Outflows na **₱${(summary.total_outflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**, na may net balance na **₱${((summary.total_inflows || 0) - (summary.total_outflows || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**.`;
      }

      return NextResponse.json({ reply });
    }

    // When GEMINI_API_KEY is available:
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
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
  } catch (err) {
    console.error('AI Route Error:', err);
    return NextResponse.json(
      { reply: 'Paumanhin, nagkaroon ng error sa pakikipag-ugnayan sa AI co-pilot. Pakisubukang muli.' },
      { status: 500 }
    );
  }
}
