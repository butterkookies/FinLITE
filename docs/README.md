# FinLITE Documentation

Welcome to the **FinLITE** documentation repository. This directory contains the complete architectural specifications, research data, UI/UX guidelines, process flow diagrams, and historical project artifacts for **FinLITE** (*A Web-Based Financial Management and Automated Document Generation System for the League of Information Technology Enthusiasts*).

---

## Directory Structure

```text
docs/
├── specs/                   # System requirements, technical architecture & presentations
├── design/                  # UI/UX design tokens, layouts, and guidelines
├── research/                # Stakeholder questionnaires, interview data & survey results
├── archive/                 # Deprecated drafts and legacy binary documents
├── context_diagram.*        # Level 0 Context Diagram (MMD, SVG, PNG, Figma)
├── diagram_0.*              # Level 1 Data Flow Diagram (MMD, SVG, PNG, Figma)
└── README.md                # Documentation index and catalog (this file)
```

---

## 1. Specifications & Architecture (`specs/`)

Core technical and functional definitions governing the development of FinLITE:

- **[`specs/PROJECT_CONTEXT.md`](specs/PROJECT_CONTEXT.md)**  
  The primary source of truth for FinLITE. Outlines the background, core institutional problem, strict business rules (cashbox air-gapping, abono queue, receipt enforcement), user roles (Adviser, President, Treasurer, Auditor), and end-to-end operational workflows.

- **[`specs/techstack-options.md`](specs/techstack-options.md)**  
  Approved technical architecture document. Covers the Next.js App Router, Tailwind CSS, Supabase PostgreSQL with RLS, docx generation engine, deterministic Gemini AI integration, security standards (OWASP ASVS), and the academic roadmap (SAD to Capstone).

- **[`specs/presentation.html`](specs/presentation.html)**  
  Interactive HTML slide deck used for academic defenses and stakeholder presentations, detailing the problem statement, system features, and architectural design.

---

## 2. Design System & UI/UX Guidelines (`design/`)

Interface standards and document generation formatting rules:

- **[`design/DESIGN_GUIDELINES.md`](design/DESIGN_GUIDELINES.md)**  
  Comprehensive design manual detailing color palettes, typography scales, spacing rules, interactive state behaviors, and layout guidelines for both the responsive web application and the pixel-perfect HTML-to-Word document preview canvas.

---

## 3. Research & Stakeholder Discovery (`research/`)

Empirical field research and qualitative discovery data with PDM club advisers:

- **[`research/ADVISER_QUESTIONNAIRE.md`](research/ADVISER_QUESTIONNAIRE.md)**  
  Formal questionnaire designed for club advisers evaluating legacy manual operations, personal GCash handling, reimbursement delays, and report compilation bottlenecks.

- **[`research/CREATE_GFORM_SCRIPT.js`](research/CREATE_GFORM_SCRIPT.js)**  
  Google Apps Script that automatically builds and deploys the Google Form version of the adviser assessment questionnaire.

- **[`research/adviser_survey_responses.csv`](research/adviser_survey_responses.csv)**  
  Exported survey dataset containing adviser feedback and pain-point ratings on financial transparency and document approvals.

- **[`research/KRIZIA_MAE_GENOVIA_RESPONSES.md`](research/KRIZIA_MAE_GENOVIA_RESPONSES.md)**  
  In-depth qualitative interview transcript and responses from LITE Adviser Krizia Mae Genovia detailing specific club operational practices.

---

## 4. Architecture & Process Flow Diagrams (Root `docs/`)

Diagram source code and rendered assets. Diagram generation and synchronization to `public/diagrams/` is managed by [`scripts/render_diagrams.py`](../scripts/render_diagrams.py):

| Diagram | Mermaid Source | Rendered SVG | High-Res PNG | Figma Export |
|---|---|---|---|---|
| **Context Diagram (Level 0 DFD)** | [`context_diagram.mmd`](context_diagram.mmd) | [`context_diagram.svg`](context_diagram.svg) | [`context_diagram.png`](context_diagram.png) | [`context_diagram_figma.png`](context_diagram_figma.png) |
| **Diagram 0 (Level 1 DFD)** | [`diagram_0.mmd`](diagram_0.mmd) | [`diagram_0.svg`](diagram_0.svg) | [`diagram_0.png`](diagram_0.png) | [`diagra_0_figma.png`](diagra_0_figma.png) |

---

## 5. Archive & Historical Documents (`archive/`)

Superseded drafts and legacy binary files retained for version auditing:

- **[`archive/Project Context.md`](archive/Project%20Context.md)**: Early abbreviated project context draft.
- **[`archive/Project Context.docx`](archive/Project%20Context.docx)**: Initial 9.8 KB project context Word document draft.
- **[`archive/FinLITE_Project_Context.docx`](archive/FinLITE_Project_Context.docx)**: Precursor Word document preceding `PROJECT_CONTEXT.md`.
