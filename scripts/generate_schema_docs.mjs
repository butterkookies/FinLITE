import fs from 'fs';
import path from 'path';

const { tables, fks } = JSON.parse(fs.readFileSync('scripts/parsed_live_schema.json', 'utf8'));

const liveRowCounts = {
  profiles: 7,
  registration_requests: 19,
  auth_security_state: 10,
  email_verification_otps: 0,
  semesters: 6,
  semester_signatories: 38,
  categories: 10,
  transactions: 46,
  transaction_receipts: 13,
  transaction_comments: 8,
  advances_payable: 8,
  advance_disbursements: 7,
  advance_receipts: 1,
  debts_receivables: 3,
  debt_payments: 8,
  denominations: 11,
  cash_reconciliations: 13,
  cash_reconciliation_items: 143,
  audit_logs: 276
};

const subsystems = [
  {
    id: 'auth',
    name: '1. Identity, Access Control & Security State',
    color: '#4f46e5',
    bgLight: '#eef2ff',
    border: '#c7d2fe',
    description: 'Manages user identities, academic organization roles, granular permission matrices, account approval pipelines, and cryptographic security credentials.',
    tables: ['profiles', 'registration_requests', 'auth_security_state', 'email_verification_otps']
  },
  {
    id: 'gov',
    name: '2. Academic Term & Signatory Governance',
    color: '#2563eb',
    bgLight: '#eff6ff',
    border: '#bfdbfe',
    description: 'Enforces academic semester continuity, starting cash floats, active fiscal periods, and official organizational signatories required for report accreditation.',
    tables: ['semesters', 'semester_signatories']
  },
  {
    id: 'ledger',
    name: '3. Central Financial Ledger & Vouchers',
    color: '#0d9488',
    bgLight: '#f0fdfa',
    border: '#99f6e4',
    description: 'The core double-entry accounting ledger of FinLITE. Manages inflow/outflow vouchers, budget category taxonomy, audit states, auditor review remarks, and physical receipt assets.',
    tables: ['categories', 'transactions', 'transaction_receipts', 'transaction_comments']
  },
  {
    id: 'credit',
    name: '4. Liquidity, Credit & Payables (Abono Subsystem)',
    color: '#d97706',
    bgLight: '#fffbeb',
    border: '#fde68a',
    description: 'Handles out-of-pocket personal advances (abono) awaiting reimbursement, multi-installment reimbursement disbursements, proof-of-advance receipts, and member receivables/debts.',
    tables: ['advances_payable', 'advance_disbursements', 'advance_receipts', 'debts_receivables', 'debt_payments']
  },
  {
    id: 'audit',
    name: '5. Physical Cashbox Audit & Enterprise Logging',
    color: '#059669',
    bgLight: '#ecfdf5',
    border: '#a7f3d0',
    description: 'Maintains physical currency denomination templates, denomination counts, book-to-physical variance reconciliations, and immutable tamper-evident enterprise audit logging.',
    tables: ['denominations', 'cash_reconciliations', 'cash_reconciliation_items', 'audit_logs']
  }
];

// Helper to determine outgoing and incoming FKs
function getTableRelationships(tableName) {
  const outgoing = fks.filter(f => f.fromTable === tableName);
  const incoming = fks.filter(f => f.toTable === tableName);
  return { outgoing, incoming };
}

