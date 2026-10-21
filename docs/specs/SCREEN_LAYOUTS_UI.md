# 2.3. Project Structure
## 2.3.1 Screen Layout/UI

The project design shows the different forms that can be seen in the graphical user interface (GUI) of the system.

---

### Figure 14. User Sign In Page
![Figure 14. User Sign In Page](../interfaces/Screenshot%202026-10-21%20051516.png)

This figure shows the authentication and sign-in page of the FinLITE platform, allowing registered student officers and faculty club advisers to access their operational workspace. It features a branded left overview panel emphasizing financial clarity and institutional accountability for Pambayang Dalubhasaan ng Marilao College of Computer Studies, alongside a right-side credential card containing a One-Tap Google Workspace OAuth sign-in button, input fields for institutional Gmail and password, a "Forgot password?" retrieval link, a "Sign In" button, and a "Request Access" registration link. Also here, the user can authenticate into the platform using their Google credentials or email and password, initiate secure password recovery, or navigate to the registration request form.

---

### Figure 15. Google OAuth 2.0 Single Sign-On Modal
![Figure 15. Google OAuth 2.0 Single Sign-On Modal](../interfaces/Screenshot%202026-10-21%20051536.png)

This figure shows the institutional Google Identity Services authentication modal overlaying the FinLITE login screen. It displays active Google accounts associated with the device, complete with user profile avatars, full names, and registered Gmail addresses, providing a one-click Single Sign-On (SSO) mechanism. Also here, the officer can select their authorized Google account to achieve sub-millisecond, cryptographic authentication into the system without entering manual password strings.

---

### Figure 16. FinLITE Executive Dashboard
![Figure 16. FinLITE Executive Dashboard](../interfaces/Screenshot%202026-10-21%20055125.png)

This figure shows the main executive dashboard of the FinLITE system, serving as the central operational hub for monitoring organizational liquidity and daily financial activities. It features quick-action header buttons to record transactions, launch the cashbox audit keypad, compile liquidation reports, or open the AI Co-Pilot, accompanied by six top-level financial summary cards displaying Cashbox Physical Cash, Net Position, Student Receivables, Total Inflows, Total Outflows, and Personal Advances (Abono), alongside a real-time searchable Financial Ledger table with category filters and audit status indicators. Also here, the officer can monitor overall treasury reserves, filter transactions across ledger categories, switch between spreadsheet and card views, and inspect recent financial entries.

---

### Figure 17. Academic Term & Semester Selector
![Figure 17. Academic Term & Semester Selector](../interfaces/Screenshot%202026-10-21%20055148.png)

This figure shows the academic term and semester selection dropdown popover integrated into the application sidebar. It displays a chronological list of academic periods, including AY 2027–2028 1st Semester, AY 2026–2027 2nd Semester, AY 2026–2027 1st Semester, and the currently active AY 2025–2026 2nd Semester, alongside a "+ Start New Semester" action button. Also here, the officer can switch the active working semester to partition financial transactions, reconciliations, and debts, or initialize a new academic tenure with carried-over surplus balances.

---

### Figure 18. Cash Box Denomination Counter & Physical Reconciliation
![Figure 18. Cash Box Denomination Counter & Physical Reconciliation](../interfaces/Screenshot%202026-10-21%20055201.png)

This figure shows the physical cash denomination counter and variance audit modal used during dual-officer cashbox reconciliations. It displays the active session timestamp, live calculated metrics for Counted Cash, Book Ledger balance, and computed Variance, an automated surplus/shortage alert card with an Adviser Justification input field, and an interactive digital keypad covering all 11 legal tender Philippine currency units divided into Paper Banknotes (₱1,000, ₱500, ₱200, ₱100, ₱50, ₱20) and Coins & Small Change (₱20, ₱10, ₱5, ₱1, ₱0.25 Cents). Also here, the Treasurer and Auditor can enter physical piece-counts for each currency denomination, inspect real-time variance calculations, draft cash shortage justifications for adviser sign-off, and commit verified audit counts to the database.

