# Graph Report - FinLITE  (2026-09-16)

## Corpus Check
- 39 files · ~40,055 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 280 nodes · 304 edges · 46 communities (35 shown, 11 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a1d42247`
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
- [[_COMMUNITY_Detail Sheet Handler (temp_check)|Detail Sheet Handler (temp_check)]]
- [[_COMMUNITY_Reconciliation Counter (temp_check)|Reconciliation Counter (temp_check)]]
- [[_COMMUNITY_Report Advancement (temp_check)|Report Advancement (temp_check)]]
- [[_COMMUNITY_AI Query Interface (temp_check)|AI Query Interface (temp_check)]]
- [[_COMMUNITY_Detail Sheet Handler (UI)|Detail Sheet Handler (UI)]]
- [[_COMMUNITY_AI Query Interface (UI)|AI Query Interface (UI)]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 32|Community 32]]

## God Nodes (most connected - your core abstractions)
1. `FinLITE Technology Stack Decision Guide` - 15 edges
2. `compilerOptions` - 14 edges
3. `Detailed options` - 11 edges
4. `renderFeed()` - 9 edges
5. `renderFeed()` - 9 edges
6. `PROJECT CONTEXT` - 7 edges
7. `1.3 As-Is Process & Real-World Failure Modes` - 7 edges
8. `formatPHP()` - 6 edges
9. `calculateVariance()` - 6 edges
10. `runTests()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `index.html exportFormattedDocx` --semantically_similar_to--> `populate_report`  [INFERRED] [semantically similar]
  index.html → export_report_engine.py
- `temp_check exportFormattedDocx` --semantically_similar_to--> `index.html exportFormattedDocx`  [INFERRED] [semantically similar]
  temp_check.js → index.html
- `temp_check renderDocxPreview` --semantically_similar_to--> `index.html renderDocxPreview`  [INFERRED] [semantically similar]
  temp_check.js → index.html
- `populate_report` --implements--> `LITE Financial Report Universal Template`  [INFERRED]
  export_report_engine.py → graphify-out/converted/LITE-Financial-Report-Universal-Template_5a1ba7be.md
- `DEFAULT_TEMPLATE` --references--> `LITE Financial Report Universal Template`  [INFERRED]
  export_report_engine.py → graphify-out/converted/LITE-Financial-Report-Universal-Template_5a1ba7be.md

## Hyperedges (group relationships)
- **Audit and Segregation of Duties Governance Flow** — index_verifytx, index_advancereport, index_voidtx, rules_rtk_financial_governance [INFERRED 0.95]
- **Official Word Document Financial Report Pipeline** — export_report_engine_populate_report, index_exportformatteddocx, converted_lite_financial_report_universal_template_5a1ba7be_universal_template, converted_finlite_exported_report_38ec849a_financial_report [INFERRED 0.95]
- **Physical Cash Reconciliation and Variance Monitoring Flow** — index_updatereconcount, index_appstate, converted_project_context_08cd0430_manual_process_problems [INFERRED 0.85]

## Communities (46 total, 11 thin omitted)

### Community 0 - "Web App UI & State"
Cohesion: 0.11
Nodes (24): FinLITE Automated Financial System Architecture, Manual Financial Recordkeeping Deficiencies, index.html advanceReport, index.html appState, index.html exportFormattedDocx, index.html handleNewTransaction, FinLITE Web Application UI Interface, index.html reimburseTx (+16 more)

### Community 1 - "Financial Report Templates & Exports"
Cohesion: 0.22
Nodes (10): FinLITE Exported Report Docx Document, LITE Financial Report Master Template, LITE Financial Report AY 2025-2026 Template, LITE Financial Report Universal Template, WordprocessingML Document XML Dump, DEFAULT_TEMPLATE, populate_report, replace_placeholders (+2 more)

### Community 2 - "State Management & Docx Export"
Cohesion: 0.12
Nodes (22): advanceReport(), appendMsg(), appState, askAiQuery(), closeSheet(), confirmAiDraft(), dt, filterFeed() (+14 more)

### Community 3 - "Transaction Feed & Sheet Controls"
Cohesion: 0.12
Nodes (22): advanceReport(), appendMsg(), appState, askAiQuery(), closeSheet(), confirmAiDraft(), dt, filterFeed() (+14 more)

### Community 4 - "Verification & Transaction Handling (temp_check)"
Cohesion: 0.07
Nodes (26): AI boundary, Before real organizational use, Corrections to the earlier generated proposal, Current platforms and versions, Current version baseline, Data-integrity baseline, Database, deployment, and AI constraints, Decision checklist (+18 more)

### Community 5 - "AI Assistant & Taglish Chat Queries"
Cohesion: 0.08
Nodes (25): dependencies, browser-image-compression, clsx, date-fns, docx, @google/generative-ai, lucide-react, next (+17 more)

### Community 6 - "Docx Report Engine & Formatting"
Cohesion: 0.83
Nodes (3): populate_report(), replace_placeholders(), replace_text_in_paragraph()

### Community 7 - "Architecture & System Motivation"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, baseUrl, isolatedModules, jsx, lib, module, moduleResolution (+9 more)

### Community 8 - "Role Selection & Report Advancement"
Cohesion: 0.28
Nodes (10): StatCards(), TransactionTable(), DenominationCounter(), runTests(), calculatePhysicalTotal(), calculateVariance(), DENOMINATION_VALUES, formatPHP() (+2 more)

### Community 10 - "Entry Sheets & Source Toggle"
Cohesion: 0.13
Nodes (14): 1.1 Project Title, 1.2 Organizational Setting & Operational Environment, 1.3 As-Is Process & Real-World Failure Modes, 1.4 The Paradigm Shift: Why a "Financial Assistant" Rather than an ERP, 1.5 System Capabilities Architecture, 1.6 Academic & Practical Impact, 1. The Personal "Abono" & Reimbursement Dilemma (Faculty Advisers & Officers), 2. Documenting Non-Receipted Micro-Disbursements (+6 more)

### Community 11 - "Denomination Counter & Reconciliation"
Cohesion: 0.18
Nodes (11): 10. React 19 + Express 5 + MongoDB, 1. Next.js 16 + Supabase PostgreSQL/Auth/Storage + AI SDK 6, 2. Laravel 13 + Inertia + Vue 3 + PostgreSQL, 3. Django 6 + HTMX + PostgreSQL, 4. React 19 + Vite 8 + FastAPI + PostgreSQL, 5. React 19 + Vite 8 + Express 5 + Prisma 7 + PostgreSQL, 6. Nuxt 4 + Supabase PostgreSQL/Auth/Storage, 7. ASP.NET Core 10 LTS + Blazor + EF Core + PostgreSQL (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.22
Nodes (8): Form Description:, Form Title:, LITE Club Adviser Financial Operations Questionnaire (Google Form Draft), SECTION 1: Personal Advances & Out-of-Pocket Reimbursements (Accounts Payable), SECTION 2: Merchandise Sales, Fees, and "Utang" Policy (Accounts Receivable), SECTION 3: Budget Approval & Petty Expense Governance, SECTION 4: Discrepancy Tolerance & Cash Reconciliation, SECTION 5: End-of-Term Liquidation & Submission Pet Peeves

### Community 21 - "Community 21"
Cohesion: 0.29
Nodes (6): code:bash (# Clone the repository), Crafted details, FinLITE, Overview, Quick start, Three fluid states

### Community 22 - "Community 22"
Cohesion: 0.40
Nodes (4): 1.1 Project Context, Proposed Solution, Statement of the Problem, The Current Manual Process (Crucial for your DFD)

### Community 23 - "Community 23"
Cohesion: 0.83
Nodes (3): populate_report(), replace_placeholders(), replace_text_in_paragraph()

## Knowledge Gaps
- **120 isolated node(s):** `target`, `lib`, `allowJs`, `skipLibCheck`, `strict` (+115 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `FinLITE Technology Stack Decision Guide` connect `Verification & Transaction Handling (temp_check)` to `Denomination Counter & Reconciliation`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `Detailed options` connect `Denomination Counter & Reconciliation` to `Verification & Transaction Handling (temp_check)`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `index.html exportFormattedDocx` connect `Web App UI & State` to `Financial Report Templates & Exports`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `target`, `lib`, `allowJs` to the rest of the system?**
  _121 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Web App UI & State` be split into smaller, more focused modules?**
  _Cohesion score 0.10869565217391304 - nodes in this community are weakly interconnected._
- **Should `State Management & Docx Export` be split into smaller, more focused modules?**
  _Cohesion score 0.11822660098522167 - nodes in this community are weakly interconnected._
- **Should `Transaction Feed & Sheet Controls` be split into smaller, more focused modules?**
  _Cohesion score 0.11822660098522167 - nodes in this community are weakly interconnected._