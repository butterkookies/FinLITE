/**
 * Test script to verify docx report generation logic
 */
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle
} from 'docx';
import fs from 'fs';

async function testDocx() {
  console.log('Testing DOCX Generation...');
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: 'PAMBAYANG DALUBHASAAN NG MARILAO - FINLITE LIQUIDATION',
              bold: true,
              size: 24,
              font: 'Times New Roman'
            })
          ]
        })
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync('exports/test-verification.docx', buffer);
  console.log(`✅ Verified: DOCX generated successfully (${buffer.length} bytes)`);
}

testDocx().catch(err => {
  console.error('❌ DOCX Generation failed:', err);
  process.exit(1);
});
