'use client';
import { useState, useEffect } from 'react';
import { Download, Printer, X, FileText, Check, Edit3, Layers } from 'lucide-react';
import './DocumentPreview.css';

// Header Banner replicating PDM CCS & LITE official template banner
function OfficialHeaderBanner() {
  return (
    <div className="pdm-banner-container">
      <div className="pdm-banner-frame">
        <img src="/assets/pdm-logo.jpg" alt="PDM Seal" className="pdm-banner-logo" />
        <div className="pdm-banner-center">
          <div className="pdm-banner-school">Pambayang Dalubhasaan ng Marilao</div>
          <div className="pdm-banner-green-bar">
            <span className="pdm-banner-club">LEAGUE OF INFORMATION TECHNOLOGY ENTHUSIAST</span>
            <span className="pdm-banner-course">Bachelor of Science in Information</span>
          </div>
        </div>
        <img src="/assets/lite-logo.png" alt="LITE Logo" className="pdm-banner-logo" />
      </div>
      <hr className="pdm-banner-divider" />
    </div>
  );
}

// Default realistic sample expense list matching screenshot 3
const DEFAULT_EXPENSES = [
  { desc: 'Candle', amount: 7.00 },
  { desc: 'Glue Stick', amount: 10.00 },
  { desc: 'Envelope', amount: 20.00 },
  { desc: 'Green Folder', amount: 48.00 },
  { desc: 'BestBuy Certificate Holder', amount: 135.00 },
  { desc: 'Ribbon', amount: 150.00 },
  { desc: 'Vellum Board A4', amount: 152.00 },
  { desc: "Students' Travel Fare", amount: 200.00 },
  { desc: 'Sash', amount: 380.00 },
  { desc: 'Cosplay Tarpaulin', amount: 670.00 },
  { desc: 'Career Day', amount: 1840.00 },
  { desc: 'Judge Token', amount: 2510.00 },
  { desc: 'Outreach Donation', amount: 1000.00 },
  { desc: 'Leadership Seminar', amount: 500.00 },
  { desc: 'Day 1 & 2 Lunch', amount: 3655.00 },
  { desc: 'Big Brew Drinks', amount: 800.00 },
  { desc: 'Cash Prize', amount: 4000.00 },
  { desc: 'Dinner', amount: 5000.00 },
  { desc: 'Public Forum (Net)', amount: 1750.00 },
  { desc: 'Cash Shortage', amount: 161.00 },
];

