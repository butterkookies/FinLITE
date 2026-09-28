'use client';
import { useState, useEffect } from 'react';
import { Download, Printer, X, Check, Edit3, AlertCircle, FileCheck } from 'lucide-react';
import './DocumentPreview.css';

export default function DocumentPreviewModal({ isOpen, onClose, documentData }) {
  const isProposal = documentData?.type === 'PROPOSAL';

  // State for live in-place editable fields (initialized with safe optional chaining)
  const [docDate, setDocDate] = useState(
    documentData?.datePrepared || documentData?.transmittalDate || 'October 14, 2026'
  );
  const [activityTitle, setActivityTitle] = useState(
    documentData?.activityTitle || documentData?.eventName || 'Club Week 2026 Concession Booth'
  );
  const [proponentCommittee, setProponentCommittee] = useState(
    documentData?.proponentCommittee || 'League of Information Technology Enthusiasts (LITE)'
  );
  const [venue, setVenue] = useState(documentData?.venue || 'PDM Quadrangle');
  const [targetDate, setTargetDate] = useState(documentData?.targetDate || 'Academic Year 2025–2026');
  const [objectives, setObjectives] = useState(
    documentData?.objectives ||
      '1. Provide high quality snacks and merchandise for BSIT students.\n2. Raise organizational operating funds for upcoming academic workshops.'
  );
  const [remarks, setRemarks] = useState(
    documentData?.remarks ||
      'All transactions recorded conform with the 7-day receipt submission policy and dual club adviser audit verification.'
  );

  // Signatories state
  const [signatories, setSignatories] = useState({
    preparedBy: documentData?.signatories?.preparedBy || 'ANDREI JOHN P. GERONIMO',
    preparedRole: documentData?.signatories?.preparedRole || 'LITE Treasurer',
    reviewedBy: documentData?.signatories?.reviewedBy || 'CHRISTIAN REY C. KASILAG',
    reviewedRole: documentData?.signatories?.reviewedRole || 'LITE Auditor',
    notedBy: documentData?.signatories?.notedBy || 'EMANUEL MALBAROSA',
    notedRole: documentData?.signatories?.notedRole || 'LITE President',
    adviser1: documentData?.signatories?.adviser1 || 'MS. KIMBERLY DAWN JATULAN',
    adviser2: documentData?.signatories?.adviser2 || 'MS. KRIZIA MAE GENOVIA',
    adviserRole: documentData?.signatories?.adviserRole || 'LITE Club Advisers',
    directorName: documentData?.signatories?.directorName || 'JOVYLYN ORTIZ-CESAR, MBA, MSIT',
    directorRole: documentData?.signatories?.directorRole || 'Program Director, BSIT',
    deanName: documentData?.signatories?.deanName || 'DR. EMRAIDA MARIE M. MANUCOM',
    deanRole: documentData?.signatories?.deanRole || 'Dean, College of Computer Studies',
  });

  const [isExporting, setIsExporting] = useState(false);

  // Sync state whenever documentData changes
  useEffect(() => {
    if (documentData) {
      setDocDate(documentData.datePrepared || documentData.transmittalDate || 'October 14, 2026');
      setActivityTitle(documentData.activityTitle || documentData.eventName || 'Club Week 2026');
      if (documentData.proponentCommittee) setProponentCommittee(documentData.proponentCommittee);
      if (documentData.venue) setVenue(documentData.venue);
      if (documentData.targetDate) setTargetDate(documentData.targetDate);
      if (documentData.objectives) setObjectives(documentData.objectives);
      if (documentData.remarks) setRemarks(documentData.remarks);
      if (documentData.signatories) setSignatories(prev => ({ ...prev, ...documentData.signatories }));
    }
  }, [documentData]);

  // Safe early return only after all hooks are evaluated
  if (!isOpen || !documentData) return null;

  const handleUpdateSig = (key, value) => {
    setSignatories(prev => ({ ...prev, [key]: value }));
  };

  const handleExportDocx = async () => {
    try {
      setIsExporting(true);
      const payload = {
        type: documentData.type || 'LIQUIDATION',
        activityTitle,
        eventName: activityTitle,
        transmittalDate: docDate,
        datePrepared: docDate,
        proponentCommittee,
        venue,
        targetDate,
        objectives,
        remarks,
        signatories,
        summary: documentData.summary || {},
        transactions: documentData.transactions || [],
        items: documentData.items || [],
        totalCapital: documentData.totalCapital || 0,
        totalRevenue: documentData.totalRevenue || 0,
        netProfit: documentData.netProfit || 0,
        marginPercent: documentData.marginPercent || 0,
      };

      const res = await fetch('/api/reports/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to generate DOCX file');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanName = activityTitle.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 30);
      a.download = isProposal
        ? `FinLITE-Proposal-${cleanName}.docx`
        : `FinLITE-Liquidation-${cleanName}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('Error exporting official .docx file. Please check server logs.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col document-preview-overlay overflow-y-auto">
      
      {/* Top Floating Control Bar (No Print) */}
      <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-700 text-white px-4 sm:px-8 py-3 flex items-center justify-between no-print shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-sm">
            <FileCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight">1:1 Institutional Document Preview</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {isProposal ? 'Business Proposal' : 'Liquidation Statement'}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 flex items-center gap-1">
              <Edit3 className="w-3 h-3 text-amber-400" />
              <span>In-place editing active: Click any field on the paper below to edit text before downloading.</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 hover:text-white rounded-lg transition-colors border border-gray-700"
            title="Print or Save as PDF"
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
            <span>{isExporting ? 'Generating...' : 'Export Official .docx'}</span>
          </button>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Canvas Container */}
      <main className="flex-1 p-4 sm:p-8 flex justify-center">
        <article className="document-sheet">
          
          {/* Official PDM Letterhead */}
          <header className="mb-4">
            <div className="pdm-heading-1">PAMBAYANG DALUBHASAAN NG MARILAO</div>
            <div className="pdm-heading-2">COLLEGE OF COMPUTER STUDIES</div>
            <div className="pdm-heading-3">LEAGUE OF INFORMATION TECHNOLOGY ENTHUSIASTS</div>
            <div className="pdm-heading-sub">Abangan Norte, Marilao, Bulacan</div>
          </header>

          <hr className="border-t border-gray-400 mb-4" />

          {/* Document Title & Subtitle */}
          <div className="pdm-doc-title">
            {isProposal ? 'ACTIVITY & BUSINESS PROPOSAL' : 'FORMAL FINANCIAL LIQUIDATION REPORT'}
          </div>
          
          <div className="pdm-doc-subtitle">
            <input
              type="text"
              value={activityTitle}
              onChange={(e) => setActivityTitle(e.target.value)}
              className="pdm-editable text-center font-bold"
              title="Click to edit activity title"
            />
          </div>

          {/* Meta Transmittal Block */}
          <table className="w-full text-xs mb-4">
            <tbody>
              <tr>
                <td className="w-28 font-bold py-0.5">Date:</td>
                <td className="py-0.5">
                  <input
                    type="text"
                    value={docDate}
                    onChange={(e) => setDocDate(e.target.value)}
                    className="pdm-editable font-medium"
                    title="Click to edit transmittal date"
                  />
                </td>
              </tr>
              <tr>
                <td className="font-bold py-0.5">Proponent:</td>
                <td className="py-0.5">
                  <input
                    type="text"
                    value={proponentCommittee}
                    onChange={(e) => setProponentCommittee(e.target.value)}
                    className="pdm-editable"
                    title="Click to edit proponent"
                  />
                </td>
              </tr>
              {isProposal && (
                <>
                  <tr>
                    <td className="font-bold py-0.5">Target Schedule:</td>
                    <td className="py-0.5">
                      <input
                        type="text"
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                        className="pdm-editable"
                        title="Click to edit date window"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold py-0.5">Location / Venue:</td>
                    <td className="py-0.5">
                      <input
                        type="text"
                        value={venue}
                        onChange={(e) => setVenue(e.target.value)}
                        className="pdm-editable"
                        title="Click to edit venue"
                      />
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>

          {/* SECTION 1: PROPOSAL BODY OR FINANCIAL SUMMARY */}
          {isProposal ? (
            <div>
              <div className="pdm-section-title">I. ACTIVITY OBJECTIVES & RATIONALE</div>
              <textarea
                rows={3}
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
                className="pdm-editable w-full text-justify text-xs mb-4"
                title="Click to edit objectives"
              />

              <div className="pdm-section-title">II. CONCESSION BUDGET & PROJECTED REVENUE SCHEDULE</div>
              <table className="pdm-table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th className="text-right">Unit Capital (₱)</th>
                    <th className="text-right">Selling Price (₱)</th>
                    <th className="text-center">Units</th>
                    <th className="text-right">Est. Gross (₱)</th>
                    <th className="text-right">Est. Profit (₱)</th>
                  </tr>
                </thead>
                <tbody>
                  {(documentData.items || []).map((item, idx) => {
                    const gross = (item.sellingPrice || 0) * (item.projectedUnits || 0);
                    const cost = (item.unitCost || 0) * (item.projectedUnits || 0);
                    const profit = gross - cost;
                    return (
                      <tr key={idx}>
                        <td>{item.name}</td>
                        <td className="text-right">₱{Number(item.unitCost || 0).toFixed(2)}</td>
                        <td className="text-right">₱{Number(item.sellingPrice || 0).toFixed(2)}</td>
                        <td className="text-center">{item.projectedUnits}</td>
                        <td className="text-right">₱{gross.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                        <td className="text-right font-medium">₱{profit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                  <tr className="total-row">
                    <td>TOTALS & RETURN FORECAST</td>
                    <td className="text-right">₱{(documentData.totalCapital || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                    <td className="text-right">—</td>
                    <td className="text-center">—</td>
                    <td className="text-right">₱{(documentData.totalRevenue || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                    <td className="text-right">₱{(documentData.netProfit || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>

              <div className="text-xs italic text-gray-700 mb-4">
                * Estimated Return on Investment (ROI): <strong>{documentData.marginPercent}%</strong> based on 100% inventory sell-through.
              </div>
            </div>
          ) : (
            <div>
              <div className="pdm-section-title">I. EXECUTIVE FINANCIAL SUMMARY</div>
              <table className="pdm-table mb-4">
                <tbody>
                  <tr>
                    <td className="w-1/2">Total Inflows (Revenue & Collections):</td>
                    <td className="text-right font-bold">
                      ₱{(documentData.summary?.total_inflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td>Total Outflows (Approved Operational Expenses):</td>
                    <td className="text-right font-bold text-red-700">
                      (₱{(documentData.summary?.total_outflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })})
                    </td>
                  </tr>
                  <tr className="border-t border-b border-gray-400 font-bold">
                    <td>Net Period Balance Remaining:</td>
                    <td className="text-right font-bold text-emerald-800">
                      ₱{((documentData.summary?.total_inflows || 0) - (documentData.summary?.total_outflows || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td>Physical Cashbox Liquidity (Reconciled Count):</td>
                    <td className="text-right">
                      ₱{(documentData.summary?.cash_on_hand || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td>Accounts Payable (Pending "Abono" Out-of-Pocket Claims):</td>
                    <td className="text-right text-amber-700">
                      ₱{(documentData.summary?.pending_reimbursements || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="pdm-section-title">II. ITEMIZED SCHEDULE OF INFLOWS & DISBURSEMENTS</div>
              <table className="pdm-table">
                <thead>
                  <tr>
                    <th className="w-24">Date</th>
                    <th>Particulars / Description</th>
                    <th className="w-28">Category</th>
                    <th className="w-24 text-right">Amount (₱)</th>
                  </tr>
                </thead>
                <tbody>
                  {(documentData.transactions || []).map((tx, idx) => (
                    <tr key={idx}>
                      <td>{tx.transaction_date}</td>
                      <td>
                        {tx.title}
                        {tx.is_reimbursement && (
                          <span className="italic text-gray-500"> [Advance: {tx.reimbursement_recipient}]</span>
                        )}
                      </td>
                      <td>{tx.category_name || (tx.type === 'INFLOW' ? 'Revenue' : 'Expense')}</td>
                      <td className={`text-right font-medium ${tx.type === 'INFLOW' ? 'text-gray-950' : 'text-gray-700'}`}>
                        {tx.type === 'INFLOW' ? '+' : '-'}
                        {Number(tx.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td colSpan={3}>CLOSING PHYSICAL CASH-ON-HAND</td>
                    <td className="text-right">
                      ₱{(documentData.summary?.cash_on_hand || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="pdm-section-title">III. AUDIT REMARKS & GOVERNANCE NOTES</div>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="pdm-editable w-full text-justify text-xs mb-4"
                title="Click to edit audit remarks"
              />
            </div>
          )}

          {/* SECTION: 6-STAGE SEQUENTIAL WET-INK SIGNATORIES */}
          <div className="pdm-section-title">
            {isProposal ? 'III. INSTITUTIONAL APPROVAL ROUTING' : 'IV. INSTITUTIONAL ROUTING & SIGNATORIES'}
          </div>

          <table className="pdm-signatory-grid">
            <tbody>
              {/* Row 1: Prepared by (Treasurer) & Verified by (Auditor) */}
              <tr>
                <td>
                  <span>Prepared by:</span>
                  <input
                    type="text"
                    value={signatories.preparedBy}
                    onChange={(e) => handleUpdateSig('preparedBy', e.target.value)}
                    className="pdm-editable pdm-sig-name"
                    title="Click to edit name"
                  />
                  <input
                    type="text"
                    value={signatories.preparedRole}
                    onChange={(e) => handleUpdateSig('preparedRole', e.target.value)}
                    className="pdm-editable pdm-sig-role"
                    title="Click to edit designation"
                  />
                </td>
                <td>
                  <span>Audited & Verified by:</span>
                  <input
                    type="text"
                    value={signatories.reviewedBy}
                    onChange={(e) => handleUpdateSig('reviewedBy', e.target.value)}
                    className="pdm-editable pdm-sig-name"
                    title="Click to edit name"
                  />
                  <input
                    type="text"
                    value={signatories.reviewedRole}
                    onChange={(e) => handleUpdateSig('reviewedRole', e.target.value)}
                    className="pdm-editable pdm-sig-role"
                    title="Click to edit designation"
                  />
                </td>
              </tr>

              {/* Row 2: Noted by (President) & Approved by (Dual Club Advisers) */}
              <tr>
                <td>
                  <span>Noted by:</span>
                  <input
                    type="text"
                    value={signatories.notedBy}
                    onChange={(e) => handleUpdateSig('notedBy', e.target.value)}
                    className="pdm-editable pdm-sig-name"
                    title="Click to edit name"
                  />
                  <input
                    type="text"
                    value={signatories.notedRole}
                    onChange={(e) => handleUpdateSig('notedRole', e.target.value)}
                    className="pdm-editable pdm-sig-role"
                    title="Click to edit designation"
                  />
                </td>
                <td>
                  <span>Approved by:</span>
                  <input
                    type="text"
                    value={signatories.adviser1}
                    onChange={(e) => handleUpdateSig('adviser1', e.target.value)}
                    className="pdm-editable pdm-sig-name !mt-6"
                    title="Click to edit Adviser 1"
                  />
                  <input
                    type="text"
                    value={signatories.adviser2}
                    onChange={(e) => handleUpdateSig('adviser2', e.target.value)}
                    className="pdm-editable font-bold text-xs uppercase"
                    title="Click to edit Adviser 2"
                  />
                  <input
                    type="text"
                    value={signatories.adviserRole}
                    onChange={(e) => handleUpdateSig('adviserRole', e.target.value)}
                    className="pdm-editable pdm-sig-role"
                    title="Click to edit designation"
                  />
                </td>
              </tr>

              {/* Row 3: Endorsed by (BSIT Program Director) & Final Approval (CCS Dean) */}
              <tr>
                <td>
                  <span>Endorsed by:</span>
                  <input
                    type="text"
                    value={signatories.directorName}
                    onChange={(e) => handleUpdateSig('directorName', e.target.value)}
                    className="pdm-editable pdm-sig-name"
                    title="Click to edit Program Director"
                  />
                  <input
                    type="text"
                    value={signatories.directorRole}
                    onChange={(e) => handleUpdateSig('directorRole', e.target.value)}
                    className="pdm-editable pdm-sig-role"
                    title="Click to edit designation"
                  />
                </td>
                <td>
                  <span>Final Approval:</span>
                  <input
                    type="text"
                    value={signatories.deanName}
                    onChange={(e) => handleUpdateSig('deanName', e.target.value)}
                    className="pdm-editable pdm-sig-name"
                    title="Click to edit Dean"
                  />
                  <input
                    type="text"
                    value={signatories.deanRole}
                    onChange={(e) => handleUpdateSig('deanRole', e.target.value)}
                    className="pdm-editable pdm-sig-role"
                    title="Click to edit designation"
                  />
                </td>
              </tr>
            </tbody>
          </table>

        </article>
      </main>

    </div>
  );
}
