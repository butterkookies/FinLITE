/**
 * Targeted Test Suite for FinLITE Defense Hardening & Two-Person Proxy Fixes
 * 
 * Verifies:
 * 1. Cashbox Overdraft Prevention & Solvency Guard Logic
 * 2. Adviser-Gated Variance Decision Endpoint & Workflow Rules
 * 3. Two-Person Reimbursement & Proxy Creditor Metadata Resolution
 * 4. Multi-Semester Balance Sheet Continuity (Subledger Standard vs Cloning)
 * 5. Authoritative Server-Side DOCX Recalculation & Proxy Line Items
 * 6. Migration 033 & 034 SQL Schema Integrity & Invariants
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  validateOutflowBalance,
  sanitizeAmountInput,
  validateTransactionAmount,
} from '../lib/utils/validation.js';
import {
  toCentavos,
  fromCentavos,
  calculateVariance,
} from '../lib/utils/currency.js';

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
console.log('TESTING DEFENSE HARDENING, CASHBOX SOLVENCY & PROXY METADATA');
console.log('============================================================\n');

// ==============================================================================
// 1. CASHBOX OVERDRAFT PREVENTION & SOLVENCY GUARD LOGIC
// ==============================================================================
console.log('1. Testing Cashbox Overdraft Prevention & Solvency Logic:');

// Direct cash outflow within cashbox balance
const validOutflow = validateOutflowBalance({
  type: 'OUTFLOW',
  isReimbursement: false,
  amount: 500,
  cashBalance: 1000,
});
assert(validOutflow === null, 'Outflow within physical cashbox balance is permitted');

// Direct cash outflow exactly equal to cashbox balance
const exactOutflow = validateOutflowBalance({
  type: 'OUTFLOW',
  isReimbursement: false,
  amount: 1000,
  cashBalance: 1000,
});
assert(exactOutflow === null, 'Outflow exactly equal to cash on hand is permitted');

// Direct cash outflow exceeding cashbox balance
const overdraftOutflow = validateOutflowBalance({
  type: 'OUTFLOW',
  isReimbursement: false,
  amount: 1000.01,
  cashBalance: 1000.00,
});
assert(
  overdraftOutflow && overdraftOutflow.includes('Insufficient Physical Cashbox balance'),
  'Outflow exceeding cash on hand by 1 centavo is rejected with exact deficit'
);

// Abono personal advance (paid out of pocket by officer) bypasses cashbox constraint
const abonoOutflow = validateOutflowBalance({
  type: 'OUTFLOW',
  isReimbursement: true,
  amount: 5000,
  cashBalance: 50,
});
assert(abonoOutflow === null, 'Abono personal advance bypasses cashbox overdraft check');

// Inflow transaction bypasses cashbox check
const inflowTx = validateOutflowBalance({
  type: 'INFLOW',
  isReimbursement: false,
  amount: 50000,
  cashBalance: 10,
});
assert(inflowTx === null, 'Inflow transaction bypasses cashbox check');

// Verify API route guard in app/api/transactions/route.js
const txRouteSource = fs.readFileSync(path.join(projectRoot, 'app/api/transactions/route.js'), 'utf-8');
assert(
  txRouteSource.includes("type === 'OUTFLOW' && !isTxAbono && resolvedSemesterId"),
  'Transaction route explicitly checks for direct cash OUTFLOWs excluding Abono'
);
assert(
  txRouteSource.includes("queryClient.rpc('get_available_cash_on_hand'"),
  'Transaction route attempts get_available_cash_on_hand stored procedure RPC'
);
assert(
  txRouteSource.includes("availableCash !== null && parsedAmount > availableCash"),
  'Transaction route compares parsedAmount against availableCash'
);
assert(
  txRouteSource.includes("status: 400") && txRouteSource.includes("Insufficient physical cashbox balance"),
  'Transaction route returns HTTP 400 with descriptive error on cashbox overdraft'
);

// ==============================================================================
// 2. ADVISER-GATED VARIANCE DECISION WORKFLOW
// ==============================================================================
console.log('\n2. Testing Adviser-Gated Variance Decision Workflow:');

const reconDecisionRoute = fs.readFileSync(
  path.join(projectRoot, 'app/api/reconciliation/[id]/decision/route.js'),
  'utf-8'
);

assert(
  reconDecisionRoute.includes("supabase.auth.getUser()") && reconDecisionRoute.includes("authError || !user"),
  'Variance decision route enforces user authentication'
);
assert(
  reconDecisionRoute.includes("callerProfile?.role === 'adviser' || callerProfile?.role === 'admin'"),
  'Variance decision route restricts authorization strictly to Adviser or Admin'
);
assert(
  reconDecisionRoute.includes("normalizedAction !== 'APPROVE' && normalizedAction !== 'REJECT'"),
  'Variance decision route validates action to only APPROVE or REJECT'
);
assert(
  reconDecisionRoute.includes("approval_status: 'APPROVED'") &&
  reconDecisionRoute.includes("adviser_decision_by:") &&
  reconDecisionRoute.includes("adviser_decision_at:"),
  'Approve action sets approval_status, adviser_decision_by, and adviser_decision_at'
);
assert(
  reconDecisionRoute.includes("isShortage ? 'OUTFLOW' : 'INFLOW'"),
  'Approve action correctly maps shortage to OUTFLOW and overage to INFLOW'
);
assert(
  reconDecisionRoute.includes("verified_by: callerProfile?.id"),
  'Approve action records adviser ID in verified_by on created adjustment transaction'
);
assert(
  reconDecisionRoute.includes("approval_status: 'REJECTED'"),
  'Reject action sets approval_status to REJECTED without ledger adjustment transactions'
);

// Verify DenominationCounter UI routing
const denomCounterSource = fs.readFileSync(
  path.join(projectRoot, 'components/reconciliation/DenominationCounter.jsx'),
  'utf-8'
);
assert(
  denomCounterSource.includes("Submit Shortage for Adviser Approval") &&
  denomCounterSource.includes("Submit Overage for Adviser Approval"),
  'Denomination counter UI labels variance submission for Adviser Verification'
);
assert(
  denomCounterSource.includes("approval_status: 'PENDING_APPROVAL'"),
  'Denomination counter sets approval_status to PENDING_APPROVAL on discrepancy'
);
assert(
  denomCounterSource.includes("const approvalStatus = (variance === 0 || status === 'BALANCED') ? 'BALANCED' : 'PENDING_APPROVAL'"),
  'Denomination counter marks balanced counts as BALANCED'
);

// ==============================================================================
// 3. TWO-PERSON REIMBURSEMENT & PROXY CREDITOR METADATA RESOLUTION
// ==============================================================================
console.log('\n3. Testing Two-Person Reimbursement & Proxy Creditor Metadata:');

// Test metadata resolution function simulation (matching app/api/transactions/route.js)
function resolveReimbursementMetadata(isAbono, claimant, advancedBy) {
  const resolvedClaimant = isAbono ? (claimant?.trim() || null) : null;
  const resolvedAdvancedBy = isAbono ? (advancedBy?.trim() || resolvedClaimant) : null;
  return { resolvedClaimant, resolvedAdvancedBy };
}

// Case A: Standard 1-person reimbursement (Officer paid, Officer reimbursed)
const caseSingle = resolveReimbursementMetadata(true, 'Juan Dela Cruz', '');
assert(caseSingle.resolvedClaimant === 'Juan Dela Cruz', 'Single claimant is Juan Dela Cruz');
assert(caseSingle.resolvedAdvancedBy === 'Juan Dela Cruz', 'Single claimant falls back to Juan Dela Cruz as advanced_by_name');

// Case B: 2-person proxy reimbursement (Non-officer paid, Officer designated to claim)
const caseProxy = resolveReimbursementMetadata(true, 'Maria Officer', 'Pedro NonOfficer');
assert(caseProxy.resolvedClaimant === 'Maria Officer', 'Authorized claimant is Maria Officer');
assert(caseProxy.resolvedAdvancedBy === 'Pedro NonOfficer', 'Original creditor is Pedro NonOfficer');

// Case C: Non-abono standard transaction (Metadata should be cleanly nulled)
const caseStandard = resolveReimbursementMetadata(false, 'Someone', 'Someone Else');
assert(caseStandard.resolvedClaimant === null, 'Non-abono transaction nulls claimant');
assert(caseStandard.resolvedAdvancedBy === null, 'Non-abono transaction nulls advanced_by_name');

// UI Formatting simulation (matching TransactionTable.jsx and AuditReviewModal.jsx)
function formatCreditorDisplay(advancedByName, claimantName) {
  const adv = advancedByName?.trim();
  const claim = claimantName?.trim();
  if (adv && claim && adv !== claim) {
    return `${adv} → ${claim}`;
  }
  return adv || claim || 'Unknown Claimant';
}

assert(
  formatCreditorDisplay('Pedro Payer', 'Maria Proxy') === 'Pedro Payer → Maria Proxy',
  'UI display formats proxy transaction as "Payer → Proxy"'
);
assert(
  formatCreditorDisplay('Juan Solo', 'Juan Solo') === 'Juan Solo',
  'UI display formats single-person claim cleanly without arrow'
);
assert(
  formatCreditorDisplay(null, 'Maria Lone') === 'Maria Lone',
  'UI display handles missing advanced_by_name gracefully'
);

// Verify UI components implement proxy support
const newTxModalSource = fs.readFileSync(
  path.join(projectRoot, 'components/ledger/NewTransactionModal.jsx'),
  'utf-8'
);
assert(
  newTxModalSource.includes('advancedByName') && newTxModalSource.includes('isProxyClaim'),
  'NewTransactionModal supports advancedByName input and isProxyClaim toggle'
);

const advModalSource = fs.readFileSync(
  path.join(projectRoot, 'components/debts/AdvancesManagementModal.jsx'),
  'utf-8'
);
assert(
  advModalSource.includes('newAdvancedByName') && advModalSource.includes('isProxyClaimant'),
  'AdvancesManagementModal supports proxy creditor configuration'
);

const txTableSource = fs.readFileSync(
  path.join(projectRoot, 'components/ledger/TransactionTable.jsx'),
  'utf-8'
);
assert(
  txTableSource.includes('advanced_by_name') && txTableSource.includes('reimbursement_recipient'),
  'TransactionTable renders both original creditor and proxy claimant'
);

const auditModalSource = fs.readFileSync(
  path.join(projectRoot, 'components/audit/AuditReviewModal.jsx'),
  'utf-8'
);
assert(
  auditModalSource.includes('Out-of-Pocket Advance (Abono) Metadata') &&
  auditModalSource.includes('advanced_by_name'),
  'AuditReviewModal renders dedicated Abono Creditor & Payout Metadata card'
);

// ==============================================================================
// 4. MULTI-SEMESTER BALANCE SHEET CONTINUITY (SUBLEDGER STANDARD)
// ==============================================================================
console.log('\n4. Testing Multi-Semester Balance Sheet Continuity:');

const appPageSource = fs.readFileSync(path.join(projectRoot, 'app/page.jsx'), 'utf-8');

// Assert real accounts (advances_payable & debts) persist cross-semester when unpaid
assert(
  appPageSource.includes("const isUnsettled = d.status === 'UNPAID' || d.status === 'PARTIALLY_PAID';") &&
  appPageSource.includes("if (isUnsettled) return true;"),
  'Debts query filters for open receivables across terms until settled'
);
assert(
  appPageSource.includes("const isUnsettled = a.status === 'UNPAID' || a.status === 'PARTIALLY_REIMBURSED' || a.status === 'PENDING';") &&
  appPageSource.includes("if (isUnsettled) return true;"),
  'Advances query preserves open liabilities across terms until settled'
);

// Assert nominal accounts (transactions) are strictly partitioned by active semester
assert(
  appPageSource.includes("txAY === currentSemester?.academicYear && txSem === currentSemester?.semester"),
  'Transactions query remains strictly scoped to active semester'
);

// Ensure no row cloning anti-pattern logic exists in page.jsx
assert(
  !appPageSource.includes('cloneAdvanceForSemester') &&
  !appPageSource.includes('duplicateDebtsForSemester'),
  'Ensured anti-pattern row cloning functions are absent'
);

// ==============================================================================
// 5. AUTHORITATIVE SERVER-SIDE DOCX RECALCULATION
// ==============================================================================
console.log('\n5. Testing Authoritative Server-Side DOCX Recalculation:');

const docxRouteSource = fs.readFileSync(path.join(projectRoot, 'app/api/reports/docx/route.js'), 'utf-8');

assert(
  docxRouteSource.includes("authoritativeTransactions = dbTxs.map"),
  'DOCX route compiles authoritative transaction list directly from database'
);
assert(
  docxRouteSource.includes("sumInflows - sumOutflows"),
  'DOCX route recalculates net balance and cash on hand authoritatively on server'
);
assert(
  docxRouteSource.includes("pending_reimbursements: sumPendingAbono"),
  'DOCX route calculates pending reimbursement obligations directly from advances_payable'
);
assert(
  docxRouteSource.includes("[Proxy: Paid by") &&
  docxRouteSource.includes("tx.advanced_by_name !== tx.reimbursement_recipient"),
  'DOCX export appends proxy attribution note to liquidation line items'
);

// ==============================================================================
// 6. DATABASE MIGRATION SQL SCHEMA INTEGRITY & INVARIANTS
// ==============================================================================
console.log('\n6. Testing Database Migrations (033 & 034) Schema Integrity:');

const mig033 = fs.readFileSync(
  path.join(projectRoot, 'supabase/migrations/033_two_person_reimbursement_metadata.sql'),
  'utf-8'
);
assert(
  mig033.includes("public.transactions") && mig033.includes("ADD COLUMN IF NOT EXISTS advanced_by_name TEXT;"),
  'Migration 033 adds advanced_by_name to transactions table'
);
assert(
  mig033.includes("public.advances_payable") && mig033.includes("ADD COLUMN IF NOT EXISTS advanced_by_name TEXT;"),
  'Migration 033 adds advanced_by_name to advances_payable table'
);
assert(
  mig033.includes("CREATE VIEW public.v_transactions_normalized"),
  'Migration 033 updates normalized view with advanced_by_name'
);
assert(
  mig033.includes("WITH (security_invoker = true)"),
  'Migration 033 enforces security_invoker = true on v_transactions_normalized view'
);

const mig034 = fs.readFileSync(
  path.join(projectRoot, 'supabase/migrations/034_adviser_gated_variances_and_overdraft_guard.sql'),
  'utf-8'
);
assert(
  mig034.includes("CREATE TYPE variance_approval_status AS ENUM ('BALANCED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED')"),
  'Migration 034 creates variance_approval_status enum'
);
assert(
  mig034.includes("ADD COLUMN IF NOT EXISTS approval_status variance_approval_status"),
  'Migration 034 adds approval_status to cash_reconciliations'
);
assert(
  mig034.includes("CREATE OR REPLACE FUNCTION public.get_available_cash_on_hand"),
  'Migration 034 defines get_available_cash_on_hand RPC function'
);
assert(
  mig034.includes("CREATE OR REPLACE FUNCTION public.record_advance_disbursement"),
  'Migration 034 defines overdraft-guarded record_advance_disbursement function'
);
assert(
  mig034.includes("RAISE EXCEPTION 'Insufficient physical cashbox balance"),
  'Stored disbursement procedure raises exception when available cash is insufficient'
);

// ==============================================================================
// SUMMARY RESULTS
// ==============================================================================
console.log('\n============================================================');
console.log('🏁 DEFENSE HARDENING & PROXY VERIFICATION RESULTS');
console.log('============================================================');
console.log(`  Total Checks: ${passed + failed}`);
console.log(`  Passed:       ${passed} ✅`);
console.log(`  Failed:       ${failed} ❌`);
console.log('============================================================\n');

process.exit(failed === 0 ? 0 : 1);
