/**
 * FinLITE: Automated Google Form Generator for LITE Club Advisers
 * 
 * INSTRUCTIONS:
 * 1. Go to https://script.google.com
 * 2. Click "New Project"
 * 3. Replace all code in the editor with this script
 * 4. Click "Run" (make sure function selected is "createFinLITEAdviserForm")
 * 5. Review permissions (allow access to Google Drive/Forms for your account)
 * 6. Check the Execution Log at the bottom to get your Form Edit URL and Shareable Link!
 */

function createFinLITEAdviserForm() {
  var form = FormApp.create('FinLITE: LITE Financial Operations & Policy Assessment (Club Advisers)');
  
  var description = 
    "Good day, Ma'am Kimberly and Ma'am Krizia!\n\n" +
    "As part of our System Analysis and Design (IT31-SAD) project, our team is developing FinLITE: A Web-Based Financial Assistant System tailored specifically for the League of Information Technology Enthusiasts (LITE).\n\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "⚠️ WHY WE ARE BUILDING FINLITE FOR YOU:\n" +
    "Managing student organization finances is often one of the most stressful responsibilities in student leadership—and historically, faculty advisers and student officers end up carrying unfair personal burdens:\n\n" +
    "1. Advancing Personal Money ('Abono') — Funding urgent tokens, student meals, and event materials out-of-pocket, only to wait weeks for reimbursement or lose track of crumpled paper receipts.\n" +
    "2. Digital Payment Bottlenecks (GCash) — Digital collections pooling into personal mobile wallets, mixing with personal funds and leaving cash-out withdrawal fees unaccounted for.\n" +
    "3. The High-Stress Liquidation Cycle — A single decimal discrepancy or misaligned table margin causing multi-page reports to be rejected by the Department or Dean, forcing you to reprint and chase 6 physical signatures all over again.\n\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "💡 OUR VISION FOR FINLITE (KEY CAPABILITIES):\n" +
    "FinLITE is not a complicated corporate accounting tool. It is an agile, user-friendly digital financial co-pilot built around how PDM actually operates:\n\n" +
    "✦ Real-Time Treasury Transparency (Centralized Fund Tracking)\n" +
    "A unified digital ledger that records all inflows, registration fees, and micro-disbursements in real time—giving advisers 24/7 visibility over cash balances and eliminating lost, loose paper logs.\n\n" +
    "✦ Zero Lost 'Abono' (Automated Reimbursement Queue)\n" +
    "A transparent Accounts Payable queue that clearly tracks who advanced personal money, stores photo attachments of receipts/slips, and ensures prompt, verified cashbox reimbursement.\n\n" +
    "✦ Dual Cash & GCash Liquidation Tracking\n" +
    "Monitors both physical cashbox reserves and digital mobile wallet inflows with tracked cash-out fees, completely eliminating mental math errors.\n\n" +
    "✦ 1-Click Official Institutional Reports\n" +
    "Instantly compiles verified records into the exact Microsoft Word (.docx) layout mandated by the College of Computer Studies (Times New Roman, formal transmittal headers, borderless tables, and the 6-stage wet-ink signatory block).\n\n" +
    "✦ Protected Annual Leadership Turnover\n" +
    "An interactive denomination counter (₱1,000 down to ₱1) that ensures a clean, certified balance handoff from outgoing to incoming officers without surprise deficits or stressful officer liabilities.\n\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "Your answers to this questionnaire will establish the official institutional policies and system rules for FinLITE. Thank you very much for your continuous mentorship and guidance!\n\n" +
    "👥 Proponents (BSIT-31A):\n" +
    "• Andrei John P. Geronimo\n" +
    "• Christian Rey C. Kasilag\n" +
    "• Emanuel Malbarosa\n" +
    "• Ervin James Ramos";

  form.setDescription(description);
  form.setAllowResponseEdits(true);
  form.setCollectEmail(true);

  // ==========================================
  // SECTION 1: Personal Advances ("Abono")
  // ==========================================
  var sec1 = form.addPageBreakItem();
  sec1.setTitle('SECTION 1: Personal Advances ("Abono") & Reimbursement Governance');
  sec1.setHelpText('Objective: Establish clear rules for out-of-pocket spending, acceptable proof, and payment turnaround.');

  form.addMultipleChoiceItem()
    .setTitle('1. How often do you or student officers personally advance personal money ("abono") to fund urgent club expenses (e.g., tokens, rush printing, decor, student meals)?')
    .setChoiceValues([
      'Almost every major activity / event',
      'Occasionally (only during big events like Club Week or Seminars)',
      'Rarely (only during unexpected emergencies)',
      'Never'
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('2. When personal money is advanced for club activities, what is the ideal turnaround time for receiving a full cash reimbursement?')
    .setChoiceValues([
      'Immediately / within the day the event concludes',
      'Within 3 to 7 days',
      'Within 1 to 2 weeks',
      'At the end of the semester during final liquidation'
    ])
    .showOtherOption(true)
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('3. What is the most frustrating part of advancing personal funds?')
    .setHelpText('Select all that apply')
    .setChoiceValues([
      'Waiting for ticket/merch collections to catch up before being paid back',
      'Misplaced, crumpled, or faded paper receipts',
      'Forgetting small out-of-pocket items (e.g., tricycle fares, emergency tape, rush prints)',
      'Lack of a clear, transparent list showing who is currently owed what'
    ])
    .showOtherOption(true)
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('4. For small expenses where official commercial receipts are impossible to obtain (e.g., tricycle/jeepney fares, local public market craft stalls, rush computer shop printing), what proof is acceptable for reimbursement?')
    .setChoiceValues([
      'A signed handwritten petty cash acknowledgment slip (amount, date, route/purpose)',
      'A photo of items/fare ticket sent via Messenger',
      'Both a signed acknowledgment slip AND a clear photo attachment',
      'Verbal confirmation from the accompanying officer or committee head'
    ])
    .showOtherOption(true)
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('5. Is there a maximum time limit (grace period) for submitting receipts or petty cash slips for reimbursement?')
    .setChoiceValues([
      'Within 7 days after the activity',
      'Within 14 days after the activity',
      'Within 30 days',
      'Anytime before the semester\'s final liquidation cutoff'
    ])
    .showOtherOption(true)
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('6. What is the spending limit where an officer or adviser MUST have formal prior written/chat approval before making an out-of-pocket purchase?')
    .setChoiceValues([
      'Any expense above ₱500',
      'Any expense above ₱1,000',
      'Any expense above ₱3,000',
      'No strict monetary limit as long as it aligns with the event\'s planned objectives'
    ])
    .showOtherOption(true)
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('7. If an approved reimbursement claim is larger than the liquid cash currently inside the cashbox (e.g., claim is ₱3,000, but the cashbox only has ₱1,200), how should FinLITE handle it?')
    .setChoiceValues([
      'Allow partial payout (pay ₱1,200 now, track the remaining ₱1,800 as pending until more dues are collected)',
      'Hold the entire payout until the cashbox has enough total cash to pay in full'
    ])
    .showOtherOption(true)
    .setRequired(true);

  // ==========================================
  // SECTION 2: Physical Cashbox Custody
  // ==========================================
  var sec2 = form.addPageBreakItem();
  sec2.setTitle('SECTION 2: Physical Cashbox Custody & Event Logistics');
  sec2.setHelpText('Objective: Set boundaries for the physical cashbox, temporary holding, and decentralized collections.');

  form.addMultipleChoiceItem()
    .setTitle('8. Where should the physical small metal cashbox be stored when not in active use?')
    .setChoiceValues([
      'Locked drawer inside the 2nd-floor faculty room / adviser\'s desk',
      'In the personal custody of the LITE Treasurer',
      'In the personal custody of the LITE President'
    ])
    .showOtherOption(true)
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('9. During weekend events or off-campus supply runs (e.g., buying bulk materials in Divisoria or Manila when the faculty room is closed), how should cash be handled?')
    .setChoiceValues([
      'The cashbox may be temporarily checked out and brought along by the Treasurer / Adviser',
      'Cashbox stays in school; off-campus purchases must be funded via personal "abono" and reimbursed on Monday',
      'An estimated cash advance may be withdrawn from the cashbox beforehand and liquidated upon return'
    ])
    .showOtherOption(true)
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('10. LITE has 4 Year-Level Representatives and 9 Sub-Committees who collect dues/registration fees. What is the rule for turning over collected cash to the Treasurer?')
    .setChoiceValues([
      'Must remit all collected cash on the same day before leaving campus',
      'Allowed to hold collections for up to 24–48 hours before turning over to the cashbox',
      'Allowed to remit weekly or at the end of the collection drive'
    ])
    .showOtherOption(true)
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('11. Are Year-Level Representatives or Sub-Committee heads allowed to spend unremitted collections directly for emergency booth supplies?')
    .setChoiceValues([
      'Strictly NO. All collections must be remitted intact into the cashbox first; expenses must be logged separately',
      'YES, provided they immediately submit an official receipt or slip for the deducted amount',
      'Allowed ONLY with prior Messenger chat clearance from the Treasurer or Adviser'
    ])
    .showOtherOption(true)
    .setRequired(true);

  // ==========================================
  // SECTION 3: Digital Payments (GCash)
  // ==========================================
  var sec3 = form.addPageBreakItem();
  sec3.setTitle('SECTION 3: Digital Payments (GCash) & Fee Handling');
  sec3.setHelpText('Objective: Define rules for mobile payments collected through personal accounts.');

  form.addMultipleChoiceItem()
    .setTitle('12. Since student organizations cannot have official corporate GCash accounts, how are digital collections currently managed?')
    .setChoiceValues([
      'Personal GCash of one or both Club Advisers',
      'Personal GCash of the Treasurer or on-duty officer',
      'A dedicated personal SIM card / mobile wallet managed solely for LITE transactions'
    ])
    .showOtherOption(true)
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('13. When GCash funds are cashed out via ATM, convenience store, or remittance center, how should third-party withdrawal fees (₱15–₱20) be recorded?')
    .setChoiceValues([
      'Recorded as an official club operating expense line item ("Bank / Cash-Out Fee")',
      'Shouldered personally by the person whose GCash account was used',
      'Deducted from the net cash remitted into the cashbox'
    ])
    .showOtherOption(true)
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('14. Since cash-out outlets only dispense paper bills (multiples of ₱100), how should leftover coins or odd balances (e.g., ₱65.50) in the GCash account be treated?')
    .setChoiceValues([
      'Remain in the digital wallet as a tracked "Digital GCash Reserve" until the next cash-out',
      'Transferred/settled via digital balance transfer to the Treasurer\'s personal account'
    ])
    .showOtherOption(true)
    .setRequired(true);

  // ==========================================
  // SECTION 4: Merchandise, Dues, and Discrepancies
  // ==========================================
  var sec4 = form.addPageBreakItem();
  sec4.setTitle('SECTION 4: Merchandise, Dues, and Discrepancy Policies');
  sec4.setHelpText('Objective: Formalize rules regarding deferred payments, cash shortages, and surpluses.');

  form.addMultipleChoiceItem()
    .setTitle('15. Regarding organization merchandise (e.g., LITE Org Shirts, Lanyards) and ticketed event entries, what is the official policy on deferred payments ("utang" or down payments)?')
    .setChoiceValues([
      'Strictly 100% upfront payment required before ordering or claiming',
      'Down payment allowed (e.g., 50% upon order), but full balance must be settled before item release',
      'Installment / promissory note allowed (students may claim items, paying balances before final exams)',
      'Handled on a case-by-case basis depending on student financial circumstances'
    ])
    .showOtherOption(true)
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('16. In past academic years, have uncollected student balances or unpaid merchandise orders caused deficits or delayed final liquidation reports?')
    .setChoiceValues([
      'Yes, it has been a recurring headache to track and collect',
      'Occasionally, but usually resolved before end-of-term',
      'No, student collections have always been 100% settled on time'
    ])
    .showOtherOption(true)
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('17. If the physical cash count in the cashbox is LOWER than the computed ledger balance during end-of-term audit, what is the governing rule?')
    .setChoiceValues([
      'Minor untraceable shortages (e.g., under ₱200 from loose coin change) may be officially declared in the report as "Cash Shortage" with adviser approval',
      'The responsible officer (Treasurer/Collector) must shoulder ("abono") the missing amount in full',
      'All spending and activities must freeze until the discrepancy is traced and resolved'
    ])
    .showOtherOption(true)
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('18. If the physical cash count in the cashbox is HIGHER than the computed ledger balance (e.g., +₱150 excess from students not claiming change), how should this be recorded?')
    .setChoiceValues([
      'Declared officially as "Miscellaneous Income / Cash Overage" in the financial report',
      'Retained in the cashbox as an unrecorded emergency petty cash buffer',
      'Credited toward the next academic year\'s opening carryover surplus'
    ])
    .showOtherOption(true)
    .setRequired(true);

  // ==========================================
  // SECTION 5: Approval Governance, Revisions & Turnover
  // ==========================================
  var sec5 = form.addPageBreakItem();
  sec5.setTitle('SECTION 5: Approval Governance, Revisions & Annual Turnover');
  sec5.setHelpText('Objective: Clarify multi-adviser approvals, routing rejections, and year-end carryovers.');

  form.addMultipleChoiceItem()
    .setTitle('19. For high-level system approvals (e.g., authorizing a cash shortage, approving high-value purchases, or endorsing the final liquidation report), what is the approval requirement?')
    .setChoiceValues([
      'BOTH Club Advisers must jointly approve (Dual Sign-Off)',
      'EITHER Club Adviser may approve (Single Sign-Off is sufficient)',
      'Lead Adviser approves first, Second Adviser endorses if available'
    ])
    .showOtherOption(true)
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('20. If the BSIT Program Director or CCS Dean returns a printed liquidation report for revision due to a minor error or calculation mismatch, how should FinLITE handle corrections?')
    .setChoiceValues([
      'Unlock the existing report so officers can fix the specific line item and re-export immediately',
      'Keep the original report locked for audit history, and create an official "Amended Version"'
    ])
    .showOtherOption(true)
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('21. At the end of the academic year, if the organization has legitimate, unpaid reimbursement claims (e.g., dues collections were delayed), what is the policy during turnover to the incoming officers?')
    .setChoiceValues([
      'The unpaid balance carries over to the next academic year as a certified "Accounts Payable" liability to be paid from next term\'s dues',
      'Outgoing officers must settle all pending claims before turnover; no unpaid debts can be passed on'
    ])
    .showOtherOption(true)
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('22. In what format do you prefer the final liquidation report to be reviewed and submitted?')
    .setChoiceValues([
      'Physical printed copy on institutional bond paper routed for wet-ink signatures (Treasurer -> Auditor -> President -> Advisers -> Director -> Dean)',
      'Digital draft review first (via FinLITE web preview or DOCX share), followed by physical printing for final wet-ink signatures',
      'Purely digital PDF submission with electronic signatures'
    ])
    .showOtherOption(true)
    .setRequired(true);

  // ==========================================
  // SECTION 6: Adviser Feedback & Recommendations
  // ==========================================
  var sec6 = form.addPageBreakItem();
  sec6.setTitle('SECTION 6: Adviser Feedback & Priority Wishlist');
  sec6.setHelpText('Objective: Capture personalized advice and priority features directly from the advisers.');

  form.addParagraphTextItem()
    .setTitle('23. What is the #1 recurring problem or pet peeve you have experienced regarding LITE financial reports, receipts, or liquidation in past semesters?')
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('24. Do you have any specific suggestions or features you would love to see in FinLITE to make your role as Club Advisers easier and stress-free?')
    .setRequired(false);

  Logger.log('====================================================');
  Logger.log('SUCCESS! FinLITE Adviser Form Created.');
  Logger.log('Edit URL (Form Editor): ' + form.getEditUrl());
  Logger.log('Published URL (Send to Advisers): ' + form.getPublishedUrl());
  Logger.log('====================================================');
}
