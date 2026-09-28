# Graph Report - FinLITE  (2026-09-28)

## Corpus Check
- 39 files · ~84,991 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 359 nodes · 391 edges · 53 communities (42 shown, 11 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bc182f31`
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
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]

## God Nodes (most connected - your core abstractions)
1. `FinLITE Technology Stack Decision & Guidelines` - 18 edges
2. `FinLITE Technology Stack Decision Guide` - 15 edges
3. `compilerOptions` - 14 edges
4. `Detailed options` - 12 edges
5. `LITE Club Adviser Financial Operations & System Rules Questionnaire` - 9 edges
6. `renderFeed()` - 9 edges
7. `renderFeed()` - 9 edges
8. `formatPHP()` - 7 edges
9. `1. RAW QUESTIONNAIRE RESPONSES` - 7 edges
10. `3. BUSINESS LOGIC (THE AS-IS FINANCIAL OPERATIONS & WORKFLOWS)` - 7 edges

## Surprising Connections (you probably didn't know these)
- `temp_check exportFormattedDocx` --semantically_similar_to--> `index.html exportFormattedDocx`  [INFERRED] [semantically similar]
  temp_check.js → index.html
- `index.html exportFormattedDocx` --semantically_similar_to--> `populate_report`  [INFERRED] [semantically similar]
  index.html → export_report_engine.py
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

## Communities (53 total, 11 thin omitted)

### Community 0 - "Web App UI & State"
Cohesion: 0.07
Nodes (34): FinLITE Exported Report Docx Document, LITE Financial Report Master Template, LITE Financial Report AY 2025-2026 Template, LITE Financial Report Universal Template, FinLITE Automated Financial System Architecture, Manual Financial Recordkeeping Deficiencies, WordprocessingML Document XML Dump, DEFAULT_TEMPLATE (+26 more)

### Community 1 - "Financial Report Templates & Exports"
Cohesion: 0.20
Nodes (9): 1. RAW QUESTIONNAIRE RESPONSES, 2. DERIVED INSTITUTIONAL POLICIES FOR FINLITE SYSTEM ARCHITECTURE, LITE Club Adviser Assessment Snapshot: Ms. Krizia Mae Genovia, SECTION 1: Personal Advances ("Abono") & Reimbursement Governance, SECTION 2: Physical Cashbox Custody & Event Logistics, SECTION 3: Digital Payments (GCash) & Fee Handling, SECTION 4: Merchandise, Dues, and Discrepancy Policies, SECTION 5: Approval Governance, Revisions & Annual Turnover (+1 more)

### Community 2 - "State Management & Docx Export"
Cohesion: 0.12
Nodes (22): advanceReport(), appendMsg(), appState, askAiQuery(), closeSheet(), confirmAiDraft(), dt, filterFeed() (+14 more)

### Community 3 - "Transaction Feed & Sheet Controls"
Cohesion: 0.12
Nodes (22): advanceReport(), appendMsg(), appState, askAiQuery(), closeSheet(), confirmAiDraft(), dt, filterFeed() (+14 more)

### Community 4 - "Verification & Transaction Handling (temp_check)"
Cohesion: 0.09
Nodes (31): Academic Roadmap: SAD to Capstone Scalability, AI boundary, Before real organizational use, Corrections to the earlier generated proposal, Current platforms and versions, Current version baseline, Data-integrity baseline, Database, deployment, and AI constraints (+23 more)

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
Cohesion: 0.23
Nodes (11): StatCards(), TransactionTable(), DenominationCounter(), runTests(), NewSemesterModal(), calculatePhysicalTotal(), calculateVariance(), DENOMINATION_VALUES (+3 more)

### Community 10 - "Entry Sheets & Source Toggle"
Cohesion: 0.06
Nodes (35): 1.1 Conceptual Foundation & The "Financial Assistant" Paradigm, 1.1 Project Title, 1.2 Core Architectural Capabilities & Modular Subsystems, 1.2 Organizational Setting & Operational Environment, 1.3 As-Is Process & Real-World Failure Modes, 1.4 The Paradigm Shift: Why a "Financial Assistant" Rather than an ERP, 1.5 System Capabilities Architecture, 1.6 Academic & Practical Impact (+27 more)

### Community 11 - "Denomination Counter & Reconciliation"
Cohesion: 0.18
Nodes (11): 10. React 19 + Express 5 + MongoDB, 1. Next.js 16 + Supabase PostgreSQL/Auth/Storage + AI SDK 6, 2. Laravel 13 + Inertia + Vue 3 + PostgreSQL, 3. Django 6 + HTMX + PostgreSQL, 4. React 19 + Vite 8 + FastAPI + PostgreSQL, 5. React 19 + Vite 8 + Express 5 + Prisma 7 + PostgreSQL, 6. Nuxt 4 + Supabase PostgreSQL/Auth/Storage, 7. ASP.NET Core 10 LTS + Blazor + EF Core + PostgreSQL (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.11
Nodes (19): code:text (Good day, Ma'am Kimberly and Ma'am Krizia!), Form Description:, Form Description / Executive Overview (Developer Pitch):, Form Guide & Template for Google Forms Deployment, Form Title:, GOOGLE FORM SETUP DETAILS, LITE Club Adviser Financial Operations Questionnaire (Google Form Draft), LITE Club Adviser Financial Operations & System Rules Questionnaire (+11 more)

### Community 21 - "Community 21"
Cohesion: 0.25
Nodes (7): code:bash (# Clone the repository), Crafted Details, FinLITE, Overview, Quick Start, Technical Stack, Three Fluid States

### Community 22 - "Community 22"
Cohesion: 0.40
Nodes (4): 1.1 Project Context, Proposed Solution, Statement of the Problem, The Current Manual Process (Crucial for your DFD)

### Community 23 - "Community 23"
Cohesion: 0.83
Nodes (3): populate_report(), replace_placeholders(), replace_text_in_paragraph()

### Community 32 - "Community 32"
Cohesion: 0.50
Nodes (3): __dirname, __filename, nextConfig

### Community 46 - "Community 46"
Cohesion: 0.25
Nodes (8): 3.1 Revenue Generation and Inflow Processing Logic, 3.2 Spending Authorization and Out-of-Pocket Personal Advances ("Abono"), 3.3 Expense Documentation, Micro-Disbursement Acknowledgment, and Reimbursement Protocol, 3.4 Physical Denomination Counting and Cash Variance Settlement Logic, 3.5 Institutional Liquidation Standards and Sequential Wet-Ink Signatory Routing, 3. BUSINESS LOGIC (THE AS-IS FINANCIAL OPERATIONS & WORKFLOWS), code:mermaid (flowchart TD), code:mermaid (sequenceDiagram)

### Community 47 - "Community 47"
Cohesion: 0.33
Nodes (5): api, editorType, id, main, name

## Knowledge Gaps
- **160 isolated node(s):** `target`, `lib`, `allowJs`, `skipLibCheck`, `strict` (+155 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PROJECT CONTEXT: FINLITE FINANCIAL MANAGEMENT & AUTOMATED DOCUMENT GENERATION SYSTEM` connect `Entry Sheets & Source Toggle` to `Community 46`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `FinLITE Technology Stack Decision & Guidelines` connect `Verification & Transaction Handling (temp_check)` to `Denomination Counter & Reconciliation`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `target`, `lib`, `allowJs` to the rest of the system?**
  _161 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Web App UI & State` be split into smaller, more focused modules?**
  _Cohesion score 0.0748663101604278 - nodes in this community are weakly interconnected._
- **Should `State Management & Docx Export` be split into smaller, more focused modules?**
  _Cohesion score 0.11822660098522167 - nodes in this community are weakly interconnected._
- **Should `Transaction Feed & Sheet Controls` be split into smaller, more focused modules?**
  _Cohesion score 0.11822660098522167 - nodes in this community are weakly interconnected._
- **Should `Verification & Transaction Handling (temp_check)` be split into smaller, more focused modules?**
  _Cohesion score 0.08669354838709678 - nodes in this community are weakly interconnected._