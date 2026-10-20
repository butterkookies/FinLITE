# Graph Report - FinLITE  (2026-10-19)

## Corpus Check
- 152 files · ~232,971 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 948 nodes · 1187 edges · 95 communities (77 shown, 18 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 166 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a3d8cedd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Web App UI & State|Web App UI & State]]
- [[_COMMUNITY_Financial Report Templates & Exports|Financial Report Templates & Exports]]
- [[_COMMUNITY_State Management & Docx Export|State Management & Docx Export]]
- [[_COMMUNITY_Transaction Feed & Sheet Controls|Transaction Feed & Sheet Controls]]
- [[_COMMUNITY_Verification & Transaction Handling (temp_check)|Verification & Transaction Handling (temp_check)]]
- [[_COMMUNITY_AI Assistant & Taglish Chat Queries|AI Assistant & Taglish Chat Queries]]
- [[_COMMUNITY_Docx Report Engine & Formatting|Docx Report Engine & Formatting]]
- [[_COMMUNITY_Architecture & System Motivation|Architecture & System Motivation]]
- [[_COMMUNITY_Role Selection & Report Advancement|Role Selection & Report Advancement]]
- [[_COMMUNITY_Project Context & RTK Rules|Project Context & RTK Rules]]
- [[_COMMUNITY_Entry Sheets & Source Toggle|Entry Sheets & Source Toggle]]
- [[_COMMUNITY_Denomination Counter & Reconciliation|Denomination Counter & Reconciliation]]
- [[_COMMUNITY_Table Inspection Utility|Table Inspection Utility]]
- [[_COMMUNITY_Logo Assets|Logo Assets]]
- [[_COMMUNITY_Detail Sheet Handler (temp_check)|Detail Sheet Handler (temp_check)]]
- [[_COMMUNITY_Reconciliation Counter (temp_check)|Reconciliation Counter (temp_check)]]
- [[_COMMUNITY_Report Advancement (temp_check)|Report Advancement (temp_check)]]
- [[_COMMUNITY_AI Query Interface (temp_check)|AI Query Interface (temp_check)]]
- [[_COMMUNITY_AI Query Interface (UI)|AI Query Interface (UI)]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]

## God Nodes (most connected - your core abstractions)
1. `FinLITE Technology Stack Decision Guide` - 19 edges
2. `createAdminClient()` - 18 edges
3. `FinLITE Technology Stack Decision & Guidelines` - 18 edges
4. `FinLITE Technology Stack Decision & Guidelines` - 18 edges
5. `isSuperAdminEmail()` - 17 edges
6. `formatPHP()` - 17 edges
7. `compilerOptions` - 14 edges
8. `GET()` - 14 edges
9. `getClientIp()` - 13 edges
10. `2. The 12 Iron Rules (Strict Negative Constraints)` - 13 edges

## Surprising Connections (you probably didn't know these)
- `temp_check exportFormattedDocx` --semantically_similar_to--> `index.html exportFormattedDocx`  [INFERRED] [semantically similar]
  temp_check.js → index.html
- `index.html exportFormattedDocx` --semantically_similar_to--> `populate_report`  [INFERRED] [semantically similar]
  index.html → export_report_engine.py
- `temp_check renderDocxPreview` --semantically_similar_to--> `index.html renderDocxPreview`  [INFERRED] [semantically similar]
  temp_check.js → index.html
- `Dashboard()` --calls--> `isSuperAdminEmail()`  [INFERRED]
  app/page.jsx → lib/config/admin.js
- `POST()` --calls--> `createRecoveryLink()`  [INFERRED]
  app/api/auth/forgot-password/route.js → lib/auth/registration.js

## Communities (95 total, 18 thin omitted)

### Community 0 - "Web App UI & State"
Cohesion: 0.07
Nodes (25): balancedVar, c, cashBalance, cents, docxJobs, docxStart, env, envContent (+17 more)

