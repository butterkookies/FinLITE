/**
 * Philippine Peso Currency & Centavo Math Utilities
 * Enforces integer-based arithmetic to prevent floating point inaccuracies.
 */

export const DENOMINATION_VALUES = {
  bills_1000: 1000,
  bills_500: 500,
  bills_200: 200,
  bills_100: 100,
  bills_50: 50,
  bills_20: 20,
  coins_20: 20,
  coins_10: 10,
  coins_5: 5,
  coins_1: 1,
  coins_cents: 0.25,
};

/**
 * Format a numeric amount to Philippine Peso currency string.
 * @param {number} amount
 * @returns {string} e.g. "₱1,500.00"
 */
export function formatPHP(amount) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Convert PHP amount to integer centavos (e.g. 150.25 -> 15025)
 */
export function toCentavos(amount) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return Math.round(num * 100);
}

/**
 * Convert integer centavos back to PHP amount (e.g. 15025 -> 150.25)
 */
export function fromCentavos(centavos) {
  return (centavos / 100);
}

/**
 * Calculate the total physical cash from denomination counts using exact centavos.
 * @param {Record<string, number>} counts
 * @returns {{ total: number, breakdown: Record<string, number> }}
 */
export function calculatePhysicalTotal(counts = {}) {
  let totalCentavos = 0;
  const breakdown = {};

  for (const [key, unitValue] of Object.entries(DENOMINATION_VALUES)) {
    const qty = parseInt(counts[key], 10) || 0;
    const subtotalCentavos = Math.round(qty * unitValue * 100);
    totalCentavos += subtotalCentavos;
    breakdown[key] = subtotalCentavos / 100;
  }

  return {
    total: fromCentavos(totalCentavos),
    breakdown,
  };
}

/**
 * Calculate variance between physical count and ledger balance.
 * @param {number} physicalTotal
 * @param {number} ledgerBalance
 * @returns {{ variance: number, status: 'BALANCED' | 'SHORTAGE' | 'OVERAGE' }}
 */
export function calculateVariance(physicalTotal, ledgerBalance) {
  const physicalCents = toCentavos(physicalTotal);
  const ledgerCents = toCentavos(ledgerBalance);
  const diffCents = physicalCents - ledgerCents;
  const variance = fromCentavos(diffCents);

  if (diffCents === 0) {
    return { variance: 0, status: 'BALANCED' };
  } else if (diffCents < 0) {
    return { variance: Math.abs(variance), status: 'SHORTAGE' };
  } else {
    return { variance, status: 'OVERAGE' };
  }
}