export default function DocumentPreviewModal({ isOpen, onClose, documentData }) {
  const isProposal = documentData?.type === 'PROPOSAL';

  // Navigation tab for pages (0 = All Pages, 1 = Page 1, 2 = Page 2, 3 = Page 3, 4 = Page 4)
  const [activePage, setActivePage] = useState(0);

  // Editable Transmittal Metadata
  const [transmittalDate, setTransmittalDate] = useState('April 29, 2026');
  const [coordinatorName, setCoordinatorName] = useState('Ms. Ligaya H. Estrella');
  const [coordinatorRole, setCoordinatorRole] = useState('Co-curricular Affairs Coordinator');
  const [salutation, setSalutation] = useState('Dear Mrs. Estrella,');
  const [semester, setSemester] = useState('2nd SEMESTER');
  const [academicYear, setAcademicYear] = useState('2025–2026');
  const [periodDesc, setPeriodDesc] = useState('As of Club Week 2026');
  const [finalAsOf, setFinalAsOf] = useState('As of April 2026');

  // Initial Budget & Income Rows
  const [initialBudget, setInitialBudget] = useState(5308.00);
  const [cosplayVote, setCosplayVote] = useState(9760.00);
  const [shirtRebate, setShirtRebate] = useState(8820.00);
  const [honorOfKings, setHonorOfKings] = useState(1000.00);
  const [crossfire, setCrossfire] = useState(1000.00);
  const [exhibitDay1, setExhibitDay1] = useState(5230.00);
  const [exhibitDay2, setExhibitDay2] = useState(320.00);

  // Expenses Rows
  const [expenseRows, setExpenseRows] = useState(DEFAULT_EXPENSES);

  // Signatories
  const [signatories, setSignatories] = useState({
    presidentName: 'EULYSIES DOMANTAY',
    presidentRole: 'LITE PRESIDENT',
    treasurerName: 'ANDREI GERONIMO',
    treasurerRole: 'LITE TREASURER',
    auditorName: 'MARIELLE CABANAG',
    auditorRole: 'LITE AUDITOR',
    adviserName: 'KIMBERLY DAWN JATULAN',
    adviserRole: 'LITE ADVISER',
    directorName: 'JOVYLYN ORTIZ-CESAR, MBA, MSIT',
    directorRole: 'PROGRAM DIRECTOR',
    deanName: 'DR. EMRAIDA MARIE M. MANUCOM',
    deanRole: 'DEAN, COLLEGE OF COMPUTER STUDIES',
  });

  const [isExporting, setIsExporting] = useState(false);

  // Sync state with incoming documentData
  useEffect(() => {
    if (documentData) {
      if (documentData.transmittalDate) setTransmittalDate(documentData.transmittalDate);
      if (documentData.eventName) setPeriodDesc(`As of ${documentData.eventName}`);
      
      // If documentData has transaction outflows, use them as expenses
      if (documentData.transactions && documentData.transactions.length > 0) {
        const outflows = documentData.transactions
          .filter(t => t.type === 'OUTFLOW')
          .map(t => ({ desc: t.title, amount: Number(t.amount) || 0 }));
        if (outflows.length > 0) {
          setExpenseRows(outflows);
        }
      }
    }
  }, [documentData]);

  // Derived Calculations
  const incomeSubtotal1 = cosplayVote + shirtRebate;
  const incomeSubtotal2 = honorOfKings + crossfire;
  const exhibitSubtotal = exhibitDay1 + exhibitDay2;
  const totalInflows = incomeSubtotal1 + incomeSubtotal2 + exhibitSubtotal;
  const totalFunds = initialBudget + totalInflows;
  const totalExpenses = expenseRows.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const cashOnHand = totalFunds - totalExpenses;

  const handleUpdateSignatory = (field, val) => {
    setSignatories(prev => ({ ...prev, [field]: val }));
  };

  const handleUpdateExpense = (idx, field, val) => {
    const next = [...expenseRows];
    next[idx] = { ...next[idx], [field]: field === 'amount' ? (parseFloat(val) || 0) : val };
    setExpenseRows(next);
  };

  const handleExportDocx = async () => {
    try {
      setIsExporting(true);
      const payload = {
        type: isProposal ? 'PROPOSAL' : 'LIQUIDATION',
        activityTitle: periodDesc,
        eventName: periodDesc,
        transmittalDate,
        coordinatorName,
        coordinatorRole,
        coordinatorSalutation: salutation.replace(/Dear\s+/i, '').replace(/,/g, '').trim(),
        semester,
        academicYear,
        periodDesc,
        finalAsOf,
        signatories: {
          presidentName: signatories.presidentName,
          presidentRole: signatories.presidentRole,
          treasurerName: signatories.treasurerName,
          treasurerRole: signatories.treasurerRole,
          auditorName: signatories.auditorName,
          auditorRole: signatories.auditorRole,
          adviserName: signatories.adviserName,
          adviserRole: signatories.adviserRole,
          directorName: signatories.directorName,
          directorRole: signatories.directorRole,
          deanName: signatories.deanName,
          deanRole: signatories.deanRole,
          preparedBy: signatories.treasurerName,
          preparedRole: signatories.treasurerRole,
          reviewedBy: signatories.auditorName,
          reviewedRole: signatories.auditorRole,
          notedBy: signatories.presidentName,
          notedRole: signatories.presidentRole,
          adviser1: signatories.adviserName,
        },
        president_name: signatories.presidentName,
        president_role: signatories.presidentRole,
        treasurer_name: signatories.treasurerName,
        treasurer_role: signatories.treasurerRole,
        auditor_name: signatories.auditorName,
        auditor_role: signatories.auditorRole,
        adviser_name: signatories.adviserName,
        adviser_role: signatories.adviserRole,
        director_name: signatories.directorName,
        director_role: signatories.directorRole,
        dean_name: signatories.deanName,
        dean_role: signatories.deanRole,
        initial_budget: initialBudget,
        total_income: totalFunds,
        total_funds: totalFunds,
        total_expenses: totalExpenses,
        cash_on_hand: cashOnHand,
        income_items: [
          { particulars: 'Cosplay 5-Peso Vote & Org-Shirt Rebate', desc: 'Cosplay 5-Peso Vote & Org-Shirt Rebate', amount: incomeSubtotal1 },
          { particulars: 'E-sports: Honor of Kings & Crossfire', desc: 'E-sports: Honor of Kings & Crossfire', amount: incomeSubtotal2 },
          { particulars: 'Game Exhibit: Day 1 & Day 2', desc: 'Game Exhibit: Day 1 & Day 2', amount: exhibitSubtotal },
        ],
        summary: {
          initial_budget: initialBudget,
          total_inflows: totalInflows,
          total_funds: totalFunds,
          total_outflows: totalExpenses,
          cash_on_hand: cashOnHand,
        },
        items: documentData.items || [],
        expense_items: expenseRows,
      };

      const res = await fetch('/api/reports/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to generate DOCX');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LITE-Financial-Report-AY-${academicYear.replace(/[^a-zA-Z0-9]/g, '-')}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('Error downloading report. Please check server logs.');
    } finally {
      setIsExporting(false);
    }
  };

  // Safe early return after all hooks
  if (!isOpen || !documentData) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col document-preview-overlay overflow-y-auto">
      
      {/* Top Floating Action & Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#1e232a]/95 backdrop-blur border-b border-gray-700 text-white px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3 no-print shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-sm">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight">1:1 Official PDM LITE Document Preview</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Exact Template Replicant
              </span>
            </div>
            <p className="text-[11px] text-gray-400 flex items-center gap-1">
              <Edit3 className="w-3 h-3 text-amber-400" />
              <span>In-place editing active: Click any value on the sheets below to adjust before exporting.</span>
            </p>
          </div>
        </div>

        {/* Page Selector Tabs */}
        {!isProposal && (
          <div className="flex items-center gap-1 bg-gray-800 p-1 rounded-xl border border-gray-700 text-xs">
            <button
              onClick={() => setActivePage(0)}
              className={`px-2.5 py-1 rounded-lg transition-all ${activePage === 0 ? 'bg-emerald-700 text-white font-bold' : 'text-gray-300 hover:text-white'}`}
            >
              All 4 Pages
            </button>
            <button
              onClick={() => setActivePage(1)}
              className={`px-2.5 py-1 rounded-lg transition-all ${activePage === 1 ? 'bg-emerald-700 text-white font-bold' : 'text-gray-300 hover:text-white'}`}
            >
              Page 1: Transmittal
            </button>
            <button
              onClick={() => setActivePage(2)}
              className={`px-2.5 py-1 rounded-lg transition-all ${activePage === 2 ? 'bg-emerald-700 text-white font-bold' : 'text-gray-300 hover:text-white'}`}
            >
              Page 2: Income
            </button>
            <button
              onClick={() => setActivePage(3)}
              className={`px-2.5 py-1 rounded-lg transition-all ${activePage === 3 ? 'bg-emerald-700 text-white font-bold' : 'text-gray-300 hover:text-white'}`}
            >
              Page 3: Expenses
            </button>
            <button
              onClick={() => setActivePage(4)}
              className={`px-2.5 py-1 rounded-lg transition-all ${activePage === 4 ? 'bg-emerald-700 text-white font-bold' : 'text-gray-300 hover:text-white'}`}
            >
              Page 4: Reconciliation
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 hover:text-white rounded-lg transition-colors border border-gray-700"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print / PDF</span>
          </button>

          <button
            onClick={handleExportDocx}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Generating DOCX...' : 'Export Official .docx'}</span>
          </button>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Multi-Sheet Container */}
      <main className="flex-1 p-4 sm:p-8 flex flex-col items-center gap-8">

        {/* ========================================================================= */}
        {/* PAGE 1: TRANSMITTAL LETTER (Screenshot 1)                                 */}
        {/* ========================================================================= */}
        {(activePage === 0 || activePage === 1) && (
          <article className="document-sheet">
            <OfficialHeaderBanner />

            {/* Date */}
            <div className="transmittal-date">
              <input
                type="text"
                value={transmittalDate}
                onChange={(e) => setTransmittalDate(e.target.value)}
                className="pdm-input w-48 font-medium"
                title="Click to edit date"
              />
            </div>

            {/* Recipient */}
            <div className="transmittal-recipient">
              <input
                type="text"
                value={coordinatorName}
                onChange={(e) => setCoordinatorName(e.target.value)}
                className="pdm-input"
                title="Click to edit coordinator name"
              />
              <input
                type="text"
                value={coordinatorRole}
                onChange={(e) => setCoordinatorRole(e.target.value)}
                className="pdm-input"
                title="Click to edit coordinator role"
              />
              <div>This School</div>
            </div>

            {/* Salutation */}
            <div className="transmittal-salutation">
              <input
                type="text"
                value={salutation}
                onChange={(e) => setSalutation(e.target.value)}
                className="pdm-input w-64"
                title="Click to edit salutation"
              />
            </div>

            {/* Body */}
            <div className="transmittal-body">
              This is to respectfully submit the attached &ldquo;LITE Financial Report&rdquo; for the{' '}
              <input
                type="text"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="pdm-input inline-block w-28 text-center"
              />{' '}
              Academic Year{' '}
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="pdm-input inline-block w-24 text-center"
              />.
            </div>

            {/* Closing */}
            <div className="transmittal-closing">
              <div>Respectfully,</div>
              <div className="mt-4">LITE Officers</div>
            </div>

            {/* Signatories Block */}
            <div className="mt-8">
              <div className="text-sm font-normal">Prepared by:</div>
              <div className="sig-row-3col">
                <div>
                  <input
                    type="text"
                    value={signatories.presidentName}
                    onChange={(e) => handleUpdateSignatory('presidentName', e.target.value)}
                    className="pdm-input sig-name"
                  />
                  <input
                    type="text"
                    value={signatories.presidentRole}
                    onChange={(e) => handleUpdateSignatory('presidentRole', e.target.value)}
                    className="pdm-input sig-role"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={signatories.treasurerName}
                    onChange={(e) => handleUpdateSignatory('treasurerName', e.target.value)}
                    className="pdm-input sig-name"
                  />
                  <input
                    type="text"
                    value={signatories.treasurerRole}
                    onChange={(e) => handleUpdateSignatory('treasurerRole', e.target.value)}
                    className="pdm-input sig-role"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={signatories.auditorName}
                    onChange={(e) => handleUpdateSignatory('auditorName', e.target.value)}
                    className="pdm-input sig-name"
                  />
                  <input
                    type="text"
                    value={signatories.auditorRole}
                    onChange={(e) => handleUpdateSignatory('auditorRole', e.target.value)}
                    className="pdm-input sig-role"
                  />
                </div>
              </div>

              <div className="text-sm font-normal mt-4">Approved by:</div>
              <div className="mt-6 mb-6">
                <input
                  type="text"
                  value={signatories.adviserName}
                  onChange={(e) => handleUpdateSignatory('adviserName', e.target.value)}
                  className="pdm-input sig-name w-72"
                />
                <input
                  type="text"
                  value={signatories.adviserRole}
                  onChange={(e) => handleUpdateSignatory('adviserRole', e.target.value)}
                  className="pdm-input sig-role w-72"
                />
              </div>

              <div className="text-sm font-normal mt-4">Noted by:</div>
              <div className="sig-row-2col">
                <div>
                  <input
                    type="text"
                    value={signatories.directorName}
                    onChange={(e) => handleUpdateSignatory('directorName', e.target.value)}
                    className="pdm-input sig-name"
                  />
                  <input
                    type="text"
                    value={signatories.directorRole}
                    onChange={(e) => handleUpdateSignatory('directorRole', e.target.value)}
                    className="pdm-input sig-role"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={signatories.deanName}
                    onChange={(e) => handleUpdateSignatory('deanName', e.target.value)}
                    className="pdm-input sig-name"
                  />
                  <input
                    type="text"
                    value={signatories.deanRole}
                    onChange={(e) => handleUpdateSignatory('deanRole', e.target.value)}
                    className="pdm-input sig-role"
                  />
                </div>
              </div>

              <div className="text-xs text-gray-700 mt-6 space-y-0.5">
                <div>cc: Co-Curricular</div>
                <div>cc: Dean&rsquo;s Office</div>
              </div>
            </div>
          </article>
        )}

        {/* ========================================================================= */}
        {/* PAGE 2: INCOME SCHEDULE (Screenshot 2)                                   */}
        {/* ========================================================================= */}
        {(activePage === 0 || activePage === 2) && (
          <article className="document-sheet">
            <OfficialHeaderBanner />

            {/* Document Title Block */}
            <div className="text-center mb-8">
              <div className="font-bold text-base tracking-wide">LITE FINANCIAL REPORT</div>
              <div className="font-bold text-sm tracking-wide">{semester}</div>
              <div className="font-bold text-sm tracking-wide">ACADEMIC YEAR {academicYear}</div>
              <div className="font-bold text-sm tracking-wide mt-4">
                <input
                  type="text"
                  value={periodDesc}
                  onChange={(e) => setPeriodDesc(e.target.value)}
                  className="pdm-input text-center font-bold"
                  title="Click to edit period description"
                />
              </div>
            </div>

            {/* Initial Budget */}
            <div className="mb-6 font-bold text-xs">
              INITIAL BUDGET AS OF FEBRUARY (Carried over from 1st Sem)
            </div>
            <table className="fin-table mb-6">
              <tbody>
                <tr>
                  <td>Cash from the Box</td>
                  <td className="amount">
                    P{initialBudget.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Inflow Section 1: General Income */}
            <div className="font-bold text-xs mb-1">Income:</div>
            <table className="fin-table mb-6">
              <tbody>
                <tr>
                  <td>Cosplay 5-Peso Vote</td>
                  <td className="amount">
                    <input
                      type="number"
                      value={cosplayVote}
                      onChange={(e) => setCosplayVote(parseFloat(e.target.value) || 0)}
                      className="pdm-input text-right"
                    />
                  </td>
                </tr>
                <tr>
                  <td>Org-Shirt Rebate</td>
                  <td className="amount">
                    <input
                      type="number"
                      value={shirtRebate}
                      onChange={(e) => setShirtRebate(parseFloat(e.target.value) || 0)}
                      className="pdm-input text-right"
                    />
                  </td>
                </tr>
                <tr>
                  <td></td>
                  <td className="amount">
                    <span className="subtotal-line">
                      P{incomeSubtotal1.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Inflow Section 2: E-sports */}
            <div className="font-bold text-xs mb-1">E-sports: Day 1 – 2</div>
            <table className="fin-table mb-6">
              <tbody>
                <tr>
                  <td>Honor Of Kings</td>
                  <td className="amount">
                    <input
                      type="number"
                      value={honorOfKings}
                      onChange={(e) => setHonorOfKings(parseFloat(e.target.value) || 0)}
                      className="pdm-input text-right"
                    />
                  </td>
                </tr>
                <tr>
                  <td>Crossfire: Legends</td>
                  <td className="amount">
                    <input
                      type="number"
                      value={crossfire}
                      onChange={(e) => setCrossfire(parseFloat(e.target.value) || 0)}
                      className="pdm-input text-right"
                    />
                  </td>
                </tr>
                <tr>
                  <td></td>
                  <td className="amount">
                    <span className="subtotal-line">
                      P{incomeSubtotal2.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Inflow Section 3: Game Exhibit */}
            <div className="font-bold text-xs mb-1">Game Exhibit: Day 1 – 2</div>
            <table className="fin-table mb-8">
              <tbody>
                <tr>
                  <td>February 26, 2026</td>
                  <td className="amount">
                    <input
                      type="number"
                      value={exhibitDay1}
                      onChange={(e) => setExhibitDay1(parseFloat(e.target.value) || 0)}
                      className="pdm-input text-right"
                    />
                  </td>
                </tr>
                <tr>
                  <td>February 27, 2026</td>
                  <td className="amount">
                    <input
                      type="number"
                      value={exhibitDay2}
                      onChange={(e) => setExhibitDay2(parseFloat(e.target.value) || 0)}
                      className="pdm-input text-right"
                    />
                  </td>
                </tr>
                <tr>
                  <td></td>
                  <td className="amount">
                    <span className="subtotal-line">
                      P{exhibitSubtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Total Funds Available */}
            <div className="flex justify-between items-center font-bold text-sm pt-4 border-t border-gray-300">
              <span>Total Income:</span>
              <span className="text-right">
                P{totalFunds.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </article>
        )}

        {/* ========================================================================= */}
        {/* PAGE 3: MISCELLANEOUS EXPENSES (Screenshot 3 Left)                       */}
        {/* ========================================================================= */}
        {(activePage === 0 || activePage === 3) && (
          <article className="document-sheet">
            <OfficialHeaderBanner />

            <div className="font-bold text-xs mb-1">Expenses:</div>
            <div className="font-bold text-xs mb-3">Miscellaneous Expenses</div>

            <table className="fin-table mb-4">
              <tbody>
                {expenseRows.map((exp, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        type="text"
                        value={exp.desc}
                        onChange={(e) => handleUpdateExpense(idx, 'desc', e.target.value)}
                        className="pdm-input"
                      />
                    </td>
                    <td className="amount">
                      <input
                        type="number"
                        step="0.01"
                        value={exp.amount}
                        onChange={(e) => handleUpdateExpense(idx, 'amount', e.target.value)}
                        className="pdm-input text-right"
                      />
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="font-bold pt-2">Total Expenses:</td>
                  <td className="amount pt-2">
                    <span className="subtotal-line font-bold">
                      P{totalExpenses.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </article>
        )}

        {/* ========================================================================= */}
        {/* PAGE 4: SUMMARY RECONCILIATION & SIGNATORIES (Screenshot 3 Right)        */}
        {/* ========================================================================= */}
        {(activePage === 0 || activePage === 4) && (
          <article className="document-sheet">
            <OfficialHeaderBanner />

            {/* As of Date */}
            <div className="text-center font-bold text-xs mb-6">
              <input
                type="text"
                value={finalAsOf}
                onChange={(e) => setFinalAsOf(e.target.value)}
                className="pdm-input text-center font-bold"
              />
            </div>

            {/* Reconciliation Totals Table */}
            <table className="fin-table mb-12">
              <tbody>
                <tr>
                  <td>Total Funds</td>
                  <td className="amount">
                    P{totalFunds.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr>
                  <td>Total Expenses</td>
                  <td className="amount">
                    P{totalExpenses.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr>
                  <td className="font-bold pt-3">Cash on Hand</td>
                  <td className="amount pt-3">
                    <span className="box-total">
                      P{cashOnHand.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Signatories Block (Repeated) */}
            <div className="mt-12">
              <div className="text-sm font-normal">Prepared by:</div>
              <div className="sig-row-3col">
                <div>
                  <input
                    type="text"
                    value={signatories.presidentName}
                    onChange={(e) => handleUpdateSignatory('presidentName', e.target.value)}
                    className="pdm-input sig-name"
                  />
                  <input
                    type="text"
                    value={signatories.presidentRole}
                    onChange={(e) => handleUpdateSignatory('presidentRole', e.target.value)}
                    className="pdm-input sig-role"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={signatories.treasurerName}
                    onChange={(e) => handleUpdateSignatory('treasurerName', e.target.value)}
                    className="pdm-input sig-name"
                  />
                  <input
                    type="text"
                    value={signatories.treasurerRole}
                    onChange={(e) => handleUpdateSignatory('treasurerRole', e.target.value)}
                    className="pdm-input sig-role"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={signatories.auditorName}
                    onChange={(e) => handleUpdateSignatory('auditorName', e.target.value)}
                    className="pdm-input sig-name"
                  />
                  <input
                    type="text"
                    value={signatories.auditorRole}
                    onChange={(e) => handleUpdateSignatory('auditorRole', e.target.value)}
                    className="pdm-input sig-role"
                  />
                </div>
              </div>

              <div className="text-sm font-normal mt-4">Approved by:</div>
              <div className="mt-6 mb-6">
                <input
                  type="text"
                  value={signatories.adviserName}
                  onChange={(e) => handleUpdateSignatory('adviserName', e.target.value)}
                  className="pdm-input sig-name w-72"
                />
                <input
                  type="text"
                  value={signatories.adviserRole}
                  onChange={(e) => handleUpdateSignatory('adviserRole', e.target.value)}
                  className="pdm-input sig-role w-72"
                />
              </div>

              <div className="text-sm font-normal mt-4">Noted by:</div>
              <div className="sig-row-2col">
                <div>
                  <input
                    type="text"
                    value={signatories.directorName}
                    onChange={(e) => handleUpdateSignatory('directorName', e.target.value)}
                    className="pdm-input sig-name"
                  />
                  <input
                    type="text"
                    value={signatories.directorRole}
                    onChange={(e) => handleUpdateSignatory('directorRole', e.target.value)}
                    className="pdm-input sig-role"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={signatories.deanName}
                    onChange={(e) => handleUpdateSignatory('deanName', e.target.value)}
                    className="pdm-input sig-name"
                  />
                  <input
                    type="text"
                    value={signatories.deanRole}
                    onChange={(e) => handleUpdateSignatory('deanRole', e.target.value)}
                    className="pdm-input sig-role"
                  />
                </div>
              </div>
            </div>
          </article>
        )}

      </main>
    </div>
  );
}
