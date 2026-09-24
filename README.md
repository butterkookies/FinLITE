<div align="center">

<img src="assets/lite-logo.png" width="92" height="92" alt="LITE Logo" style="border-radius: 50%;" />
&nbsp;&nbsp;&nbsp;&nbsp;
<img src="assets/pdm-logo.jpg" width="92" height="92" alt="PDM Logo" style="border-radius: 50%;" />

<br /><br />

# FinLITE

**A web-based financial management and automated document generation system engineered for the League of Information Technology Enthusiasts.**

Grounded AI co-pilot • Strict segregation of duties • Interactive HTML preview • Automated proposals & 1:1 institutional DOCX export

<br />

</div>

---

## Overview

FinLITE replaces unorganized paper receipts, informal chat tallies, and tedious manual Word formatting with an agile, role-gated financial management and automated document generation platform. Built specifically around the operational realities of collegiate student governance at Pambayang Dalubhasaan ng Marilao (PDM), it eliminates the friction of enterprise ERPs while automating the exact documents student officers struggle to create: **pre-event Business Proposals** (for Club Week/Day product booths) and **post-event Financial Liquidation Reports**.

- **Automated document generation**: Compiles compliance-ready Business Proposals and Liquidation Reports directly from input data and verified ledgers.
- **Interactive HTML pre-generation preview**: Displays an exact 1:1 "digital paper" view in the browser with in-place live editing so officers can catch mistakes and eliminate document rejections before generating the `.docx` file.
- **Operational co-pilot & ledger**: Streamlines transaction logging, cashbox tracking, and personal advances (*"abono"*) without requiring complex double-entry accounting configurations.
- **Segregation of duties**: Enforces financial integrity where Treasurers log transactions, Auditors inspect receipts and count cash, and Advisers authorize liquidations via dual sign-off.
- **Deterministic grounding**: Houses an intelligent Taglish-capable assistant strictly bounded to verified database tables, ensuring zero hallucination on financial inquiries.
- **Capstone scalability**: Piloted on LITE for ITE-SAD with an architectural foundation designed to expand across all student organizations in PDM for the Capstone project.

---

## Technical Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend Presentation** | **HTML5 + React 19 + JavaScript** | High-performance interactive UI for ledgers, denomination counters, and digital document previews. |
| **Styling & Design System** | **CSS3 (Tailwind CSS v4)** | Clean Apple-inspired minimal aesthetics replicating official school document standards. |
| **Application & Server Runtime** | **Node.js (Next.js 15+ App Router)** | Unified full-stack JavaScript environment powering server route handlers (`/api/reports/docx`, `/api/chat`). |
| **Document Generation Engine** | **`docx` (Node.js OpenXML Engine)** | Assembles dynamic transaction and proposal data into 1:1 institutional Word (`.docx`) files. |
| **Database & Cloud Storage** | **Supabase (PostgreSQL)** | Relational database enforcing ACID constraints, Row-Level Security (RLS), and secure receipt storage. |
| **AI Co-Pilot** | **`@google/generative-ai` (Gemini API)** | Deterministic conversational co-pilot for Taglish/English queries, bounded to structured database aggregations. |

---

## Three Fluid States

<table width="100%">
<tr>
<td width="33%" align="center">
<b>Daily logging & GCash</b>
<br /><br />
Rapid inflow, disbursement, and out-of-pocket advance logging with personal GCash withdrawal reconciliation.
</td>
<td width="33%" align="center">
<b>Audit & reconciliation</b>
<br /><br />
Physical small cashbox denomination counts, receipt verification, and variance audits with abono alerts.
</td>
<td width="33%" align="center">
<b>Automated Institutional Clearance</b>
<br /><br />
Interactive HTML paper preview with in-place live editing, compiling into approved borderless tables and formatted signatory blocks for physical wet-ink routing.
</td>
</tr>
</table>

---

## Crafted Details

<div align="center">

| Operational ledger & assistant | Institutional Word compilation |
| :---: | :---: |
| Real-time transaction feed, cash-on-hand tracking, and grounded query chips | 1:1 reproduction of PDM CCS financial statements with transmittal letter |

</div>

- **Interactive HTML document preview**: Allows officers to preview the generated proposal or liquidation report on an 8.5" × 11" paper canvas and edit transmittal dates, signatory designations, and remarks in-place prior to export.
- **Pre-event business proposals**: Automates proposal creation for Club Week booth concessions, calculating product unit costs, projected revenue, and expected margins.
- **Physical cash reconciliation**: Provides an interactive denomination counter (₱1,000 down to ₱1 coins) to verify the physical small cashbox against system ledger totals, prompting for justified shortages or officer abono.
- **Personal advance ("abono") tracking**: Dedicated Accounts Payable queue protecting faculty advisers and student officers from unreimbursed out-of-pocket expenses incurred during urgent campus events.
- **Non-receipted expense documentation**: Attaches structured acknowledgment slips and photographic proof for informal travel fares, neighborhood supplies, and emergency printing.
- **Sequential wet-ink routing**: Automatically formats signatory blocks in exact institutional order: Treasurer &rarr; Auditor &rarr; President &rarr; Advisers &rarr; Program Director &rarr; Dean.

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/butterkookies/FinLITE.git
cd FinLITE

# Install Node.js dependencies
npm install

# Launch the Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to view the application.

---

<div align="center">
<sub>Engineered for the League of Information Technology Enthusiasts • College of Computer Studies • Pambayang Dalubhasaan ng Marilao</sub>
</div>