---

### Figure 19. Out-of-Pocket Advances (Abono) Queue
![Figure 19. Out-of-Pocket Advances (Abono) Queue](../interfaces/Screenshot%202026-10-21%20055211.png)

This figure shows the Out-of-Pocket Advances (Accounts Payable) management modal designed to regulate personal expenditures incurred by officers and advisers for official club activities. It features summary metric cards for Total Advances, Total Reimbursed, and Pending Liabilities, alongside status filter tabs (All, Pending, Partial), a search bar, a "+ New Advance" button, and itemized advance cards displaying claimant names, claim status badges, submission dates, expense particulars, visual progress bars of reimbursed amounts, and "Disburse" payout action buttons. Also here, the officer can track outstanding club liabilities, file new advance claims with attached receipt images, monitor repayment progress, and disburse cashbox reimbursements.

---

### Figure 20. Accounts Receivable & Debts Subsystem
![Figure 20. Accounts Receivable & Debts Subsystem](../interfaces/Screenshot%202026-10-21%20055221.png)

This figure shows the Accounts Receivable & Debts tracking modal used to manage uncollected student merchandise pre-orders and tournament entry fees. It displays summary metrics for Total Receivables, Total Collected, and Uncollected Balance, along with filter tabs (All, Unpaid, Partial), a debtor search input, a "+ New Debt" button, and detailed receivable cards indicating student debtor names, payment status badges, purpose descriptions, remaining balances, and a "Collect" payment recording button. Also here, the Treasurer can log student installment pre-orders, search debtor accounts, track partial payments, and record cash collections directly into the ledger.

---

### Figure 21. 1:1 Official PDM LITE Institutional Report Preview
![Figure 21. 1:1 Official PDM LITE Institutional Report Preview](../interfaces/Screenshot%202026-10-21%20055237.png)

This figure shows the 1:1 pixel-accurate live preview of the formal institutional financial liquidation report in the browser. It renders the official PDM and LITE header letterhead banner, transmittal date, formal addressee block to Co-curricular Affairs Coordinator Ms. Ligaya H. Estrella, respectful submission statement, and the preliminary officer signatory block (Treasurer, Auditor, President) with individual "Include" toggle checkboxes. Also here, the officer can inspect the exact physical page layout of the liquidation packet, make in-place text edits, toggle required administrative signatures, and trigger export to Microsoft Word (.docx) or PDF.

---

### Figure 22. Report Settings & Metadata Configuration Drawer
![Figure 22. Report Settings & Metadata Configuration Drawer](../interfaces/Screenshot%202026-10-21%20055249.png)

This figure shows the slide-out Report Settings and Metadata configuration drawer for institutional liquidation reports. It provides input fields for Semester, Academic Year, Event Title, Coordinator Name, Salutation, and Beginning Balance, alongside radio selectors for Document Export Scope (Financial Report Only, Financial Report + Attached Receipts, Receipts Attachment Only), routing checkboxes, footer page numbering styles, and an interactive Signatories Matrix with checkboxes to include or exclude specific officers. Also here, the officer can adjust institutional transmittal metadata, select document compilation scopes, customize routing blocks, and save template preferences before generating reports.

---

### Figure 23. Grounded AI Financial Co-Pilot Conversational Drawer
![Figure 23. Grounded AI Financial Co-Pilot Conversational Drawer](../interfaces/Screenshot%202026-10-21%20055330.png)

This figure shows the conversational AI Financial Co-Pilot drawer interface, accessible across all officer dashboards. It displays a bilingual welcome greeting, clickable Quick Questions prompt chips (such as checking pending reimbursements or cash on hand), a conversational thread featuring user queries in Taglish ("Sino ang mga may outstanding receivables o pautang?"), and an AI response containing exact debtor names, amounts, notes, and custodial cashbox reminders grounded directly in verified database records, along with a prompt input bar. Also here, the officer can submit natural-language financial inquiries in Taglish or English, inspect verified budget summaries, and receive instant, zero-hallucination treasury insights.

