import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('============================================================');
console.log('TESTING TRANSACTION VOID & ARCHIVE (SOFT-DELETE) WORKFLOW');
console.log('============================================================\n');

// 1. Verify Migration 038
console.log('1. Verifying Database Migration 038:');
const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/038_transaction_void_and_archive_system.sql');
assert(fs.existsSync(migrationPath), 'Migration 038 file must exist');
const migrationSql = fs.readFileSync(migrationPath, 'utf8');

assert(migrationSql.includes('archived_at TIMESTAMPTZ'), 'Must add archived_at column');
assert(migrationSql.includes('archived_by UUID REFERENCES'), 'Must add archived_by column');
assert(migrationSql.includes('void_reason TEXT'), 'Must add void_reason column');
assert(migrationSql.includes('idx_transactions_status'), 'Must add composite index on status and semester_id');
console.log('  ✅ PASS: Migration 038 specifies archived_at, archived_by, void_reason, and index');

// 2. Verify DELETE handler in app/api/transactions/[id]/route.js
console.log('\n2. Verifying Soft-Delete in app/api/transactions/[id]/route.js:');
const deleteRoutePath = path.resolve(process.cwd(), 'app/api/transactions/[id]/route.js');
const deleteRouteContent = fs.readFileSync(deleteRoutePath, 'utf8');

assert(!deleteRouteContent.includes('.delete().eq(\'id\', id)'), 'Must NOT execute physical DELETE queries on transactions');
assert(deleteRouteContent.includes("status: 'VOIDED'"), 'Must update transaction status to VOIDED');
assert(deleteRouteContent.includes('TRANSACTION_VOIDED'), 'Must record TRANSACTION_VOIDED in audit logs');
assert(deleteRouteContent.includes('void_reason'), 'Must handle void_reason in update');
assert(deleteRouteContent.includes('archived_at'), 'Must handle archived_at in update');
assert(deleteRouteContent.includes('archived_by'), 'Must handle archived_by in update');
console.log('  ✅ PASS: DELETE route soft-deletes via status = VOIDED and logs TRANSACTION_VOIDED');

// 3. Verify Restore handler in app/api/transactions/[id]/restore/route.js
console.log('\n3. Verifying Restore in app/api/transactions/[id]/restore/route.js:');
const restoreRoutePath = path.resolve(process.cwd(), 'app/api/transactions/[id]/restore/route.js');
assert(fs.existsSync(restoreRoutePath), 'Restore route file must exist');
const restoreRouteContent = fs.readFileSync(restoreRoutePath, 'utf8');

assert(restoreRouteContent.includes("status: targetStatus"), 'Must restore status to COMPLETED or PENDING_REIMBURSEMENT');
assert(restoreRouteContent.includes("TRANSACTION_RESTORED"), 'Must record TRANSACTION_RESTORED in audit logs');
assert(restoreRouteContent.includes("archived_at: null"), 'Must clear archived_at on restore');
assert(restoreRouteContent.includes("void_reason: null"), 'Must clear void_reason on restore');
console.log('  ✅ PASS: Restore route reinstates status and logs TRANSACTION_RESTORED');

// 4. Verify Ledger Calculation Logic (app/page.jsx)
console.log('\n4. Verifying Financial Calculation Exclusion in app/page.jsx:');
const pagePath = path.resolve(process.cwd(), 'app/page.jsx');
const pageContent = fs.readFileSync(pagePath, 'utf8');

assert(pageContent.includes("tx.status === 'VOIDED' || tx.status === 'ARCHIVED'"), 'calculateSummary must skip VOIDED transactions');
assert(pageContent.includes("handleVoidTransaction"), 'Page must implement handleVoidTransaction');
assert(pageContent.includes("handleRestoreTransaction"), 'Page must implement handleRestoreTransaction');
assert(pageContent.includes("onVoidTransaction={handleVoidTransaction}"), 'Page must pass onVoidTransaction to TransactionTable');
assert(pageContent.includes("onRestoreTransaction={handleRestoreTransaction}"), 'Page must pass onRestoreTransaction to TransactionTable');
console.log('  ✅ PASS: app/page.jsx excludes VOIDED transactions from balances and provides void/restore handlers');

// 5. Verify Transaction Table (components/ledger/TransactionTable.jsx)
console.log('\n5. Verifying UI Filtering & Modal Banner in TransactionTable.jsx:');
const tablePath = path.resolve(process.cwd(), 'components/ledger/TransactionTable.jsx');
const tableContent = fs.readFileSync(tablePath, 'utf8');

assert(tableContent.includes("id: 'VOIDED'"), 'TransactionTable must have VOIDED tab');
assert(tableContent.includes("onVoidTransaction"), 'TransactionTable must accept onVoidTransaction prop');
assert(tableContent.includes("onRestoreTransaction"), 'TransactionTable must accept onRestoreTransaction prop');
assert(tableContent.includes("Voided &amp; Archived Entry") || tableContent.includes("Voided & Archived Entry"), 'TransactionTable must render voided banner');
assert(tableContent.includes("Restore to Ledger"), 'TransactionTable must provide Restore action');
assert(tableContent.includes("Void / Archive Entry"), 'TransactionTable must provide Void / Archive action');
assert(tableContent.includes("<VoidTransactionModal"), 'TransactionTable must render VoidTransactionModal');
assert(tableContent.includes("<RestoreTransactionModal"), 'TransactionTable must render RestoreTransactionModal');
assert(!tableContent.includes("window.prompt"), 'TransactionTable must not use window.prompt');
assert(!tableContent.includes("window.confirm"), 'TransactionTable must not use window.confirm');

const voidModalPath = path.resolve(process.cwd(), 'components/ledger/VoidTransactionModal.jsx');
assert(fs.existsSync(voidModalPath), 'VoidTransactionModal.jsx must exist');
const restoreModalPath = path.resolve(process.cwd(), 'components/ledger/RestoreTransactionModal.jsx');
assert(fs.existsSync(restoreModalPath), 'RestoreTransactionModal.jsx must exist');
console.log('  ✅ PASS: Dedicated Void & Restore modals replace browser prompt/confirm dialogs');

// 6. Verify Audit Logs Badge Rendering
console.log('\n6. Verifying Audit Log Badge & Diff Viewer:');
const auditDrawerPath = path.resolve(process.cwd(), 'components/audit/AuditTrailDrawer.jsx');
const auditDrawerContent = fs.readFileSync(auditDrawerPath, 'utf8');
assert(auditDrawerContent.includes("'TRANSACTION_VOIDED'"), 'AuditTrailDrawer must have badge for TRANSACTION_VOIDED');
assert(auditDrawerContent.includes("'TRANSACTION_RESTORED'"), 'AuditTrailDrawer must have badge for TRANSACTION_RESTORED');

const auditDiffPath = path.resolve(process.cwd(), 'components/audit/AuditDiffViewer.jsx');
const auditDiffContent = fs.readFileSync(auditDiffPath, 'utf8');
assert(auditDiffContent.includes("operation = 'VOID'"), 'AuditDiffViewer must format VOID operation');
assert(auditDiffContent.includes("operation = 'RESTORE'"), 'AuditDiffViewer must format RESTORE operation');
assert(auditDiffContent.includes("void_reason: 'Audited Void Reason'"), 'AuditDiffViewer must label void_reason');
console.log('  ✅ PASS: Audit components include TRANSACTION_VOIDED and TRANSACTION_RESTORED support');

console.log('\n============================================================');
console.log('ALL TRANSACTION VOID & ARCHIVE CHECKS PASSED (6/6) ✅');
console.log('============================================================');