### Community 1 - "Financial Report Templates & Exports"
Cohesion: 0.05
Nodes (42): 1.1 Conceptual Foundation & The "Financial Assistant" Paradigm, 1.1 Project Title, 1.2 Core Architectural Capabilities & Modular Subsystems, 1.2 Organizational Setting & Operational Environment, 1.3 As-Is Process & Real-World Failure Modes, 1.4 The Paradigm Shift: Why a "Financial Assistant" Rather than an ERP, 1.5 System Capabilities Architecture, 1.6 Academic & Practical Impact (+34 more)

### Community 2 - "State Management & Docx Export"
Cohesion: 0.08
Nodes (32): FinLITE Exported Report Docx Document, LITE Financial Report AY 2025-2026 Template, FinLITE Automated Financial System Architecture, Manual Financial Recordkeeping Deficiencies, WordprocessingML Document XML Dump, DEFAULT_TEMPLATE, populate_report, replace_placeholders (+24 more)

### Community 3 - "Transaction Feed & Sheet Controls"
Cohesion: 0.07
Nodes (42): 10. React 19 + Express 5 + MongoDB, 1. Next.js 16 + Supabase PostgreSQL/Auth/Storage + AI SDK 6, 2. Laravel 13 + Inertia + Vue 3 + PostgreSQL, 3. Django 6 + HTMX + PostgreSQL, 4. React 19 + Vite 8 + FastAPI + PostgreSQL, 5. React 19 + Vite 8 + Express 5 + Prisma 7 + PostgreSQL, 6. Nuxt 4 + Supabase PostgreSQL/Auth/Storage, 7. ASP.NET Core 10 LTS + Blazor + EF Core + PostgreSQL (+34 more)

### Community 4 - "Verification & Transaction Handling (temp_check)"
Cohesion: 0.12
Nodes (22): advanceReport(), appendMsg(), appState, askAiQuery(), closeSheet(), confirmAiDraft(), dt, filterFeed() (+14 more)

### Community 5 - "AI Assistant & Taglish Chat Queries"
Cohesion: 0.12
Nodes (22): advanceReport(), appendMsg(), appState, askAiQuery(), closeSheet(), confirmAiDraft(), dt, filterFeed() (+14 more)

### Community 6 - "Docx Report Engine & Formatting"
Cohesion: 0.06
Nodes (35): dependencies, browser-image-compression, clsx, date-fns, docx, @google/generative-ai, lucide-react, next (+27 more)

### Community 7 - "Architecture & System Motivation"
Cohesion: 0.11
Nodes (19): code:text (Good day, Ma'am Kimberly and Ma'am Krizia!), Form Description:, Form Description / Executive Overview (Developer Pitch):, Form Guide & Template for Google Forms Deployment, Form Title:, GOOGLE FORM SETUP DETAILS, LITE Club Adviser Financial Operations Questionnaire (Google Form Draft), LITE Club Adviser Financial Operations & System Rules Questionnaire (+11 more)

### Community 8 - "Role Selection & Report Advancement"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, baseUrl, isolatedModules, jsx, lib, module, moduleResolution (+9 more)

### Community 9 - "Project Context & RTK Rules"
Cohesion: 0.17
Nodes (11): GET(), verifyAdmin(), isSuperAdminEmail(), resolveEffectiveRole(), POST(), GET(), testAccountLifecycleAndRemarks(), DELETE() (+3 more)

### Community 11 - "Denomination Counter & Reconciliation"
Cohesion: 0.07
Nodes (31): config, isPublicRoute(), middleware(), PUBLIC_ROUTES, testRateLimiting(), afterReset, allowed, blockA (+23 more)

### Community 12 - "Table Inspection Utility"
Cohesion: 0.20
Nodes (9): 1. RAW QUESTIONNAIRE RESPONSES, 2. DERIVED INSTITUTIONAL POLICIES FOR FINLITE SYSTEM ARCHITECTURE, LITE Club Adviser Assessment Snapshot: Ms. Krizia Mae Genovia, SECTION 1: Personal Advances ("Abono") & Reimbursement Governance, SECTION 2: Physical Cashbox Custody & Event Logistics, SECTION 3: Digital Payments (GCash) & Fee Handling, SECTION 4: Merchandise, Dues, and Discrepancy Policies, SECTION 5: Approval Governance, Revisions & Annual Turnover (+1 more)

