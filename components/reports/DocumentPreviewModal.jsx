'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Download,
  Printer,
  X,
  FileText,
  Edit3,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sliders,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Layers,
  Check,
  Plus,
  Trash2,
  FileSpreadsheet,
  Lock,
  Undo2,
  Redo2,
} from 'lucide-react';
import './DocumentPreview.css';
import { Button, Badge, Select } from '@/components/ui';

// Proportional Scaled Sheet Wrapper maintaining exact Letter 8.5" x 11" dimensions
function ScaledSheet({ scale, children, className = '' }) {
  const contentRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(1056);

  useEffect(() => {
    if (!contentRef.current) return;
    const updateH = () => {
      if (contentRef.current) {
        const measured = contentRef.current.offsetHeight || 1056;
        setContentHeight(Math.max(1056, measured));
      }
    };
    updateH();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => updateH());
      ro.observe(contentRef.current);
      return () => ro.disconnect();
    }
  }, []);

  return (
    <div
      className={`sheet-scaler-wrapper ${className}`}
      style={{
        width: `${Math.round(816 * scale)}px`,
        height: `${Math.round(contentHeight * scale)}px`,
      }}
    >
      <div
        ref={contentRef}
        className="sheet-scale-target"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: '816px',
        }}
      >
        {children}
      </div>
    </div>
  );
}

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

function normalizeReportSemesterKey(raw) {
  const sem = String(raw || '1st Semester').trim();
  if (/1st|first/i.test(sem)) return '1ST SEMESTER';
  if (/2nd|second/i.test(sem)) return '2ND SEMESTER';
  if (/midyear|summer/i.test(sem)) return 'SUMMER SEMESTER';
  return sem.toUpperCase().replace(/\bSEM\b/i, 'SEMESTER');
}

function normalizeReportAcademicYearKey(raw) {
  return String(raw || '2025-2026')
    .trim()
    .replace(/[\u2013\u2014]/g, '-');
}

