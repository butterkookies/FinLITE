'use client';
import { useState, useEffect, useRef } from 'react';
import { Download, Printer, X, FileText, Edit3, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
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

  // Dynamic Initial Budget & Transaction Rows (Zero Fake Data)
  const [initialBudget, setInitialBudget] = useState(0);
  const [inflowRows, setInflowRows] = useState([]);
  const [expenseRows, setExpenseRows] = useState([]);

  // Active Signatories
  const [signatories, setSignatories] = useState({
    presidentName: 'EMANUEL MALBAROSA',
    presidentRole: 'LITE PRESIDENT',
    treasurerName: 'ANDREI JOHN P. GERONIMO',
    treasurerRole: 'LITE TREASURER',
    auditorName: 'CHRISTIAN REY C. KASILAG',
    auditorRole: 'LITE AUDITOR',
    adviserName: 'MS. KIMBERLY DAWN JATULAN',
    adviserRole: 'LITE CLUB ADVISER',
    directorName: 'JOVYLYN ORTIZ-CESAR, MBA, MSIT',
    directorRole: 'PROGRAM DIRECTOR, BSIT',
    deanName: 'DR. EMRAIDA MARIE M. MANUCOM',
    deanRole: 'DEAN, COLLEGE OF COMPUTER STUDIES',
  });

  const [isExporting, setIsExporting] = useState(false);

  // Zoom & Scaling Engine State
  const [zoom, setZoom] = useState(1);
  const [isFitToScreen, setIsFitToScreen] = useState(false);
  const [supportsCssZoom, setSupportsCssZoom] = useState(true);
  const scrollCanvasRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof CSS !== 'undefined' && CSS.supports) {
      setSupportsCssZoom(CSS.supports('zoom', '1'));
    }
  }, []);

  const calculateFitScale = () => {
    if (!scrollCanvasRef.current) return 1;
    const containerWidth = scrollCanvasRef.current.clientWidth;
    // Standard US Letter 8.5in = 816px at 96 DPI with 32px viewport breathing room
    const availableWidth = containerWidth - 32;
    const fitScale = Math.min(1.2, Math.max(0.35, availableWidth / 816));
    return Math.round(fitScale * 100) / 100;
  };

  // Auto fit on small screens when modal opens
  useEffect(() => {
    if (isOpen) {
      if (typeof window !== 'undefined' && window.innerWidth < 900) {
        setIsFitToScreen(true);
        const timer = setTimeout(() => {
          setZoom(calculateFitScale());
        }, 60);
        return () => clearTimeout(timer);
      } else {
        setZoom(1);
        setIsFitToScreen(false);
      }
    }
  }, [isOpen]);

  // Dynamically adjust scale on window resize if in Fit to Screen mode
  useEffect(() => {
    const handleResize = () => {
      if (isFitToScreen) {
        setZoom(calculateFitScale());
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFitToScreen]);

  const handleZoomIn = () => {
    setIsFitToScreen(false);
    setZoom((prev) => Math.min(2.0, Math.round((prev + 0.1) * 10) / 10));
  };

  const handleZoomOut = () => {
    setIsFitToScreen(false);
    setZoom((prev) => Math.max(0.3, Math.round((prev - 0.1) * 10) / 10));
  };

  const handleResetZoom = () => {
    setIsFitToScreen(false);
    setZoom(1);
  };

  const handleToggleFitToScreen = () => {
    if (!isFitToScreen) {
      setIsFitToScreen(true);
      setZoom(calculateFitScale());
    } else {
      setIsFitToScreen(false);
      setZoom(1);
    }
  };

  // Keyboard shortcuts: Esc, Ctrl +, Ctrl -, Ctrl 0
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (!e.ctrlKey && !e.metaKey) return;
      }

      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        handleZoomOut();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFitToScreen]);

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
        setSignatories(prev => ({
          ...prev,
          presidentName: (documentData.signatories.notedBy || documentData.signatories.presidentName || prev.presidentName).toUpperCase(),
          presidentRole: (documentData.signatories.notedRole || documentData.signatories.presidentRole || prev.presidentRole).toUpperCase(),
          treasurerName: (documentData.signatories.preparedBy || documentData.signatories.treasurerName || prev.treasurerName).toUpperCase(),
          treasurerRole: (documentData.signatories.preparedRole || documentData.signatories.treasurerRole || prev.treasurerRole).toUpperCase(),
          auditorName: (documentData.signatories.reviewedBy || documentData.signatories.auditorName || prev.auditorName).toUpperCase(),
          auditorRole: (documentData.signatories.reviewedRole || documentData.signatories.auditorRole || prev.auditorRole).toUpperCase(),
          adviserName: (documentData.signatories.adviser1 || documentData.signatories.adviserName || prev.adviserName).toUpperCase(),
          adviserRole: (documentData.signatories.adviserRole || prev.adviserRole).toUpperCase(),
          directorName: (documentData.signatories.directorName || prev.directorName).toUpperCase(),
          directorRole: (documentData.signatories.directorRole || prev.directorRole).toUpperCase(),
          deanName: (documentData.signatories.deanName || prev.deanName).toUpperCase(),
          deanRole: (documentData.signatories.deanRole || prev.deanRole).toUpperCase(),
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

  const handleRemoveExpense = (idx) => {
    setExpenseRows(prev => prev.filter((_, i) => i !== idx));
  };

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
      <header className="sticky top-0 z-50 bg-[#1e232a]/95 backdrop-blur border-b border-gray-700 text-white px-3 sm:px-6 py-2 sm:py-2.5 flex flex-col gap-2 no-print shadow-xl">
        <div className="flex items-center justify-between gap-2.5 w-full">
          {/* Left: Branding & Subtitle */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-sm shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm font-bold tracking-tight truncate">
                  {isProposal ? 'Activity Proposal Preview' : '1:1 Official PDM LITE Preview'}
                </span>
                <span className="hidden xs:inline-block px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                  Exact Replicant
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-gray-400 flex items-center gap-1 truncate">
                <Edit3 className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">In-place editing active: values auto-sync to export.</span>
              </p>
            </div>
          </div>

          {/* Right Actions: Zoom Controls + Print + Export + Close */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Zoom Controls Toolbar */}
            <div className="flex items-center bg-gray-800/90 border border-gray-700 rounded-lg p-0.5 text-xs text-gray-300 shadow-2xs">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 0.3}
                className="p-1 sm:p-1.5 hover:text-white hover:bg-gray-700/70 rounded disabled:opacity-30 transition-colors cursor-pointer"
                title="Zoom Out (Ctrl -)"
                aria-label="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                className="px-1.5 sm:px-2 py-0.5 font-mono text-[11px] font-semibold text-gray-200 hover:text-white hover:bg-gray-700/70 rounded transition-colors cursor-pointer"
                title="Reset to 100% 1:1 scale (Ctrl 0)"
              >
                {Math.round(zoom * 100)}%
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 2.0}
                className="p-1 sm:p-1.5 hover:text-white hover:bg-gray-700/70 rounded disabled:opacity-30 transition-colors cursor-pointer"
                title="Zoom In (Ctrl +)"
                aria-label="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <div className="w-[1px] h-3.5 bg-gray-700 mx-0.5" />

              <button
                type="button"
                onClick={handleToggleFitToScreen}
                className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  isFitToScreen 
                    ? 'bg-emerald-600 text-white font-semibold shadow-xs' 
                    : 'hover:text-white hover:bg-gray-700/70 text-gray-300'
                }`}
                title="Fit document to screen width"
              >
                <Maximize2 className="w-3 h-3 shrink-0" />
                <span className="hidden md:inline">Fit</span>
              </button>
            </div>

            {/* Print / PDF Button */}
            <button
              onClick={() => window.print()}
              className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 hover:text-white rounded-lg transition-colors border border-gray-700 cursor-pointer shadow-2xs"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Print / PDF</span>
            </button>

            {/* Export .docx Button */}
            <button
              onClick={handleExportDocx}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>{isExporting ? 'Exporting...' : 'Export .docx'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors ml-0.5 cursor-pointer"
              title="Close preview (Esc)"
              aria-label="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Page Selector Tabs */}
        {!isProposal && (
          <div className="w-full flex items-center gap-1 bg-gray-800/90 p-1 rounded-xl border border-gray-700 text-xs overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActivePage(0)}
              className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${activePage === 0 ? 'bg-emerald-700 text-white font-bold' : 'text-gray-300 hover:text-white'}`}
            >
              All 4 Pages
            </button>
            <button
              onClick={() => setActivePage(1)}
              className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${activePage === 1 ? 'bg-emerald-700 text-white font-bold' : 'text-gray-300 hover:text-white'}`}
            >
              Page 1: Transmittal
            </button>
            <button
              onClick={() => setActivePage(2)}
              className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${activePage === 2 ? 'bg-emerald-700 text-white font-bold' : 'text-gray-300 hover:text-white'}`}
            >
              Page 2: Income
            </button>
            <button
              onClick={() => setActivePage(3)}
              className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${activePage === 3 ? 'bg-emerald-700 text-white font-bold' : 'text-gray-300 hover:text-white'}`}
            >
              Page 3: Expenses
            </button>
            <button
              onClick={() => setActivePage(4)}
              className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${activePage === 4 ? 'bg-emerald-700 text-white font-bold' : 'text-gray-300 hover:text-white'}`}
            >
              Page 4: Reconciliation
            </button>
          </div>
        )}
      </header>

      {/* Main Multi-Sheet Canvas with Zoom & Aspect-Ratio Preservation */}
      <main
        ref={scrollCanvasRef}
        className="document-canvas-wrapper"
      >
        <div
          className="document-sheet-container"
          style={
            supportsCssZoom
              ? { zoom: zoom }
              : {
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                  marginBottom: zoom < 1 ? `-${Math.round((1 - zoom) * 1100)}px` : '0px',
                }
          }
        >

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

            {/* Table 1: Prepared & Endorsed by (Student Officers - 3 Columns) */}
            <table className="sig-table">
              <thead>
                <tr>
                  <th colSpan="3" className="sig-section-header">Prepared &amp; Endorsed by:</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ width: '33.33%' }}>
                    <div className="sig-cell">
                      <div className="sig-space" />
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
                  </td>
                  <td style={{ width: '33.33%' }}>
                    <div className="sig-cell">
                      <div className="sig-space" />
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
                  </td>
                  <td style={{ width: '33.33%' }}>
                    <div className="sig-cell">
                      <div className="sig-space" />
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
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Table 2: Recommending & Final Approval (Administrators - 2 Columns) */}
            <table className="sig-table">
              <thead>
                <tr>
                  <th colSpan="2" className="sig-section-header">Recommending Approval:</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ width: '50%' }}>
                    <div className="sig-cell">
                      <div className="sig-space" />
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
                  </td>
                  <td style={{ width: '50%' }}>
                    <div className="sig-cell">
                      <div className="sig-space" />
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
                  </td>
                </tr>
              </tbody>
            </table>
          </article>
        ) : (
          <>
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

            {/* Signatories Block (Table-Based) */}
            <div className="mt-8">
              {/* Table 1: Prepared by (Student Officers - 3 Columns) */}
              <table className="sig-table">
                <thead>
                  <tr>
                    <th colSpan="3" className="sig-section-header">Prepared by:</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ width: '33.33%' }}>
                      <div className="sig-cell">
                        <div className="sig-space" />
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
                    </td>
                    <td style={{ width: '33.33%' }}>
                      <div className="sig-cell">
                        <div className="sig-space" />
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
                    </td>
                    <td style={{ width: '33.33%' }}>
                      <div className="sig-cell">
                        <div className="sig-space" />
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
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Table 2: Approved by (Advisers - 2 Columns) */}
              <table className="sig-table">
                <thead>
                  <tr>
                    <th className="sig-section-header" style={{ width: '50%' }}>Approved by:</th>
                    <th style={{ width: '50%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ width: '50%' }}>
                      <div className="sig-cell">
                        <div className="sig-space" />
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
                    </td>
                    <td style={{ width: '50%' }}></td>
                  </tr>
                </tbody>
              </table>

              {/* Table 3: Noted by (Administrators - 2 Columns) */}
              <table className="sig-table">
                <thead>
                  <tr>
                    <th colSpan="2" className="sig-section-header">Noted by:</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ width: '50%' }}>
                      <div className="sig-cell">
                        <div className="sig-space" />
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
                    </td>
                    <td style={{ width: '50%' }}>
                      <div className="sig-cell">
                        <div className="sig-space" />
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
                    </td>
                  </tr>
                </tbody>
              </table>

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
            <div className="mb-2 font-bold text-xs uppercase text-gray-800">
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
              <span className="font-bold text-xs uppercase text-gray-800">Income & Collections:</span>
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
          </article>
        )}

        {/* ========================================================================= */}
        {/* PAGE 3: MISCELLANEOUS EXPENSES                                           */}
        {/* ========================================================================= */}
        {(activePage === 0 || activePage === 3) && (
          <article className="document-sheet">
            <OfficialHeaderBanner />

            <div className="flex justify-between items-center mb-1">
              <div>
                <div className="font-bold text-xs uppercase text-gray-800">Expenses:</div>
                <div className="font-bold text-xs mb-3 text-gray-700">Itemized Operating & Event Expenses</div>
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

            {/* Signatories Block (Table-Based) */}
            <div className="mt-12">
              {/* Table 1: Prepared by (Student Officers - 3 Columns) */}
              <table className="sig-table">
                <thead>
                  <tr>
                    <th colSpan="3" className="sig-section-header">Prepared by:</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ width: '33.33%' }}>
                      <div className="sig-cell">
                        <div className="sig-space" />
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
                    </td>
                    <td style={{ width: '33.33%' }}>
                      <div className="sig-cell">
                        <div className="sig-space" />
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
                    </td>
                    <td style={{ width: '33.33%' }}>
                      <div className="sig-cell">
                        <div className="sig-space" />
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
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Table 2: Approved by (Advisers - 2 Columns) */}
              <table className="sig-table">
                <thead>
                  <tr>
                    <th className="sig-section-header" style={{ width: '50%' }}>Approved by:</th>
                    <th style={{ width: '50%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ width: '50%' }}>
                      <div className="sig-cell">
                        <div className="sig-space" />
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
                    </td>
                    <td style={{ width: '50%' }}></td>
                  </tr>
                </tbody>
              </table>

              {/* Table 3: Noted by (Administrators - 2 Columns) */}
              <table className="sig-table">
                <thead>
                  <tr>
                    <th colSpan="2" className="sig-section-header">Noted by:</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ width: '50%' }}>
                      <div className="sig-cell">
                        <div className="sig-space" />
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
                    </td>
                    <td style={{ width: '50%' }}>
                      <div className="sig-cell">
                        <div className="sig-space" />
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
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        )}
          </>
        )}
        </div>
      </main>
    </div>
  );
}
