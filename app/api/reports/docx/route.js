import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeightRule,
  ImageRun,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

// Institutional 200x150 fallback PNG buffer for offline or broken receipt images
const FALLBACK_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAMgAAACWCAIAAAAUvlBOAAABmElEQVR4nO3UQQ0AIBADQcC/2JOACfZBMiOgr033zCx47TxfBGFR8VgkhEVCWCSERUJYJIRFQlgkhEVCWCSERUJYJIRFQlgkhEVCWCSERUJYJIRFQlgkhEVCWCSERUJYJIRFQlgkhEVCWCSERUJYJIRFQlgkhEVCWCSERUJYJIRFQlgkhEVCWCSERUJYJIRFQlgkhEVCWCSERUJYJIRFQlgkhEVCWCSERUJYJIRFQlgkhEVCWCSERUJYJIRFQlgkhEVCWCSERUJYJIRFQlgkhEVCWCSERUJYJIRFQlgkhEVCWCSERUJYJIRFQlgkhEVCWCSERUJYJIRFQlgkhEVCWCSEhbD4h8ciISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLBLCIiEsEsIiISwSwiIhLFbhAmHcA/xqOl4WAAAAAElFTkSuQmCC';
const FALLBACK_PNG_BUFFER = Buffer.from(FALLBACK_PNG_BASE64, 'base64');

// Strict local file path validation: only permit paths explicitly within os.tmpdir() or project exports/ with image extension
function isAllowedLocalImagePath(filePath) {
  if (typeof filePath !== 'string' || !filePath.trim()) return false;
  try {
    const ext = path.extname(filePath).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
      return false;
    }
    const resolved = path.resolve(filePath).toLowerCase();
    const resolvedTmp = path.resolve(os.tmpdir()).toLowerCase();
    const resolvedExports = path.resolve(process.cwd(), 'exports').toLowerCase();

    const isUnderTmp = resolved.startsWith(resolvedTmp + path.sep.toLowerCase()) || resolved === resolvedTmp;
    const isUnderExports = resolved.startsWith(resolvedExports + path.sep.toLowerCase()) || resolved === resolvedExports;

    return isUnderTmp || isUnderExports;
  } catch (_) {
    return false;
  }
}

// Strict URL validation: must be https protocol and disallow loopback, link-local, and private addresses
function isValidRemoteImageUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Disallow loopback, link-local, internal/local hostnames
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return false;
    }

    // Disallow IPv4 loopback, link-local, and private ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipv4Regex);
    if (ipMatch) {
      const p0 = parseInt(ipMatch[1], 10);
      const p1 = parseInt(ipMatch[2], 10);
      const p2 = parseInt(ipMatch[3], 10);
      const p3 = parseInt(ipMatch[4], 10);

      if (p0 > 255 || p1 > 255 || p2 > 255 || p3 > 255) return false;

      // 127.0.0.0/8 (loopback) and 0.0.0.0
      if (p0 === 127 || p0 === 0) return false;

      // 169.254.0.0/16 (link-local)
      if (p0 === 169 && p1 === 254) return false;

      // 10.0.0.0/8 (private)
      if (p0 === 10) return false;

      // 192.168.0.0/16 (private)
      if (p0 === 192 && p1 === 168) return false;

      // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255) (private)
      if (p0 === 172 && p1 >= 16 && p1 <= 31) return false;
    }

    // Disallow IPv6 loopback, link-local, and private addresses
    const cleanHost = hostname.replace(/^\[|\]$/g, '');
    if (
      cleanHost === '::1' ||
      cleanHost === '0:0:0:0:0:0:0:1' ||
      cleanHost.startsWith('fe80:') ||
      cleanHost.startsWith('fc') ||
      cleanHost.startsWith('fd')
    ) {
      return false;
    }

    return true;
  } catch (_) {
    return false;
  }
}

