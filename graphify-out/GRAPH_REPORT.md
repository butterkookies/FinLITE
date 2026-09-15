# Graph Report - .  (2026-09-15)

## Corpus Check
- Corpus is ~19,520 words - fits in a single context window. You may not need a graph.

## Summary
- 77 nodes · 96 edges · 20 communities (10 shown, 10 thin omitted)
- Extraction: 76% EXTRACTED · 24% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

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

## God Nodes (most connected - your core abstractions)
1. `renderFeed()` - 9 edges
2. `temp_check renderFeed` - 6 edges
3. `index.html renderFeed` - 6 edges
4. `index.html exportFormattedDocx` - 6 edges
5. `closeSheet()` - 5 edges
6. `appendMsg()` - 5 edges
7. `index.html renderDocxPreview` - 5 edges
8. `populate_report` - 4 edges
9. `PDM_LOGO_BASE64` - 4 edges
10. `LITE_LOGO_BASE64` - 4 edges

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

## Communities (20 total, 10 thin omitted)

### Community 0 - "Web App UI & State"
Cohesion: 0.20
Nodes (15): index.html advanceReport, index.html appState, index.html exportFormattedDocx, index.html handleNewTransaction, FinLITE Web Application UI Interface, index.html reimburseTx, index.html renderDocxPreview, index.html renderFeed (+7 more)

### Community 1 - "Financial Report Templates & Exports"
Cohesion: 0.22
Nodes (10): FinLITE Exported Report Docx Document, LITE Financial Report Master Template, LITE Financial Report AY 2025-2026 Template, LITE Financial Report Universal Template, WordprocessingML Document XML Dump, DEFAULT_TEMPLATE, populate_report, replace_placeholders (+2 more)

### Community 3 - "Transaction Feed & Sheet Controls"
Cohesion: 0.36
Nodes (8): closeSheet(), filterFeed(), handleNewTransaction(), reimburseTx(), renderDocxPreview(), renderFeed(), verifyTx(), voidTx()

### Community 4 - "Verification & Transaction Handling (temp_check)"
Cohesion: 0.33
Nodes (6): temp_check appState, temp_check handleNewTransaction, temp_check reimburseTx, temp_check renderFeed, temp_check verifyTx, temp_check voidTx

### Community 5 - "AI Assistant & Taglish Chat Queries"
Cohesion: 0.40
Nodes (5): appendMsg(), askAiQuery(), confirmAiDraft(), sendAiMessage(), simulateTaglishDraft()

### Community 6 - "Docx Report Engine & Formatting"
Cohesion: 0.83
Nodes (3): populate_report(), replace_placeholders(), replace_text_in_paragraph()

### Community 7 - "Architecture & System Motivation"
Cohesion: 0.67
Nodes (3): FinLITE Automated Financial System Architecture, Manual Financial Recordkeeping Deficiencies, index.html updateReconCount

### Community 8 - "Role Selection & Report Advancement"
Cohesion: 0.67
Nodes (3): advanceReport(), setRole(), updateReportActionBtn()

## Knowledge Gaps
- **23 isolated node(s):** `appState`, `dt`, `replace_text_in_paragraph`, `XML Table Style & Shading Inspector`, `temp_check appState` (+18 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `index.html exportFormattedDocx` connect `Web App UI & State` to `Financial Report Templates & Exports`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `temp_check renderDocxPreview` connect `Web App UI & State` to `Verification & Transaction Handling (temp_check)`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `temp_check renderFeed` connect `Verification & Transaction Handling (temp_check)` to `Web App UI & State`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `index.html exportFormattedDocx` (e.g. with `PDM_LOGO_BASE64` and `LITE_LOGO_BASE64`) actually correct?**
  _`index.html exportFormattedDocx` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `appState`, `dt`, `replace_text_in_paragraph` to the rest of the system?**
  _24 weakly-connected nodes found - possible documentation gaps or missing edges._