---

### Figure 24. Financial Audit Trail & Tamper-Evident Ledger
![Figure 24. Financial Audit Trail & Tamper-Evident Ledger](../interfaces/Screenshot%202026-10-21%20055349.png)

This figure shows the Financial Audit Trail sliding drawer, providing an immutable record of system actions in compliance with PDM CCS student council audit standards. It displays a search bar, category filter pills (All Records, Transactions, Abono Reimbursements, Cash Counts, Governance & Roles), and an append-only chronological feed showing action badges (such as AUTH_LOGIN, AUTH_LOGOUT, and Outflow Updated), timestamps, acting officer profile badges, and collapsible "View Changes" diff viewers, anchored by an immutability guarantee notice. Also here, the Auditor and Club Advisers can inspect chronological system modifications, search events by user or action type, and audit historical record changes.

---

### Figure 25. Admin Console: Pending Registration Approvals
![Figure 25. Admin Console: Pending Registration Approvals](../interfaces/Screenshot%202026-10-21%20055359.png)

This figure shows the Pending Approvals tab within the FinLITE Admin Console (/admin), used for reviewing new applicant registrations. It features summary navigation tabs (Pending Approvals, Active Officers, Signatory Roster, Activity & Access Logs, Approved, Declined) and an approval queue displaying applicant cards with submission timestamps, emails, contact numbers, authentication provider badges, assigned role dropdowns, and "Decline" / "Approve Access" decision buttons. Also here, the Club Adviser can review pending officer registrations, designate approved roles, reject invalid accounts with written justification, and grant platform access.

---

### Figure 26. Admin Console: Active Officers & Access Controls
![Figure 26. Admin Console: Active Officers & Access Controls](../interfaces/Screenshot%202026-10-21%20055411.png)

This figure shows the Active Officers tab of the Admin Console, displaying the roster of authorized user accounts. It presents officer profile avatars, full names, email addresses, contact numbers, Super Admin badges, assigned role dropdowns, granular permission capability pills (Inflow, Outflow, Audit, Recon, Edit), account status badges (Active, Suspended), "Actions" modals, "Suspend" / "Reactivate" buttons, and an immutable lock indicator on the primary master administrator account. Also here, the Club Adviser can reassign officer roles, review custom capability tags, suspend or reactivate accounts, and manage user permissions.

---

### Figure 27. Admin Console: Dynamic Signatory Roster
![Figure 27. Admin Console: Dynamic Signatory Roster](../interfaces/Screenshot%202026-10-21%20055427.png)

This figure shows the Signatory Roster configuration interface within the Admin Console. It features a target academic term selector, "Clone from Term" button, "Save Roster" button, and structured administrative tiers including Executive Board Signatories (President, Vice President, Treasurer, Auditor), Faculty Club Advisers, and College Leadership Signatories, complete with editable input fields for official full names with credentials, institutional position titles, and routing statuses. Also here, the Club Adviser can update official signatory names and credentials, clone rosters across semesters, and save routing configurations for automated report generation.

---

### Figure 28. Admin Console: Telemetry, Access & Governance Trail
![Figure 28. Admin Console: Telemetry, Access & Governance Trail](../interfaces/Screenshot%202026-10-21%20055434.png)

This figure shows the Telemetry, Access & Governance Trail tab of the Admin Console, maintaining a complete log of administrative and authentication events. It displays filter pills (All Activity, Logins & Sessions, Financial Operations, Governance Changes), a search box, and chronological log rows detailing actor identity and email, role badges, action and entity tags (such as AUTH_LOGIN, AUTH_LOGOUT, TRANSACTION_FLAGGED, and TRANSACTION_CREATED), event telemetry details (method, IP address, state transitions), and exact timestamps. Also here, the Club Adviser can audit system access events, monitor session authentication history, track financial record modifications, and verify administrative security trails.