export async function POST(req) {
  const downloadedFiles = [];

  try {
    const body = await req.json();

    // Dynamically calculate current Academic Year (August starts the new AY in PH universities)
    const now = new Date();
    const currentYear = now.getFullYear();
    const startYear = now.getMonth() >= 7 ? currentYear : currentYear - 1;
    const defaultAcademicYear = `${startYear}–${startYear + 1}`;
    const defaultTargetDate = `Academic Year ${defaultAcademicYear}`;

    const {
      type = 'LIQUIDATION',
      activityTitle = 'Financial Operations',
      eventName = 'Financial Operations',
      transmittalDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      datePrepared = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      proponentCommittee = 'League of Information Technology Enthusiasts (LITE)',
      venue = 'PDM Campus',
      targetDate = defaultTargetDate,
      objectives = '',
      remarks = '',
      signatories = {},
      summary = {},
      transactions = [],
      items = [],
      totalCapital = 0,
      totalRevenue = 0,
      netProfit = 0,
      marginPercent = 0,
      receiptsMode = 'NONE',
      receipts = [],
      includedSignatories = {},
    } = body;

    // 0. Pre-fetch receipt images with 3-second AbortController timeout & fallback PNG
    if ((receiptsMode === 'APPEND' || receiptsMode === 'STANDALONE') && Array.isArray(receipts) && receipts.length > 0) {
      const fetchPromises = receipts.map(async (rc, idx) => {
        const rawUrl = rc.url || rc.image_url || rc.receipt_url;
        const fallbackPath = path.join(os.tmpdir(), `finlite-rc-fallback-${Date.now()}-${idx}.png`);

        if (!rawUrl || typeof rawUrl !== 'string') {
          fs.writeFileSync(fallbackPath, FALLBACK_PNG_BUFFER);
          downloadedFiles.push(fallbackPath);
          rc.local_path = fallbackPath;
          rc.image_buffer = FALLBACK_PNG_BUFFER;
          return;
        }

        // Handle data URL directly
        if (rawUrl.startsWith('data:image/')) {
          try {
            const base64Data = rawUrl.split(',')[1];
            const buf = Buffer.from(base64Data, 'base64');
            const ext = rawUrl.includes('jpeg') || rawUrl.includes('jpg') ? '.jpg' : '.png';
            const tmpPath = path.join(os.tmpdir(), `finlite-rc-${Date.now()}-${idx}${ext}`);
            fs.writeFileSync(tmpPath, buf);
            downloadedFiles.push(tmpPath);
            rc.local_path = tmpPath;
            rc.image_buffer = buf;
            return;
          } catch (_) {
            fs.writeFileSync(fallbackPath, FALLBACK_PNG_BUFFER);
            downloadedFiles.push(fallbackPath);
            rc.local_path = fallbackPath;
            rc.image_buffer = FALLBACK_PNG_BUFFER;
            return;
          }
        }

        // Handle vetted local file path only (strictly within os.tmpdir() or exports/)
        if (isAllowedLocalImagePath(rawUrl) && fs.existsSync(rawUrl)) {
          try {
            const buf = fs.readFileSync(rawUrl);
            rc.local_path = rawUrl;
            rc.image_buffer = buf;
            return;
          } catch (_) {}
        }

        // Validate remote URL (https required, no private/loopback/link-local addresses)
        if (!isValidRemoteImageUrl(rawUrl)) {
          fs.writeFileSync(fallbackPath, FALLBACK_PNG_BUFFER);
          downloadedFiles.push(fallbackPath);
          rc.local_path = fallbackPath;
          rc.image_buffer = FALLBACK_PNG_BUFFER;
          return;
        }

        // Network fetch with 3s timeout
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);

        try {
          const res = await fetch(rawUrl, { signal: controller.signal });
          clearTimeout(timer);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const arrayBuf = await res.arrayBuffer();
          const buf = Buffer.from(arrayBuf);
          if (buf.length === 0) throw new Error('Empty image payload');
          const ext = rawUrl.toLowerCase().includes('.jpg') || rawUrl.toLowerCase().includes('.jpeg') ? '.jpg' : '.png';
          const tmpPath = path.join(os.tmpdir(), `finlite-rc-${Date.now()}-${idx}${ext}`);
          fs.writeFileSync(tmpPath, buf);
          downloadedFiles.push(tmpPath);
          rc.local_path = tmpPath;
          rc.image_buffer = buf;
        } catch (_) {
          clearTimeout(timer);
          fs.writeFileSync(fallbackPath, FALLBACK_PNG_BUFFER);
          downloadedFiles.push(fallbackPath);
          rc.local_path = fallbackPath;
          rc.image_buffer = FALLBACK_PNG_BUFFER;
        }
      });

      await Promise.allSettled(fetchPromises);
    }

    // 1. If LIQUIDATION report, attempt exact institutional rendering via master template populator
    if (type === 'LIQUIDATION') {
      const templatePath = path.join(process.cwd(), 'templates', 'LITE-Financial-Report-Universal-Template.docx');
      const scriptPath = path.join(process.cwd(), 'scripts', 'export_report_engine.py');

      if (fs.existsSync(templatePath) && fs.existsSync(scriptPath)) {
        const tmpInput = path.join(os.tmpdir(), `finlite-in-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
        const tmpOutput = path.join(os.tmpdir(), `finlite-out-${Date.now()}-${Math.random().toString(36).slice(2)}.docx`);

        try {
          fs.writeFileSync(tmpInput, JSON.stringify(body), 'utf8');
          const primaryCmd = process.platform === 'win32' ? 'python' : 'python3';
          const fallbackCmd = primaryCmd === 'python' ? 'python3' : 'python';

          try {
            execFileSync(primaryCmd, [scriptPath, tmpInput, tmpOutput], {
              timeout: 15000,
              windowsHide: true,
            });
          } catch (primaryErr) {
            try {
              execFileSync(fallbackCmd, [scriptPath, tmpInput, tmpOutput], {
                timeout: 15000,
                windowsHide: true,
              });
            } catch (_) {
              throw primaryErr;
            }
          }

          if (fs.existsSync(tmpOutput)) {
            const buffer = fs.readFileSync(tmpOutput);
            try { fs.unlinkSync(tmpInput); } catch (_) {}
            try { fs.unlinkSync(tmpOutput); } catch (_) {}

            const cleanPrefix = receiptsMode === 'STANDALONE'
              ? 'LITE-Receipts-Attachment-'
              : 'LITE-Financial-Report-';
            const cleanFileName = `${cleanPrefix}${(body.academicYear || defaultAcademicYear).replace(/[^a-zA-Z0-9]/g, '-')}.docx`;
            return new Response(buffer, {
              headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${cleanFileName}"`,
              },
            });
          }
        } catch (pyErr) {
          console.warn('Python master template populator error, falling back to programmatic docx:', pyErr.message);
        } finally {
          try { if (fs.existsSync(tmpInput)) fs.unlinkSync(tmpInput); } catch (_) {}
          try { if (fs.existsSync(tmpOutput)) fs.unlinkSync(tmpOutput); } catch (_) {}
        }
      }
    }

    // 2. Programmatic fallback DOCX rendering
    const borderNone = {
      top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    };

    const borderSingle = {
      top: { style: BorderStyle.SINGLE, size: 4, color: '4B5563' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '4B5563' },
      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    };

    const borderDoubleBottom = {
      top: { style: BorderStyle.SINGLE, size: 4, color: '4B5563' },
      bottom: { style: BorderStyle.DOUBLE, size: 8, color: '000000' },
      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    };

    // Standard PDM CCS Header
    const pdmHeader = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: 'PAMBAYANG DALUBHASAAN NG MARILAO', bold: true, size: 24, font: 'Calibri' }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: 'COLLEGE OF COMPUTER STUDIES', size: 20, font: 'Calibri' }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: 'LEAGUE OF INFORMATION TECHNOLOGY ENTHUSIASTS (LITE)', bold: true, size: 22, font: 'Calibri' }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: 'Abangan Norte, Marilao, Bulacan', italics: true, size: 18, font: 'Calibri' }),
        ],
      }),
      new Paragraph({ text: '' }),
    ];

    // Function to generate 1:1 PDM institutional signatory tables with strict left-alignment and 0-guard
    function createSignatoryTables(signatories = {}, borderNone, docType = 'LIQUIDATION', inc = {}) {
      const incFilter = {
        treasurer: true,
        auditor: true,
        vicePresident: true,
        president: true,
        adviser1: true,
        adviser2: true,
        adviser: true,
        director: true,
        dean: true,
        ...inc,
      };

      const presName = (signatories.presidentName || signatories.notedBy || signatories.president_name || 'GERONIMO, ANDREI JOHN P.').toUpperCase();
      const presRole = signatories.presidentRole || signatories.notedRole || signatories.president_role || 'LITE President';
      const vpName = (signatories.vicePresidentName || signatories.vice_president || signatories.vice_president_name || signatories.vpName || '').toUpperCase();
      const vpRole = signatories.vicePresidentRole || signatories.vice_president_role || signatories.vpRole || 'LITE Vice President';
      const treasName = (signatories.treasurerName || signatories.preparedBy || signatories.treasurer_name || 'CABANAG, ROSE MARIELLE P.').toUpperCase();
      const treasRole = signatories.treasurerRole || signatories.preparedRole || signatories.treasurer_role || 'LITE Treasurer';
      const audName = (signatories.auditorName || signatories.reviewedBy || signatories.auditor_name || 'SARA, RISHAME P.').toUpperCase();
      const audRole = signatories.auditorRole || signatories.reviewedRole || signatories.auditor_role || 'LITE Auditor';
      const adv1Name = (signatories.adviser1Name || signatories.adviser1 || signatories.adviserName || signatories.adviser_name || 'MS. KIMBERLY DAWN JATULAN').toUpperCase();
      const adv2Name = (signatories.adviser2Name || signatories.adviser2 || signatories.adviser2_name || '').toUpperCase();
      const adv1Role = signatories.adviser1Role || signatories.adviserRole || signatories.adviser_role || 'LITE Club Adviser';
      const adv2Role = signatories.adviser2Role || signatories.adviserRole || signatories.adviser_role || 'LITE Club Adviser';
      const dirName = (signatories.directorName || signatories.director_name || '').toUpperCase();
      const dirRole = signatories.directorRole || signatories.director_role || 'Program Director, BSIT';
      const deanName = (signatories.deanName || signatories.dean_name || '').toUpperCase();
      const deanRole = signatories.deanRole || signatories.dean_role || 'Dean, College of Computer Studies';

      function buildDynamicTable(sigs, maxCols, defaultHeading = '') {
        if (maxCols <= 0 || !sigs || sigs.length === 0) return null;
        const colPct = Math.floor(100 / maxCols);
        const cells = sigs.slice(0, maxCols).map((sig, idx) => {
          const heading = (sig.heading !== undefined ? sig.heading : (idx === 0 ? defaultHeading : '')) + '\n\n\n';
          return new TableCell({
            borders: borderNone,
            width: { size: colPct, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({ children: [new TextRun({ text: heading, font: 'Calibri' })] }),
              new Paragraph({ children: [new TextRun({ text: sig.name, bold: true, font: 'Calibri' })] }),
              new Paragraph({ children: [new TextRun({ text: sig.role, italics: true, font: 'Calibri' })] }),
            ],
          });
        });

        // Fill remaining columns with blank cells to keep left-alignment without stretching
        for (let i = sigs.length; i < maxCols; i++) {
          cells.push(new TableCell({
            borders: borderNone,
            width: { size: colPct, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ text: '' })],
          }));
        }

        return new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [new TableRow({ children: cells })],
        });
      }

      // Table 1 (Officers):
      const activeOfficers = [];
      if (incFilter.treasurer && treasName) activeOfficers.push({ heading: 'Prepared by:', name: treasName, role: treasRole });
      if (incFilter.auditor && audName) activeOfficers.push({ heading: 'Audited by:', name: audName, role: audRole });
      if ((incFilter.vicePresident ?? incFilter.vice_president) && vpName) activeOfficers.push({ heading: 'Noted by:', name: vpName, role: vpRole });
      if (incFilter.president && presName) activeOfficers.push({ heading: 'Noted by:', name: presName, role: presRole });

      // Table 2 (Advisers):
      const activeAdvisers = [];
      if ((incFilter.adviser1 ?? incFilter.adviser) && adv1Name) {
        activeAdvisers.push({ heading: 'Approved by:', name: adv1Name, role: adv1Role });
      }
      if ((incFilter.adviser2 ?? incFilter.adviser) && adv2Name && adv2Name !== adv1Name) {
        activeAdvisers.push({ heading: 'Approved by:', name: adv2Name, role: adv2Role });
      }

      // Table 3 (Administration):
      const activeAdmins = [];
      if (incFilter.director && dirName) activeAdmins.push({ heading: 'Noted by:', name: dirName, role: dirRole });
      if (incFilter.dean && deanName) activeAdmins.push({ heading: 'Approved by:', name: deanName, role: deanRole });

      if (docType === 'PROPOSAL') {
        const tables = [];
        const maxOfficerCols = Math.min(Math.max(activeOfficers.length, 3), 4);
        const tblOfficers = buildDynamicTable(activeOfficers, maxOfficerCols);
        if (tblOfficers) {
          tables.push(tblOfficers);
          tables.push(new Paragraph({ text: '' }));
        }
        const tblAdmin = buildDynamicTable(activeAdmins, 2);
        if (tblAdmin) {
          tables.push(tblAdmin);
        }
        return tables;
      }

      // LIQUIDATION
      const tables = [];
      const maxOfficerCols = Math.min(Math.max(activeOfficers.length, 3), 4);
      const tblOfficers = buildDynamicTable(activeOfficers, maxOfficerCols);
      if (tblOfficers) {
        tables.push(tblOfficers);
        tables.push(new Paragraph({ text: '' }));
      }

      const tblAdvisers = buildDynamicTable(activeAdvisers, 2);
      if (tblAdvisers) {
        tables.push(tblAdvisers);
        tables.push(new Paragraph({ text: '' }));
      }

      const tblAdmins = buildDynamicTable(activeAdmins, 2);
      if (tblAdmins) {
        tables.push(tblAdmins);
      }

      return tables;
    }

    // Function to generate 2-column 4-up receipt attachment sheets
    function createReceiptSheetsSection(receiptsList, ay, sem) {
      if (!receiptsList || receiptsList.length === 0) return [];
      const chunks = [];
      for (let i = 0; i < receiptsList.length; i += 4) {
        chunks.push(receiptsList.slice(i, i + 4));
      }
      const totalSheets = chunks.length;
      const elements = [];

      chunks.forEach((chunk, sheetIdx) => {
        elements.push(new Paragraph({ children: [new PageBreak()] }));

        elements.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'PAMBAYANG DALUBHASAAN NG MARILAO\n', bold: true, size: 19, font: 'Calibri' }),
            new TextRun({ text: 'RECEIPTS & PROOFS OF DISBURSEMENT\n', bold: true, size: 22, font: 'Calibri' }),
            new TextRun({ text: `${sem} • ACADEMIC YEAR ${ay}\n`, size: 19, color: '505050', font: 'Calibri' }),
            new TextRun({ text: `Receipts Attachment Sheet ${sheetIdx + 1} of ${totalSheets}`, size: 17, color: '787878', font: 'Calibri' }),
          ],
        }));
        elements.push(new Paragraph({ text: '' }));

        const tableRows = [];
        for (let rIdx = 0; rIdx < 2; rIdx++) {
          const rowCells = [];
          for (let cIdx = 0; cIdx < 2; cIdx++) {
            const itemIdx = rIdx * 2 + cIdx;
            const rc = chunk[itemIdx];
            if (rc) {
              const cellBorder = {
                top: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
                left: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
                right: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
              };

              const cellChildren = [];
              const imgData = rc.image_buffer || FALLBACK_PNG_BUFFER;
              if (imgData) {
                cellChildren.push(new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new ImageRun({
                      data: imgData,
                      transformation: { width: 280, height: 260 },
                    }),
                  ],
                }));
              }

              cellChildren.push(new Paragraph({
                children: [
                  new TextRun({ text: `${rc.date || ''}  •  `, size: 19, font: 'Calibri' }),
                  new TextRun({ text: `₱${(Number(rc.amount) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n`, bold: true, size: 19, font: 'Calibri' }),
                  new TextRun({ text: `${rc.title || 'Disbursement Particulars'}\n`, bold: true, size: 19, font: 'Calibri' }),
                  new TextRun({ text: `${rc.category || 'Disbursement'}`, size: 17, color: '646464', font: 'Calibri' }),
                ],
              }));

              rowCells.push(new TableCell({
                borders: cellBorder,
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: cellChildren,
              }));
            } else {
              rowCells.push(new TableCell({
                borders: borderNone,
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ text: '' })],
              }));
            }
          }
          tableRows.push(new TableRow({ children: rowCells }));
        }

        elements.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
        }));
      });

      return elements;
    }

    let sectionChildren = [];

    if (receiptsMode === 'STANDALONE') {
      sectionChildren = [
        ...pdmHeader,
        ...createReceiptSheetsSection(receipts, body.academicYear || defaultAcademicYear, body.semester || '2nd SEMESTER'),
      ];
    } else if (type === 'PROPOSAL') {
      // Build Proposal Items Table
      const proposalTableRows = [
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              borders: borderSingle,
              children: [new Paragraph({ children: [new TextRun({ text: 'Item Description', bold: true, font: 'Calibri' })] })],
              width: { size: 35, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              borders: borderSingle,
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Unit Cost (₱)', bold: true, font: 'Calibri' })] })],
              width: { size: 13, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              borders: borderSingle,
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Selling Price (₱)', bold: true, font: 'Calibri' })] })],
              width: { size: 13, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              borders: borderSingle,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Units', bold: true, font: 'Calibri' })] })],
              width: { size: 10, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              borders: borderSingle,
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Projected Gross (₱)', bold: true, font: 'Calibri' })] })],
              width: { size: 16, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              borders: borderSingle,
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Profit (₱)', bold: true, font: 'Calibri' })] })],
              width: { size: 13, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
      ];

      items.forEach((item) => {
        const itemGross = (item.sellingPrice || 0) * (item.projectedUnits || 0);
        const itemProfit = itemGross - ((item.unitCost || 0) * (item.projectedUnits || 0));
        proposalTableRows.push(
          new TableRow({
            children: [
              new TableCell({
                borders: borderNone,
                children: [new Paragraph({ children: [new TextRun({ text: item.name || '', font: 'Calibri' })] })],
              }),
              new TableCell({
                borders: borderNone,
                children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `₱${Number(item.unitCost || 0).toFixed(2)}`, font: 'Calibri' })] })],
              }),
              new TableCell({
                borders: borderNone,
                children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `₱${Number(item.sellingPrice || 0).toFixed(2)}`, font: 'Calibri' })] })],
              }),
              new TableCell({
                borders: borderNone,
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${item.projectedUnits || 0}`, font: 'Calibri' })] })],
              }),
              new TableCell({
                borders: borderNone,
                children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `₱${itemGross.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, font: 'Calibri' })] })],
              }),
              new TableCell({
                borders: borderNone,
                children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `₱${itemProfit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, font: 'Calibri' })] })],
              }),
            ],
          })
        );
      });

      // Total Row
      proposalTableRows.push(
        new TableRow({
          children: [
            new TableCell({
              borders: borderDoubleBottom,
              children: [new Paragraph({ children: [new TextRun({ text: 'TOTALS & RETURN FORECAST', bold: true, font: 'Calibri' })] })],
            }),
            new TableCell({
              borders: borderDoubleBottom,
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `₱${Number(totalCapital).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, bold: true, font: 'Calibri' })] })],
            }),
            new TableCell({
              borders: borderDoubleBottom,
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: '—', font: 'Calibri' })] })],
            }),
            new TableCell({
              borders: borderDoubleBottom,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '—', font: 'Calibri' })] })],
            }),
            new TableCell({
              borders: borderDoubleBottom,
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `₱${Number(totalRevenue).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, bold: true, font: 'Calibri' })] })],
            }),
            new TableCell({
              borders: borderDoubleBottom,
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `₱${Number(netProfit).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, bold: true, font: 'Calibri' })] })],
            }),
          ],
        })
      );

      sectionChildren = [
        ...pdmHeader,
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'PROJECT FINANCIAL PROPOSAL & FEASIBILITY PLAN', bold: true, size: 26, underline: {}, font: 'Calibri' }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: `Event / Initiative: ${eventName || activityTitle} • ${targetDate}`, bold: true, size: 20, font: 'Calibri' }),
          ],
        }),
        new Paragraph({ text: '' }),

        // Rationale & Objectives
        new Paragraph({
          children: [
            new TextRun({ text: 'I. ACTIVITY OBJECTIVES & RATIONALE', bold: true, size: 20, font: 'Calibri' }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: objectives || '1. Promote student engagement.\n2. Generate operating funds for upcoming academic workshops.', font: 'Calibri' }),
          ],
        }),
        new Paragraph({ text: '' }),

        // Product Budget Schedule
        new Paragraph({
          children: [
            new TextRun({ text: 'II. CONCESSION BUDGET & PROJECTED REVENUE SCHEDULE', bold: true, size: 20, font: 'Calibri' }),
          ],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: proposalTableRows,
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [
            new TextRun({ text: `* Projected Return on Investment (ROI): ${marginPercent}% assuming 100% sell-through.`, italics: true, size: 18, font: 'Calibri' }),
          ],
        }),
        new Paragraph({ text: '' }),

        // Signatories
        new Paragraph({
          children: [
            new TextRun({ text: 'III. INSTITUTIONAL APPROVAL ROUTING', bold: true, size: 20, font: 'Calibri' }),
          ],
        }),
        new Paragraph({ text: '' }),
        ...createSignatoryTables(signatories, borderNone, 'PROPOSAL', includedSignatories),
      ];
    } else {
      // Build Liquidation Transaction Rows
      const tableRows = [
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              borders: borderSingle,
              children: [new Paragraph({ children: [new TextRun({ text: 'Date', bold: true, font: 'Calibri' })] })],
              width: { size: 15, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              borders: borderSingle,
              children: [new Paragraph({ children: [new TextRun({ text: 'Particulars / Description', bold: true, font: 'Calibri' })] })],
              width: { size: 45, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              borders: borderSingle,
              children: [new Paragraph({ children: [new TextRun({ text: 'Category / Ref', bold: true, font: 'Calibri' })] })],
              width: { size: 20, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              borders: borderSingle,
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Inflow (₱)', bold: true, font: 'Calibri' })] })],
              width: { size: 10, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              borders: borderSingle,
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Outflow (₱)', bold: true, font: 'Calibri' })] })],
              width: { size: 10, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
      ];

      transactions.forEach((tx) => {
        const isInflow = tx.type === 'INFLOW';
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({
                borders: borderNone,
                children: [new Paragraph({ children: [new TextRun({ text: tx.transaction_date ? new Date(tx.transaction_date).toLocaleDateString() : '—', font: 'Calibri' })] })],
              }),
              new TableCell({
                borders: borderNone,
                children: [new Paragraph({ children: [new TextRun({ text: tx.title || 'Transaction', font: 'Calibri' })] })],
              }),
              new TableCell({
                borders: borderNone,
                children: [new Paragraph({ children: [new TextRun({ text: tx.category_name || tx.category || 'General', font: 'Calibri' })] })],
              }),
              new TableCell({
                borders: borderNone,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: isInflow ? `₱${Number(tx.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—', font: 'Calibri' })],
                  }),
                ],
              }),
              new TableCell({
                borders: borderNone,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: !isInflow ? `₱${Number(tx.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—', font: 'Calibri' })],
                  }),
                ],
              }),
            ],
          })
        );
      });

      // Summary Rows
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              borders: borderSingle,
              children: [new Paragraph({ children: [new TextRun({ text: 'TOTAL ACCUMULATED AMOUNTS', bold: true, font: 'Calibri' })] })],
            }),
            new TableCell({
              borders: borderSingle,
              children: [new Paragraph({ children: [new TextRun({ text: 'Sum of all verified inflows & disbursements', italics: true, font: 'Calibri' })] })],
            }),
            new TableCell({
              borders: borderSingle,
              children: [new Paragraph({ children: [new TextRun({ text: 'Total Funds', font: 'Calibri' })] })],
            }),
            new TableCell({
              borders: borderSingle,
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({
                      text: `₱${(summary.total_inflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
                      bold: true,
                      font: 'Calibri',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              borders: borderSingle,
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({
                      text: `₱${(summary.total_outflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
                      bold: true,
                      font: 'Calibri',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              borders: borderDoubleBottom,
              children: [new Paragraph({ children: [new TextRun({ text: 'REMAINING CASH IN VAULT', bold: true, font: 'Calibri' })] })],
            }),
            new TableCell({
              borders: borderDoubleBottom,
              children: [new Paragraph({ children: [new TextRun({ text: 'Reconciled Physical Cash Count', italics: true, font: 'Calibri' })] })],
            }),
            new TableCell({
              borders: borderDoubleBottom,
              children: [new Paragraph({ children: [new TextRun({ text: 'Liquid Balance', font: 'Calibri' })] })],
            }),
            new TableCell({
              borders: borderDoubleBottom,
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({
                      text: `₱${(summary.cash_on_hand || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
                      bold: true,
                      font: 'Calibri',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              borders: borderDoubleBottom,
              children: [new Paragraph({ text: '' })],
            }),
          ],
        })
      );

      sectionChildren = [
        ...pdmHeader,
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'FORMAL FINANCIAL LIQUIDATION REPORT', bold: true, size: 26, underline: {}, font: 'Calibri' }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: `Activity / Event: ${activityTitle || eventName} • Academic Year ${body.academicYear || targetDate || defaultAcademicYear}`, bold: true, size: 20, font: 'Calibri' }),
          ],
        }),
        new Paragraph({ text: '' }),

        // Financial Summary Block
        new Paragraph({
          children: [
            new TextRun({ text: 'I. EXECUTIVE FINANCIAL SUMMARY', bold: true, size: 20, font: 'Calibri' }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Transmittal Date: `, bold: true, font: 'Calibri' }),
            new TextRun({ text: `${transmittalDate}\n`, font: 'Calibri' }),
            new TextRun({ text: `Total Inflows (Revenue): ₱${(summary.total_inflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n`, font: 'Calibri' }),
            new TextRun({ text: `Total Outflows (Disbursements): ₱${(summary.total_outflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n`, font: 'Calibri' }),
            new TextRun({ text: `Net Balance Remaining: ₱${((summary.total_inflows || 0) - (summary.total_outflows || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n`, font: 'Calibri', bold: true }),
            new TextRun({ text: `Physical Cash-on-Hand: ₱${(summary.cash_on_hand || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n`, font: 'Calibri' }),
            new TextRun({ text: `Pending Advances (Abono): ₱${(summary.pending_reimbursements || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, font: 'Calibri' }),
          ],
        }),
        new Paragraph({ text: '' }),

        // Itemized Transactions Table
        new Paragraph({
          children: [
            new TextRun({ text: 'II. ITEMIZED SCHEDULE OF INFLOWS & DISBURSEMENTS', bold: true, size: 20, font: 'Calibri' }),
          ],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
        }),
        new Paragraph({ text: '' }),

        // Audit Remarks
        new Paragraph({
          children: [
            new TextRun({ text: 'III. AUDIT REMARKS & GOVERNANCE NOTES', bold: true, size: 20, font: 'Calibri' }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: remarks || 'All transactions recorded conform with the 7-day receipt submission policy and dual club adviser audit verification.', font: 'Calibri' }),
          ],
        }),
        new Paragraph({ text: '' }),

        // Signatories
        new Paragraph({
          children: [
            new TextRun({ text: 'IV. INSTITUTIONAL ROUTING & SIGNATORIES', bold: true, size: 20, font: 'Calibri' }),
          ],
        }),
        new Paragraph({ text: '' }),
        ...createSignatoryTables(signatories, borderNone, 'LIQUIDATION', includedSignatories),
      ];

      // Attached receipts if requested
      if (receiptsMode === 'APPEND' && receipts && receipts.length > 0) {
        sectionChildren.push(...createReceiptSheetsSection(receipts, body.academicYear || defaultAcademicYear, body.semester || '2nd SEMESTER'));
      }
    }

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1584,
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({ text: 'Page ', font: 'Calibri', size: 18, color: '555555' }),
                    new TextRun({ children: [PageNumber.CURRENT], font: 'Calibri', size: 18, color: '555555' }),
                    new TextRun({ text: ' of ', font: 'Calibri', size: 18, color: '555555' }),
                    new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Calibri', size: 18, color: '555555' }),
                  ],
                }),
              ],
            }),
          },
          children: sectionChildren,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const cleanPrefix = receiptsMode === 'STANDALONE'
      ? 'FinLITE-Receipts'
      : (type === 'PROPOSAL' ? 'FinLITE-Proposal' : 'FinLITE-Liquidation');
    const cleanFileName = `${cleanPrefix}-${(activityTitle || eventName).replace(/[^a-zA-Z0-9]/g, '-').slice(0, 30)}.docx`;

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${cleanFileName}"`,
      },
    });
  } catch (err) {
    console.error('DOCX Export Error:', err);
    return NextResponse.json({ error: 'Failed to generate Word report' }, { status: 500 });
  } finally {
    for (const f of downloadedFiles) {
      try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (_) {}
    }
  }
}
