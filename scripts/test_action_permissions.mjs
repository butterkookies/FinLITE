/**
 * Targeted Verification Suite for Action Permissions & UI Indicators
 * Tests:
 * 1. resolveUserPermissions logic: role defaults, custom overrides (including admin), and super admin bypass
 * 2. hasPermission helper behavior across roles and custom overrides
 * 3. Server-side route authorization:
 *    - /api/reports/docx (export_reports action guard)
 *    - /api/reconciliation (cash_reconciliation action guard)
 * 4. Static AST/Content audits on UI components:
 *    - app/page.jsx (Hero Pods & /api/reconciliation wiring)
 *    - components/layout/BottomNav.jsx (Record & Cash Box disabled states)
 *    - components/ledger/NewTransactionModal.jsx (canAbono, submit lock, banner)
 *    - components/reconciliation/DenominationCounter.jsx (Read-only banner, inputs, buttons)
 *    - components/ledger/TransactionTable.jsx (Header, detail sheet, row dropdown menu)
 *    - components/reports/DocumentPreviewModal.jsx (DOCX export buttons locked)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ACTION_KEYS,
  ROLE_DEFAULT_PERMISSIONS,
  resolveUserPermissions,
  hasPermission,
} from '../lib/auth/permissions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('============================================================');
console.log('TESTING ACTION PERMISSIONS & UI INDICATORS INTEGRITY');
console.log('============================================================\n');

// --- 1. Unit Testing: resolveUserPermissions & hasPermission ---
console.log('1. Testing resolveUserPermissions and hasPermission:');

// 1.1 Standard Treasurer Defaults
const treasurerDefaults = resolveUserPermissions({ role: 'treasurer' });
assert(treasurerDefaults[ACTION_KEYS.RECORD_INFLOW] === true, 'Treasurer can record inflow by default');
assert(treasurerDefaults[ACTION_KEYS.RECORD_OUTFLOW] === true, 'Treasurer can record outflow by default');
assert(treasurerDefaults[ACTION_KEYS.RECORD_ABONO] === true, 'Treasurer can record abono by default');
assert(treasurerDefaults[ACTION_KEYS.EDIT_TRANSACTION] === false, 'Treasurer cannot edit transactions by default');
assert(treasurerDefaults[ACTION_KEYS.AUDIT_APPROVE] === false, 'Treasurer cannot audit approve by default');
assert(treasurerDefaults[ACTION_KEYS.DELETE_TRANSACTION] === false, 'Treasurer cannot delete by default');

// 1.2 Custom Permissions on Non-Admin (Treasurer with disabled record_inflow)
const restrictedTreasurer = resolveUserPermissions({
  role: 'treasurer',
  permissions: {
    [ACTION_KEYS.RECORD_INFLOW]: false,
    [ACTION_KEYS.RECORD_ABONO]: false,
  },
});
assert(restrictedTreasurer[ACTION_KEYS.RECORD_INFLOW] === false, 'Restricted treasurer has record_inflow=false');
assert(restrictedTreasurer[ACTION_KEYS.RECORD_ABONO] === false, 'Restricted treasurer has record_abono=false');
assert(restrictedTreasurer[ACTION_KEYS.RECORD_OUTFLOW] === true, 'Restricted treasurer retains record_outflow=true');

// 1.3 Admin Custom Permissions (CRITICAL FIX: Admin must respect custom restrictions!)
const restrictedAdmin = resolveUserPermissions({
  role: 'admin',
  email: 'officer_admin@pdm.edu.ph', // standard admin email
  permissions: {
    [ACTION_KEYS.RECORD_INFLOW]: false,
    [ACTION_KEYS.DELETE_TRANSACTION]: false,
    [ACTION_KEYS.CASH_RECONCILIATION]: false,
  },
});

assert(restrictedAdmin[ACTION_KEYS.RECORD_INFLOW] === false, 'Admin with custom record_inflow=false is strictly disabled');
assert(restrictedAdmin[ACTION_KEYS.DELETE_TRANSACTION] === false, 'Admin with custom delete_transaction=false is strictly disabled');
assert(restrictedAdmin[ACTION_KEYS.CASH_RECONCILIATION] === false, 'Admin with custom cash_reconciliation=false is strictly disabled');
assert(restrictedAdmin[ACTION_KEYS.AUDIT_APPROVE] === true, 'Admin retains unmodified default audit_approve=true');

// 1.4 Super Admin Absolute Wildcard Bypass
const superAdminEmail = 'geronimoandreijohn.pdm@gmail.com';
const superAdminPermissions = resolveUserPermissions({
  role: 'admin',
  email: superAdminEmail,
  permissions: {
    [ACTION_KEYS.RECORD_INFLOW]: false,
    [ACTION_KEYS.DELETE_TRANSACTION]: false,
  },
});

assert(superAdminPermissions[ACTION_KEYS.RECORD_INFLOW] === true, 'Super Admin retains record_inflow bypass');
assert(superAdminPermissions[ACTION_KEYS.DELETE_TRANSACTION] === true, 'Super Admin retains delete_transaction bypass');
assert(hasPermission(superAdminPermissions, ACTION_KEYS.DELETE_TRANSACTION, superAdminEmail) === true, 'hasPermission grants Super Admin wildcard bypass');

// 1.5 hasPermission helper verification
const testProfile = {
  role: 'treasurer',
  email: 'treasurer@pdm.edu.ph',
  permissions: {
    [ACTION_KEYS.RECORD_INFLOW]: false,
    [ACTION_KEYS.EDIT_TRANSACTION]: true,
  },
};
assert(hasPermission(testProfile, ACTION_KEYS.RECORD_INFLOW) === false, 'hasPermission returns false for disabled custom permission');
assert(hasPermission(testProfile, ACTION_KEYS.EDIT_TRANSACTION) === true, 'hasPermission returns true for granted custom permission');
assert(hasPermission(testProfile, ACTION_KEYS.RECORD_OUTFLOW) === true, 'hasPermission falls back to role default true');

// --- 2. Backend Route Guard Audit ---
console.log('\n2. Auditing Backend Route Permission Guards:');

// 2.1 DOCX Export Route
const docxRoute = fs.readFileSync(path.join(projectRoot, 'app/api/reports/docx/route.js'), 'utf-8');
assert(docxRoute.includes("ACTION_KEYS.EXPORT_REPORTS"), 'app/api/reports/docx guards against ACTION_KEYS.EXPORT_REPORTS');
assert(docxRoute.includes("fetchProfileWithPermissions"), 'app/api/reports/docx fetches profile with permissions');
assert(docxRoute.includes("hasPermission"), 'app/api/reports/docx calls hasPermission');
assert(docxRoute.includes("403"), 'app/api/reports/docx returns 403 on permission denied');

// 2.2 Cash Reconciliation Route
const reconRoutePath = path.join(projectRoot, 'app/api/reconciliation/route.js');
assert(fs.existsSync(reconRoutePath), 'app/api/reconciliation/route.js route file exists');
const reconRoute = fs.readFileSync(reconRoutePath, 'utf-8');
assert(reconRoute.includes("ACTION_KEYS.CASH_RECONCILIATION"), 'app/api/reconciliation guards against ACTION_KEYS.CASH_RECONCILIATION');
assert(reconRoute.includes("hasPermission"), 'app/api/reconciliation calls hasPermission');
assert(reconRoute.includes("cash_reconciliations"), 'app/api/reconciliation inserts into cash_reconciliations');
assert(reconRoute.includes("cash_reconciliation_items"), 'app/api/reconciliation inserts child denomination items');
assert(reconRoute.includes("403"), 'app/api/reconciliation returns 403 on unauthorized count');

// --- 3. Frontend UI Indicators & Lock State Audit ---
console.log('\n3. Auditing Frontend UI Components for Lock Indicators:');

// 3.1 app/page.jsx
const pageContent = fs.readFileSync(path.join(projectRoot, 'app/page.jsx'), 'utf-8');
assert(pageContent.includes("canRecordAny"), 'app/page.jsx computes canRecordAny flag');
assert(pageContent.includes("canReconcileCash"), 'app/page.jsx computes canReconcileCash flag');
assert(pageContent.includes("canExportReports"), 'app/page.jsx computes canExportReports flag');
assert(pageContent.includes("canDeleteTransactions"), 'app/page.jsx computes canDeleteTransactions flag');
assert(pageContent.includes("fetch('/api/reconciliation'"), 'app/page.jsx saves audit counts via /api/reconciliation backend route');
assert(pageContent.includes("Restricted by Administrator"), 'app/page.jsx provides tooltip for disabled quick action pods');

// 3.2 Bottom Navigation
const bottomNavContent = fs.readFileSync(path.join(projectRoot, 'components/layout/BottomNav.jsx'), 'utf-8');
assert(bottomNavContent.includes("canRecord"), 'BottomNav accepts canRecord prop');
assert(bottomNavContent.includes("canReconcile"), 'BottomNav accepts canReconcile prop');
assert(bottomNavContent.includes("cursor-not-allowed select-none"), 'BottomNav styles disabled buttons visibly');
assert(bottomNavContent.includes("Recording restricted by Administrator"), 'BottomNav provides descriptive tooltip for restricted recording');
assert(bottomNavContent.includes("Cash reconciliation restricted by Administrator"), 'BottomNav provides descriptive tooltip for restricted cash box');

// 3.3 New Transaction Modal
const newTxModalContent = fs.readFileSync(path.join(projectRoot, 'components/ledger/NewTransactionModal.jsx'), 'utf-8');
assert(newTxModalContent.includes("canAbono"), 'NewTransactionModal guards personal reimbursement advances with canAbono');
assert(newTxModalContent.includes("Restricted"), 'NewTransactionModal provides Restricted badge/indicator');
assert(newTxModalContent.includes("allRecordingDisabled"), 'NewTransactionModal computes allRecordingDisabled banner');
assert(newTxModalContent.includes("Recording Restricted"), 'NewTransactionModal displays locked submit label when restricted');
assert(newTxModalContent.includes("Inflow recording restricted by Administrator"), 'NewTransactionModal provides tooltip for restricted Inflow toggle');
assert(newTxModalContent.includes("Outflow recording restricted by Administrator"), 'NewTransactionModal provides tooltip for restricted Outflow toggle');

// 3.4 Denomination Counter
const denomCounterContent = fs.readFileSync(path.join(projectRoot, 'components/reconciliation/DenominationCounter.jsx'), 'utf-8');
assert(denomCounterContent.includes("canPerformReconciliation"), 'DenominationCounter derives canPerformReconciliation flag');
assert(denomCounterContent.includes("Save Count (Restricted)"), 'DenominationCounter renders locked Save Count button');
assert(denomCounterContent.includes("Submit Shortage (Restricted)"), 'DenominationCounter renders locked Submit Shortage button');
assert(denomCounterContent.includes("Submit Overage (Restricted)"), 'DenominationCounter renders locked Submit Overage button');
assert(denomCounterContent.includes("readOnly={!canPerformReconciliation}"), 'DenominationCounter sets denomination quantity inputs to readOnly');
assert(denomCounterContent.includes("read-only mode"), 'DenominationCounter renders clear read-only banner');

// 3.5 Transaction Table
const txTableContent = fs.readFileSync(path.join(projectRoot, 'components/ledger/TransactionTable.jsx'), 'utf-8');
assert(txTableContent.includes("Preview Report (Restricted)"), 'TransactionTable renders locked Preview Report header button');
assert(txTableContent.includes("Record Entry (Restricted)"), 'TransactionTable renders locked Record Transaction header button');
assert(txTableContent.includes("Edit Details (Restricted)"), 'TransactionTable renders locked Edit Details button in detail sheet');
assert(txTableContent.includes("Audit &amp; Verify (Restricted)"), 'TransactionTable renders locked Audit button in detail sheet');
assert(txTableContent.includes("Delete (Restricted)"), 'TransactionTable renders locked Delete button in detail sheet');
assert(txTableContent.includes("Disburse Refund (Restricted)"), 'TransactionTable renders locked Disburse Refund in detail sheet');
assert(txTableContent.includes("Attach Proof (Restricted)"), 'TransactionTable renders locked Attach Proof in detail sheet');
assert(txTableContent.includes("Add Photo (Restricted)"), 'TransactionTable renders locked Add Photo in receipt modal and gallery');
assert(txTableContent.includes("title=\"Editing transactions is restricted by Administrator\""), 'TransactionTable provides tooltip for locked edit action in menu');
assert(txTableContent.includes("title=\"Deleting transactions is restricted by Administrator\""), 'TransactionTable provides tooltip for locked delete action in menu');
assert(txTableContent.includes("title=\"Audit & verification restricted by Administrator\""), 'TransactionTable provides tooltip for locked audit action in menu');
assert(txTableContent.includes("title=\"Disbursing reimbursement refunds is restricted by Administrator\""), 'TransactionTable provides tooltip for locked abono disburse in menu');
assert(txTableContent.includes("canSettleAbono = userPermissions"), 'TransactionTable enforces userPermissions on canSettleAbono');

// 3.6 Document Preview Modal
const docPreviewContent = fs.readFileSync(path.join(projectRoot, 'components/reports/DocumentPreviewModal.jsx'), 'utf-8');
assert(docPreviewContent.includes("canExportReport"), 'DocumentPreviewModal derives canExportReport');
assert(docPreviewContent.includes("Export Locked"), 'DocumentPreviewModal renders locked export button text');
assert(docPreviewContent.includes("Export Restricted by Administrator"), 'DocumentPreviewModal renders locked mobile drawer export text');
assert(docPreviewContent.includes("alert('Report export is restricted by Administrator.')"), 'DocumentPreviewModal guards handleExportDocx runtime handler');

// 3.7 Floating Sidebar (Desktop Navigation)
const sidebarContent = fs.readFileSync(path.join(projectRoot, 'components/layout/FloatingSidebar.jsx'), 'utf-8');
assert(sidebarContent.includes("resolveUserPermissions"), 'FloatingSidebar resolves user permissions');
assert(sidebarContent.includes("canReconcileCash"), 'FloatingSidebar computes canReconcileCash');
assert(sidebarContent.includes("canExportReports"), 'FloatingSidebar computes canExportReports');
assert(sidebarContent.includes("Cash reconciliation restricted by Administrator"), 'FloatingSidebar disables Cash Box with tooltip');
assert(sidebarContent.includes("Report generation restricted by Administrator"), 'FloatingSidebar disables Financial Report with tooltip');

console.log('\n============================================================');
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('============================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All action permission and UI indicator tests passed successfully!\n');
}