// Generate the visual HTML explorer
function generateHtml() {
  const tableDataJson = JSON.stringify({ tables, fks, liveRowCounts, subsystems });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FinLITE Live Database Schema Visualizer & Explorer</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #6366f1;
      --primary-hover: #4f46e5;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.5;
      padding: 24px;
    }
    header {
      margin-bottom: 24px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 20px;
    }
    h1 {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .badge-live {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .stats-bar {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px 16px;
      display: flex;
      flex-direction: column;
    }
    .stat-label { font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; }
    .stat-val { font-size: 20px; font-weight: 800; color: #38bdf8; font-family: 'JetBrains Mono', monospace; }

    /* Controls */
    .controls-container {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 24px;
      align-items: center;
      justify-content: space-between;
    }
    .subsystem-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .tab-btn {
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 8px 14px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.2s;
    }
    .tab-btn:hover { background: #334155; color: #fff; }
    .tab-btn.active {
      background: var(--primary);
      border-color: var(--primary);
      color: #fff;
      box-shadow: 0 0 15px rgba(99, 102, 241, 0.4);
    }
    .search-box {
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: #fff;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 14px;
      min-width: 280px;
      outline: none;
    }
    .search-box:focus { border-color: var(--primary); }

    /* Schema Grid */
    .subsystem-section {
      margin-bottom: 36px;
    }
    .subsystem-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid;
    }
    .subsystem-title { font-size: 18px; font-weight: 700; }
    .subsystem-desc { font-size: 13px; color: var(--text-muted); margin-left: 8px; }
    
    .table-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(370px, 1fr));
      gap: 20px;
    }
    .table-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
    }
    .table-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
      border-color: #64748b;
    }
    .table-card-header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(15, 23, 42, 0.5);
    }
    .table-name {
      font-size: 15px;
      font-weight: 700;
      color: #38bdf8;
      font-family: 'JetBrains Mono', monospace;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .row-pill {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 9999px;
      background: #334155;
      color: #94a3b8;
      font-weight: 600;
    }
    .col-list {
      max-height: 380px;
      overflow-y: auto;
      padding: 8px 0;
    }
    .col-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 16px;
      font-size: 12.5px;
      border-bottom: 1px solid rgba(51, 65, 85, 0.3);
      gap: 12px;
    }
    .col-row:last-child { border-bottom: none; }
    .col-row:hover { background: rgba(51, 65, 85, 0.25); }
    .col-left {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .col-name {
      font-family: 'JetBrains Mono', monospace;
      color: #e2e8f0;
    }
    .col-badges { display: flex; gap: 4px; }
    .badge {
      font-size: 9px;
      font-weight: 800;
      padding: 1px 4px;
      border-radius: 3px;
      text-transform: uppercase;
    }
    .badge-pk { background: #d97706; color: #fff; }
    .badge-fk { background: #0284c7; color: #fff; }
    .badge-req { color: #f43f5e; font-weight: bold; }
    .col-type {
      font-family: 'JetBrains Mono', monospace;
      color: #94a3b8;
      font-size: 11px;
      white-space: nowrap;
    }
    .table-footer {
      padding: 10px 16px;
      background: rgba(15, 23, 42, 0.3);
      border-top: 1px solid var(--border);
      font-size: 11.5px;
      color: var(--text-muted);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .fk-chip {
      background: rgba(2, 132, 199, 0.15);
      border: 1px solid rgba(2, 132, 199, 0.3);
      color: #7dd3fc;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10.5px;
      display: inline-block;
      margin: 2px 2px 2px 0;
    }

    /* Scrollbars */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #475569; }
  </style>
</head>
<body>

  <header>
    <div>
      <h1>
        <span>FinLITE Live Relational Database Schema</span>
        <span class="badge-live">Live Connected</span>
      </h1>
      <p style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">
        Database host: <code style="color: #38bdf8;">rmotihaxllmxughcymvs.supabase.co</code> · Extracted via Live PostgREST API
      </p>
    </div>
    <div class="stats-bar">
      <div class="stat-card">
        <span class="stat-label">Tables</span>
        <span class="stat-val" id="stat-tables">19</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Columns</span>
        <span class="stat-val" id="stat-cols">221</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Foreign Keys</span>
        <span class="stat-val" id="stat-fks">31</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Live Rows</span>
        <span class="stat-val" id="stat-rows">627</span>
      </div>
    </div>
  </header>

  <div class="controls-container">
    <div class="subsystem-tabs" id="subsystem-tabs">
      <button class="tab-btn active" data-filter="all">All Subsystems (19)</button>
      <button class="tab-btn" data-filter="auth">1. Identity & Auth (4)</button>
      <button class="tab-btn" data-filter="gov">2. Governance (2)</button>
      <button class="tab-btn" data-filter="ledger">3. Ledger & Vouchers (4)</button>
      <button class="tab-btn" data-filter="credit">4. Liquidity & Abono (5)</button>
      <button class="tab-btn" data-filter="audit">5. Cashbox & Audit (4)</button>
    </div>
    <input type="text" class="search-box" id="search-box" placeholder="Search tables, columns, or types...">
  </div>

  <main id="schema-container">
    <!-- Populated by JavaScript -->
  </main>

  <script>
    const SCHEMA_DATA = ${tableDataJson};

    function renderSchema(filterSubsystem = 'all', searchTerm = '') {
      const container = document.getElementById('schema-container');
      container.innerHTML = '';
      const term = searchTerm.toLowerCase().trim();

      SCHEMA_DATA.subsystems.forEach(sub => {
        if (filterSubsystem !== 'all' && sub.id !== filterSubsystem) return;

        // Filter tables in this subsystem
        const visibleTables = sub.tables.filter(tableName => {
          const table = SCHEMA_DATA.tables[tableName];
          if (!table) return false;
          if (!term) return true;

          // Check table name
          if (tableName.toLowerCase().includes(term)) return true;

          // Check column names and types
          return table.columns.some(c => 
            c.name.toLowerCase().includes(term) || 
            c.type.toLowerCase().includes(term)
          );
        });

        if (visibleTables.length === 0) return;

        const subSection = document.createElement('div');
        subSection.className = 'subsystem-section';

        const subHeader = document.createElement('div');
        subHeader.className = 'subsystem-header';
        subHeader.style.borderColor = sub.color;
        subHeader.innerHTML = \`
          <h2 class="subsystem-title" style="color: \${sub.color}">\${sub.name}</h2>
          <span class="subsystem-desc">\${sub.description}</span>
        \`;
        subSection.appendChild(subHeader);

        const grid = document.createElement('div');
        grid.className = 'table-grid';

        visibleTables.forEach(tableName => {
          const table = SCHEMA_DATA.tables[tableName];
          const rowCount = SCHEMA_DATA.liveRowCounts[tableName] ?? 0;
          const card = document.createElement('div');
          card.className = 'table-card';

          const cardHeader = document.createElement('div');
          cardHeader.className = 'table-card-header';
          cardHeader.innerHTML = \`
            <div class="table-name">
              <span>\${tableName}</span>
            </div>
            <span class="row-pill">\${rowCount} rows</span>
          \`;
          card.appendChild(cardHeader);

          const colList = document.createElement('div');
          colList.className = 'col-list';

          table.columns.forEach(col => {
            const row = document.createElement('div');
            row.className = 'col-row';

            const left = document.createElement('div');
            left.className = 'col-left';

            const badges = document.createElement('span');
            badges.className = 'col-badges';
            if (col.isPk) badges.innerHTML += '<span class="badge badge-pk">PK</span>';
            if (col.fk) badges.innerHTML += '<span class="badge badge-fk">FK</span>';

            const name = document.createElement('span');
            name.className = 'col-name';
            name.textContent = col.name;
            if (col.required) {
              name.innerHTML += '<span class="badge-req" title="Required (NOT NULL)">*</span>';
            }

            left.appendChild(badges);
            left.appendChild(name);

            const right = document.createElement('span');
            right.className = 'col-type';
            right.textContent = col.type;

            row.appendChild(left);
            row.appendChild(right);
            colList.appendChild(row);
          });
          card.appendChild(colList);

          // Relationships footer
          const outgoing = SCHEMA_DATA.fks.filter(f => f.fromTable === tableName);
          const incoming = SCHEMA_DATA.fks.filter(f => f.toTable === tableName);

          if (outgoing.length > 0 || incoming.length > 0) {
            const footer = document.createElement('div');
            footer.className = 'table-footer';

            if (outgoing.length > 0) {
              const outDiv = document.createElement('div');
              outDiv.innerHTML = '<strong style="color: #cbd5e1;">References: </strong>' +
                outgoing.map(f => \`<span class="fk-chip">\${f.fromCol} → \${f.toTable}</span>\`).join(' ');
              footer.appendChild(outDiv);
            }
            if (incoming.length > 0) {
              const inDiv = document.createElement('div');
              inDiv.innerHTML = '<strong style="color: #cbd5e1;">Referenced By: </strong>' +
                incoming.map(f => \`<span class="fk-chip">\${f.fromTable}</span>\`).join(' ');
              footer.appendChild(inDiv);
            }
            card.appendChild(footer);
          }

          grid.appendChild(card);
        });

        subSection.appendChild(grid);
        container.appendChild(subSection);
      });
    }

    // Tabs filter
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.getAttribute('data-filter');
        const search = document.getElementById('search-box').value;
        renderSchema(filter, search);
      });
    });

    // Search input
    document.getElementById('search-box').addEventListener('input', (e) => {
      const activeBtn = document.querySelector('.tab-btn.active');
      const filter = activeBtn ? activeBtn.getAttribute('data-filter') : 'all';
      renderSchema(filter, e.target.value);
    });

    // Initial render
    renderSchema('all', '');
  </script>
</body>
</html>`;
}

// Generate the Markdown artifact with Mermaid diagram
function generateMarkdownArtifact() {
  let md = `# FinLITE Live Database Relational Schema & Architecture Specification

> **Database Endpoint**: \`rmotihaxllmxughcymvs.supabase.co\`  
> **Extraction Mode**: Live PostgREST OpenAPI Specification & Live Supabase Row Counts  
> **Schema Standard**: Pure Third Normal Form (3NF)  
> **Total Active Physical Tables**: 19  
> **Total Relational Columns**: 221  
> **Total Foreign Key Integrity Links**: 31  
> **Total Live Rows**: 627  

---

## 1. Relational Subsystems Overview

FinLITE organizes its 19 physical tables into 5 academic financial subsystems:

| Subsystem | Live Tables | Tables Included | Live Rows |
| :--- | :---: | :--- | :---: |
| **1. Identity, Access Control & Security** | 4 | \`profiles\`, \`registration_requests\`, \`auth_security_state\`, \`email_verification_otps\` | 36 |
| **2. Academic Term & Governance** | 2 | \`semesters\`, \`semester_signatories\` | 44 |
| **3. Central Financial Ledger & Vouchers** | 4 | \`categories\`, \`transactions\`, \`transaction_receipts\`, \`transaction_comments\` | 77 |
| **4. Liquidity, Credit & Payables (Abono)** | 5 | \`advances_payable\`, \`advance_disbursements\`, \`advance_receipts\`, \`debts_receivables\`, \`debt_payments\` | 27 |
| **5. Physical Cashbox Audit & Logs** | 4 | \`denominations\`, \`cash_reconciliations\`, \`cash_reconciliation_items\`, \`audit_logs\` | 443 |
| **TOTALS** | **19** | **Complete Relational 3NF Schema** | **627** |

---

## 2. Complete Entity-Relationship Diagram (ERD)

The diagram below maps all 19 entities and their 31 foreign key constraints:

\`\`\`mermaid
erDiagram
    profiles ||--o{ registration_requests : "reviewed_by / approved_profile_id"
    profiles ||--o{ auth_security_state : "auth_user_id"
    profiles ||--o{ audit_logs : "user_id"
    profiles ||--o{ transactions : "logged_by / audited_by / archived_by"
    profiles ||--o{ transaction_receipts : "uploaded_by"
    profiles ||--o{ transaction_comments : "user_id / author_id"
    profiles ||--o{ advances_payable : "created_by"
    profiles ||--o{ advance_disbursements : "disbursed_by"
    profiles ||--o{ debts_receivables : "created_by"
    profiles ||--o{ debt_payments : "received_by"
    profiles ||--o{ cash_reconciliations : "counted_by / verified_by / adviser_decision_by"
    
    semesters ||--o{ semester_signatories : "semester_id"
    semesters ||--o{ transactions : "semester_id"
    semesters ||--o{ cash_reconciliations : "semester_id"

    categories ||--o{ transactions : "category_id"
    categories ||--o{ advances_payable : "category_id"

    transactions ||--o{ transaction_receipts : "transaction_id"
    transactions ||--o{ transaction_comments : "transaction_id"
    transactions ||--o{ advance_disbursements : "transaction_id"
    transactions ||--o{ debt_payments : "transaction_id"

    advances_payable ||--o{ advance_disbursements : "advance_id"
    advances_payable ||--o{ advance_receipts : "advance_id"

    debts_receivables ||--o{ debt_payments : "debt_id"

    denominations ||--o{ cash_reconciliation_items : "denomination_id"
    cash_reconciliations ||--o{ cash_reconciliation_items : "reconciliation_id"
\`\`\`

---

## 3. Comprehensive Table-by-Table Schema Specification

`;

  subsystems.forEach(sub => {
    md += `### ${sub.name}\n\n`;
    md += `${sub.description}\n\n`;

    sub.tables.forEach(tableName => {
      const table = tables[tableName];
      const rows = liveRowCounts[tableName] ?? 0;
      md += `#### \`${tableName}\` (${rows} live rows)\n\n`;
      md += `| Column | Data Type | Constraints | Description / Foreign Key |\n`;
      md += `| :--- | :--- | :---: | :--- |\n`;

      table.columns.forEach(c => {
        const constraints = [];
        if (c.isPk) constraints.push('**PK**');
        if (c.fk) constraints.push('**FK**');
        if (c.required) constraints.push('NOT NULL');

        let note = '';
        if (c.fk) {
          note = `References \`${c.fk.targetTable}.${c.fk.targetCol}\``;
        }

        md += `| \`${c.name}\` | \`${c.type}\` | ${constraints.join(', ') || '—'} | ${note} |\n`;
      });
      md += `\n`;
    });
  });

  md += `---

## 4. Foreign Key Referential Integrity Reference (31 Foreign Keys)

| Source Table | Foreign Key Column | Target Table | Target Column |
| :--- | :--- | :--- | :--- |
`;

  fks.forEach(f => {
    md += `| \`${f.fromTable}\` | \`${f.fromCol}\` | \`${f.toTable}\` | \`${f.toCol}\` |\n`;
  });

  return md;
}

// 1. Output the interactive HTML visualizer
const htmlPath = path.resolve('docs/specs/live_schema_visualizer.html');
fs.writeFileSync(htmlPath, generateHtml(), 'utf8');
console.log('✅ Generated HTML Visualizer:', htmlPath);

// 2. Output the Markdown Artifact
const artifactDir = path.resolve('C:/Users/user/.gemini/antigravity/brain/053df653-6ec4-42bf-803f-e540f0afab13');
const artifactPath = path.join(artifactDir, 'live_database_schema.md');
fs.writeFileSync(artifactPath, generateMarkdownArtifact(), 'utf8');
console.log('✅ Generated Markdown Artifact:', artifactPath);