export default function DocumentPreviewModal({
  isOpen,
  onClose,
  documentData,
  data,
  userPermissions = null,
  canExport = null,
}) {
  const canExportReport = canExport !== null
    ? Boolean(canExport)
    : (userPermissions ? Boolean(userPermissions.export_reports) : true);

  const activeDocData = documentData || data;
  const isProposal = activeDocData?.type === 'PROPOSAL';

  // Proportional Scaling, Viewport & View Mode state
  const viewportRef = useRef(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomMode, setZoomMode] = useState('fit-width'); // 'fit-width' | 'fit-page' | 'custom'
  const [viewMode, setViewMode] = useState('single'); // 'single' | 'continuous'
  const [activePage, setActivePage] = useState(1); // 1-indexed for single page, or 0 for all
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPageSelectorOpen, setIsPageSelectorOpen] = useState(false);

  // Editable Transmittal Metadata
  const [transmittalDate, setTransmittalDate] = useState(
    new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  );
  const [coordinatorName, setCoordinatorName] = useState('Ms. Ligaya H. Estrella');
  const [coordinatorRole, setCoordinatorRole] = useState('Co-curricular Affairs Coordinator');
  const [salutation, setSalutation] = useState('Dear Ms. Estrella,');
  const [semester, setSemester] = useState(() => {
    const m = new Date().getMonth();
    return (m >= 7 || m === 0) ? '1st SEMESTER' : '2nd SEMESTER';
  });
  const [academicYear, setAcademicYear] = useState(() => {
    const now = new Date();
    const curY = now.getFullYear();
    const sYear = now.getMonth() >= 7 ? curY : curY - 1;
    return `${sYear}–${sYear + 1}`;
  });
  const [periodDesc, setPeriodDesc] = useState('Financial Operations');
  const [finalAsOf, setFinalAsOf] = useState(
    `As of ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
  );

  // CC Routing Configuration (Defaulted to false/excluded per user request)
  const [includeCc, setIncludeCc] = useState(false);
  const [ccRecipients, setCcRecipients] = useState(['cc: Co-Curricular', "cc: Dean's Office"]);

  // Bottom-Right Page Numbering Configuration ('page_x_of_y' | 'page_x_of_y_no_cover' | 'simple' | 'none')
  const [pageNumberStyle, setPageNumberStyle] = useState('page_x_of_y');

  // Report Typography Mode (Patch 14): 'calibri' (Calibri 11pt) | 'times' (Times New Roman 12pt)
  const [typography, setTypography] = useState('calibri');

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

  // 10-Step Undo & Redo History System (Max 10 for both undo & redo)
  const MAX_HISTORY = 10;
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const isApplyingHistoryRef = useRef(false);
  const typingTimerRef = useRef(null);
  const typingBaselineRef = useRef(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const captureReportState = useCallback(() => ({
    initialBudget,
    inflowRows: JSON.parse(JSON.stringify(inflowRows)),
    expenseRows: JSON.parse(JSON.stringify(expenseRows)),
    signatories: { ...signatories },
    includedSignatories: { ...includedSignatories },
    transmittalDate,
    coordinatorName,
    coordinatorRole,
    salutation,
    periodDesc,
    finalAsOf,
    includeCc,
    ccRecipients: [...ccRecipients],
    pageNumberStyle,
    typography,
  }), [
    initialBudget,
    inflowRows,
    expenseRows,
    signatories,
    includedSignatories,
    transmittalDate,
    coordinatorName,
    coordinatorRole,
    salutation,
    periodDesc,
    finalAsOf,
    includeCc,
    ccRecipients,
    pageNumberStyle,
    typography,
  ]);

  const pushUndoSnapshot = useCallback((customSnapshot = null) => {
    if (isApplyingHistoryRef.current) return;
    const snap = customSnapshot || captureReportState();
    const top = undoStackRef.current[undoStackRef.current.length - 1];
    if (top && JSON.stringify(top) === JSON.stringify(snap)) return;

    undoStackRef.current.push(snap);
    if (undoStackRef.current.length > MAX_HISTORY) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, [captureReportState]);

  const recordTypingMutation = useCallback(() => {
    if (isApplyingHistoryRef.current) return;
    if (!typingBaselineRef.current) {
      typingBaselineRef.current = captureReportState();
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      if (typingBaselineRef.current) {
        pushUndoSnapshot(typingBaselineRef.current);
        typingBaselineRef.current = null;
      }
    }, 450);
  }, [captureReportState, pushUndoSnapshot]);

  const applyHistorySnapshot = useCallback((snap) => {
    if (!snap) return;
    isApplyingHistoryRef.current = true;
    if (typeof snap.initialBudget === 'number') setInitialBudget(snap.initialBudget);
    if (Array.isArray(snap.inflowRows)) setInflowRows(snap.inflowRows);
    if (Array.isArray(snap.expenseRows)) setExpenseRows(snap.expenseRows);
    if (snap.signatories) setSignatories(snap.signatories);
    if (snap.includedSignatories) setIncludedSignatories(snap.includedSignatories);
    if (snap.transmittalDate !== undefined) setTransmittalDate(snap.transmittalDate);
    if (snap.coordinatorName !== undefined) setCoordinatorName(snap.coordinatorName);
    if (snap.coordinatorRole !== undefined) setCoordinatorRole(snap.coordinatorRole);
    if (snap.salutation !== undefined) setSalutation(snap.salutation);
    if (snap.periodDesc !== undefined) setPeriodDesc(snap.periodDesc);
    if (snap.finalAsOf !== undefined) setFinalAsOf(snap.finalAsOf);
    if (typeof snap.includeCc === 'boolean') setIncludeCc(snap.includeCc);
    if (Array.isArray(snap.ccRecipients)) setCcRecipients(snap.ccRecipients);
    if (snap.pageNumberStyle !== undefined) setPageNumberStyle(snap.pageNumberStyle);
    if (snap.typography !== undefined) setTypography(snap.typography);

    setTimeout(() => {
      isApplyingHistoryRef.current = false;
    }, 40);
  }, []);

  const handleUndo = useCallback(() => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    if (typingBaselineRef.current) {
      pushUndoSnapshot(typingBaselineRef.current);
      typingBaselineRef.current = null;
    }

    if (undoStackRef.current.length === 0) return;

    const previousSnap = undoStackRef.current.pop();
    const currentSnap = captureReportState();

    redoStackRef.current.push(currentSnap);
    if (redoStackRef.current.length > MAX_HISTORY) {
      redoStackRef.current.shift();
    }

    applyHistorySnapshot(previousSnap);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, [captureReportState, applyHistorySnapshot, pushUndoSnapshot]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;

    const nextSnap = redoStackRef.current.pop();
    const currentSnap = captureReportState();

    undoStackRef.current.push(currentSnap);
    if (undoStackRef.current.length > MAX_HISTORY) {
      undoStackRef.current.shift();
    }

    applyHistorySnapshot(nextSnap);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, [captureReportState, applyHistorySnapshot]);

  const handleUpdateInitialBudget = useCallback((val) => {
    recordTypingMutation();
    setInitialBudget(val);
  }, [recordTypingMutation]);

  const toggleSignatory = (key) => {
    pushUndoSnapshot();
    setIncludedSignatories((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Export & Attachment Scope: 'APPEND' (Report + Receipts), 'NONE' (Report Only), 'STANDALONE' (Receipts Only)
  const [receiptsMode, setReceiptsMode] = useState('APPEND');

  // 4-Stage Pre-Print Routing & Draft Persistence (Patch 10)
  const ROUTING_STAGES = [
    { stage: 1, label: 'Stage 1: Treasurer Prepared', short: '1. Treasurer' },
    { stage: 2, label: 'Stage 2: Auditor Certified', short: '2. Auditor' },
    { stage: 3, label: 'Stage 3: President/VP Approved', short: '3. President/VP' },
    { stage: 4, label: 'Stage 4: Club Advisers Signed Off', short: '4. Advisers' },
  ];
  const [routingStage, setRoutingStage] = useState(1);
  const [routingStatus, setRoutingStatus] = useState('DRAFT'); // 'DRAFT' | 'ROUTING' | 'RETURNED_FOR_REVISION' | 'READY_FOR_PRINT'
  const [routingComment, setRoutingComment] = useState('');
  const [returnReasonInput, setReturnReasonInput] = useState('');
  const [showReturnPrompt, setShowReturnPrompt] = useState(false);
  const [routingHistory, setRoutingHistory] = useState([]);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState(null);

  const [isExporting, setIsExporting] = useState(false);

  const populateFromLiveDocData = useCallback((docData) => {
    if (!docData) return;
    if (docData.transmittalDate) {
      setTransmittalDate(docData.transmittalDate);
      setFinalAsOf(`As of ${docData.transmittalDate}`);
    }
    if (docData.eventName) setPeriodDesc(docData.eventName);
    else if (docData.activityTitle) setPeriodDesc(docData.activityTitle);

    if (docData.semester) {
      const sem = String(docData.semester).trim();
      let semClean = sem.toUpperCase();
      if (/1st|first/i.test(sem)) semClean = '1st SEMESTER';
      else if (/2nd|second/i.test(sem)) semClean = '2nd SEMESTER';
      else if (/midyear|summer/i.test(sem)) semClean = 'SUMMER / MIDYEAR';
      else semClean = semClean.replace(/\bSEM\b/i, 'SEMESTER');
      setSemester(semClean);
    }
    if (docData.academicYear) setAcademicYear(docData.academicYear);

    // Sync real signatories if provided
    if (docData.signatories) {
      const sigs = docData.signatories;
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

      setSignatories((prev) => ({
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

      setIncludedSignatories((prev) => ({
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

    const txs = docData.transactions || [];

    // 1. Auto-detect rollover beginning balance
    const rolloverTxs = txs.filter(
      (t) =>
        t.type === 'INFLOW' &&
        ((t.category_name && t.category_name.toLowerCase().includes('rollover')) ||
          (t.title && t.title.toLowerCase().includes('beginning')))
    );
    const rolloverIds = new Set(rolloverTxs.map((t) => t.id));
    const totalRollover = rolloverTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    setInitialBudget(totalRollover);

    // 2. Real inflows (excluding rollover to prevent double-counting)
    const realInflows = txs
      .filter((t) => t.type === 'INFLOW' && !rolloverIds.has(t.id))
      .map((t) => ({
        id: t.id,
        desc: t.title,
        amount: Number(t.amount) || 0,
        category: t.category_name || 'Income Collection',
        date: t.transaction_date,
      }));
    setInflowRows(realInflows);

    // 3. Real outflows / disbursements
    const realOutflows = txs
      .filter((t) => t.type === 'OUTFLOW')
      .map((t) => ({
        id: t.id,
        desc: t.title,
        amount: Number(t.amount) || 0,
        category: t.category_name || 'Operating Expense',
        date: t.transaction_date,
      }));
    setExpenseRows(realOutflows);
  }, []);

  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const baselineSnapshotRef = useRef(null);
  const isDirtyRef = useRef(false);
  const autoSaveTimerRef = useRef(null);
  const latestDraftPayloadRef = useRef(null);

  const currentDraftPayload = useMemo(() => {
    const semKey = normalizeReportSemesterKey(activeDocData?.semester || semester);
    const ayKey = normalizeReportAcademicYearKey(activeDocData?.academicYear || academicYear);
    return {
      semester: semKey,
      academicYear: ayKey,
      routingStage,
      routingStatus,
      routingComment,
      routingHistory,
      typography,
      draftData: {
        displaySemester: semester,
        displayAcademicYear: academicYear,
        transmittalDate,
        coordinatorName,
        coordinatorRole,
        salutation,
        periodDesc,
        finalAsOf,
        includeCc,
        ccRecipients,
        pageNumberStyle,
        initialBudget,
        inflowRows,
        expenseRows,
        signatories,
        includedSignatories,
        receiptsMode,
      },
    };
  }, [
    activeDocData?.semester,
    activeDocData?.academicYear,
    semester,
    academicYear,
    routingStage,
    routingStatus,
    routingComment,
    routingHistory,
    typography,
    transmittalDate,
    coordinatorName,
    coordinatorRole,
    salutation,
    periodDesc,
    finalAsOf,
    includeCc,
    ccRecipients,
    pageNumberStyle,
    initialBudget,
    inflowRows,
    expenseRows,
    signatories,
    includedSignatories,
    receiptsMode,
  ]);

  const currentDraftSnapshot = useMemo(
    () => JSON.stringify(currentDraftPayload),
    [currentDraftPayload]
  );

  useEffect(() => {
    latestDraftPayloadRef.current = currentDraftPayload;
  }, [currentDraftPayload]);

  // Sync state strictly with incoming real activeDocData and load persisted draft if available
  useEffect(() => {
    if (!activeDocData) return;
    setIsDraftHydrated(false);
    baselineSnapshotRef.current = null;
    isDirtyRef.current = false;
    populateFromLiveDocData(activeDocData);

    if (isProposal) return;

    const semKey = normalizeReportSemesterKey(activeDocData.semester || semester);
    const ayKey = normalizeReportAcademicYearKey(activeDocData.academicYear || academicYear);
    const localKey = `finlite_report_draft_${ayKey}_${semKey}`;
    const legacyLocalKey = `finlite_report_draft_${activeDocData.academicYear || academicYear}_${activeDocData.semester || semester}`;

    const applySavedDraft = (saved) => {
      if (!saved || typeof saved !== 'object') return;
      if (saved.routingStage) setRoutingStage(Number(saved.routingStage) || 1);
      if (saved.routingStatus) setRoutingStatus(saved.routingStatus);
      if (saved.routingComment !== undefined) setRoutingComment(saved.routingComment || '');
      if (Array.isArray(saved.routingHistory)) setRoutingHistory(saved.routingHistory);
      if (saved.typography === 'times' || saved.typography === 'calibri') {
        setTypography(saved.typography);
      }
      if (saved.savedAt) setDraftSavedAt(saved.savedAt);

      const d = saved.draftData;
      if (d && typeof d === 'object') {
        if (d.displaySemester) setSemester(d.displaySemester);
        if (d.displayAcademicYear) setAcademicYear(d.displayAcademicYear);
        if (d.transmittalDate) setTransmittalDate(d.transmittalDate);
        if (d.coordinatorName) setCoordinatorName(d.coordinatorName);
        if (d.coordinatorRole) setCoordinatorRole(d.coordinatorRole);
        if (d.salutation) setSalutation(d.salutation);
        if (d.periodDesc) setPeriodDesc(d.periodDesc);
        if (d.finalAsOf) setFinalAsOf(d.finalAsOf);
        if (typeof d.includeCc === 'boolean') setIncludeCc(d.includeCc);
        if (Array.isArray(d.ccRecipients)) setCcRecipients(d.ccRecipients);
        if (d.pageNumberStyle) setPageNumberStyle(d.pageNumberStyle);
        if (typeof d.initialBudget === 'number') setInitialBudget(d.initialBudget);
        if (Array.isArray(d.inflowRows)) setInflowRows(d.inflowRows);
        if (Array.isArray(d.expenseRows)) setExpenseRows(d.expenseRows);
        if (d.signatories && typeof d.signatories === 'object') {
          setSignatories((prev) => ({ ...prev, ...d.signatories }));
        }
        if (d.includedSignatories && typeof d.includedSignatories === 'object') {
          setIncludedSignatories((prev) => ({ ...prev, ...d.includedSignatories }));
        }
        if (d.receiptsMode) setReceiptsMode(d.receiptsMode);
      }
    };

    let localSavedAtMs = 0;
    let parsedLocalDraft = null;
    try {
      const localRaw = localStorage.getItem(localKey) || localStorage.getItem(legacyLocalKey);
      if (localRaw) {
        parsedLocalDraft = JSON.parse(localRaw);
        localSavedAtMs = parsedLocalDraft?.savedAt ? new Date(parsedLocalDraft.savedAt).getTime() || 0 : 0;
        applySavedDraft(parsedLocalDraft);
      }
    } catch (_) {}

    let isCancelled = false;
    fetch(
      `/api/reports/draft?semester=${encodeURIComponent(semKey)}&academicYear=${encodeURIComponent(ayKey)}`
    )
      .then((r) => r.json())
      .then((res) => {
        if (isCancelled || isDirtyRef.current) return;
        if (res?.draft) {
          const remoteSavedAtMs = res.draft?.savedAt ? new Date(res.draft.savedAt).getTime() || 0 : 0;
          if (!localSavedAtMs || remoteSavedAtMs >= localSavedAtMs) {
            applySavedDraft(res.draft);
          } else if (parsedLocalDraft) {
            // Local draft is newer than server (e.g., fast exit/reopen while keepalive POST was in flight); sync to server
            fetch('/api/reports/draft', {
              method: 'POST',
              keepalive: true,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(parsedLocalDraft),
            }).catch(() => {});
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!isCancelled) {
          setIsDraftHydrated(true);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [activeDocData, isProposal, populateFromLiveDocData]);

  const handleSaveDraft = useCallback(
    async ({
      nextStage = routingStage,
      nextStatus = routingStatus,
      nextComment = routingComment,
      nextHistory = routingHistory,
      silent = false,
    } = {}) => {
      if (!silent) setIsSavingDraft(true);
      const nowIso = new Date().toISOString();
      const semKey = normalizeReportSemesterKey(activeDocData?.semester || semester);
      const ayKey = normalizeReportAcademicYearKey(activeDocData?.academicYear || academicYear);

      const basePayload = {
        semester: semKey,
        academicYear: ayKey,
        routingStage: nextStage,
        routingStatus: nextStatus,
        routingComment: nextComment,
        routingHistory: nextHistory,
        typography,
        draftData: {
          displaySemester: semester,
          displayAcademicYear: academicYear,
          transmittalDate,
          coordinatorName,
          coordinatorRole,
          salutation,
          periodDesc,
          finalAsOf,
          includeCc,
          ccRecipients,
          pageNumberStyle,
          initialBudget,
          inflowRows,
          expenseRows,
          signatories,
          includedSignatories,
          receiptsMode,
        },
      };

      baselineSnapshotRef.current = JSON.stringify(basePayload);
      isDirtyRef.current = false;

      const draftPayload = {
        ...basePayload,
        savedAt: nowIso,
      };

      const localKey = `finlite_report_draft_${ayKey}_${semKey}`;
      try {
        localStorage.setItem(localKey, JSON.stringify(draftPayload));
      } catch (_) {}

      try {
        const res = await fetch('/api/reports/draft', {
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draftPayload),
        });
        const data = await res.json();
        setDraftSavedAt(data?.savedAt || nowIso);
      } catch (_) {
        setDraftSavedAt(nowIso);
      } finally {
        if (!silent) setIsSavingDraft(false);
      }
    },
    [
      activeDocData?.semester,
      activeDocData?.academicYear,
      semester,
      academicYear,
      routingStage,
      routingStatus,
      routingComment,
      routingHistory,
      typography,
      transmittalDate,
      coordinatorName,
      coordinatorRole,
      salutation,
      periodDesc,
      finalAsOf,
      includeCc,
      ccRecipients,
      pageNumberStyle,
      initialBudget,
      inflowRows,
      expenseRows,
      signatories,
      includedSignatories,
      receiptsMode,
    ]
  );

  // Automatic debounced save (800ms) whenever user edits any report line, metadata, signatory, or typography
  useEffect(() => {
    if (isProposal || !isDraftHydrated) return;
    if (baselineSnapshotRef.current === null) {
      baselineSnapshotRef.current = currentDraftSnapshot;
      isDirtyRef.current = false;
      return;
    }
    if (currentDraftSnapshot === baselineSnapshotRef.current) {
      return;
    }

    isDirtyRef.current = true;
    const nowIso = new Date().toISOString();
    const immediatePayload = {
      ...currentDraftPayload,
      savedAt: nowIso,
    };
    const localKey = `finlite_report_draft_${currentDraftPayload.academicYear}_${currentDraftPayload.semester}`;
    try {
      localStorage.setItem(localKey, JSON.stringify(immediatePayload));
    } catch (_) {}

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveTimerRef.current = null;
      handleSaveDraft({ silent: true });
    }, 800);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [currentDraftSnapshot, currentDraftPayload, isDraftHydrated, isProposal, handleSaveDraft]);

  const handleCloseModal = useCallback(() => {
    if (!isProposal && isDirtyRef.current && latestDraftPayloadRef.current) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      isDirtyRef.current = false;
      const nowIso = new Date().toISOString();
      const payload = {
        ...latestDraftPayloadRef.current,
        savedAt: nowIso,
      };
      const localKey = `finlite_report_draft_${payload.academicYear}_${payload.semester}`;
      try {
        localStorage.setItem(localKey, JSON.stringify(payload));
      } catch (_) {}
      fetch('/api/reports/draft', {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }
    onClose?.();
  }, [isProposal, onClose]);

  const handleAdvanceRoutingStage = async () => {
    const nextStage = Math.min(4, routingStage + 1);
    const nextStatus = nextStage === 4 ? 'READY_FOR_PRINT' : 'ROUTING';
    const stageObj = ROUTING_STAGES.find((s) => s.stage === nextStage);
    const nextHistory = [
      ...routingHistory,
      {
        stage: nextStage,
        action: 'APPROVED_STAGE',
        label: stageObj?.label || `Stage ${nextStage}`,
        timestamp: new Date().toISOString(),
      },
    ];
    setRoutingStage(nextStage);
    setRoutingStatus(nextStatus);
    setRoutingComment('');
    setRoutingHistory(nextHistory);
    await handleSaveDraft({
      nextStage,
      nextStatus,
      nextComment: '',
      nextHistory,
    });
  };

  const handleReturnToDraft = async () => {
    const reason = returnReasonInput.trim() || 'Returned to Treasurer draft for revision.';
    const nextHistory = [
      ...routingHistory,
      {
        stage: 1,
        action: 'RETURNED_TO_DRAFT',
        label: 'Returned to Stage 1 (Treasurer Draft)',
        comment: reason,
        timestamp: new Date().toISOString(),
      },
    ];
    setRoutingStage(1);
    setRoutingStatus('RETURNED_FOR_REVISION');
    setRoutingComment(reason);
    setRoutingHistory(nextHistory);
    setShowReturnPrompt(false);
    setReturnReasonInput('');
    await handleSaveDraft({
      nextStage: 1,
      nextStatus: 'RETURNED_FOR_REVISION',
      nextComment: reason,
      nextHistory,
    });
  };

  const handleResetToLiveLedger = () => {
    const semKey = normalizeReportSemesterKey(activeDocData?.semester || semester);
    const ayKey = normalizeReportAcademicYearKey(activeDocData?.academicYear || academicYear);
    const localKey = `finlite_report_draft_${ayKey}_${semKey}`;
    try {
      localStorage.removeItem(localKey);
    } catch (_) {}
    baselineSnapshotRef.current = null;
    setRoutingStage(1);
    setRoutingStatus('DRAFT');
    setRoutingComment('');
    setDraftSavedAt(null);
    populateFromLiveDocData(activeDocData);
  };

  // Derived Calculations from Real Ledger Data
  const totalInflows = inflowRows.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalFunds = initialBudget + totalInflows;
  const totalExpenses = expenseRows.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const cashOnHand = totalFunds - totalExpenses;

  const handleUpdateSignatory = (field, val) => {
    recordTypingMutation();
    setSignatories(prev => ({ ...prev, [field]: val }));
  };

  const handleUpdateInflow = (idx, field, val) => {
    recordTypingMutation();
    const next = [...inflowRows];
    next[idx] = { ...next[idx], [field]: field === 'amount' ? (parseFloat(val) || 0) : val };
    setInflowRows(next);
  };

  const handleAddInflow = () => {
    pushUndoSnapshot();
    setInflowRows(prev => [...prev, { id: `manual-in-${Date.now()}`, desc: 'New Income Particulars', amount: 0, category: 'Income Collection' }]);
  };

  const handleRemoveInflow = (idx) => {
    pushUndoSnapshot();
    setInflowRows(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateExpense = (idx, field, val) => {
    recordTypingMutation();
    const next = [...expenseRows];
    next[idx] = { ...next[idx], [field]: field === 'amount' ? (parseFloat(val) || 0) : val };
    setExpenseRows(next);
  };

  const handleAddExpense = () => {
    pushUndoSnapshot();
    setExpenseRows(prev => [...prev, { id: `manual-out-${Date.now()}`, desc: 'New Expense Particulars', amount: 0, category: 'Operating Expense' }]);
  };

  const handleRemoveExpense = (idx) => {
    pushUndoSnapshot();
    setExpenseRows(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateCcRecipient = (idx, val) => {
    recordTypingMutation();
    const next = [...ccRecipients];
    next[idx] = val;
    setCcRecipients(next);
  };

  const handleAddCcRecipient = () => {
    pushUndoSnapshot();
    setCcRecipients(prev => [...prev, 'cc: ']);
  };

  const handleRemoveCcRecipient = (idx) => {
    pushUndoSnapshot();
    setCcRecipients(prev => prev.filter((_, i) => i !== idx));
  };

  // Flatten receipt vouchers from active transactions
  const receiptItems = [];
  (activeDocData?.transactions || []).forEach((tx) => {
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

  // Structured Page Navigation list with authentic titles
  const availablePages = useMemo(() => {
    if (isProposal) {
      return [{ id: 1, label: 'Activity & Business Proposal', short: 'Proposal' }];
    }
    if (receiptsMode === 'STANDALONE') {
      if (receiptPages.length === 0) {
        return [{ id: 1, label: 'Receipts & Proofs (Empty)', short: 'Receipts' }];
      }
      return receiptPages.map((_, idx) => ({
        id: idx + 1,
        label: `Receipt Sheet ${idx + 1} of ${receiptPages.length}`,
        short: `Receipts ${idx + 1}/${receiptPages.length}`,
        receiptIndex: idx,
      }));
    }

    const pages = [
      { id: 1, label: 'Page 1: Transmittal Letter', short: 'P1: Transmittal' },
      { id: 2, label: 'Page 2: Income & Collections', short: 'P2: Income' },
      { id: 3, label: 'Page 3: Expenses & Disbursements', short: 'P3: Expenses' },
      { id: 4, label: 'Page 4: Reconciliation & Certification', short: 'P4: Reconciliation' },
    ];

    if (receiptsMode === 'APPEND') {
      if (receiptPages.length === 0) {
        pages.push({
          id: 5,
          label: 'Receipts & Proofs (No Attachments)',
          short: 'Receipts',
          receiptIndex: -1,
        });
      } else {
        receiptPages.forEach((_, idx) => {
          pages.push({
            id: 5 + idx,
            label: `Receipts Sheet ${idx + 1} of ${receiptPages.length}`,
            short: `Receipts ${idx + 1}/${receiptPages.length}`,
            receiptIndex: idx,
          });
        });
      }
    }

    return pages;
  }, [isProposal, receiptsMode, receiptPages]);

  const activeSignatoryCount = Object.values(includedSignatories).filter(Boolean).length;

  // Signatory matrix metadata: Officers grouped under single "Prepared by:", faculty & administration under single "Noted by:"
  const studentOfficers = [
    { key: 'treasurer', label: 'Treasurer', nameKey: 'treasurerName', roleKey: 'treasurerRole', heading: 'Prepared by:' },
    { key: 'auditor', label: 'Auditor', nameKey: 'auditorName', roleKey: 'auditorRole', heading: 'Prepared by:' },
    { key: 'vicePresident', label: 'Vice President', nameKey: 'vicePresidentName', roleKey: 'vicePresidentRole', heading: 'Prepared by:' },
    { key: 'president', label: 'President', nameKey: 'presidentName', roleKey: 'presidentRole', heading: 'Prepared by:' },
  ];
  const adviserOfficers = [
    { key: 'adviser1', label: 'Club Adviser 1', nameKey: 'adviser1Name', roleKey: 'adviser1Role', heading: 'Noted by:' },
    { key: 'adviser2', label: 'Club Adviser 2', nameKey: 'adviser2Name', roleKey: 'adviser2Role', heading: 'Noted by:' },
  ];
  const adminOfficers = [
    { key: 'director', label: 'Program Director', nameKey: 'directorName', roleKey: 'directorRole', heading: 'Noted by:' },
    { key: 'dean', label: 'Dean', nameKey: 'deanName', roleKey: 'deanRole', heading: 'Noted by:' },
  ];
  const allSignatoryDefs = [...studentOfficers, ...adviserOfficers, ...adminOfficers];

  const activeOfficers = studentOfficers.filter((o) => includedSignatories[o.key]);
  const activeAdvisers = adviserOfficers.filter((a) => includedSignatories[a.key]);
  const activeAdmins = adminOfficers.filter((adm) => includedSignatories[adm.key]);

  const handleExportDocx = async () => {
    if (!canExportReport) {
      alert('Report export is restricted by Administrator.');
      return;
    }
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
        items: activeDocData.items || [],
        transactions: allExportTransactions,
        include_cc: includeCc,
        cc_recipients: ccRecipients,
        page_number_style: pageNumberStyle,
        receiptsMode: receiptsMode,
        typography: typography,
        font_family: typography === 'times' ? 'Times New Roman' : 'Calibri',
        font_size_pt: typography === 'times' ? 12 : 11,
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

  // Proportional Scaling Calculators
  const getFitWidthScale = useCallback(() => {
    if (typeof window === 'undefined') return 1;
    const viewportWidth = viewportRef.current?.clientWidth || window.innerWidth;
    const padding = window.innerWidth < 640 ? 16 : 48;
    const availWidth = Math.max(280, viewportWidth - padding);
    const scale = availWidth / 816;
    return Number(Math.min(1.25, Math.max(0.25, scale)).toFixed(2));
  }, []);

  const getFitPageScale = useCallback(() => {
    if (typeof window === 'undefined') return 1;
    const viewportWidth = viewportRef.current?.clientWidth || window.innerWidth;
    const viewportHeight = viewportRef.current?.clientHeight || window.innerHeight;
    const padW = window.innerWidth < 640 ? 16 : 48;
    const padH = 160; // Top header + bottom docked toolbar + margins
    const availW = Math.max(280, viewportWidth - padW);
    const availH = Math.max(350, viewportHeight - padH);
    const scaleW = availW / 816;
    const scaleH = availH / 1056;
    return Number(Math.min(1.2, Math.max(0.25, Math.min(scaleW, scaleH))).toFixed(2));
  }, []);

  // Zoom Actions
  const handleZoomIn = () => {
    setZoomMode('custom');
    setZoomScale((prev) => Math.min(2.0, Number((prev + 0.15).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoomMode('custom');
    setZoomScale((prev) => Math.max(0.25, Number((prev - 0.15).toFixed(2))));
  };

  const handleZoomFitWidth = () => {
    setZoomMode('fit-width');
    setZoomScale(getFitWidthScale());
  };

  const handleZoomFitPage = () => {
    setZoomMode('fit-page');
    setZoomScale(getFitPageScale());
  };

  const handleZoom100 = () => {
    setZoomMode('custom');
    setZoomScale(1.0);
  };

  // Device Smart Defaults & Resize Observation
  useEffect(() => {
    if (!isOpen) return;

    const handleInitScale = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setViewMode('single');
        setActivePage(1);
        setZoomMode('fit-width');
        setZoomScale(getFitWidthScale());
      } else {
        setViewMode('continuous');
        setActivePage(0);
        const fit = getFitWidthScale();
        if (fit < 1) {
          setZoomScale(fit);
          setZoomMode('fit-width');
        } else {
          setZoomScale(1);
          setZoomMode('custom');
        }
      }
    };

    handleInitScale();

    const handleResize = () => {
      if (zoomMode === 'fit-width') {
        setZoomScale(getFitWidthScale());
      } else if (zoomMode === 'fit-page') {
        setZoomScale(getFitPageScale());
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, getFitWidthScale, getFitPageScale]);

  // Page Indexing & Navigation
  const currentPageIndex = availablePages.findIndex((p) => p.id === activePage) !== -1
    ? availablePages.findIndex((p) => p.id === activePage)
    : 0;

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setActivePage(availablePages[currentPageIndex - 1].id);
    }
  };

  const handleNextPage = () => {
    if (currentPageIndex < availablePages.length - 1) {
      setActivePage(availablePages[currentPageIndex + 1].id);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      // 1. Undo / Redo Shortcuts (up to 10 steps, active document-wide)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      if (e.key === 'Escape') {
        if (isSettingsOpen) setIsSettingsOpen(false);
        else if (isPageSelectorOpen) setIsPageSelectorOpen(false);
        else handleCloseModal();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleZoomFitWidth();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSettingsOpen, isPageSelectorOpen, activePage, availablePages, currentPageIndex, handleCloseModal, handleUndo, handleRedo]);

  // Touch Swipe Gesture on Mobile
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e) => {
    if (!touchStartX.current || !touchStartY.current || viewMode !== 'single') return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartX.current;
    const diffY = touchEndY - touchStartY.current;

    if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX < 0) {
        handleNextPage();
      } else {
        handlePrevPage();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Safe early return after all hooks
  if (!isOpen || !activeDocData) return null;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col document-preview-overlay ${typography === 'times' ? 'typography-times' : 'typography-calibri'}`}>
      
      {/* Top Floating Action & Navigation Bar (Streamlined 1-Row) */}
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 text-zinc-100 px-3 sm:px-6 py-2 sm:py-2.5 no-print shadow-xl">
        <div className="flex items-center justify-between gap-2 min-w-0">
          {/* Left: Branding & Status */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-sm shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm font-bold tracking-tight truncate text-white">
                  {isProposal ? 'Activity Proposal Preview' : '1:1 Official PDM LITE Preview'}
                </span>
                <Badge variant="emerald" size="xs" className="hidden xs:inline-flex">
                  Letter 8.5" × 11"
                </Badge>
                {!isProposal && (
                  <Badge
                    variant={routingStage === 4 ? 'emerald' : routingStatus === 'RETURNED_FOR_REVISION' ? 'rose' : 'amber'}
                    size="xs"
                    className="hidden md:inline-flex"
                  >
                    {ROUTING_STAGES.find((s) => s.stage === routingStage)?.label || `Stage ${routingStage}`}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-zinc-400 truncate">
                <span className="flex items-center gap-1 text-amber-400">
                  <Edit3 className="w-3 h-3 shrink-0" />
                  <span className="hidden sm:inline">In-place editing active</span>
                </span>
                <span className="hidden md:inline text-zinc-600">•</span>
                <span className="hidden md:inline text-zinc-400">
                  {viewMode === 'single'
                    ? (availablePages[currentPageIndex]?.label || `Page ${activePage}`)
                    : `Continuous View (${availablePages.length} Pages)`}
                </span>
                {draftSavedAt && (
                  <>
                    <span className="hidden lg:inline text-zinc-600">•</span>
                    <span className="hidden lg:inline text-emerald-400">
                      Draft saved {new Date(draftSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Undo / Redo Controls (Up to 10 steps) */}
            <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 shadow-xs">
              <button
                type="button"
                onClick={handleUndo}
                disabled={!canUndo}
                className="p-1 sm:p-1.5 rounded-md text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Undo (Ctrl+Z) — up to 10 steps"
                aria-label="Undo edit"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={!canRedo}
                className="p-1 sm:p-1.5 rounded-md text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Redo (Ctrl+Y or Ctrl+Shift+Z) — up to 10 steps"
                aria-label="Redo edit"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Save Draft Button (Patch 10) */}
            {!isProposal && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSaveDraft()}
                loading={isSavingDraft}
                className="hidden sm:flex bg-zinc-900 text-emerald-300 border-emerald-800/60 hover:bg-zinc-800 text-xs px-2.5 sm:px-3 h-8 shadow-sm"
                leftIcon={<Check className="w-3.5 h-3.5 text-emerald-400" />}
                title="Save Report Draft & Pre-Print Routing State"
              >
                <span>{isSavingDraft ? 'Saving...' : 'Save Draft'}</span>
              </Button>
            )}

            {/* View Mode Toggle (Continuous vs Single) on Desktop */}
            <button
              onClick={() => setViewMode(viewMode === 'single' ? 'continuous' : 'single')}
              className="hidden lg:flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-zinc-800 text-xs font-medium transition-colors"
              title={viewMode === 'single' ? 'Switch to Continuous Scroll' : 'Switch to Single Page View'}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>{viewMode === 'single' ? 'Single Page' : 'All Pages'}</span>
            </button>

            {/* Document Options Drawer Trigger */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              className="bg-zinc-900 text-zinc-200 border-zinc-800 hover:bg-zinc-800 text-xs px-2.5 sm:px-3 h-8 shadow-sm"
              leftIcon={<Sliders className="w-3.5 h-3.5 text-emerald-400" />}
              title="Open Document Settings & Metadata"
            >
              <span>Options</span>
              {activeSignatoryCount > 0 && (
                <span className="ml-1 bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full hidden sm:inline">
                  {activeSignatoryCount} sigs
                </span>
              )}
            </Button>

            {/* Print / Save as PDF */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="hidden sm:flex bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800 text-xs px-2.5 sm:px-3 h-8 shadow-sm"
              leftIcon={<Printer className="w-3.5 h-3.5" />}
              title="Print or Save as PDF"
            >
              <span>Print / PDF</span>
            </Button>

            {/* Export DOCX */}
            <Button
              variant="primary"
              size="sm"
              disabled={!canExportReport}
              onClick={canExportReport ? handleExportDocx : undefined}
              loading={isExporting}
              leftIcon={!canExportReport ? <Lock className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              className={`active:scale-95 whitespace-nowrap text-xs px-2.5 sm:px-3.5 h-8 font-semibold shadow-md ${
                !canExportReport ? 'opacity-50 cursor-not-allowed select-none bg-zinc-700 text-zinc-400 hover:bg-zinc-700' : ''
              }`}
              title={!canExportReport ? 'Export restricted by Administrator' : 'Download editable 1:1 Microsoft Word (.docx) document'}
            >
              {isExporting ? 'Exporting...' : !canExportReport ? (
                <>
                  <span className="hidden xs:inline">Export Locked</span>
                  <span className="xs:hidden">Locked</span>
                </>
              ) : (
                <>
                  <span className="hidden xs:inline">Export .docx</span>
                  <span className="xs:hidden">Export</span>
                </>
              )}
            </Button>

            {/* Close Modal */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCloseModal}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800 w-8 h-8 ml-0.5"
              title="Close Preview (Esc)"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Multi-Sheet Viewport with Smooth Scaling and Touch Handling */}
      <main
        ref={viewportRef}
        className="document-preview-viewport"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >

        {/* ========================================================================= */}
        {/* PROPOSAL VIEW                                                             */}
        {/* ========================================================================= */}
        {isProposal ? (
          <ScaledSheet scale={zoomScale}>
            <article className="document-sheet">
            <OfficialHeaderBanner />
            <div className="text-center my-6">
              <h1 className="text-base font-black tracking-wider uppercase underline underline-offset-4 text-gray-900">
                ACTIVITY &amp; BUSINESS PROPOSAL
              </h1>
              <p className="text-xs font-bold text-gray-800 uppercase mt-1">
                {activeDocData.activityTitle || periodDesc} &bull; {activeDocData.targetDate || academicYear}
              </p>
            </div>

            {/* METADATA BLOCK */}
            <div className="grid grid-cols-2 gap-y-2 text-xs mb-6 border-b border-gray-200 pb-4">
              <div>
                <span className="font-bold text-gray-800">Date Prepared: </span>
                <span>{activeDocData.datePrepared || transmittalDate}</span>
              </div>
              <div>
                <span className="font-bold text-gray-800">Proponent Committee: </span>
                <span>{activeDocData.proponentCommittee || 'League of Information Technology Enthusiasts (LITE)'}</span>
              </div>
              <div>
                <span className="font-bold text-gray-800">Target Schedule: </span>
                <span>{activeDocData.targetDate || 'October 14–16, 2026'}</span>
              </div>
              <div>
                <span className="font-bold text-gray-800">Target Venue: </span>
                <span>{activeDocData.venue || 'PDM Quadrangle'}</span>
              </div>
            </div>

            {/* SECTION I: OBJECTIVES */}
            <div className="font-bold text-xs uppercase text-emerald-900 border-b border-emerald-900 pb-0.5 mb-2 mt-4">
              I. ACTIVITY OBJECTIVES &amp; RATIONALE
            </div>
            <p className="text-xs text-gray-800 whitespace-pre-line mb-6">
              {activeDocData.objectives || '1. Promote student engagement.\n2. Generate operating funds for upcoming academic workshops.'}
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
                {(activeDocData.items || []).map((item, idx) => {
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
                  <td className="text-right py-2">₱{Number(activeDocData.totalCapital || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td className="text-right py-2 text-gray-400">—</td>
                  <td className="text-center py-2 text-gray-400">—</td>
                  <td className="text-right py-2">₱{Number(activeDocData.totalRevenue || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td className="text-right py-2 font-bold text-emerald-800">₱{Number(activeDocData.netProfit || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>

            <p className="text-[11px] italic text-gray-600 mb-6">
              * Projected Return on Investment (ROI): <strong>{activeDocData.marginPercent || 0}%</strong> assuming 100% concession sell-through.
            </p>

            {/* SECTION III: INSTITUTIONAL APPROVAL ROUTING */}
            <div className="font-bold text-xs uppercase text-emerald-900 border-b border-emerald-900 pb-0.5 mb-4 mt-6">
              III. INSTITUTIONAL APPROVAL ROUTING
            </div>

            {/* Table 1: Prepared & Endorsed by (Student Officers - Dynamic Columns) */}
            <table className="sig-table mb-4">
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
                          <input
                            type="text"
                            value={signatories[off.nameKey]}
                            onChange={(e) => handleUpdateSignatory(off.nameKey, e.target.value)}
                            className="pdm-input sig-name"
                          />
                          <input
                            type="text"
                            value={signatories[off.roleKey]}
                            onChange={(e) => handleUpdateSignatory(off.roleKey, e.target.value)}
                            className="pdm-input sig-role"
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>

            {/* Table 2: Noted by (Advisers & Administrators - 2 Columns) */}
            <table className="sig-table mb-4">
              <thead>
                <tr>
                  <th colSpan="2" className="sig-section-header">Noted by:</th>
                </tr>
              </thead>
              <tbody>
                {activeAdvisers.length === 0 && activeAdmins.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="text-gray-400 italic text-[11px] py-2">
                      (No advisers or administrators selected in signature block)
                    </td>
                  </tr>
                ) : (
                  <>
                    {activeAdvisers.length > 0 && (
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
                              <input
                                type="text"
                                value={signatories[adv.nameKey]}
                                onChange={(e) => handleUpdateSignatory(adv.nameKey, e.target.value)}
                                className="pdm-input sig-name w-72"
                              />
                              <input
                                type="text"
                                value={signatories[adv.roleKey]}
                                onChange={(e) => handleUpdateSignatory(adv.roleKey, e.target.value)}
                                className="pdm-input sig-role w-72"
                              />
                            </div>
                          </td>
                        ))}
                        {activeAdvisers.length < 2 && (
                          <td style={{ width: `${(2 - activeAdvisers.length) * 50}%` }} />
                        )}
                      </tr>
                    )}
                    {activeAdmins.length > 0 && (
                      <tr>
                        {activeAdmins.map((adm) => (
                          <td key={adm.key} style={{ width: '50%', maxWidth: '3.25in', paddingTop: activeAdvisers.length > 0 ? '16pt' : '0' }}>
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
                              <input
                                type="text"
                                value={signatories[adm.nameKey]}
                                onChange={(e) => handleUpdateSignatory(adm.nameKey, e.target.value)}
                                className="pdm-input sig-name"
                              />
                              <input
                                type="text"
                                value={signatories[adm.roleKey]}
                                onChange={(e) => handleUpdateSignatory(adm.roleKey, e.target.value)}
                                className="pdm-input sig-role"
                              />
                            </div>
                          </td>
                        ))}
                        {activeAdmins.length < 2 && (
                          <td style={{ width: `${(2 - activeAdmins.length) * 50}%` }} />
                        )}
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
            {getPageFooterText(1, 1) && (
              <div className="sheet-page-footer">{getPageFooterText(1, 1)}</div>
            )}
          </article>
        </ScaledSheet>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* PAGE 1: TRANSMITTAL LETTER (Screenshot 1)                                 */}
          {/* ========================================================================= */}
          {(viewMode === 'continuous' || activePage === 1) && receiptsMode !== 'STANDALONE' && (
            <ScaledSheet scale={zoomScale}>
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
              {/* Table 1: Prepared by (Student Officers - Dynamic Columns) */}
              <table className="sig-table mb-4">
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
                            <input
                              type="text"
                              value={signatories[off.nameKey]}
                              onChange={(e) => handleUpdateSignatory(off.nameKey, e.target.value)}
                              className="pdm-input sig-name"
                            />
                            <input
                              type="text"
                              value={signatories[off.roleKey]}
                              onChange={(e) => handleUpdateSignatory(off.roleKey, e.target.value)}
                              className="pdm-input sig-role"
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Table 2: Noted by (Club Advisers down to Program Director & Dean - 2 Columns) */}
              <table className="sig-table">
                <thead>
                  <tr>
                    <th colSpan="2" className="sig-section-header">Noted by:</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAdvisers.length === 0 && activeAdmins.length === 0 ? (
                    <tr>
                      <td colSpan="2" className="text-gray-400 italic text-[11px] py-2">
                        (No advisers or administrators selected in signature block)
                      </td>
                    </tr>
                  ) : (
                    <>
                      {activeAdvisers.length > 0 && (
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
                                <input
                                  type="text"
                                  value={signatories[adv.nameKey]}
                                  onChange={(e) => handleUpdateSignatory(adv.nameKey, e.target.value)}
                                  className="pdm-input sig-name w-72"
                                />
                                <input
                                  type="text"
                                  value={signatories[adv.roleKey]}
                                  onChange={(e) => handleUpdateSignatory(adv.roleKey, e.target.value)}
                                  className="pdm-input sig-role w-72"
                                />
                              </div>
                            </td>
                          ))}
                          {activeAdvisers.length < 2 && (
                            <td style={{ width: `${(2 - activeAdvisers.length) * 50}%` }} />
                          )}
                        </tr>
                      )}
                      {activeAdmins.length > 0 && (
                        <tr>
                          {activeAdmins.map((adm) => (
                            <td key={adm.key} style={{ width: '50%', maxWidth: '3.25in', paddingTop: activeAdvisers.length > 0 ? '16pt' : '0' }}>
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
                                <input
                                  type="text"
                                  value={signatories[adm.nameKey]}
                                  onChange={(e) => handleUpdateSignatory(adm.nameKey, e.target.value)}
                                  className="pdm-input sig-name"
                                />
                                <input
                                  type="text"
                                  value={signatories[adm.roleKey]}
                                  onChange={(e) => handleUpdateSignatory(adm.roleKey, e.target.value)}
                                  className="pdm-input sig-role"
                                />
                              </div>
                            </td>
                          ))}
                          {activeAdmins.length < 2 && (
                            <td style={{ width: `${(2 - activeAdmins.length) * 50}%` }} />
                          )}
                        </tr>
                      )}
                    </>
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
                        className="pdm-input w-64"
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
        </ScaledSheet>
      )}

      {/* ========================================================================= */}
      {/* PAGE 2: INCOME SCHEDULE (Screenshot 2)                                   */}
      {/* ========================================================================= */}
      {(viewMode === 'continuous' || activePage === 2) && receiptsMode !== 'STANDALONE' && (
        <ScaledSheet scale={zoomScale}>
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
                  className="pdm-input text-center font-bold"
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
                      onChange={(e) => handleUpdateInitialBudget(parseFloat(e.target.value) || 0)}
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
        </ScaledSheet>
      )}

      {/* ========================================================================= */}
      {/* PAGE 3: MISCELLANEOUS EXPENSES                                           */}
      {/* ========================================================================= */}
      {(viewMode === 'continuous' || activePage === 3) && receiptsMode !== 'STANDALONE' && (
        <ScaledSheet scale={zoomScale}>
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
        </ScaledSheet>
      )}

      {/* ========================================================================= */}
      {/* PAGE 4: SUMMARY RECONCILIATION & SIGNATORIES (Screenshot 3 Right)        */}
      {/* ========================================================================= */}
      {(viewMode === 'continuous' || activePage === 4) && receiptsMode !== 'STANDALONE' && (
        <ScaledSheet scale={zoomScale}>
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
              <table className="sig-table mb-4">
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
                            <input
                              type="text"
                              value={signatories[off.nameKey]}
                              onChange={(e) => handleUpdateSignatory(off.nameKey, e.target.value)}
                              className="pdm-input sig-name"
                            />
                            <input
                              type="text"
                              value={signatories[off.roleKey]}
                              onChange={(e) => handleUpdateSignatory(off.roleKey, e.target.value)}
                              className="pdm-input sig-role"
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Table 2: Noted by (Club Advisers down to Program Director & Dean - 2 Columns) */}
              <table className="sig-table">
                <thead>
                  <tr>
                    <th colSpan="2" className="sig-section-header">Noted by:</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAdvisers.length === 0 && activeAdmins.length === 0 ? (
                    <tr>
                      <td colSpan="2" className="text-gray-400 italic text-[11px] py-2">
                        (No advisers or administrators selected in signature block)
                      </td>
                    </tr>
                  ) : (
                    <>
                      {activeAdvisers.length > 0 && (
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
                                <input
                                  type="text"
                                  value={signatories[adv.nameKey]}
                                  onChange={(e) => handleUpdateSignatory(adv.nameKey, e.target.value)}
                                  className="pdm-input sig-name w-72"
                                />
                                <input
                                  type="text"
                                  value={signatories[adv.roleKey]}
                                  onChange={(e) => handleUpdateSignatory(adv.roleKey, e.target.value)}
                                  className="pdm-input sig-role w-72"
                                />
                              </div>
                            </td>
                          ))}
                          {activeAdvisers.length < 2 && (
                            <td style={{ width: `${(2 - activeAdvisers.length) * 50}%` }} />
                          )}
                        </tr>
                      )}
                      {activeAdmins.length > 0 && (
                        <tr>
                          {activeAdmins.map((adm) => (
                            <td key={adm.key} style={{ width: '50%', maxWidth: '3.25in', paddingTop: activeAdvisers.length > 0 ? '16pt' : '0' }}>
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
                                <input
                                  type="text"
                                  value={signatories[adm.nameKey]}
                                  onChange={(e) => handleUpdateSignatory(adm.nameKey, e.target.value)}
                                  className="pdm-input sig-name"
                                />
                                <input
                                  type="text"
                                  value={signatories[adm.roleKey]}
                                  onChange={(e) => handleUpdateSignatory(adm.roleKey, e.target.value)}
                                  className="pdm-input sig-role"
                                />
                              </div>
                            </td>
                          ))}
                          {activeAdmins.length < 2 && (
                            <td style={{ width: `${(2 - activeAdmins.length) * 50}%` }} />
                          )}
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
            {getPageFooterText(4) && (
              <div className="sheet-page-footer">{getPageFooterText(4)}</div>
            )}
          </article>
        </ScaledSheet>
      )}

      {/* ========================================================================= */}
      {/* RECEIPTS & PROOFS OF DISBURSEMENT (PAGES 5+)                              */}
      {/* ========================================================================= */}
      {!isProposal && receiptsMode !== 'NONE' && (
        receiptPages.length > 0 ? (
          receiptPages.map((pageReceipts, pageIdx) => {
            const receiptPageId = receiptsMode === 'STANDALONE' ? pageIdx + 1 : 5 + pageIdx;
            if (viewMode !== 'continuous' && activePage !== receiptPageId) {
              return null;
            }

            const currentSheetNum = pageIdx + 1;
            const totalReceiptSheets = receiptPages.length;
            const currentDocPage = receiptsMode === 'STANDALONE' ? currentSheetNum : 4 + currentSheetNum;
            const displayTotalPages = totalReportPages;

            return (
              <ScaledSheet key={`receipt-sheet-${pageIdx}`} scale={zoomScale}>
                <article key={`receipt-sheet-${pageIdx}`} className="document-sheet">
                  <OfficialHeaderBanner />

                  {/* Sheet Header: Show "Receipts" only on the first receipt sheet (Patch 15) */}
                  {pageIdx === 0 && (
                    <div className="text-center mb-6">
                      <div className="font-black tracking-wide text-sm uppercase text-gray-900">
                        Receipts
                      </div>
                    </div>
                  )}

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
              </ScaledSheet>
            );
          })
        ) : (
          (viewMode === 'continuous' || (receiptsMode === 'STANDALONE' && activePage === 1) || (receiptsMode === 'APPEND' && activePage === 5)) ? (
            <ScaledSheet scale={zoomScale}>
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
            </ScaledSheet>
          ) : null
        )
      )}
        </>
      )}

      </main>

      {/* Floating Docked Navigation & Zoom Bar */}
      <div className="preview-docked-toolbar no-print flex items-center gap-1.5 sm:gap-2.5 bg-zinc-950/90 backdrop-blur-md border border-zinc-800 text-zinc-100 rounded-full px-3 py-1.5 sm:py-2 text-xs shadow-2xl">
        {/* Page Navigation */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          <button
            onClick={handlePrevPage}
            disabled={viewMode === 'continuous' || currentPageIndex <= 0}
            className="p-1 rounded-full hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none text-zinc-300 hover:text-white transition-colors"
            title="Previous Page (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              onClick={() => setIsPageSelectorOpen(!isPageSelectorOpen)}
              className="px-2 py-0.5 rounded-md hover:bg-zinc-800 font-medium text-xs text-zinc-200 flex items-center gap-1 transition-colors"
              title="Jump to Page"
            >
              <span>
                {viewMode === 'continuous'
                  ? `All (${availablePages.length})`
                  : `${currentPageIndex + 1} / ${availablePages.length}`}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {/* Page Selector Popover */}
            {isPageSelectorOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsPageSelectorOpen(false)} />
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-1.5 space-y-1">
                  <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Jump to Page
                  </div>
                  {availablePages.map((page, idx) => (
                    <button
                      key={page.id}
                      onClick={() => {
                        setActivePage(page.id);
                        setViewMode('single');
                        setIsPageSelectorOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        activePage === page.id && viewMode === 'single'
                          ? 'bg-emerald-600/20 text-emerald-300 font-semibold border border-emerald-500/30'
                          : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{page.label}</span>
                      {activePage === page.id && viewMode === 'single' && (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                    </button>
                  ))}
                  <div className="border-t border-zinc-800 pt-1 mt-1">
                    <button
                      onClick={() => {
                        setViewMode('continuous');
                        setIsPageSelectorOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        viewMode === 'continuous'
                          ? 'bg-emerald-600/20 text-emerald-300 font-semibold border border-emerald-500/30'
                          : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      <span>View All Pages (Continuous)</span>
                      {viewMode === 'continuous' && (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleNextPage}
            disabled={viewMode === 'continuous' || currentPageIndex >= availablePages.length - 1}
            className="p-1 rounded-full hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none text-zinc-300 hover:text-white transition-colors"
            title="Next Page (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-4 bg-zinc-800" />

        {/* Mode Toggle Button */}
        <button
          onClick={() => setViewMode(viewMode === 'single' ? 'continuous' : 'single')}
          className="px-2 py-1 rounded-full hover:bg-zinc-800 text-zinc-300 hover:text-white font-medium text-[11px] flex items-center gap-1 transition-colors"
          title={viewMode === 'single' ? 'Switch to Continuous Scroll' : 'Switch to Single Page View'}
        >
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden xs:inline">{viewMode === 'single' ? 'Single' : 'All'}</span>
        </button>

        <div className="w-px h-4 bg-zinc-800" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          <button
            onClick={handleZoomOut}
            className="p-1 rounded-full hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              if (zoomMode === 'fit-width') {
                handleZoom100();
              } else {
                handleZoomFitWidth();
              }
            }}
            className="px-1.5 sm:px-2 py-0.5 rounded hover:bg-zinc-800 text-[11px] font-mono font-semibold text-zinc-200 transition-colors"
            title="Click to toggle between Fit Width and 100%"
          >
            {Math.round(zoomScale * 100)}%
            {zoomMode === 'fit-width' && <span className="text-[9px] text-emerald-400 ml-1 hidden xs:inline">Fit</span>}
          </button>

          <button
            onClick={handleZoomIn}
            className="p-1 rounded-full hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleZoomFitWidth}
            className={`p-1 rounded-full hover:bg-zinc-800 transition-colors hidden sm:flex ${
              zoomMode === 'fit-width' ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'
            }`}
            title="Fit to Width"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Settings Drawer (Right slide-over on Desktop, Bottom sheet on Mobile) */}
      {isSettingsOpen && (
        <>
          <div
            className="preview-drawer-backdrop no-print"
            onClick={() => setIsSettingsOpen(false)}
          />
          <aside className="preview-drawer-panel no-print fixed right-0 top-0 bottom-0 w-full sm:w-[420px] lg:w-[460px] bg-zinc-950 text-zinc-100 border-l border-zinc-800 shadow-2xl flex flex-col z-50 overflow-hidden">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/50">
              <div>
                <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 text-white">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  Report Settings &amp; Metadata
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Institutional template adjustments and scope
                </p>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                title="Close Settings (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
              {/* Section 1: Quick Metadata Editor (Mobile friendly) */}
              <div className="space-y-3 pb-5 border-b border-zinc-800/80">
                <div className="font-semibold text-zinc-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  Document Metadata
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                      Transmittal Date
                    </label>
                    <input
                      type="text"
                      value={transmittalDate}
                      onChange={(e) => {
                        setTransmittalDate(e.target.value);
                        setFinalAsOf(`As of ${e.target.value}`);
                      }}
                      className="w-full bg-zinc-900 ring-1 ring-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                        Semester
                      </label>
                      <Select
                        value={semester}
                        onChange={setSemester}
                        options={[
                          { value: '1st SEMESTER', label: '1st SEMESTER' },
                          { value: '2nd SEMESTER', label: '2nd SEMESTER' },
                          { value: 'SUMMER SEMESTER', label: 'SUMMER SEMESTER' },
                        ]}
                        size="sm"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                        Academic Year
                      </label>
                      <input
                        type="text"
                        value={academicYear}
                        onChange={(e) => setAcademicYear(e.target.value)}
                        className="w-full bg-zinc-900 ring-1 ring-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="e.g. 2026–2027"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                      Event / Operation Title
                    </label>
                    <input
                      type="text"
                      value={periodDesc}
                      onChange={(e) => setPeriodDesc(e.target.value)}
                      className="w-full bg-zinc-900 ring-1 ring-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                        Coordinator Name
                      </label>
                      <input
                        type="text"
                        value={coordinatorName}
                        onChange={(e) => setCoordinatorName(e.target.value)}
                        className="w-full bg-zinc-900 ring-1 ring-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                        Salutation
                      </label>
                      <input
                        type="text"
                        value={salutation}
                        onChange={(e) => setSalutation(e.target.value)}
                        className="w-full bg-zinc-900 ring-1 ring-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                      Beginning Balance / Rollover Fund (₱)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={initialBudget}
                      onChange={(e) => handleUpdateInitialBudget(parseFloat(e.target.value) || 0)}
                      className="w-full bg-zinc-900 ring-1 ring-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Export Scope */}
              {!isProposal && (
                <div className="space-y-2.5 pb-5 border-b border-zinc-800/80">
                  <div className="font-semibold text-zinc-200 text-xs uppercase tracking-wider">
                    Document Export Scope
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 ring-1 ring-zinc-800/60 transition-colors cursor-pointer">
                      <input
                        type="radio"
                        name="receiptsModeDrawer"
                        value="NONE"
                        checked={receiptsMode === 'NONE'}
                        onChange={() => setReceiptsMode('NONE')}
                        className="text-emerald-500 focus:ring-emerald-500"
                      />
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-zinc-200">Financial Report Only</div>
                        <div className="text-[10px] text-zinc-400">Pages 1–4 (Transmittal, Income, Expenses, Reconciliation)</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 ring-1 ring-zinc-800/60 transition-colors cursor-pointer">
                      <input
                        type="radio"
                        name="receiptsModeDrawer"
                        value="APPEND"
                        checked={receiptsMode === 'APPEND'}
                        onChange={() => setReceiptsMode('APPEND')}
                        className="text-emerald-500 focus:ring-emerald-500"
                      />
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-zinc-200">Financial Report + Attached Receipts</div>
                        <div className="text-[10px] text-zinc-400">Full complete packet with attached 4-up receipt sheets</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 ring-1 ring-zinc-800/60 transition-colors cursor-pointer">
                      <input
                        type="radio"
                        name="receiptsModeDrawer"
                        value="STANDALONE"
                        checked={receiptsMode === 'STANDALONE'}
                        onChange={() => setReceiptsMode('STANDALONE')}
                        className="text-emerald-500 focus:ring-emerald-500"
                      />
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-zinc-200">Receipts Attachment Only</div>
                        <div className="text-[10px] text-zinc-400">Export standalone receipt voucher pages without financial sheets</div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Section 2.5: 4-Stage Pre-Print Routing & Draft Persistence (Patch 10) */}
              {!isProposal && (
                <div className="space-y-3 pb-5 border-b border-zinc-800/80">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200 text-xs uppercase tracking-wider">
                      Pre-Print Routing &amp; Draft
                    </span>
                    <Badge
                      variant={routingStage === 4 ? 'emerald' : routingStatus === 'RETURNED_FOR_REVISION' ? 'rose' : 'amber'}
                      size="xs"
                    >
                      Stage {routingStage} of 4
                    </Badge>
                  </div>

                  {/* 4-Stage Stepper */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {ROUTING_STAGES.map((st) => {
                      const isActive = routingStage === st.stage;
                      const isCompleted = routingStage > st.stage;
                      return (
                        <button
                          key={st.stage}
                          type="button"
                          onClick={() => setRoutingStage(st.stage)}
                          className={`p-2 rounded-lg text-left border transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 font-bold'
                              : isCompleted
                                ? 'bg-zinc-900/90 border-emerald-800/40 text-emerald-400/80'
                                : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:bg-zinc-900'
                          }`}
                        >
                          <div className="text-[11px] truncate">{st.short}</div>
                          <div className="text-[9px] opacity-75">
                            {isCompleted ? 'Certified ✓' : isActive ? 'Current Stage' : 'Pending'}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {routingComment && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px]">
                      <span className="font-bold">Revision Note:</span> {routingComment}
                    </div>
                  )}

                  {/* Routing Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveDraft()}
                      loading={isSavingDraft}
                      className="bg-zinc-900 text-zinc-200 border-zinc-700 hover:bg-zinc-800 text-[11px] h-7 px-2.5"
                    >
                      {isSavingDraft ? 'Saving...' : 'Save Draft'}
                    </Button>
                    {routingStage < 4 && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleAdvanceRoutingStage}
                        className="text-[11px] h-7 px-2.5"
                      >
                        Advance to Stage {routingStage + 1}
                      </Button>
                    )}
                    {routingStage > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowReturnPrompt(!showReturnPrompt)}
                        className="bg-rose-950/40 text-rose-300 border-rose-800/60 hover:bg-rose-900/50 text-[11px] h-7 px-2.5"
                      >
                        Return to Draft
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={handleResetToLiveLedger}
                      className="text-[10px] text-zinc-400 hover:text-zinc-200 underline ml-auto cursor-pointer"
                    >
                      Reset to Live Ledger
                    </button>
                  </div>

                  {showReturnPrompt && (
                    <div className="p-2.5 rounded-xl bg-zinc-900 border border-rose-500/30 space-y-2">
                      <label className="block text-[11px] font-semibold text-rose-300">
                        Reason for Returning to Stage 1 (Treasurer Draft):
                      </label>
                      <input
                        type="text"
                        value={returnReasonInput}
                        onChange={(e) => setReturnReasonInput(e.target.value)}
                        placeholder="e.g. Adjust food expense description on Page 3"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowReturnPrompt(false)}
                          className="text-[11px] h-7 px-2"
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleReturnToDraft}
                          className="bg-rose-600 hover:bg-rose-500 text-white text-[11px] h-7 px-2.5"
                        >
                          Confirm Return to Draft
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Section 3: CC Routing, Typography & Page Numbering */}
              {!isProposal && (
                <div className="space-y-3 pb-5 border-b border-zinc-800/80">
                  <div className="font-semibold text-zinc-200 text-xs uppercase tracking-wider">
                    Routing, Typography &amp; Formatting
                  </div>

                  {/* Report Typography Selector (Patch 14) */}
                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                      Document Typography Standard
                    </label>
                    <Select
                      value={typography}
                      onChange={setTypography}
                      options={[
                        { value: 'calibri', label: 'Calibri 11pt (PDM Institutional Template)' },
                        { value: 'times', label: 'Times New Roman 12pt (Manuscript Standard)' },
                      ]}
                      size="sm"
                    />
                  </div>

                  {/* CC Routing */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-zinc-300">
                        Include CC Routing Block
                      </label>
                      <input
                        type="checkbox"
                        checked={includeCc}
                        onChange={(e) => setIncludeCc(e.target.checked)}
                        className="rounded text-emerald-500 focus:ring-emerald-500 w-4 h-4 cursor-pointer bg-zinc-800 border-zinc-700"
                      />
                    </div>

                    {includeCc && (
                      <div className="space-y-1.5 pl-2 border-l-2 border-emerald-500/40">
                        {ccRecipients.map((rec, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={rec}
                              onChange={(e) => handleUpdateCcRecipient(idx, e.target.value)}
                              className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-white"
                            />
                            <button
                              onClick={() => handleRemoveCcRecipient(idx)}
                              className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-zinc-800"
                              title="Remove Recipient"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={handleAddCcRecipient}
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold pt-1"
                        >
                          <Plus className="w-3 h-3" /> Add CC Recipient
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Footer Style */}
                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                      Footer Page Number Style
                    </label>
                    <Select
                      value={pageNumberStyle}
                      onChange={setPageNumberStyle}
                      options={[
                        { value: 'page_x_of_y', label: 'Page X of Y (Default)' },
                        { value: 'page_x_of_y_no_cover', label: 'Page X of Y (Start on Page 2)' },
                        { value: 'simple', label: 'Simple (1, 2, 3...)' },
                        { value: 'none', label: 'No Page Numbers' },
                      ]}
                      size="sm"
                    />
                  </div>
                </div>
              )}

              {/* Section 4: Signatories Matrix */}
              {!isProposal && (
                <div className="space-y-3 pb-5 border-b border-zinc-800/80">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200 text-xs uppercase tracking-wider">
                      Signatories Matrix
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {activeSignatoryCount} of {allSignatoryDefs.length} included
                    </span>
                  </div>

                  <div className="space-y-2">
                    {allSignatoryDefs.map((sig) => (
                      <div
                        key={sig.key}
                        className={`p-2.5 rounded-xl transition-colors ${
                          includedSignatories[sig.key]
                            ? 'bg-zinc-900/80 ring-1 ring-emerald-500/30'
                            : 'bg-zinc-900/30 ring-1 ring-zinc-800/40 opacity-70'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={includedSignatories[sig.key]}
                              onChange={() => toggleSignatory(sig.key)}
                              className="rounded text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer bg-zinc-800 border-zinc-700"
                            />
                            <span className={`text-xs font-semibold ${includedSignatories[sig.key] ? 'text-emerald-300' : 'text-zinc-400'}`}>
                              {sig.label}
                            </span>
                          </label>
                          <span className="text-[10px] text-zinc-500 uppercase">{sig.heading}</span>
                        </div>

                        {includedSignatories[sig.key] && (
                          <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-zinc-800/80">
                            <input
                              type="text"
                              value={signatories[sig.nameKey] || ''}
                              onChange={(e) => handleUpdateSignatory(sig.nameKey, e.target.value)}
                              placeholder="Name"
                              className="bg-zinc-900 ring-1 ring-zinc-800 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <input
                              type="text"
                              value={signatories[sig.roleKey] || ''}
                              onChange={(e) => handleUpdateSignatory(sig.roleKey, e.target.value)}
                              placeholder="Role / Title"
                              className="bg-zinc-900 ring-1 ring-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 5: Mobile Quick Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-zinc-800 sm:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="w-full bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800 justify-center"
                  leftIcon={<Printer className="w-4 h-4" />}
                >
                  Print or Save as PDF
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!canExportReport}
                  onClick={canExportReport ? handleExportDocx : undefined}
                  loading={isExporting}
                  leftIcon={!canExportReport ? <Lock className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                  className={`w-full justify-center ${
                    !canExportReport ? 'opacity-50 cursor-not-allowed select-none bg-zinc-700 text-zinc-400 hover:bg-zinc-700' : ''
                  }`}
                  title={!canExportReport ? 'Export restricted by Administrator' : undefined}
                >
                  {!canExportReport ? 'Export Restricted by Administrator' : 'Export .docx Report'}
                </Button>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400">
                Changes take effect instantly
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsSettingsOpen(false)}
              >
                Done
              </Button>
            </div>
          </aside>
        </>
      )}

    </div>
  );
}
