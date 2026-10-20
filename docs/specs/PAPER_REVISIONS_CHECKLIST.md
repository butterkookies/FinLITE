# FinLITE Academic Paper Revision Master Checklist
**Target Document:** `FinLITE_Document_Main.pdf` (ITE-SAD Documentation, Chapters 1 & 2)  
**Authoritative Reference:** FinLITE Production Codebase (`c:\Andrei.dev\Projects\FinLITE`)  
**Core Axiom:** **The System is Superior to the Paper** (The codebase reflects the verified, production-tested reality; the paper must be amended to achieve 100% compliancy with the system).  
**Explicit Scope Exclusions:**  
1. **Perish `@pdm.edu.ph`:** PDM provides no institutional email domain for students/officers. All references must be replaced with strict `@gmail.com` validation.  
2. **Abandon Business Proposals:** The paper must focus strictly and exclusively on financial tracking and post-activity liquidation reports.  

---

## 1. Global & Architectural Directives

- [ ] **1.1. Perish `@pdm.edu.ph` Domain References Everywhere**
  - **Location in Paper:** Section 1.4, Section 2.1, and any mentions of Google OAuth domain whitelisting.
  - **Revision:** Clarify that PDM does not have an institutional `@pdm.edu.ph` domain. FinLITE enforces strict `@gmail.com` validation for all users, including automated typo rejection (`@gmai.com`, `@gmail.co`, `@gamil.com`).
