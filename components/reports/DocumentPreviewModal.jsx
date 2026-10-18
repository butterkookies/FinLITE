'use client';
import { useState, useEffect, useRef } from 'react';
import { Download, Printer, X, FileText, Edit3 } from 'lucide-react';
import './DocumentPreview.css';
import { Button, Badge } from '@/components/ui';

// Header Banner replicating PDM CCS & LITE official template banner with authentic graphic
function OfficialHeaderBanner() {
  return (
    <div className="pdm-banner-container">
      <img
        src="/images/pdm-lite-header-banner.png"
        alt="PDM & LITE Institutional Header"
        className="pdm-banner-image"
      />
    </div>
  );
}

// Exact PC View Signatory Input: auto-wraps and dynamically adjusts height so full text is 100% visible with zero truncation
function AutoResizeSignatory({ value, onChange, className = '', isRole = false, placeholder = '' }) {
  const text = value || '';
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleChange = (e) => {
    onChange(e);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  return (
    <textarea
      ref={textareaRef}
      rows={1}
      value={text}
      onChange={handleChange}
      className={`pdm-input ${className} resize-none overflow-hidden block w-full max-w-full leading-tight`}
      placeholder={placeholder}
      title="Click to edit"
      spellCheck={false}
    />
  );
}

export default function DocumentPreviewModal({ isOpen, onClose, documentData }) {
  const isProposal = documentData?.type === 'PROPOSAL';

  // Navigation tab for pages (0 = All Pages, 1 = Page 1, 2 = Page 2, 3 = Page 3, 4 = Page 4)
  const [activePage, setActivePage] = useState(0);

  // Editable Transmittal Metadata
  const [transmittalDate, setTransmittalDate] = useState(
    new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  );
  const [coordinatorName, setCoordinatorName] = useState('Ms. Ligaya H. Estrella');
  const [coordinatorRole, setCoordinatorRole] = useState('Co-curricular Affairs Coordinator');
  const [salutation, setSalutation] = useState('Dear Mrs. Estrella,');
  const [semester, setSemester] = useState('2nd SEMESTER');
  const [academicYear, setAcademicYear] = useState('2025–2026');
  const [periodDesc, setPeriodDesc] = useState('Financial Operations');
  const [finalAsOf, setFinalAsOf] = useState(
    `As of ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
  );

  // CC Routing Configuration (Defaulted to false/excluded per user request)
  const [includeCc, setIncludeCc] = useState(false);
  const [ccRecipients, setCcRecipients] = useState(['cc: Co-Curricular', "cc: Dean's Office"]);

  // Bottom-Right Page Numbering Configuration ('page_x_of_y' | 'page_x_of_y_no_cover' | 'simple' | 'none')
  const [pageNumberStyle, setPageNumberStyle] = useState('page_x_of_y');

  // Dynamic Initial Budget & Transaction Rows (Zero Fake Data)
  const [initialBudget, setInitialBudget] = useState(0);
  const [inflowRows, setInflowRows] = useState([]);
  const [expenseRows, setExpenseRows] = useState([]);

  // Active Signatories
  const [signatories, setSignatories] = useState({
    presidentName: 'GERONIMO, ANDREI JOHN P.',
    presidentRole: 'LITE PRESIDENT',
    vicePresidentName: 'BAJAMUNDE, JHELLIAM T.',
    vicePresidentRole: 'LITE VICE PRESIDENT',
    treasurerName: 'CABANAG, ROSE MARIELLE P.',
    treasurerRole: 'LITE TREASURER',
    auditorName: 'SARA, RISHAME P.',
    auditorRole: 'LITE AUDITOR',
    adviser1Name: 'MS. KIMBERLY DAWN JATULAN',
    adviser1Role: 'LITE CLUB ADVISER',
    adviser2Name: 'MS. KRIZIA MAE GENOVIA',
    adviser2Role: 'LITE CLUB ADVISER',
    directorName: 'JOVYLYN ORTIZ-CESAR, MBA, MSIT',
    directorRole: 'PROGRAM DIRECTOR, BSIT',
    deanName: 'DR. EMRAIDA MARIE M. MANUCOM',
    deanRole: 'DEAN, COLLEGE OF COMPUTER STUDIES',
  });

  // Signatory Inclusion / Exclusion state (true = included in signature block)
  const [includedSignatories, setIncludedSignatories] = useState({
    treasurer: true,
    auditor: true,
    vicePresident: true,
    president: true,
    adviser1: true,
    adviser2: true,
    director: false,
    dean: false,
  });

  const toggleSignatory = (key) => {
    setIncludedSignatories((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Export & Attachment Scope: 'APPEND' (Report + Receipts), 'NONE' (Report Only), 'STANDALONE' (Receipts Only)
  const [receiptsMode, setReceiptsMode] = useState('APPEND');

  const [isExporting, setIsExporting] = useState(false);

  // Sync state strictly with incoming real documentData
  useEffect(() => {
    if (documentData) {
      if (documentData.transmittalDate) {
        setTransmittalDate(documentData.transmittalDate);
        setFinalAsOf(`As of ${documentData.transmittalDate}`);
      }
      if (documentData.eventName) setPeriodDesc(documentData.eventName);
      else if (documentData.activityTitle) setPeriodDesc(documentData.activityTitle);

      if (documentData.semester) {
        const semClean = documentData.semester.toUpperCase().includes('SEM') 
          ? documentData.semester.toUpperCase().replace('SEM', 'SEMESTER')
          : documentData.semester.toUpperCase();
        setSemester(semClean);
      }
      if (documentData.academicYear) setAcademicYear(documentData.academicYear);
      
      // Sync real signatories if provided
      if (documentData.signatories) {
        const sigs = documentData.signatories;
        const pName = (sigs.notedBy || sigs.presidentName || '').toUpperCase();
        const pRole = (sigs.notedRole || sigs.presidentRole || 'LITE PRESIDENT').toUpperCase();
        const vpName = (sigs.vicePresidentName || sigs.vice_president || '').toUpperCase();
        const vpRole = (sigs.vicePresidentRole || 'LITE VICE PRESIDENT').toUpperCase();
        const tName = (sigs.preparedBy || sigs.treasurerName || '').toUpperCase();
        const tRole = (sigs.preparedRole || sigs.treasurerRole || 'LITE TREASURER').toUpperCase();
        const aName = (sigs.reviewedBy || sigs.auditorName || '').toUpperCase();
        const aRole = (sigs.reviewedRole || sigs.auditorRole || 'LITE AUDITOR').toUpperCase();
        const adv1 = (sigs.adviser1 || sigs.adviser1Name || sigs.adviserName || '').toUpperCase();
        const adv1R = (sigs.adviser1Role || sigs.adviserRole || 'LITE CLUB ADVISER').toUpperCase();
        const adv2 = (sigs.adviser2 || sigs.adviser2Name || '').toUpperCase();
        const adv2R = (sigs.adviser2Role || sigs.adviserRole || 'LITE CLUB ADVISER').toUpperCase();
        const dir = (sigs.directorName || '').toUpperCase();
        const dirR = (sigs.directorRole || 'PROGRAM DIRECTOR, BSIT').toUpperCase();
        const dean = (sigs.deanName || '').toUpperCase();
        const deanR = (sigs.deanRole || 'DEAN, COLLEGE OF COMPUTER STUDIES').toUpperCase();

        setSignatories(prev => ({
          presidentName: pName || prev.presidentName,
          presidentRole: pRole || prev.presidentRole,
          vicePresidentName: vpName !== undefined ? vpName : prev.vicePresidentName,
          vicePresidentRole: vpRole || prev.vicePresidentRole,
          treasurerName: tName || prev.treasurerName,
          treasurerRole: tRole || prev.treasurerRole,
          auditorName: aName || prev.auditorName,
          auditorRole: aRole || prev.auditorRole,
          adviser1Name: adv1 || prev.adviser1Name,
          adviser1Role: adv1R || prev.adviser1Role,
          adviser2Name: adv2 !== undefined ? adv2 : prev.adviser2Name,
          adviser2Role: adv2R || prev.adviser2Role,
          directorName: dir || prev.directorName,
          directorRole: dirR || prev.directorRole,
          deanName: dean || prev.deanName,
          deanRole: deanR || prev.deanRole,
        }));

        setIncludedSignatories(prev => ({
          ...prev,
          treasurer: Boolean(tName || prev.treasurerName),
          auditor: Boolean(aName || prev.auditorName),
          vicePresident: Boolean(vpName),
          president: Boolean(pName || prev.presidentName),
          adviser1: Boolean(adv1 || prev.adviser1Name),
          adviser2: Boolean(adv2),
          director: Boolean(dir),
          dean: Boolean(dean),
        }));
      }

      const txs = documentData.transactions || [];

      // 1. Auto-detect rollover beginning balance
      const rolloverTxs = txs.filter(t => 
        t.type === 'INFLOW' && (
          (t.category_name && t.category_name.toLowerCase().includes('rollover')) || 
          (t.title && t.title.toLowerCase().includes('beginning'))
        )
      );
      const rolloverIds = new Set(rolloverTxs.map(t => t.id));
      const totalRollover = rolloverTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      setInitialBudget(totalRollover);

      // 2. Real inflows (excluding rollover to prevent double-counting)
      const realInflows = txs
        .filter(t => t.type === 'INFLOW' && !rolloverIds.has(t.id))
        .map(t => ({
          id: t.id,
          desc: t.title,
          amount: Number(t.amount) || 0,
          category: t.category_name || 'Income Collection',
          date: t.transaction_date,
        }));
      setInflowRows(realInflows);

      // 3. Real outflows / disbursements
      const realOutflows = txs
        .filter(t => t.type === 'OUTFLOW')
        .map(t => ({
          id: t.id,
          desc: t.title,
          amount: Number(t.amount) || 0,
          category: t.category_name || 'Operating Expense',
          date: t.transaction_date,
        }));
      setExpenseRows(realOutflows);
    }
  }, [documentData]);

  // Derived Calculations from Real Ledger Data
  const totalInflows = inflowRows.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalFunds = initialBudget + totalInflows;
  const totalExpenses = expenseRows.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const cashOnHand = totalFunds - totalExpenses;

  const handleUpdateSignatory = (field, val) => {
    setSignatories(prev => ({ ...prev, [field]: val }));
  };

  const handleUpdateInflow = (idx, field, val) => {
    const next = [...inflowRows];
    next[idx] = { ...next[idx], [field]: field === 'amount' ? (parseFloat(val) || 0) : val };
    setInflowRows(next);
  };

  const handleAddInflow = () => {
    setInflowRows(prev => [...prev, { id: `manual-in-${Date.now()}`, desc: 'New Income Particulars', amount: 0, category: 'Income Collection' }]);
  };

  const handleRemoveInflow = (idx) => {
    setInflowRows(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateExpense = (idx, field, val) => {
    const next = [...expenseRows];
    next[idx] = { ...next[idx], [field]: field === 'amount' ? (parseFloat(val) || 0) : val };
    setExpenseRows(next);
  };

  const handleAddExpense = () => {
    setExpenseRows(prev => [...prev, { id: `manual-out-${Date.now()}`, desc: 'New Expense Particulars', amount: 0, category: 'Operating Expense' }]);
  };

  const handleUpdateCcRecipient = (idx, val) => {
    const next = [...ccRecipients];
    next[idx] = val;
    setCcRecipients(next);
  };

  const handleAddCcRecipient = () => {
    setCcRecipients(prev => [...prev, 'cc: ']);
  };

  const handleRemoveCcRecipient = (idx) => {
    setCcRecipients(prev => prev.filter((_, i) => i !== idx));
  };

  // Flatten receipt vouchers from active transactions
  const receiptItems = [];
  (documentData?.transactions || []).forEach((tx) => {
    const urls = Array.isArray(tx.receipt_urls) && tx.receipt_urls.length > 0
      ? tx.receipt_urls
      : (tx.receipt_url ? [tx.receipt_url] : []);
    urls.forEach((url, uIdx) => {
      receiptItems.push({
        id: `${tx.id}-${uIdx}`,
        transactionId: tx.id,
        url,
        title: tx.title || 'Disbursement Particulars',
        amount: Number(tx.amount) || 0,
        category: tx.category_name || tx.category || 'Operating Expense',
        date: tx.transaction_date || transmittalDate,
        voucherIndex: uIdx + 1,
        totalVouchers: urls.length,
      });
    });
  });

  // Group receipts into 4-up pages (2 columns x 2 rows)
  const receiptPages = [];
  for (let i = 0; i < receiptItems.length; i += 4) {
    receiptPages.push(receiptItems.slice(i, i + 4));
  }

  const totalReportPages = receiptsMode === 'STANDALONE'
    ? Math.max(1, receiptPages.length)
    : receiptsMode === 'APPEND'
      ? 4 + receiptPages.length
      : 4;

  const getPageFooterText = (pageNum, customTotal = null) => {
    const total = customTotal ?? totalReportPages;
    if (pageNumberStyle === 'none') return null;
    if (pageNumberStyle === 'simple') return String(pageNum);
    if (pageNumberStyle === 'page_x_of_y_no_cover') {
      if (pageNum === 1) return null;
      return `Page ${pageNum} of ${total}`;
    }
    return `Page ${pageNum} of ${total}`;
  };

  // Signatory matrix metadata
  const studentOfficers = [
    { key: 'treasurer', label: 'Treasurer', nameKey: 'treasurerName', roleKey: 'treasurerRole', heading: 'Prepared by:' },
    { key: 'auditor', label: 'Auditor', nameKey: 'auditorName', roleKey: 'auditorRole', heading: 'Audited by:' },
    { key: 'vicePresident', label: 'Vice President', nameKey: 'vicePresidentName', roleKey: 'vicePresidentRole', heading: 'Noted by:' },
    { key: 'president', label: 'President', nameKey: 'presidentName', roleKey: 'presidentRole', heading: 'Noted by:' },
  ];
  const adviserOfficers = [
    { key: 'adviser1', label: 'Club Adviser 1', nameKey: 'adviser1Name', roleKey: 'adviser1Role', heading: 'Approved by:' },
    { key: 'adviser2', label: 'Club Adviser 2', nameKey: 'adviser2Name', roleKey: 'adviser2Role', heading: 'Approved by:' },
  ];
  const adminOfficers = [
    { key: 'director', label: 'Program Director', nameKey: 'directorName', roleKey: 'directorRole', heading: 'Noted by:' },
    { key: 'dean', label: 'Dean', nameKey: 'deanName', roleKey: 'deanRole', heading: 'Approved by:' },
  ];
  const allSignatoryDefs = [...studentOfficers, ...adviserOfficers, ...adminOfficers];

  const activeOfficers = studentOfficers.filter((o) => includedSignatories[o.key]);
  const activeAdvisers = adviserOfficers.filter((a) => includedSignatories[a.key]);
  const activeAdmins = adminOfficers.filter((adm) => includedSignatories[adm.key]);

  const handleExportDocx = async () => {
    try {
      setIsExporting(true);
      const allExportTransactions = [
        ...(initialBudget > 0 ? [{
          transaction_date: transmittalDate,
          title: 'Beginning Balance / Rollover Fund',
          category_name: 'Initial Budget Rollover',
          type: 'INFLOW',
          amount: initialBudget,
        }] : []),
        ...inflowRows.map(r => ({
          transaction_date: r.date || transmittalDate,
          title: r.desc,
          category_name: r.category || 'Income Collection',
          type: 'INFLOW',
          amount: r.amount,
        })),
        ...expenseRows.map(r => ({
          transaction_date: r.date || transmittalDate,
          title: r.desc,
          category_name: r.category || 'Operating Expense',
          type: 'OUTFLOW',
          amount: r.amount,
        })),
      ];

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
          vicePresidentName: signatories.vicePresidentName,
          vicePresidentRole: signatories.vicePresidentRole,
          treasurerName: signatories.treasurerName,
          treasurerRole: signatories.treasurerRole,
          auditorName: signatories.auditorName,
          auditorRole: signatories.auditorRole,
          adviser1Name: signatories.adviser1Name,
          adviser1Role: signatories.adviser1Role,
          adviser2Name: signatories.adviser2Name,
          adviser2Role: signatories.adviser2Role,
          adviser1: signatories.adviser1Name,
          adviser2: signatories.adviser2Name,
          adviserName: signatories.adviser1Name,
          adviserRole: signatories.adviser1Role,
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
        },
        president_name: signatories.presidentName,
        president_role: signatories.presidentRole,
        vice_president_name: signatories.vicePresidentName,
        vice_president_role: signatories.vicePresidentRole,
        treasurer_name: signatories.treasurerName,
        treasurer_role: signatories.treasurerRole,
        auditor_name: signatories.auditorName,
        auditor_role: signatories.auditorRole,
        adviser1_name: signatories.adviser1Name,
        adviser1_role: signatories.adviser1Role,
        adviser2_name: signatories.adviser2Name,
        adviser2_role: signatories.adviser2Role,
        adviser_name: signatories.adviser1Name,
        adviser_role: signatories.adviser1Role,
        director_name: signatories.directorName,
        director_role: signatories.directorRole,
        dean_name: signatories.deanName,
        dean_role: signatories.deanRole,
        initial_budget: initialBudget,
        total_income: totalFunds,
        total_funds: totalFunds,
        total_expenses: totalExpenses,
        cash_on_hand: cashOnHand,
        income_items: inflowRows.map(r => ({ particulars: r.desc, desc: r.desc, amount: r.amount })),
        expense_items: expenseRows.map(r => ({ particulars: r.desc, desc: r.desc, amount: r.amount })),
        summary: {
          initial_budget: initialBudget,
          total_inflows: totalFunds,
          total_outflows: totalExpenses,
          cash_on_hand: cashOnHand,
        },
        items: documentData.items || [],
        transactions: allExportTransactions,
        include_cc: includeCc,
        cc_recipients: ccRecipients,
        page_number_style: pageNumberStyle,
        receiptsMode: receiptsMode,
        includedSignatories: includedSignatories,
        active_signatories: Object.keys(includedSignatories).filter((k) => includedSignatories[k]),
        receipts: receiptItems,
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
      const cleanAy = academicYear.replace(/[^a-zA-Z0-9]/g, '-');
      a.download = receiptsMode === 'STANDALONE'
        ? `LITE-Receipts-Proof-AY-${cleanAy}.docx`
        : `LITE-Financial-Report-AY-${cleanAy}.docx`;
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
      <header className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 text-zinc-100 px-3 sm:px-6 py-2.5 sm:py-3 space-y-2.5 no-print shadow-xl">
        {/* Row 1: Header Title & Main Action Buttons */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-sm shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm font-bold tracking-tight truncate">
                  {isProposal ? 'Activity Proposal Preview' : '1:1 Official PDM LITE Preview'}
                </span>
                <Badge variant="emerald" size="xs" className="hidden xs:inline-flex">
                  Exact Replicant
                </Badge>
              </div>
              <p className="hidden xs:flex text-[10px] sm:text-[11px] text-zinc-400 items-center gap-1 truncate">
                <Edit3 className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">In-place editing active: adjust values before export.</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="hidden sm:flex bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800"
              leftIcon={<Printer className="w-3.5 h-3.5" />}
              title="Print or Save as PDF"
            >
              <span>Print / PDF</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleExportDocx}
              loading={isExporting}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              className="active:scale-95 whitespace-nowrap"
            >
              {isExporting ? 'Exporting...' : (
                <>
                  <span className="hidden xs:inline">Export .docx</span>
                  <span className="xs:hidden">Export</span>
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800 ml-0.5 sm:ml-1"
              title="Close Preview"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Row 2: Secondary Document Controls (Horizontally Scrollable Strip on Mobile) */}
        {!isProposal && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5 w-full text-xs">
            {/* Export Scope Radio Buttons */}
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-300 shadow-sm shrink-0">
              <span className="text-zinc-400 font-medium hidden md:inline">Scope:</span>
              <label className="flex items-center gap-1 cursor-pointer hover:text-white" title="Financial Report Only">
                <input
                  type="radio"
                  name="receiptsMode"
                  value="NONE"
                  checked={receiptsMode === 'NONE'}
                  onChange={() => setReceiptsMode('NONE')}
                  className="text-emerald-500 focus:ring-emerald-500 h-3 w-3"
                />
                <span className="text-[11px] whitespace-nowrap">Financial Only</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer hover:text-white" title="Financial Report + Attached Receipts">
                <input
                  type="radio"
                  name="receiptsMode"
                  value="APPEND"
                  checked={receiptsMode === 'APPEND'}
                  onChange={() => setReceiptsMode('APPEND')}
                  className="text-emerald-500 focus:ring-emerald-500 h-3 w-3"
                />
                <span className="text-[11px] whitespace-nowrap">+ Receipts</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer hover:text-white" title="Receipts Attachment Only">
                <input
                  type="radio"
                  name="receiptsMode"
                  value="STANDALONE"
                  checked={receiptsMode === 'STANDALONE'}
                  onChange={() => setReceiptsMode('STANDALONE')}
                  className="text-emerald-500 focus:ring-emerald-500 h-3 w-3"
                />
                <span className="text-[11px] whitespace-nowrap">Receipts Only</span>
              </label>
            </div>

            {/* CC Routing Toggle */}
            <Button
              type="button"
              variant={includeCc ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setIncludeCc(!includeCc)}
              className={`shrink-0 whitespace-nowrap ${includeCc ? '' : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'}`}
              title="Toggle CC Routing block on Transmittal Letter"
              leftIcon={<span className={`w-2 h-2 rounded-full ${includeCc ? 'bg-white' : 'bg-zinc-500'}`} />}
            >
              CC: {includeCc ? 'Included' : 'Excluded'}
            </Button>

            {/* Page Numbering Format Tool */}
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-300 shadow-sm shrink-0">
              <span className="text-zinc-400 font-medium hidden xs:inline">Footer:</span>
              <select
                value={pageNumberStyle}
                onChange={(e) => setPageNumberStyle(e.target.value)}
                className="bg-transparent text-white text-xs font-semibold border-none outline-none cursor-pointer pr-1"
                title="Page numbering style in footer"
              >
                <option value="page_x_of_y" className="bg-zinc-900 text-white">Page X of Y</option>
                <option value="page_x_of_y_no_cover" className="bg-zinc-900 text-white">Page X of Y (Start P2)</option>
                <option value="simple" className="bg-zinc-900 text-white">Simple (1, 2...)</option>
                <option value="none" className="bg-zinc-900 text-white">No Page Numbers</option>
              </select>
            </div>
          </div>
        )}

        {/* Row 3: Signatory Inclusion Matrix Strip */}
        {!isProposal && (
          <div className="w-full flex items-center gap-2 px-3 py-1.5 bg-zinc-900/90 rounded-xl border border-zinc-800 text-[11px] text-zinc-300 overflow-x-auto scrollbar-none">
            <span className="font-semibold text-zinc-400 shrink-0">Signatories:</span>
            <div className="flex items-center gap-3 shrink-0">
              {allSignatoryDefs.map((sig) => (
                <label key={sig.key} className="flex items-center gap-1.5 cursor-pointer text-zinc-300 hover:text-white select-none whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={includedSignatories[sig.key]}
                    onChange={() => toggleSignatory(sig.key)}
                    className="rounded text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer bg-zinc-800 border-zinc-700"
                  />
                  <span className={includedSignatories[sig.key] ? 'font-medium text-emerald-400' : 'text-zinc-500 line-through'}>
                    {sig.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Row 4: Page Selector Tabs */}
        {!isProposal && (
          <div className="w-full flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 text-xs overflow-x-auto scrollbar-none">
            <Button
              variant={activePage === 0 ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActivePage(0)}
              className="text-xs font-semibold whitespace-nowrap h-7 px-2.5 shrink-0"
            >
              <span className="hidden sm:inline">All Pages</span>
              <span className="sm:hidden">All</span> ({receiptPages.length > 0 && receiptsMode !== 'NONE' ? 4 + receiptPages.length : 4})
            </Button>
            <Button
              variant={activePage === 1 ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActivePage(1)}
              className="text-xs font-semibold whitespace-nowrap h-7 px-2.5 shrink-0"
            >
              <span className="hidden sm:inline">Page 1: Transmittal</span>
              <span className="sm:hidden">P1: Transmittal</span>
            </Button>
            <Button
              variant={activePage === 2 ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActivePage(2)}
              className="text-xs font-semibold whitespace-nowrap h-7 px-2.5 shrink-0"
            >
              <span className="hidden sm:inline">Page 2: Income</span>
              <span className="sm:hidden">P2: Income</span>
            </Button>
            <Button
              variant={activePage === 3 ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActivePage(3)}
              className="text-xs font-semibold whitespace-nowrap h-7 px-2.5 shrink-0"
            >
              <span className="hidden sm:inline">Page 3: Expenses</span>
              <span className="sm:hidden">P3: Expenses</span>
            </Button>
            <Button
              variant={activePage === 4 ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActivePage(4)}
              className="text-xs font-semibold whitespace-nowrap h-7 px-2.5 shrink-0"
            >
              <span className="hidden sm:inline">Page 4: Reconciliation</span>
              <span className="sm:hidden">P4: Reconciliation</span>
            </Button>
            {receiptPages.length > 0 && (
              <Button
                variant={activePage === 5 ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActivePage(5)}
                className="text-xs font-semibold whitespace-nowrap h-7 px-2.5 shrink-0"
              >
                <span className="hidden sm:inline">Receipts &amp; Proofs</span>
                <span className="sm:hidden">Receipts</span> ({receiptPages.length})
              </Button>
            )}
          </div>
        )}
      </header>

      {/* Main Multi-Sheet Container */}
      <main className="flex-1 p-2 sm:p-6 lg:p-8 flex flex-col items-center gap-4 sm:gap-8 w-full max-w-full overflow-x-hidden">

        {/* ========================================================================= */}
        {/* PROPOSAL VIEW                                                             */}
        {/* ========================================================================= */}
        {isProposal ? (
          <article className="document-sheet">
            <OfficialHeaderBanner />
            <div className="text-center my-6">
              <h1 className="text-base font-black tracking-wider uppercase underline underline-offset-4 text-gray-900">
                ACTIVITY &amp; BUSINESS PROPOSAL
              </h1>
              <p className="text-xs font-bold text-gray-800 uppercase mt-1">
                {documentData.activityTitle || periodDesc} &bull; {documentData.targetDate || academicYear}
              </p>
            </div>

            {/* METADATA BLOCK */}
            <div className="grid grid-cols-2 gap-y-2 text-xs mb-6 border-b border-gray-200 pb-4">
              <div>
                <span className="font-bold text-gray-800">Date Prepared: </span>
                <span>{documentData.datePrepared || transmittalDate}</span>
              </div>
              <div>
                <span className="font-bold text-gray-800">Proponent Committee: </span>
                <span>{documentData.proponentCommittee || 'League of Information Technology Enthusiasts (LITE)'}</span>
              </div>
              <div>
                <span className="font-bold text-gray-800">Target Schedule: </span>
                <span>{documentData.targetDate || 'October 14–16, 2026'}</span>
              </div>
              <div>
                <span className="font-bold text-gray-800">Target Venue: </span>
                <span>{documentData.venue || 'PDM Quadrangle'}</span>
              </div>
            </div>

            {/* SECTION I: OBJECTIVES */}
            <div className="font-bold text-xs uppercase text-emerald-900 border-b border-emerald-900 pb-0.5 mb-2 mt-4">
              I. ACTIVITY OBJECTIVES &amp; RATIONALE
            </div>
            <p className="text-xs text-gray-800 whitespace-pre-line mb-6">
              {documentData.objectives || '1. Promote student engagement.\n2. Generate operating funds for upcoming academic workshops.'}
            </p>

            {/* SECTION II: CONCESSION BUDGET SCHEDULE */}
            <div className="font-bold text-xs uppercase text-emerald-900 border-b border-emerald-900 pb-0.5 mb-2 mt-4">
              II. CONCESSION BUDGET &amp; PROJECTED REVENUE SCHEDULE
            </div>
            <table className="fin-table mb-4">
              <thead>
                <tr className="border-b border-gray-400">
                  <th className="text-left font-bold py-1">Item Description</th>
                  <th className="text-right font-bold py-1">Unit Cost</th>
                  <th className="text-right font-bold py-1">Selling Price</th>
                  <th className="text-center font-bold py-1">Units</th>
                  <th className="text-right font-bold py-1">Gross (₱)</th>
                  <th className="text-right font-bold py-1">Profit (₱)</th>
                </tr>
              </thead>
              <tbody>
                {(documentData.items || []).map((item, idx) => {
                  const gross = (item.sellingPrice || 0) * (item.projectedUnits || 0);
                  const profit = gross - ((item.unitCost || 0) * (item.projectedUnits || 0));
                  return (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-1 font-medium">{item.name}</td>
                      <td className="text-right py-1">₱{Number(item.unitCost || 0).toFixed(2)}</td>
                      <td className="text-right py-1">₱{Number(item.sellingPrice || 0).toFixed(2)}</td>
                      <td className="text-center py-1">{item.projectedUnits || 0}</td>
                      <td className="text-right py-1">₱{gross.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                      <td className="text-right py-1 font-semibold text-emerald-700">₱{profit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-b-2 border-black font-bold">
                  <td className="py-2">TOTALS &amp; RETURN FORECAST</td>
                  <td className="text-right py-2">₱{Number(documentData.totalCapital || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td className="text-right py-2 text-gray-400">—</td>
                  <td className="text-center py-2 text-gray-400">—</td>
                  <td className="text-right py-2">₱{Number(documentData.totalRevenue || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td className="text-right py-2 font-bold text-emerald-800">₱{Number(documentData.netProfit || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>

            <p className="text-[11px] italic text-gray-600 mb-6">
              * Projected Return on Investment (ROI): <strong>{documentData.marginPercent || 0}%</strong> assuming 100% concession sell-through.
            </p>

            {/* SECTION III: INSTITUTIONAL APPROVAL ROUTING */}
            <div className="font-bold text-xs uppercase text-emerald-900 border-b border-emerald-900 pb-0.5 mb-4 mt-6">
              III. INSTITUTIONAL APPROVAL ROUTING
            </div>

            {/* Table 1: Prepared & Endorsed by (Student Officers - Dynamic Columns) */}
            <table className="sig-table sig-table-4col mb-4">
              <thead>
                <tr>
                  <th colSpan={Math.max(activeOfficers.length, 1)} className="sig-section-header">Prepared &amp; Endorsed by:</th>
                </tr>
              </thead>
              <tbody>
                {activeOfficers.length === 0 ? (
                  <tr>
                    <td colSpan={1} className="text-gray-400 italic text-[11px] py-2">
                      (No officers selected in signature block)
                    </td>
                  </tr>
                ) : (
                  <tr>
                    {activeOfficers.map((off) => (
                      <td key={off.key} style={{ width: `${100 / Math.max(activeOfficers.length, 1)}%`, maxWidth: '2.5in' }}>
                        <div className="sig-cell">
                          <label className="flex items-center gap-1.5 mb-1 cursor-pointer no-print text-[10px] text-gray-500 font-medium select-none">
                            <input
                              type="checkbox"
                              checked={includedSignatories[off.key]}
                              onChange={() => toggleSignatory(off.key)}
                              className="rounded text-emerald-600 focus:ring-emerald-500 w-3 h-3 cursor-pointer"
                            />
                            <span>Include</span>
                          </label>
                          <div className="sig-space" />
                          <AutoResizeSignatory
                            value={signatories[off.nameKey]}
                            onChange={(e) => handleUpdateSignatory(off.nameKey, e.target.value)}
                            className="sig-name font-semibold"
                          />
                          <AutoResizeSignatory
                            value={signatories[off.roleKey]}
                            onChange={(e) => handleUpdateSignatory(off.roleKey, e.target.value)}
                            className="sig-role"
                            isRole
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>

            {/* Table 2: Recommending & Final Approval (Administrators - 2 Columns) */}
            <table className="sig-table sig-table-2col mb-4">
              <thead>
                <tr>
                  <th colSpan="2" className="sig-section-header">Recommending Approval:</th>
                </tr>
              </thead>
              <tbody>
                {activeAdmins.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="text-gray-400 italic text-[11px] py-2">
                      (No administrators selected in signature block)
                    </td>
                  </tr>
                ) : (
                  <tr>
                    {activeAdmins.map((adm) => (
                      <td key={adm.key} style={{ width: '50%', maxWidth: '3.25in' }}>
                        <div className="sig-cell">
                          <label className="flex items-center gap-1.5 mb-1 cursor-pointer no-print text-[10px] text-gray-500 font-medium select-none">
                            <input
                              type="checkbox"
                              checked={includedSignatories[adm.key]}
                              onChange={() => toggleSignatory(adm.key)}
                              className="rounded text-emerald-600 focus:ring-emerald-500 w-3 h-3 cursor-pointer"
                            />
                            <span>Include</span>
                          </label>
                          <div className="sig-space" />
                          <AutoResizeSignatory
                            value={signatories[adm.nameKey]}
                            onChange={(e) => handleUpdateSignatory(adm.nameKey, e.target.value)}
                            className="sig-name font-semibold"
                          />
                          <AutoResizeSignatory
                            value={signatories[adm.roleKey]}
                            onChange={(e) => handleUpdateSignatory(adm.roleKey, e.target.value)}
                            className="sig-role"
                            isRole
                          />
                        </div>
                      </td>
                    ))}
                    {activeAdmins.length < 2 && (
                      <td style={{ width: `${(2 - activeAdmins.length) * 50}%` }} />
                    )}
                  </tr>
                )}
              </tbody>
            </table>
            {getPageFooterText(1, 1) && (
              <div className="sheet-page-footer">{getPageFooterText(1, 1)}</div>
            )}
          </article>
        ) : (
          <>
            {/* ========================================================================= */}
            {/* PAGE 1: TRANSMITTAL LETTER (Screenshot 1)                                 */}
            {/* ========================================================================= */}
            {(activePage === 0 || activePage === 1) && receiptsMode !== 'STANDALONE' && (
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
                className="pdm-input w-full max-w-xs"
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
                className="pdm-input inline-block text-center font-semibold"
                style={{ width: `${Math.max((semester || '').length + 1, 10)}ch` }}
                title="Click to edit semester"
              />{' '}
              Academic Year{' '}
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="pdm-input inline-block text-center font-semibold"
                style={{ width: `${Math.max((academicYear || '').length + 1, 9)}ch` }}
                title="Click to edit academic year"
              />.
            </div>

            {/* Closing */}
            <div className="transmittal-closing">
              <div>Respectfully,</div>
              <div className="mt-4">LITE Officers</div>
            </div>

            {/* Signatories Block (Table-Based) */}
            <div className="mt-8">
              {/* Table 1: Prepared by (Student Officers - Dynamic Columns) */}
              <table className="sig-table sig-table-4col mb-4">
                <thead>
                  <tr>
                    <th colSpan={Math.max(activeOfficers.length, 1)} className="sig-section-header">Prepared by:</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOfficers.length === 0 ? (
                    <tr>
                      <td colSpan={1} className="text-gray-400 italic text-[11px] py-2">
                        (No officers selected in signature block)
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      {activeOfficers.map((off) => (
                        <td key={off.key} style={{ width: `${100 / Math.max(activeOfficers.length, 1)}%`, maxWidth: '2.5in' }}>
                          <div className="sig-cell">
                            <label className="flex items-center gap-1.5 mb-1 cursor-pointer no-print text-[10px] text-gray-500 font-medium select-none">
                              <input
                                type="checkbox"
                                checked={includedSignatories[off.key]}
                                onChange={() => toggleSignatory(off.key)}
                                className="rounded text-emerald-600 focus:ring-emerald-500 w-3 h-3 cursor-pointer"
                              />
                              <span>Include</span>
                            </label>
                            <div className="sig-space" />
                            <AutoResizeSignatory
                              value={signatories[off.nameKey]}
                              onChange={(e) => handleUpdateSignatory(off.nameKey, e.target.value)}
                              className="sig-name font-semibold"
                            />
                            <AutoResizeSignatory
                              value={signatories[off.roleKey]}
                              onChange={(e) => handleUpdateSignatory(off.roleKey, e.target.value)}
                              className="sig-role"
                              isRole
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Table 2: Approved by (Advisers - 2 Columns) */}
              <table className="sig-table sig-table-2col mb-4">
                <thead>
                  <tr>
                    <th colSpan={2} className="sig-section-header">Approved by:</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAdvisers.length === 0 ? (
                    <tr>
                      <td colSpan="2" className="text-gray-400 italic text-[11px] py-2">
                        (No advisers selected in signature block)
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      {activeAdvisers.map((adv) => (
                        <td key={adv.key} style={{ width: '50%', maxWidth: '3.25in' }}>
                          <div className="sig-cell">
                            <label className="flex items-center gap-1.5 mb-1 cursor-pointer no-print text-[10px] text-gray-500 font-medium select-none">
                              <input
                                type="checkbox"
                                checked={includedSignatories[adv.key]}
                                onChange={() => toggleSignatory(adv.key)}
                                className="rounded text-emerald-600 focus:ring-emerald-500 w-3 h-3 cursor-pointer"
                              />
                              <span>Include</span>
                            </label>
                            <div className="sig-space" />
                            <AutoResizeSignatory
                              value={signatories[adv.nameKey]}
                              onChange={(e) => handleUpdateSignatory(adv.nameKey, e.target.value)}
                              className="sig-name font-semibold"
                            />
                            <AutoResizeSignatory
                              value={signatories[adv.roleKey]}
                              onChange={(e) => handleUpdateSignatory(adv.roleKey, e.target.value)}
                              className="sig-role"
                              isRole
                            />
                          </div>
                        </td>
                      ))}
                      {activeAdvisers.length < 2 && (
                        <td style={{ width: `${(2 - activeAdvisers.length) * 50}%` }} />
                      )}
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Table 3: Noted by (Administrators - 2 Max Columns) */}
              <table className="sig-table sig-table-2col">
                <thead>
                  <tr>
                    <th colSpan="2" className="sig-section-header">Noted by:</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAdmins.length === 0 ? (
                    <tr>
                      <td colSpan="2" className="text-gray-400 italic text-[11px] py-2">
                        (No administrators selected in signature block)
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      {activeAdmins.map((adm) => (
                        <td key={adm.key} style={{ width: '50%', maxWidth: '3.25in' }}>
                          <div className="sig-cell">
                            <label className="flex items-center gap-1.5 mb-1 cursor-pointer no-print text-[10px] text-gray-500 font-medium select-none">
                              <input
                                type="checkbox"
                                checked={includedSignatories[adm.key]}
                                onChange={() => toggleSignatory(adm.key)}
                                className="rounded text-emerald-600 focus:ring-emerald-500 w-3 h-3 cursor-pointer"
                              />
                              <span>Include</span>
                            </label>
                            <div className="sig-space" />
                            <AutoResizeSignatory
                              value={signatories[adm.nameKey]}
                              onChange={(e) => handleUpdateSignatory(adm.nameKey, e.target.value)}
                              className="sig-name font-semibold"
                            />
                            <AutoResizeSignatory
                              value={signatories[adm.roleKey]}
                              onChange={(e) => handleUpdateSignatory(adm.roleKey, e.target.value)}
                              className="sig-role"
                              isRole
                            />
                          </div>
                        </td>
                      ))}
                      {activeAdmins.length < 2 && (
                        <td style={{ width: `${(2 - activeAdmins.length) * 50}%` }} />
                      )}
                    </tr>
                  )}
                </tbody>
              </table>

              {includeCc && (
                <div className="text-gray-700 mt-6 space-y-1.5 border-t border-dashed border-gray-300 pt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-500 uppercase tracking-wider">Carbon Copy (CC) Routing</span>
                    <button
                      type="button"
                      onClick={handleAddCcRecipient}
                      className="text-emerald-600 hover:text-emerald-700 font-semibold no-print"
                    >
                      + Add Recipient
                    </button>
                  </div>
                  {ccRecipients.map((rec, rIdx) => (
                    <div key={rIdx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={rec}
                        onChange={(e) => handleUpdateCcRecipient(rIdx, e.target.value)}
                        className="pdm-input w-full max-w-sm"
                        placeholder="cc: Recipient Department"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCcRecipient(rIdx)}
                        className="text-gray-400 hover:text-red-500 px-1 no-print"
                        title="Remove recipient"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {getPageFooterText(1) && (
              <div className="sheet-page-footer">{getPageFooterText(1)}</div>
            )}
          </article>
        )}

        {/* ========================================================================= */}
        {/* PAGE 2: INCOME SCHEDULE (Screenshot 2)                                   */}
        {/* ========================================================================= */}
        {(activePage === 0 || activePage === 2) && receiptsMode !== 'STANDALONE' && (
          <article className="document-sheet">
            <OfficialHeaderBanner />

            {/* Document Title Block */}
            <div className="text-center mb-8">
              <div className="font-bold tracking-wide">LITE FINANCIAL REPORT</div>
              <div className="font-bold tracking-wide">{semester}</div>
              <div className="font-bold tracking-wide">ACADEMIC YEAR {academicYear}</div>
              <div className="font-bold tracking-wide mt-4">
                <input
                  type="text"
                  value={periodDesc}
                  onChange={(e) => setPeriodDesc(e.target.value)}
                  className="pdm-input text-center font-bold w-full max-w-md mx-auto block"
                  title="Click to edit period description"
                />
              </div>
            </div>

            {/* Initial Budget */}
            <div className="mb-2 font-bold uppercase text-gray-800">
              INITIAL BUDGET / BEGINNING BALANCE (Carried over from prior semester)
            </div>
            <table className="fin-table mb-6">
              <tbody>
                <tr>
                  <td>Beginning Cash-on-Hand / Rollover Balance</td>
                  <td className="amount">
                    <input
                      type="number"
                      step="0.01"
                      value={initialBudget}
                      onChange={(e) => setInitialBudget(parseFloat(e.target.value) || 0)}
                      className="pdm-input text-right font-semibold"
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Inflow Section: Revenue & Collections */}
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold uppercase text-gray-800">Income & Collections:</span>
              <button
                type="button"
                onClick={handleAddInflow}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold no-print"
                title="Add income row"
              >
                + Add Income Row
              </button>
            </div>
            <table className="fin-table mb-6">
              <tbody>
                {inflowRows.length > 0 ? (
                  inflowRows.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item.desc}
                            onChange={(e) => handleUpdateInflow(idx, 'desc', e.target.value)}
                            className="pdm-input flex-1"
                            placeholder="Income description / event particulars"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveInflow(idx)}
                            className="text-gray-400 hover:text-red-500 text-xs px-1 no-print"
                            title="Remove row"
                          >
                            ×
                          </button>
                        </div>
                      </td>
                      <td className="amount">
                        <input
                          type="number"
                          step="0.01"
                          value={item.amount}
                          onChange={(e) => handleUpdateInflow(idx, 'amount', e.target.value)}
                          className="pdm-input text-right"
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2" className="text-gray-400 italic py-4 text-center">
                      No income or revenue transactions recorded for this period.
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="font-bold pt-2">Subtotal Income:</td>
                  <td className="amount pt-2">
                    <span className="subtotal-line font-bold">
                      P{totalInflows.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Total Funds Available */}
            <div className="flex justify-between items-center font-bold text-sm pt-4 border-t border-gray-300">
              <span>Total Funds:</span>
              <span className="text-right">
                P{totalFunds.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {getPageFooterText(2) && (
              <div className="sheet-page-footer">{getPageFooterText(2)}</div>
            )}
          </article>
        )}

        {/* ========================================================================= */}
        {/* PAGE 3: MISCELLANEOUS EXPENSES                                           */}
        {/* ========================================================================= */}
        {(activePage === 0 || activePage === 3) && receiptsMode !== 'STANDALONE' && (
          <article className="document-sheet">
            <OfficialHeaderBanner />

            <div className="flex justify-between items-center mb-1">
              <div>
                <div className="font-bold uppercase text-gray-800">Expenses:</div>
                <div className="font-bold mb-3 text-gray-700">Itemized Operating & Event Expenses</div>
              </div>
              <button
                type="button"
                onClick={handleAddExpense}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold no-print mb-3"
                title="Add expense row"
              >
                + Add Expense Row
              </button>
            </div>

            <table className="fin-table mb-4">
              <tbody>
                {expenseRows.length > 0 ? (
                  expenseRows.map((exp, idx) => (
                    <tr key={exp.id || idx}>
                      <td>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={exp.desc}
                            onChange={(e) => handleUpdateExpense(idx, 'desc', e.target.value)}
                            className="pdm-input flex-1"
                            placeholder="Expense particulars / item description"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveExpense(idx)}
                            className="text-gray-400 hover:text-red-500 text-xs px-1 no-print"
                            title="Remove row"
                          >
                            ×
                          </button>
                        </div>
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
                  ))
                ) : (
                  <tr>
                    <td colSpan="2" className="text-gray-400 italic py-4 text-center">
                      No expense or disbursement transactions recorded for this period.
                    </td>
                  </tr>
                )}
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
            {getPageFooterText(3) && (
              <div className="sheet-page-footer">{getPageFooterText(3)}</div>
            )}
          </article>
        )}

        {/* ========================================================================= */}
        {/* PAGE 4: SUMMARY RECONCILIATION & SIGNATORIES (Screenshot 3 Right)        */}
        {/* ========================================================================= */}
        {(activePage === 0 || activePage === 4) && receiptsMode !== 'STANDALONE' && (
          <article className="document-sheet">
            <OfficialHeaderBanner />

            {/* As of Date */}
            <div className="text-center font-bold mb-6">
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

            {/* Signatories Block (Dynamic Left-Aligned Table Columns) */}
            <div className="mt-12">
              {/* Table 1: Prepared by (Student Officers - Dynamic Columns) */}
              <table className="sig-table sig-table-4col mb-4">
                <thead>
                  <tr>
                    <th colSpan={Math.max(activeOfficers.length, 1)} className="sig-section-header">Prepared by:</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOfficers.length === 0 ? (
                    <tr>
                      <td colSpan={1} className="text-gray-400 italic text-[11px] py-2">
                        (No officers selected in signature block)
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      {activeOfficers.map((off) => (
                        <td key={off.key} style={{ width: `${100 / Math.max(activeOfficers.length, 1)}%`, maxWidth: '2.5in' }}>
                          <div className="sig-cell">
                            <label className="flex items-center gap-1.5 mb-1 cursor-pointer no-print text-[10px] text-gray-500 font-medium select-none">
                              <input
                                type="checkbox"
                                checked={includedSignatories[off.key]}
                                onChange={() => toggleSignatory(off.key)}
                                className="rounded text-emerald-600 focus:ring-emerald-500 w-3 h-3 cursor-pointer"
                              />
                              <span>Include</span>
                            </label>
                            <div className="sig-space" />
                            <AutoResizeSignatory
                              value={signatories[off.nameKey]}
                              onChange={(e) => handleUpdateSignatory(off.nameKey, e.target.value)}
                              className="sig-name font-semibold"
                            />
                            <AutoResizeSignatory
                              value={signatories[off.roleKey]}
                              onChange={(e) => handleUpdateSignatory(off.roleKey, e.target.value)}
                              className="sig-role"
                              isRole
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Table 2: Approved by (Advisers - 2 Columns) */}
              <table className="sig-table sig-table-2col mb-4">
                <thead>
                  <tr>
                    <th colSpan={2} className="sig-section-header">Approved by:</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAdvisers.length === 0 ? (
                    <tr>
                      <td colSpan="2" className="text-gray-400 italic text-[11px] py-2">
                        (No advisers selected in signature block)
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      {activeAdvisers.map((adv) => (
                        <td key={adv.key} style={{ width: '50%', maxWidth: '3.25in' }}>
                          <div className="sig-cell">
                            <label className="flex items-center gap-1.5 mb-1 cursor-pointer no-print text-[10px] text-gray-500 font-medium select-none">
                              <input
                                type="checkbox"
                                checked={includedSignatories[adv.key]}
                                onChange={() => toggleSignatory(adv.key)}
                                className="rounded text-emerald-600 focus:ring-emerald-500 w-3 h-3 cursor-pointer"
                              />
                              <span>Include</span>
                            </label>
                            <div className="sig-space" />
                            <AutoResizeSignatory
                              value={signatories[adv.nameKey]}
                              onChange={(e) => handleUpdateSignatory(adv.nameKey, e.target.value)}
                              className="sig-name font-semibold"
                            />
                            <AutoResizeSignatory
                              value={signatories[adv.roleKey]}
                              onChange={(e) => handleUpdateSignatory(adv.roleKey, e.target.value)}
                              className="sig-role"
                              isRole
                            />
                          </div>
                        </td>
                      ))}
                      {activeAdvisers.length < 2 && (
                        <td style={{ width: `${(2 - activeAdvisers.length) * 50}%` }} />
                      )}
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Table 3: Noted by (Administrators - 2 Max Columns) */}
              <table className="sig-table sig-table-2col">
                <thead>
                  <tr>
                    <th colSpan="2" className="sig-section-header">Noted by:</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAdmins.length === 0 ? (
                    <tr>
                      <td colSpan="2" className="text-gray-400 italic text-[11px] py-2">
                        (No administrators selected in signature block)
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      {activeAdmins.map((adm) => (
                        <td key={adm.key} style={{ width: '50%', maxWidth: '3.25in' }}>
                          <div className="sig-cell">
                            <label className="flex items-center gap-1.5 mb-1 cursor-pointer no-print text-[10px] text-gray-500 font-medium select-none">
                              <input
                                type="checkbox"
                                checked={includedSignatories[adm.key]}
                                onChange={() => toggleSignatory(adm.key)}
                                className="rounded text-emerald-600 focus:ring-emerald-500 w-3 h-3 cursor-pointer"
                              />
                              <span>Include</span>
                            </label>
                            <div className="sig-space" />
                            <AutoResizeSignatory
                              value={signatories[adm.nameKey]}
                              onChange={(e) => handleUpdateSignatory(adm.nameKey, e.target.value)}
                              className="sig-name font-semibold"
                            />
                            <AutoResizeSignatory
                              value={signatories[adm.roleKey]}
                              onChange={(e) => handleUpdateSignatory(adm.roleKey, e.target.value)}
                              className="sig-role"
                              isRole
                            />
                          </div>
                        </td>
                      ))}
                      {activeAdmins.length < 2 && (
                        <td style={{ width: `${(2 - activeAdmins.length) * 50}%` }} />
                      )}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {getPageFooterText(4) && (
              <div className="sheet-page-footer">{getPageFooterText(4)}</div>
            )}
          </article>
        )}

        {/* ========================================================================= */}
        {/* RECEIPTS & PROOFS OF DISBURSEMENT (PAGES 5+)                              */}
        {/* Rendered when All Pages is selected, or Receipts Tab (5), or STANDALONE  */}
        {/* ========================================================================= */}
        {!isProposal && (activePage === 0 || activePage === 5 || receiptsMode === 'STANDALONE') && (receiptsMode !== 'NONE') && (
          receiptPages.length > 0 ? (
            receiptPages.map((pageReceipts, pageIdx) => {
              const currentSheetNum = pageIdx + 1;
              const totalReceiptSheets = receiptPages.length;
              const currentDocPage = receiptsMode === 'STANDALONE' ? currentSheetNum : 4 + currentSheetNum;
              const displayTotalPages = totalReportPages;

              return (
                <article key={`receipt-sheet-${pageIdx}`} className="document-sheet">
                  <OfficialHeaderBanner />

                  {/* Sheet Institutional Header */}
                  <div className="text-center mb-6">
                    <div className="font-bold tracking-wide text-xs uppercase text-gray-700">
                      PAMBAYANG DALUBHASAAN NG MARILAO
                    </div>
                    <div className="font-black tracking-wide text-sm uppercase text-gray-900 mt-0.5">
                      RECEIPTS &amp; PROOFS OF DISBURSEMENT
                    </div>
                    <div className="font-semibold text-xs text-gray-600 uppercase mt-0.5">
                      {semester} &bull; ACADEMIC YEAR {academicYear}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider font-semibold">
                      Receipts Attachment Sheet {currentSheetNum} of {totalReceiptSheets}
                    </div>
                  </div>

                  {/* 2-Column Grid (Up to 4 receipts per page: 2 rows of 2) */}
                  <div className="grid grid-cols-2 gap-4">
                    {pageReceipts.map((rc) => (
                      <div
                        key={rc.id}
                        className="border border-gray-300 rounded-xl p-2.5 bg-white flex flex-col justify-between shadow-2xs"
                        style={{ height: '3.45in', boxSizing: 'border-box' }}
                      >
                        {/* Image Frame with Aspect Containment */}
                        <div className="w-full flex-1 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200 mb-2 p-1 min-h-[2.1in]">
                          <img
                            src={rc.url}
                            alt={rc.title}
                            className="max-h-[2.3in] max-w-full object-contain"
                            loading="lazy"
                          />
                        </div>

                        {/* Metadata Footer */}
                        <div className="shrink-0 pt-1 border-t border-gray-100">
                          <div className="flex items-center justify-between text-[11px] font-bold text-gray-900 mb-0.5">
                            <span className="text-gray-700">{rc.date}</span>
                            <span className="text-emerald-800 font-black bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              ₱{rc.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="text-[11px] font-bold text-gray-900 truncate" title={rc.title}>
                            {rc.title}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-gray-500 mt-0.5">
                            <span className="truncate">{rc.category}</span>
                            {rc.totalVouchers > 1 && (
                              <span className="text-[9px] bg-gray-100 px-1.5 py-0.2 rounded text-gray-600 font-semibold shrink-0">
                                Voucher {rc.voucherIndex} of {rc.totalVouchers}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {getPageFooterText(currentDocPage, displayTotalPages) && (
                    <div className="sheet-page-footer">
                      {getPageFooterText(currentDocPage, displayTotalPages)}
                    </div>
                  )}
                </article>
              );
            })
          ) : (activePage === 5 ? (
            <article className="document-sheet flex flex-col justify-between">
              <OfficialHeaderBanner />
              <div className="text-center py-24 my-auto">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-gray-800">No Receipt Attachments</h4>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  No disbursement records with attached vouchers were found for {semester} {academicYear}.
                </p>
              </div>
              {getPageFooterText(1, 1) && (
                <div className="sheet-page-footer">{getPageFooterText(1, 1)}</div>
              )}
            </article>
          ) : null)
        )}
          </>
        )}

      </main>
    </div>
  );
}
