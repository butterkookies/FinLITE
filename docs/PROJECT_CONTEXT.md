# PROJECT CONTEXT

## 1.1 Project Title
**FinLITE: A Web-Based Financial Assistant System for the League of Information Technology Enthusiasts**

---

## 1.2 Organizational Setting & Operational Environment
The **League of Information Technology Enthusiasts (LITE)** is the recognized academic student organization for Bachelor of Science in Information Technology (BSIT) students at **Pambayang Dalubhasaan ng Marilao (PDM)**, located in Abangan Norte, Marilao, Bulacan. Operating under the College of Computer Studies (CCS), the organization is guided by faculty club advisers (**Ms. Kimberly Dawn Jatulan** and **Ms. Krizia Mae Genovia**, designated for AY 2026–2027) alongside an executive board comprising the President, Treasurer, Auditor, and activity committee heads.

Unlike enterprise corporate environments, LITE operates under unique collegiate constraints:
* **No Permanent Office Space**: LITE lacks a dedicated office or computing workstation. Operations, fee collections, and liquidation discussions occur in campus corridors, event booths, or the 2nd-floor faculty consultation room.
* **Physical Money Box Custody**: Physical cash is held in a small, lunchbox-sized metal cash box. For security, the box is stored inside a designated locked drawer in the faculty consultation room / adviser's desk and pulled out only during active collection shifts, official meetings, or campus events.
* **Hybrid Cash & Digital Inflows (GCash)**: While paper cash remains primary, booth visitors and contest participants frequently pay via digital mobile wallets (e.g., GCash). Because student organizations cannot open corporate merchant accounts, these funds temporarily pool into the Treasurer’s personal GCash, requiring manual cash-outs and physical replenishment of the cash box to prevent ledger drift.
* **Annual Turnover & Handoff Protocol**: Leadership transitions occur annually. Incoming officers do not start from a zero balance; they inherit the physical cash box and the carried-over balance stated in the signed Final Financial Report of the outgoing academic year. Crucially, **unreconciled discrepancies during handoff are strictly prohibited**—outgoing handlers are required to shoulder missing amounts out-of-pocket (*"abono"*) so that physical cash matches the report’s face value before the new administration accepts custody.

---

## 1.3 As-Is Process & Real-World Failure Modes
Currently, LITE relies on manual record-keeping without software or spreadsheets. Transactions are scribbled onto loose scraps of paper, notebooks, or logged informally across Messenger group chats. 

Drawing from extensive primary field experience across successive tenures (Auditor $\rightarrow$ Treasurer $\rightarrow$ President), six operational failure modes were established:

### 1. The Personal "Abono" & Reimbursement Dilemma (Faculty Advisers & Officers)
During Club Week, e-sports tourneys, programming competitions, seminars, and community outreaches, urgent purchases must be made for materials, ribbons, cert holders, sash, tokens, and food. **Frequently, not only student officers but the faculty class advisers shoulder these costs out of their own personal salaries and allowances.**
* Settling these claims follows a strict **receipt-gated cash reimbursement from the lunchbox**, disbursed by the Treasurer only after Auditor inspection.
* However, when paper receipts are crumpled, lost in bags, or submitted weeks late, advisers and officers face delayed reimbursements and personal out-of-pocket financial liability.

### 2. Documenting Non-Receipted Micro-Disbursements
Many necessary student activities incur expenses where official printed commercial receipts cannot be issued—such as jeepney and tricycle travel fares, neighborhood market craft supplies, or emergency printing.
* These items are currently verified through manual signed petty cash acknowledgment slips paired with photo/Messenger screenshots.
* Managing loose physical paper slips alongside commercial receipts easily leads to miscalculated sums during end-of-term auditing.

### 3. Personal GCash Co-mingling & Cash-Out Lag
When students pay registration or merchandise fees via GCash, funds sit in the Treasurer's personal account. If the Treasurer experiences delays in withdrawing physical cash or factoring in cash-out withdrawal fees, a temporary disconnect arises between digital records and physical cash inside the lunchbox.

### 4. Informal Budget Authorizations
Activity budgets for events (e.g., Club Week booth supplies, certificates, judge tokens) are typically authorized through verbal or Messenger chat consultations between the Executive Committee and Club Advisers. The absence of a centralized, tracked approval log makes it difficult to verify whether an incurred expense stayed within the verbally agreed limit.

### 5. Cash Variances and Shortage Declarations
Physical cash in the lunchbox occasionally experiences minor variances against logged entries due to untraceable loose coin change or small emergency disbursements. 
* As demonstrated in the AY 2025–2026 liquidation, a minor **₱161.00 Cash Shortage** had to be formally justified and declared as an expense line item under Adviser approval.
* When discrepancies exceed minor thresholds, officers must cover the difference out-of-pocket (*abono*). The lack of daily automated reconciliation creates stress when pinpointing which transaction caused the deficit.

### 6. The End-of-Term Institutional Routing Bottleneck
At the close of each term, LITE must prepare a comprehensive formal liquidation report for the **CCS Program Director (Jovylyn Ortiz-Cesar, MBA, MSIT)** and the **Dean (Dr. Emraida Marie M. Manucom)**.
* The submission requires **100% compliance with institutional layout standards** (Times New Roman typography, exact borderless table hierarchies, and formal signatory spacing).
* Once generated, the document must be printed on hard-copy institutional bond paper and sequentially routed for physical wet-ink signatures:
  $$\text{Treasurer} \longrightarrow \text{Auditor} \longrightarrow \text{President} \longrightarrow \text{Advisers} \longrightarrow \text{Director} \longrightarrow \text{Dean}$$
