import { NextResponse } from 'next/server';
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
    const { summary = {}, transactions = [], eventName = 'Club Week 2026' } = await req.json();

    const borderNone = {
      top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    };

    const borderSingle = {
      top: { style: BorderStyle.SINGLE, size: 4, color: '999999' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '999999' },
      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    };

    // Build Transaction Rows
    const tableRows = [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            borders: borderSingle,
            children: [new Paragraph({ children: [new TextRun({ text: 'Date', bold: true, font: 'Times New Roman' })] })],
            width: { size: 15, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            borders: borderSingle,
            children: [new Paragraph({ children: [new TextRun({ text: 'Particulars / Description', bold: true, font: 'Times New Roman' })] })],
            width: { size: 50, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            borders: borderSingle,
            children: [new Paragraph({ children: [new TextRun({ text: 'Category', bold: true, font: 'Times New Roman' })] })],
            width: { size: 20, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            borders: borderSingle,
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Amount (₱)', bold: true, font: 'Times New Roman' })] })],
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
              children: [new Paragraph({ children: [new TextRun({ text: tx.transaction_date || '', font: 'Times New Roman' })] })],
            }),
            new TableCell({
              borders: borderNone,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: tx.title || '', font: 'Times New Roman' }),
                    tx.is_reimbursement ? new TextRun({ text: ` [Advance: ${tx.reimbursement_recipient}]`, italics: true, font: 'Times New Roman' }) : new TextRun(''),
                  ],
                }),
              ],
            }),
            new TableCell({
              borders: borderNone,
              children: [new Paragraph({ children: [new TextRun({ text: tx.category_name || (tx.type === 'INFLOW' ? 'Revenue' : 'Expense'), font: 'Times New Roman' })] })],
            }),
            new TableCell({
              borders: borderNone,
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({
                      text: `${tx.type === 'INFLOW' ? '+' : '-'}${Number(tx.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
                      font: 'Times New Roman',
                    }),
                  ],
                }),
              ],
            }),
          ],
        })
      );
    });

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // PDM Header
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'PAMBAYANG DALUBHASAAN NG MARILAO', bold: true, size: 24, font: 'Times New Roman' }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'COLLEGE OF COMPUTER STUDIES', size: 20, font: 'Times New Roman' }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'LEAGUE OF INFORMATION TECHNOLOGY ENTHUSIASTS (LITE)', bold: true, size: 22, font: 'Times New Roman' }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Abangan Norte, Marilao, Bulacan', italics: true, size: 18, font: 'Times New Roman' }),
              ],
            }),
            new Paragraph({ text: '' }), // Spacer

            // Document Title
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'FORMAL FINANCIAL LIQUIDATION REPORT', bold: true, size: 26, underline: {}, font: 'Times New Roman' }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: `Activity / Event: ${eventName} • Academic Year 2025–2026`, bold: true, size: 20, font: 'Times New Roman' }),
              ],
            }),
            new Paragraph({ text: '' }),

            // Financial Summary Block
            new Paragraph({
              children: [
                new TextRun({ text: 'I. EXECUTIVE FINANCIAL SUMMARY', bold: true, size: 20, font: 'Times New Roman' }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `Total Inflows (Revenue): ₱${(summary.total_inflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n`, font: 'Times New Roman' }),
                new TextRun({ text: `Total Outflows (Disbursements): ₱${(summary.total_outflows || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n`, font: 'Times New Roman' }),
                new TextRun({ text: `Net Balance Remaining: ₱${((summary.total_inflows || 0) - (summary.total_outflows || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n`, font: 'Times New Roman', bold: true }),
                new TextRun({ text: `Physical Cash-on-Hand: ₱${(summary.cash_on_hand || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n`, font: 'Times New Roman' }),
                new TextRun({ text: `Pending Advances (Abono): ₱${(summary.pending_reimbursements || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, font: 'Times New Roman' }),
              ],
            }),
            new Paragraph({ text: '' }),

            // Itemized Transactions Table
            new Paragraph({
              children: [
                new TextRun({ text: 'II. ITEMIZED SCHEDULE OF INFLOWS & DISBURSEMENTS', bold: true, size: 20, font: 'Times New Roman' }),
              ],
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: tableRows,
            }),
            new Paragraph({ text: '' }),

            // Institutional Routing & Signatories Hierarchy
            new Paragraph({
              children: [
                new TextRun({ text: 'III. INSTITUTIONAL ROUTING & SIGNATORIES', bold: true, size: 20, font: 'Times New Roman' }),
              ],
            }),
            new Paragraph({ text: '' }),

            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      borders: borderNone,
                      children: [
                        new Paragraph({ children: [new TextRun({ text: 'Prepared by:\n\n\n', font: 'Times New Roman' })] }),
                        new Paragraph({ children: [new TextRun({ text: 'ANDREI JOHN P. GERONIMO', bold: true, font: 'Times New Roman' })] }),
                        new Paragraph({ children: [new TextRun({ text: 'LITE Treasurer', italics: true, font: 'Times New Roman' })] }),
                      ],
                    }),
                    new TableCell({
                      borders: borderNone,
                      children: [
                        new Paragraph({ children: [new TextRun({ text: 'Audited & Verified by:\n\n\n', font: 'Times New Roman' })] }),
                        new Paragraph({ children: [new TextRun({ text: 'CHRISTIAN REY C. KASILAG', bold: true, font: 'Times New Roman' })] }),
                        new Paragraph({ children: [new TextRun({ text: 'LITE Auditor', italics: true, font: 'Times New Roman' })] }),
                      ],
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      borders: borderNone,
                      children: [
                        new Paragraph({ children: [new TextRun({ text: '\n\nNoted by:\n\n\n', font: 'Times New Roman' })] }),
                        new Paragraph({ children: [new TextRun({ text: 'EMANUEL MALBAROSA', bold: true, font: 'Times New Roman' })] }),
                        new Paragraph({ children: [new TextRun({ text: 'LITE President', italics: true, font: 'Times New Roman' })] }),
                      ],
                    }),
                    new TableCell({
                      borders: borderNone,
                      children: [
                        new Paragraph({ children: [new TextRun({ text: '\n\nApproved by:\n\n\n', font: 'Times New Roman' })] }),
                        new Paragraph({ children: [new TextRun({ text: 'MS. KIMBERLY DAWN JATULAN', bold: true, font: 'Times New Roman' })] }),
                        new Paragraph({ children: [new TextRun({ text: 'MS. KRIZIA MAE GENOVIA', bold: true, font: 'Times New Roman' })] }),
                        new Paragraph({ children: [new TextRun({ text: 'LITE Club Advisers', italics: true, font: 'Times New Roman' })] }),
                      ],
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      borders: borderNone,
                      children: [
                        new Paragraph({ children: [new TextRun({ text: '\n\nEndorsed by:\n\n\n', font: 'Times New Roman' })] }),
                        new Paragraph({ children: [new TextRun({ text: 'JOVYLYN ORTIZ-CESAR, MBA, MSIT', bold: true, font: 'Times New Roman' })] }),
                        new Paragraph({ children: [new TextRun({ text: 'Program Director, BSIT', italics: true, font: 'Times New Roman' })] }),
                      ],
                    }),
                    new TableCell({
                      borders: borderNone,
                      children: [
                        new Paragraph({ children: [new TextRun({ text: '\n\nFinal Approval:\n\n\n', font: 'Times New Roman' })] }),
                        new Paragraph({ children: [new TextRun({ text: 'DR. EMRAIDA MARIE M. MANUCOM', bold: true, font: 'Times New Roman' })] }),
                        new Paragraph({ children: [new TextRun({ text: 'Dean, College of Computer Studies', italics: true, font: 'Times New Roman' })] }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename=FinLITE-Liquidation-${eventName.replace(/\s+/g, '-')}.docx`,
      },
    });
  } catch (err) {
    console.error('DOCX Export Error:', err);
    return NextResponse.json({ error: 'Failed to generate Word report' }, { status: 500 });
  }
}
