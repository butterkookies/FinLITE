import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req) {
  try {
    const { messages, context } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    const lastMessage = messages[messages.length - 1]?.content || '';
    const { summary = {}, transactions = [], debts = [], advances = [] } = context || {};

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

    // 3. Format Debts & Receivables Breakdown (Active & Settled)
    const activeDebts = debts.filter((d) => d.status !== 'SETTLED' && d.status !== 'CANCELLED');
    const settledDebts = debts.filter((d) => d.status === 'SETTLED');
    const debtsSummaryText = activeDebts.length > 0
      ? activeDebts
          .map((d) => {
            const rem = Math.max(0, Number(d.total_amount || 0) - Number(d.amount_paid || 0));
            return `- Debtor: "${d.debtor_name}" | Remaining: ₱${rem.toFixed(2)} (Total: ₱${Number(d.total_amount || 0).toFixed(2)}, Paid: ₱${Number(d.amount_paid || 0).toFixed(2)}) | Title: "${d.title}" | Status: ${d.status}${d.due_date ? ` | Due: ${d.due_date}` : ''}${d.notes ? ` | Notes: ${d.notes}` : ''}`;
          })
          .join('\n')
      : '- None currently active (₱0.00 uncollected)';

    const settledDebtsSummaryText = settledDebts.length > 0
      ? settledDebts
          .slice(0, 10)
          .map((d) => `- Debtor: "${d.debtor_name}" | Settled Amount: ₱${Number(d.total_amount || 0).toFixed(2)} | Title: "${d.title}" | Status: SETTLED (Fully Paid)`)
          .join('\n')
      : '- None recorded';

    // 4. Format Advances / Abono Breakdown (Active & Settled)
    const activeAdvances = advances.filter((a) => a.status !== 'SETTLED' && a.status !== 'CANCELLED');
    const settledAdvances = advances.filter((a) => a.status === 'SETTLED');
    const advancesSummaryText = activeAdvances.length > 0
      ? activeAdvances
          .map((a) => {
            const rem = Math.max(0, Number(a.total_amount || 0) - Number(a.amount_reimbursed || 0));
            return `- Claimant: "${a.claimant_name}" | Remaining: ₱${rem.toFixed(2)} (Total: ₱${Number(a.total_amount || 0).toFixed(2)}) | Title: "${a.title}" | Status: ${a.status}${a.event_name ? ` | Event: ${a.event_name}` : ''}${a.notes ? ` | Notes: ${a.notes}` : ''}`;
          })
          .join('\n')
      : '- None currently active (₱0.00 pending)';

    const settledAdvancesSummaryText = settledAdvances.length > 0
      ? settledAdvances
          .slice(0, 10)
          .map((a) => `- Claimant: "${a.claimant_name}" | Reimbursed Amount: ₱${Number(a.total_amount || 0).toFixed(2)} | Title: "${a.title}" | Status: SETTLED (Reimbursed)`)
          .join('\n')
      : '- None recorded';

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

Institutional Rules & Financial Model:
- Physical Cashbox Model: LITE operates strictly on a physical cashbox model. All physical cash holdings, petty cash reserves, and accumulated coin collections are secured inside a single small metal cashbox stored inside a locked drawer within the Program Director's Office on campus. It NEVER leaves campus premises.
- No Organization GCash: LITE has NO official organization GCash account or digital wallet.
- Abono (Personal Advances): Because the cashbox never leaves campus, student officers buying supplies off-campus front their own personal money ("abono"). These are logged as liabilities (advances_payable) and reimbursed from physical cashbox upon post-activity liquidation with official receipt (OR).
- Dual-Officer Reconciliation: Periodic physical cash counts across 11 Philippine currency denominations (₱1000 down to ₱0.05) are reconciled against the ledger balance. Cash shortages require written adviser justification.
- Net Position Formula: Net Position = Physical Cash on Hand minus Pending Abono.

Uncollected Debts / Receivables Breakdown (${activeDebts.length} active records):
${debtsSummaryText}

Recently Settled Debts History (${settledDebts.length} settled records):
${settledDebtsSummaryText}

Pending Advances / Abono Breakdown (${activeAdvances.length} active records):
${advancesSummaryText}

Recently Settled Advances History (${settledAdvances.length} settled records):
${settledAdvancesSummaryText}

Category Breakdown:
${categorySummaryText || '- None recorded'}

Relevant & Recent Transactions (${relevantTransactions.length} items):
${relevantTransactions.map((t) => `- [${t.type}] ${t.title}: ₱${t.amount} [Status: ${t.status || 'COMPLETED'}] ${t.is_reimbursement ? `[Advance by ${t.reimbursement_recipient}]` : ''} ${t.category_name ? `[Category: ${t.category_name}]` : ''}`).join('\n')}
`;

    const CANDIDATE_MODELS = [
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.8-flash',
    ];

    let reply = null;
    let lastApiError = null;

    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);

      // Extract prior conversation history for multi-turn chat memory
      const priorMessages = Array.isArray(messages) ? messages.slice(0, messages.length - 1) : [];
      const history = [];

      // Filter and alternate history turns starting from first user message
      const firstUserIdx = priorMessages.findIndex((m) => m.role === 'user');
      if (firstUserIdx !== -1) {
        const turns = priorMessages.slice(firstUserIdx).slice(-8); // Keep up to last 8 turns
        for (const m of turns) {
          const role = m.role === 'assistant' ? 'model' : 'user';
          const text = (m.content || '').trim();
          if (!text) continue;

          if (history.length > 0 && history[history.length - 1].role === role) {
            history[history.length - 1].parts[0].text += `\n${text}`;
          } else {
            history.push({
              role,
              parts: [{ text }],
            });
          }
        }
      }

      for (const modelName of CANDIDATE_MODELS) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: `You are FinLITE Co-Pilot, the senior financial assistant for the League of Information Technology Enthusiasts (LITE) at Pambayang Dalubhasaan ng Marilao (PDM).

Operational Standards:
1. Tone & Language: Professional, courteous, concise, and helpful. Fluently respond in natural Taglish, Filipino, or English matching the user's prompt.
2. Greetings & Pleasantries:
   - When a user sends a greeting (e.g. "hello", "hi", "kamusta", "good morning", "thank you", "salamat"): Respond warmly and concisely (e.g., greet back, introduce your readiness as FinLITE Co-Pilot, and ask how you can assist with the cashbox or ledger).
   - DO NOT dump raw ledger stats or balances on casual greetings unless specifically asked.
3. Grounding & Accuracy:
   - Answer STRICTLY using the provided FinLITE System Ledger Status, Debts (Active & Settled), Advances (Active & Settled), and transactions below. NEVER guess or hallucinate numbers or names.
   - When answering about receivables or abono: clearly state active amounts. If there are ₱0.00 outstanding receivables/abono, state that clearly, and if appropriate, acknowledge that previous accounts (e.g., Sir Harvey, Sir Ralph) were already fully settled/paid.
4. Response Structure:
   - Direct Answer: Start with a clear 1-2 sentence direct answer in Philippine Peso (₱).
   - Breakdown / List: If relevant, provide a clean, readable bullet list using simple hyphens (- ). Keep each point concise.
   - Autonomous Tip: Whenever contextually helpful, provide a 1-sentence proactive organizational tip (e.g., reminding that reimbursements require official receipts and post-activity liquidation, that physical cash is secured in the Director's locked drawer, or encouraging dual-officer denomination counts).
5. Monetary Format: Always format pesos with ₱ and standard comma grouping (e.g. ₱1,250.00).
6. Clean Formatting: Do NOT output walls of asterisks, raw unclosed markdown tags, or tables. Use simple bold (**text**) for amounts/key terms and clean bullet points.

Grounding Data:
${ledgerContext}`,
          });

          const chat = model.startChat({
            history,
            generationConfig: {
              temperature: 0.3,
            },
          });

          const result = await chat.sendMessage(lastMessage);
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
        debts,
        advances,
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

function generateRuleEngineReply({
  lastMessage = '',
  summary = {},
  transactions = [],
  debts = [],
  advances = [],
  matchedTx = [],
}) {
  const q = lastMessage.trim().toLowerCase();

  // 1. Greetings & Pleasantries
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
    return 'Kamusta! Ako ang iyong FinLITE Co-Pilot. Paano kita matutulungan sa ating physical cashbox o financial ledger ngayon? Maaari kang magtanong ukol sa ating physical cash on hand, pending abono, uncollected receivables, o mga nakaraang transaksyon.\n\n💡 *Tip: Tandaan na ang ating cashbox ay nananatili sa loob ng Program Director\'s Office at hindi inilalabas ng campus.*';
  }

  // 2. Gratitude / Pleasantries
  if (q.startsWith('salamat') || q.startsWith('thank') || q.startsWith('maraming salamat')) {
    return 'Walang anuman! Laging handang maglingkod ang FinLITE Co-Pilot upang mapanatiling tumpak, transparent, at maayos ang pondo ng LITE. Mayroon ka pa bang ibang gustong i-check?';
  }

  // 3. Specific Debtor or General Receivables / Debts / Pautang
  const matchedDebtor = debts.find((d) => d.debtor_name && q.includes(d.debtor_name.toLowerCase()));
  if (
    matchedDebtor ||
    q.includes('receivable') ||
    q.includes('pautang') ||
    q.includes('utang') ||
    q.includes('debt') ||
    q.includes('collectible')
  ) {
    const uncollectedDebts = debts.filter((d) => d.status !== 'SETTLED' && d.status !== 'CANCELLED');
    const settledDebts = debts.filter((d) => d.status === 'SETTLED');

    if (matchedDebtor) {
      const rem = Math.max(0, Number(matchedDebtor.total_amount || 0) - Number(matchedDebtor.amount_paid || 0));
      const statusNote = matchedDebtor.status === 'SETTLED' 
        ? 'Pormal na itong **SETTLED (Fully Paid)**.'
        : `May natitira pang balance na **₱${rem.toLocaleString('en-PH', { minimumFractionDigits: 2 })}** (Status: ${matchedDebtor.status}).`;
      return `Ayon sa ating records sa Debts & Receivables, si **${matchedDebtor.debtor_name}** ay mayroong naitalang record para sa *${matchedDebtor.title}* na may kabuuang halagang **₱${Number(matchedDebtor.total_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**. ${statusNote}`;
    }

    if (uncollectedDebts.length > 0) {
      const totalReceivables = uncollectedDebts.reduce(
        (sum, d) => sum + Math.max(0, Number(d.total_amount || 0) - Number(d.amount_paid || 0)),
        0
      );
      const list = uncollectedDebts
        .map((d) => {
          const rem = Math.max(0, Number(d.total_amount || 0) - Number(d.amount_paid || 0));
          return `- **${d.debtor_name}**: ₱${rem.toLocaleString('en-PH', { minimumFractionDigits: 2 })} para sa *${d.title}* (Status: ${d.status})`;
        })
        .join('\n');
      return `Batay sa FinLITE System Ledger, mayroong kabuuang **₱${totalReceivables.toLocaleString('en-PH', { minimumFractionDigits: 2 })}** na outstanding receivables:\n\n${list}\n\nMaaari ring buksan ang **Debts & Receivables** module mula sa sidebar para sa buong detalye o upang mag-record ng installment payments.\n\n💡 *Tip: Ang bawat payment collection ay dapat agad i-remit sa physical cashbox upang magtugma ang periodic reconciliation.*`;
    }

    if (settledDebts.length > 0) {
      const settledList = settledDebts.map((d) => `**${d.debtor_name}** (₱${Number(d.total_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })} para sa *${d.title}*)`).join(', ');
      return `Batay sa FinLITE System Ledger, kasalukuyang **walang outstanding receivables o uncollected debts (₱0.00)** ang LITE. Ang mga naitalang pautang noon ay pormal nang **SETTLED** o bayad na: ${settledList}.\n\n💡 *Tip: Mananatiling transparent ang ledger dahil nakatala pa rin ang completed records sa Debts & Receivables module.*`;
    }

    return 'Batay sa FinLITE System Ledger, kasalukuyang walang outstanding receivables o uncollected debts (₱0.00) ang LITE.';
  }

  // 4. Reimbursements / Abono / Advances
  const matchedClaimant = advances.find((a) => a.claimant_name && q.includes(a.claimant_name.toLowerCase()));
  if (
    matchedClaimant ||
    q.includes('jatulan') ||
    q.includes('abono') ||
    q.includes('reimburse') ||
    q.includes('advance')
  ) {
    const pendingAdv = advances.filter((a) => a.status !== 'SETTLED' && a.status !== 'CANCELLED');
    const settledAdv = advances.filter((a) => a.status === 'SETTLED');

    if (matchedClaimant) {
      const rem = Math.max(0, Number(matchedClaimant.total_amount || 0) - Number(matchedClaimant.amount_reimbursed || 0));
      if (matchedClaimant.status === 'SETTLED') {
        return `Ayon sa talaan, ang advance/abono ni **${matchedClaimant.claimant_name}** para sa *${matchedClaimant.title}* (₱${Number(matchedClaimant.total_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}) ay **SETTLED** na at pormal nang na-reimburse mula sa cashbox.`;
      }
      return `Ayon sa ating records, mayroong naitalang advance/abono si **${matchedClaimant.claimant_name}** na nagkakahalagang **₱${rem.toLocaleString('en-PH', { minimumFractionDigits: 2 })}** para sa *${matchedClaimant.title}* (Status: ${matchedClaimant.status}). Naghihintay ito ng post-activity liquidation bago i-reimburse mula sa physical cashbox.\n\n💡 *Tip: Siguraduhing may kalakip na Official Receipt (OR) o valid proof of purchase ang liquidation.*`;
    }

    if (pendingAdv.length > 0) {
      const list = pendingAdv
        .map((a) => {
          const rem = Math.max(0, Number(a.total_amount || 0) - Number(a.amount_reimbursed || 0));
          return `- **${a.claimant_name || 'Officer'}**: ₱${rem.toLocaleString('en-PH', { minimumFractionDigits: 2 })} para sa *${a.title}*`;
        })
        .join('\n');
      return `Ayon sa ating verified database records, may mga sumusunod na pending advance (abono):\n\n${list}\n\nIto ay naghihintay pa ng cash box reimbursement kapag na-liquidate na ang aktibidad.\n\n💡 *Tip: Tandaan na ang Net Position (Physical Cash less Pending Abono) ang tunay na unencumbered funds ng organisasyon.*`;
    }

    const reimbursements = transactions.filter((t) => t.is_reimbursement && t.status === 'PENDING_REIMBURSEMENT');
    if (reimbursements.length > 0) {
      const list = reimbursements
        .map((r) => `- **${r.reimbursement_recipient || 'Officer'}**: ₱${Number(r.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })} para sa *${r.title}*`)
        .join('\n');
      return `Ayon sa ating verified database records, may mga nakabinbing advance (abono):\n\n${list}\n\nIto ay naghihintay pa ng cash box refund kapag na-liquidate na ang event.`;
    }

    if (settledAdv.length > 0) {
      return `Ayon sa ating verified database records, **walang nakabinbing reimbursement (abono)** sa kasalukuyan (₱0.00 pending). Ang mga naunang naitalang personal advance ay na-liquidate at ganap nang na-reimburse mula sa cashbox.\n\n💡 *Tip: Dahil walang pending abono, ang ating Net Position ay katumbas mismo ng buong Physical Cash on Hand.*`;
    }

    return 'Ayon sa ating verified database records, walang nakatalang pending reimbursement (abono) sa kasalukuyan.';
  }

  // 5. Shortages / Discrepancies
  if (q.includes('shortage') || q.includes('discrepanc') || q.includes('kulang')) {
    const shortages = transactions.filter((t) =>
      (t.category_name && t.category_name.toLowerCase().includes('shortage')) ||
      (t.title && t.title.toLowerCase().includes('shortage')) ||
      (t.description && t.description.toLowerCase().includes('shortage'))
    );
    if (shortages.length > 0) {
      const totalShortage = shortages.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
      const list = shortages.map((s) => `**${s.title}** (₱${Number(s.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })})`).join(', ');
      return `Mayroong naitalang kabuuang **₱${totalShortage.toLocaleString('en-PH', { minimumFractionDigits: 2 })} Cash Shortage** sa ating talaan (${list}) na pormal nang ini-log at dumaan sa beripikasyon.\n\n💡 *Tip: Ayon sa financial governance rules, ang bawat shortage discrepancy ay nangangailangan ng pormal na justification note mula sa Club Adviser.*`;
    }
    return 'Walang naitalang cash shortage o discrepancy sa ating kasalukuyang talaan. Maayos at balance ang lahat ng verified reconciliations.';
  }

  // 6. Inflows & Outflows / Totals
  if (q.includes('inflow') || q.includes('outflow') || q.includes('pasok') || q.includes('labas') || q.includes('gastos')) {
    return `Ang ating kabuuang Inflows ngayong semestre ay **₱${(summary.total_inflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}** at ang kabuuang Outflows ay **₱${(summary.total_outflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**. Ang ating Net Semester Balance ay **₱${((summary.total_inflows || 0) - (summary.total_outflows || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**.\n\n💡 *Tip: Ang lahat ng outflows ay dapat suportado ng resibo bago pumasok sa pinal na semester financial statement.*`;
  }

  // 7. Physical Cash on Hand specifically
  if (q.includes('physical cash') || q.includes('on hand') || q.includes('cashbox') || q.includes('cash box') || q.includes('hawak na pera')) {
    const netPos = summary.net_position != null ? summary.net_position : (summary.cash_on_hand || 0) - (summary.pending_reimbursements || 0);
    return `Ang kasalukuyang verified **Physical Cash on Hand** sa ating cashbox ay **₱${(summary.cash_on_hand || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**, na may Net Position na **₱${netPos.toLocaleString('en-PH', { minimumFractionDigits: 2 })}** matapos ibawas ang pending abono.\n\n💡 *Tip: Nananatili ang physical cashbox sa opisina ng Program Director at binibilang gamit ang 11 Philippine currency denominations tuwing reconciliation.*`;
  }

  // 8. Balance / Remaining / Cashbox
  if (q.includes('balance') || q.includes('remaining') || q.includes('reserve') || q.includes('vault') || q.includes('cash') || q.includes('net position')) {
    const netPos = summary.net_position != null ? summary.net_position : (summary.cash_on_hand || 0) - (summary.pending_reimbursements || 0);
    return `Ang kasalukuyang verified balance sa ating physical cashbox: **Physical Cash on Hand** ay **₱${(summary.cash_on_hand || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**, habang ang ating **Net Position** (matapos ibawas ang pending abono na ₱${(summary.pending_reimbursements || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}) ay **₱${netPos.toLocaleString('en-PH', { minimumFractionDigits: 2 })}**.`;
  }

  // 9. Matched transactions
  if (matchedTx && matchedTx.length > 0) {
    const matchedList = matchedTx.slice(0, 3).map((t) => `**${t.title}** (₱${Number(t.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })})`).join(', ');
    return `Ayon sa talaan kaugnay ng iyong katanungan, natagpuan ang mga sumusunod: ${matchedList}. Kabuuang Net Balance: ₱${((summary.total_inflows || 0) - (summary.total_outflows || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}.`;
  }

  // 10. General fallback overview
  const netPos = summary.net_position != null ? summary.net_position : (summary.cash_on_hand || 0) - (summary.pending_reimbursements || 0);
  return `Batay sa kasalukuyang FinLITE ledger: May verified Physical Cash on Hand na **₱${(summary.cash_on_hand || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}** sa ating cashbox, Net Position na **₱${netPos.toLocaleString('en-PH', { minimumFractionDigits: 2 })}**, kabuuang Inflows na **₱${(summary.total_inflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**, at Outflows na **₱${(summary.total_outflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}**.\n\n💡 *Tip: Maaari kang magtanong tungkol sa partikular na gastusin, abono, o receivables para sa mas detalyadong pagsusuri.*`;
}
