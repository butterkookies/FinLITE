import fs from 'fs';
import assert from 'assert';

console.log('============================================================');
console.log('TESTING MODAL EXPANSIONS, AUDIT VISIBILITY & UNDO/REDO');
console.log('============================================================');

// 1. Modal.jsx tests
const modalCode = fs.readFileSync('components/ui/Modal.jsx', 'utf8');
assert(modalCode.includes("const effectiveSize = maxWidth || size || 'lg';"), 'Modal.jsx should support size as an alias for maxWidth');
assert(modalCode.includes("'4xl': 'max-w-4xl'"), 'Modal.jsx should support 4xl');
assert(modalCode.includes("'5xl': 'max-w-5xl'"), 'Modal.jsx should support 5xl');
assert(modalCode.includes("'6xl': 'max-w-6xl'"), 'Modal.jsx should support 6xl');
assert(modalCode.includes("'7xl': 'max-w-7xl'"), 'Modal.jsx should support 7xl');
assert(modalCode.includes("full: 'max-w-full'"), 'Modal.jsx should map full to max-w-full');
console.log('✅ PASS: Modal.jsx supports size alias and expanded width classes (4xl-7xl, full)');

// 2. DenominationCounter.jsx tests
const denomCode = fs.readFileSync('components/reconciliation/DenominationCounter.jsx', 'utf8');
assert(denomCode.includes('maxWidth="4xl"'), 'DenominationCounter.jsx should use maxWidth="4xl"');
console.log('✅ PASS: Cashbox DenominationCounter expanded to maxWidth="4xl"');

// 3. NewTransactionModal.jsx tests
const newTxCode = fs.readFileSync('components/ledger/NewTransactionModal.jsx', 'utf8');
assert(newTxCode.includes('maxWidth="2xl"'), 'NewTransactionModal.jsx should use maxWidth="2xl"');
console.log('✅ PASS: Record Transaction modal expanded to maxWidth="2xl"');

// 4. AdvancesManagementModal.jsx tests
const advCode = fs.readFileSync('components/debts/AdvancesManagementModal.jsx', 'utf8');
assert(advCode.includes('title="Out-of-Pocket Advances (Accounts Payable)"\n      description="Track personal advances by officers/advisers and disburse full or partial reimbursements"\n      maxWidth="4xl"') || advCode.includes('title="Out-of-Pocket Advances (Accounts Payable)"\r\n      description="Track personal advances by officers/advisers and disburse full or partial reimbursements"\r\n      maxWidth="4xl"'), 'AdvancesManagementModal.jsx main modal should use maxWidth="4xl"');
assert(advCode.includes('title="Disburse Reimbursement"') && advCode.includes('maxWidth="2xl"'), 'Disburse reimbursement submodal should use maxWidth="2xl"');
assert(advCode.includes('title="Record Out-of-Pocket Advance"') && advCode.includes('maxWidth="2xl"'), 'Record advance submodal should use maxWidth="2xl"');
console.log('✅ PASS: Personal Advances modal and submodals expanded (4xl main, 2xl submodals)');

// 5. DebtsManagementModal.jsx tests
const debtCode = fs.readFileSync('components/debts/DebtsManagementModal.jsx', 'utf8');
assert(debtCode.includes('maxWidth="4xl"'), 'DebtsManagementModal.jsx main modal should use maxWidth="4xl"');
assert(debtCode.includes('maxWidth="2xl"'), 'DebtsManagementModal.jsx submodals should use maxWidth="2xl"');
console.log('✅ PASS: Debts & Receivables modal and submodals expanded (4xl main, 2xl submodals)');

// 6. TransactionTable.jsx Option C tests
const txTableCode = fs.readFileSync('components/ledger/TransactionTable.jsx', 'utf8');
assert(txTableCode.includes("tx.status === 'REIMBURSED'"), 'TransactionTable.jsx should support auditing REIMBURSED abono in primary button');
assert(txTableCode.includes("tx.type === 'RECEIVABLE'"), 'TransactionTable.jsx should support auditing RECEIVABLE in primary button');
assert(txTableCode.includes("tx.category === 'RECEIVABLES'"), 'TransactionTable.jsx should support auditing RECEIVABLES in primary button');
assert(txTableCode.includes("tx.status === 'COMPLETED'"), 'TransactionTable.jsx should support auditing COMPLETED transactions in primary button');
assert(txTableCode.includes("canAudit && onAuditTransaction ? (\n                  <button") || txTableCode.includes("canAudit && onAuditTransaction ? (\r\n                  <button"), '3-dots menu should offer Audit & Verify for any transaction when canAudit is true');
console.log('✅ PASS: Option C formal audit gating implemented for abono, receivables, and completed items');

// 7. DocumentPreviewModal.jsx Undo/Redo tests
const previewCode = fs.readFileSync('components/reports/DocumentPreviewModal.jsx', 'utf8');
assert(previewCode.includes('MAX_HISTORY = 10'), 'DocumentPreviewModal.jsx should define MAX_HISTORY = 10');
assert(previewCode.includes('undoStackRef = useRef([])'), 'DocumentPreviewModal.jsx should have undoStackRef');
assert(previewCode.includes('redoStackRef = useRef([])'), 'DocumentPreviewModal.jsx should have redoStackRef');
assert(previewCode.includes('handleUndo'), 'DocumentPreviewModal.jsx should define handleUndo');
assert(previewCode.includes('handleRedo'), 'DocumentPreviewModal.jsx should define handleRedo');
assert(previewCode.includes("e.key === 'z' || e.key === 'Z'"), 'DocumentPreviewModal.jsx should listen for Ctrl+Z undo');
assert(previewCode.includes("e.key === 'y' || e.key === 'Y'"), 'DocumentPreviewModal.jsx should listen for Ctrl+Y redo');
assert(previewCode.includes('<Undo2 className="w-3.5 h-3.5" />'), 'DocumentPreviewModal.jsx should render Undo icon button');
assert(previewCode.includes('<Redo2 className="w-3.5 h-3.5" />'), 'DocumentPreviewModal.jsx should render Redo icon button');
const typographyIdx = previewCode.indexOf("const [typography, setTypography] = useState('calibri');");
const captureIdx = previewCode.indexOf("const captureReportState = useCallback(");
assert(typographyIdx !== -1 && typographyIdx < captureIdx, 'typography state must be initialized before captureReportState to avoid TDZ ReferenceError');
console.log('✅ PASS: DocumentPreviewModal.jsx has 10-step Undo & Redo and initializes typography before captureReportState (No TDZ)');

console.log('============================================================');
console.log('ALL VERIFICATIONS PASSED ✅');
console.log('============================================================');
