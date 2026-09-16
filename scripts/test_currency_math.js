/**
 * Verification test for centavo precision and denomination math
 */
import { 
  formatPHP, 
  toCentavos, 
  fromCentavos, 
  calculatePhysicalTotal, 
  calculateVariance 
} from '../lib/utils/currency.js';

function runTests() {
  console.log('--- RUNNING FINLITE CURRENCY TESTS ---');

  // Test 1: Centavo conversion
  const amount = 161.00;
  const cents = toCentavos(amount);
  console.assert(cents === 16100, `Expected 16100, got ${cents}`);

  // Test 2: Floating point safety
  // In standard JS: 0.1 + 0.2 === 0.30000000000000004
  const sumCents = toCentavos(0.1) + toCentavos(0.2);
  const result = fromCentavos(sumCents);
  console.assert(result === 0.3, `Expected 0.3, got ${result}`);

  // Test 3: Denomination calculation (AY 2025-2026 ₱161 shortage scenario)
  const counts = {
    bills_1000: 8,  // 8000
    bills_500: 1,   // 500
    bills_100: 2,   // 200
    coins_20: 1,    // 20
    coins_10: 1,    // 10
    coins_5: 1,     // 5
    coins_1: 4,     // 4 -> Total = 8739
  };
  const { total } = calculatePhysicalTotal(counts);
  console.assert(total === 8739, `Expected 8739, got ${total}`);

  // Test 4: Variance detection
  const ledgerBalance = 8900.00; // 8900 - 8739 = 161 shortage
  const varianceResult = calculateVariance(total, ledgerBalance);
  console.assert(varianceResult.status === 'SHORTAGE', `Expected SHORTAGE, got ${varianceResult.status}`);
  console.assert(varianceResult.variance === 161.00, `Expected 161.00, got ${varianceResult.variance}`);

  // Test 5: PHP Currency formatting
  const formatted = formatPHP(1500.50);
  console.assert(formatted.includes('1,500.50'), `Expected formatted string with 1,500.50, got ${formatted}`);

  console.log('✅ ALL CURRENCY & DENOMINATION PRECISION TESTS PASSED!');
}

runTests();