* Minor math errors, formula mismatches, or layout deviations result in immediate administrative rejection, delaying organizational clearance and graduation sign-offs.

---

## 1.4 The Paradigm Shift: Why a "Financial Assistant" Rather than an ERP
Academic panels frequently question whether a student organization needs a full "Management System." Enterprise ERPs and heavy accounting systems fail in student organizations because:
* They require formal double-entry bookkeeping, multi-step procurement requisitions, and certified accounting knowledge that volunteer student officers do not possess.
* High data-entry friction causes users to abandon the system and revert to paper.

**FinLITE intentionally adopts the "Financial Assistant System" paradigm.** It is engineered not as an administrative barrier, but as a practical **operational co-pilot**:
* It automates the cognitive and mathematical burden (instant cash-on-hand tracking, automated subtotaling, denomination breakdown).
* It provides dual-cadence outputs: **Quick Event Liquidations** (to immediately refund advisers and officers) and **Consolidated Semester Statements**.
* It offers an intuitive natural-language interface grounded in verified database tables, allowing officers to check standings instantaneously.

---

## 1.5 System Capabilities Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                   FinLITE Financial Assistant System                   │
├──────────────────┬──────────────────┬──────────────────┬───────────────┤
│  1. Gated Access │ 2. Core Ledger   │ 3. Grounded AI   │ 4. Automated  │
│  & Governance    │ & Reconciliation │ Financial Co-pilot│ Institutional │
│                  │                  │                  │ Report Exporter│
│ • Google OAuth   │ • Inflows/Outflows│ • Natural queries│ • Exact PDM   │
│ • Institutional  │ • Abono/Refunds  │ • Taglish support│   CCS template│
│   Email Whitelist│ • Physical cash  │ • Quick-action   │ • Live HTML   │
│ • Role-Based     │   denomination   │   prompt chips   │   preview     │
│   Segregation    │ • Shortage audit │ • 100% DB-bound  │ • 1-click DOCX│
│   (Auditor vs    │ • GCash cashout  │   (Zero Halluc.) │   for wet-ink │
│    Treasurer)    │   tracking       │                  │   routing     │
└──────────────────┴──────────────────┴──────────────────┴───────────────┘
```

1. **Role-Gated Security via Google OAuth**:
   * Restricts system entry to an authorized whitelist of PDM Google accounts representing active LITE officers and advisers.
   * Enforces financial **Segregation of Duties**: Treasurers log transactions, record GCash conversions, and process reimbursements; the Auditor independently verifies receipts, counts cash box denominations, and flags variances; Advisers and the President monitor liquidity and authorize liquidations.

2. **Full-Spectrum Student Org Transaction Tracking**:
   * **Inflows**: Booth sales, e-sports entries, programming contest registrations, donations, and carryover funds.
   * **Disbursements**: Itemized event expenses tagged with vendor receipt metadata.
   * **Personal Advances & Reimbursement Queue**: Formally tracks out-of-pocket spending by **faculty advisers and officers**, keeping an auditable record until the cash box refund is officially disbursed.
   * **Non-Receipted Expense Slips**: Attaches acknowledgment metadata and photographic proof for informal transit and micro-expenses.

3. **Physical Denomination Counter & Shortage Auditor**:
   * Interactive bill/coin breakdown (₱1,000 down to ₱1) verifying the physical lunchbox contents against ledger cash on hand.
   * Prompts officers with clear governance options when a variance occurs: log minor variance as a justified **"Cash Shortage"** or record an **"Abono"** reimbursement.

4. **Grounded AI Financial Assistant (Zero-Hallucination Query Engine)**:
   * Natural language query interface supporting English and conversational Taglish (e.g., *"Magkano pa ang hindi nare-reimburse kay Ma'am Jatulan?"* or *"What was our net income for the E-sports tournament?"*).
   * **Deterministic Grounding**: The co-pilot only queries and aggregates verified database records, preventing AI fabrication of financial totals.
   * **Quick Action Chips**: Clickable prompt shortcuts (e.g., *[Cash on Hand Breakdown]*, *[Pending Reimbursements]*, *[Club Week Net Totals]*) for frictionless mobile use.

5. **Live Pre-formatted Document Preview & 1:1 DOCX Export**:
   * Renders a live in-browser preview replicating the exact institutional layout required by the College of Computer Studies.
   * Generates a fully populated **1:1 Microsoft Word (`.docx`) Master Report**, including transmittal metadata, itemized schedules, reconciliation statements, and signatory lines ready for institutional printing and physical wet-ink routing.

---

## 1.6 Academic & Practical Impact
* **Faculty Class Advisers**: Eliminates personal financial exposure from unliquidated advances and removes the administrative burden of manually re-checking math before signing.
* **Student Treasurers & Auditors**: Prevents ledger chaos, personal bag clutter, and audit stress through automated arithmetic and structured verification.
* **Organizational Continuity**: Safeguards LITE’s financial records from year to year, ensuring new executive boards inherit complete historical context rather than a mysterious lunchbox.
* **College Administration (CCS Dean & Director)**: Guarantees 100% compliance with institutional liquidation guidelines, eliminating delayed submissions.