---

### Figure 29. Admin Console: Approved Officer Records
![Figure 29. Admin Console: Approved Officer Records](../interfaces/Screenshot%202026-10-21%20055441.png)

This figure shows the Approved Officer Records tab in the Admin Console, preserving a permanent historical log of verified access requests. It displays verified checkmark badges, approved applicant names, email addresses, granted role badges (Treasurer, Admin), and the exact calendar dates when account approvals were granted. Also here, the Club Adviser can review the historical archive of successfully approved officer accounts and verify past onboarding records.

---

### Figure 30. Admin Console: Declined Registration Requests
![Figure 30. Admin Console: Declined Registration Requests](../interfaces/Screenshot%202026-10-21%20055448.png)

This figure shows the Declined Registration Requests tab in the Admin Console, documenting applicant applications that failed to meet verification criteria. It displays declined status icons, applicant names and email addresses, recorded reasons for rejection (such as "Does not meet enrollment or officer criteria"), and review timestamps. Also here, the Club Adviser can review rejected applicant records and their recorded justifications.

---

### Figure 31. Customize Officer Actions & Permissions Modal
![Figure 31. Customize Officer Actions & Permissions Modal](../interfaces/Screenshot%202026-10-21%20055507.png)

This figure shows the modal dialog for configuring fine-grained capabilities independently of assigned officer positions. It features the selected officer's avatar, name, and email, an Official Position/Role selector with an "Apply Defaults" button, and 8 granular capability checkbox cards (Record Inflow, Record Outflow, Record Abono/Reimbursement, Edit Transactions, Delete/Void Transactions, Audit & Approve/Flag, Cash Reconciliation, and Generate & Export Reports), alongside "Enable All" / "Clear All" shortcuts and a "Save Permissions & Role" button. Also here, the Club Adviser can dynamically grant, customize, or revoke operational capabilities for any officer via checkboxes, overriding default role boundaries during special events.

---

### Figure 32. User Account Profile Page
![Figure 32. User Account Profile Page](../interfaces/Screenshot%202026-10-21%20055519.png)

This figure shows the Account Profile page of the logged-in user. It displays the user's avatar with photo change icon, full name, Super Administrator role badge, email address, verification badges (Account Active & Verified, Google Workspace OAuth), "Edit Profile" and "Security" navigation buttons, Contact & Access Details (registered email, contact number, financial role authority, account status), and Institutional Affiliation details (Pambayang Dalubhasaan ng Marilao, College of Computer Studies, League of Information Technology Enthusiasts, BSIT program, and Marilao, Bulacan jurisdiction). Also here, the user can review their personal account credentials, verify institutional affiliation data, update contact information, and navigate to security settings.

---

### Figure 33. Edit Profile Information Modal
![Figure 33. Edit Profile Information Modal](../interfaces/Screenshot%202026-10-21%20055528.png)

This figure shows the profile information modal for updating changeable credentials. It contains an avatar upload card with an "Upload Photo" button, input fields for First Name, Last Name, and an 11-digit Contact Number, alongside a read-only Institutional & Role Credentials card showing registered email and system authority role badge, with "Cancel" and "Save Changes" action buttons. Also here, the officer can upload a new profile picture, update their personal contact details, and save modifications to their profile.

---

### Figure 34. Account Security Settings Page
![Figure 34. Account Security Settings Page](../interfaces/Screenshot%202026-10-21%20055539.png)

This figure shows the Account Security settings interface. It displays connected Sign-in Methods (Google Workspace One-tap SSO marked Connected, and Password Email/Password access marked Configured), alongside the Change Password card containing input fields for Current password, New password (minimum 8 characters), and Confirm new password with visibility toggles, followed by an "Update Password" button. Also here, the officer can review connected authentication methods, modify their login password, and enforce account security across active sessions.