### Community 13 - "Logo Assets"
Cohesion: 0.23
Nodes (15): add_receipt_sheets_table(), create_borderless_signatory_table(), enforce_calibri_11(), ensure_invisible_table_borders(), populate_report(), Build structured multi-column borderless table for signatories.     Guarantees, Ensure all borders on the table are nil (invisible) so no box gridlines appear., Renders 2-column Word table holding up to 4 receipts per page (2 rows x 2 cols). (+7 more)

### Community 14 - "Detail Sheet Handler (temp_check)"
Cohesion: 0.25
Nodes (7): code:bash (# Clone the repository), Crafted Details, FinLITE, Overview, Quick Start, Technical Stack, Three Fluid States

### Community 15 - "Reconciliation Counter (temp_check)"
Cohesion: 0.33
Nodes (5): api, editorType, id, main, name

### Community 16 - "Report Advancement (temp_check)"
Cohesion: 0.40
Nodes (4): 1.1 Project Context, Proposed Solution, Statement of the Problem, The Current Manual Process (Crucial for your DFD)

### Community 19 - "AI Query Interface (UI)"
Cohesion: 0.13
Nodes (14): AdvancesManagementModal, AIChatDrawer, AuditTrailDrawer, Dashboard(), DebtsManagementModal, DEFAULT_LITE_SIGNATORIES_25_26, DEFAULT_LITE_SIGNATORIES_26_27, DEFAULT_SEMESTERS (+6 more)

### Community 20 - "Community 20"
Cohesion: 0.14
Nodes (8): AdminPage(), AUDIT_FILTER_OPTIONS, ROLE_OPTIONS, AuditTrailDrawer(), Navbar(), ThemeContext, useTheme(), ThemeToggle()

### Community 22 - "Community 22"
Cohesion: 0.50
Nodes (3): __dirname, __filename, nextConfig

### Community 30 - "Community 30"
Cohesion: 0.06
Nodes (32): 1. Executive Design Philosophy, 1. Primary Buttons, 2. Secondary / Neutral Buttons, 2. The 12 Iron Rules (Strict Negative Constraints), 3. Design Tokens & Color System, 3. Financial Transaction Status Indicators (Anti-Pastel Tag), 4. Custom Popover Dropdowns (Replacing Browser `<select>`), 4. Typography Scale & Tabular Rules (+24 more)

### Community 37 - "Community 37"
Cohesion: 0.18
Nodes (6): POST(), VALID_ROLES, POST(), GET(), PATCH(), createAdminClient()

### Community 40 - "Community 40"
Cohesion: 0.05
Nodes (40): 10. React 19 + Express 5 + MongoDB, 1. Next.js 16 + Supabase PostgreSQL/Auth/Storage + AI SDK 6, 2. Laravel 13 + Inertia + Vue 3 + PostgreSQL, 3. Django 6 + HTMX + PostgreSQL, 4. React 19 + Vite 8 + FastAPI + PostgreSQL, 5. React 19 + Vite 8 + Express 5 + Prisma 7 + PostgreSQL, 6. Nuxt 4 + Supabase PostgreSQL/Auth/Storage, 7. ASP.NET Core 10 LTS + Blazor + EF Core + PostgreSQL (+32 more)

### Community 54 - "Community 54"
Cohesion: 0.12
Nodes (18): Badge(), badgeSizes, badgeVariants, Button, buttonSizes, buttonVariants, Card, CardContent (+10 more)

### Community 55 - "Community 55"
Cohesion: 0.19
Nodes (8): StatCards(), AdvancesManagementModal(), DebtsManagementModal(), TransactionCommentsDrawer(), formatFriendlyDate(), TransactionTable(), NewSemesterModal(), formatPHP()

### Community 56 - "Community 56"
Cohesion: 0.21
Nodes (6): FinLiteMotionMaster(), SceneCashReconciliation(), SceneChaosToClarity(), SceneDashboard(), SceneOutro(), SceneReportExport()

### Community 57 - "Community 57"
Cohesion: 0.15
Nodes (12): AdvancesManagementModal, AIChatDrawer, AuditTrailDrawer, DebtsManagementModal, DEFAULT_LITE_SIGNATORIES_26_27, DEFAULT_SEMESTERS, DenominationCounter, DocumentPreviewModal (+4 more)

### Community 58 - "Community 58"
Cohesion: 0.23
Nodes (8): BorderGlow(), buildGlowVars(), buildGradientVars(), COLOR_MAP, GRADIENT_KEYS, GRADIENT_POSITIONS, isLightColor(), parseHSL()

### Community 59 - "Community 59"
Cohesion: 0.17
Nodes (10): BASE_DIR, fallbackBuffer, img1Path, img2Path, img3Path, img4Path, img5Path, SCRIPT_PATH (+2 more)

### Community 60 - "Community 60"
Cohesion: 0.06
Nodes (32): 1. Executive Design Philosophy, 1. Primary Buttons, 2. Secondary / Neutral Buttons, 2. The 12 Iron Rules (Strict Negative Constraints), 3. Design Tokens & Color System, 3. Financial Transaction Status Indicators (Anti-Pastel Tag), 4. Custom Popover Dropdowns (Replacing Browser `<select>`), 4. Typography Scale & Tabular Rules (+24 more)

### Community 61 - "Community 61"
Cohesion: 0.29
Nodes (7): anonClient, env, envContent, idx, report(), runSecurityAudit(), trimmed

### Community 62 - "Community 62"
Cohesion: 0.06
Nodes (30): 1.1 Conceptual Foundation & The "Financial Assistant" Paradigm, 1.2 Core Architectural Capabilities & Modular Subsystems, 1. NEW SYSTEM OVERVIEW, 2.1 The Host Institution: Pambayang Dalubhasaan ng Marilao (PDM), 2.2 The Target Student Organization: League of Information Technology Enthusiasts (LITE), 2.3 Governance Structure and Committee Ecosystem, 2.4 Operational Setting, Venue Constraints, and Custodial Protocols, 2. BACKGROUND OF THE ORGANIZATION (+22 more)

### Community 63 - "Community 63"
Cohesion: 0.15
Nodes (15): createStatelessClient(), getAuthMethods(), getSecurityState(), logAuthEvent(), patchSecurityState(), verifyPasswordOnly(), isReplaceableRegistration(), discardUnverifiedRegistration() (+7 more)

### Community 65 - "Community 65"
Cohesion: 0.25
Nodes (7): getSuperAdminEmails(), SUPER_ADMIN_EMAILS, OFFICIAL_INFLOW_CATEGORIES, OFFICIAL_OUTFLOW_CATEGORIES, createTransporter(), sendAdminRegistrationNotification(), admins

### Community 66 - "Community 66"
Cohesion: 0.11
Nodes (18): 1. Global & Architectural Directives, 2. End-to-End System Journey Checklist (Login to Report Generation), 3.1. Figure 3: Context Diagram of FinLITE System (Page 16), 3.2. Figure 4: Diagram 0 of FinLITE System (Page 18), 3. Specific Updates Required for Chapter 2 Diagrams, 4. Current System Limitations, Pending Features & Technical Debt, FinLITE Academic Paper Revision Master Checklist, Phase 10: Grounded Gemini AI Financial Co-Pilot (+10 more)

### Community 78 - "Community 78"
Cohesion: 0.16
Nodes (9): createRecoveryLink(), createVerificationLink(), RegisterForm(), POST(), GENERIC, POST(), testAuthValidation(), validateContactNumber() (+1 more)

### Community 79 - "Community 79"
Cohesion: 0.17
Nodes (10): resolveAppUrl(), safeNextPath(), decideForgotPasswordAction(), evaluateGoogleIdentity(), passwordChangeRequirements(), base, future, now (+2 more)

### Community 80 - "Community 80"
Cohesion: 0.15
Nodes (12): code:text (Good day, Ma'am Kimberly and Ma'am Krizia!), Form Description / Executive Overview (Developer Pitch):, Form Guide & Template for Google Forms Deployment, Form Title:, GOOGLE FORM SETUP DETAILS, LITE Club Adviser Financial Operations & System Rules Questionnaire, SECTION 1: Personal Advances ("Abono") & Reimbursement Governance, SECTION 2: Physical Cashbox Custody & Event Logistics (+4 more)

### Community 81 - "Community 81"
Cohesion: 0.38
Nodes (9): DenominationCounter(), EMPTY_DENOMINATIONS, runTests(), calculatePhysicalTotal(), calculateVariance(), denomCodeToCountKey(), DENOMINATION_VALUES, fromCentavos() (+1 more)

### Community 82 - "Community 82"
Cohesion: 0.36
Nodes (9): deliverEmail(), escapeHtml(), renderEmail(), sendGoogleOnlyNoticeEmail(), sendPasswordResetEmail(), sendSecurityChangeEmail(), sendVerificationEmail(), GENERIC (+1 more)

### Community 83 - "Community 83"
Cohesion: 0.20
Nodes (9): 1. RAW QUESTIONNAIRE RESPONSES, 2. DERIVED INSTITUTIONAL POLICIES FOR FINLITE SYSTEM ARCHITECTURE, LITE Club Adviser Assessment Snapshot: Ms. Krizia Mae Genovia, SECTION 1: Personal Advances ("Abono") & Reimbursement Governance, SECTION 2: Physical Cashbox Custody & Event Logistics, SECTION 3: Digital Payments (GCash) & Fee Handling, SECTION 4: Merchandise, Dues, and Discrepancy Policies, SECTION 5: Approval Governance, Revisions & Annual Turnover (+1 more)

### Community 84 - "Community 84"
Cohesion: 0.22
Nodes (8): 1. Specifications & Architecture (`specs/`), 2. Design System & UI/UX Guidelines (`design/`), 3. Research & Stakeholder Discovery (`research/`), 4. Architecture & Process Flow Diagrams (Root `docs/`), 5. Archive & Historical Documents (`archive/`), code:text (docs/), Directory Structure, FinLITE Documentation

### Community 85 - "Community 85"
Cohesion: 0.29
Nodes (6): NewTransactionModal(), ReceiptCropModal, sanitizeAmountInput(), validateOutflowBalance(), validateTransactionAmount(), validateUsername()

### Community 86 - "Community 86"
Cohesion: 0.29
Nodes (4): POST(), POST(), POST(), getClientIp()

### Community 87 - "Community 87"
Cohesion: 0.47
Nodes (6): assert(), skip(), testAuthConcurrency(), testDatabase(), testDocxSingle(), testRoutes()

### Community 89 - "Community 89"
Cohesion: 0.67
Nodes (3): testAuditTrail(), fetchAuditTrail(), logAuditEvent()

## Knowledge Gaps
- **407 isolated node(s):** `target`, `lib`, `allowJs`, `skipLibCheck`, `strict` (+402 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `isSuperAdminEmail()` connect `Project Context & RTK Rules` to `Web App UI & State`, `Community 65`, `Community 37`, `Denomination Counter & Reconciliation`, `Community 78`, `AI Query Interface (UI)`, `Community 86`, `Community 57`, `Community 63`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `cn()` connect `Community 54` to `Community 20`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `getClientIp()` connect `Community 86` to `Web App UI & State`, `Community 82`, `Denomination Counter & Reconciliation`, `Community 63`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Are the 17 inferred relationships involving `createAdminClient()` (e.g. with `POST()` and `DELETE()`) actually correct?**
  _`createAdminClient()` has 17 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `isSuperAdminEmail()` (e.g. with `middleware()` and `Dashboard()`) actually correct?**
  _`isSuperAdminEmail()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `target`, `lib`, `allowJs` to the rest of the system?**
  _413 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Web App UI & State` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._