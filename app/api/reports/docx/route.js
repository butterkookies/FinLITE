import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/config/admin';
import { hasPermission, fetchProfileWithPermissions, ACTION_KEYS } from '@/lib/auth/permissions';
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
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database service unavailable.' }, { status: 503 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required to export reports.' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const db = adminClient || supabase;

    const email = user.email?.toLowerCase();
    const isSuperAdmin = isSuperAdminEmail(email);

    const callerProfile = await fetchProfileWithPermissions(db, { userId: user.id, email });

    const isApproved = isSuperAdmin || callerProfile?.status === 'approved' || user.app_metadata?.status === 'approved';
    if (!isApproved) {
      return NextResponse.json({ error: 'Your account is pending admin approval.' }, { status: 403 });
    }

    if (!isSuperAdmin && !hasPermission(callerProfile, ACTION_KEYS.EXPORT_REPORTS, email)) {
      return NextResponse.json({
        error: 'Forbidden: You do not have permission to generate or export reports.',
      }, { status: 403 });
    }

    const body = await req.json();

    // Dynamically calculate current Academic Year & Semester (August starts the new AY in PH universities)
    const now = new Date();
    const currentYear = now.getFullYear();
    const startYear = now.getMonth() >= 7 ? currentYear : currentYear - 1;
    const defaultAcademicYear = `${startYear}–${startYear + 1}`;
    const defaultSemester = (now.getMonth() >= 7 || now.getMonth() === 0) ? '1st SEMESTER' : '2nd SEMESTER';
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

    // Authoritative server-side recalculation: if semester_id is supplied, query database directly
    let authoritativeTransactions = Array.isArray(transactions) ? transactions : [];
    let authoritativeSummary = { ...summary };

    try {
      const adminClient = createAdminClient();
      const supabase = await createClient();
      const db = adminClient || supabase;

      const targetSemId = body.semester_id || body.semesterId;
      if (db && targetSemId && typeof targetSemId === 'string' && !targetSemId.startsWith('sem-')) {
        const { data: dbTxs } = await db
          .from('transactions')
          .select(`
            id, title, description, amount, type, transaction_date, event_name, status,
            is_reimbursement, reimbursement_recipient, advanced_by_name,
            categories (id, name, type),
            transaction_receipts (id, public_url, sort_order)
          `)
          .eq('semester_id', targetSemId)
          .eq('status', 'COMPLETED')
          .order('transaction_date', { ascending: true });

        if (Array.isArray(dbTxs) && dbTxs.length > 0) {
          authoritativeTransactions = dbTxs.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            amount: Number(t.amount || 0),
            type: t.type,
            date: t.transaction_date,
            transaction_date: t.transaction_date,
            category_name: t.categories?.name || (t.type === 'INFLOW' ? 'Revenue' : 'Disbursement'),
            is_reimbursement: t.is_reimbursement,
            reimbursement_recipient: t.reimbursement_recipient,
            advanced_by_name: t.advanced_by_name,
            event_name: t.event_name,
            receipt_url: t.transaction_receipts?.[0]?.public_url || null,
            receipt_urls: (t.transaction_receipts || []).map((r) => r.public_url),
          }));

          let sumInflows = 0;
          let sumOutflows = 0;
          authoritativeTransactions.forEach((t) => {
            if (t.type === 'INFLOW') sumInflows += t.amount;
            if (t.type === 'OUTFLOW') sumOutflows += t.amount;
          });

          const { data: abonoRows } = await db
            .from('advances_payable')
            .select('total_amount, amount_reimbursed')
            .eq('semester_id', targetSemId)
            .in('status', ['UNPAID', 'PARTIALLY_REIMBURSED']);

          let sumPendingAbono = 0;
          (abonoRows || []).forEach((a) => {
            sumPendingAbono += Number(a.total_amount || 0) - Number(a.amount_reimbursed || 0);
          });

          authoritativeSummary = {
            total_inflows: sumInflows,
            total_outflows: sumOutflows,
            cash_on_hand: sumInflows - sumOutflows,
            net_balance: sumInflows - sumOutflows,
            pending_reimbursements: sumPendingAbono,
          };
        }
      }
    } catch (dbErr) {
      console.warn('DOCX authoritative resolution notice:', dbErr?.message);
    }

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

    // 1. If LIQUIDATION report, attempt exact institutional rendering via master template populator (local dev with Python)
    const isServerlessOrCloud = Boolean(
      process.env.VERCEL ||
      process.env.RENDER ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.NEXT_RUNTIME === 'edge'
    );

    if (type === 'LIQUIDATION' && !isServerlessOrCloud) {
      const templatePath = path.join(process.cwd(), 'templates', 'LITE-Financial-Report-Universal-Template.docx');
      const scriptPath = path.join(process.cwd(), 'scripts', 'export_report_engine.py');

      if (fs.existsSync(templatePath) && fs.existsSync(scriptPath)) {
        const tmpInput = path.join(os.tmpdir(), `finlite-in-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
        const tmpOutput = path.join(os.tmpdir(), `finlite-out-${Date.now()}-${Math.random().toString(36).slice(2)}.docx`);

        try {
          fs.writeFileSync(tmpInput, JSON.stringify(body), 'utf8');
          const candidates = process.platform === 'win32'
            ? [process.env.PYTHON_PATH, 'py', 'python', 'C:\\Python314\\python.exe', 'python3'].filter(Boolean)
            : [process.env.PYTHON_PATH, 'python3', 'python'].filter(Boolean);

          let executed = false;
          for (const cmd of candidates) {
            try {
              execFileSync(cmd, [scriptPath, tmpInput, tmpOutput], {
                timeout: 15000,
                windowsHide: true,
              });
              if (fs.existsSync(tmpOutput)) {
                executed = true;
                break;
              }
            } catch (_) {
              // try next candidate
            }
          }

          if (executed && fs.existsSync(tmpOutput)) {
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
          console.warn('Python master template populator error, falling back to pure Node.js institutional engine:', pyErr.message);
        } finally {
          try { if (fs.existsSync(tmpInput)) fs.unlinkSync(tmpInput); } catch (_) {}
          try { if (fs.existsSync(tmpOutput)) fs.unlinkSync(tmpOutput); } catch (_) {}
        }
      }
    }

    // 2. Programmatic fallback DOCX rendering
    const resolvedTypography = String(body.typography || '').toLowerCase();
    const docFontFamily = body.font_family || (resolvedTypography === 'times' ? 'Times New Roman' : 'Calibri');
    const docBaseSizeHalfPt = Number(body.font_size_pt || (resolvedTypography === 'times' ? 12 : 11)) * 2;

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

    const borderSingleTop = {
      top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    };

    const borderSingleBottom = {
      top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
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
          new TextRun({ text: 'PAMBAYANG DALUBHASAAN NG MARILAO', bold: true, size: 24, font: docFontFamily }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: 'COLLEGE OF COMPUTER STUDIES', size: 20, font: docFontFamily }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: 'LEAGUE OF INFORMATION TECHNOLOGY ENTHUSIASTS (LITE)', bold: true, size: 22, font: docFontFamily }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: 'Abangan Norte, Marilao, Bulacan', italics: true, size: 18, font: docFontFamily }),
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

      function buildOfficerTable(sigs, maxCols) {
        if (maxCols <= 0 || !sigs || sigs.length === 0) return null;
        const colPct = Math.floor(100 / maxCols);
        const cells = sigs.slice(0, maxCols).map((sig) => {
          return new TableCell({
            borders: borderNone,
            width: { size: colPct, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({ children: [new TextRun({ text: '\n\n\n', font: docFontFamily })] }),
              new Paragraph({ children: [new TextRun({ text: sig.name, bold: true, font: docFontFamily })] }),
              new Paragraph({ children: [new TextRun({ text: sig.role, italics: true, font: docFontFamily })] }),
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

      function buildNotedTable(advisersList, adminsList) {
        const hasAdvisers = advisersList && advisersList.length > 0;
        const hasAdmins = adminsList && adminsList.length > 0;
        if (!hasAdvisers && !hasAdmins) return null;

        const tableRows = [];

        if (hasAdvisers) {
          const cells = [0, 1].map((colIdx) => {
            const sig = advisersList[colIdx];
            if (sig) {
              return new TableCell({
                borders: borderNone,
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({ children: [new TextRun({ text: '\n\n\n', font: docFontFamily })] }),
                  new Paragraph({ children: [new TextRun({ text: sig.name, bold: true, font: docFontFamily })] }),
                  new Paragraph({ children: [new TextRun({ text: sig.role, italics: true, font: docFontFamily })] }),
                ],
              });
            }
            return new TableCell({
              borders: borderNone,
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: '' })],
            });
          });
          tableRows.push(new TableRow({ children: cells }));
        }

        if (hasAdmins) {
          const cells = [0, 1].map((colIdx) => {
            const sig = adminsList[colIdx];
            if (sig) {
              return new TableCell({
                borders: borderNone,
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({ children: [new TextRun({ text: hasAdvisers ? '\n\n' : '\n\n\n', font: docFontFamily })] }),
                  new Paragraph({ children: [new TextRun({ text: sig.name, bold: true, font: docFontFamily })] }),
                  new Paragraph({ children: [new TextRun({ text: sig.role, italics: true, font: docFontFamily })] }),
                ],
              });
            }
            return new TableCell({
              borders: borderNone,
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: '' })],
            });
          });
          tableRows.push(new TableRow({ children: cells }));
        }

        return new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
        });
      }

      // Active Officers (under single "Prepared by:")
      const activeOfficers = [];
      if (incFilter.treasurer && treasName) activeOfficers.push({ name: treasName, role: treasRole });
      if (incFilter.auditor && audName) activeOfficers.push({ name: audName, role: audRole });
      if ((incFilter.vicePresident ?? incFilter.vice_president) && vpName) activeOfficers.push({ name: vpName, role: vpRole });
      if (incFilter.president && presName) activeOfficers.push({ name: presName, role: presRole });

      // Active Advisers
      const activeAdvisers = [];
      if ((incFilter.adviser1 ?? incFilter.adviser) && adv1Name) {
        activeAdvisers.push({ name: adv1Name, role: adv1Role });
      }
      if ((incFilter.adviser2 ?? incFilter.adviser) && adv2Name && adv2Name !== adv1Name) {
        activeAdvisers.push({ name: adv2Name, role: adv2Role });
      }

      // Active Administration
      const activeAdmins = [];
      if (incFilter.director && dirName) activeAdmins.push({ name: dirName, role: dirRole });
      if (incFilter.dean && deanName) activeAdmins.push({ name: deanName, role: deanRole });

      const tables = [];

      // 1. Single "Prepared by:" block for student officers
      if (activeOfficers.length > 0) {
        tables.push(new Paragraph({
          children: [new TextRun({ text: 'Prepared by:', bold: true, font: docFontFamily })],
          spacing: { before: 200, after: 60 },
        }));
        const maxOfficerCols = Math.min(Math.max(activeOfficers.length, 3), 4);
        const tblOfficers = buildOfficerTable(activeOfficers, maxOfficerCols);
        if (tblOfficers) {
          tables.push(tblOfficers);
          tables.push(new Paragraph({ text: '', spacing: { before: 80, after: 80 } }));
        }
      }

      // 2. Single "Noted by:" block spanning Advisers down to Program Director and Dean
      if (activeAdvisers.length > 0 || activeAdmins.length > 0) {
        tables.push(new Paragraph({
          children: [new TextRun({ text: 'Noted by:', bold: true, font: docFontFamily })],
          spacing: { before: 200, after: 60 },
        }));
        const tblNoted = buildNotedTable(activeAdvisers, activeAdmins);
        if (tblNoted) {
          tables.push(tblNoted);
        }
      }

      return tables;
    }

    // Function to generate 2-column 4-up receipt attachment sheets
    // Patch 15: Only 'Receipts' heading on first receipt sheet (sheetIdx === 0); no heading text above the 2x2 grid on subsequent receipt sheets (sheetIdx > 0).
    function createReceiptSheetsSection(receiptsList, ay, sem, isAttached = true) {
      if (!receiptsList || receiptsList.length === 0) return [];
      const chunks = [];
      for (let i = 0; i < receiptsList.length; i += 4) {
        chunks.push(receiptsList.slice(i, i + 4));
      }
      const elements = [];

      chunks.forEach((chunk, sheetIdx) => {
        if (sheetIdx > 0 || isAttached) {
          elements.push(new Paragraph({
            spacing: { before: 0, after: 0 },
            children: [new PageBreak()],
          }));
        }

        if (sheetIdx === 0) {
          elements.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 120 },
            children: [
              new TextRun({ text: 'Receipts', bold: true, size: docBaseSizeHalfPt, font: docFontFamily }),
            ],
          }));
        }

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
                  new TextRun({ text: `${rc.date || ''}  •  `, size: 19, font: docFontFamily }),
                  new TextRun({ text: `₱${(Number(rc.amount) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n`, bold: true, size: 19, font: docFontFamily }),
                  new TextRun({ text: `${rc.title || 'Disbursement Particulars'}\n`, bold: true, size: 19, font: docFontFamily }),
                  new TextRun({ text: `${rc.category || 'Disbursement'}`, size: 17, color: '646464', font: docFontFamily }),
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
        ...createReceiptSheetsSection(receipts, body.academicYear || defaultAcademicYear, body.semester || defaultSemester, false),
      ];
    } else if (type === 'PROPOSAL') {
      // Build Proposal Items Table
      const proposalTableRows = [
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              borders: borderSingle,
              children: [new Paragraph({ children: [new TextRun({ text: 'Item Description', bold: true, font: docFontFamily })] })],
              width: { size: 35, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              borders: borderSingle,
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Unit Cost (₱)', bold: true, font: docFontFamily })] })],
              width: { size: 13, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              borders: borderSingle,
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Selling Price (₱)', bold: true, font: docFontFamily })] })],
              width: { size: 13, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              borders: borderSingle,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Units', bold: true, font: docFontFamily })] })],
              width: { size: 10, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              borders: borderSingle,
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Projected Gross (₱)', bold: true, font: docFontFamily })] })],
              width: { size: 16, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              borders: borderSingle,
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Profit (₱)', bold: true, font: docFontFamily })] })],
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
                children: [new Paragraph({ children: [new TextRun({ text: item.name || '', font: docFontFamily })] })],
              }),
              new TableCell({
                borders: borderNone,
                children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `₱${Number(item.unitCost || 0).toFixed(2)}`, font: docFontFamily })] })],
              }),
              new TableCell({
                borders: borderNone,
                children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `₱${Number(item.sellingPrice || 0).toFixed(2)}`, font: docFontFamily })] })],
              }),
              new TableCell({
                borders: borderNone,
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${item.projectedUnits || 0}`, font: docFontFamily })] })],
              }),
              new TableCell({
                borders: borderNone,
                children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `₱${itemGross.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, font: docFontFamily })] })],
              }),
              new TableCell({
                borders: borderNone,
                children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `₱${itemProfit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, font: docFontFamily })] })],
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
              children: [new Paragraph({ children: [new TextRun({ text: 'TOTALS & RETURN FORECAST', bold: true, font: docFontFamily })] })],
            }),
            new TableCell({
              borders: borderDoubleBottom,
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `₱${Number(totalCapital).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, bold: true, font: docFontFamily })] })],
            }),
            new TableCell({
              borders: borderDoubleBottom,
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: '—', font: docFontFamily })] })],
            }),
            new TableCell({
              borders: borderDoubleBottom,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '—', font: docFontFamily })] })],
            }),
            new TableCell({
              borders: borderDoubleBottom,
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `₱${Number(totalRevenue).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, bold: true, font: docFontFamily })] })],
            }),
            new TableCell({
              borders: borderDoubleBottom,
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `₱${Number(netProfit).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, bold: true, font: docFontFamily })] })],
            }),
          ],
        })
      );

      sectionChildren = [
        ...pdmHeader,
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'PROJECT FINANCIAL PROPOSAL & FEASIBILITY PLAN', bold: true, size: 26, underline: {}, font: docFontFamily }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: `Event / Initiative: ${eventName || activityTitle} • ${targetDate}`, bold: true, size: 20, font: docFontFamily }),
          ],
        }),
        new Paragraph({ text: '' }),

        // Rationale & Objectives
        new Paragraph({
          children: [
            new TextRun({ text: 'I. ACTIVITY OBJECTIVES & RATIONALE', bold: true, size: 20, font: docFontFamily }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: objectives || '1. Promote student engagement.\n2. Generate operating funds for upcoming academic workshops.', font: docFontFamily }),
          ],
        }),
        new Paragraph({ text: '' }),

        // Product Budget Schedule
        new Paragraph({
          children: [
            new TextRun({ text: 'II. CONCESSION BUDGET & PROJECTED REVENUE SCHEDULE', bold: true, size: 20, font: docFontFamily }),
          ],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: proposalTableRows,
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [
            new TextRun({ text: `* Projected Return on Investment (ROI): ${marginPercent}% assuming 100% sell-through.`, italics: true, size: 18, font: docFontFamily }),
          ],
        }),
        new Paragraph({ text: '' }),

        // Signatories
        new Paragraph({
          children: [
            new TextRun({ text: 'III. INSTITUTIONAL APPROVAL ROUTING', bold: true, size: 20, font: docFontFamily }),
          ],
        }),
        new Paragraph({ text: '' }),
        ...createSignatoryTables(signatories, borderNone, 'PROPOSAL', includedSignatories),
      ];
    } else {
      // =========================================================================
      // AUTHENTIC 4-PAGE INSTITUTIONAL FINANCIAL REPORT ENGINE (PURE NODE.JS)
      // 100% cloud-compatible (Vercel, Render, AWS, Localhost without Python)
      // Matches templates/LITE-Financial-Report-Universal-Template.docx exactly.
      // =========================================================================

      const resolvedSemester = body.semester || defaultSemester;
      const resolvedAcademicYear = body.academicYear || defaultAcademicYear;
      const coordinatorName = body.coordinatorName || 'MS. LIGAYA H. ESTRELLA';
      const coordinatorRole = body.coordinatorRole || 'Co-curricular Affairs Coordinator';
      const coordinatorSalutation = body.coordinatorSalutation || 'Mrs. Estrella';
      const periodDesc = body.periodDesc || activityTitle || eventName || 'Financial Operations';
      const finalAsOf = body.finalAsOf || `As of ${transmittalDate}`;
      const includeCc = Boolean(body.include_cc ?? true);
      const ccRecipients = Array.isArray(body.cc_recipients) && body.cc_recipients.length > 0
        ? body.cc_recipients
        : ['cc: Co-Curricular', "cc: Dean's Office"];

      // Separate Inflows and Outflows authoritatively
      const derivedIncomeItems = (Array.isArray(body.income_items) && body.income_items.length > 0)
        ? body.income_items
        : authoritativeTransactions
            .filter((t) => t.type === 'INFLOW' && !/rollover|beginning/i.test(t.category_name || t.title || ''))
            .map((t) => ({ particulars: t.title || t.description || 'Income', desc: t.title || 'Income', amount: Number(t.amount || 0) }));

      const derivedExpenseItems = (Array.isArray(body.expense_items) && body.expense_items.length > 0)
        ? body.expense_items
        : authoritativeTransactions
            .filter((tx) => tx.type === 'OUTFLOW')
            .map((tx) => {
              const proxyNote = (tx.advanced_by_name && tx.reimbursement_recipient && tx.advanced_by_name !== tx.reimbursement_recipient)
                ? ` [Proxy: Paid by ${tx.advanced_by_name}, Claimed by ${tx.reimbursement_recipient}]`
                : '';
              return {
                particulars: `${tx.title || tx.description || 'Expense'}${proxyNote}`,
                desc: `${tx.title || 'Expense'}${proxyNote}`,
                amount: Number(tx.amount || 0),
              };
            });

      const initialBudget = Number(body.initial_budget ?? authoritativeSummary.initial_budget ?? 0);
      const totalIncome = derivedIncomeItems.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
      const totalFunds = initialBudget + totalIncome;
      const totalExpenses = derivedExpenseItems.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
      const cashOnHand = totalFunds - totalExpenses;

      // -------------------------------------------------------------
      // PAGE 1: OFFICIAL TRANSMITTAL LETTER
      // -------------------------------------------------------------
      const page1Elements = [
        ...pdmHeader,
        new Paragraph({
          children: [new TextRun({ text: transmittalDate, font: docFontFamily, size: docBaseSizeHalfPt })],
          spacing: { before: 240, after: 180 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `${coordinatorName}\n`, bold: true, font: docFontFamily, size: docBaseSizeHalfPt }),
            new TextRun({ text: `${coordinatorRole}\n`, font: docFontFamily, size: docBaseSizeHalfPt }),
            new TextRun({ text: 'This School', font: docFontFamily, size: docBaseSizeHalfPt }),
          ],
          spacing: { before: 180, after: 240 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `Dear ${coordinatorSalutation},`, font: docFontFamily, size: docBaseSizeHalfPt })],
          spacing: { before: 180, after: 180 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `This is to respectfully submit the attached “LITE Financial Report” for the ${resolvedSemester} Academic Year ${resolvedAcademicYear}.`,
              font: docFontFamily,
              size: docBaseSizeHalfPt,
            }),
          ],
          spacing: { before: 180, after: 240 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Respectfully,\n\n', font: docFontFamily, size: docBaseSizeHalfPt }),
            new TextRun({ text: 'LITE Officers', bold: true, font: docFontFamily, size: docBaseSizeHalfPt }),
          ],
          spacing: { before: 180, after: 240 },
        }),
        ...createSignatoryTables(signatories, borderNone, 'LIQUIDATION', includedSignatories),
        ...(includeCc ? [
          new Paragraph({
            children: ccRecipients.map((rec) => new TextRun({ text: `${rec}\n`, font: docFontFamily, size: docBaseSizeHalfPt, color: '333333' })),
            spacing: { before: 240, after: 120 },
          })
        ] : []),
        new Paragraph({ children: [new PageBreak()] }),
      ];

      // -------------------------------------------------------------
      // PAGE 2: INCOME SCHEDULE & TOTAL FUNDS AVAILABLE
      // -------------------------------------------------------------
      const incomeTableRows = [
        ...derivedIncomeItems.map((item) => new TableRow({
          children: [
            new TableCell({
              borders: borderNone,
              width: { size: 65, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: item.particulars || item.desc || 'Income Collection', font: docFontFamily })] })],
            }),
            new TableCell({
              borders: borderNone,
              width: { size: 35, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: `₱${(Number(item.amount) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, font: docFontFamily })],
                }),
              ],
            }),
          ],
        })),
        new TableRow({
          children: [
            new TableCell({
              borders: borderNone,
              width: { size: 65, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: 'Total Income:', bold: true, font: docFontFamily })] })],
            }),
            new TableCell({
              borders: borderSingleTop,
              width: { size: 35, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: `₱${totalIncome.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, bold: true, font: docFontFamily })],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              borders: borderNone,
              width: { size: 65, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: 'Total Funds Available:', bold: true, font: docFontFamily })] })],
            }),
            new TableCell({
              borders: borderNone,
              width: { size: 35, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: `₱${totalFunds.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, bold: true, font: docFontFamily })],
                }),
              ],
            }),
          ],
        }),
      ];

      const page2Elements = [
        ...pdmHeader,
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'LITE FINANCIAL REPORT\n', bold: true, size: 26, font: docFontFamily }),
            new TextRun({ text: `${resolvedSemester}\n`, bold: true, size: 22, font: docFontFamily }),
            new TextRun({ text: `ACADEMIC YEAR ${resolvedAcademicYear}\n\n`, bold: true, size: 22, font: docFontFamily }),
            new TextRun({ text: periodDesc, bold: true, size: 22, font: docFontFamily }),
          ],
          spacing: { before: 200, after: 240 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'INITIAL BUDGET / BEGINNING BALANCE (Carried over from prior semester)', bold: true, font: docFontFamily, size: docBaseSizeHalfPt }),
          ],
          spacing: { before: 160, after: 80 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  borders: borderNone,
                  width: { size: 65, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: 'Beginning Cash-on-Hand / Rollover Balance', font: docFontFamily })] })],
                }),
                new TableCell({
                  borders: borderNone,
                  width: { size: 35, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      children: [new TextRun({ text: `₱${initialBudget.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, bold: true, font: docFontFamily })],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'INCOME & COLLECTIONS:', bold: true, font: docFontFamily, size: docBaseSizeHalfPt }),
          ],
          spacing: { before: 200, after: 80 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: incomeTableRows,
        }),
        new Paragraph({ children: [new PageBreak()] }),
      ];

      // -------------------------------------------------------------
      // PAGE 3: MISCELLANEOUS OPERATING EXPENSES
      // -------------------------------------------------------------
      const expenseTableRows = [
        ...derivedExpenseItems.map((item) => new TableRow({
          children: [
            new TableCell({
              borders: borderNone,
              width: { size: 65, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: item.particulars || item.desc || 'Operating Expense', font: docFontFamily })] })],
            }),
            new TableCell({
              borders: borderNone,
              width: { size: 35, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: `₱${(Number(item.amount) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, font: docFontFamily })],
                }),
              ],
            }),
          ],
        })),
        new TableRow({
          children: [
            new TableCell({
              borders: borderNone,
              width: { size: 65, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: 'Total Expenses:', bold: true, font: docFontFamily })] })],
            }),
            new TableCell({
              borders: borderSingleTop,
              width: { size: 35, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: `₱${totalExpenses.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, bold: true, font: docFontFamily })],
                }),
              ],
            }),
          ],
        }),
      ];

      const page3Elements = [
        ...pdmHeader,
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'SCHEDULE OF DISBURSEMENTS / OPERATING EXPENSES\n', bold: true, size: 24, font: docFontFamily }),
            new TextRun({ text: 'Itemized Operating & Event Expenses', italics: true, size: 20, font: docFontFamily }),
          ],
          spacing: { before: 200, after: 200 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: expenseTableRows,
        }),
        new Paragraph({ children: [new PageBreak()] }),
      ];

      // -------------------------------------------------------------
      // PAGE 4: RECONCILIATION SUMMARY & FINAL SIGNATORIES
      // -------------------------------------------------------------
      const page4Elements = [
        ...pdmHeader,
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: finalAsOf, bold: true, size: docBaseSizeHalfPt, font: docFontFamily })],
          spacing: { before: 200, after: 240 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  borders: borderNone,
                  width: { size: 60, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: 'Total Funds', font: docFontFamily })] })],
                }),
                new TableCell({
                  borders: borderNone,
                  width: { size: 40, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `₱${totalFunds.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, font: docFontFamily })] })],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  borders: borderNone,
                  width: { size: 60, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: 'Total Expenses', font: docFontFamily })] })],
                }),
                new TableCell({
                  borders: borderSingleBottom,
                  width: { size: 40, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `₱${totalExpenses.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, font: docFontFamily })] })],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  borders: borderNone,
                  width: { size: 60, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: 'Cash on Hand', bold: true, font: docFontFamily })] })],
                }),
                new TableCell({
                  borders: borderNone,
                  width: { size: 40, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `₱${cashOnHand.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, bold: true, font: docFontFamily })] })],
                }),
              ],
            }),
          ],
        }),
        new Paragraph({ text: '', spacing: { before: 240, after: 120 } }),
        ...createSignatoryTables(signatories, borderNone, 'LIQUIDATION', includedSignatories),
      ];

      sectionChildren = [
        ...page1Elements,
        ...page2Elements,
        ...page3Elements,
        ...page4Elements,
      ];

      // Attached receipts if requested
      if (receiptsMode === 'APPEND' && receipts && receipts.length > 0) {
        sectionChildren.push(...createReceiptSheetsSection(receipts, resolvedAcademicYear, resolvedSemester, true));
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
                    new TextRun({ text: 'Page ', font: docFontFamily, size: 18, color: '555555' }),
                    new TextRun({ children: [PageNumber.CURRENT], font: docFontFamily, size: 18, color: '555555' }),
                    new TextRun({ text: ' of ', font: docFontFamily, size: 18, color: '555555' }),
                    new TextRun({ children: [PageNumber.TOTAL_PAGES], font: docFontFamily, size: 18, color: '555555' }),
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
