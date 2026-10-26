/**
 * FinLITE Supabase Live Data Extractor
 * Connects to live Supabase PostgreSQL via Service Role Key (bypassing RLS),
 * extracts all 18 production tables and their live data,
 * and outputs:
 * 1. Individual CSV files in ./supabase_dump/csv/
 * 2. Full JSON dump in ./supabase_dump/all_tables.json
 * 3. Excel-ready TSV block in ./supabase_dump/3NF_LIVE_EXCEL_PASTE.tsv (ready for FormatAll3NFTables)
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// 1. Load environment variables from .env.local
const envPath = path.resolve('.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local not found!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Supabase credentials missing from .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// 2. The 18 Canonical Tables in Logical Dependency Order
const TABLES = [
  'profiles',
  'registration_requests',
  'auth_security_state',
  'email_verification_otps',
  'semesters',
  'semester_signatories',
  'categories',
  'transactions',
  'transaction_receipts',
  'transaction_comments',
  'advances_payable',
  'advance_disbursements',
  'advance_receipts',
  'debts_receivables',
  'debt_payments',
  'denominations',
  'cash_reconciliations',
  'cash_reconciliation_items'
];

function sanitizeValue(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    return JSON.stringify(val);
  }
  return String(val);
}

function toCsvRow(values) {
  return values.map(v => {
    const str = sanitizeValue(v);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }).join(',');
}

function toTsvRow(values) {
  return values.map(v => {
    let str = sanitizeValue(v);
    str = str.replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
    return str;
  }).join('\t');
}

async function runExtraction() {
  console.log(`🚀 Connecting to Supabase: ${supabaseUrl}`);
  const dumpDir = path.resolve('supabase_dump');
  const csvDir = path.join(dumpDir, 'csv');

  if (!fs.existsSync(dumpDir)) fs.mkdirSync(dumpDir, { recursive: true });
  if (!fs.existsSync(csvDir)) fs.mkdirSync(csvDir, { recursive: true });

  const allData = {};
  const tsvBlocks = [];

  console.log(`\n📦 Extracting all 18 tables...\n`);

  for (let idx = 0; idx < TABLES.length; idx++) {
    const table = TABLES[idx];
    const tableNum = idx + 1;
    const tableTitle = `TABLE ${tableNum}: ${table.toUpperCase()}`;

    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.warn(`⚠️ Warning fetching ${table}: ${error.message}`);
        allData[table] = [];
        continue;
      }

      allData[table] = data || [];
      const rowCount = data ? data.length : 0;
      console.log(`  ✓ [${String(tableNum).padStart(2, ' ')}/18] ${table.padEnd(28, ' ')} : ${rowCount} rows`);

      if (data && data.length > 0) {
        const headers = Object.keys(data[0]);

        // Write CSV
        const csvLines = [headers.join(',')];
        for (const row of data) {
          csvLines.push(toCsvRow(headers.map(h => row[h])));
        }
        fs.writeFileSync(path.join(csvDir, `${table}.csv`), csvLines.join('\n'), 'utf-8');

        // Build TSV block for Excel
        const tsvLines = [tableTitle];
        tsvLines.push(headers.join('\t'));
        for (const row of data) {
          tsvLines.push(toTsvRow(headers.map(h => row[h])));
        }
        tsvBlocks.push(tsvLines.join('\n'));
      } else {
        // Write empty CSV with note
        fs.writeFileSync(path.join(csvDir, `${table}.csv`), 'NO_DATA\n', 'utf-8');
        tsvBlocks.push(`${tableTitle}\n(Table is currently empty in live database)`);
      }
    } catch (err) {
      console.error(`❌ Error querying ${table}: ${err.message}`);
    }
  }

  // Save all_tables.json
  const jsonPath = path.join(dumpDir, 'all_tables.json');
  fs.writeFileSync(jsonPath, JSON.stringify(allData, null, 2), 'utf-8');

  // Save 3NF_LIVE_EXCEL_PASTE.tsv (spaced by 2 newlines)
  const tsvPath = path.join(dumpDir, '3NF_LIVE_EXCEL_PASTE.tsv');
  fs.writeFileSync(tsvPath, tsvBlocks.join('\n\n\n'), 'utf-8');

  console.log(`\n🎉 Extraction Complete!`);
  console.log(`📁 Files generated in: ${dumpDir}`);
  console.log(`   1. Individual CSVs:    ${csvDir}`);
  console.log(`   2. Full JSON Dump:     ${jsonPath}`);
  console.log(`   3. Excel Paste (TSV):  ${tsvPath}`);
}

runExtraction();