- [ ] **1.2. Retire the GCash Dual-Vault & Cash-Out Logging Wizard (Migration 023)**
  - **Location in Paper:** Specific Objective 1 (p. 7), Scope & Delimitation (pp. 9–10), Context Diagram (Figure 3, p. 16), and Diagram 0 (Figure 4, pp. 18–19).
  - **Revision:** Remove the "Digital GCash In-Transit Vault", "Cash-Out Logging Wizard", and "digital fractional coin buffer". Document the **Strict Single Physical Cashbox Model** (all organizational cash remains inside the metal cashbox in the Program Director's Room; digital student payments are treated strictly as *abono* / accounts payable liabilities reimbursed in physical cash).
- [ ] **1.3. Completely Abandon Pre-Activity Business Proposals**
  - **Location in Paper:** Specific Objective 3 (p. 7) and Module 6 (p. 11).
  - **Revision:** Ensure report generation is strictly scoped to **Financial Liquidation Reports** and receipt attachment sheets. Remove any lingering proposal text.
- [ ] **1.4. Incorporate the Debts & Receivables Subsystem (Migration 020)**
  - **Location in Paper:** Section 1.4 (Scope) and Diagram 0 (Figure 4).
  - **Revision:** Document the parent-child `debts_receivables` and `debt_payments` structure used to track student installment pre-orders (*hulog*) for batch merchandise (lanyards, t-shirts) and tournament entry fees.

---

## 2. End-to-End System Journey Checklist (Login to Report Generation)

### Phase 1: Authentication, Registration & User Lifecycle
- [ ] **2.1. Strict `@gmail.com` Validation Engine:**
  - Document that the system validates email syntax against a strict pattern (`validateGmail()`), immediately returning user-friendly error messages if non-Gmail domains or typos are entered.
- [ ] **2.2. Dual Authentication Modalities:**
  - Document that the system supports both **Google OAuth 2.0** and **Standard Email & Password** authentication with bcrypt hashing.
- [ ] **2.3. The Administrative Approval Gate (`/pending-approval`):**
  - Document that self-registered users cannot immediately access the ledger or dashboard. All new accounts default to `PENDING_APPROVAL` status and are locked to the `/pending-approval` waiting view until approved by a designated Administrator.
- [ ] **2.4. Super Admin Registration Notification (Currently Simulated / Pending Live Email Setup):**
  - Clarify that currently there is no live way to dispatch external emails (live SMTP is not yet active; notifications are logged/simulated in dev console via `lib/email/mailer.js`). The live email delivery pipeline to alert the Super Admin (`geronimoandreijohn.pdm@gmail.com`) of pending registrations is slated for subsequent implementation.
- [ ] **2.5. Dedicated Admin Console (`/admin`):**
  - Document the administrative dashboard featuring tabs for *Pending Approvals*, *Users Directory*, *Approved History*, *Rejected Requests*, and *Activity Logs*.
  - Document role assignment controls: `treasurer`, `auditor`, `president`, `adviser`, and `admin`.
- [ ] **2.6. Formal Rejection Workflow with Mandatory Justification:**
  - Document that rejecting an applicant requires the admin to log a specific `rejectionReason` that is permanently recorded.
- [ ] **2.7. Super Admin Immutable Lock:**
  - Document the security rule: primary Super Admin accounts are hard-coded/environment-protected against accidental suspension, role demotion, or deletion (HTTP 403 Forbidden).
- [ ] **2.8. Financial Audit Preservation Rule (Safe Deletion Check):**
  - Document that the system strictly blocks deletion (HTTP 409 Conflict) of any user who has logged transactions, cash reconciliations, or comments. Such accounts can only be `SUSPENDED`, preserving unbroken ledger auditability.
- [ ] **2.9. Password Reset & Account Recovery Subsystem:**
  - Document the secure, tokenized recovery workflow (`/forgot-password` and `/reset-password`) with automated email delivery.
- [ ] **2.10. Tiered API Rate Limiting Middleware (`lib/security/ratelimit.js`):**
  - Document in-memory IP rate limiting protecting the server: `AUTH` (5 req/min), `REPORTS` (10 req/min), `AI_CHAT` (15 req/min), and `DEFAULT_API` (60 req/min), returning standard `429 Too Many Requests` with `Retry-After` headers.
- [ ] **2.11. Sub-Millisecond Token RBAC Check:**
  - Document that `middleware.js` inspects `user.app_metadata` directly from the JWT session token (0ms database query) for sub-millisecond route gating before falling back to database lookups.

---

### Phase 2: Multi-Semester Scoping & Governance Setup
- [ ] **2.12. Multi-Semester Data Partitioning (`semesters` table):**
  - Document that all transactions, reconciliations, debts, and reports are dynamically scoped by academic semester (e.g., `sem-26-27-1` for AY 2026–2027 1st Semester).
- [ ] **2.13. Dynamic Semester Signatories (`semester_signatories` table):**
  - Document that officer and adviser rosters change across academic years. The system stores and loads semester-specific signatory metadata so reports dynamically adapt to the active leadership cohort.
- [ ] **2.14. Responsive App Shell & Theme Engine:**
  - Document the UI foundation: light/dark mode theming (`ThemeProvider.jsx`), collapsible desktop `FloatingSidebar.jsx`, and touch-friendly mobile `BottomNav.jsx`.

---

### Phase 3: Dashboard & Financial Metrics
- [ ] **2.15. Physical Cash on Hand Metric:**
  - Document that the cash on hand metric exclusively reflects legal tender secured inside the metal cashbox in the Program Director’s Room.
- [ ] **2.16. True Net Position Calculation:**
  - Document the governing financial formula displayed on the executive dashboard:
    $$\text{Net Position} = \text{Physical Cash on Hand} - \text{Pending Abono (Accounts Payable)}$$
- [ ] **2.17. Real-Time Stat Card Aggregations:**
  - Document live dashboard cards powered by the `get_financial_summary()` RPC: *Physical Cash on Hand*, *True Net Position*, *Total Inflows*, *Total Outflows*, *Pending Reimbursements (Abono)*, and *Uncollected Receivables*.

---

### Phase 4: Transaction Ledger & Financial Safeguards
- [ ] **2.18. Unified Transaction Modal:**
  - Document that all inflows and disbursements are captured through a unified modal (`NewTransactionModal.jsx`) rather than fragmented tools.
- [ ] **2.19. Real-Time Cashbox Overdraft Prevention (`validateOutflowBalance`):**
  - Document that before any cash `OUTFLOW` is saved, the system checks whether the amount exceeds current physical cash in the box. If insufficient, it blocks submission with an *"Insufficient Physical Cashbox Balance"* error. (*Abono* entries bypass this check because personal money was advanced).
- [ ] **2.20. Transaction Amount Ceiling & Sanitization:**
  - Document the hard input ceiling: `MAX_TRANSACTION_AMOUNT = ₱99,999.99` (5 integer digits + 2 decimals) and sanitization against pasted formatting defects.
- [ ] **2.21. Integer-Centavo Floating-Point Arithmetic (`currency.js`):**
  - Document that to eliminate IEEE-754 floating-point inaccuracies, all internal calculations convert currency to integer centavos (`toCentavos`, `fromCentavos`) before mathematical operations.
- [ ] **2.22. Multi-Receipt Attachment Support (3NF `transaction_receipts` table):**
  - Document that single transactions can store multiple receipt photos indexed by sort order.
- [ ] **2.23. Client-Side Image Cropping & Compression (`ReceiptCropModal.jsx`):**
  - Document built-in image cropping and client-side compression (`browser-image-compression`) prior to upload to the Supabase storage bucket, supporting both official commercial invoices and handwritten petty cash slips.
- [ ] **2.24. Post-Entry Receipt Attachment (`onAttachReceipt`):**
  - Document that officers can attach or append receipt photos to existing ledger records after initial encoding.
- [ ] **2.25. Responsive Dual-Layout Ledger Table:**
  - Document that `TransactionTable.jsx` features an auto-switching view: an extensive spreadsheet table for desktop screens and touch card feeds for mobile smartphones.

---

### Phase 5: Transaction Collaboration & Auditor Remarks
- [ ] **2.26. Transaction Comments & Remarks Drawer (3NF `transaction_comments` table):**
  - Document the collaborative audit drawer (`TransactionCommentsDrawer.jsx`). Auditors and officers can post timestamped remarks, clarifications, or audit inquiries on individual transactions without altering the financial record.

---

### Phase 6: Debts & Receivables Subsystem (Installment Tracking)
- [ ] **2.27. Parent-Child Debts Architecture (Migration 020):**
  - Document the schema: `debts_receivables` (parent tracking debtor name, contact, total amount, due date) and `debt_payments` (child tracking partial payment installments).
- [ ] **2.28. Installment Collection (*Hulog*) to Ledger Inflow Integration:**
  - Document that every partial debt payment automatically logs a corresponding `INFLOW` into the general cash ledger.
- [ ] **2.29. Debt State Machine:**
  - Document the lifecycle: `UNPAID` $\rightarrow$ `PARTIALLY_PAID` $\rightarrow$ `SETTLED` (or `CANCELLED`).

---

### Phase 7: Personal Advances ("Abono") & Installment Reimbursements
- [ ] **2.30. Parent-Child Advances Architecture (Migration 022):**
  - Document the schema: `advances_payable` (parent claim tracking claimant name, contact, total amount, receipt array) and `advance_disbursements` (child installment payouts).
- [ ] **2.31. Partial Cash Payout State Machine:**
  - Document how the Treasurer disburses partial cash repayments when cashbox liquidity is low, systematically logging each payment and updating residual creditor balances.
- [ ] **2.32. Spending Ceiling Warning & 7-Day Cutoff:**
  - Document the visual badge alerts for the ₱1,000.00 adviser approval ceiling and the 7-day post-activity submission deadline.
- [ ] **2.33. Inline Abono Settlement Modal:**
  - Document that officers can settle advances directly from the main ledger table via an inline settlement modal.

---

### Phase 8: Denomination Counter & Physical Reconciliation
- [ ] **2.34. 3NF Denomination Normalization (Migrations 012 & 013):**
  - Document the schema: `cash_reconciliations`, `denominations` (11 legal tender denominations including centavos), and `cash_reconciliation_items`.
- [ ] **2.35. Centavo Coin Breakdown:**
  - Document that the calculator counts Philippine legal tender centavos (`coins_cents`, ₱0.25) in addition to ₱1, ₱5, ₱10, and ₱20 coins.
- [ ] **2.36. Dual-Officer Verification Record:**
  - Document that physical cash reconciliations capture both `counted_by` (Treasurer) and `verified_by` (Auditor) IDs alongside variance calculations.
- [ ] **2.37. Governed Shortage/Overage Handling:**
  - Document the historical ₱161.00 cash shortage justification protocol and the unrecorded emergency petty cash overage buffer.

---

### Phase 9: Automated Immutable Audit Trail Engine
- [ ] **2.38. Database Trigger Engine (`process_financial_audit_event()`):**
  - Document the append-only `audit_logs` table (Migration 016) and PostgreSQL trigger that captures JSON snapshots and diffs on all inserts, updates, and deletes.
- [ ] **2.39. Audit Categorization Tiers:**
  - Document the audit drawer's classification: **Financial Operations** (transactions, reimbursements, reconciliations), **Sessions** (logins, logouts), and **Governance** (approvals, suspensions, role changes).

---

### Phase 10: Grounded Gemini AI Financial Co-Pilot
- [ ] **2.40. Google Generative AI Integration (`/api/chat`):**
  - Document the implementation using `@google/generative-ai` with automatic model fallback across Gemini 3.5 Flash, 3.5 Flash Lite, and 3.8 Flash.
- [ ] **2.41. Zero-Hallucination Grounding Engine:**
  - Document that user queries are answered strictly from real-time database context injected into the prompt: Cash on Hand, Net Position, Category Breakdown, Active Debts, Active Abono, and keyword-matched transactions.
- [ ] **2.42. Taglish/English Natural Language Support:**
  - Document conversational comprehension for colloquial queries (e.g., *"Magkano pa ang utang kay Ma'am Jatulan?"*).

---

### Phase 11: Report Generation & Institutional Standards
- [ ] **2.43. Official Institutional Banner Graphic:**
  - Document that the preview and generated `.docx` file embed the authentic PDM CCS & LITE institutional banner graphic (`/images/pdm-lite-header-banner.png`).
- [ ] **2.44. Formal Transmittal Memorandum to Co-curricular Coordinator:**
  - Document that liquidation reports include formal transmittal headers addressed to Co-curricular Affairs Coordinator **Ms. Ligaya H. Estrella**, with formal salutations and optional CC routing blocks (`cc: Co-Curricular`, `cc: Dean's Office`).
- [ ] **2.45. Interactive In-Browser 1:1 Preview Canvas (`DocumentPreviewModal.jsx`):**
  - Document the live HTML/CSS preview that faithfully replicates Word margins, typography, and borderless tables before exporting.
  - Document in-place editing of transmittal dates, salutations, period descriptions, and audit remarks.
- [ ] **2.46. Dynamic Signatory Inclusion Toggles:**
  - Document the ability to toggle individual signatories on/off (Treasurer, Auditor, Vice President, President, Dual Advisers, Program Director, Dean) and dynamically customize officer names/roles per semester.
- [ ] **2.47. Three Distinct Export Modes:**
  - Document export options:
    1. `APPEND` – Full liquidation report followed by 4-up receipt sheets.
    2. `NONE` – Pure financial report text and tables only.
    3. `STANDALONE` – Receipts attachment sheets only (for documentation re-submission).
- [ ] **2.48. Automated 2-Column 4-Up Receipt Attachment Sheets:**
  - Document that attached receipts are automatically compiled into a clean 2-column, 4-per-page grid with institutional headers and pagination (`createReceiptSheetsSection`).
- [ ] **2.49. Direct In-Browser Printing:**
  - Document the built-in Print button utilizing `@media print` CSS, allowing officers to print directly to physical paper or browser PDF without requiring Microsoft Word.

---

## 3. Specific Updates Required for Chapter 2 Diagrams

### 3.1. Figure 3: Context Diagram of FinLITE System (Page 16)
- [ ] **Remove GCash references:** Delete `Cash-Out Log` and replace `Vault Balance` with `Cashbox & Liabilities Status`.
- [ ] **Remove proposal references:** Ensure external document request is strictly labeled `Liquidation Report Request`.
- [ ] **Update user boundary:** Show administrative interactions originating from authenticated `@gmail.com` accounts passing through the Admin Approval Gate.

### 3.2. Figure 4: Diagram 0 of FinLITE System (Page 18)
- [ ] **Process 2 Re-labeling:** Change Process 2 from `Track Gcash` to **`Manage Debts & Receivables`**.
- [ ] **Data Store DB 2 Update:** Change `DB 2 Db_VaultLedger` to **`DB 2 Db_DebtsReceivables`**.
- [ ] **Process 3 Re-labeling:** Change Process 3 from isolated `Generate Vouchers` to **`Record Transactions & Receipts`**.
- [ ] **Data Store DB 3 Update:** Change `DB 3 Db_Vouchers` to **`DB 3 Db_TransactionsLedger`**.
- [ ] **Process 6 Scope:** Ensure Process 6 compiles **`Liquidation Reports & Receipt Sheets`** (abandoning business proposals).

---

## 4. Current System Limitations, Pending Features & Technical Debt
*(Key operational constraints and pending front-end enhancements to note in paper limitations and upcoming development)*

- [ ] **4.1. Live External Email Delivery (Pending Live Infrastructure):**
  - **Current Status:** Currently there is no live external way to dispatch emails. While email templates and transporter code exist in `lib/email/mailer.js`, SMTP/Resend credentials are not live in production; email dispatches (admin registration alerts, password resets) are simulated and logged to the developer console.
  - **To-Do / Paper Note:** Document that live email delivery pipeline is queued for subsequent infrastructure rollout.
- [x] **4.2. Dynamic Semester Roster Management (Admin UI & API Implementation):**
  - **Current Status:** Implemented! Added the **Signatory Roster** tab in `app/admin/page.jsx` backed by `/api/admin/signatories` and `/api/admin/signatories/clone`. Administrators can dynamically select academic terms, configure names and titles for Executive Officers, Club Advisers, and College Administration, toggle routing inclusion, clone between terms, and persist directly to `semester_signatories` with audit logs (`ROSTER_UPDATE`, `ROSTER_CLONE`).
- [ ] **4.3. Document Preview Viewport Scaling on Mobile Devices:**
  - **Current Status:** On smartphone screens, the document preview canvas (`DocumentPreviewModal.jsx` / `DocumentPreview.css`) stretches horizontally and does not scale down proportionally, breaking the realistic 1:1 paper aspect ratio.
  - **To-Do / Paper Note:** Needs a responsive viewport transform scaling fix (e.g., CSS `transform: scale()` or zoom fit container) to preserve authentic document proportions on mobile viewports.
- [x] **4.4. Signatory Roster Ordering & Name Formatting Standardization:**
  - **Current Status:** Standardized across database migrations (`014_semester_signatories.sql`, `026_seed_admin_signatories.sql`), the Admin Roster interface, and downstream report generators (`app/page.jsx`, `DocumentPreviewModal.jsx`, `app/api/reports/docx/route.js`).
  - **Standardized Hierarchy:**
    1. Prepared by: Treasurer (`CABANAG, ROSE MARIELLE P.`)
    2. Audited by: Auditor (`SARA, RISHAME P.`)
    3. Noted by: Vice President (`BAJAMUNDE, JHELLIAM T.`) & President (`GERONIMO, ANDREI JOHN P.`)
    4. Approved by: Dual Club Advisers (`MS. KIMBERLY DAWN JATULAN` & `MS. KRIZIA MAE GENOVIA`)
    5. Departmental & College Clearance: BSIT Program Director (`JOVYLYN ORTIZ-CESAR, MBA, MSIT`) & CCS Dean (`DR. EMRAIDA MARIE M. MANUCOM`).

---
*Checklist compiled and cross-verified against the FinLITE production codebase.*
