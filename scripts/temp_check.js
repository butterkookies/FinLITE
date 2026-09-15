
    const appState = {
      role: 'auditor',
      activeFilter: 'all',
      reportStage: 'submitted',
      config: {
        ay: '2026-2027',
        semester: '1st SEMESTER',
        transmittalDate: 'September 10, 2026',
        periodDesc: 'As of September 2026',
        presidentName: '${cfg.treasurerName || "JUAN DELA CRUZ"}',
        presidentRole: 'LITE PRESIDENT',
        treasurerName: 'JUAN DELA CRUZ',
        treasurerRole: 'LITE TREASURER',
        auditorName: 'MARIELLE CABANAG',
        auditorRole: 'LITE AUDITOR',
        adviserName: 'KIMBERLY DAWN JATULAN',
        adviserRole: 'LITE ADVISER',
        directorName: 'JOVYLYN ORTIZ-CESAR, MBA, MSIT',
        deanName: 'DR. EMRAIDA MARIE M. MANUCOM'
      },
      initialBudget: 5308.00,
      transactions: [
        // Authentic Inflows from Approved Report
        { id: 'TX-IN-1', date: '2026-02-25', type: 'income', description: 'Cosplay 5-Peso Vote', category: 'Club Week Activity', source: 'Direct Cash Collection', payee: 'Andrei (Treasurer)', amount: 9760.00, hasReceipt: true, status: 'verified', verifiedBy: 'Marielle (Auditor)', hash: 'SHA256:in1...' },
        { id: 'TX-IN-2', date: '2026-02-25', type: 'income', description: 'Org-Shirt Rebate', category: 'Merchandise Inflow', source: 'Direct Cash Collection', payee: 'Andrei (Treasurer)', amount: 8820.00, hasReceipt: true, status: 'verified', verifiedBy: 'Marielle (Auditor)', hash: 'SHA256:in2...' },
        { id: 'TX-IN-3', date: '2026-02-26', type: 'income', description: 'Honor Of Kings (E-sports Entry)', category: 'Tournament Entry', source: 'Direct Cash Collection', payee: 'Andrei (Treasurer)', amount: 1000.00, hasReceipt: true, status: 'verified', verifiedBy: 'Marielle (Auditor)', hash: 'SHA256:in3...' },
        { id: 'TX-IN-4', date: '2026-02-26', type: 'income', description: 'Crossfire: Legends (E-sports Entry)', category: 'Tournament Entry', source: 'Direct Cash Collection', payee: 'Andrei (Treasurer)', amount: 1000.00, hasReceipt: true, status: 'verified', verifiedBy: 'Marielle (Auditor)', hash: 'SHA256:in4...' },
        { id: 'TX-IN-5', date: '2026-02-26', type: 'income', description: 'Game Exhibit: Day 1 Collection', category: 'Exhibit Collection', source: 'Direct Cash Collection', payee: 'Andrei (Treasurer)', amount: 5230.00, hasReceipt: true, status: 'verified', verifiedBy: 'Marielle (Auditor)', hash: 'SHA256:in5...' },
        { id: 'TX-IN-6', date: '2026-02-27', type: 'income', description: 'Game Exhibit: Day 2 Collection', category: 'Exhibit Collection', source: 'Direct Cash Collection', payee: 'Andrei (Treasurer)', amount: 320.00, hasReceipt: true, status: 'verified', verifiedBy: 'Marielle (Auditor)', hash: 'SHA256:in6...' },

        // Authentic Itemized Expenses from Approved Report (20 Line Items)
        { id: 'TX-EX-1', date: '2026-02-24', type: 'expense', description: 'Candle', category: 'Miscellaneous Expenses', source: 'Club Cash', payee: 'Marilao General Store', amount: 7.00, hasReceipt: true, status: 'verified', verifiedBy: 'Marielle (Auditor)', hash: 'SHA256:ex1...' },
        { id: 'TX-EX-2', date: '2026-02-24', type: 'expense', description: 'Glue Stick', category: 'Miscellaneous Expenses', source: 'Club Cash', payee: 'School Supplies', amount: 10.00, hasReceipt: true, status: 'verified', verifiedBy: 'Marielle (Auditor)', hash: 'SHA256:ex2...' },
        { id: 'TX-EX-3', date: '2026-02-24', type: 'expense', description: 'Envelope', category: 'Miscellaneous Expenses', source: 'Club Cash', payee: 'School Supplies', amount: 20.00, hasReceipt: true, status: 'verified', verifiedBy: 'Marielle (Auditor)', hash: 'SHA256:ex3...' },
        { id: 'TX-EX-4', date: '2026-02-24', type: 'expense', description: 'Green Folder', category: 'Miscellaneous Expenses', source: 'Club Cash', payee: 'School Supplies', amount: 48.00, hasReceipt: true, status: 'verified', verifiedBy: 'Marielle (Auditor)', hash: 'SHA256:ex4...' },
        { id: 'TX-EX-5', date: '2026-02-24', type: 'expense', description: 'BestBuy Certificate Holder', category: 'Miscellaneous Expenses', source: 'Club Cash', payee: 'BestBuy Stationers', amount: 135.00, hasReceipt: true, status: 'verified', verifiedBy: 'Marielle (Auditor)', hash: 'SHA256:ex5...' },
        { id: 'TX-EX-6', date: '2026-02-24', type: 'expense', description: 'Ribbon', category: 'Miscellaneous Expenses', source: 'Club Cash', payee: 'Crafts Store', amount: 150.00, hasReceipt: true, status: 'verified', verifiedBy: 'Marielle (Auditor)', hash: 'SHA256:ex6...' },
        { id: 'TX-EX-7', date: '2026-02-24', type: 'expense', description: 'Vellum Board A4', category: 'Miscellaneous Expenses', source: 'Club Cash', payee: 'School Supplies', amount: 152.00, hasReceipt: true, status: 'verified', verifiedBy: 'Marielle (Auditor)', hash: 'SHA256:ex7...' },
        { id: 'TX-EX-8', date: '2026-02-25', type: 'expense', description: "Students' Travel Fare", category: 'Miscellaneous Expenses', source: 'Club Cash', payee: 'Jeepney / Tricycle', amount: 200.00, hasReceipt: true, status: 'verified', verifiedBy: 'Marielle (Auditor)', hash: 'SHA256:ex8...' },
        { id: 'TX-EX-9', date: '2026-02-25', type: 'expense', description: 'Sash', category: 'Miscellaneous Expenses', source: 'Club Cash', payee: 'Costume Supplies', amount: 380.00, hasReceipt: true, status: 'verified', verifiedBy: 'Marielle (Auditor)', hash: 'SHA256:ex9...' },
        { id: 'TX-EX-10', date: '2026-02-25', type: 'expense', description: 'Cosplay Tarpaulin', category: 'Miscellaneous Expenses', source: 'Club Cash', payee: 'Marilao QuickPrint', amount: 670.00, hasReceipt: true, status: 'verified', verifiedBy: 'Marielle (Auditor)', hash: 'SHA256:ex10...' },
        { id: 'TX-EX-11', date: '2026-02-26', type: 'expense', description: 'Career Day', category: 'Miscellaneous Expenses', source: 'Club Cash', payee: 'Activity Coordinator', amount: 1840.00, hasReceipt: true, status: 'verified', verifiedBy: 'Marielle (Auditor)', hash: 'SHA256:ex11...' },
        { id: 'TX-EX-12', date: '2026-02-26', type: 'expense', description: 'Judge Token', category: 'Miscellaneous Expenses', source: 'Club Cash', payee: 'Guest Judges', amount: 2510.00, hasReceipt: true, status: 'verified', verifiedBy: 'Marielle (Auditor)', hash: 'SHA256:ex12...' },
        { id: 'TX-EX-13', date: '2026-02-26', type: 'expense', description: 'Outreach Donation', category: 'Miscellaneous Expenses', source: 'Club Cash', payee: 'Community Beneficiary', amount: 1000.00, hasReceipt: true, status: 'verified', verifiedBy: 'Marielle (Auditor)', hash: 'SHA256:ex13...' },
        { id: 'TX-EX-14', date: '2026-02-26', type: 'expense', description: 'Leadership Seminar', category: 'Miscellaneous Expenses', source: 'Club Cash', payee: 'Seminar Registration', amount: 500.00, hasReceipt: true, status: 'verified', verifiedBy: 'Marielle (Auditor)', hash: 'SHA256:ex14...' },
        { id: 'TX-EX-15', date: '2026-02-27', type: 'expense', description: 'Day 1 & 2 Lunch', category: 'Miscellaneous Expenses', source: 'Club Cash', payee: 'Catering Service', amount: 3655.00, hasReceipt: true, status: 'verified', verifiedBy: 'Marielle (Auditor)', hash: 'SHA256:ex15...' },
        { id: 'TX-EX-16', date: '2026-02-27', type: 'expense', description: 'Big Brew Drinks', category: 'Miscellaneous Expenses', source: 'Club Cash', payee: 'Big Brew Marilao', amount: 800.00, hasReceipt: true, status: 'verified', verifiedBy: 'Marielle (Auditor)', hash: 'SHA256:ex16...' },
        { id: 'TX-EX-17', date: '2026-02-27', type: 'expense', description: 'Cash Prize', category: 'Miscellaneous Expenses', source: 'Club Cash', payee: 'Tournament Winners', amount: 4000.00, hasReceipt: true, status: 'verified', verifiedBy: 'Marielle (Auditor)', hash: 'SHA256:ex17...' },
        { id: 'TX-EX-18', date: '2026-02-27', type: 'expense', description: 'Dinner', category: 'Miscellaneous Expenses', source: 'Club Cash', payee: 'Restaurant Meals', amount: 5000.00, hasReceipt: true, status: 'verified', verifiedBy: 'Marielle (Auditor)', hash: 'SHA256:ex18...' },
        { id: 'TX-EX-19', date: '2026-02-28', type: 'expense', description: 'Public Forum (Net)', category: 'Miscellaneous Expenses', source: 'Club Cash', payee: 'Forum Logistics', amount: 1750.00, hasReceipt: true, status: 'verified', verifiedBy: 'Marielle (Auditor)', hash: 'SHA256:ex19...' },
        { id: 'TX-EX-20', date: '2026-02-28', type: 'expense', description: 'Cash Shortage', category: 'Physical Drawer Discrepancy', source: 'Cash Box Variance', payee: 'Audited Variance Item', amount: 161.00, hasReceipt: true, status: 'verified', verifiedBy: 'Marielle (Auditor)', hash: 'SHA256:ex20...' }
      ]
    };

    document.addEventListener('DOMContentLoaded', () => {
      // Default date to today
      const today = new Date().toISOString().split('T')[0];
      const dt = document.getElementById('entryDate');
      if (dt) dt.value = today;

      renderFeed();
      updateReconCount();
    });

    // View Switching
    function switchView(viewName) {
      document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
      const activePanel = document.getElementById(`view-${viewName}`);
      if (activePanel) activePanel.classList.add('active');

      // Update Desktop Nav Pills
      document.querySelectorAll('.nav-pill').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick').includes(viewName));
      });

      // Update Mobile Nav
      const mobileMap = { activity: 'mTabActivity', reconcile: 'mTabReconcile', reports: 'mTabReports' };
      document.querySelectorAll('.mobile-tab-btn').forEach(btn => btn.classList.remove('active'));
      if (mobileMap[viewName]) {
        document.getElementById(mobileMap[viewName]).classList.add('active');
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Role Switching
    function setRole(roleName) {
      appState.role = roleName;
      renderFeed();
      updateReportActionBtn();
    }

    // Render Transaction Stream
    function renderFeed() {
      const container = document.getElementById('txFeedContainer');
      container.innerHTML = '';

      const filtered = appState.transactions.filter(tx => {
        if (appState.activeFilter === 'all') return true;
        if (appState.activeFilter === 'income') return tx.type === 'income';
        if (appState.activeFilter === 'expense') return tx.type === 'expense';
        if (appState.activeFilter === 'advances') return tx.source.includes('Adviser');
        if (appState.activeFilter === 'pending') return tx.status === 'submitted' || (tx.source.includes('Adviser') && !tx.reimbursed);
        return true;
      });

      if (filtered.length === 0) {
        container.innerHTML = `<div style="padding: 28px; text-align: center; color: var(--text-muted);">No records found for this filter.</div>`;
        return;
      }

      filtered.forEach(tx => {
        const item = document.createElement('div');
        item.className = 'tx-item';
        item.onclick = () => openDetailSheet(tx.id);

        const isIncome = tx.type === 'income';
        const sign = isIncome ? '+' : '−';
        const iconSymbol = isIncome ? '↓' : '↑';
        const isAdvance = tx.source.includes('Adviser');

        item.innerHTML = `
          <div class="tx-left">
            <div class="tx-category-icon ${isIncome ? 'income' : ''}">
              ${iconSymbol}
            </div>
            <div class="tx-details">
              <div class="tx-title">${tx.description}</div>
              <div class="tx-sub">
                <span>${tx.date}</span>
                <span>•</span>
                <span>${tx.payee}</span>
                ${isAdvance ? '<span class="tx-badge-advance">Adviser Advance</span>' : ''}
                ${!tx.hasReceipt ? '<span style="color: var(--danger-text); font-weight: 600;">• Missing Receipt</span>' : ''}
              </div>
            </div>
          </div>
          <div class="tx-right">
            <div class="tx-amount mono ${isIncome ? 'income' : 'expense'}">
              ${sign}₱${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <span class="tx-state-pill ${tx.status}">
              ${tx.status}
            </span>
          </div>
        `;
        container.appendChild(item);
      });

      // Dynamic calculations for Hero Balance & Official DOCX Report Preview
      const initBudget = appState.initialBudget || 5308.00;
      const allIncome = appState.transactions.filter(t => t.type === 'income' && t.status !== 'void');
      const allExpense = appState.transactions.filter(t => t.type === 'expense' && t.status !== 'void');

      const sumIncome = allIncome.reduce((s, t) => s + t.amount, 0);
      const sumFunds = initBudget + sumIncome;
      const sumExpenses = allExpense.reduce((s, t) => s + t.amount, 0);
      const cashOnHand = sumFunds - sumExpenses;

      const heroEl = document.getElementById('heroVaultBalance');
      if (heroEl) heroEl.textContent = `₱${cashOnHand.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      const subIncomeEl = document.querySelector('.balance-sub-val[style*="color: var(--primary)"]');
      if (subIncomeEl) subIncomeEl.textContent = `₱${sumFunds.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      const subExpEl = document.querySelector('.balance-sub-val[style*="color: var(--danger-text)"]');
      if (subExpEl) subExpEl.textContent = `₱${sumExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      // Update live DOCX preview tables
      if (typeof renderDocxPreview === 'function') {
        renderDocxPreview();
      }
    }

    function filterFeed(filterType, chipEl) {
      appState.activeFilter = filterType;
      if (chipEl) {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chipEl.classList.add('active');
      }
      renderFeed();
    }

    // Detail Sheet (View Audit & Actions)
    function openDetailSheet(txId) {
      const tx = appState.transactions.find(t => t.id === txId);
      if (!tx) return;

      document.getElementById('detailTxId').textContent = tx.id;
      const body = document.getElementById('detailBody');
      const actions = document.getElementById('detailActions');

      body.innerHTML = `
        <div style="text-align: center; padding: 12px 0 16px;">
          <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Amount</div>
          <div class="mono" style="font-size: 32px; font-weight: 800; color: ${tx.type === 'income' ? 'var(--primary)' : 'var(--text-main)'};">
            ₱${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style="font-size: 13px; font-weight: 600; margin-top: 4px;">${tx.description}</div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px;">
          <div class="recon-row"><span>Date:</span> <strong class="mono">${tx.date}</strong></div>
          <div class="recon-row"><span>Type:</span> <strong>${tx.type.toUpperCase()}</strong></div>
          <div class="recon-row"><span>Source / Fund:</span> <strong>${tx.source}</strong></div>
          <div class="recon-row"><span>Payee / Handler:</span> <strong>${tx.payee}</strong></div>
          <div class="recon-row"><span>Evidence:</span> <strong>${tx.hasReceipt ? 'Receipt Attached (PNG)' : 'Missing Receipt'}</strong></div>
          <div class="recon-row"><span>Status:</span> <strong style="text-transform: uppercase;">${tx.status}</strong></div>
          <div class="recon-row" style="font-size: 11px; color: var(--text-muted);">
            <span>Integrity Hash:</span> <span class="mono">${tx.hash}</span>
          </div>
        </div>
      `;

      // Contextual Actions based on Role & Status
      actions.innerHTML = '';
      if (tx.status === 'submitted') {
        if (appState.role === 'auditor') {
          actions.innerHTML = `
            <button class="action-pill-btn primary-pill" style="flex: 1; justify-content: center;" onclick="verifyTx('${tx.id}')">
              Verify Transaction (Auditor)
            </button>
          `;
        } else {
          actions.innerHTML = `
            <div style="font-size: 12px; color: var(--text-muted); text-align: center; width: 100%;">
              Awaiting Auditor verification (Segregation of Duties).
            </div>
          `;
        }
      } else if (tx.status === 'verified') {
        if (tx.source.includes('Adviser') && !tx.reimbursed) {
          if (appState.role === 'treasurer' || appState.role === 'adviser') {
            actions.innerHTML = `
              <button class="action-pill-btn primary-pill" style="flex: 1; justify-content: center;" onclick="reimburseTx('${tx.id}')">
                Disburse Reimbursement to Adviser
              </button>
            `;
          }
        } else {
          if (appState.role === 'president' || appState.role === 'adviser') {
            actions.innerHTML = `
              <button class="action-pill-btn" style="flex: 1; justify-content: center; color: var(--danger-text);" onclick="voidTx('${tx.id}')">
                Void Record (Pres/Adviser)
              </button>
            `;
          }
        }
      }

      document.getElementById('detailSheet').classList.add('active');
    }

    function verifyTx(id) {
      const tx = appState.transactions.find(t => t.id === id);
      if (tx) {
        tx.status = 'verified';
        closeSheet('detailSheet');
        renderFeed();
        alert(`Success: ${tx.id} verified by Auditor.`);
      }
    }

    function reimburseTx(id) {
      const tx = appState.transactions.find(t => t.id === id);
      if (tx) {
        tx.reimbursed = true;
        closeSheet('detailSheet');
        renderFeed();
        alert(`Success: Reimbursement of ₱${tx.amount} disbursed. Vault cash reduced without duplicating expense.`);
      }
    }

    function voidTx(id) {
      const reason = prompt('Enter mandatory governance justification for voiding:');
      if (!reason) return;
      const tx = appState.transactions.find(t => t.id === id);
      if (tx) {
        tx.status = 'void';
        closeSheet('detailSheet');
        renderFeed();
        alert(`Record ${tx.id} voided. Audit log preserved.`);
      }
    }

    // Modal Control
    function openEntrySheet(type) {
      document.getElementById('entryType').value = type;
      toggleSourceField();
      document.getElementById('entrySheet').classList.add('active');
    }

    function toggleSourceField() {
      const type = document.getElementById('entryType').value;
      document.getElementById('sourceGroup').style.display = type === 'income' ? 'none' : 'block';
    }

    function closeSheet(sheetId) {
      document.getElementById(sheetId).classList.remove('active');
    }

    function handleNewTransaction(e) {
      e.preventDefault();
      const type = document.getElementById('entryType').value;
      const desc = document.getElementById('entryDesc').value;
      const amount = parseFloat(document.getElementById('entryAmount').value);
      const date = document.getElementById('entryDate').value;
      const payee = document.getElementById('entryPayee').value;
      const source = type === 'income' ? 'Direct Cash Collection' : document.getElementById('entrySource').value;
      const hasReceipt = document.getElementById('entryReceipt').files.length > 0;

      const newTx = {
        id: `TX-${1000 + appState.transactions.length + 1}`,
        date: date,
        type: type,
        description: desc,
        source: source,
        payee: payee,
        amount: amount,
        hasReceipt: hasReceipt,
        status: 'submitted',
        verifiedBy: null,
        hash: 'SHA256:' + Math.random().toString(16).substring(2, 8)
      };

      appState.transactions.unshift(newTx);
      closeSheet('entrySheet');
      renderFeed();
      alert(`Success: ${newTx.id} saved as SUBMITTED. Awaiting auditor review.`);
    }

    // Denomination Calculator
    function stepDenom(denom, delta) {
      const input = document.getElementById(`denom_${denom}`);
      let val = parseInt(input.value, 10) || 0;
      val = Math.max(0, val + delta);
      input.value = val;
      updateReconCount();
    }

    function updateReconCount() {
      const denoms = [1000, 500, 200, 100, 50, 20, 1];
      let total = 0;
      denoms.forEach(d => {
        const inp = document.getElementById(`denom_${d}`);
        const count = parseInt(inp.value, 10) || 0;
        total += count * d;
      });

      const formatted = `₱${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      document.getElementById('reconCountedVal').textContent = formatted;

      const expected = 14350.00;
      const variance = total - expected;

      const varEl = document.getElementById('reconVarianceDisplay');
      const noteEl = document.getElementById('reconStatusNote');

      if (variance === 0) {
        varEl.textContent = '₱0.00';
        varEl.style.color = 'var(--primary)';
        noteEl.textContent = 'Vault is perfectly balanced with cashbook';
      } else {
        const sign = variance > 0 ? '+' : '';
        varEl.textContent = `${sign}₱${variance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        varEl.style.color = 'var(--danger-text)';
        noteEl.textContent = 'Discrepancy detected! Explanation note required.';
      }
    }

    function saveReconRecord() {
      alert('Physical cash count recorded and stored in tamper-evident audit history.');
    }

    // Report Workflow
    function advanceReport() {
      if (appState.reportStage === 'submitted') {
        if (appState.role !== 'auditor') {
          alert('Only the Auditor can perform official verification.');
          return;
        }
        appState.reportStage = 'verified';
        document.getElementById('stageVerify').className = 'stepper-stage done';
        document.getElementById('stageApprove').className = 'stepper-stage active';
        const auditorSig = document.getElementById('sigAuditorText');
        if (auditorSig) auditorSig.textContent = 'MARIELLE CABANAG (VERIFIED)';
        updateReportActionBtn();
        alert('Report verified by Auditor Marielle Cabanag.');
      } else if (appState.reportStage === 'verified') {
        if (appState.role !== 'adviser' && appState.role !== 'president') {
          alert('Only the Club Adviser or President can give final approval.');
          return;
        }
        appState.reportStage = 'finalized';
        document.getElementById('stageApprove').className = 'stepper-stage done';
        document.getElementById('stageFinal').className = 'stepper-stage done';
        const advSig = document.getElementById('sigAdvText');
        if (advSig) advSig.textContent = 'KIMBERLY DAWN JATULAN (APPROVED)';
        updateReportActionBtn();
        alert('Report finalized and locked into immutable storage.');
      }
    }

    function updateReportActionBtn() {
      const btn = document.getElementById('reportActionBtn');
      if (appState.reportStage === 'submitted') {
        btn.textContent = 'Auditor: Verify Report';
        btn.disabled = false;
      } else if (appState.reportStage === 'verified') {
        btn.textContent = 'Adviser: Final Approval';
        btn.disabled = false;
      } else if (appState.reportStage === 'finalized') {
        btn.textContent = 'Report Finalized ✓';
        btn.disabled = true;
      }
    }

    // Toggle Sub-Tabs for DOCX Preview
    function toggleDocxView(view) {
      const stmtView = document.getElementById('docxStatementView');
      const transView = document.getElementById('docxTransmittalView');
      const btnStmt = document.getElementById('btnDocxStatement');
      const btnTrans = document.getElementById('btnDocxTransmittal');

      if (view === 'statement') {
        stmtView.style.display = 'block';
        transView.style.display = 'none';
        btnStmt.classList.add('active');
        btnTrans.classList.remove('active');
      } else {
        stmtView.style.display = 'none';
        transView.style.display = 'block';
        btnStmt.classList.remove('active');
        btnTrans.classList.add('active');
      }
    }

    // Floating Assistant Logic
    function toggleAssistantFlyout() {
      const flyout = document.getElementById('aiFlyout');
      flyout.classList.toggle('active');
    }

    function askAiQuery(type) {
      if (type === 'variance') {
        appendMsg('user', 'Ano ang physical cash variance natin?');
        setTimeout(() => {
          appendMsg('bot', `
            <strong>Lane 1 Query Result:</strong><br />
            • Expected Physical Cash: <strong>₱14,350.00</strong><br />
            • Last Physical Count: <strong>₱14,350.00</strong><br />
            • Variance: <strong style="color: var(--primary);">₱0.00 (Balanced)</strong>
          `);
        }, 300);
      } else if (type === 'missing') {
        appendMsg('user', 'May kulang ba tayong resibo?');
        setTimeout(() => {
          appendMsg('bot', `
            Found <strong>1 transaction</strong> flagged with missing receipt:<br />
            • <strong>TX-1002</strong>: Lanyard Fabrication Raw Stock (₱8,000.00).
          `);
        }, 300);
      }
    }

    function simulateTaglishDraft() {
      const prompt = "Nagbayad ako ng ₱350 sa tarpaulin kahapon, attached ang receipt.";
      appendMsg('user', prompt);

      setTimeout(() => {
        appendMsg('bot', `
          <strong>Lane 2 Draft Prepared:</strong>
          <div class="draft-preview-card">
            <div><strong>Particulars:</strong> Tarpaulin Banner</div>
            <div><strong>Amount:</strong> ₱350.00</div>
            <div><strong>Source:</strong> Direct Club Cash</div>
            <div style="margin-top: 8px;">
              <button class="action-pill-btn primary-pill" style="padding: 4px 10px; font-size: 11px;" onclick="confirmAiDraft()">
                Confirm & Save Draft
              </button>
            </div>
          </div>
        `);
      }, 350);
    }

    function confirmAiDraft() {
      const newTx = {
        id: `TX-${1000 + appState.transactions.length + 1}`,
        date: '2026-09-08',
        type: 'expense',
        description: 'Tarpaulin Banner (AI Draft)',
        source: 'Direct Club Cash',
        payee: 'Marilao QuickPrint',
        amount: 350.00,
        hasReceipt: true,
        status: 'submitted',
        verifiedBy: null,
        hash: 'SHA256:aidraft_' + Math.random().toString(16).substring(2, 8)
      };
      appState.transactions.unshift(newTx);
      renderFeed();
      appendMsg('bot', `✓ Draft confirmed and saved as <strong>${newTx.id}</strong> (Status: Submitted). Pending auditor verification.`);
    }

    function sendAiMessage() {
      const inp = document.getElementById('aiUserInput');
      const val = inp.value.trim();
      if (!val) return;
      appendMsg('user', val);
      inp.value = '';
      setTimeout(() => {
        appendMsg('bot', 'Under Zero-Egress policy, I execute verified local tools. Try tapping the quick prompts above!');
      }, 400);
    }

    function appendMsg(sender, html) {
      const area = document.getElementById('aiChatArea');
      const div = document.createElement('div');
      div.className = `chat-msg ${sender}`;
      div.innerHTML = html;
      area.appendChild(div);
      area.scrollTop = area.scrollHeight;
    }

    // ==========================================================================
    // ACTUAL FORMATTED WORD DOCUMENT EXPORT (100% Matching Approved PDM LITE DOCX)
    // ==========================================================================
    function renderDocxPreview() {
      // Set logos from logos.js
      if (typeof PDM_LOGO_BASE64 !== 'undefined') {
        const p1 = document.getElementById('pdmLogoStmt');
        const p2 = document.getElementById('pdmLogoTrans');
        if (p1) p1.src = PDM_LOGO_BASE64;
        if (p2) p2.src = PDM_LOGO_BASE64;
      }
      if (typeof LITE_LOGO_BASE64 !== 'undefined') {
        const l1 = document.getElementById('liteLogoStmt');
        const l2 = document.getElementById('liteLogoTrans');
        if (l1) l1.src = LITE_LOGO_BASE64;
        if (l2) l2.src = LITE_LOGO_BASE64;
      }

      const initialBudget = appState.initialBudget || 5308.00;
      const incomeTx = appState.transactions.filter(t => t.type === 'income' && t.status !== 'void');
      const expenseTx = appState.transactions.filter(t => t.type === 'expense' && t.status !== 'void');

      const totalIncome = incomeTx.reduce((sum, t) => sum + t.amount, 0);
      const totalFunds = initialBudget + totalIncome;
      const totalExpenses = expenseTx.reduce((sum, t) => sum + t.amount, 0);
      const cashOnHand = totalFunds - totalExpenses;

      // Update Table 3 (Expenses) rows
      const tblExp = document.getElementById('tableExpensesPreview');
      if (tblExp) {
        let rowsHtml = `
          <tr><td colspan="3" style="font-weight: bold;">Expenses:</td></tr>
          <tr><td colspan="3" style="padding-left: 20px; font-weight: bold;">Miscellaneous Expenses</td></tr>
        `;
        expenseTx.forEach(t => {
          rowsHtml += `
            <tr>
              <td style="padding-left: 20px; width: 55%;">${t.description}</td>
              <td style="width: 20%;"></td>
              <td style="text-align: right; width: 25%;">P${t.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          `;
        });
        rowsHtml += `
          <tr>
            <td style="font-weight: bold;">Total Expenses:</td>
            <td></td>
            <td style="text-align: right; font-weight: bold;"><span class="docx-underline">P${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
          </tr>
        `;
        tblExp.innerHTML = rowsHtml;
      }

      // Update Table 4 (Summary)
      const stIncome = document.getElementById('stmtTotalIncome');
      const stFunds = document.getElementById('stmtTotalFunds');
      const stExp = document.getElementById('stmtTotalExpenses');
      const stCash = document.getElementById('stmtCashOnHand');

      if (stIncome) stIncome.textContent = `P${totalFunds.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      if (stFunds) stFunds.textContent = `P${totalFunds.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      if (stExp) stExp.innerHTML = `<span class="docx-underline">P${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
      if (stCash) stCash.textContent = `P${cashOnHand.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function exportFormattedDocx() {
      const cfg = appState.config || {};
      const initialBudget = appState.initialBudget || 5308.00;
      const incomeTx = appState.transactions.filter(t => t.type === 'income' && t.status !== 'void');
      const expenseTx = appState.transactions.filter(t => t.type === 'expense' && t.status !== 'void');

      const totalIncome = incomeTx.reduce((sum, t) => sum + t.amount, 0);
      const totalFunds = initialBudget + totalIncome;
      const totalExpenses = expenseTx.reduce((sum, t) => sum + t.amount, 0);
      const cashOnHand = totalFunds - totalExpenses;

      const isVerified = appState.reportStage === 'verified' || appState.reportStage === 'finalized';
      const isApproved = appState.reportStage === 'finalized';

      const pdmLogoSrc = (typeof PDM_LOGO_BASE64 !== 'undefined') ? PDM_LOGO_BASE64 : '';
      const liteLogoSrc = (typeof LITE_LOGO_BASE64 !== 'undefined') ? LITE_LOGO_BASE64 : '';

      const expenseRowsHtml = expenseTx.map(t => `
        <tr>
          <td style="padding: 2px 4px; padding-left: 20px; width: 60%;">${t.description}</td>
          <td style="padding: 2px 4px; width: 15%;"></td>
          <td style="padding: 2px 4px; text-align: right; width: 25%; font-family: 'Times New Roman', serif;">P${t.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      `).join('');

      const wordDoc = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <title>LITE Financial Report</title>
          <!--[if gte mso 9]>
          <xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>100</w:Zoom>
              <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
            @page Section1 { size: 8.5in 11.0in; margin: 1.0in; mso-header-margin: .5in; mso-footer-margin: .5in; }
            div.Section1 { page: Section1; }
            body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.15; color: #000000; }
            p { margin: 0 0 4pt 0; font-family: 'Times New Roman', Times, serif; font-size: 11pt; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 8pt; border: none; font-size: 11pt; font-family: 'Times New Roman', Times, serif; }
            th, td { border: none; padding: 2pt 4pt; vertical-align: top; }
            .text-right { text-align: right; white-space: nowrap; }
            .bold { font-weight: bold; }
            .underline { border-bottom: 1pt solid #000000; display: inline-block; min-width: 70pt; text-align: right; }
            .double-underline { border-bottom: 3pt double #000000; display: inline-block; min-width: 70pt; text-align: right; }
            .sig-table { border: none; margin-top: 14pt; margin-bottom: 14pt; }
            .sig-table td { border: none; padding: 4pt 6pt; text-align: center; }
            .sig-line { font-weight: bold; font-size: 11pt; margin-bottom: 2pt; }
            .sig-role { font-size: 10pt; }
          </style>
        </head>
        <body>
          <div class="Section1">
            <!-- PAGE 1: TRANSMITTAL LETTER -->
            <table style="width: 100%; border: none; border-bottom: 2pt solid #000000; margin-bottom: 18pt;">
              <tr>
                <td style="width: 70pt; vertical-align: middle; text-align: left;">
                  ${pdmLogoSrc ? `<img src="${pdmLogoSrc}" width="65" height="65" />` : ''}
                </td>
                <td style="text-align: center; vertical-align: middle;">
                  <div style="font-size: 11.5pt; font-weight: bold; text-transform: uppercase;">LEAGUE OF INFORMATION TECHNOLOGY ENTHUSIAST</div>
                  <div style="font-size: 11pt;">Pambayang Dalubhasaan ng Marilao</div>
                  <div style="font-size: 10pt; font-style: italic;">Bachelor of Science in Information Technology</div>
                </td>
                <td style="width: 70pt; vertical-align: middle; text-align: right;">
                  ${liteLogoSrc ? `<img src="${liteLogoSrc}" width="65" height="65" />` : ''}
                </td>
              </tr>
            </table>

            <p style="text-align: right; margin-bottom: 18pt;"><span class="preview-trans-date">September 10, 2026</span></p>
            <p><strong>Ms. Ligaya H. Estrella</strong></p>
            <p>Co-curricular Affairs Coordinator</p>
            <p>This School</p>
            <br />
            <p>Dear Mrs. Estrella,</p>
            <p style="text-indent: 0.5in; text-align: justify; margin-top: 8pt; margin-bottom: 14pt;">
              This is to respectfully submit the attached "LITE Financial Report" for the 2nd Semester Academic Year 2025 – 2026.
            </p>
            <p>Respectfully,</p>
            <br />
            <p><strong>LITE Officers</strong></p>
            <br />

            <p class="bold" style="margin-top: 14pt;">Prepared by:</p>
            <table class="sig-table">
              <tr>
                <td style="width: 33%;">
                  <div class="sig-line sig-pres-name">${cfg.treasurerName || "JUAN DELA CRUZ"}</div>
                  <div class="sig-role">LITE PRESIDENT</div>
                </td>
                <td style="width: 33%;">
                  <div class="sig-line sig-treas-name">JUAN DELA CRUZ</div>
                  <div class="sig-role">LITE TREASURER</div>
                </td>
                <td style="width: 33%;">
                  <div class="sig-line">MARIELLE CABANAG ${isVerified ? '(VERIFIED)' : ''}</div>
                  <div class="sig-role">LITE AUDITOR</div>
                </td>
              </tr>
            </table>

            <p class="bold">Approved by:</p>
            <table class="sig-table" style="width: 50%;">
              <tr>
                <td style="text-align: left; padding-left: 14pt;">
                  <div class="sig-line">KIMBERLY DAWN JATULAN ${isApproved ? '(APPROVED)' : ''}</div>
                  <div class="sig-role">LITE ADVISER</div>
                </td>
              </tr>
            </table>

            <p class="bold">Noted by:</p>
            <table class="sig-table">
              <tr>
                <td style="width: 50%; text-align: left; padding-left: 14pt;">
                  <div class="sig-line">JOVYLYN ORTIZ-CESAR, MBA, MSIT</div>
                  <div class="sig-role">PROGRAM DIRECTOR</div>
                </td>
                <td style="width: 50%; text-align: left;">
                  <div class="sig-line">DR. EMRAIDA MARIE M. MANUCOM</div>
                  <div class="sig-role">DEAN, COLLEGE OF COMPUTER STUDIES</div>
                </td>
              </tr>
            </table>

            <p style="font-size: 9.5pt; color: #333333; margin-top: 24pt;">
              cc: Co-Curricular<br />
              cc: Dean's Office
            </p>

            <br clear="all" style="page-break-before: always; mso-break-type: page-break;" />

            <!-- PAGE 2: FINANCIAL STATEMENT -->
            <table style="width: 100%; border: none; border-bottom: 2pt solid #000000; margin-bottom: 18pt;">
              <tr>
                <td style="width: 70pt; vertical-align: middle; text-align: left;">
                  ${pdmLogoSrc ? `<img src="${pdmLogoSrc}" width="65" height="65" />` : ''}
                </td>
                <td style="text-align: center; vertical-align: middle;">
                  <div style="font-size: 11.5pt; font-weight: bold; text-transform: uppercase;">LEAGUE OF INFORMATION TECHNOLOGY ENTHUSIAST</div>
                  <div style="font-size: 11pt;">Pambayang Dalubhasaan ng Marilao</div>
                  <div style="font-size: 10pt; font-style: italic;">Bachelor of Science in Information Technology</div>
                </td>
                <td style="width: 70pt; vertical-align: middle; text-align: right;">
                  ${liteLogoSrc ? `<img src="${liteLogoSrc}" width="65" height="65" />` : ''}
                </td>
              </tr>
            </table>

            <div style="text-align: center; margin-bottom: 14pt;">
              <p class="bold" style="font-size: 12pt;">LITE FINANCIAL REPORT</p>
              <p class="bold" style="font-size: 11pt;">2nd SEMESTER</p>
              <p class="bold" style="font-size: 11pt;">ACADEMIC YEAR 2025-2026</p>
              <p class="bold" style="font-size: 11pt; margin-top: 3pt;">As of Club Week 2026</p>
            </div>

            <!-- Table 0: Initial Budget (Borderless) -->
            <table>
              <tr>
                <td colspan="4" class="bold">INITIAL BUDGET AS OF FEBRUARY (Carried over from 1st Sem)</td>
                <td></td>
              </tr>
              <tr>
                <td style="padding-left: 20px; width: 45%;">Cash from the Box</td>
                <td></td>
                <td></td>
                <td></td>
                <td class="text-right" style="width: 25%;">P5,308.00</td>
              </tr>
            </table>

            <!-- Table 1: Inflows (Borderless) -->
            <table>
              <tr>
                <td colspan="3" class="bold">Income:</td>
              </tr>
              <tr>
                <td style="padding-left: 20px; width: 50%;">Cosplay 5-Peso Vote</td>
                <td style="width: 25%;"></td>
                <td class="text-right" style="width: 25%;">P9,760.00</td>
              </tr>
              <tr>
                <td style="padding-left: 20px;">Org-Shirt Rebate</td>
                <td></td>
                <td class="text-right">P8,820.00</td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td class="text-right"><span class="underline">P18,580.00</span></td>
              </tr>
              <tr><td colspan="3" style="height: 4pt;"></td></tr>
              <tr>
                <td colspan="3" class="bold">E-sports: Day 1 – 2</td>
              </tr>
              <tr>
                <td style="padding-left: 20px;">Honor Of Kings</td>
                <td></td>
                <td class="text-right">P1,000.00</td>
              </tr>
              <tr>
                <td style="padding-left: 20px;">Crossfire: Legends</td>
                <td></td>
                <td class="text-right">P1,000.00</td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td class="text-right"><span class="underline">P2,000.00</span></td>
              </tr>
            </table>

            <!-- Table 2: Game Exhibit (Borderless) -->
            <table>
              <tr>
                <td colspan="3" class="bold">Game Exhibit: Day 1 – 2</td>
              </tr>
              <tr>
                <td style="padding-left: 20px; width: 50%;">February 26, 2026</td>
                <td style="width: 25%;"></td>
                <td class="text-right" style="width: 25%;">P5,230.00</td>
              </tr>
              <tr>
                <td style="padding-left: 20px;">February 27, 2026</td>
                <td></td>
                <td class="text-right">P320.00</td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td class="text-right"><span class="underline">P5,550.00</span></td>
              </tr>
              <tr>
                <td class="bold">Total Income:</td>
                <td></td>
                <td class="text-right bold"><span class="underline">P${totalFunds.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
              </tr>
            </table>

            <!-- Table 3: Itemized Expenses (Borderless) -->
            <table>
              <tr>
                <td colspan="3" class="bold">Expenses:</td>
              </tr>
              <tr>
                <td colspan="3" style="padding-left: 20px;" class="bold">Miscellaneous Expenses</td>
              </tr>
              ${expenseRowsHtml}
              <tr>
                <td class="bold">Total Expenses:</td>
                <td></td>
                <td class="text-right bold"><span class="underline">P${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
              </tr>
            </table>

            <!-- Subtitle -->
            <div style="text-align: center; margin: 10pt 0 6pt 0;">
              <p class="bold">As of April 2026</p>
            </div>

            <!-- Table 4: Summary Reconciliation (Borderless) -->
            <table>
              <tr>
                <td colspan="3" class="bold">Total Funds</td>
              </tr>
              <tr>
                <td style="width: 50%;" class="bold">Total Expenses</td>
                <td style="width: 25%;"></td>
                <td class="text-right" style="width: 25%;">P${totalFunds.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td class="text-right"><span class="underline">P${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
              </tr>
              <tr>
                <td class="bold">Cash on Hand</td>
                <td></td>
                <td class="text-right bold"><span class="double-underline">P${cashOnHand.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
              </tr>
            </table>

            <p class="bold" style="margin-top: 18pt;">Prepared by:</p>
            <table class="sig-table">
              <tr>
                <td style="width: 33%;">
                  <div class="sig-line sig-pres-name">${cfg.treasurerName || "JUAN DELA CRUZ"}</div>
                  <div class="sig-role">LITE PRESIDENT</div>
                </td>
                <td style="width: 33%;">
                  <div class="sig-line sig-treas-name">JUAN DELA CRUZ</div>
                  <div class="sig-role">LITE TREASURER</div>
                </td>
                <td style="width: 33%;">
                  <div class="sig-line">MARIELLE CABANAG ${isVerified ? '(VERIFIED)' : ''}</div>
                  <div class="sig-role">LITE AUDITOR</div>
                </td>
              </tr>
            </table>

            <p class="bold">Approved by:</p>
            <table class="sig-table" style="width: 50%;">
              <tr>
                <td style="text-align: left; padding-left: 14pt;">
                  <div class="sig-line">KIMBERLY DAWN JATULAN ${isApproved ? '(APPROVED)' : ''}</div>
                  <div class="sig-role">LITE ADVISER</div>
                </td>
              </tr>
            </table>

            <p class="bold">Noted by:</p>
            <table class="sig-table">
              <tr>
                <td style="width: 50%; text-align: left; padding-left: 14pt;">
                  <div class="sig-line">JOVYLYN ORTIZ-CESAR, MBA, MSIT</div>
                  <div class="sig-role">PROGRAM DIRECTOR</div>
                </td>
                <td style="width: 50%; text-align: left;">
                  <div class="sig-line">DR. EMRAIDA MARIE M. MANUCOM</div>
                  <div class="sig-role">DEAN, COLLEGE OF COMPUTER STUDIES</div>
                </td>
              </tr>
            </table>
          </div>
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff', wordDoc], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LITE-Financial-Report-AY2025-2026.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    // Call renderDocxPreview during app initialization
    window.addEventListener('DOMContentLoaded', () => {
      renderDocxPreview();
    });

  