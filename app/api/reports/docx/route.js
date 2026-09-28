import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeightRule,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      type = 'LIQUIDATION',
      activityTitle = 'Club Week 2026',
      eventName = 'Club Week 2026',
      transmittalDate = 'October 14, 2026',
      datePrepared = 'October 14, 2026',
      proponentCommittee = 'League of Information Technology Enthusiasts (LITE)',
      venue = 'PDM Quadrangle',
      targetDate = 'Academic Year 2025–2026',
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
    } = body;

    // 1. If LIQUIDATION report, attempt exact institutional rendering via master template populator
    if (type === 'LIQUIDATION') {
      const templatePath = path.join(process.cwd(), 'templates', 'LITE-Financial-Report-Universal-Template.docx');
      const scriptPath = path.join(process.cwd(), 'scripts', 'export_report_engine.py');

      if (fs.existsSync(templatePath) && fs.existsSync(scriptPath)) {
        const tmpInput = path.join(os.tmpdir(), `finlite-in-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
        const tmpOutput = path.join(os.tmpdir(), `finlite-out-${Date.now()}-${Math.random().toString(36).slice(2)}.docx`);

        try {
          fs.writeFileSync(tmpInput, JSON.stringify(body), 'utf8');
          execFileSync('python', [scriptPath, tmpInput, tmpOutput], {
            timeout: 15000,
            windowsHide: true,
          });

          if (fs.existsSync(tmpOutput)) {
            const buffer = fs.readFileSync(tmpOutput);
            try { fs.unlinkSync(tmpInput); } catch (_) {}
            try { fs.unlinkSync(tmpOutput); } catch (_) {}

            const cleanFileName = `LITE-Financial-Report-${(body.academicYear || '2025-2026').replace(/[^a-zA-Z0-9]/g, '-')}.docx`;
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

    // Function to generate 1:1 PDM institutional signatory tables with strict borderless alignment
    function createSignatoryTables(signatories = {}, borderNone, docType = 'LIQUIDATION') {
      const presName = (signatories.presidentName || signatories.notedBy || 'EMANUEL MALBAROSA').toUpperCase();
      const presRole = signatories.presidentRole || signatories.notedRole || 'LITE President';
      const treasName = (signatories.treasurerName || signatories.preparedBy || 'ANDREI JOHN P. GERONIMO').toUpperCase();
      const treasRole = signatories.treasurerRole || signatories.preparedRole || 'LITE Treasurer';
      const audName = (signatories.auditorName || signatories.reviewedBy || 'CHRISTIAN REY C. KASILAG').toUpperCase();
      const audRole = signatories.auditorRole || signatories.reviewedRole || 'LITE Auditor';
      const adv1Name = (signatories.adviserName || signatories.adviser1 || 'MS. KIMBERLY DAWN JATULAN').toUpperCase();
      const adv2Name = (signatories.adviser2 || 'MS. KRIZIA MAE GENOVIA').toUpperCase();
      const advRole = signatories.adviserRole || 'LITE Club Advisers';
      const dirName = (signatories.directorName || 'JOVYLYN ORTIZ-CESAR, MBA, MSIT').toUpperCase();
      const dirRole = signatories.directorRole || 'Program Director, BSIT';
      const deanName = (signatories.deanName || 'DR. EMRAIDA MARIE M. MANUCOM').toUpperCase();
      const deanRole = signatories.deanRole || 'Dean, College of Computer Studies';

      if (docType === 'PROPOSAL') {
        const officersTable = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  borders: borderNone,
                  width: { size: 33, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({ children: [new TextRun({ text: 'Prepared by:\n\n\n', font: 'Calibri' })] }),
                    new Paragraph({ children: [new TextRun({ text: treasName, bold: true, font: 'Calibri' })] }),
                    new Paragraph({ children: [new TextRun({ text: treasRole, italics: true, font: 'Calibri' })] }),
                  ],
                }),
                new TableCell({
                  borders: borderNone,
                  width: { size: 34, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({ children: [new TextRun({ text: 'Audited & Verified by:\n\n\n', font: 'Calibri' })] }),
                    new Paragraph({ children: [new TextRun({ text: audName, bold: true, font: 'Calibri' })] }),
                    new Paragraph({ children: [new TextRun({ text: audRole, italics: true, font: 'Calibri' })] }),
                  ],
                }),
                new TableCell({
                  borders: borderNone,
                  width: { size: 33, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({ children: [new TextRun({ text: 'Noted by:\n\n\n', font: 'Calibri' })] }),
                    new Paragraph({ children: [new TextRun({ text: presName, bold: true, font: 'Calibri' })] }),
                    new Paragraph({ children: [new TextRun({ text: presRole, italics: true, font: 'Calibri' })] }),
                  ],
                }),
              ],
            }),
          ],
        });

        const adminTable = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  borders: borderNone,
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({ children: [new TextRun({ text: 'Recommending Approval:\n\n\n', font: 'Calibri' })] }),
                    new Paragraph({ children: [new TextRun({ text: dirName, bold: true, font: 'Calibri' })] }),
                    new Paragraph({ children: [new TextRun({ text: dirRole, italics: true, font: 'Calibri' })] }),
                  ],
                }),
                new TableCell({
                  borders: borderNone,
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({ children: [new TextRun({ text: 'Approved by:\n\n\n', font: 'Calibri' })] }),
                    new Paragraph({ children: [new TextRun({ text: deanName, bold: true, font: 'Calibri' })] }),
                    new Paragraph({ children: [new TextRun({ text: deanRole, italics: true, font: 'Calibri' })] }),
                  ],
                }),
              ],
            }),
          ],
        });

        return [officersTable, new Paragraph({ text: '' }), adminTable];
      }

      // Liquidation Report 3-Tier Tables
      const studentTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: borderNone,
                width: { size: 33, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({ children: [new TextRun({ text: 'Prepared by:\n\n\n', font: 'Calibri' })] }),
                  new Paragraph({ children: [new TextRun({ text: presName, bold: true, font: 'Calibri' })] }),
                  new Paragraph({ children: [new TextRun({ text: presRole, italics: true, font: 'Calibri' })] }),
                ],
              }),
              new TableCell({
                borders: borderNone,
                width: { size: 34, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({ children: [new TextRun({ text: '\n\n\n', font: 'Calibri' })] }),
                  new Paragraph({ children: [new TextRun({ text: treasName, bold: true, font: 'Calibri' })] }),
                  new Paragraph({ children: [new TextRun({ text: treasRole, italics: true, font: 'Calibri' })] }),
                ],
              }),
              new TableCell({
                borders: borderNone,
                width: { size: 33, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({ children: [new TextRun({ text: '\n\n\n', font: 'Calibri' })] }),
                  new Paragraph({ children: [new TextRun({ text: audName, bold: true, font: 'Calibri' })] }),
                  new Paragraph({ children: [new TextRun({ text: audRole, italics: true, font: 'Calibri' })] }),
                ],
              }),
            ],
          }),
        ],
      });

      const adviserTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: borderNone,
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({ children: [new TextRun({ text: 'Approved by:\n\n\n', font: 'Calibri' })] }),
                  new Paragraph({ children: [new TextRun({ text: adv1Name, bold: true, font: 'Calibri' })] }),
                  new Paragraph({ children: [new TextRun({ text: advRole, italics: true, font: 'Calibri' })] }),
                ],
              }),
              new TableCell({
                borders: borderNone,
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({ children: [new TextRun({ text: '\n\n\n', font: 'Calibri' })] }),
                  new Paragraph({ children: [new TextRun({ text: adv2Name, bold: true, font: 'Calibri' })] }),
                  new Paragraph({ children: [new TextRun({ text: advRole, italics: true, font: 'Calibri' })] }),
                ],
              }),
            ],
          }),
        ],
      });

      const adminTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: borderNone,
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({ children: [new TextRun({ text: 'Noted by:\n\n\n', font: 'Calibri' })] }),
                  new Paragraph({ children: [new TextRun({ text: dirName, bold: true, font: 'Calibri' })] }),
                  new Paragraph({ children: [new TextRun({ text: dirRole, italics: true, font: 'Calibri' })] }),
                ],
              }),
              new TableCell({
                borders: borderNone,
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({ children: [new TextRun({ text: '\n\n\n', font: 'Calibri' })] }),
                  new Paragraph({ children: [new TextRun({ text: deanName, bold: true, font: 'Calibri' })] }),
                  new Paragraph({ children: [new TextRun({ text: deanRole, italics: true, font: 'Calibri' })] }),
                ],
              }),
            ],
          }),
        ],
      });

      return [studentTable, new Paragraph({ text: '' }), adviserTable, new Paragraph({ text: '' }), adminTable];
    }

    let sectionChildren = [];

    if (type === 'PROPOSAL') {
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
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Unit Cost', bold: true, font: 'Calibri' })] })],
              width: { size: 15, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              borders: borderSingle,
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Selling Price', bold: true, font: 'Calibri' })] })],
              width: { size: 15, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              borders: borderSingle,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Units', bold: true, font: 'Calibri' })] })],
              width: { size: 10, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              borders: borderSingle,
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Gross (₱)', bold: true, font: 'Calibri' })] })],
              width: { size: 12, type: WidthType.PERCENTAGE },
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
            new TextRun({ text: 'ACTIVITY & BUSINESS PROPOSAL', bold: true, size: 26, underline: {}, font: 'Calibri' }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: `${activityTitle} • ${targetDate}`, bold: true, size: 20, font: 'Calibri' }),
          ],
        }),
        new Paragraph({ text: '' }),

        // Metadata block
        new Paragraph({
          children: [
            new TextRun({ text: `Date Prepared: `, bold: true, font: 'Calibri' }),
            new TextRun({ text: `${datePrepared || transmittalDate}\n`, font: 'Calibri' }),
            new TextRun({ text: `Proponent Committee: `, bold: true, font: 'Calibri' }),
            new TextRun({ text: `${proponentCommittee}\n`, font: 'Calibri' }),
            new TextRun({ text: `Target Schedule: `, bold: true, font: 'Calibri' }),
            new TextRun({ text: `${targetDate}\n`, font: 'Calibri' }),
            new TextRun({ text: `Target Venue: `, bold: true, font: 'Calibri' }),
            new TextRun({ text: `${venue}`, font: 'Calibri' }),
          ],
        }),
        new Paragraph({ text: '' }),

        // Objectives
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
        ...createSignatoryTables(signatories, borderNone, 'PROPOSAL'),
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
              width: { size: 50, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              borders: borderSingle,
              children: [new Paragraph({ children: [new TextRun({ text: 'Category', bold: true, font: 'Calibri' })] })],
              width: { size: 20, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              borders: borderSingle,
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Amount (₱)', bold: true, font: 'Calibri' })] })],
              width: { size: 15, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
      ];

      transactions.forEach((tx) => {
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({
                borders: borderNone,
                children: [new Paragraph({ children: [new TextRun({ text: tx.transaction_date || '', font: 'Calibri' })] })],
              }),
              new TableCell({
                borders: borderNone,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: tx.title || '', font: 'Calibri' }),
                      tx.is_reimbursement ? new TextRun({ text: ` [Advance: ${tx.reimbursement_recipient}]`, italics: true, font: 'Calibri' }) : new TextRun(''),
                    ],
                  }),
                ],
              }),
              new TableCell({
                borders: borderNone,
                children: [new Paragraph({ children: [new TextRun({ text: tx.category_name || (tx.type === 'INFLOW' ? 'Revenue' : 'Expense'), font: 'Calibri' })] })],
              }),
              new TableCell({
                borders: borderNone,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new TextRun({
                        text: `${tx.type === 'INFLOW' ? '+' : '-'}${Number(tx.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
                        font: 'Calibri',
                      }),
                    ],
                  }),
                ],
              }),
            ],
          })
        );
      });

      // Total Closing Row
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              borders: borderDoubleBottom,
              children: [new Paragraph({ children: [new TextRun({ text: 'CLOSING CASH-ON-HAND', bold: true, font: 'Calibri' })] })],
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
            new TextRun({ text: `Activity / Event: ${activityTitle || eventName} • Academic Year 2025–2026`, bold: true, size: 20, font: 'Calibri' }),
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
        ...createSignatoryTables(signatories, borderNone, 'LIQUIDATION'),
      ];
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: sectionChildren,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const cleanPrefix = type === 'PROPOSAL' ? 'FinLITE-Proposal' : 'FinLITE-Liquidation';
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
  }
}
