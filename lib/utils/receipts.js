/**
 * Universal receipt resolution utility for FinLITE.
 * Safely extracts an array of valid image/PDF receipt URLs from any transaction object,
 * checking 3NF child records (transaction_receipts), receipt_urls array, and legacy receipt_url.
 *
 * @param {object|null} tx
 * @returns {string[]}
 */
export function getReceiptUrls(tx) {
  if (!tx || typeof tx !== 'object') return [];

  // 1. Normalized 3NF child records
  if (Array.isArray(tx.transaction_receipts) && tx.transaction_receipts.length > 0) {
    const urls = tx.transaction_receipts
      .map((r) => (typeof r === 'string' ? r : r?.public_url || r?.file_url))
      .filter((u) => Boolean(u) && typeof u === 'string' && u.trim().length > 0);
    if (urls.length > 0) return urls;
  }

  // 2. Array column (receipt_urls)
  if (Array.isArray(tx.receipt_urls) && tx.receipt_urls.length > 0) {
    const urls = tx.receipt_urls
      .filter((u) => Boolean(u) && typeof u === 'string' && u.trim().length > 0);
    if (urls.length > 0) return urls;
  }

  // 3. Single legacy column (receipt_url)
  if (tx.receipt_url && typeof tx.receipt_url === 'string' && tx.receipt_url.trim().length > 0) {
    return [tx.receipt_url.trim()];
  }

  return [];
}
