import assert from 'assert';
import { OFFICIAL_INFLOW_CATEGORIES, OFFICIAL_OUTFLOW_CATEGORIES } from '../lib/config/categories.js';
import { getSuperAdminEmails } from '../lib/config/admin.js';

console.log('Testing categories & admin config...');

// 1. Inflow Categories Check
assert(!OFFICIAL_INFLOW_CATEGORIES.includes('Membership Dues'), 'Membership Dues must not exist in inflow categories');
assert(OFFICIAL_INFLOW_CATEGORIES.includes('Tournament & E-Sports Registration Fees'), 'Must include tournament fees');
assert(OFFICIAL_INFLOW_CATEGORIES.includes('Merchandise Sales (Batch Pre-Order)'), 'Must include batch merchandise sales');
assert(OFFICIAL_INFLOW_CATEGORIES.includes('Club Week Booth Space & Commission'), 'Must include booth commission');
console.log('✅ PASS: Inflow categories match official PDM LITE operational rules.');

// 2. Outflow Categories Check
assert(OFFICIAL_OUTFLOW_CATEGORIES.includes('Supplies & Materials'), 'Must include supplies');
assert(OFFICIAL_OUTFLOW_CATEGORIES.includes('Tournament Cash Prizes'), 'Must include cash prizes');
assert(OFFICIAL_OUTFLOW_CATEGORIES.includes('Declared Cash Shortage Discrepancy'), 'Must include shortage');
console.log('✅ PASS: Outflow categories match official PDM LITE operational rules.');

// 3. Admin Emails
const admins = getSuperAdminEmails();
assert(admins.includes('geronimoandreijohn.pdm@gmail.com'), 'Must include primary super admin');
console.log('✅ PASS: Super admin emails configured correctly.');

console.log('All verification checks passed cleanly!');
